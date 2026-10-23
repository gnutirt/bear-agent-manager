import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leadPrompt } from '../hub/lead.ts';
import { formatDelivery } from '../shared/format.ts';
import { vi } from '../shared/i18n/vi.ts';
import { en } from '../shared/i18n/en.ts';

const root = path.join(import.meta.dirname, '..');

test('no key is defined twice in a dictionary (the later one silently wins: settings labels showed lead prompt sentences)', () => {
  for (const f of ['vi.ts', 'en.ts']) {
    const keys = [...fs.readFileSync(path.join(root, 'shared', 'i18n', f), 'utf8').matchAll(/^\s+'([\w.]+)':/gm)].map((m) => m[1]);
    // KNOWN: sys.usage.reset is the hub alert's ", resets {at}" and also the usage card's "resets {at}" (ui/index.html);
    // the card's copy must move to its own key, then this exception goes.
    const known = new Set<string>();
    assert.deepEqual(keys.filter((k, i) => keys.indexOf(k) !== i && !known.has(k)), [], f);
  }
});

test('S5: a settings hint stays one short consequence line (≤160 chars) and never leaks internal names', () => {
  // Internal words a user cannot act on: CLI flags, task ids, setting key names.
  const internal = /--bare|--dangerously-skip-permissions|\bT18\b|allTools|reviveTools/;
  for (const [lang, dict] of [['vi', vi], ['en', en]] as const) {
    for (const [key, text] of Object.entries(dict)) {
      if (!/\.hint(\.|$)/.test(key)) continue;
      assert.ok(text.length <= 160, `${lang} ${key} is ${text.length} chars (max 160): ${text}`);
      assert.ok(!internal.test(text), `${lang} ${key} leaks internal wording: ${text}`);
    }
  }
});

test('K2: the room lead is told to turn requests into tasks with room_tasks, in the lead prompt and in the delivery that opens a context', () => {
  assert.match(leadPrompt('web', [], {}, 'en'), /room_tasks add/);
  assert.ok(!/room_tasks/.test(leadPrompt('web', [], { delegate: false }, 'en')));
  // #200: the duty rides on the first delivery of a context, not on every one.
  assert.match(formatDelivery([], {}, ['web'], undefined, 'off', true), /room_tasks add/);
  assert.ok(!/room_tasks/.test(formatDelivery([], {}, ['web'])), 'a later delivery no longer repeats the lead duty');
});
