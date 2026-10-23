import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { limitErrorMarker, planWakes, quotaResetFromTranscript } from '../hub/wake.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';
import { startHub, type ReviveJob } from '../hub/server.ts';
import { addTask } from '../hub/tasks.ts';
import { t } from '../shared/i18n.ts';
import { makeHub, until } from './helpers.ts';

const acc = (pct: number, resetsAt: string | null, email = 'a@x.com'): any => ({ configDirs: ['C:/cfg'], label: 'main', email, plan: 'pro', fiveHour: { pct, resetsAt }, sevenDay: null, usageError: '', fetchedAt: 0 });
const cfg = { enabled: true, atPct: 90, afterResetMin: 2 };

async function startUsageHub(dir: string, home: string, usageFetch: typeof fetch, revived: string[], sweepMs = 60_000) {
  const hub = await startHub({
    dir, port: 0, revive: (job: ReviveJob) => { revived.push(job.id); return 0; }, batchMs: 0, autoRevive: true,
    browser: null,
    listProcs: async () => [], probe: null, legacyKeyFile: path.join(dir, 'x.key'), usageFetch, versionFetch: null,
    usageHome: home, openUrl: () => {}, sweepMs,
  });
  async function call<T = any>(p: string, body?: unknown): Promise<T> {
    const res = await fetch(hub.url + p, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': hub.token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.error), { status: res.status });
    return data as T;
  }
  return { hub, call };
}

test('planWakes: one booking per account and cycle, at reset + delay; off, below threshold or no reset time -> none', () => {
  const t = '2026-10-17T10:00:00Z';
  assert.deepEqual(planWakes([acc(95, t)], cfg, {}).map((w) => [w.key, w.entry]), [['a@x.com', { at: Date.parse(t) + 120_000, tries: 0 }]]);
  assert.deepEqual(planWakes([acc(95, t)], cfg, { 'a@x.com': { at: 1, tries: 0 } }), []);
  assert.deepEqual(planWakes([acc(95, t)], { ...cfg, enabled: false }, {}), []);
  assert.deepEqual(planWakes([acc(89, t)], cfg, {}), []);
  assert.deepEqual(planWakes([acc(99, null)], cfg, {}), []);
});

test('lead.wake settings: validated, merged, default on', () => {
  const d = defaultSettings(4);
  assert.deepEqual(d.lead.wake, { enabled: true, atPct: 90, afterResetMin: 2 });
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
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: fetchStub, usageHome: home, openUrl: () => {}, browser: null });
  try {
    await until(() => again.store.history('proj').some((m) => !m.kind && m.fromId === null && /đã reset/.test(m.text)), 20_000, 'the wake-up after the reset');
    const msgs = again.store.history('proj');
    assert.ok(msgs.some((m) => m.kind === 'system' && /hẹn đánh thức/.test(m.text)), 'booking announced');
    const wake = msgs.find((m) => !m.kind && m.fromId === null && /đã reset/.test(m.text));
    assert.ok(wake, msgs.map((m) => m.text).join(' | '));
    assert.deepEqual(wake!.mentions, ['alice'], 'only the agent on the reset account');
    assert.equal(again.store.state.wakeAt?.['a@x.com'], undefined, 'booking cleared');
  } finally { await again.close(); }
});

