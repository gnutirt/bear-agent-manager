# Troubleshooting: banking-supervision-readiness

Recurring defects in supervision-readiness packs. Read the corresponding section of `SKILL.md` and `references/source-anchors.md` first; the guidance here is for cases where the pack reads off-tone or fails on review.

## CSI access-population breach in the prep population

Symptom: prior supervisory letters, draft examiner-letter responses, or verbatim MRA / MRIA text sit in a shared drive readable by individuals not on the CSI access list. The pack circulates to the credit risk committee or the audit committee with full prior-letter excerpts inline. A name on the cover sheet that does not appear on the regulator-acknowledged distribution list reads the verbatim finding.

Cause: the access-population constraint is read as a labelling rule for the document, not as a population control on every individual who handles, reads, or stores it. CSI travels with the file; the constraint travels with the population.

Fix: confidential supervisory information is governed by 12 CFR Part 4 Subpart C (OCC), 12 CFR Part 261 (FRB), and 12 CFR Part 309 (FDIC). The pack header names the access population at the cover; verbatim CSI text only sits in pack copies whose distribution matches that population. For a broader-population copy, summarise the finding without verbatim quotation. Verbatim CSI cannot leave the bank without the regulator's written authorisation. Where the access list is uncertain, default to the narrowest plausible population and flag the broader-distribution version as `[CSI redaction required before distribution]`.

## MRA treated as MRIA (or vice versa)

Symptom: a Matter Requiring Attention is escalated as if it were a Matter Requiring Immediate Attention — board-meeting agenda time burned, executive remediation cadence stood up, regulatory-affairs escalation track triggered — for an item the regulator did not label MRIA. Or the inverse: an MRIA is tracked on the same monthly cadence as ordinary MRAs with no immediate-attention board-reporting hook.

Cause: the bank's tracker uses one label, the regulator's letter uses another, and the pack reconciles to the tracker rather than to the letter. Or the two categories are conflated as "supervisory findings" without preserving the regulator's distinction.

Fix: defer to the regulator's label on the source letter, not the bank's tracker. MRAs are matters requiring attention; MRIAs are matters requiring immediate attention. Aging tolerance, escalation cadence, board-reporting expectation, and closure-readiness threshold all differ between the two. Where the bank's tracker and the regulator's letter disagree, the cross-walk row uses the regulator's label and flags the tracker discrepancy as an owner action. The pack's executive summary surfaces the open MRIA population separately from the open MRA population; collapsing them into a "findings count" loses the signal the pack is meant to carry.

## CAMELS-component scope drift

Symptom: a targeted IT examination pack carries six full CAMELS-component subsections; a quarterly consent-order remediation update carries the BHC rated framework. The pack reads as a generic enterprise risk register rather than as the response to the cycle scope.

Cause: the spine is built from the template rather than from the cycle profile. The full-scope template is reused for targeted, point-in-time, or topical cycles without trimming. Or the depository-institution spine is reused for a BHC supervisory cycle that needs the BHC rated-component framework.

Fix: confirm the cycle type and the rated framework on the cover before drafting Part A. A targeted IT exam reads the FFIEC IT Examination Handbook spine plus the IT-relevant CAMELS components (typically Management and Sensitivity, with the IT-specific request list in the topical readiness slice); the other components do not get full subsections. A BHC supervisory cycle reads the BHC rated-component framework (RFI/C(D) or successor) per FRB SR 12-17, not CAMELS. A quarterly consent-order update reads the cross-walk plus the article-by-article evidence section, not the full Part A. Component depth scales to scope; over-built sections read as not-ready, not as thorough.

## Reg YY cited at a state-member bank

Symptom: the prudential-framework section cites 12 CFR Part 252 (Reg YY) as the binding regime for a state-member bank or a state non-member bank.

Cause: confusing the bank-level supervisory regime with the holding-company-level enhanced prudential standards regime. Reg YY is the FRB's enhanced prudential standards for bank holding companies and savings-and-loan holding companies above defined size and risk thresholds, plus US intermediate holding companies of foreign banking organisations. It does not run at the depository-institution level.

