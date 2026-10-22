import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';

test('#191 settle: right after a hub start no deaf or two-tab notice; after it they come back', async () => {
  const h = await makeHub(20, () => {}, { deafMs: 50, settleMs: 1500 });
  const texts = async () => (await h.call<any[]>('/api/rooms/r/messages?after=0')).map((m) => m.text as string);
  try {
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha', name: 'alpha' });
    await h.call('/api/sessions/register', { id: 'b1', cwd: 'C:/beta', name: 'beta' });
    await h.call('/api/rooms/r/join', { sessionId: 'a1' });
    await h.call('/api/rooms/r/join', { sessionId: 'b1' });
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha', pid: process.pid });
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha', pid: process.ppid });   // a second tab while the hub settles
    await h.call('/api/rooms/r/messages', { sessionId: 'b1', text: '@alpha are you there' });
    await new Promise((r) => setTimeout(r, 200));   // several deaf sweeps inside the settle window
    assert.equal((await texts()).filter((t) => /alpha không đọc tin|2 tab/.test(t)).length, 0);
    await until(async () => (await texts()).some((t) => /alpha không đọc tin/.test(t)), 5000, 'the deaf notice after the settle window');
    await h.call('/api/sessions/register', { id: 'a1', cwd: 'C:/alpha', pid: process.ppid });
    assert.equal((await texts()).filter((t) => /alpha đang mở ở 2 tab/.test(t)).length, 1);
  } finally { await h.hub.close(); }
});

test('#191 a wake blocked by the account limit is told once per reset time', async () => {
  const h = await makeHub(undefined, () => 0, { usageFetch: async () => new Response('{}') });
  const failed = async () => (await h.call<any[]>('/api/rooms/r/messages?after=0')).filter((m) => /alpha không dậy được/.test(m.text)).length;
  try {
    const transcript = path.join(h.dir, 'alpha.jsonl');
    fs.writeFileSync(transcript, JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }) + '\n');
    await h.call('/api/sessions/register', { id: 'a1', cwd: h.dir, name: 'alpha', transcript });
    await h.call('/api/rooms/r/join', { sessionId: 'a1' });
    await fetch(`${h.hub.url}/hooks/end`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'a1' }) });
    h.hub.store.session('a1').limited = { until: Date.now() + 3_600_000, type: 'five_hour' };
    h.hub.store.save();
    await h.call('/api/rooms/r/messages', { text: '@alpha one' });
    await until(failed, 5000, 'the first blocked notice');
    await until(() => !h.hub.store.session('a1').status.startsWith('busy'), 5000, 'the failed wake to end');
    await h.call('/api/rooms/r/messages', { text: '@alpha two' });
    await new Promise((r) => setTimeout(r, 300));
    assert.equal(await failed(), 1, 'the same reset time is not told again');
    h.hub.store.session('a1').limited = { until: Date.now() + 7_200_000, type: 'five_hour' };   // a new reset time is news
    h.hub.store.save();
    await h.call('/api/rooms/r/messages', { text: '@alpha three' });
    await until(async () => (await failed()) === 2, 5000, 'the notice for the new reset time');
  } finally { await h.hub.close(); }
});
