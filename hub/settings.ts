import fs from 'node:fs';
import path from 'node:path';

export type SkillMode = 'force' | 'auto' | 'ban';
export type SkillRule = { mode: SkillMode; when: 'every' | 'first' };
/**
 * Per-agent compaction. T18: hold = block automatic compaction until pct% of the window.
 * T18b: wakeCompact = run /compact before an offline agent is woken, once ctx >= pct% (150k without pct).
 */
export type AgentCompact = { mode: 'auto' | 'hold' | 'handoff'; pct?: number; wakeCompact?: boolean };
export type AutoJobs = {
  handoff: { enabled: boolean; thresholdK: number }; digest: { enabled: boolean; minChars: number };
  notes: { enabled: boolean; minNotes: number }; maxRunsPerDay: number;
};
export type WorkerRoute = { enabled: boolean; provider: string; model: string };   // provider/model: 'auto' or an id
const ROUTE_KINDS = ['read', 'edit', 'osin'] as const;
const autoRoute = (): WorkerRoute => ({ enabled: true, provider: 'auto', model: 'auto' });
export type Settings = {
  skills: { worker: { enabled: boolean }; osin: { enabled: boolean } };
  agentSkills: Record<string, Record<string, SkillRule>>;
  agentCompact: Record<string, AgentCompact>;   // empty = Claude Code's own behavior for everyone
  workerRoutes: Record<'read' | 'edit' | 'osin', WorkerRoute>;   // P1b: per turn type, who runs it (worker.ps1 reads this)
  reviveTools: Record<string, string[]>;   // extra tools (e.g. Edit, Write) a woken-up offline agent may use, beyond the read-only default
  autoJobs: AutoJobs; allowPaidFallback: boolean; workerCap: number; roomChat: { autoSweep: boolean }; archive: { dir: string; enabled?: boolean };   // enabled unset = on whenever dir is set
};

const FILE = 'settings.json';
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number, lo: number, hi: number) => (v == null || !Number.isFinite(Number(v)) ? d : Math.min(hi, Math.max(lo, Math.round(Number(v)))));
export const normAgent = (name: string) => String(name ?? '').trim().toLowerCase();

export function defaultSettings(envCap = 4): Settings {
  return {
    skills: { worker: { enabled: true }, osin: { enabled: true } }, agentSkills: {}, agentCompact: {}, reviveTools: {}, workerRoutes: { read: autoRoute(), edit: autoRoute(), osin: autoRoute() },
    autoJobs: { handoff: { enabled: false, thresholdK: 300 }, digest: { enabled: false, minChars: 4000 }, notes: { enabled: false, minNotes: 15 }, maxRunsPerDay: 10 },
    allowPaidFallback: false, workerCap: envCap, roomChat: { autoSweep: false }, archive: { dir: '' },
  };
}

function rules(cur: Record<string, SkillRule>, patch: any): Record<string, SkillRule> {
  if (!patch || typeof patch !== 'object') return cur;
  const out = { ...cur };
  for (const [name, r] of Object.entries<any>(patch)) {
    if (!/^[\w.-]+(:([\w.-]+|\*))?$/.test(name)) continue;   // "plugin:skill", "plugin:*" or a user skill
    if (r === null) { delete out[name]; continue; }
    if (!['force', 'auto', 'ban'].includes(r?.mode)) continue;
    if (r.mode === 'force' && name.endsWith(':*')) continue;   // force on a whole plugin would push every one of its skills each turn
    out[name] = { mode: r.mode, when: r.when === 'first' ? 'first' : 'every' };
  }
  return out;
}

