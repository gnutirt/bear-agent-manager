import fs from 'node:fs';
import path from 'node:path';
import { renameRetry } from './atomic.ts';
import { chatComplete, type ChatMsg, type ChatResult } from './chatapi.ts';
import { isSecretText, loadHistory, saveHistory, type ChatHistory, type MemEntry, type Memory } from './memory.ts';
import type { Message } from './routing.ts';

export const DUCK_SYSTEM = `Bạn là Duck, trợ lý trò chuyện và tư vấn trong phòng. Bạn không thể hành động, chạy lệnh, dùng công cụ, truy cập tệp hay thay đổi hệ thống.
Khi dùng một dòng bộ nhớ, hãy dẫn mã [M<id>] cùng nguồn, ngày; với nghiên cứu hãy nêu URL. Không có bằng chứng thì nói rõ đó là ý kiến hoặc suy luận.

You are Duck, a conversational and advice assistant. You cannot take actions, run commands, use tools, access files, or change systems. When using memory, cite its [M<id>] with source and date; for research, include the URL. Clearly label unsupported claims as opinions or inferences.`;

export type DuckTurnResult = { ok: boolean; text: string; error: string; kind?: string; usage?: { in: number; out: number } };

function stripLeadingMentions(text: string): string {
  return text.trim().replace(/^(?:@\S+\s+)+/, '').trim();
}

export function memoryCommand(text: string): { kind: 'remember'; text: string; scope: 'room' | 'project' } | { kind: 'forget'; query: string } | null {
  const clean = stripLeadingMentions(text);
  const remember = clean.match(/^nhớ\s+giùm[:,]?\s+(.+)$/iu)
    ?? clean.match(/^(?:hãy\s+)?nhớ(?:\s+cho cả dự án)?[:,]?\s+(.+)$/iu);
  if (remember) return { kind: 'remember', text: remember[1].trim(), scope: /nhớ\s+cho cả dự án/i.test(clean) ? 'project' : 'room' };
  const englishRemember = clean.match(/^remember[:,]?\s+(.+)$/i);
  if (englishRemember) return { kind: 'remember', text: englishRemember[1].trim(), scope: 'room' };
  const forget = clean.match(/^(?:quên|forget)[:,]?\s+(.+)$/iu);
  if (forget) return { kind: 'forget', query: forget[1].trim() };
  return null;
}

function dateOf(entry: MemEntry): string {
  const stamp = Number.isFinite(entry.updatedAt) ? entry.updatedAt : entry.createdAt;
  return new Date(stamp).toISOString().slice(0, 10);
}

export function buildMessages(o: { system: string; memories: MemEntry[]; history: ChatHistory; text: string }): ChatMsg[] {
  const messages: ChatMsg[] = [{ role: 'system', content: o.system }];
  if (o.memories.length) {
    const lines = o.memories.map((entry) => {
      const urls = entry.kind === 'research' ? entry.urls?.join(', ') : undefined;
      return `[M${entry.id} ${entry.kind} · ${entry.source} · ${dateOf(entry)}${urls ? ` · ${urls}` : ''}] ${entry.text}`;
    });
    messages.push({ role: 'system', content: `Bộ nhớ liên quan:\n${lines.join('\n')}` });
  }
  if (o.history.summary.trim()) messages.push({ role: 'system', content: `Tóm tắt trước đó:\n${o.history.summary}` });
  for (const turn of o.history.turns) messages.push({ role: turn.role, content: turn.text });
  messages.push({ role: 'user', content: o.text });
  return messages;
}

function errorText(result: Extract<ChatResult, { ok: false }>): string {
  switch (result.kind) {
    case 'timeout': return 'Duck hết thời gian chờ phản hồi.';
    case 'auth': return 'Duck không xác thực được: kiểm tra API key.';
    case 'rate': return 'Duck bị giới hạn tần suất (HTTP 429).';
    case 'banned': return 'Duck.ai đã chặn IP này (ERR_BN_LIMIT).';
    case 'http': return `Duck API báo lỗi: ${result.error}.`;
    case 'invalid': return `Duck API trả phản hồi không hợp lệ: ${result.error}.`;
    case 'network': return `Không kết nối được Duck API: ${result.error}.`;
  }
}

