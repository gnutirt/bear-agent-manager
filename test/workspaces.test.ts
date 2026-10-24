import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildWorkspaces, normCwd } from '../hub/workspaces.ts';
import { projectSlug } from '../hub/apiagent.ts';
import { makeHub } from './helpers.ts';

const tmp = (p = 'ar-ws-') => fs.mkdtempSync(path.join(os.tmpdir(), p));

// T3 (#274 table): two sessions of the same folder — different spelling, case or through a junction — are one group.
// The folder is the topic (spec 2026-10-24-accounts-and-workspace-sessions.md); transcript bodies are never opened.
test('T3 workspaces: case/separator/junction spellings of one folder land in one group', () => {
  const root = tmp(), proj = path.join(root, 'Proj');
  fs.mkdirSync(proj, { recursive: true });
  const spellings = [proj, proj + path.sep, proj.toUpperCase()];
  const link = path.join(root, 'proj-link');
  let linked = false;
  try { fs.symlinkSync(proj, link, process.platform === 'win32' ? 'junction' : 'dir'); linked = true; } catch { /* no privilege: the other spellings still prove the point */ }
  if (linked) spellings.push(link);
  const sessions = spellings.map((cwd, i) => ({ id: `s${i}`, name: `agent${i}`, cwd, rooms: { r: 0 }, lastSeen: 1000 + i }));
  const out = buildWorkspaces({ sessions, configDirs: [] });
  assert.equal(out.length, 1, 'one folder, one group');
  assert.equal(out[0].sessions.length, spellings.length);
  assert.deepEqual(out[0].sessions.map((s) => s.name), spellings.map((_, i) => `agent${i}`).reverse(), 'newest activity first');
  assert.equal(normCwd(spellings[0]), normCwd(spellings[1]));
  if (process.platform === 'win32') assert.equal(normCwd(spellings[0]), normCwd(spellings[0].toUpperCase()));
});

test('T3 workspaces: chats outside the hub are counted and dated, their contents never read', () => {
  const root = tmp(), cwd = path.join(root, 'repo'), cfg = path.join(root, 'cfg');
  fs.mkdirSync(cwd, { recursive: true });
  const folder = path.join(cfg, 'projects', projectSlug(cwd));
  fs.mkdirSync(folder, { recursive: true });
  const mine = path.join(folder, 'hub-session.jsonl'), stranger = path.join(folder, 'outside.jsonl');
  fs.writeFileSync(mine, '{"type":"user"}\n');
  fs.writeFileSync(stranger, 'SECRET-MUST-NOT-LEAK\n');
  const out = buildWorkspaces({
    sessions: [{ id: 'hub-session', name: 'coder', cwd, rooms: { r: 0 }, transcript: mine, lastSeen: 1 }],
    configDirs: [cfg],
  });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].unregistered, { count: 1, newest: fs.statSync(stranger).mtimeMs });
  assert.ok(out[0].sessions[0].hasTranscript);
  assert.ok(!JSON.stringify(out).includes('SECRET'), 'the transcript body is never read');
  // the drive-letter spelling has its own slug folder; both spellings are scanned, never the same file twice
  fs.mkdirSync(path.join(cfg, 'projects', 'Other-slug'), { recursive: true });
});

test('T3 workspaces: GET /api/workspaces groups the hub sessions by folder and hides tokens', async () => {
  const { hub, call } = await makeHub();
  try {
    const cwd = tmp();
    await call('/api/sessions/register', { id: 'w1', cwd });
    await call('/api/sessions/w1/rename', { name: 'coder' });
    const groups = await call<any[]>('/api/workspaces');
    const g = groups.find((x) => x.key === normCwd(cwd));
    assert.ok(g, 'the registered folder is listed');
    assert.equal(g.sessions[0].name, 'coder');
    assert.equal(g.sessions[0].holder.where, 'none', 'no live pid: not running');
    assert.equal(g.unregistered.count, 0);
    assert.ok(!JSON.stringify(groups).includes(hub.token), 'never the hub token');
    // the tab is wired: the tab button, its pane and the route it loads
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['data-tab="folders"', 'id="view-folders"', "folders: loadFoldersView", "'/api/workspaces'"]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});
