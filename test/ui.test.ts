import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

test('UI page has rooms, running-sessions list, chat, presence strip, composer and SSE wiring', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const id of ['id="rooms"', 'id="sessions"', 'id="log"', 'id="presence"', 'id="composer"', 'id="banner"', 'id="mentionMenu"', 'id="menu"', 'id="toast"']) {
      assert.ok(html.includes(id), `missing ${id}`);
    }
    assert.ok(html.includes("new EventSource('/api/events?token='"));
    assert.ok(html.includes('lang="vi"'));
    for (const route of ['/rename', '/delete', '/join', '/leave']) assert.ok(html.includes(route), `UI never calls ${route}`);
    assert.ok(!/\bprompt\(|\balert\(|\bconfirm\(/.test(html), 'dialogs do not work inside VS Code webviews');
  } finally { await hub.close(); }
});

test('UI inline script compiles and the workers panel is wired (list, live updates, stop)', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.equal(scripts.length, 1);
    assert.doesNotThrow(() => new Function(scripts[0]), 'a syntax error here turns the whole page into raw text');
    for (const s of ['id="workers"', 'id="wkCap"', "'/api/workers'", "addEventListener('workers'", '/kill`']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});
