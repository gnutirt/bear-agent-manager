# Workforce v2 (worker / osin, nhà cung cấp free + trả tiền, 4 tab) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Repo pipeline (CLAUDE.md): task nào phụ thuộc hành vi của thư viện/API bên ngoài (Claude Code CLI, OpenRouter, Intern AI) thì chạy skill `nghiencuu` trước, gộp kết quả có trích dẫn vào prompt của subagent, rồi giao qua `cursor-code`.

**Goal:** Đổi tên skill `congnhan`→`worker`, `congnhanvesinh`→`osin`; tách transcript của worker khỏi danh sách chat của từng repo (thư mục `room_chat`); hệ thống worker theo tầng (free = Intern AI, trả tiền = OpenRouter, MCP để sau); hub tự giới thiệu worker cho mọi chat khi plugin chạy; UI có 4 tab: Phòng / Worker / Token / Cài đặt.

**Architecture:** Hub (Node, không dependency) giữ thêm các file trong `~/.bear-agent-manager/`: `providers.json` (nhà cung cấp + key), `settings.json` (chế độ skill, worker tự chạy, fallback trả tiền, room_chat) và `accounts/<tên>/` (acc Claude Pro đã lưu). `worker.ps1` đọc thẳng `providers.json` (vẫn chạy khi hub tắt), chạy `claude -p --bare` với `CLAUDE_CONFIG_DIR=~/.bear-agent-manager/worker-config` nên transcript không lọt vào `~/.claude/projects/<repo>`, và ghi usage token vào `workers.jsonl`. Hub gom mọi transcript do room đẻ ra vào thư mục `room_chat` của từng repo, nhắc skill qua hook, tổng hợp token (worker + mức dùng 5h/tuần của từng acc Claude) cho UI.

**Tech Stack:** Node ≥ 22.18 (type stripping, `node:test`), Windows PowerShell 5.1, một file `ui/index.html` không build, Claude Code CLI 2.1.28x–2.1.30x.

**Spec:** Yêu cầu của chủ repo (chat 2026-10-16), tóm tắt ở mục "Yêu cầu gốc" bên dưới + README hiện tại (mục Worker skills, Roadmap).

## Yêu cầu gốc (chép lại để executor đọc)

1. Chat của room/worker hiện lẫn lộn trong danh sách chat local của mỗi repo → gom vào thư mục `room_chat`.
2. Đổi tên skill `congnhan` → `worker`, `congnhanvesinh` → `osin`.
3. Skill worker/osin được "khởi chạy" khi plugin bear-agent-manager chạy, để tận dụng API free của https://discovery.intern-ai.org.cn/.
4. Worker theo tầng: (a) free = Intern AI, (b) trả tiền = OpenRouter, (c) worker kết nối qua MCP → để vào todoplan.
5. Gitignore `todoplan`, `todobug`; `CHANGELOG` thì commit.
6. 4 tab: (1) giao diện hiện tại, (2) quan sát worker, (3) dashboard token, (4) cài đặt (key worker, nhiều acc Claude Pro, bật/tắt skill…).

## Quyết định đã chốt với chủ repo (2026-10-16)

- **A1 (mục 1) — room_chat theo từng repo.** Mọi transcript do room/hub đẻ ra (worker, revive headless, e2e/test, transcript rỗng) không được nằm lẫn trong danh sách chat của VS Code/Antigravity. Mỗi repo có một thư mục `room_chat` chứa chúng. Số liệu thật (agent `chuyen-doi-tai`): bear-agent-manager 12/28 transcript là của worker, python_plugins 12/26; mỗi repo còn ~3 transcript rỗng; `Temp\ar-slow-pro…` có 6 chat lọt từ test. Worker kế thừa `entrypoint=claude-vscode` của chat cha nên extension coi như chat thật.
  - Đích ưu tiên: `~/.claude/projects/<repo>/room_chat/` (đúng "trong mỗi repo"). Chỉ dùng nếu nghiencuu ở Task 3 xác nhận (a) extension chỉ liệt kê `*.jsonl` ngay trong thư mục project, không đọc thư mục con; (b) Claude Code không dọn/xoá thư mục con lạ (cleanupPeriodDays). Ngược lại: `~/.bear-agent-manager/room_chat/<repo>/`. Đường đích là một hằng số duy nhất `roomChatDir(projectDir)` để đổi một chỗ.
  - Worker mới chạy với `CLAUDE_CONFIG_DIR` riêng nên không bao giờ ghi vào `~/.claude/projects`; hub quét định kỳ và chuyển các loại còn lại vào `room_chat`. Tab Worker liệt kê được các transcript trong `room_chat`.
- **A2 (mục 3):** hook `SessionStart` nhắc mỗi chat worker/osin đang bật; hub kiểm tra key khi khởi động. **Hub được tự chạy worker cho một số việc nếu Cài đặt cho phép** (Task 9b): hồ sơ bàn giao khi chat vượt ngưỡng context, rút gọn tin nhắn dài trong phòng, dọn biên bản phòng. Mặc định tắt từng việc.
- **A3 (mục 4b):** tầng trả tiền mặc định **tắt**; chỉ dùng khi gọi `-Tier paid` hoặc bật "tự chuyển sang trả tiền khi free hết quota". (đã đồng ý)
- **A4 (mục 6, nhiều acc Claude Pro) — chuyển acc bằng cách tráo file login** (đề xuất của `chuyen-doi-tai`, chủ repo đồng ý). Extension VS Code/Antigravity luôn đọc `~/.claude`, nên `CLAUDE_CONFIG_DIR` riêng không chuyển được acc ở đó. Hub lưu từng acc thành profile, chuyển acc bằng cách chép file login, đọc mức dùng 5h/tuần của từng acc. Chi tiết ở Task 10.
- **A5 (bật/tắt skill) = ép Claude dùng skill trong hội thoại, gán theo TỪNG AGENT** (chủ repo chốt 2026-10-16, biên bản phòng [3]). Mỗi agent (member của hub, theo tên) có danh sách skill riêng, mỗi skill 3 chế độ **Ép dùng** / **Tự quyết** (mặc định) / **Cấm**; skill nào cũng được (plugin nào hoặc `~/.claude/skills`). Ví dụ: `Boss` luôn bị ép dùng `superpowers:*`. Không có rule toàn máy hay theo repo. Thời điểm ép do từng skill chọn: `every` = mỗi tin, `first` = tin đầu phiên. Thực hiện bằng lời nhắc qua hook `UserPromptSubmit` + `SessionStart`, tra theo `session_id` → tên agent. Riêng `worker`/`osin` còn có công tắc chặn cứng (hub từ chối slot). Chi tiết ở Task 8b.

## Global Constraints

- Không thêm npm dependency; không build step. TypeScript chạy trực tiếp (`node --no-warnings`).
- `worker.ps1` phải giữ UTF-8 BOM (PowerShell 5.1 đọc sai regex CJK nếu thiếu).
- Không bao giờ set `ANTHROPIC_*` ở phạm vi global; chỉ trong process của `worker.ps1`.
- Key không bao giờ được trả về nguyên văn qua API (chỉ `…abcd` 4 ký tự cuối) và không ghi vào `workers.jsonl`.
- UI: không dùng `prompt()/alert()/confirm()` (không chạy trong webview VS Code); text giao diện tiếng Việt.
- Tương thích ngược: hub vẫn nhận ra tiến trình `congnhan.ps1` đang chạy và dòng log `kind: "vesinh"` cũ.
- Chạy `npm test` sau mỗi task; mọi test phải xanh trước khi commit.

## Review Focus

1. **Chuyển acc Claude khi Claude Code vừa refresh token** → refresh token mới của acc đang rời đi phải được lưu lại trước khi tráo, không acc nào bị đăng xuất; acc đang dùng chưa lưu → từ chối chuyển. Test ở Task 10.
2. **Quét room_chat gặp chat thật, chat đang mở, hoặc file đang ghi** → không bao giờ chuyển (chỉ chuyển loại đã phân loại, bỏ qua phiên đang hoạt động và file sửa trong 10 phút), không ghi đè file trùng tên. Test ở Task 3b.
3. **Worker cũ đang chạy lúc nâng cấp** (`congnhan.ps1`, `kind=vesinh` trong log) → vẫn hiện trong tab Worker, vẫn dừng được. Test ở Task 2.
4. **`providers.json` / `settings.json` hỏng hoặc thiếu; PUT key rỗng** → hub dùng mặc định + key cũ `~/.claude/congnhan.key`, không crash; key rỗng giữ key cũ, `key: null` mới xoá; log thiếu `usage` tính 0. Test ở Task 4, 6, 8.
5. **Hub tự chạy worker lặp lại / vượt trần** (cùng chat vượt ngưỡng nhiều lần, hub khởi động lại) → mỗi việc chạy đúng một lần, không quá `maxRunsPerDay`; skill bị tắt → slot `disabled`, `worker.ps1` thoát mã 4. Test ở Task 8 và Task 9b.

---

## Sơ đồ file

| File | Trạng thái | Trách nhiệm |
|---|---|---|
| `.gitignore` | sửa | thêm `todoplan*`, `todobug*` |
| `todoplan.md`, `todobug.md` | tạo (bị ignore) | backlog cá nhân; mục MCP worker |
| `CHANGELOG.md` | tạo | lịch sử thay đổi, được commit |
| `skills/worker/` (từ `skills/congnhan/`) | đổi tên | `SKILL.md`, `worker.ps1` |
| `skills/osin/` (từ `skills/congnhanvesinh/`) | đổi tên | `SKILL.md`, `jobs.md`, `extract-chat.mjs`, `token-report.mjs` |
| `hub/workers.ts` | sửa | nhận `worker.ps1`+`congnhan.ps1`, kind `worker`/`osin`, provider/tier/usage |
| `hub/providers.ts` | tạo | đọc/ghi `providers.json`, che key, migrate key cũ |
| `hub/settings.ts` | tạo | đọc/ghi `settings.json` (worker/osin on/off, chế độ skill, auto jobs, paid fallback, room_chat) |
| `hub/tokens.ts` | tạo | tổng hợp token theo tầng/nhà cung cấp/model/ngày |

| `hub/brief.ts` | tạo | câu giới thiệu worker cho hook `SessionStart` |
| `hub/server.ts` | sửa | route `/api/providers`, `/api/settings`, `/api/tokens`, `/api/skills`, `/api/accounts`, `/api/room-chat`, `/api/brief`, hook `prompt` |
| `hooks/session-start.ts` | sửa | in brief |
| `shared/worker-chat.ts` | tạo | phân loại transcript (worker/rỗng/test), `roomChatDir`, `workerConfigDir` |
| `hub/roomchat.ts` | tạo | gom transcript của room vào `room_chat` theo repo, liệt kê |
| `scripts/move-room-chats.mjs` | tạo | dọn transcript cũ (dry-run / `--apply`) |
| `hub/skillmodes.ts` | tạo | ép / tự quyết / cấm skill, lời nhắc cho hook |
| `hub/autojobs.ts` | tạo | hub tự chạy worker cho việc được phép |
| `hub/archive.ts` | tạo | sao lưu chat tăng dần sang `archive.dir` (spec chat-archive, giai đoạn 1) |
| `hub/accounts.ts` | tạo | lưu / chuyển acc Claude Pro, đọc mức dùng 5h/tuần |
| `ui/index.html` | sửa | thanh 4 tab + 3 view mới |
| `test/*.test.ts` | sửa/tạo | test tương ứng |
| `README.md` | sửa | tài liệu mới |

---

### Task 1: Gitignore todoplan/todobug, tạo CHANGELOG + todoplan

**Files:**
- Modify: `.gitignore`
- Create: `CHANGELOG.md`, `todoplan.md`, `todobug.md`
- Test: `test/repo.test.ts`

**Interfaces:** Consumes: —. Produces: `CHANGELOG.md` (các task sau thêm dòng vào mục `Unreleased`).

- [ ] **Step 1: Viết test hỏng** — `test/repo.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const ignored = (f: string) => {
  try { execFileSync('git', ['check-ignore', '-q', f], { cwd: ROOT }); return true; } catch { return false; }
};

test('todoplan/todobug are ignored, CHANGELOG is tracked', () => {
  for (const f of ['todoplan.md', 'todobug.md', 'TODOPLAN.md', 'todoplan/x.md']) assert.ok(ignored(f), `${f} should be ignored`);
  assert.ok(!ignored('CHANGELOG.md'));
});
```

- [ ] **Step 2: Chạy** `node --no-warnings --test test/repo.test.ts` → FAIL (`todoplan.md should be ignored`).
- [ ] **Step 3: Sửa `.gitignore`** (thêm cuối file):

```gitignore
# personal backlogs (never committed)
todoplan*
todobug*
TODOPLAN*
TODOBUG*
```

Tạo `CHANGELOG.md`:

```markdown
# Changelog

## Unreleased

- Chore: `todoplan*` / `todobug*` are git-ignored; this changelog is tracked.

## 0.2.0

- Rooms, wake on mention, room lead, notes, live UI, worker skills `congnhan` / `congnhanvesinh`.
```

Tạo `todoplan.md`:

```markdown
# todoplan

- [ ] Worker tầng 3 "nhiều chiện" qua MCP: Muse → Task 16 của plan workforce-v2; các nguồn khác cần thiết kế riêng.
- [ ] Ẩn hẳn một skill khỏi Claude Code (không nạp) — khác "Cấm" ở Task 8b (chỉ là lời nhắc). Nghiên cứu cơ chế của Claude Code trước.
- [ ] (đã có endpoint refresh — xem Task 10 Step 1; mục này chỉ còn nếu endpoint đổi ở bản Claude Code sau).
```

Tạo `todobug.md` với dòng `# todobug`.
- [ ] **Step 4: Chạy lại** → PASS; `npm test` → xanh.
- [ ] **Step 5: Commit**

```bash
git add .gitignore CHANGELOG.md test/repo.test.ts
git commit -m "chore: ignore todoplan/todobug, add CHANGELOG"
```

---

### Task 2: Đổi tên skill congnhan → worker, congnhanvesinh → osin

**Files:**
- Rename: `skills/congnhan/` → `skills/worker/`, `skills/congnhan/congnhan.ps1` → `skills/worker/worker.ps1`
- Rename: `skills/congnhanvesinh/` → `skills/osin/`
- Modify: `skills/worker/SKILL.md`, `skills/osin/SKILL.md`, `skills/osin/jobs.md` (tiêu đề), `skills/worker/worker.ps1`, `hub/workers.ts`, `hub/server.ts` (comment), `ui/index.html` (`KIND`, nhãn "Công nhân" → "Worker")
- Test: `test/workers.test.ts`, `test/skills.test.ts`, `test/ui.test.ts`

**Interfaces:**
- Produces: `type Kind = 'worker' | 'osin'`; `parseWorkers(procs)` nhận cả `worker.ps1` lẫn `congnhan.ps1`; `-Kind osin` (chấp nhận `vesinh` cũ); `mergeWorkerLog` map `kind: 'vesinh'` → `'osin'`, mọi giá trị khác → `'worker'`.
- `worker.ps1` param: `-Kind` `ValidateSet("worker","osin","congnhan","vesinh")`, ghi log `kind` đã chuẩn hoá (`worker`/`osin`), `skill` = `worker`/`osin`.

- [ ] **Step 1: Đổi tên bằng git** (giữ lịch sử, giữ BOM):

```bash
git mv skills/congnhan skills/worker
git mv skills/worker/congnhan.ps1 skills/worker/worker.ps1
git mv skills/congnhanvesinh skills/osin
```

- [ ] **Step 2: Sửa test trước** — `test/skills.test.ts`: `['congnhan','congnhanvesinh']` → `['osin','worker']`, đường dẫn BOM → `skills/worker/worker.ps1`. Thêm vào `test/workers.test.ts`:

```ts
test('parseWorkers: new worker.ps1 and legacy congnhan.ps1 both found; osin and legacy vesinh map to osin', () => {
  const NEW = String.raw`powershell -NoProfile -File C:\p\skills\worker\worker.ps1 -PromptFile C:\T\a.txt -Dir D:\r -Kind osin`;
  const OLD = String.raw`powershell -NoProfile -File C:\p\skills\congnhan\congnhan.ps1 -PromptFile C:\T\b.txt -Dir D:\r -Kind vesinh`;
  const PLAIN = String.raw`powershell -NoProfile -File C:\p\skills\worker\worker.ps1 -PromptFile C:\T\c.txt -Dir D:\r`;
  const ws = parseWorkers([
    { pid: 1, ppid: 0, name: 'powershell.exe', cmd: NEW, started: 1 },
    { pid: 2, ppid: 0, name: 'powershell.exe', cmd: OLD, started: 2 },
    { pid: 3, ppid: 0, name: 'powershell.exe', cmd: PLAIN, started: 3 },
  ]);
  assert.deepEqual(ws.map((w) => [w.pid, w.kind]), [[1, 'osin'], [2, 'osin'], [3, 'worker']]);
});

test('mergeWorkerLog maps legacy kinds', () => {
  const h = mergeWorkerLog([
    { event: 'start', id: 'a', kind: 'vesinh', ts: 1 }, { event: 'start', id: 'b', kind: 'congnhan', ts: 2 }, { event: 'start', id: 'c', kind: 'osin', ts: 3 },
  ]);
  assert.deepEqual(h.map((r) => [r.id, r.kind]), [['c', 'osin'], ['b', 'worker'], ['a', 'osin']]);
});
```

Trong test cũ `parseWorkers finds congnhan runs…` đổi kỳ vọng `'vesinh'`→`'osin'`, `'congnhan'`→`'worker'`. Trong `test/ui.test.ts` không đổi id (`id="workers"`, `id="wkCap"` giữ nguyên).
- [ ] **Step 3: Chạy** `npm test` → FAIL ở workers/skills.
- [ ] **Step 4: Sửa `hub/workers.ts`**:

```ts
export type Kind = 'worker' | 'osin';
const normKind = (k: unknown): Kind => (/^(osin|vesinh)$/i.test(String(k ?? '')) ? 'osin' : 'worker');
// trong parseWorkers:
    if (!/(worker|congnhan)\.ps1/i.test(p.cmd)) continue;
    ...
      kind: normKind(arg(p.cmd, 'Kind')),
// trong mergeWorkerLog (start):
        id: l.id, pid: Number(l.pid) || null, kind: normKind(l.kind), ...
```

Sửa comment đầu file: `worker.ps1 -PromptFile … [-Kind osin]`.
- [ ] **Step 5: Sửa `skills/worker/worker.ps1`** (giữ BOM — sửa bằng Edit tool, không dùng `Set-Content`):

```powershell
    [ValidateSet("worker", "osin", "congnhan", "vesinh")][string]$Kind = "worker",
...
$Kind = if ($Kind -in "osin", "vesinh") { "osin" } else { "worker" }
$skill = $Kind
```

Tiền tố output `[congnhan]` → `[worker]`. Key: đọc `~/.claude/congnhan.key` vẫn giữ (Task 5 thay bằng providers.json).
- [ ] **Step 6: Sửa SKILL.md** — `skills/worker/SKILL.md`: `name: worker`, description giữ trigger cũ + thêm mới: `"kêu worker làm", "giao cho worker", "/worker <task>", (cũ) "kêu congnhan làm"`; mọi `congnhan.ps1` → `worker.ps1`, "Công nhân panel" → "tab Worker". `skills/osin/SKILL.md`: `name: osin`, trigger `"kêu osin dọn", "/osin <job>", (cũ) "kêu congnhanvesinh dọn"`; đường dẫn `${CLAUDE_SKILL_DIR}\..\worker\worker.ps1 -Kind osin`. `jobs.md`: tiêu đề `# osin job prompts`.
- [ ] **Step 7: Sửa UI** `ui/index.html`: `const KIND = { worker: ['🛠', 'worker'], osin: ['🧹', 'osin'] };`, `KIND[w.kind] || KIND.worker`, mục sidebar `Công nhân` → `Worker`, toast `Đã dừng worker`, chuỗi `công nhân` → `worker`.
- [ ] **Step 8: Chạy** `npm test` → PASS. Kiểm tra BOM: `node -e "console.log([...require('fs').readFileSync('skills/worker/worker.ps1').subarray(0,3)])"` → `[ 239, 187, 191 ]`.
- [ ] **Step 9: Cài lại plugin cục bộ để skill mới hiện** — `claude plugin marketplace update bear-agent-manager-local` rồi mở chat mới, kiểm tra `/worker` và `/osin` có trong danh sách skill. Thêm dòng CHANGELOG: `- Breaking: skills renamed congnhan → worker, congnhanvesinh → osin (old triggers still listed).`
- [ ] **Step 10: Commit** — `git commit -am "feat!: rename skills to worker and osin"` (sau `git add -A skills`).

---

### Task 3: Transcript của worker vào `room_chat` (mục 1)

**Files:**
- Modify: `skills/worker/worker.ps1`
- Create: `shared/worker-chat.ts`
- Test: `test/worker-chat.test.ts`, `test/skills.test.ts`

