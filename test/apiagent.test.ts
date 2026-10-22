import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { makeHub, until } from './helpers.ts';
import { apiEnv, apiPerm, claudeCliModel, compactEnv, findTranscript, GUARD_TOOL, isQuotaError, LEAN_TOOL, leanArgs, leanMcpConfig, pathGuard, projectSlug } from '../hub/apiagent.ts';
import { claudeArgs, killTree } from '../hub/revive.ts';
import { agentArgs } from '../hub/agents.ts';
import type { AgentProfile } from '../hub/settings.ts';
import type { Provider } from '../hub/providers.ts';

const prov = (o: Partial<Provider> = {}): Provider => ({ id: 'fake', label: 'Fake', tier: 'local', enabled: true, baseUrl: 'http://127.0.0.1:11434', auth: 'api-key', key: '', models: { read: ['m1'], edit: [] }, ...o });
const prof = (o: Partial<AgentProfile> = {}): AgentProfile => ({ id: 'loc', provider: 'claude-api', name: 'Local', cwd: os.tmpdir(), enabled: true, providerId: 'fake', ...o });
const own = { mode: 'bypass', allow: [], deny: [] };
const hasClaudeCli = spawnSync('claude', ['--version'], { shell: process.platform === 'win32', encoding: 'utf8', timeout: 10_000 }).status === 0;

async function fakeAnthropic(tools: { tool: string; input: object }[]) {
  const messages: any[] = [];
  let messageCalls = 0;
  const toolPrefix = crypto.randomUUID();
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      if (req.url?.includes('/count_tokens')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ input_tokens: 1 }));
        return;
      }
      messages.push(body);
      const toolCall = tools[messageCalls++];
      const toolId = `${toolPrefix}_${messageCalls}`;
      const message = toolCall
        ? { id: `msg_fake_${messageCalls}`, type: 'message', role: 'assistant', model: body.model || 'fake-model', content: [{ type: 'tool_use', id: toolId, name: toolCall.tool, input: toolCall.input }], stop_reason: 'tool_use', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } }
        : { id: `msg_fake_${messageCalls}`, type: 'message', role: 'assistant', model: body.model || 'fake-model', content: [{ type: 'text', text: 'Finished.' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };
      if (!body.stream) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(message));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
      const event = (name: string, data: object) => res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
      event('message_start', { type: 'message_start', message: { ...message, content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } });
      if (toolCall) {
        event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: toolId, name: toolCall.tool, input: {} } });
        event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(toolCall.input) } });
      } else {
        event('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
        event('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Finished.' } });
      }
      event('content_block_stop', { type: 'content_block_stop', index: 0 });
      event('message_delta', { type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: null }, usage: { output_tokens: 1 } });
      event('message_stop', { type: 'message_stop' });
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const close = () => new Promise<void>((resolve, reject) => {
    server.closeAllConnections();
    server.close((e) => e ? reject(e) : resolve());
  });
  return {
    url: `http://127.0.0.1:${address.port}`,
    messages,
    close,
  };
}

function shellArg(value: string) {
  return process.platform === 'win32' && /[\s()]/.test(value) ? `"${value}"` : value;
}

async function runApiAgentTool(args: string[], env: NodeJS.ProcessEnv, cwd: string, prompt: string) {
  const child = spawn('claude', args.map(shellArg), { cwd, env, shell: process.platform === 'win32', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8').on('data', (s: string) => { stdout = (stdout + s).slice(-20_000); });
  child.stderr.setEncoding('utf8').on('data', (s: string) => { stderr = (stderr + s).slice(-20_000); });
  child.stdin.end(prompt);
  const timer = setTimeout(() => killTree(child), 45_000);
  const code = await new Promise<number>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (status) => resolve(status ?? 1));
  }).finally(() => clearTimeout(timer));
  return { code, stdout, stderr };
}

