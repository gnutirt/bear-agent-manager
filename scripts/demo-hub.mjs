// Starts a throwaway hub with sample rooms/messages/notes for UI review (never touches ~/.bear-agent-manager).
// Usage: node --no-warnings scripts/demo-hub.mjs [port]   (Ctrl+C to stop)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const port = Number(process.argv[2] ?? 7797);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-demo-hub-'));
const { startHub } = await import(new URL('../hub/server.ts', import.meta.url).href);
// Sample workers: one live congnhanvesinh (fake process table) plus a short history in workers.jsonl.
const t0 = Date.now();
const procs = [
  { pid: 4242, ppid: 1, name: 'powershell.exe', cmd: String.raw`powershell -NoProfile -File C:\u\.claude\skills\congnhan\congnhan.ps1 -PromptFile C:\t\task.txt -Dir D:\work\firmware -Kind vesinh`, started: t0 - 95_000 },
  { pid: 4243, ppid: 4242, name: 'claude.exe', cmd: 'claude.exe -p --bare --model deepseek-v4-flash-0731 --allowedTools Read,Grep,Glob,Bash --output-format json', started: t0 - 94_000 },
];
const log = [
  { event: 'start', id: 'd1', pid: 4242, kind: 'vesinh', dir: 'D:/work/firmware', task: 'Hồ sơ bàn giao cho chat firmware (1.3 MB)', tools: 'Read,Grep,Glob,Bash', by: 'a1b2c3d4-fw', skill: 'congnhanvesinh', ts: t0 - 95_000 },
  { event: 'start', id: 'd2', pid: 11, kind: 'congnhan', dir: 'D:/work/web-dashboard', task: 'Khảo sát chỗ parse /status trong app.js', tools: 'Read,Grep,Glob,Bash', by: 'e5f6a7b8-web', skill: 'congnhan', ts: t0 - 900_000 },
  { event: 'end', id: 'd2', exit: 0, model: 'deepseek-v4-flash-0731', cost: 0.004, result: 'app.js:120 parseStatus()', ts: t0 - 780_000 },
  { event: 'start', id: 'd3', pid: 12, kind: 'congnhan', dir: 'D:/work/mobile-app', task: 'Sửa màn hình cài đặt theo spec', tools: 'Read,Grep,Glob,Bash,Edit,Write', by: 'c9d0e1f2-app', skill: 'congnhan', ts: t0 - 600_000 },
  { event: 'end', id: 'd3', exit: 3, model: 'kimi-k2.6', error: 'QUOTA 429 rate limit', ts: t0 - 540_000 },
];
fs.writeFileSync(path.join(dir, 'workers.jsonl'), log.map((l) => JSON.stringify(l) + '\n').join(''));
const hub = await startHub({ dir, port, listProcs: async () => procs, kill: async (pid) => { procs.length = 0; console.log('kill', pid); } });
const st = hub.store;
const fw = st.register({ id: 'a1b2c3d4-fw', cwd: 'D:/work/firmware' });
const web = st.register({ id: 'e5f6a7b8-web', cwd: 'D:/work/web-dashboard' });
const app = st.register({ id: 'c9d0e1f2-app', cwd: 'D:/work/mobile-app' });
st.setIde(fw.id, 'antigravity'); st.setIde(web.id, 'vscode'); st.setIde(app.id, 'antigravity');
st.rename(app.id, 'mobile');
for (const s of [fw, web, app]) st.join(s.id, 'esp');
st.createRoom('mywork');
st.post('esp', null, '@all chốt giao thức giữa firmware và web, rồi báo tao');
st.post('esp', fw.id, '@web firmware trả `/status` dạng text `temp=23.5`. Đề xuất đổi sang JSON:\n- `{"temp":23.5}`\n- Content-Type: application/json');
st.post('esp', web.id, '@firmware OK, web parse JSON. Chốt **HLP/1** qua `/hlp` cổng 8765.');
st.post('esp', fw.id, '@you Đã chốt với web:\n1. HLP/1 qua /hlp cổng 8765\n2. Beacon UDP 8766\n3. web sở hữu app.js, firmware sở hữu main.c');
st.addNote('esp', fw.id, 'Giao thức HLP/1 qua /hlp, cổng 8765; beacon UDP 8766');
st.addNote('esp', web.id, 'web-dashboard sở hữu app.js; firmware sở hữu main.c');
st.addNote('esp', null, 'Không đụng giao thức HLP khi sửa UI');
st.setLead('esp', fw.id);
st.setStatus(fw.id, 'busy', 'Edit main.c');
st.setStatus(app.id, 'waiting', 'Claude needs your permission to use Bash');
console.log(`demo hub on ${hub.url} (data ${dir})`);
