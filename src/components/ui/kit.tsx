import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

/** Shared building blocks for the hosting panel + admin pages. Styled after MonoPanel Home: black surfaces, hairline borders, inverted white hover. */

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const Card: React.FC<{ className?: string; children: React.ReactNode; accent?: boolean }> = ({ className, children, accent }) => (
  <div className={cx('rounded-[14px] border p-4 sm:p-5', accent ? 'border-white/30 bg-white/[0.04]' : 'border-border bg-bg-2', className)}>{children}</div>
);

export const PageHeader: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string; actions?: React.ReactNode }> = ({ icon, title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-[32px] leading-[1.1] font-bold tracking-[-0.04em] text-text-1 flex items-center gap-2.5">{icon}<span className="truncate">{title}</span></h1>
      {subtitle && <p className="text-[13px] text-text-3 mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'dark' | 'success'; size?: 'sm' | 'md'; busy?: boolean };
export const Btn: React.FC<BtnProps> = ({ variant = 'ghost', size = 'md', busy, className, children, disabled, ...rest }) => {
  // primary = Home's .btn-primary (solid ink, flips to black on hover); the rest = .btn-secondary (hairline, flips to solid ink)
  const v = {
    primary: 'bg-text-1 text-bg border border-text-1 font-semibold hover:bg-bg hover:text-text-1',
    ghost: 'bg-bg-2 text-text-2 border border-border hover:bg-text-1 hover:text-bg hover:border-text-1',
    dark: 'bg-bg text-text-2 border border-border hover:bg-text-1 hover:text-bg hover:border-text-1',
    danger: 'bg-transparent text-text-2 border border-dashed border-white/35 hover:bg-text-1 hover:text-bg hover:border-text-1 hover:border-solid',
    success: 'bg-bg-2 text-text-1 border border-white/25 hover:bg-text-1 hover:text-bg hover:border-text-1',
  }[variant];
  return (
    <button {...rest} disabled={disabled || busy} className={cx('inline-flex items-center justify-center gap-1.5 rounded-[10px] transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none font-medium', size === 'sm' ? 'px-2.5 py-1.5 text-[11px]' : 'px-4 py-2.5 text-[13px]', v, className)}>
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }> = ({ label, hint, children, className, right }) => (
  <label className={cx('block', className)}>
    <span className="flex items-center justify-between text-[10px] font-mono font-semibold uppercase tracking-[0.06em] text-text-3 mb-1.5"><span>{label}</span>{right}</span>
    {children}
    {hint && <span className="block text-[11px] text-text-4 mt-1">{hint}</span>}
  </label>
);

// Home inputs: translucent white field, hairline border that brightens on focus with a soft ring
const inputCls = 'w-full rounded-[10px] bg-bg-input border border-border-input focus:border-text-3 focus:ring-2 focus:ring-white/10 focus:outline-none px-3 py-2.5 text-sm text-text-1 placeholder:text-text-4 transition-colors';
export const TextInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} {...p} className={cx(inputCls, className)} />);
TextInput.displayName = 'TextInput';
export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className, ...p }) => <textarea {...p} className={cx(inputCls, 'font-mono text-xs min-h-[90px]', className)} />;
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className, children, ...p }) => <select {...p} className={cx(inputCls, 'appearance-none', className)}>{children}</select>;

/** Number input that keeps '' while typing and reports numbers. */
export const NumInput: React.FC<{ value: number | undefined; onChange: (n: number) => void; min?: number; max?: number; step?: number; className?: string; suffix?: string }> = ({ value, onChange, min, max, step, className, suffix }) => (
  <div className="relative">
    <input type="number" inputMode="decimal" value={Number.isFinite(value as number) ? value : ''} min={min} max={max} step={step}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))} className={cx(inputCls, suffix && 'pr-12', className)} />
    {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-4">{suffix}</span>}
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }> = ({ checked, onChange, label, hint }) => (
  <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left w-full group">
    <span className={cx('relative h-5 w-9 rounded-full transition-colors shrink-0', checked ? 'bg-text-1' : 'bg-zinc-700')}>
      <span className={cx('absolute top-0.5 h-4 w-4 rounded-full transition-all', checked ? 'left-[18px] bg-bg' : 'left-0.5 bg-text-2')} />
    </span>
    {(label || hint) && <span><span className="block text-xs font-semibold text-text-1">{label}</span>{hint && <span className="block text-[11px] text-text-4">{hint}</span>}</span>}
  </button>
);

