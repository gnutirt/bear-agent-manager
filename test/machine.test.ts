import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check, exportMachine, importMachine, KEY_WARNING, link } from '../scripts/machine.mjs';

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mach-'));
  const vs = path.join(home, '.claude'), hub = path.join(home, '.bear-agent-manager');
  const w = (p: string, t: string) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
  w(path.join(vs, 'skills', 'local-ai', 'SKILL.md'), '---\nname: local-ai\n---\n');
  w(path.join(vs, 'agents', 'rev.md'), 'agent');
  w(path.join(vs, 'CLAUDE.md'), '# global');
  w(path.join(vs, 'history.jsonl'), '{}\n');
  w(path.join(vs, 'settings.json'), JSON.stringify({ permissions: { allow: ['x'] }, env: { SECRET_TOKEN: 'sk-live-1' } }));
  w(path.join(vs, '.credentials.json'), '{"claudeAiOauth":"secret"}');
  w(path.join(home, '.claude.json'), '{"oauthAccount":{}}');
  w(path.join(vs, 'projects', 'D--repo', 'memory', 'MEMORY.md'), '- fact');
  w(path.join(vs, 'projects', 'D--repo', 'chat.jsonl'), '{}');
  w(path.join(vs, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@local': [{}] } }));
  w(path.join(vs, 'plugins', 'known_marketplaces.json'), JSON.stringify({ local: { source: { source: 'directory', path: path.join(home, 'src', 'bear') } } }));
  w(path.join(hub, 'settings.json'), '{"workerCap":3}');
  w(path.join(hub, 'providers.json'), '[{"id":"intern","key":"sk-intern-9"}]');
  return { home, vs, hub, ag: path.join(home, '.claude-antigravity') };
}
const all = (d: string): string[] => fs.readdirSync(d, { recursive: true }).map(String);

test('export carries skills, agents, memory and settings, never logins; keys only with --with-keys', () => {
  const { home, hub } = fakeHome();
  const out = path.join(home, 'out');
  const r = exportMachine({ home, hubHome: hub, dir: out });
  const files = all(out).map((f) => f.replace(/\\/g, '/'));
  for (const f of ['claude/skills/local-ai/SKILL.md', 'claude/agents/rev.md', 'claude/CLAUDE.md', 'claude/projects/D--repo/memory/MEMORY.md', 'hub/settings.json', 'plugins.json', 'manifest.json']) assert.ok(files.includes(f), f);
  assert.ok(!files.some((f) => /credentials|\.claude\.json|chat\.jsonl|providers/.test(f)), files.join(', '));
  assert.ok(!fs.readFileSync(path.join(out, 'claude', 'settings.json'), 'utf8').includes('sk-live-1'), 'env block stripped');
  assert.deepEqual(r.warnings, []);
  assert.match(fs.readFileSync(path.join(out, 'plugins.json'), 'utf8'), /"~[\\/]+src[\\/]+bear"/, 'home written as ~');
  const k = exportMachine({ home, hubHome: hub, dir: path.join(home, 'out2'), withKeys: true });
  assert.ok(fs.existsSync(path.join(home, 'out2', 'hub', 'providers.json')));
  assert.deepEqual(k.warnings, [KEY_WARNING]);
});

test('#156: export keeps only mcpServers, turns secret env/header values into ${VAR}, never copies .claude.json', () => {
  const { home, hub } = fakeHome();
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({
    oauthAccount: { email: 'someone@example.com' },
    projects: { 'D:/secret': { history: ['private'] } },
    mcpServers: {
      github: { command: 'npx', args: ['-y', 'server-github'], env: { GITHUB_TOKEN: 'ghp_SecretValue1234567890abcd', LOG_LEVEL: 'info' } },
      notes: { type: 'http', url: 'https://notes.example/mcp', headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig', 'X-Trace': 'on' } },
    },
  }));
  const out = path.join(home, 'out');
  const r = exportMachine({ home, hubHome: hub, dir: out });
  const file = path.join(out, 'mcp.json');
  assert.ok(fs.existsSync(file), 'mcp.json written when the machine has servers');
  const txt = fs.readFileSync(file, 'utf8');
  for (const secret of ['ghp_SecretValue1234567890abcd', 'eyJhbGciOiJIUzI1NiJ9', 'someone@example.com', 'private']) assert.ok(!txt.includes(secret), `the export must not contain ${secret}`);
  assert.ok(!fs.existsSync(path.join(out, 'claude', '.claude.json')), 'the login file itself is never copied');
  const j = JSON.parse(txt);
  assert.equal(j.servers.github.env.GITHUB_TOKEN, '${GITHUB_TOKEN}');
  assert.equal(j.servers.github.env.LOG_LEVEL, 'info', 'a harmless value stays');
  assert.equal(j.servers.notes.headers.Authorization, '${AUTHORIZATION}', 'a header value is redacted too');
  assert.equal(j.servers.notes.headers['X-Trace'], 'on');
  assert.deepEqual([...j.vars].sort(), ['AUTHORIZATION', 'GITHUB_TOKEN']);
  assert.deepEqual(r.mcp.servers, ['github', 'notes']);
  // A machine without servers gets no mcp.json at all, and import of that folder still works.
  const bare = fakeHome();
  exportMachine({ home: bare.home, hubHome: bare.hub, dir: path.join(bare.home, 'out') });
  assert.ok(!fs.existsSync(path.join(bare.home, 'out', 'mcp.json')));
});

test('#156: import lists `claude mcp add-json … --scope user` per server and can run them argv-only', () => {
  const { home, hub } = fakeHome();
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({
    mcpServers: { github: { command: 'npx', args: ['-y', 'server-github'], env: { GITHUB_TOKEN: 'ghp_RealValueHere1234567890' } } },
  }));
  const out = path.join(home, 'out');
  exportMachine({ home, hubHome: hub, dir: out });
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mach-mcp-'));
  const dry = importMachine({ home: target, hubHome: path.join(target, '.bear-agent-manager'), dir: out, env: {} });
  assert.equal(dry.mcp.length, 1);
  assert.equal(dry.mcp[0].ran, false, 'no runner: nothing is executed');
  assert.match(dry.mcp[0].cmd, /^claude mcp add-json github /);
  assert.match(dry.mcp[0].cmd, /--scope user$/);
  assert.deepEqual(dry.mcpMissing, ['GITHUB_TOKEN'], 'the user is told which variable to set');

  const seen: string[][] = [];
  const run = (file: string, argv: string[]) => { seen.push([file, ...argv]); };
  const real = importMachine({ home: target, hubHome: path.join(target, '.bear-agent-manager'), dir: out, run, env: { GITHUB_TOKEN: 'set' } });
  assert.equal(real.mcp[0].ran, true);
  assert.deepEqual(real.mcpMissing, []);
  assert.deepEqual(seen[0].slice(0, 3), ['claude', 'mcp', 'add-json']);
  assert.equal(seen[0][3], 'github');
  assert.deepEqual(seen[0].slice(-2), ['--scope', 'user']);
  const sent = seen[0][4];
  assert.ok(!sent.includes('ghp_RealValueHere1234567890'), 'the command carries the placeholder, never the secret');
  assert.equal(JSON.parse(sent).env.GITHUB_TOKEN, '${GITHUB_TOKEN}');
});

