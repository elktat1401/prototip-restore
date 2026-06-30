/**
 * GitSec — Rıza Saklama Domain Modeli (prototip)
 * ------------------------------------------------------------------
 * Katman eşlemesi (GDPR-KVKK Teknik Çözüm Kataloğu):
 *   • Katman 1.1  → DocumentVersion: gösterilen metnin sürümlü SNAPSHOT'ı.
 *   • Katman 2.2  → ConsentRecord: append-only rıza OLAYI kaydı; "current state"
 *                   ve "T anındaki state" (temporal / time-travel) türetilir.
 *   • Katman 3.1  → prevHash + rowHash: SHA-256 hash zinciri (tamper-evidence).
 *
 * Bu prototip backend'e BAĞLI DEĞİLDİR. Tüm veri tarayıcıda localStorage'da
 * tutulur; hash'ler Web Crypto (SHA-256) ile tarayıcıda hesaplanır.
 */

// ---------------------------------------------------------------------------
// Sözleşme / metin türleri (Katman 1.1)
// ---------------------------------------------------------------------------

export type DocumentType =
  | 'terms' // Kullanım Koşulları / Terms of Service (signup+signin, zorunlu)
  | 'privacy' // Gizlilik Politikası / Privacy Policy (signup+signin, zorunlu)
  | 'cookie_policy' // Çerez Politikası / Cookie Policy (signup+signin, isteğe bağlı + geri çekilebilir)
  | 'acceptable_use_policy' // Kabul Edilebilir Kullanım Politikası / AUP (signup+signin, zorunlu)
  | 'dpa' // Veri İşleme Sözleşmesi / Data Processing Agreement (signup+signin, zorunlu)
  | 'consumer_purchase_agreement' // Tüketici Satış Sözleşmesi / Consumer Purchase Agreement (checkout, zorunlu)
  | 'cancellation_policy'; // İptal & İade Politikası / Cancellation Policy (checkout, zorunlu)

/**
 * Giriş (signin) anında güncel sürüm kontrolüne tabi → re-consent bariyeri.
 * Bağlayıcı/zorunlu signup metinleri. Cookie isteğe bağlı olduğundan bariyere DAHİL DEĞİL.
 */
export const RECONSENT_GATED_DOCUMENTS: DocumentType[] = ['terms', 'privacy', 'acceptable_use_policy', 'dpa'];

/** Signup / signin adımında sunulan metinler. */
export const SIGNUP_DOCUMENTS: DocumentType[] = [
  'terms',
  'privacy',
  'cookie_policy',
  'acceptable_use_policy',
  'dpa'
];

/** Checkout (Freemium → ücretli) adımında sunulan satın-alma metinleri. */
export const CHECKOUT_DOCUMENTS: DocumentType[] = ['consumer_purchase_agreement', 'cancellation_policy'];

/** Açık rıza niteliğinde (opt-in/opt-out) — pre-checked YASAK, geri çekilebilir. */
export const OPTIONAL_CONSENT_DOCUMENTS: DocumentType[] = ['cookie_policy'];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  terms: 'Kullanım Koşulları',
  privacy: 'Gizlilik Politikası',
  cookie_policy: 'Çerez Politikası',
  acceptable_use_policy: 'Kabul Edilebilir Kullanım Politikası',
  dpa: 'Veri İşleme Sözleşmesi (DPA)',
  consumer_purchase_agreement: 'Tüketici Satış Sözleşmesi',
  cancellation_policy: 'İptal & İade Politikası'
};

/** Değişikliğin esaslı (re-consent gerektiren) mı yoksa minor (yazım) mı olduğu — Katalog §1. */
export type ChangeMateriality = 'material' | 'minor';

/** Katman 1.1 — gösterilen metnin sürümlü, değişmez snapshot'ı. */
export interface DocumentVersion {
  documentType: DocumentType;
  version: string; // örn. "v2.0"
  effectiveDate: string; // ISO-8601, sürümün yürürlüğe girdiği tarih
  title: string;
  /** Kullanıcıya AYNEN gösterilen metin (snapshot). Gerçekte S3/DB'de saklanır. */
  body: string;
  changeSummary: string; // bu sürümde ne değişti
  materiality: ChangeMateriality; // material → eski rızalar geçersiz, re-consent şart
}

// ---------------------------------------------------------------------------
// Rıza olayı kaydı (Katman 2.2 + 3.1)
// ---------------------------------------------------------------------------

export type ConsentAction = 'GRANTED' | 'WITHDRAWN';

export type ConsentMethod =
  | 'signup_form_checkbox'
  | 'checkout_form_checkbox'
  | 'reconsent_modal'
  | 'profile_toggle'
  | 'profile_withdraw_button';

export const ACTION_LABELS: Record<ConsentAction, string> = {
  GRANTED: 'Onaylandı',
  WITHDRAWN: 'Geri Çekildi'
};

