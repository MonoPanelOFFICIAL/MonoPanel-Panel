import React, { useEffect, useMemo, useState } from 'react';
import {
  Home, BookOpen, Activity, Tag, Server, Cloud, Globe, Hexagon, Music, CreditCard, LifeBuoy, Mail, Settings, Shield,
  Search, LogOut, Menu, X, ChevronRight, ChevronDown, ArrowLeft, LogIn, Sparkles
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useBranding } from '../lib/BrandingContext';
import { useTheme } from '../lib/ThemeContext';
import { apiRequest } from '../lib/api';
import { routeToUrl } from '../lib/routing';
import { useScopedNav } from '../lib/navStore';
import { HOSTING_KINDS, HostingKind, kindInfo } from '../hostingKinds';
import { ADMIN_GROUPS } from './navModel';
import { buildPanelTabs, PANEL_PAGES } from './panelNav';

/**
 * The one and only main navigation, on every page and every screen size (same markup on desktop and phones: on a phone it
 * simply slides in from the left behind a menu button). What it lists depends on where you are:
 *   - public pages      : the website (Home, hosting types, Pricing, Status, Docs) + your account links when signed in
 *   - dashboard pages   : the panel (Servers, VPS, Websites ... Store, Earn) + account links
 *   - a server's pages  : that server's own tabs (Console, Files, Backups ...), published by the page through navStore
 *   - admin pages       : the admin menu
 */
interface Props {
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenSearch?: () => void;
}

const KIND_ICON: Record<HostingKind, React.ComponentType<{ className?: string; width?: number; height?: number }>> = {
  bot: Server, vps: Cloud, website: Globe, nodejs: Hexagon, lavalink: Music
};

const STAFF_ROLES = ['admin', 'super_admin', 'support', 'moderator'];
const COLLAPSE_KEY = 'mp_nav_collapsed';
const loadCollapsed = (): string[] => {
  try { const v = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || 'null'); return Array.isArray(v) ? v : ['Website']; } catch { return ['Website']; }
};

type GoFn = (page: string, params?: any) => (e: React.MouseEvent) => void;

/** Module-level on purpose: components declared inside SiteSidebar would get a new identity on every render and remount. */
const Item: React.FC<{ go: GoFn; page: string; params?: any; icon?: React.ReactNode; label: string; active: boolean; badge?: number; compact?: boolean }> =
  ({ go, page, params, icon, label, active, badge, compact }) => (
    <a href={routeToUrl(page, params)} onClick={go(page, params)} className={`${compact ? 'site-section-link' : 'site-nav-link'}${active ? ' active' : ''}`} {...(active ? { 'aria-current': 'page' as const } : {})}>
      {compact ? (icon && <span className="mp-nav-ico">{icon}</span>) : icon}
      <span className="mp-nav-label">{label}</span>
      {!!badge && badge > 0 && <span className="site-nav-badge">{badge > 9 ? '9+' : badge}</span>}
      {compact && <ChevronRight width={12} height={12} aria-hidden="true" />}
    </a>
  );

const Button: React.FC<{ onClick: () => void; icon?: React.ReactNode; label: string; active: boolean }> = ({ onClick, icon, label, active }) => (
  <button type="button" onClick={onClick} className={`site-nav-link${active ? ' active' : ''}`} {...(active ? { 'aria-current': 'page' as const } : {})}>
    {icon}
    <span className="mp-nav-label">{label}</span>
  </button>
);

const Title: React.FC<{ children: React.ReactNode; shut?: boolean; onToggle?: () => void }> = ({ children, shut, onToggle }) => onToggle ? (
  <button type="button" className={`mp-nav-title mp-nav-title--btn${shut ? ' is-shut' : ''}`} aria-expanded={!shut} onClick={onToggle}>
    <span>{children}</span><ChevronDown width={12} height={12} aria-hidden="true" />
  </button>
) : <p className="mp-nav-title">{children}</p>;

