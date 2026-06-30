/**
 * Rıza defteri (ledger) veri & kalıcılık katmanı.
 *
 *  • Kalıcılık: tarayıcı localStorage (backend YOK).
 *  • Katman 2.2: kayıtlar append-only; "güncel durum" ve "T anındaki durum"
 *    (temporal time-travel) en son olaylardan TÜRETİLİR — satır güncellenmez.
 *  • Katman 3.1: her ekleme bir önceki kaydın rowHash'ine zincirlenir.
 *
 * Reaktif arayüz (React hook + abonelik) `use-consent-store.ts` içindedir.
 */

import { CHECKBOX_LABELS } from './copy';
import { getCurrentVersion, getDocument, getDocumentContentHash } from './documents';
import { computeRowHash, hashText } from './hash-chain';
import {
  type ConsentAction,
  type ConsentMethod,
  type ConsentPayload,
  type ConsentRecord,
  type CurrentConsentState,
  DEMO_TENANT,
  DEMO_USER,
  type DocumentType,
  GENESIS_HASH,
  RECONSENT_GATED_DOCUMENTS,
  STORAGE_KEY
} from './types';

// ---------------------------------------------------------------------------
// Mock bağlam (prototip — gerçekte sunucu HttpContext'ten gelir)
// ---------------------------------------------------------------------------

export const DEMO_IP = '88.230.14.207';