export const METHOD_LABELS: Record<ConsentMethod, string> = {
  signup_form_checkbox: 'Kayıt formu — rıza kutucuğu işaretlenerek',
  checkout_form_checkbox: 'Ödeme (checkout) ekranı — rıza kutucuğu işaretlenerek',
  reconsent_modal: 'Yeniden onay ekranı (modal) üzerinden',
  profile_toggle: 'Profil > İzinler ekranından açma/kapama ile',
  profile_withdraw_button: 'Profil > "Rızayı Geri Çek" butonu ile'
};

/**
 * Katman 2.2 — append-only rıza olayı. ASLA UPDATE/DELETE edilmez; her eylem
 * (verme/geri çekme) YENİ satırdır. "Güncel durum" en son olaydan türetilir.
 *
 * Katman 3.1 — `prevHash` + `rowHash` ile hash zinciri. `occurredAt` (olayın
 * gerçekleştiği AN) hash'in içine girer → "şu tarihte yapıldı" kriptografik
 * olarak zincire çakılır.
 */
export interface ConsentRecord {
  // --- kimlik & zincir konumu ---
  id: string; // benzersiz kayıt kimliği (uuid-vari)
  seq: number; // zincir sırası (0 = GENESIS)

  // --- kim ---
  subjectId: string;
  subjectEmail: string;
  tenantId: string;

  // --- neye (Katman 1.1 snapshot'ına köprü) ---
  documentType: DocumentType;
  documentVersion: string;
  documentContentHash: string; // SHA-256(metin gövdesi) — hangi metne onay verildiğinin kanıtı

  // --- ne / nasıl ---
  action: ConsentAction;
  method: ConsentMethod;

  // --- proof-of-presentation (Katalog §06 "NOTABLE MISSING") ---
  /** Tıklama anında kullanıcıya AYNEN render edilen bildirimin SHA-256'sı. */
  presentedNoticeHash: string;

  // --- bağlamsal kanıt ---
  ipAddress: string; // prototipte mock
  userAgent: string;
  locale: string;

  // --- ne zaman ---
  occurredAt: string; // ISO-8601 UTC — olayın gerçekleştiği AN (hash'e girer)
  recordedAt: string; // ISO-8601 UTC — sisteme yazıldığı AN (temporal/system-time, hash'e girmez)

  // --- Katman 3.1 hash zinciri ---
  prevHash: string; // bir önceki kaydın rowHash'i (GENESIS: 64 sıfır)
  rowHash: string; // SHA-256(prevHash ‖ canonical(payload))
}

/** rowHash hesabına giren alanlar (id..occurredAt). recordedAt/prevHash/rowHash HARİÇ. */
export type ConsentPayload = Pick<
  ConsentRecord,
  | 'id'
  | 'seq'
  | 'subjectId'
  | 'subjectEmail'
  | 'tenantId'
  | 'documentType'
  | 'documentVersion'
  | 'documentContentHash'
  | 'action'
  | 'method'
  | 'presentedNoticeHash'
  | 'ipAddress'
  | 'userAgent'
  | 'locale'
  | 'occurredAt'
>;

// ---------------------------------------------------------------------------
// Türetilen görünümler
// ---------------------------------------------------------------------------

/** Bir metin türü için güncel (en son olaydan türetilen) rıza durumu. */
export interface CurrentConsentState {
  documentType: DocumentType;
  latest: ConsentRecord;
  isActive: boolean; // en son eylem GRANTED mı
  isStale: boolean; // onaylanan sürüm güncel sürümden eski mi (re-consent adayı)
  currentVersion: string; // metnin şu anki güncel sürümü
}

// ---------------------------------------------------------------------------
// Hash zinciri doğrulaması (Katman 3.1)
// ---------------------------------------------------------------------------

export interface RecordVerification {
  seq: number;
  id: string;
  /** Saklanan rowHash, yeniden hesaplanan hash ile eşleşiyor mu (içerik bütünlüğü). */
  contentIntact: boolean;
  /** prevHash, bir önceki kaydın rowHash'ine bağlanıyor mu (zincir bütünlüğü). */
  linkIntact: boolean;
  expectedRowHash: string;
  storedRowHash: string;
}

export interface ChainVerification {
  valid: boolean;
  total: number;
  firstBrokenSeq: number | null; // ilk bozulan kaydın seq'i (yoksa null)
  records: RecordVerification[];
}

// ---------------------------------------------------------------------------
// Sabitler
// ---------------------------------------------------------------------------

export const GENESIS_HASH = '0'.repeat(64);
export const STORAGE_KEY = 'gitsec_consent_ledger_v1';

export const DEMO_TENANT = { id: 'tenant_acme', name: 'Acme Yazılım A.Ş.' };
export const DEMO_USER = {
  id: 'user_10452',
  email: 'ayse.yilmaz@acme.com',
  name: 'Ayşe Yılmaz'
};
