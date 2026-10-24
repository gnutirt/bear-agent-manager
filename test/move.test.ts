import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { holderOf } from '../hub/server.ts';

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
      history.some((m) => /quá hạn|timed out/i.test(m.text)),
      'timeout notice must be posted in room',
    );
  } finally {
    await hub.close();
  }
});