test('apiEnv: endpoint + credential of the provider, a local host needs no real key, auth-token clears the api key', () => {
  const e = apiEnv(prof(), prov());
  assert.equal(e.ANTHROPIC_BASE_URL, 'http://127.0.0.1:11434');
  assert.equal(e.ANTHROPIC_API_KEY, 'ollama');
  assert.equal(e.ANTHROPIC_MODEL, 'm1');
  const t = apiEnv(prof({ model: 'x/y:1' }), prov({ tier: 'paid', auth: 'auth-token', key: 'sk-secret' }));
  assert.equal(t.ANTHROPIC_AUTH_TOKEN, 'sk-secret');
  assert.equal(t.ANTHROPIC_API_KEY, '');
  assert.equal(t.ANTHROPIC_MODEL, 'x/y:1');
  assert.throws(() => apiEnv(prof(), prov({ tier: 'free', key: '' })), /no key/);
  assert.throws(() => apiEnv(prof(), prov({ models: { read: [], edit: [] } })), /no model/);
});

test('#187: a claude-api chat carries the auto-compact window and idle threshold; an operator value wins', () => {
  const e = apiEnv(prof(), prov(), {});
  assert.equal(e.CLAUDE_CODE_AUTO_COMPACT_WINDOW, '300000', 'the hub compacts at 80% of this window');
  assert.equal(e.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS, '150000');
  const mine = apiEnv(prof(), prov(), { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '999000' });
  assert.equal(mine.CLAUDE_CODE_AUTO_COMPACT_WINDOW, undefined, 'a value the operator already set is never overridden');
  assert.equal(mine.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS, '150000', 'the other one is still filled in');
  assert.deepEqual(compactEnv({ CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS: '1' }), { CLAUDE_CODE_AUTO_COMPACT_WINDOW: '300000' });
});

test('claudeCliModel: provider-only model is omitted when the session has no provider profile', () => {
  const deepseek = prof({ model: 'deepseek-flash' });
  const deepseekProvider = prov({ models: { read: ['deepseek-flash'], edit: ['deepseek-flash'] } });
  assert.equal(claudeCliModel('deepseek-flash', [], [deepseekProvider]), undefined);
  assert.equal(claudeCliModel('deepseek-flash', [deepseek], []), undefined);
  assert.equal(claudeCliModel('claude-sonnet-5-5', [deepseek], [deepseekProvider]), 'claude-sonnet-5-5');
  assert.equal(claudeCliModel(undefined, [deepseek], [deepseekProvider]), undefined);
});

test('apiPerm: off this machine guarded (no Bash, no pre-allowed path tool); paid edits only with edit: true; local edits when the profile says so', () => {
  const remote = apiPerm(prof({ edit: true }), prov({ tier: 'free' }), own);
  assert.equal(remote.mode, 'default');
  assert.equal(remote.guarded, true);
  assert.deepEqual(remote.allow, [LEAN_TOOL], 'only the room tools are pre-allowed: every path tool asks pathGuard');
  for (const d of ['Edit', 'Write', 'Bash', 'Read(**/.env*)', 'Read(**/providers.json)']) assert.ok(remote.deny.includes(d), d);
  const paid = apiPerm(prof({ edit: true }), prov({ tier: 'paid' }), own);   // the owner's own paid account (DeepSeek) codes, never Bash, never secrets
  assert.ok(paid.guarded && !paid.deny.includes('Edit') && paid.deny.includes('Bash') && paid.deny.includes('Read(**/.env*)'));
  assert.ok(apiPerm(prof(), prov({ tier: 'paid' }), own).deny.includes('Edit'), 'paid without edit: true stays read-only');
  assert.deepEqual(apiPerm(prof({ edit: true }), prov(), own), { ...own, allow: [LEAN_TOOL] });
  const localRo = apiPerm(prof(), prov(), own);
  assert.ok(!localRo.guarded && localRo.deny.includes('Edit') && !localRo.deny.some((d) => d.startsWith('Read(')));
  assert.ok(!claudeArgs('s', remote).slice(claudeArgs('s', remote).indexOf('--allowedTools')).includes('Read'), 'guarded: Read is not pre-allowed');
  assert.deepEqual(leanArgs('f', true).slice(-2), ['--permission-prompt-tool', GUARD_TOOL]);
  assert.ok(leanMcpConfig('s', 'H', 1, 'S/mcp.ts', 'node', 'S/perm.ts').mcpServers.bearperm);
});

