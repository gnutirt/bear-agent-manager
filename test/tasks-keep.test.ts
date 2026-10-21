import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addTask, listTasks } from '../hub/tasks.ts';

// fresh timestamps: the 30-day archive pass must not be what thins the file here
const task = (id: number, status: string) =>
  ({ id, title: `t${id}`, status, createdAt: Date.now(), updatedAt: Date.now(), ...(status === 'done' ? { doneAt: Date.now() } : {}) });

test('the 500-task cap drops old DONE tasks and never an open one', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-keep-'));
  try {
    const dir = path.join(home, 'rooms', 'r');
    fs.mkdirSync(dir, { recursive: true });
    // one open task with the lowest id: a plain slice(-KEEP) would have dropped exactly this one
    const tasks = [task(1, 'todo'), ...Array.from({ length: 500 }, (_, i) => task(i + 2, 'done'))];
    fs.writeFileSync(path.join(dir, 'tasks.json'), JSON.stringify({ next: 502, tasks }));

    addTask(home, 'r', { title: 'fresh' });

    const kept = listTasks(home, 'r');
    assert.equal(kept.length, 500, 'the file stays at the cap');
    assert.ok(kept.some((t) => t.id === 1), 'the open task survives the cap');
    assert.equal(kept.some((t) => t.id === 2), false, 'the oldest done task is the one dropped');
    assert.equal(kept.some((t) => t.title === 'fresh'), true, 'the new task is there');
    const filtered = listTasks(home, 'r', { status: 'todo, done' });
    assert.equal(filtered.length, 500, 'comma-separated status filters trim whitespace');
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});
