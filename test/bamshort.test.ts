import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { formatDelivery } from '../shared/format.ts';

// Room note [83]: the fixed set, same meaning in every room.
const EMOJI = ['✅', '❌', '⚠️', '⏳', '🚫', '👀', '❓', '🔁'];

test('BAMshort: terse deliveries carry one style line, other modes do not', () => {
  const terse = formatDelivery([], {}, [], undefined, 'terse');
  const off = formatDelivery([], {}, [], undefined, 'off');
  assert.equal(terse.split('\n').filter((l) => l.startsWith('Agent posts:')).length, 1, 'one line, not a paragraph');
  assert.ok(terse.includes('Agent posts: BAMshort'));
  for (const e of EMOJI) assert.ok(terse.includes(e), `terse line missing ${e}`);
  for (const s of ['no greetings', 'path:line', '^sha', '@you', 'decisions', 'contracts', 'docs/bamshort.md']) {
    assert.ok(terse.includes(s), `terse line lost "${s}"`);
  }
  assert.ok(!off.includes('BAMshort'), 'the style line only belongs to the terse mode');
});

test('docs/bamshort.md defines every fixed emoji and the hard rules', async () => {
  const doc = await readFile(new URL('../docs/bamshort.md', import.meta.url), 'utf8');
  for (const e of EMOJI) assert.ok(doc.includes(e), `glossary missing ${e}`);
  for (const s of ['One line per post', 'Full sentences only for', '^sha', 'path:line', '@name', 'Anti-patterns']) {
    assert.ok(doc.includes(s), `glossary missing "${s}"`);
  }
});
