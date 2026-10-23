import { execFile, spawn as nodeSpawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { killTree } from './workers.ts';

export type DuckHostCfg = { exePath: string; port: number };

export class DuckHostError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'DuckHostError';
    this.status = status;
  }
}

type DuckHostOptions = {
  dir: string;
  cfg: () => DuckHostCfg;
  spawn?: typeof nodeSpawn;
  fetch?: typeof fetch;
  now?: () => number;
  exists?: (file: string) => boolean;
  findProcess?: (pid: number) => Promise<{ pid: number; name: string; cmd: string } | undefined>;
  killProcess?: (pid: number) => Promise<void>;
  randomKey?: () => string;
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

export class DuckHost {
  private readonly opts: DuckHostOptions;
  private child?: ChildProcess;
  private readyChild?: ChildProcess;
  private error = '';
  private stopping = false;
  private crashTimes: number[] = [];
  private readonly spawnProc: typeof nodeSpawn;
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;
  private readonly exists: (file: string) => boolean;
  private readonly findProcess: NonNullable<DuckHostOptions['findProcess']>;
  private readonly killProcess: NonNullable<DuckHostOptions['killProcess']>;
  private readonly randomKey: () => string;
  private authKey = '';

  constructor(opts: DuckHostOptions) {
    this.opts = opts;
    this.spawnProc = opts.spawn ?? nodeSpawn;
    this.fetcher = opts.fetch ?? fetch;
    this.now = opts.now ?? Date.now;
    this.exists = opts.exists ?? fs.existsSync;
    this.findProcess = opts.findProcess ?? processForPid;
    this.killProcess = opts.killProcess ?? killTree;
    this.randomKey = opts.randomKey ?? (() => crypto.randomBytes(32).toString('hex'));
  }

  endpoint(): string { return `http://127.0.0.1:${this.opts.cfg().port}`; }
  key(): string { return this.authKey; }
  running(): boolean { return !!this.child && this.child.exitCode === null; }
  lastError(): string { return this.error; }

  private pidFile(): string { return path.join(this.opts.dir, 'duck', 'duck2api.pid'); }
  private readPid(): number | undefined {
    try {
      const pid = Number(fs.readFileSync(this.pidFile(), 'utf8').trim());
      return Number.isSafeInteger(pid) && pid > 0 ? pid : undefined;
    } catch { return undefined; }
  }
  private writePid(pid: number): void {
    fs.mkdirSync(path.dirname(this.pidFile()), { recursive: true });
    fs.writeFileSync(this.pidFile(), String(pid), { mode: 0o600 });
  }
  private clearPid(pid?: number): void {
    try {
      if (pid === undefined || this.readPid() === pid) fs.unlinkSync(this.pidFile());
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') this.error = `Could not remove Duck2api PID file: ${(e as Error).message}`;
    }
  }
  private async probe(): Promise<'ready' | 'occupied' | 'down'> {
    try {
      const response = await this.fetcher(`${this.endpoint()}/ping`, { signal: AbortSignal.timeout(1000) });
      return response.ok ? 'ready' : 'occupied';
    } catch {
      return 'down';
    }
  }
  private ownsProcess(proc: { cmd: string }, exePath: string): boolean {
    const normalize = (value: string) => {
      const formatted = value.replace(/[\"']/g, '').replace(/\\/g, '/');
      return process.platform === 'win32' ? formatted.toLowerCase() : formatted;
    };
    const executable = normalize(path.resolve(exePath)).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\s)${executable}(?=$|\\s)`).test(normalize(proc.cmd));
  }
  private async waitUntilDown(): Promise<void> {
    const deadline = this.now() + 10_000;
    while (this.now() < deadline) {
      if (await this.probe() === 'down') return;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (await this.probe() !== 'down') throw new DuckHostError(409, `cổng ${this.opts.cfg().port} vẫn đang bận sau khi đóng Duck2api cũ`);
  }
  private assertActive(cfg: DuckHostCfg): void {
    const current = this.opts.cfg();
    if (this.stopping || !current.exePath || current.exePath !== cfg.exePath || current.port !== cfg.port) {
      throw new DuckHostError(409, 'Duck2api start cancelled because its configuration changed');
    }
  }
  private async kill(child: ChildProcess): Promise<void> {
    if (typeof child.pid === 'number') await this.killProcess(child.pid);
    else child.kill();
  }

  async start(): Promise<{ endpoint: string }> {
    const cfg = this.opts.cfg();
    if (!cfg.exePath) {
      await this.stop();
      return { endpoint: this.endpoint() };
    }
    if (this.running()) return { endpoint: this.endpoint() };
    this.stopping = false;
    this.child = undefined;
    this.error = '';
    const exePath = path.resolve(cfg.exePath);
    if (!this.exists(exePath)) {
      const error = new DuckHostError(404, `Không tìm thấy duck2api.exe: ${exePath}`);
      this.error = error.message;
      throw error;
    }

    const probe = await this.probe();
    this.assertActive(cfg);
    const recordedPid = this.readPid();
    const recordedProcess = recordedPid === undefined ? undefined : await this.findProcess(recordedPid);
    this.assertActive(cfg);
    let orphanPid: number | undefined;
    if (probe !== 'down') {
      if (recordedPid === undefined || !recordedProcess || !this.ownsProcess(recordedProcess, exePath)) {
        const error = new DuckHostError(409, `cổng ${cfg.port} đang được một tiến trình khác sử dụng`);
        this.error = error.message;
        throw error;
      }
      orphanPid = recordedPid;
    } else if (recordedPid !== undefined && recordedProcess && this.ownsProcess(recordedProcess, exePath)) {
      orphanPid = recordedPid;
    } else if (recordedPid !== undefined) {
      this.clearPid(recordedPid);
    }

    if (orphanPid !== undefined) {
      await this.killProcess(orphanPid);
      this.clearPid(orphanPid);
      await this.waitUntilDown();
    }
    this.assertActive(cfg);

    const duckDir = path.join(this.opts.dir, 'duck');
    fs.mkdirSync(duckDir, { recursive: true });
    this.authKey = this.randomKey();
    const env: NodeJS.ProcessEnv = {};
    for (const name of ['SystemRoot', 'PATH', 'TEMP', 'TMP', 'HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy']) {
      const value = process.env[name];
      if (value !== undefined) env[name] = value;
    }
    env.SERVER_HOST = '127.0.0.1';
    env.SERVER_PORT = String(cfg.port);
    env.Authorization = this.authKey;

    let child: ChildProcess;
    try {
      child = this.spawnProc(exePath, [], { cwd: duckDir, env, stdio: 'ignore', windowsHide: true });
    } catch (cause) {
      this.authKey = '';
      const error = new DuckHostError(502, `Không khởi động được Duck2api: ${(cause as Error).message}`);
      this.error = error.message;
      throw error;
    }
    this.child = child;
    child.once('exit', () => {
      if (this.child === child) this.child = undefined;
      if (typeof child.pid === 'number') this.clearPid(child.pid);
      const wasReady = this.readyChild === child;
      if (wasReady) this.readyChild = undefined;
      this.authKey = '';
      if (wasReady && !this.stopping && this.opts.cfg().exePath) this.restartAfterCrash();
    });
    let spawnError = '';
    child.once('error', (error) => { spawnError = error.message; this.stopping = true; });
    try {
      if (typeof child.pid === 'number') this.writePid(child.pid);
    } catch (cause) {
      this.stopping = true;
      await this.kill(child);
      if (this.child === child) this.child = undefined;
      this.authKey = '';
      const error = new DuckHostError(502, `Không lưu được Duck2api PID: ${(cause as Error).message}`);
      this.error = error.message;
      throw error;
    }

    const abortStart = async () => {
      this.stopping = true;
      this.readyChild = undefined;
      if (typeof child.pid === 'number') this.clearPid(child.pid);
      if (this.child === child && child.exitCode === null) await this.kill(child);
      if (this.child === child) this.child = undefined;
      this.authKey = '';
    };
    const ensureActive = async () => {
      try { this.assertActive(cfg); } catch (error) {
        await abortStart();
        throw error;
      }
    };
    const started = this.now();
    while (this.now() - started < 15_000) {
      await ensureActive();
      if (spawnError || child.exitCode !== null || this.child !== child) break;
      const status = await this.probe();
      await ensureActive();
      if (status === 'ready') {
        this.readyChild = child;
        this.error = '';
        return { endpoint: this.endpoint() };
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    await ensureActive();

    this.stopping = true;
    this.readyChild = undefined;
    if (typeof child.pid === 'number') this.clearPid(child.pid);
    await this.kill(child);
    if (this.child === child) this.child = undefined;
    this.authKey = '';
    const detail = spawnError ? `: ${spawnError}` : '';
    const error = new DuckHostError(502, `Duck2api không phản hồi tại ${this.endpoint()}/ping trong 15 giây${detail}`);
    this.error = error.message;
    throw error;
  }

  async stop(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    this.child = undefined;
    this.readyChild = undefined;
    if (child && child.exitCode === null) await this.kill(child);
    if (typeof child?.pid === 'number') this.clearPid(child.pid);
    this.authKey = '';
    this.error = '';
  }

  private restartAfterCrash(): void {
    const now = this.now();
    this.crashTimes = this.crashTimes.filter((at) => now - at < 10 * 60_000);
    if (this.crashTimes.length >= 3) {
      this.error = 'Duck2api đã thoát 4 lần trong 10 phút; dừng tự khởi động lại';
      this.authKey = '';
      return;
    }
    this.crashTimes.push(now);
    const restart = this.opts.onCrash ? this.opts.onCrash() : this.start();
    void restart.catch((error) => { this.error = (error as Error).message; });
  }
}
