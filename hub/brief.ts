import type { Provider, PublicProvider } from './providers.ts';
import type { Settings } from './settings.ts';
import { t, type Lang } from '../shared/i18n.ts';

export async function probeProvider(p: Provider, fetchImpl: typeof fetch = fetch): Promise<'ok' | 'bad'> {
  try {
    // Intern answers /v1/models OpenAI-style (Bearer); Anthropic-style hosts want x-api-key.
    const headers: Record<string, string> = { 'anthropic-version': '2023-06-01' };
    if (p.key) { headers.authorization = `Bearer ${p.key}`; headers['x-api-key'] = p.key; }
    const r = await fetchImpl(`${p.baseUrl.replace(/\/$/, '')}/v1/models`, { headers, signal: AbortSignal.timeout(8000) });
    return r.ok ? 'ok' : 'bad';
  } catch { return 'bad'; }
}

/** Short text SessionStart prints into every chat: which workers exist and when to use them. */
export function workerBrief(s: Settings, providers: PublicProvider[], health: Record<string, 'ok' | 'bad' | 'unknown'>, lang: Lang = 'vi'): string {
  const skills = (['worker', 'osin'] as const).filter((k) => s.skills[k].enabled);
  const usable = providers.filter((p) => p.enabled && (p.hasKey || p.tier === 'local'));
  const free = usable.filter((p) => p.tier === 'free');
  const local = usable.filter((p) => p.tier === 'local');
  const sources = [
    ...(local.length ? [t(lang, 'brief.local', { labels: local.map((p) => p.label).join(', ') })] : []),
    ...(free.length ? [t(lang, 'brief.free', { labels: free.map((p) => p.label).join(', ') })] : []),
  ];
  if (!skills.length || !usable.length) return '';
  const lines = [
    t(lang, 'brief.head', {
      skills: skills.map((k) => '`' + k + '`').join(t(lang, 'brief.and')),
      where: sources.length ? sources.join(t(lang, 'brief.and')) : t(lang, 'brief.paidOnly'),
    }),
  ];
  if (skills.includes('worker')) lines.push(t(lang, 'brief.worker'));
  if (skills.includes('osin')) lines.push(t(lang, 'brief.osin'));
  const bad = usable.filter((p) => (p.tier === 'free' || p.tier === 'local') && health[p.id] === 'bad');
  if (bad.length) lines.push(t(lang, 'brief.bad', { labels: bad.map((p) => p.label).join(', ') }));
  return lines.join('\n');
}
