import path from 'node:path';
import { HOME } from './config.ts';

export type RoomChatKind = 'worker' | 'empty' | 'test' | 'revive';

/** CLAUDE_CONFIG_DIR of worker runs: their transcripts never land in ~/.claude/projects. */
export const workerConfigDir = (home: string) => path.join(home, 'worker-config');

/**
 * Where room-made transcripts of one project go (A1). Outside ~/.claude: the docs don't say the editor's chat
 * list skips subfolders of projects/<p> or how cleanupPeriodDays treats them (Task 3 research, 2026-10-16).
 */
export const roomChatDir = (projectDir: string) => path.join(HOME, 'room_chat', path.basename(projectDir));

// Projects Claude Code created for throwaway dirs (hub tests, e2e demo, probes) under the OS temp dir.
const TEMP_PROJECT = /AppData-Local-Temp-|^-tmp-|^-private-var-folders-/i;

/**
 * Why a transcript is room/hub noise, or null for a real chat. `lines` = the head of the .jsonl,
 * `project` = its project folder name. Revive runs are classified by the hub (it knows their ids).
 */
export function classifyTranscript(lines: string[], project: string): RoomChatKind | null {
  let turns = 0;
  for (const l of lines) {
    if (!l.includes('"type"')) continue;
    let o: any;
    try { o = JSON.parse(l); } catch { continue; }
    if (o?.type === 'user' || o?.type === 'assistant') turns++;
    const m = o?.type === 'assistant' ? o?.message?.model : undefined;
    if (typeof m === 'string' && m !== '<synthetic>' && !m.startsWith('claude-')) return 'worker';
  }
  if (!turns) return 'empty';
  if (TEMP_PROJECT.test(path.basename(project))) return 'test';
  return null;
}
