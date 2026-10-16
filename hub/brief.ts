import type { Provider, PublicProvider } from './providers.ts';
import type { Settings } from './settings.ts';

export async function probeProvider(p: Provider, fetchImpl: typeof fetch = fetch): Promise<'ok' | 'bad'> {
  try {
    // Intern answers /v1/models OpenAI-style (Bearer); Anthropic-style hosts want x-api-key. Send both.
    const headers: Record<string, string> = { authorization: `Bearer ${p.key}`, 'x-api-key': p.key, 'anthropic-version': '2023-06-01' };
    const r = await fetchImpl(`${p.baseUrl.replace(/\/$/, '')}/v1/models`, { headers, signal: AbortSignal.timeout(8000) });
    return r.ok ? 'ok' : 'bad';
  } catch { return 'bad'; }
}

/** Short text SessionStart prints into every chat: which workers exist and when to use them. */
export function workerBrief(s: Settings, providers: PublicProvider[], health: Record<string, 'ok' | 'bad' | 'unknown'>): string {
  const skills = (['worker', 'osin'] as const).filter((k) => s.skills[k].enabled);
  const usable = providers.filter((p) => p.enabled && p.hasKey);
  const free = usable.filter((p) => p.tier === 'free');
  if (!skills.length || !usable.length) return '';
  const lines = [
    `bear-agent-manager: skill ${skills.map((k) => '`' + k + '`').join(' và ')} đang bật` +
      (free.length ? ` trên API miễn phí ${free.map((p) => p.label).join(', ')}` : ' (chỉ có tầng trả tiền)') + '.',
  ];
  if (skills.includes('worker')) lines.push('- Việc đọc nhiều (file/log lớn, khảo sát repo, tóm tắt docs) → giao `worker`, chỉ đọc báo cáo ngắn của nó.');
  if (skills.includes('osin')) lines.push('- Chat quá dài, biên bản phòng rối, cần báo cáo lãng phí token → giao `osin`.');
  const bad = free.filter((p) => health[p.id] === 'bad');
  if (bad.length) lines.push(`- Lưu ý: ${bad.map((p) => p.label).join(', ')} không phản hồi lúc kiểm tra (key hoặc mạng lỗi) — nếu worker thoát mã 1/3 thì tự làm.`);
  return lines.join('\n');
}
