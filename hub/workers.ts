import { execFile } from 'node:child_process';
import fs from 'node:fs';

// Workers are headless Claude Code runs on a cheap API started by the congnhan skill:
//   powershell … congnhan.ps1 -PromptFile <task> -Dir <dir> [-Tools …] [-Kind vesinh]   (parent)
//   claude -p --bare --model <model> --allowedTools <tools> …                           (child)
// The hub finds them in the process table (no cooperation needed) and merges the optional
// status log that congnhan.ps1 appends to (<hub data>/workers.jsonl).

export type Proc = { pid: number; ppid: number; name: string; cmd: string; started: number };
export type Kind = 'congnhan' | 'vesinh';
export type LiveWorker = {
  pid: number; childPid: number | null; kind: Kind; model: string; tools: string; canEdit: boolean;
  dir: string; promptFile: string; startedAt: number;
};
export type WorkerRun = {
  id: string; pid: number | null; kind: Kind; dir: string; task: string; tools: string;
  status: 'running' | 'done' | 'failed'; startedAt: number; durationMs: number | null;
  model: string; cost: number | null; error: string; result: string;
  by: string; skill: string; // which chat hired it and through which skill (audit of the room's worker rules)
};

/** Value of `-Name <value>` / `--name <value>` in a command line; quoted values may contain spaces. */
function arg(cmd: string, name: string): string {
  const m = cmd.match(new RegExp(`(?:^|\\s)-{1,2}${name}\\s+(?:"([^"]*)"|(\\S+))`, 'i'));
  return m ? (m[1] ?? m[2] ?? '') : '';
}

export function parseWorkers(procs: Proc[]): LiveWorker[] {
  const out: LiveWorker[] = [];
  for (const p of procs) {
    if (!/congnhan\.ps1/i.test(p.cmd)) continue;
    const child = procs.find((c) => c.ppid === p.pid && /(^|[\\/"\s])claude(\.exe)?"?\s/i.test(c.cmd) && /\s--bare\b/.test(c.cmd));
    const tools = (child && arg(child.cmd, 'allowedTools')) || arg(p.cmd, 'Tools') || 'Read,Grep,Glob,Bash';
    out.push({
      pid: p.pid,
      childPid: child?.pid ?? null,
      kind: /^vesinh$/i.test(arg(p.cmd, 'Kind')) ? 'vesinh' : 'congnhan',
      model: child ? arg(child.cmd, 'model') : '',
      tools,
      canEdit: /Edit|Write/.test(tools),
      dir: arg(p.cmd, 'Dir'),
      promptFile: arg(p.cmd, 'PromptFile'),
      startedAt: p.started,
    });
  }
  return out;
}

type LogLine = { event: string; id: string; [k: string]: unknown };

/** start/end lines -> runs, newest first. A start without an end is still running. */
export function mergeWorkerLog(lines: LogLine[]): WorkerRun[] {
  const runs = new Map<string, WorkerRun>();
  for (const l of lines) {
    if (l.event === 'start') {
      runs.set(l.id, {
        id: l.id, pid: Number(l.pid) || null, kind: l.kind === 'vesinh' ? 'vesinh' : 'congnhan', dir: String(l.dir ?? ''),
        task: String(l.task ?? ''), tools: String(l.tools ?? ''), status: 'running', startedAt: Number(l.ts), durationMs: null,
        model: '', cost: null, error: '', result: '', by: String(l.by ?? ''), skill: String(l.skill ?? ''),
      });
    } else if (l.event === 'end' && runs.has(l.id)) {
      const r = runs.get(l.id)!;
      r.status = Number(l.exit) === 0 ? 'done' : 'failed';
      r.durationMs = Number(l.ts) - r.startedAt;
      r.model = String(l.model ?? '');
      r.cost = l.cost == null ? null : Number(l.cost);
      r.error = String(l.error ?? '');
      r.result = String(l.result ?? '');
    }
  }
  return [...runs.values()].sort((a, b) => b.startedAt - a.startedAt);
}

export function readWorkerLog(file: string, sinceMs: number): WorkerRun[] {
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const lines: LogLine[] = [];
  for (const l of text.split('\n')) {
    if (!l.trim()) continue;
    try { lines.push(JSON.parse(l.replace(/^﻿/, ''))); } catch { /* torn line */ }
  }
  return mergeWorkerLog(lines).filter((r) => r.startedAt >= sinceMs);
}

/** Process table snapshot (Windows: one CIM query; elsewhere: ps). */
export function listProcesses(): Promise<Proc[]> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const ps = "Get-CimInstance Win32_Process -Filter \"name='powershell.exe' or name='pwsh.exe' or name='claude.exe' or name='node.exe'\" | Select-Object ProcessId,ParentProcessId,Name,CommandLine,@{n='S';e={[DateTimeOffset]::new($_.CreationDate).ToUnixTimeMilliseconds()}} | ConvertTo-Json -Compress";
      execFile('powershell.exe', ['-NoProfile', '-Command', ps], { windowsHide: true, timeout: 15_000, maxBuffer: 16 << 20 }, (err, out) => {
        if (err) return resolve([]);
        try {
          const rows = [].concat(JSON.parse(out || '[]'));
          resolve(rows.map((r: any) => ({ pid: r.ProcessId, ppid: r.ParentProcessId, name: r.Name, cmd: r.CommandLine ?? '', started: r.S })));
        } catch { resolve([]); }
      });
    } else {
      execFile('ps', ['-eo', 'pid=,ppid=,lstart=,args='], { timeout: 10_000, maxBuffer: 16 << 20 }, (err, out) => {
        if (err) return resolve([]);
        resolve(out.split('\n').filter(Boolean).map((l) => {
          const m = l.trim().match(/^(\d+)\s+(\d+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d+)\s+(.*)$/);
          return m ? { pid: +m[1], ppid: +m[2], name: m[4].split(/\s/)[0], cmd: m[4], started: Date.parse(m[3]) } : null;
        }).filter(Boolean) as Proc[]);
      });
    }
  });
}

/** Stops a worker and its child claude process. */
export function killTree(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => resolve());
    else { try { process.kill(-pid); } catch { try { process.kill(pid); } catch { /* gone */ } } resolve(); }
  });
}
