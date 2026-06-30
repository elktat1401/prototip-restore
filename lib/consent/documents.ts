/**
 * Katman 1.1 — Sürümlü belge snapshot'ları.
 *
 * Gerçek sistemde bu metinler Postgres'te append-only satır (veya OBS/S3 WORM)
 * olarak saklanır; her sürüm değişmezdir. Prototipte statik veri olarak tutulur.
 *
 * `terms` ve `privacy` için v1.0 + v2.0 (ESASLI değişiklik) tanımlıdır → eski
 * sürüme onay vermiş kullanıcı giriş (signin) yapınca re-consent bariyeri
 * tetiklenir (Katalog §1). Diğer metinler tek sürümlüdür (v1.0 = güncel).
 *
 * Sözleşme seti (otoritetif):
 *   signup/signin → terms, privacy, cookie_policy, acceptable_use_policy, dpa
 *   checkout      → consumer_purchase_agreement, cancellation_policy
 */

import { hashText } from './hash-chain';
import { type DocumentType, type DocumentVersion } from './types';

export const DOCUMENTS: DocumentVersion[] = [
  // ===================== Kullanım Koşulları (Terms) =====================
  {
    documentType: 'terms',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'GitSec Kullanım Koşulları (Terms of Service)',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# GitSec Kullanım Koşulları (v1.0)

Yürürlük: 1 Ocak 2025

1. TARAFLAR VE KONU
Bu koşullar, GitSec yedekleme ve güvenlik platformunu ("Hizmet") kullanan
kullanıcı ile hizmet sağlayıcı arasındaki ilişkiyi düzenler.

2. HİZMETİN KAPSAMI
GitSec; GitHub ve Bitbucket depolarınızın yedeklenmesi, zamanlanmış yedekleme
ve geri yükleme işlevlerini sunar.

3. KULLANICI YÜKÜMLÜLÜKLERİ
Kullanıcı, hesap güvenliğinden ve eriştiği depoların yetkilerinden sorumludur.

4. ÜCRETLENDİRME
Freemium plan ücretsizdir. Ücretli planların koşulları checkout adımında
ayrıca sunulur.`
  },
  {
    documentType: 'terms',
    version: 'v2.0',
    effectiveDate: '2026-06-01',
    title: 'GitSec Kullanım Koşulları (Terms of Service)',
    materiality: 'material',
    changeSummary:
      'ESASLI DEĞİŞİKLİK: Yeni alt-işleyenler (storage provider) ve sınır ötesi veri aktarımı maddeleri eklendi; sorumluluk sınırları güncellendi. Mevcut kullanıcılardan yeniden onay gerektirir.',
    body: `# GitSec Kullanım Koşulları (v2.0)

Yürürlük: 1 Haziran 2026

1. TARAFLAR VE KONU
Bu koşullar, GitSec yedekleme ve güvenlik platformunu ("Hizmet") kullanan
kullanıcı ile hizmet sağlayıcı arasındaki ilişkiyi düzenler.

2. HİZMETİN KAPSAMI
GitSec; GitHub ve Bitbucket depolarınızın yedeklenmesi, zamanlanmış yedekleme,
geri yükleme ve denetim (audit) işlevlerini sunar.

3. ALT-İŞLEYENLER VE VERİ AKTARIMI  (YENİ — v2.0)
Yedek verileriniz, seçtiğiniz depolama sağlayıcısında (Huawei OBS, AWS S3,
Google Drive, OneDrive) saklanabilir. Bu sağlayıcılar alt-işleyen sıfatıyla
hareket eder ve veriler yurt dışında işlenebilir.

4. KULLANICI YÜKÜMLÜLÜKLERİ
Kullanıcı, hesap güvenliğinden ve eriştiği depoların yetkilerinden sorumludur.

5. SORUMLULUK SINIRI  (GÜNCELLENDİ — v2.0)
Hizmet sağlayıcının sorumluluğu, ilgili aya ait ödenen ücretle sınırlıdır.

6. ÜCRETLENDİRME
Freemium plan ücretsizdir. Ücretli planların koşulları checkout adımında sunulur.`
  },

  // ===================== Gizlilik Politikası (Privacy) =====================
  {
    documentType: 'privacy',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'GitSec Gizlilik Politikası & KVKK Aydınlatma Metni',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# Gizlilik Politikası (v1.0)

Yürürlük: 1 Ocak 2025

1. VERİ SORUMLUSU
GitSec, 6698 sayılı KVKK ve GDPR kapsamında veri sorumlusudur.

2. İŞLENEN VERİLER
Hesap bilgileri (ad, soyad, e-posta) ve depo meta verileri işlenir.

3. İŞLEME AMAÇLARI
Hizmetin sunulması, hesap yönetimi ve güvenlik.

4. HAKLARINIZ
KVKK md.11 / GDPR md.15-22 kapsamındaki haklarınızı kullanabilirsiniz.`
  },
  {
    documentType: 'privacy',
    version: 'v2.0',
    effectiveDate: '2026-06-01',
    title: 'GitSec Gizlilik Politikası & KVKK Aydınlatma Metni',
    materiality: 'material',
    changeSummary:
      'ESASLI DEĞİŞİKLİK: İşleme amaçlarına "ürün analitiği" ve yeni alt-işleyenlerle veri paylaşımı eklendi. Yeniden bilgilendirme gerektirir.',
    body: `# Gizlilik Politikası (v2.0)

Yürürlük: 1 Haziran 2026

1. VERİ SORUMLUSU
GitSec, 6698 sayılı KVKK ve GDPR kapsamında veri sorumlusudur.

2. İŞLENEN VERİLER
Hesap bilgileri (ad, soyad, e-posta), depo meta verileri ve kullanım/analitik
verileri işlenir.

3. İŞLEME AMAÇLARI  (GENİŞLETİLDİ — v2.0)
Hizmetin sunulması, hesap yönetimi, güvenlik ve ürün analitiği.

4. ALT-İŞLEYENLERLE PAYLAŞIM  (YENİ — v2.0)
Veriler, bulut depolama ve analitik alt-işleyenlerle KVKK md.8-9 çerçevesinde
paylaşılabilir.

5. HAKLARINIZ
KVKK md.11 / GDPR md.15-22 kapsamındaki haklarınızı kullanabilirsiniz.`
  },

  // ===================== Çerez Politikası (Cookie) — opsiyonel/geri çekilebilir =====================
  {
    documentType: 'cookie_policy',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'GitSec Çerez Politikası (Cookie Policy)',
    materiality: 'minor',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# Çerez Politikası (v1.0)

Yürürlük: 1 Ocak 2025

1. ZORUNLU ÇEREZLER
Oturum ve güvenlik için gereken çerezler rıza gerektirmez.

2. ZORUNLU OLMAYAN ÇEREZLER  (RIZAYA BAĞLI)
Analitik ve tercih çerezleri yalnızca açık rızanızla kullanılır.

3. RIZANIN GERİ ÇEKİLMESİ
Bu çerez rızasını dilediğiniz zaman, vermek kadar kolay biçimde geri
çekebilirsiniz. Bu kutucuk ÖNCEDEN İŞARETLİ DEĞİLDİR ve onay isteğe bağlıdır.`
  },

  // ===================== Kabul Edilebilir Kullanım (AUP) =====================
  {
    documentType: 'acceptable_use_policy',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'Kabul Edilebilir Kullanım Politikası (Acceptable Use Policy)',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# Kabul Edilebilir Kullanım Politikası (v1.0)

Yürürlük: 1 Ocak 2025

1. YASAK KULLANIMLAR
Hizmet; yasa dışı içerik barındırmak, kötü amaçlı yazılım dağıtmak veya
sistemlere yetkisiz erişim için kullanılamaz.

2. KAYNAK KULLANIMI
Otomatik/aşırı yük oluşturan kullanımda hız sınırlama uygulanabilir.

3. İHLAL SONUÇLARI
İhlal hâlinde hesap askıya alınabilir veya sonlandırılabilir.`
  },

  // ===================== Veri İşleme Sözleşmesi (DPA) =====================
  {
    documentType: 'dpa',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'Veri İşleme Sözleşmesi (Data Processing Agreement)',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# Veri İşleme Sözleşmesi — DPA (v1.0)

Yürürlük: 1 Ocak 2025

1. ROLLER
Müşteri veri sorumlusu, GitSec veri işleyendir.

2. İŞLEMENİN KONUSU
GitSec, yalnızca müşterinin talimatları doğrultusunda yedekleme amacıyla
veri işler.

3. ALT-İŞLEYENLER
Onaylı alt-işleyenler (bulut depolama) listesi yayımlanır; değişiklik bildirilir.

4. AKTARIM GÜVENCELERİ
Sınır ötesi aktarımlarda Standart Sözleşme Hükümleri (SCC) ve uygun güvenceler
uygulanır.`
  },

  // ===================== Tüketici Satış Sözleşmesi (checkout) =====================
  {
    documentType: 'consumer_purchase_agreement',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'Tüketici Satış Sözleşmesi (Consumer Purchase Agreement)',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# Tüketici Satış Sözleşmesi (v1.0)

Yürürlük: 1 Ocak 2025

1. KONU
İşbu sözleşme, GitSec ücretli abonelik planının (Pro / Business) elektronik
ortamda satışına ilişkindir.

2. ABONELİK BEDELİ VE ÖDEME
Seçilen planın aylık/yıllık bedeli, ödeme ekranında belirtildiği şekildedir.

3. İFA
Dijital hizmetin ifasına, onayınızla birlikte derhal başlanır.

4. YENİLEME
Abonelik, iptal edilmediği sürece dönem sonunda otomatik yenilenir.`
  },

  // ===================== İptal & İade Politikası (checkout) =====================
  {
    documentType: 'cancellation_policy',
    version: 'v1.0',
    effectiveDate: '2025-01-01',
    title: 'İptal & İade Politikası (Cancellation Policy)',
    materiality: 'material',
    changeSummary: 'İlk yürürlük sürümü.',
    body: `# İptal & İade Politikası (v1.0)

Yürürlük: 1 Ocak 2025

1. İPTAL
Aboneliğinizi panelden dilediğiniz zaman iptal edebilirsiniz; iptal, dönem
sonunda yürürlüğe girer.

2. CAYMA HAKKI
Dijital hizmetin ifasına onayınızla başlanması hâlinde cayma hakkı
kullanılamaz (Mesafeli Sözleşmeler Yön. m.15).

3. İADE
Mevzuatın izin verdiği hâllerde, ödeme yöntemine iade yapılır.`
  }
];

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

/** Bir tür için tüm sürümler, yürürlük tarihine göre artan. */
export function getDocumentVersions(type: DocumentType): DocumentVersion[] {
  return DOCUMENTS.filter(d => d.documentType === type).sort((a, b) =>
    a.effectiveDate.localeCompare(b.effectiveDate)
  );
}

/** Bir türün GÜNCEL (en son yürürlüğe giren) sürümü. */
export function getCurrentVersion(type: DocumentType): DocumentVersion {
  const versions = getDocumentVersions(type);
  return versions[versions.length - 1];
}

export function getDocument(type: DocumentType, version: string): DocumentVersion | undefined {
  return DOCUMENTS.find(d => d.documentType === type && d.version === version);
}

/** Metin gövdesinin içerik hash'i (Katman 1.1 ↔ kayıttaki documentContentHash). */
export async function getDocumentContentHash(type: DocumentType, version: string): Promise<string> {
  const doc = getDocument(type, version);
  if (!doc) throw new Error(`Belge bulunamadı: ${type} ${version}`);
  return hashText(doc.body);
}
