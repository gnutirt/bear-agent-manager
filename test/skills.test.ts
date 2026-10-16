import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKILLS = path.join(import.meta.dirname, '..', 'skills');

test('bundled skills: name matches folder, files referenced via ${CLAUDE_SKILL_DIR} exist, no personal paths', () => {
  const dirs = fs.readdirSync(SKILLS);
  assert.deepEqual(dirs.sort(), ['osin', 'worker']);
  for (const d of dirs) {
    const md = fs.readFileSync(path.join(SKILLS, d, 'SKILL.md'), 'utf8');
    assert.equal(md.match(/^name: (.+)$/m)?.[1], d);
    assert.ok(/^description: Use|^description: \S/m.test(md));
    // Plugin skills live in the plugin cache; ~/.claude/skills paths would point at files that may not exist.
    assert.ok(!/[~$]HOME?[\\/]\.claude[\\/]skills|~\/\.claude\/skills/.test(md), `${d}: old ~/.claude/skills path`);
    for (const [, rel] of md.matchAll(/\$\{CLAUDE_SKILL_DIR\}[\\/]([\w.\\/-]+\.(?:ps1|mjs|md))/g)) {
      assert.ok(fs.existsSync(path.join(SKILLS, d, rel.replace(/\\/g, '/'))), `${d}: missing ${rel}`);
    }
  }
});

test('worker.ps1 keeps its UTF-8 BOM (Windows PowerShell 5.1 misreads the CJK quota regex without it)', () => {
  const buf = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'));
  assert.deepEqual([...buf.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
});

test('worker.ps1 isolates worker transcripts in worker-config', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  assert.match(ps, /\$env:CLAUDE_CONFIG_DIR\s*=\s*Join-Path \$hubHome "worker-config"/);
});

test('worker.ps1 reads providers.json, supports -Tier and logs usage', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  for (const s of ['providers.json', '[ValidateSet("auto", "free", "paid")][string]$Tier', 'usage = @{', 'exit 4', 'ANTHROPIC_AUTH_TOKEN']) {
    assert.ok(ps.includes(s), `worker.ps1 missing ${s}`);
  }
});
