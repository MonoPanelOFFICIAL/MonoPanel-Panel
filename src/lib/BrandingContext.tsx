import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from './api';
import { SocialLinks, QuickLink } from '../types';
import { HostingKind, DEFAULT_ENABLED_HOSTINGS, HOSTING_KINDS, normalizeHostings } from '../hostingKinds';

interface BrandingContextType {
  brandName: string;
  brandTagline: string;
  supportEmail: string;
  discordUrl: string;
  socialLinks: SocialLinks;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  pageAnimationsEnabled: boolean;
  heroDescription: string;
  footerDescription: string;
  quickLinks: QuickLink[];
  /** Hosting types this host sells (Admin > Hosting Types). Everything else is hidden from the whole site. */
  enabledHostings: HostingKind[];
  /** False until the first answer from the server arrives (or it failed and the defaults are used). */
  hostingsLoaded: boolean;
  /** True once an admin has saved the hosting-type selection (before that, the .env / default selection applies). */
  hostingsConfigured: boolean;
  hasHosting: (kind: HostingKind) => boolean;
  websiteBaseDomain: string;
  refreshBranding: () => Promise<void>;
  updateBrandNameLocally: (newName: string) => void;
  setPageAnimationsEnabledLocally: (enabled: boolean) => void;
  setSocialLinksLocally: (links: SocialLinks) => void;
  setHomepageDescriptionsLocally: (hero: string, footer: string) => void;
}

const DEFAULT_HERO_DESCRIPTION = 'Reliable hosting backed by real support. Powered by high-clock compute hardware and enterprise NVMe storage.';
const DEFAULT_FOOTER_DESCRIPTION = 'Reliable hosting plans built on the same high-performance network, from budget-friendly value hardware.';

