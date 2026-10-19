// Checks whether Claude actually calls the right library skill for Vietnamese prompts (eval/prompts.json).
// For each pack, the pack's skills are copied into a temp project's .claude/skills so they compete as they would when installed,
// then every prompt runs through `claude -p` with only the Skill tool allowed, and the skill it called is recorded.
//
//   node skill-library/eval/run.mjs                      dry run: prints the plan, calls nothing (default)
//   node skill-library/eval/run.mjs --run --provider intern [--model <id>] [--pack banking-vn] [--skill vn-phan-loai-no]
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
  if (!id) return { env: { ...process.env }, label: 'logged-in Claude account' };
  const home = process.env.BEAR_AGENT_HOME || join(homedir(), '.bear-agent-manager');
  const prov = JSON.parse(readFileSync(join(home, 'providers.json'), 'utf8')).find((p) => p.id === id && p.enabled && p.key);
  if (!prov) throw new Error(`provider ${id} not found, disabled or without key in providers.json`);
  const env = { ...process.env, CLAUDE_CONFIG_DIR: join(home, 'worker-config'), ANTHROPIC_BASE_URL: prov.baseUrl };
  delete env.ANTHROPIC_API_KEY; delete env.ANTHROPIC_AUTH_TOKEN;
  if (prov.auth === 'auth-token') env.ANTHROPIC_AUTH_TOKEN = prov.key; else env.ANTHROPIC_API_KEY = prov.key;
  mkdirSync(env.CLAUDE_CONFIG_DIR, { recursive: true });
  return { env, label: `provider ${id}`, model: opt('--model') ?? prov.models?.read?.[0] };
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

const total = selected.reduce((n, [, c]) => n + c.prompts.length, 0);
console.log(`${selected.length} skills, ${total} prompts, packs: ${packIds.join(', ')}`);
for (const p of packIds) console.log(`  ${p}: installs ${packSkills(p).join(', ')}`);
if (!run) {
  console.log('\nDry run: nothing was called. Add --run (after the owner said "ok") and preferably --provider <id> to execute.');
  process.exit(0);
}

const { env, label, model } = providerEnv();
console.log(`\nRunning with ${label}${model ? `, model ${model}` : ''}`);
const results = [];
for (const packId of packIds) {
  const proj = mkdtempSync(join(tmpdir(), `skill-eval-${packId}-`));
  for (const name of packSkills(packId)) {
    const s = byName.get(name);
    if (!s) throw new Error(`${name} is not in index.json`);
    const from = join(libDir, s.bundle ?? s.path);
    cpSync(from, join(proj, '.claude', 'skills', (s.bundle ?? s.path).split('/').pop()), { recursive: true });
  }
  for (const [name, c] of selected.filter(([, c]) => c.pack === packId)) {
    for (const prompt of c.prompts) {
      const cli = ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--tools', 'Skill', '--allowedTools', 'Skill', '--max-turns', '2', '--strict-mcp-config'];
      if (model) cli.push('--model', model);
      const r = spawnSync('claude', cli, { cwd: proj, env, encoding: 'utf8', timeout: 180000, shell: process.platform === 'win32' });
      const called = calledSkills(r.stdout ?? '');
      const row = { skill: name, pack: packId, prompt, called, hit: called.some((x) => x === name || x.endsWith(':' + name)), exit: r.status, error: r.status ? (r.stderr ?? '').slice(0, 300) : undefined };
      results.push(row);
      console.log(`${row.hit ? 'HIT ' : 'MISS'} ${name.padEnd(42)} -> ${called.join(', ') || '(none)'}${row.error ? `  [exit ${r.status}]` : ''}`);
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
