---
name: kri-commentary
description: |
  Drafts second-line commentary on KRI / KCI movement and breaches for a periodic risk report. Each per-KRI block carries trend, breach status against the firm's risk appetite statement, named root cause and contributing factors, action taken and action planned with role-level owners and dates, residual-risk view, linked issues and material events, and an explicit second-line challenge note where the second-line view diverges from first-line. Output is a per-KRI commentary block ready to drop into the risk committee pack, the divisional risk pack, the regulator response, or the board memo after qualified review.

  Best for:
  - Standing commentary block for each KRI / KCI flagged AMBER or RED in the period, with named root cause and remediation status.
  - Refreshing commentary on a watch-list KRI that has been at trigger or limit for multiple consecutive periods.
  - Rewriting first-line draft commentary to second-line standard (challenge, source-anchored, owner-named, evidence-pointed).
  - Producing the commentary appendix for a regulator response or a board memo when a specific KRI is the subject of supervisory interest.
  - KRI commentary across credit, market, liquidity, operational, compliance, financial-crime, model, third-party, cyber, climate, and conduct populations.

  Not the right tool when:
  - The artifact is the full committee pack (use `risk-committee-pack`; this skill produces the per-KRI blocks consumed there).
  - The artifact is a one-off issue write-up where the KRI breach is the symptom (use `risk-compliance-core/skills/issue-writeup` for the issue; use this skill for the commentary on the KRI itself).
  - The artifact is the data-quality root cause for the KRI (use `bcbs239-gap-assessment` if the breach is driven by upstream data lineage).
  - The work is defining the KRI itself (KRI design and threshold setting is risk-appetite work, out of scope here).
argument-hint: "[KRI feed pointer, threshold structure, prior-period commentary, RAS metric IDs, issue log pointer, material-event log pointer, or scope statement]"
---

# KRI commentary

Each block tells the committee, the regulator, or the board what the metric movement means. The metric is the symptom; the block names the cause, the contributing factors, the action already taken, the action planned with named role-level owners and dates, the expected residual posture next period, and (where the second-line view differs from first-line) the explicit challenge. The block stops at draft.

This is a second-line artifact. The voice is challenge, not first-line restatement. A block that reads as a first-line summary fails the test even if every fact is correct.

## Ask first

Most of the spine is set by the upstream feed and the scope. A few things settle before drafting:

- Who consumes the block. The standard consumer is the risk committee pack, but the same block may flow into a regulator response, a board memo, or a CISO report. The audience drives tone and depth.
- What the breach age is. A first-period AMBER and a fourth-period RED ask for different commentary. Multi-period breaches need a named root cause; "investigation ongoing" is not credible after period one.
- Whether the firm taxonomy is in use. If the firm has a risk taxonomy, the block's `risk_subtype` aligns to it; if not, the schema enum carries the block and the firm-overlay file does the mapping later.
- Whether the first-line draft is on file. Where it is, the second-line view is rewriting and challenging, not drafting from scratch; the explicit `second_line_challenge_note` carries the divergence.
- What the source posture is. A block written under public-only posture (no firm system access) is bounded by what the engagement can evidence; defaulting to public posture and flagging the gap is preferable to fabricating internal evidence.

When the scope record is supplied, the skill reads `institution.type`, `institution.primary_regulators`, `persona.role`, `risk_lens`, `sector_overlay_set`, `cross_cutting_overlay_set`, and `source_posture`. Otherwise the skill works with what the practitioner names and flags the rest.

## How the block gets built

The block has the same shape across risk types and across firms. The order below follows how a senior risk reporting lead walks it.

Start with the header table. Risk type, subtype, period, threshold structure, prior and current value, direction, current and prior RAG status, breach status, breach age in periods, linked RAS metric, owner role. The header is the metric in structured form; it carries no commentary.

Then the named root cause. The named root cause is the load-bearing field. For status RED and for AMBER where breach age exceeds one period, the schema requires it. The named root cause is a paragraph that names the discrete drivers of the movement, with evidence pointers; it is not a restatement of the metric, not a generic phrase ("elevated activity in the segment"), and not a deferral ("investigation ongoing"). If the root cause is genuinely unknown after multiple periods, the block names the owner and target date for when the root cause will land, and the second-line challenge note carries the issue.

Contributing factors come next. The schema enumerates the recognized factor types: data-quality, control-failure, external-driver, capacity, vendor, model-driver, other. Each factor named in the block carries a sentence of evidence; "control-failure (digital-channel step-up authentication did not trigger for two of the account-takeover sub-events; documented in the post-event review)" is a factor; "control-failure" alone is a tag.

Action taken in period. Each action item carries a description, a role-level owner, an ISO completion date, and an evidence pointer. Owners are roles, not named individuals; the engagement may know the named individual but the artifact does not carry it (named individuals belong in firm-internal artifacts, not in commentary that reads upward, with the regulator, or with the auditor). Action items missing owner or date are rejected by the schema.

