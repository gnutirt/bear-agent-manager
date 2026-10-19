import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pickAccount } from '../hub/accountswitch.ts';
import { applyShare, planShare } from '../hub/accounts.ts';

const acc = (dir: string, five: number, extra: object = {}) => ({ configDirs: [dir], label: path.basename(dir), email: '', plan: '', fiveHour: { pct: five, resetsAt: null }, sevenDay: { pct: 10, resetsAt: null }, usageError: '', fetchedAt: 0, ...extra });
const cfg = { mode: 'ask' as const, atPct: 90, minOtherLeftPct: 20 };

test('pickAccount: the other account with room left, only with shared chats, never a logged-out or full one', () => {
  const a = acc('/h/.claude', 100), b = acc('/h/.claude-b', 30), c = acc('/h/.claude-c', 85);
  assert.equal(pickAccount([a, b, c], '/h/.claude', cfg, true).target, b);
  assert.equal(pickAccount([a, b], '/h/.claude', cfg, false).reason, 'not-shared');
  assert.equal(pickAccount([a, b], '/h/.claude', { ...cfg, mode: 'off' }, true).reason, 'off');
  assert.equal(pickAccount([a], '/h/.claude', cfg, true).reason, 'no-other');
  assert.equal(pickAccount([a, acc('/h/.claude-b', 0, { usageError: 'token expired' })], '/h/.claude', cfg, true).reason, 'other-unusable');
  assert.equal(pickAccount([a, c], '/h/.claude', cfg, true).reason, 'other-full', '85% used leaves 15% < 20%');
  assert.equal(pickAccount([a, acc('/h/.claude-b', 10, { sevenDay: { pct: 95, resetsAt: null } })], '/h/.claude', cfg, true).reason, 'other-full', 'the weekly window counts too');
});

test('POST /api/sessions/:id/switch: refused without shared chats; then the agent resumes on the other account in the background', async () => {
  const { makeHub } = await import('./helpers.ts');
  const jobs: any[] = [];
  const h = await makeHub(undefined, (j: any) => { jobs.push(j); });
  try {
    const a = path.join(h.dir, '.claude'), b = path.join(h.dir, '.claude-b');
    fs.mkdirSync(path.join(a, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(b, 'plugins'), { recursive: true });
    fs.writeFileSync(path.join(b, 'plugins', 'installed_plugins.json'), '{}');
    const tr = path.join(a, 'projects', 'alice.jsonl');
    fs.writeFileSync(tr, '');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alice', transcript: tr, configDir: a });
    await h.call('/api/rooms/web/join', { sessionId: 'a1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
    await assert.rejects(h.call('/api/sessions/a1/switch', { to: b }), (e: any) => e.status === 409, 'chats not shared yet');
    await assert.rejects(h.call('/api/sessions/a1/switch', { to: path.join(h.dir, 'elsewhere') }), (e: any) => e.status === 400);
    applyShare(planShare([a, b], a, true), a);
    await h.call('/api/sessions/a1/switch', { to: b });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(jobs.length, 1);
    assert.equal(path.resolve(jobs[0].configDir), path.resolve(b), 'the background run uses the other account');
    assert.equal(path.resolve((await h.call<any>('/api/sessions/a1')).session.configDir), path.resolve(b));
    const notes = (await h.call<any[]>('/api/rooms/web/messages?limit=10')).filter((m) => m.kind === 'system').map((m) => m.text);
    assert.ok(notes.some((t) => t.includes('alice') && t.includes('.claude-b')), notes.join(' | '));
  } finally { await h.hub.close(); }
});
