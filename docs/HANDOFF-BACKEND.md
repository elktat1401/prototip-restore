# Backend Handoff — Rıza Saklama (Consent Ledger)

**Kime:** `git-security-backend` (.NET 9 / EF Core / PostgreSQL / Vault / Kafka) ekibi.
**Ne:** Bu prototip, frontend tarafının beklediği **veri sözleşmesini (contract)** ve davranışı tanımlar. Aşağıdaki şema, canonical kuralı ve endpoint'ler bağlayıcı arayüzdür; prototip bunların tarayıcı-içi bir taklididir.

Seçilen katmanlar: **1.1** (Postgres snapshot) + **2.2** (temporal/history) + **3.1** (SHA-256 hash-chain). Bağlam: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 0. Bu repodaki çalışan referans backend

Prototip artık **gerçek bir backend** içerir (hafif). Production için hedef hâlâ .NET/EF + Postgres'tir (aşağıdaki bölümler); bu referans, sözleşmeyi (şema, canonical, endpoint'ler, davranış) **çalışır halde** gösterir.

- **DB:** Varsayılan **PGlite** (`@electric-sql/pglite`) — gerçek PostgreSQL motorunun Node içinde **gömülü (WASM)** çalışan hali. Ekstra servis/konteyner yok; veri `.pgdata`'da kalıcı. `DATABASE_URL` tanımlıysa **gerçek Postgres**'e (`pg`) bağlanır — **aynı SQL**. Bkz. [`../lib/server/db.ts`](../lib/server/db.ts).
- **Repo:** [`../lib/server/consent-repo.ts`](../lib/server/consent-repo.ts) — şema, seed, ekleme, durum türetme, doğrulama. Hash zinciri mantığı `lib/consent/*`'ten **paylaşılır** → frontend ile birebir aynı canonical/hash (Web Crypto, Node 22'de de çalışır).
- **API:** `app/api/**` route handler'ları (bkz. §3 tablosu — hepsi uygulanmış).
- **Çalıştırma:** ekstra adım yok; `docker run ... npm install && npm run dev` (veya native `npm run dev`) yeterli. PGlite ilk API çağrısında şemayı kurar + seed eder. Gerçek Postgres için: `DATABASE_URL=postgres://… npm run dev`.

