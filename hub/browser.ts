import { execFile, spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { McpServer } from './mcpconfig.ts';
import { killTree } from './workers.ts';

export const PLAYWRIGHT_MCP_VERSION = '0.0.83'; // Published 2026-09-28, more than 14 days before the 2026-10-23 pin.
export function mcpServerFor(endpoint: string, platform: NodeJS.Platform = process.platform, hubPort?: number): McpServer {
  const args = ['-y', `@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}`, '--cdp-endpoint', endpoint, '--isolated'];
  if (hubPort != null) {
    const blockedOrigins = ['127.0.0.1', 'localhost', '[::1]'].map((host) => `http://${host}:${hubPort}`);
    args.push('--blocked-origins', blockedOrigins.join(';'));
  }
  return {
    type: 'stdio',
    command: platform === 'win32' ? 'cmd' : 'npx',
    args: platform === 'win32' ? ['/c', 'npx', ...args] : args,
  };
}

export type BrowserCfg = { enabled: boolean; port: number; chromePath: string };
export class BrowserError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

const CHROME_PATHS: Partial<Record<NodeJS.Platform, string[]>> = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'],
};

export function findChrome(
  cfgPath: string,
  exists: (p: string) => boolean = fs.existsSync,
  platform: NodeJS.Platform = process.platform,
): { exe: string | null; tried: string[] } {
  const candidates = [...new Set([...(cfgPath ? [cfgPath] : []), ...(CHROME_PATHS[platform] ?? [])])];
  const tried: string[] = [];
  for (const candidate of candidates) {
    tried.push(candidate);
    if (exists(candidate)) return { exe: candidate, tried };
  }
  return { exe: null, tried };
}

export function chromeArgs(cfg: BrowserCfg, profileDir: string): string[] {
  return [
    '--headless=new',
    `--remote-debugging-port=${cfg.port}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${profileDir}`,
    '--user-agent=BAM-Agent',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ];
}

type BrowserHostOptions = {
  dir: string;
  cfg: () => BrowserCfg;
  spawn?: typeof nodeSpawn;
  fetch?: typeof fetch;
  now?: () => number;
  exists?: (p: string) => boolean;
  findProcess?: (pid: number) => Promise<{ pid: number; name: string; cmd: string } | undefined>;
  killProcess?: (pid: number) => Promise<void>;
  onCrash?: () => Promise<void>;
};

function processForPid(pid: number): Promise<{ pid: number; name: string; cmd: string } | undefined> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const script = `Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" | Select-Object ProcessId,Name,CommandLine | ConvertTo-Json -Compress`;
      execFile('powershell.exe', ['-NoProfile', '-Command', script], { windowsHide: true, timeout: 5000, maxBuffer: 1 << 20 }, (error, stdout) => {
        if (error) return resolve(undefined);
        try {
          const row = JSON.parse(stdout || 'null');
          resolve(row && Number(row.ProcessId) === pid ? { pid, name: String(row.Name ?? ''), cmd: String(row.CommandLine ?? '') } : undefined);
        } catch { resolve(undefined); }
      });
      return;
    }
    execFile('ps', ['-p', String(pid), '-o', 'pid=,comm=,args='], { timeout: 5000, maxBuffer: 1 << 20 }, (error, stdout) => {
      if (error) return resolve(undefined);
      const row = stdout.trim().match(/^(\d+)\s+(\S+)\s+([\s\S]*)$/);
      resolve(row && Number(row[1]) === pid ? { pid, name: row[2], cmd: row[3] } : undefined);
    });
  });
}

export class BrowserHost {
  private readonly opts: BrowserHostOptions;
  private child?: ChildProcess;
  private readyChild?: ChildProcess;
  private error = '';
  private stopping = false;
  private crashTimes: number[] = [];
  private readonly spawnProc: typeof nodeSpawn;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly findProcess: NonNullable<BrowserHostOptions['findProcess']>;
  private readonly killProcess: NonNullable<BrowserHostOptions['killProcess']>;

  constructor(opts: BrowserHostOptions) {
    this.opts = opts;
    this.spawnProc = opts.spawn ?? nodeSpawn;
    this.fetcher = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
    this.findProcess = opts.findProcess ?? processForPid;
    this.killProcess = opts.killProcess ?? killTree;
  }

  endpoint(): string { return `http://127.0.0.1:${this.opts.cfg().port}`; }
  running(): boolean { return !!this.child && this.child.exitCode === null; }
  lastError(): string { return this.error; }

