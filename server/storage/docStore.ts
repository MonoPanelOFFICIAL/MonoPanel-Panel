import { Driver, Store, StoreLayout, StoreStats, TxOps } from './types';

/**
 * The panel keeps its familiar in-memory working set (`getDb()`); this class persists it row by row through a Driver
 * (PostgreSQL). Each save diffs the working set against what was last written and runs ONE
 * transaction that touches only the changed rows.
 *
 *   docs(coll, id, pos, data)  one row per object in an array collection (order kept in `pos`)
 *   maps(coll, k, data)        one row per key of a record collection (e.g. password hashes)
 *   kv(k, data)                everything else (settings, installation id, small arrays)
 *
 * Saves, loads and stats are serialised through one queue, so two overlapping saves can never interleave.
 */
type Op =
  | { t: 'upDoc'; coll: string; id: string; pos: number; json: string }
  | { t: 'setPos'; coll: string; id: string; pos: number }
  | { t: 'delDoc'; coll: string; id: string }
  | { t: 'upMap'; coll: string; k: string; json: string }
  | { t: 'delMap'; coll: string; k: string }
  | { t: 'upKv'; k: string; json: string }
  | { t: 'delKv'; k: string }
  | { t: 'meta'; k: string; v: string };

async function apply(tx: TxOps, op: Op): Promise<void> {
  switch (op.t) {
    case 'upDoc': return void (await tx.upDoc(op.coll, op.id, op.pos, op.json));
    case 'setPos': return void (await tx.setPos(op.coll, op.id, op.pos));
    case 'delDoc': return void (await tx.delDoc(op.coll, op.id));
    case 'upMap': return void (await tx.upMap(op.coll, op.k, op.json));
    case 'delMap': return void (await tx.delMap(op.coll, op.k));
    case 'upKv': return void (await tx.upKv(op.k, op.json));
    case 'delKv': return void (await tx.delKv(op.k));
    case 'meta': return void (await tx.setMeta(op.k, op.v));
  }
}

export class DocStore implements Store {
  private queue: Promise<unknown> = Promise.resolve();
  // last written state, used to compute minimal diffs
  private docJson = new Map<string, Map<string, string>>();
  private docOrder = new Map<string, string[]>();
  private docPos = new Map<string, Map<string, number>>();
  private posMin = new Map<string, number>();
  private posMax = new Map<string, number>();
  private mapJson = new Map<string, Map<string, string>>();
  private kvJson = new Map<string, string>();
  private knownKeys = new Set<string>();
  lastSavedAt = 0;
  lastChanged = 0;

  constructor(private driver: Driver, private layout: StoreLayout) {}

  get engine(): 'postgres' { return this.driver.engine; }

  /** Open the driver. Must be awaited once before load()/save(). */
  open(): Promise<void> { return this.driver.init(); }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  load(): Promise<Record<string, any> | null> { return this.enqueue(() => this.loadNow()); }
  save(data: Record<string, any>): Promise<number> { return this.enqueue(() => this.saveNow(data)); }
  stats(): Promise<StoreStats> { return this.enqueue(async () => ({ ...(await this.driver.stats()), lastSavedAt: this.lastSavedAt })); }
  async close(): Promise<void> { try { await this.queue; } catch { /* ignore */ } await this.driver.close(); }

  private mapMemo(coll: string) { let m = this.mapJson.get(coll); if (!m) { m = new Map(); this.mapJson.set(coll, m); } return m; }
  private rememberDoc(coll: string, id: string, json: string, pos: number) {
    let j = this.docJson.get(coll); if (!j) { j = new Map(); this.docJson.set(coll, j); } j.set(id, json);
    let p = this.docPos.get(coll); if (!p) { p = new Map(); this.docPos.set(coll, p); } p.set(id, pos);
    this.posMin.set(coll, Math.min(this.posMin.get(coll) ?? pos, pos));
    this.posMax.set(coll, Math.max(this.posMax.get(coll) ?? pos, pos));
  }

  private async loadNow(): Promise<Record<string, any> | null> {
    const initialised = await this.driver.getMeta('known_keys');
    if (!initialised) return null;
    this.knownKeys = new Set(JSON.parse(initialised));
    const out: Record<string, any> = {};

    for (const coll of this.layout.docs) if (this.knownKeys.has(coll)) { out[coll] = []; }
    for (const coll of this.layout.maps) if (this.knownKeys.has(coll)) { out[coll] = {}; }

    for (const r of await this.driver.readDocs()) {
      (out[r.coll] ||= []).push(r.value);
      this.rememberDoc(r.coll, r.id, JSON.stringify(r.value), r.pos);
    }
    for (const r of await this.driver.readMaps()) {
      (out[r.coll] ||= {})[r.k] = r.value;
      this.mapMemo(r.coll).set(r.k, JSON.stringify(r.value));
    }
    for (const r of await this.driver.readKv()) {
      out[r.k] = r.value;
      this.kvJson.set(r.k, JSON.stringify(r.value));
    }
    for (const coll of this.layout.docs) {
      const ids = (out[coll] || []).map((o: any) => String(o.id));
      this.docOrder.set(coll, ids);
    }
    return out;
  }

