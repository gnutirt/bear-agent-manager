// Lists library skills whose name is already used by a skill installed on this machine (both accounts, plugin caches, this repo's plugin).
// GIỐNG = same SKILL.md, KHÁC = same name, different content (Claude may load the wrong one). Run: node skill-library/check-installed.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const libDir = dirname(fileURLToPath(import.meta.url));
const home = process.env.USERPROFILE || process.env.HOME;
const lib = JSON.parse(readFileSync(join(libDir, 'index.json'), 'utf8')).skills;
const byName = new Map(lib.map(s => [s.name, s]));
const hash = f => createHash('sha1').update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex').slice(0, 8);
function walk(dir, depth, out) {
  if (depth < 0 || !existsSync(dir)) return out;
  let ents; try { ents = readdirSync(dir); } catch { return out; }
  for (const e of ents) {
    if (e === 'node_modules' || e === '.git') continue;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, depth - 1, out); else if (e === 'SKILL.md') out.push(p);
  }
  return out;
}
const name = f => (readFileSync(f, 'utf8').match(/^name:\s*["']?([^"'\r\n]+)/m) || [])[1]?.trim();
const roots = [
  ['vscode skills', join(home, '.claude', 'skills'), 4],
  ['antigravity skills', join(home, '.claude-antigravity', 'skills'), 4],
  ['vscode plugins', join(home, '.claude', 'plugins', 'cache'), 7],
  ['antigravity plugins', join(home, '.claude-antigravity', 'plugins', 'cache'), 7],
  ['repo plugin', join(libDir, '..', 'skills'), 2],
];
for (const [label, dir, depth] of roots) {
  for (const f of walk(dir, depth, [])) {
    const n = name(f); if (!n || !byName.has(n)) continue;
    const s = byName.get(n);
    const same = hash(f) === hash(join(libDir, s.path, 'SKILL.md'));
    console.log([label, n, same ? 'GIỐNG' : 'KHÁC', f.replace(home, '~'), s.path].join(' | '));
  }
}
