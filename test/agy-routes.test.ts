import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import type { AgyTurn } from '../hub/agy.ts';

test('GET /api/agy/check requires auth and reports executable, parsed models, failures, timeout, and missing binary', async () => {
  const runs: { exe: string; args: string[] }[] = [];
  let result = { code: 0, stdout: 'Fetching available models...\ngemini-4-argon-medium\tArgon Medium\nother\tOther model\n', stderr: '' };
  let delayed: Promise<typeof result> | undefined;
  const h = await makeHub(undefined, undefined, {
    agyFind: (p: string) => p === 'missing' ? { exe: null, tried: ['missing'] } : { exe: 'agy-test', tried: ['agy-test'] },
    agyRun: async (exe: string, args: string[]) => {
      runs.push({ exe, args });
      return delayed ?? result;
    },
    agyTimeoutMs: 10,
  });
  try {
    assert.equal((await fetch(`${h.hub.url}/api/agy/check`)).status, 401);
    const check = await h.call<any>('/api/agy/check?path=custom-agy');
    assert.deepEqual(check, {
      found: true, exe: 'agy-test', tried: ['agy-test'], loggedIn: true,
      models: [{ id: 'gemini-4-argon-medium', label: 'Argon Medium' }, { id: 'other', label: 'Other model' }],
    });
    assert.deepEqual(runs.at(-1), { exe: 'agy-test', args: ['models'] });

    result = { code: 1, stdout: 'Fetching available models...\n', stderr: 'not signed in' };
    const failed = await h.call<any>('/api/agy/check');
    assert.equal(failed.loggedIn, false);
    assert.deepEqual(failed.models, []);
    assert.equal(failed.error, 'not signed in');

    result = { code: 0, stdout: 'Fetching available models...\n', stderr: '' };
    const noModels = await h.call<any>('/api/agy/check');
    assert.equal(noModels.loggedIn, false);
    assert.equal(noModels.error, 'agy returned no models');

    const missing = await h.call<any>('/api/agy/check?path=missing');
    assert.deepEqual(missing, { found: false, exe: null, tried: ['missing'], loggedIn: false, models: [] });

    delayed = new Promise(() => {});
    const timeout = await h.call<any>('/api/agy/check');
    assert.equal(timeout.loggedIn, false);
    assert.match(timeout.error, /timed out after 10ms/);
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
  }
});

test('enabled Agy profiles join the hub lifecycle and honor apiAgents.allTools plus per-agent mode', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-profile-'));
  const calls: { args: string[]; prompt: string }[] = [];
  const turn: AgyTurn = { ok: true, response: 'agy reply', error: '', conversation: 'conversation-1', usage: { in: 3, out: 4 }, code: 0 };
  const h = await makeHub(undefined, undefined, {
    agyFind: (configured: string) => ({ exe: configured || 'agy-test', tried: [configured || 'agy-test'] }),
    agyTurn: async (_exe: string, args: string[], _cwd: string, prompt: string) => {
      calls.push({ args, prompt });
      return { ...turn, conversation: `conversation-${calls.length}` };
    },
  });
  try {
    await h.call('/api/settings', {
      agents: { profiles: [{ id: 'agy-main', provider: 'agy', name: 'AgyMain', cwd: dir, enabled: true, path: 'agy-test', model: 'gemini-4-argon-medium' }] },
    }, { method: 'PUT' });

    const member = await until(() => h.hub.store.members('bear-agent-manager').find((s) => s.name === 'AgyMain'), 5_000, 'Agy profile registered in the hub');
    const profiles = await h.call<any[]>('/api/agent-profiles');
    assert.equal(profiles.find((p) => p.id === 'agy-main')?.provider, 'agy');
    assert.equal(profiles.find((p) => p.id === 'agy-main')?.enabled, true);

    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@AgyMain full access' });
    await until(() => calls.length === 1, 5_000, 'Agy full-access turn');
    assert.deepEqual(calls[0].args.slice(calls[0].args.indexOf('--mode'), calls[0].args.indexOf('--mode') + 2), ['--mode', 'accept-edits']);
    assert.ok(calls[0].args.includes('--dangerously-skip-permissions'));

    await h.call('/api/settings', { apiAgents: { allTools: false } }, { method: 'PUT' });
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@AgyMain plan mode' });
    await until(() => calls.length === 2, 5_000, 'Agy plan-mode turn');
    assert.deepEqual(calls[1].args.slice(calls[1].args.indexOf('--mode'), calls[1].args.indexOf('--mode') + 2), ['--mode', 'plan']);
    assert.ok(!calls[1].args.includes('--dangerously-skip-permissions'));

    await h.call('/api/settings', {
      apiAgents: { allTools: true },
      permissions: { perAgent: { agymain: { mode: 'plan' } } },
    }, { method: 'PUT' });
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@AgyMain per-agent plan override' });
    await until(() => calls.length === 3, 5_000, 'Agy per-agent permission override');
    assert.deepEqual(calls[2].args.slice(calls[2].args.indexOf('--mode'), calls[2].args.indexOf('--mode') + 2), ['--mode', 'plan']);
    assert.ok(!calls[2].args.includes('--dangerously-skip-permissions'));

    await h.call('/api/settings', {
      apiAgents: { allTools: false },
      permissions: { perAgent: { agymain: { mode: 'bypass' } } },
    }, { method: 'PUT' });
    await h.call('/api/rooms/bear-agent-manager/messages', { text: '@AgyMain per-agent full-access override' });
    await until(() => calls.length === 4, 5_000, 'Agy per-agent full-access override');
    assert.deepEqual(calls[3].args.slice(calls[3].args.indexOf('--mode'), calls[3].args.indexOf('--mode') + 2), ['--mode', 'accept-edits']);
    assert.ok(calls[3].args.includes('--dangerously-skip-permissions'));
    assert.match(calls[0].prompt, /full access/);
    assert.ok(member.id);

    const stopped = await h.call<any>('/api/copilot/profiles/agy-main', { confirm: true, on: false });
    assert.equal(stopped.done, true);
    assert.equal(stopped.state, 'off');
  } finally {
    await h.hub.close();
    fs.rmSync(h.dir, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
