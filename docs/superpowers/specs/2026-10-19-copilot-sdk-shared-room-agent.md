# Copilot as a shared-room agent

Research date: 2026-10-19 (expanded after checking current Claude Code CLI and Copilot SDK documentation).

## Short answer

**A separate Copilot agent can run without VS Code. This live Copilot assistant/session cannot be moved out of VS Code or resumed as a background process.** The GitHub Copilot SDK is a separate runtime that applications can host from Node.js, Python, Go, .NET, Java, or Rust. It communicates with the Copilot CLI runtime over JSON-RPC; the Node.js SDK bundles that runtime. VS Code is not part of this process.

That would make Copilot a **new, independent room member**, not another client attached to a Claude session. Bear Agent Manager room membership and messages can be shared; the provider's conversation history, model identity, authentication, and billing remain separate.

## Existing foundation before this integration

- `POST /api/agents` can create an independent headless Claude session, join it to a room, and keep it available between turns. Its implementation is Claude-specific (`hub/agents.ts`); it does not run Copilot SDK.
- On Windows, the hub already has a user Startup-folder autostart switch (`hub/autostart.ts`, `POST /api/autostart`); it does not require Task Scheduler or administrator rights. This starts the hub; Copilot startup is a separate explicit setting.
- Hub background agents have a configurable concurrency cap (`agents.maxBackground`, default 4). "As many as wanted" can mean a configurable ceiling/queue, not literal infinity: each live session consumes memory, CPU, handles, disk, and provider quota.
- The current MCP server assumes `CLAUDE_CODE_SESSION_ID` and identifies a Claude Code participant. Copilot instead uses its dedicated hub adapter and must not spoof that variable or reuse a Claude session ID.
- A Copilot SDK conversation is separate from Claude Code and from this VS Code assistant; it cannot resume either conversation.

## Implementation in this repository

The standalone path is now implemented behind Settings > Accounts:

- `hub/copilot.ts` manages one `@github/copilot-sdk` client and its Copilot CLI child runtime. It uses the already signed-in Copilot CLI identity; it does not create an OAuth token, read credentials, or copy them into hub data.
- Enabling Copilot creates/resumes one named hub member in the shared `#bear-agent-manager` room. The hub delivers room messages serially to the SDK session and posts its final answer as `Copilot`. SDK session ID and hub session ID are stored in `copilot-agent.json`, not in the prompt or token file.
- Copilot autostart is explicit and defaults off. Enabling it starts the worker immediately and persists the choice for later hub launches; Windows hub autostart is a separate, existing switch. No VS Code process is required.
- The SDK runs in `mode: "empty"` and uses the current user's normal Copilot CLI data directory. The selected hub permission mode is mapped to SDK permission decisions. `bypass` approves operations unless denied; `acceptEdits` allows read/write requests inside the configured working folder and denies shell; `default` allows only configured tools and otherwise reports that no person is available; `plan` denies tool operations. Managed approvals are never auto-approved.
- Important limit: the SDK `workingDirectory` is not by itself a sandbox. `bypass` intentionally retains full permissions as configured in the existing hub; room membership is logical visibility, not filesystem isolation or a security boundary. A Copilot turn, like any standalone session, consumes account quota. The current implementation supports one Copilot agent, not unlimited workers.
- Startup/auth/turn failures appear in the room and settings/API status. The first run requires the user to run `copilot` and complete GitHub sign-in as the same Windows user; no token or CLI login was performed as part of this change.
- Claude's `Stop` hook runs a long-poll waiter while the session remains active. BAM messages can wake that waiter and be returned to Claude after the current model turn; they cannot interrupt an in-progress model request. If the waiter has expired or the IDE process ended, the hub waits for a later hook or uses the existing headless revive path where eligible.

## Direct chat in Bear Agent Manager, with no IDE

The implemented direct-chat path is:

1. The user enables the single Copilot agent under Settings > Accounts. It joins the shared `#bear-agent-manager` room, and the UI renders the same durable room log.
2. The hub passes new room messages to the Copilot SDK session and posts its final replies under the `Copilot` member name. The mapping of hub and provider session IDs is persisted separately from credentials; restart resumes that provider session.
3. The SDK runs without a VS Code extension host, Claude panel, or user-chat-box automation. Its working directory is the Bear Agent Manager checkout; this implementation does not yet offer a workspace picker or multiple Copilot agents.

