import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ReviveJob } from '../hub/server.ts';
import { makeHub, until } from './helpers.ts';

const transcript = (dir: string, id: string) => {
  const file = path.join(dir, `${id}.jsonl`);
  fs.writeFileSync(file, [
    JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
    JSON.stringify({ type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] } }),
  ].join('\n') + '\n');
  return file;
};

test('#246(c): wakes wait for a free background slot (lead first) instead of resuming every agent at once', async () => {
  // A turn that never finishes by itself: the test decides when a slot frees up.
  const started: string[] = [];
  const releases: Array<() => void> = [];
  const revive = (job: ReviveJob) => new Promise<number>((resolve) => { started.push(job.id); releases.push(() => resolve(0)); });
  const h = await makeHub(undefined, revive);
  try {
    await h.call('/api/settings', { agents: { maxBackground: 2 } }, { method: 'PUT' });
    for (const id of ['a', 'b', 'c', 'd']) {
      await h.call('/api/sessions/register', { id, cwd: `C:/w/${id}`, transcript: transcript(h.dir, id) });
      await h.call(`/api/sessions/${id}/rename`, { name: id });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    }
    h.hub.store.state.rooms.proj.lead = 'c';
    h.hub.store.save();

    assert.equal((await h.call('/api/sessions/a/revive', {})).started, true);
    assert.equal((await h.call('/api/sessions/b/revive', {})).started, true);
    await until(() => started.length === 2, 5_000, 'the two background turns a maxBackground of 2 allows');
    assert.deepEqual(started, ['a', 'b']);

    // No free slot: queued, not refused (the caller must not open a tab or call the chat ended).
    assert.equal((await h.call('/api/sessions/d/revive', {})).started, true);
    assert.equal((await h.call('/api/sessions/c/revive', {})).started, true);
    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(started, ['a', 'b'], 'nothing else starts while both slots are busy');

    releases.shift()!();   // turn of a ends
    await until(() => started.length === 3, 5_000, 'the next queued wake after a slot freed');
    assert.equal(started[2], 'c', 'the room lead is started before the member queued earlier');

    releases.shift()!();   // turn of b ends
    await until(() => started.length === 4, 5_000, 'the last queued wake');
    assert.equal(started[3], 'd', 'then the rest in arrival order');
  } finally { await h.hub.close(); }
});

test('#246(c): a queued wake keeps its messages unread until its turn really starts', async () => {
  const started: string[] = [];
  const releases: Array<() => void> = [];
  const revive = (job: ReviveJob) => new Promise<number>((resolve) => { started.push(job.id); releases.push(() => resolve(0)); });
  const h = await makeHub(undefined, revive);
  try {
    await h.call('/api/settings', { agents: { maxBackground: 1 } }, { method: 'PUT' });
    for (const id of ['busy', 'waiting']) {
      await h.call('/api/sessions/register', { id, cwd: `C:/w/${id}`, transcript: transcript(h.dir, id) });
      await h.call(`/api/sessions/${id}/rename`, { name: id });
      await h.call('/api/rooms/proj/join', { sessionId: id });
    }
    h.hub.store.markEnded('waiting');   // its tab is closed: a room mention is what wakes it
    assert.equal((await h.call('/api/sessions/busy/revive', {})).started, true);
    await until(() => started.length === 1, 5_000, 'the one background turn');
    await h.call('/api/rooms/proj/messages', { text: '@waiting look here' });
    assert.equal(h.hub.store.pending('waiting').wake, true, 'the queued chat still has its message');
    assert.equal(h.hub.store.pending('waiting').messages.length, 1, 'and it is still unread');
    assert.deepEqual(started, ['busy'], 'no second claude while the only slot is taken');

    releases.shift()!();
    await until(() => started.length === 2, 5_000, 'the queued chat runs once a slot frees');
    assert.equal(started[1], 'waiting');
    await until(() => h.hub.store.pending('waiting').messages.length === 0, 5_000, 'the message is consumed by the turn that reads it');
  } finally { await h.hub.close(); }
});