**Interfaces:**
- Produces: `isWorkerTranscript(lines: string[]): boolean` (trong `shared/worker-chat.ts`) — true khi có ít nhất một dòng `type:"assistant"` mà `message.model` không bắt đầu bằng `claude-` và không phải `<synthetic>`.
- Produces: `workerConfigDir(home: string): string` = `path.join(home, 'worker-config')` — `CLAUDE_CONFIG_DIR` của worker (transcript worker mới ghi vào `worker-config/projects/<repo>/`).
- Produces: `roomChatDir(projectDir: string): string` — thư mục `room_chat` của một project (A1). Mặc định `path.join(projectDir, 'room_chat')`; nếu nghiencuu Step 1 bác bỏ, đổi thân hàm thành `path.join(HOME, 'room_chat', path.basename(projectDir))` — mọi nơi khác chỉ gọi hàm này.
- `worker.ps1` set `$env:CLAUDE_CONFIG_DIR = Join-Path $hubHome "worker-config"` trước khi gọi `claude`.

- [ ] **Step 1: nghiencuu (bắt buộc trước khi code)** — xác nhận trên docs Claude Code hiện tại (https://code.claude.com/docs — CLI reference, settings/env vars) và hành vi extension VS Code:
  - (a) `CLAUDE_CONFIG_DIR` đổi nơi ghi `projects/<cwd>/<session>.jsonl`;
  - (b) `-p --bare` với config dir trống không bị chặn bởi onboarding/trust dialog;
  - (c) có cờ `--no-session-persistence` hay không (phương án dự phòng);
  - (d) danh sách "Past conversations" của extension chỉ đọc `*.jsonl` ngay trong `~/.claude/projects/<repo>/` (không đệ quy), và `cleanupPeriodDays` không xoá thư mục con lạ → quyết định thân hàm `roomChatDir`;
  - (e) `claude --resume <id> -p` ghi tiếp vào file cũ hay tạo file session mới (ảnh hưởng Task 3b).

  Thử thực tế (a) và (d):

```powershell
$env:CLAUDE_CONFIG_DIR = "$HOME\.bear-agent-manager\worker-config"
"say hi" | claude -p --bare --model deepseek-v4-flash-0731 --output-format json   # với ANTHROPIC_BASE_URL/KEY của Intern
Get-ChildItem "$HOME\.bear-agent-manager\worker-config\projects" -Recurse -Filter *.jsonl
# (d): chuyển tay 1 transcript worker cũ vào ~/.claude/projects/<repo>/room_chat/, mở lại VS Code → nó biến khỏi danh sách chat, chat thật vẫn còn.
```

Expected: (a) có 1 `.jsonl` mới trong `worker-config\projects\…`, KHÔNG có file mới trong `~\.claude\projects\<cwd>`; (d) transcript trong `room_chat/` không hiện trong danh sách. Ghi trích dẫn + kết quả thử vào prompt subagent.
- [ ] **Step 2: Test hỏng** — `test/worker-chat.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyTranscript } from '../shared/worker-chat.ts';

const a = (model: string) => JSON.stringify({ type: 'assistant', message: { model, content: [] } });
const u = JSON.stringify({ type: 'user', message: { content: 'hi' } });
const meta = JSON.stringify({ type: 'summary', summary: 'x' });

test('classifyTranscript: worker = some assistant turn from a non-Claude model', () => {
  assert.equal(classifyTranscript([u, a('deepseek-v4-flash-0731')], 'D:\\r'), 'worker');
  assert.equal(classifyTranscript([u, a('kimi-k2.6')], 'D:\\r'), 'worker');
});

test('classifyTranscript: real chats stay, even with <synthetic> turns', () => {
  assert.equal(classifyTranscript([u, a('claude-opus-5-5')], 'D:\\r'), null);
  assert.equal(classifyTranscript([u, a('<synthetic>'), a('claude-sonnet-5-5')], 'D:\\r'), null);
});

test('classifyTranscript: empty (no user/assistant turn) and test/temp projects', () => {
  assert.equal(classifyTranscript([meta, ''], 'D:\\r'), 'empty');
  assert.equal(classifyTranscript(['{torn'], 'D:\\r'), 'empty');
  assert.equal(classifyTranscript([u, a('claude-opus-5-5')], 'C--Users-me-AppData-Local-Temp-ar-slow-probe'), 'test');
});
```

Thêm vào `test/skills.test.ts`:

```ts
test('worker.ps1 isolates worker transcripts in worker-config', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  assert.match(ps, /\$env:CLAUDE_CONFIG_DIR\s*=\s*Join-Path \$hubHome "worker-config"/);
});
```

- [ ] **Step 3: Chạy** → FAIL.
- [ ] **Step 4: Cài đặt** — `shared/worker-chat.ts`:

```ts
import path from 'node:path';

export type RoomChatKind = 'worker' | 'empty' | 'test' | 'revive';

/** CLAUDE_CONFIG_DIR of worker runs: their transcripts never land in ~/.claude/projects. */
export const workerConfigDir = (home: string) => path.join(home, 'worker-config');

/** Where room-made transcripts of one project go (A1). Confirmed by the nghiencuu step of Task 3. */
export const roomChatDir = (projectDir: string) => path.join(projectDir, 'room_chat');

// Projects Claude Code created for throwaway dirs (hub tests, e2e demo, probes) under the OS temp dir.
const TEMP_PROJECT = /AppData-Local-Temp-|^-tmp-|^-private-var-folders-/i;

/**
 * Why a transcript is room/hub noise, or null for a real chat. `lines` = the head of the .jsonl,
 * `project` = its project folder name. Revive runs are classified by the hub (it knows their ids).
 */
export function classifyTranscript(lines: string[], project: string): RoomChatKind | null {
  let turns = 0;
  for (const l of lines) {
    if (!l.includes('"type"')) continue;
    let o: any;
    try { o = JSON.parse(l); } catch { continue; }
    if (o?.type === 'user' || o?.type === 'assistant') turns++;
    const m = o?.type === 'assistant' ? o?.message?.model : undefined;
    if (typeof m === 'string' && m !== '<synthetic>' && !m.startsWith('claude-')) return 'worker';
  }
  if (!turns) return 'empty';
  if (TEMP_PROJECT.test(path.basename(project))) return 'test';
  return null;
}
```

`worker.ps1`, ngay trước `Set-Location $Dir`:

```powershell
# Worker transcripts go to the hub's worker-config dir, not ~/.claude/projects/<repo> (they flooded each repo's chat list).
$env:CLAUDE_CONFIG_DIR = Join-Path $hubHome "worker-config"
New-Item -ItemType Directory -Force $env:CLAUDE_CONFIG_DIR | Out-Null
```

- [ ] **Step 5: Script dọn transcript cũ** — `scripts/move-room-chats.mjs` (mặc định dry-run, `--apply` mới chuyển). Dùng chung hàm `sweepProject` của Task 3b — làm Task 3b ngay sau task này rồi mới chạy script; ở task này script chỉ in danh sách:

```js
// Lists (dry run) or moves (--apply) room-made transcripts of every project into its room_chat folder.
// Usage: node --no-warnings scripts/move-room-chats.mjs [--apply] [--config-dir <dir>]
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { sweepProject } from '../hub/roomchat.ts';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ci = args.indexOf('--config-dir');
const cfg = ci >= 0 ? args[ci + 1] : (process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude'));
const root = path.join(cfg, 'projects');
let total = 0;
for (const proj of fs.existsSync(root) ? fs.readdirSync(root) : []) {
  const dir = path.join(root, proj);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const r of sweepProject(dir, { apply, reviveIds: new Set(), activeIds: new Set() })) {
    total++;
    console.log(`${apply ? 'moved' : 'would move'} [${r.kind}] ${proj}/${r.file}`);
  }
}
console.log(`${total} transcript(s)${apply ? ' moved' : ' found (dry run, pass --apply)'}`);
```

- [ ] **Step 6: Chạy** `npm test` → PASS.
- [ ] **Step 7: Commit** — CHANGELOG: `- New worker runs keep their transcripts in ~/.bear-agent-manager/worker-config (no more worker chats in each repo's history).`

```bash
git add shared/worker-chat.ts skills/worker/worker.ps1 test/ CHANGELOG.md
git commit -m "feat: classify room-made transcripts, isolate new worker runs"
```

---

### Task 3b: Hub gom transcript của room vào `room_chat` theo từng repo

**Files:**
- Create: `hub/roomchat.ts`, `scripts/move-room-chats.mjs` (code ở Task 3 Step 5)
- Modify: `hub/server.ts`, `hub/revive.ts`, `hub/store.ts` (lưu id phiên do revive tạo)
- Test: `test/roomchat.test.ts`

**Interfaces:**
- Consumes: `classifyTranscript`, `roomChatDir`, `workerConfigDir` (Task 3).
- Produces:

```ts
export type Swept = { file: string; kind: RoomChatKind; from: string; to: string };
export type SweepOpts = { apply: boolean; reviveIds: Set<string>; activeIds: Set<string>; minAgeMs?: number; now?: number };
/** Room-made transcripts of one project dir (~/.claude/projects/<p>), moved into roomChatDir(dir) when apply. */
export function sweepProject(dir: string, o: SweepOpts): Swept[];
/** Worker transcripts written under worker-config/projects/<p> → roomChatDir(<claudeProjects>/<p>). */
export function adoptWorkerTranscripts(workerProjects: string, claudeProjects: string, apply: boolean): Swept[];
export type RoomChatEntry = { project: string; file: string; kind: RoomChatKind | 'unknown'; size: number; mtime: number; title: string };
export function listRoomChat(claudeProjects: string): RoomChatEntry[];
```

- Hub: quét mỗi 10 phút + khi khởi động (chỉ khi `settings.roomChat.autoSweep` bật — mặc định bật sau khi chủ repo duyệt dry-run lần đầu); route `GET /api/room-chat` → `RoomChatEntry[]`, `POST /api/room-chat/sweep` body `{apply:boolean}` → `Swept[]` (UI có nút "Xem trước" / "Dọn ngay").
- Không bao giờ đụng: file sửa trong 10 phút gần nhất (`minAgeMs`, mặc định 600_000), phiên đang có trong hub với status khác `offline` (`activeIds`), phiên không phân loại được (null).
- Revive: `spawnRevive` đọc `session_id` mới từ output (`--output-format json` thay cho `text`) nếu nghiencuu (e) cho thấy resume tạo file mới → hub lưu vào `store.state.reviveSpawns` (danh sách id, tối đa 500) → `sweepProject` xếp loại `'revive'`. Nếu resume ghi tiếp file cũ thì bỏ phần revive (đó là chat thật).

- [ ] **Step 1: Test hỏng** — `test/roomchat.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { adoptWorkerTranscripts, listRoomChat, sweepProject } from '../hub/roomchat.ts';
import { roomChatDir } from '../shared/worker-chat.ts';

const a = (model: string) => JSON.stringify({ type: 'assistant', message: { model, content: [] } });
const u = (t = 'hi') => JSON.stringify({ type: 'user', message: { content: t } });
function project(files: Record<string, string[]>, ageMs = 3_600_000) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-rc-'));
  const dir = path.join(root, 'D--Antigravity-repo'); fs.mkdirSync(dir);
  for (const [f, lines] of Object.entries(files)) {
    const p = path.join(dir, f); fs.writeFileSync(p, lines.join('\n'));
    const t = (Date.now() - ageMs) / 1000; fs.utimesSync(p, t, t);
  }
  return { root, dir };
}
const none = { reviveIds: new Set<string>(), activeIds: new Set<string>() };

test('dry run lists worker, empty and revive transcripts; real chats untouched', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')], 'e.jsonl': [''], 'real.jsonl': [u(), a('claude-opus-5-5')], 'rv.jsonl': [u(), a('claude-opus-5-5')] });
  const r = sweepProject(dir, { apply: false, reviveIds: new Set(['rv']), activeIds: new Set() });
  assert.deepEqual(r.map((x) => [x.file, x.kind]).sort(), [['e.jsonl', 'empty'], ['rv.jsonl', 'revive'], ['w.jsonl', 'worker']]);
  assert.ok(fs.existsSync(path.join(dir, 'w.jsonl')), 'dry run moves nothing');
});

test('apply moves into roomChatDir; recent and active sessions are skipped', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')], 'busy.jsonl': [u(), a('kimi-k2.6')] });
  const fresh = path.join(dir, 'new.jsonl'); fs.writeFileSync(fresh, [u(), a('glm-5.3')].join('\n'));
  const r = sweepProject(dir, { apply: true, reviveIds: new Set(), activeIds: new Set(['busy']) });
  assert.deepEqual(r.map((x) => x.file), ['w.jsonl']);
  assert.ok(fs.existsSync(path.join(roomChatDir(dir), 'w.jsonl')));
  assert.ok(fs.existsSync(path.join(dir, 'busy.jsonl')) && fs.existsSync(fresh));
});

test('adoptWorkerTranscripts brings worker-config transcripts into the repo room_chat', () => {
  const { root, dir } = project({});
  const wp = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-wc-'));
  fs.mkdirSync(path.join(wp, 'D--Antigravity-repo'));
  fs.writeFileSync(path.join(wp, 'D--Antigravity-repo', 'x.jsonl'), [u(), a('glm-5.3')].join('\n'));
  adoptWorkerTranscripts(wp, root, true);
  assert.ok(fs.existsSync(path.join(roomChatDir(dir), 'x.jsonl')));
  const list = listRoomChat(root);
  assert.deepEqual(list.map((e) => [e.project, e.file, e.kind]), [['D--Antigravity-repo', 'x.jsonl', 'worker']]);
  assert.equal(list[0].title, 'hi');
});

test('name clash in room_chat never overwrites', () => {
  const { dir } = project({ 'w.jsonl': [u(), a('glm-5.3')] });
  fs.mkdirSync(roomChatDir(dir)); fs.writeFileSync(path.join(roomChatDir(dir), 'w.jsonl'), 'old');
  sweepProject(dir, { apply: true, ...none });
  assert.equal(fs.readFileSync(path.join(roomChatDir(dir), 'w.jsonl'), 'utf8'), 'old');
  assert.ok(fs.readdirSync(roomChatDir(dir)).some((f) => /^w\.\d+\.jsonl$/.test(f)));
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt `hub/roomchat.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { classifyTranscript, roomChatDir, type RoomChatKind } from '../shared/worker-chat.ts';

export type Swept = { file: string; kind: RoomChatKind; from: string; to: string };
export type SweepOpts = { apply: boolean; reviveIds: Set<string>; activeIds: Set<string>; minAgeMs?: number; now?: number };
export type RoomChatEntry = { project: string; file: string; kind: RoomChatKind | 'unknown'; size: number; mtime: number; title: string };

const HEAD = 256 * 1024;
const head = (f: string) => {
  const fd = fs.openSync(f, 'r');
  try { const b = Buffer.alloc(HEAD); const n = fs.readSync(fd, b, 0, HEAD, 0); return b.subarray(0, n).toString('utf8').split('\n'); }
  finally { fs.closeSync(fd); }
};
/** Moves without ever overwriting: a clash gets a numeric suffix. */
function moveSafe(from: string, dir: string, file: string): string {
  fs.mkdirSync(dir, { recursive: true });
  let to = path.join(dir, file);
  if (fs.existsSync(to)) to = path.join(dir, file.replace(/\.jsonl$/, `.${Date.now()}.jsonl`));
  fs.renameSync(from, to);
  return to;
}

export function sweepProject(dir: string, o: SweepOpts): Swept[] {
  const now = o.now ?? Date.now(), minAge = o.minAgeMs ?? 600_000;
  const out: Swept[] = [];
  let files: string[] = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')); } catch { return out; }
  for (const file of files) {
    const id = file.slice(0, -'.jsonl'.length);
    const from = path.join(dir, file);
    if (o.activeIds.has(id)) continue;
    let st: fs.Stats; try { st = fs.statSync(from); } catch { continue; }
    if (now - st.mtimeMs < minAge) continue;          // a chat may still be writing it
    const kind = o.reviveIds.has(id) ? 'revive' : classifyTranscript(head(from), path.basename(dir));
    if (!kind) continue;
    const to = o.apply ? moveSafe(from, roomChatDir(dir), file) : path.join(roomChatDir(dir), file);
    out.push({ file, kind, from, to });
  }
  return out;
}

export function adoptWorkerTranscripts(workerProjects: string, claudeProjects: string, apply: boolean): Swept[] {
  const out: Swept[] = [];
  for (const proj of fs.existsSync(workerProjects) ? fs.readdirSync(workerProjects) : []) {
    const src = path.join(workerProjects, proj);
    if (!fs.statSync(src).isDirectory()) continue;
    for (const file of fs.readdirSync(src).filter((f) => f.endsWith('.jsonl'))) {
      const from = path.join(src, file);
      const dst = roomChatDir(path.join(claudeProjects, proj));
      out.push({ file, kind: 'worker', from, to: apply ? moveSafe(from, dst, file) : path.join(dst, file) });
    }
  }
  return out;
}

function firstPrompt(lines: string[]): string {
  for (const l of lines) {
    try {
      const o = JSON.parse(l);
      if (o?.type !== 'user') continue;
      const c = o.message?.content;
      const t = typeof c === 'string' ? c : Array.isArray(c) ? c.find((x: any) => x?.type === 'text')?.text : '';
      if (t) return String(t).replace(/\s+/g, ' ').slice(0, 120);
    } catch { /* torn */ }
  }
  return '';
}

export function listRoomChat(claudeProjects: string): RoomChatEntry[] {
  const out: RoomChatEntry[] = [];
  for (const proj of fs.existsSync(claudeProjects) ? fs.readdirSync(claudeProjects) : []) {
    const dir = roomChatDir(path.join(claudeProjects, proj));
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
      const p = path.join(dir, file); const st = fs.statSync(p); const h = head(p);
      out.push({ project: proj, file, kind: classifyTranscript(h, proj) ?? 'unknown', size: st.size, mtime: st.mtimeMs, title: firstPrompt(h) });
    }
  }
  return out.sort((x, y) => y.mtime - x.mtime);
}
```

**Đã chốt khi thực thi (2026-10-16):** docs không trả lời (d) → phương án dự phòng (quan-ly-cong-nhan); chủ repo chốt KHÔNG cần tầng config: đích = `~/.bear-agent-manager/room_chat/<project>/`. Session id là UUID nên chat của `.claude` và `.claude-antigravity` không trùng tên; nếu trùng thì `moveSafe` thêm hậu tố, không ghi đè. Vì vậy: `roomChatDir(projectDir)` = `path.join(HOME, 'room_chat', path.basename(projectDir))`; `listRoomChat` duyệt `<HOME>/room_chat/*/`; test đặt `BEAR_AGENT_HOME` về thư mục tạm. Archive (Task 3c) chép trước khi chuyển nên file đã chuyển vẫn có bản sao. Nếu sau này thử thực tế thấy extension bỏ qua thư mục con thì đổi lại thân `roomChatDir` là xong.

Trong `hub/server.ts`:

```ts
  // ---- room_chat: keep room-made transcripts out of each repo's chat list (A1) ----
  const configDirs = () => [...new Set([path.join(os.homedir(), '.claude'), ...Object.values(store.state.sessions).map((s) => s.configDir).filter(Boolean) as string[]])];
  function sweepAll(apply: boolean) {
    const active = new Set(Object.values(store.state.sessions).filter((s) => s.status !== 'offline').map((s) => s.id));
    const revive = new Set(store.state.reviveSpawns ?? []);
    const out: Swept[] = [];
    for (const cfg of configDirs()) {
      const projects = path.join(cfg, 'projects');
      if (cfg === path.join(os.homedir(), '.claude')) out.push(...adoptWorkerTranscripts(path.join(workerConfigDir(opts.dir), 'projects'), projects, apply));
      for (const p of fs.existsSync(projects) ? fs.readdirSync(projects) : []) {
        const d = path.join(projects, p);
        if (fs.statSync(d).isDirectory()) out.push(...sweepProject(d, { apply, reviveIds: revive, activeIds: active }));
      }
    }
    return out;
  }
  if (opts.roomChatSweep !== false) {
    const t = setInterval(() => { if (loadSettings(opts.dir, envCap).roomChat.autoSweep) try { sweepAll(true); } catch { /* next round */ } }, 10 * 60_000);
    t.unref();
  }
```

Route: `GET /api/room-chat` → `configDirs().flatMap((c) => listRoomChat(path.join(c, 'projects')))`; `POST /api/room-chat/sweep` → `sweepAll(!!body.apply)` rồi `broadcast('roomchat', …)`. `HubOptions` thêm `roomChatSweep?: boolean`; `test/helpers.ts` truyền `false`. Kiểm tra `Session` trong `hub/store.ts` có trường `configDir` (revive dùng `job.configDir`); nếu tên khác thì dùng đúng tên đó. `Settings` (Task 8) thêm `roomChat: { autoSweep: boolean }` mặc định `false` — UI bật sau khi chủ repo xem bản "Xem trước".

- [ ] **Step 4: Chạy** `npm test` → PASS. Chạy `node --no-warnings scripts/move-room-chats.mjs` (dry-run) → gửi danh sách cho chủ repo (dự kiến ~12 worker ở bear-agent-manager, ~12 ở python_plugins, vài file rỗng, các project Temp). Chỉ `--apply` khi họ đồng ý; sau đó mở lại VS Code và Antigravity → danh sách chat sạch, chat thật còn đủ.
- [ ] **Step 5: Commit** — CHANGELOG: `- Room-made transcripts (workers, revive runs, empty and test sessions) are moved into each project's room_chat folder; preview and sweep from the Worker tab or scripts/move-room-chats.mjs.`

```bash
git add hub/roomchat.ts hub/server.ts hub/revive.ts hub/store.ts scripts/move-room-chats.mjs test/ CHANGELOG.md
git commit -m "feat(hub): sweep room-made transcripts into room_chat per repo"
```

