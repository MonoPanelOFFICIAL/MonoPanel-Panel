import fs from 'fs';
import { Driver, StoreStats, TxOps } from './types';

/**
 * PostgreSQL engine (set DATABASE_URL=postgres://user:pass@host:5432/dbname).
 *
 *  - Four tables (docs, maps, kv, meta) with real JSONB columns, so the data is queryable with plain SQL
 *    and covered by your normal Postgres tooling: pg_dump, streaming replicas, point-in-time recovery, managed backups.
 *  - Every save is ONE transaction touching only changed rows; a failed save rolls back and is retried.
 *  - Single-writer guard: a session-level advisory lock stops a second panel process from opening the same database.
 *    The panel keeps its working set in memory, so two live instances would overwrite each other's changes.
 *    (If you use PgBouncer, connect the panel directly or use session pooling: transaction pooling cannot hold the lock.)
 *
 * Environment: DATABASE_URL (required), DATABASE_SSL (disable | require | verify | no-verify), DATABASE_SSL_CA (path to a CA PEM),
 * DATABASE_POOL_MAX (default 5), DATABASE_TABLE_PREFIX (default mp_).
 */
const LOCK_KEY = '7364100311';   // arbitrary constant: "MonoPanel writer"

type PgClient = { query: (sql: string, params?: any[]) => Promise<{ rows: any[] }>; release: (err?: boolean | Error) => void; on: (ev: string, fn: (...a: any[]) => void) => void };

/** Human-safe description of the connection (no credentials). */
export function describePgUrl(url: string): string {
  try { const u = new URL(url); return `${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`; } catch { return 'postgres'; }
}

/** jsonb cannot store the NUL character; strip an escaped \u0000 (but not an escaped backslash followed by "u0000"). */
const cleanJson = (json: string): string => json.replace(/(?<!\\)((?:\\\\)*)\\u0000/g, '$1');

/** Table name prefix (DATABASE_TABLE_PREFIX, default mp_). Shared with the backup tool so both always agree. */
export function pgTablePrefix(): string {
  const prefix = (process.env.DATABASE_TABLE_PREFIX ?? 'mp_').trim();
  if (!/^[a-z][a-z0-9_]{0,20}$/i.test(prefix) && prefix !== '') throw new Error('DATABASE_TABLE_PREFIX may only contain letters, digits and underscores');
  return prefix;
}

export class PostgresDriver implements Driver {
  readonly engine = 'postgres' as const;
  private pool: any;
  private lockClient: PgClient | null = null;
  private t: { docs: string; maps: string; kv: string; meta: string };
  private version = 'PostgreSQL';

  constructor(private url: string, private opts: { loadPg?: () => Promise<any> } = {}) {
    const prefix = pgTablePrefix();
    this.t = { docs: `${prefix}docs`, maps: `${prefix}maps`, kv: `${prefix}kv`, meta: `${prefix}meta` };
  }

  private sslOption(): any {
    const mode = (process.env.DATABASE_SSL || '').trim().toLowerCase();
    const ca = process.env.DATABASE_SSL_CA ? fs.readFileSync(process.env.DATABASE_SSL_CA, 'utf8') : undefined;
    if (!mode) return ca ? { ca, rejectUnauthorized: true } : undefined;   // otherwise the sslmode in the URL decides
    if (['disable', 'false', '0', 'off'].includes(mode)) return false;
    if (['no-verify', 'insecure'].includes(mode)) return { rejectUnauthorized: false };
    if (['require', 'verify', 'verify-full', 'true', '1', 'on'].includes(mode)) return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
    throw new Error('DATABASE_SSL must be one of: disable, require, verify, no-verify');
  }

