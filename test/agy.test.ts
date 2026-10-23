import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import { PassThrough } from 'node:stream';
import { AGY_DEFAULT_MODEL, AGY_TURN_TIMEOUT_MS, agyArgs, agyInput, findAgy, parseAgyLine, runAgyTurn } from '../hub/agy.ts';

type Call = { exe: string; args: string[]; stdin: string; child: any };

/** A spawn returning a fake child; `behave` runs once the prompt was written and stdin closed, as a real agy would. */
function fakeSpawn(behave: (call: Call) => void) {
  const calls: Call[] = [];
  const spawn = ((exe: string, args: string[]) => {
    const child: any = new EventEmitter();
    child.pid = 4242;
    child.killed = false;
    child.kill = () => { child.killed = true; };
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    const call: Call = { exe, args, stdin: '', child };
    let buf = '';
    child.stdin = {
      on() { return child.stdin; },
      write(s: string) { buf += s; return true; },
      end() { call.stdin = buf; setTimeout(() => behave(call), 0); },
    };
    calls.push(call);
    return child;
  }) as any;
  return { calls, spawn };
}

const say = (child: any, o: object) => child.stdout.write(JSON.stringify(o) + '\n');
const INIT = { event: 'init', conversation_id: 'c-1', init: { model: 'gemini-3.8-flash-medium', cwd: '/w', tools: [] } };
const result = (o: object) => ({ event: 'result', result: o });

test('#207 findAgy: the setting first, then PATH, then the installer folder; it lists what it tried', () => {
  const win = findAgy('C:\\nope\\agy.exe', {
    platform: 'win32', pathEnv: 'C:\\bin;"C:\\Program Files\\agy"', localAppData: 'C:\\L',
    exists: (p) => p === 'C:\\L\\agy\\bin\\agy.exe',
  });
  assert.equal(win.exe, 'C:\\L\\agy\\bin\\agy.exe');
  assert.deepEqual(win.tried, ['C:\\nope\\agy.exe', 'C:\\bin\\agy.exe', 'C:\\Program Files\\agy\\agy.exe', 'C:\\L\\agy\\bin\\agy.exe']);
  // the setting wins when it exists: nothing else is looked at
  const cfg = findAgy('C:\\custom\\agy.exe', { platform: 'win32', pathEnv: 'C:\\bin', localAppData: 'C:\\L', exists: (p) => p === 'C:\\custom\\agy.exe' });
  assert.equal(cfg.exe, 'C:\\custom\\agy.exe');
  assert.deepEqual(cfg.tried, ['C:\\custom\\agy.exe']);
  const linux = findAgy('', { platform: 'linux', home: '/h', pathEnv: '/usr/bin', exists: (p) => p === '/h/.local/bin/agy' });
  assert.equal(linux.exe, '/h/.local/bin/agy');
  assert.deepEqual(linux.tried, ['/usr/bin/agy', '/h/.local/bin/agy']);
  const none = findAgy('', { platform: 'linux', home: '/h', pathEnv: '', exists: () => false });
  assert.equal(none.exe, null);
  assert.deepEqual(none.tried, ['/h/.local/bin/agy'], 'a missing agy still names the path it looked for');
});

