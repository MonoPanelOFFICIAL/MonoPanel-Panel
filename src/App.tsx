import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { ThemeProvider } from './lib/ThemeContext';
import { BrandingProvider, useBranding } from './lib/BrandingContext';
import { ToastProvider } from './lib/ToastContext';
import { AnimationProvider } from './lib/AnimationContext';
import { PageTransition } from './components/animation/PageTransition';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
import { parseUrlToRoute, routeToUrl } from './lib/routing';

// Components
import { SiteSidebar } from './components/SiteSidebar';
import { PanelLayout } from './components/panel/PanelLayout';
import { AdminShell } from './components/AdminShell';
import { Footer } from './components/Footer';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { ScrollProgress } from './components/animation/ScrollFx';

// Public Pages
import { Home } from './pages/public/Home';
import { VpsHosting } from './pages/public/VpsHosting';
import { BotHosting } from './pages/public/BotHosting';
import { Pricing } from './pages/public/Pricing';
import { Status } from './pages/public/Status';
import { Docs } from './pages/public/Docs';
import { LegalPage } from './pages/public/LegalPage';
import { NotFound } from './pages/public/NotFound';
import { KindHosting } from './pages/public/KindHosting';
import { HostingKind, ServerKind, kindInfo } from './hostingKinds';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';

// Customer Pages
import { ServersOverview } from './pages/panel/ServersOverview';
import { CreateServer } from './pages/panel/CreateServer';
import { ServerDetail } from './pages/panel/ServerDetail';
import { Upgrade } from './pages/panel/Upgrade';
import { Store } from './pages/panel/Store';
import { Earn } from './pages/panel/Earn';
import { Addons } from './pages/panel/Addons';
import { AdminAddons } from './pages/admin/AdminAddons';
import { Billing } from './pages/customer/Billing';
import { Checkout } from './pages/customer/Checkout';
import { SupportTickets } from './pages/customer/SupportTickets';
import { Mail } from './pages/customer/Mail';
import { ActivityLog } from './pages/customer/ActivityLog';
import { UserSettings } from './pages/customer/UserSettings';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminBilling } from './pages/admin/AdminBilling';
import { AdminCoupons } from './pages/admin/AdminCoupons';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminSupport } from './pages/admin/AdminSupport';
import { AdminMail } from './pages/admin/AdminMail';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminApiKeys } from './pages/admin/AdminApiKeys';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminAds } from './pages/admin/AdminAds';
import { AdminAppearance } from './pages/admin/AdminAppearance';
import { AdminDiscord } from './pages/admin/AdminDiscord';
import { AdminManagerBot } from './pages/admin/AdminManagerBot';
import { AdminLegal } from './pages/admin/AdminLegal';
import { PanelLinkSettings } from './pages/admin/PanelLinkSettings';
import { AdminHosting } from './pages/admin/AdminHosting';
import { AdminNodes } from './pages/admin/AdminNodes';
import { AdminServers } from './pages/admin/AdminServers';
import { AdminAccounts } from './pages/admin/AdminAccounts';
import { AdminImages } from './pages/admin/AdminImages';
import { AdminHostingPlans } from './pages/admin/AdminHostingPlans';
import { AdminStore } from './pages/admin/AdminStore';
import { AdminHostingSettings } from './pages/admin/AdminHostingSettings';
import { AdminStripe } from './pages/admin/AdminStripe';
import { AdminHostingTypes } from './pages/admin/AdminHostingTypes';

// Native VPS panel (customer + admin)
import { VpsList } from './pages/vps/VpsList';
import { VpsDeploy } from './pages/vps/VpsDeploy';
import { VpsServer } from './pages/vps/VpsServer';
import { AdminVpsOverview } from './pages/admin/AdminVpsOverview';
import { AdminVpsNodes } from './pages/admin/AdminVpsNodes';
import { AdminVpsServers } from './pages/admin/AdminVpsServers';
import { AdminVpsPlans } from './pages/admin/AdminVpsPlans';
import { AdminVpsOrders } from './pages/admin/AdminVpsOrders';
import { AdminVpsImages } from './pages/admin/AdminVpsImages';
import { AdminVpsSettings } from './pages/admin/AdminVpsSettings';
import { AdminVpsActivity } from './pages/admin/AdminVpsActivity';


