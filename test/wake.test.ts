import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { planWakes, quotaResetFromTranscript } from '../hub/wake.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { startHub } from '../hub/server.ts';
import { makeHub } from './helpers.ts';

const acc = (pct: number, resetsAt: string | null, email = 'a@x.com'): any => ({ configDirs: ['C:/cfg'], label: 'main', email, plan: 'pro', fiveHour: { pct, resetsAt }, sevenDay: null, usageError: '', fetchedAt: 0 });
const cfg = { enabled: true, atPct: 90, afterResetMin: 2 };

test('planWakes: one booking per account and cycle, at reset + delay; off, below threshold or no reset time -> none', () => {
  const t = '2026-10-17T10:00:00Z';
  assert.deepEqual(planWakes([acc(95, t)], cfg, {}).map((w) => [w.key, w.entry]), [['a@x.com', { at: Date.parse(t) + 120_000, tries: 0 }]]);
  assert.deepEqual(planWakes([acc(95, t)], cfg, { 'a@x.com': { at: 1, tries: 0 } }), []);
  assert.deepEqual(planWakes([acc(95, t)], { ...cfg, enabled: false }, {}), []);
  assert.deepEqual(planWakes([acc(89, t)], cfg, {}), []);
  assert.deepEqual(planWakes([acc(99, null)], cfg, {}), []);
});

test('lead.wake settings: validated, merged, default off', () => {
  const d = defaultSettings(4);
  assert.deepEqual(d.lead.wake, { enabled: false, atPct: 90, afterResetMin: 2 });
  const s = patchSettings(d, { lead: { wake: { enabled: true, atPct: 5, afterResetMin: 999 } } });
  assert.deepEqual(s.lead.wake, { enabled: true, atPct: 50, afterResetMin: 120 });
});

test('usage wake: books at the poll, then at the reset posts as the user to this account only', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wake-'));
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'tok', expiresAt: Date.now() + 3600_000, subscriptionType: 'pro' } }));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.com' } }));
  const resetAt = new Date(Date.now() + 400).toISOString();
  let calls = 0;
  const fetchStub = (async () => new Response(JSON.stringify({ five_hour: { utilization: calls++ < 1 ? 95 : 3, resets_at: resetAt } }))) as typeof fetch;
  const h = await makeHub(undefined, undefined, { usageFetch: null, usageHome: home });
  try {
    await h.call('/api/sessions/register', { id: 'w1', cwd: 'C:/fw' });
    await h.call('/api/sessions/w1/rename', { name: 'alice' });
    await h.call('/api/sessions/register', { id: 'w2', cwd: 'C:/web', configDir: path.join(home, 'elsewhere') });
    await h.call('/api/sessions/w2/rename', { name: 'bob' });
    for (const id of ['w1', 'w2']) await h.call('/api/rooms/proj/join', { sessionId: id });
    await h.call('/api/settings', { lead: { wake: { enabled: true, atPct: 90, afterResetMin: 0 } } }, { method: 'PUT' });
  } finally { await h.hub.close(); }
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: fetchStub, usageHome: home, openUrl: () => {} });
  try {
    await new Promise((r) => setTimeout(r, 1200));
    const msgs = again.store.history('proj');
    assert.ok(msgs.some((m) => m.kind === 'system' && /hẹn đánh thức/.test(m.text)), 'booking announced');
    const wake = msgs.find((m) => !m.kind && m.fromId === null && /đã reset/.test(m.text));
    assert.ok(wake, msgs.map((m) => m.text).join(' | '));
    assert.deepEqual(wake!.mentions, ['alice'], 'only the agent on the reset account');
    assert.equal(again.store.state.wakeAt?.['a@x.com'], undefined, 'booking cleared');
  } finally { await again.close(); }
});

test('StopFailure rate_limit: reads the reset from the transcript, marks the session, books its wake', async () => {
  const h = await makeHub();
  try {
    const until = Math.floor(Date.now() / 1000) + 3600;
    const tr = path.join(h.dir, 'sf.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 5 } } }) + '\n' + JSON.stringify({ isApiErrorMessage: true, quotaLimits: { status: 'rejected', resetsAt: until, rateLimitType: 'five_hour' } }) + '\n');
    assert.deepEqual(quotaResetFromTranscript(tr), { until: until * 1000, type: 'five_hour' });
    assert.equal(quotaResetFromTranscript(path.join(h.dir, 'nope.jsonl')), null);
    await h.call('/api/sessions/register', { id: 'sf1', cwd: 'C:/fw', transcript: tr });
    await h.call('/api/sessions/sf1/rename', { name: 'alice' });
    await h.call('/api/rooms/proj/join', { sessionId: 'sf1' });
    const r = await fetch(`${h.hub.url}/hooks/stop-failure`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'sf1', error: 'rate_limit', transcript_path: tr }) });
    assert.equal(r.status, 200);
    assert.deepEqual(h.hub.store.session('sf1').limited, { until: until * 1000, type: 'five_hour' });
    assert.ok(h.hub.store.state.wakeAt?.['s:sf1']);
    assert.ok(h.hub.store.history('proj').some((m) => /alice hết hạn mức gói/.test(m.text)));
    await fetch(`${h.hub.url}/hooks/stop-failure`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'sf1', error: 'overloaded' }) });
    assert.ok(h.hub.store.history('proj').some((m) => /lỗi API \(overloaded\)/.test(m.text)));
  } finally { await h.hub.close(); }
});
