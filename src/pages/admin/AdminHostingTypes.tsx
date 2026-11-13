import React, { useEffect, useMemo, useState } from 'react';
import { Shapes, Save, Info, TriangleAlert, Globe } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { useBranding } from '../../lib/BrandingContext';
import { Btn, Card, Field, PageHeader, Spinner, TextInput, cx, useToast } from '../../components/ui/kit';
import { KindIcon } from '../../components/panel/KindIcon';
import { HostingKind } from '../../hostingKinds';

interface KindRow {
  id: HostingKind; label: string; tagline: string; description: string; highlights: string[]; engine: 'server' | 'vps';
  enabled: boolean; servers: number; nodes: number; products: number;
}
interface KindsView { enabled: HostingKind[]; configured: boolean; websiteBaseDomain: string; kinds: KindRow[] }

/**
 * Admin > Hosting Types. The owner ticks what this host actually provides; everything else disappears from the public
 * website, the customer panel, the admin menu and the API (the server enforces it too, this screen only edits the setting).
 */
export const AdminHostingTypes: React.FC = () => {
  const [toast, say] = useToast();
  const { refreshBranding } = useBranding();
  const [view, setView] = useState<KindsView | null>(null);
  const [picked, setPicked] = useState<HostingKind[]>([]);
  const [domain, setDomain] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = (v: KindsView) => { setView(v); setPicked(v.enabled); setDomain(v.websiteBaseDomain || ''); };
  useEffect(() => {
    apiRequest('/admin/hosting/kinds').then(r => { if (r.success) apply(r.data); else say('error', r.error?.message || 'Could not load hosting types'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => {
    if (!view) return false;
    const a = [...picked].sort().join(','); const b = [...view.enabled].sort().join(',');
    return a !== b || domain.trim() !== (view.websiteBaseDomain || '') || !view.configured;
  }, [view, picked, domain]);

  if (!view) return <Spinner />;

  const toggle = (id: HostingKind) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const hiding = view.kinds.filter(k => view.enabled.includes(k.id) && !picked.includes(k.id) && k.servers > 0);

  const save = async () => {
    if (!picked.length) { say('error', 'Keep at least one hosting type enabled.'); return; }
    setBusy(true);
    const r = await apiRequest('/admin/hosting/kinds', { method: 'PUT', body: JSON.stringify({ enabled: picked, websiteBaseDomain: domain.trim() }) });
    setBusy(false);
    if (r.success) { apply(r.data); say('success', 'Hosting types saved'); void refreshBranding(); }
    else say('error', r.error?.message || 'Failed to save');
  };

  return (
    <div className="space-y-5">
      {toast}
      <PageHeader
        icon={<Shapes className="h-6 w-6 text-amber-400" />}
        title="Hosting Types"
        subtitle="Choose what you sell. Anything you leave off is removed from the website, the customer panel, checkout and the API."
        actions={<Btn variant="primary" busy={busy} disabled={!dirty || !picked.length} onClick={save}><Save className="h-4 w-4" />{view.configured ? 'Save changes' : 'Save selection'}</Btn>}
      />

      {!view.configured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <Info className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-xs text-zinc-300 space-y-1">
            <p className="font-bold text-white">Choose what your host provides</p>
            <p>The site is currently showing the starting selection from your <span className="font-mono">.env</span> (<b>{view.enabled.map(k => view.kinds.find(x => x.id === k)?.label || k).join(', ')}</b>). Untick the types you do not run and save: the website, customer panel and checkout update immediately, with no rebuild or restart. Customers never see (or buy) a service you do not offer.</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {view.kinds.map(k => {
          const on = picked.includes(k.id);
          return (
            <button
              key={k.id}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(k.id)}
              className={cx(
                'text-left rounded-2xl border p-5 space-y-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60',
                on ? 'border-amber-500/50 bg-amber-500/5' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className={cx('flex h-11 w-11 items-center justify-center rounded-xl', on ? 'bg-amber-400 text-zinc-950' : 'bg-zinc-800 text-zinc-400')}>
                  <KindIcon kind={k.id} className="h-5 w-5" />
                </div>
                <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-500')}>{on ? 'Sold' : 'Hidden'}</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{k.label}</h3>
                <p className="text-xs text-zinc-400 mt-1">{k.tagline}</p>
              </div>
              <ul className="text-[11px] text-zinc-500 space-y-1 list-disc pl-4">{k.highlights.map(h => <li key={h}>{h}</li>)}</ul>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-zinc-800 text-[11px] font-mono text-zinc-500">
                <span>{k.servers} {k.servers === 1 ? 'server' : 'servers'}</span>
                <span>{k.nodes} {k.nodes === 1 ? 'node' : 'nodes'}</span>
                <span>{k.products} {k.products === 1 ? 'product' : 'products'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {!picked.length && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-300">Select at least one hosting type.</div>
      )}

      {hiding.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
          <TriangleAlert className="h-5 w-5 text-amber-400 shrink-0" />
          <div className="text-xs text-zinc-300 space-y-1">
            <p className="font-bold text-white">Customers have existing servers of a type you are hiding</p>
            <p>
              {hiding.map(k => `${k.servers} ${k.label}`).join(', ')}: these keep running and expiring as normal, but customers no longer see them and can not create new ones.
              You still see them in the admin area. Turn the type back on at any time.
            </p>
          </div>
        </div>
      )}

      {picked.includes('website') && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm"><Globe className="h-4 w-4 text-amber-400" />Website hosting domain</div>
          <Field
            label="Free subdomain base"
            hint="Every website gets a free address like my-site-a1b2c3.<this domain>. Point a wildcard DNS record (*.this-domain) at the node that runs websites. Leave empty to offer custom domains only."
          >
            <TextInput value={domain} placeholder="sites.example.com" onChange={ev => setDomain(ev.target.value)} className="font-mono text-xs" />
          </Field>
          <p className="text-[11px] text-zinc-600">
            Website nodes need ports 80 and 443 open, and the daemon on them started with <span className="font-mono">NODE_SERVICES</span> including <span className="font-mono">website</span> (the installer's configure step has a flag for it).
          </p>
        </Card>
      )}

      <p className="text-[11px] text-zinc-600">
        Tip: a node can be limited to certain types on the Nodes page, and a plan can be limited to certain types on Plans &amp; Limits.
        Changes apply to every visitor within a minute (and instantly in this browser). Nothing needs rebuilding or restarting.
      </p>
    </div>
  );
};
