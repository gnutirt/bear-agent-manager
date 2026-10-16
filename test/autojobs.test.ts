import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueJobs, jobKey, jobPrompt, type AutoJob } from '../hub/autojobs.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const H: AutoJob = { kind: 'handoff', sessionId: 's1', transcript: 'C:\\t.jsonl', name: 'big chat' };
const D: AutoJob = { kind: 'digest', room: 'r', messageId: 7, text: 'x'.repeat(5000) };
const on = patchSettings(defaultSettings(4), { autoJobs: { handoff: { enabled: true }, digest: { enabled: true }, maxRunsPerDay: 2 } }).autoJobs;

test('nothing runs while a job type is off', () => {
  assert.deepEqual(dueJobs([H, D], defaultSettings(4).autoJobs, { runs: [], done: [] }, 0), []);
});

test('enabled jobs run once per key and within the daily cap', () => {
  assert.deepEqual(dueJobs([H, D], on, { runs: [], done: [] }, 0).map(jobKey), ['handoff:s1:300', 'digest:r:7']);
  assert.deepEqual(dueJobs([H, D], on, { runs: [], done: ['handoff:s1:300'] }, 0).map(jobKey), ['digest:r:7']);
  assert.deepEqual(dueJobs([H, D], on, { runs: [1, 2], done: [] }, 3), [], 'cap of 2 reached in the last 24h');
  assert.equal(dueJobs([H], on, { runs: [1, 2], done: [] }, 1 + 86_400_001).length, 1, 'old runs fall out of the window');
});

test('jobPrompt fills the matching jobs.md block', () => {
  const md = '## handoff — x\n\n```\nĐọc file <chat.txt> rồi viết hồ sơ\n```\n\n## digest — y\n\n```\nTóm tắt <N> dòng\n```\n';
  assert.match(jobPrompt(H, md), /Đọc file .*chat/);
  assert.match(jobPrompt(D, md), /Tóm tắt/);
});

test('notes prompt carries the room and its notes as JSON; CRLF jobs.md works', () => {
  const md = '## notes — z\r\n\r\n```\r\nBiên bản của phòng <room>: <dán JSON>.\r\n```\r\n';
  assert.equal(jobPrompt({ kind: 'notes', room: 'proj', notes: [{ id: 1, text: 'a', by: 'x' }] }, md), 'Biên bản của phòng proj: [{"id":1,"text":"a","by":"x"}].');
});