  /** Persist the working set. One transaction; only changed rows are written. Returns number of rows touched. */
  private async saveNow(data: Record<string, any>): Promise<number> {
    // Phase 1 (synchronous): serialise the working set and work out what changed. This is a consistent snapshot
    // even though the database writes in phase 2 are asynchronous.
    const ops: Op[] = [];
    let touched = 0;
    const nextDocJson = new Map(this.docJson), nextDocOrder = new Map(this.docOrder), nextDocPos = new Map(this.docPos);
    const nextMin = new Map(this.posMin), nextMax = new Map(this.posMax), nextMap = new Map(this.mapJson), nextKv = new Map(this.kvJson);
    const nextKnown = new Set<string>();

    for (const coll of this.layout.docs) {
      const arr = data[coll];
      if (!Array.isArray(arr)) continue;
      nextKnown.add(coll);
      const prevJson = this.docJson.get(coll) || new Map<string, string>();
      const prevIds = this.docOrder.get(coll) || [];
      const prevPos = new Map(this.docPos.get(coll) || []);

      const curJson = new Map<string, string>();
      const curIds: string[] = [];
      for (const item of arr) {
        const id = item && typeof item === 'object' ? (item as any).id : undefined;
        if (typeof id !== 'string' || !id) throw new Error(`Collection "${coll}" contains an item without a string id`);
        if (curJson.has(id)) { // duplicate ids would silently overwrite each other: keep the last one and say so
          console.warn(`[Database/WARN] Duplicate id "${id}" in "${coll}"; keeping the last occurrence`);
          curIds.splice(curIds.indexOf(id), 1);
        }
        curJson.set(id, JSON.stringify(item)); curIds.push(id);
      }

      // deletions
      for (const id of prevJson.keys()) if (!curJson.has(id)) { ops.push({ t: 'delDoc', coll, id }); prevPos.delete(id); touched++; }

      // order bookkeeping: incremental when items were only added at the front/back or removed, else renumber
      const prevSet = new Set(prevIds), curSet = new Set(curIds);
      const keep = prevIds.filter(id => curSet.has(id));
      let front = 0; while (front < curIds.length && !prevSet.has(curIds[front]) && prevIds.length > 0) front++;
      let back = 0; while (back < curIds.length - front && !prevSet.has(curIds[curIds.length - 1 - back])) back++;
      const mid = curIds.slice(front, curIds.length - back);
      const incremental = mid.length === keep.length && mid.every((id, i) => id === keep[i]);
      let min = nextMin.get(coll) ?? 0, max = nextMax.get(coll) ?? -1;
      const newPos = new Map<string, number>();
      if (incremental) {
        for (const id of keep) newPos.set(id, prevPos.get(id)!);
        for (let i = front - 1; i >= 0; i--) newPos.set(curIds[i], --min);
        for (let i = curIds.length - back; i < curIds.length; i++) newPos.set(curIds[i], ++max);
      } else {
        curIds.forEach((id, i) => newPos.set(id, i));
        min = 0; max = curIds.length - 1;
      }

      for (const id of curIds) {
        const json = curJson.get(id)!, pos = newPos.get(id)!;
        if (prevJson.get(id) !== json || !prevPos.has(id)) { ops.push({ t: 'upDoc', coll, id, pos, json }); touched++; }
        else if (prevPos.get(id) !== pos) { ops.push({ t: 'setPos', coll, id, pos }); touched++; }
      }
      nextDocJson.set(coll, curJson); nextDocOrder.set(coll, curIds); nextDocPos.set(coll, newPos); nextMin.set(coll, min); nextMax.set(coll, max);
    }

    for (const coll of this.layout.maps) {
      const obj = data[coll];
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
      nextKnown.add(coll);
      const prev = this.mapJson.get(coll) || new Map<string, string>();
      const cur = new Map<string, string>();
      for (const [k, v] of Object.entries(obj)) cur.set(k, JSON.stringify(v));
      for (const k of prev.keys()) if (!cur.has(k)) { ops.push({ t: 'delMap', coll, k }); touched++; }
      for (const [k, json] of cur) if (prev.get(k) !== json) { ops.push({ t: 'upMap', coll, k, json }); touched++; }
      nextMap.set(coll, cur);
    }

    const handled = new Set([...this.layout.docs, ...this.layout.maps]);
    for (const [k, v] of Object.entries(data)) {
      if (handled.has(k) || v === undefined) continue;
      nextKnown.add(k);
      const json = JSON.stringify(v);
      if (this.kvJson.get(k) !== json) { ops.push({ t: 'upKv', k, json }); touched++; }
      nextKv.set(k, json);
    }
    for (const k of this.kvJson.keys()) if (!(k in data) || data[k] === undefined) { ops.push({ t: 'delKv', k }); nextKv.delete(k); touched++; }

    const known = JSON.stringify([...nextKnown].sort());
    if (known !== JSON.stringify([...this.knownKeys].sort())) ops.push({ t: 'meta', k: 'known_keys', v: known });

    // Phase 2 (async): one transaction. The remembered snapshots only advance after a successful commit, so a failed
    // save (database briefly unreachable) leaves them intact and the next save simply retries the same changes.
    if (ops.length) await this.driver.transaction(async tx => { for (const op of ops) await apply(tx, op); });

    this.docJson = nextDocJson; this.docOrder = nextDocOrder; this.docPos = nextDocPos; this.posMin = nextMin; this.posMax = nextMax;
    this.mapJson = nextMap; this.kvJson = nextKv; this.knownKeys = nextKnown;
    this.lastSavedAt = Date.now(); this.lastChanged = touched;
    return touched;
  }
}
