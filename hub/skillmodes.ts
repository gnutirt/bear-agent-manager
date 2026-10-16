import fs from 'node:fs';
import path from 'node:path';
import { normAgent, type Settings, type SkillRule } from './settings.ts';

export type SkillInfo = { name: string; source: 'user' | 'plugin'; plugin: string; description: string };

function front(md: string, key: string): string {
  return md.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}
function skillsIn(dir: string): { name: string; description: string }[] {
  const out: { name: string; description: string }[] = [];
  for (const d of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    try { const md = fs.readFileSync(path.join(dir, d, 'SKILL.md'), 'utf8'); out.push({ name: front(md, 'name') || d, description: front(md, 'description').slice(0, 200) }); }
    catch { /* not a skill */ }
  }
  return out;
}

export function listSkills(configDir: string): SkillInfo[] {
  const out: SkillInfo[] = skillsIn(path.join(configDir, 'skills')).map((s) => ({ ...s, source: 'user', plugin: '' }));
  let installed: any = {};
  try { installed = JSON.parse(fs.readFileSync(path.join(configDir, 'plugins', 'installed_plugins.json'), 'utf8')); } catch { /* none */ }
  for (const [id, entries] of Object.entries<any>(installed.plugins ?? {})) {
    const plugin = id.split('@')[0];
    for (const e of [].concat(entries)) {
      for (const s of skillsIn(path.join((e as any).installPath ?? '', 'skills'))) out.push({ name: `${plugin}:${s.name}`, description: s.description, source: 'plugin', plugin });
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => !seen.has(s.name) && seen.add(s.name)).sort((a, b) => a.name.localeCompare(b.name));
}

export function effectiveRules(s: Settings, agentName: string, installed: SkillInfo[] = []): Record<string, SkillRule> {
  const mine = s.agentSkills[normAgent(agentName)] ?? {};
  const out: Record<string, SkillRule> = {};
  for (const [name, r] of Object.entries(mine)) {          // wildcards first, exact names override them
    if (!name.endsWith(':*')) continue;
    const plugin = name.slice(0, -2);
    for (const sk of installed) if (sk.name.startsWith(plugin + ':')) out[sk.name] = r;
  }
  for (const [name, r] of Object.entries(mine)) if (!name.endsWith(':*')) out[name] = r;
  return out;
}

export function skillReminder(rules: Record<string, SkillRule>, firstTurn: boolean): string {
  const force = Object.entries(rules).filter(([, r]) => r.mode === 'force' && (r.when === 'every' || firstTurn)).map(([n]) => n);
  const ban = Object.entries(rules).filter(([, r]) => r.mode === 'ban').map(([n]) => n);
  const lines: string[] = [];
  if (force.length) lines.push(`bear-agent-manager (cài đặt của người dùng): BẮT BUỘC gọi Skill tool với ${force.map((n) => '`' + n + '`').join(', ')} trước khi trả lời tin nhắn này, rồi làm theo skill đó.`);
  if (ban.length) lines.push(`bear-agent-manager (cài đặt của người dùng): KHÔNG dùng skill ${ban.map((n) => '`' + n + '`').join(', ')} trong phiên này.`);
  return lines.join('\n');
}