This provides **logical privacy** through room membership and routing, not a hard security boundary against a malicious local process: the hub currently uses a machine-wide local token. The SDK's `workingDirectory` is not a sandbox; `bypass` permission mode may approve broad tool access. A strict isolation boundary would require per-agent capabilities/scoped tokens and route authorization, not merely separate room names.

Claude already works without VS Code in this repository: the hub runs `claude -p --session-id` for a new background session and `claude --resume` for revives. Claude Code's current CLI also documents a standalone local background-session supervisor (`claude agents`) with dispatch, persistence, attach/detach, and concurrent sessions. That native agent view is evidence that Claude sessions need no IDE, but it is not itself a Bear Agent Manager room client; BAM still needs its runner or an explicit bridge to route private-room messages.

The Copilot SDK is likewise an out-of-VS-Code runtime, but it creates a **new independent Copilot agent**. It cannot attach to this current interactive assistant's live chat or transfer its hidden context/state.

## Claude Pro account switching

This repo already discovers Claude config directories, launches each Claude process with its chosen `CLAUDE_CONFIG_DIR`, and implements `accountSwitch` (`off` / `ask` / `auto`) plus account selection by remaining usage. When account chat sharing is configured, the shared project transcript allows the next headless turn to resume the same Claude Code session using the other account's config directory. This can be transparent to room peers apart from a system notice, but it is not live migration of an in-flight model request:

- Finish/stop the current turn, confirm the old process exited, then launch `claude --resume <session>` with the other account's config directory.
- Never let two Claude processes write the same resumed transcript concurrently.
- Account switching selects an existing config directory; it does not copy or exchange credentials. Verify login/usage in each profile with the supported CLI auth-status command without reading or printing tokens.
- Show account labels, health, remaining usage, and switch history in the UI. Raw access/refresh tokens do not need to be displayed or logged, even if the user is comfortable discussing them; doing so creates an avoidable account-takeover risk.

## Authentication and the user's account

The SDK's default auth uses credentials created by signing in to **Copilot CLI** with GitHub OAuth; those credentials are stored in the system keychain. The SDK can also accept explicit GitHub tokens, supported organization server-to-server GitHub App tokens, or BYOK provider keys.

Therefore:

- No VS Code window is needed for SDK authentication or execution.
- A standalone runtime still needs an authorized Copilot entitlement and consumes that identity's allowance. If it uses the same GitHub account as the user's VS Code Copilot, it is still using the user's account and usage, even though it does not use the user's chat box.
- A genuinely separate Copilot identity requires its own GitHub account and eligible Copilot access, or organization-approved server-to-server auth. GitHub documents the latter for organization billing and policy-enabled GitHub App installations, not as a way to get an individual's Free quota.
- BYOK avoids Copilot subscription auth but moves model usage to the separately configured provider/account and its billing.
- Copilot Free currently advertises a limited GitHub AI Credits allowance, limited agents, and automatic model selection only. The public plan page does not give a numeric Free allowance, so do not promise a fixed number of autonomous turns.

## Implementation boundaries and future work

The current adapter has one fixed agent in the shared `#bear-agent-manager` room, serial message handling, persisted provider-session resume, explicit account-quota confirmation, and permission decisions based on the hub's permission mode. It uses the user's normal Copilot CLI profile; it does not create custom SDK tools, provide per-agent workspace selection, or expose the hub token to the model. The SDK client manages a CLI runtime child, but the hub does not yet provide a separate per-agent concurrency pool, cost reporting, or automatic recovery after an unexpected runtime exit. These are follow-up features, not prerequisites for using the opt-in single agent.

## Suggested system lifecycle

- At Windows user sign-in, the existing Startup-folder entry starts the hub. The UI remains at `http://127.0.0.1:7788`; the user can close every IDE and use the browser.
- If Copilot is opted in, hub startup starts or resumes its one SDK session independently of the IDE. The user can stop it from Settings > Accounts; the hub shuts the SDK client down during normal close.
- The hub persists the desired auto-start setting and room/session mapping, but a saved setting is not proof that a provider process is alive; the startup status check reports auth/runtime failures.
- Supporting multiple Copilot agents, selectable workspaces, provider-crash recovery, and cost reporting would require additional lifecycle and isolation work. Keep a conservative default rather than unlimited process creation.
- Keep IDE extensions optional clients. Hub, browser UI, provider runtimes, and room messages must not depend on an extension host or editor-specific state.

## Operational follow-up

The user selected the existing Copilot account and one auto-started Copilot agent. Before it can run against the live model, the same Windows user must sign in interactively with `copilot`; then enable Copilot under Settings > Accounts. To launch the hub at Windows sign-in too, separately enable the existing hub autostart switch. No runtime startup, model request, or quota use was performed while implementing this feature.