test('pathGuard (note [54]): path tools only inside the agent folder by realpath, never secrets, writes only when it may edit', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-guard-')), cwd = path.join(root, 'repo'), out = path.join(root, 'outside');
  fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(cwd, 'src', 'a.ts'), 'x');
  fs.writeFileSync(path.join(out, 'b.txt'), 'y');
  const ok = (tool: string, input: unknown, edit = true) => pathGuard(cwd, tool, input, edit).allow;
  assert.equal(ok('Read', { file_path: path.join(cwd, 'src', 'a.ts') }), true);
  assert.equal(ok('Read', { file_path: 'src/a.ts' }), true, 'relative to the folder');
  assert.equal(ok('Read', { file_path: path.join(out, 'b.txt') }), false, 'absolute path outside');
  assert.equal(ok('Read', { file_path: path.join(cwd, '..', 'outside', 'b.txt') }), false, '.. out of the folder');
  assert.equal(ok('Read', { file_path: path.join(cwd, '.env') }), false, 'secrets file');
  assert.equal(ok('Write', { file_path: path.join(cwd, 'src', 'new', 'c.ts') }), true, 'a new file inside');
  assert.equal(ok('Write', { file_path: path.join(cwd, 'src', 'c.ts') }, false), false, 'no edit: no write');
  assert.equal(ok('Edit', { file_path: path.join(out, 'b.txt') }), false);
  for (const file of ['.git/hooks/pre-commit', '.git/config', '.claude/settings.json', '.vscode/tasks.json', '.husky/pre-commit',
    '.github/workflows/ci.yml', '.gitattributes', '.gitmodules', '.gitconfig', '.npmrc', 'package.json']) {
    assert.equal(ok('Write', { file_path: file }), false, `${file} is protected from remote-agent writes`);
    assert.equal(ok('Edit', { file_path: file }), false, `${file} is protected from remote-agent edits`);
  }
  assert.equal(ok('Read', { file_path: '.git/config' }), true, 'repository metadata remains readable');
  assert.equal(ok('Grep', { pattern: 'x' }), true, 'no path = the folder');
  assert.equal(ok('Grep', { pattern: 'x', path: out }), false);
  assert.equal(ok('Glob', { pattern: '**/*.ts' }), true);
  assert.equal(ok('Glob', { pattern: out.split(path.sep).join('/') + '/**' }), false, 'absolute glob outside');
  assert.equal(ok('Glob', { pattern: '../outside/*' }), false);
  assert.equal(ok('Bash', { command: 'cat .env' }), false);
  assert.equal(ok('WebFetch', { url: 'https://x' }), false);
  try {   // a link out of the folder is refused (junction: no admin right needed on Windows)
    fs.symlinkSync(out, path.join(cwd, 'link'), 'junction');
    assert.equal(ok('Read', { file_path: path.join(cwd, 'link', 'b.txt') }), false, 'link to outside');
  } catch (e) { if ((e as any)?.code !== 'EPERM') throw e; }
});

