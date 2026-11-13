import { Router, Response, NextFunction } from 'express';
import { saveDbSync } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../auth';
import { HostServer } from '../../src/hostingTypes';
import { DaemonError, daemon } from '../hosting/daemonClient';
import { allow } from '../hosting/ratelimit';
import { HostingError, nodeFor, pushSpec, siteHosts } from '../hosting/serverService';
import { serverKind } from '../hosting/kinds';
import { MAX_DOMAINS, checkDomain, cleanDomain, domainTaken, isUnderBaseDomain, mkDomain, nodeWebTarget, requiredRecords } from '../hosting/sites';
import { member } from './hosting';

/**
 * Per-kind customer routes (Lavalink settings, Node.js project tools, website domains). They live next to the generic server
 * routes, use the same access rules (owner / team permissions, hidden when the kind is switched off) and the same signed daemon.
 */
const router = Router();
router.use((req: AuthenticatedRequest, res: Response, next: NextFunction) => (req.user ? next() : authMiddleware(req, res, next)));

const err = (res: Response, status: number, code: string, message: string) => res.status(status).json({ success: false, error: { code, message } });
const ok = (res: Response, data?: unknown) => res.json({ success: true, data });
function handle(fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) {
  return async (req: AuthenticatedRequest, res: Response) => {
    try { await fn(req, res); } catch (e: any) {
      if (res.headersSent) return;
      if (e instanceof HostingError) return err(res, e.status, e.code, e.message);
      if (e instanceof DaemonError) return err(res, [400, 404, 409, 413].includes(e.status) ? e.status : 502, 'NODE_ERROR', e.message);
      console.error('[HostingKinds]', e?.message || e); err(res, 500, 'INTERNAL', 'Something went wrong. Please try again.');
    }
  };
}
const usable = (s: HostServer) => {
  if (s.status === 'suspended') throw new HostingError(403, 'SUSPENDED', 'This server is suspended. Contact support.');
  if (s.status === 'expired') throw new HostingError(403, 'EXPIRED', 'This server has expired. Renew it first.');
  if (s.status === 'transferring') throw new HostingError(409, 'TRANSFERRING', 'This server is being moved to another node.');
};
/** Loads the server and refuses when it is not of the expected kind(s), so a Lavalink page can never drive a bot server and vice versa. */
async function forKind(req: AuthenticatedRequest, perm: Parameters<typeof member>[1], kinds: string[]) {
  const m = await member(req, perm);
  const kind = serverKind(m.db, m.server);
  if (!kinds.includes(kind)) throw new HostingError(404, 'NOT_FOUND', 'Server not found.');
  return { ...m, kind };
}

// ======================================================================================== Lavalink
router.get('/servers/:id/lavalink', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'console.read', ['lavalink']);
  const node = nodeFor(db, server);
  const [config, status] = await Promise.all([
    daemon(node, 'GET', `/v1/servers/${server.id}/lavalink/config`).catch(() => null),
    daemon(node, 'GET', `/v1/servers/${server.id}/lavalink/status`, undefined, { timeoutMs: 6000 }).catch(() => null),
  ]);
  const port = server.ports[0]?.host || 0;
  ok(res, {
    config, status,
    connection: { host: node.fqdn, port, secure: false, password: server.variables.LAVALINK_PASSWORD || '', version: server.variables.LAVALINK_VERSION || 'latest', url: `http://${node.fqdn}:${port}` },
  });
}));
router.put('/servers/:id/lavalink/config', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'settings', ['lavalink']); usable(server);
  if (!allow(`lavalink-cfg:${server.id}`, 20, 60_000)) return err(res, 429, 'RATE_LIMIT', 'Too many changes. Wait a minute.');
  const b = req.body || {};
  const payload = typeof b.raw === 'string' ? { raw: b.raw.slice(0, 200_000) } : { settings: b.settings && typeof b.settings === 'object' ? b.settings : {} };
  ok(res, await daemon(nodeFor(db, server), 'PUT', `/v1/servers/${server.id}/lavalink/config`, payload));
}));
router.post('/servers/:id/lavalink/reset', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'settings', ['lavalink']); usable(server);
  ok(res, await daemon(nodeFor(db, server), 'POST', `/v1/servers/${server.id}/lavalink/reset`, {}));
}));

