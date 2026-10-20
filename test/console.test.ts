import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';
import { ToolConsole, describeInput, describeOutput } from '../hub/console.ts';

test('#104 console: describes a tool call and scrubs credentials', () => {
  assert.equal(describeInput({ command: 'ls -la', description: 'x' }), 'ls -la');
  assert.equal(describeInput({ file_path: 'src/a.ts' }), 'src/a.ts');
  assert.ok(!describeInput({ command: 'curl -H "Authorization: Bearer abcdefghijklmnop1234" x' }).includes('abcdefghijklmnop1234'));
  assert.equal(describeOutput({ stdout: 'out', stderr: 'err' }).text, 'out\nerr');
  assert.equal(describeOutput({ content: [{ type: 'text', text: 'hi' }] }).text, 'hi');
  assert.equal(describeOutput({ stdout: 'x', is_error: true }).error, true);
  assert.ok(describeOutput('y'.repeat(9000)).text.length < 4100, 'long output is cut');
  assert.ok(!describeOutput('token=sk-abcdefghijklmnopqrstuv').text.includes('sk-abcdefghijklmnopqrstuv'));
});

test('#104 console: results pair with their call, by key or by order, and the list is capped', () => {
  const seen: number[] = [];
  const c = new ToolConsole((_s, e) => seen.push(e.id));
  c.start('s', 'Bash', { command: 'a' }, 'k1'); c.start('s', 'Bash', { command: 'b' }, 'k2');
  c.finish('s', '', 'B-out', 'k2');
  assert.deepEqual(c.list('s').map((e) => [e.input, e.done, e.output]), [['a', false, undefined], ['b', true, 'B-out']]);
  c.finish('s', 'Bash', 'A-out');   // a hook result has no key: the oldest unfinished call of that tool
  assert.equal(c.list('s')[0].output, 'A-out');
  for (let i = 0; i < 150; i++) c.start('s', 'Read', { file_path: 'f' + i });
  assert.equal(c.list('s').length, 100);
  assert.equal(c.list('other').length, 0);
});

test('#104 console: the pre/post tool hooks fill GET /api/sessions/:id/console', async () => {
  const { hub, call } = await makeHub();
  try {
    await call('/api/sessions/register', { id: 'c1', cwd: process.cwd() });
    const hook = (ev: string, body: object) => fetch(`${hub.url}/hooks/${ev}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: 'c1', ...body }) });
    await hook('pre-tool', { tool_name: 'Bash', tool_input: { command: 'npm test' } });
    let r = await call<any>('/api/sessions/c1/console');
    assert.deepEqual(r.entries.map((e: any) => [e.tool, e.input, e.done]), [['Bash', 'npm test', false]]);
    await hook('post-tool', { tool_name: 'Bash', tool_response: { stdout: 'pass 3', stderr: '' } });
    r = await call<any>('/api/sessions/c1/console');
    assert.deepEqual(r.entries.map((e: any) => [e.output, e.done]), [['pass 3', true]]);
    await assert.rejects(call('/api/sessions/nope/console'), (e: any) => e.status === 404);
  } finally { await hub.close(); }
});

test('#104/#69 UI: console button + read-only list, and the file view edits, saves and commits', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['id="consoleBtn"', "addEventListener('console'", '/console`', 'id="conBody"', 'function openConsole', "t('console.note')"]) assert.ok(html.includes(s), `console UI: missing ${s}`);
    const con = html.slice(html.indexOf('function openConsole'), html.indexOf("$('consoleBtn').onclick"));
    assert.ok(!/<input|<textarea|method:\s*'POST'/.test(con), 'the console has no input and sends nothing');
    for (const s of ['function editFile', 'function commitBox', "'PUT'", '/commit`', 'KeyMod.CtrlCmd', 'files.conflict.ask', '/vendor/monaco/']) assert.ok(html.includes(s), `file editor: missing ${s}`);
    assert.equal((await fetch(hub.url + '/vendor/monaco/vs/loader.js')).status, 200);
    assert.equal((await fetch(hub.url + '/vendor/monaco/vs/..%2f..%2fpackage.json')).status, 404);
  } finally { await hub.close(); }
});

test('#111 hidden buttons stay hidden: .btn display must not beat the hidden attribute', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    assert.ok(/\.btn\[hidden\][^{]*\{display:none!important\}/.test(html), 'a rule that keeps .btn[hidden] hidden');
    assert.ok(html.indexOf('.btn[hidden]') < html.indexOf('.btn{display:inline-flex;'), 'it comes before the .btn rule');
  } finally { await hub.close(); }
});
