import React, { useState, useEffect } from 'react';
import {
  Bot, ShieldCheck, ArrowRight, ArrowDown, ArrowUpRight, Users, BookOpen,
  Headphones, Gauge, Lock, RotateCw, ChevronDown,
  Terminal, Database, UserPlus, CreditCard, Play, Cpu
} from 'lucide-react';
import { useBranding } from '../../lib/BrandingContext';
import { useAuth } from '../../lib/AuthContext';
import { apiRequest } from '../../lib/api';
import { Plan, Product } from '../../types';
import { HOSTING_KINDS, HostingKind } from '../../hostingKinds';
import { KindIcon } from '../../components/panel/KindIcon';

interface HomeProps {
  onNavigate: (page: string) => void;
}

const FALLBACK_BOT_FEATURES = [
  '24/7 process watchdog',
  'Environment variables & secrets manager',
  'Setup & configuration support included',
  'Low latency connection to bot gateways'
];

const FALLBACK_VPS_FEATURES = [
  'High-clock dedicated vCPU cores',
  'Full root access, any OS image',
  'Free MySQL/Postgres database & subdomain',
  'Routine backups & uptime monitoring'
];

const KIND_TICKER: Record<HostingKind, string[]> = {
  bot: ['DISCORD BOT HOSTING', '24/7 PROCESS WATCHDOG'],
  vps: ['FULL ROOT ACCESS VPS'],
  website: ['FULL-STACK WEBSITE HOSTING', 'CUSTOM DOMAINS & HTTPS'],
  nodejs: ['NODE.JS HOSTING', 'GIT DEPLOYS & BUILD TASKS'],
  lavalink: ['LAVALINK V4 NODES', 'PLUGINS & LIVE PLAYER STATS']
};
const FEATURES_FALLBACK: Record<HostingKind, string[]> = {
  bot: FALLBACK_BOT_FEATURES, vps: FALLBACK_VPS_FEATURES,
  website: ['Free subdomain & custom domains', 'Git deploys with build steps', 'Front end and back end together', 'Console, files and backups'],
  nodejs: ['Node 20, 22 and 24', 'npm / pnpm / yarn tasks', 'Git deploy & one-click update', 'Live console and file manager'],
  lavalink: ['Lavalink v4 ready in a minute', 'Plugin manager & generated config', 'Live players, memory and CPU', 'Copy-paste connection details']
};
const FALLBACK_PRICE: Record<HostingKind, number> = { bot: 0.5, vps: 3.5, website: 3, nodejs: 3, lavalink: 3 };

const FAQS: { q: string; a: string; kinds?: HostingKind[] }[] = [
  {
    q: 'How fast can my service go live?',
    a: 'Once your payment is verified by our team, your service is set up and delivered to your dashboard. Deployment is designed to be quick, so you can go live in minutes.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'What runtimes are supported?',
    a: 'Node.js (v18-v22), Python (3.9-3.12), Bun, and Go are supported, with automatic restart on crash and an environment variables & secrets manager.'
  },
  {
    q: 'Can you help me move over from another host?',
    a: 'Yes. Free migration assistance is available — open a support ticket from your dashboard and our team will help you get moved.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'The payment methods currently enabled are shown at checkout — by default that includes UPI, bank transfer, and gift card redemption.'
  },
  {
    kinds: ['vps'],
    q: "What's included with VPS Hosting?",
    a: 'VPS plans include high-clock dedicated vCPU cores, full root access with any OS image, a free MySQL/Postgres database & subdomain, and routine backups with uptime monitoring.'
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. You can deploy a free server straight from your dashboard. Free servers are kept alive by renewing them now and then, and paid plans remove that step and unlock more resources.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'How do I get my bot or app onto the server?',
    a: 'Open the File Manager to upload files or a whole folder from your device, pull a file from a URL, or clone a GitHub repository from the Startup tab. You can also connect with SFTP on plans that include it.'
  },
  {
    kinds: ['bot', 'nodejs', 'website', 'lavalink'],
    q: 'What if I delete a file by accident?',
    a: 'Deleted files go to the Recycle Bin first. You can restore them for 3 days before they are removed for good.'
  },
  {
    kinds: ['bot', 'nodejs', 'website', 'lavalink'],
    q: 'Can I give friends access to my server?',
    a: 'Yes. Paid plans let you add users to a server and choose exactly what each of them can do, such as viewing the console, editing files or restarting the server.'
  },
  {
    kinds: ['bot', 'nodejs', 'website'],
    q: 'Where do I set my main file and environment variables?',
    a: 'In the Startup tab of your server. Set the main file, extra Node packages, Git details and other variables there, then restart the server to apply them.'
  }
];