test('#207 agyArgs: stream-json both ways, --print= first, mode from the BAM permission rule, optional effort and conversation', () => {
  assert.deepEqual(agyArgs({ model: 'm', bypass: true }),
    ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print=', '--mode', 'accept-edits', '--dangerously-skip-permissions', '--model', 'm']);
  const plan = agyArgs({ model: 'm', bypass: false });
  assert.deepEqual(plan, ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print=', '--mode', 'plan', '--model', 'm']);
  assert.ok(!plan.includes('--dangerously-skip-permissions'));
  const full = agyArgs({ model: 'm', effort: 'high', bypass: false, conversation: 'c1' });
  assert.deepEqual(full.slice(-4), ['--effort', 'high', '--conversation', 'c1'], 'effort and conversation come last, in that order');
  // #208/#209: the profile default is the user's own agy default, and a turn is given ten minutes, not thirty
  const noModel = agyArgs({ bypass: false });
  assert.equal(noModel[noModel.indexOf('--model') + 1], AGY_DEFAULT_MODEL);
  assert.equal(AGY_DEFAULT_MODEL, 'gemini-4-argon-medium');
  assert.equal(AGY_TURN_TIMEOUT_MS, 10 * 60_000);
});

test('#207 agyInput: one NDJSON line with a text block', () => {
  const line = agyInput('hi');
  assert.ok(line.endsWith('\n'));
  assert.deepEqual(JSON.parse(line), { event: 'user', message: { role: 'user', content: [{ type: 'text', text: 'hi' }] } });
});

test('#207 parseAgyLine: init and result, everything else ignored', () => {
  assert.deepEqual(parseAgyLine(JSON.stringify(INIT)), { kind: 'init', conversation: 'c-1' });
  const ok = parseAgyLine(JSON.stringify(result({ conversation_id: 'c-1', status: 'SUCCESS', response: 'PONG', duration_seconds: 9.6, num_turns: 1, usage: { input_tokens: 123, output_tokens: 7, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 130 } })));
  assert.deepEqual(ok, { kind: 'result', ok: true, response: 'PONG', error: '', conversation: 'c-1', usage: { in: 123, out: 7 } });
  const bad = parseAgyLine(JSON.stringify(result({ status: 'ERROR', error: 'failed to decode stream input: invalid character' })));
  assert.equal(bad?.kind, 'result');
  assert.equal((bad as any).ok, false);
  assert.match((bad as any).error, /failed to decode stream input/);
  assert.equal(parseAgyLine(JSON.stringify({ event: 'step_update', step: { index: 1 } })), null);
  assert.equal(parseAgyLine('warning: x'), null);
  assert.equal(parseAgyLine(''), null);
});

test('#207 runAgyTurn: the prompt goes on stdin, never in argv, and the result is returned', async () => {
  const text = '@agy đọc hub/agy.ts rồi tóm tắt 3 dòng';
  const { calls, spawn } = fakeSpawn((call) => {
    say(call.child, INIT);
    call.child.stdout.write('warning: unrelated line\n');
    say(call.child, result({ conversation_id: 'c-1', status: 'SUCCESS', response: 'PONG', usage: { input_tokens: 3, output_tokens: 1 } }));
    setTimeout(() => call.child.emit('exit', 0), 0);
  });
  const turn = await runAgyTurn('agy', agyArgs({ model: 'm', bypass: false }), os.tmpdir(), text, { spawn, timeoutMs: 5000 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].exe, 'agy');
  assert.equal(calls[0].stdin, agyInput(text));
  assert.ok(!calls[0].args.some((a) => a.includes(text)), 'user text never rides on the command line');
  assert.equal(turn.ok, true);
  assert.equal(turn.conversation, 'c-1');
  assert.equal(turn.response, 'PONG');
  assert.deepEqual(turn.usage, { in: 3, out: 1 });
  assert.equal(turn.code, 0);
});

test('#207 runAgyTurn: a turn that never answers is killed and reported, never left hanging', async () => {
  const { calls, spawn } = fakeSpawn(() => { /* a permission prompt it never gets past: no output, no exit */ });
  const t0 = Date.now();
  const turn = await runAgyTurn('agy', agyArgs({ model: 'm', bypass: false }), os.tmpdir(), 'edit a file', { spawn, timeoutMs: 50 });
  assert.equal(turn.ok, false);
  assert.match(turn.error, /timeout/);
  assert.equal(calls[0].child.killed, true);
  assert.ok(Date.now() - t0 < 5000);
});

test('#207 spec:41: accept-edits never runs without the skip flag, and a held prompt still dies at the timeout', async () => {
  // The question the spec could not answer on the machine: with `--mode accept-edits` and no
  // `--dangerously-skip-permissions`, does print mode refuse or wait? The hub never builds that shape (bypass is the
  // only source of accept-edits and always brings the flag), so a refusal and a wait cannot silently change behaviour.
  for (const bypass of [true, false]) {
    const args = agyArgs({ model: 'm', bypass });
    const mode = args[args.indexOf('--mode') + 1];
    assert.equal(args.includes('--dangerously-skip-permissions'), mode === 'accept-edits', `mode ${mode} must carry the flag exactly when it can edit`);
  }
  // And if agy does wait for an answer nobody can give (print mode has no one to ask), the turn is killed by its
  // timeout instead of holding the room: that is the behaviour this test locks down.
  const { calls, spawn } = fakeSpawn(() => { /* waits forever */ });
  const turn = await runAgyTurn('agy', ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print=', '--mode', 'accept-edits'], os.tmpdir(), 'sửa README', { spawn, timeoutMs: 50 });
  assert.equal(turn.ok, false);
  assert.match(turn.error, /timeout/);
  assert.equal(calls[0].child.killed, true);
});

test('#207 runAgyTurn: a spawn error is a failed turn, not a crash', async () => {
  const spawn = (() => { throw new Error('ENOENT agy'); }) as any;
  const turn = await runAgyTurn('agy', [], os.tmpdir(), 'hi', { spawn, timeoutMs: 1000 });
  assert.equal(turn.ok, false);
  assert.match(turn.error, /ENOENT/);
});

// Opt-in: it spends the user's Google quota, so the suite never runs it unless someone asks (AGY_LIVE=1).
const liveExe = process.env.AGY_LIVE === '1' ? findAgy('').exe : null;
test('#207 live agy turn (AGY_LIVE=1)', { skip: !liveExe && 'set AGY_LIVE=1 to run a real agy turn' }, async () => {
  const exe = liveExe!;
  const first = await runAgyTurn(exe, agyArgs({ model: 'gemini-3.8-flash-low', bypass: false }), os.tmpdir(), 'Reply with exactly one word: PONG', { timeoutMs: 120_000 });
  assert.equal(first.ok, true, first.error);
  assert.match(first.response, /PONG/);
  const second = await runAgyTurn(exe, agyArgs({ model: 'gemini-3.8-flash-low', bypass: false, conversation: first.conversation }), os.tmpdir(), 'What word did you just reply? One word.', { timeoutMs: 120_000 });
  assert.equal(second.ok, true, second.error);
  assert.match(second.response, /PONG/i, 'the conversation id kept the context');
});
