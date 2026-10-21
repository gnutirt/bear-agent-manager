import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pluginCopies, versionInfo } from '../hub/version.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHIM = path.join(ROOT, 'hooks', 'shim.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-shim-'));

/** A fake plugin tree whose three entry files print who they are. */
function tree(label: string, name = 'bear-agent-manager') {
  const d = tmp();
  fs.mkdirSync(path.join(d, '.claude-plugin'), { recursive: true });
  fs.mkdirSync(path.join(d, 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(d, 'mcp'), { recursive: true });
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name }));
  fs.writeFileSync(path.join(d, '.claude-plugin', 'plugin.json'), JSON.stringify({ name }));
  for (const f of ['hooks/session-start.ts', 'hooks/waiter.ts', 'mcp/server.ts']) fs.writeFileSync(path.join(d, f), `console.log(${JSON.stringify(label + ':' + f)});\n`);
  return d;
}
/** The plugin copy: only the shim, with the fake files next to it. */
function copy(label: string) {
  const d = tree(label);
  fs.copyFileSync(SHIM, path.join(d, 'hooks', 'shim.mjs'));
  return d;
}
const run = (copyDir: string, home: string, target: string) =>
  execFileSync(process.execPath, ['--no-warnings', path.join(copyDir, 'hooks', 'shim.mjs'), target], { env: { ...process.env, BEAR_AGENT_HOME: home }, encoding: 'utf8' }).trim();

test('shim runs the source checkout named in <home>/source, else the copy next to it', () => {
  const home = tmp(), plugin = copy('copy'), source = tree('source');
  assert.equal(run(plugin, home, 'hooks/waiter.ts'), 'copy:hooks/waiter.ts');            // no source file yet
  fs.writeFileSync(path.join(home, 'source'), source + '\n');
  assert.equal(run(plugin, home, 'hooks/waiter.ts'), 'source:hooks/waiter.ts');
  assert.equal(run(plugin, home, 'hooks/session-start.ts'), 'source:hooks/session-start.ts');
  assert.equal(run(plugin, home, 'mcp/server.ts'), 'source:mcp/server.ts');
});

test('shim refuses a source that is relative, missing, another project, lacks the file, or is a link elsewhere', () => {
  const home = tmp(), plugin = copy('copy');
  const say = (text: string) => fs.writeFileSync(path.join(home, 'source'), text);
  const expectCopy = (why: string) => assert.equal(run(plugin, home, 'hooks/waiter.ts'), 'copy:hooks/waiter.ts', why);
  say('relative/dir'); expectCopy('relative path');
  say(path.join(tmp(), 'nope')); expectCopy('missing folder');
  say(tree('other', 'some-other-project')); expectCopy('another project');
  const noFile = tree('nofile'); fs.rmSync(path.join(noFile, 'hooks', 'waiter.ts')); say(noFile); expectCopy('the requested file is absent');
  const real = tree('real'), link = path.join(tmp(), 'link');
  try { fs.symlinkSync(real, link, 'junction'); say(link); expectCopy('a link to somewhere else'); } catch { /* cannot create links here */ }
  say(real); assert.equal(run(plugin, home, 'hooks/waiter.ts'), 'real:hooks/waiter.ts');   // the same folder named directly works
});

test('shim only runs the three known entry files', () => {
  const home = tmp(), plugin = copy('copy');
  assert.throws(() => run(plugin, home, 'hub/server.ts'), /unknown target/);
  assert.throws(() => run(plugin, home, '../etc/passwd'), /unknown target/);
});

test('hooks.json and plugin.json start everything through the shim', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(ROOT, 'hooks', 'hooks.json'), 'utf8')).hooks;
  const cmds = Object.values<any>(hooks).flatMap((list) => list.flatMap((g: any) => g.hooks)).filter((h: any) => h.type === 'command');
  assert.ok(cmds.length >= 2);
  for (const h of cmds) assert.equal(h.args[1], '${CLAUDE_PLUGIN_ROOT}/hooks/shim.mjs', JSON.stringify(h.args));
  assert.deepEqual(cmds.map((h: any) => h.args[2]).sort(), ['hooks/session-start.ts', 'hooks/waiter.ts', 'hooks/waiter.ts']);
  assert.ok(hooks.StopFailure[0].hooks.some((h: any) => h.type === 'command' && h.asyncRewake));
  // no hook registered twice (the same event+matcher+target)
  const seen = new Set<string>();
  for (const [ev, list] of Object.entries<any>(hooks)) for (const g of list) for (const h of g.hooks) {
    const key = `${ev}|${g.matcher ?? ''}|${h.url ?? h.args?.[2]}`;
    assert.ok(!seen.has(key), `duplicate hook ${key}`);
    seen.add(key);
  }
});

test('plugin copies: a shim copy is not a version mismatch while the hub names its source', () => {
  const cfg = tmp(), p = path.join(cfg, 'plugins', 'cache', 'x', 'bear-agent-manager', '0.3.0');
  fs.mkdirSync(path.join(p, 'hooks'), { recursive: true }); fs.mkdirSync(path.join(p, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(p, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'bear-agent-manager', version: '0.3.0' }));
  fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@x': [{ installPath: p, version: '0.3.0' }] } }));
  const g = { git: true, remoteOk: true, clean: true };
  fs.writeFileSync(path.join(p, 'hooks', 'hooks.json'), '{"hooks":{}}');
  assert.equal(pluginCopies([cfg])[0].shim, undefined);
  assert.equal(versionInfo('0.4.0', null, null, pluginCopies([cfg]), g, true, true).mismatch, true, 'an old copy without the shim still needs the one update');
  fs.writeFileSync(path.join(p, 'hooks', 'hooks.json'), '{"hooks":{"x":[{"hooks":[{"args":["a","shim.mjs"]}]}]}}');
  assert.equal(pluginCopies([cfg])[0].shim, true);
  assert.equal(versionInfo('0.4.0', null, null, pluginCopies([cfg]), g, true, true).mismatch, false);
  assert.equal(versionInfo('0.4.0', null, null, pluginCopies([cfg]), g, true, false).mismatch, true, 'no named source: the copy runs its own old code');
});

test('plugin copies: an old project-scope install next to a newer user install is stale, not a mismatch', () => {
  const cfg = tmp(), at = (v: string) => path.join(cfg, 'plugins', 'cache', 'x', 'bear-agent-manager', v);
  for (const v of ['0.2.0', '0.3.0']) { fs.mkdirSync(path.join(at(v), '.claude-plugin'), { recursive: true }); fs.writeFileSync(path.join(at(v), '.claude-plugin', 'plugin.json'), JSON.stringify({ version: v })); }
  fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'bear-agent-manager@x': [
    { scope: 'user', installPath: at('0.3.0'), version: '0.3.0' }, { scope: 'project', projectPath: 'C:/Users/x', installPath: at('0.2.0'), version: '0.2.0' }] } }));
  const copies = pluginCopies([cfg]);
  assert.deepEqual(copies.map((c) => [c.version, !!c.stale, c.scope]), [['0.3.0', false, 'user'], ['0.2.0', true, 'project']]);
  const g = { git: true, remoteOk: true, clean: true };
  assert.equal(versionInfo('0.3.0', null, null, copies, g, true).mismatch, false);
  assert.equal(versionInfo('0.4.0', null, null, copies, g, true).mismatch, true, 'the newest copy is still older than the hub');
});