---

### Task 3c: Sao lưu chat tăng dần sang `X:\Coding\claude-mem` (spec chat-archive, giai đoạn 1)

**Spec:** [docs/superpowers/specs/2026-10-16-chat-archive-design.md](../specs/2026-10-16-chat-archive-design.md), mục "Phase 1" (tác giả `co-che-sao`/research-backup, chủ repo duyệt 2026-10-16). Giai đoạn 2 (SQLite + checkpoint) và 3 (wake nhẹ) KHÔNG nằm trong plan này. `cleanupPeriodDays` giữ nguyên (chủ repo chốt) → archive phải chép kịp trước khi Claude Code xoá chat sau 30 ngày; quét 10 phút/lần là dư.

**Files:**
- Create: `hub/archive.ts`, `test/archive.test.ts`
- Modify: `hub/server.ts` (interval, hook `end`, gọi trước sweep của Task 3b, cảnh báo qua SSE), `hub/settings.ts` (Task 8: thêm `archive: { dir: string }`, mặc định `''` = tắt; chủ repo đặt `X:\Coding\claude-mem` ở tab Cài đặt). Nếu Task 8 chưa xong: đọc tạm `BEAR_AGENT_ARCHIVE_DIR`.

**Interfaces:**
- Produces:

```ts
export type ArchiveResult = { ok: boolean; reason: string; copiedFiles: number; copiedBytes: number };
/** Copies new bytes of every transcript under <cfg>/projects into <archiveDir>/<configName>/<project>/…; never deletes. */
export function archiveNow(configDirs: string[], archiveDir: string, onlySession?: string): ArchiveResult;
/** Offset key: room_chat/ segment and the .<ts> rename suffix of Task 3b removed, so a moved file is not copied again. */
export function archiveKey(configName: string, project: string, relInProject: string): string;
```

- `<archiveDir>/offsets.json`: `{ [key]: { bytes, mtimeMs } }`, ghi SAU khi chép (file tạm + rename) → crash giữa chừng chỉ chép trùng vài byte, không mất.
- `.jsonl` (chat chính, `<id>/subagents/agent-*.jsonl`): chép phần mới tới `\n` cuối cùng. File khác (`subagents/*.json`, `tool-results/*.txt`, `memory/*.md`): chép cả file khi size hoặc mtime đổi. Nguồn ngắn hơn offset → giữ bản cũ thành `<id>.<isoTs>.jsonl`, chép lại từ byte 0.
- `archiveDir` không tồn tại/không ghi được (ổ X: rút ra) → `{ ok:false, reason }`, không ném lỗi, không bao giờ ghi sang chỗ khác (không tạo thư mục đích).

- [ ] **Step 1: Test hỏng** — `test/archive.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { archiveKey, archiveNow } from '../hub/archive.ts';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-arc-'));
  const cfg = path.join(root, '.claude'), proj = path.join(cfg, 'projects', 'D--repo'), arc = path.join(root, 'X');
  fs.mkdirSync(proj, { recursive: true }); fs.mkdirSync(arc);
  return { root, cfg, proj, arc, out: path.join(arc, '.claude', 'D--repo') };
}

test('new file copied; appended lines copied once', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  assert.equal(archiveNow([cfg], arc).copiedFiles, 1);
  fs.appendFileSync(path.join(proj, 's1.jsonl'), 'b\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\nb\n');
  assert.equal(archiveNow([cfg], arc).copiedBytes, 0);
});

test('half-written last line waits for its newline', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n{"half');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\n');
  fs.appendFileSync(path.join(proj, 's1.jsonl'), '":1}\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'a\n{"half":1}\n');
});

test('shrunk source: old copy kept under a timestamped name, new copy from byte 0', () => {
  const { cfg, proj, arc, out } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'long line one\n');
  archiveNow([cfg], arc);
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'x\n');
  archiveNow([cfg], arc);
  assert.equal(fs.readFileSync(path.join(out, 's1.jsonl'), 'utf8'), 'x\n');
  assert.ok(fs.readdirSync(out).some((f) => /^s1\..+\.jsonl$/.test(f) && fs.readFileSync(path.join(out, f), 'utf8') === 'long line one\n'));
});

test('moving into room_chat (with or without .<ts> suffix) copies nothing again', () => {
  const { cfg, proj, arc } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n'); fs.writeFileSync(path.join(proj, 's2.jsonl'), 'b\n');
  archiveNow([cfg], arc);
  fs.mkdirSync(path.join(proj, 'room_chat'));
  fs.renameSync(path.join(proj, 's1.jsonl'), path.join(proj, 'room_chat', 's1.jsonl'));
  fs.renameSync(path.join(proj, 's2.jsonl'), path.join(proj, 'room_chat', 's2.1760000000000.jsonl'));
  assert.equal(archiveNow([cfg], arc).copiedBytes, 0);
  assert.equal(archiveKey('.claude', 'D--repo', 'room_chat/s2.1760000000000.jsonl'), archiveKey('.claude', 'D--repo', 's2.jsonl'));
});

test('subagents, tool-results and memory are archived', () => {
  const { cfg, proj, arc, out } = setup();
  fs.mkdirSync(path.join(proj, 's1', 'subagents'), { recursive: true });
  fs.mkdirSync(path.join(proj, 's1', 'tool-results'));
  fs.mkdirSync(path.join(proj, 'memory'));
  fs.writeFileSync(path.join(proj, 's1', 'subagents', 'agent-x.jsonl'), 'a\n');
  fs.writeFileSync(path.join(proj, 's1', 'tool-results', 't.txt'), 'out');
  fs.writeFileSync(path.join(proj, 'memory', 'm.md'), '# m');
  archiveNow([cfg], arc);
  for (const f of ['s1/subagents/agent-x.jsonl', 's1/tool-results/t.txt', 'memory/m.md']) assert.ok(fs.existsSync(path.join(out, f)), f);
});

test('missing archive dir: no throw, nothing written anywhere else', () => {
  const { root, cfg, proj } = setup();
  fs.writeFileSync(path.join(proj, 's1.jsonl'), 'a\n');
  const r = archiveNow([cfg], path.join(root, 'nope', 'X'));
  assert.deepEqual([r.ok, r.copiedFiles], [false, 0]);
  assert.ok(!fs.existsSync(path.join(root, 'nope')));
});
```

- [ ] **Step 2: Chạy** `node --no-warnings --test test/archive.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt `hub/archive.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';

export type ArchiveResult = { ok: boolean; reason: string; copiedFiles: number; copiedBytes: number };
type Offsets = Record<string, { bytes: number; mtimeMs: number }>;

export function archiveKey(configName: string, project: string, rel: string): string {
  const r = rel.replace(/\\/g, '/').replace(/^room_chat\//, '').replace(/^([^/]+)\.\d{10,}\.jsonl$/, '$1.jsonl');
  return `${configName}/${project}/${r}`;
}

function* walk(dir: string, rel = ''): Generator<string> {
  let ents: fs.Dirent[] = [];
  try { ents = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) yield* walk(dir, r);
    else if (/\.(jsonl|json|txt|md)$/.test(e.name)) yield r;
  }
}

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

export function archiveNow(configDirs: string[], archiveDir: string, onlySession?: string): ArchiveResult {
  const res: ArchiveResult = { ok: true, reason: '', copiedFiles: 0, copiedBytes: 0 };
  try { fs.accessSync(archiveDir, fs.constants.W_OK); } catch { return { ...res, ok: false, reason: `archive dir not writable: ${archiveDir}` }; }
  const offFile = path.join(archiveDir, 'offsets.json');
  let off: Offsets = {};
  try { off = JSON.parse(fs.readFileSync(offFile, 'utf8')); } catch { /* first run */ }
  for (const cfg of configDirs) {
    const cname = path.basename(cfg), projects = path.join(cfg, 'projects');
    for (const proj of fs.existsSync(projects) ? fs.readdirSync(projects) : []) {
      const pdir = path.join(projects, proj);
      for (const rel of walk(pdir)) {
        const key = archiveKey(cname, proj, rel);
        if (onlySession && !key.split('/')[2]?.startsWith(onlySession)) continue;
        const src = path.join(pdir, rel), dst = path.join(archiveDir, ...key.split('/'));
        let st: fs.Stats; try { st = fs.statSync(src); } catch { continue; }
        const prev = off[key];
        if (!rel.endsWith('.jsonl')) {                      // whole-file kinds
          if (prev && prev.bytes === st.size && prev.mtimeMs === st.mtimeMs) continue;
          fs.mkdirSync(path.dirname(dst), { recursive: true });
          fs.copyFileSync(src, dst);
          off[key] = { bytes: st.size, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += st.size;
          continue;
        }
        let from = prev?.bytes ?? 0;
        if (st.size < from) {                               // rewritten: keep the old copy
          if (fs.existsSync(dst)) fs.renameSync(dst, dst.replace(/\.jsonl$/, `.${stamp()}.jsonl`));
          from = 0;
        }
        if (st.size === from) continue;
        const buf = Buffer.alloc(st.size - from);
        const fd = fs.openSync(src, 'r');
        try { fs.readSync(fd, buf, 0, buf.length, from); } finally { fs.closeSync(fd); }
        const end = buf.lastIndexOf(0x0a) + 1;             // whole lines only
        if (!end) continue;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.appendFileSync(dst, buf.subarray(0, end));
        off[key] = { bytes: from + end, mtimeMs: st.mtimeMs }; res.copiedFiles++; res.copiedBytes += end;
      }
    }
  }
  fs.writeFileSync(offFile + '.tmp', JSON.stringify(off));
  fs.renameSync(offFile + '.tmp', offFile);
  return res;
}
```

Lưu ý: file `.jsonl` lớn (6 file >10 MB hiện có) lần đầu đọc cả file vào bộ nhớ một lần — chấp nhận được; nếu >200 MB thì chép theo khối 8 MB (ghi `shortcut:` comment nếu chưa làm).
- [ ] **Step 4: Tích hợp `hub/server.ts`** — `const archiveDir = () => loadSettings(opts.dir, envCap).archive.dir || process.env.BEAR_AGENT_ARCHIVE_DIR || '';`. Interval 10 phút (`unref`; tắt trong test bằng `opts.roomChatSweep === false`) gọi `archiveNow(configDirs(), dir)` khi `dir` khác rỗng; `ok:false` → `broadcast('archive', { ok:false, reason })` một lần cho tới khi `ok` trở lại (tab Worker hiện cảnh báo vàng "Không sao lưu được: …"). Hook `end` gọi `archiveNow(configDirs(), dir, id)` (bọc try/catch, hook không được chậm: chạy sau khi trả 200 bằng `setImmediate`). `sweepAll(true)` của Task 3b gọi `archiveNow` trước khi chuyển file. Route `GET /api/archive` → `{ dir, last: ArchiveResult & { at: number } }`.
- [ ] **Step 5: Chạy** `npm test` → PASS. Thử tay: đặt `archive.dir = X:\Coding\claude-mem` → sau 1 lượt có `X:\Coding\claude-mem\.claude\<project>\…`; gửi thêm tin trong một chat → chỉ phần mới được nối thêm; đổi tên thư mục đích → UI cảnh báo, không có gì ghi vào C:.
- [ ] **Step 6: Commit** — CHANGELOG `- Chat archive (phase 1): the hub copies new transcript bytes to archive.dir every 10 minutes and at session end; never deletes.` → `git commit -m "feat(hub): incremental chat archive"`.

---

### Task 4: Danh sách nhà cung cấp (`providers.json`) + API

**Files:**
- Create: `hub/providers.ts`
- Modify: `hub/server.ts`
- Test: `test/providers.test.ts`

**Interfaces:**
- Produces:

```ts
export type Tier = 'free' | 'paid';
export type Provider = {
  id: string; label: string; tier: Tier; enabled: boolean;
  baseUrl: string;
  auth: 'api-key' | 'auth-token';   // ANTHROPIC_API_KEY vs ANTHROPIC_AUTH_TOKEN
  key: string;                       // '' = chưa có
  models: { read: string[]; edit: string[] };
};
export type PublicProvider = Omit<Provider, 'key'> & { hasKey: boolean; keyHint: string };
export function defaultProviders(): Provider[];
export function loadProviders(home: string, legacyKeyFile?: string): Provider[];
export function saveProviders(home: string, list: Provider[]): void;
export function applyPatch(list: Provider[], id: string, patch: Partial<Provider> & { key?: string | null }): Provider[];
export function publicProvider(p: Provider): PublicProvider;
```

- Routes: `GET /api/providers` → `PublicProvider[]`; `PUT /api/providers/:id` body `Partial<Provider> & {key?: string|null}` → `PublicProvider`; `POST /api/providers` (thêm mới, `id` duy nhất `[a-z0-9-]+`); `DELETE /api/providers/:id` (không xoá được `intern`).

- [ ] **Step 1: Test hỏng** — `test/providers.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyPatch, defaultProviders, loadProviders, publicProvider, saveProviders } from '../hub/providers.ts';
import { makeHub } from './helpers.ts';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ar-prov-'));

test('defaults: intern free enabled, openrouter paid disabled', () => {
  const d = defaultProviders();
  assert.deepEqual(d.map((p) => [p.id, p.tier, p.enabled]), [['intern', 'free', true], ['openrouter', 'paid', false]]);
  assert.equal(d[0].baseUrl, 'https://discovery-api.intern-ai.org.cn');
  assert.deepEqual(d[0].models.read, ['deepseek-v4-flash-0731', 'glm-5.3', 'kimi-k2.6']);
});

test('load: missing or broken file -> defaults; legacy congnhan.key fills intern key', () => {
  const h = tmp();
  assert.equal(loadProviders(h)[0].key, '');
  fs.writeFileSync(path.join(h, 'providers.json'), '{broken');
  const legacy = path.join(h, 'congnhan.key'); fs.writeFileSync(legacy, ' sk-old \n');
  assert.equal(loadProviders(h, legacy)[0].key, 'sk-old');
});

test('patch: omitted or empty key keeps it, null clears it; save/load round trip', () => {
  const h = tmp();
  let l = applyPatch(defaultProviders(), 'intern', { key: 'sk-abcdef1234' });
  l = applyPatch(l, 'intern', { key: '' });
  l = applyPatch(l, 'intern', { enabled: false });
  assert.equal(l[0].key, 'sk-abcdef1234');
  assert.equal(l[0].enabled, false);
  saveProviders(h, l);
  assert.equal(loadProviders(h)[0].key, 'sk-abcdef1234');
  assert.equal(applyPatch(l, 'intern', { key: null })[0].key, '');
  assert.throws(() => applyPatch(l, 'nope', {}), /unknown provider/);
});

test('public view never leaks the key', () => {
  const p = publicProvider({ ...defaultProviders()[0], key: 'sk-abcdef1234' });
  assert.equal((p as any).key, undefined);
  assert.deepEqual([p.hasKey, p.keyHint], [true, '…1234']);
});

