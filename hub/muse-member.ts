import { MAX_PROMPT, museAsk, type Cdp } from '../mcp/muse-core.ts';
import { Memory, type MemEntry } from './memory.ts';
import type { MemberTurn } from './member.ts';

export const MUSE_PREFIX = `Research the user's question with Muse. Use the "Đã biết" research notes as prior context, but distinguish verified sources from assumptions.
End the answer with "Nguồn:" followed by one http(s) URL per line. Do not invent sources.`;

export function extractUrls(text: string): string[] {
  const urls: string[] = [], seen = new Set<string>();
  for (const match of String(text ?? '').matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    const candidate = match[0].replace(/[),.;:!?}\]]+$/g, '');
    try {
      const url = new URL(candidate);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;
      const normalized = url.href;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      urls.push(candidate);
      if (urls.length === 20) break;
    } catch { /* not a URL */ }
  }
  return urls;
}

function memoryLine(entry: MemEntry): string {
  const accessed = typeof entry.accessedAt === 'number' && Number.isFinite(entry.accessedAt)
    ? entry.accessedAt
    : entry.updatedAt;
  const date = new Date(accessed).toISOString().slice(0, 10);
  const urls = entry.urls?.length ? ` · ${entry.urls.join(', ')}` : '';
  return `- [M${entry.id} · ${date}] ${entry.text}${urls}`;
}

function localTime(at: number): string {
  const date = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function museTurn(o: {
  cdp: Cdp;
  memory: Memory;
  project: string;
  now?: () => number;
}): (sid: string, room: string, text: string) => Promise<MemberTurn> {
  const now = o.now ?? Date.now;
  return async (_sid, room, text) => {
    try {
      const research = o.memory.relevant(text, { room, project: o.project }, { n: 3, chars: 3000, kind: 'research' });
      const known = research.map(memoryLine).join('\n');
      const head = `${MUSE_PREFIX}${known ? `\n\nĐã biết:\n${known}` : ''}\n\nCâu hỏi:\n`;
      const available = Math.max(0, MAX_PROMPT - head.length);
      const query = String(text ?? '').trim();
      const clippedQuery = query.length > available ? `${query.slice(0, Math.max(0, available - 1))}…` : query;
      const result = await museAsk(o.cdp, `${head}${clippedQuery}`);
      const answer = result.text.trim();
      if (!answer) return { ok: false, text: '', error: 'Muse returned no answer', kind: 'muse' };
      const accessedAt = now();
      const urls = extractUrls(answer);
      const suffix = `${result.timedOut ? '\n[hết giờ]' : ''}\n\nTruy cập: ${localTime(accessedAt)}${urls.length ? '' : '\n⚠️ chưa có nguồn'}`;
      return {
        ok: true,
        text: `${answer}${suffix}`,
        error: '',
        research: { urls, accessedAt },
      };
    } catch (error) {
      return { ok: false, text: '', error: error instanceof Error ? error.message : String(error), kind: 'muse' };
    }
  };
}
