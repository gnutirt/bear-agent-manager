import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adoptBackground, isBackground } from '../hub/revive.ts';
import { makeHub } from './helpers.ts';

const fakeClaude = () => { const c: any = { killed: 0, kill() { c.killed++; } }; return c; };

test('a tab that comes up ends the background claude of the same session; a background register does not', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'tb1', cwd: 'C:/tabbg' });
    await call('/api/rooms/r/join', { sessionId: 'tb1' });
    const child = fakeClaude();
    adoptBackground('tb1', child);
    await call('/api/sessions/register', { id: 'tb1', cwd: 'C:/tabbg', headless: true });   // the background process itself
    assert.equal(child.killed, 0); assert.equal(isBackground('tb1'), true);
    await call('/api/sessions/register', { id: 'tb1', cwd: 'C:/tabbg' });                    // a tab
    assert.equal(child.killed, 1); assert.equal(isBackground('tb1'), false);
    const texts = (await call<any[]>('/api/rooms/r/messages?limit=5')).map((m) => m.text);
    assert.ok(texts.some((t) => /đóng tiến trình nền/.test(t)), texts.join(' | '));
    await call('/api/sessions/register', { id: 'tb1', cwd: 'C:/tabbg' });                    // again: nothing left to stop
    assert.equal(child.killed, 1);
  } finally { await hub.close(); }
});

test('a background waiter steps aside when a tab already waits; a tab waiter supersedes a background one', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'tb2', cwd: 'C:/tabbg2' });
    const wait = (headless: boolean, timeout = 1) => call<any>(`/api/sessions/tb2/wait?timeout=${timeout}${headless ? '&headless=1' : ''}`, undefined, { method: 'GET' });
    const tab = wait(false, 3);
    await new Promise((r) => setTimeout(r, 200));
    assert.deepEqual(await wait(true), { superseded: true });   // refused at once, the tab keeps waiting
    assert.deepEqual(await tab, { messages: [] });              // the tab's wait ran its full course, untouched
    const bg = wait(true, 3);
    await new Promise((r) => setTimeout(r, 200));
    const tab2 = wait(false, 1);
    assert.deepEqual(await bg, { superseded: true });           // the tab took over from the background waiter
    await tab2;
  } finally { await hub.close(); }
});

test('End kills every claude that registered for the chat (tab and background), and only claudes', async () => {
  const { spawn } = await import('node:child_process');
  const idle = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)'], { stdio: 'ignore' });   // a live pid that is not a claude
  const [tabPid, bgPid, otherPid] = [process.pid, process.ppid, idle.pid!];
  const killed: number[] = [];
  const procs: any[] = [tabPid, bgPid].map((pid) => ({ pid, ppid: 1, name: 'claude.exe', cmd: '"C:/x/claude.exe" --resume tb3', started: 1 })).concat([{ pid: otherPid, ppid: 1, name: 'node.exe', cmd: 'node x.js', started: 1 }] as any);
  const { hub, call } = await makeHub(undefined, undefined, { listProcs: async () => procs, kill: async (pid: number) => { killed.push(pid); } });
  try {
    await call('/api/sessions/register', { id: 'tb3', cwd: 'C:/tabbg3', pid: tabPid });
    await call('/api/sessions/register', { id: 'tb3', cwd: 'C:/tabbg3', pid: bgPid, headless: true });
    await call('/api/sessions/register', { id: 'tb3', cwd: 'C:/tabbg3', pid: otherPid });
    await call('/api/sessions/tb3/terminate', {});
    assert.deepEqual(killed.sort(), [tabPid, bgPid].sort());
  } finally { await hub.close(); idle.kill(); }
});