export function patchSettings(s: Settings, p: any): Settings {
  const agents = { ...s.agentSkills };
  if (p?.agentSkills && typeof p.agentSkills === 'object') {
    for (const [name, r] of Object.entries<any>(p.agentSkills)) {
      const k = normAgent(name);
      if (!k) continue;
      if (r === null) { delete agents[k]; continue; }
      agents[k] = rules(agents[k] ?? {}, r);
      if (!Object.keys(agents[k]).length) delete agents[k];
    }
  }
  const compact = { ...s.agentCompact };
  if (p?.agentCompact && typeof p.agentCompact === 'object') {
    for (const [name, r] of Object.entries<any>(p.agentCompact)) {
      const k = normAgent(name);
      if (!k) continue;
      if (r === null) { delete compact[k]; continue; }
      const cur = compact[k];
      const mode = r?.mode ?? cur?.mode ?? 'auto';
      if (!['auto', 'hold', 'handoff'].includes(mode)) continue;
      const wake = bool(r?.wakeCompact, cur?.wakeCompact ?? false);
      if (mode === 'auto' && !wake) { delete compact[k]; continue; }   // Claude Code's own behavior: no entry
      // pct: hold needs one (default 70); otherwise unset means "wake compact from 150k".
      const pct = r?.pct != null || cur?.pct != null || mode === 'hold' ? int(r?.pct, cur?.pct ?? 70, 10, 85) : undefined;
      compact[k] = { mode, ...(pct != null ? { pct } : {}), ...(wake ? { wakeCompact: true } : {}) };
    }
  }
  const rt = { ...s.reviveTools };
  if (p?.reviveTools && typeof p.reviveTools === 'object') {
    for (const [name, v] of Object.entries<any>(p.reviveTools)) {
      const k = normAgent(name);
      if (!k) continue;
      const list = [...new Set((Array.isArray(v) ? v : []).map((t) => String(t).trim()).filter((t) => /^[A-Za-z]\w{0,39}$/.test(t)))].slice(0, 20);   // whole tool names only, no Bash(...) patterns
      if (list.length) rt[k] = list; else delete rt[k];
    }
  }
  const routes = {} as Settings['workerRoutes'];
  for (const k of ROUTE_KINDS) {
    const cur = s.workerRoutes?.[k] ?? autoRoute(), r = p?.workerRoutes?.[k];
    const provider = typeof r?.provider === 'string' && /^(auto|[a-z0-9-]{1,32})$/.test(r.provider) ? r.provider : cur.provider;
    const model = typeof r?.model === 'string' && /^(auto|[\w.\/:@-]{1,80})$/.test(r.model) ? r.model : provider !== cur.provider ? 'auto' : cur.model;
    routes[k] = { enabled: bool(r?.enabled, cur.enabled), provider, model: provider === 'auto' ? 'auto' : model };   // a model only means something with a provider
  }
  const aj = p?.autoJobs ?? {};
  return {
    skills: {
      worker: { enabled: bool(p?.skills?.worker?.enabled, s.skills.worker.enabled) },
      osin: { enabled: bool(p?.skills?.osin?.enabled, s.skills.osin.enabled) },
    },
    agentSkills: agents,
    agentCompact: compact,
    reviveTools: rt,
    workerRoutes: routes,
    autoJobs: {
      handoff: { enabled: bool(aj.handoff?.enabled, s.autoJobs.handoff.enabled), thresholdK: int(aj.handoff?.thresholdK, s.autoJobs.handoff.thresholdK, 50, 2000) },
      digest: { enabled: bool(aj.digest?.enabled, s.autoJobs.digest.enabled), minChars: int(aj.digest?.minChars, s.autoJobs.digest.minChars, 1000, 100_000) },
      notes: { enabled: bool(aj.notes?.enabled, s.autoJobs.notes.enabled), minNotes: int(aj.notes?.minNotes, s.autoJobs.notes.minNotes, 5, 500) },
      maxRunsPerDay: int(aj.maxRunsPerDay, s.autoJobs.maxRunsPerDay, 0, 200),
    },
    allowPaidFallback: bool(p?.allowPaidFallback, s.allowPaidFallback),
    workerCap: int(p?.workerCap, s.workerCap, 1, 16),
    roomChat: { autoSweep: bool(p?.roomChat?.autoSweep, s.roomChat.autoSweep) },
    archive: {
      dir: typeof p?.archive?.dir === 'string' ? p.archive.dir.trim() : s.archive.dir,
      ...(typeof p?.archive?.enabled === 'boolean' ? { enabled: p.archive.enabled } : s.archive.enabled === undefined ? {} : { enabled: s.archive.enabled }),
    },
  };
}

export function loadSettings(home: string, envCap = 4): Settings {
  try { return patchSettings(defaultSettings(envCap), JSON.parse(fs.readFileSync(path.join(home, FILE), 'utf8'))); }
  catch { return defaultSettings(envCap); }
}

export function saveSettings(home: string, s: Settings): void {
  fs.mkdirSync(home, { recursive: true });
  const f = path.join(home, FILE);
  fs.writeFileSync(f + '.tmp', JSON.stringify(s, null, 2));
  fs.renameSync(f + '.tmp', f);
}
