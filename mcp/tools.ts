import type { Message } from '../hub/routing.ts';

export type Api = <T = any>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: string; activity: string };
type RoomInfo = { name: string; paused: boolean; members: string[]; lead?: string | null };

const obj = (properties: Record<string, object>, required: string[] = []) =>
  ({ type: 'object', properties, required, additionalProperties: false });

export const TOOLS = [
  { name: 'room_who', description: 'Show your bear-agent-manager name, the rooms you are in, and each member with status (busy/idle/waiting/offline), current activity and repo folder. Also lists other rooms.', inputSchema: obj({}) },
  { name: 'room_join', description: 'Join an bear-agent-manager chat room (created if missing). Room names: lowercase letters, digits, - and _.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_leave', description: 'Leave an bear-agent-manager chat room.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_send', description: 'Post a message to a room. @name wakes that agent, @all wakes everyone, @you addresses the human user. A message with no mention wakes nobody (others see it later as context).', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['text']) },
  { name: 'room_read', description: 'Read recent messages of a room.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, limit: { type: 'number', description: 'Default 30, max 200' } }) },
  { name: 'room_set_name', description: 'Set your display name in bear-agent-manager (what others @mention). Letters, digits, - and _; max 32.', inputSchema: obj({ name: { type: 'string' } }, ['name']) },
  { name: 'room_note', description: 'Record a lasting agreement in the room notes ("biên bản"): API contracts, ports, file ownership, decisions. Every member, in any repo, receives the notes when they change. Keep each note one fact.', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['text']) },
  { name: 'room_notes', description: 'Read the room notes (agreements the room relies on).', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' } }) },
  { name: 'room_note_remove', description: 'Remove an outdated room note by its number.', inputSchema: obj({ id: { type: 'number' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['id']) },
  { name: 'room_done', description: 'Report that your part of the current task is finished, with a one-line summary. The room lead (if any) is notified; when every member is done the room tells the user once. Use this instead of chatty "done" messages.', inputSchema: obj({ summary: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['summary']) },
];

type Note = { id: number; text: string; by: string };
const noteLines = (notes: Note[]) => notes.map((n) => `  [${n.id}] ${n.text} (${n.by})`);

const enc = encodeURIComponent;
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export async function callTool(api: Api, sid: string, name: string, args: Record<string, unknown>): Promise<string> {
  const me = async () => (await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}`)).session;
  const pickRoom = async (room: unknown): Promise<string> => {
    if (typeof room === 'string' && room) return room;
    const s = await me();
    if (s.rooms.length === 1) return s.rooms[0];
    if (!s.rooms.length) throw new Error('You are not in any room. Use room_join first.');
    throw new Error(`You are in several rooms (${s.rooms.map((r) => '#' + r).join(', ')}); pass "room".`);
  };

  switch (name) {
    case 'room_who': {
      const [s, rooms, sessions] = await Promise.all([me(), api<RoomInfo[]>('/api/rooms'), api<PublicSession[]>('/api/sessions')]);
      const byId = new Map(sessions.map((x) => [x.id, x]));
      const lines = [`You are "${s.name}".`];
      for (const r of rooms.filter((x) => s.rooms.includes(x.name))) {
        lines.push(`#${r.name}${r.paused ? ' (paused by loop guard)' : ''}:`);
        for (const id of r.members) {
          const m = byId.get(id);
          if (m) lines.push(`  ${m.id === r.lead ? '★ ' : ''}${m.name}${m.id === r.lead ? ' (lead)' : ''}${m.id === s.id ? ' (you)' : ''} — ${m.status}${m.activity ? ' · ' + m.activity : ''} — ${m.cwd}`);
        }
      }
      if (!s.rooms.length) lines.push('You are not in any room yet.');
      const others = rooms.filter((x) => !s.rooms.includes(x.name)).map((x) => '#' + x.name);
      if (others.length) lines.push(`Other rooms: ${others.join(', ')}`);
      return lines.join('\n');
    }
    case 'room_join': {
      const r = await api<RoomInfo>(`/api/rooms/${enc(String(args.room ?? ''))}/join`, { body: { sessionId: sid } });
      const notes = await api<Note[]>(`/api/rooms/${enc(r.name)}/notes`);
      return [`Joined #${r.name} (${r.members.length} member${r.members.length === 1 ? '' : 's'}). Messages that mention you will wake you automatically.`,
        ...(notes.length ? ['Room notes:', ...noteLines(notes)] : [])].join('\n');
    }
    case 'room_leave': {
      await api(`/api/rooms/${enc(String(args.room ?? ''))}/leave`, { body: { sessionId: sid } });
      return `Left #${args.room}.`;
    }
    case 'room_send': {
      const room = await pickRoom(args.room);
      const r = await api<{ message: Message; unknownMentions: string[]; paused: boolean }>(
        `/api/rooms/${enc(room)}/messages`, { body: { sessionId: sid, text: String(args.text ?? '') } });
      let out = `Sent to #${room}.`;
      if (r.paused) out += ' The room is paused by the loop guard, so nobody was woken; wait for the user.';
      else if (r.message.wake.length) out += ` Woke ${r.message.wake.length} member(s).`;
      else if (!r.message.mentions.length) out += ' No one was mentioned, so no one was woken.';
      if (r.unknownMentions.length) out += ` Warning: no member named ${r.unknownMentions.map((n) => '@' + n).join(', ')} in #${room}.`;
      return out;
    }
    case 'room_read': {
      const room = await pickRoom(args.room);
      const limit = Math.max(1, Math.min(Number(args.limit ?? 30), 200));
      const msgs = await api<Message[]>(`/api/rooms/${enc(room)}/messages?limit=${limit}`);
      if (!msgs.length) return `#${room} has no messages yet.`;
      return [`#${room}, last ${msgs.length}:`, ...msgs.map((m) => `[${time(m.ts)}] ${m.from}: ${m.text}`)].join('\n');
    }
    case 'room_set_name': {
      const r = await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}/rename`, { body: { name: String(args.name ?? '') } });
      return `Your bear-agent-manager name is now "${r.session.name}".`;
    }
    case 'room_note': {
      const room = await pickRoom(args.room);
      const n = await api<Note>(`/api/rooms/${enc(room)}/notes`, { body: { sessionId: sid, text: String(args.text ?? '') } });
      return `Saved note [${n.id}] in #${room}. All members get it with their next delivery.`;
    }
    case 'room_notes': {
      const room = await pickRoom(args.room);
      const notes = await api<Note[]>(`/api/rooms/${enc(room)}/notes`);
      return notes.length ? [`Room notes #${room}:`, ...noteLines(notes)].join('\n') : `#${room} has no notes yet.`;
    }
    case 'room_note_remove': {
      const room = await pickRoom(args.room);
      await api(`/api/rooms/${enc(room)}/notes/${Number(args.id)}/delete`, { body: {} });
      return `Removed note [${Number(args.id)}] from #${room}.`;
    }
    case 'room_done': {
      const room = await pickRoom(args.room);
      const r = await api<{ message: Message; allDone: Message | null }>(`/api/rooms/${enc(room)}/done`, { body: { sessionId: sid, summary: String(args.summary ?? '') } });
      return r.allDone ? `Marked done in #${room}. The whole room is done; the user has been told. Stop here.` : `Marked done in #${room}. Stop here unless someone mentions you.`;
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}
