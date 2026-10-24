import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatHolderWhere, holderErrorMessage, holderOf, type Holder } from '../hub/server.ts';
import type { Session } from '../hub/store.ts';
import { makeHub } from './helpers.ts';

test('holderOf: 1 tab VS Code bằng ~/.claude cộng 1 nền bằng ~/.claude-antigravity thì count=2', () => {
  const home = os.homedir();
  const claudeDir = path.join(home, '.claude');
  const agDir = path.join(home, '.claude-antigravity');
  const alive = (pid: number) => pid === 101 || pid === 102;

  const s = {
    id: 's1',
    name: 'agent1',
    userNamed: true,
    cwd: 'C:/test',
    rooms: {},
    status: 'busy',
    activity: '',
    lastSeen: Date.now(),
    cursor: 0,
    ide: 'vscode',
    configDir: claudeDir,
    pids: [
      { pid: 101, headless: false, ide: 'vscode', configDir: claudeDir, at: 100 },
      { pid: 102, headless: true, configDir: agDir, at: 200 },
    ],
  } as unknown as Session;

  const h = holderOf(s, alive);
  assert.equal(h.count, 2, 'count must be 2 when 1 tab and 1 background process are alive');
  assert.equal(h.where, 'vscode', 'where should prioritize the active interactive tab');
  assert.equal(h.account, claudeDir);
  assert.equal(h.pid, 101);
});

test('holderOf: dead pids are ignored', () => {
  const alive = (pid: number) => pid === 999;
  const s = {
    id: 's2',
    name: 'agent2',
    cwd: 'C:/test',
    rooms: {},
    status: 'offline',
    pids: [
      { pid: 101, headless: false, ide: 'vscode', at: 100 },
      { pid: 102, headless: true, at: 200 },
    ],
  } as unknown as Session;

  const h = holderOf(s, alive);
  assert.equal(h.count, 0);
  assert.equal(h.where, 'none');
});

test('holderOf: single background process gives where=bam, single antigravity tab gives where=antigravity', () => {
  const alive = () => true;
  const sBg = {
    id: 'bg1',
    name: 'bgAgent',
    cwd: 'C:/test',
    rooms: {},
    status: 'busy',
    pids: [{ pid: 201, headless: true, configDir: 'C:/claude-bg', at: 100 }],
  } as unknown as Session;
  assert.deepEqual(holderOf(sBg, alive), { where: 'bam', account: 'C:/claude-bg', pid: 201, count: 1 });

  const sAg = {
    id: 'ag1',
    name: 'agAgent',
    cwd: 'C:/test',
    rooms: {},
    status: 'busy',
    pids: [{ pid: 202, headless: false, ide: 'antigravity', configDir: 'C:/claude-ag', at: 100 }],
  } as unknown as Session;
  assert.deepEqual(holderOf(sAg, alive), { where: 'antigravity', account: 'C:/claude-ag', pid: 202, count: 1 });
});

test('holderErrorMessage: formats "<tên> đang chạy ở <nơi> (tài khoản <email>)"', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'holder-err-'));
  try {
    fs.writeFileSync(path.join(tmpHome, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'user@example.com' } }));
    const s = { id: 's3', name: 'devAgent' } as Session;
    const h: Holder = { where: 'vscode', account: path.join(tmpHome, '.claude'), pid: 101, count: 2 };

    const msg = holderErrorMessage(s, h, tmpHome);
    assert.equal(msg, 'devAgent đang chạy ở tab VS Code (tài khoản user@example.com)');
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('T2 table test: 1 tab VS Code bằng ~/.claude + 1 nền bằng ~/.claude-antigravity thì count=2; open-tab bị từ chối với thông báo nơi chạy và email', async () => {
  const alivePids = new Set([101, 102]);
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    isAlive: (pid: number) => alivePids.has(pid),
  });

  try {
    // Write email in the test's usageHome (.claude.json)
    fs.writeFileSync(path.join(dir, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'tester@acme.corp' } }));

    const tr = path.join(dir, 'sess-t2.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant' }) + '\n');

    // Register tab VS Code with primary configDir ~/.claude
    await call('/api/sessions/register', {
      id: 'sess-t2',
      name: 'worker-t2',
      cwd: 'C:/project',
      pid: 101,
      headless: false,
      ide: 'vscode',
      configDir: path.join(dir, '.claude'),
      transcript: tr,
    });

    // Register second process: background wake with ~/.claude-antigravity
    await call('/api/sessions/register', {
      id: 'sess-t2',
      name: 'worker-t2',
      cwd: 'C:/project',
      pid: 102,
      headless: true,
      configDir: path.join(dir, '.claude-antigravity'),
      transcript: tr,
    });

    // Verify session state has 2 live pids
    const s = hub.store.session('sess-t2');
    const h = holderOf(s, (pid) => alivePids.has(pid));
    assert.equal(h.count, 2, 'session must have count=2');
    assert.equal(h.where, 'vscode');

    // Attempt open-tab: should be rejected with 409
    await assert.rejects(
      call('/api/sessions/sess-t2/open-tab', {}),
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /worker-t2 đang chạy ở tab VS Code/);
        assert.match(err.message, /tester@acme\.corp/);
        return true;
      },
      'open-tab must be rejected with 409 and error containing running place and email',
    );

    // Attempt revive: should also be rejected with 409 and the same message
    await assert.rejects(
      call('/api/sessions/sess-t2/revive', {}),
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /worker-t2 đang chạy ở tab VS Code/);
        assert.match(err.message, /tester@acme\.corp/);
        return true;
      },
    );

    // Attempt livechat: should also be rejected with 409 and the same message
    await assert.rejects(
      call('/api/sessions/sess-t2/live', {}),
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /worker-t2 đang chạy ở tab VS Code/);
        assert.match(err.message, /tester@acme\.corp/);
        return true;
      },
    );

    // Attempt compact without closeTab: should be rejected with 409 and error containing running place and email
    await assert.rejects(
      call('/api/sessions/sess-t2/compact', {}),
      (err: any) => {
        assert.equal(err.status, 409);
        assert.match(err.message, /worker-t2 đang chạy ở tab VS Code/);
        assert.match(err.message, /tester@acme\.corp/);
        return true;
      },
    );
  } finally {
    await hub.close();
  }
});
