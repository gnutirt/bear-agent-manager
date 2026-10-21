import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renameRetry } from './atomic.ts';

export type SkillMode = 'force' | 'auto' | 'ban';
export type SkillRule = { mode: SkillMode; when: 'every' | 'first' };
/** 'terse' asks agents to write to each other in BAMshort (short status/handoff lines); 'off' leaves their style alone. */
export type AgentComms = 'off' | 'terse';
const agentComms = (v: unknown): AgentComms | undefined =>
  v === 'terse' || v === 'en' || v === 'en-terse' ? 'terse' : v === 'off' ? 'off' : undefined;   // 'en'/'en-terse' were older saved values: an English-only style was dropped, both mean terse now
/**
 * Per-agent compaction. T18: hold = block automatic compaction until pct% of the window.
 * T18b: wakeCompact = run /compact before an offline agent is woken, once ctx >= pct% (150k without pct).
 */
export type AgentCompact = { mode: 'auto' | 'hold' | 'handoff'; pct?: number; wakeCompact?: boolean };
/** T18c: role-based wakeCompact fallback for an agent with no agentCompact rule of its own. */
export type CompactThresholds = { enabled: boolean; lead: number; member: number; background: number };
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
  compact: { thresholds: CompactThresholds; onTaskDone: boolean };   // T18c: wakeCompact fallback by room role, for an agent with no agentCompact rule; #79 onTaskDone: a task done/blocked compacts its owner's chat past the role threshold
  workerRoutes: Record<'read' | 'edit' | 'osin', WorkerRoute>;   // P1b: per turn type, who runs it (worker.ps1 reads this)
  lead: { wake: { enabled: boolean; atPct: number; afterResetMin: number }; delegate: boolean; distribute: boolean; handoffOnDone: boolean; idleMin: number };   // P2: what the lead prompt asks of a room lead   // T-C: when an account's 5-hour usage is nearly used up, wake its agents after the reset
  agentModel: Record<string, string>;   // --model for the background turns (revive, compact) of an agent; none = Claude Code's default
  autoUpdatePlugin: boolean;   // the hub keeps this plugin's copy in every Claude account at the hub's version (no button)
  agents: { maxBackground: number; profiles: AgentProfile[]; autoRevive: boolean };   // maxBackground: background claudes at once, for agents created without an IDE (POST /api/agents); profiles: headless provider agents (M3b); autoRevive: resume a closed or limit-killed chat when a room message wakes it (on)
  copilot: { autoStart: boolean };   // legacy single Copilot toggle, kept until hub/server.ts reads agents.profiles (M3a); migrated into profile 'copilot'
  localSummarize: LocalSummarize;   // summaries by an AI on this machine (Ollama); off by default
  permissions: Permissions;   // what the claude processes the hub starts itself (background wake) may do; per agent overrides
  reviveTools: Record<string, string[]>;   // extra tools (e.g. Edit, Write) a woken-up offline agent may use, beyond the read-only default
  autoLead: 'off' | 'terminal';   // T19: open a lead terminal when a room has no lead (the user presses Enter)
  accountSwitch: { mode: 'off' | 'ask' | 'auto'; atPct: number; minOtherLeftPct: number; autoOnWake: boolean };   // autoOnWake: a wake blocked by the limit runs on the other account without asking   // D2: move an agent to another Claude account when its own runs out
  closeLimitedTab: boolean;   // a tab stuck after a usage limit is closed at wake time so the agent comes back in the background
  mirrorTabs: boolean;   // B1: a turn typed in an agent's own tab is copied into its private chat
  relayChat: boolean;   // safety net: an answer an agent left in its own chat after a room wake is posted to the room
  agentComms: AgentComms;   // optional style guidance for agent-to-agent room communication
  language: 'auto' | 'vi' | 'en';   // I1: UI and hub notices; auto = this computer's locale
  openTabOnWake: boolean;   // T-W: a member that cannot be resumed in the background gets its tab opened (the user presses Enter)
  updates: { check: boolean };   // V1: look for a newer GitHub release every 6 hours
  autoJobs: AutoJobs; allowPaidFallback: boolean; workerCap: number; roomChat: { autoSweep: boolean }; archive: { dir: string; enabled?: boolean };   // enabled unset = on whenever dir is set
};

