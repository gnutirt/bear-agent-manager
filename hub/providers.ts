import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';
import { renameRetry } from './atomic.ts';

export type Tier = 'free' | 'paid' | 'local';   // local: an Anthropic-compatible host on this machine/LAN (e.g. Ollama); no real key needed
/** USD per 1M tokens and a daily USD cap. Rates are optional until the owner supplies them; usage never guesses. */
export type Pricing = { inPerM?: number; outPerM?: number; cacheReadPerM?: number; budgetUsdPerDay?: number };
export type ProviderModel = {
  id: string;
  ctx?: number;
  inPerM?: number;
  outPerM?: number;
  cacheReadPerM?: number;
  free?: boolean;
  priceSrc: 'live' | 'table' | 'provider' | 'none';
  source?: string;
  asOf?: string;
};
type ModelPriceEntry = Required<Pick<ProviderModel, 'inPerM' | 'outPerM'>> & {
  cacheReadPerM?: number; ctx?: number; source: string; asOf: string;
};
export type Provider = {
  id: string; label: string; tier: Tier; enabled: boolean; baseUrl: string;
  auth: 'api-key' | 'auth-token'; key: string; models: { read: string[]; edit: string[] }; pricing?: Pricing;
};
export type PublicProvider = Omit<Provider, 'key'> & { hasKey: boolean; keyHint: string };

const FILE = 'providers.json';

export const MODEL_PRICES: Record<string, Record<string, ModelPriceEntry>> = {
  deepseek: {
    'deepseek-flash': { inPerM: 0.3, outPerM: 1.2, cacheReadPerM: 0.3, source: 'https://api-docs.deepseek.com/quick_start/pricing', asOf: '2026-10-21' },
  },
};

/** Resolve a model's live price first, then the reviewed table, then explicit provider pricing. */
export function priceFor(provider: Provider, model: string, liveModels: readonly ProviderModel[] = []): ProviderModel {
  const live = liveModels.find((entry) => entry.id === model);
  const context = live?.ctx !== undefined ? { ctx: live.ctx } : {};
  const free = live?.free === true ? { free: true } : {};
  if (live && validAmount(live.inPerM) && validAmount(live.outPerM)) {
    return {
      id: model, ...context, inPerM: live.inPerM, outPerM: live.outPerM,
      ...(validAmount(live.cacheReadPerM) ? { cacheReadPerM: live.cacheReadPerM } : {}),
      ...free, priceSrc: 'live',
    };
  }
  const table = MODEL_PRICES[provider.id]?.[model];
  if (table) return { id: model, ...context, inPerM: table.inPerM, outPerM: table.outPerM, ...(table.cacheReadPerM !== undefined ? { cacheReadPerM: table.cacheReadPerM } : {}),
    ...free, priceSrc: 'table', source: table.source, asOf: table.asOf };
  if (provider.tier === 'local') return { id: model, ...context, inPerM: 0, outPerM: 0, cacheReadPerM: 0, free: true, priceSrc: 'provider' };
  if (provider.pricing && validAmount(provider.pricing.inPerM) && validAmount(provider.pricing.outPerM)) {
    return { id: model, ...context, inPerM: provider.pricing.inPerM, outPerM: provider.pricing.outPerM,
      ...(provider.pricing.cacheReadPerM !== undefined ? { cacheReadPerM: provider.pricing.cacheReadPerM } : {}),
      ...free, priceSrc: 'provider' };
  }
  return { id: model, ...context, ...free, priceSrc: 'none' };
}

export function defaultProviders(): Provider[] {
  return [
    { id: 'intern', label: 'Intern AI (free)', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', auth: 'api-key', key: '',
      models: { read: ['deepseek-v4-flash-0731', 'glm-5.3', 'kimi-k2.6'], edit: ['kimi-k2.6', 'glm-5.3', 'deepseek-v4-pro-0813'] } },
    // api-docs.deepseek.com/guides/anthropic_api (2026-10-20): x-api-key; only deepseek-flash and deepseek-v4-pro are model names
    // Peak-hour prices (api-docs.deepseek.com/quick_start/pricing, 2026-10-21) so the estimate is never below the real bill;
    // a cache read is priced at the input rate too, which can only overestimate.
    { id: 'deepseek', label: 'DeepSeek', tier: 'paid', enabled: false, baseUrl: 'https://api.deepseek.com/anthropic', auth: 'api-key', key: '',
      models: { read: ['deepseek-flash'], edit: ['deepseek-flash', 'deepseek-v4-pro'] },
      pricing: { inPerM: 0.3, outPerM: 1.2, cacheReadPerM: 0.3, budgetUsdPerDay: 1 } },
    // Values below are confirmed by the nghiencuu step of Task 4 before merging.
    { id: 'openrouter', label: 'OpenRouter', tier: 'paid', enabled: false, baseUrl: 'https://openrouter.ai/api', auth: 'auth-token', key: '',
      models: { read: [], edit: [] }, pricing: { budgetUsdPerDay: 1 } },
  ];
}

