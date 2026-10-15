import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const ignored = (f: string) => {
  try { execFileSync('git', ['check-ignore', '-q', f], { cwd: ROOT }); return true; } catch { return false; }
};

test('todoplan/todobug are ignored, CHANGELOG is tracked', () => {
  for (const f of ['todoplan.md', 'todobug.md', 'TODOPLAN.md', 'todoplan/x.md']) assert.ok(ignored(f), `${f} should be ignored`);
  assert.ok(!ignored('CHANGELOG.md'));
});
