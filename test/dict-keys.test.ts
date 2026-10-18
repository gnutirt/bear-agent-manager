import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { leadPrompt } from '../hub/lead.ts';
import { formatDelivery } from '../shared/format.ts';

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

test('K2: the room lead is told to turn requests into tasks with room_tasks, in the lead prompt and in every delivery', () => {
  assert.match(leadPrompt('web', [], {}, 'en'), /room_tasks add/);
  assert.ok(!/room_tasks/.test(leadPrompt('web', [], { delegate: false }, 'en')));
  assert.match(formatDelivery([], {}, ['web']), /room_tasks add/);
});
