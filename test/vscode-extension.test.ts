import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readExtension = () => readFile(new URL('../vscode/extension.js', import.meta.url), 'utf8');

/* ---------- IDE bridge client #212: fixes from the core-improve audit ---------- */

test('IDE bridge #212: a focus change re-announces without aborting the long-poll', async () => {
  const src = await readExtension();
  assert.ok(!src.includes('refreshPending'), 'the old refresh flag (and its poll abort) is gone');
  const start = src.indexOf('const refresh = () => {'), end = src.indexOf('};', start);
  assert.ok(start > 0, 'missing refresh()');
  const refresh = src.slice(start, end);
  assert.ok(!refresh.includes('abort'), 'changing focus/folders must not drop a long-poll the hub already handed us');
  assert.ok(refresh.includes('void announce(auth).catch(() => {})'), 'it only sends a parallel hello');
  assert.ok(refresh.includes('if (!client || !auth) return'), 'the first hello stays with run()');
  // the poll loop no longer exits on a refresh flag; only stop ends it
  assert.ok(src.includes('await announce(auth);\n        while (!stopped) {'), 'the poll loop keeps running across re-announces');
});

test('IDE bridge #212: the secrets filter names real secret files but not tokenizer/tokens source files', async () => {
  const src = await readExtension();
  const literal = src.match(/const SECRET_FILE = (\/[\s\S]*?\/i);/)![1];
  const slash = literal.lastIndexOf('/');
  const secret = new RegExp(literal.slice(1, slash), literal.slice(slash + 1));
  for (const name of ['src/tokenizer.ts', 'tokens.test.ts', 'src/token.ts', 'src/tokenize.ts', 'README.md']) {
    assert.ok(!secret.test(name), `${name} is ordinary source, not a secret`);
  }
  for (const name of ['.env', '.env.local', 'config/server.key', 'id_rsa', 'token', 'auth/tokens.json', 'credentials.json', 'providers.json', 'secrets.yaml']) {
    assert.ok(secret.test(name), `${name} must stay blocked`);
  }
});

test('IDE bridge #212: a proposed diff keeps its right side until the diff tab closes', async () => {
  const src = await readExtension();
  assert.ok(src.includes('onDidCloseTextDocument'), 'the client frees the proposal when the tab closes');
  assert.ok(src.includes("document.uri.scheme === 'bear-proposal'"), 'only proposal documents are dropped');
  assert.ok(src.includes('setTimeout(() => proposals.delete(id), 30 * 60_000)'), 'the 30-minute fallback matches the audit');
  assert.ok(!src.includes('5 * 60_000'), 'the five-minute wipe that emptied an open diff is gone');
});
