import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const hooksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bam-empty-git-hooks-')).replace(/\\/g, '/');
process.once('exit', () => { try { fs.rmSync(hooksDir, { recursive: true, force: true }); } catch { /* process exit cleanup */ } });

/** Git options and environment shared by every hub-owned Git invocation. */
export function safeGitArgs(cwd: string, args: string[]): string[] {
  return [
    '-c', `core.hooksPath=${hooksDir}`,
    '-c', 'core.fsmonitor=false',
    '-c', 'diff.external=',
    '-c', 'commit.gpgSign=false',
    '--literal-pathspecs',
    '-C', cwd,
    ...args,
  ];
}

export function safeGitEnv(env: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...env,
    GIT_ATTR_NOSYSTEM: '1',
    GIT_CONFIG_COUNT: '0',
    GIT_LITERAL_PATHSPECS: '1',
  };
}

/** Runs Git with stdin, used to write raw index records without consulting repository attributes or filters. */
export function gitWithInput(cwd: string, args: string[], input: Buffer, timeout: number, maxBuffer: number, env: NodeJS.ProcessEnv = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', safeGitArgs(cwd, args), { windowsHide: true, env: safeGitEnv(env), stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout: Buffer[] = [], stderr: Buffer[] = [];
    let size = 0, settled = false;
    const finish = (error?: Error, output = '') => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error); else resolve(output);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('git command timed out'));
    }, timeout);
    child.stdout.on('data', (data: Buffer) => {
      size += data.length;
      if (size > maxBuffer) { child.kill(); finish(new Error('git output exceeded the limit')); }
      else stdout.push(data);
    });
    child.stderr.on('data', (data: Buffer) => {
      size += data.length;
      if (size > maxBuffer) { child.kill(); finish(new Error('git output exceeded the limit')); }
      else stderr.push(data);
    });
    child.once('error', (error) => finish(error));
    child.once('close', (code) => {
      if (code !== 0) finish(new Error(Buffer.concat(stderr).toString('utf8').trim() || `git exited with code ${code}`));
      else finish(undefined, Buffer.concat(stdout).toString('utf8'));
    });
    child.stdin.on('error', (error) => finish(error));
    child.stdin.end(input);
  });
}
