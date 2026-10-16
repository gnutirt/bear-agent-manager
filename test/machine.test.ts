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
    const r = await call<any>('/api/machine/export', { withKeys: false });
    assert.equal(r.dir, path.join(arc, 'machine'));
    assert.ok(r.items > 0 && fs.existsSync(path.join(arc, 'machine', 'claude', 'skills', 'local-ai', 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(arc, 'machine', 'claude', '.credentials.json')));
    assert.deepEqual(r.warnings, []);
    assert.deepEqual((await call<any>('/api/machine', { withKeys: true }, { method: 'GET', body: undefined })).last.items, r.items);
  } finally { delete process.env.BEAR_AGENT_ARCHIVE_DIR; await hub.close(); }
});
