/**
 * Katman 3.1 — SHA-256 hash zinciri (tamper-evidence).
 *
 *   rowHash(n) = SHA-256( prevHash(n)  ‖  canonical(payload(n)) )
 *   prevHash(0) = GENESIS_HASH (64 sıfır);  prevHash(n) = rowHash(n-1)
 *
 * Tek bir alanın (örn. occurredAt) değişmesi o kaydın rowHash'ini ve dolayısıyla
 * SONRAKİ tüm kayıtların `prevHash` bağını bozar → ekleme/silme/değiştirme/sıra
 * değiştirme güvenilir biçimde yakalanır.
 *
 * ⚠️ Katalog uyarısı: canonical serileştirme DETERMINIST olmalı. Kültür-bağımlı
 * sayı/tarih biçimleri veya tutarsız alan sırası SESSİZ hash uyuşmazlığı yaratır.
 * Bu yüzden: alanlar alfabetik sırada, sabit ayraçla, ISO-8601 UTC zaman damgası.
 */

import {
  type ChainVerification,
  type ConsentPayload,
  type ConsentRecord,
  GENESIS_HASH,
  type RecordVerification
} from './types';

/** Web Crypto SHA-256 → küçük harf hex (64 karakter). */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Bir metin gövdesinin (sözleşme snapshot'ı / sunulan bildirim) içerik hash'i. */
export const hashText = sha256Hex;

/**
 * Deterministik canonical JSON: nesne anahtarları alfabetik, dizi sırası korunur,
 * boşluksuz. Aynı mantıksal içerik → her zaman aynı string → aynı hash.
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map(k => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${entries.join(',')}}`;
}

/** rowHash hesabına giren payload'ı kayıttan ayıkla (recordedAt/prevHash/rowHash hariç). */
export function toPayload(r: ConsentRecord): ConsentPayload {
  return {
    id: r.id,
    seq: r.seq,
    subjectId: r.subjectId,
    subjectEmail: r.subjectEmail,
    tenantId: r.tenantId,
    documentType: r.documentType,
    documentVersion: r.documentVersion,
    documentContentHash: r.documentContentHash,
    action: r.action,
    method: r.method,
    presentedNoticeHash: r.presentedNoticeHash,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    locale: r.locale,
    occurredAt: r.occurredAt
  };
}

/** Zincir ayracı: prevHash ile payload'ı domain-separation ile birleştirir. */
function chainPreimage(prevHash: string, payload: ConsentPayload): string {
  return `${prevHash}\n${canonicalize(payload)}`;
}

/** Bir payload + prevHash için rowHash hesapla. */
export async function computeRowHash(prevHash: string, payload: ConsentPayload): Promise<string> {
  return sha256Hex(chainPreimage(prevHash, payload));
}

/** Bir kaydın rowHash'ini (saklanan prevHash ve payload'ıyla) yeniden hesapla. */
export async function recomputeRowHash(record: ConsentRecord): Promise<string> {
  return computeRowHash(record.prevHash, toPayload(record));
}

/** Hesaplanan preimage'i (denetçi görünümünde göstermek için) döndür. */
export function previewPreimage(record: ConsentRecord): string {
  return chainPreimage(record.prevHash, toPayload(record));
}

/**
 * Tüm zinciri doğrula: her kayıt için (1) içerik bütünlüğü — saklanan rowHash
 * yeniden hesaplananla eşleşiyor mu, (2) zincir bütünlüğü — prevHash bir önceki
 * rowHash'e bağlanıyor mu.
 */
export async function verifyChain(records: ConsentRecord[]): Promise<ChainVerification> {
  const sorted = [...records].sort((a, b) => a.seq - b.seq);
  const verifications: RecordVerification[] = [];
  let firstBrokenSeq: number | null = null;

  // expectedPrev = GENESIS'ten itibaren YENİDEN HESAPLANAN dürüst zincir başı.
  // Bir kaydın içeriği kurcalanınca onun gerçek hash'i değişir; bu, sonraki tüm
  // kayıtların prevHash bağını bozar → kırılma AŞAĞIYA yayılır (cascade).
  let expectedPrev = GENESIS_HASH;

  for (const r of sorted) {
    // (1) İçerik bütünlüğü: saklanan rowHash, kaydın KENDİ (prevHash + payload)'ından doğru üretilmiş mi?
    const localRowHash = await recomputeRowHash(r);
    const contentIntact = localRowHash === r.rowHash;

    // (2) Zincir bağı: prevHash, dürüst zincirin bir önceki rowHash'ine oturuyor mu?
    const linkIntact = r.prevHash === expectedPrev;

    if ((!contentIntact || !linkIntact) && firstBrokenSeq === null) {
      firstBrokenSeq = r.seq;
    }

    verifications.push({
      seq: r.seq,
      id: r.id,
      contentIntact,
      linkIntact,
      expectedRowHash: localRowHash,
      storedRowHash: r.rowHash
    });

    // Dürüst zincir başını ilerlet: bu kaydın GERÇEK içeriğinden (expectedPrev ile) üretilen hash.
    // Saklanan rowHash DEĞİL — böylece kurcalanan bir kayıt sonrakilere yayılır.
    expectedPrev = await computeRowHash(expectedPrev, toPayload(r));
  }

  return {
    valid: firstBrokenSeq === null,
    total: sorted.length,
    firstBrokenSeq,
    records: verifications
  };
}

/** Kısa gösterim için hash'i kırp: ilk 10 … son 6. */
export function shortHash(hash: string): string {
  if (!hash || hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-6)}`;
}
