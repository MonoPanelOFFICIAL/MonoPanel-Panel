import React, { useEffect, useState } from 'react';
import { Info, CheckCircle2, Loader2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { AdBanner } from '../AdBanner';
import { PanelProvider, usePanel } from './PanelContext';
import { cx } from '../ui/kit';

interface Props { currentPage: string; params?: Record<string, any>; onNavigate: (page: string, params?: any) => void; children: React.ReactNode }

/** After Stripe returns the customer here (/servers?paid=1&order=…): confirm the order, then drop the query. */
const PaymentWatcher: React.FC = () => {
  const { refresh } = usePanel();
  const [state, setState] = useState<'idle' | 'checking' | 'paid' | 'pending'>('idle');
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const order = q.get('order');
    if (q.get('paid') !== '1' || !order || !/^[\w-]{6,64}$/.test(order)) return;
    let stop = false; setState('checking');
    (async () => {
      for (let i = 0; i < 20 && !stop; i++) {
        const res = await apiRequest(`/hosting/billing/orders/${order}?sync=1`);
        if (res.success && res.data?.status === 'paid') { setState('paid'); await refresh(); window.history.replaceState({}, '', '/servers'); setTimeout(() => !stop && setState('idle'), 6000); return; }
        if (res.success && res.data?.status === 'failed') break;
        await new Promise(r => setTimeout(r, 3000));
      }
      if (!stop) { setState('pending'); window.history.replaceState({}, '', '/servers'); }
    })();
    return () => { stop = true; };
  }, [refresh]);
  if (state === 'idle') return null;
  return (
    <div className={cx('mb-4 rounded-xl border px-4 py-3 text-xs flex items-center gap-2.5', state === 'paid' ? 'border-white/25 bg-white/[0.07] text-text-1' : 'border-border bg-bg-2 text-text-2')}>
      {state === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : state === 'paid' ? <CheckCircle2 className="h-4 w-4" /> : <Info className="h-4 w-4" />}
      {state === 'checking' && 'Payment received, activating your plan…'}
      {state === 'paid' && 'Payment confirmed. Your plan is active and your servers have been upgraded.'}
      {state === 'pending' && 'Your payment is still being confirmed. This page will update automatically once it clears.'}
    </div>
  );
};

const TopBar: React.FC<{ onNavigate: Props['onNavigate'] }> = () => {
  const { data } = usePanel();
  if (!data?.topBar) return null;
  const linkOk = (u: string) => /^(https?:\/\/|\/)/.test(u);
  return (
    <div className="rounded-xl border border-border bg-bg-2 px-4 py-2.5 text-[12px] text-text-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <Info className="h-3.5 w-3.5 shrink-0 text-text-1" />
      <span>{data.topBar.message}</span>
      {data.topBar.links.filter(l => linkOk(l.url)).map((l, i) => (
        <React.Fragment key={i}><span className="text-text-4">|</span><a href={l.url} target={l.url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="underline decoration-white/30 hover:text-text-1">{l.label}</a></React.Fragment>
      ))}
    </div>
  );
};

const Shell: React.FC<Props> = ({ onNavigate, children }) => {
  const { data } = usePanel();
  const noAds = !!data?.plan.noAds;

  // The panel's navigation (servers, VPS, store ...) is the site sidebar; this frame is just the full-width page.
  return (
    <div className="w-full flex flex-col gap-4">
      <TopBar onNavigate={onNavigate} />
      <div><PaymentWatcher />{children}</div>
      {!noAds && <div className="mt-4"><AdBanner placement="footer" /></div>}
    </div>
  );
};

export const PanelLayout: React.FC<Props> = props => <PanelProvider><Shell {...props} /></PanelProvider>;
