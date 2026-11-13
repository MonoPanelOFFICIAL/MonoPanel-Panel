import type { Request, Response, NextFunction } from 'express';
import type { DatabaseSchema } from '../db';
import { HostImage, HostNode, HostServer, HostingPlan } from '../../src/hostingTypes';
import { HostingKind, ServerKind, DEFAULT_ENABLED_HOSTINGS, isServerKind, kindInfo, kindOfCategory, normalizeHostings } from '../../src/hostingKinds';

/**
 * Server-side rules for "which kinds of hosting does this host sell?". The browser hides what is disabled, but the browser
 * is not trusted: every public list, every catalog and every create call goes through these helpers too.
 */

/** Selection from MONOPANEL_HOSTINGS (e.g. "bot,nodejs,lavalink"), used only until an admin saves one. */
export function envHostings(): HostingKind[] | null {
  const raw = (process.env.MONOPANEL_HOSTINGS || '').trim();
  if (!raw) return null;
  const list = normalizeHostings(raw);
  return list.length ? list : null;
}

export function enabledKinds(db: Pick<DatabaseSchema, 'settings'>): HostingKind[] {
  const v = db.settings.enabledHostings;
  return Array.isArray(v) ? normalizeHostings(v) : (envHostings() ?? DEFAULT_ENABLED_HOSTINGS);
}

export const kindEnabled = (db: Pick<DatabaseSchema, 'settings'>, kind: HostingKind): boolean => enabledKinds(db).includes(kind);
export const enabledServerKinds = (db: Pick<DatabaseSchema, 'settings'>): ServerKind[] => enabledKinds(db).filter(isServerKind) as ServerKind[];

export const imageKind = (img: Pick<HostImage, 'kind'> | undefined | null): ServerKind => (img?.kind && isServerKind(img.kind) ? img.kind : 'bot');

/** The kind of a server: stored at creation, else derived from its software (servers from before kinds existed are `bot`). */
export function serverKind(db: Pick<DatabaseSchema, 'images'>, s: Pick<HostServer, 'kind' | 'imageId'>): ServerKind {
  if (s.kind && isServerKind(s.kind)) return s.kind;
  return imageKind(db.images.find(i => i.id === s.imageId));
}

/** A plan with no `kinds` list applies to every kind. */
export const planAppliesTo = (plan: Pick<HostingPlan, 'kinds'>, kind: ServerKind): boolean => !plan.kinds?.length || plan.kinds.includes(kind);

/** A node with no `services` list serves every kind the host sells. */
export const nodeServes = (node: Pick<HostNode, 'services' | 'status'>, kind: ServerKind): boolean => {
  if (node.services?.length && !node.services.includes(kind)) return false;
  // The daemon reports what it was configured for (NODE_SERVICES). Daemons older than 4.1 report nothing and serve everything.
  const reported = node.status?.services;
  return !reported || reported.includes(kind);
};

/** Marketing products belong to a kind through their category. Custom categories are never hidden. */
export function productVisible(db: Pick<DatabaseSchema, 'settings'>, category: string | undefined): boolean {
  const k = kindOfCategory(category);
  return !k || kindEnabled(db, k);
}

export const KIND_DISABLED = { success: false, error: { code: 'HOSTING_DISABLED', message: 'This hosting service is not available.' } };

/** Express guard: 404 for a whole router when its kind is switched off. The message does not reveal the setting. */
export function requireKind(kind: HostingKind, getDb: () => Promise<DatabaseSchema>) {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const db = await getDb();
    if (kindEnabled(db, kind)) return next();
    res.status(404).json({ ...KIND_DISABLED, error: { ...KIND_DISABLED.error, message: `${kindInfo(kind)?.label || 'This service'} is not available on this site.` } });
  };
}

/** Express guard for a single route group where the kind is read from a record (see routes/hosting.ts). */
export function sendDisabled(res: Response, kind: HostingKind): void {
  res.status(403).json({ ...KIND_DISABLED, error: { ...KIND_DISABLED.error, message: `${kindInfo(kind)?.label || 'This service'} is not available on this site.` } });
}
