export type SysType = 'relay' | 'usage' | 'wake' | 'compact' | 'task' | 'update' | 'error' | 'backup' | 'tab' | 'lead' | 'info';
export type SysMeta = { type: SysType; level: 'info' | 'warn' | 'error' | 'done'; agent?: string; ref?: number };

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
  kind?: 'done' | 'system'; // done = a member finished its part; system = hub notice (wakes nobody)
  sys?: SysMeta;          // system notices: what kind, how serious, about whom (the UI draws them as compact cards)
  attachments?: { id: string; name: string; mime: string; size: number; sha256: string }[];   // A1: files in rooms/<room>/files/<id>
};

export const LOOP_LIMIT = 30;

const MENTION = /(?:^|[\s(,;])@([A-Za-z0-9_-]+)/g;

export function parseMentions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(MENTION)) {
    const name = m[1].toLowerCase();
    if (!out.includes(name)) out.push(name);
  }
  return out;
}

export function wakes(msg: Message, member: { id: string; name: string }, roomPaused: boolean): boolean {
  if (msg.fromId === member.id) return false;
  const name = member.name.toLowerCase();
  const all = msg.mentions.includes('all');
  if (msg.fromId === null) return msg.mentions.length === 0 || all || msg.mentions.includes(name);
  if (roomPaused) return false;
  return all || msg.mentions.includes(name);
}