test('API: GET masks keys, PUT stores them', async () => {
  const { hub, call } = await makeHub();
  try {
    const put = await call('/api/providers/openrouter', { key: 'sk-or-9999', enabled: true }, { method: 'PUT' });
    assert.deepEqual([put.hasKey, put.keyHint, put.enabled], [true, '…9999', true]);
    const list = await call('/api/providers');
    assert.ok(!JSON.stringify(list).includes('sk-or-9999'));
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Chạy** → FAIL (module không có).
- [ ] **Step 3: nghiencuu — ĐÃ XONG (research-museAI, đối chiếu https://openrouter.ai/docs/guides/coding-agents/claude-code-integration):** `ANTHROPIC_BASE_URL=https://openrouter.ai/api`; key vào `ANTHROPIC_AUTH_TOKEN` (Bearer) và BẮT BUỘC `ANTHROPIC_API_KEY=""` (nếu không Claude Code gửi x-api-key, có thể xác thực sang Anthropic thật) → mặc định `auth: 'auth-token'` của `openrouter` là đúng, `worker.ps1` (Task 5) đã đặt `ANTHROPIC_API_KEY=""`. Không có tài liệu về `-p --bare` với OpenRouter → Task 5 Step 5 phải chạy thử một lần với `-Tier paid`; nếu `--bare` từ chối auth-token thì bỏ `--bare` cho provider `auth-token`. Ghi chú gốc của bước này: OpenRouter docs "Claude Code integration" / "Anthropic-compatible API": base URL chính xác (dự kiến `https://openrouter.ai/api`), header nhận key (`x-api-key` hay `Authorization: Bearer`) → quyết định `auth` mặc định của `openrouter`; ID model rẻ có tool calling cho `read`/`edit`. Lưu ý: `--bare` chỉ nhận `ANTHROPIC_API_KEY` hoặc apiKeyHelper (xác nhận trên docs Claude Code) → nếu OpenRouter chỉ nhận Bearer thì `worker.ps1` phải bỏ `--bare` cho provider đó và dùng `--strict-mcp-config --setting-sources ""` (ghi rõ trong prompt subagent).
- [ ] **Step 4: Cài đặt `hub/providers.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';

export type Tier = 'free' | 'paid';
export type Provider = {
  id: string; label: string; tier: Tier; enabled: boolean; baseUrl: string;
  auth: 'api-key' | 'auth-token'; key: string; models: { read: string[]; edit: string[] };
};
export type PublicProvider = Omit<Provider, 'key'> & { hasKey: boolean; keyHint: string };

const FILE = 'providers.json';

export function defaultProviders(): Provider[] {
  return [
    { id: 'intern', label: 'Intern AI (free)', tier: 'free', enabled: true, baseUrl: 'https://discovery-api.intern-ai.org.cn', auth: 'api-key', key: '',
      models: { read: ['deepseek-v4-flash-0731', 'glm-5.3', 'kimi-k2.6'], edit: ['kimi-k2.6', 'glm-5.3', 'deepseek-v4-pro-0813'] } },
    // Values below are confirmed by the nghiencuu step of Task 4 before merging.
    { id: 'openrouter', label: 'OpenRouter (trả tiền)', tier: 'paid', enabled: false, baseUrl: 'https://openrouter.ai/api', auth: 'auth-token', key: '',
      models: { read: [], edit: [] } },
  ];
}

const clean = (p: any, base?: Provider): Provider => ({
  id: String(p.id ?? base?.id ?? ''), label: String(p.label ?? base?.label ?? p.id ?? ''),
  tier: p.tier === 'paid' ? 'paid' : (p.tier === 'free' ? 'free' : base?.tier ?? 'paid'),
  enabled: typeof p.enabled === 'boolean' ? p.enabled : base?.enabled ?? false,
  baseUrl: String(p.baseUrl ?? base?.baseUrl ?? ''),
  auth: p.auth === 'auth-token' ? 'auth-token' : (p.auth === 'api-key' ? 'api-key' : base?.auth ?? 'api-key'),
  key: typeof p.key === 'string' ? p.key.trim() : base?.key ?? '',
  models: {
    read: Array.isArray(p.models?.read) ? p.models.read.map(String) : base?.models.read ?? [],
    edit: Array.isArray(p.models?.edit) ? p.models.edit.map(String) : base?.models.edit ?? [],
  },
});

export function loadProviders(home: string, legacyKeyFile?: string): Provider[] {
  let list = defaultProviders();
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(home, FILE), 'utf8'));
    if (Array.isArray(raw)) {
      const byId = new Map(list.map((p) => [p.id, p]));
      for (const r of raw) if (r?.id) byId.set(String(r.id), clean(r, byId.get(String(r.id))));
      list = [...byId.values()];
    }
  } catch { /* missing or broken file: defaults */ }
  const intern = list.find((p) => p.id === 'intern');
  if (intern && !intern.key && legacyKeyFile) {
    try { intern.key = fs.readFileSync(legacyKeyFile, 'utf8').trim(); } catch { /* no legacy key */ }
  }
  return list;
}

export function saveProviders(home: string, list: Provider[]): void {
  fs.mkdirSync(home, { recursive: true });
  const file = path.join(home, FILE);
  fs.writeFileSync(file + '.tmp', JSON.stringify(list, null, 2), { mode: 0o600 });
  fs.renameSync(file + '.tmp', file);
}

export function applyPatch(list: Provider[], id: string, patch: Partial<Provider> & { key?: string | null }): Provider[] {
  const cur = list.find((p) => p.id === id);
  if (!cur) throw new StoreError(404, `unknown provider ${id}`);
  const { key, ...rest } = patch;
  const next = clean({ ...rest, id }, cur);
  next.key = key === null ? '' : (typeof key === 'string' && key.trim() ? key.trim() : cur.key);
  return list.map((p) => (p.id === id ? next : p));
}

export function publicProvider(p: Provider): PublicProvider {
  const { key, ...rest } = p;
  return { ...rest, hasKey: !!key, keyHint: key ? '…' + key.slice(-4) : '' };
}
```

Kiểm tra `StoreError` có export từ `hub/store.ts` với constructor `(status, message)` (server.ts dùng `new StoreError(413, …)` → đúng).
- [ ] **Step 5: Route trong `hub/server.ts`** (trong `route()`, sau `/api/workers/...`). Thêm `import os from 'node:os'` và `import { applyPatch, loadProviders, publicProvider, saveProviders, type Provider } from './providers.ts'`:

```ts
    // ---- providers: worker endpoints + keys (keys never leave the hub) ----
    const legacyKey = path.join(os.homedir(), '.claude', 'congnhan.key');
    if (m === 'GET' && p === '/api/providers') return json(res, 200, loadProviders(opts.dir, legacyKey).map(publicProvider));
    const pv = p.match(/^\/api\/providers\/([a-z0-9-]+)$/);
    if (pv && m === 'PUT') {
      const list = applyPatch(loadProviders(opts.dir, legacyKey), pv[1], await readBody(req));
      saveProviders(opts.dir, list);
      broadcast('providers', list.map(publicProvider));
      return json(res, 200, publicProvider(list.find((x) => x.id === pv[1])!));
    }
    if (m === 'POST' && p === '/api/providers') {
      const b = await readBody(req);
      if (!/^[a-z0-9-]{2,32}$/.test(String(b.id ?? ''))) throw new StoreError(400, 'id must be 2-32 chars a-z 0-9 -');
      const list = loadProviders(opts.dir, legacyKey);
      if (list.some((x) => x.id === b.id)) throw new StoreError(409, `provider ${b.id} exists`);
      list.push({ id: b.id, label: b.id, tier: 'paid', enabled: false, baseUrl: '', auth: 'api-key', key: '', models: { read: [], edit: [] } });
      const next = applyPatch(list, b.id, b);
      saveProviders(opts.dir, next);
      return json(res, 200, publicProvider(next.find((x) => x.id === b.id)!));
    }
    if (pv && m === 'DELETE') {
      if (pv[1] === 'intern') throw new StoreError(400, 'the free provider cannot be removed');
      const list = loadProviders(opts.dir, legacyKey).filter((x) => x.id !== pv[1]);
      saveProviders(opts.dir, list);
      return json(res, 200, { ok: true });
    }
```

Lưu ý: kiểm tra handler lỗi ở cuối `route()` (`route(req,res).catch(...)`) đã đổi `StoreError` thành mã HTTP; nếu không, bọc giống các route khác. Lưu ý CORS/origin: `PUT`/`DELETE` đi qua cùng kiểm tra token+origin như POST.
- [ ] **Step 6: Chạy** `npm test` → PASS.
- [ ] **Step 7: Commit** — CHANGELOG: `- Hub keeps worker providers (free Intern AI, paid OpenRouter) in providers.json; /api/providers never returns keys.` → `git commit -m "feat(hub): worker providers registry"`.

---

### Task 5: `worker.ps1` chọn tầng free/paid từ `providers.json`

**Files:**
- Modify: `skills/worker/worker.ps1`, `skills/worker/SKILL.md`, `skills/osin/SKILL.md`
- Test: `test/skills.test.ts` (kiểm tĩnh) + chạy tay

**Interfaces:**
- Consumes: định dạng `providers.json` của Task 4; `settings.json` của Task 8 (`allowPaidFallback`, `skills.<kind>.enabled`) — nếu Task 8 chưa xong, script coi như `allowPaidFallback=false`, skill bật.
- Produces: param mới `-Tier auto|free|paid` (mặc định `auto`), `-Provider <id>` (ghim một provider). Dòng log `start` thêm `tier`, `provider`; dòng `end` thêm `provider`, `tier`, `usage: {in, out, cacheRead, cacheWrite}`. Mã thoát mới: `4` = skill bị tắt trong Cài đặt.
- `auto` = các provider `tier=free` bật + có key, theo thứ tự file; nếu tất cả trả QUOTA (exit 3) và `allowPaidFallback` → các provider `tier=paid` bật + có key.

- [ ] **Step 1: Test tĩnh hỏng** — thêm vào `test/skills.test.ts`:

```ts
test('worker.ps1 reads providers.json, supports -Tier and logs usage', () => {
  const ps = fs.readFileSync(path.join(SKILLS, 'worker', 'worker.ps1'), 'utf8');
  for (const s of ['providers.json', '[ValidateSet("auto", "free", "paid")][string]$Tier', 'usage = @{', 'exit 4', 'ANTHROPIC_AUTH_TOKEN']) {
    assert.ok(ps.includes(s), `worker.ps1 missing ${s}`);
  }
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Viết lại phần chọn provider trong `worker.ps1`** (thay khối đọc key + `$chain` + vòng lặp; giữ nguyên phần slot gate/log). Code:

```powershell
param(
    [Parameter(Mandatory)][string]$PromptFile,
    [string]$Model = "auto",
    [string]$Dir = (Get-Location).Path,
    [string]$Tools = "Read,Grep,Glob,Bash",
    [ValidateSet("worker", "osin", "congnhan", "vesinh")][string]$Kind = "worker",
    [ValidateSet("auto", "free", "paid")][string]$Tier = "auto",
    [string]$Provider = "",                              # pin one provider id from providers.json
    [string]$Task = "",
    [string]$By = $env:CLAUDE_CODE_SESSION_ID
)
# ... ($hubHome, $logFile, $runId, Log-Line, Short giữ nguyên) ...

function Read-Json($f) { try { if (Test-Path $f) { return (Get-Content -Raw $f | ConvertFrom-Json) } } catch { } return $null }
$settings = Read-Json (Join-Path $hubHome "settings.json")
if ($settings -and $settings.skills -and $settings.skills.$Kind -and $settings.skills.$Kind.enabled -eq $false) {
    Write-Output "[worker] skill '$Kind' is turned off in Bear Agent Manager settings: do the task yourself"; exit 4
}
$allowPaid = [bool]($settings -and $settings.allowPaidFallback)

# providers.json (written by the hub); without it: the built-in free provider + legacy key file / env.
$providers = @(Read-Json (Join-Path $hubHome "providers.json"))
if (-not $providers -or -not $providers[0]) {
    $providers = @([pscustomobject]@{ id = "intern"; tier = "free"; enabled = $true; auth = "api-key"; key = "";
        baseUrl = $(if ($env:WORKER_BASE_URL) { $env:WORKER_BASE_URL } elseif ($env:CONGNHAN_BASE_URL) { $env:CONGNHAN_BASE_URL } else { "https://discovery-api.intern-ai.org.cn" });
        models = [pscustomobject]@{ read = @("deepseek-v4-flash-0731", "glm-5.3", "kimi-k2.6"); edit = @("kimi-k2.6", "glm-5.3", "deepseek-v4-pro-0813") } })
}
foreach ($p in $providers) {
    if ($p.id -eq "intern" -and -not $p.key) {
        $kf = Join-Path $HOME ".claude\congnhan.key"
        $p.key = if ($env:INTERN_API_KEY) { $env:INTERN_API_KEY } elseif (Test-Path $kf) { (Get-Content -Raw $kf).Trim() } else { "" }
    }
}
$usable = { param($t) $providers | Where-Object { $_.enabled -and $_.key -and $_.tier -eq $t -and (-not $Provider -or $_.id -eq $Provider) } }
$plan = switch ($Tier) {
    "free" { @(& $usable "free") }
    "paid" { @(& $usable "paid") }
    default { @(& $usable "free") + $(if ($allowPaid) { @(& $usable "paid") } else { @() }) }
}
if (-not $plan) { Write-Error "No usable provider for tier '$Tier' (add a key in Bear Agent Manager > Cài đặt)"; exit 2 }
```

Vòng chạy (thay vòng `foreach ($m in $chain)` cũ):

```powershell
$edits = $Tools -match 'Edit|Write'
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
$env:CLAUDE_CONFIG_DIR = Join-Path $hubHome "worker-config"
New-Item -ItemType Directory -Force $env:CLAUDE_CONFIG_DIR | Out-Null
Set-Location $Dir
$quotaRx = '429|402|quota|rate.?limit|insufficient|balance|exceed|限额|余额|额度|墨点'
$j = $null; $err = ""; $m = ""; $prov = $null
foreach ($prov in $plan) {
    $env:ANTHROPIC_BASE_URL = $prov.baseUrl
    if ($prov.auth -eq "auth-token") { $env:ANTHROPIC_AUTH_TOKEN = $prov.key; $env:ANTHROPIC_API_KEY = "" }
    else { $env:ANTHROPIC_API_KEY = $prov.key; Remove-Item Env:ANTHROPIC_AUTH_TOKEN -ErrorAction SilentlyContinue }
    $chain = if ($Model -ne "auto") { @($Model) } elseif ($edits) { @($prov.models.edit) } else { @($prov.models.read) }
    $quota = $false
    foreach ($m in $chain) {
        foreach ($v in "ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL") { Set-Item "Env:$v" $m }
        for ($try = 1; $try -le 2; $try++) {
            $out = $prompt | claude -p --bare --model $m --tools $Tools --allowedTools $Tools --strict-mcp-config --output-format json 2>&1 | Out-String
            $last = ($out.Trim() -split "`r?`n")[-1]
            try { $j = $last | ConvertFrom-Json } catch { $j = $null }
            if ($j -and -not $j.is_error) { Write-Output "[worker] provider=$($prov.id) model=$m"; Write-Output $last; Finish 0 $m $j "" }
            $err = if ($j) { "$($j.api_error_status) $($j.result)" } else { $out }
            if ($err -notmatch $quotaRx) { break }
            if ($try -eq 1 -and $err -match '429|rate.?limit') { Start-Sleep 65; continue }
            $quota = $true; break
        }
        if ($quota) { break }                         # quota is per provider: switching model won't help
        Write-Output "[worker] provider=$($prov.id) model=$m failed :: $err"
    }
    if ($quota) { Write-Output "[worker] QUOTA provider=$($prov.id) :: $err"; continue }   # next provider (paid fallback)
}
if ($quota) { Finish 3 $m $j "QUOTA $err" }
Finish 1 $m $j $err
```

`Finish` ghi thêm provider/tier/usage:

```powershell
function Finish($code, $model, $j, $err) {
    $cost = if ($j -and $j.total_cost_usd -ne $null) { $j.total_cost_usd } else { $null }
    $res = if ($j -and $code -eq 0) { Short $j.result 200 } else { "" }
    $u = if ($j -and $j.usage) { $j.usage } else { $null }
    $usage = @{ in = [int]$u.input_tokens; out = [int]$u.output_tokens; cacheRead = [int]$u.cache_read_input_tokens; cacheWrite = [int]$u.cache_creation_input_tokens }
    Log-Line @{ event = "end"; exit = $code; model = $model; provider = "$($prov.id)"; tier = "$($prov.tier)"; cost = $cost; usage = $usage; error = (Short $err 200); result = $res }
    exit $code
}
```

(Với `$u = $null`, `[int]$null` = 0 → không NaN.) Log `start` thêm `tier = $Tier`.
- [ ] **Step 4: Chạy** `npm test` → PASS; BOM vẫn còn.
- [ ] **Step 5: Chạy tay 3 kịch bản** (ghi output vào scratchpad, báo lại cho chủ repo):
  1. `-Tier free` với key Intern thật → exit 0, dòng `end` có `usage.in > 0`, `provider=intern`.
  2. Đổi key Intern thành sai trong `providers.json` → exit 1 (không phải 3), không gọi OpenRouter.
  3. `-Tier paid` khi OpenRouter chưa có key → exit 2 với thông báo "No usable provider".
- [ ] **Step 6: Cập nhật SKILL.md** (worker + osin): bảng mã thoát thêm `4 = skill tắt → tự làm`; mục Setup: "key nhập ở tab Cài đặt (lưu `~/.bear-agent-manager/providers.json`); `~/.claude/congnhan.key` / `INTERN_API_KEY` vẫn dùng được"; thêm `-Tier paid` cho việc cần model mạnh, "chỉ khi chủ repo cho phép".
- [ ] **Step 7: Commit** — CHANGELOG: `- worker.ps1: -Tier auto|free|paid, providers from providers.json, paid fallback on quota when allowed, token usage logged.` → `git commit -m "feat(worker): tiered providers and usage logging"`.

---

### Task 6: `mergeWorkerLog` đọc provider / tier / usage

**Files:**
- Modify: `hub/workers.ts`
- Test: `test/workers.test.ts`

**Interfaces:**
- Produces: `WorkerRun` thêm `provider: string; tier: 'free' | 'paid' | ''; usage: Usage` với `export type Usage = { in: number; out: number; cacheRead: number; cacheWrite: number }`; `export const ZERO_USAGE: Usage`.

- [ ] **Step 1: Test hỏng**:

```ts
test('mergeWorkerLog reads provider, tier and usage; missing usage is zero', () => {
  const h = mergeWorkerLog([
    { event: 'start', id: 'a', kind: 'worker', ts: 1 },
    { event: 'end', id: 'a', exit: 0, provider: 'intern', tier: 'free', usage: { in: 1200, out: 300, cacheRead: 50, cacheWrite: 0 }, ts: 5 },
    { event: 'start', id: 'b', kind: 'worker', ts: 2 },
    { event: 'end', id: 'b', exit: 1, ts: 3 },
  ]);
  const a = h.find((r) => r.id === 'a')!, b = h.find((r) => r.id === 'b')!;
  assert.deepEqual([a.provider, a.tier, a.usage], ['intern', 'free', { in: 1200, out: 300, cacheRead: 50, cacheWrite: 0 }]);
  assert.deepEqual([b.provider, b.tier, b.usage], ['', '', { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 }]);
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** trong `hub/workers.ts`:

```ts
export type Usage = { in: number; out: number; cacheRead: number; cacheWrite: number };
export const ZERO_USAGE: Usage = Object.freeze({ in: 0, out: 0, cacheRead: 0, cacheWrite: 0 }) as Usage;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const toUsage = (u: any): Usage => ({ in: n(u?.in), out: n(u?.out), cacheRead: n(u?.cacheRead), cacheWrite: n(u?.cacheWrite) });
// WorkerRun: thêm  provider: string; tier: 'free' | 'paid' | ''; usage: Usage;
// start:  provider: '', tier: '', usage: { ...ZERO_USAGE },
// end:
      r.provider = String(l.provider ?? '');
      r.tier = l.tier === 'free' || l.tier === 'paid' ? l.tier : '';
      r.usage = toUsage(l.usage);
```

- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(hub): worker runs carry provider, tier and token usage"`.

---

### Task 7: Tổng hợp token (`/api/tokens`)

**Files:**
- Create: `hub/tokens.ts`
- Modify: `hub/server.ts`
- Test: `test/tokens.test.ts`

**Interfaces:**
- Consumes: `WorkerRun` (Task 6), `PublicSession` (`ctx`, `name`, `status`, `cwd`) từ `hub/server.ts`.
- Produces:

```ts
export type Bucket = { runs: number; in: number; out: number; cacheRead: number; cacheWrite: number; failed: number };
export type TokenSummary = {
  sinceMs: number;
  total: Bucket;
  byTier: Record<'free' | 'paid' | 'unknown', Bucket>;
  byProvider: Record<string, Bucket>;
  byModel: Record<string, Bucket>;
  byDay: { day: string; free: number; paid: number }[];   // day = YYYY-MM-DD (giờ địa phương), giá trị = in+out
  chats: { id: string; name: string; ctx: number; status: string; repo: string }[];  // sắp theo ctx giảm dần
};
export function summarize(runs: WorkerRun[], sessions: PublicSession[], sinceMs: number, tzOffsetMin?: number): TokenSummary;
```

- Route: `GET /api/tokens?days=7` (1–90, mặc định 7) → `TokenSummary`.

- [ ] **Step 1: Test hỏng** — `test/tokens.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../hub/tokens.ts';
import { makeHub } from './helpers.ts';

const run = (o: any) => ({ id: 'x', pid: null, kind: 'worker', dir: '', task: '', tools: '', status: 'done', startedAt: 0, durationMs: 1, model: 'm', cost: null, error: '', result: '', by: '', skill: 'worker', provider: '', tier: '', usage: { in: 0, out: 0, cacheRead: 0, cacheWrite: 0 }, ...o });
const DAY = 86_400_000;

test('summarize buckets by tier, provider, model and day; unknown tier for old lines', () => {
  const s = summarize([
    run({ startedAt: 0, tier: 'free', provider: 'intern', model: 'glm-5.3', usage: { in: 100, out: 10, cacheRead: 0, cacheWrite: 0 } }),
    run({ startedAt: DAY, tier: 'paid', provider: 'openrouter', model: 'x', usage: { in: 50, out: 5, cacheRead: 0, cacheWrite: 0 } }),
    run({ startedAt: DAY, status: 'failed' }),
  ], [], 0, 0);
  assert.equal(s.total.runs, 3);
  assert.equal(s.total.in, 150);
  assert.equal(s.byTier.free.out, 10);
  assert.equal(s.byTier.unknown.failed, 1);
  assert.equal(s.byProvider.openrouter.in, 50);
  assert.equal(s.byModel['glm-5.3'].runs, 1);
  assert.deepEqual(s.byDay, [{ day: '1970-01-01', free: 110, paid: 0 }, { day: '1970-01-02', free: 0, paid: 55 }]);
});

test('summarize ignores runs before sinceMs and lists chats by context size', () => {
  const s = summarize([run({ startedAt: 5 })], [
    { id: 'a', name: 'small', ctx: 10, status: 'idle', cwd: 'D:\\r\\one' } as any,
    { id: 'b', name: 'big', ctx: 900, status: 'busy', cwd: '/x/two' } as any,
  ], 10, 0);
  assert.equal(s.total.runs, 0);
  assert.deepEqual(s.chats.map((c) => [c.name, c.repo]), [['big', 'two'], ['small', 'one']]);
});

test('GET /api/tokens answers with a summary', async () => {
  const { hub, call } = await makeHub();
  try {
    const s = await call('/api/tokens?days=3');
    assert.equal(s.total.runs, 0);
    assert.ok(Array.isArray(s.chats));
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt `hub/tokens.ts`**:

```ts
import type { PublicSession } from './server.ts';
import type { WorkerRun } from './workers.ts';

export type Bucket = { runs: number; in: number; out: number; cacheRead: number; cacheWrite: number; failed: number };
export type TokenSummary = {
  sinceMs: number; total: Bucket;
  byTier: Record<'free' | 'paid' | 'unknown', Bucket>;
  byProvider: Record<string, Bucket>; byModel: Record<string, Bucket>;
  byDay: { day: string; free: number; paid: number }[];
  chats: { id: string; name: string; ctx: number; status: string; repo: string }[];
};

const empty = (): Bucket => ({ runs: 0, in: 0, out: 0, cacheRead: 0, cacheWrite: 0, failed: 0 });
function add(b: Bucket, r: WorkerRun) {
  b.runs++; b.in += r.usage.in; b.out += r.usage.out; b.cacheRead += r.usage.cacheRead; b.cacheWrite += r.usage.cacheWrite;
  if (r.status === 'failed') b.failed++;
}
const pick = (m: Record<string, Bucket>, k: string) => (m[k] ??= empty());

export function summarize(runs: WorkerRun[], sessions: PublicSession[], sinceMs: number, tzOffsetMin = new Date().getTimezoneOffset()): TokenSummary {
  const s: TokenSummary = { sinceMs, total: empty(), byTier: { free: empty(), paid: empty(), unknown: empty() }, byProvider: {}, byModel: {}, byDay: [], chats: [] };
  const days = new Map<string, { day: string; free: number; paid: number }>();
  for (const r of runs) {
    if (r.startedAt < sinceMs) continue;
    add(s.total, r);
    add(s.byTier[r.tier || 'unknown'], r);
    add(pick(s.byProvider, r.provider || 'unknown'), r);
    add(pick(s.byModel, r.model || 'unknown'), r);
    if (r.tier) {
      const day = new Date(r.startedAt - tzOffsetMin * 60_000).toISOString().slice(0, 10);
      const d = days.get(day) ?? { day, free: 0, paid: 0 };
      d[r.tier] += r.usage.in + r.usage.out;
      days.set(day, d);
    }
  }
  s.byDay = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
  s.chats = sessions.filter((x) => x.ctx > 0)
    .map((x) => ({ id: x.id, name: x.name, ctx: x.ctx, status: x.status, repo: x.cwd.split(/[\\/]/).filter(Boolean).pop() ?? '' }))
    .sort((a, b) => b.ctx - a.ctx);
  return s;
}
```

Route trong `hub/server.ts`:

```ts
    if (m === 'GET' && p === '/api/tokens') {
      const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days')) || 7));
      const since = Date.now() - days * 86_400_000;
      return json(res, 200, summarize(readWorkerLog(workerLog, since), Object.values(store.state.sessions).map(publicSession), since));
    }
```

Lưu ý: `WORKER_HISTORY_MS` (24h) chỉ áp cho panel; `/api/tokens` đọc theo `days`. Nếu `workers.jsonl` lớn (>20 MB) thì ghi `shortcut:` comment, chưa tối ưu.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(hub): token summary API"` (add `hub/tokens.ts` `hub/server.ts` `test/tokens.test.ts`).

---

### Task 8: Cài đặt (`settings.json`) + chặn slot khi worker/osin tắt

**Files:**
- Create: `hub/settings.ts`
- Modify: `hub/server.ts`, `skills/worker/worker.ps1`
- Test: `test/settings.test.ts`

**Interfaces:**
- Produces:

```ts
export type SkillMode = 'force' | 'auto' | 'ban';
export type SkillRule = { mode: SkillMode; when: 'every' | 'first' };
export type AutoJobs = {
  handoff: { enabled: boolean; thresholdK: number };   // chat vượt N nghìn token context → osin làm hồ sơ bàn giao
  digest: { enabled: boolean; minChars: number };      // tin nhắn phòng dài hơn N ký tự → osin rút gọn trước khi giao
  notes: { enabled: boolean; minNotes: number };       // biên bản phòng vượt N mục → osin đề xuất gộp/bỏ
  maxRunsPerDay: number;                               // trần số lần hub tự chạy worker trong 24h
};
export type Settings = {
  skills: { worker: { enabled: boolean }; osin: { enabled: boolean } };  // chặn cứng (slot)
  agentSkills: Record<string, Record<string, SkillRule>>;  // key ngoài = tên agent chuẩn hoá (normAgent); key trong = tên skill đầy đủ, vd "superpowers:brainstorming"; "superpowers:*" = mọi skill của plugin
  autoJobs: AutoJobs;
  allowPaidFallback: boolean;
  workerCap: number;                                   // 1..16
  roomChat: { autoSweep: boolean };
  archive: { dir: string };                            // Task 3c; '' = tắt
};
export function defaultSettings(envCap?: number): Settings;
export function loadSettings(home: string, envCap?: number): Settings;
export function saveSettings(home: string, s: Settings): void;
export function patchSettings(s: Settings, patch: any): Settings;   // validate + merge sâu; agentSkills[agent][skill] = null → xoá rule; agentSkills[agent] = null → xoá cả agent
export const normAgent: (name: string) => string;                   // trim + lowercase (mention trong hub không phân biệt hoa thường)
```

- Routes: `GET /api/settings`, `PUT /api/settings`. `/api/workers/slot?self=&kind=worker|osin` → `{ ok:false, disabled:true, running:0, cap }` khi skill tắt.

- [ ] **Step 1: Test hỏng** — `test/settings.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultSettings, loadSettings, normAgent, patchSettings, saveSettings } from '../hub/settings.ts';
import { makeHub } from './helpers.ts';

test('defaults: workers on, everything automatic off, no skill rules', () => {
  const d = defaultSettings(4);
  assert.deepEqual([d.skills.worker.enabled, d.skills.osin.enabled, d.allowPaidFallback, d.workerCap, d.roomChat.autoSweep], [true, true, false, 4, false]);
  assert.deepEqual([d.autoJobs.handoff.enabled, d.autoJobs.digest.enabled, d.autoJobs.notes.enabled, d.autoJobs.maxRunsPerDay], [false, false, false, 10]);
  assert.deepEqual(d.agentSkills, {});
});

test('patch validates and merges deeply', () => {
  let s = patchSettings(defaultSettings(4), {
    skills: { osin: { enabled: false } }, workerCap: 99,
    agentSkills: { ' Boss ': { 'superpowers:*': { mode: 'force', when: 'first' }, bad: { mode: 'weird' }, 'x y': { mode: 'ban' } } },
    autoJobs: { handoff: { enabled: true } },
  });
  assert.deepEqual([s.skills.worker.enabled, s.skills.osin.enabled, s.workerCap], [true, false, 16]);
  assert.deepEqual(s.agentSkills, { boss: { 'superpowers:*': { mode: 'force', when: 'first' } } });
  assert.deepEqual(s.autoJobs.handoff, { enabled: true, thresholdK: 300 });
  s = patchSettings(s, { agentSkills: { Planner: { 'ponytail:ponytail': { mode: 'force' } } } });
  assert.deepEqual(Object.keys(s.agentSkills).sort(), ['boss', 'planner']);
  assert.deepEqual(s.agentSkills.planner, { 'ponytail:ponytail': { mode: 'force', when: 'every' } });
  s = patchSettings(s, { agentSkills: { boss: { 'superpowers:*': null }, planner: null } });
  assert.deepEqual(s.agentSkills, {});
  assert.equal(normAgent('  Quan-Ly-Cong-Nhan '), 'quan-ly-cong-nhan');
});

test('broken file falls back to defaults; round trip', () => {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-set-'));
  fs.writeFileSync(path.join(h, 'settings.json'), 'nope');
  assert.equal(loadSettings(h, 4).workerCap, 4);
  saveSettings(h, patchSettings(defaultSettings(4), { allowPaidFallback: true }));
  assert.equal(loadSettings(h, 4).allowPaidFallback, true);
});

test('slot is refused for a disabled skill', async () => {
  const { hub, call } = await makeHub(undefined, undefined, { workerCap: 4 });
  try {
    await call('/api/settings', { skills: { worker: { enabled: false } } }, { method: 'PUT' });
    assert.deepEqual(await call('/api/workers/slot?self=1&kind=worker'), { ok: false, disabled: true, running: 0, cap: 4 });
    assert.equal((await call('/api/workers/slot?self=1&kind=osin')).ok, true);
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt `hub/settings.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';

export type SkillMode = 'force' | 'auto' | 'ban';
export type SkillRule = { mode: SkillMode; when: 'every' | 'first' };
export type AutoJobs = {
  handoff: { enabled: boolean; thresholdK: number }; digest: { enabled: boolean; minChars: number };
  notes: { enabled: boolean; minNotes: number }; maxRunsPerDay: number;
};
export type Settings = {
  skills: { worker: { enabled: boolean }; osin: { enabled: boolean } };
  agentSkills: Record<string, Record<string, SkillRule>>;
  autoJobs: AutoJobs; allowPaidFallback: boolean; workerCap: number; roomChat: { autoSweep: boolean }; archive: { dir: string };
};

const FILE = 'settings.json';
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number, lo: number, hi: number) => (v == null || !Number.isFinite(Number(v)) ? d : Math.min(hi, Math.max(lo, Math.round(Number(v)))));
export const normAgent = (name: string) => String(name ?? '').trim().toLowerCase();

export function defaultSettings(envCap = 4): Settings {
  return {
    skills: { worker: { enabled: true }, osin: { enabled: true } }, agentSkills: {},
    autoJobs: { handoff: { enabled: false, thresholdK: 300 }, digest: { enabled: false, minChars: 4000 }, notes: { enabled: false, minNotes: 15 }, maxRunsPerDay: 10 },
    allowPaidFallback: false, workerCap: envCap, roomChat: { autoSweep: false }, archive: { dir: '' },
  };
}

function rules(cur: Record<string, SkillRule>, patch: any): Record<string, SkillRule> {
  if (!patch || typeof patch !== 'object') return cur;
  const out = { ...cur };
  for (const [name, r] of Object.entries<any>(patch)) {
    if (!/^[\w.-]+(:([\w.-]+|\*))?$/.test(name)) continue;   // "plugin:skill", "plugin:*" or a user skill
    if (r === null) { delete out[name]; continue; }
    if (!['force', 'auto', 'ban'].includes(r?.mode)) continue;
    out[name] = { mode: r.mode, when: r.when === 'first' ? 'first' : 'every' };
  }
  return out;
}

export function patchSettings(s: Settings, p: any): Settings {
  const agents = { ...s.agentSkills };
  if (p?.agentSkills && typeof p.agentSkills === 'object') {
    for (const [name, r] of Object.entries<any>(p.agentSkills)) {
      const k = normAgent(name);
      if (!k) continue;
      if (r === null) { delete agents[k]; continue; }
      agents[k] = rules(agents[k] ?? {}, r);
      if (!Object.keys(agents[k]).length) delete agents[k];
    }
  }
  const aj = p?.autoJobs ?? {};
  return {
    skills: {
      worker: { enabled: bool(p?.skills?.worker?.enabled, s.skills.worker.enabled) },
      osin: { enabled: bool(p?.skills?.osin?.enabled, s.skills.osin.enabled) },
    },
    agentSkills: agents,
    autoJobs: {
      handoff: { enabled: bool(aj.handoff?.enabled, s.autoJobs.handoff.enabled), thresholdK: int(aj.handoff?.thresholdK, s.autoJobs.handoff.thresholdK, 50, 2000) },
      digest: { enabled: bool(aj.digest?.enabled, s.autoJobs.digest.enabled), minChars: int(aj.digest?.minChars, s.autoJobs.digest.minChars, 1000, 100_000) },
      notes: { enabled: bool(aj.notes?.enabled, s.autoJobs.notes.enabled), minNotes: int(aj.notes?.minNotes, s.autoJobs.notes.minNotes, 5, 500) },
      maxRunsPerDay: int(aj.maxRunsPerDay, s.autoJobs.maxRunsPerDay, 0, 200),
    },
    allowPaidFallback: bool(p?.allowPaidFallback, s.allowPaidFallback),
    workerCap: int(p?.workerCap, s.workerCap, 1, 16),
    roomChat: { autoSweep: bool(p?.roomChat?.autoSweep, s.roomChat.autoSweep) },
    archive: { dir: typeof p?.archive?.dir === 'string' ? p.archive.dir.trim() : s.archive.dir },
  };
}

export function loadSettings(home: string, envCap = 4): Settings {
  try { return patchSettings(defaultSettings(envCap), JSON.parse(fs.readFileSync(path.join(home, FILE), 'utf8'))); }
  catch { return defaultSettings(envCap); }
}

export function saveSettings(home: string, s: Settings): void {
  fs.mkdirSync(home, { recursive: true });
  const f = path.join(home, FILE);
  fs.writeFileSync(f + '.tmp', JSON.stringify(s, null, 2));
  fs.renameSync(f + '.tmp', f);
}
```

`hub/server.ts`: `const envCap = Number(process.env.BEAR_AGENT_WORKER_CAP ?? 4); const cap = () => opts.workerCap ?? loadSettings(opts.dir, envCap).workerCap;` — thay mọi chỗ dùng `workerCap` bằng `cap()` (`opts.workerCap` của test thắng file). Route:

```ts
    if (m === 'GET' && p === '/api/settings') return json(res, 200, loadSettings(opts.dir, envCap));
    if (m === 'PUT' && p === '/api/settings') {
      const next = patchSettings(loadSettings(opts.dir, envCap), await readBody(req));
      saveSettings(opts.dir, next);
      broadcast('settings', next);
      return json(res, 200, next);
    }
```

Trong `/api/workers/slot`, trước khi tính `running`:

```ts
      const kind = url.searchParams.get('kind') === 'osin' ? 'osin' : 'worker';
      if (!loadSettings(opts.dir, envCap).skills[kind].enabled) return json(res, 200, { ok: false, disabled: true, running: 0, cap: cap() });
```

`worker.ps1`: URL slot thêm `&kind=$Kind`; nếu `$s.disabled` → `Write-Output "[worker] skill '$Kind' is off"; exit 4`.
- [ ] **Step 4: Chạy** `npm test` → PASS.
- [ ] **Step 5: Commit** — CHANGELOG `- Settings: worker/osin on/off, paid fallback, worker cap (settings.json).` → `git commit -m "feat(hub): settings"`.

---

### Task 8b: Ép / tự quyết / cấm skill trong hội thoại, theo từng agent (A5)

**Files:**
- Create: `hub/skillmodes.ts`
- Modify: `hub/server.ts` (hook `prompt`, route `/api/skills`), `hub/store.ts` (đếm tin nhắn mỗi phiên nếu chưa có)
- Test: `test/skillmodes.test.ts`, `test/hooks.test.ts`

**Interfaces:**
- Consumes: `Settings.agentSkills`, `normAgent` (Task 8); `store.session(id).name` (tên agent hiện tại của phiên).
- Produces:

```ts
export type SkillInfo = { name: string; source: 'user' | 'plugin'; plugin: string; description: string };
/** Skills Claude Code would load: <cfg>/skills/<x>/SKILL.md and every installed plugin's skills/<x>/SKILL.md. */
export function listSkills(configDir: string): SkillInfo[];
/** Rules of one agent (by its hub name); "plugin:*" expands to every installed skill of that plugin. */
export function effectiveRules(s: Settings, agentName: string, installed?: SkillInfo[]): Record<string, SkillRule>;
/** Context text for one prompt; '' when nothing applies. firstTurn = first prompt of the session. */
export function skillReminder(rules: Record<string, SkillRule>, firstTurn: boolean): string;
```

- Hook `UserPromptSubmit` (`/hooks/prompt`, http hook đã có, timeout 3s): trả `{ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext } }` khi `skillReminder` khác rỗng. Hook `SessionStart` (Task 9) in thêm cùng nội dung với `firstTurn=true`.
- Route `GET /api/skills` → `{ skills: SkillInfo[], agents: Settings['agentSkills'], members: { id, name }[] }` (members = mọi phiên hub đang biết, để UI chọn agent).
- Agent đổi tên (`room_set_name` / UI rename): hub chuyển rule từ tên cũ sang tên mới trong cùng thao tác rename (sửa route rename sẵn có).

- [ ] **Step 1: nghiencuu** — docs Claude Code "Hooks": (a) http hook `UserPromptSubmit` trả `hookSpecificOutput.additionalContext` có được chèn vào ngữ cảnh không (giống `PostToolUse` hub đang dùng); (b) cấu trúc `~/.claude/plugins/installed_plugins.json` (trường `installPath`) và tên đầy đủ của plugin skill (`<plugin>:<skill>`); (c) skill trong `.claude/skills` của project có cần liệt kê không. Ghi kết quả vào prompt subagent.
- [ ] **Step 2: Test hỏng** — `test/skillmodes.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { effectiveRules, listSkills, skillReminder } from '../hub/skillmodes.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

test('reminder: force every / force first / ban; auto says nothing', () => {
  const r = { 'ponytail:ponytail': { mode: 'force', when: 'every' }, 'superpowers:brainstorming': { mode: 'force', when: 'first' },
    'frontend-design:frontend-design': { mode: 'ban', when: 'every' }, 'x:y': { mode: 'auto', when: 'every' } } as const;
  const first = skillReminder(r as any, true), later = skillReminder(r as any, false);
  assert.match(first, /ponytail:ponytail/); assert.match(first, /superpowers:brainstorming/); assert.match(first, /frontend-design/);
  assert.match(later, /ponytail:ponytail/); assert.ok(!later.includes('brainstorming'));
  assert.ok(!first.includes('x:y'));
  assert.equal(skillReminder({}, true), '');
});

test('rules belong to one agent; plugin:* expands; an exact rule beats the wildcard', () => {
  const s = patchSettings(defaultSettings(4), { agentSkills: { Boss: { 'superpowers:*': { mode: 'force', when: 'first' }, 'superpowers:brainstorming': { mode: 'ban' } } } });
  const installed = [{ name: 'superpowers:writing-plans' }, { name: 'superpowers:brainstorming' }, { name: 'ponytail:ponytail' }] as any;
  const r = effectiveRules(s, 'boss', installed);
  assert.deepEqual(Object.keys(r).sort(), ['superpowers:brainstorming', 'superpowers:writing-plans']);
  assert.equal(r['superpowers:writing-plans'].mode, 'force');
  assert.equal(r['superpowers:brainstorming'].mode, 'ban');
  assert.deepEqual(effectiveRules(s, 'Planner', installed), {}, 'other agents get nothing');
});

test('listSkills reads user skills and installed plugin skills', () => {
  const cfg = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-sk-'));
  fs.mkdirSync(path.join(cfg, 'skills', 'local-ai'), { recursive: true });
  fs.writeFileSync(path.join(cfg, 'skills', 'local-ai', 'SKILL.md'), '---\nname: local-ai\ndescription: Offload text tasks\n---\n');
  const plug = path.join(cfg, 'plugins', 'cache', 'p', 'superpowers', '1.0');
  fs.mkdirSync(path.join(plug, 'skills', 'brainstorming'), { recursive: true });
  fs.writeFileSync(path.join(plug, 'skills', 'brainstorming', 'SKILL.md'), '---\nname: brainstorming\ndescription: Use before creative work\n---\n');
  fs.writeFileSync(path.join(cfg, 'plugins', 'installed_plugins.json'), JSON.stringify({ plugins: { 'superpowers@official': [{ installPath: plug }] } }));
  const names = listSkills(cfg).map((s) => [s.name, s.source]);
  assert.deepEqual(names.sort(), [['local-ai', 'user'], ['superpowers:brainstorming', 'plugin']]);
});
```

Trong `test/hooks.test.ts` thêm test API: đăng ký 2 phiên tên `Boss` và `Planner`; PUT settings `agentSkills: { Boss: {'ponytail:ponytail': {mode:'force'}} }` → POST `/hooks/prompt` với `session_id` của Boss → `additionalContext` chứa `ponytail:ponytail`; với `session_id` của Planner → body rỗng (200). Đổi tên Boss → `Sep` qua route rename → rule đi theo (prompt của phiên đó vẫn có lời nhắc).
- [ ] **Step 3: Chạy** → FAIL.
- [ ] **Step 4: Cài đặt `hub/skillmodes.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { normAgent, type Settings, type SkillRule } from './settings.ts';

export type SkillInfo = { name: string; source: 'user' | 'plugin'; plugin: string; description: string };

function front(md: string, key: string): string {
  return md.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}
function skillsIn(dir: string): { name: string; description: string }[] {
  const out: { name: string; description: string }[] = [];
  for (const d of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    try { const md = fs.readFileSync(path.join(dir, d, 'SKILL.md'), 'utf8'); out.push({ name: front(md, 'name') || d, description: front(md, 'description').slice(0, 200) }); }
    catch { /* not a skill */ }
  }
  return out;
}

export function listSkills(configDir: string): SkillInfo[] {
  const out: SkillInfo[] = skillsIn(path.join(configDir, 'skills')).map((s) => ({ ...s, source: 'user', plugin: '' }));
  let installed: any = {};
  try { installed = JSON.parse(fs.readFileSync(path.join(configDir, 'plugins', 'installed_plugins.json'), 'utf8')); } catch { /* none */ }
  for (const [id, entries] of Object.entries<any>(installed.plugins ?? {})) {
    const plugin = id.split('@')[0];
    for (const e of [].concat(entries)) {
      for (const s of skillsIn(path.join((e as any).installPath ?? '', 'skills'))) out.push({ name: `${plugin}:${s.name}`, description: s.description, source: 'plugin', plugin });
    }
  }
  const seen = new Set<string>();
  return out.filter((s) => !seen.has(s.name) && seen.add(s.name)).sort((a, b) => a.name.localeCompare(b.name));
}

export function effectiveRules(s: Settings, agentName: string, installed: SkillInfo[] = []): Record<string, SkillRule> {
  const mine = s.agentSkills[normAgent(agentName)] ?? {};
  const out: Record<string, SkillRule> = {};
  for (const [name, r] of Object.entries(mine)) {          // wildcards first, exact names override them
    if (!name.endsWith(':*')) continue;
    const plugin = name.slice(0, -2);
    for (const sk of installed) if (sk.name.startsWith(plugin + ':')) out[sk.name] = r;
  }
  for (const [name, r] of Object.entries(mine)) if (!name.endsWith(':*')) out[name] = r;
  return out;
}

export function skillReminder(rules: Record<string, SkillRule>, firstTurn: boolean): string {
  const force = Object.entries(rules).filter(([, r]) => r.mode === 'force' && (r.when === 'every' || firstTurn)).map(([n]) => n);
  const ban = Object.entries(rules).filter(([, r]) => r.mode === 'ban').map(([n]) => n);
  const lines: string[] = [];
  if (force.length) lines.push(`bear-agent-manager (cài đặt của người dùng): BẮT BUỘC gọi Skill tool với ${force.map((n) => '`' + n + '`').join(', ')} trước khi trả lời tin nhắn này, rồi làm theo skill đó.`);
  if (ban.length) lines.push(`bear-agent-manager (cài đặt của người dùng): KHÔNG dùng skill ${ban.map((n) => '`' + n + '`').join(', ')} trong phiên này.`);
  return lines.join('\n');
}
```

Trong `hookRoute` của `hub/server.ts`, thay `case 'prompt': status('busy', 'thinking'); break;` bằng:

```ts
      case 'prompt': {
        status('busy', 'thinking');
        const sess = store.session(id);
        const firstTurn = !sess.prompts;                       // Session.prompts: number, thêm vào store (mặc định 0)
        store.bumpPrompts(sess.id);
        const text = skillReminder(effectiveRules(loadSettings(opts.dir, envCap), sess.name, skillCache()), firstTurn);
        if (text) return json(res, 200, { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: text } });
        break;
      }
```

`hub/store.ts`: thêm `prompts?: number` vào `Session`, `bumpPrompts(id)` tăng + lưu (theo mẫu các setter sẵn có). Nếu `store.session(id)` ném lỗi với phiên chưa đăng ký thì bọc try/catch và coi `firstTurn = true` — hook không bao giờ được làm hỏng tin nhắn. `skillCache()` = `listSkills(~/.claude)` gộp các `configDir` của phiên khác, loại trùng theo `name`, cache 60s (hook có timeout 3s, không quét đĩa mỗi tin). Route `GET /api/skills` → `{ skills: skillCache(), agents: s.agentSkills, members: Object.values(store.state.sessions).map((x) => ({ id: x.id, name: x.name })) }`. Trong route rename phiên: nếu `agentSkills[normAgent(cũ)]` có thì chuyển sang `normAgent(mới)` rồi `saveSettings`.
- [ ] **Step 5: Chạy** `npm test` → PASS. Thử tay: gán `Boss` → `superpowers:*` = Ép dùng (tin đầu) → mở lại tab Boss / gửi tin đầu → Boss gọi Skill superpowers trước khi trả lời; các agent khác không bị ảnh hưởng. Đo thêm: lời nhắc ~40–80 token mỗi tin.
- [ ] **Step 6: Commit** — CHANGELOG `- Skills can be forced, left to Claude, or banned for each agent (reminder through the UserPromptSubmit/SessionStart hooks).` → `git commit -m "feat(hub): force or ban skills in conversations"`.

---

### Task 9: Plugin chạy → worker/osin sẵn sàng (mục 3)

**Files:**
- Create: `hub/brief.ts`
- Modify: `hub/server.ts`, `hooks/session-start.ts`, `test/helpers.ts`
- Test: `test/brief.test.ts`, `test/hooks.test.ts`

**Interfaces:**
- Consumes: `loadProviders`, `publicProvider` (Task 4), `loadSettings` (Task 8), `effectiveRules`, `skillReminder` (Task 8b).
- Produces: `workerBrief(settings: Settings, providers: PublicProvider[], health: Record<string, 'ok' | 'bad' | 'unknown'>): string` — `''` khi không có skill nào bật hoặc không provider nào dùng được. `probeProvider(p: Provider, fetchImpl?: typeof fetch): Promise<'ok' | 'bad'>`. Route `GET /api/brief?session=<session_id>` → `{ text }` (= workerBrief + skillReminder của agent đó, firstTurn=true); `GET /api/providers` thêm trường `health`. `HubOptions.probe?: ((p: Provider) => Promise<'ok' | 'bad'>) | null`.

- [ ] **Step 1: Test hỏng** — `test/brief.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workerBrief, probeProvider } from '../hub/brief.ts';
import { defaultProviders, publicProvider } from '../hub/providers.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const withKey = defaultProviders().map((p) => publicProvider({ ...p, key: p.id === 'intern' ? 'k' : '' }));

test('brief names enabled skills and the free provider; empty when nothing is usable', () => {
  const t = workerBrief(defaultSettings(4), withKey, { intern: 'ok' });
  assert.match(t, /worker/); assert.match(t, /osin/); assert.match(t, /Intern AI/);
  const noOsin = workerBrief(patchSettings(defaultSettings(4), { skills: { osin: { enabled: false } } }), withKey, {});
  assert.ok(!/osin/.test(noOsin));
  assert.equal(workerBrief(defaultSettings(4), defaultProviders().map(publicProvider), {}), '');
  assert.equal(workerBrief(patchSettings(defaultSettings(4), { skills: { worker: { enabled: false }, osin: { enabled: false } } }), withKey, {}), '');
});

test('brief warns when the free endpoint failed its health check', () => {
  assert.match(workerBrief(defaultSettings(4), withKey, { intern: 'bad' }), /không phản hồi/);
});

test('probeProvider: 2xx ok, 401 bad, network error bad', async () => {
  const p = { ...defaultProviders()[0], key: 'k' };
  assert.equal(await probeProvider(p, (async () => new Response('{}', { status: 200 })) as any), 'ok');
  assert.equal(await probeProvider(p, (async () => new Response('', { status: 401 })) as any), 'bad');
  assert.equal(await probeProvider(p, (async () => { throw new Error('x'); }) as any), 'bad');
});
```

- [ ] **Step 2: nghiencuu — ĐÃ XONG (research-museAI):** `GET https://discovery-api.intern-ai.org.cn/v1/models` không key → 401 (endpoint có thật, kiểu OpenAI, nhận `Authorization: Bearer <key>`). Vì vậy `probeProvider` luôn gửi cả `x-api-key` lẫn `Authorization: Bearer` (code dưới đã sửa). Ghi chú gốc: endpoint nhẹ để kiểm tra key của Intern AI (docs https://discovery.intern-ai.org.cn/ — có `GET /v1/models` cho giao thức Anthropic không? Nếu không, `POST /v1/messages` `max_tokens:1` với model rẻ nhất — tốn 1 request trong 50 RPM). Mặc định code dưới dùng `GET {baseUrl}/v1/models`.
- [ ] **Step 3: Cài đặt `hub/brief.ts`**:

```ts
import type { Provider, PublicProvider } from './providers.ts';
import type { Settings } from './settings.ts';

export async function probeProvider(p: Provider, fetchImpl: typeof fetch = fetch): Promise<'ok' | 'bad'> {
  try {
    // Intern answers /v1/models OpenAI-style (Bearer); Anthropic-style hosts want x-api-key. Send both.
    const headers: Record<string, string> = { authorization: `Bearer ${p.key}`, 'x-api-key': p.key, 'anthropic-version': '2023-06-01' };
    const r = await fetchImpl(`${p.baseUrl.replace(/\/$/, '')}/v1/models`, { headers, signal: AbortSignal.timeout(8000) });
    return r.ok ? 'ok' : 'bad';
  } catch { return 'bad'; }
}

/** Short text SessionStart prints into every chat: which workers exist and when to use them. */
export function workerBrief(s: Settings, providers: PublicProvider[], health: Record<string, 'ok' | 'bad' | 'unknown'>): string {
  const skills = (['worker', 'osin'] as const).filter((k) => s.skills[k].enabled);
  const usable = providers.filter((p) => p.enabled && p.hasKey);
  const free = usable.filter((p) => p.tier === 'free');
  if (!skills.length || !usable.length) return '';
  const lines = [
    `bear-agent-manager: skill ${skills.map((k) => '`' + k + '`').join(' và ')} đang bật` +
      (free.length ? ` trên API miễn phí ${free.map((p) => p.label).join(', ')}` : ' (chỉ có tầng trả tiền)') + '.',
  ];
  if (skills.includes('worker')) lines.push('- Việc đọc nhiều (file/log lớn, khảo sát repo, tóm tắt docs) → giao `worker`, chỉ đọc báo cáo ngắn của nó.');
  if (skills.includes('osin')) lines.push('- Chat quá dài, biên bản phòng rối, cần báo cáo lãng phí token → giao `osin`.');
  const bad = free.filter((p) => health[p.id] === 'bad');
  if (bad.length) lines.push(`- Lưu ý: ${bad.map((p) => p.label).join(', ')} không phản hồi lúc kiểm tra (key hoặc mạng lỗi) — nếu worker thoát mã 1/3 thì tự làm.`);
  return lines.join('\n');
}
```

`hub/server.ts` (chuyển `const legacyKey` của Task 4 lên phạm vi `startHub`):

```ts
  const health: Record<string, 'ok' | 'bad' | 'unknown'> = {};
  const probeAll = async () => {
    for (const pr of loadProviders(opts.dir, legacyKey).filter((x) => x.enabled && x.key)) health[pr.id] = await (opts.probe ?? probeProvider)(pr);
    broadcast('providers', loadProviders(opts.dir, legacyKey).map((x) => ({ ...publicProvider(x), health: health[x.id] ?? 'unknown' })));
  };
  if (opts.probe !== null) { probeAll().catch(() => {}); const t = setInterval(() => probeAll().catch(() => {}), 30 * 60_000); t.unref(); }
```

Route `GET /api/brief`:

```ts
    if (m === 'GET' && p === '/api/brief') {
      const s = loadSettings(opts.dir, envCap);
      const text = [workerBrief(s, loadProviders(opts.dir, legacyKey).map(publicProvider), health),
        skillReminder(effectiveRules(s, store.state.sessions[url.searchParams.get('session') ?? '']?.name ?? '', skillCache()), true)].filter(Boolean).join('\n');
      return json(res, 200, { text });
    }
```

`test/helpers.ts` truyền `probe: null`. `hooks/session-start.ts`, sau khối in rooms (trong `if (await ensureHub())`):

```ts
    const { text } = await api<{ text: string }>(`/api/brief?session=${encodeURIComponent(input.session_id)}`).catch(() => ({ text: '' }));
    if (text) process.stdout.write(text + '\n');
```

Hook phải nhanh → `/api/brief` chỉ đọc file + cache `health`, không gọi mạng. Kiểm tra `api()` trong `shared/client.ts` có timeout; nếu không, thêm `AbortSignal.timeout(1500)`.
- [ ] **Step 4: Test hook** — trong `test/hooks.test.ts`, theo mẫu test SessionStart có sẵn: PUT `/api/providers/intern` `{key:'k'}`, chạy hook → stdout chứa ``skill `worker` ``.
- [ ] **Step 5: Chạy** `npm test` → PASS. Kiểm tay: chat mới → ngữ cảnh đầu có dòng brief.
- [ ] **Step 6: Commit** — CHANGELOG `- Every chat learns at start which workers are on; the hub health-checks provider keys.` → `git commit -m "feat: announce worker/osin to every chat at session start"`.

---

### Task 9b: Hub tự chạy worker cho việc được phép (A2)

**Files:**
- Create: `hub/autojobs.ts`
- Modify: `hub/server.ts`, `hub/store.ts` (`autoRuns` + đánh dấu đã chạy)
- Test: `test/autojobs.test.ts`

**Interfaces:**
- Consumes: `Settings.autoJobs` (Task 8), `skills/osin/jobs.md` (khối `handoff` / `digest` / `notes`), `skills/osin/extract-chat.mjs`, `skills/worker/worker.ps1`.
- Produces:

```ts
export type AutoJob =
  | { kind: 'handoff'; sessionId: string; transcript: string; name: string }
  | { kind: 'digest'; room: string; messageId: number; text: string }
  | { kind: 'notes'; room: string; notes: Record<string, string> };
export type AutoState = { runs: number[]; done: string[] };   // runs = mốc thời gian (ms); done = khoá việc đã chạy
export const jobKey: (j: AutoJob) => string;                  // 'handoff:<sid>:<thresholdK>' | 'digest:<room>:<id>' | 'notes:<room>:<count>'
/** Jobs the hub should start now; never repeats a key, respects maxRunsPerDay. */
export function dueJobs(cands: AutoJob[], s: Settings['autoJobs'], st: AutoState, now: number): AutoJob[];
/** Prompt text for the worker, from the matching block of skills/osin/jobs.md. */
export function jobPrompt(j: AutoJob, jobsMd: string): string;
```

- Hub: khi `ctx` của một phiên vượt `thresholdK*1000` (đã có trong `register`/`session` update) → ứng viên `handoff`; khi một tin nhắn phòng dài hơn `minChars` → `digest`; khi số biên bản phòng ≥ `minNotes` → `notes`. `dueJobs` lọc, hub ghi prompt vào `<hub>/autojobs/<key>.txt` rồi `spawn('powershell', ['-NoProfile','-File', <worker.ps1>, '-Kind','osin','-Task', <tóm tắt>, '-By','hub','-PromptFile', <file>, '-Dir', <hub>/autojobs])` (tách tiến trình, không chặn hub). Kết quả (dòng cuối JSON `.result`): handoff → lưu `<hub>/handoffs/<sid>.md` + tin nhắn phòng `@you hồ sơ bàn giao của <name> đã sẵn sàng: <path>`; digest → gửi bản rút gọn vào phòng dạng tin của `osin` trả lời tin gốc; notes → tin nhắn `@you` với đề xuất (KHÔNG tự xoá biên bản). Spawn đi qua `opts.spawnWorker` để test thay bằng stub.

- [ ] **Step 1: Test hỏng** — `test/autojobs.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueJobs, jobKey, jobPrompt, type AutoJob } from '../hub/autojobs.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const H: AutoJob = { kind: 'handoff', sessionId: 's1', transcript: 'C:\\t.jsonl', name: 'big chat' };
const D: AutoJob = { kind: 'digest', room: 'r', messageId: 7, text: 'x'.repeat(5000) };
const on = patchSettings(defaultSettings(4), { autoJobs: { handoff: { enabled: true }, digest: { enabled: true }, maxRunsPerDay: 2 } }).autoJobs;

test('nothing runs while a job type is off', () => {
  assert.deepEqual(dueJobs([H, D], defaultSettings(4).autoJobs, { runs: [], done: [] }, 0), []);
});

test('enabled jobs run once per key and within the daily cap', () => {
  assert.deepEqual(dueJobs([H, D], on, { runs: [], done: [] }, 0).map(jobKey), ['handoff:s1:300', 'digest:r:7']);
  assert.deepEqual(dueJobs([H, D], on, { runs: [], done: ['handoff:s1:300'] }, 0).map(jobKey), ['digest:r:7']);
  assert.deepEqual(dueJobs([H, D], on, { runs: [1, 2], done: [] }, 3), [], 'cap of 2 reached in the last 24h');
  assert.equal(dueJobs([H], on, { runs: [1, 2], done: [] }, 1 + 86_400_001).length, 1, 'old runs fall out of the window');
});

test('jobPrompt fills the matching jobs.md block', () => {
  const md = '## handoff — x\n\n```\nĐọc file <chat.txt> rồi viết hồ sơ\n```\n\n## digest — y\n\n```\nTóm tắt <N> dòng\n```\n';
  assert.match(jobPrompt(H, md), /Đọc file .*chat/);
  assert.match(jobPrompt(D, md), /Tóm tắt/);
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt `hub/autojobs.ts`**:

```ts
import type { Settings } from './settings.ts';

export type AutoJob =
  | { kind: 'handoff'; sessionId: string; transcript: string; name: string }
  | { kind: 'digest'; room: string; messageId: number; text: string }
  | { kind: 'notes'; room: string; notes: Record<string, string> };
export type AutoState = { runs: number[]; done: string[] };
const DAY = 86_400_000;

export function jobKey(j: AutoJob, s?: Settings['autoJobs']): string {
  if (j.kind === 'handoff') return `handoff:${j.sessionId}:${s?.handoff.thresholdK ?? 300}`;
  if (j.kind === 'digest') return `digest:${j.room}:${j.messageId}`;
  return `notes:${j.room}:${Object.keys(j.notes).length}`;
}

export function dueJobs(cands: AutoJob[], s: Settings['autoJobs'], st: AutoState, now: number): AutoJob[] {
  let left = s.maxRunsPerDay - st.runs.filter((t) => now - t < DAY).length;
  const done = new Set(st.done), out: AutoJob[] = [];
  for (const j of cands) {
    if (left <= 0) break;
    if (!s[j.kind].enabled || done.has(jobKey(j, s))) continue;
    done.add(jobKey(j, s)); out.push(j); left--;
  }
  return out;
}

function block(md: string, name: string): string {
  const m = md.match(new RegExp(`^## ${name}\\b[\\s\\S]*?\`\`\`\\n([\\s\\S]*?)\`\`\``, 'm'));
  return m ? m[1].trim() : '';
}

export function jobPrompt(j: AutoJob, jobsMd: string): string {
  const b = block(jobsMd, j.kind);
  if (j.kind === 'handoff') return b.replace(/<chat\.txt>/g, 'chat.txt');                 // the hub writes chat.txt next to the prompt
  if (j.kind === 'digest') return b.replace(/<N>/g, '15') + '\n\n---\n' + j.text;
  return b + '\n\n---\n' + JSON.stringify(j.notes, null, 2);
}
```

Lưu ý khi tích hợp vào `hub/server.ts`: handoff cần chạy `node skills/osin/extract-chat.mjs <transcript> > <hub>/autojobs/<key>/chat.txt` trước rồi `-Dir` = thư mục đó; tên khối trong `jobs.md` phải khớp `## handoff`, `## digest`, `## notes` (đọc file để xác nhận, sửa regex nếu tiêu đề khác). Lưu `AutoState` trong `store.state.autoJobs` (giữ `done` tối đa 1000 khoá). Đếm các lần hub tự chạy cả khi worker thất bại.
- [ ] **Step 4: Test tích hợp** — trong `test/hub.test.ts`: bật `autoJobs.handoff` với `thresholdK: 50`, đăng ký phiên có `ctx: 60000` → stub `spawnWorker` được gọi đúng 1 lần với `-Kind osin`; đăng ký lại cùng ctx → không gọi thêm.
- [ ] **Step 5: Chạy** `npm test` → PASS.
- [ ] **Step 6: Commit** — CHANGELOG `- The hub can start osin by itself (handoff dossiers, long-message digests, notes cleanup) when allowed in Settings; daily cap.` → `git commit -m "feat(hub): automatic osin jobs"`.

---

### Task T-UI: Khung chat luôn tự cuộn xuống tin mới (chạy sau T9b, trước T10)

**Spec:** [docs/superpowers/specs/2026-10-16-chat-autoscroll-design.md](../specs/2026-10-16-chat-autoscroll-design.md) (research-UI, Boss duyệt 2026-10-16). Phạm vi: T-UI1, T-UI2, T-UI3, T-UI5. **T-UI4 (nút "↓ Tin mới") bỏ**, ghi vào `todoplan.md`. Một commit, chỉ đụng `ui/index.html` + `test/ui.test.ts`. Làm trước T11 để khung 4 tab dựng trên log đã sửa.

Nguyên nhân (đọc code): `renderLog()` đo `atBottom` (<80px) trên DOM cũ trước khi render (`ui/index.html` ~dòng 690, cuộn ở ~717). Khi vùng dưới log cao lên (ô soạn tới 180px, `#cost`, `#notice`, chip presence xuống dòng) thì `#log` co lại mà không cuộn bù → khoảng hụt >80px → từ đó log kẹt. Thêm: tin tự gửi không ép cuộn; sự kiện `session` dựng lại cả log và gập lại tin đang "Xem thêm" (`dataset.open` không bao giờ được gán).

**Files:** Modify `ui/index.html`, `test/ui.test.ts`; thêm 1 dòng vào `todoplan.md` (git-ignored).

**Interfaces:**
- `S.stick: boolean` (mặc định `true`) — người dùng đang "dính đáy"; chỉ đổi bởi sự kiện `scroll` của `#log`, gửi tin, đổi phòng.
- `S.expanded: Set<string>` — id các tin đang mở "Xem thêm".
- `#log` có một con cố định `<div id="logBody">`; mọi chỗ trước đây gán `el.innerHTML` trong `renderLog()` (kể cả 2 trạng thái rỗng) giờ gán `logBody.innerHTML`.
- Mỗi `<div class="msg">` mang `data-mid="${m.id}"` (cả nhánh tin nối tiếp `cont`).
- `pinBottom()` — `if (S.stick) log.scrollTop = log.scrollHeight`.

- [ ] **Step 1: Test hỏng** — thêm vào `test/ui.test.ts`:

```ts
test('chat log sticks to the bottom by intent, not by measuring before render', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['S.stick', 'new ResizeObserver(', 'id="logBody"', 'S.expanded', 'data-mid=']) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(!html.includes('atBottom'), 'the pre-render atBottom check is gone');
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Chạy** `node --no-warnings --test test/ui.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** — HTML: `<div id="log"><div id="logBody"></div></div>`. Script (đặt cạnh các khai báo `S` khác):

```js
S.stick = true; S.expanded = new Set();
const logEl = $('log'), logBody = $('logBody');
const pinBottom = () => { if (S.stick) logEl.scrollTop = logEl.scrollHeight; };
logEl.addEventListener('scroll', () => {
  // A hidden webview reports 0 height and clamps scrollTop: that is not the user scrolling up.
  if (!logEl.clientHeight) return;
  S.stick = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
}, { passive: true });
// #log shrinks/grows when the composer, #cost, #notice or presence change height;
// #logBody grows when images/fonts load or a message is expanded. Either way: re-pin.
const logRO = new ResizeObserver(pinBottom);
logRO.observe(logEl); logRO.observe(logBody);
```

Trong `renderLog()`:
- Xoá dòng `const atBottom = …`.
- `el.innerHTML = …` → `logBody.innerHTML = …` (cả 2 nhánh rỗng và nhánh chính); `el.querySelectorAll` → `logBody.querySelectorAll`.
- Hai chỗ sinh `<div class="msg">` → `<div class="msg" data-mid="${m.id}">`.
- Khối clamp thay bằng:

```js
  logBody.querySelectorAll('.msg').forEach((m) => {
    if (m.scrollHeight <= 260) return;
    const id = m.dataset.mid, open = S.expanded.has(id);
    if (!open) m.classList.add('clamp');
    const b = document.createElement('button'); b.className = 'more-btn'; b.textContent = open ? 'Thu gọn' : 'Xem thêm';
    b.onclick = () => {
      const clamped = m.classList.toggle('clamp');
      if (clamped) S.expanded.delete(id); else S.expanded.add(id);
      b.textContent = clamped ? 'Xem thêm' : 'Thu gọn';
    };
    m.after(b);
  });
```

- Cuối hàm thay `if (atBottom || …) el.scrollTop = el.scrollHeight;` bằng:

```js
  if (el.dataset.room !== S.current) S.stick = true;   // switching rooms always lands at the bottom
  el.dataset.room = S.current;
  pinBottom();
```

T-UI3: trong handler submit của `#composer`, ngay sau khi `api(...)` gửi tin thành công: `S.stick = true; pinBottom();`. Trong hàm đổi phòng (`select()` hoặc tên tương đương — tìm nơi gán `S.current`): `S.stick = true;`. Đọc code để đặt đúng chỗ; không đổi hành vi khác.

`todoplan.md`: thêm `- [ ] Khung chat: nút "↓ Tin mới (n)" khi đang cuộn lên đọc (T-UI4 của spec chat-autoscroll, Boss tạm bỏ 2026-10-16).`
- [ ] **Step 4: Chạy** `npm test` → PASS (cả test "inline script compiles").
- [ ] **Step 5: Kiểm thủ công qua CDP** (`node scripts/demo-hub.mjs 7797` hoặc hub thật, skill `open-chrome`), chụp ảnh từng case gửi @Boss:
  - (a) đang ở đáy, gửi 20 tin dài liên tiếp (POST tin qua API) → vẫn ở đáy;
  - (b) gõ tin 6 dòng (ô soạn cao lên) → tin cuối vẫn thấy được;
  - (d) mở "Xem thêm" một tin, kích một sự kiện `session` (đổi trạng thái một phiên) → tin đó vẫn mở;
  - (e) trong panel VS Code (iframe): ẩn panel rồi hiện lại → vẫn ở đáy.
  - Thêm (c'): cuộn lên đọc, tin mới đến → KHÔNG bị kéo xuống (vì không có T-UI4 nên không có nút).
- [ ] **Step 6: Commit** — CHANGELOG `- Fix: the chat log stays pinned to the newest message (composer/notice height changes, late images, own messages, room switch); expanded messages stay expanded.` →

```bash
git add ui/index.html test/ui.test.ts CHANGELOG.md
git commit -m "fix(ui): chat log sticks to the bottom"
```

---

### Task 10: Nhiều acc Claude Pro — lưu, chuyển, xem mức dùng (A4)

Thiết kế theo `chuyen-doi-tai` (đã kiểm thực tế trên máy chủ repo). Extension VS Code/Antigravity luôn đọc `~/.claude` (và Antigravity đọc `CLAUDE_CONFIG_DIR` riêng của nó), nên chuyển acc = tráo file login.

**Files:**
- Create: `hub/accounts.ts`
- Modify: `hub/server.ts`
- Test: `test/accounts.test.ts`

**Interfaces:**
- Dữ liệu trên đĩa: Windows lưu login ở `<cfg>/.credentials.json` = `{ claudeAiOauth: { accessToken, refreshToken, expiresAt, subscriptionType, … } }`; thông tin hiển thị ở `~/.claude.json` → `oauthAccount` (với cfg mặc định) hoặc `<cfg>/.claude.json`. Profile lưu ở `<hub>/accounts/<tên>/credentials.json` + `<hub>/accounts/<tên>/account.json` (= `oauthAccount`).
- Produces:

```ts
export type AccountInfo = { name: string; email: string; plan: string; active: boolean; expiresAt: number; usage: Usage | null; usageError: string };
export type Usage = { fiveHour: { pct: number; resetsAt: string } | null; sevenDay: { pct: number; resetsAt: string } | null; fetchedAt: number };
export type Paths = { home: string; cfg: string; claudeJson: string };   // home = hub dir; cfg = ~/.claude; claudeJson = ~/.claude.json
export function saveCurrent(p: Paths, name: string): AccountInfo;        // chụp acc đang dùng thành profile <name>
export function listAccounts(p: Paths): AccountInfo[];                  // không bao giờ chứa token
export function switchTo(p: Paths, name: string): { from: string; to: string };
export function removeAccount(p: Paths, name: string): void;            // không xoá được acc đang dùng
export function parseUsage(json: any): Usage;
export function fetchUsage(p: Paths, name: string, f?: typeof fetch): Promise<Usage>;
```

- Quy tắc `switchTo` (thứ tự bắt buộc): (1) tìm profile của acc đang dùng (khớp `oauthAccount.accountUuid`, rồi `emailAddress`) và chép `cfg/.credentials.json` hiện tại đè lên profile đó TRƯỚC — `refreshToken` đổi mới mỗi lần refresh, không lưu lại thì token cũ chết; nếu acc đang dùng chưa có profile thì từ chối (`409 save the current account first`); (2) chép profile đích vào `cfg/.credentials.json` (ghi file tạm + rename); (3) thay đúng khoá `oauthAccount` trong `claudeJson`, giữ nguyên mọi khoá khác; (4) API trả `{ reload: true }` → UI báo "Reload Window ngay trong mọi cửa sổ VS Code/Antigravity, nếu không extension đang mở có thể ghi token cũ đè lên".
- Mức dùng: `GET https://api.anthropic.com/api/oauth/usage`, header `Authorization: Bearer <accessToken>` + `anthropic-beta: oauth-2025-04-20` → `five_hour` / `seven_day` `{ utilization, resets_at }` (+ `limits[]`). Acc đang dùng: đọc token từ `cfg/.credentials.json`, KHÔNG tự refresh (Claude Code sở hữu token đó; hết hạn → `usageError: 'hết hạn — mở Claude để làm mới'`). Acc đang nằm chờ: nếu `expiresAt` đã qua thì refresh trước (Step 1), GHI token mới vào profile ngay (file tạm + rename), rồi mới gọi usage. Cache usage 5 phút/acc.
- Routes: `GET /api/accounts` → `AccountInfo[]` (usage từ cache, kèm `?refresh=1` để lấy mới); `POST /api/accounts` `{name}` → `saveCurrent`; `POST /api/accounts/:name/switch` → `{ from, to, reload: true }`; `DELETE /api/accounts/:name`. Không route nào trả `accessToken`/`refreshToken`.

- [ ] **Step 1: nghiencuu — (a) ĐÃ XONG (research-museAI, đối chiếu binary Claude Code 2.1.300 trên máy):** refresh = `POST https://platform.claude.com/v1/oauth/token` (KHÔNG phải console.anthropic.com — host cũ), body `grant_type=refresh_token`, `refresh_token`, `client_id=9d1c250a-e61b-44d9-88ed-5944d1962f5e`, không có client_secret; cả access lẫn refresh token đều được đổi mới → ghi cả hai vào profile ngay (chưa tự kiểm chứng phần "cả hai đổi mới": test với `fetch` giả phải xử lý cả trường hợp response thiếu `refresh_token` = giữ cái cũ). Đặt URL + client_id thành hằng số đầu `hub/accounts.ts` kèm comment "from Claude Code 2.1.300; internal API, may change". Còn phải xác nhận: (b) endpoint usage và header beta ở trên còn đúng với bản Claude Code hiện tại; (c) trên macOS/Linux login nằm ở Keychain/`.credentials.json` — task này chỉ hỗ trợ Windows + Linux file-based, macOS báo "chưa hỗ trợ". Đây là API nội bộ, không có cam kết ổn định: mọi lỗi phải hiện thành `usageError`, không làm hỏng hub. Nếu (a) không xác nhận được: bỏ refresh, acc nằm chờ hết hạn hiện "token hết hạn — chuyển sang acc này một lần để làm mới".
- [ ] **Step 2: Test hỏng** — `test/accounts.test.ts` (không gọi mạng thật, `fetch` giả):

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fetchUsage, listAccounts, parseUsage, removeAccount, saveCurrent, switchTo, type Paths } from '../hub/accounts.ts';

function setup(): Paths {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-acc-'));
  const p = { home: path.join(root, 'hub'), cfg: path.join(root, '.claude'), claudeJson: path.join(root, '.claude.json') };
  fs.mkdirSync(p.cfg, { recursive: true });
  login(p, 'A', 'a@x.y', 'RT-A1');
  return p;
}
function login(p: Paths, uuid: string, email: string, rt: string) {
  fs.writeFileSync(path.join(p.cfg, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'AT-' + uuid, refreshToken: rt, expiresAt: Date.now() + 3600_000, subscriptionType: 'pro' } }));
  const cj = fs.existsSync(p.claudeJson) ? JSON.parse(fs.readFileSync(p.claudeJson, 'utf8')) : { theme: 'dark' };
  cj.oauthAccount = { accountUuid: uuid, emailAddress: email };
  fs.writeFileSync(p.claudeJson, JSON.stringify(cj));
}
const creds = (p: Paths) => JSON.parse(fs.readFileSync(path.join(p.cfg, '.credentials.json'), 'utf8')).claudeAiOauth;