const FILE = 'settings.json';
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number, lo: number, hi: number) => (v == null || !Number.isFinite(Number(v)) ? d : Math.min(hi, Math.max(lo, Math.round(Number(v)))));
export const normAgent = (name: string) => String(name ?? '').trim().toLowerCase();

export type LocalSummarize = { enabled: boolean; host: string; model: string; numCtx: number; timeoutSec: number; maxChars: number };
const httpUrl = (v: unknown, cur: string) => { try { const u = new URL(String(v)); return u.protocol === 'http:' || u.protocol === 'https:' ? `${u.protocol}//${u.host}` : cur; } catch { return cur; } };
export const PERM_MODES = ['bypass', 'acceptEdits', 'default', 'plan'] as const;
export type PermMode = (typeof PERM_MODES)[number];
export type PermRule = { mode: PermMode; allow: string[]; deny: string[] };
export type Permissions = { default: PermRule; perAgent: Record<string, Partial<PermRule>> };
/** One tool spec for --allowedTools / --disallowedTools ("Edit", "Bash(git push:*)", "mcp__x__y"). No quotes or shell characters: it ends up on a command line. */
const TOOL_SPEC = /^[A-Za-z][\w .:*()\/@,-]{0,119}$/;   // no backslash: a trailing one would escape the closing quote on a Windows command line
const toolList = (v: unknown, cur: string[]) => (Array.isArray(v) ? [...new Set(v.map((t) => String(t).trim()).filter((t) => TOOL_SPEC.test(t)))].slice(0, 60) : cur);

/** The rule for one agent: its own entry over the default; an agent that only has the old reviveTools list keeps that choice (default mode + those tools). */
export function permFor(s: Settings, agent: string): PermRule {
  const k = normAgent(agent), d = s.permissions.default, o = s.permissions.perAgent[k];
  if (!o && s.reviveTools[k]?.length) return { mode: 'default', allow: s.reviveTools[k], deny: d.deny };
  return { mode: o?.mode ?? d.mode, allow: o?.allow ?? d.allow, deny: o?.deny ?? d.deny };
}

/** M3b: one headless provider agent (data, not code) - see docs/superpowers/specs/2026-10-19-headless-agent-profiles.md */
// 'claude-api': a headless claude on a providers.json provider (providerId) and model; outside this machine it is read-only unless the tier is local and edit is on.
export type AgentProfile = { id: string; provider: 'copilot' | 'claude-api'; name: string; cwd: string; home?: string; enabled: boolean; providerId?: string; model?: string; edit?: boolean };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localAbs = (v: unknown): v is string => typeof v === 'string' && path.isAbsolute(v) && !/^[\\/]{2}/.test(v);   // absolute local path, not a network share

/** A drive root or the home folder: too broad to run an unattended agent in. */
export const isWideWorkspace = (real: string): boolean => path.relative(path.parse(real).root, real) === '' || path.resolve(real).toLowerCase() === os.homedir().toLowerCase();

/**
 * The real path of a workspace folder: absolute, local (also after a link is followed, so a junction cannot lead to a network share), an existing directory.
 * A link is taken as its TARGET, so a link can never stand in for a known folder. Root and home are refused unless allowWide (a person confirmed it). Throws with the reason.
 */
export function resolveWorkspace(asked: unknown, allowWide = false): string {
  if (!localAbs(asked)) throw new Error('cwd must be an absolute local folder');
  let real: string;
  try { real = fs.realpathSync(asked); if (!fs.statSync(real).isDirectory()) throw new Error('not a folder'); }
  catch { throw new Error(`not a folder: ${String(asked).slice(0, 200)}`); }
  if (!localAbs(real)) throw new Error('cwd must be an absolute local folder (a link leads to a network share)');
  if (!allowWide && isWideWorkspace(real)) throw new Error('cwd must not be a drive root or the home folder');
  return real;
}