function currentUserAgent(): string {
  if (typeof navigator !== 'undefined' && navigator.userAgent) return navigator.userAgent;
  return 'Mozilla/5.0 (prototype; no-backend) GitSecConsentLedger/0.1';
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `rec_${Math.abs(hashCode(`${Date.now()}_${Math.random()}`))}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * "Proof-of-presentation" metni: kullanıcının ekranda GÖRDÜĞÜ bağlamın birebir
 * temsili (başlık + sürüm + rıza kutucuğu etiketi + metin gövdesi). Bunun hash'i
 * kayda `presentedNoticeHash` olarak gömülür → "bana bu gösterilmedi" itirazına
 * karşı kanıt (Katalog §06 NOTABLE MISSING).
 */
export function composePresentedNotice(
  type: DocumentType,
  version: string,
  checkboxLabel: string
): string {
  const doc = getDocument(type, version);
  const header = doc ? `${doc.title} (${doc.version})` : `${type} (${version})`;
  return `${header}\n[ONAY KUTUCUĞU] ${checkboxLabel}\n---\n${doc?.body ?? ''}`;
}

// ---------------------------------------------------------------------------
// localStorage I/O
// ---------------------------------------------------------------------------

export function loadRecords(): ConsentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ConsentRecord[]).sort((a, b) => a.seq - b.seq);
  } catch {
    return [];
  }
}

export function saveRecords(records: ConsentRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function clearRecords(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Kayıt üretimi (Katman 3.1 zincirleme)
// ---------------------------------------------------------------------------

export interface ConsentEventInput {
  documentType: DocumentType;
  documentVersion?: string; // varsayılan: güncel sürüm
  action: ConsentAction;
  method: ConsentMethod;
  /** Kullanıcıya gösterilen tam bildirim metni (presentedNoticeHash için). */
  presentedNoticeText: string;
  occurredAt?: string; // varsayılan: şimdi
  recordedAt?: string; // varsayılan: occurredAt
  ipAddress?: string;
  userAgent?: string;
  locale?: string;
}

async function buildRecord(prev: ConsentRecord | null, input: ConsentEventInput): Promise<ConsentRecord> {
  const documentVersion = input.documentVersion ?? getCurrentVersion(input.documentType).version;
  const occurredAt = input.occurredAt ?? nowIso();
  const recordedAt = input.recordedAt ?? occurredAt;
  const seq = prev ? prev.seq + 1 : 0;
  const prevHash = prev ? prev.rowHash : GENESIS_HASH;

  const documentContentHash = await getDocumentContentHash(input.documentType, documentVersion);
  const presentedNoticeHash = await hashText(input.presentedNoticeText);

  const payload: ConsentPayload = {
    id: genId(),
    seq,
    subjectId: DEMO_USER.id,
    subjectEmail: DEMO_USER.email,
    tenantId: DEMO_TENANT.id,
    documentType: input.documentType,
    documentVersion,
    documentContentHash,
    action: input.action,
    method: input.method,
    presentedNoticeHash,
    ipAddress: input.ipAddress ?? DEMO_IP,
    userAgent: input.userAgent ?? currentUserAgent(),
    locale: input.locale ?? 'tr-TR',
    occurredAt
  };

  const rowHash = await computeRowHash(prevHash, payload);

  return { ...payload, recordedAt, prevHash, rowHash };
}

/** Verilen zincire bir veya birden çok olay ekler (immutable yeni dizi döndürür). */
export async function appendEvents(
  records: ConsentRecord[],
  inputs: ConsentEventInput[]
): Promise<ConsentRecord[]> {
  const chain = [...records].sort((a, b) => a.seq - b.seq);
  for (const input of inputs) {
    const prev = chain.length ? chain[chain.length - 1] : null;
    chain.push(await buildRecord(prev, input));
  }
  return chain;
}

// ---------------------------------------------------------------------------
// Seed (ilk açılışta) — zengin bir geçmiş: signup + checkout + opt-out
// ---------------------------------------------------------------------------

export async function buildSeedRecords(): Promise<ConsentRecord[]> {
  const notice = (t: DocumentType, v: string, label: string) => composePresentedNotice(t, v, label);
  const sg = (t: DocumentType, v: string, at: string): ConsentEventInput => ({
    documentType: t,
    documentVersion: v,
    action: 'GRANTED',
    method: 'signup_form_checkbox',
    occurredAt: at,
    presentedNoticeText: notice(t, v, CHECKBOX_LABELS[t])
  });
  const co = (t: DocumentType, v: string, at: string): ConsentEventInput => ({
    documentType: t,
    documentVersion: v,
    action: 'GRANTED',
    method: 'checkout_form_checkbox',
    occurredAt: at,
    presentedNoticeText: notice(t, v, CHECKBOX_LABELS[t])
  });

  const inputs: ConsentEventInput[] = [
    // Kayıt (signup) — 15 Oca 2026. terms/privacy v1.0 onaylandı; güncel v2.0 → signin'de bariyer.
    sg('terms', 'v1.0', '2026-01-15T09:12:30.000Z'),
    sg('privacy', 'v1.0', '2026-01-15T09:12:31.000Z'),
    sg('acceptable_use_policy', 'v1.0', '2026-01-15T09:12:32.000Z'),
    sg('dpa', 'v1.0', '2026-01-15T09:12:33.000Z'),
    sg('cookie_policy', 'v1.0', '2026-01-15T09:12:34.000Z'),
    // Checkout (Freemium → Pro) — 15 Mar 2026
    co('consumer_purchase_agreement', 'v1.0', '2026-03-15T14:05:10.000Z'),
    co('cancellation_policy', 'v1.0', '2026-03-15T14:05:11.000Z'),
    // Opt-out — 20 May 2026: çerez (cookie) rızası geri çekildi. Satır SİLİNMEZ; yeni WITHDRAWN kaydı.
    {
      documentType: 'cookie_policy',
      documentVersion: 'v1.0',
      action: 'WITHDRAWN',
      method: 'profile_withdraw_button',
      occurredAt: '2026-05-20T11:15:00.000Z',
      presentedNoticeText: notice('cookie_policy', 'v1.0', 'Çerez (cookie) rızasını geri çek.')
    }
  ];
  return appendEvents([], inputs);
}

// ---------------------------------------------------------------------------
// Türetilen görünümler (Katman 2.2)
// ---------------------------------------------------------------------------

function sortedByTime(records: ConsentRecord[]): ConsentRecord[] {
  return [...records].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.seq - b.seq);
}

/** Her metin türü için en son olaydan türetilen güncel durum. */
export function deriveCurrentState(records: ConsentRecord[]): CurrentConsentState[] {
  return deriveStateAsOf(records, '9999-12-31T23:59:59.999Z');
}

/** Belirli bir AN itibarıyla durum (temporal time-travel — "o tarihte rıza neydi?"). */
export function deriveStateAsOf(records: ConsentRecord[], isoTime: string): CurrentConsentState[] {
  const byType = new Map<DocumentType, ConsentRecord>();
  for (const r of sortedByTime(records)) {
    if (r.occurredAt <= isoTime) byType.set(r.documentType, r);
  }
  return [...byType.entries()].map(([type, latest]) => {
    const currentVersion = getCurrentVersion(type).version;
    return {
      documentType: type,
      latest,
      isActive: latest.action === 'GRANTED',
      isStale: latest.action === 'GRANTED' && latest.documentVersion !== currentVersion,
      currentVersion
    };
  });
}

/** Giriş bariyeri: güncel sürümde aktif onayı OLMAYAN, re-consent kapılı metinler. */
export function getReconsentRequirements(records: ConsentRecord[]): DocumentType[] {
  const state = new Map(deriveCurrentState(records).map(s => [s.documentType, s] as const));
  return RECONSENT_GATED_DOCUMENTS.filter(type => {
    const s = state.get(type);
    const currentVersion = getCurrentVersion(type).version;
    return !s || !s.isActive || s.latest.documentVersion !== currentVersion;
  });
}

// ---------------------------------------------------------------------------
// Tamper (kurcalama) — yalnızca demo amaçlı
// ---------------------------------------------------------------------------

/**
 * Bir kaydın alanını DEĞİŞTİRİR ama rowHash'i YENİDEN HESAPLAMAZ. Bu, gerçek
 * dünyada "yetkisiz bir UPDATE / elle SQL müdahalesi" senaryosunu temsil eder.
 * Sonuç: verifyChain o kaydı ve sonrasını "kırık" gösterir.
 */
export function tamperField(
  records: ConsentRecord[],
  id: string,
  field: keyof ConsentRecord,
  value: string
): ConsentRecord[] {
  return records.map(r => (r.id === id ? { ...r, [field]: value } : r));
}
