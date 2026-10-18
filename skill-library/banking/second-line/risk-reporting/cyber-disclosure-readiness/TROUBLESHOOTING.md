# Troubleshooting: cyber-disclosure-readiness

Recurring failure modes when a cyber-disclosure-readiness pack looks complete but is not. The reviewer pass should catch these; the builder pass should preempt them.

## Disclosure clock conflated with detection

Symptom: `disclosure_clock_start` populated with the detection date; `disclosure_filing_due` computed as 4 business days from detection.

Why it happens: detection feels like the natural starting event; the rule's "from materiality determination" language is easy to read past.

Fix: the 4-business-day clock starts at materiality determination, not detection. The schema's `disclosure_clock_start` equals `materiality_determination_date`; `disclosure_filing_due` computes from that. Detection-to-determination gap is a process metric (recorded in the DCP trace) and supports "without unreasonable delay" evidence; it is not the clock.

## Materiality call treated as the cyber team's call

Symptom: workpaper's `materiality_determined_by_role` = "CISO" or "head of cyber risk".

Why it happens: cyber has the facts; "the cyber team made the call" feels natural.

Fix: materiality is a disclosure determination made by the disclosure committee with securities counsel input under the firm's DCP. The cyber team contributes facts and quantitative inputs; they do not own the determination. The standard composition is "disclosure committee chair, with securities counsel input"; the workpaper records this.

## Item 1.05 disclosure draft over-discloses

Symptom: the draft includes forensic detail (specific systems named, IOCs, threat-actor identification, remediation specifics, vendor names). The draft reads like an incident-response status report rather than an investor disclosure.

Why it happens: the cyber team contributed the facts and the draft inherits the operational level of detail; the four-element structure is followed loosely or not at all.

Fix: Item 1.05 calls for nature, scope, timing, and material impact (or reasonably likely material impact). The draft holds to those four elements. Forensic detail, IOCs, named threat actors, remediation specifics, system-name detail belong in the incident-response file and not in the 8-K. Reg FD considerations and ongoing-investigation prejudice argue against them. The "to the extent known" framing handles incomplete scope determination.

## Aggregation analysis missing or empty without documentation

Symptom: `aggregation_with_prior_incidents` is an empty array; `materiality_aggregation_analysis` is null.

Why it happens: empty array reads as "nothing to aggregate"; the analysis is treated as redundant.

Fix: empty-array aggregation is a stated determination, not an absence. Document the analysis: prior incidents in the period reviewed; reasoning that they do not aggregate (different threat actor, different attack vector, different system, distinct in time); empty-array conclusion is documented under Item 1.05 Instruction 1. The analysis is what a future enforcement question or audit pull tests.

## SEC clock treated as the only clock

Symptom: parallel-clocks table contains one row (SEC 8-K Item 1.05). Federal banking agency 36-hour, NYDFS 72-hour, Reg S-P 30-day, state breach-notification, FINRA Rule 4530, HIPAA, counterparty contractual rows are absent.

Why it happens: the work is anchored to the SEC rule; other regulators feel "out of scope" for the disclosure pack.

Fix: the parallel-clocks table is multi-regulator by design. Surface every clock applicable to the registrant. For a typical bank-holding-company registrant with subsidiaries spanning bank, broker-dealer, and investment-adviser activities, the count of regulator clocks running on a single incident is high. Missing one is a frequent regulator finding.

## Reg S-P treated as substitute for Item 1.05 (or vice versa)

Symptom: Reg S-P customer notice and 8-K Item 1.05 filing treated as two ways of saying the same thing.

Why it happens: both involve cyber and customer information; the distinction collapses.

Fix: the two notifications run on different audiences (investors versus affected individuals), different timing (4 business days from materiality determination versus 30 days from awareness of unauthorized access), and different content rules (four required elements versus the Reg S-P content elements). One does not satisfy the other; they are independent obligations.

## Item 106 rolled forward unchanged

Symptom: `year_over_year_diff` is empty or all rationales = "no change". The disclosure is identical (or near-identical) to the prior year's.

Why it happens: Item 106 disclosure is annual and stable in its bones; refreshing it feels like make-work in the absence of changes.

Fix: year-over-year diff and rationale are required. Underlying facts (board cadence, management positions, third-party engagements, material effects) change. Even where no substantive change exists, "no substantive change, refreshed for currency" is a documented rationale, not a default. Rolled-forward-unchanged Item 106 is a frequent finding.

## Item 106(c) board-oversight or management-role disclosure reads as boilerplate

