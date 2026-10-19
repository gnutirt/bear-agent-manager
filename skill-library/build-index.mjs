// Regenerates index.json from every SKILL.md under skill-library/ (roles from roles.json). Run: node skill-library/build-index.mjs
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const sources = {
  'banking/anthropic-financial-services': ['https://github.com/anthropics/financial-services-plugins', 'Apache-2.0'],
  'banking/casemark': ['https://github.com/CaseMark/skills', 'Apache-2.0'],
  'banking/second-line': ['https://github.com/anotb/second-line-financial-services', 'MIT'],
  'banking/finance-skills': ['https://github.com/JoelLewis/finance_skills', 'MIT'],
  'banking/kyc-analyst': ['https://github.com/vyayasan/kyc-analyst', 'MIT'],
  'banking/vietnam': ['https://github.com/gnutirt/bear-agent-manager (tự viết)', 'MIT'],
  'solar/vietnam': ['https://github.com/gnutirt/bear-agent-manager (tự viết)', 'MIT'],
  'slides/revealjs-skill': ['https://github.com/ryanbbrown/revealjs-skill', 'MIT'],
  'slides/agent-toolkit': ['https://github.com/softaworks/agent-toolkit', 'MIT'],
  'training/onewave': ['https://github.com/onewave-ai/claude-skills', 'MIT'],
  'slides/anthropic-financial-services': ['https://github.com/anthropics/financial-services-plugins', 'Apache-2.0'],
  'slides/anthropic': ['https://github.com/anthropics/skills', 'Apache-2.0'],
  'slides/frontend-slides': ['https://github.com/zarazhangrui/frontend-slides', 'MIT'],
  'legal/anthropic-legal': ['https://github.com/anthropics/knowledge-work-plugins', 'Apache-2.0'],
  'legal/casemark': ['https://github.com/CaseMark/skills', 'Apache-2.0'],
  'solar/casemark': ['https://github.com/CaseMark/skills', 'Apache-2.0'],
  'solar/engineering': ['https://github.com/gnutirt/bear-agent-manager (tự viết)', 'MIT'],
  'general/knowledge-work': ['https://github.com/anthropics/knowledge-work-plugins', 'Apache-2.0'],
  'training/course-training-skills': ['https://github.com/Mosapmohamd/course-training-skills', 'MIT'],
  'general/anthropic': ['https://github.com/anthropics/skills', 'Apache-2.0'],
};

// Whose law a skill is written for, so the UI can warn before it is used on a Vietnamese contract.
// Folder prefixes first, then single skills (a solar finance skill is not law; a solar contract skill is).
const jurisdictionByPath = {
  'legal/': 'US',
  'banking/casemark/': 'US',
  'banking/second-line/': 'US',
  'banking/finance-skills/': 'US',
  'banking/vietnam/': 'VN',
  'solar/vietnam/': 'VN',
};
const jurisdictionByName = {
  'epc-contract': 'US', 'interconnection-agreement': 'US', 'power-purchase-agreement': 'US',
  'solar-site-lease': 'US', 'energy-regulation-summaries': 'US',
  'warranty-timeline': 'US', 'insurance-claim-summaries': 'US',
};