test('usage threshold pauses account deliveries across restart and reset wakes queued and limited sessions', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-usage-pause-home-'));
  const configDir = path.join(home, '.claude');
  fs.mkdirSync(configDir);
  fs.writeFileSync(path.join(configDir, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'tok', expiresAt: Date.now() + 3_600_000, subscriptionType: 'pro' } }));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.com' } }));
  const hubDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-usage-pause-hub-'));
  fs.writeFileSync(path.join(hubDir, 'settings.json'), JSON.stringify({ language: 'vi', lead: { wake: { enabled: true, atPct: 90, afterResetMin: 0 } } }));
  const resetAt = new Date(Date.now() + 3_600_000).toISOString();
  let pct = 95;
  const usageFetch = (async () => new Response(JSON.stringify({ five_hour: { utilization: pct, resets_at: resetAt } }))) as typeof fetch;
  const transcripts = new Map<string, string>();
  const makeLimitTranscript = (id: string, resetsAt: number) => {
    const file = path.join(hubDir, `${id}.jsonl`);
    fs.writeFileSync(file, JSON.stringify({ type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429, quotaLimits: { resetsAt, rateLimitType: 'five_hour' } }) + '\n');
    transcripts.set(id, file);
  };
  const revived: string[] = [];
  const first = await startUsageHub(hubDir, home, usageFetch, revived);
  try {
    await until(() => first.hub.store.state.usagePaused?.['a@x.com'], 5_000, 'the account usage pause');
    const limit = Math.floor(Date.now() / 1000) + 3_600;
    makeLimitTranscript('alice', limit);
    makeLimitTranscript('stuck1', limit);
    makeLimitTranscript('stuck2', limit);
    for (const [id, name] of [['alice', 'alice'], ['bob', 'bob'], ['stuck1', 'stuck1'], ['stuck2', 'stuck2']]) {
      await first.call('/api/sessions/register', { id, cwd: 'C:/fw', configDir, ...(transcripts.has(id) ? { transcript: transcripts.get(id) } : {}) });
      await first.call(`/api/sessions/${id}/rename`, { name });
      await first.call('/api/rooms/proj/join', { sessionId: id });
    }
  } finally { await first.hub.close(); }

  const second = await startUsageHub(hubDir, home, usageFetch, revived);
  try {
    await until(() => second.hub.store.state.usagePaused?.['a@x.com'], 5_000, 'the persisted account usage pause');
    const bobWait = second.call<any>('/api/sessions/bob/wait?timeout=30');
    await until(() => second.hub.waiting('bob'), 5_000, 'Bob waiter');
    await second.call('/api/rooms/proj/messages', { sessionId: 'bob', text: '@alice queued by an agent' });
    assert.equal(second.hub.store.pending('alice').wake, true, 'the @ remains queued');
    assert.equal(second.hub.store.state.wakeAt?.['s:alice'], undefined, 'paused member was not woken by the agent message');
    assert.match(t('vi', 'sys.usage.near', { account: 'claude', pct: 95, at: '23:00' }), /tạm dừng giao tin/);
    assert.doesNotMatch(t('vi', 'sys.usage.near', { account: 'claude', pct: 95, at: '23:00' }), /tạm dừng giao việc mới/);
    assert.match(t('en', 'sys.usage.near', { account: 'claude', pct: 95, at: '23:00' }), /delivery to agents .* is paused/);

    await second.call('/api/rooms/proj/messages', { text: '@bob direct user message' });
    const delivered = await bobWait;
    assert.ok(delivered.messages.some((m: any) => m.text === '@bob direct user message'), 'a direct user message bypasses the account pause');

    pct = 5;
    for (const file of transcripts.values()) {
      fs.writeFileSync(file, JSON.stringify({ type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429, quotaLimits: { resetsAt: Math.floor(Date.now() / 1000) - 1, rateLimitType: 'five_hour' } }) + '\n');
    }
    second.hub.store.state.wakeAt!['a@x.com'].at = Date.now() + 100;
    second.hub.store.save();
  } finally { await second.hub.close(); }

  const third = await startUsageHub(hubDir, home, usageFetch, revived, 60_000);
  try {
    let reset: any;
    try {
      reset = await until(
        () => third.hub.store.history('proj').find((m) => m.fromId === null && /đã reset/.test(m.text)),
        10_000,
        'the reset message',
      );
    } catch (error) {
      throw new Error(`${(error as Error).message}; state=${JSON.stringify({ wakeAt: third.hub.store.state.wakeAt, paused: third.hub.store.state.usagePaused, messages: third.hub.store.history('proj').map((m) => `${m.kind}:${m.text}`) })}`);
    }
    for (const name of ['alice', 'stuck1', 'stuck2']) assert.ok(reset.mentions.includes(name), `${name} is targeted after reset`);
    await until(() => revived.includes('stuck1') && revived.includes('stuck2'), 5_000, 'both limited tabs to resume');
  } finally { await third.hub.close(); }
});