function historyLength(history: ChatHistory): number {
  return history.summary.length + history.turns.reduce((sum, turn) => sum + turn.text.length, 0);
}

async function summarizeOldest(o: {
  history: ChatHistory;
  model: string;
  baseUrl: string;
  key?: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}): Promise<void> {
  if (historyLength(o.history) <= 12_000 || o.history.turns.length < 2) return;
  const split = Math.max(1, Math.floor(o.history.turns.length / 2));
  const old = o.history.turns.slice(0, split);
  const recent = o.history.turns.slice(split);
  const result = await chatComplete({
    baseUrl: o.baseUrl,
    key: o.key,
    model: o.model,
    timeoutMs: o.timeoutMs,
    fetch: o.fetch,
    messages: [
      { role: 'system', content: 'Tóm tắt ngắn gọn các lượt cũ thành bối cảnh dùng lại trong hội thoại. Tối đa 2000 ký tự; không thêm dữ kiện.' },
      ...(o.history.summary ? [{ role: 'system' as const, content: `Tóm tắt trước đó:\n${o.history.summary}` }] : []),
      ...old.map((turn) => ({ role: turn.role, content: turn.text })),
    ],
  });
  o.history.turns = recent;
  if (result.ok && result.text.trim()) {
    o.history.summary = result.text.trim().slice(0, 2000);
    return;
  }
  const note = '(không tóm tắt được, đã bỏ bớt lượt cũ)';
  o.history.summary = `${o.history.summary ? `${o.history.summary}\n` : ''}${note}`.slice(-2000);
}

const deleteConfirmation = (text: string): { all: boolean; ids: number[] } | null => {
  const match = text.match(/^(xoá|xoa|delete)(?:\s+(.+))?$/iu);
  if (!match) return null;
  const rest = match[2]?.trim();
  if (!rest) return { all: true, ids: [] };
  const ids = [...rest.matchAll(/(?:M)?(\d+)/gi)].map((m) => Number(m[1])).filter(Number.isSafeInteger);
  return ids.length ? { all: false, ids } : null;
};