const RATE_KEYS = ['inPerM', 'outPerM', 'cacheReadPerM'] as const;
const validAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
/** Keep the budget even when rates are unknown; incomplete or invalid rates never produce a cost estimate. */
const priceOf = (v: any, base?: Pricing, paid = true): Pricing | undefined => {
  if (!v || typeof v !== 'object') return paid ? { budgetUsdPerDay: base?.budgetUsdPerDay ?? 1 } : undefined;
  const ratesPresent = RATE_KEYS.some((key) => v[key] !== undefined);
  const ratesValid = RATE_KEYS.every((key) => validAmount(v[key]));
  const rates = ratesPresent && ratesValid ? Object.fromEntries(RATE_KEYS.map((key) => [key, v[key]])) : {};
  const budgetUsdPerDay = validAmount(v.budgetUsdPerDay) ? v.budgetUsdPerDay : base?.budgetUsdPerDay ?? 1;
  if (!paid && !Object.keys(rates).length) return undefined;
  return { ...rates, budgetUsdPerDay } as Pricing;
};

const clean = (p: any, base?: Provider): Provider => {
  const tier = p.tier === 'paid' ? 'paid' : p.tier === 'free' ? 'free' : p.tier === 'local' ? 'local' : base?.tier ?? 'paid';
  const pricing = priceOf(p.pricing === undefined ? base?.pricing : p.pricing, base?.pricing, tier === 'paid');
  return {
    id: String(p.id ?? base?.id ?? ''), label: String(p.label ?? base?.label ?? p.id ?? ''),
    tier,
    enabled: typeof p.enabled === 'boolean' ? p.enabled : base?.enabled ?? false,
    baseUrl: String(p.baseUrl ?? base?.baseUrl ?? ''),
    auth: p.auth === 'auth-token' ? 'auth-token' : (p.auth === 'api-key' ? 'api-key' : base?.auth ?? 'api-key'),
    key: typeof p.key === 'string' ? p.key.trim() : base?.key ?? '',
    models: {
      read: Array.isArray(p.models?.read) ? p.models.read.map(String) : base?.models.read ?? [],
      edit: Array.isArray(p.models?.edit) ? p.models.edit.map(String) : base?.models.edit ?? [],
    },
    ...(pricing ? { pricing } : {}),
  };
};

export function loadProviders(home: string, legacyKeyFile?: string): Provider[] {
  let list = defaultProviders();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(home, FILE), 'utf8'));
    if (Array.isArray(raw)) {
      const byId = new Map(list.map((p) => [p.id, p]));
      for (const r of raw) if (r?.id) byId.set(String(r.id), clean(r, byId.get(String(r.id))));
      list = [...byId.values()];
    }
  } catch { /* missing or broken file: defaults */ }
  const intern = list.find((p) => p.id === 'intern');
  if (intern && !intern.key && legacyKeyFile) {
    try { intern.key = fs.readFileSync(legacyKeyFile, 'utf8').trim(); } catch { /* no legacy key */ }
  }
  return list;
}

export function saveProviders(home: string, list: Provider[]): void {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, FILE);
  fs.writeFileSync(file + '.tmp', JSON.stringify(list, null, 2), { mode: 0o600 });
  renameRetry(file + '.tmp', file);
}

export function applyPatch(list: Provider[], id: string, patch: Partial<Provider> & { key?: string | null }): Provider[] {
  const cur = list.find((p) => p.id === id);
  if (!cur) throw new StoreError(404, `unknown provider ${id}`);
  const { key, ...rest } = patch;
  const pricingInput = patch.pricing && typeof patch.pricing === 'object' ? { ...cur.pricing, ...patch.pricing } : patch.pricing;
  const pricing = patch.pricing === undefined ? cur.pricing : priceOf(pricingInput, cur.pricing, (patch.tier ?? cur.tier) === 'paid');
  const next = clean({ ...rest, id, pricing }, cur);
  next.key = key === null ? '' : (typeof key === 'string' && key.trim() ? key.trim() : cur.key);
  return list.map((p) => (p.id === id ? next : p));
}

export function publicProvider(p: Provider): PublicProvider {
  const { key, ...rest } = p;
  return { ...rest, hasKey: !!key, keyHint: key ? '…' + key.slice(-4) : '' };
}
