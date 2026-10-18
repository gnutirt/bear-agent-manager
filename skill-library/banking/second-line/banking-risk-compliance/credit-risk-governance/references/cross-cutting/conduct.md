# Conduct cross-cutting overlay — credit-risk-governance

Loads when the credit program touches consumer or small-business borrowers and the second-line credit-governance review needs to surface UDAAP exposure on lending practices. The overlay does not displace the fair-lending lens; it routes that lens out to the consumer-compliance plugin.

## When the overlay loads

Load this overlay when any of the following is true:

- The bank's credit portfolio includes consumer credit (credit cards, residential mortgage, auto, personal lines, deposit-account-related credit such as overdraft lines).
- The bank's credit portfolio includes small-business credit and the scope flags Section 1071 small-business lending data collection as in scope.
- The trigger is an MRA on lending practices that touches consumer treatment (collections, default servicing, modification, charge-off, repossession).
- The trigger is a CFPB examination running alongside the credit-administration cycle.
- The trigger is a published consent order on UDAAP in lending at a peer institution and the credit risk committee has commissioned a posture check.

When none of these is true, the overlay does not load and the pack runs the safety-and-soundness substance only.

## What the overlay adds to the pack

The conduct overlay adds three threads to the eight-section body, not a separate section.

**To section 1 (credit policy alignment).** The policy cross-walk extends to UDAAP-relevant policy lines: how the policy frames the duty of fair dealing in collections, default servicing, modification, and charge-off; how the policy addresses fee transparency and rate disclosure; how the policy handles servicing-error remediation. These are not the fair-lending coverage lines (those route out); these are the UDAAP-on-lending-practices lines.

**To section 2 (underwriting framework).** The underwriting-data adequacy review extends to whether the data supports a UDAAP-defensible decision (substantiation of repayment-capacity assessment, documentation of borrower disclosures, evidence that the underwriting standards do not depend on practices the CFPB has flagged in published examination findings or consent orders).

**To section 7 (second-line challenge of first-line lending decisions).** The challenge review extends to a UDAAP-lens sample alongside the safety-and-soundness sample. The reviewer asks whether the first-line credit decision documentation supports a UDAAP-defensible posture: clear rationale, disclosure adequacy, consistent application of policy, no evidence of pattern conduct that could be characterised as unfair, deceptive, or abusive.

The overlay does not add a separate UDAAP section. UDAAP exposure on lending practices is a thread through the existing sections; pulling it into a separate section would suggest the credit-governance pack is the UDAAP-review artifact, which it is not.

## Anchors for the overlay

- **CFPB Supervision and Examination Manual — UDAAP examination procedures** (current edition) [verify section]. The CFPB's published examiner-facing UDAAP procedures. https://www.consumerfinance.gov/compliance/supervision-examinations/.
- **Dodd-Frank Act §§1031 and 1036** (12 USC §§5531 and 5536). The statutory basis for UDAAP authority covering unfair, deceptive, and abusive acts and practices.
- **OCC Comptroller's Handbook — Other Consumer Protection Laws and Regulations / Compliance Management Systems booklets** (current editions) [verify titles and editions]. OCC examiner-facing detail on consumer-compliance overlap with credit-administration practices.
- **FDIC Compliance Examination Manual** (current edition) [verify section]. FDIC consumer-compliance examination process for state non-member banks. https://www.fdic.gov/regulations/compliance/manual/.
- **FTC Act §5** (15 USC §45) — the legacy unfair-and-deceptive-acts-and-practices framework still cited for banks' affiliates and predecessor enforcement context.

## Fair-lending route-out

The fair-lending lens on credit (ECOA, Regulation B, FHA, HMDA, Section 1071 small-business lending data collection, disparate impact and treatment) is **not** in scope for this skill. The credit-risk-governance pack covers the safety-and-soundness lens on credit; the fair-lending lens is a complementary but distinct artifact with a different statutory frame, a different evidence inventory, a different analytical method (statistical disparate-impact analysis, matched-pair file review, regression modelling), and a different audience (head of fair lending, fair-lending oversight committee, CFPB or OCC consumer-compliance examiner).

Route to the consumer-compliance fair-lending skills (when present in the consumer-compliance plugin) for that artifact. The handoff lines:

- **ECOA at 15 USC §1691** and **Regulation B at 12 CFR Part 1002**. Anti-discrimination in credit transactions across protected bases (race, colour, religion, national origin, sex, marital status, age, public-assistance income).
- **Regulation B §1002.107 — Section 1071 small-business lending data collection**. The CFPB's small-business lending data rule. Subject to litigation history; confirm current effective state at write time.
- **Fair Housing Act at 42 USC §3601 et seq.** Anti-discrimination in residential real-estate-related transactions.
- **HMDA at 12 CFR Part 1003**. Mortgage-lending data collection for fair-lending statistical analysis.
- **Joint Statement on Discrimination and Discouragement under ECOA** (where applicable) [verify current joint statement]. Inter-agency guidance on discouragement as an ECOA violation.

The credit-governance pack carries a one-line cross-reference to the fair-lending pack in the recommended-owner-actions section: where the safety-and-soundness review surfaces a finding that has a plausible fair-lending dimension (concentration in a geography that overlaps with protected-class demographics; underwriting-exception pattern that correlates with applicant characteristics), recommend the fair-lending review and route there. Do not analyse the fair-lending question inside this pack.

## What the overlay does not load

- A full CFPB examination preparation pack. Use the consumer-compliance examination-readiness skill.
- A UDAAP risk-assessment artifact. Use the UDAAP risk-assessment skill in the consumer-compliance plugin (when present).
- A complaint-management review. Complaint analytics are a related input but not in scope here.
- A servicing-and-collections operational-controls review. Use the servicing-controls skill in the consumer-compliance or operations plugin.

The overlay is narrow on purpose: it adds a UDAAP-on-lending-practices thread to the credit-governance pack without converting the pack into a consumer-compliance artifact.
