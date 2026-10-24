import { priceFor, type Provider, type ProviderModel, type PublicProvider } from './providers.ts';
import type { Settings } from './settings.ts';
import { t, type Lang } from '../shared/i18n.ts';

export async function probeProvider(p: Provider, fetchImpl: typeof fetch = fetch): Promise<'ok' | 'bad'> {
  try {
    const r = await fetchImpl(`${p.baseUrl.replace(/\/$/, '')}/v1/models`, { headers: providerHeaders(p), signal: AbortSignal.timeout(8000) });
    return r.ok ? 'ok' : 'bad';
  } catch { return 'bad'; }
}

function providerHeaders(p: Provider): Record<string, string> {
  const headers: Record<string, string> = { 'anthropic-version': '2023-06-01' };
  if (p.key) {
    headers.authorization = `Bearer ${p.key}`;
    headers['x-api-key'] = p.key;
  }
  return headers;
}

function finitePositive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function pricePerMillion(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount * 1_000_000 : undefined;
}

/** Reads model IDs without exposing provider credentials or including them in errors. */
export async function listModels(p: Provider, fetchImpl: typeof fetch = fetch): Promise<ProviderModel[]> {
  if (!p.baseUrl.trim()) throw new Error('provider has no base URL');
  const base = p.baseUrl.replace(/\/+$/, '');
  let modelsUrl = `${base}/v1/models`;
  let isOpenRouter = false;
  try {
    isOpenRouter = new URL(base).hostname.toLowerCase() === 'openrouter.ai';
  } catch {
    throw new Error('provider base URL is invalid');
  }
  if (isOpenRouter) modelsUrl += `${modelsUrl.includes('?') ? '&' : '?'}supported_parameters=tools`;

  const request = async (url: string) => {
    try {
      return await fetchImpl(url, { headers: providerHeaders(p), signal: AbortSignal.timeout(8000) });
    } catch {
      throw new Error('provider model request failed');
    }
  };
  let response = await request(modelsUrl);
  if (!response.ok && p.tier === 'local' && response.status === 404) {
    response = await request(`${base}/api/tags`);
  }
  if (!response.ok) throw new Error(`provider model request failed (HTTP ${response.status})`);

  let payload: any;
  try { payload = await response.json(); } catch { throw new Error('provider returned invalid model data'); }
  const source = Array.isArray(payload?.data) && payload.data.length ? payload.data
    : Array.isArray(payload?.models) ? payload.models
      : Array.isArray(payload?.data) ? payload.data : [];
  const live: ProviderModel[] = source.flatMap((item: any) => {
    const id = typeof item?.id === 'string' ? item.id : typeof item?.name === 'string' ? item.name : '';
    if (!id || (p.key && id.includes(p.key))) return [];
    if (isOpenRouter && !(Array.isArray(item?.supported_parameters) && item.supported_parameters.includes('tools'))) return [];
    const prompt = item?.pricing?.prompt;
    const completion = item?.pricing?.completion;
    const negativePrice = ((typeof prompt === 'number' || typeof prompt === 'string') && Number(prompt) < 0)
      || ((typeof completion === 'number' || typeof completion === 'string') && Number(completion) < 0);
    if (negativePrice) return [];
    const inPerM = pricePerMillion(prompt), outPerM = pricePerMillion(completion);
    const pricingIsValid = inPerM !== undefined && outPerM !== undefined
      && Number(prompt) >= 0 && Number(completion) >= 0;
    const free = id.endsWith(':free') || prompt === '0' || prompt === 0;
    return [{
      id,
      ...(finitePositive(item?.context_length) ? { ctx: finitePositive(item.context_length) } : {}),
      ...(pricingIsValid ? { inPerM, outPerM } : {}),
      ...(free ? { free: true } : {}),
      priceSrc: pricingIsValid ? 'live' : 'none',
    }];
  });
  return [...new Map(live.map((model) => [model.id, model])).values()]
    .map((model) => ({ ...model, ...priceFor(p, model.id, live), ...(model.ctx ? { ctx: model.ctx } : {}) }))
    .sort((a, b) => {
      const costA = a.inPerM !== undefined && a.outPerM !== undefined ? a.inPerM + a.outPerM : undefined;
      const costB = b.inPerM !== undefined && b.outPerM !== undefined ? b.inPerM + b.outPerM : undefined;
      if (costA !== undefined && costB === undefined) return -1;
      if (costA === undefined && costB !== undefined) return 1;
      return costA !== undefined && costB !== undefined ? costA - costB || a.id.localeCompare(b.id) : a.id.localeCompare(b.id);
    });
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
