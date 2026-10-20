import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub, until } from './helpers.ts';
import { museOrderPrompt, redact } from '../hub/museagent.ts';
import { MAX_PROMPT, type Cdp } from '../mcp/muse-core.ts';

/** A scripted debug Chrome: answers the fixed scripts of muse-core.ts. */
function fakeChrome(o: { up?: boolean; loggedIn?: boolean; answer?: string } = {}) {
  const prompts: string[] = [];
  const st = { up: o.up ?? true, loggedIn: o.loggedIn ?? true, answer: o.answer ?? 'FOUR' };
  let asked = false;
  const cdp: Cdp = {
    async tabs() { if (!st.up) throw new Error('refused'); return [{ type: 'page', url: 'https://muse.ai/chat', webSocketDebuggerUrl: 'ws://x' }]; },
    async attach() {
      return {
        close() {},
        async eval(expr: string) {
          if (expr.includes('items:')) return { stop: false, items: asked ? [{ role: 'user', text: 'q', hasCopy: false }, { role: 'assistant', text: st.answer, hasCopy: true }] : [] };
          if (expr.includes('aria-label=Send')) { asked = true; return true; }
          if (expr.includes('getOwnPropertyDescriptor')) { prompts.push(expr); return true; }
          if (expr.includes('.length')) return 0;
          return st.loggedIn;   // HAS_INPUT
        },
      };
    },
  };
  return { cdp, prompts, st };
}

test('museOrderPrompt: names the member and the room, redacts keys, keeps the newest messages when too long', () => {
  const p = museOrderPrompt('Muse', 'bear-agent-manager', [{ from: 'you', text: 'use sk-abcdefghijklmnop1234 now' }]);
  assert.match(p, /"Muse".*#bear-agent-manager/s);
  assert.ok(!p.includes('sk-abcdefghijklmnop1234'));
  assert.equal(redact('ghp_abcdefghijklmnopqrstuv'), '[redacted]');
  const long = museOrderPrompt('Muse', 'r', [{ from: 'a', text: 'x'.repeat(20_000) }, { from: 'b', text: 'NEWEST' }]);
  assert.ok(long.length <= MAX_PROMPT);
  assert.ok(long.endsWith('NEWEST'));
});

test('muse profile: an @Muse in the room is asked to Muse and the answer is posted as Muse; one question at a time', async () => {
  const chrome = fakeChrome({ answer: 'The answer is FOUR' });
  const { hub, call } = await makeHub(undefined, undefined, { museCdp: chrome.cdp });
  try {
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [{ id: 'muse', provider: 'muse', name: 'Muse', enabled: true }] } }, { method: 'PUT' });
    const st = await until(async () => (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'muse' && x.state === 'idle'), 5000, 'muse idle');
    assert.equal(st.auth, 'ok');
    assert.equal(st.provider, 'muse');
    await call('/api/rooms/bear-agent-manager/messages', { text: '@Muse what is 2+2' });
    await until(async () => (await call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).some((m) => m.from === 'Muse' && m.text === 'The answer is FOUR'), 20_000, 'Muse answer');
    assert.equal(chrome.prompts.length, 1);
    assert.match(chrome.prompts[0], /what is 2\+2/);
  } finally { await hub.close(); }
});

test('muse profile: Chrome down or not signed in is the error state, the sender gets one error line, retry recovers', async () => {
  const chrome = fakeChrome({ up: false });
  const { hub, call } = await makeHub(undefined, undefined, { museCdp: chrome.cdp });
  try {
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [{ id: 'muse', provider: 'muse', name: 'Muse', enabled: true }] } }, { method: 'PUT' });
    const down = await until(async () => (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'muse' && x.state === 'error'), 5000, 'error state');
    assert.match(down.error, /Chrome debug is not running/);
    await call('/api/rooms/bear-agent-manager/messages', { text: '@Muse hello' });
    await until(async () => (await call<any[]>('/api/rooms/bear-agent-manager/messages?after=0')).some((m) => /Muse could not answer: Chrome debug is not running/.test(m.text)), 10_000, 'error line');
    chrome.st.up = true; chrome.st.loggedIn = false;
    const noLogin = await call<any>('/api/agent-profiles/muse/retry', {});
    assert.equal(noLogin.state, 'error');
    assert.equal(noLogin.auth, 'no');
    chrome.st.loggedIn = true;
    const ok = await call<any>('/api/agent-profiles/muse/retry', {});
    assert.equal(ok.state, 'idle');
    assert.equal(ok.auth, 'ok');
    const off = await call<any>('/api/agent-profiles/muse', { on: false, confirm: true });
    assert.equal(off.state, 'off');
  } finally { await hub.close(); }
});