test('save + list never exposes tokens and marks the active account', () => {
  const p = setup();
  saveCurrent(p, 'acc-a');
  const l = listAccounts(p);
  assert.deepEqual(l.map((a) => [a.name, a.email, a.active]), [['acc-a', 'a@x.y', true]]);
  assert.ok(!JSON.stringify(l).includes('AT-A') && !JSON.stringify(l).includes('RT-A1'));
});

test('switch saves the rotated refresh token of the current account first, keeps other ~/.claude.json keys', () => {
  const p = setup();
  saveCurrent(p, 'acc-a');
  login(p, 'B', 'b@x.y', 'RT-B1'); saveCurrent(p, 'acc-b');
  switchTo(p, 'acc-a');
  assert.equal(creds(p).refreshToken, 'RT-A1');
  // Claude Code refreshed acc-a's token while it was active:
  fs.writeFileSync(path.join(p.cfg, '.credentials.json'), JSON.stringify({ claudeAiOauth: { ...creds(p), refreshToken: 'RT-A2' } }));
  switchTo(p, 'acc-b');
  assert.equal(creds(p).refreshToken, 'RT-B1');
  switchTo(p, 'acc-a');
  assert.equal(creds(p).refreshToken, 'RT-A2', 'the rotated token was saved before switching away');
  const cj = JSON.parse(fs.readFileSync(p.claudeJson, 'utf8'));
  assert.deepEqual([cj.theme, cj.oauthAccount.emailAddress], ['dark', 'a@x.y']);
});

