// Moves a Claude Code + Bear Agent Manager setup to a new machine, and links Antigravity's config dir
// to VS Code's so both editors share chats, skills and settings.
// Usage: node scripts/machine.mjs check | export [--dir D] [--with-keys] | import --dir D [--force] | link [--merge]
//        common: [--home H] (default: your home dir)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LINK_DIRS = ['projects', 'hooks', 'file-history', 'paste-cache', 'skills'];
// Hardlinks: Claude Code may rewrite a file through a temp file + rename, which splits the link; check reports it.
export const LINK_FILES = ['CLAUDE.md', 'history.jsonl', 'settings.json'];
const EXPORT_DIRS = ['skills', 'agents', 'commands', 'output-styles'];
const EXPORT_FILES = ['CLAUDE.md', 'settings.json', 'keybindings.json'];
/** Login and account state never leave the machine. */
export const NEVER = new Set(['.credentials.json', '.claude.json']);
export const KEY_WARNING = 'Thư mục xuất có chứa key (providers.json, khối env của settings.json): đừng chia sẻ thư mục này.';

// ---- MCP servers (#156): they live inside ~/.claude.json, a login file that never leaves the machine. Only the
// mcpServers block is exported, and every value that looks like a secret becomes ${NAME} so the file can be copied
// around; the new machine gets the real values from its own environment (Claude Code expands ${VAR} in configs).
const SECRET_KEY = /(token|secret|passw|api[-_]?key|^key$|authorization|auth$|bearer|cookie|credential|private)/i;
const SECRET_VALUE = /^(sk[-_]|ghp_|gho_|ghu_|ghs_|github_pat_|xox[baprs]-|AIza|eyJ|glpat-|npm_|shpat_|dckr_pat_)/;
const NOT_SECRET_KEY = /(path|dir|home|url|uri|host|port|file|timeout|proxy|email|region|bucket|command)/i;
const PLACEHOLDER = /^\$\{[A-Z0-9_]+\}$/;

/** Whether an env/header entry looks like a credential: by its name, its prefix, or a long random-looking value. */
export function looksSecret(key, value) {
  if (typeof value !== 'string' || !value || PLACEHOLDER.test(value)) return false;
  if (SECRET_VALUE.test(value)) return true;
  if (SECRET_KEY.test(String(key))) return true;
  if (NOT_SECRET_KEY.test(String(key))) return false;
  return value.length >= 24 && /^[A-Za-z0-9_\-+/=.]+$/.test(value) && /[0-9]/.test(value) && /[A-Za-z]/.test(value) && !/^[A-Za-z]:[\\/]/.test(value);
}

/** `${NAME}` for a header/env key: Authorization -> ${AUTHORIZATION}. */
export const placeholderFor = (key) => `\${${String(key).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'SECRET'}}`;

/** Only the mcpServers of ~/.claude.json, with secret-looking env/header values replaced by ${NAME}. */
export function mcpServersForExport(home) {
  const cfg = readJson(path.join(home, '.claude.json'), {});
  const servers = cfg && typeof cfg === 'object' && cfg.mcpServers && typeof cfg.mcpServers === 'object' ? cfg.mcpServers : {};
  const vars = new Set();
  const out = {};
  for (const [name, server] of Object.entries(servers)) {
    if (!server || typeof server !== 'object' || Array.isArray(server)) continue;
    const copyOf = JSON.parse(JSON.stringify(server));
    for (const field of ['env', 'headers']) {
      const box = copyOf[field];
      if (!box || typeof box !== 'object' || Array.isArray(box)) continue;
      for (const [k, v] of Object.entries(box)) {
        if (!looksSecret(k, v)) continue;
        const placeholder = placeholderFor(k);
        box[k] = placeholder;
        vars.add(placeholder.slice(2, -1));
      }
    }
    // A token can also be typed as a CLI argument (`--api-key sk-…`) or sit in the query of the URL; both leak the
    // same way, so they are replaced too, with a name the user can export before importing.
    if (Array.isArray(copyOf.args)) {
      copyOf.args = copyOf.args.map((a, i) => {
        if (typeof a !== 'string' || !SECRET_VALUE.test(a)) return a;
        const varName = `${String(name).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_ARG_${i}`;
        vars.add(varName);
        return `\${${varName}}`;
      });
    }
    // Plain string surgery, not URL(): the URL API would percent-encode the `${…}` placeholder and Claude Code would
    // stop recognizing it.
    if (typeof copyOf.url === 'string' && copyOf.url.includes('?')) {
      copyOf.url = copyOf.url.replace(/([?&])([^=&]+)=([^&]*)/g, (whole, sep, k, v) => {
        let key = k;
        try { key = decodeURIComponent(k); } catch { /* keep as written */ }
        let value = v;
        try { value = decodeURIComponent(v); } catch { /* keep as written */ }
        if (!looksSecret(key, value)) return whole;
        const placeholder = placeholderFor(key);
        vars.add(placeholder.slice(2, -1));
        return `${sep}${k}=${placeholder}`;
      });
    }
    out[name] = copyOf;
  }
  return { servers: out, vars: [...vars].sort() };
}

