import type { Settings } from './settings.ts';

export type AutoJob =
  | { kind: 'handoff'; sessionId: string; transcript: string; name: string }
  | { kind: 'digest'; room: string; messageId: number; text: string }
  | { kind: 'notes'; room: string; notes: { id: number; text: string; by: string }[] };
export type AutoState = { runs: number[]; done: string[] };
const DAY = 86_400_000;

export function jobKey(j: AutoJob, s?: Settings['autoJobs']): string {
  if (j.kind === 'handoff') return `handoff:${j.sessionId}:${s?.handoff?.thresholdK ?? 300}`;   // s may be a map() index
  if (j.kind === 'digest') return `digest:${j.room}:${j.messageId}`;
  return `notes:${j.room}:${j.notes.length}`;
}

export function dueJobs(cands: AutoJob[], s: Settings['autoJobs'], st: AutoState, now: number): AutoJob[] {
  let left = s.maxRunsPerDay - st.runs.filter((t) => now - t < DAY).length;
  const done = new Set(st.done), out: AutoJob[] = [];
  for (const j of cands) {
    if (left <= 0) break;
    if (!s[j.kind].enabled || done.has(jobKey(j, s))) continue;
    done.add(jobKey(j, s)); out.push(j); left--;
  }
  return out;
}

function block(md: string, name: string): string {
  const m = md.match(new RegExp(`^## ${name}\\b[\\s\\S]*?\`\`\`\\r?\\n([\\s\\S]*?)\`\`\``, 'm'));
  return m ? m[1].trim() : '';
}

/** The whole input goes into the prompt: automatic runs have no tools (see osinArgs in server.ts). */
export function jobPrompt(j: AutoJob, jobsMd: string, chat = ''): string {
  const b = block(jobsMd, j.kind);
  if (j.kind === 'handoff') return b.replace(/<chat\.txt>/g, 'chat.txt (dán nguyên văn bên dưới, sau dòng ---)') + '\n\n---\n' + chat;
  if (j.kind === 'digest') return b.replace(/<N>/g, '15') + '\n\n---\n' + j.text;
  return b.replace(/<room>/g, j.room).replace(/<dán JSON>/g, JSON.stringify(j.notes));
}
