// Checks whether Claude actually calls the right library skill for Vietnamese prompts (eval/prompts.json).
// For each pack, the pack's skills are copied into a temp project's .claude/skills so they compete as they would when installed,
// then every prompt runs through `claude -p` with only the Skill tool allowed, and the skill it called is recorded.
//
//   node skill-library/eval/run.mjs                      dry run: prints the plan, calls nothing (default)
//   node skill-library/eval/run.mjs --run --provider intern [--model <id>] [--pack banking-vn] [--skill vn-phan-loai-no] [--limit 20]
//   CLAUDE_CONFIG_DIR=~/.claude-antigravity node skill-library/eval/run.mjs --run --model haiku --limit 20   (a Claude account)
//
// --run costs tokens: run it only after the owner said "ok". --provider takes a provider id from
// ~/.bear-agent-manager/providers.json (like skills/worker) and uses the hub's worker-config dir, so the main Claude account
// is not touched. Without --provider the run uses the logged-in Claude account. A non-Claude model (free providers) only
// approximates how Claude picks skills; the real check is a Claude model.
// Results: skill-library/eval/results-<date>.json and a summary table on stdout.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Call the claude binary directly: going through a shell on Windows splits the Vietnamese prompts at spaces.
const claudeBin = process.platform === 'win32' ? ((spawnSync('where', ['claude.exe'], { encoding: 'utf8' }).stdout ?? '').split(/\r?\n/)[0].trim() || join(process.env.ProgramFiles ?? 'C:/Program Files', 'nodejs/node_modules/@anthropic-ai/claude-code/bin/claude.exe')) : 'claude';
import { fileURLToPath } from 'node:url';

const libDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const run = args.includes('--run');

const index = JSON.parse(readFileSync(join(libDir, 'index.json'), 'utf8')).skills;
const packs = JSON.parse(readFileSync(join(libDir, 'packs.json'), 'utf8'));
const { skills: cases } = JSON.parse(readFileSync(join(libDir, 'eval', 'prompts.json'), 'utf8'));
const byName = new Map(index.map((s) => [s.name, s]));

const selected = Object.entries(cases).filter(([name, c]) =>
  (!opt('--skill') || name === opt('--skill')) && (!opt('--pack') || c.pack === opt('--pack')));
const packIds = [...new Set(selected.map(([, c]) => c.pack))];

// Skills installed for one pack: the pack's skills plus any skill under test that the pack does not list.
function packSkills(packId) {
  const pack = packs.find((p) => p.id === packId);
  if (!pack) throw new Error(`prompts.json names unknown pack ${packId}`);
  const extra = selected.filter(([, c]) => c.pack === packId).map(([n]) => n);
  return [...new Set([...pack.skills, ...extra])];
}

function providerEnv() {
  const id = opt('--provider');
  if (!id) return { env: { ...process.env }, label: `logged-in Claude account${process.env.CLAUDE_CONFIG_DIR ? ` (${process.env.CLAUDE_CONFIG_DIR})` : ''}`, model: opt('--model') };
  const home = process.env.BEAR_AGENT_HOME || join(homedir(), '.bear-agent-manager');
  const prov = JSON.parse(readFileSync(join(home, 'providers.json'), 'utf8')).find((p) => p.id === id && p.enabled && p.key);
  if (!prov) throw new Error(`provider ${id} not found, disabled or without key in providers.json`);
  // Not --bare (as skills/worker uses): bare mode has no Skill tool and ignores project skills.
  // Outside bare mode an env API key counts as "not logged in", so the key goes through apiKeyHelper (a temp script),
  // and the third-party model id through ANTHROPIC_MODEL, which is accepted where --model is not.
  const model = opt('--model') ?? prov.models?.read?.[0];
  const keyDir = mkdtempSync(join(tmpdir(), 'skill-eval-key-'));
  const helper = join(keyDir, process.platform === 'win32' ? 'key.cmd' : 'key.sh');
  writeFileSync(helper, process.platform === 'win32' ? `@echo ${prov.key}\r\n` : `#!/bin/sh\necho '${prov.key}'\n`, { mode: 0o700 });
  process.on('exit', () => rmSync(keyDir, { recursive: true, force: true }));
  const env = { ...process.env, CLAUDE_CONFIG_DIR: join(home, 'worker-config'), ANTHROPIC_BASE_URL: prov.baseUrl };
  delete env.ANTHROPIC_API_KEY; delete env.ANTHROPIC_AUTH_TOKEN;
  if (model) Object.assign(env, { ANTHROPIC_MODEL: model, ANTHROPIC_SMALL_FAST_MODEL: model, ANTHROPIC_DEFAULT_HAIKU_MODEL: model });
  mkdirSync(env.CLAUDE_CONFIG_DIR, { recursive: true });
  return { env, label: `provider ${id}`, model, settings: JSON.stringify({ apiKeyHelper: helper }) };
}

