import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { holderOf } from '../hub/server.ts';
import { t } from '../shared/i18n.ts';

test('T4 move validation: rejects invalid target, returns noop when already at destination', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'm1', cwd: dir, ide: 'vscode' });
    await assert.rejects(
      call('/api/sessions/m1/move', { to: 'sublime' }),
      (err: any) => err.status === 400 && /to must be 'vscode', 'antigravity', or 'bam'/.test(err.message),
    );

    // No-op when target matches current holder (none)
    const res = await call<any>('/api/sessions/m1/move', { to: 'bam' });
    assert.equal(res.ok, true);
  } finally {
    await hub.close();
  }
});

test('T4 move account switch: rejects with 409 if accounts not shared or target not logged in', async () => {
  const home = path.join(os.tmpdir(), 'move-home-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(home, { recursive: true });
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    usageHome: home,
    authStatus: async (configDir: string) => {
      if (configDir.includes('not-logged-in')) {
        return { loggedIn: false };
      }
      return { loggedIn: true, email: 'user@test.org' };
    },
  });

  try {
    const accPrimary = path.join(home, '.claude');
    const accOther = path.join(home, '.claude-other');
    const accNotLogged = path.join(home, '.claude-not-logged-in');
    fs.mkdirSync(path.join(accPrimary, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(accOther, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(accNotLogged, 'projects'), { recursive: true });
    fs.writeFileSync(path.join(accPrimary, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.org' } }));
    fs.writeFileSync(path.join(accOther, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'b@x.org' } }));
    fs.writeFileSync(path.join(accNotLogged, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'c@x.org' } }));

    await call('/api/sessions/register', { id: 'm2', cwd: dir, configDir: accPrimary });

    // Not shared yet: must reject with 409
    await assert.rejects(
      call('/api/sessions/m2/move', { to: 'bam', account: accOther }),
      (err: any) => err.status === 409 && /chưa dùng chung chat|not shared/i.test(err.message),
    );

    // Share accounts
    await call('/api/accounts/share', { on: true, confirm: true });

    // Target not logged in: must reject with 409
    await assert.rejects(
      call('/api/sessions/m2/move', { to: 'bam', account: accNotLogged }),
      (err: any) => err.status === 409 && /chưa đăng nhập|not logged in/i.test(err.message),
    );
  } finally {
    await hub.close();
  }
});

