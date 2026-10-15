import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { classifyTranscript, roomChatDir } from '../shared/worker-chat.ts';
import { HOME } from '../shared/config.ts';

const a = (model: string) => JSON.stringify({ type: 'assistant', message: { model, content: [] } });
const u = JSON.stringify({ type: 'user', message: { content: 'hi' } });
const meta = JSON.stringify({ type: 'summary', summary: 'x' });

test('classifyTranscript: worker = some assistant turn from a non-Claude model', () => {
  assert.equal(classifyTranscript([u, a('deepseek-v4-flash-0731')], 'D:\r'), 'worker');
  assert.equal(classifyTranscript([u, a('kimi-k2.6')], 'D:\r'), 'worker');
});

test('classifyTranscript: real chats stay, even with <synthetic> turns', () => {
  assert.equal(classifyTranscript([u, a('claude-opus-5-5')], 'D:\r'), null);
  assert.equal(classifyTranscript([u, a('<synthetic>'), a('claude-sonnet-5-5')], 'D:\r'), null);
});

test('classifyTranscript: empty (no user/assistant turn) and test/temp projects', () => {
  assert.equal(classifyTranscript([meta, ''], 'D:\r'), 'empty');
  assert.equal(classifyTranscript(['{torn'], 'D:\r'), 'empty');
  assert.equal(classifyTranscript([u, a('claude-opus-5-5')], 'C--Users-me-AppData-Local-Temp-ar-slow-probe'), 'test');
});

test('roomChatDir lives under the hub home, outside ~/.claude (not swept, not listed by the editor)', () => {
  assert.equal(roomChatDir(path.join('C:', 'u', '.claude', 'projects', 'D--repo')), path.join(HOME, 'room_chat', 'D--repo'));
});
