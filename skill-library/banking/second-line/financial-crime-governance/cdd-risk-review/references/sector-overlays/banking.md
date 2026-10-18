# Banking sector overlay — cdd-risk-review

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. It carries the bank-specific CDD frame the generic capability skill does not own.

## Operative CIP / CDD rule set

- **31 CFR §1020.220** [verify section] — bank CIP. Identifying-information collection, verification (documentary or non-documentary or both), recordkeeping and retention (five-year posture), comparison against government lists.
- **FinCEN CDD Final Rule (May 2016, compliance May 11, 2018)** [verify section] — applied to banks across the four pillars.
- **31 CFR §1010.230** — beneficial ownership for legal-entity bank customers.
- **31 CFR §1010.610** [verify section] — enhanced due diligence for correspondent accounts for foreign financial institutions. Risk-assessment framework; EDD elements; the foreign-bank-account due-diligence program.
- **31 CFR §1010.620** [verify section] — enhanced due diligence for private-banking accounts. Source-of-funds inquiry; scrutiny for senior foreign political figures.
- **FFIEC BSA/AML Examination Manual — CDD section and Beneficial Ownership section** [verify section anchors] — examiner-facing detail.

## Bank-specific risk drivers the QA reads in the file

- **Cash-intensive businesses.** Convenience stores, restaurants, car washes, laundromats, parking, certain entertainment venues, certain retail. A "small business with cash deposits" label is not a rated decision; the QA reads whether the file evidences the cash intensity (industry profile, expected cash volumes quantified, customer-stated rationale, any CTR pattern history) and whether the rating drivers tie to that evidence.
- **MSB customers of a bank.** Banking an MSB carries customer-CDD obligations that are heavier than the customer-segment label implies. The QA reads whether the MSB customer's own AML program is on file (where the bank's program asks for it), whether the MSB's business model is documented, and whether the expected-activity profile reflects the MSB's customer base.
- **Marijuana-related businesses (MRBs).** Where the bank serves MRBs, the FinCEN MRB guidance (FIN-2014-G001) [verify date and current effectiveness] sets the program-level expectations; the CDD QA reads whether the MRB-specific CDD elements (state licensing, ongoing-monitoring scope, ongoing review of public sources) are on file.
- **Politically exposed persons (PEPs) and PEP-adjacent.** Domestic-PEP and foreign-PEP profiles carry program-level EDD obligations; the QA marks `edd_status` accordingly and cross-references `edd-escalation-pack`.
- **Correspondent and private-banking accounts.** Read against `§1010.610` and `§1010.620` directly. The QA scopes the rule first; banks frequently mis-apply the foreign-correspondent rule (it is for accounts maintained for foreign FIs, not for any wire counterparty).
- **Complex-structure entities.** Multi-tier ownership, foreign holding companies, trust intermediaries, family-office structures. The beneficial-ownership read on these customers is harder than the certification form alone supports; the QA reads for inconsistency between the certification and any other file evidence.
- **Trade-based money-laundering exposure.** Commercial customers with international counterparties; the expected-activity profile should reflect trade flows specifically enough to evaluate alerts against.

## Refresh cadence at a bank

The CDD Final Rule does not set a uniform refresh cadence; refresh is on a risk basis and the institution's program defines the cycle. The QA reads against the program's cycle, not against an external default. Common bank patterns: high-risk annually; medium-risk every two to three years; low-risk on event only or on a longer cycle. The QA flags refresh-cycle adherence when the cycle is missed.

## Bank-specific CIP nuances

- **Joint accounts.** CIP applies to each customer; the file should evidence both.
- **Trust accounts.** Trust-customer scope under CIP is the trust itself; the trustee is not the customer for CIP purposes but is the operative actor for verification. Beneficial ownership under `§1010.230` does not apply to trusts as legal-entity customers; trust-specific due diligence sits in the institution's program.
- **Sole proprietors and DBAs.** Sole proprietors are individuals for CIP purposes and not legal-entity customers under `§1010.230`. The QA scopes the rule before applying the beneficial-ownership pillar.
- **Online-only / non-face-to-face onboarding.** Verification method weighs more heavily; non-documentary verification methods should be evidenced specifically (database matching, public-record corroboration, reference checks where the program calls for them).

## Cross-link inside the plugin

- **`edd-escalation-pack`** carries the EDD pack itself. The CDD QA marks `edd_status` and cross-references; it does not produce the EDD pack.
- **`sar-decision-qa`** reads the customer's CDD posture as context when an alert closes against the same customer. A CDD-segment-mismatch finding at the SAR-decision level is a CDD QA cross-reference.
- **`negative-news-triage`** carries adverse-media triage. An event-driven CDD refresh triggered by negative news consumes the triage record as input.
- **`aml-model-monitoring`** carries monitoring scenario tuning. A CDD finding tagged to expected-activity-versus-monitoring-scope mismatch routes to `aml-model-monitoring`; the CDD QA does not re-tune scenarios.
- **`sanctions-screening-qa`** carries sanctions-screening match disposition. A sanctions-hit-triggered CDD refresh consumes the screening QA record as input.

## Common pitfalls in banking CDD reviews

- Treating CIP completeness as CDD completeness. CIP is Pillar 1; the QA reads all four pillars separately.
- Reading the foreign-correspondent rule (`§1010.610`) on customers that are not foreign FIs.
- Missing the inconsistency check between the beneficial-ownership certification and the rest of the file (entity filings, signatories, transactional patterns).
- Letting risk-rating drivers stand as labels without evidence linkage ("cash-intensive", "international", "PEP-adjacent" with nothing underneath).
- Generic expected-activity boilerplate ("general business banking") that cannot drive monitoring scenario tuning.
- Asserting BOI filing status under `§1010.380` without an as-of date and a rule-state read on that date; the CTA implementing rule has live litigation history.
- Treating sole proprietors, trusts, or unincorporated associations as legal-entity customers under `§1010.230`.
