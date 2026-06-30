# GitSec — Rıza Saklama Prototipi (Consent Ledger)

> **Tıklanabilir prototip.** KVKK md.7 / GDPR Art.7 uyumlu, **sürümlü** ve **geçmişe-dönük-kanıtlanabilir** rıza saklama. Artık **hafif bir backend** içerir: **local Postgres** (gömülü PGlite — gerçek Postgres motoru; istenirse `DATABASE_URL` ile gerçek sunucu) + Next.js API route'ları. Hash zinciri **sunucuda** (otorite) hesaplanır, **istemcide** de aynı kodla doğrulanır (defense-in-depth).

Bu repo, Frontend ve Backend ekiplerine geliştirilecek "rıza saklama" feature'ını somut bir tıklanabilir akışla anlatmak için hazırlandı. Backend teknik analizindeki katman menüsünden seçilen yöntemleri uygular:

| Katman | Seçim | Bu prototipte karşılığı |
|---|---|---|
| **1.1** Belge metni | PostgreSQL ilişkisel kolon, sürümlü append-only snapshot | `lib/consent/documents.ts` — her sözleşmenin sürümlü, değişmez metni + `documentContentHash` |
| **2.2** Rıza kaydı | PostgreSQL temporal / system-versioned (history) | `lib/consent/store.ts` — append-only olaylar; "güncel durum" ve "T anındaki durum" (time-travel) türetilir |
| **3.1** Bütünlük | SHA-256 hash zinciri (blockchain-vari) | `lib/consent/hash-chain.ts` — `rowHash = SHA-256(prevHash ‖ canonical(alanlar + occurredAt))` |

**3. katmanın özü:** Olayın gerçekleştiği an (`occurredAt`) hash'in içine girer ve her kayıt bir öncekinin hash'ine zincirlenir. Böylece "şu kullanıcı, şu tarihte, şunu yaptı" ifadesi sonradan değiştirilemeyen bir zincire çakılır — tek bir alanın değişmesi o kaydın ve sonraki tüm kayıtların bağını kırar.

**Bonus:** Katalogda "eksik" olarak işaretlenen **proof-of-presentation** (kullanıcıya tam olarak ne gösterildiği) `presentedNoticeHash` ile her kayda gömülür.

---

## Çalıştırma

Prototipte **lockfile yoktur**; npm / pnpm / yarn hepsi çalışır.

### Seçenek 1 — Docker (makinede Node kurulu değilse; önerilen)

**Docker Desktop açık olmalı.** Repo klasöründe tek satır:

```bash
docker run --rm -it -p 3000:3000 -v "$PWD":/app -v /app/node_modules -w /app \
  node:22 sh -c "npm install && npm run dev -- -H 0.0.0.0"
```

İlk açılış birkaç dakika sürer (node:22 imajı + bağımlılık kurulumu). Sonra: <http://localhost:3000> · Durdurmak için `Ctrl+C`.

**Gerçek Postgres + DB incelemesi istiyorsan** `docker compose up` kullan: app + PostgreSQL'i birlikte ayağa kaldırır (DB `localhost:5432`'de, DBeaver/psql ile incelenebilir). Bkz. `docker-compose.yml` ve aşağıdaki "Backend & Veritabanı".

### Seçenek 2 — Native Node

Node.js 20+ kuruluysa (yoksa <https://nodejs.org> LTS .pkg ile kur, terminali yeniden aç):

```bash
npm install && npm run dev     # veya: pnpm install && pnpm dev
# http://localhost:3000
```

Build: `npm run build && npm start`.

> Not: Bu prototip ana projeden bağımsızdır, kendi `package.json`'ı vardır. Tasarım sistemi (shadcn/ui + Tailwind v4 token'ları) ana projeden birebir kopyalanmıştır; bileşenler taşındığında görünüm tutarlıdır.

## Backend & Veritabanı

Hafif bir backend dahildir (detay: [`docs/HANDOFF-BACKEND.md`](docs/HANDOFF-BACKEND.md)).

- **DB:** Varsayılan **PGlite** — gerçek PostgreSQL motorunun Node içinde gömülü (WASM) hali. Ekstra servis yok; veri `.pgdata/` klasöründe kalıcı. İlk istekte şema kurulur + seed edilir.
- **Gerçek Postgres istersen:** `DATABASE_URL=postgres://kullanıcı:şifre@host:5432/db` ver — aynı SQL `pg` ile çalışır (kod değişmez). En kolayı: **`docker compose up`** (app + Postgres). DBeaver/psql ile bağlan: `localhost:5432`, db `gitsec`, user `postgres`, pass `gitsec`. Tablolar (`consent_records`, `consent_documents`) **public** şemasında, ve **ilk API isteğinden sonra** oluşur — `http://localhost:3000/ledger` açıp DBeaver'da yenile (F5).
- **API:** `app/api/consent/{ledger,events,state,requirements,verify,tamper,reset}` + `app/api/documents/[type]/{current,[version]}`.
- **Hash zinciri** sunucuda hesaplanır (otorite); istemci ayrıca tarayıcıda doğrular — ikisi de `lib/consent/hash-chain.ts` canonical kuralını paylaşır.
- `tamper`/`reset` yalnızca demo içindir; immutability (trigger/REVOKE) prototipte bilinçli olarak zorlanmaz.

