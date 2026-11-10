export interface StoreLayout { docs: string[]; maps: string[] }

export interface StoreStats {
  /** Human readable engine, e.g. "PostgreSQL 16.4". */
  engine: string;
  /** host:port/database (never the password). */
  file: string;
  sizeBytes: number;
  rows: Record<string, number>;
  lastSavedAt: number;
}

/** What the rest of the panel talks to. Every method is async: the database is a network service. */
export interface Store {
  readonly engine: 'postgres';
  /** The stored database, or null if nothing was ever saved (fresh install). */
  load(): Promise<Record<string, any> | null>;
  /** Persist the working set in ONE transaction, writing only changed rows. Returns the number of rows touched. */
  save(data: Record<string, any>): Promise<number>;
  stats(): Promise<StoreStats>;
  close(): Promise<void>;
}

// ----------------------------------------------------------------------------- driver layer (one per engine)

/** Low-level writes the diff engine needs. Called inside a transaction. */
export interface TxOps {
  upDoc(coll: string, id: string, pos: number, json: string): Promise<void> | void;
  setPos(coll: string, id: string, pos: number): Promise<void> | void;
  delDoc(coll: string, id: string): Promise<void> | void;
  upMap(coll: string, k: string, json: string): Promise<void> | void;
  delMap(coll: string, k: string): Promise<void> | void;
  upKv(k: string, json: string): Promise<void> | void;
  delKv(k: string): Promise<void> | void;
  setMeta(k: string, v: string): Promise<void> | void;
}

export interface Driver {
  readonly engine: 'postgres';
  /** Open the database, create tables, take locks. Throws a readable error if it cannot. */
  init(): Promise<void>;
  getMeta(k: string): Promise<string | null>;
  readDocs(): Promise<{ coll: string; id: string; pos: number; value: any }[]>;
  readMaps(): Promise<{ coll: string; k: string; value: any }[]>;
  readKv(): Promise<{ k: string; value: any }[]>;
  /** Run fn atomically: everything it writes is committed together or not at all. */
  transaction(fn: (tx: TxOps) => Promise<void>): Promise<void>;
  stats(): Promise<Omit<StoreStats, 'lastSavedAt'>>;
  close(): Promise<void>;
}
