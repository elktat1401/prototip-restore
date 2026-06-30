# Frontend Handoff — Rıza Saklama (Consent Ledger)

**Kime:** `git-security-dashboard-ui` (Next.js 16 / React 19 / shadcn / next-intl / React Query / CASL) ekibi.
**Ne:** Bu prototip ana projeyle **birebir aynı stack ve tasarım sistemiyle** yazıldı; bileşenler doğrudan taşınabilir. Bu doküman: bileşen envanteri, state modeli ve ana projeye entegrasyon adımları.

Bağlam: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · Backend sözleşmesi: [`HANDOFF-BACKEND.md`](./HANDOFF-BACKEND.md).

---

## 1. Çalıştırma

```bash
pnpm install && pnpm dev   # http://localhost:3000
```
Stack ana projeyle aynı; `components/ui/*` ana repodan kopyalanmıştır (sadece `dialog`/`alert-dialog` saf shadcn sürümüne çevrildi — orijinaller next-intl + drawer'a bağlıydı).

---

## 2. Bileşen envanteri

| Bileşen | Dosya | Görev | Önemli prop'lar |
|---|---|---|---|
| `ConsentForm` | `components/consent/consent-form.tsx` | Çok-belgeli onay yakalama (signup + checkout ortak) | `documentTypes`, `requiredTypes`, `method`, `submitLabel`, `onComplete` |
| `ConsentCheckboxItem` | `…/consent-checkbox-item.tsx` | Tek onay satırı (pre-checked değil) + "Metni oku" | `doc`, `checked`, `onCheckedChange`, `required` |
| `LegalDocumentDialog` | `…/legal-document.tsx` | Sürümlü metin görüntüleyici (MarkdownLite) | `doc`, `children` (trigger) |
| `ConsentReceiptDialog` | `…/consent-receipt-dialog.tsx` | Rıza makbuzu (oluşan kayıtlar + hash'ler) | `open`, `records` |
| `ReconsentGate` | `…/reconsent-gate.tsx` | Signin'de kapatılamaz yeniden-onay modalı | `onSatisfied?` |
| `ConsentStatusList` | `…/consent-status-list.tsx` | Profil izin durumu + geri çek / yeniden ver | — |
| `HashChainExplorer` | `…/hash-chain-explorer.tsx` | Defter + canlı doğrulama + kurcala + incele | — |
| `RecordInspector` | `…/record-inspector.tsx` | Tek kayıt: canonical payload + hash hesabı | `record`, `verification` |
| `ChainLinkVisual` | `…/chain-link-visual.tsx` | Zincir blokları + bağ kırılması görseli | `records`, `verification` |
| `TemporalView` | `…/temporal-view.tsx` | "T anında rıza neydi?" zaman yolculuğu | — |
| `HashValue` | `…/hash-value.tsx` | Hash gösterimi (kısalt + kopyala + tooltip) | `value`, `full`, `tone` |
| `LedgerSummary` | `…/ledger-summary.tsx` | Özet kart (kayıt sayısı + zincir durumu) | — |

---

## 3. State modeli ve mock → API geçişi

Tüm durum tek reaktif store'da: `lib/consent/use-consent-store.ts` (`useSyncExternalStore`, localStorage). Ana projede bunu **React Query + custom fetch (api-factory)** ile değiştirin. Eşleme:

| Prototip (store) | Üretim (React Query hook) | Endpoint |
|---|---|---|
| `useConsentStore().records` | `useConsentLedger()` | `GET /consent/ledger` |
| `appendEvents(inputs)` | `useCreateConsentEvents()` (mutation) | `POST /consent/events` |
| `grant/withdraw` | aynı mutation, action ile | `POST /consent/events` |
| `deriveCurrentState` | `useConsentState()` | `GET /consent/state` |
| `deriveStateAsOf(T)` | `useConsentState({ asOf })` | `GET /consent/state?asOf=` |
| `getReconsentRequirements` | `useReconsentRequirements()` | `GET /consent/requirements` |
| `verifyChain` | `useChainVerification()` | `GET /consent/verify` (veya istemcide defense-in-depth tekrar) |
| `getCurrentVersion/getDocument` | `useDocument(type, version?)` | `GET /documents/{type}/...` |

- `hooks/api/` desenine uyun: domain query-key factory (`consentKeys`), `staleTime`, mutation sonrası ilgili key'leri invalidate.
- **Hash hesaplama prod'da backend'dedir.** Frontend `presentedNoticeText`'i (gösterilen tam bildirim) gönderir; sunucu hash + zincir + zaman damgasını üretir. `verifyChain`/`canonicalize` (`lib/consent/hash-chain.ts`) istemcide **isteğe bağlı defense-in-depth** doğrulama için tutulabilir — bu durumda canonical kuralı backend ile birebir aynı kalmalı.
- IP/User-Agent prototipte mock; prod'da sunucu doldurur (gönderme).

---

## 4. Ana projeye entegrasyon adımları

1. **Signup onayını değiştir** — [`app/(auth)/sign-up/components/user-auth-form.tsx`](../../git-security-dashboard-ui/app/(auth)/sign-up/components/user-auth-form.tsx) şu an `acceptedTermsOfService` / `acceptedPrivacyPolicy` **boolean**'larını alıyor. Bunları `ConsentForm` deseniyle değiştir: 5 signup metni (`terms, privacy, cookie_policy, acceptable_use_policy, dpa`), zorunlular hariç cookie opt-in. Signup mutation'ı `POST /consent/events` ile yapılan onayları içermeli. `SignupFormSchema` (Zod) güncellenmeli (boolean yerine onaylanan tür/sürüm listesi).
2. **Checkout onayı** — Ücretli plana geçiş ekranında `consumer_purchase_agreement` + `cancellation_policy` için `ConsentForm` (method `checkout_form_checkbox`).
3. **Signin re-consent bariyeri** — `ReconsentGate`'i tenant-scoped authenticated layout'a (`app/[spaceId]/layout.tsx` veya üst düzey provider) ekle. Giriş sonrası `GET /consent/requirements` boş değilse kapatılamaz modal; onaylanmadan korumalı route'lara geçiş engellenir (middleware + UI birlikte).
4. **Profil > İzinler** — `ConsentStatusList`'i `app/[spaceId]/(settings)` altına ekle; opt-out (cookie) ve stale (re-consent adayı) durumlarını göster.
5. **Denetçi / Audit ekranı** — `HashChainExplorer` + `TemporalView`'ı audit-logs alanına ekle. **CASL ile gate'le:** sadece denetçi/DPO/admin yeteneği olan görür (`<Can I="read" a="ConsentLedger">`). "Kurcala" aksiyonları yalnızca prototip demosu içindir — prod'a TAŞIMA.
6. **i18n** — Prototip stringleri Türkçe sabittir; ana projede `messages/<locale>` altına taşı ve `useTranslations` ile bağla. `DOCUMENT_LABELS` / `CHECKBOX_LABELS` (`lib/consent/`) çeviri anahtarlarına dönüştürülmeli.
7. **Tasarım sistemi** — Ekstra iş yok; `components/ui/*` zaten ana projeyle aynı. Prototipteki `dialog`/`alert-dialog` saf sürümünü KULLANMA; ana projenin kendi (next-intl'li, responsive→drawer) sürümleri geçerli.
8. **Sözleşme metinleri** — Prototipte statik (`lib/consent/documents.ts`). Prod'da `GET /documents/...`'tan gelir; mevcut `app/(public)/terms`, `privacy` MDX'leri sürümlenmeli ve diğer 5 metin (cookie, AUP, DPA, purchase, cancellation) eklenmeli.

---

## 5. Demo akışları (referans)

`/signup` · `/checkout` · `/login` (re-consent) · `/profile` (opt-out) · `/ledger` (doğrulama + kurcala→cascade + temporal). Hepsi aynı zincire yazar; `/` genel bakışta canlı durum görünür. Detaylı senaryo: [`../README.md`](../README.md).

---

## 6. Dikkat / sınırlar

- Hash zinciri prototipte **istemcide** hesaplanır (gösterim amaçlı). Üretimde otorite **backend**'dir.
- "Kurcala" ve "Demoyu sıfırla" yalnızca demo araçlarıdır.
- Erişilebilirlik/i18n cilası prototip kapsamı dışında bırakıldı; taşırken `next-intl` + a11y gözden geçirilmeli.
