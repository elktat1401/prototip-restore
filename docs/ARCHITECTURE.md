# Mimari — Rıza Saklama (Consent Ledger)

Bu doküman, prototipin tasarımını ve backend teknik analizindeki **katman menüsü** ile eşleşmesini anlatır. Hedef: KVKK md.7 / GDPR Art.7 kapsamında **sürümlü** ve **geçmişe-dönük-kanıtlanabilir** rıza saklama.

## 1. Üç ortogonal katman

Problem üç bağımsız katmana ayrılır; her katmandan bir yöntem seçilip birleştirilir. Bu prototipte seçimler:

| Katman | Soru | Seçilen yöntem | Prototipteki dosya |
|---|---|---|---|
| **1.1** | Belge metni nerede? | PostgreSQL ilişkisel kolon, sürümlü append-only **snapshot** | `lib/consent/documents.ts` |
| **2.2** | Rıza kaydı nasıl? | PostgreSQL **temporal / system-versioned** (history) | `lib/consent/store.ts` |
| **3.1** | Bütünlük nasıl? | **SHA-256 hash zinciri** (blockchain-vari) | `lib/consent/hash-chain.ts` |

> Katmanlar birbirinin yerine geçmez; **birlikte** çalışır. 1.1 "neye onay verildi"yi, 2.2 "kim/ne zaman/nasıl"ı, 3.1 "sonradan değiştirilmedi + o an vardı"yı taşır.

## 2. Sözleşme seti

| Belge (`DocumentType`) | Adım | Zorunlu? | Signin re-consent bariyeri? | Geri çekilebilir? |
|---|---|---|---|---|
| `terms` — Kullanım Koşulları | signup/signin | ✅ | ✅ | ✗ |
| `privacy` — Gizlilik Politikası | signup/signin | ✅ | ✅ | ✗ |
| `cookie_policy` — Çerez Politikası | signup/signin | ✗ (opt-in) | ✗ | ✅ |
| `acceptable_use_policy` — AUP | signup/signin | ✅ | ✅ | ✗ |
| `dpa` — Veri İşleme Sözleşmesi | signup/signin | ✅ | ✅ | ✗ |
| `consumer_purchase_agreement` — Tüketici Satış Sözleşmesi | checkout | ✅ | ✗ | ✗ |
| `cancellation_policy` — İptal & İade Politikası | checkout | ✅ | ✗ | ✗ |

> **Cookie Policy** bilinçli olarak *opt-in + geri çekilebilir* modellendi: zorunlu olmayan çerez rızası ePrivacy/KVKK'da gerçekten geri çekilebilir bir rızadır ve "pre-checked yasağı" + "opt-out" demolarının doğal taşıyıcısıdır. ToS/Privacy/AUP/DPA hizmetin kullanımı için bağlayıcıdır; bunların esaslı değişiminde **signin bariyeri** çıkar.

## 3. Veri modeli

### 3.1 Belge snapshot'ı (Katman 1.1) — `DocumentVersion`

```
documentType, version, effectiveDate, title, body (snapshot metni),
changeSummary, materiality ('material' | 'minor')
```
- `material` değişiklik → eski rızalar geçersiz, **re-consent** gerekir. `minor` (yazım) → gerekmez.
- `documentContentHash = SHA-256(body)` — kayda gömülerek "hangi metne onay verildi" kanıtlanır.

### 3.2 Rıza olayı (Katman 2.2 + 3.1) — `ConsentRecord`

```
// kimlik & zincir konumu
id, seq
// kim
subjectId, subjectEmail, tenantId
// neye (1.1'e köprü)
documentType, documentVersion, documentContentHash
// ne / nasıl
action ('GRANTED'|'WITHDRAWN'), method
// proof-of-presentation
presentedNoticeHash      // kullanıcıya AYNEN gösterilen bildirimin SHA-256'sı
// bağlamsal kanıt
ipAddress, userAgent, locale
// ne zaman
occurredAt               // olayın gerçekleştiği AN (ISO-8601 UTC) — hash'e GİRER
recordedAt               // sisteme yazıldığı AN (system-time) — hash'e GİRMEZ
// hash zinciri (3.1)
prevHash, rowHash
```

Kayıtlar **append-only**'dir: hiçbir satır UPDATE/DELETE edilmez. Geri çekme bile yeni bir `WITHDRAWN` satırıdır.

## 4. Hash zinciri (Katman 3.1)

### 4.1 Hesap

```
canonical(payload) = anahtarları alfabetik sıralı, boşluksuz, deterministik JSON
preimage(n)        = prevHash(n)  +  "\n"  +  canonical(payload(n))
rowHash(n)         = SHA-256_hex( preimage(n) )

prevHash(0) = "000…0" (64 sıfır, GENESIS)
prevHash(n) = rowHash(n-1)
```

