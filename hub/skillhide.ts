import fs from 'node:fs';
import path from 'node:path';

/** Levels of Claude Code's `skillOverrides` setting; `on` is the default and means no entry. */
export const LEVELS = ['on', 'name-only', 'user-invocable-only', 'off'] as const;
export type Level = (typeof LEVELS)[number];
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const file = (configDir: string) => path.join(configDir, 'settings.json');

function readSettings(configDir: string): Record<string, any> {
  try { const j = JSON.parse(fs.readFileSync(file(configDir), 'utf8')); return j && typeof j === 'object' && !Array.isArray(j) ? j : {}; }
  catch (e: any) { if (e?.code === 'ENOENT') return {}; throw new Error('settings.json of this account is not valid JSON; fix it first'); }
}

/** skill name -> level, only the entries that change something. */
export function readOverrides(configDir: string): Record<string, Level> {
  try {
    const o = readSettings(configDir).skillOverrides, out: Record<string, Level> = {};
    for (const [k, v] of Object.entries<any>(o && typeof o === 'object' ? o : {})) if ((LEVELS as readonly string[]).includes(v) && v !== 'on') out[k] = v;
    return out;
  } catch { return {}; }
}

/** Sets or clears one entry; every other key of settings.json stays as it is. */
export function setOverride(configDir: string, name: string, level: string): Level {
  if (!NAME.test(name)) throw new Error('invalid skill name');
  if (!(LEVELS as readonly string[]).includes(level)) throw new Error('invalid level');
  if (!fs.existsSync(path.join(configDir, 'skills', name, 'SKILL.md'))) throw new Error(`${name} is not a skill of this account (plugin skills are managed with /plugin)`);
  const s = readSettings(configDir), o = { ...(s.skillOverrides && typeof s.skillOverrides === 'object' ? s.skillOverrides : {}) };
  if (level === 'on') delete o[name]; else o[name] = level;
  if (Object.keys(o).length) s.skillOverrides = o; else delete s.skillOverrides;
  const tmp = `${file(configDir)}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n');
  fs.renameSync(tmp, file(configDir));
  return level as Level;
}
