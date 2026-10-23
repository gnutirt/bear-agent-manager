import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startHub } from '../hub/server.ts';
import { applyShare, planShare } from '../hub/accounts.ts';
import { until } from './helpers.ts';

// Two logged-in accounts on one machine (fake logins, fake usage API): A is out of its 5-hour window, B has room.
function machine(sharedChats: boolean) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wsw-'));
  const a = path.join(home, '.claude'), b = path.join(home, '.claude-b');
  for (const [dir, tok] of [[a, 'tokA'], [b, 'tokB']] as const) {
    fs.mkdirSync(path.join(dir, 'projects'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: tok, expiresAt: Date.now() + 3600_000, subscriptionType: 'pro' } }));
  }
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'alice@x.com' } }));
  fs.writeFileSync(path.join(b, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'bob@x.com' } }));
  if (sharedChats) applyShare(planShare([a, b], a, true), a);
  fs.mkdirSync(path.join(a, 'file-history', 'a1'), { recursive: true });   // B2: rewind snapshots of the session, not shared (only projects/ is)
  fs.writeFileSync(path.join(a, 'file-history', 'a1', 'f@v1'), 'snap');
  const reset = new Date(Date.now() + 3 * 3600_000).toISOString();
  const usageFetch = (async (_u: string, init: RequestInit) => {
    const auth = String((init.headers as Record<string, string>)?.authorization ?? (init.headers as Record<string, string>)?.Authorization ?? '');
    return new Response(JSON.stringify({ five_hour: { utilization: auth.includes('tokA') ? 100 : 10, resets_at: reset }, seven_day: { utilization: 10, resets_at: reset } }));
  }) as typeof fetch;
  return { home, a, b, usageFetch };
}

async function wakeOnA(sharedChats: boolean) {
  const m = machine(sharedChats);
  const jobs: any[] = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wsw-hub-'));
  const hub = await startHub({ dir, port: 0, revive: (j: any) => { jobs.push(j); }, batchMs: 0, autoRevive: true, listProcs: async () => [], probe: null, legacyKeyFile: path.join(dir, 'x.key'), usageFetch: m.usageFetch, usageHome: m.home, openUrl: () => {}, versionFetch: null, browser: null });
  const call = async (p: string, body?: unknown) => {
    const r = await fetch(hub.url + p, { method: body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', 'x-room-token': hub.token }, body: body === undefined ? undefined : JSON.stringify(body) });
    return r.json() as any;
  };
  const tr = path.join(m.a, 'projects', 'alice.jsonl');
  fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 5 } } }) + '\n');
  await call('/api/sessions/register', { id: 'a1', cwd: m.home, name: 'alice', transcript: tr, configDir: m.a });
  await call('/api/rooms/web/join', { sessionId: 'a1' });
  await fetch(`${hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
  await call('/api/rooms/web/messages', { text: '@alice go on' });
  await until(async () => jobs.length > 0 || (await call('/api/rooms/web/messages?limit=20')).some((x: any) => x.kind === 'system' && x.text.includes('alice')), 10_000, 'a wake or a notice');
  await new Promise((r) => setTimeout(r, 100));
  const notes = (await call('/api/rooms/web/messages?limit=20')).filter((x: any) => x.kind === 'system').map((x: any) => x.text);
  return { m, hub, jobs, notes };
}

test('a wake blocked by the account limit runs on the other logged-in account when chats are shared', async () => {
  const { m, hub, jobs, notes } = await wakeOnA(true);
  try {
    await until(() => jobs.length > 0, 10_000, 'the background run');
    assert.equal(jobs.length, 1, notes.join(' | '));
    assert.equal(path.resolve(jobs[0].configDir), path.resolve(m.b), 'the turn runs on account B');
    assert.ok(fs.existsSync(path.join(m.b, 'file-history', 'a1', 'f@v1')), 'B2: the rewind history came along');
    assert.ok(notes.some((t) => t.includes('alice') && /on the b account|tài khoản b\b/.test(t)), notes.join(' | '));
  } finally { await hub.close(); }
});

test('without shared chats it stays blocked and says why', async () => {
  const { hub, jobs, notes } = await wakeOnA(false);
  try {
    assert.equal(jobs.length, 0);
    assert.ok(notes.some((t) => /dùng chung chat|share chats/.test(t)), notes.join(' | '));
  } finally { await hub.close(); }
});
