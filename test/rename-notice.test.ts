import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../hub/store.ts';
import { formatDelivery, RENAMED_KEY } from '../shared/format.ts';
import { makeHub } from './helpers.ts';

test('a renamed session is told its new name once; renaming back before delivery says nothing', () => {
  const st = new Store(fs.mkdtempSync(path.join(os.tmpdir(), 'ar-rn-')));
  const s = st.register({ id: 'a1', cwd: 'C:\\fw' });
  const start = s.name;
  st.rename(s.id, 'hop-dong');
  st.rename(s.id, 'phap-ly');   // two renames before a delivery: the first old name is kept
  assert.deepEqual(st.takeRenamed(s.id), { from: start, to: 'phap-ly' });
  assert.equal(st.takeRenamed(s.id), undefined, 'told once');
  st.rename(s.id, 'x1');
  st.rename(s.id, 'phap-ly');
  assert.equal(st.takeRenamed(s.id), undefined, 'back to the same name: nothing to tell');
});

test('formatDelivery turns the rename marker into one line, not a room note', () => {
  const text = formatDelivery([], { [RENAMED_KEY]: [{ id: 0, text: 'phap-ly\thop-dong', by: 'hub' }] });
  assert.match(text, /Your name in Bear Agent Manager is now @phap-ly \(it was @hop-dong\)/);
  assert.ok(!text.includes('Room notes'));
});

test('the user tags a name nobody has: a warning card, nobody woken, no lead fallback', async () => {
  const h = await makeHub();
  try {
    await h.call('/api/sessions/register', { id: 's1', cwd: 'C:\\fw' });
    await h.call('/api/sessions/s1/rename', { name: 'fw' });
    await h.call('/api/rooms/work/join', { sessionId: 's1' });
    const r = await h.call('/api/rooms/work/messages', { text: '@ghost-agent ???' });
    assert.deepEqual(r.message.wake, [], 'the tag of an unknown name wakes nobody');
    const msgs = await h.call<any[]>('/api/rooms/work/messages');
    const card = msgs.find((m) => m.kind === 'system' && /ghost-agent/.test(m.text));
    assert.ok(card, 'a system card names the unknown tag');
    assert.deepEqual(card.wake, []);
    assert.equal(card.sys.level, 'warn');
    const ok = await h.call('/api/rooms/work/messages', { text: '@fw hello' });
    assert.deepEqual(ok.message.wake, ['s1']);
    const after = await h.call<any[]>('/api/rooms/work/messages');
    assert.equal(after.filter((m) => m.kind === 'system' && /Không có thành viên|No member/.test(m.text)).length, 1, 'a known tag adds no card');
  } finally { await h.hub.close(); }
});
