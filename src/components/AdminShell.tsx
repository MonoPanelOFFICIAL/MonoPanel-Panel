import React, { useEffect } from 'react';
import { Shapes } from 'lucide-react';
import { useBranding } from '../lib/BrandingContext';
import { ADMIN_GROUPS } from './navModel';

/**
 * Content frame of the admin area: breadcrumb, the "choose what you sell" notice and the page itself.
 * The admin menu is the global sidebar (SiteSidebar, admin mode), exactly like the rest of the site.
 */
export const AdminShell: React.FC<{ currentPage: string; onNavigate: (page: string) => void; onOpenSearch?: () => void; children: React.ReactNode }> = ({ currentPage, onNavigate, children }) => {
  const { brandName, hostingsConfigured, hostingsLoaded } = useBranding();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [currentPage]);
  const current = ADMIN_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.title }))).find(i => i.page === currentPage);

  return (
    <div className="flex-1 flex flex-col w-full min-w-0" id="admin-main">
      <div className="mp-eyebrow mb-5 flex flex-wrap items-center gap-x-2 gap-y-1" aria-label="Breadcrumb">
        <span>{brandName || 'Platform'} admin</span>
        {current && <><span className="text-text-4">/</span><span>{current.group}</span><span className="text-text-4">/</span><span className="text-text-1">{current.label}</span></>}
      </div>

      {hostingsLoaded && !hostingsConfigured && currentPage !== 'admin-hosting-types' && (
        <button type="button" onClick={() => onNavigate('admin-hosting-types')} className="mb-5 w-full text-left rounded-xl border border-border bg-bg-2 hover:bg-text-1 hover:text-bg px-4 py-3 flex items-center gap-3 transition-colors group">
          <Shapes className="h-4 w-4 shrink-0" />
          <span className="text-xs text-text-2 group-hover:text-bg"><b className="text-text-1 group-hover:text-bg">Choose what you sell.</b> Pick your hosting types so the website only shows what you provide. <span className="underline">Open Hosting Types</span></span>
        </button>
      )}

      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
};
