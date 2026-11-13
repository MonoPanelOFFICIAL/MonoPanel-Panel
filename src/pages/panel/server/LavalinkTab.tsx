import React, { useCallback, useEffect, useState } from 'react';
import { Music, Copy, Eye, EyeOff, Save, RotateCcw, Plus, Trash2, Activity, Plug, FileCode2, SlidersHorizontal, Radio } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { Badge, Btn, Card, Field, NumInput, Select, Spinner, TextArea, TextInput, Toggle, fmtMB } from '../../../components/ui/kit';
import { ConfirmModal, TabHeader, duration } from '../../../components/ui/panelKit';

interface Plugin { dependency: string; repository?: string; snapshot?: boolean }
interface Settings {
  sources: Record<string, boolean>; filters: Record<string, boolean>;
  bufferDurationMs: number; frameBufferDurationMs: number; opusEncodingQuality: number; resamplingQuality: string; trackStuckThresholdMs: number;
  useSeekGhosting: boolean; playerUpdateInterval: number; youtubePlaylistLoadLimit: number; gcWarnings: boolean; metrics: boolean; logLevel: string;
  plugins: Plugin[]; extraYaml: string;
}
interface Data {
  config: { managed: boolean; settings: Settings; raw: string; exists: boolean } | null;
  status: { online: boolean; error?: string; version?: string; sources?: string[]; plugins?: { name: string; version: string }[]; pluginJars?: { name: string; size: number }[];
    stats?: { players: number; playingPlayers: number; uptimeMs: number; memUsedMB: number; memAllocatedMB: number; cpuCores: number; systemLoad: number; lavalinkLoad: number } } | null;
  connection: { host: string; port: number; secure: boolean; password: string; version: string; url: string };
}

const SOURCE_LABEL: Record<string, string> = { youtube: 'YouTube', bandcamp: 'Bandcamp', soundcloud: 'SoundCloud', twitch: 'Twitch', vimeo: 'Vimeo', nico: 'Niconico', http: 'HTTP streams', local: 'Local files' };
const FILTER_LABEL: Record<string, string> = { volume: 'Volume', equalizer: 'Equalizer', karaoke: 'Karaoke', timescale: 'Timescale', tremolo: 'Tremolo', vibrato: 'Vibrato', distortion: 'Distortion', rotation: 'Rotation', channelMix: 'Channel mix', lowPass: 'Low pass' };

type Notify = (t: 'success' | 'error', m: string) => void;

