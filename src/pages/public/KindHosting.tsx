import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { Plan, Product } from '../../types';
import { HostingKind, kindInfo } from '../../hostingKinds';
import { KindIcon } from '../../components/panel/KindIcon';

/**
 * Marketing page for the hosting types without a hand-made page (Website, Node.js, Lavalink). Text and highlights come from the
 * shared registry (src/hostingKinds.ts); plans are the ones the host created for products of that category in Admin > Products.
 */
export const KindHosting: React.FC<{ kind: HostingKind; onNavigate: (page: string, params?: any) => void }> = ({ kind, onNavigate }) => {
  const info = kindInfo(kind)!;
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [pr, pl] = await Promise.all([apiRequest('/public/products'), apiRequest('/public/plans')]);
        const ids = new Set<string>(((pr.data as Product[]) || []).filter(p => String(p.category).toLowerCase() === info.category).map(p => p.id));
        if (live && pl.success && Array.isArray(pl.data)) setPlans((pl.data as Plan[]).filter(p => ids.has(p.productId)));
      } finally { if (live) setLoading(false); }
    })();
    return () => { live = false; };
  }, [info.category]);

  return (
    <div className="space-y-16 py-8">
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400"><KindIcon kind={kind} className="h-4 w-4" /><span>{info.label}</span></div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white">{info.tagline}</h1>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">{info.description}</p>
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2 text-xs text-zinc-300">
          {info.highlights.map(h => <li key={h} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-cyan-400" />{h}</li>)}
        </ul>
        <div className="pt-6 flex items-center justify-center gap-3">
          <span className={`text-xs font-medium ${!yearly ? 'text-white font-bold' : 'text-zinc-500'}`}>Monthly</span>
          <button onClick={() => setYearly(y => !y)} aria-label="Toggle yearly billing" className="w-12 h-6 rounded-full bg-zinc-800 p-1 flex items-center"><div className={`h-4 w-4 rounded-full bg-cyan-500 transition-transform ${yearly ? 'translate-x-6' : ''}`} /></button>
          <span className={`text-xs font-medium ${yearly ? 'text-white font-bold' : 'text-zinc-500'}`}>Yearly</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {loading ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" /></div>
          : plans.length === 0 ? <p className="text-center text-sm text-zinc-500">Plans are coming soon.</p>
          : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map(p => {
                const price = yearly ? (p.priceYearly / 12).toFixed(2) : p.priceMonthly.toFixed(2);
                return (
                  <div key={p.id} className={`rounded-3xl p-7 bg-zinc-900/80 border flex flex-col justify-between relative ${p.isPopular ? 'border-cyan-500 shadow-xl shadow-cyan-500/10' : 'border-zinc-800 hover:border-zinc-700'}`}>
                    {p.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-cyan-600 text-white uppercase tracking-wider">Most Popular</div>}
                    <div className="space-y-4">
                      <div><h3 className="text-xl font-bold text-white">{p.name}</h3>{p.description && <p className="text-xs text-zinc-500 mt-1">{p.description}</p>}
                        <div className="mt-3 flex items-baseline gap-1"><span className="text-4xl font-extrabold text-white">${price}</span><span className="text-xs text-zinc-400">/mo</span></div></div>
                      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
                        <div className="text-cyan-400 font-semibold">{p.ramMB >= 1024 ? `${p.ramMB / 1024}GB RAM` : `${p.ramMB}MB RAM`}</div>
                        <div className="text-zinc-300">{p.cpuCores} vCPU Core{p.cpuCores > 1 ? 's' : ''}</div>
                        <div className="text-zinc-400">{p.diskGB}GB SSD Storage</div>
                      </div>
                      <ul className="space-y-2.5 text-xs text-zinc-300 pt-2 border-t border-zinc-800">
                        {(p.features || []).slice(0, 6).map((f, i) => <li key={i} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" /><span>{f}</span></li>)}
                      </ul>
                    </div>
                    <button onClick={() => onNavigate('register', { planId: p.id, productCategory: info.category })} className="w-full mt-7 py-3.5 rounded-xl font-semibold text-xs bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-2">Get {p.name}<ArrowRight className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
};
