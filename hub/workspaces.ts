import fs from 'node:fs';
import path from 'node:path';
import { projectSlug } from './apiagent.ts';

// T3 (#274): the chats of this machine grouped by the folder they belong to. A Claude chat lives in
// <configDir>/projects/<slug(cwd)>/, whoever started it (VS Code tab, Antigravity tab, a background BAM wake), so the
// folder is the real topic and the same chat must not look like two. Only names and timestamps here: transcript
// contents are never read, and a chat that never reached a room is only counted. The route lives in hub/server.ts
// (GET /api/workspaces) and the screen is the "Thư mục" tab (ui/index.html).

export type HolderWhere = 'vscode' | 'antigravity' | 'cursor' | 'cli' | 'bam' | 'none';
/** Where a chat is held right now. T2's holderOf returns this shape; T3 falls back to the session's own data. */
export type Holder = { where: HolderWhere; account?: string; pid?: number; count: number };

/** The part of Session this screen needs (hub/store.ts:Session). */
export type WorkspaceSessionInput = {
  id: string; name: string; cwd: string; rooms?: Record<string, number>; status?: string; activity?: string;
  lastSeen?: number; ide?: string; pid?: number; pids?: { pid: number; headless: boolean; at?: number }[];
  transcript?: string; configDir?: string;
};
export type WorkspaceSession = {
  id: string; name: string; rooms: string[]; status?: string; activity?: string; lastSeen?: number;
  holder: Holder; account?: string; email?: string; hasTranscript: boolean;
};
export type Workspace = {
  /** normalised cwd, the grouping key */
  key: string;
  /** a real spelling of the folder (the first session's, junctions resolved) */
  cwd: string;
  sessions: WorkspaceSession[];
  /** chats in projects/<slug> that belong to no hub session: counted and dated, never opened */
  unregistered: { count: number; newest?: number };
};
export type WorkspacesOptions = {
  sessions: WorkspaceSessionInput[];
  /** Claude config dirs whose projects/<slug> folders hold chats (typically ~/.claude plus every account) */
  configDirs?: string[];
  /** T2: where the chat is held; defaults to a look at its live pids */
  holderOf?: (s: WorkspaceSessionInput) => Holder;
  /** T1: account email for a config dir (never a token) */
  emailOf?: (configDir?: string) => string | undefined;
};

const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };

/** The hub's way of deciding two folders are the same: junctions resolved, no trailing separator, lowercase on Windows. */
export function normCwd(cwd: string): string {
  let p = String(cwd ?? '').trim();
  if (!p) return '';
  try { p = fs.realpathSync.native(p); } catch { p = path.resolve(p); }
  p = p.replace(/[\/]+$/, '');
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

/** T3 fallback until T2 lands: a live pid knows whether a background wake or an editor tab is holding the chat. */
export function sessionHolder(s: WorkspaceSessionInput, now = Date.now()): Holder {
  const pids = (s.pids ?? []).filter((p) => alive(p.pid));
  if (s.pid && !pids.some((p) => p.pid === s.pid) && alive(s.pid)) pids.push({ pid: s.pid, headless: false });
  if (!pids.length) return { where: 'none', account: s.configDir, count: 0 };
  const allBg = pids.every((p) => p.headless);
  const ide = s.ide as HolderWhere | undefined;
  return {
    where: allBg ? 'bam' : ide && ide !== '' ? ide : 'cli',
    account: s.configDir, pid: pids[0].pid, count: pids.length,
  };
}

/** Both spellings of the drive letter (note [46]): the slug keeps case, so d:\ and D:\ give different folders. */
const slugVariants = (cwd: string): string[] => {
  const flip = cwd.replace(/^([a-zA-Z]):/, (_m, d: string) => (d === d.toLowerCase() ? d.toUpperCase() : d.toLowerCase()) + ':');
  return [...new Set([cwd, flip].map((c) => projectSlug(c)))];
};

export function buildWorkspaces(o: WorkspacesOptions): Workspace[] {
  const holder = o.holderOf ?? ((s: WorkspaceSessionInput) => sessionHolder(s));
  const hubIds = new Set(o.sessions.map((s) => s.id));
  type Group = { key: string; cwd: string; cwds: string[]; sessions: WorkspaceSession[] };
  const groups = new Map<string, Group>();
  for (const s of o.sessions) {
    const key = normCwd(s.cwd);
    if (!key) continue;
    let g = groups.get(key);
    if (!g) { g = { key, cwd: safeReal(s.cwd), cwds: [], sessions: [] }; groups.set(key, g); }
    g.cwds.push(s.cwd);
    g.sessions.push({
      id: s.id, name: s.name, rooms: Object.keys(s.rooms ?? {}).sort(), status: s.status, activity: s.activity, lastSeen: s.lastSeen,
      holder: holder(s), account: s.configDir, email: o.emailOf?.(s.configDir),
      hasTranscript: !!s.transcript && fs.existsSync(s.transcript),
    });
  }
  const dirs = [...new Set((o.configDirs ?? []).filter(Boolean).map(safeReal))];
  const out: Workspace[] = [];
  for (const g of groups.values()) {
    // every spelling of every cwd in the group, then the same folder through each config dir (sharing makes them one)
    const folders = new Set<string>();
    for (const cwd of g.cwds) for (const slug of slugVariants(cwd)) for (const d of dirs) folders.add(safeReal(path.join(d, 'projects', slug)));
    const seen = new Set<string>();
    let count = 0, newest: number | undefined;
    for (const folder of folders) {
      if (seen.has(folder) || !folder) continue;
      seen.add(folder);
      let names: string[] = [];
      try { names = fs.readdirSync(folder); } catch { continue; }
      for (const f of names) {
        if (!f.endsWith('.jsonl') || hubIds.has(f.slice(0, -'.jsonl'.length))) continue;
        count++;
        try { const m = fs.statSync(path.join(folder, f)).mtimeMs; if (newest === undefined || m > newest) newest = m; } catch { /* vanished */ }
      }
    }
    g.sessions.sort((a, b) => (b.lastSeen ?? 0) - (a.lastSeen ?? 0) || a.name.localeCompare(b.name));
    out.push({ key: g.key, cwd: g.cwd ?? g.key, sessions: g.sessions, unregistered: { count, newest } });
  }
  return out.sort((a, b) => a.cwd.localeCompare(b.cwd));
}

const safeReal = (p: string): string => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
