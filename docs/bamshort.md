# BAMshort — the cheap agent dialect

Room note [83]: agents talk to each other in the cheapest style that still carries the facts; the user gets full Vietnamese sentences. This file is the glossary the terse line in `shared/format.ts` points to.

## Rules

1. **One line per post.** No greeting, no recap, no "I will now…". Verb + target + result.
2. **Mix freely:** short Vietnamese slang + English slang + emoji + self-made codes. Spelling can be lazy; numbers, paths, names cannot.
3. **Report, do not narrate.** `fixed esc() in office.js`, not "I looked at the file and then I decided to fix…".
4. **Always keep exact tokens:** `@name`, `path:line`, `^sha` (commit hash, `^` marks it as a hash), `#N` (task/message id), `PORT=7789`, env names, API routes.
5. **Full sentences only for:** `@you` (the user), decisions, contracts/API shapes, security notes. Those must be unambiguous.
6. **Details go to a note or a task**, not to chat: `room_note`, `room_tasks update … note`.
7. **No acknowledgement posts** ("ok", "thanks", "done ✅" alone). The task board is the receipt.
8. **One topic per message**; reply in the topic it belongs to.

## Fixed emoji (same meaning in every room)

| Emoji | Meaning | Ví dụ |
|---|---|---|
| ✅ | done / green | `#148 ✅ tests green ^abc1234` |
| ❌ | failed / red | `❌ ui.test.ts:88 expected 3 got 2` |
| ⚠️ | warning, waiting on someone | `⚠️ chờ @copilot chạy node --check` |
| ⏳ | running / in progress | `⏳ office M4, 60%` |
| 🚫 | blocked, cannot proceed | `🚫 thiếu quyền ghi .git` |
| 👀 | please review / watching | `👀 diff shared/format.ts:40` |
| ❓ | question, needs an answer | `❓ dùng vi hay en cho mock roster?` |
| 🔁 | retry / re-run | `🔁 test lần 2 sau khi sửa` |

## Self-made codes

| Code | Meaning |
|---|---|
| `^sha` | commit hash (`^5df8721`), the `^` keeps it from reading as a bare word |
| `f:path:line` | file location; often shortened to `path:line` |
| `→` | leads to / next step |
| `≠` | differs from, do not confuse |
| `x2`, `+3` | count of repeats or added items |
| `w/`, `w/o` | with / without |
| `b/c` | because |
| `n/a` | not applicable (never "none" when a value is expected) |
| `TBD` | to be decided by the user/lead |

## Examples

Mock office string moved to the dictionary:

```
office M4: labels → shared/i18n/{vi,en}.ts ✅ parity test green ^abc1234
```

Bug report:

```
❌ office.js:299 hard-coded "Chat" tab → T('panel.tabChat') ✅
```

Handoff:

```
⏳ #150 format.ts:40 done on disk; 👀 @copilot create docs/bamshort.md + test, then room_commit
```

Blocked:

```
🚫 #155 needs `claude mcp` argv fix ⚠️ waiting @copilot
```

## Anti-patterns

- `Chào bạn, mình đã hoàn thành công việc...` — greeting + recap: wasted tokens.
- `Done` — no target, no proof.
- A long paragraph for a one-file change — put it in the note, post one line.
- Emoji soup with no facts: `🚀🔥👍` says nothing.
- Vietnamese full sentences between agents when three words would do; but never shorthand for a decision the user must read.
