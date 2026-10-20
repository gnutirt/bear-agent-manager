import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';

const line = (value: unknown) => JSON.stringify(value);

test('paid profile over its Vietnam-day budget is warned once and keeps new tasks/messages queued', async () => {
  const jobs: unknown[] = [];
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: async (job: unknown) => { jobs.push(job); return 0; } });
  try {
    await call('/api/rooms', { name: 'bear-agent-manager' });
    const transcript = path.join(dir, 'paid-profile.jsonl');
    fs.writeFileSync(transcript, [
      line({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'a paid run' } }),
      line({ type: 'assistant', timestamp: new Date().toISOString(), message: { usage: { input_tokens: 2_000 } } }),
    ].join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([{
      id: 'paid', label: 'Paid API', tier: 'paid', enabled: true, baseUrl: 'https://provider.example', auth: 'api-key', key: 'not-a-real-key',
      models: { read: ['model'], edit: ['model'] }, pricing: { inPerM: 1, outPerM: 1, cacheReadPerM: 1, budgetUsdPerDay: 0.001 },
    }]));
    const id = 'budget-session';
    await call('/api/sessions/register', { id, cwd, name: 'BudgetAgent', transcript });
    await call('/api/rooms/bear-agent-manager/join', { sessionId: id });
    const profile = { id: 'budget-agent', provider: 'claude-api', name: 'BudgetAgent', cwd, enabled: false, providerId: 'paid', model: 'model' };
    await call('/api/settings', { agents: { profiles: [profile] } }, { method: 'PUT' });
    await call('/api/settings', { agents: { profiles: [{ ...profile, enabled: true }] } }, { method: 'PUT' });

    const tasks = await call<any>('/api/rooms/bear-agent-manager/tasks', { title: 'work within budget', owner: 'BudgetAgent' });
    assert.equal(tasks.status, 'todo', 'a blocked task remains queued, not marked doing');
    const status = (await call<any[]>('/api/agent-profiles')).find((p) => p.id === 'budget-agent');
    assert.ok(status.budgetLimitedUntil > Date.now());
    await call('/api/rooms/bear-agent-manager/messages', { text: '@BudgetAgent please continue' });
    await call('/api/rooms/bear-agent-manager/messages', { text: '@BudgetAgent another request' });

    assert.equal(jobs.length, 0, 'the paid profile does not receive new runs');
    assert.equal(hub.store.pending(id).wake, true, 'messages stay available to room_read after the budget pause');
    const notices = hub.store.messages.filter((m) => m.kind === 'system' && m.text.includes('đã chạm ngân sách'));
    assert.equal(notices.length, 1, 'the profile is alerted only once that day');
    assert.match(notices[0].text, /^@you /);
    const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
    assert.equal(state.budgetAlerts['budget-agent'], new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date()));
  } finally { await hub.close(); }
});

test('crossing a paid profile budget does not interrupt its current run or switch providers', async () => {
  const jobs: any[] = [];
  let finish: (code: number) => void = () => {};
  let hubRef: any;
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub(undefined, undefined, {
    spawnAgent: (job: any) => {
      jobs.push(job);
      const transcript = path.join(dir, `${job.id}.jsonl`);
      fs.writeFileSync(transcript, [
        line({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'current run' } }),
        line({ type: 'assistant', timestamp: new Date().toISOString(), message: { usage: { input_tokens: 10 } } }),
      ].join('\n') + '\n');
      hubRef.store.session(job.id).transcript = transcript;
      hubRef.store.save();
      return new Promise<number>((resolve) => { finish = resolve; });
    },
  });
  hubRef = hub;
  try {
    await call('/api/rooms', { name: 'bear-agent-manager' });
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([{
      id: 'paid', label: 'Paid API', tier: 'paid', enabled: true, baseUrl: 'https://provider.example', auth: 'api-key', key: 'not-a-real-key',
      models: { read: ['model'], edit: ['model'] }, pricing: { inPerM: 1, outPerM: 1, cacheReadPerM: 1, budgetUsdPerDay: 0.001 },
    }]));
    const profile = { id: 'budget-agent', provider: 'claude-api', name: 'BudgetAgent', cwd, enabled: true, providerId: 'paid', model: 'model' };
    await call('/api/settings', { agents: { profiles: [profile] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5_000, 'initial run starts below the budget');
    fs.writeFileSync(hub.store.session(jobs[0].id).transcript!, [
      line({ type: 'user', timestamp: new Date().toISOString(), message: { content: 'current run' } }),
      line({ type: 'assistant', timestamp: new Date().toISOString(), message: { usage: { input_tokens: 2_000 } } }),
    ].join('\n') + '\n');

    await call('/api/rooms/bear-agent-manager/messages', { text: '@BudgetAgent more work' });
    assert.equal(jobs.length, 1, 'the over-budget request is not transferred or started as a second run');
    assert.equal(hub.store.session(jobs[0].id).status, 'busy', 'the active run remains untouched');
    assert.equal(hub.store.pending(jobs[0].id).wake, true, 'the new request stays queued');
    finish(0);
  } finally { await hub.close(); }
});