**Hash'e giren payload (15 alan):** `id, seq, subjectId, subjectEmail, tenantId, documentType, documentVersion, documentContentHash, action, method, presentedNoticeHash, ipAddress, userAgent, locale, occurredAt`.
**Hariç:** `recordedAt, prevHash, rowHash`.

`occurredAt`'in hash'e girmesi, "şu an yapıldı" iddiasını zincire çakar — kullanıcının ne zaman onay verdiği sonradan değiştirilemez.

> ⚠️ **Determinizm kritiktir** (Katalog uyarısı). Kültür-bağımlı sayı/tarih biçimi veya tutarsız alan sırası sessiz hash uyuşmazlığı yaratır. Kural: alanlar alfabetik, zaman damgaları ISO-8601 **UTC** (`...Z`), ondalık/locale yok. Frontend ve backend AYNI canonical algoritmasını kullanmalıdır.

### 4.2 Doğrulama (cascade)

Zincir, GENESIS'ten itibaren **yeniden hesaplanarak** doğrulanır:

```
expectedPrev = GENESIS
her kayıt r için (seq sırasında):
  localRowHash  = SHA-256(r.prevHash ‖ canonical(payload(r)))   // içerik öz-tutarlılığı
  contentIntact = (localRowHash == r.rowHash)
  linkIntact    = (r.prevHash == expectedPrev)                  // dürüst zincire bağ
  expectedPrev  = SHA-256(expectedPrev ‖ canonical(payload(r))) // dürüst zincir başını ilerlet
```

Tek bir alanın (ör. `occurredAt`) değişip `rowHash`'in güncellenmemesi:
- O kayıtta `contentIntact = false` (kurcalama **kaynağı**),
- ve **sonraki tüm kayıtlarda** `linkIntact = false` (kırılma aşağıya **yayılır / cascade**).

`firstBrokenSeq` ilk kırık kaydı verir; `valid = (firstBrokenSeq == null)`.

```
GENESIS → [#0 ✓] → [#1 ✓] → [#2 ✗ içerik] → [#3 ⚠ bağ] → [#4 ⚠ bağ] ...
                                  ▲ kurcalanan kayıt        └ cascade
```

## 5. Temporal türetme (Katman 2.2)

"Güncel durum" ve "T anındaki durum" append-only olaylardan **türetilir**, ayrı bir mutable alanda tutulmaz:

```
deriveStateAsOf(records, T):
  for r in records sorted by (occurredAt, seq):
    if r.occurredAt <= T: state[r.documentType] = r   // last-wins
  → her documentType için en son olay
```
- `isActive`  = son eylem GRANTED.
- `isStale`   = GRANTED ama onaylanan sürüm güncel sürümden eski (re-consent adayı).
- `deriveCurrentState` = `deriveStateAsOf(records, +∞)`.

## 6. Re-consent algoritması (Katalog §1)

```
getReconsentRequirements(records):
  for type in RECONSENT_GATED_DOCUMENTS (terms, privacy, aup, dpa):
    güncel sürümde AKTİF (GRANTED) onay yoksa → re-consent gerekli
```
Signin anında bariyer: eksikler varsa **kapatılamaz modal** (escape/dış-tık engelli) çıkar, hepsi onaylanmadan panele geçilemez. `material` olmayan (yazım) değişiklikler bariyer tetiklemez.

## 7. Opt-out (Katalog §2)

Geri çekme, mevcut satırı **silmez** ve `true→false` yapmaz; zincire yeni bir `WITHDRAWN` kaydı ekler. Böylece veri işlenen dönemin hukuki dayanağı (önceki `GRANTED` logu) korunur.

## 8. Sınırlar ve üretim yükseltme yolu

- **Hash zinciri tek başına "tespit" sağlar, "önleme" değil.** Tam yetkili insider zinciri yeniden hesaplayabilir.
- **Önerilen üretim profili (Katalog Profil B):** 1.1 snapshot + 2.1/2.2 append-only/temporal (trigger `RAISE EXCEPTION` + DB rol `REVOKE`) + **3.1 hash-chain + 3.3 Vault asimetrik imza + periyodik 3.4 RFC 3161 / Kamu SM zaman damgası**.
- **proof-of-presentation** (`presentedNoticeHash`) bu prototipte yakalanır; üretimde tıklama anında server-rendered notice hash'i kullanılmalı.
- Hukuk ekibi teyidi: saklama süresi, zorunlu kanıt sınıfı, "hash kişisel veri mi", crypto-shredding ile Art.17 uyumu (bkz. `HANDOFF-BACKEND.md`).

İlgili: [`HANDOFF-BACKEND.md`](./HANDOFF-BACKEND.md) · [`HANDOFF-FRONTEND.md`](./HANDOFF-FRONTEND.md)
