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
  { event: 'end', id: 'd2', exit: 0, model: 'deepseek-v4-flash-0731', cost: 0.004, result: 'app.js:120 parseStatus()', provider: 'intern', tier: 'free', usage: { in: 182_400, out: 3_100, cacheRead: 40_000, cacheWrite: 0 }, ts: t0 - 780_000 },
  { event: 'start', id: 'd3', pid: 12, kind: 'congnhan', dir: 'D:/work/mobile-app', task: 'Sửa màn hình cài đặt theo spec', tools: 'Read,Grep,Glob,Bash,Edit,Write', by: 'c9d0e1f2-app', skill: 'congnhan', ts: t0 - 600_000 },
  { event: 'end', id: 'd3', exit: 3, model: 'kimi-k2.6', error: 'QUOTA 429 rate limit', provider: 'intern', tier: 'free', ts: t0 - 540_000 },
  { event: 'start', id: 'd4', pid: 13, kind: 'osin', dir: 'C:/hub/autojobs/digest_esp_12', task: 'digest: #esp tin 12', tools: 'none', by: 'hub', skill: 'osin', ts: t0 - 300_000 },
  { event: 'end', id: 'd4', exit: 0, model: 'deepseek-v4-flash-0731', result: 'Tóm tắt 9 dòng', provider: 'intern-2', tier: 'free', usage: { in: 6_200, out: 410, cacheRead: 0, cacheWrite: 0 }, ts: t0 - 280_000 },
  { event: 'start', id: 'd5', pid: 14, kind: 'worker', dir: 'D:/work/firmware', task: 'Viết lại driver SPI theo datasheet', tools: 'Read,Grep,Glob,Bash,Edit,Write', by: 'a1b2c3d4-fw', skill: 'worker', ts: t0 - 7_200_000 },
  { event: 'end', id: 'd5', exit: 0, model: 'anthropic/claude-haiku', result: 'spi.c viết lại, test pass', provider: 'openrouter', tier: 'paid', usage: { in: 95_000, out: 12_400, cacheRead: 0, cacheWrite: 0 }, ts: t0 - 6_600_000 },
];
// A week of past runs for the Token tab chart.
for (let day = 1; day <= 6; day++) {
  const ts = t0 - day * 86_400_000, paid = day % 3 === 0;
  log.push({ event: 'start', id: 'h' + day, pid: 100 + day, kind: day % 2 ? 'worker' : 'osin', dir: 'D:/work/firmware', task: 'Khảo sát ngày ' + day, tools: 'Read', by: 'a1b2c3d4-fw', skill: 'worker', ts },
    { event: 'end', id: 'h' + day, exit: day === 4 ? 1 : 0, model: paid ? 'anthropic/claude-haiku' : 'deepseek-v4-flash-0731', provider: paid ? 'openrouter' : 'intern', tier: paid ? 'paid' : 'free', usage: { in: 40_000 + day * 23_000, out: 2_000 + day * 900, cacheRead: 10_000, cacheWrite: 0 }, ts: ts + 60_000 });
}
fs.writeFileSync(path.join(dir, 'workers.jsonl'), log.map((l) => JSON.stringify(l) + '\n').join(''));
// Fake providers: the demo never reads the real Intern key and never health-checks over the network.
fs.writeFileSync(path.join(dir, 'providers.json'), JSON.stringify([
  { id: 'intern', label: 'Intern AI (free)', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', auth: 'api-key', key: 'sk-demo-1a2b', models: { read: [], edit: [] } },
  { id: 'intern-2', label: 'Intern AI #2 (free)', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', auth: 'api-key', key: 'sk-demo-7335', models: { read: [], edit: [] } },
  { id: 'openrouter', label: 'OpenRouter (trả tiền)', tier: 'paid', enabled: false, baseUrl: 'https://openrouter.ai/api', auth: 'auth-token', key: '', models: { read: [], edit: [] } },
]));
fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({
  agentSkills: { firmware: { 'superpowers:brainstorming': { mode: 'force', when: 'first' }, 'ponytail:ponytail': { mode: 'force', when: 'every' }, 'frontend-design:*': { mode: 'ban' } } },
  autoJobs: { handoff: { enabled: true, thresholdK: 300 } },
}));
const hub = await startHub({ dir, port, probe: null, legacyKeyFile: path.join(dir, 'no-legacy.key'), listProcs: async () => procs, kill: async (pid) => { procs.length = 0; console.log('kill', pid); } });
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
