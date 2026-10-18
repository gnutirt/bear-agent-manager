// Regenerates index.json from every SKILL.md under skill-library/. Run: node skill-library/build-index.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const sources = {
  'banking/anthropic-financial-services': ['https://github.com/anthropics/financial-services-plugins', 'Apache-2.0'],
  'banking/casemark': ['https://github.com/CaseMark/skills', 'Apache-2.0'],
  'banking/second-line': ['https://github.com/anotb/second-line-financial-services', 'MIT'],
  'banking/finance-skills': ['https://github.com/JoelLewis/finance_skills', 'MIT'],
  'banking/kyc-analyst': ['https://github.com/vyayasan/kyc-analyst', 'MIT'],
  'slides/anthropic-financial-services': ['https://github.com/anthropics/financial-services-plugins', 'Apache-2.0'],
  'slides/anthropic': ['https://github.com/anthropics/skills', 'Apache-2.0'],
  'slides/frontend-slides': ['https://github.com/zarazhangrui/frontend-slides', 'MIT'],
  'training/course-training-skills': ['https://github.com/Mosapmohamd/course-training-skills', 'MIT'],
  'general/anthropic': ['https://github.com/anthropics/skills', 'Apache-2.0'],
};

function findSkills(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) findSkills(p, out);
    else if (name === 'SKILL.md') out.push(p);
  }
  return out;
}

// Minimal frontmatter reader: plain, quoted and folded (> / |) scalars.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fields = {};
  if (!m) return fields;
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2].trim();
    if (value === '>' || value === '|' || value === '>-' || value === '|-' || value === '') {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(' ');
    }
    fields[kv[1]] = value.replace(/^(["'])([\s\S]*)\1$/, '$2');
  }
  return fields;
}

const skills = findSkills(root).map((file) => {
  const path = relative(root, dirname(file)).split(sep).join('/');
  const group = Object.keys(sources).find((g) => path === g || path.startsWith(g + '/'));
  const fm = frontmatter(readFileSync(file, 'utf8'));
  const [source, license] = sources[group] ?? [null, null];
  return { name: fm.name ?? path.split('/').pop(), category: path.split('/')[0], path, description: fm.description ?? '', source, license };
}).sort((a, b) => a.path.localeCompare(b.path));

writeFileSync(join(root, 'index.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: skills.length, skills }, null, 2) + '\n');
console.log(`${skills.length} skills -> index.json`);