Fix: at the depository-institution level (national bank, state-member bank, state non-member bank, federal or state savings association), the prudential framework runs through 12 CFR Part 6 / Part 208 / Part 324 (capital), 12 CFR Part 50 / Part 249 / Part 329 (LCR / NSFR where applicable), and the safety-and-soundness regime under 12 USC 1818. Reg YY runs at the holding-company and IHC level under FRB jurisdiction. A state-member bank's exam pack cites Part 208 (the FRB's regulation for state-member banks) and the consolidated supervisory frame from FRB SR 12-17 for the holding-company connection; it does not cite Reg YY as the bank-level regime. Where the holding-company organisation has both a depository-institution cycle and a BHC cycle running, build the pack for the cycle in scope, not for both.

## OCC Heightened Standards cited at a non-OCC-supervised bank

Symptom: the readiness tail carries a 12 CFR Part 30 Appendix D Heightened Standards section for a state-member bank, a state non-member bank, or a savings-and-loan holding company. The risk-governance-framework attestation references "OCC heightened-standards expectations" at an FRB-supervised or FDIC-supervised institution.

Cause: treating Heightened Standards as the federal large-bank governance regime rather than as the OCC's regime for OCC-supervised covered banks.

Fix: 12 CFR Part 30 Appendix D applies to OCC-supervised covered banks (national banks, federal savings associations, federal branches and agencies of foreign banks) at $50B+ avg total consolidated assets. It does not run at FRB-supervised state-member banks or FDIC-supervised state non-member banks. At an FRB-supervised institution, the analogous frame is the FRB's consolidated supervision regime (SR 12-17 for large institutions, SR 14-1 for risk-management standards on large and complex BHCs, the LFI rating system per SR 19-3 where the threshold applies); at an FDIC-supervised institution, the FDIC's enhanced supervisory expectations under the Risk Management Manual. Cite the regime that runs on the chartering and supervisory regulator, not the OCC's regime by analogy. A holding-company organisation may have an OCC-supervised national bank subsidiary that does fall under Heightened Standards; the section runs on that subsidiary and not on the broader holding-company organisation.

## LFI rating framework applied below the LFI threshold

Symptom: the BHC supervisory section applies the Large Financial Institution rating framework (SR 19-3) at a regional BHC well under the $100B asset threshold, or applies LFI-aligned governance, capital-planning, and liquidity-risk-management ratings to a non-LFI BHC.

Cause: the LFI framework is the most recent FRB BHC rating frame and gets used as the default; the predecessor frames (RFI/C(D) for non-LFI BHCs) are remembered as legacy.

Fix: SR 19-3 establishes the LFI rating system for FRB-supervised firms with $100B+ in total consolidated assets and certain other criteria. BHCs below that threshold are rated under RFI/C(D) (or its successor non-LFI frame) per FRB SR 04-18 and successors. The pack cites the rating frame that applies at the BHC's size band; applying LFI rating components (Capital Planning and Positions, Liquidity Risk Management and Positions, Governance and Controls) at a non-LFI BHC misreads the supervisory expectation and overstates the framework's reach. Where the BHC is approaching the $100B threshold, run an LFI-readiness forward-looking section in the tail; do not collapse the current rating frame into the LFI frame.

## Closure-readiness `high` without sustained-operation evidence

Symptom: every row in the MRA / MRIA cross-walk carries closure-readiness `high`. Action plans were dated within the last 30 to 60 days; the sustained-operation column is empty or carries "in progress".

Cause: closure-readiness is treated as a status assertion rather than as a sustained-operation claim. Or the pack reads closure-readiness as the bank's confidence in its remediation rather than as the examiner's likely assessment of evidence sufficiency.

Fix: closure-readiness `high` requires a documented sustained-operation period in months. Banks typically use 6 to 12 months internally; the examiner applies judgement on the period and on the evidence quality. Default to `medium` when the sustained-operation period is below the bank's policy threshold; default to `low` when the action plan is dated within the last 30 days. A pack that marks every item closure-ready without sustained-operation evidence triggers examiner skepticism on the entire population, not just on the over-claimed rows. The cross-walk's sustained-operation column carries the period in months and the evidence type (policy update, control implementation, training, system change, sustained-operation observation); empty entries cap the closure-readiness rating at `low`.
