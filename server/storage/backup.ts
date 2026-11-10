import fs from 'fs';
import zlib from 'zlib';
import { spawn } from 'child_process';
import { pipeline } from 'stream/promises';
import { pgTablePrefix } from './postgresDriver';

/**
 * Writes a gzip-compressed plain-SQL dump of the panel's tables to `dest` using the `pg_dump` client tool
 * (install it with: apt install postgresql-client). Credentials go to pg_dump through environment variables,
 * never on the command line where `ps` could show them.
 * Restore: gunzip -c <file>.sql.gz | psql "$DATABASE_URL"
 */
export async function pgDumpToFile(dest: string): Promise<void> {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error('DATABASE_URL is not set.');
  const u = new URL(raw);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PGHOST: u.hostname.replace(/^\[|\]$/g, ''),
    PGPORT: u.port || '5432',
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, '')),
    PGAPPNAME: 'monopanel-backup',
  };
  // TLS: mirror what the panel's own connection does (DATABASE_SSL, DATABASE_SSL_CA, or ?sslmode= in the URL).
  const mode = (process.env.DATABASE_SSL || '').trim().toLowerCase();
  if (['disable', 'false', '0', 'off'].includes(mode)) env.PGSSLMODE = 'disable';
  else if (['no-verify', 'insecure'].includes(mode)) env.PGSSLMODE = 'require';
  else if (['require', 'verify', 'verify-full', 'true', '1', 'on'].includes(mode)) env.PGSSLMODE = 'verify-full';
  else if (u.searchParams.get('sslmode')) env.PGSSLMODE = u.searchParams.get('sslmode')!;
  if (process.env.DATABASE_SSL_CA) env.PGSSLROOTCERT = process.env.DATABASE_SSL_CA;

  const p = pgTablePrefix();
  const tables = ['docs', 'maps', 'kv', 'meta'].flatMap(t => ['--table', `${p}${t}`]);
  const args = ['--no-owner', '--no-privileges', '--clean', '--if-exists', ...tables];

  const tmp = `${dest}.part`;
  const child = spawn('pg_dump', args, { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', d => { if (stderr.length < 4000) stderr += d.toString(); });
  const exited = new Promise<void>((resolve, reject) => {
    child.on('error', e => reject((e as NodeJS.ErrnoException).code === 'ENOENT'
      ? new Error('pg_dump was not found on this machine. Install the PostgreSQL client tools (apt install postgresql-client) or use your provider\'s backups.')
      : e));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`pg_dump failed (exit ${code}): ${stderr.trim().replace(raw, '<url>') || 'no output'}`)));
  });
  try {
    await Promise.all([
      pipeline(child.stdout, zlib.createGzip(), fs.createWriteStream(tmp, { mode: 0o600 })),
      exited,
    ]);
    fs.renameSync(tmp, dest);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    throw e;
  }
}
