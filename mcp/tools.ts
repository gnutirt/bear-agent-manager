import type { Message } from '../hub/routing.ts';
import { attachmentLines } from '../shared/format.ts';

export type Api = <T = any>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;
type PublicSession = { id: string; name: string; cwd: string; rooms: string[]; status: string; activity: string };
type RoomInfo = { name: string; paused: boolean; members: string[]; lead?: string | null; cwd?: string };

const obj = (properties: Record<string, object>, required: string[] = []) =>
  ({ type: 'object', properties, required, additionalProperties: false });

export const TOOLS = [
  { name: 'room_who', description: 'Show your bear-agent-manager name, the rooms you are in, and each member with status (busy/idle/waiting/offline), current activity and repo folder. Also lists other rooms.', inputSchema: obj({}) },
  { name: 'room_join', description: 'Join an bear-agent-manager chat room (created if missing). Room names: lowercase letters, digits, - and _.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_leave', description: 'Leave an bear-agent-manager chat room.', inputSchema: obj({ room: { type: 'string' } }, ['room']) },
  { name: 'room_send', description: 'Post a message to a room. @name wakes that agent, @all wakes everyone, @you addresses the human user. A message with no mention wakes nobody (others see it later as context). Start the text with ~ to post a status line that wakes nobody even if it contains @ (it is still stored and visible in room_read).', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' }, replyTo: { type: 'number', description: 'Id of the message you answer (shown as #id in deliveries); it must be in the same room' }, topic: { type: 'string', description: 'Sub-topic of the room, [a-z0-9-]{1,32}; default chung. Only members who follow a topic (sent into it, were @-ed in it, or follow it) get its messages in full. A reply stays in its original topic.' }, attachments: { type: 'array', items: { type: 'string' }, description: 'Absolute paths of files on this machine to attach (screenshots, logs, PDFs; max 20, 25 MB each). The hub copies them into the room; others get a 📎 line with the path and open it with Read only if needed.' } }, ['text']) },
  { name: 'room_read', description: 'Read recent messages of a room.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, limit: { type: 'number', description: 'Default 30, max 200' }, topic: { type: 'string', description: 'Only this topic (default: every topic)' } }) },
  { name: 'room_topics', description: 'List the topics of a room with message counts and whether you follow them; pass topic and follow to follow or unfollow one. Messages in topics you do not follow reach you as a one-line count.', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' }, topic: { type: 'string' }, follow: { type: 'boolean', description: 'true to follow, false to unfollow' } }) },
  { name: 'room_tasks', description: 'The task list of a room (work is handed out one task at a time). action "list" (optional status todo|doing|blocked|done, owner), "next" (take the next todo task assigned to you and mark it doing), "update" (id plus status, note, commit; you can only change your own tasks; the room lead can also change owner, title, detail, doneWhen of any task), "add" (room lead only: title, optional detail, doneWhen, fromMsg = id of the owner\'s message, owner = member name to assign it to, after = ids of tasks it waits for: it stays blocked until all are done, then the hub makes it todo and wakes the owner). When you finish a task set status done with the git commit hash.', inputSchema: obj({ action: { type: 'string', description: 'list | next | update | add' }, room: { type: 'string', description: 'Defaults to your only room' }, id: { type: 'number' }, title: { type: 'string' }, detail: { type: 'string' }, doneWhen: { type: 'string' }, fromMsg: { type: 'number' }, owner: { type: 'string' }, after: { type: 'array', items: { type: 'number' }, description: 'Add: task ids this one waits for' }, status: { type: 'string' }, note: { type: 'string' }, commit: { type: 'string' } }, ['action']) },
  { name: 'local_summarize', description: 'Ask the small AI that runs on this machine (off unless the owner turned it on) to summarize a file of YOUR repo folder, or to write a commit message from a diff, so you read a few lines instead of the whole text. task "summary" (default) or "commit". Pass file (path relative to your folder) or text. Quality is that of a 7B model: fine for gist and logs, never rely on it for legal text or numbers.', inputSchema: obj({ task: { type: 'string', description: 'summary | commit' }, file: { type: 'string', description: 'Relative path inside your repo folder' }, text: { type: 'string', description: 'Text to work on when there is no file (e.g. a diff)' } }) },
  { name: 'room_set_name', description: 'Set your display name in bear-agent-manager (what others @mention). Letters, digits, - and _; max 32.', inputSchema: obj({ name: { type: 'string' } }, ['name']) },
  { name: 'room_note', description: 'Record a lasting agreement in the room notes ("biên bản"): API contracts, ports, file ownership, decisions. Every member, in any repo, receives the notes when they change. Keep each note one fact.', inputSchema: obj({ text: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['text']) },
  { name: 'room_notes', description: 'Read the room notes (agreements the room relies on).', inputSchema: obj({ room: { type: 'string', description: 'Defaults to your only room' } }) },
  { name: 'room_note_remove', description: 'Remove an outdated room note by its number.', inputSchema: obj({ id: { type: 'number' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['id']) },
  { name: 'room_done', description: 'Report that your part of the current task is finished, with a one-line summary. The room lead (if any) is notified; when every member is done the room tells the user once. Use this instead of chatty "done" messages.', inputSchema: obj({ summary: { type: 'string' }, room: { type: 'string', description: 'Defaults to your only room' } }, ['summary']) },
  { name: 'room_commit', description: 'Commit only the listed paths inside this session folder. Remote agents may commit only files they edited. Use this instead of running git commit; returns the commit hash and line counts.', inputSchema: obj({ paths: { type: 'array', items: { type: 'string' }, description: 'Repo-relative paths inside this session folder' }, message: { type: 'string', description: 'Commit message' } }, ['paths', 'message']) },
];

type Note = { id: number; text: string; by: string };
const noteLines = (notes: Note[]) => notes.map((n) => `  [${n.id}] ${n.text} (${n.by})`);

const enc = encodeURIComponent;
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const gotType = (value: unknown) =>
  value === undefined ? 'nothing' : value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;

/**
 * A string tool argument. `null` and every other type are a caller bug: the tool says so instead of publishing
 * "[object Object]" into a room (C2 in room_send; the same hole was in room_note, room_done and room_set_name, where a
 * number even renamed the agent). `undefined` is left to the call site: a missing text has a documented meaning ('' for
 * send/note/done), a missing name has none.
 */
function stringArg(tool: string, arg: string, value: unknown): string {
  if (typeof value === 'string') return value;
  throw new Error(`${tool} needs "${arg}" as a string; got ${gotType(value)}. Send the string itself, not an object or a number.`);
}

/** An optional string: absent stays absent (the call site keeps its documented default). */
const optString = (tool: string, arg: string, value: unknown): string | undefined =>
  value === undefined ? undefined : stringArg(tool, arg, value);

/** A number argument; a numeric string is accepted (models send them), anything else is a caller bug. */
function numberArg(tool: string, arg: string, value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(n)) throw new Error(`${tool} needs "${arg}" as a number; got ${gotType(value)}.`);
  return n;
}

const optNumber = (tool: string, arg: string, value: unknown): number | undefined =>
  value === undefined ? undefined : numberArg(tool, arg, value);

/** An array of strings (paths, attachments): one non-string item poisons the whole body downstream. */
function stringList(tool: string, arg: string, value: unknown, required: boolean): string[] {
  if (value === undefined) {
    if (required) throw new Error(`${tool} needs "${arg}" as an array of strings; got nothing.`);
    return [];
  }
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new Error(`${tool} needs "${arg}" as an array of strings; got ${Array.isArray(value) ? 'a non-string item' : gotType(value)}.`);
  }
  return value as string[];
}

function numberList(tool: string, arg: string, value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${tool} needs "${arg}" as an array of numbers; got ${gotType(value)}.`);
  return value.map((v) => numberArg(tool, arg, v));
}

export async function callTool(api: Api, sid: string, name: string, args: Record<string, unknown>): Promise<string> {
  const me = async () => (await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}`)).session;
  const pickRoom = async (tool: string, room: unknown): Promise<string> => {
    // An object or a number used to fall through to the default room: the call would land somewhere the caller never asked for.
    if (typeof room === 'string') { if (room) return room; }
    else if (room !== undefined) throw new Error(`${tool} needs "room" as a string; got ${gotType(room)}.`);
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
        lines.push(`#${r.name}${r.paused ? ' (paused by loop guard)' : ''}${r.cwd ? ` (working folder: ${r.cwd})` : ''}:`);
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
      const r = await api<RoomInfo>(`/api/rooms/${enc(stringArg('room_join', 'room', args.room))}/join`, { body: { sessionId: sid } });
      const notes = await api<Note[]>(`/api/rooms/${enc(r.name)}/notes`);
      return [`Joined #${r.name} (${r.members.length} member${r.members.length === 1 ? '' : 's'}). Messages that mention you will wake you automatically.`,
        ...(notes.length ? ['Room notes:', ...noteLines(notes)] : [])].join('\n');
    }
    case 'room_leave': {
      const room = stringArg('room_leave', 'room', args.room);
      await api(`/api/rooms/${enc(room)}/leave`, { body: { sessionId: sid } });
      return `Left #${room}.`;
    }
    case 'room_send': {
      // A missing text stays '' on purpose: an attachments-only message is legal (the hub answers "empty message" when
      // there is nothing at all).
      const text = args.text === undefined ? '' : stringArg('room_send', 'text', args.text);
      const room = await pickRoom('room_send', args.room);
      const replyTo = optNumber('room_send', 'replyTo', args.replyTo);
      const topic = optString('room_send', 'topic', args.topic);
      const attachPaths = stringList('room_send', 'attachments', args.attachments, false);
      const r = await api<{ message: Message; unknownMentions: string[]; paused: boolean }>(
        `/api/rooms/${enc(room)}/messages`, { body: { sessionId: sid, text, ...(replyTo != null ? { replyTo } : {}), ...(topic ? { topic } : {}), ...(attachPaths.length ? { attachPaths } : {}) } });
      let out = `Sent to #${room}.`;
      if (r.paused) out += ' The room is paused by the loop guard, so nobody was woken; wait for the user.';
      else if (r.message.wake.length) out += ` Woke ${r.message.wake.length} member(s).`;
      else if (!r.message.mentions.length) out += ' No one was mentioned, so no one was woken.';
      if (r.unknownMentions.length) out += ` Warning: no member named ${r.unknownMentions.map((n) => '@' + n).join(', ')} in #${room}.`;
      return out;
    }
    case 'room_read': {
      const room = await pickRoom('room_read', args.room);
      const topic = optString('room_read', 'topic', args.topic);
      const limit = Math.max(1, Math.min(optNumber('room_read', 'limit', args.limit) ?? 30, 200));
      const msgs = await api<Message[]>(`/api/rooms/${enc(room)}/messages?limit=${limit}${topic ? '&topic=' + enc(topic) : ''}`);
      if (!msgs.length) return `#${room} has no messages yet.`;
      return [`#${room}, last ${msgs.length}:`, ...msgs.flatMap((m) => [`[${time(m.ts)}] ${m.from}: ${m.text}`, ...attachmentLines(m)])].join('\n');
    }
    case 'room_topics': {
      const room = await pickRoom('room_topics', args.room);
      const topic = optString('room_topics', 'topic', args.topic);
      // Used to be silent: `follow` was ignored without a topic (a plain list came back) and a string "true" was ignored
      // too, so a caller thought it had subscribed when it had not.
      if (args.follow !== undefined && typeof args.follow !== 'boolean') throw new Error(`room_topics needs "follow" as a boolean; got ${gotType(args.follow)}.`);
      if (args.follow !== undefined && !topic) throw new Error('room_topics needs "topic" with "follow".');
      if (topic && args.follow === undefined) throw new Error('room_topics: pass "follow" (true or false) with "topic".');
      if (topic && typeof args.follow === 'boolean') {
        await api(`/api/rooms/${enc(room)}/topics`, { body: { sessionId: sid, topic, follow: args.follow } });
        return `${args.follow ? 'Following' : 'Unfollowed'} topic #${topic} in #${room}.`;
      }
      const list = await api<{ topic: string; count: number; follows: boolean }[]>(`/api/rooms/${enc(room)}/topics?session=${enc(sid)}`);
      return [`Topics of #${room}:`, ...list.map((t) => `  ${t.topic}: ${t.count} message(s)${t.follows ? ', you follow it' : ''}`)].join('\n');
    }
    case 'room_tasks': {
      const room = await pickRoom('room_tasks', args.room);
      type T = { id: number; title: string; detail?: string; doneWhen?: string; fromMsg?: number; owner?: string; after?: number[]; status: string; commit?: string; note?: string };
      const line = (t: T) => `  #${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}${t.commit ? ` · ${t.commit.slice(0, 9)}` : ''}`;
      const full = (t: T) => [`#${t.id} [${t.status}] ${t.title}${t.owner ? ` (${t.owner})` : ''}`, ...(t.detail ? [t.detail] : []), ...(t.doneWhen ? [`Done when: ${t.doneWhen}`] : []), ...(t.fromMsg ? [`Source message #${t.fromMsg} (room_read to see it)`] : [])].join('\n');
      const action = args.action === undefined ? 'list' : stringArg('room_tasks', 'action', args.action);
      // The hub clips and stores these as strings, so a wrong type used to land in the task list as "[object Object]"
      // (or, for an array of one name, silently as that name). Validate before anything is written.
      const s = (k: string) => (args[k] === undefined ? undefined : stringArg('room_tasks', k, args[k]));
      if (action === 'list') {
        const q = new URLSearchParams();
        const status = optString('room_tasks', 'status', args.status);
        const owner = optString('room_tasks', 'owner', args.owner);
        if (status) q.set('status', status);
        if (owner) q.set('owner', owner);
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
        const t = await api<T>(`/api/rooms/${enc(room)}/tasks`, { body: { sessionId: sid, title: stringArg('room_tasks', 'title', args.title), detail: s('detail'), doneWhen: s('doneWhen'), fromMsg: optNumber('room_tasks', 'fromMsg', args.fromMsg), owner: s('owner'), after: numberList('room_tasks', 'after', args.after) } });
        return `Added task #${t.id}${t.owner ? ` for ${t.owner}` : ''}${t.after?.length ? `, waiting for ${t.after.map((n) => `#${n}`).join(', ')} (${t.status})` : ''}.`;
      }
      if (action === 'update') {
        const t = await api<T>(`/api/rooms/${enc(room)}/tasks/${numberArg('room_tasks', 'id', args.id)}`, { body: { sessionId: sid, status: s('status'), note: s('note'), commit: s('commit'), owner: s('owner'), title: s('title'), detail: s('detail'), doneWhen: s('doneWhen') } });
        return `Task #${t.id} is now ${t.status}${args.owner !== undefined && t.owner ? ` (${t.owner})` : ''}.`;
      }
      throw new Error('action must be list, next, update or add');
    }
    case 'local_summarize': {
      const r = await api<{ text: string; model: string; ms: number }>('/api/local/summarize', { body: { sessionId: sid, task: optString('local_summarize', 'task', args.task), file: optString('local_summarize', 'file', args.file), text: optString('local_summarize', 'text', args.text) } });
      return `${r.text}\n\n(local model ${r.model}, ${Math.round(r.ms / 1000)} s; a small model: check anything that matters)`;
    }
    case 'room_set_name': {
      // Required in the schema, and an absent name has no meaning: it is refused like a wrong type (before, `42`
      // quietly became the agent's new name and `{a:1}` came back as a confusing "name must be 1-32 letters" error).
      const name = stringArg('room_set_name', 'name', args.name);
      const r = await api<{ session: PublicSession }>(`/api/sessions/${enc(sid)}/rename`, { body: { name } });
      return `Your bear-agent-manager name is now "${r.session.name}".`;
    }
    case 'room_note': {
      // A missing text stays '': the hub answers "empty note".
      const text = args.text === undefined ? '' : stringArg('room_note', 'text', args.text);
      const room = await pickRoom('room_note', args.room);
      const n = await api<Note>(`/api/rooms/${enc(room)}/notes`, { body: { sessionId: sid, text } });
      return `Saved note [${n.id}] in #${room}. All members get it with their next delivery.`;
    }
    case 'room_notes': {
      const room = await pickRoom('room_notes', args.room);
      const notes = await api<Note[]>(`/api/rooms/${enc(room)}/notes`);
      return notes.length ? [`Room notes #${room}:`, ...noteLines(notes)].join('\n') : `#${room} has no notes yet.`;
    }
    case 'room_note_remove': {
      const room = await pickRoom('room_note_remove', args.room);
      const id = numberArg('room_note_remove', 'id', args.id);
      await api(`/api/rooms/${enc(room)}/notes/${id}/delete`, { body: {} });
      return `Removed note [${id}] from #${room}.`;
    }
    case 'room_done': {
      // A missing summary stays '': the hub fills in its default "done" text.
      const summary = args.summary === undefined ? '' : stringArg('room_done', 'summary', args.summary);
      const room = await pickRoom('room_done', args.room);
      const r = await api<{ message: Message; allDone: Message | null }>(`/api/rooms/${enc(room)}/done`, { body: { sessionId: sid, summary } });
      return r.allDone ? `Marked done in #${room}. The whole room is done; the user has been told. Stop here.` : `Marked done in #${room}. Stop here unless someone mentions you.`;
    }
    case 'room_commit': {
      // A non-string message used to become the commit subject "[object Object]" (the hub String()s it), and a paths
      // value that is not a list of strings reached the git layer as-is.
      const paths = stringList('room_commit', 'paths', args.paths, true);
      if (!paths.length) throw new Error('room_commit needs at least one path in "paths".');
      const r = await api<{ commit: string; paths: string[]; insertions: number; deletions: number }>(`/api/sessions/${enc(sid)}/room-commit`, { body: { paths, message: stringArg('room_commit', 'message', args.message) } });
      return `Committed ${r.commit} (+${r.insertions}/-${r.deletions} lines):\n${r.paths.map((p) => `  ${p}`).join('\n')}`;
    }
    default:
      throw new Error(`unknown tool ${name}`);
  }
}