> **Prototip ≠ production farkları (kasıtlı):**
> - Tüm string alanlar **TEXT** olarak saklanır (üretimde §1'deki `timestamptz`/`inet`). Sebep: hash, canonical ISO/IP **string**'i üzerinden hesaplandığından TEXT, byte-bire-byte round-trip ile hash bütünlüğünü garanti eder. Üretimde `timestamptz`/`inet` kullanılabilir **ama** canonical her zaman sabit string forma (ISO-8601 UTC, IP string) serileştirilmelidir (§2).
> - **Immutability zorlanmaz** (trigger/REVOKE yok) — çünkü tamper→cascade demosu için `UPDATE` gerekiyor. Üretimde §1'deki trigger + REVOKE **şarttır**.
> - `POST /consent/tamper` ve `POST /consent/reset` yalnızca **demo** endpoint'leridir; production'a taşınmaz.

---

## 1. Veri tabanı şeması (Postgres — production hedefi)

### 1.1 — Belge sürüm snapshot'ı

```sql
CREATE TABLE consent_documents (
  document_type   text NOT NULL,           -- 'terms' | 'privacy' | 'cookie_policy' | 'acceptable_use_policy'
                                            -- | 'dpa' | 'consumer_purchase_agreement' | 'cancellation_policy'
  version         text NOT NULL,            -- 'v1.0', 'v2.0' ...
  effective_date  date NOT NULL,
  title           text NOT NULL,
  body            text NOT NULL,            -- kullanıcıya AYNEN gösterilen snapshot
  content_hash    char(64) NOT NULL,        -- SHA-256(body) (hex, lowercase)
  materiality     text NOT NULL,            -- 'material' | 'minor'
  change_summary  text NOT NULL,
  PRIMARY KEY (document_type, version)
);
```
- Append-only: yeni sürüm = yeni satır. Eski satır asla değişmez.
- `body` büyürse ayrı `consent_document_versions` + FK ile normalize edilebilir; büyük metinler için OBS/S3 WORM (Katalog 1.2) opsiyoneldir, ama snapshot DB'de tutulması en düşük efordur.

### 2.2 — Rıza olayı (append-only + temporal)

```sql
CREATE TABLE consent_records (
  id                     uuid PRIMARY KEY,
  seq                    bigint NOT NULL,            -- zincir sırası (tenant/subject başına monoton; aşağıdaki nota bak)
  subject_id             text NOT NULL,
  subject_email          text NOT NULL,
  tenant_id              text NOT NULL,
  document_type          text NOT NULL,
  document_version       text NOT NULL,
  document_content_hash  char(64) NOT NULL,          -- consent_documents.content_hash kopyası (kanıt)
  action                 text NOT NULL,              -- 'GRANTED' | 'WITHDRAWN'
  method                 text NOT NULL,              -- 'signup_form_checkbox' | 'checkout_form_checkbox'
                                                      -- | 'reconsent_modal' | 'profile_toggle' | 'profile_withdraw_button'
  presented_notice_hash  char(64) NOT NULL,          -- proof-of-presentation: SHA-256(gösterilen tam bildirim)
  ip_address             inet NOT NULL,
  user_agent             text NOT NULL,
  locale                 text NOT NULL,              -- 'tr-TR'
  occurred_at            timestamptz NOT NULL,       -- olayın AN'ı (hash'e girer)
  recorded_at            timestamptz NOT NULL,       -- sistem yazım anı (hash'e GİRMEZ)
  prev_hash              char(64) NOT NULL,          -- önceki rowHash (GENESIS: 64 sıfır)
  row_hash               char(64) NOT NULL,          -- SHA-256(prev_hash ‖ canonical(payload))
  UNIQUE (seq)                                       -- veya UNIQUE (tenant_id, seq) — zincir kapsamına göre
);
```

**Zincir kapsamı kararı:** Tek global zincir mi, tenant başına zincir mi? Prototip tek global zincir kullanır (en basit). Üretimde **tenant başına zincir** (eşzamanlılık ve izolasyon için) önerilir; `prev_hash`/`seq` o zincire göre yürütülür. Karar verilmeli.

> **Eşzamanlılık (Katalog 3.1 uyarısı):** Zincir başını seri yazmak gerekir (kuyruk/kilit veya `seq` üzerinde DB-seviyesi tekillik + retry). Aksi hâlde aynı `prev_hash`'e iki kayıt yazılır.

### Değişmezlik (Katalog 2.1)

```sql
-- 1) Uygulama DB rolünden UPDATE/DELETE yetkisini al:
REVOKE UPDATE, DELETE ON consent_records, consent_documents FROM app_role;
GRANT  INSERT, SELECT ON consent_records, consent_documents TO app_role;

-- 2) Trigger ile savunma derinliği — MUTLAKA RAISE EXCEPTION (RETURN NULL/ WARNING DEĞİL!):
CREATE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'consent_records append-only: % yasak', TG_OP; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_delete BEFORE UPDATE OR DELETE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
```
- EF Core'un yanlışlıkla UPDATE üretmemesi için repository **INSERT-only** tasarlanmalı.
- **Retention/purge'tan hariç tut:** `GitSecLicenceDataPurgeRequestedEventConsumer` ve `AuditRetentionDays` bu tabloları ASLA budamamalı. `[FeatureProtected]` kapısı consent okuma endpoint'lerine UYGULANMAMALI (Freemium tenant kendi geçmişini okuyabilmeli — DSAR).

---

## 2. Canonical serileştirme (frontend ile BİREBİR aynı olmalı)

`row_hash` = `SHA-256_hex( prev_hash + "\n" + canonical(payload) )`

`canonical(obj)`: anahtarlar **alfabetik**, dizi sırası korunur, **boşluksuz**, JSON. Prototip referans uygulaması: `lib/consent/hash-chain.ts → canonicalize()`.

**Hash'e giren payload alanları (15) — tam bu küme, tam bu adlar (camelCase):**
```
id, seq, subjectId, subjectEmail, tenantId, documentType, documentVersion,
documentContentHash, action, method, presentedNoticeHash, ipAddress,
userAgent, locale, occurredAt
```
**Hariç:** `recordedAt`, `prevHash`, `rowHash`.

> ⚠️ **.NET tuzakları:** `JsonSerializer` alan sırasını ve camelCase'i sabitleyin; `DateTime`'ı **ISO-8601 UTC** olarak (`o` formatı, `Z`) yazın; `inet`/IP'yi string'e normalize edin; kültür-bağımlı `ToString()` kullanmayın. Aksi hâlde frontend ile hash uyuşmaz. `occurredAt` formatı prototipte `2026-01-15T09:12:30.000Z` (ms'li UTC).

**Doğrulama (cascade):** GENESIS'ten yeniden hesapla; `contentIntact = recompute==stored`, `linkIntact = prevHash==expectedPrev`, `expectedPrev`'i dürüst hash ile ilerlet. Bir kaydın kurcalanması o kaydı ve sonrasını kırar. Algoritma: `verifyChain()`.

---

## 3. API yüzeyi (frontend'in beklediği)

| Method | Endpoint | Açıklama | Prototip karşılığı |
|---|---|---|---|
| `GET` | `/documents/{type}/current` | Bir türün güncel sürümü + body + content_hash | `getCurrentVersion` |
| `GET` | `/documents/{type}/{version}` | Belirli sürüm snapshot'ı | `getDocument` |
| `POST` | `/consent/events` | **Batch** grant/withdraw; her biri için yeni zincir kaydı oluşturur, makbuzları döner | `appendEvents` |
| `GET` | `/consent/state` | Güncel rıza durumu (her tür için son olay) | `deriveCurrentState` |
| `GET` | `/consent/state?asOf={iso}` | T anındaki durum (temporal) | `deriveStateAsOf` |
| `GET` | `/consent/requirements` | Signin'de güncel sürümde eksik (re-consent gereken) metinler | `getReconsentRequirements` |
| `GET` | `/consent/ledger` | Append-only kayıt listesi (denetçi) | store snapshot |
| `GET` | `/consent/verify` | Zincir bütünlük raporu (`valid`, `firstBrokenSeq`, per-kayıt) | `verifyChain` |

**`POST /consent/events` gövdesi (öneri):**
```json
{
  "events": [
    { "documentType": "terms", "documentVersion": "v2.0", "action": "GRANTED",
      "method": "reconsent_modal", "presentedNoticeText": "<gösterilen tam bildirim>" }
  ]
}
```
- Sunucu `occurredAt`/`recordedAt`/`ip`/`userAgent`'ı **kendisi** (HttpContext) doldurur — istemciye güvenme.
- `presented_notice_hash = SHA-256(presentedNoticeText)`; ham metni saklamak opsiyonel (büyükse hash yeterli).
- Yanıt: oluşturulan kayıtlar (`seq`, `rowHash`, `prevHash` dâhil) = **rıza makbuzu** (ISO/IEC 27560 uyumlu yapı hedeflenebilir).

---

## 4. Davranış kuralları

- **Re-consent (signin):** `material` sürüm değişiminde, kullanıcı güncel sürümü onaylamadan korumalı kaynaklara erişememeli. `minor` (yazım) değişiklik bariyer tetiklemez.
- **Opt-out:** Geri çekmede satır **silinmez**; yeni `WITHDRAWN` kaydı eklenir. (Cookie gibi opt-in rızalar için.)
- **Pre-checked yasağı:** Onay kutuları sunucu/şablon tarafında da default-false olmalı.
- **proof-of-presentation:** Tıklama anında server-rendered notice'ın hash'i kayda gömülmeli (prototipte `presentedNoticeHash`).

---

## 5. Üretim sertleştirme (Katalog Profil B → C)

Hash-chain tek başına **tespit** sağlar, önleme değil. Mevcut asset'lerle önerilen katmanlar:

1. **3.3 — Vault Transit asimetrik imza (ed25519):** her kayıt yazılırken `row_hash` imzalanır; `signature` + `key_version` kolonları. Non-repudiation. Lokal Vault disabled → `ISigningService` + dev-key fallback (`RedisSettings.UseVault` deseni).
2. **3.4 — RFC 3161 / Kamu SM nitelikli zaman damgası:** periyodik olarak zincir başının (head) hash'i `System.Security.Cryptography.Pkcs.Rfc3161TimestampRequest` ile damgalanır. TR'de en güçlü hukuki delil; .NET-native, Nethereum gerekmez.
3. **Immutability:** `REVOKE` + trigger + retention/purge hariç tutma + backup/restore süreçlerinde bu tablonun korunması.

> Pasif asset'ler: Nethereum/blockchain yazma yolu **ölü** (Goerli decommissioned) — RFC 3161 onu domine eder, kullanma. immudb/QLDB yeni altyapıdır, gerek yok.

---

## 6. Hukuk ekibiyle teyit edilecekler (Katalog §08)

1. **Saklama süresi:** işleme-ömrü + 3-5 yıl zamanaşımı (consent tablosu purge'tan muaf).
2. **Zorunlu kanıt sınıfı:** iç hash-chain yeterli mi, yoksa nitelikli zaman damgası / KEP şart mı?
3. **"Hash kişisel veri mi"** tartışması (Merkle/anchoring tasarımını etkiler).
4. **crypto-shredding** ile Art.17 (silme hakkı) uyumu yeterli sayılır mı?
5. **proof-of-presentation** hukuken aranıyor mu (kullanıcının ne gördüğü)?

İlgili: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`HANDOFF-FRONTEND.md`](./HANDOFF-FRONTEND.md)