The current implementation tests the lifecycle with a fake SDK client: opt-in and confirmation, shared-room delivery alongside another member, persistence/resume of the same session ID, migration out of the old `#copilot` membership, missing-login reporting, permission-mode mapping, and hub startup with the IDE closed. A live Copilot test should be one explicit synthetic prompt after sign-in; it consumes the user's account allowance.

Claude account handover remains separate: stop account A's process, confirm exit, then resume on account B using shared project storage. Never run two Claude processes writing the same resumed transcript concurrently or print credentials.

## Sources

- [GitHub Copilot SDK repository](https://github.com/github/copilot-sdk) — supported languages, standalone runtime architecture, SDK capabilities, authentication overview.
- [Copilot SDK getting started](https://github.com/github/copilot-sdk/blob/main/docs/getting-started.md) — CLI assistant and custom-tool examples.
- [Copilot SDK authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/authenticate.md) — OAuth, environment, organization, and BYOK authentication.
- [Copilot SDK server-to-server authentication](https://github.com/github/copilot-sdk/blob/main/docs/auth/server-to-server-tokens.md) — GitHub App installation policy and organization billing requirements.
- [Copilot SDK multi-tenancy](https://github.com/github/copilot-sdk/blob/main/docs/setup/multi-tenancy.md) — per-session identity in server deployments.
- [GitHub Copilot plans](https://docs.github.com/en/copilot/get-started/plans) — current Free allowance, agents, and model-selection summary.
- [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/ai/language-model) — contrast: this API does require a running VS Code extension host and user consent.
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) — non-interactive execution, resume, auth status, and agent-view commands.
- [Claude Code agent view](https://code.claude.com/docs/en/agent-view) — local background-session supervisor, persistence, attach/detach, concurrency, and quota.
- [Claude Code Remote Control](https://code.claude.com/docs/en/remote-control) — optional remote access to a local session; the host machine and Claude process still need to run.

## Trạng thái hiện tại (hand-off)

- **Đã code và test bằng fake SDK:** `CopilotAgent` tham gia room chung `#bear-agent-manager`, kể cả khi room đã có thành viên; danh tính hub và SDK session được lưu trong `copilot-agent.json` để resume; membership cũ ở `#copilot` được bỏ khi start lại, lịch sử room cũ không bị xóa. Permission mapping áp dụng `bypass`, `acceptEdits`, `default`, `plan` và deny rules; sender không tự wake, cursor ngăn đọc lại tin đã consume, `wakeTask` tuần tự hóa lượt Copilot, và loop guard room tạm pause khi agent-generated wakes vượt 30 cho tới khi người dùng gửi tin.
- **Giới hạn Claude sync:** Stop hook của Claude duy trì long-poll waiter khi session còn hoạt động. Tin BAM đánh thức waiter sau khi lượt model hiện tại xong; không thể interrupt request đang chạy. Khi waiter không còn, hub chờ hook tiếp theo hoặc thử headless revive nếu đủ điều kiện.
- **Chưa chạy thật:** cần đăng nhập `copilot` CLI dưới đúng Windows user, bật Copilot ở Settings > Accounts và restart hub để nạp code. Chưa gửi prompt thật, chưa xác nhận kết nối/auth SDK ngoài fake client, và chưa dùng quota. Cần test một prompt tổng hợp thật sau khi chủ repo cho phép.
- **Các level còn chưa là room participant:** Intern/OpenRouter và Local Ollama hiện là worker được gọi theo route, Muse là MCP tool điều khiển Chrome remote; chúng chưa tự nhận `@mention`/tin room hay trả lời như thành viên độc lập. Cần thiết kế adapter/supervisor chung để bridge các worker này, có giới hạn concurrency/VRAM, attribution và chống loop.
- **Tình trạng file trước hand-off commit:** file duy nhất còn sửa chưa commit theo `git status` là `docs/superpowers/specs/2026-10-19-copilot-sdk-shared-room-agent.md`. Code shared-room, test, comment settings đã nằm trong commit hiện tại `9d3f2fb`.
- **Kiểm thử gần nhất:** 52/52 test mục tiêu qua (`copilot`, `i18n`, `routing`, `store`). Toàn bộ `npm test`: 389 pass, 2 fail, 1 skipped; lỗi là test timing `archive rounds never overlap...` và test `/api/restart` nạp `[eval]` (không thuộc diff Copilot). Chưa chạy `npm run release`, chưa push; Copilot thật chưa bật.
