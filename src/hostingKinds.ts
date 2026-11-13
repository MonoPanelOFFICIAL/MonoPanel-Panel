/**
 * The kinds of hosting this panel can sell. The owner picks which ones they actually provide in Admin > Hosting Types;
 * everything that is not picked disappears from the website, the customer panel, the admin menu and the API, so a host
 * never advertises (or accidentally sells) something they do not run.
 *
 * Shared by the server (gating, defaults) and the browser (menus, pages). Keep it free of imports.
 */

export type HostingKind = 'bot' | 'vps' | 'website' | 'nodejs' | 'lavalink';
/** Kinds that run as "servers" on the daemon. VPS has its own engine and panel. */
export type ServerKind = Exclude<HostingKind, 'vps'>;

export interface HostingKindInfo {
  id: HostingKind;
  /** Menu / headings, e.g. "Node.js Hosting". */
  label: string;
  /** One or two words, for tabs and badges. */
  short: string;
  tagline: string;
  description: string;
  engine: 'server' | 'vps';
  /** Public marketing page id (see App.tsx / routing.ts). */
  publicPage: string;
  /** Customer panel landing page id. */
  panelPage: string;
  /** db.products category that belongs to this kind. */
  category: string;
  /** lucide-react icon name (resolved in the UI). */
  icon: 'Bot' | 'Server' | 'Globe' | 'Hexagon' | 'Music';
  /** Bullet points used on the public page and the selector. */
  highlights: string[];
}

export const HOSTING_KINDS: HostingKindInfo[] = [
  {
    id: 'bot', label: 'Bot Hosting', short: 'Bots', engine: 'server', publicPage: 'bot', panelPage: 'servers', category: 'bot', icon: 'Bot',
    tagline: '24/7 hosting for Discord, Telegram and WhatsApp bots',
    description: 'Always-on process hosting with a console, file manager, backups and Git deploys. Node.js, Python and more.',
    highlights: ['Always online, auto-restart', 'Node.js, Python and other runtimes', 'Console, files, backups, schedules'],
  },
  {
    id: 'vps', label: 'VPS Hosting', short: 'VPS', engine: 'vps', publicPage: 'vps', panelPage: 'vps-list', category: 'vps', icon: 'Server',
    tagline: 'Full root access, any OS image',
    description: 'Virtual private servers with root SSH, your choice of Linux image, and resource graphs.',
    highlights: ['Full root access over SSH', 'Ubuntu and Debian images', 'Reinstall, resize and reboot from the panel'],
  },
  {
    id: 'website', label: 'Website Hosting', short: 'Websites', engine: 'server', publicPage: 'website', panelPage: 'website-list', category: 'website', icon: 'Globe',
    tagline: 'Full-stack websites with your own domain',
    description: 'Deploy a front end and back end together: Next.js, Express, Vite, Flask and static sites. Free subdomain, custom domains and HTTPS.',
    highlights: ['Front end and back end in one place', 'Free subdomain and custom domains', 'Git deploys with build steps'],
  },
  {
    id: 'nodejs', label: 'Node.js Hosting', short: 'Node.js', engine: 'server', publicPage: 'nodejs', panelPage: 'nodejs-list', category: 'nodejs', icon: 'Hexagon',
    tagline: 'Run any Node.js app, API or worker',
    description: 'Pick your Node version, deploy from Git or upload, run npm install and build from the panel, and watch the console live.',
    highlights: ['Node 20, 22 and 24', 'npm / pnpm / yarn install and build tasks', 'Git deploy and one-click update'],
  },
  {
    id: 'lavalink', label: 'Lavalink Hosting', short: 'Lavalink', engine: 'server', publicPage: 'lavalink', panelPage: 'lavalink-list', category: 'lavalink', icon: 'Music',
    tagline: 'Low-latency Lavalink v4 audio nodes for music bots',
    description: 'A ready-to-use Lavalink node with a generated config, plugin manager, live player stats and copy-paste connection details.',
    highlights: ['Lavalink v4, ready in a minute', 'Plugins and sources from a settings page', 'Live players, memory and CPU'],
  },
];

export const KIND_IDS: HostingKind[] = HOSTING_KINDS.map(k => k.id);
export const SERVER_KIND_IDS: ServerKind[] = HOSTING_KINDS.filter(k => k.engine === 'server').map(k => k.id as ServerKind);

/** What an existing install sold before this setting existed, and what a fresh one starts with. New kinds are opt-in. */
export const DEFAULT_ENABLED_HOSTINGS: HostingKind[] = ['bot', 'vps'];

export const kindInfo = (id: string | undefined | null): HostingKindInfo | undefined => HOSTING_KINDS.find(k => k.id === id);
export const isHostingKind = (v: unknown): v is HostingKind => typeof v === 'string' && (KIND_IDS as string[]).includes(v);
export const isServerKind = (v: unknown): v is ServerKind => typeof v === 'string' && (SERVER_KIND_IDS as string[]).includes(v);

/** Cleans a list coming from storage, an env var or the network: known kinds only, no duplicates, canonical order. */
export function normalizeHostings(v: unknown): HostingKind[] {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const set = new Set(raw.map(x => String(x).trim().toLowerCase()));
  return KIND_IDS.filter(k => set.has(k));
}

/** Product categories (db.products) map to kinds; anything else (custom categories) is not gated. */
export const kindOfCategory = (category: string | undefined): HostingKind | null => {
  const c = String(category || '').toLowerCase();
  return KIND_IDS.find(k => k === c) ?? null;
};

/** The page a visitor lands on first for a given set of enabled kinds (used when a disabled page is opened). */
export const firstPublicPage = (enabled: HostingKind[]): string => (enabled.length ? kindInfo(enabled[0])!.publicPage : 'home');
