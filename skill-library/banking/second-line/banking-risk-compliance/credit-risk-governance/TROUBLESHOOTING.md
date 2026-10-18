# Troubleshooting: credit-risk-governance

Recurring defects in credit-risk-governance packs. Read the corresponding section of `SKILL.md` and `references/source-anchors.md` first; the guidance here is for cases where the pack reads off-tone or fails on review.

## The pack reads as a fair-lending review

Symptom: section 1 (credit policy alignment) cross-walks against ECOA / Reg B; section 2 (underwriting framework) reads as a disparate-impact analysis; section 7 (second-line challenge) discusses fair-lending matched-pair file review.

Cause: the scope or the cycle trigger blurred the safety-and-soundness lens with the fair-lending lens.

Fix: hard-stop and route. The credit-risk-governance pack covers the safety-and-soundness lens only. Route the fair-lending lens to the consumer-compliance fair-lending skills (per `references/cross-cutting/conduct.md`). Run the credit-governance pack against the safety-and-soundness anchors only; cross-reference the fair-lending pack as a recommended owner action where the safety-and-soundness review surfaces a finding with a plausible fair-lending dimension.

## Section 6 (Reg O) is empty because no insider transactions occurred this cycle

Symptom: section 6 collapses to "not applicable this cycle".

Cause: misreading the Reg O obligation as transaction-volume-driven.

Fix: the §215.8 recordkeeping and §215.9 reporting obligations exist regardless of transaction volume. Even on quiet quarters, section 6 confirms posture: insider-list refresh date, aggregate lending-limit headroom, recordkeeping reconciliation status, quarterly reporting filed on time. Reg W can be marked "not applicable this cycle" with confirmation that the affiliate inventory is current; Reg O cannot.

## Risk-rating override and underwriting exception treated as the same artifact

Symptom: section 2 (underwriting framework) reports overrides; section 3 (risk-rating discipline) reports exceptions; the two read interchangeably.

Cause: misreading the two governance constructs as one.

Fix: keep them separate. An underwriting exception is a deviation from policy at origination (a policy says debt-service coverage at 1.25x; an exception is approved at 1.15x). A risk-rating override is a change to the assigned grade away from the rule-based output (the model returns pass-3; the credit officer overrides to pass-4 with documented rationale). Both have governance, both have approval authority, both have aggregate-tracking and reporting; the artifact carries them in their own sections.

## The 300% CRE concentration position is framed as a regulatory cap

Symptom: section 4 reads "the bank is in violation of the 300% CRE concentration limit"; the recommended owner action says "reduce the CRE concentration below the regulatory cap".

Cause: misreading the December 2006 Interagency CRE Concentration Guidance as a hard limit.

Fix: the 100% / 300% screens are monitoring triggers for enhanced risk-management expectations, not regulatory caps. Phrase the position as a trigger ("the bank is above the 300% screen, which is a trigger for enhanced supervisory expectations on concentration risk management"). Recommended owner actions describe enhanced risk-management practices (stress-testing methodology, granular concentration reporting, more frequent board reporting), not concentration reduction (unless the bank's own risk appetite warrants it).

## Section 5 (allowance methodology) reads as CECL model validation

Symptom: section 5 carries model-validation back-testing results, methodology assumption testing, and a model-risk-finding-resolution log.

Cause: replicating CECL model validation work inside the second-line credit-governance pack.

Fix: section 5 covers second-line oversight of how CECL outputs land into credit governance. The model validation itself lives with model risk; section 5 reads the validation outcome ("validated within the last 12 months by model risk; no open findings", or "validation in progress with two open findings on the qualitative-factor framework"). The substance section 5 owns is methodology approval at the ALLL / ACL governance committee, qualitative-factor governance, sensitivity analysis review, and the linkage between the rating-migration in section 3 and the expected-loss inputs.

## Section 8 (Heightened Standards) skipped for a $52B bank

Symptom: section 8 reads "not applicable" for a covered bank that crossed the $50B threshold last quarter.

Cause: misreading the covered-bank trigger or treating the threshold as a forward-looking marker.

Fix: 12 CFR Part 30 Appendix D applies to banks with $50B+ avg total consolidated assets. Once the bank crosses the threshold, the framework is binding (subject to the OCC's reservation of authority and the rebuttable-presumption framework). For banks at $40B+ approaching the threshold, run the section as forward-looking; for banks at $50B+, the section is binding and not optional. Examiners read section 8 first for covered banks; a missing or skipped section reads as not-ready.

## Comptroller's Handbook booklet cited without an edition

Symptom: source trace says "Comptroller's Handbook Concentrations of Credit booklet" without an edition date.

Cause: copying the citation pattern from the spec sheet without confirming the edition.

Fix: pin the edition date in the source trace. If unknown, mark `[verify current edition]` and resolve at the next revision cycle. Do not invent an edition date. Booklets are revised periodically and a stale citation undermines the credibility of the source trace.

## Open MRA on credit risk-rating discipline cited verbatim in a pack with broader access population

Symptom: section 3 quotes the verbatim text of an open MRA on rating-discipline weaknesses; the pack is distributed to the credit risk committee, which includes the full audit committee plus management observers.

Cause: misreading the CSI access-population constraint.

Fix: prior supervisory letters and prior MRAs / MRIAs are CSI under 12 CFR Part 4 Subpart C (OCC), Part 261 (FRB), or Part 309 (FDIC). The verbatim text cannot leave the bank's CSI access population without the regulator's written authorisation. Either summarise the finding without verbatim text (acceptable for a broader access population), or restrict the pack distribution to the CSI access population. The pack header should name the access population so this constraint reads at the cover.

## Section 7 (second-line challenge) reads as audit work

Symptom: section 7 carries an audit-style sample with a control-effectiveness conclusion, a deficiency rating, and a management-response request.

Cause: confusing second-line credit-review with third-line internal audit.

Fix: section 7 is the second-line credit-review function's challenge of first-line lending decisions. It is not an audit. The voice is concurrence rate, override rate, escalation pattern, and findings summary. The independence framing comes from the Interagency Guidance on Credit Risk Review Systems (May 8, 2020), which is supervisory guidance on the second-line function, not on internal audit. Where third-line internal audit has separately covered credit-administration controls, cite that audit's coverage in section 1 or section 8 (Management posture for the supervision-readiness handoff), not in section 7.
