import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Memory } from '../hub/memory.ts';
import { extractUrls, MUSE_PREFIX, museTurn } from '../hub/muse-member.ts';
import type { Cdp, Page, Tab } from '../mcp/muse-core.ts';
import { makeHub, until } from './helpers.ts';

function fakeChrome(options: { answer?: string; signedIn?: boolean; down?: boolean } = {}) {
  let prompt = '';
  const tab: Tab = { type: 'page', url: 'https://muse.ai/chat', webSocketDebuggerUrl: 'ws://fake' };
  const cdp: Cdp = {
    tabs: async () => {
      if (options.down) throw new Error('Chrome debug is not running');
      return [tab];
    },
    attach: async () => {
      const page: Page = {
        eval: async (expression) => {
          if (expression.includes('Object.getOwnPropertyDescriptor')) {
            const value = expression.match(/set\.call\(t,((?:"(?:[^"\\]|\\.)*"))\)/)?.[1];
            if (value) prompt = JSON.parse(value);
            return true;
          }
          if (expression.includes("textarea[placeholder=Message]")) return options.signedIn !== false;
          if (expression === "document.querySelectorAll('[data-message-item]').length") return 2;
          if (expression.includes("button[aria-label=Send]")) return true;
          if (expression.startsWith('(()=>({stop:')) {
            return {
              stop: false,
              items: [
                { role: 'user', text: 'older question', hasCopy: false },
                { role: 'assistant', text: 'older answer', hasCopy: true },
                { role: 'user', text: prompt, hasCopy: false },
                { role: 'assistant', text: options.answer ?? 'Nguồn:\nhttps://example.test/source', hasCopy: true },
              ],
            };
          }
          return false;
        },
        close() {},
      };
      return page;
    },
  };
  return { cdp, get prompt() { return prompt; } };
}

test('extractUrls keeps unique http(s) sources, strips trailing punctuation and caps at 20', () => {
  assert.deepEqual(
    extractUrls('Nguồn: https://example.test/a), https://example.test/b. javascript:alert(1) https://example.test/a).'),
    ['https://example.test/a', 'https://example.test/b'],
  );
});

test('Muse prompt uses relevant research only, returns source metadata, and does not write memory', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-muse-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const memory = new Memory(home);
  const known = memory.add({
    kind: 'research', text: 'Postgres backups use WAL archiving', tags: [], scope: 'room', room: 'room-a',
    source: 'muse', urls: ['https://docs.example.test/postgres'], accessedAt: 1,
  });
  memory.add({
    kind: 'research', text: 'Postgres backups in another room', tags: [], scope: 'room', room: 'room-b',
    source: 'muse', urls: ['https://other.example.test'], accessedAt: 1,
  });
  const chrome = fakeChrome({ answer: 'Use WAL archiving.\nNguồn:\nhttps://docs.example.test/wal).' });
  const before = memory.list().length;
  const result = await museTurn({ cdp: chrome.cdp, memory, project: 'repo', now: () => Date.UTC(2026, 9, 23) })(
    'muse-id', 'room-a', 'Research Postgres backup options',
  );

  assert.equal(result.ok, true);
  assert.ok(chrome.prompt.startsWith(MUSE_PREFIX));
  assert.ok(chrome.prompt.includes(`Đã biết:\n- [M${known.id}`));
  assert.ok(chrome.prompt.includes('Postgres backups use WAL archiving'));
  assert.ok(!chrome.prompt.includes('another room'));
  assert.ok(chrome.prompt.includes('Research Postgres backup options'));
  assert.deepEqual(result.research, { urls: ['https://docs.example.test/wal'], accessedAt: Date.UTC(2026, 9, 23) });
  assert.match(result.text, /Truy cập: \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  assert.equal(memory.list().length, before, 'a Muse answer is not saved until the user requests it');
});

test('Muse reports Chrome and sign-in errors without posting a successful answer', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-muse-error-'));
  try {
    const memory = new Memory(home);
    const ask = (cdp: Cdp) => museTurn({ cdp, memory, project: home })('muse-id', 'room-a', 'Research this');
    const down = await ask(fakeChrome({ down: true }).cdp);
    assert.equal(down.ok, false);
    assert.match(down.error, /Chrome debug is not running/);
    const signedOut = await ask(fakeChrome({ signedIn: false }).cdp);
    assert.equal(signedOut.ok, false);
    assert.match(signedOut.error, /not signed in/i);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('Muse profile posts research metadata; saving is idempotent and Duck can cite it', async (t) => {
  let duckRequest: { messages: Array<{ content: string }> } | undefined;
  const chrome = fakeChrome({ answer: 'Postgres backup strategy: use pgBackRest and WAL archiving.\nNguồn:\nhttps://docs.example.test/backup' });
  const h = await makeHub(undefined, undefined, {
    museCdp: chrome.cdp,
    duckFetch: (async (_url: string, init: RequestInit) => {
      duckRequest = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ choices: [{ message: { content: 'Use pgBackRest.' } }] }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch,
  });
  t.after(async () => { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); });

  await h.call('/api/settings', { agents: { profiles: [
    { id: 'muse-research', provider: 'muse', name: 'MuseResearch', cwd: h.dir, enabled: false },
    { id: 'duck-advisor', provider: 'duck', name: 'DuckAdvisor', cwd: h.dir, enabled: true, baseUrl: 'http://provider.test', experimental: true },
  ] } }, { method: 'PUT' });
  await h.call('/api/copilot/profiles/muse-research', { on: true, confirm: true }, { method: 'POST' });
  const muse = await until(() => h.hub.store.members('bear-agent-manager').find((session) => session.name === 'MuseResearch'), 5000, 'Muse profile registration');
  await until(() => h.hub.store.members('bear-agent-manager').find((session) => session.name === 'DuckAdvisor'), 5000, 'Duck profile registration');
  assert.deepEqual(await h.call('/api/muse/status'), { chrome: true, loggedIn: true, busy: false });
  const html = await (await fetch(h.hub.url + '/')).text();
  assert.ok(html.includes('data-muse-save="${m.id}"'), 'Muse answers expose an explicit save-to-memory action');
  assert.ok(html.includes("api('/api/memory/from-message'"), 'the save action uses the guarded memory route');
  assert.ok(html.includes("room: scope === 'room' ? memoryEntry.querySelector('[data-memory-room]').value.trim() || null : null"), 'room-to-user edits explicitly clear room');

  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@MuseResearch research Postgres backup strategy' });
  const answer = await until(() => h.hub.store.history('bear-agent-manager').find((message) => message.fromId === muse.id && message.research), 5000, 'Muse research answer');
  assert.deepEqual(answer.research?.urls, ['https://docs.example.test/backup']);
  assert.equal((await h.call<any>('/api/memory?room=bear-agent-manager')).entries.length, 0);

  const saved = await h.call<any>('/api/memory/from-message', { room: answer.room, id: answer.id });
  assert.ok(saved.tags.includes(`msg:${answer.room}#${answer.id}`));
  const duplicate = await h.call<any>('/api/memory/from-message', { room: answer.room, id: answer.id });
  assert.equal(duplicate.id, saved.id);
  assert.equal((await h.call<any>('/api/memory?room=bear-agent-manager')).entries.length, 1);

  await h.call('/api/rooms/bear-agent-manager/messages', { text: '@DuckAdvisor What is a good Postgres backup strategy?' });
  await until(() => duckRequest, 5000, 'Duck request with saved research');
  assert.ok(duckRequest?.messages.some((message) => message.content.includes(`[M${saved.id} research`)));
  assert.ok(duckRequest?.messages.some((message) => message.content.includes('https://docs.example.test/backup')));
});
