# Troubleshooting: aml-model-monitoring

Common defects in monitoring-review work product. Use this list to catch the recurring failure modes before sponsor sign-off.

## "AML monitoring is rules, not a model"

The most common failure mode. The memo reads the system as a rules engine, applies BSA/AML examination expectations only, and skips model-risk discipline (development, implementation, use, validation, governance, ongoing monitoring, effective challenge). The named US model-risk supervisory guidance treats AML transaction monitoring as a model when it applies statistical, economic, financial, or mathematical theory to inputs (scenarios, thresholds, segmentation, and tuning all qualify). The program review at section one of the memo states the model frame explicitly. If the memo body does not read against the model-risk discipline, redraft.

## Productivity figures without denominator definitions

A productivity number reported as "12%" is uninterpretable without the denominator. SARs / alerts? Escalations / alerts? SARs / investigations? Different programs use different denominators and the same word means different things across firms. The structured fields in the template force a denominator definition; if the source artifact does not define it, mark `[evidence needed]` and route to the BSA officer for definitional clarification before the figure goes in the memo.

## BTL "performed" reported as a binary

"BTL was performed for this scenario" is not enough. The discipline lives in the sample size against the population, the escalation rate, the sign-off chain, and the reviewer's independence from the tuning team. If the source artifact reports BTL as performed without those, the BTL line in the memo carries `[evidence needed]` until the workpaper is on file.

## Segmentation drift assessed only on population

Population per segment can be stable while behaviour per segment moves. A segmentation that looks stable on count is not stable in any monitoring-relevant sense if the volume, velocity, counterparty mix, or geography distribution per segment has shifted. The drift indicators table has rows for both; both should be filled.

## Threshold-change approval evidence post-dates the change

A common change-governance gap. The change is made, the meeting that approves it happens later, and the meeting minute serves as the approval. The change-governance log should carry the approval evidence dated before the change effective date. The skill records the gap as an observation against the specific change and routes a programmatic remediation to the change-governance owner; the change itself is not unwound by the QA.

## Reviewer drifts into proposing the new threshold or new scenario

Out of scope. The QA produces gate recommendations and routes findings to the change-governance machinery; the threshold value, the scenario design, the segmentation cuts, and the validation conclusions are made by the named decisionmaker. If the memo proposes a specific new threshold or specific new scenario language, redraft to a routing recommendation.

## Validation findings outstanding past target dates without re-baselining

When validation findings sit open past their remediation target, the QA reads whether the firm has formally re-baselined the target with documented rationale or whether the date has slipped silently. Silent date-slip is a governance finding; documented re-baselining is a fact to record without flagging. The structured fields capture the distinction.

## Scope creep into validation

The validation cycle is its own deliverable in the model-risk plugin. This skill consumes validation evidence (last date, scope, open findings, validator independence); it does not produce the validation. If the memo starts walking validation methodology in detail, the work has crossed scope. Hand off to the validation skill in the model-risk plugin.

## Scope creep into SAR decisioning

QA over individual SAR decisions sits in `sar-decision-qa`. The monitoring memo reads the upstream signal (alert productivity, SAR conversion at the program level, scenario-level SAR conversion); it does not read the case-level SAR decision. Cross-link findings that require SAR-level QA to that skill.

## Sector overlay not loaded

Reading a payments-fintech monitoring system through a deposit-bank lens (or a broker-dealer system through a deposit-bank lens) misses the typology surface that matters. The scope should name the sector overlay; if it does not, the QA asks the practitioner before drafting and notes the assumption in the memo. A memo that does not name the sector overlay it loaded has not engaged the question.

## Cyber overlay not loaded when the typology surface implicates it

Customer base shows VASP transaction patterns, the firm has experienced ATO loss, BEC payouts have appeared in prior SAR filings, but the cyber cross-cutting overlay is not loaded and the scenario inventory carries no ATO, BEC, or VASP-conversion scenarios. The QA loads the cyber overlay (`references/cross-cutting/cyber.md`) when the typology evidence is on file, even if the scope did not explicitly flag it; the memo notes the load.

## Source-anchor citations in the memo body

The memo body uses generic regulator language; specific section references and named-source citations live in `references/source-anchors.md`. A memo body that quotes section numbers is duplicating reference content and pollutes context for sponsors reading at lower posture than the engagement.

## Confidence labels missing

Every material claim carries a source and a confidence label in the source-trace section. Customer self-attestation is not the same as corroborated evidence; firm policy assertion is not the same as observed control output. If the source-trace table is sparse or absent, the memo has under-evidenced its claims; redraft.