---

## Demo senaryosu (önerilen sıra)

1. **Genel Bakış** (`/`) — 3 katman ve akışların özeti; canlı defter durumu.
2. **Kayıt** (`/signup`) — Önceden işaretli olmayan kutucuklarla onay ver → **Rıza Makbuzu** açılır (versiyon, zaman, IP, yöntem, hash'ler).
3. **Checkout** (`/checkout`) — Freemium→Pro geçişinde Mesafeli Satış & Ön Bilgilendirme onayı (signup’a benzer akış).
4. **Hash-Chain Defteri** (`/ledger`):
   - **Hash Zinciri** sekmesi: "Zincir bütünlüğü: GEÇERLİ ✅". Bir satırda **⋮ → Zamanı oynat** ile kurcala → zincir **BOZULDU ❌**, ilk kırık kayıt işaretlenir. Bir kaydı **İncele** ile canonical payload + hash hesabını gör.
   - **Zaman Yolculuğu** sekmesi: bir ana tıkla → o tarihteki rıza durumu (Katman 2.2 temporal).
   - Üstte **Demoyu sıfırla** ile başlangıç verisine dön.
5. **Giriş · Re-consent** (`/login`) — Seed'de kullanıcı eski sürümleri (v1.0) onaylamıştır; güncel sürüm v2.0 olduğu için **kapatılamaz yeniden-onay modalı** çıkar. (Eğer signup ile v2.0'ı onayladıysan bariyer çıkmaz; "Demoyu sıfırla" ile yeniden tetikle.)
6. **Profil & İzinler** (`/profile`) — Pazarlama rızasını **geri çek** (opt-out): satır silinmez, zincire yeni `WITHDRAWN` kaydı eklenir.

---

## Proje yapısı

```
app/
  page.tsx                 Genel bakış (hub)
  signup/  checkout/        Onay yakalama akışları
  login/   profile/         Re-consent bariyeri / opt-out
  ledger/                   Hash-chain defteri + temporal (denetçi görünümü)
  api/                      Backend API route'ları (consent/*, documents/*)
components/
  consent/                  Feature bileşenleri (form, makbuz, gate, explorer, inspector, ...)
  ui/                       shadcn/ui primitive'leri (ana projeden kopya)
  app-shell, theme-toggle, reset-demo-button, ...
lib/
  consent/
    types.ts               Domain modeli + sabitler
    documents.ts           Katman 1.1 — sürümlü metin snapshot'ları
    store.ts               Katman 2.2 — append-only + temporal türetme + tamper
    hash-chain.ts          Katman 3.1 — canonical + SHA-256 zinciri + doğrulama
    use-consent-store.ts   Reaktif store — API'ye bağlı (useSyncExternalStore)
  server/
    db.ts                  PGlite (varsayılan) / pg (DATABASE_URL) adaptörü
    consent-repo.ts        Şema + seed + sorgular (Katman 1.1/2.2/3.1)
docs/
  HANDOFF-BACKEND.md        Backend ekibi için aktarım
  HANDOFF-FRONTEND.md       Frontend ekibi için aktarım
  ARCHITECTURE.md          Katman eşlemeleri ve veri akışı
```

---

## Bu bir prototiptir — sınırları

- **Tek başına hash zinciri "tespit" sağlar, "önleme" değil.** Tam yetkili bir insider tüm zinciri yeniden hesaplayabilir. Üretimde önerilen yükseltme (Katalog Profil B): hash-chain **+ Vault asimetrik imza (3.3) + periyodik RFC 3161 / Kamu SM zaman damgası (3.4)**.
- IP/User-Agent: seed kayıtlarında mock; yeni olaylarda sunucu istek başlıklarından alır (lokalde `127.0.0.1`).
- Veri local Postgres'te (PGlite, `.pgdata/`) tutulur; tek-kullanıcı/demo amaçlıdır.
- Immutability (append-only trigger + REVOKE) prototipte zorlanmaz; `tamper`/`reset` demo endpoint'leri vardır.
- Hukuki nihai yöntem seçimi (saklama süresi, zorunlu kanıt sınıfı) hukuk ekibiyle netleştirilmelidir — bkz. `docs/HANDOFF-BACKEND.md`.
