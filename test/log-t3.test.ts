import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { CopilotAgent } from '../hub/copilot.ts';
import { defaultSettings } from '../hub/settings.ts';
import { hookLog } from '../hooks/lib.ts';
import { initLog, logDir } from '../hub/log.ts';

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bam-log-t3-'));
const day = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('#283 Copilot errors go through the shared redact net instead of the old gh/Bearer-only copy', async () => {
  const { hub, dir } = await makeHub();
  const agent = new CopilotAgent({
    dir,
    cwd: process.cwd(),
    profile: { id: 'log-t3', name: 'CopilotLogT3', cwd: process.cwd() },
    port: () => hub.port,
    store: hub.store,
    settings: () => defaultSettings(),
    onChange: () => {},
    onRoom: () => {},
    onRooms: () => {},
    onMessage: () => {},
    createClient: () => { throw new Error('not used'); },
  });
  try {
    hub.store.createRoom('bear-agent-manager');   // reportError posts its failure into the room; the agent never started here
    // A provider key in the message body, and a room token in a header line: the old copy hid neither.
    agent.reportError(new Error('request failed: ANTHROPIC_AUTH_TOKEN=abcd1234efgh5678 x-room-token: deadbeefdeadbeefdeadbeef'));
    const error = agent.snapshot().error ?? '';
    assert.match(error, /\[redacted\]/);
    assert.ok(!error.includes('abcd1234efgh5678'), error);
    assert.ok(!error.includes('deadbeefdeadbeefdeadbeef'), error);
  } finally {
    await hub.close();
  }
});

test('#283 a hook whose hub is down writes the redacted line to logs/hook-fallback.log', async () => {
  const dir = temp();
  try {
    const where = await hookLog('warn', 'PostToolUse hook failed', { token: 'abcd1234efgh5678', why: 'boom' }, {
      home: dir,
      post: async () => { throw new Error('connect ECONNREFUSED 127.0.0.1:7788'); },
    });
    assert.equal(where, 'fallback');
    const file = path.join(dir, 'logs', 'hook-fallback.log');
    const line = JSON.parse(fs.readFileSync(file, 'utf8').trim());
    assert.equal(line.level, 'warn');
    assert.equal(line.area, 'hook');
    assert.equal(line.msg, 'PostToolUse hook failed');
    assert.equal(line.data.token, '[redacted]', 'the fallback file is redacted with the same net');
    assert.match(line.why, /ECONNREFUSED/);
    assert.match(line.ts, /^\d{4}-\d{2}-\d{2}T/);
    // The hub path writes nothing to the fallback file (and posts the line to /api/log).
    const posts: { path: string; body: any }[] = [];
    const ok = await hookLog('error', 'line for the hub', { sid: 'abcd1234' }, {
      home: dir,
      post: async (p, init) => { posts.push({ path: p, body: (init as any)?.body }); return {}; },
    });
    assert.equal(ok, 'hub');
    assert.equal(posts.length, 1);
    assert.equal(posts[0].path, '/api/log');
    assert.equal(posts[0].body.level, 'error');
    assert.equal(fs.readFileSync(file, 'utf8').trim().split('\n').length, 1, 'the hub path added no fallback line');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('#283 POST /api/log accepts 30 lines per second, answers 429 after that, and needs the room token', async () => {
  const { hub, dir } = await makeHub();
  initLog(dir);
  try {
    const post = (token = hub.token) => fetch(hub.url + '/api/log', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-room-token': token },
      body: JSON.stringify({ level: 'warn', msg: 'hook line', agent: 'deepseek03', data: { note: 'x' } }),
    });
    assert.equal((await post('wrong-token')).status, 401, 'a hook without the room token cannot write the log');
    const statuses = (await Promise.all(Array.from({ length: 100 }, () => post()))).map((r) => r.status);
    assert.equal(statuses.filter((s) => s === 200).length, 30, 'the first 30 lines of the second are accepted');
    assert.equal(statuses.filter((s) => s === 429).length, 70, 'the rest of the burst is refused');
    const file = path.join(logDir(dir), `bam-${day()}.jsonl`);
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(lines.filter((l) => l.area === 'hook').length, 30, 'exactly the accepted lines reached the file');
    assert.equal(lines[0].msg, 'hook line');
    assert.equal(lines[0].level, 'warn');
  } finally {
    await hub.close();
  }
});
