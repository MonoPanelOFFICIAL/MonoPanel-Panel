import crypto from 'crypto';
import dns from 'dns';
import { DatabaseSchema } from '../db';
import { HostNode, HostServer, SiteDomain } from '../../src/hostingTypes';
import { resolveJwtSecret } from './crypto';

/**
 * Custom domains for website hosting.
 *
 * A customer proves they control a domain with ONE of:
 *   - a TXT record  _monopanel.<domain>  =  monopanel-site=<token>   (works for apex domains)
 *   - a CNAME from the domain to their site's unique free subdomain (only the domain owner can point a name at it)
 * The token is derived from the server id and domain with the panel's secret, so it cannot be guessed or reused for another site.
 * The domain must also resolve to the node (A/AAAA or CNAME); until it does the dashboard shows the DNS records still missing.
 */

export const MAX_DOMAINS = 12;
const LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?';
const DOMAIN_RE = new RegExp(`^(?:${LABEL}\\.)+[a-z]{2,24}$|^(?:${LABEL}\\.)+xn--[a-z0-9-]{2,59}$`);

/** Lower-cases and validates. Returns null when it is not a usable public hostname. */
export function cleanDomain(input: unknown): string | null {
  const d = String(input ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (d.length < 4 || d.length > 253 || !DOMAIN_RE.test(d)) return null;
  if (/^(localhost|.*\.local|.*\.internal|.*\.localhost)$/.test(d)) return null;
  return d;
}

export function verifyToken(serverId: string, domain: string): string {
  return crypto.createHmac('sha256', resolveJwtSecret()).update(`site:${serverId}:${domain}`).digest('hex').slice(0, 32);
}

/** The host customers point their DNS at (set `webTarget` on the node when websites are served from a different address). */
export const nodeWebTarget = (node: HostNode): string => (node.webTarget || node.fqdn).toLowerCase();

export interface DnsReport { verified: boolean; routed: boolean; error?: string; records: { type: string; name: string; value: string; note: string }[] }

export function requiredRecords(server: HostServer, node: HostNode, domain: string): DnsReport['records'] {
  const target = nodeWebTarget(node);
  const isIp = /^[0-9.]+$|:/.test(target);
  return [
    { type: 'TXT', name: `_monopanel.${domain}`, value: `monopanel-site=${verifyToken(server.id, domain)}`, note: 'Proves you own the domain' },
    { type: isIp ? (target.includes(':') ? 'AAAA' : 'A') : 'CNAME', name: domain, value: target, note: isIp ? 'Sends visitors to your node' : 'Sends visitors to your node (use an A record at the root of the domain if your DNS provider does not allow a CNAME there)' },
  ];
}

const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => { try { return await p; } catch { return fallback; } };

/** Resolver injection point for tests. */
export const resolver = { txt: (n: string) => dns.promises.resolveTxt(n), cname: (n: string) => dns.promises.resolveCname(n), a: (n: string) => dns.promises.resolve4(n), aaaa: (n: string) => dns.promises.resolve6(n) };

export async function checkDomain(server: HostServer, node: HostNode, domain: string): Promise<DnsReport> {
  const records = requiredRecords(server, node, domain);
  const sub = server.site?.subdomain?.toLowerCase();
  const token = `monopanel-site=${verifyToken(server.id, domain)}`;

  const txt = (await safe(resolver.txt(`_monopanel.${domain}`), [] as string[][])).map(r => r.join(''));
  const cnames = (await safe(resolver.cname(domain), [] as string[])).map(c => c.toLowerCase().replace(/\.$/, ''));
  const owns = txt.includes(token) || (!!sub && cnames.includes(sub));

  const target = nodeWebTarget(node);
  let routed = cnames.includes(target) || (!!sub && cnames.includes(sub));
  if (!routed) {
    const want = /^[0-9.]+$|:/.test(target) ? [target] : [...await safe(resolver.a(target), [] as string[]), ...await safe(resolver.aaaa(target), [] as string[])];
    const have = [...await safe(resolver.a(domain), [] as string[]), ...await safe(resolver.aaaa(domain), [] as string[])];
    routed = have.some(a => want.includes(a));
  }
  if (!owns) return { verified: false, routed, records, error: `Add the TXT record _monopanel.${domain} and wait for DNS to update (it can take a few minutes).` };
  if (!routed) return { verified: false, routed, records, error: `Ownership confirmed, but ${domain} does not point at the node yet. Add the A or CNAME record shown below.` };
  return { verified: true, routed, records };
}

/** Verified domains are unique across the whole panel: the first server to prove a domain keeps it. */
export function domainTaken(db: DatabaseSchema, domain: string, exceptServerId: string): boolean {
  return db.servers.some(s => s.id !== exceptServerId && s.site?.domains.some(d => d.name === domain && d.verified));
}

export function isUnderBaseDomain(db: DatabaseSchema, domain: string): boolean {
  const base = (db.settings.websiteBaseDomain || '').trim().toLowerCase().replace(/^\*?\./, '');
  return !!base && (domain === base || domain.endsWith(`.${base}`));
}

export function mkDomain(name: string): SiteDomain { return { name, verified: false, addedAt: new Date().toISOString() }; }