const HOSTINGS_CACHE = 'monopanel_hostings';
const readCachedHostings = (): HostingKind[] | null => {
  try { const v = JSON.parse(localStorage.getItem(HOSTINGS_CACHE) || 'null'); const l = normalizeHostings(v); return l.length ? l : null; } catch { return null; }
};
/** "Bot Hosting, VPS Hosting & Node.js Hosting" */
export const hostingsTitle = (kinds: HostingKind[]): string => {
  const names = kinds.map(k => HOSTING_KINDS.find(x => x.id === k)?.label || k);
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brandName, setBrandName] = useState<string>(() => {
    return localStorage.getItem('monopanel_brand_name') || 'MonoPanel';
  });
  const [brandTagline, setBrandTagline] = useState<string>('');
  // Cached from the last visit so a bot-only host never flashes VPS links while the first request is in flight.
  const [cachedHostings] = useState<HostingKind[] | null>(readCachedHostings);
  const [enabledHostings, setEnabledHostings] = useState<HostingKind[]>(cachedHostings || DEFAULT_ENABLED_HOSTINGS);
  const [hostingsLoaded, setHostingsLoaded] = useState<boolean>(!!cachedHostings);
  const [hostingsConfigured, setHostingsConfigured] = useState<boolean>(true);
  const [websiteBaseDomain, setWebsiteBaseDomain] = useState<string>('');
  const [supportEmail, setSupportEmail] = useState<string>('support@monopanel.com');
  const [discordUrl, setDiscordUrl] = useState<string>('https://discord.gg/monopanel');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(() => {
    const saved = localStorage.getItem('monopanel_social_links');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      discord: 'https://discord.gg/monopanel',
      twitter: 'https://twitter.com/monopanel',
      github: 'https://github.com/monopanel'
    };
  });
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>('MonoPanel is currently performing scheduled system upgrades.');
  const [pageAnimationsEnabled, setPageAnimationsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('monopanel_page_animations_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [heroDescription, setHeroDescription] = useState<string>(DEFAULT_HERO_DESCRIPTION);
  const [footerDescription, setFooterDescription] = useState<string>(DEFAULT_FOOTER_DESCRIPTION);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);

  const fetchBranding = useCallback(async () => {
    try {
      const res = await apiRequest('/public/settings');
      if (res.success && res.data) {
        if (res.data.brandName) {
          setBrandName(res.data.brandName);
          localStorage.setItem('monopanel_brand_name', res.data.brandName);
        }
        if (res.data.brandTagline) setBrandTagline(res.data.brandTagline);
        if (Array.isArray(res.data.enabledHostings)) {
          const list = normalizeHostings(res.data.enabledHostings);
          if (list.length) { setEnabledHostings(list); try { localStorage.setItem(HOSTINGS_CACHE, JSON.stringify(list)); } catch { /* private mode */ } }
        }
        if (typeof res.data.hostingsConfigured === 'boolean') setHostingsConfigured(res.data.hostingsConfigured);
        if (typeof res.data.websiteBaseDomain === 'string') setWebsiteBaseDomain(res.data.websiteBaseDomain);
        if (res.data.supportEmail) setSupportEmail(res.data.supportEmail);
        if (res.data.discordUrl) setDiscordUrl(res.data.discordUrl);
        if (res.data.socialLinks) {
          setSocialLinks(res.data.socialLinks);
          localStorage.setItem('monopanel_social_links', JSON.stringify(res.data.socialLinks));
          if (res.data.socialLinks.discord) {
            setDiscordUrl(res.data.socialLinks.discord);
          }
        }
        if (res.data.maintenanceMode !== undefined) setMaintenanceMode(res.data.maintenanceMode);
        if (res.data.maintenanceMessage) setMaintenanceMessage(res.data.maintenanceMessage);
        if (res.data.pageAnimationsEnabled !== undefined) {
          setPageAnimationsEnabled(res.data.pageAnimationsEnabled);
          localStorage.setItem('monopanel_page_animations_enabled', String(res.data.pageAnimationsEnabled));
        }
        if (typeof res.data.heroDescription === 'string' && res.data.heroDescription.trim().length > 0) {
          setHeroDescription(res.data.heroDescription);
        } else {
          setHeroDescription(DEFAULT_HERO_DESCRIPTION);
        }
        if (typeof res.data.footerDescription === 'string' && res.data.footerDescription.trim().length > 0) {
          setFooterDescription(res.data.footerDescription);
        } else {
          setFooterDescription(DEFAULT_FOOTER_DESCRIPTION);
        }
        if (Array.isArray(res.data.quickLinks)) {
          setQuickLinks(res.data.quickLinks);
        }
      }
    } catch (err) {
      console.error('[BrandingContext] Failed to load branding settings:', err);
    } finally {
      setHostingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Keep the site in step with the owner's Hosting Types choice without a reload: re-read the settings when the tab comes
  // back into view, when another tab of this site changes them, and every minute while it stays open.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void fetchBranding(); };
    const onStorage = (e: StorageEvent) => { if (e.key === HOSTINGS_CACHE) void fetchBranding(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('storage', onStorage);
    const t = window.setInterval(refresh, 60_000);
    return () => { document.removeEventListener('visibilitychange', refresh); window.removeEventListener('storage', onStorage); window.clearInterval(t); };
  }, [fetchBranding]);

  // Update document.title dynamically when brandName updates
  useEffect(() => {
    if (brandName) {
      document.title = `${brandName} — ${hostingsTitle(enabledHostings)}`;
    }
  }, [brandName, enabledHostings]);

  const updateBrandNameLocally = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed) {
      setBrandName(trimmed);
      localStorage.setItem('monopanel_brand_name', trimmed);
      document.title = `${trimmed} — ${hostingsTitle(enabledHostings)}`;
    }
  };

  const setPageAnimationsEnabledLocally = (enabled: boolean) => {
    setPageAnimationsEnabled(enabled);
    localStorage.setItem('monopanel_page_animations_enabled', String(enabled));
  };

  const setSocialLinksLocally = (links: SocialLinks) => {
    setSocialLinks(links);
    localStorage.setItem('monopanel_social_links', JSON.stringify(links));
    if (links.discord) {
      setDiscordUrl(links.discord);
    }
  };

  const setHomepageDescriptionsLocally = (hero: string, footer: string) => {
    if (hero) setHeroDescription(hero);
    if (footer) setFooterDescription(footer);
  };

  return (
    <BrandingContext.Provider
      value={{
        brandName,
        brandTagline,
        supportEmail,
        discordUrl,
        socialLinks,
        maintenanceMode,
        maintenanceMessage,
        pageAnimationsEnabled,
        heroDescription,
        footerDescription,
        quickLinks,
        enabledHostings,
        hostingsLoaded,
        hostingsConfigured,
        hasHosting: (kind: HostingKind) => enabledHostings.includes(kind),
        websiteBaseDomain,
        refreshBranding: fetchBranding,
        updateBrandNameLocally,
        setPageAnimationsEnabledLocally,
        setSocialLinksLocally,
        setHomepageDescriptionsLocally
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