test('T4 move: từ nền sang tab: pid nền bị kết thúc trước khi mở tab', async () => {
  const opened: string[] = [];
  const alivePids = new Set<number>([201]);
  let bgDeadWhenOpened = false;

  const { hub, dir, call } = await makeHub(undefined, undefined, {
    openUrl: (url: string) => {
      opened.push(url);
      if (!alivePids.has(201)) {
        bgDeadWhenOpened = true;
      }
    },
    isAlive: (pid: number) => alivePids.has(pid),
    bgKillTimeoutMs: 500,
  });

  try {
    const tr = path.join(dir, 'transcript.jsonl');
    fs.writeFileSync(tr, '{"type":"assistant"}\n');

    await call('/api/rooms', { name: 'room1' });
    await call('/api/sessions/register', {
      id: 'm3',
      name: 'worker-m3',
      cwd: dir,
      pid: 201,
      headless: true,
      transcript: tr,
    });
    await call('/api/rooms/room1/join', { sessionId: 'm3' });

    assert.equal(holderOf(hub.store.session('m3'), (p) => alivePids.has(p)).where, 'bam');

    // Simulate process exiting when revive or stop terminates it
    hub.store.session('m3').pids = [{ pid: 201, headless: true, configDir: '', at: Date.now() }];
    setTimeout(() => { alivePids.delete(201); }, 50);

    const res = await call<any>('/api/sessions/m3/move', { to: 'vscode' });
    assert.equal(res.ok, true);
    assert.equal(res.done, true);

    assert.equal(opened.length, 1);
    assert.match(opened[0], /^vscode:\/\//);
    assert.equal(bgDeadWhenOpened, true, 'background pid must be dead before openUrl is called');

    const s = hub.store.session('m3');
    assert.equal(s.ide, 'vscode');
    assert.equal(s.moving ?? false, false);
  } finally {
    await hub.close();
  }
});

test('T4 move: từ tab sang nền: chờ SessionEnd; khi SessionEnd tới thì chuyển sang BAM; trong lúc moving một @ không khởi động phiên', async () => {
  const alivePids = new Set<number>([301]);
  let revived = false;

  const { hub, dir, call } = await makeHub(undefined, undefined, {
    isAlive: (pid: number) => alivePids.has(pid),
    revive: () => {
      revived = true;
      return { pid: 999, child: {} as any, stop: () => {} };
    },
    moveTimeoutMs: 5000,
  });

  try {
    const tr = path.join(dir, 'transcript.jsonl');
    fs.writeFileSync(tr, '{"type":"assistant"}\n');

    await call('/api/rooms', { name: 'r-tab' });
    await call('/api/sessions/register', {
      id: 'm4',
      name: 'worker-m4',
      cwd: dir,
      pid: 301,
      headless: false,
      ide: 'vscode',
      transcript: tr,
    });
    await call('/api/rooms/r-tab/join', { sessionId: 'm4' });

    assert.equal(holderOf(hub.store.session('m4'), (p) => alivePids.has(p)).where, 'vscode');

    // Start move to BAM
    const res = await call<any>('/api/sessions/m4/move', { to: 'bam' });
    assert.equal(res.ok, true);
    assert.equal(res.moving, true);
    assert.equal(res.waitingForTabClose, true);

    const s = hub.store.session('m4');
    assert.equal(s.moving, true);

    // In moving state: operations rejected
    await assert.rejects(call('/api/sessions/m4/revive', {}), /currently moving/);
    await assert.rejects(call('/api/sessions/m4/open-tab', {}), /currently moving/);
    await assert.rejects(call('/api/sessions/m4/move', { to: 'vscode' }), /currently moving/);

    // An @ message in room does NOT wake it
    await call('/api/rooms/r-tab/messages', { text: '@worker-m4 ping while moving' });
    assert.equal(revived, false, 'incoming @ must not wake a session while moving: true');

    // Tab closes: simulate SessionEnd hook
    alivePids.delete(301);
    await fetch(`${hub.url}/hooks/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'm4' }),
    });

    // Wait briefly for background async waiter to complete move
    let attempts = 0;
    while (attempts < 20 && hub.store.session('m4').moving) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    const after = hub.store.session('m4');
    assert.equal(after.moving, false);
    assert.equal(after.ended, true);
    assert.equal(revived, true, 'session must be revived after tab closes');
  } finally {
    await hub.close();
  }
});

test('T4 move: từ tab sang nền: quá hạn thì huỷ', async () => {
  const alivePids = new Set<number>([401]);

  const { hub, dir, call } = await makeHub(undefined, undefined, {
    isAlive: (pid: number) => alivePids.has(pid),
    moveTimeoutMs: 150,
  });

  try {
    await call('/api/rooms', { name: 'r-timeout' });
    await call('/api/sessions/register', {
      id: 'm5',
      name: 'worker-m5',
      cwd: dir,
      pid: 401,
      headless: false,
      ide: 'vscode',
    });
    await call('/api/rooms/r-timeout/join', { sessionId: 'm5' });

    const res = await call<any>('/api/sessions/m5/move', { to: 'bam' });
    assert.equal(res.ok, true);
    assert.equal(res.moving, true);

    // Wait past the 150ms timeout
    await new Promise((r) => setTimeout(r, 300));

    const s = hub.store.session('m5');
    assert.equal(s.moving, false, 'session moving must be reset to false after timeout');

    const history = hub.store.history('r-timeout');
    assert.ok(
      history.some((m) => m.text === t('vi', 'sys.move.timeout', { name: 'worker-m5', ide: 'vscode' })),
      'timeout notice must be posted in room',
    );
  } finally {
    await hub.close();
  }
});

test('T4 move audit (1): bg chưa chết sau 30s timeout → 409 bgStuck, moving nhả, không đổi nơi chạy', async () => {
  const alivePids = new Set<number>([601]);
  let openedUrl = false;
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    openUrl: () => { openedUrl = true; },
    isAlive: (pid: number) => alivePids.has(pid),
    bgKillTimeoutMs: 100,
  });

  try {
    const tr = path.join(dir, 'transcript.jsonl');
    fs.writeFileSync(tr, '{"type":"assistant"}\n');
    await call('/api/rooms', { name: 'r-stuck' });
    await call('/api/sessions/register', {
      id: 'm-stuck',
      name: 'worker-stuck',
      cwd: dir,
      pid: 601,
      headless: true,
      transcript: tr,
    });
    await call('/api/rooms/r-stuck/join', { sessionId: 'm-stuck' });

    await assert.rejects(
      call('/api/sessions/m-stuck/move', { to: 'vscode' }),
      (err: any) => err.status === 409 && err.message === t('vi', 'sys.move.bgStuck', { name: 'worker-stuck' }),
    );

    const s = hub.store.session('m-stuck');
    assert.equal(s.moving, false, 'moving must be released on bgStuck');
    assert.notEqual(s.ide, 'vscode', 'destination must not be executed when bg is stuck');
    assert.equal(openedUrl, false);

    const history = hub.store.history('r-stuck');
    assert.ok(
      history.some((m) => m.text === t('vi', 'sys.move.bgStuck', { name: 'worker-stuck' })),
      'bgStuck error message must be broadcast to room',
    );
  } finally {
    await hub.close();
  }
});

test('T4 move audit (2): compactTaskOwner bỏ qua session khi moving = true', async () => {
  const compacts: string[] = [];
  const { hub, dir, call } = await makeHub(undefined, () => {}, {
    autoRevive: false,
    compactRevive: async (job: any) => {
      compacts.push(job.id);
      return 0;
    },
  });

  try {
    const tr = path.join(dir, 'transcript-compact.jsonl');
    fs.writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'claude-sonnet-5-5', usage: { input_tokens: 10_000 } } }) + '\n');
    await call('/api/rooms', { name: 'r-compact' });
    await call('/api/sessions/register', { id: 'm-compact', name: 'coder', cwd: dir, transcript: tr });
    await call('/api/rooms/r-compact/join', { sessionId: 'm-compact' });
    await fetch(`${hub.url}/hooks/end`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'm-compact' }),
    });

    await call('/api/sessions/register', { id: 'lead-compact', name: 'lead', cwd: dir });
    await call('/api/rooms/r-compact/join', { sessionId: 'lead-compact' });
    await call('/api/rooms/r-compact/lead', { sessionId: 'lead-compact' });

    // Mark coder as moving
    const coder = hub.store.session('m-compact');
    coder.moving = true;
    hub.store.save();

    const task = await call<any>('/api/rooms/r-compact/tasks', { sessionId: 'lead-compact', title: 'Task while moving', owner: 'coder' });
    await call(`/api/rooms/r-compact/tasks/${task.id}`, {
      sessionId: 'lead-compact',
      status: 'done',
      commit: 'abc1234',
    });

    await new Promise((r) => setTimeout(r, 100));
    assert.deepEqual(compacts, [], 'compact must not be triggered when session is moving');
  } finally {
    await hub.close();
  }
});

test('T4 move audit (3): đặt moving = true trước await auth để chặn concurrent move', async () => {
  const home = path.join(os.tmpdir(), 'move-race-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(home, { recursive: true });
  let fakeNow = Date.now();
  let delayAuth = false;
  let authResolve: (() => void) | undefined;
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    usageHome: home,
    now: () => fakeNow,
    authStatus: async () => {
      if (delayAuth) {
        await new Promise<void>((r) => { authResolve = r; });
      }
      return { loggedIn: true, email: 'user@test.org' };
    },
  });

  try {
    const accPrimary = path.join(home, '.claude');
    const accOther = path.join(home, '.claude-other');
    fs.mkdirSync(path.join(accPrimary, 'projects'), { recursive: true });
    fs.mkdirSync(path.join(accOther, 'projects'), { recursive: true });
    fs.writeFileSync(path.join(accPrimary, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'a@x.org' } }));
    fs.writeFileSync(path.join(accOther, '.claude.json'), JSON.stringify({ oauthAccount: { emailAddress: 'b@x.org' } }));

    await call('/api/sessions/register', { id: 'm-race', cwd: dir, configDir: accPrimary });
    await call('/api/accounts/share', { on: true, confirm: true });

    // Advance time past 60s cache and enable delay
    fakeNow += 70_000;
    delayAuth = true;

    // First move call starts and hangs in authStatus
    const p1 = call('/api/sessions/m-race/move', { to: 'bam', account: accOther });

    // Wait until authResolve is set
    while (!authResolve) await new Promise((r) => setTimeout(r, 10));

    // Session must already be moving: true
    assert.equal(hub.store.session('m-race').moving, true);

    // Second concurrent call must be immediately rejected with 409
    await assert.rejects(
      call('/api/sessions/m-race/move', { to: 'vscode' }),
      (err: any) => err.status === 409 && /currently moving/i.test(err.message),
    );

    // Unblock first call
    authResolve();
    const res1 = await p1;
    assert.equal((res1 as any).ok, true);
    assert.equal(hub.store.session('m-race').moving, false);
  } finally {
    await hub.close();
  }
});

test('T4 move audit (4): xét kết quả revive: nếu revive false/thất bại thì báo warn reviveFailed', async () => {
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    revive: () => undefined,
  });

  try {
    await call('/api/rooms', { name: 'r-revive-fail' });
    await call('/api/sessions/register', { id: 'm-revive-fail', name: 'worker-fail', cwd: dir });
    await call('/api/rooms/r-revive-fail/join', { sessionId: 'm-revive-fail' });

    const res = await call<any>('/api/sessions/m-revive-fail/move', { to: 'bam' });
    assert.equal(res.ok, true);

    const history = hub.store.history('r-revive-fail');
    const failMsg = history.find((m) => m.text === t('vi', 'sys.move.reviveFailed', { name: 'worker-fail' }));
    assert.ok(failMsg, 'reviveFailed message must be broadcast to room');
    assert.equal(failMsg.sys?.level, 'warn');
  } finally {
    await hub.close();
  }
});

test('T4 move audit (5): lastIdeAccount chọn tiến trình có p.at lớn nhất thay vì phần tử đầu', async () => {
  const home = path.join(os.tmpdir(), 'move-ide-mismatch-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(home, { recursive: true });
  const accOld = path.join(home, '.claude-old');
  const accNew = path.join(home, '.claude-new');

  const { hub, dir, call } = await makeHub(undefined, undefined, {
    usageHome: home,
    authStatus: async () => ({ loggedIn: true, email: 'user@test.org' }),
  });

  try {
    await call('/api/rooms', { name: 'r-mismatch' });
    await call('/api/sessions/register', { id: 'm-target', name: 'target-sess', cwd: dir, configDir: accOld });
    await call('/api/rooms/r-mismatch/join', { sessionId: 'm-target' });

    // Register session with two IDE processes: old one with at=1000, newer one with at=5000 and accNew
    const otherSess = hub.store.register({ id: 'other-sess', cwd: dir, name: 'other' });
    otherSess.pids = [
      { pid: 701, headless: false, ide: 'vscode', configDir: accOld, at: 1000 },
      { pid: 702, headless: false, ide: 'vscode', configDir: accNew, at: 5000 },
    ];
    hub.store.save();

    // Moving m-target to vscode with accOld (targetAccount is accOld).
    // Because lastIdeAccount looks at max p.at, it will pick accNew (at=5000), which mismatches accOld -> warning!
    const res = await call<any>('/api/sessions/m-target/move', { to: 'vscode' });
    assert.equal(res.ok, true);

    const history = hub.store.history('r-mismatch');
    const warnMsg = history.find((m) => m.text === t('vi', 'sys.move.ideAccountMismatch', {
      ide: 'vscode',
      ideAccount: path.basename(accNew),
      targetAccount: path.basename(accOld),
    }));
    assert.ok(warnMsg, 'ideAccountMismatch warning must be broadcast when latest at differs');
    assert.ok(warnMsg.text.includes(path.basename(accNew)), 'must refer to latest account .claude-new');
  } finally {
    await hub.close();
  }
});
