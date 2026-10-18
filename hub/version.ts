import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// V1 (docs/superpowers/specs/2026-10-18-versioning-updates-design.md): the hub knows its own version, the
// version of the plugin copies Claude Code runs the hooks from, and the latest GitHub release of its repo.
// Nothing is downloaded or run here: the check reads one JSON document and sends no user data.

export type Release = { latest: string; url: string; notes: string; etag?: string; checkedAt: number; error?: string };
export type PluginCopy = { configDir: string; version: string; path: string };
export type GitState = { git: boolean; remoteOk: boolean; clean: boolean };
export type VersionInfo = {
  current: string; repo: string | null; latest: string | null; url: string | null; notes: string;
  checkedAt: number | null; error?: string; newer: boolean; check: boolean;
  plugins: PluginCopy[]; mismatch: boolean;   // a plugin copy older/newer than the hub: hooks and MCP run old code until the plugin is updated
  canApply: boolean; reason: 'ok' | 'up-to-date' | 'not-git' | 'other-remote' | 'dirty' | 'unchecked';
};

export const CHECK_EVERY_MS = 6 * 60 * 60_000;
const MAX_NOTES = 20_000;

const SEMVER = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
export const isSemver = (v: unknown): v is string => typeof v === 'string' && SEMVER.test(v.trim());
/** Semver order: <0 when a is older than b. A prerelease is older than its release; prereleases compare as text. */
export function cmpSemver(a: string, b: string): number {
  const pa = SEMVER.exec(a.trim()), pb = SEMVER.exec(b.trim());
  if (!pa || !pb) return 0;
  for (let i = 1; i <= 3; i++) if (Number(pa[i]) !== Number(pb[i])) return Number(pa[i]) - Number(pb[i]);
  if (!pa[4] !== !pb[4]) return pa[4] ? -1 : 1;
  return (pa[4] ?? '').localeCompare(pb[4] ?? '');
}

/** "owner/name" from package.json `repository` (string shorthand, github: prefix, URL, or { url }); null when it is not on GitHub. */
export function repoSlug(repository: unknown): string | null {
  const s = typeof repository === 'string' ? repository : typeof (repository as any)?.url === 'string' ? (repository as any).url : '';
  const m = /^(?:github:)?([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(s) ?? /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(s);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function readPackage(root: string): { version: string; repo: string | null } {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    return { version: isSemver(p.version) ? p.version : '0.0.0', repo: repoSlug(p.repository) };
  } catch { return { version: '0.0.0', repo: null }; }
}

/** The bear-agent-manager copies installed in each Claude config dir (the hooks and MCP of that account run from them). */
export function pluginCopies(configDirs: string[], name = 'bear-agent-manager'): PluginCopy[] {
  const out: PluginCopy[] = [], seen = new Set<string>();
  for (const dir of configDirs) {
    let j: any;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), 'utf8')); } catch { continue; }
    for (const [key, list] of Object.entries<any>(j?.plugins ?? {})) {
      if (key.split('@')[0] !== name || !Array.isArray(list)) continue;
      for (const e of list) {
        const p = typeof e?.installPath === 'string' ? e.installPath : '';
        if (!p || seen.has(dir + '|' + p)) continue;
        seen.add(dir + '|' + p);
        let version = typeof e.version === 'string' ? e.version : '';
        try { version = JSON.parse(fs.readFileSync(path.join(p, '.claude-plugin', 'plugin.json'), 'utf8')).version ?? version; } catch { /* the record's version */ }
        out.push({ configDir: dir, version, path: p });
      }
    }
  }
  return out;
}

const git = (root: string, args: string[]) => new Promise<string>((resolve, reject) =>
  execFile('git', ['-C', root, ...args], { windowsHide: true, timeout: 10_000 }, (err, out) => (err ? reject(err) : resolve(String(out)))));
