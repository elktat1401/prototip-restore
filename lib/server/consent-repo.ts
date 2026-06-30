/**
 * Rıza defteri — sunucu tarafı repo (Postgres).
 *
 * Katman 1.1 → consent_documents (sürümlü snapshot).
 * Katman 2.2 → consent_records (append-only; durum türetilir).
 * Katman 3.1 → prev_hash/row_hash; zincir mantığı paylaşılan lib/consent/* ile
 *              hesaplanır → frontend ile BİREBİR aynı canonical/hash.
 *
 * NOT (prototip): tamper demosu için consent_records'a UPDATE serbesttir.
 * Üretimde trigger (RAISE EXCEPTION) + REVOKE ile INSERT-only yapılmalıdır
 * (bkz. docs/HANDOFF-BACKEND.md). Zaman damgaları, hash bütünlüğü bozulmasın
 * diye TEXT (canonical ISO string) olarak saklanır.
 */

import { DOCUMENTS } from '@/lib/consent/documents';
import { hashText, verifyChain } from '@/lib/consent/hash-chain';
import {
  appendEvents as buildChainedAppend,
  buildSeedRecords,
  type ConsentEventInput,
  deriveCurrentState,
  deriveStateAsOf,
  getReconsentRequirements
} from '@/lib/consent/store';
import { type ChainVerification, type ConsentRecord, type DocumentType } from '@/lib/consent/types';
import { getDb } from './db';

// camelCase (ConsentRecord) ↔ snake_case (kolon) eşlemesi
const COLS: ReadonlyArray<readonly [keyof ConsentRecord, string]> = [
  ['id', 'id'],
  ['seq', 'seq'],
  ['subjectId', 'subject_id'],
  ['subjectEmail', 'subject_email'],
  ['tenantId', 'tenant_id'],
  ['documentType', 'document_type'],
  ['documentVersion', 'document_version'],
  ['documentContentHash', 'document_content_hash'],
  ['action', 'action'],
  ['method', 'method'],
  ['presentedNoticeHash', 'presented_notice_hash'],
  ['ipAddress', 'ip_address'],
  ['userAgent', 'user_agent'],
  ['locale', 'locale'],
  ['occurredAt', 'occurred_at'],
  ['recordedAt', 'recorded_at'],
  ['prevHash', 'prev_hash'],
  ['rowHash', 'row_hash']
];