test('import never overwrites without --force, backs up with it, and lists plugin commands', () => {
  const { home, hub } = fakeHome();
  const out = path.join(home, 'out');
  exportMachine({ home, hubHome: hub, dir: out });
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mach-new-'));
  fs.mkdirSync(path.join(target, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(target, '.claude', 'CLAUDE.md'), '# mine');
  const r = importMachine({ home: target, hubHome: path.join(target, '.bear-agent-manager'), dir: out });
  assert.ok(r.skipped.includes('claude/CLAUDE.md'));
  assert.equal(fs.readFileSync(path.join(target, '.claude', 'CLAUDE.md'), 'utf8'), '# mine');
  assert.ok(fs.existsSync(path.join(target, '.claude', 'skills', 'local-ai', 'SKILL.md')));
  assert.ok(r.plugins.some((p: any) => p.cmd === 'claude plugin install bear-agent-manager@local'));
  assert.ok(r.plugins.some((p: any) => p.localPath), 'a local marketplace asks for its new clone path');
  const f = importMachine({ home: target, hubHome: path.join(target, '.bear-agent-manager'), dir: out, force: true });
  assert.equal(fs.readFileSync(path.join(target, '.claude', 'CLAUDE.md'), 'utf8'), '# global');
  assert.ok(f.backedUp.some((b: string) => /CLAUDE\.md\.bak-/.test(b)));
});

test('link: shares dirs and files, refuses real Antigravity data unless --merge, never deletes', () => {
  const { home, vs, ag } = fakeHome();
  fs.mkdirSync(path.join(ag, 'skills', 'mine'), { recursive: true });
  fs.writeFileSync(path.join(ag, 'skills', 'mine', 'SKILL.md'), 'ag skill');
  fs.writeFileSync(path.join(ag, 'settings.json'), '{"permissions":{}}');
  const r = link({ home });
  assert.ok(r.linked.includes('projects') && r.linked.includes('CLAUDE.md'));
  assert.ok(r.refused.some((x: string) => x.startsWith('skills')) && r.refused.some((x: string) => x.startsWith('settings.json')));
  assert.ok(fs.lstatSync(path.join(ag, 'projects')).isSymbolicLink(), 'junction on win32, symlink elsewhere');
  const c = check({ home });
  assert.equal(c.links.find((l: any) => l.name === 'projects').state, 'linked');
  assert.deepEqual(c.settingsDiff, ['khác nhau: permissions', 'chỉ có ở VS Code: env']);
  const m = link({ home, merge: true });
  assert.deepEqual(m.refused, []);
  assert.ok(fs.existsSync(path.join(vs, 'skills', 'mine', 'SKILL.md')), 'Antigravity-only skill merged into .claude');
  assert.ok(m.backedUp.length === 2 && m.backedUp.every((b: string) => fs.existsSync(b)), 'replaced data kept as .bak');
  assert.equal(link({ home }).linked.length, 0, 'second run: everything already linked');
});

test('hub: POST /api/machine/export writes into <archive>/machine, keys only when asked', async () => {
  const { makeHub } = await import('./helpers.ts');
  const { home } = fakeHome();
  const arc = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mach-arc-'));
  process.env.BEAR_AGENT_ARCHIVE_DIR = arc;
  const { hub, call } = await makeHub(undefined, undefined, { machineHome: home });
  try {
    const started = await call<any>('/api/machine/export', { withKeys: false });
    assert.deepEqual(started, { started: true, dir: path.join(arc, 'machine') });
    const done = async () => { for (let i = 0; i < 200; i++) { const g = await call<any>('/api/machine'); if (!g.running && g.last) return g; await new Promise((x) => setTimeout(x, 50)); } throw new Error('export did not finish'); };
    const r = (await done()).last;
    assert.equal(r.ok, true);
    assert.equal(r.dir, path.join(arc, 'machine'));
    assert.ok(r.items > 0 && fs.existsSync(path.join(arc, 'machine', 'claude', 'skills', 'local-ai', 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(arc, 'machine', 'claude', '.credentials.json')));
    assert.deepEqual(r.warnings, []);
    assert.ok(r.copied > 0);
    // a second export copies only what changed
    await call('/api/machine/export', { withKeys: false });
    await new Promise((x) => setTimeout(x, 20));
    const again = (await done()).last;
    assert.equal(again.ok, true);
    assert.ok(again.skipped > 0, 'unchanged files skipped');
  } finally { delete process.env.BEAR_AGENT_ARCHIVE_DIR; await hub.close(); }
});

test('hub: after a restart the last export is read back from manifest.json', async () => {
  const { makeHub } = await import('./helpers.ts');
  const arc = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-mach-man-'));
  fs.mkdirSync(path.join(arc, 'machine'));
  fs.writeFileSync(path.join(arc, 'machine', 'manifest.json'), JSON.stringify({ exportedAt: '2026-10-18T10:00:00.000Z', withKeys: false, items: ['a', 'b', 'c'] }));
  process.env.BEAR_AGENT_ARCHIVE_DIR = arc;
  const { hub, call } = await makeHub();
  try {
    const g = await call<any>('/api/machine');
    assert.deepEqual([g.running, g.last.items, g.last.at, g.last.fromManifest], [null, 3, Date.parse('2026-10-18T10:00:00.000Z'), true]);
  } finally { delete process.env.BEAR_AGENT_ARCHIVE_DIR; await hub.close(); }
});

test('#174: a raw token passed as a CLI argument (--token VALUE, --api-key=VALUE) never reaches the export', () => {
  const { home, hub } = fakeHome();
  const hex = '9f3a1c7e5b2d4f60a8e1c3b5d7f90a2b', hex2 = '0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e';
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ mcpServers: {
    tool: { command: 'npx', args: ['-y', 'some-mcp', '--token', hex, '--api-key=' + hex2, '--port', '8080', '--auth-token', '${ALREADY}'] },
  } }));
  const out = path.join(home, 'out');
  exportMachine({ home, hubHome: hub, dir: out });
  const txt = fs.readFileSync(path.join(out, 'mcp.json'), 'utf8');
  for (const secret of [hex, hex2]) assert.ok(!txt.includes(secret), `the export must not contain ${secret}`);
  const j = JSON.parse(txt);
  assert.deepEqual(j.servers.tool.args, ['-y', 'some-mcp', '--token', '${TOOL_ARG_3}', '--api-key=${TOOL_ARG_4}', '--port', '8080', '--auth-token', '${ALREADY}']);
  assert.deepEqual([...j.vars].sort(), ['TOOL_ARG_3', 'TOOL_ARG_4']);
});