  async init(): Promise<void> {
    let pg: any;
    // @ts-ignore pg ships no type declarations
    try { pg = this.opts.loadPg ? await this.opts.loadPg() : await import('pg'); }
    catch { throw new Error('The "pg" package is not installed. Run: npm install'); }
    const { Pool } = pg.default?.Pool ? pg.default : pg;
    const max = Math.max(1, Math.min(50, parseInt(process.env.DATABASE_POOL_MAX || '5', 10) || 5));
    this.pool = new Pool({
      connectionString: this.url, max: max + 1,   // +1: one connection is held for the writer lock
      ssl: this.sslOption(), application_name: 'monopanel-panel', connectionTimeoutMillis: 10_000, idleTimeoutMillis: 30_000,
    });
    // An idle client dying (database restart, failover) must not crash the whole panel.
    this.pool.on('error', (e: Error) => console.error('[Database/ERROR] PostgreSQL pool error:', e.message));

    try {
      const lock = await this.pool.connect() as PgClient;
      lock.on('error', (e: Error) => console.error('[Database/ERROR] PostgreSQL writer-lock connection lost:', e.message));
      const got = await lock.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY]);
      if (!got.rows[0]?.ok) {
        lock.release(true);
        throw new Error('Another MonoPanel panel process is already using this database. Only one panel instance may run per database (its working set lives in memory).');
      }
      this.lockClient = lock;
      this.version = String((await lock.query('SHOW server_version')).rows[0]?.server_version || '');
    } catch (e: any) {
      await this.pool.end().catch(() => undefined);
      if (/already using this database/.test(e.message)) throw e;
      throw new Error(`Could not connect to PostgreSQL at ${describePgUrl(this.url)}: ${String(e.message).replace(this.url, '<url>')}`);
    }

    const { docs, maps, kv, meta } = this.t;
    await this.run(`CREATE TABLE IF NOT EXISTS ${docs} (coll text NOT NULL, id text NOT NULL, pos integer NOT NULL, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (coll, id))`);
    await this.run(`CREATE INDEX IF NOT EXISTS ${docs}_order ON ${docs} (coll, pos)`);
    await this.run(`CREATE TABLE IF NOT EXISTS ${maps} (coll text NOT NULL, k text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (coll, k))`);
    await this.run(`CREATE TABLE IF NOT EXISTS ${kv} (k text PRIMARY KEY, data jsonb NOT NULL)`);
    await this.run(`CREATE TABLE IF NOT EXISTS ${meta} (k text PRIMARY KEY, v text NOT NULL)`);
    await this.run(`INSERT INTO ${meta} (k, v) VALUES ('schema_version', '2') ON CONFLICT (k) DO NOTHING`);
  }

  private async run(sql: string, params: any[] = []): Promise<any[]> { return (await this.pool.query(sql, params)).rows; }

  async getMeta(k: string): Promise<string | null> {
    const r = await this.run(`SELECT v FROM ${this.t.meta} WHERE k = $1`, [k]);
    return r[0] ? r[0].v : null;
  }
  // "data::text" so we always receive the JSON text and parse it ourselves (a jsonb string value would otherwise be ambiguous).
  async readDocs() { return (await this.run(`SELECT coll, id, pos, data::text AS data FROM ${this.t.docs} ORDER BY coll, pos`)).map(r => ({ coll: r.coll, id: r.id, pos: Number(r.pos), value: JSON.parse(r.data) })); }
  async readMaps() { return (await this.run(`SELECT coll, k, data::text AS data FROM ${this.t.maps}`)).map(r => ({ coll: r.coll, k: r.k, value: JSON.parse(r.data) })); }
  async readKv() { return (await this.run(`SELECT k, data::text AS data FROM ${this.t.kv}`)).map(r => ({ k: r.k, value: JSON.parse(r.data) })); }

  async transaction(fn: (tx: TxOps) => Promise<void>): Promise<void> {
    const c = await this.pool.connect() as PgClient;
    const { docs, maps, kv, meta } = this.t;
    const q = (sql: string, p: any[]) => c.query(sql, p).then(() => undefined);
    const tx: TxOps = {
      upDoc: (coll, id, pos, json) => q(`INSERT INTO ${docs} (coll, id, pos, data) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (coll, id) DO UPDATE SET data = EXCLUDED.data, pos = EXCLUDED.pos, updated_at = now()`, [coll, id, pos, cleanJson(json)]),
      setPos: (coll, id, pos) => q(`UPDATE ${docs} SET pos = $1 WHERE coll = $2 AND id = $3`, [pos, coll, id]),
      delDoc: (coll, id) => q(`DELETE FROM ${docs} WHERE coll = $1 AND id = $2`, [coll, id]),
      upMap: (coll, k, json) => q(`INSERT INTO ${maps} (coll, k, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (coll, k) DO UPDATE SET data = EXCLUDED.data`, [coll, k, cleanJson(json)]),
      delMap: (coll, k) => q(`DELETE FROM ${maps} WHERE coll = $1 AND k = $2`, [coll, k]),
      upKv: (k, json) => q(`INSERT INTO ${kv} (k, data) VALUES ($1, $2::jsonb) ON CONFLICT (k) DO UPDATE SET data = EXCLUDED.data`, [k, cleanJson(json)]),
      delKv: (k) => q(`DELETE FROM ${kv} WHERE k = $1`, [k]),
      setMeta: (k, v) => q(`INSERT INTO ${meta} (k, v) VALUES ($1, $2) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`, [k, v]),
    };
    let broken = false;
    try {
      await c.query('BEGIN', []);
      await fn(tx);
      await c.query('COMMIT', []);
    } catch (e) {
      try { await c.query('ROLLBACK', []); } catch { broken = true; }   // connection is unusable: discard it instead of returning it to the pool
      throw e;
    } finally { c.release(broken); }
  }

  async stats(): Promise<Omit<StoreStats, 'lastSavedAt'>> {
    const rows: Record<string, number> = {};
    for (const r of await this.run(`SELECT coll, count(*)::int AS n FROM ${this.t.docs} GROUP BY coll`)) rows[r.coll] = Number(r.n);
    const s = (await this.run('SELECT pg_database_size(current_database())::text AS size'))[0];
    return { file: describePgUrl(this.url), sizeBytes: Number(s?.size || 0), rows, engine: `PostgreSQL ${this.version}` };
  }

  async close(): Promise<void> {
    try { this.lockClient?.release(true); } catch { /* ignore */ }   // closing the connection drops the advisory lock
    this.lockClient = null;
    try { await this.pool?.end(); } catch { /* ignore */ }
  }
}
