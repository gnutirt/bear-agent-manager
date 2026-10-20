import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';
import { renameRetry } from './atomic.ts';

export type Tier = 'free' | 'paid' | 'local';   // local: an Anthropic-compatible host on this machine/LAN (e.g. Ollama); no real key needed
export type Provider = {
  id: string; label: string; tier: Tier; enabled: boolean; baseUrl: string;
  auth: 'api-key' | 'auth-token'; key: string; models: { read: string[]; edit: string[] };
};
export type PublicProvider = Omit<Provider, 'key'> & { hasKey: boolean; keyHint: string };

const FILE = 'providers.json';

export function defaultProviders(): Provider[] {
  return [
    { id: 'intern', label: 'Intern AI (free)', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', auth: 'api-key', key: '',
      models: { read: ['deepseek-v4-flash-0731', 'glm-5.3', 'kimi-k2.6'], edit: ['kimi-k2.6', 'glm-5.3', 'deepseek-v4-pro-0813'] } },
    // Values below are confirmed by the nghiencuu step of Task 4 before merging.
    { id: 'openrouter', label: 'OpenRouter', tier: 'paid', enabled: false, baseUrl: 'https://openrouter.ai/api', auth: 'auth-token', key: '',
      models: { read: [], edit: [] } },
  ];
}

const clean = (p: any, base?: Provider): Provider => ({
  id: String(p.id ?? base?.id ?? ''), label: String(p.label ?? base?.label ?? p.id ?? ''),
  tier: p.tier === 'paid' ? 'paid' : p.tier === 'free' ? 'free' : p.tier === 'local' ? 'local' : base?.tier ?? 'paid',
  enabled: typeof p.enabled === 'boolean' ? p.enabled : base?.enabled ?? false,
  baseUrl: String(p.baseUrl ?? base?.baseUrl ?? ''),
  auth: p.auth === 'auth-token' ? 'auth-token' : (p.auth === 'api-key' ? 'api-key' : base?.auth ?? 'api-key'),
  key: typeof p.key === 'string' ? p.key.trim() : base?.key ?? '',
  models: {
    read: Array.isArray(p.models?.read) ? p.models.read.map(String) : base?.models.read ?? [],
    edit: Array.isArray(p.models?.edit) ? p.models.edit.map(String) : base?.models.edit ?? [],
  },
});

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
  const next = clean({ ...rest, id }, cur);
  next.key = key === null ? '' : (typeof key === 'string' && key.trim() ? key.trim() : cur.key);
  return list.map((p) => (p.id === id ? next : p));
}

export function publicProvider(p: Provider): PublicProvider {
  const { key, ...rest } = p;
  return { ...rest, hasKey: !!key, keyHint: key ? '…' + key.slice(-4) : '' };
}
