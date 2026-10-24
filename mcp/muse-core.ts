// Muse worker (tier 3): the logic that does not touch Chrome. See docs/superpowers/specs/2026-10-19-muse-worker.md.
// Re-exports driver logic and types from webchat-core.ts with the MUSE site configuration.
import {
  ask,
  siteStatus,
  MUSE,
  type Cdp,
  type Env,
} from './webchat-core.ts';

export * from './webchat-core.ts';

export async function museStatus(cdp: Cdp, busy: boolean): Promise<{ chrome: boolean; loggedIn: boolean; busy: boolean }> {
  return siteStatus(MUSE, cdp, busy);
}

export async function museAsk(
  cdp: Cdp,
  prompt: string,
  timeoutS = 180,
  env: Env = {}
): Promise<{ text: string; timedOut: boolean; ms: number }> {
  return ask(MUSE, cdp, prompt, timeoutS, env);
}
