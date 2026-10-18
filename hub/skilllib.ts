import fs from 'node:fs';
import path from 'node:path';

// S1 (docs/superpowers/specs/2026-10-18-skill-role-filter-design.md): read side of the skill library.
// skill-library/index.json (built by build-index.mjs) and packs.json are read again when they change;
// "installed" means <configDir>/skills/<name> exists. Nothing here copies or runs a skill.

export type LibSkill = {
  name: string; category: string; roles: string[]; path: string; description: string;
  source: string; license: string; licenseFile?: string;
};
export type SkillPack = { id: string; vi: string; en: string; roles: string[]; skills: string[]; mode: 'auto' | 'force'; when: 'every' | 'first' };
export type Library = { skills: LibSkill[]; packs: SkillPack[]; roles: { id: string; count: number }[]; licenses: { id: string; count: number }[] };
export type SkillQuery = { role?: string; q?: string; license?: string };

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const NAME = /^(?!\.+$)[\w.-]{1,80}$/;   // a folder name: no separators, not "." or ".."
const counts = (vals: string[]) => [...vals.reduce((m, v) => m.set(v, (m.get(v) ?? 0) + 1), new Map<string, number>())]
  .map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));

function parseSkills(j: any): LibSkill[] {
  const out: LibSkill[] = [];
  for (const s of Array.isArray(j?.skills) ? j.skills : []) {
    const name = str(s?.name);
    if (!NAME.test(name)) continue;   // a name is a folder name under <configDir>/skills
    const category = str(s.category) || 'general';
    const roles = Array.isArray(s.roles) && s.roles.length ? s.roles.map(String) : [category];
    out.push({
      name, category, roles, path: str(s.path), description: str(s.description), source: str(s.source), license: str(s.license),
      ...(s.licenseFile ? { licenseFile: str(s.licenseFile) } : {}),
    });
  }
  return out;
}

function parsePacks(j: any, known: Set<string>): SkillPack[] {
  return (Array.isArray(j) ? j : []).filter((p) => NAME.test(str(p?.id))).map((p) => ({
    id: p.id, vi: str(p.vi) || p.id, en: str(p.en) || p.id,
    roles: Array.isArray(p.roles) ? p.roles.map(String) : [],
    skills: (Array.isArray(p.skills) ? p.skills.map(String) : []).filter((n: string) => known.has(n)),   // a pack never names a skill that is not in the library
    mode: p.mode === 'force' ? 'force' : 'auto', when: p.when === 'first' ? 'first' : 'every',
  }));
}

const cache = new Map<string, { stamp: string; lib: Library }>();
const EMPTY: Library = { skills: [], packs: [], roles: [], licenses: [] };
/** The library in dir (skill-library/); empty when it is missing or broken, the last good one while a file is half written. */
export function loadLibrary(dir: string): Library {
  const files = ['index.json', 'packs.json'].map((f) => path.join(dir, f));
  const stamp = files.map((f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }).join('-');
  const last = cache.get(dir);
  if (last?.stamp === stamp) return last.lib;
  try {
    const skills = parseSkills(JSON.parse(fs.readFileSync(files[0], 'utf8')));
    let packs: SkillPack[] = [];
    try { packs = parsePacks(JSON.parse(fs.readFileSync(files[1], 'utf8')), new Set(skills.map((s) => s.name))); } catch { /* no packs */ }
    const lib = { skills, packs, roles: counts(skills.flatMap((s) => s.roles)), licenses: counts(skills.map((s) => s.license || 'unknown')) };
    cache.set(dir, { stamp, lib });
    return lib;
  } catch { return last?.lib ?? EMPTY; }
}

