import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMentions, wakes, type Message } from '../hub/routing.ts';

const msg = (over: Partial<Message>): Message => ({
  id: 1, room: 'r', from: 'you', fromId: null, mentions: [], text: '', ts: 0, wake: [], ...over,
});
const fw = { id: 's-fw', name: 'fw' };
const web = { id: 's-web', name: 'Web' };

test('parseMentions finds @names, lower-cases, dedupes, ignores emails', () => {
  assert.deepEqual(parseMentions('@fw and @Web, also @fw; mail a@b.com (@all)'), ['fw', 'web', 'all']);
  assert.deepEqual(parseMentions('no mentions here'), []);
  assert.deepEqual(parseMentions('@fw-2\n@x_y'), ['fw-2', 'x_y']);
  assert.deepEqual(parseMentions('**@Coder_No_2**, `@fw` *@web* [@x] a.@no b/@no'), ['coder_no_2', 'fw', 'web', 'x']);
});

test('user message without mention wakes every member', () => {
  assert.equal(wakes(msg({}), fw, false), true);
  assert.equal(wakes(msg({}), web, false), true);
});

test('user message with mentions wakes only the named (case-insensitive)', () => {
  const m = msg({ mentions: ['web'] });
  assert.equal(wakes(m, fw, false), false);
  assert.equal(wakes(m, web, false), true);
});

test('agent message without mention wakes nobody', () => {
  assert.equal(wakes(msg({ from: 'fw', fromId: 's-fw' }), web, false), false);
});

test('agent message wakes the named and @all wakes all except sender', () => {
  assert.equal(wakes(msg({ fromId: 's-fw', mentions: ['web'] }), web, false), true);
  const all = msg({ fromId: 's-fw', mentions: ['all'] });
  assert.equal(wakes(all, web, false), true);
  assert.equal(wakes(all, fw, false), false);
});

test('paused room: agent messages wake nobody, user messages still wake', () => {
  assert.equal(wakes(msg({ fromId: 's-fw', mentions: ['web'] }), web, true), false);
  assert.equal(wakes(msg({ mentions: ['web'] }), web, true), true);
});
