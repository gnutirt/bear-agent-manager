import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateLegacyHome } from '../shared/config.ts';

test('migrateLegacyHome moves the old data dir once, never over an existing new one', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-home-'));
  const legacy = path.join(root, '.agent-room');
  const target = path.join(root, '.bear-agent-manager');
  fs.mkdirSync(path.join(legacy, 'rooms'), { recursive: true });
  fs.writeFileSync(path.join(legacy, 'token'), 'abc');
  assert.equal(migrateLegacyHome(legacy, target), true);
  assert.equal(fs.readFileSync(path.join(target, 'token'), 'utf8'), 'abc');
  assert.equal(fs.existsSync(legacy), false);
  fs.mkdirSync(legacy);
  assert.equal(migrateLegacyHome(legacy, target), false);
  assert.equal(fs.existsSync(legacy), true);
  assert.equal(migrateLegacyHome(path.join(root, 'missing'), path.join(root, 'other')), false);
});
