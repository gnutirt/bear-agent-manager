# Troubleshooting: sar-decision-qa

Recurring pitfalls. Read before producing the QA artifact and again before sign-off.

## Scope discipline

### Drifting into the SAR-file decision

The QA produces findings, gaps, and recommendations against the decision file. It does not direct whether to file, decline, amend, supplement, or close the SAR. The named decisionmaker is the BSA officer (with the SAR review committee where the firm uses one). The skill outputs `recommendation`, not `decision`. A QA artifact that says "the SAR should not have been filed" or "amend the SAR to add X" has misread its scope.

### Reviewing alert quality instead of decision quality

Whether the alert was a good alert (precision, recall, segmentation, threshold) belongs in `aml-model-monitoring`. Whether the decision file shows defensible work belongs here. The QA should not absorb model-monitoring work; cross-reference it instead.

### Treating CDD or EDD posture as in-scope

Customer-segmentation and CDD-refresh work belongs in `cdd-risk-review`. EDD posture for high-risk customers belongs in `edd-escalation-pack`. The SAR-decision QA can flag a segment-mismatch finding (e.g., consumer-grade CDD on a customer showing small-business activity) and cross-reference; it does not handle the CDD refresh itself.

## Evidence discipline

### Free-text investigation paragraphs treated as steps

A free-text paragraph describing the investigation cannot be QA'd against the timeline. Each step needs a date, a performer role, and an evidence pointer. The structured `investigation_steps` field forces dated, attributed entries. Where the file is a paragraph, mark `investigation-completeness` and ask for the structured detail.

### Negative-news and sanctions-screen searches stated without dates or sources

"Negative-news search: clean" with no date and no source-list is not evidenceable. The QA reads the search artifact (date, source list, search-term scope) or marks the gap.

### Reading the structured-field SAR form completion as a green light

A SAR form with all required structured fields populated can still have templated narrative, generic typology language, missing advisory citation, and no case-specific tipping-off assessment. Structured-field completeness and decision-quality are separate criteria; the QA reads both.

## Narrative discipline

### Plain-language rationale without typology citation

A coherent, plain-language disposition rationale that does not name a typology and does not cite an apt FinCEN advisory passes the narrative-coherence test but fails the typology-citation and advisory-citation tests. The QA distinguishes the criteria.

### Generic advisory citation as window-dressing

Citing a FinCEN advisory in narrative because the typology vaguely applies (without the indicators in the advisory matching the alert facts) is a separate finding from missing-citation. Date the advisory in the narrative; tie at least one named indicator from the advisory to the alert facts.

### Templated narrative

A narrative that reads as a fill-in-the-blanks template scores `narrative_coherence_label = generic`. Coherent narratives reflect the specific facts, dates, and counterparties of the alert. Severity is a judgment call; templated narrative on a high-risk typology is more material than templated narrative on a routine structuring close.

## Confidentiality discipline

### Program-level tipping-off tickbox treated as case-specific assessment

The case-specific assessment under **31 USC §5318(g)(2)** is required where the decision intersects an active customer-service interaction (fraud-recovery, dispute, EDD-overlap, law-enforcement-liaison, cyber-insurance-claim). A program-level statement "tipping-off controls are in place" does not satisfy. Set `tipping_off_risk_assessed = true` only when the file evidences the case-specific work.

### Need-to-know access control on the SAR record assumed rather than evidenced

The SAR record's internal access-control posture should be evidenced (system access log, named-role authorisations, exception register). Assumed posture is a `confidentiality-tipping-off` finding.

## Continuing-activity discipline

### Reviews documented only when a follow-on SAR is filed

Continuing-activity reviews concluding "no continuing activity" are still papered. A bank or fintech that papers reviews only when a follow-on SAR is filed leaves an evidence gap. The QA's `continuing_activity.last_continuing_review_date` and `next_review_due` apply regardless of outcome.

### Continuing-activity cadence applied uniformly across all alerts

The 90-day cadence is the conventional supervisory expectation; the firm's program may set the cadence differently for routine versus high-risk typologies. The QA reads the program's cadence and the file against the program, not against an external default.

## Sector-specific pitfalls

### Applying the bank SAR rule to MSB or fintech activity

Bank SAR rule (`31 CFR §1020.320`) thresholds and posture are not the same as MSB SAR rule (`31 CFR §1022.320`) thresholds and posture. The QA scopes the operative rule before applying thresholds.

### Applying the SAR rule to non-covered insurance products

`31 CFR §1025.320` covers permanent life with cash value, annuities, and other investment-type products. P&C, term life without cash value, group products, and health are generally outside scope. The QA scopes the product before applying the rule.

### Treating an investment-adviser alert as in-scope of a stand-alone SAR rule

Until FinCEN's covered-investment-adviser SAR rulemaking is operative, advisers do not have a stand-alone SAR rule; the affiliated BD's program may carry the obligation. Track current state of the rulemaking on the date of analysis.

### Importing FFIEC bank-flavoured frame to a BD or fund

The FFIEC manual SAR section informs but does not bind BDs and funds. SEC and FINRA examiners are the primary audience.

## Cross-cutting pitfalls

### Generic cyber-typology language when an apt advisory exists

"Cybercrime" or "cyber-fraud" in narrative when FinCEN has named the typology in an advisory (BEC, ransomware, convertible-virtual-currency sanctions evasion) is a `typology-citation` finding. Cite the advisory by name and date.

### Templated cyber-event structured fields

The current FinCEN SAR form has cyber-event indicator fields. Templated populations score `structured-field-completeness` even when the fields are technically populated.

### Missing sanctions-officer cross-reference on convertible-virtual-currency typologies

Sanctions-evasion via virtual currency is the dominant cyber-sanctions overlap. The SAR-decision file or the sponsor-bank handoff package must route to the sanctions function. Missing routing is a `process_change_recommendation` finding.

## Output discipline

### Citing without sections

Every regulator citation in the QA carries a section reference or a `[verify section]` placeholder. URL alone fails the source-anchor depth check. Use `references/source-anchors.md` for the canonical citation set; do not restate excerpts in the artifact body.

### Marking unsupported claims silently

Use `[evidence needed]` explicitly. An inferred claim presented as evidenced is the failure mode.

### Closing with too much certainty

The confidence label is `high` only when the source posture, the evidence set, and the QA criteria all line up. `medium` and `low` are normal for early-stage QA work; `unknown` is honest where the firm has not yet resourced the evidence ask. A `high` confidence label on a QA reviewing a decision file with material gaps is incoherent.
