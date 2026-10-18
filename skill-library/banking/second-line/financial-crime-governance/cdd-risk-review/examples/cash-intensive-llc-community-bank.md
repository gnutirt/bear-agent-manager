# Example: cash-intensive LLC (new account at a community bank)

Public-source-derived. No named institution. The shape mirrors a standing pattern at small and mid-sized community banks: a new-account opening for a single-member LLC operating a cash-intensive convenience-store business, with a CDD file that looks complete on the CIP and beneficial-ownership pillars but thin on expected activity and rating-driver evidence.

## Input

- **Institution**: a community bank with a regional footprint and one primary regulator (FDIC for this example; FRB or OCC depending on charter).
- **Customer**: single-member LLC. Sole 100% beneficial owner is also the control-prong individual. Business: convenience store with food service. State of formation matches state of operations.
- **CDD file (as presented for QA)**:
  - CIP: legal name, formation date, registered agent address, EIN. Verification documentary (state filing extract, EIN letter). Discrepancies: none recorded.
  - Beneficial ownership: certification form on file, dated at account opening. Control prong: named individual. Ownership prong: same named individual at 100%. ID document attached for the named individual. BOI filing status field on the file: blank.
  - Expected activity: documented as "general business banking with cash deposits".
  - Risk rating: "medium". Drivers listed: "small business, cash deposits".
  - Monitoring scope: standard small-business monitoring scenarios; no scenario-specific tuning notes.
  - Refresh cycle: per firm policy, medium-risk small business reviewed every 24 months.
- **Engagement scope supplied**: institution = community bank; primary regulator = FDIC; persona = second-line CDD QA reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = none.
- **Review type**: new_account.

## Output sketch

The skill produces a CDD review memo against the file. Headlines:

- **Customer profile summary** — single-member LLC; convenience store with food service; one US state in play.
- **CIP coverage (Pillar 1)** — `cip_status = sufficient`. Identifying information collected; documentary verification on file; no discrepancies. Retention status meets `§1020.220(a)(3)`.
- **Beneficial ownership (Pillar 2)** — `beneficial_ownership_status = partial`. Certification on file with control prong and ownership prong satisfied by the same individual. ID corroboration on file. **BOI filing status under `31 CFR §1010.380` blank on the file** — reviewer flags `[verify]` with the as-of date and the rule-state read on that date; on most current readings, a single-member LLC formed for active business is a reporting company unless an exemption applies, but the file should evidence the determination.
- **Nature and purpose / expected activity (Pillar 3)** — `expected_activity_status = missing`. The "general business banking with cash deposits" entry is generic boilerplate; the convenience-store business model has typical expected cash deposit volumes, ATM network usage patterns (where the store hosts an ATM), money-order sales activity (where in scope), and lottery / EBT / SNAP redemption patterns that should be specific in the profile to drive monitoring scenario tuning. The QA flags this as a material gap.
- **Risk rating** — current rating "medium"; `rating_reasonableness = borderline`. The drivers listed are labels without evidence linkage. The cash-intensity of the customer's business model is itself the rating's load-bearing driver, and the file does not evidence the cash intensity (no expected-volume figure, no industry-profile note, no customer-stated rationale on cash levels). The QA does not change the rating; it surfaces the misalignment as a finding.
- **Ongoing monitoring (Pillar 4)** — `monitoring_scope_status = partial`. Standard small-business monitoring scenarios are in scope; threshold calibration against an unspecific expected-activity profile cannot be evaluated. The QA flags the cross-reference to `aml-model-monitoring` for threshold tuning consideration once the expected-activity profile is specified.
- **EDD escalation posture** — `edd_status = not_required` on file evidence; cash-intensive label alone does not trigger EDD without elevated additional drivers (geography, structure, jurisdictions of concern, transaction patterns). The QA notes the borderline call and the conditions under which it would re-evaluate.
- **Material gaps**:
  - Quantified expected-cash-deposit profile (pillar = expected_activity; severity = material).
  - Customer-stated rationale for expected cash levels (pillar = expected_activity; severity = moderate).
  - BOI filing status determination with as-of date and rule-state read (pillar = beneficial_ownership; severity = moderate).
  - Rating-driver evidence linkage (pillar = risk_rating; severity = material).
- **Reviewer findings**:
  - `criterion = expected_activity_specificity`, severity material. Boilerplate expected-activity statement cannot drive monitoring scenario tuning on the cash-intensive typology profile.
  - `criterion = rating_driver_evidence`, severity material. Driver labels without evidence linkage.
  - `criterion = boi_filing_grounding`, severity moderate. BOI status field blank.
- **Recommended human-review gates and owner actions** — `recommendation = return_to_first_line_for_evidence`. Conditions: quantified expected-cash-deposit profile, customer-stated rationale for cash levels, BOI determination with as-of date, rating-driver evidence linkage. Schedule monitoring threshold review after the profile is updated; cross-reference to `aml-model-monitoring`. The QA reviewer does not change the rating, decline the account, or set the EDD trigger; the BSA officer and the customer-onboarding compliance lead decide on the routing.
- **Source trace** — anchors to `references/source-anchors.md` (CDD Final Rule, FFIEC CDD section, `§1010.230`, `§1020.220`), `references/sector-overlays/banking.md` (cash-intensive-business risk drivers and the rating-driver-evidence expectation).
- **Confidence label** — `medium`. The CIP and beneficial-ownership pillars are read at high confidence; the expected-activity and rating findings are at high confidence on the file evidence; the BOI status determination is at lower confidence pending the rule-state read.

## Why this scenario matters

- **The CDD review separates the four pillars**. CIP is complete; that does not make CDD complete. The pillar-by-pillar read is what surfaces the expected-activity and rating-driver gaps.
- **Risk-rating drivers as labels is the dominant defect at small-business onboarding**. The skill's `criterion = rating_driver_evidence` exists for this pattern.
- **Expected-activity specificity is a monitoring-tunability question, not a cosmetic preference**. A profile that cannot drive scenario tuning is a material gap, not an observation.
- **BOI filing status is dated and grounded**. The file should evidence the determination with an as-of date; the QA flags `[verify]` rather than assert without grounding.
- **The QA does not change the rating**. The misalignment is a finding routed to the BSA officer; the firm's risk-rating governance owns the rating.
- **The cross-reference to `aml-model-monitoring` is real**. Threshold tuning is its scope, not the CDD QA's; the QA flags the cross-reference.

## Anchors

- FinCEN Customer Due Diligence Final Rule (May 2016, compliance May 11, 2018).
- FFIEC BSA/AML Examination Manual — Customer Due Diligence section.
- 31 CFR §1010.230 — beneficial ownership for legal-entity customers.
- 31 CFR §1010.380 — BOI reporting (CTA implementing rule; date the read).
- 31 CFR §1020.220 — bank CIP.

See `references/source-anchors.md` for full citations and `references/sector-overlays/banking.md` for the bank-specific frame.
