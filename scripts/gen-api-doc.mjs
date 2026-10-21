import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function patToPath(p) {
  if ((p[0] === '"' && p.at(-1) === '"') || (p[0] === "'" && p.at(-1) === "'") || (p.at(-2) === '\\/')) p = p.slice(1, -1);
  else if (p.startsWith('/')) { const ls = p.lastIndexOf('/'); if (ls > 0) p = p.slice(1, ls); }
  else if (p.startsWith('`') && p.endsWith('`')) p = p.slice(1, -1);
  return p.replace(/^\^/, '').replace(/\$/, '')
    .replace(/\\\//g, '/')
    .replace(/\(\[\^\/\]\+\)/g, ':param')
    .replace(/\(\\d\+\)/g, ':param')
    .replace(/\(\[a-z0-9-\]\+\)/g, ':param')
    .replace(/\(\(\?:[^)]+\)\)/g, ':param')
    .replace(/\([^)]+\)/g, ':param');
}

export function extractRoutes(sourceText) {
  const allLines = sourceText.split('\n');

  let routeStart = -1, routeEnd = -1;
  let depth = 0, inside = false;
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    if (!inside && /async\s+function\s+route\s*\(/.test(line)) { inside = true; routeStart = i; depth = 0; }
    if (inside) {
      for (const ch of line) { if (ch === '{') depth++; if (ch === '}') { depth--; if (depth === 0) { routeEnd = i; inside = false; break; } } }
      if (!inside) break;
    }
  }
  if (routeStart === -1) throw new Error('route() not found');
  const lines = allLines.slice(routeStart, routeEnd + 1);
  const toAbs = idx => routeStart + idx + 1;

  let tokenOffset = -1;
  for (let i = 0; i < lines.length; i++) { if (lines[i].includes('given !== token')) { tokenOffset = i; break; } }
  function needsToken(lineIdx, path) {
    if (path === '/' || path === '/index.html' || path === '/api/health') return false;
    if (path.startsWith('/hooks/')) return false;
    if (tokenOffset >= 0 && lineIdx < tokenOffset) return false;
    if (path.startsWith('/api/')) return true;
    return false;
  }

  const sections = [];
  for (let i = 0; i < allLines.length; i++) {
    const m = allLines[i].match(/^\s*\/\/ ---- (.+?) ----/);
    if (m) sections.push({ line: i + 1, title: m[1].trim().replace(/:$/, '') });
  }
  function sectionFor(absLine) {
    let sec = null;
    for (const s of sections) { if (s.line <= absLine) sec = s; else break; }
    return sec ? sec.title : 'Other';
  }

  const routes = [];
  function add(method, path, offset, fields) {
    if (path.startsWith('/hooks/')) path = path.replace(':param', ':event');
    routes.push({
      method, path,
      line: toAbs(offset),
      fields: [...new Set(fields || [])],
      token: needsToken(offset, path) ? 'có' : 'không',
      section: sectionFor(toAbs(offset)),
    });
  }

  function bodyFields(off) {
    const found = new Set();
    const end = blockEnd(off);
    for (let j = off + 1; j <= end; j++) {
      if (/const\s+\w+\s*=\s*await\s+readBody\(req\)/.test(lines[j])) {
        for (let k = j; k <= end; k++) {
          for (const m of lines[k].matchAll(/\bb\.([a-zA-Z_$][\w$]*)\b/g)) found.add(m[1]);
        }
        break;
      }
    }
    return [...found];
  }

  // --- Pass 1: simple fixed-path routes ---
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    for (const m of l.matchAll(/if\s*\(\s*m\s*===\s*['"\`']([A-Z]+)['"\`']\s*&&\s*(?:\()?p\s*===\s*['"`]([^'"`]+)['"`](?:\))?/g)) {
      add(m[1], m[2], i, bodyFields(i));
    }
  }

  // --- Pass 2: variable match routes (pv, wk, fm, mm, tm, hk) ---
  const matchVars = new Map();
  for (let i = 0; i < lines.length; i++) {
    const m1 = lines[i].match(/^\s*const\s+(\w+)\s*=\s*p\.match\((.+?)\)\s*;?\s*$/);
    if (m1) { matchVars.set(m1[1], { pat: m1[2].trim(), off: i, method: null }); continue; }
    const m2 = lines[i].match(/^\s*const\s+(\w+)\s*=\s*m\s*===\s*['"\`']([A-Z]+)['"\`']\s*&&\s*p\.match\((.+?)\)\s*;?\s*$/);
    if (m2) { matchVars.set(m2[1], { pat: m2[3].trim(), off: i, method: m2[2] }); continue; }
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const v1 = l.match(/if\s*\(\s*(\w+)\s*&&\s*m\s*===\s*['"\`']([A-Z]+)['"\`']\s*\)/);
    if (v1 && matchVars.has(v1[1])) {
      const info = matchVars.get(v1[1]);
      add(info.method || v1[2], patToPath(info.pat), i, bodyFields(i));
    }
    const v2 = l.match(/if\s*\(\s*m\s*===\s*['"\`']([A-Z]+)['"\`']\s*&&\s*(\w+)\s*\)/);
    if (v2 && matchVars.has(v2[2]) && !matchVars.get(v2[2]).method) {
      add(v2[1], patToPath(matchVars.get(v2[2]).pat), i, bodyFields(i));
    }
    const v3 = l.match(/if\s*\(\s*(\w+)\s*\)/);
    if (v3 && matchVars.has(v3[1]) && matchVars.get(v3[1]).method) {
      add(matchVars.get(v3[1]).method, patToPath(matchVars.get(v3[1]).pat), i, bodyFields(i));
    }
  }

  function blockEnd(start) {
    if (!lines[start].includes('{')) return start;
    let d = 0;
    for (let i = start; i < lines.length; i++) {
      for (const ch of lines[i]) { if (ch === '{') d++; if (ch === '}') { d--; if (d === 0) return i; } }
    }
    return lines.length - 1;
  }

  function scanBlock(varName, regexHint, pathBase, noSubRe) {
    const decl = lines.findIndex((l) => l.includes(varName + ' = p.match') && regexHint.test(l));
    if (decl === -1) return;
    let ifLine = -1;
    for (let k = decl; k < lines.length; k++) { if (/if\s*\(/.test(lines[k]) && lines[k].includes(varName) && !lines[k].includes('match')) { ifLine = k; break; } }
    if (ifLine === -1) return;
    const end = blockEnd(ifLine);
    let curMethod = null;
    for (let i = ifLine + 1; i < end; i++) {
      const ll = lines[i];
      const mth = ll.match(/if\s*\(\s*m\s*===\s*['"`]([A-Z]+)['"`]/);
      if (mth) {
        curMethod = mth[1];
        const indent = ll.match(/^(\s*)/)[1].length;
        for (let k = i; k < end; k++) {
          const kk = lines[k];
          const kInd = kk.match(/^(\s*)/)[1].length;
          if (k > i && (kk.trim().startsWith('if (m ===') || (kk.trim() === '}' && kInd <= indent))) break;
          for (const am of kk.matchAll(/action\s*===\s*['"`]([^'`"]+)['"`]/g)) add(curMethod, pathBase + '/' + am[1], k, bodyFields(k));
          if (kk.match(noSubRe)) add(curMethod, pathBase, k, bodyFields(k));
        }
      }
    }
  }

  scanBlock('mm', /\/api\/sessions\//, '/api/sessions/:id', /!\s*action\b/);
  for (let i = 0; i < lines.length; i++) {
    if (/action\s*===\s*['"`]room-commit['"`]/.test(lines[i])) {
      add('POST', '/api/sessions/:id/room-commit', i, bodyFields(i));
    }
  }
  scanBlock('tm', /\/api\/rooms\/[^\/]+\/tasks/, '/api/rooms/:room/tasks', /!\s*sub\b/);
  scanBlock('mm', /\/api\/rooms\/[^\/]+\/notes/, '/api/rooms/:room/notes', /!\s*mm\[2\]/);
  scanBlock('mm', /join\|leave\|resume\|messages\|rename\|delete\|lead\|clear-lead\|done\|open-lead\|topics\|days\|hide\|cwd/, '/api/rooms/:room', /!\s*action\b/);

  // --- Files block ---
  const fmDecl = lines.findIndex((l) => l.includes('fm = p.match') && /\/api\/rooms\/[^\/]+\/files/.test(l));
  if (fmDecl !== -1) {
    let fmIf = -1;
    for (let k = fmDecl; k < lines.length; k++) { if (/if\s*\(\s*fm\b/.test(lines[k])) { fmIf = k; break; } }
    if (fmIf !== -1) {
      const fmEnd = blockEnd(fmIf);
      for (let i = fmIf + 1; i < fmEnd; i++) {
        if (lines[i].match(/if\s*\(\s*m\s*===\s*['"`]POST['"`]\s*&&\s*!\s*fm\[2\]/)) add('POST', '/api/rooms/:room/files', i, bodyFields(i));
        if (lines[i].match(/if\s*\(\s*m\s*===\s*['"`]GET['"`]\s*&&\s*fm\[2\]/)) add('GET', '/api/rooms/:room/files/:id', i, bodyFields(i));
      }
    }
  }

  // --- Notes edit/delete ---
  const noteDecl = lines.findIndex((l) => l.includes('mm = p.match') && /\/api\/rooms\/[^\/]+\/notes/.test(l));
  if (noteDecl !== -1) {
    let noteIf = -1;
    for (let k = noteDecl; k < lines.length; k++) { if (/if\s*\(\s*mm\b/.test(lines[k])) { noteIf = k; break; } }
    if (noteIf !== -1) {
      const noteEnd = blockEnd(noteIf);
      for (let i = noteIf + 1; i < noteEnd; i++) {
        const ll = lines[i];
        const mth = ll.match(/if\s*\(\s*m\s*===\s*['"`]([A-Z]+)['"`]/);
        if (mth) {
          const indent = ll.match(/^(\s*)/)[1].length;
          for (let k = i; k < noteEnd; k++) {
            const kk = lines[k];
            const kInd = kk.match(/^(\s*)/)[1].length;
            if (k > i && (kk.trim().startsWith('if (m ===') || (kk.trim() === '}' && kInd <= indent))) break;
            for (const am of kk.matchAll(/mm\[3\]\s*===\s*['"`]([^'`"]+)['"`]/g)) {
              const suffix = am[1] === 'edit' ? '/:id/edit' : am[1] === 'delete' ? '/:id/delete' : '';
              add(mth[1], '/api/rooms/:room/notes' + suffix, k, bodyFields(k));
            }
          }
        }
      }
    }
  }

  // --- Tasks delete / update ---
  const taskDecl = lines.findIndex((l) => l.includes('tm = p.match') && /\/api\/rooms\/[^\/]+\/tasks/.test(l));
  if (taskDecl !== -1) {
    let taskIf = -1;
    for (let k = taskDecl; k < lines.length; k++) { if (/if\s*\(\s*tm\b/.test(lines[k])) { taskIf = k; break; } }
    if (taskIf !== -1) {
      const taskEnd = blockEnd(taskIf);
      for (let i = taskIf + 1; i < taskEnd; i++) {
        const ll = lines[i];
        const mth = ll.match(/if\s*\(\s*m\s*===\s*['"`]([A-Z]+)['"`]/);
        if (mth) {
          const indent = ll.match(/^(\s*)/)[1].length;
          for (let k = i; k < taskEnd; k++) {
            const kk = lines[k];
            const kInd = kk.match(/^(\s*)/)[1].length;
            if (k > i && (kk.trim().startsWith('if (m ===') || (kk.trim() === '}' && kInd <= indent))) break;
            if (kk.match(/tm\[3\]\s*===\s*['"`]delete['"`]/)) add(mth[1], '/api/rooms/:room/tasks/:id/delete', k, bodyFields(k));
            if (kk.match(/const\s+id\s*=\s*Number\(sub\)/)) add(mth[1], '/api/rooms/:room/tasks/:id', k, bodyFields(k));
          }
        }
      }
    }
  }

  // --- Health check ---
  for (let i = 0; i < lines.length; i++) { if (lines[i].includes("p === '/api/health'")) add('GET', '/api/health', i, []); }

  // --- Hooks ---
  for (let i = 0; i < lines.length; i++) { if (lines[i].includes('/hooks/') && lines[i].includes('p.match')) add('POST', '/hooks/:event', i, bodyFields(i)); }

  const keySet = new Set();
  const uniq = [];
  for (const r of routes) { const k = r.method + ' ' + r.path; if (keySet.has(k)) continue; keySet.add(k); uniq.push(r); }
  return uniq;
}

function generateMarkdown(routes) {
  const groups = new Map();
  for (const r of routes) {
    if (!groups.has(r.section)) groups.set(r.section, []);
    groups.get(r.section).push(r);
  }
  const sectionOrder = [...groups.keys()];
  sectionOrder.sort((a, b) => (routes.find(r => r.section === a)?.line || 0) - (routes.find(r => r.section === b)?.line || 0));

  let md = '<!-- Auto-generated by scripts/gen-api-doc.mjs -->\n\n';
  md += '# API Routes\n';
  for (const sec of sectionOrder) {
    md += '\n## ' + sec + '\n\n';
    md += '| Method | Path | Fields | Cần token |\n';
    md += '|--------|------|--------|-----------|\n';
    const list = groups.get(sec);
    list.sort((a, b) => a.line - b.line);
    for (const r of list) {
      const fields = r.fields.length ? '`' + r.fields.join('`, `') + '`' : '';
      md += '| ' + r.method + ' | `' + r.path + '` | ' + fields + ' | ' + r.token + ' |\n';
    }
  }
  return md;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {   // only when run directly: importing it (the test) must not rewrite docs/api.md
  const src = fs.readFileSync(path.join(ROOT, 'hub', 'server.ts'), 'utf8');
  const routes = extractRoutes(src);
  const md = generateMarkdown(routes);
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs', 'api.md'), md);
  console.log('Generated docs/api.md with ' + routes.length + ' routes');
}
