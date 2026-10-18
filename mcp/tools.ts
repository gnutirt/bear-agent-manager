import type { Message } from '../hub/routing.ts';
import { attachmentLines } from '../shared/format.ts';

export type Api = <T = any>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: string; activity: string };
type RoomInfo = { name: string; paused: boolean; members: string[]; lead?: string | null };

const obj = (properties: Record<string, object>, required: string[] = []) =>
  ({ type: 'object', properties, required, additionalProperties: false });

export const TOOLS = [
  { name: 'room_who', description: 'Show your bear-agent-manager name, the rooms you are in, and each member with status (busy/idle/waiting/offline), current activity and repo folder. Also lists other rooms.', inputSchema: obj({}) },
  { name: 'room_join', description: 'Join an bear-agent-manager chat room (created if missing). Room names: lowercase letters, digits, - and _.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_leave', description: 'Leave an bear-agent-manager chat room.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_send', description: 'Post a message to a room. @name wakes that agent, @all wakes everyone, @you addresses the human user. A message with no mention wakes nobody (others see it later as context).', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' }, replyTo: { type: 'number', description: 'Id of the message you answer (shown as #id in deliveries); it must be in the same room' }, topic: { type: 'string', description: 'Sub-topic of the room, [a-z0-9-]{1,32}; default chung. Only members who follow a topic (sent into it, were @-ed in it, or follow it) get its messages in full. A reply stays in its original topic.' }, attachments: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of files on this machine to attach (screenshots, logs, PDFs; max 20, 25 MB each). The hub copies them into the room; others get a 📎 line with the path and open it with Read only if needed.' } }, ['text']) },
  { name: 'room_read', description: 'Read recent messages of a room.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, limit: { type: 'number', description: 'Default 30, max 200' }, topic: { type: 'string', description: 'Only this topic (default: every topic)' } }) },
  { name: 'room_topics', description: 'List the topics of a room with message counts and whether you follow them; pass topic and follow to follow or unfollow one. Messages in topics you do not follow reach you as a one-line count.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, topic: { type: 'string' }, follow: { type: 'boolean', description: 'true to follow, false to unfollow' } }) },
  { name: 'room_tasks', description: 'The task list of a room (work is handed out one task at a time). action "list" (optional status todo|doing|blocked|done, owner), "next" (take the next todo task assigned to you and mark it doing), "update" (id plus status, note, commit; you can only change your own tasks), "add" (room lead only: title, optional detail, doneWhen, fromMsg = id of the owner\'s message, owner = member name to assign it to). When you finish a task set status done with the git commit hash.', inputSchema: obj({ action: { type: 'string', description: 'list | next | update | add' }, room: { type: 'string', description: 'Defaults to your only room' }, id: { type: 'number' }, title: { type: 'string' }, detail: { type: 'string' }, doneWhen: { type: 'string' }, fromMsg: { type: 'number' }, owner: { type: 'string' }, status: { type: 'string' }, note: { type: 'string' }, commit: { type: 'string' } }, ['action']) },
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
        `/api/rooms/${enc(room)}/messages`, { body: { sessionId: sid, text: String(args.text ?? ''), ...(args.replyTo != null ? { replyTo: Number(args.replyTo) } : {}), ...(args.topic ? { topic: String(args.topic) } : {}), ...(Array.isArray(args.attachments) && args.attachments.length ? { attachPaths: args.attachments.map(String) } : {}) } });
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
      const msgs = await api<Message[]>(`/api/rooms/${enc(room)}/messages?limit=${limit}${args.topic ? '&topic=' + enc(String(args.topic)) : ''}`);
      if (!msgs.length) return `#${room} has no messages yet.`;
      return [`#${room}, last ${msgs.length}:`, ...msgs.flatMap((m) => [`[${time(m.ts)}] ${m.from}: ${m.text}`, ...attachmentLines(m)])].join('\n');
    }
    case 'room_topics': {
      const room = await pickRoom(args.room);
      if (args.topic && typeof args.follow === 'boolean') {
        await api(`/api/rooms/${enc(room)}/topics`, { body: { sessionId: sid, topic: String(args.topic), follow: args.follow } });
        return `${args.follow ? 'Following' : 'Unfollowed'} topic #${args.topic} in #${room}.`;
      }
      const list = await api<{ topic: string; count: number; follows: boolean }[]>(`/api/rooms/${enc(room)}/topics?session=${enc(sid)}`);
      return [`Topics of #${room}:`, ...list.map((t) => `  ${t.topic}: ${t.count} message(s)${t.follows ? ', you follow it' : ''}`)].join('\n');
    }
    case 'room_tasks': {
      const room = await pickRoom(args.room);
      type T = { id: number; title: string; detail?: string; doneWhen?: string; fromMsg?: number; owner?: string; status: string; commit?: string; note?: string };
      const line = (t: T) => `  #${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}${t.commit ? ` · ${t.commit.slice(0, 9)}` : ''}`;
      const full = (t: T) => [`#${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}`, ...(t.detail ? [t.detail] : []), ...(t.doneWhen ? [`Done when: ${t.doneWhen}`] : []), ...(t.fromMsg ? [`Source message #${t.fromMsg} (room_read to see it)`] : [])].join('\n');
      const action = String(args.action ?? 'list');
      if (action === 'list') {
        const q = new URLSearchParams();
        if (args.status) q.set('status', String(args.status));
        if (args.owner) q.set('owner', String(args.owner));
        const list = await api<T[]>(`/api/rooms/${enc(room)}/tasks?${q}`);
        return list.length ? [`Tasks of #${room}:`, ...list.map(line)].join('\n') : `#${room} has no tasks${q.size ? ' matching that' : ' yet'}.`;
      }
      if (action === 'next') {
        const mine = (await me()).name;
        const todo = await api<T[]>(`/api/rooms/${enc(room)}/tasks?status=todo&owner=${enc(mine)}`);
        if (!todo.length) return 'No task is waiting for you.';
        const t = await api<T>(`/api/rooms/${enc(room)}/tasks/${todo[0].id}`, { body: { sessionId: sid, status: 'doing' } });
        return `Your next task (now doing):\n${full(t)}`;
      }
      if (action === 'add') {
        const t = await api<T>(`/api/rooms/${enc(room)}/tasks`, { body: { sessionId: sid, title: args.title, detail: args.detail, doneWhen: args.doneWhen, fromMsg: args.fromMsg, owner: args.owner } });
        return `Added task #${t.id}${t.owner ? ` for ${t.owner}` : ''}.`;
      }
      if (action === 'update') {
        const t = await api<T>(`/api/rooms/${enc(room)}/tasks/${Number(args.id)}`, { body: { sessionId: sid, status: args.status, note: args.note, commit: args.commit } });
        return `Task #${t.id} is now ${t.status}.`;
      }
      throw new Error('action must be list, next, update or add');
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
