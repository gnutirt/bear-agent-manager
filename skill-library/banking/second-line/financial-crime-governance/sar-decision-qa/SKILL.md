---
name: sar-decision-qa
description: |
  Quality-reviews a SAR or no-SAR decision file against named SAR rules and the FFIEC SAR examination expectations. Reads the alert chronology, investigation steps, evidence considered, disposition, decision rationale, continuing-activity posture, and confidentiality controls; produces a QA memo with material gaps, reviewer findings, and a routing recommendation to the named decision forum. Does not file, decline to file, amend, or close any SAR; SAR filing is a regulated act reserved to the BSA officer or designee.

  Best for:
  - Second-line QA over a sample of closed alerts (filed and unfiled) within a defined lookback window.
  - Targeted review of high-risk alert types (structuring, trade-based, layering, sanctions-adjacent, fraud typology, cyber-event-related).
  - Review of continuing-activity posture against the firm's documented SAR program (the 90-day continuing-SAR cadence the industry uses is firm policy, not a BSA-rule requirement; the QA reads adherence to the program the firm has, not a uniform external standard).
  - Pre-exam readiness review of SAR decision documentation against the FFIEC SAR section.

  Not the right tool when:
  - The work is alert-generation governance (transaction-monitoring scenario tuning, segmentation, threshold changes); use aml-model-monitoring.
  - The work is the underlying CDD or EDD posture of the customer rather than the alert decision; use cdd-risk-review or edd-escalation-pack.
  - The work is a single adverse-media triage rather than a SAR decision; use negative-news-triage.
  - The decision being asked for is whether to file, amend, or supplement a SAR. The skill produces QA artifacts; the BSA officer decides.
argument-hint: "[alert ID or sample, decision file, investigation case file, supporting evidence, or pointer to SAR program scope]"
---

# SAR decision QA

A SAR decision QA memo is what second-line produces so the BSA officer, the SAR review committee, the AML director, and the QA team can see whether a closed alert (filed or unfiled) was decided on the right evidence, against the right typology, with the documentation an examiner expects to find. The work is reading the alert file against the FFIEC SAR manual and the operative SAR rule for the institution, separating what was inspected from what was claimed, naming the gaps, and recommending where the file goes next: no further action, re-open, escalate to the SAR review committee, training feedback, or a process change. The skill stops at the recommendation.

The reviewer does not file, decline to file, amend, supplement, or close any SAR through this skill. SAR filing is a regulated act under 31 USC 5318(g) and the operative SAR rule. The skill produces QA findings that route to the BSA officer or the SAR review committee, who decide.

This skill produces the memo as a markdown artifact (`templates/default-output.md` shape) and a structured record (`schemas/sar-decision-qa.schema.json`) that downstream skills and reporting can consume.

## Ask first

Before drafting, get plain answers to a few things. Most reviews answer them quickly; if not, default and flag.

- **What is the institution and which SAR rule applies.** A bank is read against 31 CFR 1020.320, a broker-dealer against 1023.320, a mutual fund against 1024.320, an insurance company against 1025.320 (covered products only), an FCM/IB against 1026.320, an MSB against 1022.320 (with the lower $2,000 threshold). A fintech operating under a sponsor-bank model has a delineation question that must be answered before the QA names a filing-window expectation. Load the matching `references/sector-overlays/<sector>.md` and read the rule from there.
- **What kind of QA review is this.** Sample-based program QA over a lookback window, targeted typology review, continuing-activity cadence review, or pre-exam readiness pass. The review type drives sample selection, depth, and how findings are framed for the audience (QA team, BSA officer, AML director, audit, examiner response).
- **Who reads the memo.** A BSA officer reads for material defensibility issues and program-level patterns. A QA team reads for criterion-by-criterion calibration. An AML director reads for governance signal and committee escalation. An examiner-response file reads formal and full source-traced. Audience drives tone and depth.
- **What is in the file the QA reads.** The alert record (system or referral), the case investigation file, the disposition record, the SAR if filed, the continuing-activity log if applicable, and the evidence pointers. If the file is incomplete, that is itself a finding. Draft against what is there and flag the missing parts in `material_gaps`; do not block.

When the scope record is supplied, the skill consumes it for institution type, primary regulator, sector overlay, persona, and source posture. Otherwise it asks the practitioner the few facts it needs, and source posture sets what the memo can assert at high confidence and what carries `[evidence needed]`.

## How the QA memo gets built

The memo has the same spine across alert types. A senior QA reviewer fills it in roughly in the order the file presents the alert, not in a lockstep sequence. Two parts of the order are load-bearing and explicitly sequenced:

