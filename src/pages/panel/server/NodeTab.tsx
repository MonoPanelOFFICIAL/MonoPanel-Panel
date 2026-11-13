import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Hexagon, Download, Hammer, GitPullRequest, Trash2, RefreshCw, Package, GitBranch, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { Badge, Btn, Card, Spinner } from '../../../components/ui/kit';
import { TabHeader } from '../../../components/ui/panelKit';

interface Project {
  hasPackageJson: boolean; name?: string; version?: string; main?: string; type?: string; scripts: Record<string, string>; dependencies: number; devDependencies: number;
  engines?: Record<string, string>; packageManager: string; lockfile: boolean; nodeModules: boolean; git: { present: boolean; remote?: string; branch?: string }; envFile: boolean; framework?: string;
}
interface Run { task: string; state: 'running' | 'done' | 'failed'; startedAt: string; endedAt?: string; log: string[]; code?: number }

const TASKS = [
  { id: 'install', label: 'Install packages', icon: Download, hint: 'Runs the install step with the package manager your lockfile uses.' },
  { id: 'build', label: 'Build', icon: Hammer, hint: 'Installs everything, then runs "build" from package.json.' },
  { id: 'update', label: 'Pull latest', icon: GitPullRequest, hint: 'git pull, then install. Only for servers deployed from Git.' },
  { id: 'clean', label: 'Clean', icon: Trash2, hint: 'Deletes node_modules and build folders (.next, .nuxt, dist, .cache).' },
] as const;

export const NodeTab: React.FC<{ serverId: string; running: boolean; canRun: boolean; website?: boolean; notify: (t: 'success' | 'error', m: string) => void }> = ({ serverId, running, canRun, website, notify }) => {
  const [p, setP] = useState<Project | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [starting, setStarting] = useState('');
  const logRef = useRef<HTMLPreElement>(null);

  const loadProject = useCallback(async () => {
    const r = await apiRequest<Project>(`/hosting/servers/${serverId}/nodejs/project`);
    if (r.success && r.data) setP(r.data); else notify('error', r.error?.message || 'Could not read the project.');
  }, [serverId]);
  const loadRun = useCallback(async () => {
    const r = await apiRequest<{ run: Run | null }>(`/hosting/servers/${serverId}/nodejs/task`);
    if (r.success) setRun(r.data?.run || null);
    return r.data?.run || null;
  }, [serverId]);

  useEffect(() => { loadProject(); loadRun(); }, [loadProject, loadRun]);
  // While a task runs, follow its log; when it ends, refresh what it changed (node_modules, lockfile…).
  useEffect(() => {
    if (run?.state !== 'running') return;
    const t = window.setInterval(async () => { const r = await loadRun(); if (r && r.state !== 'running') { loadProject(); window.clearInterval(t); } }, 1500);
    return () => window.clearInterval(t);
  }, [run?.state, loadRun, loadProject]);
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [run?.log.length]);

  if (!p) return <Spinner />;
  const start = async (task: string) => {
    setStarting(task);
    const r = await apiRequest<{ run: Run }>(`/hosting/servers/${serverId}/nodejs/task`, { method: 'POST', body: JSON.stringify({ task }) });
    setStarting('');
    if (r.success && r.data) setRun(r.data.run); else notify('error', r.error?.message || 'Could not start the task.');
  };
  const busy = run?.state === 'running';

  return (
    <div className="space-y-5">
      <TabHeader title={website ? 'Project & build' : 'Project'} subtitle="What is deployed, and one-click install, build and update tasks" actions={<Btn onClick={loadProject}><RefreshCw className="h-3.5 w-3.5" />Refresh</Btn>} />

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Hexagon className="h-4 w-4 text-amber-400" />{p.name || 'Project'}{p.version && <span className="text-[11px] font-mono text-zinc-500">v{p.version}</span>}{p.framework && <Badge tone="blue">{p.framework}</Badge>}</h3>
        {!p.hasPackageJson ? (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">No package.json found in the server root. Upload your project with the File Manager or set a Git repository in the Startup tab.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {[['Package manager', p.packageManager + (p.lockfile ? '' : ' (no lockfile)')], ['Dependencies', `${p.dependencies} + ${p.devDependencies} dev`], ['node_modules', p.nodeModules ? 'Installed' : 'Missing'], ['Module type', p.type || 'commonjs'], ['Entry', p.main || '—'], ['Node engine', p.engines?.node || 'Any'], ['.env file', p.envFile ? 'Present' : 'None'], ['Git', p.git.present ? (p.git.branch || 'detached') : 'Not a git repo']].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2.5"><p className="text-[10px] font-mono text-zinc-500 uppercase">{k}</p><p className="font-mono text-zinc-100 mt-0.5 truncate">{v}</p></div>))}
          </div>
        )}
        {p.git.remote && <p className="text-[11px] text-zinc-500 flex items-center gap-1.5"><GitBranch className="h-3 w-3" />{p.git.remote}</p>}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><Package className="h-4 w-4 text-amber-400" />Tasks</h3>
        {running && <p className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">The server is running. Stop it before build, update or clean (install is always allowed).</p>}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {TASKS.map(t => { const I = t.icon; return (
            <button key={t.id} disabled={!canRun || busy || !!starting || (running && t.id !== 'install')} onClick={() => start(t.id)} className="text-left rounded-xl border border-zinc-800 bg-zinc-950 hover:border-zinc-700 disabled:opacity-50 disabled:hover:border-zinc-800 px-3.5 py-3 transition-colors">
              <p className="text-xs font-semibold text-zinc-100 flex items-center gap-2"><I className="h-3.5 w-3.5 text-amber-400" />{t.label}{starting === t.id && <Loader2 className="h-3 w-3 animate-spin" />}</p>
              <p className="text-[11px] text-zinc-500 mt-1">{t.hint}</p>
            </button>); })}
        </div>
        {run && (
          <div className="space-y-2">
            <p className="text-xs flex items-center gap-2 text-zinc-300">
              {run.state === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" /> : run.state === 'done' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <XCircle className="h-3.5 w-3.5 text-red-400" />}
              <b className="capitalize">{run.task}</b> · {run.state === 'running' ? 'running…' : run.state === 'done' ? 'finished' : `failed${run.code !== undefined ? ` (exit ${run.code})` : ''}`}
            </p>
            <pre ref={logRef} className="rounded-xl bg-black border border-zinc-800 p-3 text-[11px] font-mono text-zinc-400 whitespace-pre-wrap break-words max-h-72 overflow-y-auto" tabIndex={0}>{run.log.join('\n') || 'Waiting for output…'}</pre>
          </div>
        )}
      </Card>

      {p.hasPackageJson && Object.keys(p.scripts).length > 0 && (
        <Card className="space-y-2">
          <h3 className="text-sm font-bold text-white">package.json scripts</h3>
          <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 overflow-hidden">
            {Object.entries(p.scripts).map(([k, v]) => <div key={k} className="flex gap-3 px-3 py-2 text-xs bg-zinc-950"><span className="font-mono text-amber-300 w-28 shrink-0 truncate">{k}</span><span className="font-mono text-zinc-400 truncate">{v}</span></div>)}
          </div>
          <p className="text-[11px] text-zinc-500">The start command is set in the Startup tab; scripts run from the console are limited to this server's resources.</p>
        </Card>
      )}
    </div>
  );
};
