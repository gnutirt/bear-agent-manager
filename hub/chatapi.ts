/** One OpenAI Chat Completions call, no tools, no retries (Duck plan D3). */
export type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string };

export type ChatResult =
  | { ok: true; text: string; usage: { in: number; out: number } }
  | { ok: false; kind: 'timeout' | 'auth' | 'rate' | 'banned' | 'http' | 'invalid' | 'network'; error: string };

const base = (u: string): string => String(u || '').trim().replace(/\/+$/, '');

const headersFor = (key?: string): Record<string, string> => {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (key) h.authorization = `Bearer ${key}`;
  return h;
};

const isAbort = (e: unknown): boolean => {
  const n = (e as { name?: string } | null)?.name;
  return n === 'TimeoutError' || n === 'AbortError';
};

const reason = (e: unknown): string => String((e as { message?: string } | null)?.message || e || 'unknown');

async function readText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

/** Posts one completion. Never throws; every failure becomes a kind. */
export async function chatComplete(o: {
  baseUrl: string;
  key?: string;
  model: string;
  messages: ChatMsg[];
  timeoutMs: number;
  fetch?: typeof fetch;
}): Promise<ChatResult> {
  const fetcher = o.fetch ?? fetch;
  let payload: string;
  try {
    payload = JSON.stringify({ model: o.model, messages: o.messages, stream: false });
  } catch (e) {
    return { ok: false, kind: 'invalid', error: `không tạo được yêu cầu: ${reason(e)}` };
  }
  let res: Response;
  try {
    res = await fetcher(`${base(o.baseUrl)}/v1/chat/completions`, {
      method: 'POST',
      headers: headersFor(o.key),
      body: payload,
      signal: AbortSignal.timeout(Math.max(1, Number(o.timeoutMs) || 60_000)),
    });
  } catch (e) {
    return isAbort(e)
      ? { ok: false, kind: 'timeout', error: 'quá thời gian chờ trả lời' }
      : { ok: false, kind: 'network', error: `không kết nối được: ${reason(e)}` };
  }
  const text = await readText(res);
  // the order of the checks is the contract: auth first, then an IP ban (any status), then rate, then other statuses
  if (res.status === 401 || res.status === 403) return { ok: false, kind: 'auth', error: `sai hoặc thiếu khoá (HTTP ${res.status})` };
  if (res.status === 418 || /ERR_BN_LIMIT/.test(text)) return { ok: false, kind: 'banned', error: 'duck.ai đã chặn IP này (ERR_BN_LIMIT)' };
  if (res.status === 429) return { ok: false, kind: 'rate', error: 'bị giới hạn tần suất (HTTP 429)' };
  if (!res.ok) return { ok: false, kind: 'http', error: `HTTP ${res.status}` };
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, kind: 'invalid', error: 'phản hồi không hợp lệ (không phải JSON)' };
  }
  const choices = (body as { choices?: { message?: { content?: unknown } }[] } | null)?.choices;
  const content = Array.isArray(choices) ? choices[0]?.message?.content : undefined;
  if (typeof content !== 'string') return { ok: false, kind: 'invalid', error: 'phản hồi không hợp lệ (thiếu nội dung)' };
  const usage = (body as { usage?: { prompt_tokens?: unknown; completion_tokens?: unknown } } | null)?.usage;
  return {
    ok: true,
    text: content,
    usage: {
      in: Math.max(0, Number(usage?.prompt_tokens) || 0),
      out: Math.max(0, Number(usage?.completion_tokens) || 0),
    },
  };
}

/** Reads GET /v1/models. Never throws. */
export async function listModels(o: {
  baseUrl: string;
  key?: string;
  timeoutMs: number;
  fetch?: typeof fetch;
}): Promise<{ ok: boolean; models: string[]; error?: string }> {
  const fetcher = o.fetch ?? fetch;
  let res: Response;
  try {
    res = await fetcher(`${base(o.baseUrl)}/v1/models`, {
      method: 'GET',
      headers: headersFor(o.key),
      signal: AbortSignal.timeout(Math.max(1, Number(o.timeoutMs) || 60_000)),
    });
  } catch (e) {
    return { ok: false, models: [], error: isAbort(e) ? 'quá thời gian chờ trả lời' : `không kết nối được: ${reason(e)}` };
  }
  if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` };
  try {
    const body = JSON.parse(await readText(res));
    const rows = (body as { data?: unknown } | null)?.data;
    if (!Array.isArray(rows)) return { ok: false, models: [], error: 'phản hồi không hợp lệ' };
    const models = rows.map((r) => (r as { id?: unknown } | null)?.id).filter((id): id is string => typeof id === 'string' && !!id);
    return { ok: true, models };
  } catch {
    return { ok: false, models: [], error: 'phản hồi không hợp lệ (không phải JSON)' };
  }
}