export const Badge: React.FC<{ tone?: 'green' | 'amber' | 'red' | 'zinc' | 'blue'; children: React.ReactNode; className?: string }> = ({ tone = 'zinc', children, className }) => {
  // Home is black and white, so tone is carried by brightness and border style rather than hue:
  // green = solid ink (healthy), blue = bright outline (in progress), amber = outline, red = dashed (needs attention), zinc = quiet.
  const t = {
    green: 'bg-text-1 text-bg border-text-1 font-semibold',
    blue: 'bg-white/[0.08] text-text-1 border-white/40',
    amber: 'bg-white/[0.04] text-text-2 border-white/25',
    red: 'bg-transparent text-text-3 border-dashed border-white/40',
    zinc: 'bg-bg-3 text-text-3 border-border',
  }[tone];
  return <span className={cx('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono border whitespace-nowrap', t, className)}>{children}</span>;
};

export const statusTone = (s: string): 'green' | 'amber' | 'red' | 'zinc' | 'blue' =>
  s === 'running' ? 'green' : ['installing', 'starting', 'transferring'].includes(s) ? 'blue' : ['expired', 'suspended', 'install_failed'].includes(s) ? 'red' : 'zinc';

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean; footer?: React.ReactNode }> = ({ open, onClose, title, children, wide, footer }) => {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-[4px]" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={cx('w-full bg-bg-2 border border-border sm:rounded-[14px] rounded-t-[14px] max-h-[92vh] flex flex-col animate-in', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h3 className="text-[15px] font-semibold text-text-1">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-3 hover:bg-text-1 hover:text-bg transition-colors" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-border flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

export function useToast(): [React.ReactNode, (type: 'success' | 'error', message: string) => void] {
  const [t, setT] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const timer = useRef<number>();
  const show = useCallback((type: 'success' | 'error', message: string) => {
    setT({ type, message }); window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setT(null), 4500);
  }, []);
  const node = t ? (
    <div className={cx('fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] max-[860px]:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-5 left-5 sm:left-auto z-[500] sm:max-w-sm flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-2xl shadow-black/60 text-xs font-medium bg-bg-2', t.type === 'success' ? 'border-white/30 text-text-1' : 'border-dashed border-white/40 text-text-2')} role="status">
      {t.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-px" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />}<span>{t.message}</span>
    </div>
  ) : null;
  return [node, show];
}

export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-xs text-text-4"><Loader2 className="h-4 w-4 animate-spin" />{label}</div>
);

export const Empty: React.FC<{ icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }> = ({ icon, title, text, action }) => (
  <div className="flex flex-col items-center text-center py-14 px-6">
    {icon && <div className="mb-4 text-text-4">{icon}</div>}
    <p className="text-sm font-semibold text-text-1">{title}</p>
    {text && <p className="text-xs text-text-3 mt-1.5 max-w-sm">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---------- formatting helpers ----------
export const fmtMB = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`);
export const fmtBytes = (b: number) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(0)} MB` : `${Math.round(b / 1024)} KB`);
export const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export function timeLeft(iso?: string, now = Date.now()): { text: string; ms: number; urgent: boolean } {
  if (!iso) return { text: 'Never expires', ms: Infinity, urgent: false };
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { text: 'Expired', ms, urgent: true };
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return { text: d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`, ms, urgent: ms < 86400000 };
}
export const money = (n: number, sym = '$') => `${sym}${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '')}`;
