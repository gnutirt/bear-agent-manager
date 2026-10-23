import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeHub } from './helpers.ts';

test('/api/memory routes require the hub token', async () => {
  const { hub } = await makeHub();
  const requests: [string, string, unknown?][] = [
    ['/api/memory', 'GET'],
    ['/api/memory', 'POST', { text: 'x', kind: 'context', scope: 'user' }],
    ['/api/memory/1', 'PATCH', { text: 'x' }],
    ['/api/memory/1', 'DELETE'],
    ['/api/memory?room=general', 'DELETE'],
    ['/api/memory/from-message', 'POST', { room: 'general', id: 1 }],
  ];
  try {
    for (const [route, method, body] of requests) {
      const response = await fetch(hub.url + route, {
        method,
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, 401, `${method} ${route}`);
    }
  } finally { await hub.close(); fs.rmSync(hub.store.dir, { recursive: true, force: true }); }
});

test('/api/memory supports guarded create, filtered list, update, delete and partition clearing', async () => {
  const h = await makeHub();
  try {
    const created = await h.call<any>('/api/memory', {
      kind: 'preference', text: 'Keep answers concise', tags: ['style'], scope: 'room', room: 'general', source: 'muse',
    });
    assert.equal(created.source, 'user', 'the endpoint must not trust a caller-supplied source');
    assert.equal(created.room, 'general');
    const edited = await h.call<any>(`/api/memory/${created.id}`, { text: 'Keep concise answers', kind: 'decision', tags: ['style', 'writing'] }, { method: 'PATCH' });
    assert.equal(edited.text, 'Keep concise answers');
    assert.deepEqual(edited.tags, ['style', 'writing']);
    const filtered = await h.call<any>('/api/memory?room=general&kind=decision&q=concise');
    assert.equal(filtered.entries.length, 1);
    assert.equal(filtered.entries[0].id, created.id);

    const secret = await fetch(h.hub.url + '/api/memory', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ kind: 'context', text: 'token: abcdefghijklmnop', scope: 'user' }),
    });
    assert.equal(secret.status, 400);

    await h.call('/api/memory', { kind: 'context', text: 'Project note', scope: 'project', project: 'repo-a' });
    const noFilter = await fetch(h.hub.url + '/api/memory', { method: 'DELETE', headers: { 'x-room-token': h.hub.token } });
    assert.equal(noFilter.status, 400, 'a filter-less delete must never clear all memory');
    const blankFilter = await fetch(h.hub.url + '/api/memory?room=%20%20', { method: 'DELETE', headers: { 'x-room-token': h.hub.token } });
    assert.equal(blankFilter.status, 400, 'a blank filter must not be treated as an intentional clear');
    const cleared = await h.call<any>('/api/memory?room=general', undefined, { method: 'DELETE' });
    assert.equal(cleared.removed, 1);
    const remains = await h.call<any>('/api/memory?project=repo-a');
    assert.equal(remains.entries.length, 1);

    const toDelete = await h.call<any>('/api/memory', { kind: 'context', text: 'Delete me', scope: 'user' });
    await h.call(`/api/memory/${toDelete.id}`, undefined, { method: 'DELETE' });
    const missing = await fetch(h.hub.url + `/api/memory/${created.id}`, {
      method: 'DELETE', headers: { 'x-room-token': h.hub.token },
    });
    assert.equal(missing.status, 404);
  } finally { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); }
});

test('POST /api/memory/from-message accepts Muse research only and preserves its sources', async () => {
  const h = await makeHub();
  try {
    h.hub.store.createRoom('research-room');
    const { message: userMessage } = h.hub.store.post('research-room', null, 'Not research');
    const nonMuse = await fetch(h.hub.url + '/api/memory/from-message', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': h.hub.token },
      body: JSON.stringify({ room: userMessage.room, id: userMessage.id }),
    });
    assert.equal(nonMuse.status, 400);

    const muse = h.hub.store.register({ id: 'muse', cwd: '', name: 'Muse' });
    h.hub.store.join(muse.id, 'research-room');
    const { message } = h.hub.store.post('research-room', muse.id, 'Research result');
    Object.assign(message, { research: { urls: ['https://example.test/source'], accessedAt: 1234 } });
    const entry = await h.call<any>('/api/memory/from-message', { room: message.room, id: message.id });
    assert.equal(entry.kind, 'research');
    assert.equal(entry.scope, 'room');
    assert.equal(entry.room, message.room);
    assert.equal(entry.source, 'muse');
    assert.deepEqual(entry.urls, ['https://example.test/source']);
    assert.equal(entry.accessedAt, 1234);

    const noSource = h.hub.store.post('research-room', muse.id, 'A result without a source');
    Object.assign(noSource.message, { research: { urls: [], accessedAt: 5678 } });
    const unsourced = await h.call<any>('/api/memory/from-message', { room: noSource.message.room, id: noSource.message.id });
    assert.deepEqual(unsourced.tags, ['chưa-có-nguồn']);
  } finally { await h.hub.close(); fs.rmSync(h.dir, { recursive: true, force: true }); }
});
