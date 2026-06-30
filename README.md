# GitSec — Rıza Saklama Prototipi (Consent Ledger)

> **Frontend-only prototip.** KVKK md.7 / GDPR Art.7 uyumlu, **sürümlü** ve **geçmişe-dönük-kanıtlanabilir** rıza saklama akışlarını gösterir. **Backend yoktur:** tüm veri tarayıcıda `localStorage`'da tutulur, tüm hash'ler tarayıcıda **Web Crypto (SHA-256)** ile hesaplanır.

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

Gereksinim: Node.js 20+ ve `pnpm` (ana `git-security-dashboard-ui` projesiyle aynı toolchain).

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Build:

```bash
pnpm build && pnpm start
```

> Not: Bu prototip ana projeden bağımsızdır, kendi `package.json`'ı vardır. Tasarım sistemi (shadcn/ui + Tailwind v4 token'ları) ana projeden birebir kopyalanmıştır; bileşenler taşındığında görünüm tutarlıdır.

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
    use-consent-store.ts   Reaktif store (useSyncExternalStore)
docs/
  HANDOFF-BACKEND.md        Backend ekibi için aktarım
  HANDOFF-FRONTEND.md       Frontend ekibi için aktarım
  ARCHITECTURE.md          Katman eşlemeleri ve veri akışı
```

---

## Bu bir prototiptir — sınırları

- **Tek başına hash zinciri "tespit" sağlar, "önleme" değil.** Tam yetkili bir insider tüm zinciri yeniden hesaplayabilir. Üretimde önerilen yükseltme (Katalog Profil B): hash-chain **+ Vault asimetrik imza (3.3) + periyodik RFC 3161 / Kamu SM zaman damgası (3.4)**.
- IP/User-Agent burada **mock**'tur; gerçekte sunucu `HttpContext`'ten gelir.
- Veri yalnızca bu tarayıcıdadır; başka cihaz/oturumla paylaşılmaz.
- Hukuki nihai yöntem seçimi (saklama süresi, zorunlu kanıt sınıfı) hukuk ekibiyle netleştirilmelidir — bkz. `docs/HANDOFF-BACKEND.md`.
