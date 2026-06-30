import { type DocumentType } from './types';

/** "Ayşe Yılmaz" → "AY" (avatar fallback). */
export function getInitialsFallback(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

/** Onay kutucuğu cümleleri (presentedNoticeHash'e de giren etiketler). */
export const CHECKBOX_LABELS: Record<DocumentType, string> = {
  terms: 'Kullanım Koşulları’nı (Terms) okudum ve kabul ediyorum.',
  privacy: 'Gizlilik Politikası’nı (Privacy) okudum.',
  cookie_policy: 'Zorunlu olmayan çerezler için Çerez Politikası’nı kabul ediyorum. (isteğe bağlı)',
  acceptable_use_policy: 'Kabul Edilebilir Kullanım Politikası’nı (AUP) okudum ve kabul ediyorum.',
  dpa: 'Veri İşleme Sözleşmesi’ni (DPA) okudum ve kabul ediyorum.',
  consumer_purchase_agreement: 'Tüketici Satış Sözleşmesi’ni okudum ve kabul ediyorum.',
  cancellation_policy: 'İptal & İade Politikası’nı okudum ve onaylıyorum.'
};
