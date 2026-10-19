import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SKILLS = path.join(import.meta.dirname, '..', 'skills');

test('bundled skills: name matches folder, files referenced via ${CLAUDE_SKILL_DIR} exist, no personal paths', () => {
  const dirs = fs.readdirSync(SKILLS);
  assert.deepEqual(dirs.sort(), ['bear-setup', 'osin', 'worker']);
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
  for (const s of ['providers.json', '[ValidateSet("auto", "local", "free", "paid")][string]$Tier', 'usage = @{', 'exit 4', 'ANTHROPIC_AUTH_TOKEN']) {
    assert.ok(ps.includes(s), `worker.ps1 missing ${s}`);
  }
});

test('worker.ps1 -Tools none passes an empty tool list that survives PowerShell 5.1', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  assert.ok(ps.includes(`if ($Tools -eq "none") { @("--tools", '""') }`));
});

test('worker.ps1 pipes the prompt as UTF-8 (PowerShell 5.1 defaults to us-ascii and turns Vietnamese into ?)', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  const enc = ps.indexOf('$OutputEncoding = New-Object Text.UTF8Encoding($false)'), out = ps.indexOf('[Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)'), pipe = ps.indexOf('$prompt | claude');
  assert.ok(enc > 0 && enc < pipe, 'UTF-8 $OutputEncoding must be set before the prompt is piped');
  assert.ok(out > 0 && out < pipe, "claude's stdout must be read as UTF-8 too (the hub starts worker.ps1 without a console)");
});

test('worker.ps1 prints its JSON result as pure ASCII, readable by any caller code page', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  assert.ok(ps.includes(String.raw`[regex]::Replace($last, '[^\x00-\x7F]'`), 'non-ASCII escaped as \\uXXXX');
  assert.ok(ps.includes('Write-Output $ascii'), 'the escaped line is the one printed');
});

test('worker.ps1 honours settings.workerRoutes (off -> exit 4, unusable provider -> automatic, explicit -Provider/-Model win)', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  for (const s of ['$settings.workerRoutes.$routeKey', '$route.enabled -eq $false', 'is not usable', 'if (-not $Provider -and $route', '$Model -eq "auto" -and $route.model']) assert.ok(ps.includes(s), `worker.ps1 missing ${s}`);
});

test('worker.ps1 tries a "local" tier provider (a LAN/this-machine Ollama-style host) before free/paid, and needs no key for it', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  for (const s of ['$_.tier -eq "local"', '"local" { @(& $usable "local") }', '@(& $usable "local") + @(& $usable "free")']) assert.ok(ps.includes(s), `worker.ps1 missing ${s}`);
});
