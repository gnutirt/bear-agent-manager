import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error plain .mjs script, no types
import { extractRoutes } from '../scripts/gen-api-doc.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('docs/api.md lists every route of hub/server.ts (run: node scripts/gen-api-doc.mjs)', () => {
  const routes: { method: string; path: string }[] = extractRoutes(fs.readFileSync(path.join(ROOT, 'hub/server.ts'), 'utf8'));
  assert.ok(routes.length > 50, `the extractor found only ${routes.length} routes`);
  const doc = fs.readFileSync(path.join(ROOT, 'docs/api.md'), 'utf8');
  const missing = routes.filter((r) => !doc.includes(`| ${r.method} | \`${r.path}\` |`)).map((r) => `${r.method} ${r.path}`);
  assert.deepEqual(missing, [], 'routes without a row in docs/api.md - regenerate it with `node scripts/gen-api-doc.mjs`');
  assert.ok(routes.some((r) => r.method === 'POST' && r.path === '/api/sessions/:id/room-commit'));
});
