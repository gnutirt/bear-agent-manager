import type { AgentProfile } from './settings.ts';
import type { Provider } from './providers.ts';
import type { Perm } from './revive.ts';

// 'claude-api' profiles (docs/superpowers/specs/2026-10-20-four-levels-sync-install.md, a): a headless claude that talks to a
// providers.json provider instead of the owner's account. Pure helpers; hub/server.ts starts, wakes and stops the process.

/** Quota / rate-limit wording of the providers (same set as skills/worker/worker.ps1). */
const QUOTA = /429|402|quota|rate.?limit|insufficient|balance|exceed|限额|余额|额度|墨点/i;
export const isQuotaError = (text: string): boolean => QUOTA.test(text);

/** Files a provider outside this machine must not read (mirrors localai.ts SECRET_FILE, as claude permission rules). */
const SECRET_READS = ['**/.env*', '**/*.pem', '**/*.key', '**/*.pfx', '**/*.p12', '**/*.kdbx', '**/id_rsa*', '**/id_ed25519*', '**/.npmrc', '**/.netrc',
  '**/credentials*.json', '**/secrets.*', '**/*token*', '**/providers.json', '**/.bear-agent-manager/**', '**/.claude/**'].map((g) => `Read(${g})`);
const NO_WRITE = ['Edit', 'Write', 'NotebookEdit', 'Bash'];

/** Environment of the claude process: the provider's endpoint and credential, never the owner's account. The key stays in this object (never logged). */
export function apiEnv(p: AgentProfile, prov: Provider): Record<string, string> {
  const model = p.model || prov.models.read[0] || '';
  if (!model) throw new Error(`provider ${prov.id} has no model: set one on the profile or in providers.json`);
  const cred = prov.tier === 'local' && !prov.key ? 'ollama' : prov.key;
  if (!cred) throw new Error(`provider ${prov.id} has no key`);
  const env: Record<string, string> = { ANTHROPIC_BASE_URL: prov.baseUrl, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    ANTHROPIC_MODEL: model, ANTHROPIC_DEFAULT_HAIKU_MODEL: model, ANTHROPIC_DEFAULT_SONNET_MODEL: model, ANTHROPIC_DEFAULT_OPUS_MODEL: model };
  if (prov.auth === 'auth-token') { env.ANTHROPIC_AUTH_TOKEN = cred; env.ANTHROPIC_API_KEY = ''; }
  else { env.ANTHROPIC_API_KEY = cred; env.ANTHROPIC_AUTH_TOKEN = ''; }
  return env;
}

/** Off this machine the agent only reads (and never secret files); a local provider may edit when the profile says so (edit: true, after tool_use is confirmed for that model). */
export function apiPerm(p: AgentProfile, prov: Provider, own: Perm): Perm {
  const local = prov.tier === 'local';
  if (local && p.edit === true) return own;
  return { mode: 'default', allow: [], deny: [...NO_WRITE, ...(local ? [] : SECRET_READS)] };
}
