import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** One-time move of the pre-rename data dir (agent-room) to the new one; false when nothing moved. */
export function migrateLegacyHome(legacy: string, target: string): boolean {
  if (fs.existsSync(target) || !fs.existsSync(legacy)) return false;
  try {
    fs.renameSync(legacy, target);
    return true;
  } catch {
    return false; // e.g. another process won the race or the old dir is in use: keep going with target
  }
}

// BEAR_AGENT_* wins; the pre-rename AGENT_ROOM_* names still work.
const env = (name: string) => process.env[`BEAR_AGENT_${name}`] ?? process.env[`AGENT_ROOM_${name}`];
const DEFAULT_HOME = path.join(os.homedir(), '.bear-agent-manager');
if (!env('HOME')) migrateLegacyHome(path.join(os.homedir(), '.agent-room'), DEFAULT_HOME);

export const HOME = env('HOME') ?? DEFAULT_HOME;
export const PORT = Number(env('PORT') ?? 7788);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

/** Returns the shared secret, creating it on first use. Hub and clients read the same file. */
export function ensureToken(home: string = HOME): string {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, 'token');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const token = crypto.randomBytes(24).toString('hex');
  fs.writeFileSync(file, token, { mode: 0o600 });
  return token;
}