/** The `claude mcp add-json` calls that put an export's servers back, and the shell variables the user still has to set. */
export function mcpImportPlan(dir, env = process.env) {
  const file = path.join(dir, 'mcp.json');
  if (!exists(file)) return { plan: [], vars: [], missing: [] };
  const j = readJson(file, {});
  const vars = Array.isArray(j.vars) ? j.vars.filter((v) => typeof v === 'string') : [];
  const plan = Object.entries(j.servers ?? {}).map(([name, cfg]) => {
    const argv = ['mcp', 'add-json', name, JSON.stringify(cfg), '--scope', 'user'];
    return { name, argv, cmd: ['claude', ...argv].map((a) => (/[\s"'`$]/.test(a) ? `'${a}'` : a)).join(' ') };
  });
  return { plan, vars, missing: vars.filter((v) => !env[v]) };
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const exists = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };
const real = (p) => { try { return fs.realpathSync.native(p).toLowerCase(); } catch { return ''; } };
const sameFile = (a, b) => { try { const x = fs.statSync(a, { bigint: true }), y = fs.statSync(b, { bigint: true }); return x.ino === y.ino && x.dev === y.dev; } catch { return false; } };
const sameText = (a, b) => { try { return fs.readFileSync(a).equals(fs.readFileSync(b)); } catch { return false; } };
export const dirs = (home) => ({ vs: path.join(home, '.claude'), ag: path.join(home, '.claude-antigravity') });

/** linked | missing | separate (real data, same content for files) | differs (real data, other content) | elsewhere (a link to somewhere else) */
export function linkState(src, dst, isDir) {
  if (!exists(dst)) return 'missing';
  if (isDir) {
    if (fs.lstatSync(dst).isSymbolicLink()) return real(dst) === real(src) ? 'linked' : 'elsewhere';
    return 'separate';
  }
  if (sameFile(src, dst)) return 'linked';
  return sameText(src, dst) ? 'separate' : 'differs';
}

/** Top-level keys of two settings.json that are only on one side or differ. */
export function settingsDiff(a, b) {
  const x = readJson(a, null), y = readJson(b, null);
  if (!x || !y) return [!x ? `${a}: không có / không đọc được` : `${b}: không có / không đọc được`];
  const out = [];
  for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
    if (!(k in y)) out.push(`chỉ có ở VS Code: ${k}`);
    else if (!(k in x)) out.push(`chỉ có ở Antigravity: ${k}`);
    else if (JSON.stringify(x[k]) !== JSON.stringify(y[k])) out.push(`khác nhau: ${k}`);
  }
  return out;
}

function pluginsOf(cfg, home) {
  const inst = readJson(path.join(cfg, 'plugins', 'installed_plugins.json'), {});
  const mk = readJson(path.join(cfg, 'plugins', 'known_marketplaces.json'), {});
  const tilde = (p) => (typeof p === 'string' ? p.replace(home, '~') : p);
  return {
    plugins: Object.keys(inst.plugins ?? {}).sort(),
    marketplaces: Object.fromEntries(Object.entries(mk).map(([n, v]) => [n, tilde(v?.source?.path ?? v?.source?.repo ?? v?.source?.url ?? '')])),
  };
}

export function check({ home = os.homedir() } = {}) {
  const { vs, ag } = dirs(home);
  const links = [
    ...LINK_DIRS.map((n) => ({ name: n, kind: 'dir', state: linkState(path.join(vs, n), path.join(ag, n), true) })),
    ...LINK_FILES.map((n) => ({ name: n, kind: 'file', state: linkState(path.join(vs, n), path.join(ag, n), false) })),
  ];
  return {
    configDirs: [vs, ag].filter(exists).map((d) => ({ dir: d, ...pluginsOf(d, home) })),
    links,
    settingsDiff: exists(path.join(ag, 'settings.json')) ? settingsDiff(path.join(vs, 'settings.json'), path.join(ag, 'settings.json')) : [],
  };
}

const copy = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (s) => !NEVER.has(path.basename(s)) });

/**
 * Export copy: only files that are new or changed (size, or a newer mtime) are written, and the copy keeps the
 * source mtime, so a second export to a slow or network drive copies almost nothing. Login files are never copied.
 */
export function copyChanged(from, to, stats = { copied: 0, skipped: 0, bytes: 0 }) {
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const n of fs.readdirSync(from)) if (!NEVER.has(n)) copyChanged(path.join(from, n), path.join(to, n), stats);
    return stats;
  }
  if (!st.isFile()) return stats;
  const d = fs.statSync(to, { throwIfNoEntry: false });
  if (d && d.size === st.size && Math.floor(d.mtimeMs) >= Math.floor(st.mtimeMs)) { stats.skipped++; return stats; }
  fs.copyFileSync(from, to);
  fs.utimesSync(to, st.atime, st.mtime);
  stats.copied++; stats.bytes += st.size;
  return stats;
}