1. **Confirm the SAR rule and the operative filing-window posture before reading the file.** A 30/60-day-window read is wrong if the institution is an MSB; a covered-product read is wrong if the insurance product was term life. Load the sector overlay first; do not retrofit the rule to the file.
2. **Read the disposition before reading the rationale.** A filed SAR and a closed-no-file decision are read against different defensibility criteria. The continuing-activity posture only attaches when the disposition is a filed SAR, a prior-period SAR is on file, or the decision is closed-with-continuing-review.

Beyond those two anchors the work is judgement-led, not gauntlet-shaped. The senior QA reviewer walks the file in this shape:

The **alert summary** captures the alert ID, the alert source (transaction-monitoring scenario, internal referral, external referral including 314(b) inbound, manual detection, negative news, sanctions-adjacent), the scenario name and rule version where applicable, the alert-generation date, the alert type, and the monetary footprint (aggregate amount, currency, time window, transaction count). For non-system alerts, the source detail names the referrer's role and the referral basis. Where the alert source is a model (transaction-monitoring scenario or sanctions-screening tool), note whether `aml-model-monitoring` coverage is current; do not redo monitoring work here.

The **customer and account context** captures the CDD posture (risk rating at the time of the alert, last refresh date, EDD trajectory if any), the prior-SAR history at customer and related-party level (count, dates, typologies), and the related-parties scope the investigator searched. The CDD posture is read, not re-set; cross-reference to `cdd-risk-review` or `edd-escalation-pack` outputs where they exist.

The **investigation steps performed** are read as a dated, attributed timeline. Each step names the date, the performer's role, the action taken, and the evidence pointer. A free-text paragraph with no dates and no roles cannot be QA'd against the timeline; that is a finding, not an opinion.

The **evidence considered** is read for completeness against the alert and the typology. System-of-record extracts (account, transactions, KYC), public-information searches (sanctions, adverse media, court records), internal escalations (fraud unit, EDD team, law-enforcement liaison), prior-SAR linkage, and any 314(b) inbound or outbound. Vendor RFP narrative is not evidence. Marketing pages on a counterparty are not evidence. The QA cites by file path into the case file; it does not restate the contents.

The **disposition** is one of: SAR filed, not filed and closed, closed with continuing review, or escalated and pending. The filing-window posture is read against the operative SAR rule loaded from the sector overlay. The QA notes whether the file evidences the trigger for the window (initial detection of facts that may constitute a basis for filing) and whether the window was met.

The **decision rationale** is where the QA earns its keep. On a filed SAR, the rationale is read for typology citation (a named typology, not a generic narrative), for FinCEN-advisory linkage where one applies (cited apt advisory with date, not a stale or off-typology citation as window-dressing), for narrative coherence (the structured fields and the narrative tell the same story), and for evidence-anchored reasoning (each material claim points to evidence in the file). On a no-file disposition, the QA reads against the firm's own SAR program: BSA regulations do not require documentation of no-SAR decisions, but most institutions' programs do, and the 2025 SAR FAQ posture confirms that the documentation expectation is firm-program rather than rule-driven. The QA reads no-file documentation against what the program requires, not against an inferred external standard. Where the firm's program calls for resolution of typology indicators, "investigator judgement" on its own is not a defensible rationale under the program; that is the framing.

The **confidentiality posture** is read at the case level, not the program level. The 31 USC 5318(g) tipping-off prohibition and the institution's no-notification controls are anchored at the program level, but the case-specific tipping-off assessment is what the QA reads here, especially for fraud-recovery, EDD-overlap, dispute-resolution, and law-enforcement-liaison cases. Internal access controls on the case file (who could see the SAR or its existence) are read for adherence to the institution's documented permissioning. A program-level tickbox does not satisfy the case-specific assessment.

The **continuing-activity posture** is read where the disposition is a filed SAR or a closed-with-continuing-review decision. The 90-day continuing-SAR cadence the industry has long used is firm-policy convention reinforced over time by FinCEN guidance, not a BSA-rule requirement. The 2025 SAR FAQ posture clarified that separate post-SAR continuing reviews are not independently required by the SAR rule. The QA reads continuing-activity work against the firm's documented program: was the review performed on the cadence the program states, was the outcome documented regardless of whether further activity surfaced, and was the decision aligned to the program's typology lens. The "no continuing activity" review that is policy-required but not documented is a program-adherence finding, not a BSA-rule finding. Prior-SAR linkage is named.