/** Customer pages share one panel shell (tab strip, announcement bar, payment watcher). It stays mounted between pages. */
const CustomerShell: React.FC<{ enabled: boolean; currentPage: string; params?: Record<string, any>; onNavigate: (p: string, params?: any) => void; children: React.ReactNode }> = ({ enabled, currentPage, params, onNavigate, children }) =>
  enabled ? <PanelLayout currentPage={currentPage} params={params} onNavigate={onNavigate}>{children}</PanelLayout> : <>{children}</>;

/**
 * Where to send a signed-in user who lands on /login: only same-site paths. The value comes from the URL (?redirect=),
 * so "//evil.com" or "/\\evil.com" must not get through (history.replaceState would also throw on a cross-origin URL).
 */
function safeRedirectPath(value: unknown, fallback = '/servers'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  try {
    const u = new URL(value, window.location.origin);
    if (u.origin !== window.location.origin || u.pathname === '/login' || u.pathname === '/register') return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

/**
 * Which hosting type a page belongs to. A page whose type is switched off in Admin > Hosting Types renders the normal 404, so a host
 * that does not sell (say) VPS has no VPS page anywhere, even for someone typing the address by hand.
 */
function kindOfPage(page: string, params: any): HostingKind | null {
  if (page === 'bot' || page === 'servers') return 'bot';
  if (page === 'vps' || page === 'vps-list' || page === 'vps-deploy' || page === 'vps-server') return 'vps';
  if (page === 'website' || page === 'website-list') return 'website';
  if (page === 'nodejs' || page === 'nodejs-list') return 'nodejs';
  if (page === 'lavalink' || page === 'lavalink-list') return 'lavalink';
  if (page === 'server-create') return (params?.kind as ServerKind) || 'bot';
  return null;
}

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { brandName, maintenanceMode, maintenanceMessage, refreshBranding, enabledHostings, hostingsLoaded, hasHosting } = useBranding();

  const [checkingMaintenance, setCheckingMaintenance] = useState(false);

  // Parse initial route directly from current browser URL
  const initialRoute = parseUrlToRoute(window.location.pathname, window.location.search);
  const [currentPage, setCurrentPage] = useState<string>(initialRoute.page);
  const [pageParams, setPageParams] = useState<any>(initialRoute.params);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync state when browser navigation occurs (popstate)
  const syncRouteFromUrl = useCallback(() => {
    const route = parseUrlToRoute(window.location.pathname, window.location.search);
    setCurrentPage(route.page);
    setPageParams(route.params);
  }, []);

  useEffect(() => {
    window.addEventListener('popstate', syncRouteFromUrl);
    return () => window.removeEventListener('popstate', syncRouteFromUrl);
  }, [syncRouteFromUrl]);

  // Programmatic navigation updating browser history
  const handleNavigate = useCallback((page: string, params?: any, options?: { replace?: boolean }) => {
    if (page === 'dashboard') page = 'servers'; // the old dashboard is gone: the server overview is the home of the panel
    const targetUrl = routeToUrl(page, params);

    if (options?.replace) {
      window.history.replaceState({}, '', targetUrl);
    } else {
      window.history.pushState({}, '', targetUrl);
    }

    setCurrentPage(page);
    setPageParams(params || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Route & Auth guard checks without resetting requested route
  useEffect(() => {
    if (loading) return;

    const publicPages = ['home', 'bot', 'vps', 'website', 'nodejs', 'lavalink', 'pricing', 'status', 'docs', 'terms', 'privacy', 'acceptable-use', 'legal', 'login', 'register', 'not-found'];
    const isPublic = publicPages.includes(currentPage);
    const isAdmin = currentPage.startsWith('admin-');

    if (!user && !isPublic) {
      // Unauthenticated access to protected route -> redirect to login with original path encoded
      const fullPath = window.location.pathname + window.location.search;
      const targetUrl = routeToUrl('login', { redirect: fullPath });
      window.history.replaceState({}, '', targetUrl);
      setCurrentPage('login');
      setPageParams({ redirect: fullPath });
    } else if (user && (currentPage === 'login' || currentPage === 'register')) {
      // Authenticated user visits auth page -> return to requested path or dashboard
      const redirectUrl = safeRedirectPath(pageParams?.redirect);
      window.history.replaceState({}, '', redirectUrl);
      const restored = parseUrlToRoute(redirectUrl, '');
      setCurrentPage(restored.page);
      setPageParams(restored.params);
    } else if (user && isAdmin && user.role !== 'admin' && user.role !== 'super_admin') {
      // Non-admin user visiting admin route -> redirect to customer dashboard
      handleNavigate('dashboard', {}, { replace: true });
    }
  }, [user, loading, currentPage, pageParams, handleNavigate]);

  // /servers is the bot-hosting page. On a host that does not sell bot hosting, land on the first type it does sell.
  useEffect(() => {
    if (loading || !hostingsLoaded || !user) return;
    if (currentPage === 'servers' && !hasHosting('bot') && enabledHostings.length) {
      handleNavigate(kindInfo(enabledHostings[0])!.panelPage, pageParams, { replace: true });
    }
  }, [loading, hostingsLoaded, user, currentPage, pageParams, hasHosting, enabledHostings, handleNavigate]);

  // Fade out the boot loader from index.html once the session has been restored
  useEffect(() => {
    if (!loading && hostingsLoaded) {
      (window as any).__monoLoader?.hide();
    }
  }, [loading, hostingsLoaded]);

  // The MonoPanel boot loader (index.html) stays on screen while the session and the list of hosting types load
  if (loading || !hostingsLoaded) {
    return null;
  }

  const isPublicPage = ['home', 'bot', 'vps', 'website', 'nodejs', 'lavalink', 'pricing', 'status', 'docs', 'terms', 'privacy', 'acceptable-use', 'legal', 'login', 'register', 'not-found'].includes(currentPage);
  const isAdminPage = currentPage.startsWith('admin-');
  const isCustomerPage = !isPublicPage && !isAdminPage;

  if (maintenanceMode && user?.role !== 'admin' && user?.role !== 'super_admin') {
    if (isCustomerPage) {
      return (
        <div className="min-h-dvh bg-bg text-text-1 flex flex-col items-center justify-center p-6 relative font-sans select-none">
          <div className="max-w-md w-full bg-bg-2 border border-border p-8 rounded-[14px] text-center space-y-6 relative">
            <div className="h-14 w-14 mx-auto rounded-xl border border-border flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-text-1" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-text-1 uppercase font-mono">System maintenance</h1>
              <p className="mp-eyebrow">Platform upgrades in progress</p>
            </div>

            <p className="text-sm text-text-2 leading-relaxed bg-bg-3 p-4 rounded-xl border border-border max-h-[150px] overflow-y-auto">
              {maintenanceMessage || 'We are currently performing scheduled system upgrades. We will return online shortly.'}
            </p>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                onClick={async () => {
                  setCheckingMaintenance(true);
                  await refreshBranding();
                  setTimeout(() => setCheckingMaintenance(false), 800);
                }}
                disabled={checkingMaintenance}
                className="btn-primary w-full justify-center min-h-[44px] disabled:opacity-55"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${checkingMaintenance ? 'animate-spin' : ''}`} />
                <span>{checkingMaintenance ? 'Checking status...' : 'Check if completed'}</span>
              </button>

              <button onClick={() => logout()} className="btn-secondary w-full justify-center min-h-[44px]">
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out of account</span>
              </button>
            </div>
          </div>

          <div className="mt-8 mp-eyebrow">{brandName || 'Platform'}</div>
        </div>
      );
    }
  }

  const pageKind = kindOfPage(currentPage, pageParams);
  const blocked = !!pageKind && !hasHosting(pageKind);
  const page = blocked ? 'not-found' : currentPage;
  const pageContent = (
    <PageTransition routeKey={page}>
              <div className="flex-1 flex flex-col">
                {/* Public Views */}
                {page === 'home' && <Home onNavigate={handleNavigate} />}
                {page === 'bot' && <BotHosting onNavigate={handleNavigate} />}
                {(page === 'website' || page === 'nodejs' || page === 'lavalink') && <KindHosting kind={page} onNavigate={handleNavigate} />}
                {page === 'vps' && <VpsHosting onNavigate={handleNavigate} />}
                {page === 'pricing' && <Pricing onNavigate={handleNavigate} />}
                {page === 'status' && <Status />}
                {page === 'docs' && <Docs />}
                {page === 'terms' && <LegalPage initialSlug="terms" onNavigate={handleNavigate} />}
                {page === 'privacy' && <LegalPage initialSlug="privacy" onNavigate={handleNavigate} />}
                {page === 'acceptable-use' && <LegalPage initialSlug="acceptable-use" onNavigate={handleNavigate} />}
                {page === 'legal' && <LegalPage initialSlug={pageParams?.initialSlug || 'terms'} onNavigate={handleNavigate} />}
                {page === 'not-found' && <NotFound onNavigate={handleNavigate} />}

                {/* Auth Views */}
                {page === 'login' && <Login onNavigate={handleNavigate} />}
                {page === 'register' && <Register onNavigate={handleNavigate} />}

                {/* Customer Account Views */}
                {page === 'servers' && <ServersOverview onNavigate={handleNavigate} kind="bot" />}
                {page === 'website-list' && <ServersOverview onNavigate={handleNavigate} kind="website" />}
                {page === 'nodejs-list' && <ServersOverview onNavigate={handleNavigate} kind="nodejs" />}
                {page === 'lavalink-list' && <ServersOverview onNavigate={handleNavigate} kind="lavalink" />}
                {page === 'server-create' && <CreateServer key={pageParams?.kind || 'bot'} onNavigate={handleNavigate} kind={(pageParams?.kind as ServerKind) || 'bot'} />}
                {page === 'server' && <ServerDetail key={pageParams?.id} id={String(pageParams?.id || '')} onNavigate={handleNavigate} />}
                {page === 'vps-list' && <VpsList onNavigate={handleNavigate} />}
                {page === 'vps-deploy' && <VpsDeploy onNavigate={handleNavigate} />}
                {page === 'vps-server' && <VpsServer key={pageParams?.id} id={String(pageParams?.id || '')} onNavigate={handleNavigate} />}
                {page === 'upgrade' && <Upgrade onNavigate={handleNavigate} />}
                {page === 'store' && <Store onNavigate={handleNavigate} />}
                {page === 'earn' && <Earn onNavigate={handleNavigate} />}
                {page === 'addons' && <Addons onNavigate={handleNavigate} />}
                {page === 'billing' && <Billing onNavigate={handleNavigate} />}
                {page === 'checkout' && <Checkout onNavigate={handleNavigate} params={pageParams} />}
                {page === 'support' && <SupportTickets onNavigate={handleNavigate} />}
                {page === 'mail' && <Mail onNavigate={handleNavigate} />}
                {page === 'activity' && <ActivityLog />}
                {page === 'settings' && <UserSettings />}

                {/* Admin Views */}
                {page === 'admin-hosting-types' && <AdminHostingTypes />}
                {page === 'admin-dashboard' && <AdminDashboard onNavigate={handleNavigate} />}
                {page === 'admin-users' && <AdminUsers />}
                {page === 'admin-products' && <AdminProducts />}
                {page === 'admin-billing' && <AdminBilling />}
                {page === 'admin-coupons' && <AdminCoupons />}
                {page === 'admin-announcements' && <AdminAnnouncements />}
                {page === 'admin-support' && <AdminSupport />}
                {page === 'admin-mail' && <AdminMail />}
                {page === 'admin-audit-logs' && <AdminAuditLogs />}
                {page === 'admin-api-keys' && <AdminApiKeys onNavigate={handleNavigate} />}
                {page === 'admin-legal' && <AdminLegal />}
                {page === 'admin-settings' && <AdminSettings />}
                {page === 'admin-ads' && <AdminAds onNavigate={handleNavigate} />}
                {page === 'admin-hosting' && <AdminHosting onNavigate={handleNavigate} />}
                {page === 'admin-nodes' && <AdminNodes />}
                {page === 'admin-servers' && <AdminServers />}
                {page === 'admin-accounts' && <AdminAccounts />}
                {page === 'admin-images' && <AdminImages />}
                {page === 'admin-hosting-plans' && <AdminHostingPlans />}
                {page === 'admin-store' && <AdminStore />}
                {page === 'admin-hosting-settings' && <AdminHostingSettings />}
                {page === 'admin-stripe' && <AdminStripe />}
                {page === 'admin-addons' && <AdminAddons />}
                {page === 'admin-vps' && <AdminVpsOverview onNavigate={handleNavigate} />}
                {page === 'admin-vps-nodes' && <AdminVpsNodes />}
                {page === 'admin-vps-servers' && <AdminVpsServers />}
                {page === 'admin-vps-plans' && <AdminVpsPlans />}
                {page === 'admin-vps-orders' && <AdminVpsOrders />}
                {page === 'admin-vps-images' && <AdminVpsImages />}
                {page === 'admin-vps-settings' && <AdminVpsSettings />}
                {page === 'admin-vps-activity' && <AdminVpsActivity />}
                {page === 'admin-discord' && <AdminDiscord />}
                {page === 'admin-manager-bot' && <AdminManagerBot />}
                {page === 'admin-appearance' && <AdminAppearance />}
                {page === 'admin-panel-link' && <PanelLinkSettings />}
              </div>
            </PageTransition>
  );
  const adminShell = isAdminPage && !!user;
  return (
    <div className="mp-app selection:bg-text-1 selection:text-bg">
      <a href="#mp-content" className="skip-link">Skip to main content</a>
      <ScrollProgress />

      {/* Global Search Command Palette */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />

      {/* Same sidebar / bottom bar / drawer as MonoPanel Home, on every page */}
      <SiteSidebar currentPage={currentPage} onNavigate={handleNavigate} onOpenSearch={() => setIsSearchOpen(true)} />

      <main className="mp-main" id="mp-content">
        {/* Maintenance Mode Warning Banner for Public Pages */}
        {maintenanceMode && isPublicPage && (
          <div className="mb-4 rounded-xl border border-border bg-text-1 text-bg py-2.5 px-4 text-center text-xs font-bold font-mono tracking-wide flex items-center justify-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>PLATFORM UNDER MAINTENANCE: Billing and account write operations are temporarily frozen.</span>
          </div>
        )}

        <div className="flex-1 flex flex-col">
          {adminShell ? (
            <AdminShell currentPage={currentPage} onNavigate={handleNavigate}>{pageContent}</AdminShell>
          ) : (
            <CustomerShell enabled={isCustomerPage && !!user && !blocked} currentPage={currentPage} params={pageParams} onNavigate={handleNavigate}>
              {pageContent}
            </CustomerShell>
          )}
        </div>

        {/* Footer: Home-style hairline footer on app pages, the full footer on public pages */}
        {isPublicPage ? (
          <Footer onNavigate={handleNavigate} />
        ) : (
          <footer className="mp-footer">
            <span>© 2025–2026 {brandName || 'Platform'}</span>
            <span className="hidden sm:inline">{adminShell ? 'Admin control panel' : 'Account & billing portal'}</span>
          </footer>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <AuthProvider>
          <ToastProvider>
            <AnimationProvider>
              <AppContent />
            </AnimationProvider>
          </ToastProvider>
        </AuthProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}
