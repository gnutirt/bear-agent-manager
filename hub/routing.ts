export type SysType = 'relay' | 'usage' | 'wake' | 'compact' | 'task' | 'update' | 'error' | 'backup' | 'tab' | 'lead' | 'info';
export type SysMeta = { type: SysType; level: 'info' | 'warn' | 'error' | 'done'; agent?: string; ref?: number; action?: { kind: 'switch'; session: string; to: string } };

export type Message = {
  id: number;
  room: string;
  from: string;          // sender display name, 'you' for the human
  fromId: string | null; // sender session id, null for the human
  mentions: string[];    // lower-cased names, may include 'all' / 'you'
  text: string;
  ts: number;
  wake: string[];        // session ids this message woke (decided at post time)
  topic?: string;        // sub-topic of the room ([a-z0-9-]{1,32}); missing = 'chung'
  replyTo?: number;      // id of an earlier message in the same room this one answers
  replyQuote?: { from: string; text: string }; // that message's sender and first 80 chars, kept so deliveries need no lookup
  kind?: 'done' | 'system' | 'mirror'; // done = a member finished its part; system = hub notice (wakes nobody); mirror = a tab turn copied into the agent's private chat (wakes nobody, never delivered)
  sys?: SysMeta;          // system notices: what kind, how serious, about whom (the UI draws them as compact cards)
  attachments?: { id: string; name: string; mime: string; size: number; sha256: string }[];   // A1: files in rooms/<room>/files/<id>
  research?: { urls: string[]; accessedAt: number }; // Muse provenance, saved only when the user asks
};

export const LOOP_LIMIT = 30;

// Any non-word, non-path char before @ counts, so markdown like **@name** or `@name` still mentions; a@b.com and x/@y do not.
// Fenced code blocks are stripped first: example code or pasted snippets must not wake anyone by accident.
const FENCE = /```[\s\S]*?```/g;
const MENTION = /(?:^|[^A-Za-z0-9_.\-/@])@([A-Za-z0-9_-]+)/g;

export function parseMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.replace(FENCE, ' ').matchAll(MENTION)) {
    const name = m[1].toLowerCase();
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export function wakes(msg: Message, member: { id: string; name: string; kind?: string }, roomPaused: boolean): boolean {
  if (msg.fromId === member.id) return false;
  const name = member.name.toLowerCase();
  if (member.kind === 'duck') {
    // #293b: a private chat is addressed at its owner by construction, so the user need not @ the duck there;
    // in shared rooms the duck still speaks only when named.
    return msg.mentions.includes(name) || msg.room.startsWith('dm-');
  }
  const all = msg.mentions.includes('all');
  if (msg.fromId === null) return msg.mentions.length === 0 || all || msg.mentions.includes(name);
  if (roomPaused) return false;
  // #165: `all` is the user's broadcast. An agent may write the word (it stays in the text and in `mentions`) but it
  // wakes nobody by itself; only an explicit @name in that same message wakes its addressee.
  return msg.mentions.includes(name);
}