const TESTIMONIALS = [
  { name: 'Aarav M.', role: 'Discord bot developer', quote: 'I moved my bot over in one evening. The file manager and recycle bin saved me twice already, and it has not gone offline once.' },
  { name: 'Lena K.', role: 'Community manager', quote: 'Setup took minutes. The console and startup tab feel like a proper control panel, and support answered my ticket in under an hour.' },
  { name: 'Diego R.', role: 'Minecraft server owner', quote: 'Our Paper server runs smoothly with zero lag spikes, even during events. The activity log makes it easy to see who changed what.' },
  { name: 'Priya S.', role: 'Indie developer', quote: 'Cloning my private repo from the Startup tab and turning on auto update is a huge time saver. Deploys are now one restart.' },
  { name: 'Tomas B.', role: 'Telegram bot maker', quote: 'Great value for the price. Backups are one click and restoring a bad update took seconds instead of an afternoon.' },
  { name: 'Hana W.', role: 'Student & hobbyist', quote: 'Started on the free plan to learn, upgraded when my project grew. The upgrade was instant and nothing had to be re-deployed.' }
];

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { brandName, socialLinks, discordUrl, enabledHostings } = useBranding();
  const { user } = useAuth();
  const joinUrl = socialLinks?.discord || discordUrl;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const [res, prodRes] = await Promise.all([apiRequest('/public/plans'), apiRequest('/public/products')]);
        if (res.success && Array.isArray(res.data)) {
          setPlans(res.data);
        } else if (res.error) {
          console.error('Failed to load plans on home:', res.error.message);
        }
        if (prodRes.success && Array.isArray(prodRes.data)) setProducts(prodRes.data);
      } catch (err: any) {
        console.error('Failed to load plans on home:', err.message || err);
      }
    };

    loadPlans();
  }, []);

  // Cheapest plan per hosting type. Plans belong to a type through their product's category (older seeds: by id prefix).
  const kindOfPlan = (p: Plan): HostingKind | null => {
    const cat = products.find(x => x.id === p.productId)?.category;
    if (cat && (HOSTING_KINDS as { id: string }[]).some(k => k.id === cat)) return cat as HostingKind;
    if (p.productId === 'prod_vps' || p.id.startsWith('plan_vps_')) return 'vps';
    if (p.productId === 'prod_bot' || p.id.startsWith('plan_bot_')) return 'bot';
    return null;
  };
  const cheapest: Partial<Record<HostingKind, Plan>> = {};
  for (const p of plans) {
    const k = kindOfPlan(p);
    if (k && (!cheapest[k] || p.priceMonthly < cheapest[k]!.priceMonthly)) cheapest[k] = p;
  }
  const kindPrice = (k: HostingKind) => cheapest[k]?.priceMonthly ?? FALLBACK_PRICE[k];
  const kindFeatures = (k: HostingKind) => (cheapest[k]?.features?.length ? cheapest[k]!.features : FEATURES_FALLBACK[k]).slice(0, 4);

  const shownKinds = HOSTING_KINDS.filter(k => enabledHostings.includes(k.id));
  const faqs = FAQS.filter(f => !f.kinds || f.kinds.some(k => enabledHostings.includes(k)));
  const kindWords = shownKinds.map(k => k.short);
  const orList = kindWords.length <= 1 ? (kindWords[0] || 'hosting') : kindWords.slice(0, -1).join(', ') + ' or ' + kindWords[kindWords.length - 1];

  const hasVps = enabledHostings.includes('vps');
  const hasRuntimes = enabledHostings.some(k => k === 'bot' || k === 'nodejs' || k === 'website');
  const runtimeBlurb = [
    hasRuntimes ? `${shownKinds.filter(k => k.id !== 'vps' && k.id !== 'lavalink').map(k => k.label).join(', ')} support the runtimes below` : '',
    hasVps ? `a VPS gives you full root access with any OS image` : ''
  ].filter(Boolean).join(', and ') + '.';

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length));

  const infra = [
    { icon: RotateCw, label: 'Auto-restart on crash', text: 'A process watchdog brings your service back after a crash.' },
    { icon: ShieldCheck, label: 'Uptime monitoring', text: 'Live status for every node, with incidents on the status page.' },
    { icon: Database, label: 'Routine backups', text: 'One-click backups and restores from the panel.' },
    ...(hasVps ? [{ icon: Lock, label: 'Full root access', text: 'SSH into your VPS and run anything you like.' }] : []),
    ...(hasRuntimes ? [{ icon: Terminal, label: 'Multi-runtime apps', text: 'Node.js, Python, Bun and Go with a live console.' }] : []),
    { icon: Headphones, label: 'Real human support', text: 'Tickets are answered by people, not bots.' },
  ];

  return (
    <div className="hub-content !max-w-none !p-0" style={{ padding: 0, maxWidth: 'none' }}>
      {/* ================= HERO ================= */}
      <div className="hero-viewport" id="start" style={{ minHeight: 'calc(100svh - 80px)' }}>
        <div className="hero-bg" aria-hidden="true">
          <img src="/assets/logo.svg" alt="" width={320} height={239} loading="eager" />
        </div>
        <div className="hero-layout">
          <section className="hub-hero">
            <div>
              <p className="hub-overline">
                {shownKinds.map(k => k.short).join(' · ') || 'Hosting'}
                <span className="stable-badge">99.99% uptime</span>
              </p>
              <h1>Hosting that stays<br />online, {brandName}.</h1>
              <p className="hub-lede">
                Reliable {orList} hosting on high-clock hardware and enterprise NVMe storage, with real human support, free migration help and a panel that gets out of your way.
              </p>
              <div className="hub-actions">
                {user ? (
                  <button type="button" className="btn-primary" onClick={() => onNavigate('servers')}>My servers <ArrowRight width={16} height={16} aria-hidden="true" /></button>
                ) : (
                  <button type="button" className="btn-primary" onClick={() => onNavigate('register')}>Create free account <ArrowRight width={16} height={16} aria-hidden="true" /></button>
                )}
                <button type="button" className="btn-secondary" onClick={() => onNavigate('pricing')}>Browse plans <CreditCard width={14} height={14} aria-hidden="true" /></button>
                <button type="button" className="btn-secondary" onClick={() => scrollTo('products')}>Products <ArrowDown width={14} height={14} aria-hidden="true" /></button>
                {joinUrl && (
                  <a href={joinUrl} className="btn-secondary" target="_blank" rel="noopener noreferrer">Discord <ArrowUpRight width={14} height={14} aria-hidden="true" /></a>
                )}
              </div>
            </div>
          </section>

          <div className="hero-terminal" aria-label="What we host">
            <div className="hero-terminal-bar"><span></span><span></span><span></span><em>services</em></div>
<pre><code>{`${brandName.toLowerCase()} ──▶ services
`}{shownKinds.map((k, i) => `${i === shownKinds.length - 1 ? ' └─' : ' ├─'} ${pad(k.short, 9)} from $${kindPrice(k.id).toFixed(2)}/mo\n`).join('')}{`
 uptime    99.99% SLA
 support   real humans, 24/7
 backups   one click`}</code></pre>
          </div>
        </div>
      </div>

      {/* ================= PRODUCTS ================= */}
      <section className="hub-section" id="products">
        <div>
          <div className="hub-section-heading">
            <h2>Our products</h2>
            <p>{shownKinds.length === 1 ? 'One product, done properly' : `${shownKinds.length} products, done properly`} — no confusing tiers, no filler hosting types.</p>
          </div>
        </div>
        <div className="project-cards">
          {shownKinds.map((k, i) => (
            <div key={k.id} className="h-full">
              <button type="button" className="project-card h-full w-full" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => onNavigate(k.publicPage)}>
                <div className="project-card-header">
                  <div className="project-mark" style={{ color: 'var(--color-bg)' }}><KindIcon kind={k.id} className="h-5 w-5" /></div>
                  <span className="project-link-badge">Learn more <ArrowUpRight width={12} height={12} aria-hidden="true" /></span>
                </div>
                <h3>{k.label}</h3>
                <p>{k.tagline}. From <strong>${kindPrice(k.id).toFixed(2)}</strong>/month.</p>
                <div className="project-tags">
                  {kindFeatures(k.id).map(f => <span key={f} className="tag">{f}</span>)}
                </div>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="hub-section" id="how">
        <div>
          <div className="hub-section-heading">
            <h2>Live in three steps</h2>
            <p>From sign-up to a running service, without the back-and-forth.</p>
          </div>
        </div>
        <div className="about-grid">
          {[
            { icon: UserPlus, title: 'Create a free account', text: 'Sign up in a minute and open your dashboard. No card needed to look around.' },
            { icon: CreditCard, title: 'Pick a plan and pay', text: `Choose ${orList} hosting and pay with the methods shown at checkout, like UPI, bank transfer or gift card.` },
            { icon: Play, title: 'Deploy from your dashboard', text: 'Once payment is verified, your credentials land in the dashboard and you can go live.' }
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="about-card" style={{ cursor: 'default' }}>
              <div className="about-card-icon"><Icon width={20} height={20} aria-hidden="true" /></div>
              <h3>{i + 1}. {title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= INFRASTRUCTURE ================= */}
      <section className="hub-section" id="infrastructure">
        <div>
          <div className="hub-section-heading">
            <h2>Built for uptime</h2>
            <p>{brandName} keeps your services running with process watchdogs, routine backups, uptime monitoring and a team that answers tickets.</p>
          </div>
        </div>
        <div className="mp-feature-grid">
          {infra.map(({ icon: Icon, label, text }) => (
            <div key={label} className="feature-grid-item" style={{ cursor: 'default' }}>
              <div className="feature-grid-item-header"><Icon width={18} height={18} aria-hidden="true" /></div>
              <h4>{label}</h4>
              <p>{text}</p>
            </div>
          ))}
        </div>

        <div className="mp-feature-grid" style={{ marginTop: 12 }}>
          {[
            { icon: Gauge, value: '99.99%', label: 'Uptime SLA' },
            { icon: Headphones, value: '24/7', label: 'Process watchdog' },
            { icon: Bot, value: String(shownKinds.length), label: shownKinds.length === 1 ? 'Focused product' : 'Focused products' },
            { icon: Users, value: 'Human', label: 'Support, not bots' }
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="feature-grid-item" style={{ cursor: 'default' }}>
              <div className="feature-grid-item-header"><Icon width={18} height={18} aria-hidden="true" /></div>
              <h4 style={{ fontSize: 28, letterSpacing: '-0.04em' }}>{value}</h4>
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= RUNTIMES ================= */}
      {hasRuntimes && (
        <section className="hub-section" id="runtimes">
          <div>
            <div className="hub-section-heading">
              <h2>Run what you already build</h2>
              <p>Bring your project as it is. {runtimeBlurb}</p>
            </div>
          </div>
          <div className="project-cards">
            {[
              { name: 'Node.js', note: 'v18 – v22' },
              { name: 'Python', note: '3.9 – 3.12' },
              { name: 'Bun', note: 'Fast JS runtime' },
              { name: 'Go', note: 'Compiled binaries' }
            ].map(r => (
              <div key={r.name} className="project-card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <div className="project-mark" style={{ color: 'var(--color-bg)' }}><Cpu className="h-5 w-5" aria-hidden="true" /></div>
                <div>
                  <h3 style={{ margin: 0 }}>{r.name}</h3>
                  <p style={{ margin: 0 }}>{r.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ================= TESTIMONIALS ================= */}
      <section className="hub-section" id="testimonials">
        <div>
          <div className="hub-section-heading">
            <h2>Loved by people who ship</h2>
            <p>5.0 average from our community.</p>
          </div>
        </div>
        <div className="project-cards">
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="h-full">
              <figure className="project-card h-full" style={{ margin: 0 }}>
                <blockquote style={{ margin: 0, color: 'var(--color-text-2)', fontSize: 14, lineHeight: 1.65, flex: 1 }}>“{t.quote}”</blockquote>
                <figcaption className="project-card-header" style={{ marginTop: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="project-mark" style={{ color: 'var(--color-bg)', fontWeight: 700 }} aria-hidden="true">{t.name[0]}</span>
                    <span><span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{t.name}</span><span style={{ display: 'block', fontSize: 12, color: 'var(--color-text-3)' }}>{t.role}</span></span>
                  </span>
                </figcaption>
              </figure>
            </div>
          ))}
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="hub-section" id="faq">
        <div>
          <div className="hub-section-heading">
            <h2>Frequently asked questions</h2>
            <p>Can't find your answer? Open a support ticket from your dashboard.</p>
          </div>
        </div>
        <div className="addon-list" style={{ maxWidth: 820 }}>
          {faqs.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} style={{ borderTop: i ? '1px solid var(--color-border)' : 0 }}>
                <button type="button" onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-text-1 hover:bg-bg-hover transition-colors">
                  <span>{item.q}</span>
                  <ChevronDown className={`h-4 w-4 text-text-3 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isOpen && <p className="px-5 pb-5 -mt-1 text-sm text-text-2 leading-relaxed">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="hub-section hub-section--install" style={{ paddingBottom: 24 }}>
        <div className="install-layout" style={{ display: 'block' }}>
          <div className="hub-section-heading">
            <h2>Ready to launch?</h2>
            <p>Create a free account and deploy your first service in minutes. Free migration assistance available.</p>
          </div>
          <div className="hub-actions" style={{ marginTop: 0 }}>
            <button type="button" className="btn-primary" onClick={() => onNavigate(user ? 'servers' : 'register')}>{user ? 'Open my servers' : 'Create free account'} <ArrowRight width={16} height={16} aria-hidden="true" /></button>
            <button type="button" className="btn-secondary" onClick={() => onNavigate('pricing')}>Browse all plans</button>
            <button type="button" className="btn-secondary" onClick={() => onNavigate('docs')}>Read the docs <BookOpen width={14} height={14} aria-hidden="true" /></button>
            {joinUrl && <a href={joinUrl} className="btn-secondary" target="_blank" rel="noopener noreferrer">Join our Discord <ArrowUpRight width={14} height={14} aria-hidden="true" /></a>}
          </div>
        </div>
      </section>
    </div>
  );
};
