import React from 'react';
import { Github, Twitter, Mail, ArrowUpRight } from 'lucide-react';
import { DiscordGlyph } from './DiscordGlyph';
import { useBranding } from '../lib/BrandingContext';
import { HOSTING_KINDS } from '../hostingKinds';

interface FooterProps {
  onNavigate: (page: string) => void;
}

/** Public footer in MonoPanel Home's style: black, hairline borders, mono captions, inverted hover on every link. */
export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { socialLinks, discordUrl, footerDescription, brandName, supportEmail, enabledHostings } = useBranding();
  const joinUrl = socialLinks.discord || discordUrl;
  const name = brandName || 'MonoPanel';

  const linkCls = 'inline-flex items-center gap-1.5 -mx-2 px-2 py-1 rounded-lg text-[14px] text-text-2 hover:bg-text-1 hover:text-bg transition-colors text-left';
  const headCls = 'mp-eyebrow mb-3';
  const socialCls = 'h-9 w-9 rounded-lg border border-border text-text-2 flex items-center justify-center hover:bg-text-1 hover:text-bg transition-colors';

  return (
    <footer className="mt-16 border-t border-border" aria-label="Site footer">
      {/* Community band */}
      {joinUrl && (
        <div className="py-8 flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-border">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-xl border border-border flex items-center justify-center text-text-1"><DiscordGlyph className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-text-1 leading-tight tracking-tight">Join the {name} community</h3>
              <p className="text-sm text-text-2 mt-1">Get 24/7 support, updates, billing help and setup guides.</p>
            </div>
          </div>
          <a id="footer_join_discord" href={joinUrl} target="_blank" rel="noreferrer noopener" className="btn-primary shrink-0 self-start md:self-auto">
            <DiscordGlyph className="h-4 w-4" />Join Discord
          </a>
        </div>
      )}

      <div className="py-10 grid grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] gap-x-6 gap-y-10 lg:gap-x-12">
        <div className="col-span-2 lg:col-span-1 space-y-5 max-w-sm">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold text-text-1">
            <img src="/assets/icon.png" alt="" width={24} height={24} className="h-6 w-6 rounded-md" />{name}
          </div>
          <p className="text-sm text-text-2 leading-relaxed">{footerDescription}</p>
          <div className="flex items-center gap-2">
            {socialLinks.discord && <a id="footer_social_discord" href={socialLinks.discord} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="Discord"><DiscordGlyph className="h-4 w-4" /></a>}
            {socialLinks.twitter && <a id="footer_social_twitter" href={socialLinks.twitter} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="Twitter"><Twitter className="h-4 w-4" /></a>}
            {socialLinks.github && <a id="footer_social_github" href={socialLinks.github} target="_blank" rel="noreferrer noopener" className={socialCls} aria-label="GitHub"><Github className="h-4 w-4" /></a>}
          </div>
        </div>

        <div>
          <h4 className={headCls}>Hosting</h4>
          <ul className="space-y-1">
            {HOSTING_KINDS.filter(k => enabledHostings.includes(k.id)).map(k => (
              <li key={k.id}><button type="button" onClick={() => onNavigate(k.publicPage)} className={linkCls}>{k.id === 'bot' ? 'Discord Bot Hosting' : k.label}</button></li>
            ))}
            <li><button type="button" onClick={() => onNavigate('pricing')} className={linkCls}>Plans &amp; pricing</button></li>
          </ul>
        </div>

        <div>
          <h4 className={headCls}>Quick links</h4>
          <ul className="space-y-1">
            <li><button type="button" onClick={() => onNavigate('servers')} className={linkCls}>Client area</button></li>
            <li><button type="button" onClick={() => onNavigate('billing')} className={linkCls}>Billing</button></li>
            <li><button type="button" onClick={() => onNavigate('docs')} className={linkCls}>Documentation</button></li>
            <li><button type="button" onClick={() => onNavigate('status')} className={linkCls}>Network status</button></li>
          </ul>
        </div>

        <div className="col-span-2 lg:col-span-1">
          <h4 className={headCls}>Contact</h4>
          <ul className="space-y-1">
            {supportEmail && <li><a href={`mailto:${supportEmail}`} className={`${linkCls} break-all`}><Mail className="h-4 w-4 shrink-0" />{supportEmail}</a></li>}
            <li><button type="button" onClick={() => onNavigate('support')} className={linkCls}>Support tickets</button></li>
            {joinUrl && <li><a href={joinUrl} target="_blank" rel="noreferrer noopener" className={linkCls}>Discord support <ArrowUpRight className="h-4 w-4" /></a></li>}
          </ul>
        </div>
      </div>

      <div className="mp-footer !mt-0 py-5">
        <span>© 2025–2026 {name}. All rights reserved.</span>
        <span className="flex flex-wrap gap-x-5 gap-y-1">
          <button type="button" onClick={() => onNavigate('privacy')} className="hover:text-text-1 transition-colors">Privacy policy</button>
          <button type="button" onClick={() => onNavigate('terms')} className="hover:text-text-1 transition-colors">Terms of service</button>
          <button type="button" onClick={() => onNavigate('acceptable-use')} className="hover:text-text-1 transition-colors">Acceptable use</button>
        </span>
      </div>
    </footer>
  );
};
