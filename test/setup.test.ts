import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error plain .mjs script
import { main, withPermission, nodeOk, PERMISSION } from '../scripts/setup.mjs';

test('withPermission adds the room tools once and keeps the rest of settings.json', () => {
  assert.deepEqual(withPermission({ theme: 'x', permissions: { allow: ['Bash(ls)'], deny: ['Read(.env)'] } }), { theme: 'x', permissions: { allow: ['Bash(ls)', PERMISSION], deny: ['Read(.env)'] } });
  assert.deepEqual(withPermission({}), { permissions: { allow: [PERMISSION] } });
  assert.equal(withPermission({ permissions: { allow: [PERMISSION] } }), null);
  assert.equal(nodeOk('22.18.0'), true);
  assert.equal(nodeOk('22.17.9'), false);
  assert.equal(nodeOk('24.1.0'), true);
});

test('setup on a fake HOME: installs the plugin and the permission, asks nothing silently, and a second run changes nothing', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-setup-'));
  const cfg = path.join(home, '.claude');
  fs.mkdirSync(cfg, { recursive: true });
  fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify({ model: 'opus', permissions: { allow: ['Bash(ls)'] } }));
  const log = path.join(home, 'claude-calls.txt');
  const stub = path.join(home, 'claude-stub.mjs');
  fs.writeFileSync(stub, `import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2), dir = process.env.CLAUDE_CONFIG_DIR;
fs.appendFileSync(${JSON.stringify(log)}, a.join(' ') + ' @ ' + dir + '\\n');
if (a[1] === 'install') { fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true }); fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { [a[2]]: [{}] } })); }
`);
  const run = async (extra: string[] = []) => {
    const lines: string[] = [];
    const previousHome = process.env.BEAR_AGENT_HOME;
    process.env.BEAR_AGENT_HOME = path.join(home, '.bear-agent-manager');
    try {
      const r = await main(['--home', home, '--config-dir', cfg, '--claude', `node ${stub}`, '--skip-npm', ...extra], { out: (s: string) => lines.push(s) });
      return { ...r, text: lines.join('\n') };
    } finally {
      if (previousHome === undefined) delete process.env.BEAR_AGENT_HOME;
      else process.env.BEAR_AGENT_HOME = previousHome;
    }
  };
  try {
    // no --yes and no terminal: the settings file is not touched
    const first = await run();
    assert.equal(JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8')).permissions.allow.includes(PERMISSION), false);
    assert.match(first.text, /TODO\s+permission/);
    assert.match(fs.readFileSync(log, 'utf8'), /plugin marketplace add .* @ .*\n.*plugin install bear-agent-manager@bear-agent-manager-local @ /);

    const second = await run(['--yes']);
    const settings = JSON.parse(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'));
    assert.deepEqual(settings.permissions.allow, ['Bash(ls)', PERMISSION]);
    assert.equal(settings.model, 'opus');
    assert.equal(fs.readdirSync(cfg).filter((f) => f.startsWith('settings.json.bak-')).length, 1, 'a backup is kept');
    assert.equal(second.code, 0);
    assert.match(second.text, /OK\s+plugin @/);
    assert.equal(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 2, 'the plugin was installed only once');

    const before = fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8');
    const third = await run(['--yes']);
    assert.equal(fs.readFileSync(path.join(cfg, 'settings.json'), 'utf8'), before, 'idempotent');
    assert.equal(fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length, 2);
    assert.equal(fs.readdirSync(cfg).filter((f) => f.startsWith('settings.json.bak-')).length, 1);
    assert.match(third.text, /TODO\s+login @/, 'login is only reported, never read');
    assert.doesNotMatch(third.text, /link editors|editor panel|hub autostart/, '--yes alone never runs the optional extras');

    const dry = await run(['--dry-run']);
    assert.equal(dry.code, 0);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('setup offers chat sharing for two Claude accounts, keeps dry-run and --yes safe, and does not ask again once shared', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-setup-share-'));
  const cfg = path.join(home, '.claude');
  const ag = path.join(home, '.claude-antigravity');
  fs.mkdirSync(path.join(cfg, 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(ag, 'plugins'), { recursive: true });
  for (const dir of [cfg, ag]) {
    fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: {} }));
  }
  fs.writeFileSync(path.join(cfg, 'settings.json'), JSON.stringify({ theme: 'dark' }));
  const log = path.join(home, 'claude-calls.txt');
  const stub = path.join(home, 'claude-stub.mjs');
  fs.writeFileSync(stub, `import fs from 'node:fs'; import path from 'node:path';
const a = process.argv.slice(2), dir = process.env.CLAUDE_CONFIG_DIR;
fs.appendFileSync(${JSON.stringify(log)}, a.join(' ') + ' @ ' + dir + '\\n');
if (a[1] === 'install') { fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true }); fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { [a[2]]: [{}] } })); }
`);
  const run = async (extra: string[] = [], ask?: (question: string) => boolean | Promise<boolean>) => {
    const lines: string[] = [];
    const previousHome = process.env.BEAR_AGENT_HOME;
    process.env.BEAR_AGENT_HOME = path.join(home, '.bear-agent-manager');
    try {
      const r = await main(['--home', home, '--config-dir', cfg, '--claude', `node ${stub}`, '--skip-npm', ...extra], { out: (s: string) => lines.push(s), ask });
      return { ...r, text: lines.join('\n') };
    } finally {
      if (previousHome === undefined) delete process.env.BEAR_AGENT_HOME;
      else process.env.BEAR_AGENT_HOME = previousHome;
    }
  };
  try {
    const dry = await run(['--dry-run']);
    assert.match(dry.text, /--\s+link editors: dry run: would link Claude data/);
    assert.equal(fs.existsSync(path.join(cfg, 'projects')), false);
    assert.equal(fs.existsSync(path.join(ag, 'projects')), false);

    const yes = await run(['--yes']);
    assert.match(yes.text, /TODO\s+link editors: not changed/);
    assert.equal(fs.existsSync(path.join(cfg, 'projects')), false, '--yes does not silently enable optional sharing');

    const questions: string[] = [];
    const linked = await run([], async (question) => {
      questions.push(question);
      return question.startsWith('Share chats');
    });
    assert.ok(questions.some((question) => question.startsWith('Share chats')));
    const source = path.join(cfg, 'projects');
    const target = path.join(ag, 'projects');
    assert.equal(fs.lstatSync(target).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(target).toLowerCase(), fs.realpathSync(source).toLowerCase());

    const rerunQuestions: string[] = [];
    const rerun = await run([], async (question) => {
      rerunQuestions.push(question);
      return false;
    });
    assert.equal(rerunQuestions.some((question) => question.startsWith('Share chats')), false);
    assert.match(rerun.text, /OK\s+link editors: projects already shared/);
    assert.equal(fs.realpathSync(target).toLowerCase(), fs.realpathSync(source).toLowerCase(), 'rerun leaves the existing link intact');
    assert.equal(linked.code, 0);
    assert.equal(rerun.code, 0);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('setup checks the configured Ollama model and reports missing Claude login files without reading credentials', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-setup-status-'));
  const cfg = path.join(home, '.claude');
  const ag = path.join(home, '.claude-antigravity');
  const hubHome = path.join(home, '.bear-agent-manager');
  fs.mkdirSync(path.join(cfg, 'plugins'), { recursive: true });
  fs.mkdirSync(path.join(ag, 'plugins'), { recursive: true });
  fs.mkdirSync(hubHome, { recursive: true });
  fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@bear-agent-manager-local': [{}] } }));
  fs.writeFileSync(path.join(ag, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@bear-agent-manager-local': [{}] } }));
  fs.writeFileSync(path.join(ag, '.credentials.json'), 'FAKE_TOKEN_MUST_NOT_BE_READ_OR_PRINTED');
  let models = [{ name: 'qwen2.5:7b' }];
  const requests: string[] = [];
  const server = createServer((req, res) => {
    assert.equal(req.headers.authorization, undefined, 'Ollama status is a public tags check, not an authenticated request');
    requests.push(`${req.method} ${req.url}`);
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ models }));
  });
  const previousHome = process.env.BEAR_AGENT_HOME;
  let output = '';
  try {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('fake Ollama host did not bind');
    fs.writeFileSync(path.join(hubHome, 'settings.json'), JSON.stringify({
      localSummarize: { enabled: false, host: `http://127.0.0.1:${address.port}`, model: 'qwen2.5:7b' },
    }));
    process.env.BEAR_AGENT_HOME = hubHome;
    const run = async () => {
      const lines: string[] = [];
      const result = await main(['--home', home, '--config-dir', cfg, '--config-dir', ag, '--skip-npm', '--dry-run'], { out: (s: string) => lines.push(s) });
      output = lines.join('\n');
      return result;
    };

    const available = await run();
    assert.match(output, /OK\s+Ollama: model qwen2\.5:7b is available/);
    assert.match(output, /TODO\s+Missing sign-ins: Claude \.claude \(file presence only/);
    assert.match(output, /OK\s+login @ .*\.claude-antigravity: signed in/);
    assert.doesNotMatch(output, /FAKE_TOKEN_MUST_NOT_BE_READ_OR_PRINTED|accessToken|refreshToken/);
    assert.deepEqual(requests, ['GET /api/tags']);
    assert.equal(available.code, 0);

    models = [{ name: 'another-model' }];
    const missing = await run();
    assert.match(output, /WARN\s+Ollama: model qwen2\.5:7b is missing/);
    assert.match(output, /ollama pull qwen2\.5:7b/);
    assert.deepEqual(requests, ['GET /api/tags', 'GET /api/tags'], 'setup only lists models; it never runs an install');
    assert.equal(missing.code, 0);
  } finally {
    if (previousHome === undefined) delete process.env.BEAR_AGENT_HOME;
    else process.env.BEAR_AGENT_HOME = previousHome;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    fs.rmSync(home, { recursive: true, force: true });
  }
});
