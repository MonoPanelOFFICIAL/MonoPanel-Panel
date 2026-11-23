import { Server, Globe, Hexagon, Music, Plus, Star, ShoppingBag, Coins, Package, Cloud } from 'lucide-react';
import { HOSTING_KINDS, HostingKind, SERVER_KIND_IDS } from '../hostingKinds';

/** The customer panel's main navigation. It lives in the site sidebar. */
export interface PanelTab { page: string; label: string; icon: any; match: string[]; kind?: HostingKind; params?: Record<string, any> }

const KIND_TAB_ICON: Record<HostingKind, any> = { bot: Server, vps: Cloud, website: Globe, nodejs: Hexagon, lavalink: Music };
const KIND_TAB_LABEL: Record<HostingKind, string> = { bot: 'Servers', vps: 'VPS', website: 'Websites', nodejs: 'Node.js', lavalink: 'Lavalink' };

const STATIC_TABS: PanelTab[] = [
  { page: 'upgrade', label: 'Upgrade', icon: Star, match: ['upgrade'] },
  { page: 'store', label: 'Store', icon: ShoppingBag, match: ['store'] },
  { page: 'earn', label: 'Earn', icon: Coins, match: ['earn'] },
  { page: 'addons', label: 'Addons', icon: Package, match: ['addons'] },
];

/** One tab per hosting type the host sells (Admin > Hosting Types); types that are switched off have no tab, no page and no create button. */
export function buildPanelTabs(enabled: HostingKind[]): PanelTab[] {
  const kindTabs: PanelTab[] = HOSTING_KINDS.filter(k => enabled.includes(k.id)).map(k => ({
    page: k.panelPage, label: KIND_TAB_LABEL[k.id], icon: KIND_TAB_ICON[k.id], kind: k.id,
    match: k.id === 'bot' ? ['servers'] : k.id === 'vps' ? ['vps-list', 'vps-server', 'vps-deploy'] : [k.panelPage],
  }));
  // With a single server type a separate "Create" tab is unambiguous; with several, each list page has its own "New" button.
  const serverKinds = enabled.filter(k => (SERVER_KIND_IDS as string[]).includes(k));
  const create: PanelTab[] = serverKinds.length === 1 ? [{ page: 'server-create', label: 'Create', icon: Plus, match: ['server-create'], params: { kind: serverKinds[0] } }] : [];
  return [...kindTabs, ...create, ...STATIC_TABS];
}

/** Pages that belong to the customer panel's "Panel" section. */
export const PANEL_PAGES = ['servers', 'server', 'server-create', 'vps-list', 'vps-server', 'vps-deploy', 'website-list', 'nodejs-list', 'lavalink-list', 'upgrade', 'store', 'earn', 'addons'];