/** Whether `git merge --ff-only` could update root: a git checkout of this repo with no uncommitted changes. */
export async function gitState(root: string, slug: string | null): Promise<GitState> {
  try { await git(root, ['rev-parse', '--is-inside-work-tree']); } catch { return { git: false, remoteOk: false, clean: false }; }
  const remote = await git(root, ['remote', 'get-url', 'origin']).catch(() => '');
  const clean = (await git(root, ['status', '--porcelain', '--untracked-files=no']).catch(() => 'x')).trim() === '';
  return { git: true, remoteOk: !!slug && repoSlug(remote.trim())?.toLowerCase() === slug.toLowerCase(), clean };
}

/** Latest GitHub release of the repo, cached in cacheFile; asks GitHub at most once per CHECK_EVERY_MS unless forced, with the ETag. */
export class UpdateChecker {
  private last: Release | null = null;
  private o: { repo: string | null; version: string; cacheFile: string; fetch: typeof fetch; now?: () => number };
  constructor(o: UpdateChecker['o']) {
    this.o = o;
    try { const c = JSON.parse(fs.readFileSync(o.cacheFile, 'utf8')); if (isSemver(c?.latest)) this.last = c; } catch { /* first run */ }
  }
  private now() { return (this.o.now ?? Date.now)(); }
  cached(): Release | null { return this.last; }

  async check(force = false): Promise<Release | null> {
    if (!this.o.repo) return this.last;
    if (!force && this.last && this.now() - this.last.checkedAt < CHECK_EVERY_MS) return this.last;
    const headers: Record<string, string> = { accept: 'application/vnd.github+json', 'user-agent': `bear-agent-manager/${this.o.version}` };
    if (this.last?.etag) headers['if-none-match'] = this.last.etag;
    let next: Release | null = this.last;
    try {
      const res = await this.o.fetch(`https://api.github.com/repos/${this.o.repo}/releases/latest`, { headers, signal: AbortSignal.timeout(15_000) });
      if (res.status === 304 && this.last) next = { ...this.last, checkedAt: this.now(), error: undefined };
      else if (res.status === 404) next = { latest: '', url: '', notes: '', checkedAt: this.now() };   // no release published yet
      else if (!res.ok) throw new Error(`GitHub ${res.status}`);
      else {
        const r: any = await res.json();
        const tag = String(r?.tag_name ?? '');
        if (r?.draft || r?.prerelease || !isSemver(tag)) throw new Error(`not a release: ${tag || '(no tag)'}`);
        next = {
          latest: tag.replace(/^v/, ''), url: typeof r.html_url === 'string' && r.html_url.startsWith('https://github.com/') ? r.html_url : '',
          notes: String(r.body ?? '').slice(0, MAX_NOTES), etag: res.headers.get('etag') ?? undefined, checkedAt: this.now(),
        };
      }
    } catch (e) {
      // A network error keeps the last result; checkedAt moves on so a dead network is not asked on every request.
      next = { ...(this.last ?? { latest: '', url: '', notes: '' }), checkedAt: this.now(), error: (e as Error).message };
    }
    this.last = next;
    try { fs.mkdirSync(path.dirname(this.o.cacheFile), { recursive: true }); fs.writeFileSync(this.o.cacheFile, JSON.stringify(next)); } catch { /* memory only */ }
    return next;
  }
}

export function versionInfo(current: string, repo: string | null, rel: Release | null, plugins: PluginCopy[], g: GitState, check: boolean): VersionInfo {
  const latest = rel?.latest || null;
  const newer = !!latest && cmpSemver(latest, current) > 0;
  const reason: VersionInfo['reason'] = !latest ? 'unchecked' : !newer ? 'up-to-date' : !g.git ? 'not-git' : !g.remoteOk ? 'other-remote' : !g.clean ? 'dirty' : 'ok';
  return {
    current, repo, latest, url: rel?.url || null, notes: rel?.notes ?? '', checkedAt: rel?.checkedAt ?? null, ...(rel?.error ? { error: rel.error } : {}),
    newer, check, plugins, mismatch: plugins.some((p) => p.version !== current), canApply: reason === 'ok', reason,
  };
}