test('switch refuses when the current account was never saved; cannot remove the active one', () => {
  const p = setup();
  fs.mkdirSync(path.join(p.home, 'accounts', 'acc-b'), { recursive: true });
  assert.throws(() => switchTo(p, 'acc-b'), /save the current account first/);
  saveCurrent(p, 'acc-a');
  assert.throws(() => removeAccount(p, 'acc-a'), /active/);
});

test('parseUsage + fetchUsage with a fake fetch', async () => {
  const body = { five_hour: { utilization: 42.5, resets_at: '2026-10-16T10:00:00Z' }, seven_day: { utilization: 10, resets_at: '2026-10-20T00:00:00Z' } };
  assert.deepEqual(parseUsage(body).fiveHour, { pct: 42.5, resetsAt: '2026-10-16T10:00:00Z' });
  const p = setup(); saveCurrent(p, 'acc-a');
  let auth = '';
  const u = await fetchUsage(p, 'acc-a', (async (_u: string, init: any) => { auth = init.headers.authorization; return new Response(JSON.stringify(body)); }) as any);
  assert.equal(auth, 'Bearer AT-A');
  assert.equal(u.sevenDay!.pct, 10);
});
```

- [ ] **Step 3: Chạy** → FAIL.
- [ ] **Step 4: Cài đặt `hub/accounts.ts`**:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { StoreError } from './store.ts';

export type Usage = { fiveHour: { pct: number; resetsAt: string } | null; sevenDay: { pct: number; resetsAt: string } | null; fetchedAt: number };
export type AccountInfo = { name: string; email: string; plan: string; active: boolean; expiresAt: number; usage: Usage | null; usageError: string };
export type Paths = { home: string; cfg: string; claudeJson: string };

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const readJson = (f: string) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
function writeAtomic(f: string, data: unknown) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + '.tmp', JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(f + '.tmp', f);
}
const dir = (p: Paths, name: string) => {
  if (!/^[\w.-]{1,40}$/.test(name)) throw new StoreError(400, 'account name: 1-40 chars, letters, digits . _ -');
  return path.join(p.home, 'accounts', name);
};
const names = (p: Paths) => { try { return fs.readdirSync(path.join(p.home, 'accounts')).sort(); } catch { return []; } };
const currentAcct = (p: Paths) => readJson(p.claudeJson)?.oauthAccount ?? null;
const same = (a: any, b: any) => !!a && !!b && ((a.accountUuid && a.accountUuid === b.accountUuid) || (!a.accountUuid && a.emailAddress === b.emailAddress));
const activeName = (p: Paths) => names(p).find((n) => same(readJson(path.join(dir(p, n), 'account.json')), currentAcct(p))) ?? '';

export function saveCurrent(p: Paths, name: string): AccountInfo {
  const creds = readJson(path.join(p.cfg, '.credentials.json'));
  const acct = currentAcct(p);
  if (!creds?.claudeAiOauth || !acct) throw new StoreError(409, 'no Claude login found in ~/.claude');
  writeAtomic(path.join(dir(p, name), 'credentials.json'), creds);
  writeAtomic(path.join(dir(p, name), 'account.json'), acct);
  return listAccounts(p).find((a) => a.name === name)!;
}

export function listAccounts(p: Paths): AccountInfo[] {
  const act = activeName(p);
  return names(p).map((name) => {
    const acct = readJson(path.join(dir(p, name), 'account.json')) ?? {};
    const o = readJson(path.join(dir(p, name), 'credentials.json'))?.claudeAiOauth ?? {};
    return { name, email: String(acct.emailAddress ?? ''), plan: String(o.subscriptionType ?? ''), active: name === act, expiresAt: Number(o.expiresAt) || 0, usage: null, usageError: '' };
  });
}

export function switchTo(p: Paths, name: string): { from: string; to: string } {
  const target = dir(p, name);
  if (!fs.existsSync(path.join(target, 'credentials.json'))) throw new StoreError(404, `unknown account ${name}`);
  const from = activeName(p);
  if (!from) throw new StoreError(409, 'save the current account first (its refresh token would be lost)');
  if (from === name) return { from, to: name };
  // 1) the live refresh token rotates: keep it with the account we leave
  writeAtomic(path.join(dir(p, from), 'credentials.json'), readJson(path.join(p.cfg, '.credentials.json')));
  // 2) target login into ~/.claude
  writeAtomic(path.join(p.cfg, '.credentials.json'), readJson(path.join(target, 'credentials.json')));
  // 3) only the oauthAccount key of ~/.claude.json changes
  const cj = readJson(p.claudeJson) ?? {};
  cj.oauthAccount = readJson(path.join(target, 'account.json'));
  writeAtomic(p.claudeJson, cj);
  return { from, to: name };
}

export function removeAccount(p: Paths, name: string): void {
  if (activeName(p) === name) throw new StoreError(400, 'cannot remove the active account');
  fs.rmSync(dir(p, name), { recursive: true, force: true });
}

export function parseUsage(j: any): Usage {
  const w = (x: any) => (x && Number.isFinite(Number(x.utilization)) ? { pct: Number(x.utilization), resetsAt: String(x.resets_at ?? '') } : null);
  return { fiveHour: w(j?.five_hour), sevenDay: w(j?.seven_day), fetchedAt: Date.now() };
}

export async function fetchUsage(p: Paths, name: string, f: typeof fetch = fetch): Promise<Usage> {
  const active = activeName(p) === name;
  const file = active ? path.join(p.cfg, '.credentials.json') : path.join(dir(p, name), 'credentials.json');
  const o = readJson(file)?.claudeAiOauth;
  if (!o?.accessToken) throw new StoreError(404, 'no token');
  if (Number(o.expiresAt) && Number(o.expiresAt) < Date.now()) {
    // shortcut: refresh of idle accounts lands after the nghiencuu step confirms the endpoint (Task 10 Step 1).
    throw new StoreError(409, active ? 'hết hạn — mở Claude để làm mới' : 'token hết hạn — chuyển sang acc này một lần để làm mới');
  }
  const r = await f(USAGE_URL, { headers: { authorization: `Bearer ${o.accessToken}`, 'anthropic-beta': 'oauth-2025-04-20' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new StoreError(502, `usage HTTP ${r.status}`);
  return parseUsage(await r.json());
}
```