export const LavalinkTab: React.FC<{ serverId: string; running: boolean; canEdit: boolean; notify: Notify }> = ({ serverId, running, canEdit, notify }) => {
  const [d, setD] = useState<Data | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [raw, setRaw] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [newPlugin, setNewPlugin] = useState<Plugin>({ dependency: '', repository: '' });

  const load = useCallback(async (keepForm = false) => {
    const r = await apiRequest<Data>(`/hosting/servers/${serverId}/lavalink`);
    if (!r.success || !r.data) { notify('error', r.error?.message || 'Could not load Lavalink settings.'); return; }
    setD(r.data);
    if (!keepForm && r.data.config) { setS(r.data.config.settings); setRaw(r.data.config.raw); }
  }, [serverId]);
  useEffect(() => { load(); }, [load]);
  // Live stats refresh on their own so typing in the form is never overwritten.
  useEffect(() => { const t = window.setInterval(() => document.visibilityState === 'visible' && load(true), 8000); return () => window.clearInterval(t); }, [load]);

  if (!d) return <Spinner />;
  const c = d.connection;
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => notify('success', 'Copied'));
  const managed = d.config?.managed !== false;
  const up = (patch: Partial<Settings>) => setS(x => (x ? { ...x, ...patch } : x));

  const save = async () => {
    setSaving(true);
    const body = managed ? { settings: s } : { raw };
    const r = await apiRequest<Data['config']>(`/hosting/servers/${serverId}/lavalink/config`, { method: 'PUT', body: JSON.stringify(body) });
    setSaving(false);
    if (r.success) { notify('success', 'Saved. Restart the server to apply the new configuration.'); await load(); } else notify('error', r.error?.message || 'Could not save.');
  };
  const reset = async () => {
    setResetAsk(false);
    const r = await apiRequest(`/hosting/servers/${serverId}/lavalink/reset`, { method: 'POST', body: '{}' });
    if (r.success) { notify('success', 'Configuration reset to the managed defaults.'); await load(); } else notify('error', r.error?.message || 'Could not reset.');
  };
  const addPlugin = () => {
    if (!s) return;
    const dep = newPlugin.dependency.trim();
    if (!/^[A-Za-z0-9_.-]+:[A-Za-z0-9_.-]+:[A-Za-z0-9_.+-]+$/.test(dep)) { notify('error', 'A plugin looks like group:artifact:version, for example com.github.topi314.lavasrc:lavasrc-plugin:4.3.0'); return; }
    up({ plugins: [...s.plugins, { dependency: dep, ...(newPlugin.repository?.trim() ? { repository: newPlugin.repository.trim() } : {}) }] });
    setNewPlugin({ dependency: '', repository: '' });
  };

  const st = d.status;
  const snippet = `{ name: 'main', url: '${c.host}:${c.port}', auth: '${show ? c.password : '••••••••'}', secure: false }`;

  return (
    <div className="space-y-5">
      <TabHeader title="Lavalink" subtitle="Connection details, live status and the node configuration"
        actions={canEdit && d.config ? <Btn variant="primary" busy={saving} onClick={save}><Save className="h-3.5 w-3.5" />Save configuration</Btn> : undefined} />

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Radio className="h-4 w-4 text-amber-400" />Connect your bot</h3>
        <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
          {[['Host', c.host], ['Port', String(c.port)]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-mono text-zinc-500 uppercase">{k}</p><p className="font-mono text-zinc-200 truncate">{v}</p></div><button onClick={() => copy(v)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" aria-label={`Copy ${k}`}><Copy className="h-3.5 w-3.5" /></button></div>
          ))}
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 flex items-center justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-mono text-zinc-500 uppercase">Password</p><p className="font-mono text-zinc-200 truncate">{show ? c.password || '(default)' : '••••••••••••'}</p></div>
            <span className="flex"><button onClick={() => setShow(v => !v)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button><button onClick={() => copy(c.password)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500" aria-label="Copy password"><Copy className="h-3.5 w-3.5" /></button></span></div>
        </div>
        <div className="rounded-xl bg-black border border-zinc-800 p-3 flex items-start justify-between gap-2"><code className="text-[11.5px] font-mono text-zinc-300 break-all">{snippet}</code><button onClick={() => copy(`{ name: 'main', url: '${c.host}:${c.port}', auth: '${c.password}', secure: false }`)} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-500 shrink-0" aria-label="Copy node config"><Copy className="h-3.5 w-3.5" /></button></div>
        <p className="text-[11px] text-zinc-500">Works with Shoukaku, lavalink-client, Wavelink, Lavalink.py and other Lavalink v4 clients. The password is changed in the Startup tab (restart afterwards).</p>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Activity className="h-4 w-4 text-amber-400" />Live status
          <Badge tone={st?.online ? 'green' : 'zinc'}>{st?.online ? 'Online' : running ? 'Starting…' : 'Offline'}</Badge>
          {st?.version && <span className="text-[11px] font-mono text-zinc-500">v{st.version}</span>}</h3>
        {st?.online && st.stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {[['Players', `${st.stats.players}`], ['Playing', `${st.stats.playingPlayers}`], ['Uptime', duration(st.stats.uptimeMs)], ['Memory', `${fmtMB(st.stats.memUsedMB)} / ${fmtMB(st.stats.memAllocatedMB)}`], ['CPU (node)', `${(st.stats.lavalinkLoad * 100).toFixed(1)}%`], ['CPU (system)', `${(st.stats.systemLoad * 100).toFixed(1)}%`], ['Cores', `${st.stats.cpuCores}`], ['Sources', `${st.sources?.length || 0}`]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5"><p className="text-[10px] font-mono text-zinc-500 uppercase">{k}</p><p className="font-mono text-zinc-100 mt-0.5">{v}</p></div>))}
          </div>
        ) : <p className="text-xs text-zinc-500">{st?.error || (running ? 'Waiting for Lavalink to finish starting…' : 'Start the server to see live statistics.')}</p>}
        {!!st?.plugins?.length && <p className="text-[11px] text-zinc-500">Loaded plugins: {st.plugins.map(p => `${p.name} ${p.version}`).join(', ')}</p>}
      </Card>

      {!d.config && <Card><p className="text-xs text-zinc-400">The configuration is not available yet. It appears when the installation has finished.</p></Card>}

      {d.config && !managed && (
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><FileCode2 className="h-4 w-4 text-amber-400" />application.yml <Badge tone="amber">Edited manually</Badge></h3>
          <p className="text-xs text-zinc-400">This file was edited by hand, so the simple settings are switched off to avoid overwriting your changes.</p>
          <TextArea value={raw} onChange={e => setRaw(e.target.value)} disabled={!canEdit} spellCheck={false} className="!min-h-[360px]" aria-label="application.yml" />
          {canEdit && <Btn onClick={() => setResetAsk(true)}><RotateCcw className="h-3.5 w-3.5" />Reset to managed settings</Btn>}
        </Card>
      )}

      {d.config && managed && s && (<>
        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Music className="h-4 w-4 text-amber-400" />Audio sources</h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {Object.keys(s.sources).map(k => <Toggle key={k} checked={s.sources[k]} onChange={v => canEdit && up({ sources: { ...s.sources, [k]: v } })} label={SOURCE_LABEL[k] || k} hint={k === 'youtube' ? 'Needs the YouTube plugin below on current Lavalink versions.' : undefined} />)}
          </div>
          <h3 className="text-sm font-bold text-white pt-2">Filters</h3>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {Object.keys(s.filters).map(k => <Toggle key={k} checked={s.filters[k]} onChange={v => canEdit && up({ filters: { ...s.filters, [k]: v } })} label={FILTER_LABEL[k] || k} />)}
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-amber-400" />Performance</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Buffer duration (ms)"><NumInput value={s.bufferDurationMs} min={50} max={5000} onChange={n => up({ bufferDurationMs: n })} /></Field>
            <Field label="Frame buffer (ms)"><NumInput value={s.frameBufferDurationMs} min={1000} max={30000} onChange={n => up({ frameBufferDurationMs: n })} /></Field>
            <Field label="Opus quality (0-10)"><NumInput value={s.opusEncodingQuality} min={0} max={10} onChange={n => up({ opusEncodingQuality: n })} /></Field>
            <Field label="Resampling quality"><Select value={s.resamplingQuality} onChange={e => up({ resamplingQuality: e.target.value })}>{['LOW', 'MEDIUM', 'HIGH'].map(q => <option key={q}>{q}</option>)}</Select></Field>
            <Field label="Track stuck threshold (ms)"><NumInput value={s.trackStuckThresholdMs} min={1000} max={120000} onChange={n => up({ trackStuckThresholdMs: n })} /></Field>
            <Field label="Player update interval (s)"><NumInput value={s.playerUpdateInterval} min={1} max={60} onChange={n => up({ playerUpdateInterval: n })} /></Field>
            <Field label="Playlist load limit"><NumInput value={s.youtubePlaylistLoadLimit} min={1} max={100} onChange={n => up({ youtubePlaylistLoadLimit: n })} /></Field>
            <Field label="Log level"><Select value={s.logLevel} onChange={e => up({ logLevel: e.target.value })}>{['ERROR', 'WARN', 'INFO', 'DEBUG'].map(q => <option key={q}>{q}</option>)}</Select></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Toggle checked={s.useSeekGhosting} onChange={v => up({ useSeekGhosting: v })} label="Seek ghosting" />
            <Toggle checked={s.gcWarnings} onChange={v => up({ gcWarnings: v })} label="GC warnings" />
            <Toggle checked={s.metrics} onChange={v => up({ metrics: v })} label="Prometheus metrics" />
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2"><Plug className="h-4 w-4 text-amber-400" />Plugins</h3>
          <p className="text-xs text-zinc-400">Lavalink downloads these when it starts. Use the Maven coordinate from the plugin's README (group:artifact:version).</p>
          {s.plugins.length === 0 && <p className="text-xs text-zinc-500">No plugins installed.</p>}
          {s.plugins.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2"><div className="min-w-0"><p className="font-mono text-xs text-zinc-200 truncate">{p.dependency}</p>{p.repository && <p className="text-[10px] text-zinc-500 truncate">{p.repository}</p>}</div>
              {canEdit && <button onClick={() => up({ plugins: s.plugins.filter((_, j) => j !== i) })} className="p-1.5 rounded hover:bg-red-500/10 text-red-400" aria-label="Remove plugin"><Trash2 className="h-3.5 w-3.5" /></button>}</div>
          ))}
          {canEdit && (
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <Field label="Plugin"><TextInput value={newPlugin.dependency} onChange={e => setNewPlugin(x => ({ ...x, dependency: e.target.value }))} placeholder="com.github.topi314.lavasrc:lavasrc-plugin:4.3.0" /></Field>
              <Field label="Repository (optional)"><TextInput value={newPlugin.repository} onChange={e => setNewPlugin(x => ({ ...x, repository: e.target.value }))} placeholder="https://maven.example.com/releases" /></Field>
              <Btn onClick={addPlugin}><Plus className="h-3.5 w-3.5" />Add</Btn>
            </div>
          )}
          {!!st?.pluginJars?.length && <p className="text-[11px] text-zinc-500">Downloaded: {st.pluginJars.map(j => j.name).join(', ')}</p>}
          <Field label="Plugin settings (YAML, appended to the file)" hint="Where plugin options go, for example a top-level plugins: block. server:, lavalink:, metrics: and logging: are not allowed here.">
            <TextArea value={s.extraYaml} onChange={e => up({ extraYaml: e.target.value })} disabled={!canEdit} spellCheck={false} placeholder={'plugins:\n  lavasrc:\n    providers: []'} />
          </Field>
        </Card>
      </>)}

      <ConfirmModal open={resetAsk} title="Reset the configuration?" confirmLabel="Reset" danger onClose={() => setResetAsk(false)} onConfirm={reset}>Your hand-edited application.yml is replaced with the managed default settings. This cannot be undone.</ConfirmModal>
    </div>
  );
};
