import React, { useCallback, useEffect, useState } from 'react';
import { Globe, Plus, Trash2, Copy, RefreshCw, CheckCircle2, Clock, ExternalLink, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { Badge, Btn, Card, Spinner, TextInput } from '../../../components/ui/kit';
import { ConfirmModal, TabHeader } from '../../../components/ui/panelKit';

interface Rec { type: string; name: string; value: string; note: string }
interface Domain { name: string; verified: boolean; addedAt: string; checkedAt?: string; error?: string; records: Rec[] }
interface Site { subdomain: string; baseDomain: string; maxDomains: number; target: string; hosts: string[]; proxy: { enabled: boolean; httpPort: number; httpsPort: number; domains: number; certs: number } | null; domains: Domain[] }

export const SiteTab: React.FC<{ serverId: string; canEdit: boolean; notify: (t: 'success' | 'error', m: string) => void }> = ({ serverId, canEdit, notify }) => {
  const [site, setSite] = useState<Site | null>(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState('');
  const [remove, setRemove] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiRequest<Site>(`/hosting/servers/${serverId}/site`);
    if (r.success && r.data) setSite(r.data); else notify('error', r.error?.message || 'Could not load the site settings.');
  }, [serverId]);
  useEffect(() => { load(); }, [load]);
  if (!site) return <Spinner />;

  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => notify('success', 'Copied'));
  const add = async () => {
    setAdding(true);
    const r = await apiRequest<Site>(`/hosting/servers/${serverId}/site/domains`, { method: 'POST', body: JSON.stringify({ domain: name }) });
    setAdding(false);
    if (r.success && r.data) { setSite(r.data); setName(''); notify('success', 'Domain added. Create the DNS records below, then press Verify.'); } else notify('error', r.error?.message || 'Could not add the domain.');
  };
  const verify = async (d: string) => {
    setChecking(d);
    const r = await apiRequest<Site>(`/hosting/servers/${serverId}/site/domains/verify`, { method: 'POST', body: JSON.stringify({ domain: d }) });
    setChecking('');
    if (r.success && r.data) { setSite(r.data); const dm = r.data.domains.find(x => x.name === d); notify(dm?.verified ? 'success' : 'error', dm?.verified ? `${d} is connected.` : dm?.error || 'Not verified yet.'); } else notify('error', r.error?.message || 'Check failed.');
  };
  const del = async () => {
    const d = remove; setRemove(null); if (!d) return;
    const r = await apiRequest<Site>(`/hosting/servers/${serverId}/site/domains/${encodeURIComponent(d)}`, { method: 'DELETE' });
    if (r.success && r.data) setSite(r.data); else notify('error', r.error?.message || 'Could not remove the domain.');
  };
  const link = (h: string) => `${site.proxy?.httpsPort ? 'https' : 'http'}://${h}`;

  return (
    <div className="space-y-5">
      <TabHeader title="Domains" subtitle="Your free address and custom domains" />

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Globe className="h-4 w-4 text-amber-400" />Free address</h3>
        {site.subdomain ? (
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 flex items-center justify-between gap-2"><span className="font-mono text-xs text-zinc-200 truncate">{site.subdomain}</span>
            <span className="flex shrink-0"><button onClick={() => copy(site.subdomain)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" aria-label="Copy address"><Copy className="h-3.5 w-3.5" /></button><a href={link(site.subdomain)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" aria-label="Open site"><ExternalLink className="h-3.5 w-3.5" /></a></span></div>
        ) : <p className="text-xs text-zinc-400">This host has not set a base domain for free addresses. Add your own domain below.</p>}
        {site.proxy && !site.proxy.enabled && <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">The web proxy on this node is off, so domains will not serve traffic yet. The host needs to enable it on the node.</p>}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-400" />Custom domains <span className="text-[11px] font-mono text-zinc-500">{site.domains.length}/{site.maxDomains}</span></h3>
        {canEdit && (
          <div className="flex gap-2 items-end">
            <div className="flex-1"><TextInput value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name && add()} placeholder="example.com or www.example.com" aria-label="Domain" /></div>
            <Btn variant="primary" busy={adding} disabled={!name.trim()} onClick={add}><Plus className="h-3.5 w-3.5" />Add domain</Btn>
          </div>
        )}
        {site.domains.length === 0 && <p className="text-xs text-zinc-500">No custom domains yet.</p>}
        {site.domains.map(d => (
          <div key={d.name} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-mono text-xs text-zinc-100 flex items-center gap-2 min-w-0 truncate">{d.name}{d.verified ? <Badge tone="green"><CheckCircle2 className="h-3 w-3 mr-1 inline" />Connected</Badge> : <Badge tone="amber"><Clock className="h-3 w-3 mr-1 inline" />Waiting for DNS</Badge>}</p>
              <span className="flex gap-1.5">
                {d.verified && <a href={link(d.name)} target="_blank" rel="noopener noreferrer" className="inline-flex"><Btn size="sm"><ExternalLink className="h-3.5 w-3.5" />Open</Btn></a>}
                {!d.verified && canEdit && <Btn size="sm" variant="primary" busy={checking === d.name} onClick={() => verify(d.name)}><RefreshCw className="h-3.5 w-3.5" />Verify</Btn>}
                {canEdit && <Btn size="sm" variant="danger" onClick={() => setRemove(d.name)} aria-label={`Remove ${d.name}`}><Trash2 className="h-3.5 w-3.5" /></Btn>}
              </span>
            </div>
            {!d.verified && d.error && <p className="text-[11px] text-amber-200">{d.error}</p>}
            {!d.verified && d.records.length > 0 && (
              <div className="rounded-lg border border-zinc-800 overflow-hidden text-[11px]">
                <div className="grid grid-cols-[56px_1fr_1fr_28px] bg-zinc-900 text-zinc-500 font-mono uppercase px-2.5 py-1.5"><span>Type</span><span>Name</span><span>Value</span><span /></div>
                {d.records.map(r => (
                  <div key={r.type + r.name} className="grid grid-cols-[56px_1fr_1fr_28px] items-center px-2.5 py-2 border-t border-zinc-800 gap-2">
                    <span className="font-mono text-amber-300">{r.type}</span><span className="font-mono text-zinc-300 break-all">{r.name}</span><span className="font-mono text-zinc-300 break-all">{r.value}</span>
                    <button onClick={() => copy(r.value)} className="p-1 rounded hover:bg-zinc-800 text-zinc-500" aria-label={`Copy ${r.type} value`}><Copy className="h-3 w-3" /></button>
                    <span className="col-span-4 text-[10px] text-zinc-600">{r.note}</span>
                  </div>))}
              </div>
            )}
          </div>
        ))}
        <p className="text-[11px] text-zinc-500">DNS changes can take a few minutes. A CNAME from your domain to the free address above also proves ownership. HTTPS certificates are issued by the host for connected domains.</p>
      </Card>
      <ConfirmModal open={!!remove} title="Remove this domain?" confirmLabel="Remove" danger onClose={() => setRemove(null)} onConfirm={del}>{remove} will stop pointing at this site.</ConfirmModal>
    </div>
  );
};
