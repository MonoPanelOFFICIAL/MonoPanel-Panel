import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { Product } from '../../src/types';
import { enabledKinds, productVisible } from '../hosting/kinds';
import { HOSTING_KINDS } from '../../src/hostingKinds';

const router = Router();

// Strips admin-only panel internals (nest/egg IDs, docker image, startup
// command, environment, numeric location IDs) before a product ever reaches
// the public API — customers only ever see a friendly id + label to pick
// from at checkout (see Checkout.tsx's Deployment section).
function toPublicProduct(product: Product) {
  const { panelEggOptions, panelLocationOptions, ...rest } = product;
  return {
    ...rest,
    eggOptions: (panelEggOptions || []).map(o => ({ id: o.id, label: o.label })),
    locationOptions: (panelLocationOptions || []).map(o => ({ id: o.id, label: o.label, tier: o.tier }))
  };
}

// GET /api/v1/public/products
router.get('/products', async (req: Request, res: Response) => {
  const db = await getDb();
  const data = db.products
    .filter(p => p.isActive && productVisible(db, p.category))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toPublicProduct);
  res.json({ success: true, data });
});

// GET /api/v1/public/plans
router.get('/plans', async (req: Request, res: Response) => {
  const db = await getDb();
  // A plan is only public when its category still exists AND is active. Without
  // this, plans left behind by a deleted / hidden category kept showing up.
  const liveProductIds = new Set(db.products.filter(prod => prod.isActive && productVisible(db, prod.category)).map(prod => prod.id));
  let plans = db.plans.filter(p => p.isActive && liveProductIds.has(p.productId));
  const category = req.query.category as string;
  if (category) {
    plans = plans.filter(p => {
      const prod = db.products.find(prod => prod.id === p.productId);
      const planCat = prod?.category || (p.id.includes('bot') ? 'bot' : 'vps');
      return planCat.toLowerCase() === category.toLowerCase();
    });
  }
  res.json({ success: true, data: plans });
});

// GET /api/v1/public/announcements
router.get('/announcements', async (req: Request, res: Response) => {
  const db = await getDb();
  res.json({ success: true, data: db.announcements.filter(a => a.isPublished) });
});

// GET /api/v1/public/settings
router.get('/settings', async (req: Request, res: Response) => {
  const db = await getDb();
  const {
    brandName, brandTagline, supportEmail, discordUrl, currencySymbol, currencyCode,
    registrationEnabled, maintenanceMode, maintenanceMessage, defaultTheme, accentColor,
    pageAnimationsEnabled, socialLinks, heroDescription, footerDescription, quickLinks
  } = db.settings;

  const enabled = enabledKinds(db);
  const names = enabled.map(k => HOSTING_KINDS.find(x => x.id === k)!.label);
  const list = names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
  const DEFAULT_HERO = `Launch ${list} in minutes. Reliable infrastructure, transparent pricing, and real support when you need it.`;
  // The stock tagline names the original two products; once the host changes what it sells it must follow, a customised one is left alone.
  const LEGACY_TAGLINE = 'Bot Hosting & VPS Hosting on Reliable Infrastructure';
  const DEFAULT_FOOTER = `${list} plans built on the same reliable, high-performance network.`;

  res.json({
    success: true,
    data: {
      brandName,
      brandTagline: brandTagline === LEGACY_TAGLINE ? `${list} on Reliable Infrastructure` : brandTagline,
      supportEmail,
      discordUrl,
      socialLinks: socialLinks || { discord: discordUrl || '', twitter: '', github: '' },
      currencySymbol,
      currencyCode,
      registrationEnabled,
      maintenanceMode,
      maintenanceMessage,
      defaultTheme,
      accentColor,
      pageAnimationsEnabled: pageAnimationsEnabled !== false,
      heroDescription: (typeof heroDescription === 'string' && heroDescription.trim().length > 0) ? heroDescription : DEFAULT_HERO,
      footerDescription: (typeof footerDescription === 'string' && footerDescription.trim().length > 0) ? footerDescription : DEFAULT_FOOTER,
      quickLinks: (Array.isArray(quickLinks) ? quickLinks : []).filter((l: any) => l && l.url),
      // What this host sells. The website, menus and pages show nothing outside this list.
      enabledHostings: enabled,
      hostingsConfigured: !!db.settings.hostingsConfigured,
      websiteBaseDomain: db.settings.websiteBaseDomain || ''
    }
  });
});

// GET /api/v1/public/settings/social-links and /api/v1/public/social-links
const getPublicSocialLinks = async (req: Request, res: Response) => {
  const db = await getDb();
  const socialLinks = db.settings.socialLinks || { discord: db.settings.discordUrl || '', twitter: '', github: '' };
  res.json({ success: true, data: socialLinks });
};

router.get('/settings/social-links', getPublicSocialLinks);
router.get('/social-links', getPublicSocialLinks);

// GET /api/v1/public/theme-settings
router.get('/theme-settings', async (req: Request, res: Response) => {
  const db = await getDb();
  const defaults = {
    activeThemeId: 'golden',
    activeFontId: 'Quicksand',
    cardStyle: 'rounded-2xl',
    glowIntensity: 'vibrant',
    allowUserCustomization: true,
    backgroundBlur: 'none',
    backgroundOverlayOpacity: 75,
    assets: { logoUrl: '', faviconUrl: '', bgPatternUrl: '', bannerUrl: '', loginBgUrl: '' }
  };
  const themeSettings = {
    ...defaults,
    ...(db.settings.themeSettings || {}),
    assets: { ...defaults.assets, ...(db.settings.themeSettings?.assets || {}) }
  };
  res.json({ success: true, data: themeSettings });
});

// GET /api/v1/public/legal
router.get('/legal', async (req: Request, res: Response) => {
  const db = await getDb();
  const pages = (db.legalPages || []).filter(p => p.isPublished).map(p => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    summary: p.summary,
    version: p.version,
    lastUpdatedAt: p.lastUpdatedAt
  }));
  res.json({ success: true, data: pages });
});

// GET /api/v1/public/legal/:slug
router.get('/legal/:slug', async (req: Request, res: Response) => {
  const db = await getDb();
  const page = (db.legalPages || []).find(p => p.slug === req.params.slug && p.isPublished);
  if (!page) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Legal document not found or unpublished.' } });
  }
  res.json({ success: true, data: page });
});

export default router;