export function exportMachine({ home = os.homedir(), hubHome = path.join(home, '.bear-agent-manager'), dir, withKeys = false, onItem } = {}) {
  const { vs } = dirs(home);
  const out = dir ?? path.join(hubHome, 'machine');
  const items = [];
  const stats = { copied: 0, skipped: 0, bytes: 0 };
  const put = (rel, from, transform) => {
    if (!exists(from)) return;
    const to = path.join(out, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    if (transform) { fs.writeFileSync(to, transform(fs.readFileSync(from, 'utf8'))); stats.copied++; }
    else copyChanged(from, to, stats);
    items.push(rel.replace(/\\/g, '/'));
    onItem?.(items.length, items[items.length - 1], stats);
  };
  for (const d of EXPORT_DIRS) put(path.join('claude', d), path.join(vs, d));
  for (const f of EXPORT_FILES) put(path.join('claude', f), path.join(vs, f),
    f === 'settings.json' && !withKeys ? (t) => { const j = JSON.parse(t); delete j.env; return JSON.stringify(j, null, 2); } : undefined);
  for (const p of exists(path.join(vs, 'projects')) ? fs.readdirSync(path.join(vs, 'projects')) : []) {
    put(path.join('claude', 'projects', p, 'memory'), path.join(vs, 'projects', p, 'memory'));
  }
  put(path.join('hub', 'settings.json'), path.join(hubHome, 'settings.json'));
  if (withKeys) put(path.join('hub', 'providers.json'), path.join(hubHome, 'providers.json'));
  const plugins = Object.fromEntries(Object.values(dirs(home)).filter(exists).map((d) => [path.basename(d), pluginsOf(d, home)]));
  // mcp.json is not part of `items`: import must not copy it into a config dir, it is re-created with `claude mcp add-json`.
  const mcp = mcpServersForExport(home);
  const mcpNames = Object.keys(mcp.servers);
  fs.mkdirSync(out, { recursive: true });
  if (mcpNames.length) fs.writeFileSync(path.join(out, 'mcp.json'), JSON.stringify({ vars: mcp.vars, servers: mcp.servers }, null, 2));
  fs.writeFileSync(path.join(out, 'plugins.json'), JSON.stringify(plugins, null, 2));
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify({ exportedAt: new Date().toISOString(), from: os.hostname(), withKeys, items, mcp: { servers: mcpNames, vars: mcp.vars } }, null, 2));
  const warnings = [
    ...(withKeys ? [KEY_WARNING] : []),
    ...(mcp.vars.length ? [`MCP: đặt biến môi trường ${mcp.vars.join(', ')} trên máy mới trước khi import, giá trị thật không nằm trong thư mục xuất.`] : []),
  ];
  return { dir: out, items, warnings, mcp: { servers: mcpNames, vars: mcp.vars }, ...stats };
}

