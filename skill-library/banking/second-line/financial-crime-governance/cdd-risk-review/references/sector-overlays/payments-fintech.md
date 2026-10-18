# Payments-fintech sector overlay — cdd-risk-review

When the scope flags payments or fintech (sponsor-bank model, licensed MSB, payment processor, BaaS arrangement, neobank), load this overlay alongside `references/source-anchors.md`. It carries the fintech-and-payments CDD frame the generic capability skill does not own.

## Operative CIP / CDD frame for fintech

The applicable rule set depends on the regulatory perimeter the fintech sits inside:

- **Sponsor-bank (BaaS) model.** The sponsor bank is the institution of record for CIP, CDD, and the BSA/AML program. The fintech operates under the sponsor's program contract. The QA reads against the sponsor's program (which itself reads against `31 CFR §1020.220` and the CDD Final Rule), not against a fintech-only standard. The program contract typically allocates CIP collection, identity verification, beneficial-ownership data capture, ongoing monitoring, and SAR detection across the sponsor and the fintech; the QA reads whether the file evidences the allocated work.
- **Licensed MSB.** MSBs operate under `31 CFR §1022.210` (AML program rule) and `§1022.320` (SAR rule). MSBs are not subject to a stand-alone CIP rule of the `§1020.220` form; the institution's CIP-equivalent program applies. The QA reads the program against the customer file. Money-transmitter customer onboarding, agent-of-payee considerations, and cross-border remittance posture set the expected-activity-profile depth.
- **OCC-chartered fintech / state-chartered fintech bank / industrial loan company.** Same rule set as a bank under `§1020.220` and the CDD Final Rule. Read against the bank overlay where the institution holds a bank charter.
- **Payment processor.** Where the processor is not itself an FI under the BSA, the customer-due-diligence work sits with the sponsor bank; the processor's KYB / KYC operations may inform the bank's CDD file but do not substitute for it.

## Sponsor-bank delineation — the QA's first read

Before reading the file pillar by pillar, the QA confirms which entity is the institution of record and what the program contract allocates. A common defect: the file presents the fintech's onboarding flow as the institution's CIP record without evidence that the sponsor bank reviewed and accepted it. Where the program contract assigns ongoing monitoring to the fintech, the QA reads whether the bank has a documented oversight posture (monitoring of the fintech's monitoring), not just a contractual allocation. The CFPB's interagency 2023 third-party guidance and the FRB / OCC / FDIC sponsor-bank-program supervision posture frame the bank-side oversight expectation.

## Fintech-specific risk drivers the QA reads

- **Onboarding velocity vs CDD depth.** Fintech onboarding is fast; CDD depth has to keep up. A 90-second onboarding flow is not a defect by itself, but it is a defect when the file evidences no human review, no verification corroboration on flagged cases, and no escalation route. The QA reads whether risk-tier branching is evidenced in the flow.
- **Synthetic-identity and first-party-fraud exposure.** Non-face-to-face onboarding at scale carries elevated synthetic-identity risk. The QA reads whether non-documentary verification (database matching, public-record corroboration, device intelligence, behavioural signals) is evidenced for the customer, and whether the file reflects any flag-and-resolve activity from the verification stack.
- **Crypto-adjacent customer activity.** Fintech customers transacting with virtual-asset service providers, mixers, or chain-hopping intermediaries carry typology-specific monitoring expectations. The QA reads whether the expected-activity profile reflects this exposure and whether the monitoring scope picks it up.
- **Agent-of-payee and merchant-acquiring exposure.** Where the fintech's customer is itself a merchant or sub-merchant, the CDD scope extends to the merchant's business model and the underlying transaction flow. The QA reads whether merchant-category-code, expected-volume, and chargeback-history exposure are evidenced.
- **Cross-border remittance exposure.** Money-transmitter and cross-border-payment customers carry geography-and-corridor-specific risk. The QA reads whether the expected-activity profile reflects the corridors actually transacted.

## Beneficial ownership in fintech contexts

Beneficial-ownership work on fintech customers (legal-entity customers under `§1010.230`) is the same rule, but the evidence stack is often thinner because the onboarding is non-face-to-face and the verification corroboration is data-stack rather than document-stack. The QA reads whether the certification is on file, whether the verification of the named individuals is corroborated (document upload, identity-verification stack, ID-document liveness), and whether the file's transactional pattern is consistent with the certification. Where the customer is a small LLC with one named beneficial owner, the file should still evidence the verification work; the certification form alone is the form, not the verification.

## BOI reporting status — the dating discipline

`31 CFR §1010.380` BOI reporting status applies to many small fintech LLC customers. The Corporate Transparency Act's implementing rule has live litigation history; the QA marks `boi_filing_status` with an as-of date and the rule-state read on that date. A fintech CDD file from early 2024 reads differently from one from late 2024 or from later periods, and the QA does not assert without grounding.

## Cross-link inside the plugin

- **`edd-escalation-pack`** for high-risk fintech customers (PEP-adjacent, large MSB customers, complex-structure entities, jurisdictions of concern).
- **`sar-decision-qa`** for downstream alert-decision QA on the same customer.
- **`aml-model-monitoring`** for monitoring scenario tuning where expected-activity-versus-scope mismatch surfaces.
- **`sanctions-screening-qa`** for sanctions-hit-triggered refresh.
- **`negative-news-triage`** for adverse-media-triggered refresh.

## Common pitfalls in fintech CDD reviews

- Reading the fintech's onboarding artifact as the sponsor bank's CIP record without evidence the sponsor reviewed and accepted it.
- Treating the program contract's allocation of work as evidence the work was done.
- Letting onboarding velocity carry through to a "CDD complete in 90 seconds" file without evidence of human review, escalation, or verification corroboration on flagged cases.
- Generic expected-activity profiles that cannot drive monitoring scenario tuning on fintech customer behavior (high-volume P2P, crypto-adjacent flows, cross-border corridors).
- Asserting BOI filing status without an as-of date and a current rule-state read.
- Missing the bank-side oversight posture on a sponsor-bank arrangement (the bank monitors the fintech's CDD work; that monitoring is itself in scope of the bank's CDD review).