export function duckTurn(o: {
  home: string;
  agentId: string;
  project: string;
  memory: Memory;
  profile: () => { baseUrl: string; model: string; timeoutMs: number };
  key: () => string;
  fetch?: typeof fetch;
  now?: () => number;
}): (sid: string, room: string, text: string, batch?: Message[]) => Promise<DuckTurnResult> {
  const pendingForget = new Map<string, number[]>();
  const now = o.now ?? Date.now;
  return async (sid, room, rawText, batch?: Message[]) => {
    const text = stripLeadingMentions(rawText);
    const confirmationKey = `${sid}\0${room}`;
    const userOnly = !batch || batch.every((message) => message.fromId === null && !message.kind);
    const commandText = userOnly ? stripLeadingMentions(batch?.at(-1)?.text ?? rawText) : '';
    const waiting = pendingForget.get(confirmationKey);
    const confirmation = waiting && userOnly ? deleteConfirmation(commandText) : null;
    if (waiting && confirmation) {
      const ids = confirmation.all ? waiting : waiting.filter((id) => confirmation.ids.includes(id));
      for (const id of ids) {
        try { o.memory.remove(id); } catch (error) {
          pendingForget.delete(confirmationKey);
          return { ok: false, text: '', error: `Không xoá được bộ nhớ M${id}: ${(error as Error).message}`, kind: 'memory' };
        }
      }
      pendingForget.delete(confirmationKey);
      return { ok: true, text: ids.length ? `Đã xoá ${ids.map((id) => `[M${id}]`).join(', ')}.` : 'Không có mục nào được xoá.', error: '' };
    }

    const command = userOnly ? memoryCommand(commandText) : null;
    if (command?.kind === 'remember') {
      try {
        const entry = o.memory.add({
          kind: 'context',
          text: command.text,
          tags: [],
          scope: command.scope,
          ...(command.scope === 'room' ? { room } : { project: o.project }),
          source: 'user',
        });
        return { ok: true, text: `Đã nhớ [M${entry.id}].`, error: '' };
      } catch (error) {
        if (error instanceof Error && isSecretText(command.text)) return { ok: true, text: 'Không lưu: có vẻ là thông tin bí mật.', error: '' };
        return { ok: true, text: `Không lưu được: ${(error as Error).message}`, error: '' };
      }
    }
    if (command?.kind === 'forget') {
      const found = o.memory.relevant(command.query, { room, project: o.project });
      const ids = found.map((entry) => entry.id);
      if (!ids.length) {
        pendingForget.delete(confirmationKey);
        return { ok: true, text: 'Không tìm thấy mục bộ nhớ phù hợp.', error: '' };
      }
      pendingForget.set(confirmationKey, ids);
      const list = found.map((entry) => `[M${entry.id}] ${entry.text}`).join('\n');
      return { ok: true, text: `Các mục phù hợp:\n${list}\nTrả lời “xoá” để xoá tất cả, hoặc “xoá M${ids[0]}” để chọn mục.`, error: '' };
    }

    try {
      const profile = o.profile();
      const key = o.key() || undefined;
      const history = loadHistory(o.home, o.agentId, room);
      const memories = o.memory.relevant(text, { room, project: o.project });
      const response = await chatComplete({
        baseUrl: profile.baseUrl,
        key,
        model: profile.model,
        timeoutMs: profile.timeoutMs,
        fetch: o.fetch,
        messages: buildMessages({ system: DUCK_SYSTEM, memories, history, text }),
      });
      if (!response.ok) return { ok: false, text: '', error: errorText(response), kind: response.kind };
      history.turns.push(
        { role: 'user', text, at: now() },
        { role: 'assistant', text: response.text, at: now() },
      );
      await summarizeOldest({ history, baseUrl: profile.baseUrl, key, model: profile.model, timeoutMs: profile.timeoutMs, fetch: o.fetch });
      let answer = response.text;
      try {
        saveHistory(o.home, o.agentId, room, history);
      } catch (error) {
        answer += `\n\n⚠️ không lưu được bộ nhớ: ${(error as Error).message}`;
      }
      return { ok: true, text: answer, error: '', usage: response.usage };
    } catch (error) {
      return { ok: false, text: '', error: `Duck không xử lý được lượt này: ${(error as Error).message}`, kind: 'memory' };
    }
  };
}

const KEY_FILE = 'agent-keys.json';
const KEY_ID = /^[a-z0-9][a-z0-9-]{0,31}$/;

export function loadAgentKeys(home: string): Record<string, string> {
  const file = path.join(home, KEY_FILE);
  let raw: string;
  try { raw = fs.readFileSync(file, 'utf8'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('agent-keys.json must contain an object');
  const keys: Record<string, string> = {};
  for (const [id, key] of Object.entries(value)) {
    if (KEY_ID.test(id) && typeof key === 'string') keys[id] = key;
  }
  return keys;
}

export function saveAgentKey(home: string, id: string, value: string | null): void {
  if (!KEY_ID.test(id)) throw new Error('agent profile id is invalid');
  if (value !== null && (typeof value !== 'string' || value.length > 4096)) throw new Error('key must be a string up to 4096 characters or null');
  const keys = loadAgentKeys(home);
  const key = value?.trim();
  if (key) keys[id] = key;
  else delete keys[id];
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, KEY_FILE), temp = `${file}.${process.pid}.${nowFilePart()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(keys, null, 2) + '\n', { mode: 0o600 });
  renameRetry(temp, file);
}

export function getAgentKey(home: string, id: string): string {
  return loadAgentKeys(home)[id] ?? '';
}

function nowFilePart(): number { return Date.now(); }