// ======================================================================================== Node.js (also used by website servers)
router.get('/servers/:id/nodejs/project', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'files.read', ['nodejs', 'website', 'bot']);
  ok(res, await daemon(nodeFor(db, server), 'GET', `/v1/servers/${server.id}/nodejs/project`));
}));
router.get('/servers/:id/nodejs/task', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'files.read', ['nodejs', 'website', 'bot']);
  ok(res, await daemon(nodeFor(db, server), 'GET', `/v1/servers/${server.id}/nodejs/task`));
}));
router.post('/servers/:id/nodejs/task', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'files.write', ['nodejs', 'website', 'bot']); usable(server);
  const task = String(req.body?.task || '');
  if (!['install', 'build', 'update', 'clean'].includes(task)) return err(res, 400, 'INVALID_TASK', 'Choose install, build, update or clean.');
  if (!allow(`njs-task:${server.id}`, 6, 10 * 60_000)) return err(res, 429, 'RATE_LIMIT', 'Too many tasks. Wait a few minutes.');
  ok(res, await daemon(nodeFor(db, server), 'POST', `/v1/servers/${server.id}/nodejs/task`, { task }, { timeoutMs: 30_000 }));
}));

// ======================================================================================== website domains
function sitePayload(db: Awaited<ReturnType<typeof member>>['db'], server: HostServer) {
  const node = nodeFor(db, server);
  const site = server.site || { subdomain: '', domains: [] };
  return {
    subdomain: site.subdomain, baseDomain: db.settings.websiteBaseDomain || '', maxDomains: MAX_DOMAINS, target: nodeWebTarget(node), hosts: siteHosts(server),
    proxy: node.status?.web || null,
    domains: site.domains.map(d => ({ ...d, records: d.verified ? [] : requiredRecords(server, node, d.name) })),
  };
}

router.get('/servers/:id/site', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'console.read', ['website']);
  ok(res, sitePayload(db, server));
}));

router.post('/servers/:id/site/domains', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'settings', ['website']);
  if (!allow(`site-dom:${req.user!.id}`, 20, 10 * 60_000)) return err(res, 429, 'RATE_LIMIT', 'Too many attempts. Wait a few minutes.');
  const name = cleanDomain(req.body?.domain);
  if (!name) return err(res, 400, 'INVALID_DOMAIN', 'Enter a domain like example.com or www.example.com (no http://, no path).');
  if (isUnderBaseDomain(db, name)) return err(res, 400, 'INVALID_DOMAIN', 'That domain belongs to this host. Use your own domain.');
  server.site = server.site || { subdomain: '', domains: [] };
  if (server.site.domains.length >= MAX_DOMAINS) return err(res, 400, 'LIMIT', `A site can have up to ${MAX_DOMAINS} domains.`);
  if (server.site.domains.some(d => d.name === name)) return err(res, 409, 'EXISTS', 'That domain is already added.');
  if (domainTaken(db, name, server.id)) return err(res, 409, 'TAKEN', 'That domain is already connected to another site.');
  server.site.domains.push(mkDomain(name));
  saveDbSync();
  res.status(201); ok(res, sitePayload(db, server));
}));

router.post('/servers/:id/site/domains/verify', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'settings', ['website']);
  const name = cleanDomain(req.body?.domain);
  const d = server.site?.domains.find(x => x.name === name);
  if (!d || !name) return err(res, 404, 'NOT_FOUND', 'Domain not found on this site.');
  if (!allow(`site-verify:${server.id}`, 12, 10 * 60_000)) return err(res, 429, 'RATE_LIMIT', 'Too many checks. DNS changes can take a few minutes, try again shortly.');
  const report = await checkDomain(server, nodeFor(db, server), name);
  d.checkedAt = new Date().toISOString();
  if (report.verified && domainTaken(db, name, server.id)) { d.verified = false; d.error = 'That domain is already connected to another site.'; }
  else { d.verified = report.verified; d.error = report.verified ? undefined : report.error; }
  saveDbSync();
  if (d.verified) await pushSpec(db, server).catch(() => undefined); // the node starts routing the domain now
  ok(res, sitePayload(db, server));
}));

router.delete('/servers/:id/site/domains/:domain', handle(async (req, res) => {
  const { db, server } = await forKind(req, 'settings', ['website']);
  const name = cleanDomain(req.params.domain);
  if (!server.site || !name || !server.site.domains.some(d => d.name === name)) return err(res, 404, 'NOT_FOUND', 'Domain not found on this site.');
  server.site.domains = server.site.domains.filter(d => d.name !== name);
  saveDbSync();
  await pushSpec(db, server).catch(() => undefined);
  ok(res, sitePayload(db, server));
}));

export default router;