const SELECT_RECORDS =
  'SELECT ' + COLS.map(([camel, snake]) => `${snake} AS "${camel}"`).join(', ') + ' FROM consent_records ORDER BY seq ASC';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS consent_documents (
  document_type   text NOT NULL,
  version         text NOT NULL,
  effective_date  text NOT NULL,
  title           text NOT NULL,
  body            text NOT NULL,
  content_hash    text NOT NULL,
  materiality     text NOT NULL,
  change_summary  text NOT NULL,
  PRIMARY KEY (document_type, version)
);
CREATE TABLE IF NOT EXISTS consent_records (
  id                    text PRIMARY KEY,
  seq                   integer NOT NULL UNIQUE,
  subject_id            text NOT NULL,
  subject_email         text NOT NULL,
  tenant_id             text NOT NULL,
  document_type         text NOT NULL,
  document_version      text NOT NULL,
  document_content_hash text NOT NULL,
  action                text NOT NULL,
  method                text NOT NULL,
  presented_notice_hash text NOT NULL,
  ip_address            text NOT NULL,
  user_agent            text NOT NULL,
  locale                text NOT NULL,
  occurred_at           text NOT NULL,
  recorded_at           text NOT NULL,
  prev_hash             text NOT NULL,
  row_hash              text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records (document_type);
`;

declare global {
  // eslint-disable-next-line no-var
  var __consentReady: Promise<void> | undefined;
}

async function insertRecords(records: ConsentRecord[]): Promise<void> {
  const db = await getDb();
  const cols = COLS.map(([, snake]) => snake).join(', ');
  const placeholders = COLS.map((_, i) => `$${i + 1}`).join(', ');
  for (const r of records) {
    const values = COLS.map(([camel]) => r[camel]);
    await db.query(`INSERT INTO consent_records (${cols}) VALUES (${placeholders})`, values);
  }
}

async function seedDocuments(): Promise<void> {
  const db = await getDb();
  for (const d of DOCUMENTS) {
    const contentHash = await hashText(d.body);
    await db.query(
      `INSERT INTO consent_documents
         (document_type, version, effective_date, title, body, content_hash, materiality, change_summary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (document_type, version) DO NOTHING`,
      [d.documentType, d.version, d.effectiveDate, d.title, d.body, contentHash, d.materiality, d.changeSummary]
    );
  }
}

async function seedRecords(): Promise<void> {
  const seeded = await buildSeedRecords();
  await insertRecords(seeded);
}

/** Şemayı kur + boşsa seed et (süreç başına bir kez). */
export function ensureReady(): Promise<void> {
  return (globalThis.__consentReady ??= (async () => {
    const db = await getDb();
    await db.exec(SCHEMA);
    const docCount = await db.query('SELECT count(*)::int AS n FROM consent_documents');
    if (Number(docCount.rows[0]?.n ?? 0) === 0) await seedDocuments();
    const recCount = await db.query('SELECT count(*)::int AS n FROM consent_records');
    if (Number(recCount.rows[0]?.n ?? 0) === 0) await seedRecords();
  })());
}

// ---------------------------------------------------------------------------
// Public API (route handler'lar bunları çağırır)
// ---------------------------------------------------------------------------

export async function getLedger(): Promise<ConsentRecord[]> {
  await ensureReady();
  const db = await getDb();
  const { rows } = await db.query(SELECT_RECORDS);
  return rows as unknown as ConsentRecord[];
}

export interface EventContext {
  ipAddress?: string;
  userAgent?: string;
  locale?: string;
}

/** Yeni rıza olaylarını zincire ekler; oluşturulan kayıtları döner. */
export async function appendConsentEvents(
  inputs: ConsentEventInput[],
  ctx: EventContext = {}
): Promise<ConsentRecord[]> {
  await ensureReady();
  const current = await getLedger();
  const withCtx = inputs.map(i => ({
    ...i,
    ipAddress: i.ipAddress ?? ctx.ipAddress,
    userAgent: i.userAgent ?? ctx.userAgent,
    locale: i.locale ?? ctx.locale
  }));
  const next = await buildChainedAppend(current, withCtx);
  const created = next.slice(current.length);
  await insertRecords(created);
  return created;
}

const TAMPERABLE: Partial<Record<keyof ConsentRecord, string>> = {
  occurredAt: 'occurred_at',
  action: 'action'
};

/** DEMO: bir alanı rowHash'i YENİDEN HESAPLAMADAN değiştirir (cascade'i göstermek için). */
export async function tamperRecord(id: string, field: keyof ConsentRecord, value: string): Promise<void> {
  await ensureReady();
  const col = TAMPERABLE[field];
  if (!col) throw new Error(`Kurcalanamaz alan: ${String(field)}`);
  const db = await getDb();
  await db.query(`UPDATE consent_records SET ${col} = $1 WHERE id = $2`, [value, id]);
}

/** DEMO: defteri sıfırla (kayıtları sil, yeniden seed et; belgeler korunur). */
export async function resetLedger(): Promise<void> {
  await ensureReady();
  const db = await getDb();
  await db.query('DELETE FROM consent_records');
  await seedRecords();
}

export async function getState(asOf?: string) {
  const records = await getLedger();
  return asOf ? deriveStateAsOf(records, asOf) : deriveCurrentState(records);
}

export async function getRequirements(): Promise<DocumentType[]> {
  return getReconsentRequirements(await getLedger());
}

export async function getVerification(): Promise<ChainVerification> {
  return verifyChain(await getLedger());
}

export async function getDocumentRow(type: string, version?: string) {
  await ensureReady();
  const db = await getDb();
  const select =
    'SELECT document_type AS "documentType", version, effective_date AS "effectiveDate", title, body, ' +
    'content_hash AS "contentHash", materiality, change_summary AS "changeSummary" FROM consent_documents';
  if (version) {
    const { rows } = await db.query(`${select} WHERE document_type = $1 AND version = $2`, [type, version]);
    return rows[0] ?? null;
  }
  const { rows } = await db.query(
    `${select} WHERE document_type = $1 ORDER BY effective_date DESC LIMIT 1`,
    [type]
  );
  return rows[0] ?? null;
}