Action planned. Same structure as action taken, with target date instead of completion date, and an optional dependency-IDs array. Action items planned without owner or target date are rejected by the schema.

Residual-risk view. Expected RAG next period plus a rationale. The expected RAG ties to the action plan and the external-driver outlook; "expected GREEN next period" on a multi-period breach where the action plan has not yet completed is rejected by the schema. Residual-risk views are conservative on intent until the action plan is evidenced.

Linked items. Issue IDs and material-event IDs are foreign keys; the block does not restate issue text or material-event narrative.

Second-line challenge note. Present where the second-line view diverges from first-line; named, evidence-pointed. If the second-line view aligns with the first-line view, the block states that explicitly with a documented rationale (alignment is not the absence of a note).

Threshold recalibration request. Present only where the first-line or the risk-appetite owner is requesting a recalibration in response to the movement. Carries proposed change, rationale, and approver role. The block does not adjudicate the recalibration; it routes it. Recalibration in response to a breach is sometimes legitimate (the metric or population has changed) and sometimes masking; the committee, not the commentary, makes the call.

Data confidence note. Required for KRIs that rely on vendor or third-party data of variable quality (climate, third-party telemetry, vendor-supplied scenario data); optional otherwise. The note names the data-lineage maturity caveat and the implications for the metric's reliability.

Source trace. Every material claim mapped to its source (system, document, evidence pointer) with a confidence label. Unsupported claims carry `[evidence needed]` and route to the engagement issue log, not silently into the block.

Confidence label per block. Constrained by the source posture, the data-lineage status, and any non-comparability flag. A high label requires the metric to sit outside the BCBS-239-equivalent known-limitations list and the source trace to carry no `[evidence needed]` entries.

Aggregate work. Across all blocks for the period, the wrapper carries aggregate red/amber/breach counts, cross-KRI correlations (where multiple KRIs share a root cause, surface the correlation once and reference the ID from each block rather than restate), the aggregate confidence label, and reviewer questions for the secretary and the chair to surface in the meeting.

## Engagement scope integration

When the `scope` record is supplied:

- `institution.type` and `institution.primary_regulators` set tone, citation focus, and which sector overlay loads.
- `persona.role` sets the artifact audience and the named sign-off owner.
- `risk_lens` constrains which KRI populations are in scope for the wrapper.
- `sector_overlay_set` loads the matching `references/sector-overlays/<sector>.md`.
- `cross_cutting_overlay_set` loads matching `references/cross-cutting/<topic>.md`. The cyber overlay carries the disclosure-controls leading-indicator referral protocol; the climate overlay upgrades the data-confidence note from optional to required.
- `source_posture` constrains the source-trace discipline and the achievable confidence label.

When the record is not supplied, the skill asks: what is the firm type, who is the primary regulator constellation, what is the persona consuming the block, and what is the source posture. Defaults to public posture if the practitioner declines, and the wrapper carries a note that scope was not formalized.

## Quality bar

- Every material claim cites a source. Unsupported items carry `[evidence needed]` and route to the issue log.
- Named root cause is required for RED and for AMBER where breach age exceeds one period. "Investigation ongoing" is not credible after period one.
- Owners are roles, not named individuals.
- Action items carry role-level owner and ISO date.
- Residual-risk view is grounded in the action plan and the external-driver outlook; expected GREEN on a multi-period breach with an incomplete action plan fails the schema.
- The block stops at draft. The second-line lead and the head of risk reporting review before the block flows into the committee pack or any other consumer.
- Confidence label "high" is not available where the metric is on the firm's data-aggregation known-limitations list.

## Adaptation

Audience drives tone. Depth flexes with the audience and the risk type (a RED operational-loss block carries deeper material than an AMBER cyber-awareness block). Sector and cross-cutting overlays load from the scope. Where firm-specific RAS structure, taxonomy, or escalation machinery applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the block directly.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; KRI commentary blocks typically slot into the parent committee deck as PowerPoint, with longer-form RED commentary as Word memos. Produce the structured record at `schemas/kri-commentary.schema.json` when downstream automation or a registered consumer needs it. The reviewer attestation (second-line lead and head of risk reporting) is filled before the wrapper flows downstream.

Downstream consumers: the structured wrapper feeds `risk-committee-pack` (the KRI section). The same blocks may feed a regulator response file, a board memo on a specific KRI, or (where the cyber overlay loads) the firm's annual CISO report. The schema is the cross-skill contract; additive changes only, never silent renames. Breaking changes ship as a versioned migration with the consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets,payments-fintech}.md` — sector overlays loaded from scope.
- `references/cross-cutting/{cyber,climate}.md` — cross-cutting overlays loaded from scope.
- `references/firm-overlay.md` — firm-installed RAS structure, taxonomy, named owners, escalation machinery (consumed when present).
- `templates/default-output.md` — per-KRI block template with the named sections and the wrapper.
- `schemas/kri-commentary.schema.json` — structured-output contract.
- `examples/` — anonymised public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in commentary blocks.
