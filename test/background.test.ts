import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChildProcess } from 'node:child_process';
import { adoptBackground, countBackgroundWith, forgetBackground, isBackground, stopRevive } from '../hub/revive.ts';

// A child without a pid: killTree() then calls child.kill(), so nothing outside this test is touched.
const fakeChild = () => ({ kill() {} }) as unknown as ChildProcess;

test('forgetBackground: a late exit of an old child never removes or kills the newer one', () => {
  const oldChild = fakeChild(), newChild = fakeChild();
  adoptBackground('s1', oldChild);
  assert.equal(isBackground('s1'), true);
  // The old process exits after stopRevive + a new spawn for the same session id took its place.
  assert.equal(forgetBackground('s1', newChild), false, 'not the registered child: leave it alone');
  assert.equal(isBackground('s1'), true, 'the newer background child still runs');
  assert.equal(forgetBackground('s1', oldChild), true, 'the registered child is dropped');
  assert.equal(isBackground('s1'), false);
  assert.equal(forgetBackground('s1', oldChild), false, 'nothing left to drop');
});

test('stopRevive still ends a background child by id (tab opens, user ends the agent)', () => {
  adoptBackground('s2', fakeChild());
  assert.equal(stopRevive('s2'), true);
  assert.equal(isBackground('s2'), false);
  assert.equal(stopRevive('s2'), false);
});

// #250: the audit of #246 found Math.max(live, reviving) undercounts when one agent's compact is live while another's
// wake is still being prepared: those are two slots, so the cap must see 2 (a session in both counts once).
test('#250: a live compact and a turn still being prepared count as two background slots (union, not Math.max)', () => {
  adoptBackground('compacting', fakeChild());
  try {
    assert.equal(countBackgroundWith(['waking']), 2, 'a compact claude runs while a wake of another agent is being prepared');
    assert.equal(countBackgroundWith(['compacting']), 1, 'the same session is one slot, never two');
    assert.equal(countBackgroundWith([]), 1, 'the live claudes alone');
  } finally { forgetBackground('compacting'); }
  assert.equal(countBackgroundWith(['waking']), 1, 'only the prepared turn is left after cleanup');
});