Symptom: 106(c)(1) names "the appropriate management committee" or "an experienced senior management team"; 106(c)(2) names "the firm's cybersecurity organization" without specifics.

Why it happens: prior-year text was boilerplate, the refresh inherits the boilerplate, the substantive specifics are siloed elsewhere.

Fix: 106(c)(1) names the specific board committee (Risk Committee, Audit Committee, Cybersecurity Committee), the cadence (e.g., "quarterly Risk Committee briefings, annual full-board deep-dive"), and the processes by which the board or committee is informed. 106(c)(2) names the positions (CISO, CIO, CRO), the named expertise (credentials, prior experience, reporting line), and the management committees (e.g., Cybersecurity Steering Committee chaired by CISO). Specifics matter; reviewers flag boilerplate.

## SEC Climate Disclosure Rule asserted as currently effective

Symptom: a climate-cross-cutting overlay claim asserts the SEC Climate Disclosure Rule is in force; references to current-effective status are unqualified.

Why it happens: the rule was finalized March 2024 and the headline regulatory change is memorable; the legal challenges and the SEC's voluntary stay are not.

Fix: never assert current effectiveness of the SEC Climate Disclosure Rule without checking SEC posture as of the report date. Default posture: cite the rule with `[verify current effectiveness]` and lean on TCFD or CSRD or state-required disclosure for substantive content. The cross-cutting climate overlay carries the verification discipline; SKILL.md and the source-anchors file flag the rule with the verification posture.

## DCP trace incomplete

Symptom: DCP trace records detection and filing only; the intermediate stages (triage, escalation to second line, escalation to GC, escalation to disclosure committee, materiality call, disclosure decision) are absent.

Why it happens: the intermediate stages are operational and feel less load-bearing than the bookend events.

Fix: the DCP trace is the evidence that DCP under Rule 13a-15 functioned for cyber. Each stage carries the actor role, the timestamp, and a documentation pointer. Missing intermediate stages is what an SEC enforcement question, an examination engagement, or a future MWA-equivalent finding flags.

## Foreign private issuer treated as domestic 8-K filer

Symptom: an FPI registrant's pack uses the 8-K Item 1.05 spine; references to Form 6-K and Form 20-F Item 16K are missing.

Why it happens: the scope did not flag FPI status, or the practitioner is operating off a domestic-issuer template.

Fix: FPIs are not subject to Form 8-K and therefore not subject to Item 1.05 directly. FPIs furnish on Form 6-K. Form 20-F Item 16K parallels Item 106 for FPI annual disclosure. The pack adapts to FPI mode when the filer category is named in the scope or in the cover.

## Voluntary Item 1.05 filing for non-material incident

Symptom: `materiality_determination` = "not-material" but the disclosure is filed under Item 1.05 anyway, often with reduced safe-harbor language.

Why it happens: the firm wants to surface the incident publicly and Item 1.05 feels like the natural venue.

Fix: voluntary Item 1.05 filings receive reduced safe-harbor treatment per SEC staff C&DIs; voluntary disclosures should be filed under Item 8.01 (Other Events) with a narrative that does not invoke Item 1.05's materiality assertion. Artifact A's `materiality_determination` value of "not-material" prevents an Item 1.05 disclosure draft from emitting.

## "Reasonably likely material impact" treated as speculative

Symptom: the disclosure draft excludes any forward-looking impact analysis on the rationale that current realized impact is below threshold.

Why it happens: "reasonably likely" reads as conjectural; the safer posture feels like sticking to realized.

Fix: the "or reasonably likely to materially affect" language has substance. Material impact reasonably foreseeable as of the determination date, even if not yet realized, is required disclosure. The workpaper's `materiality_basis_quantitative.financial_impact_reasonably_foreseeable` field captures the analysis; the disclosure draft surfaces it under the material-impact element.

## Confidence label = "high" with non-empty verification-flag list

Symptom: the schema's `confidence_label` = "high" while the `verification_flags_carried_forward` array contains multiple unresolved items.

Why it happens: confidence is treated as an aspirational marker, not as a structured claim.

Fix: high confidence is incompatible with a non-empty verification-flag list. The label is medium at best where flags are present; the schema does not enforce this directly but the reviewer pass does. The verification-flag list is the visible record of what is unresolved.

## Pack stops too late

Symptom: the skill produces and asserts disclosure committee sign-off, files the 8-K, posts to the SEC reporting workflow.

Why it happens: builder over-runs the human-review gate.

Fix: the pack is a draft until the disclosure committee, securities counsel, and the named officers attest. The skill stops at the draft and surfaces the reviewer questions for the disclosure committee; it does not assert sign-off, file, or distribute.