export type AgentProfileError = { index: number; id: string; field: string; reason: string };
type ProfileResult = { profiles: AgentProfile[]; errors: AgentProfileError[] };
/** Keeps valid profiles for saved settings and reports every invalid field so an API patch can reject it atomically. */
function profilesOf(raw: unknown, cur: AgentProfile[]): ProfileResult {
  if (!Array.isArray(raw)) return { profiles: cur, errors: [{ index: 0, id: '', field: 'profiles', reason: 'must be an array' }] };
  const out: AgentProfile[] = [], ids = new Set<string>(), names = new Set<string>();
  const errors: AgentProfileError[] = [];
  for (const [index, r] of raw.slice(0, 16).entries()) {
    const id = typeof r?.id === 'string' ? r.id.trim().toLowerCase() : '', name = typeof r?.name === 'string' ? r.name.trim() : '';
    const api = r?.provider === 'claude-api', providerId = typeof r?.providerId === 'string' ? r.providerId.trim() : '', model = typeof r?.model === 'string' ? r.model.trim() : '';
    const safeId = /^[a-z0-9][a-z0-9-]{0,31}$/.test(id) ? id : '';
    const fail = (field: string, reason: string) => errors.push({ index, id: safeId, field, reason });
    if (!r || typeof r !== 'object' || Array.isArray(r)) { fail('profile', 'must be an object'); continue; }
    let unusable = false;
    if (!safeId) { fail('id', 'must be 1-32 lowercase letters, digits, or hyphens and start with a letter or digit'); unusable = true; }
    if (!/^[\w.-]{1,40}$/.test(name)) { fail('name', 'must be 1-40 letters, digits, dots, underscores, or hyphens'); unusable = true; }
    if (r.provider !== 'copilot' && !api) { fail('provider', 'must be copilot or claude-api'); unusable = true; }
    if (!localAbs(r.cwd)) { fail('cwd', 'must be an absolute local folder, not a network share'); unusable = true; }
    if (api && !/^[\w-]{1,32}$/.test(providerId)) { fail('providerId', 'must be 1-32 letters, digits, underscores, or hyphens'); unusable = true; }
    if (model && !/^[\w.:\/-]{1,80}$/.test(model)) { fail('model', 'must be 1-80 letters, digits, _, ., :, /, or -'); unusable = true; }
    if (r.home != null && r.home !== '' && !localAbs(r.home)) fail('home', 'must be an absolute local folder, not a network share');
    if (r.enabled != null && typeof r.enabled !== 'boolean') fail('enabled', 'must be true or false');
    if (r.edit != null && typeof r.edit !== 'boolean') fail('edit', 'must be true or false');
    if (safeId && ids.has(safeId)) { fail('id', 'must be unique'); unusable = true; }
    if (name && names.has(normAgent(name))) { fail('name', 'must be unique'); unusable = true; }
    if (unusable) continue;
    ids.add(id); names.add(normAgent(name));
    out.push({ id, provider: api ? 'claude-api' : 'copilot', name, cwd: path.resolve(r.cwd), ...(localAbs(r.home) ? { home: path.resolve(r.home) } : {}), enabled: r.enabled === true,
      ...(model ? { model } : {}), ...(api ? { providerId, ...(r.edit === true ? { edit: true } : {}) } : {}) });
  }
  if (raw.length > 16) errors.push({ index: 16, id: '', field: 'profiles', reason: 'at most 16 profiles are allowed' });
  return { profiles: out, errors };
}
export function validateAgentProfiles(raw: unknown): AgentProfileError[] { return profilesOf(raw, []).errors; }

/** An install from before profiles: copilot.autoStart becomes the one profile 'copilot' (cwd = the hub's repo), so nothing needs doing by hand. */
function migrateProfiles(raw: any): any {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw?.agents?.profiles) || typeof raw?.copilot?.autoStart !== 'boolean') return raw;
  return { ...raw, agents: { ...(raw.agents ?? {}), profiles: [{ id: 'copilot', provider: 'copilot', name: 'Copilot', cwd: ROOT, enabled: raw.copilot.autoStart }] } };
}