test('claude-api real CLI integration: the hub permission prompt blocks outside Read/Edit even with defaultMode auto', {
  skip: !hasClaudeCli ? 'Claude CLI is not installed' : process.platform === 'win32' ? 'Windows may keep the CLI/MCP temp working directory open (EPERM)' : false,
}, async () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-api-guard-cli-'));
  const cwd = path.join(sandbox, 'workspace'), configDir = path.join(sandbox, 'claude-config');
  const outside = path.join(sandbox, 'outside.txt'), marker = 'OUTSIDE_SENTINEL';
  fs.mkdirSync(cwd); fs.mkdirSync(configDir);
  fs.writeFileSync(outside, `${marker}\n`);
  fs.writeFileSync(path.join(configDir, 'settings.json'), JSON.stringify({ permissions: { defaultMode: 'auto' } }));
  const profile = prof({ id: 'guard-test', name: `GuardTest-${crypto.randomBytes(4).toString('hex')}`, cwd, enabled: false, edit: true, model: 'fake-model' });
  const provider = prov({ id: 'fake', tier: 'paid', baseUrl: 'http://127.0.0.1:1', key: 'fake-test-key', models: { read: ['fake-model'], edit: ['fake-model'] } });
  const { hub, dir, call } = await makeHub();
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([provider]));
    await call('/api/settings', { agents: { profiles: [profile] } }, { method: 'PUT' });
    const port = Number(new URL(hub.url).port);
    const run = async (tools: { tool: 'Read' | 'Edit'; input: object }[], omitPermissionMode = false) => {
      const fake = await fakeAnthropic(tools);
      try {
        fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([{ ...provider, baseUrl: fake.url }]));
        const id = crypto.randomUUID();
        await call('/api/sessions/register', { id, cwd, name: profile.name });
        const mcpFile = path.join(sandbox, `${id}.mcp.json`);
        fs.writeFileSync(mcpFile, JSON.stringify(leanMcpConfig(id, dir, port, path.resolve('mcp/server.ts'), process.execPath, path.resolve('mcp/perm-server.ts'))));
        const perm = apiPerm(profile, provider, own);
        const args = [...agentArgs(id, perm, profile.model), ...leanArgs(mcpFile, perm.guarded)];
        assert.ok(args.includes('--bare') && args.includes('--strict-mcp-config') && args.includes('--permission-prompt-tool'));
        assert.equal(args[args.indexOf('--permission-mode') + 1], 'default');
        if (omitPermissionMode) args.splice(args.indexOf('--permission-mode'), 2);
        const localHome = path.join(sandbox, `${id}-home`);
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          ...apiEnv(profile, { ...provider, baseUrl: fake.url }),
          ANTHROPIC_BASE_URL: fake.url,
          ANTHROPIC_API_KEY: 'fake-test-key',
          ANTHROPIC_AUTH_TOKEN: '',
          CLAUDE_CONFIG_DIR: configDir,
          HOME: localHome,
          USERPROFILE: localHome,
          APPDATA: path.join(localHome, 'AppData', 'Roaming'),
          LOCALAPPDATA: path.join(localHome, 'AppData', 'Local'),
          BEAR_AGENT_HOME: dir,
          BEAR_AGENT_PORT: String(port),
        };
        delete env.ANTHROPIC_VERTEX_PROJECT_ID;
        delete env.ANTHROPIC_VERTEX_REGION;
        delete env.CLAUDE_CODE_USE_BEDROCK;
        delete env.CLAUDE_CODE_USE_VERTEX;
        const result = await runApiAgentTool(args, env, cwd, `Use the requested tools on ${outside}.`);
        assert.equal(result.code, 0, `${result.stderr}\n${result.stdout}`);
        return { ...result, id, requests: fake.messages };
      } finally { await fake.close(); }
    };

    const read = await run([{ tool: 'Read', input: { file_path: outside } }]);
    assert.match(fs.readFileSync(path.join(dir, 'revive.log'), 'utf8'), new RegExp(`guard ${profile.name} Read deny: .*outside the agent folder`));
    assert.ok(!JSON.stringify(read.requests).includes(marker), 'the outside file contents never reach the provider');

    fs.writeFileSync(path.join(dir, 'revive.log'), '');
    const noMode = await run([{ tool: 'Read', input: { file_path: outside } }], true);
    assert.ok(JSON.stringify(noMode.requests).includes(marker), 'negative control: omitting --permission-mode inherits auto and reads outside cwd');

    fs.writeFileSync(path.join(dir, 'revive.log'), '');
    const edit = await call<any>('/api/permissions/ask', {
      session: read.id,
      tool: 'Edit',
      input: { file_path: outside, old_string: marker, new_string: 'CHANGED_OUTSIDE' },
    });
    assert.equal(edit.allow, false);
    assert.match(edit.message, /outside the agent folder/);
    assert.match(fs.readFileSync(path.join(dir, 'revive.log'), 'utf8'), new RegExp(`guard ${profile.name} Edit deny: .*outside the agent folder`));
    assert.equal(fs.readFileSync(outside, 'utf8'), `${marker}\n`, 'the outside file stays unchanged');
  } finally {
    await hub.close();
    fs.rmSync(sandbox, { recursive: true, force: true, maxRetries: 8, retryDelay: 100 });
  }
});

test('leanMcpConfig: one stdio server named room that knows the session, the hub home and port', () => {
  const c = leanMcpConfig('sid-1', 'H', 4242, 'S/mcp.ts', 'node');
  assert.deepEqual(c.mcpServers.room, { command: 'node', args: ['--no-warnings', 'S/mcp.ts'], env: { CLAUDE_CODE_SESSION_ID: 'sid-1', BEAR_AGENT_HOME: 'H', BEAR_AGENT_PORT: '4242' } });
});