test('usage sweep unsticks ended-on-limit sessions after their account pause expires', async () => {
  const revived: string[] = [];
  const h = await makeHub(20, (job) => { revived.push(job.id); return new Promise<number>(() => {}); });
  try {
    const transcript = path.join(h.dir, 'sweep-limit.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({ type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429, quotaLimits: { resetsAt: Math.floor(Date.now() / 1000) - 1, rateLimitType: 'five_hour' } }) + '\n');
    await h.call('/api/sessions/register', { id: 'sweep-limit', cwd: 'C:/fw', transcript });
    await h.call('/api/sessions/sweep-limit/rename', { name: 'sweep-limit' });
    await h.call('/api/rooms/proj/join', { sessionId: 'sweep-limit' });
    await h.call('/api/sessions/register', { id: 'sender', cwd: 'C:/fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 'sender' });
    await h.call('/api/settings', { closeLimitedTab: true }, { method: 'PUT' });
    assert.equal((await h.call<any>('/api/settings')).closeLimitedTab, true);
    h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() + 5_000, configDirs: [path.join(h.dir, '.claude')] } };
    h.hub.store.save();
    await h.call('/api/rooms/proj/messages', { sessionId: 'sender', text: '@sweep-limit resume after reset' });
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(revived, [], 'a still-paused account is not unstuck');
    h.hub.store.state.usagePaused['a@x.com'].until = Date.now() - 1;
    h.hub.store.save();
    try { await until(() => revived.includes('sweep-limit'), 5_000, 'the paused account sweep to unstick its tab'); }
    catch (error) {
      const session = h.hub.store.session('sweep-limit');
      throw new Error(`${(error as Error).message}; state=${JSON.stringify({ revived, session, pending: h.hub.store.pending(session.id), pause: h.hub.store.state.usagePaused, messages: h.hub.store.history('proj').map((m) => m.text) })}`);
    }
  } finally { await h.hub.close(); }
});

test('limitErrorMarker skips meta lines after the limit error but a typed prompt still ends it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-limit-meta-'));
  const error = { type: 'assistant', isApiErrorMessage: true, error: 'rate_limit', apiErrorStatus: 429 };
  const write = (name: string, ...lines: unknown[]) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
    return file;
  };
  const plain = write('plain.jsonl', error);
  const meta = write('meta.jsonl', error, { type: 'user', isMeta: true, message: { role: 'user', content: 'system reminder' } });
  const typed = write('typed.jsonl', error, { type: 'user', message: { role: 'user', content: 'go on' } });
  assert.ok(limitErrorMarker(plain));
  assert.equal(limitErrorMarker(meta), limitErrorMarker(plain), 'a meta line does not hide the marker');
  assert.equal(limitErrorMarker(typed), null, 'a prompt typed after the error means the chat is working again');
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

test('successful Stop clears same-account session limits and wakes its pending message', async () => {
  const h = await makeHub();
  try {
    await h.call('/api/sessions/register', { id: 'a', name: 'A', cwd: 'C:/a', configDir: '' });
    await h.call('/api/sessions/register', { id: 'b', name: 'B', cwd: 'C:/b', configDir: '' });
    for (const id of ['a', 'b']) await h.call('/api/rooms/proj/join', { sessionId: id });
    const a = h.hub.store.session('a');
    a.limited = { until: Date.now() + 60_000, type: 'seven_day' };
    h.hub.store.state.wakeAt = { 's:a': { at: Date.now() + 60_000, tries: 0 } };
    h.hub.store.save();

    const waiting = h.call<any>('/api/sessions/a/wait?timeout=30');
    await until(() => h.hub.waiting('a'), 5_000, 'session A waiter');
    await h.call('/api/rooms/proj/messages', { sessionId: 'b', text: '@A please continue' });
    assert.ok(h.hub.store.pending('a').messages.length, 'message stays queued while the stale session limit is set');
    assert.equal(h.hub.store.pending('a').wake, true);

    const stopped = await fetch(`${h.hub.url}/hooks/stop`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'b' }),
    });
    assert.equal(stopped.status, 200);
    assert.equal(a.limited, undefined);
    assert.equal(h.hub.store.state.wakeAt?.['s:a'], undefined);
    const delivered = await waiting;
    assert.ok(delivered.messages.some((message: any) => message.text === '@A please continue'));
  } finally { await h.hub.close(); }
});