/** Skills matching every given filter: role in roles, license equal, q in name or description (any case, all words). */
export function filterSkills(skills: LibSkill[], q: SkillQuery): LibSkill[] {
  const words = (q.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return skills.filter((s) =>
    (!q.role || s.roles.includes(q.role)) &&
    (!q.license || (s.license || 'unknown') === q.license) &&
    words.every((w) => s.name.toLowerCase().includes(w) || s.description.toLowerCase().includes(w)));
}

/** Config dirs (accounts) where <configDir>/skills/<name> exists. */
export const installedIn = (name: string, configDirs: string[]) =>
  configDirs.filter((d) => { try { return fs.statSync(path.join(d, 'skills', name)).isDirectory(); } catch { return false; } });

// ---- S2: install / remove / apply a pack. Copies files only (never runs anything), never overwrites. ----

export const MAX_SKILL_BYTES = 5 * 1024 * 1024;
export type InstallResult = { name: string; status: 'installed' | 'exists' | 'removed' | 'missing' | 'error'; error?: string };

const inside = (root: string, p: string) => { const r = path.relative(root, p); return !!r && !r.startsWith('..') && !path.isAbsolute(r); };

/** Regular files under dir (symlinks and other special files skipped), relative paths; throws past maxBytes. */
function listFiles(dir: string, maxBytes: number): string[] {
  const out: string[] = [];
  let total = 0;
  const walk = (rel: string) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) walk(r);
      else if (e.isFile()) {
        total += fs.statSync(path.join(dir, r)).size;
        if (total > maxBytes) throw new Error(`larger than ${Math.round(maxBytes / 1048576)} MB`);
        out.push(r);
      }
    }
  };
  walk('');
  return out;
}

/** Copies a library skill to <configDir>/skills/<name> (with its LICENSE) when it is not there yet. */
export function installSkill(libDir: string, s: LibSkill, configDir: string, maxBytes = MAX_SKILL_BYTES): InstallResult {
  const skills = path.join(configDir, 'skills'), dest = path.join(skills, s.name);
  try {
    if (fs.existsSync(dest)) return { name: s.name, status: 'exists' };
    const src = path.resolve(libDir, s.path);
    if (!inside(path.resolve(libDir), src) || !fs.existsSync(path.join(src, 'SKILL.md'))) return { name: s.name, status: 'error', error: 'not in the library' };
    const lic = s.licenseFile ? path.resolve(libDir, s.licenseFile) : '';
    if (!lic || !inside(path.resolve(libDir), lic) || !fs.statSync(lic, { throwIfNoEntry: false })?.isFile()) return { name: s.name, status: 'error', error: 'no LICENSE in the library' };
    const files = listFiles(src, maxBytes);
    // Written next to the target and renamed, so a failed copy never leaves a half skill that Claude Code would load.
    const tmp = path.join(skills, `.${s.name}.installing-${process.pid}`);
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const f of files) { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.copyFileSync(path.join(src, f), path.join(tmp, f)); }
    if (!files.some((f) => /^LICEN[CS]E/i.test(f))) fs.copyFileSync(lic, path.join(tmp, 'LICENSE'));
    fs.renameSync(tmp, dest);
    return { name: s.name, status: 'installed' };
  } catch (e) { return { name: s.name, status: 'error', error: (e as Error).message }; }
}

/** Removes <configDir>/skills/<name>, only for a skill name of the library. */
export function removeSkill(s: LibSkill, configDir: string): InstallResult {
  const skills = path.join(configDir, 'skills'), dest = path.join(skills, s.name);
  try {
    if (!inside(skills, dest) || !fs.existsSync(dest)) return { name: s.name, status: 'missing' };
    fs.rmSync(dest, { recursive: true, force: true });
    return { name: s.name, status: 'removed' };
  } catch (e) { return { name: s.name, status: 'error', error: (e as Error).message }; }
}

/** settings.agentSkills patch that turns the pack on for agent: only skills installed on the agent's account; the others are reported. */
export function packPatch(pack: SkillPack, agent: string, installed: (name: string) => boolean) {
  const on = pack.skills.filter(installed);
  return {
    patch: { agentSkills: { [agent]: Object.fromEntries(on.map((n) => [n, { mode: pack.mode, when: pack.when }])) } },
    applied: on, notInstalled: pack.skills.filter((n) => !on.includes(n)),
  };
}