test('isQuotaError sees the provider quota / rate-limit wording', () => {
  for (const t of ['HTTP 429 Too Many Requests', 'insufficient balance', 'You exceeded your quota', '额度不足']) assert.equal(isQuotaError(t), true, t);
  assert.equal(isQuotaError('exit 1: connection refused'), false);
});

test('claude-api profile: starts with the provider env and a read-only perm, pauses on quota, retry clears it, off stops it', async () => {
  const jobs: any[] = [];
  let outcome = 1;   // exit code the fake agent ends with
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: async (job: any) => { jobs.push(job); job.onOutput?.('API Error: 429 rate limit\n'); return outcome; } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'free', key: 'sk-top-secret-123' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    fs.writeFileSync(path.join(dir, 'revive.log'), 'unrelated concurrent run: no quota\n');
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'the agent starts');
    assert.equal(jobs[0].env.ANTHROPIC_API_KEY, 'sk-top-secret-123');
    assert.equal(jobs[0].perm.mode, 'default');
    assert.deepEqual(jobs[0].args.slice(0, 3), leanArgs('x').slice(0, 3));   // --bare --strict-mcp-config --mcp-config <file>
    const mcp = JSON.parse(fs.readFileSync(jobs[0].args[3], 'utf8'));
    assert.equal(mcp.mcpServers.room.env.CLAUDE_CODE_SESSION_ID, jobs[0].id);
    assert.ok(!JSON.stringify(mcp).includes('sk-top-secret-123'), 'the key is only in the process environment');
    assert.ok(jobs[0].perm.deny.includes('Edit'));
    const st = await until(async () => { const s = (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc'); return s?.limited ? s : null; }, 5000, 'paused on quota');
    assert.equal(st.state, 'error');
    assert.equal(st.provider, 'claude-api');
    assert.equal(st.auth, 'ok');
    assert.ok(!JSON.stringify(hub.store.state).includes('sk-top-secret-123'), 'the key never reaches the room');
    assert.ok(!JSON.stringify(st).includes('sk-top-secret-123'));
    // retry: pause cleared, a fresh start (the first session never produced a chat)
    outcome = 0;
    const r = await call<any>('/api/agent-profiles/loc/retry', {});
    assert.equal(r.done, true);
    await until(() => jobs.length === 2, 5000, 'second start');
    await assert.rejects(call('/api/agent-profiles/nope/retry', {}), (e: any) => e.status === 404);
    await assert.rejects(call('/api/agent-profiles/loc', { on: 'yes', confirm: true }), (e: any) => e.status === 400);
    const off = await call<any>('/api/agent-profiles/loc', { on: false, confirm: true });
    assert.equal(off.state, 'off');
    assert.equal((await call<any>('/api/settings')).agents.profiles[0].enabled, false);
  } finally { await hub.close(); }
});

test('claude-api profile switched off while it runs: the stopped claude exit code is not reported as a failure', async () => {
  let finish: (code: number) => void = () => {};
  const jobs: any[] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: (job: any) => { jobs.push(job); return new Promise<number>((r) => { finish = r; }); } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'local' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'started');
    await call('/api/agent-profiles/loc', { on: false, confirm: true });
    finish(1);   // what a killed claude exits with
    await new Promise((r) => setTimeout(r, 200));
    const st = (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc');
    assert.equal(st.error, undefined);
    assert.ok(!JSON.stringify(hub.store.state.rooms).includes('could not'), 'no failure line in the room');
  } finally { await hub.close(); }
});