export const SiteSidebar: React.FC<Props> = ({ currentPage, onNavigate, onOpenSearch }) => {
  const { user, logout } = useAuth();
  const { brandName, enabledHostings } = useBranding();
  const { themeAssets } = useTheme();
  const scoped = useScopedNav();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('');
  const [collapsed, setCollapsed] = useState<string[]>(loadCollapsed);
  const [logoFailed, setLogoFailed] = useState(false);

  const isStaff = !!user && STAFF_ROLES.includes(user.role);
  const adminMode = isStaff && currentPage.startsWith('admin-');
  const serverMode = !!scoped && (currentPage === 'server' || currentPage === 'vps-server');
  const panelMode = !!user && !adminMode && !serverMode && PANEL_PAGES.includes(currentPage);
  const logoSrc = (!logoFailed && themeAssets?.logoUrl?.trim()) || '/assets/icon.png';
  const name = brandName || 'MonoPanel';

  // Poll the unread mail count for the Mail badge
  useEffect(() => {
    if (!user) { setUnread(0); return; }
    let cancelled = false;
    const load = async () => {
      const res = await apiRequest('/mail/unread-count');
      if (!cancelled && res.success && res.data) setUnread(res.data.count || 0);
    };
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [user, currentPage]);

  // Phones: the sidebar slides in. Close it on navigation, on Escape and when the screen grows; lock page scroll while it is open.
  useEffect(() => { setOpen(false); }, [currentPage, scoped?.active]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const resize = () => { if (window.innerWidth > 860) setOpen(false); };
    window.addEventListener('keydown', esc);
    window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); window.removeEventListener('resize', resize); };
  }, [open]);

  const go: GoFn = (page, params) => (e) => {
    // Let the browser handle modified clicks (open in a new tab); everything else navigates inside the app.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    onNavigate(page, params);
    setOpen(false);
  };

  const panelTabs = useMemo(() => buildPanelTabs(enabledHostings), [enabledHostings]);
  const firstPanelPage = enabledHostings.length ? kindInfo(enabledHostings[0])!.panelPage : 'servers';
  const kinds = HOSTING_KINDS.filter(k => enabledHostings.includes(k.id));

  const toggle = (t: string) => setCollapsed(c => {
    const n = c.includes(t) ? c.filter(x => x !== t) : [...c, t];
    try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(n)); } catch { /* private mode */ }
    return n;
  });

  const q = filter.trim().toLowerCase();
  const adminGroups = useMemo(() => ADMIN_GROUPS
    .filter(g => g.title !== 'VPS Hosting' || enabledHostings.includes('vps'))
    .map(g => ({ ...g, items: q ? g.items.filter(i => i.label.toLowerCase().includes(q)) : g.items }))
    .filter(g => g.items.length), [q, enabledHostings]);

  const ic = (I: React.ComponentType<{ width?: number; height?: number; 'aria-hidden'?: boolean }>, size = 16) => <I width={size} height={size} aria-hidden={true} />;

  // ── blocks ────────────────────────────────────────────────────────────────
  const website = (compact: boolean) => {
    const s = compact ? 15 : 16;
    return (
      <>
        <Item go={go} page="home" icon={ic(Home, s)} label="Home" active={currentPage === 'home'} compact={compact} />
        {kinds.map(k => <Item key={k.id} go={go} page={k.publicPage} icon={ic(KIND_ICON[k.id], s)} label={k.label} active={currentPage === k.publicPage} compact={compact} />)}
        <Item go={go} page="pricing" icon={ic(Tag, s)} label="Pricing" active={currentPage === 'pricing'} compact={compact} />
        <Item go={go} page="status" icon={ic(Activity, s)} label="Status" active={currentPage === 'status'} compact={compact} />
        <Item go={go} page="docs" icon={ic(BookOpen, s)} label="Docs" active={currentPage === 'docs'} compact={compact} />
      </>
    );
  };

  const websiteGroup = (
    <div className="mp-nav-group">
      <Title shut={collapsed.includes('Website')} onToggle={() => toggle('Website')}>Website</Title>
      {!collapsed.includes('Website') && website(true)}
    </div>
  );

  const accountGroup = user && (
    <div className="mp-nav-group">
      <Title>Account</Title>
      {!panelMode && !serverMode && <Item go={go} page={firstPanelPage} icon={ic(Server, 15)} label="My Servers" active={false} compact />}
      <Item go={go} page="billing" icon={ic(CreditCard, 15)} label="Billing & credits" active={currentPage === 'billing' || currentPage === 'checkout'} compact />
      <Item go={go} page="support" icon={ic(LifeBuoy, 15)} label="Support" active={currentPage === 'support'} compact />
      <Item go={go} page="mail" icon={ic(Mail, 15)} label="Mail" active={currentPage === 'mail'} badge={unread} compact />
      <Item go={go} page="activity" icon={ic(Activity, 15)} label="Activity log" active={currentPage === 'activity'} compact />
      <Item go={go} page="settings" icon={ic(Settings, 15)} label="Settings" active={currentPage === 'settings'} compact />
      {isStaff && <Item go={go} page="admin-dashboard" icon={ic(Shield, 15)} label="Admin panel" active={false} compact />}
    </div>
  );

  let main: React.ReactNode;
  if (serverMode && scoped) {
    main = (
      <>
        <a href={routeToUrl(scoped.backPage)} onClick={go(scoped.backPage)} className="mp-nav-back"><ArrowLeft width={14} height={14} aria-hidden="true" />{scoped.backLabel}</a>
        <div className="mp-scope-card"><div className="t">{scoped.title}</div>{scoped.subtitle && <div className="s">{scoped.subtitle}</div>}</div>
        {scoped.groups.map(g => (
          <div className="mp-nav-group" key={g.title}>
            <Title>{g.title}</Title>
            {g.items.map(it => {
              const I = it.icon;
              return <Button key={it.id} onClick={() => { scoped.onSelect(it.id); setOpen(false); }} icon={I ? <I width={16} height={16} /> : undefined} label={it.label} active={scoped.active === it.id} />;
            })}
          </div>
        ))}
        {accountGroup}
        {websiteGroup}
      </>
    );
  } else if (adminMode) {
    main = (
      <>
        <div className="mp-nav-group">
          <Title>Admin control plane</Title>
          <div className="sidebar-search-wrap">
            <Search className="sidebar-search-icon" width={13} height={13} aria-hidden="true" />
            <input type="search" className="sidebar-search-input" placeholder="Filter pages..." aria-label="Filter admin pages" autoComplete="off" spellCheck={false}
              value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
        </div>
        {adminGroups.length === 0 && <p className="mp-nav-empty">No pages match “{filter}”.</p>}
        {adminGroups.map(g => {
          const shut = !q && collapsed.includes('admin:' + g.title);
          return (
            <div className="mp-nav-group" key={g.title}>
              <Title shut={shut} onToggle={() => toggle('admin:' + g.title)}>{g.title}</Title>
              {!shut && g.items.map(it => {
                const I = it.icon;
                return <Item key={it.page} go={go} page={it.page} icon={<I className="h-[15px] w-[15px]" />} label={it.label} active={currentPage === it.page} compact />;
              })}
            </div>
          );
        })}
        {websiteGroup}
      </>
    );
  } else if (panelMode) {
    main = (
      <>
        <div className="mp-nav-group">
          <Title>Panel</Title>
          {panelTabs.map(t => {
            const I = t.icon;
            const on = t.match.includes(currentPage) || (currentPage === 'server-create' && t.page === 'server-create');
            return <Item key={t.page} go={go} page={t.page} params={t.params} icon={<I width={16} height={16} />} label={t.label} active={on} />;
          })}
        </div>
        {accountGroup}
        {websiteGroup}
      </>
    );
  } else {
    main = (
      <>
        <div className="mp-nav-group">{website(false)}</div>
        {accountGroup}
      </>
    );
  }

  const footer = (
    <div className="site-sidebar-footer">
      {onOpenSearch && (
        <button type="button" className="btn-secondary mp-search-btn" onClick={() => { setOpen(false); onOpenSearch(); }} aria-label="Search the panel">
          <span><Search width={14} height={14} aria-hidden="true" />Search</span>
          <kbd>⌘K</kbd>
        </button>
      )}
      {adminMode && (
        <a href={routeToUrl(firstPanelPage)} onClick={go(firstPanelPage)} className="btn-secondary mp-exit-btn">
          <ArrowLeft width={14} height={14} aria-hidden="true" />Exit to my servers
        </a>
      )}
      {user ? (
        <div className="site-user-card">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" />
            : <div className="avatar-fallback">{(user.displayName || user.username || '?').charAt(0).toUpperCase()}</div>}
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="name">{user.displayName || user.username}</div>
            <div className="sub">{adminMode ? user.role : user.email}</div>
          </div>
          <button type="button" onClick={() => { logout(); setOpen(false); }} title="Sign out" aria-label="Sign out"><LogOut width={15} height={15} aria-hidden="true" /></button>
        </div>
      ) : (
        <div className="site-auth-row">
          <a href={routeToUrl('login')} onClick={go('login')} className="btn-secondary"><LogIn width={14} height={14} aria-hidden="true" />Sign in</a>
          <a href={routeToUrl('register')} onClick={go('register')} className="btn-primary"><Sparkles width={14} height={14} aria-hidden="true" />Get started</a>
        </div>
      )}
    </div>
  );

  const logo = (
    <a href={routeToUrl('home')} onClick={go('home')} className="site-sidebar-logo">
      <img src={logoSrc} alt="" width={29} height={29} onError={() => setLogoFailed(true)} />
      <span>{name}</span>
    </a>
  );

  return (
    <>
      {/* Phones only: a slim bar with the menu button. It opens this very same sidebar. */}
      <header className="mp-topbar">
        <button type="button" className="mp-topbar-btn" aria-label="Open navigation menu" aria-expanded={open} aria-controls="site-sidebar" onClick={() => setOpen(true)}><Menu width={20} height={20} aria-hidden="true" /></button>
        {logo}
        {onOpenSearch && <button type="button" className="mp-topbar-btn mp-topbar-end" aria-label="Search" onClick={onOpenSearch}><Search width={18} height={18} aria-hidden="true" /></button>}
      </header>

      <div className={`mp-scrim${open ? ' open' : ''}`} aria-hidden="true" onClick={() => setOpen(false)} />

      <aside id="site-sidebar" className={`site-sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="site-sidebar-header">
          {logo}
          <button type="button" className="mp-sidebar-close" aria-label="Close navigation menu" onClick={() => setOpen(false)}><X width={18} height={18} aria-hidden="true" /></button>
        </div>
        <nav className="site-sidebar-scroll" aria-label="Primary navigation">{main}</nav>
        {footer}
      </aside>
    </>
  );
};
