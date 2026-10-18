# Troubleshooting: risk-committee-pack

Recurring failure modes when a committee pack looks complete but is not. The reviewer pass should catch these; the builder pass should preempt them.

## The pack reads as a status update, not a committee instrument

Symptom: long heat map, dense KRI table, exhaustive issues register, no decision items. The committee meets, nods, and moves on.

Why it happens: builder treats the artifact as a snapshot for the file, not as the load-bearing input to a governance forum.

Fix: Decision items requested is the first body section. Every decision has named options, a recommended option, a requested vote or acknowledgement, and an owner. A pack with no decisions for the cycle is rare; usually it means the conversation between management and the committee has not happened yet, and the builder should surface that as a sign-off question rather than ship a status pack.

## Static heat map

Symptom: heat-map cells with current rating only; no prior, no direction, no commentary.

Why it happens: the heat map gets ported forward from the prior pack with current ratings refreshed but the movement view never wired up.

Fix: every cell carries current, prior, and direction. Every deteriorating cell is addressed in the Top risks section. The structured object enforces the four required fields per cell (`risk_type`, `current_rating`, `prior_rating`, `direction`).

## Climate as bolt-on appendix

Symptom: a separate "Climate appendix" floats outside the risk taxonomy; the heat map by risk type does not mention climate at all; physical and transition risk live nowhere on the enterprise view.

Why it happens: climate work has its own owner and its own scenario apparatus, and rolling it into the enterprise view feels like double-counting.

Fix: where climate is in scope, it appears in the heat map (as a separately-rated cell or under strategic with rationale documented in the cell commentary). The Climate section carries governance, scenarios, and the link to disclosure; it does not replace the heat-map placement. Load `references/cross-cutting/climate.md` for the placement guidance and the SEC-rule verification posture.

## SEC climate rule overreach

Symptom: forward-looking commentary asserts the SEC climate disclosure rule is in force and the firm is reporting against it.

Why it happens: the rule was finalised March 2024 and the headline regulatory change is memorable; the legal challenges and the SEC's voluntary stay are not.

Fix: never assert current effectiveness of the SEC climate rule without checking SEC's posture as of the report date. Default posture: cite the rule with the verification flag in source-anchors, lean on TCFD for substantive content, note the firm's continuing voluntary posture in the climate section. The cross-cutting climate overlay carries the verification discipline; the SKILL.md does not over-claim.

## RAS metrics with no ladder to operating limits

Symptom: RAS table reports limit, trigger, tolerance, current value, breach status. No column showing how the metric ladders down to first-line operating limits.

Why it happens: the ladder lives in the operating policy, not in the RAS document; the builder treats the two as separate.

Fix: the ladder column is required for OCC Heightened Standards covered banks (12 CFR Part 30 Appendix D §III) and recommended for any firm with a layered RAS. Without the ladder, the heightened-standards expectation that the board frames and oversees the RAS is not demonstrably met. The schema's `ras_status[].ladder_to_operating_limit` field is the place; the SKILL.md notes it as a sector-overlay reinforcement.

## Issues section is a counter, not a manager

Symptom: issues table shows counts and ageing buckets only. Each over-age MRA, MRIA, or audit issue is a tally, not a managed item.

Why it happens: the upstream feed gives counts; the manager-level commentary lives in the issue owner's notes and never makes the pack.

Fix: each over-age item carries owner (role), forward action with date, and slippage commentary explaining why the prior commitment slipped. Counts alone fail the SR 12-17 expectation that the committee manage, not just count, the open population.

## Confidence label gaming

Symptom: data confidence label is "high" while the BCBS 239 known-limitations list is non-empty.

Why it happens: the label is treated as an aspiration or as a brand statement, not as a BCBS-239-anchored claim.

Fix: schema validation enforces the rule that `data_confidence_label = "high"` is incompatible with non-empty `bcbs239_known_limitations`. Where limitations are present, the label is medium at best; the appendix names the limitations and the path to closure. The label is the BCBS 239 voice in the pack, not a marketing decision.

## Generic forward-looking commentary

Symptom: forward-looking section reads "emerging risks include cyber, AI, and climate". The committee learns nothing.

Why it happens: forward-looking gets drafted last when builder fatigue is highest; the section is treated as a hedge.

Fix: each forward-looking item is named, dated, and regulator-anchored. "FRB stress test 2026 hypothetical scenario published February 2026: projected capital impact on the commercial real-estate book to be reported next cycle" is named, dated, and actionable. "Emerging risks include cyber" is filler; cut it.

## Heat map with no quantified exposure on elevated cells

Symptom: operational risk cell rated elevated, deteriorating; no number anywhere in the row.

Why it happens: quantified exposure lives in the loss-event log, the loss-distribution model, and the YTD operational-loss tracker; pulling them into the cell commentary feels redundant.

Fix: every elevated or high cell carries a quantified exposure where one exists, in the cell commentary or the linked top-risks entry. The committee cannot calibrate "elevated" without a number to anchor it. If no number exists, the absence is itself a sign-off question.

## Adviser-level pack reads as a fund board pack

Symptom: adviser risk committee pack covers fund-level liquidity, fund-level NAV-error events, fund-board-mapped issues. The adviser firm's enterprise view (investment risk at the firm, fiduciary risk at the firm, vendor and technology risk at the firm) is buried.

Why it happens: the builder uses bank-shaped templates and slots fund items into the absent bank rows.

Fix: the capital-markets sector overlay carries the adviser-firm-versus-fund-board distinction. Adviser-level risk committee scope is the adviser firm. Fund-level items go to the fund boards via separate reporting; cross-link if an item is material to both, do not collapse.

## Sector overlay loaded but ignored

Symptom: insurance sector overlay loaded but the pack has no ORSA mapping; banking overlay loaded but the pack has no MRA / MRIA aging columns; capital-markets loaded but no Form PF current-event filings called out.

Why it happens: the overlay is treated as background reading, not as content that lands in the pack.

Fix: when the scope names a sector, the matching `references/sector-overlays/<sector>.md` content lands as named items in the pack. Sector-specific sign-off questions go to the reviewer-question list.

## Pack stops too late

Symptom: the skill produces and "files" the pack with the secretary, marks it as distributed, asserts CRO sign-off without evidence.

Why it happens: builder over-runs the human-review gate.

Fix: the pack is a draft until the CRO and the head of risk reporting review. The skill stops at the draft and surfaces the reviewer questions for the secretary; it does not assert sign-off, distribute, or post to the committee folder.
