import { DocStore } from './docStore';
import { PostgresDriver, describePgUrl } from './postgresDriver';
import { StoreLayout } from './types';

export type { Store, StoreLayout, StoreStats } from './types';
export { DocStore } from './docStore';
export { PostgresDriver, describePgUrl } from './postgresDriver';
export { pgDumpToFile } from './backup';

export const isPostgresUrl = (u: string | undefined): u is string => !!u && /^postgres(ql)?:\/\//i.test(u.trim());

/**
 * MonoPanel stores everything in PostgreSQL, the same way Pterodactyl and Jexactyl require a database.
 * There is no embedded fallback: DATABASE_URL is required.
 *
 *   DATABASE_URL=postgres://user:password@127.0.0.1:5432/monopanel
 */
export async function openStore(layout: StoreLayout): Promise<DocStore> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. MonoPanel stores all of its data in PostgreSQL. Create a database and set, for example:\n' +
      '  DATABASE_URL=postgres://monopanel:change-me@127.0.0.1:5432/monopanel');
  }
  if (!isPostgresUrl(url)) throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
  const store = new DocStore(new PostgresDriver(url), layout);
  await store.open();
  return store;
}