export function importMachine({ home = os.homedir(), hubHome = path.join(home, '.bear-agent-manager'), dir, force = false, run, env = process.env } = {}) {
  const m = readJson(path.join(dir, 'manifest.json'), null);
  if (!m) throw new Error(`no manifest.json in ${dir}`);
  const res = { copied: [], backedUp: [], skipped: [], plugins: [], mcp: [], mcpVars: [], mcpMissing: [] };
  for (const rel of m.items) {
    const [root, ...rest] = rel.split('/');
    const to = path.join(root === 'hub' ? hubHome : dirs(home).vs, ...rest);
    if (exists(to)) {
      if (!force) { res.skipped.push(rel); continue; }
      const bak = `${to}.bak-${stamp()}`;
      fs.renameSync(to, bak); res.backedUp.push(bak);
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    copy(path.join(dir, ...rel.split('/')), to);
    res.copied.push(rel);
  }
  // Plugins are installed by the user's own claude CLI (the skill asks first); a local marketplace needs its new clone path.
  for (const [cfg, p] of Object.entries(readJson(path.join(dir, 'plugins.json'), {}))) {
    for (const [name, src] of Object.entries(p.marketplaces ?? {})) res.plugins.push({ configDir: cfg, cmd: `claude plugin marketplace add ${src}`, marketplace: name, localPath: /^(~|[A-Za-z]:|\/)/.test(String(src)) });
    for (const id of p.plugins ?? []) res.plugins.push({ configDir: cfg, cmd: `claude plugin install ${id}` });
  }
  // MCP servers are not files in the export: they are added back with the user's own claude CLI. Without a runner the
  // caller gets the exact commands (that is what the skill shows), with one they are executed argv-only, never a shell.
  const { plan, vars, missing } = mcpImportPlan(dir, env);
  res.mcpVars = vars;
  res.mcpMissing = missing;
  for (const c of plan) {
    const entry = { name: c.name, cmd: c.cmd, argv: c.argv, ran: false };
    if (run) {
      try { run('claude', c.argv); entry.ran = true; }
      catch (e) { entry.error = String(e?.message ?? e); }
    }
    res.mcp.push(entry);
  }
  return res;
}

/** Links .claude-antigravity to .claude. Never deletes: replaced data is renamed to <name>.bak-<ts>. */
export function link({ home = os.homedir(), merge = false, platform = process.platform } = {}) {
  const { vs, ag } = dirs(home);
  const res = { linked: [], already: [], refused: [], backedUp: [] };
  fs.mkdirSync(ag, { recursive: true });
  const aside = (p) => { const bak = `${p}.bak-${stamp()}`; fs.renameSync(p, bak); res.backedUp.push(bak); };
  for (const n of LINK_DIRS) {
    const src = path.join(vs, n), dst = path.join(ag, n), st = linkState(src, dst, true);
    if (st === 'linked') { res.already.push(n); continue; }
    if (st === 'elsewhere') { res.refused.push(`${n}: đang link tới chỗ khác`); continue; }
    if (st === 'separate') {
      if (!merge) { res.refused.push(`${n}: Antigravity có dữ liệu riêng (chạy lại với --merge để gộp sang .claude)`); continue; }
      fs.mkdirSync(src, { recursive: true });
      fs.cpSync(dst, src, { recursive: true, force: false, errorOnExist: false });   // VS Code's copy wins on clashes
      aside(dst);
    }
    fs.mkdirSync(src, { recursive: true });
    fs.symlinkSync(src, dst, platform === 'win32' ? 'junction' : 'dir');
    res.linked.push(n);
  }
  for (const n of LINK_FILES) {
    const src = path.join(vs, n), dst = path.join(ag, n), st = linkState(src, dst, false);
    if (!exists(src)) { res.refused.push(`${n}: chưa có ở .claude`); continue; }
    if (st === 'linked') { res.already.push(n); continue; }
    if (st === 'differs' && !merge) { res.refused.push(`${n}: nội dung khác bản của VS Code (xem check, rồi --merge để dùng bản VS Code)`); continue; }
    if (st !== 'missing') aside(dst);
    fs.linkSync(src, dst);
    res.linked.push(n);
  }
  return res;
}

// ---- CLI ----
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [cmd, ...rest] = process.argv.slice(2);
  const flag = (f) => rest.includes(f);
  const val = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : undefined; };
  const home = val('--home') ?? os.homedir();
  const hubHome = process.env.BEAR_AGENT_HOME ?? path.join(home, '.bear-agent-manager');
  const run = { check: () => check({ home }), export: () => exportMachine({ home, hubHome, dir: val('--dir'), withKeys: flag('--with-keys') }),
    import: () => importMachine({ home, hubHome, dir: val('--dir'), force: flag('--force') }), link: () => link({ home, merge: flag('--merge') }) }[cmd];
  if (!run) { console.error('usage: node scripts/machine.mjs check | export [--dir D] [--with-keys] | import --dir D [--force] | link [--merge]'); process.exit(2); }
  const r = run();
  console.log(JSON.stringify(r, null, 2));
  for (const w of r.warnings ?? []) console.error('⚠ ' + w);
}
