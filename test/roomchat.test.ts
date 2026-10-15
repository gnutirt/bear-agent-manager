import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.BEAR_AGENT_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-rc-home-'));

const { roomChatDir } = await import('../shared/worker-chat.ts');
const { adoptWorkerTranscripts, listRoomChat, sweepProject } = await import('../hub/roomchat.ts');

const a = (model: string) => JSON.stringify({ type: 'assistant', message: { model, content: [] } });
const u = (t = 'hi') => JSON.stringify({ type: 'user', message: { content: t } });
function project(files: Record<string, string[]>, ageMs = 3_600_000) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-rc-'));
  const proj = `repo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(root, proj); fs.mkdirSync(dir);
  for (const [f, lines] of Object.entries(files)) {
    const p = path.join(dir, f); fs.writeFileSync(p, lines.join('\n'));
    const t = (Date.now() - ageMs) / 1000; fs.utimesSync(p, t, t);
  }
  return { root, dir, proj };
}
const none = { reviveIds: new Set<string>(), activeIds: new Set<string>() };

test('dry run lists worker, empty and revive transcripts; real chats untouched', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')], 'e.jsonl': [''], 'real.jsonl': [u(), a('claude-opus-5-5')], 'rv.jsonl': [u(), a('claude-opus-5-5')] });
  const r = sweepProject(dir, { apply: false, reviveIds: new Set(['rv']), activeIds: new Set() });
  assert.deepEqual(r.map((x) => [x.file, x.kind]).sort(), [['e.jsonl', 'empty'], ['rv.jsonl', 'revive'], ['w.jsonl', 'worker']]);
  assert.ok(fs.existsSync(path.join(dir, 'w.jsonl')), 'dry run moves nothing');
});

test('apply moves into roomChatDir; recent and active sessions are skipped', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')], 'busy.jsonl': [u(), a('kimi-k2.6')] });
  const fresh = path.join(dir, 'new.jsonl'); fs.writeFileSync(fresh, [u(), a('glm-5.3')].join('\n'));
  const r = sweepProject(dir, { apply: true, reviveIds: new Set(), activeIds: new Set(['busy']) });
  assert.deepEqual(r.map((x) => x.file), ['w.jsonl']);
  assert.ok(fs.existsSync(path.join(roomChatDir(dir), 'w.jsonl')));
  assert.ok(fs.existsSync(path.join(dir, 'busy.jsonl')) && fs.existsSync(fresh));
});

test('adoptWorkerTranscripts brings worker-config transcripts into the repo room_chat', () => {
  const { root, dir, proj } = project({});
  const wp = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wc-'));
  fs.mkdirSync(path.join(wp, proj));
  fs.writeFileSync(path.join(wp, proj, 'x.jsonl'), [u(), a('glm-5.3')].join('\n'));
  assert.deepEqual(adoptWorkerTranscripts(wp, root, true), [], 'a fresh worker transcript may still be written');
  adoptWorkerTranscripts(wp, root, true, 0);
  assert.ok(fs.existsSync(path.join(roomChatDir(dir), 'x.jsonl')));
  const list = listRoomChat().filter((e) => e.project === proj);
  assert.deepEqual(list.map((e) => [e.project, e.file, e.kind]), [[proj, 'x.jsonl', 'worker']]);
  assert.equal(list[0].title, 'hi');
});

test('name clash in room_chat never overwrites', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')] });
  fs.mkdirSync(roomChatDir(dir)); fs.writeFileSync(path.join(roomChatDir(dir), 'w.jsonl'), 'old');
  sweepProject(dir, { apply: true, ...none });
  assert.equal(fs.readFileSync(path.join(roomChatDir(dir), 'w.jsonl'), 'utf8'), 'old');
  assert.ok(fs.readdirSync(roomChatDir(dir)).some((f) => /^w\.\d+\.jsonl$/.test(f)));
});

test('a real chat whose first 256 KB are only snapshot lines is not empty', () => {
  const snap = JSON.stringify({ type: 'file-history-snapshot', snapshot: { pad: 'x'.repeat(8000) } });
  const { dir } = project({ 'big.jsonl': [...Array(50).fill(snap), u(), a('claude-opus-5-5')] });
  assert.ok(fs.statSync(path.join(dir, 'big.jsonl')).size > 256 * 1024);
  assert.deepEqual(sweepProject(dir, { apply: false, ...none }), []);
});