test('projectSlug / findTranscript: Claude Code folder naming, both drive-letter cases, and a chat the sweeper moved out is moved back', () => {
  assert.equal(projectSlug('D:\\Antigravity\\bear-agent-manager'), 'D--Antigravity-bear-agent-manager');
  assert.equal(projectSlug('d:\\Antigravity\\mywork'), 'd--Antigravity-mywork');
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-find-'));
  const moved = path.join(cfg, 'moved');
  const roomChat = (d: string) => path.join(moved, path.basename(d));
  assert.equal(findTranscript('D:\\a\\b', 'id1', [cfg], roomChat), undefined);
  const lower = path.join(cfg, 'projects', 'd--a-b');
  fs.mkdirSync(lower, { recursive: true });
  fs.writeFileSync(path.join(lower, 'id1.jsonl'), '{}\n');
  assert.equal(findTranscript('D:\\a\\b', 'id1', [cfg], roomChat)?.toLowerCase(), path.join(lower, 'id1.jsonl').toLowerCase(), 'the lower-case drive folder is found for D: (Windows folders ignore case)');
  fs.mkdirSync(path.join(moved, 'D--a-b'), { recursive: true });
  fs.writeFileSync(path.join(moved, 'D--a-b', 'id2.jsonl'), '{}\n');
  const back = findTranscript('D:\\a\\b', 'id2', [cfg], roomChat);
  assert.equal(back?.toLowerCase(), path.join(cfg, 'projects', 'D--a-b', 'id2.jsonl').toLowerCase());
  assert.ok(fs.existsSync(back!) && !fs.existsSync(path.join(moved, 'D--a-b', 'id2.jsonl')), 'moved back out of room_chat');
});

test('claude-api profile: a second @ wakes it with the provider env even with autoRevive off, and the sweeper leaves its chat alone', async () => {
  const jobs: any[] = [], revived: any[] = [];
  const cwd = fs.realpathSync(os.tmpdir());
  const { hub, dir, call } = await makeHub(undefined, (job) => { revived.push(job); }, {
    autoRevive: false,
    spawnAgent: async (job: any) => {   // the first run: the (fake) claude saves its chat where Claude Code would
      jobs.push(job);
      const d = path.join(dir0.dir, '.claude', 'projects', projectSlug(cwd));
      fs.mkdirSync(d, { recursive: true });
      const line = (o: object) => JSON.stringify(o);
      fs.writeFileSync(path.join(d, `${job.id}.jsonl`), [line({ type: 'user', message: { content: 'hi' } }), line({ type: 'assistant', message: { model: 'minimax/minimax-m3.1-flash:free', content: [{ type: 'text', text: 'ok' }] } })].join('\n') + '\n');
      return 0;
    },
  });
  const dir0 = { dir };
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'local' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof({ cwd })] } }, { method: 'PUT' });
    await until(() => jobs.length === 1, 5000, 'first run');
    const sid = jobs[0].id;
    await until(async () => (await call<any>('/api/sessions/' + sid)).session.status === 'offline', 5000, 'first run ended');
    // the sweeper would file this chat away (its model is not a Claude one): it must not
    const f = path.join(dir, '.claude', 'projects', projectSlug(cwd), `${sid}.jsonl`);
    const old = new Date(Date.now() - 3_600_000);
    fs.utimesSync(f, old, old);
    const other = path.join(path.dirname(f), 'other-chat.jsonl');
    fs.copyFileSync(f, other);
    fs.utimesSync(other, old, old);
    const swept = await call<any[]>('/api/room-chat/sweep', { apply: false });
    assert.ok(!swept.some((s) => s.file === `${sid}.jsonl`), 'the provider agent chat is not swept');
    assert.ok(swept.some((s) => s.file === 'other-chat.jsonl'), 'control: an unrelated worker chat would be');
    await call('/api/rooms/bear-agent-manager/messages', { text: '@Local second question' });
    await until(() => revived.length === 1, 5000, 'second wake');
    assert.equal(revived[0].id, sid);
    assert.equal(revived[0].env.ANTHROPIC_BASE_URL, 'http://127.0.0.1:11434');
    assert.equal(revived[0].args[0], '--bare');
  } finally { await hub.close(); }
});

test('claude-api profile with a provider that has no key stays an error and never spawns', async () => {
  const jobs: any[] = [];
  const { hub, dir, call } = await makeHub(undefined, undefined, { spawnAgent: async (job: any) => { jobs.push(job); return 0; } });
  try {
    fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([prov({ id: 'fake', tier: 'free', key: '' })]));
    await call('/api/rooms', { name: 'bear-agent-manager' });
    await call('/api/settings', { agents: { profiles: [prof()] } }, { method: 'PUT' });
    const st = await until(async () => (await call<any[]>('/api/agent-profiles')).find((x) => x.id === 'loc' && x.error), 5000, 'error shown');
    assert.match(st.error, /no key/);
    assert.equal(st.auth, 'no');
    assert.equal(jobs.length, 0);
  } finally { await hub.close(); }
});