The **QA reviewer findings** are tagged to the criterion violated (FFIEC SAR section, the operative SAR rule, the FinCEN form, an applicable advisory, the institution's SAR program), the severity (material defensibility issue, documentation gap, training observation, process change candidate), and the evidence pointer in the case file. The criterion is named, not implied.

The **material gaps** are listed with the criterion they map to and a clear "what was not in the file" statement. Each gap is `[evidence needed]` until resolved; resolution is by the BSA officer or the SAR review committee, not the QA reviewer.

The **recommendation** is one of: no further action, re-open the investigation, escalate to the SAR review committee, training feedback to the investigator group, or a process-change recommendation. A recommendation to file, amend, supplement, or decline a SAR is not within scope of this skill; the QA frames the issue as an escalation to the SAR review committee or the BSA officer, who decide. A recommendation that proposes the filing decision itself is the failure mode this guardrail prevents.

The **source trace and confidence** records every material claim in the memo, its source (case file pointer, sector-overlay reference, source-anchor file), and a confidence label. Vendor or counterparty self-attestation in the case file carries lower confidence than system-of-record extracts; do not collapse them.

Depth flexes with review type and audience. A pre-exam readiness pass reads long and formal; a sample-based program QA reads tighter with patterns rolled up across files; a targeted typology review goes deep on the typology citations and the evidence chain.

## Sector and cross-cutting overlays

The sector overlay set is loaded from the scope or the institution type and drives the SAR-rule read. Banking, payments-fintech (with the sponsor-bank delineation), capital markets (broker-dealer, mutual fund, FCM/IB), and insurance (covered products) each carry the relevant CFR section and the typology emphases that examiners weigh in that sector. Load only the overlays the engagement implicates; gold-plating across sectors adds noise.

The cyber cross-cutting overlay loads when the alert is cyber-event-related (account-takeover, business-email compromise, ransomware-adjacent, convertible-virtual-currency typology with cyber indicators). It carries the FinCEN cyber and ransomware advisory references and the structured-field expectations on the SAR for cyber-event indicators. Load it explicitly when the alert is cyber-related; do not pull it in by default.

## Quality bar

The memo is only credible when these hold:

- The skill produces QA artifacts, not SAR-filing decisions. SAR filing, declining to file, amending, supplementing, and closing are reserved to the BSA officer or the SAR review committee. Any reviewer recommendation that proposes the filing decision is itself a finding to remove.
- Every material claim cites a source from the case file, the sector overlay, or `references/source-anchors.md`. Unsupported items carry `[evidence needed]` and route to the engagement issue log.
- Source evidence, management assertion, public-source obligation, generated inference, and open legal or compliance question stay distinguishable in the memo. Vendor or counterparty self-attestation is not the same line as system-of-record extract.
- No fabricated regulatory facts. Unknown section references carry `[verify section]` in the source-anchors file, never in the memo body.
- No named institutions in narrative unless they are public defendants in a finalised enforcement action with a published consent order.
- Confidentiality and tipping-off are case-specific reads, not program-level checkboxes, particularly in fraud-recovery, EDD-overlap, dispute, and law-enforcement-liaison cases.

## Adaptation

Sample size, lookback window, sector overlay, audience, depth, and the structure of the rolled-up findings flex to the engagement. Where firm-specific policy (sample-selection method, the SAR review committee's standing agenda, the institution's typology library, named system-of-record paths, named owners) applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the memo directly.

## Output

Two artifacts: the QA memo per `templates/default-output.md`, and the structured record per `schemas/sar-decision-qa.schema.json`. The BSA officer, the SAR review committee, the QA team lead, or the AML director reviews and decides; the memo is the input, not the decision.

Downstream consumers: a sample-level QA roll-up reads the structured record across files for pattern detection, recurring-finding rates, and training-feedback themes. The board / audit-committee BSA reporting cycle pulls aggregated findings as a governance signal. `aml-model-monitoring` consumes any finding tagged to alert-source quality (which is its scope, not this skill's). The schema is the input contract for those consumers; additive changes only, never silent renames. Breaking changes ship as a versioned migration with consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (FFIEC SAR section, 31 CFR SAR rules, 31 USC 5318(g), FinCEN form and instructions, applicable advisories, joint statements).
- `references/sector-overlays/banking.md`, `payments-fintech.md`, `capital-markets.md`, `insurance.md` — sector-specific SAR rule reads loaded per scope.
- `references/cross-cutting/cyber.md` — cyber-event SAR considerations loaded when the alert is cyber-related.
- `references/firm-overlay.md` — firm policy, typology library, named systems, owners, and review machinery (consumed when present).
- `templates/default-output.md` — single-decision memo template.
- `templates/sample-roll-up.md` — sample-based program QA roll-up template (executive summary, scope, per-case findings table, themes, recommendations, source trace, decision forum) for the sample-based review type.
- `schemas/sar-decision-qa.schema.json` — structured-output contract.
- `examples/structuring-pattern-bank.md`, `crypto-payments-fintech.md` — public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in SAR decision files and in QA memos written against them.

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/review-gates.md`) sit at the plugin root and are consulted alongside the skill-level files.
