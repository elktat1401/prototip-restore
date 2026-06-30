/**
 * Sunucu tarafı DB adaptörü.
 *
 * Varsayılan: PGlite — gerçek PostgreSQL motorunun (WASM) Node içinde GÖMÜLÜ
 * çalışan hali. Ekstra konteyner/servis gerekmez; veriler `.pgdata`'da kalıcıdır.
 *
 * `DATABASE_URL` tanımlıysa: gerçek bir Postgres'e `pg` ile bağlanır (aynı SQL).
 *
 * SQL standart Postgres olduğundan üretimdeki gerçek Postgres / .NET+EF'e birebir taşınır.
 */

type Db = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
  exec: (sql: string) => Promise<void>;
  driver: 'pglite' | 'pg';
};

declare global {
  // eslint-disable-next-line no-var
  var __consentDb: Promise<Db> | undefined;
}

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: url });
    return {
      driver: 'pg',
      query: async (sql, params) => {
        const r = await pool.query(sql, params as unknown[]);
        return { rows: r.rows as Record<string, unknown>[] };
      },
      exec: async sql => {
        await pool.query(sql);
      }
    };
  }

  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = process.env.PGLITE_DIR ?? '.pgdata';
  const pg = new PGlite(dataDir);
  await pg.waitReady;
  return {
    driver: 'pglite',
    query: async (sql, params) => {
      const r = await pg.query(sql, params as unknown[]);
      return { rows: (r.rows ?? []) as Record<string, unknown>[] };
    },
    exec: async sql => {
      await pg.exec(sql);
    }
  };
}

/** Süreç başına tek DB örneği (HMR'a karşı globalThis'te tutulur). */
export function getDb(): Promise<Db> {
  return (globalThis.__consentDb ??= create());
}
