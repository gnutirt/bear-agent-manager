import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archiveKey, archiveNow } from '../hub/archive.ts';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-arc-'));
  const cfg = path.join(root, '.claude'), proj = path.join(cfg, 'projects', 'D--repo'), arc = path.join(root, 'X');
  fs.mkdirSync(proj, { recursive: true }); fs.mkdirSync(arc);
  return { root, cfg, proj, arc, out: path.join(arc, '.claude', 'D--repo') };
}

test('new file copied; appended lines copied once', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  assert.equal(archiveNow([cfg], arc).copiedFiles, 1);
  fs.appendFileSync(path.join(proj, 's1.jsonl'), 'b\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\nb\n');
  assert.equal(archiveNow([cfg], arc).copiedBytes, 0);
});

test('half-written last line waits for its newline', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n{"half');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\n');
  fs.appendFileSync(path.join(proj, 's1.jsonl'), '":1}\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\n{"half":1}\n');
});

test('shrunk source: old copy kept under a timestamped name, new copy from byte 0', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'long line one\n');
  archiveNow([cfg], arc);
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'x\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'x\n');
  assert.ok(fs.readdirSync(out).some((f) => /^s1\..+\.jsonl$/.test(f) && fs.readFileSync(path.join(out, f), 'utf8') === 'long line one\n'));
});

test('moving into room_chat (with or without .<ts> suffix) copies nothing again', () => {
  const { cfg, proj, arc } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n'); fs.writeFileSync(path.join(proj, 's2.jsonl'), 'b\n');
  archiveNow([cfg], arc);
  fs.mkdirSync(path.join(proj, 'room_chat'));
  fs.renameSync(path.join(proj, 's1.jsonl'), path.join(proj, 'room_chat', 's1.jsonl'));
  fs.renameSync(path.join(proj, 's2.jsonl'), path.join(proj, 'room_chat', 's2.1760000000000.jsonl'));
  assert.equal(archiveNow([cfg], arc).copiedBytes, 0);
  assert.equal(archiveKey('.claude', 'D--repo', 'room_chat/s2.1760000000000.jsonl'), archiveKey('.claude', 'D--repo', 's2.jsonl'));
});

test('subagents, tool-results and memory are archived', () => {
  const { cfg, proj, arc, out } = setup();
  fs.mkdirSync(path.join(proj, 's1', 'subagents'), { recursive: true });
  fs.mkdirSync(path.join(proj, 's1', 'tool-results'));
  fs.mkdirSync(path.join(proj, 'memory'));
  fs.writeFileSync(path.join(proj, 's1', 'subagents', 'agent-x.jsonl'), 'a\n');
  fs.writeFileSync(path.join(proj, 's1', 'tool-results', 't.txt'), 'out');
  fs.writeFileSync(path.join(proj, 'memory', 'm.md'), '# m');
  archiveNow([cfg], arc);
  for (const f of ['s1/subagents/agent-x.jsonl', 's1/tool-results/t.txt', 'memory/m.md']) assert.ok(fs.existsSync(path.join(out, f)), f);
});

test('missing archive dir: no throw, nothing written anywhere else', () => {
  const { root, cfg, proj } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  const r = archiveNow([cfg], path.join(root, 'nope', 'X'));
  assert.deepEqual([r.ok, r.copiedFiles], [false, 0]);
  assert.ok(!fs.existsSync(path.join(root, 'nope')));
});

test('transcripts moved out to the hub room_chat stay archived under their old key, not copied twice', () => {
  const { root, cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  archiveNow([cfg], arc);
  const rc = path.join(root, 'hub', 'room_chat');
  fs.mkdirSync(path.join(rc, 'D--repo'), { recursive: true });
  fs.renameSync(path.join(proj, 's1.jsonl'), path.join(rc, 'D--repo', 's1.jsonl'));
  assert.equal(archiveNow([cfg], arc, undefined, rc).copiedBytes, 0);
  fs.appendFileSync(path.join(rc, 'D--repo', 's1.jsonl'), 'b\n');
  archiveNow([cfg], arc, undefined, rc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\nb\n');
  fs.writeFileSync(path.join(rc, 'D--repo', 'never-seen.jsonl'), 'z\n');
  archiveNow([cfg], arc, undefined, rc);
  assert.ok(fs.existsSync(path.join(out, 'never-seen.jsonl')), 'a file moved before any archive run is still archived');
});

test('a second config dir whose projects/ links to the first one is archived once', () => {
  const { root, cfg, proj, arc } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  const cfg2 = path.join(root, '.claude-antigravity'); fs.mkdirSync(cfg2);
  fs.symlinkSync(path.join(cfg, 'projects'), path.join(cfg2, 'projects'), 'junction');
  assert.equal(archiveNow([cfg, cfg2], arc).copiedFiles, 1);
  assert.ok(!fs.existsSync(path.join(arc, '.claude-antigravity')));
});

test('one failing file does not lose the offsets of the others (no duplicated lines next round)', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n'); fs.writeFileSync(path.join(proj, 's2.jsonl'), 'b\n');
  fs.mkdirSync(path.join(out, 's2.jsonl'), { recursive: true });   // appending to a directory throws
  const r = archiveNow([cfg], arc);
  assert.equal(r.ok, false);
  assert.equal(r.errors?.length, 1);
  fs.rmdirSync(path.join(out, 's2.jsonl'));
  assert.equal(archiveNow([cfg], arc).ok, true);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\n');
  assert.equal(fs.readFileSync(path.join(out, 's2.jsonl'), 'utf8'), 'b\n');
});
