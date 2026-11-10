/**
 * Database tools. Run them with the same environment the panel uses (they read .env).
 *
 *   npm run db:info    show which PostgreSQL database the panel uses and how much is in it
 *
 * Backups and restores use the standard PostgreSQL tools:
 *   pg_dump "$DATABASE_URL" > backup.sql
 *   psql "$DATABASE_URL" < backup.sql
 */
import 'dotenv/config';
import { openStore } from './index';
import { DOC_COLLECTIONS, MAP_COLLECTIONS } from './layout';

const layout = { docs: DOC_COLLECTIONS, maps: MAP_COLLECTIONS };

async function main() {
  const [cmd] = process.argv.slice(2);
  if (cmd !== 'info') { console.log('Usage:\n  npm run db:info'); process.exitCode = 1; return; }
  // The panel allows only one process per database, so stop the panel first.
  const store = await openStore(layout);
  try {
    const has = await store.load();
    const st = await store.stats();
    console.log(`${st.engine}\n${st.file}\n${(st.sizeBytes / 1048576).toFixed(2)} MB`);
    console.log(has ? `Records: ${Object.entries(st.rows).map(([k, v]) => `${k}=${v}`).join(', ') || '(none)'}` : 'Empty: nothing has been saved here yet.');
  } finally { await store.close(); }
}
main().catch(e => { console.error('Error:', e.message); process.exit(1); });
