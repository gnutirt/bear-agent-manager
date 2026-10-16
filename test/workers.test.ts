import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkers, mergeWorkerLog, type Proc } from '../hub/workers.ts';

const PS = String.raw`"C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -File C:\Users\me\.claude\skills\congnhan\congnhan.ps1 -PromptFile C:\Temp\vesinh-test\vesinh-task.txt -Dir C:\Temp\vesinh-test -Kind vesinh`;
const CL = String.raw`"C:\Program Files\nodejs\node_modules\@anthropic-ai\claude-code\bin\claude.exe" -p --bare --model deepseek-v4-flash-0731 --allowedTools Read,Grep,Glob,Bash --output-format json`;

const procs: Proc[] = [
  { pid: 20020, ppid: 18632, name: 'powershell.exe', cmd: PS, started: 1000 },
  { pid: 62200, ppid: 20020, name: 'claude.exe', cmd: CL, started: 1100 },
  { pid: 777, ppid: 1, name: 'claude.exe', cmd: '"C:\\x\\claude.exe" --output-format stream-json --input-format stream-json', started: 5 },
  { pid: 31000, ppid: 1, name: 'powershell.exe', cmd: String.raw`powershell -NoProfile -File C:\Users\me\.claude\skills\congnhan\congnhan.ps1 -PromptFile "C:\T\task two.txt" -Dir "D:\repo x" -Tools "Read,Grep,Glob,Bash,Edit,Write"`, started: 2000 },
];

test('parseWorkers finds congnhan runs with their model, tools, dir, kind; ignores editor chats', () => {
  const ws = parseWorkers(procs);
  assert.equal(ws.length, 2);
  const v = ws.find((w) => w.pid === 20020)!;
  assert.deepEqual([v.kind, v.model, v.canEdit, v.dir, v.promptFile, v.childPid, v.startedAt],
    ['osin', 'deepseek-v4-flash-0731', false, 'C:\\Temp\\vesinh-test', 'C:\\Temp\\vesinh-test\\vesinh-task.txt', 62200, 1000]);
  const c = ws.find((w) => w.pid === 31000)!;
  assert.deepEqual([c.kind, c.model, c.canEdit, c.dir, c.promptFile, c.childPid],
    ['worker', '', true, 'D:\\repo x', 'C:\\T\\task two.txt', null]);
});

test('parseWorkers: new worker.ps1 and legacy congnhan.ps1 both found; osin and legacy vesinh map to osin', () => {
  const NEW = String.raw`powershell -NoProfile -File C:\p\skills\worker\worker.ps1 -PromptFile C:\T\a.txt -Dir D:\r -Kind osin`;
  const OLD = String.raw`powershell -NoProfile -File C:\p\skills\congnhan\congnhan.ps1 -PromptFile C:\T\b.txt -Dir D:\r -Kind vesinh`;
  const PLAIN = String.raw`powershell -NoProfile -File C:\p\skills\worker\worker.ps1 -PromptFile C:\T\c.txt -Dir D:\r`;
  const ws = parseWorkers([
    { pid: 1, ppid: 0, name: 'powershell.exe', cmd: NEW, started: 1 },
    { pid: 2, ppid: 0, name: 'powershell.exe', cmd: OLD, started: 2 },
    { pid: 3, ppid: 0, name: 'powershell.exe', cmd: PLAIN, started: 3 },
  ]);
  assert.deepEqual(ws.map((w) => [w.pid, w.kind]), [[1, 'osin'], [2, 'osin'], [3, 'worker']]);
});

test('mergeWorkerLog maps legacy kinds', () => {
  const h = mergeWorkerLog([
    { event: 'start', id: 'a', kind: 'vesinh', ts: 1 }, { event: 'start', id: 'b', kind: 'congnhan', ts: 2 }, { event: 'start', id: 'c', kind: 'osin', ts: 3 },
  ]);
  assert.deepEqual(h.map((r) => [r.id, r.kind]), [['c', 'osin'], ['b', 'worker'], ['a', 'osin']]);
});

test('mergeWorkerLog pairs start/end lines into history with result, cost and error', () => {
  const log = [
    { event: 'start', id: 'a', pid: 1, kind: 'vesinh', dir: 'D:/r', task: 'Đọc file chat.txt', tools: 'Read', ts: 100 },
    { event: 'end', id: 'a', exit: 0, model: 'deepseek-v4-flash-0731', cost: 0, result: '# Hồ sơ…', ts: 400 },
    { event: 'start', id: 'b', pid: 2, kind: 'congnhan', dir: 'D:/r', task: 'Khảo sát', tools: 'Read', ts: 500 },
    { event: 'end', id: 'b', exit: 3, model: 'kimi-k2.6', error: 'QUOTA 429', ts: 900 },
    { event: 'start', id: 'c', pid: 3, kind: 'congnhan', dir: 'D:/r', task: 'đang chạy', tools: 'Read', ts: 950 },
  ];
  const h = mergeWorkerLog(log);
  assert.deepEqual(h.map((x) => [x.id, x.status, x.durationMs]), [['c', 'running', null], ['b', 'failed', 400], ['a', 'done', 300]]);
  assert.equal(h.find((x) => x.id === 'b')!.error, 'QUOTA 429');
  assert.equal(h.find((x) => x.id === 'a')!.result, '# Hồ sơ…');
});

test('mergeWorkerLog reads provider, tier and usage; missing usage is zero', () => {
  const h = mergeWorkerLog([
    { event: 'start', id: 'a', kind: 'worker', ts: 1 },
    { event: 'end', id: 'a', exit: 0, provider: 'intern', tier: 'free', usage: { in: 1200, out: 300, cacheRead: 50, cacheWrite: 0 }, ts: 5 },
    { event: 'start', id: 'b', kind: 'worker', ts: 2 },
    { event: 'end', id: 'b', exit: 1, ts: 3 },
  ]);
  const a = h.find((r) => r.id === 'a')!, b = h.find((r) => r.id === 'b')!;
  assert.deepEqual([a.provider, a.tier, a.usage], ['intern', 'free', { in: 1200, out: 300, cacheRead: 50, cacheWrite: 0 }]);
  assert.deepEqual([b.provider, b.tier, b.usage], ['', '', { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 }]);
});