Khi Step 1 xác nhận endpoint refresh: thêm `refreshIdle(p, name, f)` — gọi endpoint, ghi `{accessToken, refreshToken, expiresAt}` mới vào `credentials.json` của profile bằng `writeAtomic` NGAY khi nhận được (trước khi dùng), chỉ cho acc không active; thay `shortcut:` ở trên bằng lời gọi đó, kèm test với `fetch` giả kiểm token mới đã được ghi.

Route trong `hub/server.ts` — `Paths` = `{ home: opts.dir, cfg: path.join(os.homedir(), '.claude'), claudeJson: path.join(os.homedir(), '.claude.json') }` (cho test ghi đè qua `opts.accountPaths`):

```ts
    if (m === 'GET' && p === '/api/accounts') {
      const list = listAccounts(acctPaths);
      for (const a of list) {
        const c = usageCache.get(a.name);
        if (c && Date.now() - c.at < 5 * 60_000 && !url.searchParams.has('refresh')) { a.usage = c.usage; a.usageError = c.err; continue; }
        try { a.usage = await fetchUsage(acctPaths, a.name, opts.fetch ?? fetch); a.usageError = ''; }
        catch (e: any) { a.usageError = String(e.message ?? e); }
        usageCache.set(a.name, { at: Date.now(), usage: a.usage, err: a.usageError });
      }
      return json(res, 200, list);
    }
    if (m === 'POST' && p === '/api/accounts') return json(res, 200, saveCurrent(acctPaths, String((await readBody(req)).name ?? '')));
    const ac = p.match(/^\/api\/accounts\/([\w.-]+)(\/switch)?$/);
    if (ac && m === 'POST' && ac[2]) { usageCache.clear(); return json(res, 200, { ...switchTo(acctPaths, ac[1]), reload: true }); }
    if (ac && m === 'DELETE' && !ac[2]) { removeAccount(acctPaths, ac[1]); return json(res, 200, { ok: true }); }
```

`usageCache = new Map<string, { at: number; usage: Usage | null; err: string }>()` ở phạm vi `startHub`. `HubOptions` thêm `accountPaths?: Paths; fetch?: typeof fetch`; `test/helpers.ts` truyền `accountPaths` trỏ vào thư mục tạm (test hub KHÔNG BAO GIỜ đụng `~/.claude` thật). Thêm test API: `GET /api/accounts` không chứa chuỗi `AT-`/`RT-`.
- [ ] **Step 5: Chạy** `npm test` → PASS. Thử tay trên máy chủ repo (có mặt chủ repo): lưu acc hiện tại → đăng nhập acc thứ 2 bằng `/login` trong Claude → lưu → chuyển qua lại 2 lần → Reload Window → `claude` vẫn đăng nhập đúng acc, không phải đăng nhập lại. Sao lưu `~/.claude/.credentials.json` và `~/.claude.json` vào scratchpad TRƯỚC khi thử.
- [ ] **Step 6: Commit** — CHANGELOG `- Claude accounts: save the current login, switch between saved accounts, see each account's 5-hour and weekly usage.` → `git commit -m "feat(hub): save/switch Claude accounts and show their usage"`.

---

### Task 11: UI — khung 4 tab

**Files:**
- Modify: `ui/index.html`
- Test: `test/ui.test.ts`

**Interfaces:**
- Produces: `<nav id="tabs">` với 4 nút `data-tab="rooms|workers|tokens|settings"`; 4 view `id="view-rooms"` (bọc `<main>` hiện tại), `id="view-workers"`, `id="view-tokens"`, `id="view-settings"`; hàm `showTab(name)` + `location.hash` (`#workers`…) + nhớ tab qua `localStorage` (bọc try/catch); `S.tab`. Các Task 12–14 render vào view tương ứng qua `renderWorkersView()`, `renderTokensView()`, `renderSettingsView()` — gọi khi tab được mở.

- [ ] **Step 1: Test hỏng** — thêm vào `test/ui.test.ts`:

```ts
test('UI has four tabs with their views', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const t of ['rooms', 'workers', 'tokens', 'settings']) {
      assert.ok(html.includes(`data-tab="${t}"`), `missing tab ${t}`);
      assert.ok(html.includes(`id="view-${t}"`), `missing view ${t}`);
    }
    for (const s of ["'/api/tokens", "'/api/settings'", "'/api/providers'", "'/api/accounts'", "'/api/skills'", "'/api/room-chat'"]) assert.ok(html.includes(s), `UI never calls ${s}`);
  } finally { await hub.close(); }
});
```

- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt khung** — dùng skill `frontend-design` + `ui-ux-pro-max` khi chỉnh giao diện, giữ token màu/ theme hiện có (`--side`, `--text`, `--bg`, 3 theme light/gray/dark). Bố cục: thanh tab ngang ở đầu cột phải (trên `<header>`), sidebar giữ nguyên cho tab Phòng; ở 3 tab khác sidebar chỉ còn brand + nav (ẩn `.side-scroll`). Trên mobile (≤760px) tab là thanh cuộn ngang.

```html
<nav id="tabs" role="tablist" aria-label="Màn hình">
  <button role="tab" data-tab="rooms" aria-selected="true">Phòng</button>
  <button role="tab" data-tab="workers">Worker <span class="cap" id="tabWkCount"></span></button>
  <button role="tab" data-tab="tokens">Token</button>
  <button role="tab" data-tab="settings">Cài đặt</button>
</nav>
<section id="view-workers" class="view" hidden></section>
<section id="view-tokens" class="view" hidden></section>
<section id="view-settings" class="view" hidden></section>
```

`<main>` hiện tại nhận `id="view-rooms" class="view"`. Script:

```js
const TABS = ['rooms', 'workers', 'tokens', 'settings'];
function showTab(name) {
  if (!TABS.includes(name)) name = 'rooms';
  S.tab = name;
  for (const t of TABS) {
    $('view-' + t).hidden = t !== name;
    document.querySelector(`[data-tab="${t}"]`).setAttribute('aria-selected', String(t === name));
  }
  document.body.dataset.tab = name;
  if (location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
  try { localStorage.setItem('bear.tab', name); } catch {}
  ({ workers: renderWorkersView, tokens: loadTokens, settings: loadSettingsView })[name]?.();
}
$('tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
window.addEventListener('hashchange', () => showTab(location.hash.slice(1)));
let saved = ''; try { saved = localStorage.getItem('bear.tab') || ''; } catch {}
showTab(location.hash.slice(1) || saved);
```

Grid `body` cần thêm hàng cho `#tabs`: bọc `#tabs` + các view vào `<div id="right">` (flex column) để `body` vẫn 2 cột như cũ. Các hàm `renderWorkersView/loadTokens/loadSettingsView` khai báo tạm rỗng ở task này rồi thay ở Task 12–14 (nếu làm tuần tự trong cùng PR, tạo luôn hàm có nội dung).
- [ ] **Step 4: Chạy** `npm test` → PASS (cả test "inline script compiles"). Chạy `node scripts/demo-hub.mjs 7797` + `node scripts/screenshot.mjs out` → xem ảnh 3 theme, chuyển tab không vỡ layout, tab Phòng y như cũ.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): four-tab shell"`.