  private async available(): Promise<boolean> {
    try {
      const response = await this.fetcher(`${this.endpoint()}/json/version`, { signal: AbortSignal.timeout(1000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async kill(child: ChildProcess): Promise<void> {
    if (typeof child.pid === 'number') await this.killProcess(child.pid);
    else child.kill();
  }

  private pidFile(): string { return path.join(this.opts.dir, 'browser', 'chrome.pid'); }
  private readPid(): number | undefined {
    try {
      const pid = Number(fs.readFileSync(this.pidFile(), 'utf8').trim());
      return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
    } catch { return undefined; }
  }
  private writePid(pid: number): void { fs.writeFileSync(this.pidFile(), String(pid)); }
  private clearPid(pid?: number): void {
    try {
      if (pid === undefined || this.readPid() === pid) fs.unlinkSync(this.pidFile());
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.error = `Could not remove browser PID file: ${(e as Error).message}`;
    }
  }
  private managedProcess(proc: { name: string; cmd: string }, cfg: BrowserCfg, profileDir: string): boolean {
    const name = proc.name.split(/[\\/]/).pop()?.toLowerCase() ?? '';
    if (!['chrome.exe', 'msedge.exe', 'chrome', 'msedge', 'chromium', 'chromium-browser'].includes(name)) return false;
    const cmd = proc.cmd.replace(/\\/g, '/').replace(/["']/g, '').toLowerCase();
    const profile = path.resolve(profileDir).replace(/\\/g, '/').toLowerCase();
    const hasArg = (arg: string) => new RegExp(`(?:^|\\s)${arg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|\\s)`).test(cmd);
    return hasArg(`--user-data-dir=${profile}`) &&
      hasArg(`--remote-debugging-port=${cfg.port}`) &&
      hasArg('--remote-debugging-address=127.0.0.1');
  }

  async start(): Promise<{ endpoint: string }> {
    if (this.running()) return { endpoint: this.endpoint() };
    this.stopping = false;
    this.child = undefined;
    this.error = '';
    const cfg = this.opts.cfg();
    const profileDir = path.join(this.opts.dir, 'browser', 'profile');
    let orphanPid: number | undefined;
    if (await this.available()) {
      this.assertActive();
      const pid = this.readPid();
      const proc = pid === undefined ? undefined : await this.findProcess(pid);
      this.assertActive();
      if (pid === undefined || !proc || !this.managedProcess(proc, cfg, profileDir)) {
        const e = new BrowserError(409, `cổng ${cfg.port} đang bận`);
        this.error = e.message;
        throw e;
      }
      orphanPid = pid;
    }

    const found = findChrome(cfg.chromePath, this.opts.exists);
    if (!found.exe) {
      const e = new BrowserError(404, `Không tìm thấy Chrome. Đã thử: ${found.tried.join(', ') || '(không có đường dẫn phù hợp)'}`);
      this.error = e.message;
      throw e;
    }

    if (orphanPid !== undefined) {
      await this.killProcess(orphanPid);
      this.clearPid(orphanPid);
      const deadline = this.now() + 10_000;
      while (this.now() < deadline && await this.available()) await new Promise((resolve) => setTimeout(resolve, 200));
      if (await this.available()) {
        const e = new BrowserError(409, `cổng ${cfg.port} vẫn đang bận sau khi đóng Chrome cũ`);
        this.error = e.message;
        throw e;
      }
    }
    this.assertActive();
    fs.mkdirSync(profileDir, { recursive: true });
    let child: ChildProcess;
    try {
      child = this.spawnProc(found.exe, chromeArgs(cfg, profileDir), { stdio: 'ignore', windowsHide: true });
    } catch (cause) {
      const e = new BrowserError(502, `Không khởi động được Chrome: ${(cause as Error).message}`);
      this.error = e.message;
      throw e;
    }
    this.child = child;
    child.once('exit', () => {
      if (this.child === child) this.child = undefined;
      if (typeof child.pid === 'number') this.clearPid(child.pid);
      const wasReady = this.readyChild === child;
      if (wasReady) this.readyChild = undefined;
      if (wasReady && !this.stopping && this.opts.cfg().enabled) this.restartAfterCrash();
    });
    let spawnError = '';
    child.once('error', (e) => { spawnError = e.message; this.stopping = true; if (typeof child.pid === 'number') this.clearPid(child.pid); });
    try {
      if (typeof child.pid === 'number') this.writePid(child.pid);
    } catch (cause) {
      this.stopping = true;
      await this.kill(child);
      if (this.child === child) this.child = undefined;
      const e = new BrowserError(502, `Could not persist Chrome PID: ${(cause as Error).message}`);
      this.error = e.message;
      throw e;
    }

    const started = this.now();
    while (this.now() - started < 10_000) {
      if (spawnError) break;
      if (await this.available()) {
        this.assertActive();
        this.readyChild = child;
        this.error = '';
        return { endpoint: this.endpoint() };
      }
      if (child.exitCode !== null || this.child !== child) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    this.stopping = true;
    this.readyChild = undefined;
    if (typeof child.pid === 'number') this.clearPid(child.pid);
    await this.kill(child);
    if (this.child === child) this.child = undefined;
    const detail = spawnError ? `: ${spawnError}` : '';
    const e = new BrowserError(502, `Chrome không phản hồi trên ${this.endpoint()} trong 10 giây${detail}`);
    this.error = e.message;
    throw e;
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    this.child = undefined;
    this.readyChild = undefined;
    if (child && child.exitCode === null) await this.kill(child);
    if (typeof child?.pid === 'number') this.clearPid(child.pid);
    this.error = '';
  }

  private restartAfterCrash(): void {
    const now = this.now();
    this.crashTimes = this.crashTimes.filter((at) => now - at < 10 * 60_000);
    if (this.crashTimes.length >= 3) {
      this.error = 'Chrome đã thoát 4 lần trong 10 phút; dừng tự khởi động lại';
      return;
    }
    this.crashTimes.push(now);
    const restart = this.opts.onCrash ? this.opts.onCrash() : this.start();
    void restart.catch((e) => { this.error = (e as Error).message; });
  }

  private assertActive(): void {
    if (this.stopping || !this.opts.cfg().enabled) {
      throw new BrowserError(409, 'browser start cancelled because it is disabled');
    }
  }
}