export function defaultSettings(envCap = 4): Settings {
  return {
    skills: { worker: { enabled: true }, osin: { enabled: true } }, agentSkills: {}, agentCompact: {}, compact: { thresholds: { enabled: true, lead: 200_000, member: 100_000, background: 100_000 }, onTaskDone: true }, permissions: { default: { mode: 'bypass', allow: [], deny: [] }, perAgent: { copilot: { mode: 'acceptEdits' } } }, autoUpdatePlugin: true, agents: { maxBackground: 4, profiles: [], autoRevive: true }, copilot: { autoStart: false }, localSummarize: { enabled: false, host: 'http://127.0.0.1:11434', model: 'qwen2.5:7b', numCtx: 8192, timeoutSec: 120, maxChars: 24000 }, reviveTools: {}, agentModel: {}, lead: { wake: { enabled: true, atPct: 90, afterResetMin: 2 }, delegate: true, distribute: true, handoffOnDone: true, idleMin: 30 }, workerRoutes: { read: autoRoute(), edit: autoRoute(), osin: autoRoute() }, autoLead: 'off', mirrorTabs: true, relayChat: true, agentComms: 'off', closeLimitedTab: true, accountSwitch: { mode: 'ask', atPct: 90, minOtherLeftPct: 20, autoOnWake: true }, language: 'auto', openTabOnWake: false, updates: { check: true },
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
  const ct = p?.compact?.thresholds ?? {};
  const compactThresholds: CompactThresholds = {
    enabled: bool(ct.enabled, s.compact.thresholds.enabled),
    lead: int(ct.lead, s.compact.thresholds.lead, 10_000, 1_000_000),
    member: int(ct.member, s.compact.thresholds.member, 10_000, 1_000_000),
    background: int(ct.background, s.compact.thresholds.background, 10_000, 1_000_000),
  };
  const rt = { ...s.reviveTools };
  if (p?.reviveTools && typeof p.reviveTools === 'object') {
    for (const [name, v] of Object.entries<any>(p.reviveTools)) {
      const k = normAgent(name);
      if (!k) continue;
      const list = [...new Set((Array.isArray(v) ? v : []).map((t) => String(t).trim()).filter((t) => /^[A-Za-z]\w{0,39}$/.test(t)))].slice(0, 20);   // whole tool names only, no Bash(...) patterns
      if (list.length) rt[k] = list; else delete rt[k];
    }
  }
  const perm: Permissions = { default: { ...s.permissions.default }, perAgent: { ...s.permissions.perAgent } };
  if (p?.permissions && typeof p.permissions === 'object') {
    const pd = p.permissions.default;
    if (pd && typeof pd === 'object') {
      perm.default = { mode: PERM_MODES.includes(pd.mode) ? pd.mode : perm.default.mode, allow: toolList(pd.allow, perm.default.allow), deny: toolList(pd.deny, perm.default.deny) };
    }
    if (p.permissions.perAgent && typeof p.permissions.perAgent === 'object') {
      for (const [name, v] of Object.entries<any>(p.permissions.perAgent)) {
        const k = normAgent(name);
        if (!k) continue;
        if (v === null) { delete perm.perAgent[k]; continue; }
        const cur = perm.perAgent[k] ?? {}, next: Partial<PermRule> = { ...cur };
        if (PERM_MODES.includes(v?.mode)) next.mode = v.mode; else if (v?.mode === null) delete next.mode;
        if (Array.isArray(v?.allow)) next.allow = toolList(v.allow, []); else if (v?.allow === null) delete next.allow;
        if (Array.isArray(v?.deny)) next.deny = toolList(v.deny, []); else if (v?.deny === null) delete next.deny;
        if (Object.keys(next).length) perm.perAgent[k] = next; else delete perm.perAgent[k];
      }
    }
  }
  const am = { ...s.agentModel };
  if (p?.agentModel && typeof p.agentModel === 'object') {
    for (const [name, v] of Object.entries<any>(p.agentModel)) {
      const k = normAgent(name), m = typeof v === 'string' ? v.trim() : '';
      if (!k) continue;
      if (!m) delete am[k]; else if (/^[\w.\/:@\[\]-]{1,80}$/.test(m)) am[k] = m;   // model id or alias (sonnet, opus[1m], claude-sonnet-5-5)
    }
  }
  const lw = p?.lead?.wake ?? {};
  const lead = {
    wake: { enabled: bool(lw.enabled, s.lead.wake.enabled), atPct: int(lw.atPct, s.lead.wake.atPct, 50, 100), afterResetMin: int(lw.afterResetMin, s.lead.wake.afterResetMin, 0, 120) },
    delegate: bool(p?.lead?.delegate, s.lead.delegate ?? true), distribute: bool(p?.lead?.distribute, s.lead.distribute ?? true), handoffOnDone: bool(p?.lead?.handoffOnDone, s.lead.handoffOnDone ?? true),
    idleMin: int(p?.lead?.idleMin, s.lead.idleMin ?? 30, 1, 240),   // a woken agent stays alive this long after its last turn
  };
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
    compact: { thresholds: compactThresholds, onTaskDone: bool(p?.compact?.onTaskDone, s.compact.onTaskDone ?? true) },
    permissions: perm,
    autoUpdatePlugin: bool(p?.autoUpdatePlugin, s.autoUpdatePlugin ?? true),
    agents: { maxBackground: int(p?.agents?.maxBackground, s.agents?.maxBackground ?? 4, 1, 16), profiles: profilesOf(p?.agents?.profiles, s.agents?.profiles ?? []).profiles, autoRevive: bool(p?.agents?.autoRevive, s.agents?.autoRevive ?? true) },
    copilot: { autoStart: bool(p?.copilot?.autoStart, s.copilot?.autoStart ?? false) },
    localSummarize: {
      enabled: bool(p?.localSummarize?.enabled, s.localSummarize.enabled),
      host: httpUrl(p?.localSummarize?.host, s.localSummarize.host),
      model: typeof p?.localSummarize?.model === 'string' && /^[\w.:\/-]{1,80}$/.test(p.localSummarize.model.trim()) ? p.localSummarize.model.trim() : s.localSummarize.model,
      numCtx: int(p?.localSummarize?.numCtx, s.localSummarize.numCtx, 1024, 131072),
      timeoutSec: int(p?.localSummarize?.timeoutSec, s.localSummarize.timeoutSec, 5, 900),
      maxChars: int(p?.localSummarize?.maxChars, s.localSummarize.maxChars, 1000, 200000),
    },
    reviveTools: rt,
    agentModel: am,
    lead,
    workerRoutes: routes,
    autoLead: p?.autoLead === 'terminal' || p?.autoLead === 'off' ? p.autoLead : s.autoLead,
    mirrorTabs: bool(p?.mirrorTabs, s.mirrorTabs ?? true),
    relayChat: bool(p?.relayChat, s.relayChat ?? true),
    agentComms: agentComms(p?.agentComms) ?? agentComms(s.agentComms) ?? 'off',
    closeLimitedTab: bool(p?.closeLimitedTab, s.closeLimitedTab ?? true),
    accountSwitch: {
      mode: ['off', 'ask', 'auto'].includes(p?.accountSwitch?.mode) ? p.accountSwitch.mode : s.accountSwitch?.mode ?? 'ask',
      atPct: int(p?.accountSwitch?.atPct, s.accountSwitch?.atPct ?? 90, 50, 100),
      minOtherLeftPct: int(p?.accountSwitch?.minOtherLeftPct, s.accountSwitch?.minOtherLeftPct ?? 20, 5, 90),
      autoOnWake: bool(p?.accountSwitch?.autoOnWake, s.accountSwitch?.autoOnWake ?? true),
    },
    language: ['auto', 'vi', 'en'].includes(p?.language) ? p.language : s.language ?? 'auto',
    openTabOnWake: bool(p?.openTabOnWake, s.openTabOnWake ?? false),
    updates: { check: bool(p?.updates?.check, s.updates?.check ?? true) },
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
  try { return patchSettings(defaultSettings(envCap), migrateProfiles(JSON.parse(fs.readFileSync(path.join(home, FILE), 'utf8')))); }
  catch { return defaultSettings(envCap); }
}

export function saveSettings(home: string, s: Settings): void {
  fs.mkdirSync(home, { recursive: true });
  const f = path.join(home, FILE);
  fs.writeFileSync(f + '.tmp', JSON.stringify(s, null, 2));
  renameRetry(f + '.tmp', f);
}