// The Skill tool calls in a stream-json transcript, in order.
function calledSkills(stdout) {
  const out = [];
  for (const line of stdout.split(/\r?\n/)) {
    let msg; try { msg = JSON.parse(line); } catch { continue; }
    for (const c of msg?.message?.content ?? []) if (c.type === 'tool_use' && c.name === 'Skill') out.push(c.input?.skill ?? c.input?.command ?? '?');
  }
  return out;
}

// --limit N: the first prompt of every skill, then the second, … so a small budget still covers as many skills as it can.
const jobs = [];
for (let i = 0; i < 3; i++) for (const [name, c] of selected) if (c.prompts[i]) jobs.push({ name, pack: c.pack, prompt: c.prompts[i] });
if (opt('--limit')) jobs.splice(Number(opt('--limit')));
if (opt('--from')) jobs.splice(0, Number(opt('--from'))); // resume after a stopped run: skip the first N of the list
console.log(`${selected.length} skills, ${jobs.length} prompts, packs: ${packIds.join(', ')}`);
for (const p of packIds) console.log(`  ${p}: installs ${packSkills(p).join(', ')}`);
if (!run) {
  console.log('\nDry run: nothing was called. Add --run (after the owner said "ok") and preferably --provider <id> to execute.');
  process.exit(0);
}

const { env, label, model, settings } = providerEnv();
console.log(`\nRunning with ${label}${model ? `, model ${model}` : ''}`);
const results = [];
let rateLimited = 0;
outer: for (const packId of new Set(jobs.map((j) => j.pack))) {
  const proj = mkdtempSync(join(tmpdir(), `skill-eval-${packId}-`));
  for (const name of packSkills(packId)) {
    const s = byName.get(name);
    if (!s) throw new Error(`${name} is not in index.json`);
    const from = join(libDir, s.bundle ?? s.path);
    cpSync(from, join(proj, '.claude', 'skills', (s.bundle ?? s.path).split('/').pop()), { recursive: true });
  }
  for (const { name, prompt } of jobs.filter((j) => j.pack === packId)) {
    {
      const cli = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--tools', 'Skill', '--allowedTools', 'Skill', '--max-turns', '2', '--strict-mcp-config', '--setting-sources', 'project'];
      // project only: the account's user hooks (room waiter, notifications) and plugins must not run for eval prompts.
      if (settings) cli.push('--settings', settings); else if (model) cli.push('--model', model);
      const r = spawnSync(claudeBin, cli, { cwd: proj, env, encoding: 'utf8', timeout: 180000 });
      const called = calledSkills(r.stdout ?? '');
      const row = { skill: name, pack: packId, prompt, called, hit: called.some((x) => x === name || x.endsWith(':' + name)), exit: r.status, error: r.status ? (r.stderr ?? '').slice(0, 300) : undefined };
      results.push(row);
      console.log(`${row.hit ? 'HIT ' : 'MISS'} ${name.padEnd(42)} -> ${called.join(', ') || '(none)'}${row.error ? `  [exit ${r.status}]` : ''}`);
      // Stop after 3 rate-limit failures in a row instead of burning the provider's quota.
      // A call that reached a skill was not rate-limited: exit 1 then is --max-turns, and stream-json always has rate_limit events.
      rateLimited = !called.length && r.status && /429|rate.?limit|quota/i.test((r.stderr ?? '') + (r.stdout ?? '')) ? rateLimited + 1 : 0;
      if (rateLimited >= 3) { console.log('Stopped: 3 rate-limit errors in a row.'); rmSync(proj, { recursive: true, force: true }); break outer; }
    }
  }
  rmSync(proj, { recursive: true, force: true });
}

const file = join(libDir, 'eval', `results-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(file, JSON.stringify({ ran: new Date().toISOString(), with: label, model, results }, null, 2) + '\n');
console.log('\n| Skill | Hit |\n|---|---|');
for (const [name] of selected) {
  const rows = results.filter((r) => r.skill === name);
  console.log(`| ${name} | ${rows.filter((r) => r.hit).length}/${rows.length} |`);
}
console.log(`\nSaved ${file}${existsSync(file) ? '' : ' (write failed)'}`);
