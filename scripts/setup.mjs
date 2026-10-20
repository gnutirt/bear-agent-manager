// One-step setup: `npm run setup`. Safe to run again: every step looks at the current state first and does nothing if it is done.
// Usage: node scripts/setup.mjs [--yes] [--dry-run] [--skip-npm] [--link] [--vscode] [--autostart] [--app [--url U] [--browser EXE]]
//        [--home H] [--config-dir D]... [--claude CMD] [--startup-dir D] [--app-dir D]   (the last five are for tests and odd machines)
// Never reads a token: it only checks that the login file exists.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { check, link } from './machine.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PLUGIN = 'bear-agent-manager@bear-agent-manager-local';
export const PERMISSION = 'mcp__plugin_bear-agent-manager_room';
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

/** The settings.json after adding the room permission, or null when it is already there. */
export function withPermission(settings) {
  const allow = settings?.permissions?.allow;
  if (Array.isArray(allow) && allow.some((a) => a === PERMISSION || a === `${PERMISSION}__*`)) return null;
  return { ...settings, permissions: { ...settings?.permissions, allow: [...(Array.isArray(allow) ? allow : []), PERMISSION] } };
}

/** Edge or Chrome on this machine, or null. */
export function findBrowser(env = process.env, platform = process.platform, exists = fs.existsSync) {
  const win = ['ProgramFiles(x86)', 'ProgramFiles', 'LOCALAPPDATA'].flatMap((k) => env[k] ? [
    path.join(env[k], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(env[k], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ] : []);
  const list = platform === 'win32' ? win : platform === 'darwin' ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'] : ['/usr/bin/microsoft-edge', '/usr/bin/google-chrome', '/usr/bin/chromium'];
  return list.find((f) => exists(f)) ?? null;
}

/** Windows: a .lnk that starts the browser with --app=URL. Linux: a .desktop file. Not changed when it already points at the same thing. */
export function createAppShortcut({ url = 'http://127.0.0.1:7788', browser, dirs, platform = process.platform, env = process.env } = {}) {
  const exe = browser ?? findBrowser(env, platform);
  if (!exe) return { ok: false, url, files: [], error: 'no Edge or Chrome found: pass --browser <path>' };
  const args = `--app=${url}`;
  const targets = dirs ?? (platform === 'win32'
    ? [path.join(env.USERPROFILE ?? os.homedir(), 'Desktop'), path.join(env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs')]
    : platform === 'linux' ? [path.join(os.homedir(), '.local', 'share', 'applications')] : []);
  if (!targets.length) return { ok: false, url, files: [], error: `app shortcuts are not made on ${platform}: open ${url} in Chrome/Edge and choose Install app` };
  const files = [];
  for (const dir of targets) {
    fs.mkdirSync(dir, { recursive: true });
    if (platform === 'win32') {
      const file = path.join(dir, 'Bear Agent Manager.lnk');
      const q = (s) => `'${s.replace(/'/g, "''")}'`;
      const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(file)});$s.TargetPath=${q(exe)};$s.Arguments=${q(args)};$s.IconLocation=${q(exe + ',0')};$s.Description='Bear Agent Manager';$s.Save()`;
      const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8' });
      if (r.status !== 0) return { ok: false, url, files, error: `could not write ${file}: ${(r.stderr || r.stdout || '').trim().slice(0, 200)}` };
      files.push(file);
    } else {
      const file = path.join(dir, 'bear-agent-manager.desktop');
      fs.writeFileSync(file, `[Desktop Entry]\nType=Application\nName=Bear Agent Manager\nExec="${exe}" ${args}\nTerminal=false\nCategories=Development;\n`);
      files.push(file);
    }
  }
  return { ok: true, url, files, exe, args };
}

export const nodeOk = (version = process.versions.node) => {
  const [maj, min] = version.split('.').map(Number);
  return maj > 22 || (maj === 22 && min >= 18);
};

function parse(argv) {
  const o = { yes: false, dry: false, skipNpm: false, link: false, vscode: false, autostart: false, app: false, url: 'http://127.0.0.1:7788', browser: undefined, appDir: undefined, home: os.homedir(), dirs: [], claude: 'claude', startupDir: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--app') o.app = true;
    else if (a === '--url') o.url = argv[++i];
    else if (a === '--browser') o.browser = argv[++i];
    else if (a === '--app-dir') o.appDir = path.resolve(argv[++i]);
    else if (a === '--yes') o.yes = true;
    else if (a === '--dry-run') o.dry = true;
    else if (a === '--skip-npm') o.skipNpm = true;
    else if (a === '--link') o.link = true;
    else if (a === '--vscode') o.vscode = true;
    else if (a === '--autostart') o.autostart = true;
    else if (a === '--home') o.home = path.resolve(argv[++i]);
    else if (a === '--config-dir') o.dirs.push(path.resolve(argv[++i]));
    else if (a === '--claude') o.claude = argv[++i];
    else if (a === '--startup-dir') o.startupDir = path.resolve(argv[++i]);
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

/** Runs a command; `cmd` may be "node stub.mjs" (split on spaces) so tests can stand in for claude. */
function run(cmd, args, env = {}) {
  const [bin, ...pre] = cmd.split(' ');
  const r = spawnSync(bin, [...pre, ...args], { env: { ...process.env, ...env }, encoding: 'utf8', shell: process.platform === 'win32' && !cmd.includes(' '), cwd: ROOT });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

export async function main(argv = process.argv.slice(2), { out = (s) => console.log(s), ask } = {}) {
  const o = parse(argv);
  const report = [];   // [step, status, detail]
  const say = (s) => out(s);
  const rl = ask || o.yes || !process.stdin.isTTY ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = async (question, flag, extra = false) => {   // --yes covers the permission; extras (link, panel, autostart) need their own flag
    if (o.dry) return false;
    if (flag || (o.yes && !extra)) return true;
    if (o.yes) return false;
    if (ask) return ask(question);
    if (!rl) return false;   // no terminal and no --yes: never change things silently
    return /^y/i.test((await rl.question(`${question} [y/N] `)).trim());
  };
  try {
    // 1. Node
    report.push(['Node.js', nodeOk() ? 'ok' : 'fail', `v${process.versions.node}${nodeOk() ? '' : ' (need >= 22.18)'}`]);
    if (!nodeOk()) { say('Node.js >= 22.18 is required.'); return finish(report, say, 1); }

    // 2. npm ci (only when the optional Copilot agent needs it; the core has no runtime dependencies)
    const modules = fs.existsSync(path.join(ROOT, 'node_modules'));
    if (o.skipNpm || o.dry) report.push(['npm ci', 'skip', o.dry ? 'dry run' : '--skip-npm']);
    else if (modules) report.push(['npm ci', 'ok', 'node_modules already there']);
    else {
      say('Installing npm packages (npm ci) ...');
      const r = run('npm', ['ci']);
      report.push(['npm ci', r.ok ? 'ok' : 'fail', r.ok ? 'installed' : r.out.slice(-200)]);
    }

    // 3. every Claude config dir: plugin + room permission
    const found = o.dirs.length ? o.dirs : check({ home: o.home }).configDirs.map((c) => c.dir);
    if (!found.length) report.push(['Claude config dir', 'warn', `none under ${o.home}: run claude once, then setup again`]);
    for (const dir of found) {
      const env = { CLAUDE_CONFIG_DIR: dir };
      const installed = Object.keys(readJson(path.join(dir, 'plugins', 'installed_plugins.json'), {}).plugins ?? {}).includes(PLUGIN);
      if (installed) report.push([`plugin @ ${dir}`, 'ok', 'installed']);
      else if (o.dry) report.push([`plugin @ ${dir}`, 'skip', 'dry run: would add the marketplace and install']);
      else {
        const add = run(o.claude, ['plugin', 'marketplace', 'add', ROOT], env);
        const inst = add.ok || /already/i.test(add.out) ? run(o.claude, ['plugin', 'install', PLUGIN], env) : add;
        report.push([`plugin @ ${dir}`, inst.ok || /already/i.test(inst.out) ? 'ok' : 'fail', inst.ok ? 'installed' : `run by hand: CLAUDE_CONFIG_DIR=${dir} claude plugin install ${PLUGIN} (${inst.out.slice(0, 300)})`]);
      }
      const file = path.join(dir, 'settings.json'), cur = readJson(file, {}), next = withPermission(cur);
      if (!next) report.push([`permission @ ${dir}`, 'ok', 'room tools already allowed']);
      else {
        say(`\n${file}\n  + permissions.allow: "${PERMISSION}"`);
        if (await confirm(`Allow the room tools in ${dir}?`)) {
          if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-${stamp()}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
          report.push([`permission @ ${dir}`, 'ok', 'added (backup kept)']);
        } else report.push([`permission @ ${dir}`, 'todo', o.dry ? 'dry run' : 'not changed: run again with --yes']);
      }
      const logged = fs.existsSync(path.join(dir, '.credentials.json'));
      report.push([`login @ ${dir}`, logged ? 'ok' : 'todo', logged ? 'signed in' : 'run claude here and /login (macOS keeps it in the keychain: not checked)']);
    }

    // 4. optional extras
    const machine = check({ home: o.home });
    const accountCount = machine.configDirs.length;
    const projectsShared = machine.links.find(({ name }) => name === 'projects')?.state === 'linked';
    const shouldOfferLink = accountCount >= 2 && !projectsShared;
    if (o.link || shouldOfferLink) {
      if (o.dry) {
        report.push(['link editors', 'skip', 'dry run: would link Claude data between VS Code and Antigravity']);
      } else if (await confirm('Share chats between VS Code and Antigravity (link .claude-antigravity to .claude)?', o.link, true)) {
        const r = link({ home: o.home });
        report.push(['link editors', r.refused.length ? 'warn' : 'ok', `${r.linked.length} linked, ${r.already.length} already${r.refused.length ? `, ${r.refused.length} refused (node scripts/machine.mjs link --merge)` : ''}`]);
      } else {
        report.push(['link editors', 'todo', 'not changed: approve sharing or run again with --link']);
      }
    } else if (projectsShared) {
      report.push(['link editors', 'ok', 'projects already shared']);
    }
    if (await confirm('Install the VS Code / Antigravity panel (scripts/install-vscode.mjs)?', o.vscode, true)) {
      const r = run('node', [path.join(ROOT, 'scripts', 'install-vscode.mjs')]);
      report.push(['editor panel', r.ok ? 'ok' : 'fail', r.ok ? 'installed: Developer: Reload Window' : r.out.slice(-150)]);
    }
    if (await confirm('Add a "Bear Agent Manager" app window shortcut (Edge/Chrome app mode)?', o.app, true)) {
      const r = createAppShortcut({ url: o.url, browser: o.browser, dirs: o.appDir ? [o.appDir] : undefined });
      report.push(['app window', r.ok ? 'ok' : 'warn', r.ok ? `${r.files.join(', ')} -> ${r.url}` : r.error]);
    }
    if (process.platform === 'win32' || o.startupDir) {
      if (await confirm('Start the hub when you sign in to Windows?', o.autostart, true)) {
        const { setAutostart } = await import(pathToFileURL(path.join(ROOT, 'hub', 'autostart.ts')).href);
        const r = setAutostart(true, process.execPath, ROOT, o.startupDir, o.startupDir ? 'win32' : process.platform);
        report.push(['hub autostart', r.on ? 'ok' : 'fail', r.file]);
      }
    }
    report.push(['Copilot agent', 'info', 'optional: run `copilot login` once, then add a profile in Settings']);
    return finish(report, say, report.some((r) => r[1] === 'fail') ? 1 : 0);
  } finally { rl?.close(); }
}

function finish(report, say, code) {
  say('\nbear-agent-manager setup');
  const mark = { ok: 'OK  ', skip: '--  ', todo: 'TODO', warn: 'WARN', fail: 'FAIL', info: 'INFO' };
  for (const [step, status, detail] of report) say(`  ${mark[status] ?? status}  ${step}: ${detail}`);
  say(report.some((r) => r[1] === 'todo' || r[1] === 'warn') ? '\nSome steps are open (TODO/WARN above). Run `npm run setup` again after fixing them.' : '\nDone. Start the hub with `npm run hub` and open http://127.0.0.1:7788.');
  return { code, report };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then((r) => process.exit(r.code), (e) => { console.error(e.message); process.exit(1); });
}
