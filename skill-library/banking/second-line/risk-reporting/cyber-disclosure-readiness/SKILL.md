---
name: cyber-disclosure-readiness
description: |
  Drafts the second-line readiness pack for SEC cybersecurity disclosure: 8-K Item 1.05 trigger and materiality workpaper for a live or suspected material incident, the 10-K Item 106 risk-management and governance disclosure for the annual filing cycle, and the disclosure controls and procedures (DCP) readiness map. The pack is what a disclosure committee, securities counsel, the CISO, and the CRO take into the materiality call and into the filing decision.

  Best for:
  - A material cybersecurity incident has occurred (or is suspected) and the disclosure committee needs the materiality determination, the 4-business-day clock posture, the parallel-regulator clocks, and the Item 1.05 disclosure draft pulled together.
  - The 10-K Item 106 cyber risk-management and governance disclosure is being refreshed for the upcoming filing cycle and second line is challenging the prior-year text.
  - The firm is standing up or refreshing its cyber disclosure controls and procedures under Exchange Act Rule 13a-15 and needs the second-line readiness view of the trigger flow.
  - A disclosure-machinery question that overlaps cyber and climate lands at the disclosure committee (the same DCP and the same 8-K mechanic handle both).

  Not the right tool when:
  - The artifact is the enterprise risk committee pack (use `risk-committee-pack`; cyber appears there as an overlay and pulls a brief from this skill).
  - The artifact is an internal incident response runbook or a forensic timeline (out of scope; this skill is the disclosure decision, not incident handling).
  - The artifact is a vendor cyber due-diligence pack (use `third-party-operational-resilience/skills/vendor-diligence`).
  - The trigger is a non-public regulator-only notification (NYDFS Part 500 §500.17, federal banking agencies' 36-hour rule, state breach-notification). Those clocks surface in the parallel-clocks table here, but the regulator-specific notification artifact lives elsewhere.
argument-hint: "[incident reference, prior-year 10-K Item 106, DCP map, scope, or scope statement]"
---

# Cyber disclosure readiness

The pack is what the disclosure committee reaches for when an incident lands on the materiality call agenda or when the 10-K Item 106 disclosure is up for refresh. Three artifacts share the source spine and can run independently: an 8-K Item 1.05 trigger and disclosure-decision pack for an incident-driven workflow; a 10-K Item 106 disclosure pack for the annual filing cycle; and a disclosure controls and procedures (DCP) readiness map for the framework. Most engagements run one of the three at a time. Audience is the head of disclosure, the GC office, the CISO, the CFO, the CRO, and securities counsel as the named reviewer.

This is a disclosure artifact, not an incident-response artifact. The vocabulary is materiality, four-business-day clock from determination, four required disclosure elements (nature, scope, timing, material impact or reasonably likely material impact), aggregation of related occurrences, delay provision, parallel notification clocks, governance and risk-management narrative. Forensic detail, IOCs, and remediation specifics belong to the incident response file; they appear here only where the four required elements demand them.

The pack is a draft until the disclosure committee, securities counsel, and the named officers attest. The skill stops at the draft.

## Ask first

Most of the spine is set by the trigger and the source posture. A few things settle before drafting:

- **Which artifact is the work**. An 8-K Item 1.05 incident pack runs on a clock and is materiality-loaded. A 10-K Item 106 refresh runs on the annual cycle and is governance-loaded. A DCP readiness map is framework-level and is process-loaded. The same skill produces all three but they ship independently; the first ask sets which one (or which combination) the engagement needs and which sit out.
- **Where the firm sits on filer category**. Domestic large accelerated filer, accelerated filer, smaller reporting company, foreign private issuer (Form 6-K, not 8-K). The Item 1.05 phase-in differed for SRCs (June 15, 2024 effective rather than December 18, 2023) and FPI treatment is structurally different. The pack adapts to the category named in the scope.
- **For an Item 1.05 pack: where the firm is on the materiality call**. Pre-determination, pending, just-determined, determined-and-clocked. The pack content shifts; pre-determination work is workpaper-heavy and disclosure-light, post-determination work is the inverse. The 4-business-day clock starts at the materiality determination, not at detection; the skill rejects any draft that conflates these.
- **What parallel clocks apply to the registrant**. Federal banking agencies' 36-hour rule (covered banking organizations under 12 CFR 53/225/304); NYDFS 72-hour notice under 23 NYCRR Part 500 §500.17 if NYDFS-licensed; state breach-notification clocks where customer information is implicated; SEC Reg S-P 30-day customer notice for in-scope BDs, IAs, transfer agents, and registered funds; HIPAA Breach Notification Rule for in-scope entities; counterparty contractual notification. Surface every clock applicable to the registrant; missing one is a frequent regulator finding.
- **What the disclosure committee owns versus what counsel owns**. Materiality is a disclosure determination made by the disclosure committee with securities counsel input under the firm's DCP. The cyber team contributes facts and quantitative inputs; they do not own the determination. The pack carries the determination as a workpaper output, not as a CISO call.

When the scope record is supplied, the skill reads `institution.type`, `institution.primary_regulators`, `persona.role`, `sector_overlay_set`, `cross_cutting_overlay_set`, and `source_posture` from it and consumes them. Otherwise the skill works with what the practitioner names and notes the rest.

## How the pack gets built

The three artifacts share the same source spine but diverge in named sections and in pace. Order below is roughly how a senior disclosure-readiness lead walks each.

### Artifact A: 8-K Item 1.05 trigger and disclosure-decision pack

This is the clock-driven artifact. The materiality determination is the load-bearing event; everything else flows from it.

Start with the cover and the clock posture. Cover names the incident reference ID (firm-internal, never the SEC accession number), the date detected, the materiality determination date or "pending", and the filing-clock posture. The clock posture is the first thing securities counsel reads.

The incident timeline lays out detection, containment, scope-determination progress, materiality call, and disclosure decision in chronological order. The timeline distinguishes what is known from what is unknown; the unknowns drive the workpaper's reasonable-investor analysis and the disclosure draft's "to the extent known" framing.

The materiality determination workpaper is the centre of the pack. The structure: facts of the incident (what is known, what is unknown, what is reasonably knowable as of the determination date); reasonable-investor analysis under the TSC Industries / Basic standard; quantitative impact (financial, customer, operational; current and reasonably foreseeable); qualitative impact (reputational, regulatory, strategic, competitive); aggregation of related incidents under the Item 1.05 instruction on a series of related occurrences; determination (material / not material / pending) with determined-by (role) and determined-on (datetime). The aggregation row is frequently empty on a first pass; it is also frequently the row that flips a determination on a second pass. Surface aggregation analysis explicitly.

The Item 1.05 disclosure draft is structured into the four required elements (nature, scope, timing, material impact or reasonably likely material impact) and nothing else. Forensic detail, IOCs, named threat actors, remediation specifics, and any content that could prejudice ongoing investigation belong in the incident-response file, not in the 8-K. The "to the extent known" framing on scope and impact is required where determination is made before scope is fully understood; the rule contemplates this and the draft does not pretend to certainty the workpaper does not support.

Delay-provision analysis records whether a US Attorney General national-security or public-safety delay applies. Default posture: not invoked, with documentation of the analysis. If invoked, the AG notification process and the Justice Department guidance on the delay determination apply; the pack records the analysis and routes to counsel before any reliance.

The parallel-clocks table is the row securities counsel pulls on. Each clock carries regulator, basis (e.g., "36 hours from determination of notification incident"), due (ISO datetime), and status (not-started / in-progress / submitted / not-applicable). The SEC 4-business-day clock is one row among several; treating it as the only row is the failure mode for covered banking organizations and NYDFS-licensed entities.

The DCP trace shows how the incident moved through detection, triage, escalation, materiality call, disclosure decision, and filing. Each stage carries the actor role, the timestamp, and a documentation pointer. The trace is the evidence that the firm's disclosure controls and procedures functioned; it is what an SEC enforcement question or a future MWA / MWA-equivalent finding tests.

The sign-off block names the disclosure committee chair, securities counsel, the CISO or designee, the CFO, and the date. Reviewer questions for the meeting close the pack.

### Artifact B: 10-K Item 106 disclosure pack

This is the annual cycle artifact. The Item 106(b) risk-management-and-strategy disclosure and the Item 106(c) governance disclosure are separate elements; treating them as one block invites omission of either.

Item 106(b) draft hits each required element discretely: processes for assessing, identifying, and managing material risks from cybersecurity threats; whether and how those processes are integrated into the firm's overall risk management; engagement of assessors, consultants, auditors, or other third parties; processes to oversee and identify material risks from third-party service-provider use; whether risks from cybersecurity threats have materially affected, or are reasonably likely to materially affect, the firm's business strategy, results of operations, or financial condition. Each element is a discrete subsection in the draft; rolling them together is the failure mode.

Item 106(c) draft names the specific board committee with cyber oversight (Risk Committee, Audit Committee, or a dedicated Cybersecurity Committee depending on the firm), the cadence (quarterly to the committee, annual full-board deep-dive is a common pattern), and management's role: positions / committees responsible, the named expertise (CISO with credentials and reporting line, CIO, head of information security), and the reporting-to-board structure. Specific titles and qualifications matter; "the appropriate management committee" reads as boilerplate.

Material-effects narrative is the row that gets the closest read. The empty case ("no material effects in the period") is a stated determination, not an absence of language. The non-empty case names the incident or pattern, the affected period, and the reference to any prior 8-K Item 1.05 disclosure or material-effects discussion. Year-over-year diff and rationale are required; "rolled forward unchanged" Item 106 disclosure is a frequent finding.

Source trace per claim links each governance assertion to a board minute, charter section, risk-register entry, third-party assessor report, or policy reference. The source-trace block is the evidence the disclosure committee and the audit-committee secretary review before sign-off.

### Artifact C: DCP readiness map

This is the framework-level artifact. It is what an examiner asks for when the question is "how does an incident move from detection to disclosure decision" and what the disclosure committee uses when the DCP is up for refresh.

Trigger detection points name where in the firm an incident becomes visible (SOC, fraud function, customer service, vendor notification, regulator notification). Escalation paths trace first-line to second-line to disclosure committee, with named roles and time-bounded steps. The materiality-determination protocol names the decision-makers (disclosure committee with securities counsel input is the standard composition), the criteria framework, and the time-box (the rule's 4-business-day clock is a backstop, not the decision deadline; firms typically operate against a tighter internal time-box).

Required documentation per stage is the row that audit and counsel review for completeness. Gaps and remediation closes the artifact with severity, owner role, and target remediation date for each gap; the gaps row drives the second-line work plan.

### Climate

When the scope flags climate, the climate cross-cutting overlay (`references/cross-cutting/climate.md`) drives the additional content. The disclosure machinery is shared: the same DCP, the same disclosure committee, the same 8-K mechanic, and the same materiality lens handle climate-related material events and the 10-K climate disclosure. The overlay covers what the SEC Climate Disclosure Rule adds (Item 1500-series of Regulation S-K, financial-statement effects under Article 14 of Regulation S-X) without re-anchoring full climate sources.

Default posture on the SEC climate rule: never assert current effectiveness without checking the SEC's posture as of the report date. The rule was finalized March 2024, voluntarily stayed by the SEC pending Eighth Circuit consolidated litigation, and current status remains unsettled. Cite the rule with `[verify current effectiveness]` and lean on TCFD for substantive content where the climate overlay applies.

### Privacy

When customer financial information is implicated, the privacy cross-cutting overlay (`references/cross-cutting/privacy.md`) loads. Privacy notification clocks (GLBA Safeguards Rule, state breach-notification, SEC Reg S-P 30-day customer notice for in-scope entities, HIPAA Breach Notification Rule for in-scope entities) surface in the parallel-clocks table; depth lives in the privacy overlay. Treating privacy clocks as out-of-scope because the work is SEC-anchored is the failure mode.

### Sector overlays

Load only the overlay the scope names. Banking covered-bank packs carry the federal banking agencies' Computer-Security Incident Notification Rule (12 CFR 53/225/304) 36-hour clock alongside the SEC clock; the two clocks run on different bases (notification incident determination versus materiality determination) and resolving them in parallel is the senior reviewer's job. Insurance packs carry NAIC Insurance Data Security Model Law (#668) state-by-state adoption variation. Capital-markets packs carry SEC Reg S-P amendments (May 2024) and FINRA Rule 4530 reporting where applicable. Payments-fintech packs carry PCI DSS contractual notification and Reg E error-resolution clocks where customer transactions are affected.

The sector overlay is content that lands in the pack, not background reading. A banking overlay loaded but no 36-hour-rule row in the parallel-clocks table is the failure mode.

## Quality bar

- The 4-business-day Item 1.05 clock starts at materiality determination, not detection. The schema computes the filing-due datetime from `materiality_determination_date`; conflating the two fails the schema.
- Materiality is a disclosure committee determination with securities counsel input. The cyber team contributes facts; they do not own the determination. The workpaper records the determined-by role accordingly.
- The Item 1.05 disclosure draft carries the four required elements (nature, scope, timing, material impact or reasonably likely material impact) and stops there. Forensic detail and remediation specifics belong elsewhere.
- Aggregation of related occurrences under the Item 1.05 instruction is surfaced explicitly; an empty aggregation row is a stated determination, not an absence.
- Item 106(b) and Item 106(c) are discrete subsections; each required element of 106(b) is a discrete row.
- Year-over-year diff and rationale on Item 106 disclosure is required; rolled-forward-unchanged is a finding.
- Parallel clocks are surfaced for every regulator that applies to the registrant. The SEC clock is one row among several.
- The SEC Climate Disclosure Rule is cited with `[verify current effectiveness]`; no claim of current effectiveness is asserted without a source-posture check at draft time.
- Every material claim cites a source. Unsupported claims carry `[evidence needed]` and route to the engagement issue log, not silently into the pack.
- The pack is a draft until the disclosure committee, securities counsel, and the named officers attest. The skill does not assert sign-off, file, or distribute.

## Adaptation

Filer category drives the 8-K-versus-6-K spine and the SRC versus non-SRC phase-in. Audience drives tone (working-group draft is plain, disclosure-committee material is challenge-shaped, examiner response is formal). Sector and cross-cutting overlays load from the scope. Where firm-specific DCP, board-committee structure, or disclosure-policy machinery applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the pack directly.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the 8-K Item 1.05 draft and the 10-K Item 106 narrative ride as Word memos for securities counsel review, the parallel-clocks table lifts to Excel for incident-response coordination, and a board cyber-readiness read-out collapses to a deck. Produce structured records at the schemas below when downstream automation or a registered consumer needs them:

- Artifact A — 8-K Item 1.05 pack — `schemas/cyber-incident-disclosure.schema.json`.
- Artifact B — 10-K Item 106 pack — `schemas/item-106-disclosure.schema.json`.
- Artifact C — DCP readiness map — `schemas/dcp-readiness.schema.json`.

The engagement names which artifact (or artifacts) the practitioner is producing; the others sit out rather than padding the pack.

Downstream consumers: the structured objects feed the firm's disclosure-committee minutes system, the 10-K source-trace file, the regulator-response file when supervisors ask for the DCP map, and the `risk-committee-pack` cyber heat-map cell (which consumes the high-water-mark posture from Artifact A or the brief from Artifact C). The schema is the cross-skill contract; additive changes only, never silent renames.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets,payments-fintech}.md` — sector overlays loaded from scope.
- `references/cross-cutting/{cyber,climate,privacy}.md` — cross-cutting overlays. `cyber.md` is the core anchor set for this skill kept in references so SKILL.md remains a workflow rather than a regulatory primer; `climate.md` is required because the disclosure machinery overlaps; `privacy.md` loads when customer financial information is implicated.
- `references/firm-overlay.md` — firm-installed DCP, board-committee structure, disclosure policy, named officers (consumed when present).
- `templates/default-output.md` — pack template with the named sections for all three artifacts.
- `schemas/cyber-incident-disclosure.schema.json` — Artifact A structured-output contract.
- `schemas/item-106-disclosure.schema.json` — Artifact B structured-output contract.
- `schemas/dcp-readiness.schema.json` — Artifact C structured-output contract.
- `examples/` — anonymised public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects.