---

### Task 12: UI tab 2 — Quan sát worker

**Files:** Modify `ui/index.html`; Test `test/ui.test.ts`.

**Interfaces:** Consumes `GET /api/workers` (đã có, nay thêm `provider/tier/usage` ở `recent`), SSE `workers`, `POST /api/workers/:pid/kill`, `GET /api/providers` (+`health`), SSE `providers`.

Nội dung view:
- Hàng thẻ trạng thái: mỗi provider bật → tên, tầng (badge `FREE` xanh / `PAID` cam), LED health, số worker đang chạy, "x/cap".
- Bảng "Đang chạy": loại (🛠 worker / 🧹 osin), việc, thuê bởi, repo, model, provider, được sửa file?, thời gian chạy (cập nhật mỗi 5s), nút Dừng 2 lần bấm (tái dùng logic `workerRow`).
- Bảng "Gần đây (24h)": trạng thái, thời lượng, model, provider/tầng, token in/out, lỗi (rút gọn, `title` đầy đủ), kết quả 200 ký tự.
- Bộ lọc: Tất cả / worker / osin / lỗi / hub tự chạy (`by === 'hub'`) (lưu `localStorage`, try/catch).
- Khối **room_chat** (`GET /api/room-chat`, `POST /api/room-chat/sweep`): số transcript đã gom theo repo và loại (worker / revive / rỗng / test), 20 cái mới nhất (tiêu đề = prompt đầu, dung lượng, thời gian); nút "Xem trước" (`{apply:false}`, hiện danh sách sẽ chuyển) và "Dọn ngay" (2 lần bấm, `{apply:true}`).

- [ ] **Step 1: Test hỏng** — trong `test/ui.test.ts` kiểm `html.includes('function renderWorkersView')`, `'data-filter="failed"'`, `"addEventListener('providers'"`, `'/api/room-chat/sweep'`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** — tách phần lõi của `workerRow` thành `workerCells(w, live)` dùng chung cho sidebar và bảng; `renderWorkersView()` dựng HTML bằng `esc()` sẵn có (không bao giờ chèn chuỗi từ log chưa escape). Ví dụ hàng gần đây:

```js
const fmtTok = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n || 0);
function recentRow(r) {
  const [icon, label] = KIND[r.kind] || KIND.worker;
  const tier = r.tier ? `<span class="tier ${r.tier}">${r.tier === 'free' ? 'FREE' : 'PAID'}</span>` : '';
  return `<tr class="${r.status}"><td title="${esc(label)}">${icon}</td><td title="${esc(r.result || r.error)}">${esc(r.task || label)}</td>
    <td>${r.status === 'done' ? 'xong' : 'lỗi'}</td><td>${r.durationMs != null ? dur(r.durationMs) : ''}</td>
    <td>${esc(r.model)} ${tier}</td><td>${esc(r.provider)}</td><td class="num">${fmtTok(r.usage?.in)} / ${fmtTok(r.usage?.out)}</td>
    <td class="err" title="${esc(r.error)}">${esc(r.error.slice(0, 60))}</td></tr>`;
}
```

- [ ] **Step 4: Chạy** test + screenshot demo hub (demo-hub cần sinh vài dòng `workers.jsonl` mẫu có `usage` — sửa `scripts/demo-hub.mjs` nếu chưa có).
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): workers tab"`.

---

### Task 13: UI tab 3 — Dashboard token

**Files:** Modify `ui/index.html`; Test `test/ui.test.ts`.

**Interfaces:** Consumes `GET /api/tokens?days=N` (`TokenSummary` của Task 7), `GET /api/accounts` (+`?refresh=1`) (`AccountInfo[]` của Task 10).

**Bắt buộc:** load skill `dataviz` trước khi viết biểu đồ.

Nội dung view:
- Chọn khoảng: 1 / 7 / 30 ngày.
- KPI: tổng token worker (in+out), % chạy trên tầng free, số lần chạy / lỗi, số chat ≥300k context.
- Biểu đồ cột chồng theo ngày (free vs paid) — SVG inline tự vẽ (không thư viện), có `<title>` cho tooltip và bảng số liệu ẩn cho screen reader.
- Bảng theo provider và theo model (runs, in, out, cache read, lỗi).
- Bảng "Context các chat" (`chats`): tên, repo, ctx (màu đỏ ≥300k như sidebar), trạng thái — gợi ý `/compact` hoặc giao `osin` làm hồ sơ bàn giao.
- Khối **Claude Pro**: mỗi acc đã lưu một dòng — tên, email, ★ nếu đang dùng, 2 thanh % (5 giờ, tuần) với giờ reset theo giờ Việt Nam (`toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })`), màu thanh chuyển cam ≥70%, đỏ ≥90%; `usageError` hiện thành dòng chữ nhỏ thay cho thanh; nút "Làm mới" gọi `?refresh=1`.
- Ghi chú nhỏ: token chat chính là kích thước context hiện tại (ước lượng), không phải hoá đơn.

- [ ] **Step 1: Test hỏng** — kiểm `'function renderTokensView'`, `'id="tkChart"'`, `'days='`, `'/api/accounts'`, `'Asia/Ho_Chi_Minh'`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** — vẽ cột:

```js
function barChart(days) {
  const W = 640, H = 160, max = Math.max(1, ...days.map((d) => d.free + d.paid)), bw = W / Math.max(1, days.length);
  return `<svg id="tkChart" viewBox="0 0 ${W} ${H + 18}" role="img" aria-label="Token worker theo ngày">` + days.map((d, i) => {
    const hf = d.free / max * H, hp = d.paid / max * H, x = i * bw + 2, w = bw - 4;
    return `<g><title>${d.day}: free ${fmtTok(d.free)}, paid ${fmtTok(d.paid)}</title>
      <rect x="${x}" y="${H - hf}" width="${w}" height="${hf}" fill="var(--c-free)"/>
      <rect x="${x}" y="${H - hf - hp}" width="${w}" height="${hp}" fill="var(--c-paid)"/>
      <text x="${x + w / 2}" y="${H + 14}" text-anchor="middle">${d.day.slice(5)}</text></g>`;
  }).join('') + '</svg>';
}
function loadTokens() { api('/api/tokens?days=' + (S.tkDays || 7)).then((s) => { S.tokens = s; renderTokensView(); }, (e) => toast(e.message)); }
```

Thêm `--c-free` / `--c-paid` vào cả 3 theme (kiểm độ tương phản bằng validator trong skill `dataviz`). Không có dữ liệu → trạng thái rỗng "Chưa có worker nào chạy trong N ngày".
- [ ] **Step 4: Chạy** test + screenshot 3 theme.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): token dashboard tab"`.

---

### Task 14: UI tab 4 — Cài đặt

**Files:** Modify `ui/index.html`; Test `test/ui.test.ts`.

**Interfaces:** Consumes `GET/PUT /api/settings`, `GET/POST/PUT/DELETE /api/providers[/:id]`, `GET /api/skills`, `GET/POST /api/accounts`, `POST /api/accounts/:name/switch`, `DELETE /api/accounts/:name`, SSE `settings`, `providers`.

Các nhóm:
1. **Worker** — 2 công tắc chặn cứng `worker`, `osin`; công tắc "Tự chuyển sang tầng trả tiền khi free hết quota"; ô số "Số worker chạy cùng lúc" (1–16); công tắc "Tự dọn transcript vào room_chat" (`roomChat.autoSweep`); ô "Thư mục sao lưu chat" (`archive.dir`, gợi ý `X:\Coding\claude-mem`, để trống = tắt) kèm trạng thái lần sao lưu gần nhất từ `GET /api/archive`.
1b. **Hub tự chạy worker** (Task 9b) — 3 công tắc + ngưỡng: hồ sơ bàn giao khi chat ≥ N nghìn token, rút gọn tin nhắn ≥ N ký tự, dọn biên bản ≥ N mục; ô "tối đa N lần/ngày". Ghi chú: "Dữ liệu chat được gửi lên API của nhà cung cấp worker."
1c. **Skill theo agent** (Task 8b) — chọn agent ở cột trái (danh sách `members` từ `/api/skills`, kèm LED trạng thái; agent đã có rule hiện số rule). Cột phải: bảng mọi skill (tên, nguồn user/plugin, mô tả 1 dòng, ô tìm kiếm), nhóm theo plugin; đầu mỗi nhóm có dòng "cả plugin (`plugin:*`)". Mỗi dòng 3 nút **Ép dùng / Tự quyết / Cấm**; khi Ép dùng có thêm chọn "mỗi tin" / "tin đầu phiên". Đổi là lưu ngay: PUT `{ agentSkills: { <agent>: { <skill>: rule | null } } }` (về Tự quyết = `null`). Cũng mở được từ tab Phòng: menu của một member → "Skill của agent này…" nhảy sang đúng agent ở tab Cài đặt.
2. **Nhà cung cấp worker** — mỗi provider một thẻ: tên, tầng, bật/tắt, Base URL, kiểu xác thực, ô key `type="password"` placeholder `đã lưu …1234` (để trống = giữ nguyên; nút "Xoá key" gửi `key: null`), model đọc / model sửa (danh sách cách nhau bởi dấu phẩy), LED health. Nút "+ Thêm nhà cung cấp" (form id + base URL). Nút xoá (2 lần bấm, không có cho `intern`).
3. **Tài khoản Claude** (Task 10) — danh sách acc đã lưu: tên, email, plan, ★ đang dùng. Nút **Lưu acc hiện tại** (ô tên, gợi ý từ email), **Chuyển** (2 lần bấm; xong thì hiện banner cố định "Đã chuyển sang <tên>. Reload Window ngay trong mọi cửa sổ VS Code/Antigravity (Ctrl+Shift+P → Developer: Reload Window), nếu không extension có thể ghi token cũ đè lên."), **Xoá** (2 lần bấm, ẩn với acc đang dùng). Hướng dẫn thêm acc mới: "Lưu acc hiện tại → trong Claude gõ /login bằng acc khác → Lưu acc hiện tại lần nữa." Ghi chú: "Token chỉ nằm trên máy này, hub không bao giờ gửi token ra UI."
4. **Thông tin** — đường dẫn dữ liệu hub, `room_chat`, phiên bản plugin.

- [ ] **Step 1: Test hỏng** — kiểm `'function renderSettingsView'`, `'type="password"'`, `'key: null'`, `'/switch'`, `'Reload Window'`, `'Ép dùng'`, `'Cấm'`, `'agentSkills'`.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt** — mọi PUT gửi chỉ trường thay đổi; ô key chỉ gửi khi người dùng gõ gì đó. Ví dụ lưu key:

```js
async function saveProvider(id, form) {
  const patch = { enabled: form.enabled.checked, baseUrl: form.baseUrl.value.trim(), auth: form.auth.value,
    models: { read: splitList(form.read.value), edit: splitList(form.edit.value) } };
  if (form.key.value.trim()) patch.key = form.key.value.trim();
  await api(`/api/providers/${id}`, patch, 'PUT');
  form.key.value = ''; toast('Đã lưu');
}
const splitList = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
```

Kiểm tra helper `api()` của UI có nhận method; nếu chỉ hỗ trợ GET/POST thì mở rộng `api(path, body, method = body === undefined ? 'GET' : 'POST')`.
- [ ] **Step 4: Chạy** test + screenshot; thử tay trên hub thật: lưu key → `GET /api/providers` chỉ thấy `…xxxx`; tắt `osin` → chạy `worker.ps1 -Kind osin` thoát mã 4; gán `Boss` → `superpowers:*` = Ép dùng → tin đầu tiếp theo của Boss gọi superpowers, agent khác không đổi.
- [ ] **Step 5: Commit** — `git commit -am "feat(ui): settings tab (workers, auto jobs, skill modes, providers, Claude accounts)"`.

---

### Task 15: Tài liệu + phát hành 0.3.0

**Files:** Modify `README.md`, `CHANGELOG.md`, `.claude-plugin/plugin.json`, `package.json`.

- [ ] **Step 1:** README: đổi mục "Worker skills" → `worker` / `osin`, bảng tầng (free Intern AI / paid OpenRouter / MCP — sắp có), bảng Configuration thêm `WORKER_BASE_URL` (giữ `CONGNHAN_BASE_URL` là tên cũ), mô tả 4 tab, chế độ skill theo từng agent (ép/tự quyết/cấm), hub tự chạy worker, chuyển acc Claude (cảnh báo Reload Window), `room_chat` + `scripts/move-room-chats.mjs`, mã thoát 0/1/2/3/4. Roadmap: bỏ mục đã xong, giữ Task board + MCP worker.
- [ ] **Step 2:** version `0.3.0` ở `package.json` và `.claude-plugin/plugin.json`; CHANGELOG: đổi `## Unreleased` → `## 0.3.0 — 2026-10-xx`.
- [ ] **Step 3:** `npm test` → xanh toàn bộ; `node scripts/screenshot.mjs out` → ảnh 4 tab × 3 theme cho chủ repo duyệt.
- [ ] **Step 4: Commit** — `git commit -am "docs: worker/osin, tiers, four tabs; v0.3.0"`.

---

### Task 16 (tầng 3, làm sau v0.3.0): Worker Muse qua MCP

Nghiên cứu + thử thật bởi agent `mcp-server-muse` (2026-10-16): gửi "Reply with exactly one line: PONG-42" → nhận "PONG-42" sau ~9s. Biên bản phòng [1] giữ các selector. **Chủ repo đã chấp nhận rủi ro (2026-10-16, biên bản [3]):** tự động hoá web UI của Meta có thể vi phạm điều khoản của họ, và selector sẽ vỡ khi Meta đổi giao diện. Muse có cơ chế Approvals cho hành động thật → chỉ dùng cho hỏi đáp/nghiên cứu, KHÔNG giao việc agent (sửa file, chạy lệnh).

**Files:**
- Create: `mcp/muse.ts` (server), `mcp/muse-core.ts` (hàm thuần, test được), `test/muse.test.ts`
- Modify: `.mcp.json` (server `muse` riêng — `room` lỗi thì `muse` không chết theo), `hub/workers.ts` (`Kind` thêm `'muse'`), `ui/index.html` (`KIND.muse = ['🎨', 'muse']`), `CHANGELOG.md`, `todoplan.md` (gạch mục MCP)

**Interfaces:**
- Tool MCP: `muse_ask({ prompt: string, timeout_s?: number /* mặc định 180 */ })` → text trả lời (hoặc `isError` kèm hướng dẫn); `muse_status()` → `{ chrome: boolean, loggedIn: boolean, busy: boolean }`.
- CDP: `fetch http://localhost:9222/json` tìm page có url chứa `muse.ai`; WebSocket gốc của Node (không npm dep); profile Chrome debug `C:\Temp\chrome-debug`. Url là `instagram.com/accounts/login` → "chưa đăng nhập".
- Hàng đợi trong process: mỗi lúc một `muse_ask`.
- Board: mỗi lần ask ghi `start`/`end` vào `workers.jsonl` với `kind: 'muse'`, `provider: 'muse'`, `tier: 'free'`, chỉ tóm tắt ≤100 ký tự, không ghi prompt.
- `mcp/muse-core.ts`:

```ts
export type Item = { role: 'user' | 'assistant'; turnId: string; text: string; hasCopy: boolean };
/** Done = no Stop button, last item is an assistant one with "Copy response", and its text unchanged for stableMs. */
export function isDone(snap: { stop: boolean; items: Item[] }, lastText: string, stableSinceMs: number, now: number, stableMs?: number): boolean;
/** Answer = innerText of every assistant item after the user item we sent (long answers span several bubbles). */
export function joinAnswer(items: Item[], sentTurnId: string): string;
```

Selector đã xác minh: ô nhập `textarea[placeholder=Message]` (React: gán bằng `Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set` rồi dispatch `input` bubbles); gửi `button[aria-label=Send]`; đang trả lời có `button[aria-label=Stop]`; tin nhắn `[role=log][aria-label="Chat messages"] [data-message-item]` với `data-message-role`, `data-message-turn-id`, `data-message-group-id`; xong có `button[aria-label="Copy response"]` trong item cuối. Chỉ dựa vào Stop là sai: giây thứ 1 nó biến mất một nhịp kèm một item rỗng.

- [ ] **Step 1: Test hỏng** — `test/muse.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDone, joinAnswer, type Item } from '../mcp/muse-core.ts';

const u = (id: string, text = 'q'): Item => ({ role: 'user', turnId: id, text, hasCopy: false });
const a = (id: string, text: string, hasCopy = true): Item => ({ role: 'assistant', turnId: id, text, hasCopy });

test('isDone needs no Stop, a finished assistant item and 2s of stable text', () => {
  const items = [u('1'), a('1', 'PONG-42')];
  assert.equal(isDone({ stop: true, items }, 'PONG-42', 0, 5000), false, 'still streaming');
  assert.equal(isDone({ stop: false, items: [u('1'), a('1', '', false)] }, '', 0, 5000), false, 'the empty blink at second 1');
  assert.equal(isDone({ stop: false, items }, 'PONG-42', 4000, 5000), false, 'stable for 1s only');
  assert.equal(isDone({ stop: false, items }, 'PONG-42', 2000, 5000), true);
});

test('joinAnswer joins every assistant bubble after our user turn, ignores older turns', () => {
  const items = [u('0'), a('0', 'old'), u('1'), a('1', 'part one'), a('1', 'part two')];
  assert.equal(joinAnswer(items, '1'), 'part one\n\npart two');
  assert.equal(joinAnswer(items, '9'), '');
});
```

Thêm test server với CDP giả (thay `fetch` + WebSocket bằng stub): Chrome chưa mở → `isError` "mở Chrome debug :9222"; url instagram login → `isError` "chưa đăng nhập Muse"; quá `timeout_s` → trả phần text đã có + `[timeout]`; hai `muse_ask` đồng thời chạy lần lượt.
- [ ] **Step 2: Chạy** → FAIL.
- [ ] **Step 3: Cài đặt `mcp/muse-core.ts`**:

```ts
export type Item = { role: 'user' | 'assistant'; turnId: string; text: string; hasCopy: boolean };

export function isDone(snap: { stop: boolean; items: Item[] }, lastText: string, stableSinceMs: number, now: number, stableMs = 2000): boolean {
  const last = snap.items[snap.items.length - 1];
  if (snap.stop || !last || last.role !== 'assistant' || !last.hasCopy || !last.text.trim()) return false;
  return last.text === lastText && now - stableSinceMs >= stableMs;
}

export function joinAnswer(items: Item[], sentTurnId: string): string {
  const i = items.findIndex((x) => x.role === 'user' && x.turnId === sentTurnId);
  if (i < 0) return '';
  return items.slice(i + 1).filter((x) => x.role === 'assistant' && x.text.trim()).map((x) => x.text.trim()).join('\n\n');
}
```

`mcp/muse.ts`: dùng lại `serve()` của `mcp/jsonrpc.ts` (đọc file để theo đúng chữ ký); vòng `muse_ask`: tìm tab → kiểm login → ghi `start` → gán textarea + click Send (qua `Runtime.evaluate`) → poll 500ms đọc snapshot `{stop, items}` → `isDone` → `joinAnswer` → ghi `end` (kèm `usage` 0, không có số liệu token từ web) → trả text. Kiểm tra chữ ký `serve()` và cách `mcp/server.ts` khai báo tool trước khi viết.
- [ ] **Step 4: Chạy** `npm test` → PASS. Smoke test tay: Chrome debug đã đăng nhập → gọi `muse_ask("Reply with exactly one line: PONG-42")` từ một chat → nhận `PONG-42`; dòng muse hiện trong tab Worker.
- [ ] **Step 5: Commit** — CHANGELOG `- Tier 3 worker: Muse through a separate MCP server (muse_ask / muse_status, Chrome debug session; Q&A only).` → `git commit -m "feat(mcp): muse worker server"`.

---


## Thứ tự & phụ thuộc

```
T1 ─ T2 ─ T3 ─ T3b ─ T3c ─┬─ T4 ─ T5 ─ T6 ─ T7 ────────────┐
                          ├─ T8 ─ T8b ─ T9 ─ T9b ─ T-UI ────┤
                          └─ T10 ───────────────────────────┴─ T11 ─ T12 ─ T13 ─ T14 ─ T15 ··· T16 (sau v0.3.0)
```

T4, T8, T10 độc lập nhau (có thể song song); T3b dùng `Settings.roomChat` (nếu T8 chưa xong thì tạm đọc `autoSweep=false`); T5 cần T4 (T8 nếu có); T9 cần T4 + T8b; T9b cần T8 + T5; T-UI độc lập (chỉ `ui/index.html`) nhưng chạy sau T9b, trước T10, và phải xong trước T11; UI (T11–14) cần mọi API trước nó.

## Ngoài phạm vi (đã ghi vào `todoplan.md`)

- Worker tầng 3 qua MCP: Muse = Task 16 (đã duyệt, làm sau v0.3.0); các MCP khác để sau.
- Ẩn hẳn skill khỏi Claude Code (không nạp) — khác với "Cấm" ở Task 8b (chỉ là lời nhắc).
- Refresh token cho acc Claude đang nằm chờ, nếu nghiencuu ở Task 10 không xác nhận được endpoint.
- Task board (Roadmap v2 cũ).
