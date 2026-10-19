import { execFile } from 'node:child_process';
import { cmpSemver, pluginCopies, type PluginCopy } from './version.ts';

// Auto-update of this plugin's copy in every Claude account (owner's decision, room note [14]): no button, no typed command.
// Only this plugin, only from the marketplace the account already has for it (the "local" one that reads this repo's folder: nothing
// is downloaded from a network by us), only `claude plugin marketplace update` + `claude plugin update`. Login files are not touched.
export const MARKETPLACE = 'bear-agent-manager-local';
export const PLUGIN = `bear-agent-manager@${MARKETPLACE}`;
const EVERY_MS = 60 * 60_000;   // at most once an hour per account, success or not: no endless retries

export type Run = (configDir: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>;
export type UpdateResult = { configDir: string; from: string; to: string; ok: boolean; error?: string };

/** The real call: `claude <args>` with CLAUDE_CONFIG_DIR of that account. The arguments are constants; a shell is only the Windows way to find claude.cmd. */
export const runClaude: Run = (configDir, args) => new Promise((resolve) => {
  execFile('claude', args, { env: { ...process.env, CLAUDE_CONFIG_DIR: configDir }, shell: process.platform === 'win32', windowsHide: true, timeout: 120_000, maxBuffer: 1 << 20 }, (err, stdout, stderr) =>
    resolve({ code: err ? Number((err as { code?: unknown }).code) || 1 : 0, stdout: String(stdout), stderr: String(stderr) }));
});

/** Newest installed copy of this plugin per account (an old project-scope install next to a newer user one does not count). */
export function newestPerAccount(configDirs: string[]): PluginCopy[] {
  const by = new Map<string, PluginCopy>();
  for (const c of pluginCopies(configDirs)) {
    const cur = by.get(c.configDir.toLowerCase());
    if (!cur || cmpSemver(c.version, cur.version) > 0) by.set(c.configDir.toLowerCase(), c);
  }
  return [...by.values()];
}

export class PluginUpdater {
  private last = new Map<string, number>();
  private running = false;
  private hubVersion: string;
  private run: Run;
  private now: () => number;
  constructor(hubVersion: string, run: Run = runClaude, now: () => number = Date.now) { this.hubVersion = hubVersion; this.run = run; this.now = now; }

  /** Updates every account whose copy is older than the hub; returns what it did (nothing when all are current or tried within the hour). */
  async check(configDirs: string[]): Promise<UpdateResult[]> {
    if (this.running) return [];
    this.running = true;
    const out: UpdateResult[] = [];
    try {
      for (const c of newestPerAccount(configDirs)) {
        if (cmpSemver(this.hubVersion, c.version) <= 0) continue;
        const key = c.configDir.toLowerCase();
        if (this.now() - (this.last.get(key) ?? 0) < EVERY_MS) continue;
        this.last.set(key, this.now());
        out.push(await this.updateOne(c));
      }
    } finally { this.running = false; }
    return out;
  }

  private async updateOne(c: PluginCopy): Promise<UpdateResult> {
    const fail = (error: string): UpdateResult => ({ configDir: c.configDir, from: c.version, to: this.hubVersion, ok: false, error: error.replace(/\s+/g, ' ').trim().slice(0, 300) });
    const m = await this.run(c.configDir, ['plugin', 'marketplace', 'update', MARKETPLACE]);
    if (m.code !== 0) return fail(`marketplace update: ${m.stderr || m.stdout || `exit ${m.code}`}`);
    const u = await this.run(c.configDir, ['plugin', 'update', PLUGIN]);   // no -y: a command declared by the marketplace is refused, never silently accepted
    if (u.code !== 0) return fail(`plugin update: ${u.stderr || u.stdout || `exit ${u.code}`}`);
    const now = newestPerAccount([c.configDir])[0];
    if (!now || cmpSemver(now.version, c.version) <= 0) return fail(`the account still has ${now?.version ?? c.version} after the update`);
    return { configDir: c.configDir, from: c.version, to: now.version, ok: true };
  }
}