test('a successful prompt clears stale limits only for sessions on the same account', async () => {
  const h = await makeHub();
  try {
    for (const [id, configDir] of [['running', ''], ['stale', ''], ['other', path.join(h.dir, '.other-claude')]]) {
      await h.call('/api/sessions/register', { id, cwd: h.dir, configDir });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    }
    h.hub.store.session('stale').limited = { until: Date.now() + 60_000, type: 'seven_day' };
    h.hub.store.session('other').limited = { until: Date.now() + 60_000, type: 'five_hour' };
    h.hub.store.state.wakeAt = {
      's:stale': { at: Date.now() + 60_000, tries: 0 },
      's:other': { at: Date.now() + 60_000, tries: 0 },
    };
    h.hub.store.save();

    const response = await fetch(`${h.hub.url}/hooks/prompt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'running', prompt: 'continue' }),
    });
    assert.equal(response.status, 200);
    assert.equal(h.hub.store.session('stale').limited, undefined);
    assert.equal(h.hub.store.state.wakeAt?.['s:stale'], undefined);
    assert.ok(h.hub.store.session('other').limited, 'a different account remains limited');
    assert.ok(h.hub.store.state.wakeAt?.['s:other'], 'a different account keeps its wake booking');
  } finally { await h.hub.close(); }
});

test('StopFailure server_error: retries the same chat with backoff, tells @you only after the last try (#159)', async () => {
  const h = await makeHub(undefined, undefined, { apiRetryMs: [20, 20] });
  const fail = (error: string) => fetch(`${h.hub.url}/hooks/stop-failure`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'rt1', error }) });
  const texts = () => h.hub.store.history('proj').map((m) => m.text);
  const count = (re: RegExp) => texts().filter((t) => re.test(t)).length;
  try {
    await h.call('/api/sessions/register', { id: 'rt1', cwd: 'C:/fw' });
    await h.call('/api/sessions/rt1/rename', { name: 'alice' });
    await h.call('/api/rooms/proj/join', { sessionId: 'rt1' });
    await fail('server_error');
    assert.ok(texts().some((t) => /alice: .*lỗi API \(server_error\), tự chạy lại .*lần 1\/2/.test(t)));
    await until(() => count(/^@alice lượt trước dừng vì lỗi API/) === 1, 3000, 'the first retry wake');
    assert.ok(h.hub.store.history('proj').find((m) => /^@alice lượt trước/.test(m.text))!.wake.includes('rt1'), 'the retry wakes the same chat');
    await fail('overloaded');
    await until(() => count(/^@alice lượt trước dừng vì lỗi API/) === 2, 3000, 'the second retry wake');
    await fail('server_error');
    assert.ok(texts().some((t) => /^@you alice: .*đã tự chạy lại 2 lần/.test(t)), 'the last failure goes to @you');
    assert.equal(h.hub.store.state.wakeAt?.['r:rt1'], undefined, 'no retry is booked after giving up');
    assert.equal(h.hub.store.session('rt1').apiRetry, undefined, 'the counter starts over');

    await fail('authentication_failed');
    assert.ok(texts().some((t) => /alice: lượt bị dừng bởi lỗi API \(authentication_failed\)\.$/.test(t)));
    assert.equal(h.hub.store.state.wakeAt?.['r:rt1'], undefined, 'an auth error is not retried');

    await fail('server_error');
    await fetch(`${h.hub.url}/hooks/stop`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'rt1' }) });
    assert.equal(h.hub.store.session('rt1').apiRetry, undefined, 'a turn that ends normally clears the counter');
  } finally { await h.hub.close(); }
});

test('usage wake (#152): an agent woken in the room in the last 10 minutes (s: resume) is not woken again by the account reset', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wake-dup-'));
  fs.mkdirSync(path.join(home, '.claude'));
  fs.writeFileSync(path.join(home, '.claude', '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'tok', expiresAt: Date.now() + 3600_000, subscriptionType: 'pro' } }));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.com' } }));
  const resetAt = new Date(Date.now() + 400).toISOString();
  let calls = 0;
  const fetchStub = (async () => new Response(JSON.stringify({ five_hour: { utilization: calls++ < 1 ? 95 : 3, resets_at: resetAt } }))) as typeof fetch;
  const h = await makeHub(undefined, undefined, { usageFetch: null, usageHome: home });
  try {
    await h.call('/api/sessions/register', { id: 'd1', cwd: 'C:/fw' });
    await h.call('/api/sessions/d1/rename', { name: 'alice' });
    await h.call('/api/rooms/proj/join', { sessionId: 'd1' });
    await h.call('/api/settings', { lead: { wake: { enabled: true, atPct: 90, afterResetMin: 0 } } }, { method: 'PUT' });
    h.hub.store.post('proj', null, '@alice continue', undefined, undefined, undefined, undefined, { type: 'wake', level: 'info' });   // the s: resume wake
  } finally { await h.hub.close(); }
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: fetchStub, usageHome: home, openUrl: () => {}, browser: null });
  try {
    await until(() => again.store.history('proj').some((m) => m.kind === 'system' && /hẹn đánh thức/.test(m.text)) && !again.store.state.wakeAt?.['a@x.com'], 20_000, 'the booking fired');
    assert.equal(again.store.history('proj').filter((m) => m.sys?.type === 'wake').length, 1, 'only the earlier resume wake: ' + again.store.history('proj').map((m) => m.text).join(' | '));
  } finally { await again.close(); }
});

test('usage wake (#178): with the account reset booked within 10 minutes the s: resume stays silent and the reset message is the only wake; without one the resume speaks', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wake-one-'));
  fs.mkdirSync(path.join(home, '.claude'));
  const h = await makeHub(undefined, undefined, { usageFetch: null, usageHome: home });
  const cfgDir = path.join(home, '.claude');
  try {
    for (const id of ['o1', 'o2']) {
      await h.call('/api/sessions/register', { id, cwd: 'C:/fw' });
      await h.call(`/api/sessions/${id}/rename`, { name: id === 'o1' ? 'alice' : 'bob' });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    }
    h.hub.store.state.usagePaused = { 'a@x.com': { until: Date.now() + 60_000, configDirs: [cfgDir] } };
    h.hub.store.state.wakeAt = { 'a@x.com': { at: Date.now() + 120_000, tries: 0 }, 's:o1': { at: Date.now() + 300, tries: 0 } };
    h.hub.store.save();
  } finally { await h.hub.close(); }
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: null, usageHome: home, openUrl: () => {}, browser: null });
  try {
    await until(() => !again.store.state.wakeAt?.['s:o1'], 5_000, 'the s: wake fired');
    assert.equal(again.store.history('proj').filter((m) => m.sys?.type === 'wake').length, 0, 'reset is booked: no resume message');
    delete again.store.state.usagePaused!['a@x.com']; delete again.store.state.wakeAt!['a@x.com'];
    again.store.state.wakeAt!['s:o2'] = { at: Date.now() + 300, tries: 0 };
    again.store.save();
  } finally { await again.close(); }
  const third = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: null, usageHome: home, openUrl: () => {}, browser: null });
  try {
    await until(() => !third.store.state.wakeAt?.['s:o2'], 5_000, 'the s: wake fired');
    const wakes = third.store.history('proj').filter((m) => m.sys?.type === 'wake');
    assert.equal(wakes.length, 1);
    assert.match(wakes[0].text, /@bob/);
  } finally { await third.close(); }
});

test('#246(b): a reset wake also wakes the owners of open tasks, not only the lead and the chats with a message', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wake-owners-home-'));
  const configDir = path.join(home, '.claude');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(path.join(configDir, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'tok', expiresAt: Date.now() + 3_600_000, subscriptionType: 'pro' } }));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.com' } }));
  const usageFetch = (async () => new Response(JSON.stringify({ five_hour: { utilization: 3, resets_at: new Date(Date.now() + 3_600_000).toISOString() } }))) as typeof fetch;
  const h = await makeHub(undefined, undefined, { usageFetch, usageHome: home });
  try {
    for (const id of ['alice', 'bob', 'carol']) {
      const transcript = path.join(h.dir, `${id}.jsonl`);
      fs.writeFileSync(transcript, JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }) + '\n');
      await h.call('/api/sessions/register', { id, cwd: `C:/w/${id}`, configDir, transcript });
      await h.call(`/api/sessions/${id}/rename`, { name: id });
      await h.call('/api/rooms/proj/join', { sessionId: id });
      h.hub.store.markEnded(id);   // every tab is closed: only the reset can bring them back
    }
    h.hub.store.state.rooms.proj.lead = 'alice';
    h.hub.store.save();
    // Bob is mid-task, nobody sent him a message: without #246(b) he would sleep through the new window.
    addTask(h.dir, 'proj', { title: 'đang làm dở', owner: 'bob', status: 'doing' });
    addTask(h.dir, 'proj', { title: 'xong rồi', owner: 'carol', status: 'done' });
    await h.call('/api/settings', { lead: { wake: { enabled: true, atPct: 90, afterResetMin: 0 } } }, { method: 'PUT' });
  } finally { await h.hub.close(); }

  // Book the account reset a moment from now; the hub schedules booked wakes when it starts.
  const stateFile = path.join(h.dir, 'state.json');
  const seeded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  seeded.wakeAt = { ...(seeded.wakeAt ?? {}), 'a@x.com': { at: Date.now() + 50, tries: 0 } };
  fs.writeFileSync(stateFile, JSON.stringify(seeded));

  const revived: string[] = [];
  const again = await startHub({
    dir: h.dir, port: 0, revive: (job: ReviveJob) => { revived.push(job.id); return 0; }, batchMs: 0, autoRevive: true, sweepMs: 60_000,
    listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'no-legacy.key'), usageFetch, versionFetch: null,
    usageHome: home, openUrl: () => {}, settleMs: 0, browser: null,
  });
  try {
    const wake = await until(() => again.store.history('proj').find((m) => m.fromId === null && /đã reset/.test(m.text)), 20_000, 'the wake-up after the reset');
    assert.deepEqual((wake as any).mentions, ['alice', 'bob'], 'the lead and the owner of the doing task; carol owns nothing open');
    await until(() => revived.includes('bob'), 5_000, 'the owner of an open task is really resumed');
    assert.ok(!revived.includes('carol'), 'a done task does not wake its owner');
  } finally { await again.close(); }
});
