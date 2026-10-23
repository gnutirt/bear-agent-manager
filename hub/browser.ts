import { spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { killTree } from './workers.ts';

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
};

export class BrowserHost {
  private readonly opts: BrowserHostOptions;
  private child?: ChildProcess;
  private error = '';
  private readonly spawnProc: typeof nodeSpawn;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(opts: BrowserHostOptions) {
    this.opts = opts;
    this.spawnProc = opts.spawn ?? nodeSpawn;
    this.fetcher = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
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
    if (typeof child.pid === 'number') await killTree(child.pid);
    else child.kill();
  }

  async start(): Promise<{ endpoint: string }> {
    if (this.running()) return { endpoint: this.endpoint() };
    this.child = undefined;
    this.error = '';
    if (await this.available()) {
      const e = new BrowserError(409, `cổng ${this.opts.cfg().port} đang bận`);
      this.error = e.message;
      throw e;
    }

    const cfg = this.opts.cfg();
    const found = findChrome(cfg.chromePath, this.opts.exists);
    if (!found.exe) {
      const e = new BrowserError(404, `Không tìm thấy Chrome. Đã thử: ${found.tried.join(', ') || '(không có đường dẫn phù hợp)'}`);
      this.error = e.message;
      throw e;
    }

    const profileDir = path.join(this.opts.dir, 'browser', 'profile');
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
    child.once('exit', () => { if (this.child === child) this.child = undefined; });
    let spawnError = '';
    child.once('error', (e) => { spawnError = e.message; });

    const started = this.now();
    while (this.now() - started < 10_000) {
      if (spawnError) break;
      if (await this.available()) {
        this.error = '';
        return { endpoint: this.endpoint() };
      }
      if (child.exitCode !== null || this.child !== child) break;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await this.kill(child);
    if (this.child === child) this.child = undefined;
    const detail = spawnError ? `: ${spawnError}` : '';
    const e = new BrowserError(502, `Chrome không phản hồi trên ${this.endpoint()} trong 10 giây${detail}`);
    this.error = e.message;
    throw e;
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    if (child && child.exitCode === null) await this.kill(child);
  }
}