// Skills whose instructions include commands that change data or reach outside: shown as a warning before install.
const cautionByName = {
  'sql-queries': 'Có ví dụ câu lệnh ghi dữ liệu (MERGE, INSERT). Chỉ chạy trên kho dữ liệu khi người dùng đã duyệt từng câu.',
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

// Nearest LICENSE / LICENSE.txt at or above the skill folder, stopping at the library root.
function licenseFile(dir) {
  for (let d = dir; d.startsWith(root); d = dirname(d)) {
    const hit = ['LICENSE', 'LICENSE.txt', 'LICENSE.md'].find((n) => existsSync(join(d, n)));
    if (hit) return relative(root, join(d, hit)).split(sep).join('/');
    if (d === root) break;
  }
  return null;
}

// Relative file paths a SKILL.md points at: markdown links and backticked references/, scripts/, … paths.
export function skillRefs(text) {
  const refs = new Set();
  for (const m of text.matchAll(/\]\(([^)#\s]+)(?:#[^)]*)?\)/g)) refs.add(m[1]);
  for (const m of text.matchAll(/`((?:\.\/)?(?:references|scripts|assets|templates|examples|reference|docs|resources|lib|config)\/[^`\s*<>{}#]+)/g)) refs.add(m[1]);
  return [...refs].filter((r) => !/^(https?:|mailto:|\/|~|\$)/.test(r));
}

export function buildIndex() {
  const roleOverrides = JSON.parse(readFileSync(join(root, 'roles.json'), 'utf8'));
  const descVi = JSON.parse(readFileSync(join(root, 'descriptions.vi.json'), 'utf8'));
  const files = findSkills(root);
  const dirs = files.map((f) => relative(root, dirname(f)).split(sep).join('/'));
  return files.map((file, i) => {
    const path = dirs[i];
    const group = Object.keys(sources).find((g) => path === g || path.startsWith(g + '/'));
    const fm = frontmatter(readFileSync(file, 'utf8'));
    const [source, license] = sources[group] ?? [null, null];
    const name = fm.name ?? path.split('/').pop();
    const category = path.split('/')[0];
    // A skill nested inside another skill only works as part of it: installing it means installing the outer one.
    const outer = dirs.filter((d) => path.startsWith(d + '/')).sort((a, b) => a.length - b.length)[0];
    const entry = { name, category, roles: roleOverrides[name] ?? [category], path, description: fm.description ?? '', descVi: descVi[name] ?? '', source, license, licenseFile: licenseFile(dirname(file)) };
    const jurisdiction = jurisdictionByName[name] ?? Object.entries(jurisdictionByPath).find(([p]) => (path + '/').startsWith(p))?.[1];
    if (jurisdiction) entry.jurisdiction = jurisdiction;
    if (cautionByName[name]) entry.caution = cautionByName[name];
    // Vietnamese-law skills record when their legal sources were last checked and which documents they rely on.
    if (fm.legalAsOf) entry.legalAsOf = fm.legalAsOf;
    if (fm.legalDocs) entry.legalDocs = fm.legalDocs.replace(/^\[|\]$/g, '').split(',').map((d) => d.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    return outer ? { ...entry, bundle: outer } : entry;
  }).sort((a, b) => a.path.localeCompare(b.path));
}

const ROLE_VI = { banking: 'Ngân hàng', slides: 'Slide', training: 'Đào tạo', general: 'Chung', legal: 'Pháp lý', solar: 'Solar' };

// One table per role (a skill appears under its first role), for the owner to review the whole library in one place.
export function catalog(skills) {
  const cell = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
  const out = ['# Danh mục thư viện skill', '', `Tự sinh bởi \`node skill-library/build-index.mjs\` từ index.json. Không sửa tay. Tổng ${skills.length} skill.`, ''];
  for (const [role, vi] of Object.entries(ROLE_VI)) {
    const rows = skills.filter((s) => s.roles[0] === role).sort((a, b) => a.name.localeCompare(b.name));
    if (!rows.length) continue;
    out.push(`## ${vi} (${rows.length})`, '', '| Skill | Vai trò | Mô tả | Giấy phép | Luật | Ghi chú |', '|---|---|---|---|---|---|');
    for (const s of rows) {
      const notes = [s.bundle ? `cài cùng bộ \`${s.bundle}\`` : '', s.caution ?? '', s.legalAsOf ? `rà ${s.legalAsOf}` : ''].filter(Boolean).join('; ');
      out.push(`| \`${s.name}\` | ${s.roles.map((r) => ROLE_VI[r] ?? r).join(', ')} | ${cell(s.descVi || s.description)} | ${s.license} | ${s.jurisdiction ?? ''} | ${cell(notes)} |`);
    }
    out.push('');
  }
  return out.join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const skills = buildIndex();
  writeFileSync(join(root, 'index.json'), JSON.stringify({ generated: new Date().toISOString().slice(0, 10), count: skills.length, skills }, null, 2) + '\n');
  writeFileSync(join(root, 'CATALOG.md'), catalog(skills));
  console.log(`${skills.length} skills -> index.json, CATALOG.md`);
}
