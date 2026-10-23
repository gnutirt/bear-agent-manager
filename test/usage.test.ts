import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchUsage, listAccounts, maskEmail, parseUsage, UsageReader, usageAlerts, USAGE_URL } from '../hub/usage.ts';
import { makeHub, until } from './helpers.ts';

const ACCESS = 'sk-ant-oat01-FAKE-ACCESS-TOKEN', REFRESH = 'sk-ant-ort01-FAKE-REFRESH-TOKEN';
const SAMPLE = { five_hour: { utilization: 42.5, resets_at: '2026-10-16T15:00:00Z' }, seven_day: { utilization: 91, resets_at: '2026-10-20T00:00:00Z' }, seven_day_opus: null };

/** Fake HOME: ~/.claude (default login, email in ~/.claude.json) + ~/.claude-antigravity (own .claude.json). */
function fakeHome(opts: { agEmail?: string; expired?: boolean } = {}) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-usage-'));
  const creds = (tok: string) => JSON.stringify({ claudeAiOauth: { accessToken: tok, refreshToken: REFRESH, expiresAt: opts.expired ? 1 : Date.now() + 3600_000, subscriptionType: 'pro' } });
  for (const d of ['.claude', '.claude-antigravity']) fs.mkdirSync(path.join(home, d));
  fs.writeFileSync(path.join(home, '.claude', '.credentials.json'), creds(ACCESS));
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'user@example.com' } }));
  fs.writeFileSync(path.join(home, '.claude-antigravity', '.credentials.json'), creds(ACCESS + '-2'));
  fs.writeFileSync(path.join(home, '.claude-antigravity', '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: opts.agEmail ?? 'second@example.com' } }));
  return { home, dirs: [path.join(home, '.claude'), path.join(home, '.claude-antigravity')] };
}
const okFetch = (seen: any[] = []) => (async (url: any, init: any) => { seen.push({ url, init }); return new Response(JSON.stringify(SAMPLE), { status: 200 }); }) as typeof fetch;
const status = (code: number) => (async () => new Response('{}', { status: code })) as typeof fetch;

test('parseUsage reads the 5-hour and weekly windows', () => {
  assert.deepEqual(parseUsage(SAMPLE), { fiveHour: { pct: 42.5, resetsAt: '2026-10-16T15:00:00Z' }, sevenDay: { pct: 91, resetsAt: '2026-10-20T00:00:00Z' } });
  assert.deepEqual(parseUsage({}), { fiveHour: null, sevenDay: null });
  assert.equal(maskEmail('user@example.com'), 'u***@example.com');
});

test('listAccounts: email from ~/.claude.json for the default dir, <cfg>/.claude.json otherwise; same email = one row', () => {
  let { home, dirs } = fakeHome();
  assert.deepEqual(listAccounts(dirs, home).map((a) => [a.label, a.email, a.plan, a.configDirs.length]), [['claude', 'user@example.com', 'pro', 1], ['antigravity', 'second@example.com', 'pro', 1]]);
  ({ home, dirs } = fakeHome({ agEmail: 'user@example.com' }));
  assert.deepEqual(listAccounts(dirs, home).map((a) => a.configDirs.length), [2]);
  assert.deepEqual(listAccounts([path.join(home, 'nope')], home), []);
});

test('fetchUsage sends the OAuth headers to the usage endpoint; expired, 401, 429 and network errors become text', async () => {
  const { dirs } = fakeHome();
  const seen: any[] = [];
  assert.deepEqual(await fetchUsage(dirs[0], okFetch(seen)), parseUsage(SAMPLE));
  assert.equal(seen[0].url, USAGE_URL);
  assert.deepEqual([seen[0].init.headers.authorization, seen[0].init.headers['anthropic-beta']], [`Bearer ${ACCESS}`, 'oauth-2025-04-20']);
  assert.match((await fetchUsage(dirs[0], status(401)) as any).error, /401/);
  assert.match((await fetchUsage(dirs[0], status(429)) as any).error, /429/);
  assert.equal((await fetchUsage(dirs[0], (async () => { throw new Error(`boom Bearer ${ACCESS}`); }) as any) as any).error, 'lỗi mạng');
  const exp = fakeHome({ expired: true });
  let called = false;
  assert.match((await fetchUsage(exp.dirs[0], (async () => { called = true; }) as any) as any).error, /hết hạn/);
  assert.equal(called, false, 'an expired token is never sent');
});

test('UsageReader: 5-minute cache, a failed refresh keeps the old numbers with usageError', async () => {
  const { home, dirs } = fakeHome();
  let mode = 'ok', calls = 0;
  const f = (async () => { calls++; return mode === 'ok' ? new Response(JSON.stringify(SAMPLE)) : new Response('{}', { status: 429 }); }) as typeof fetch;
  const r = new UsageReader(home, f);
  const t0 = Date.now();
  await r.read(dirs, false, t0);
  await r.read(dirs, false, t0 + 60_000);
  assert.equal(calls, 2, 'second read within 5 min comes from the cache');
  mode = '429';
  const rows = await r.read(dirs, true, t0 + 120_000);
  assert.equal(rows[0].fiveHour?.pct, 42.5);
  assert.match(rows[0].usageError, /429/);
});

test('usageAlerts: 80% of 5 h and 90% of the week, once per cycle; a new resets_at warns again', () => {
  const a: any = { configDirs: ['c'], label: 'claude', email: 'user@example.com', plan: 'pro', usageError: '', fetchedAt: 0,
    fiveHour: { pct: 85, resetsAt: '2026-10-16T15:00:00Z' }, sevenDay: { pct: 89, resetsAt: '2026-10-20T00:00:00Z' } };
  const first = usageAlerts([a], []);
  assert.equal(first.length, 1);
  assert.match(first[0].text, /^@you Claude Pro claude \(u\*\*\*@example\.com\) đã dùng 85% hạn mức 5 giờ/);
  assert.deepEqual(usageAlerts([a], first.map((x) => x.key)), []);
  assert.equal(usageAlerts([{ ...a, fiveHour: { pct: 81, resetsAt: '2026-10-16T20:00:00Z' } }], first.map((x) => x.key)).length, 1);
  assert.equal(usageAlerts([{ ...a, sevenDay: { pct: 90, resetsAt: 'x' } }], first.map((x) => x.key)).length, 1);
  const w = (resetsAt: string) => [{ ...a, fiveHour: { pct: 99, resetsAt }, sevenDay: null }];
  const k = usageAlerts(w('2026-10-19T05:59:59.990Z'), []).map((x) => x.key);
  assert.deepEqual(usageAlerts(w('2026-10-19T06:00:00.070Z'), k), [], 'reset time jitter is the same cycle');
});

test('GET /api/claude-usage never returns or logs a token, also on errors; credential files are only read', async () => {
  const { home } = fakeHome();
  const credFile = path.join(home, '.claude', '.credentials.json');
  const before = fs.statSync(credFile).mtimeMs, content = fs.readFileSync(credFile, 'utf8');
  const logs: string[] = [];
  const orig = { log: console.log, error: console.error, warn: console.warn };
  console.log = console.error = console.warn = (...a: unknown[]) => { logs.push(a.map(String).join(' ')); };
  for (const f of [okFetch(), status(401), status(429), (async () => { throw new Error(`net Bearer ${ACCESS}`); }) as any]) {
    const h = await makeHub(undefined, undefined, { usageFetch: f, usageHome: home });
    try {
      await h.call('/api/sessions/register', { id: 'ag', cwd: 'C:/x', configDir: path.join(home, '.claude-antigravity') });
      const body = JSON.stringify(await h.call('/api/claude-usage?refresh=1'));
      assert.ok(!body.includes(ACCESS) && !body.includes(REFRESH) && !/accessToken|refreshToken/.test(body), body);
      const j = JSON.parse(body);
      assert.equal(j.accounts.length, 2);
      assert.equal(j.accounts[0].email, 'u***@example.com');
    } finally { await h.hub.close(); }
  }
  Object.assign(console, orig);
  assert.ok(!logs.join('\n').includes('FAKE'), 'no token in the hub log');
  assert.equal(fs.statSync(credFile).mtimeMs, before);
  assert.equal(fs.readFileSync(credFile, 'utf8'), content);
});

test('usage poll posts one @you warning per cycle into the rooms of that account', async () => {
  const { home } = fakeHome();
  const hot = (async () => new Response(JSON.stringify({ five_hour: { utilization: 82, resets_at: '2026-10-16T15:00:00Z' } }))) as typeof fetch;
  const h = await makeHub(undefined, undefined, { usageFetch: hot, usageHome: home });
  try {
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:/fw' });
    await h.call('/api/rooms/proj/join', { sessionId: 's1' });
    // the start-up poll ran before the room existed; restart a hub on the same dir to poll again
  } finally { await h.hub.close(); }
  const { startHub } = await import('../hub/server.ts');
  const again = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: hot, usageHome: home, browser: null });
  try {
    await until(() => again.store.history('proj').some((m) => m.text.includes('Claude Pro')), 15_000, 'the usage warning');
    const msgs = again.store.history('proj').map((m) => m.text).filter((t) => t.includes('Claude Pro'));
    assert.equal(msgs.length, 1, msgs.join(' | '));
    assert.match(msgs[0], /82% hạn mức 5 giờ/);
  } finally { await again.close(); }
  const third = await startHub({ dir: h.dir, port: 0, revive: () => {}, listProcs: async () => [], probe: null, legacyKeyFile: path.join(h.dir, 'x.key'), usageFetch: hot, usageHome: home, browser: null });
  try {
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(third.store.history('proj').filter((m) => m.text.includes('Claude Pro')).length, 1, 'same cycle: no second warning');
  } finally { await third.close(); }
});
