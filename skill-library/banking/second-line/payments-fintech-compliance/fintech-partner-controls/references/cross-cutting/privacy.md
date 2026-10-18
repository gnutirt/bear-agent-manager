# Cross-cutting overlay — privacy

Default-on where customer NPI flows for fraud and AML monitoring beyond baseline (most programs once monitoring vendors are in the stack). The lens here is the sponsor bank's GLBA posture on the customer data the operator handles on the bank's behalf, which the sponsor bank is on the hook for under its own GLBA obligations.

The overlay does not substitute for a state-by-state privacy-law inventory, which is its own work product. The pack names the operative regimes and the controls and points to deeper review where the firm's footprint demands it.

## Anchor frame — the sponsor bank's privacy expectations on the operator

- **GLBA Safeguards Rule, 16 CFR Part 314** as amended (FTC, December 2021 amendments effective 2023). §314.4(a)-(h) program elements; §314.4(f) service-provider obligations — the sponsor bank's most direct hook into the operator's data-handling posture; §314.4(h) incident-response. The sponsor bank treats the operator as a service provider under §314.4(f) and pushes the program elements through the program agreement.
- **GLBA Privacy Rule / Reg P, 12 CFR Part 1016**. Consumer-information privacy notice; opt-out mechanics; sharing limits. Where the fintech surface presents the deposit-like product, the privacy notice runs through the sponsor bank as the FI of record; the operator's surface-level disclosure must be consistent.
- **CFPB Personal Financial Data Rights Final Rule under §1033** (October 22, 2024 — verify Federal Register citation, exact citation, implementation tier dates, and current docket status). Where the program operator is a data provider or data recipient, §1033 obligations include secondary-use limits, retention-and-deletion duties, and consent-revocation paths.
- **CCPA / CPRA — California Consumer Privacy Act as amended, Cal. Civ. Code §1798.100 et seq.** Where the operator has California consumers in its book.
- **State privacy laws** — verify state-by-state per the geographic footprint. Active comprehensive privacy laws include (incomplete; verify currency on the analysis date) Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas (TDPSA), Oregon (OCPA), Montana (MTCDPA).
- **NYDFS 23 NYCRR Part 500** — privacy and security overlap.

## Sponsor-bank GLBA flow-down

The sponsor bank's GLBA Safeguards obligation does not stop at the bank's perimeter. Under §314.4(f), the bank takes reasonable steps to select and retain service providers capable of maintaining appropriate safeguards and contractually requires service providers to implement and maintain such safeguards. The program agreement clause set carries this through to the operator. The pack evidences:

- The §314.4 program-element posture inside the operator (written information-security program, designated qualified individual, risk assessment, access controls, multi-factor authentication, encryption, incident-response, training, service-provider oversight on the operator's own subcontractors).
- The sponsor bank's right to review the operator's GLBA program annually.
- The flow-down of GLBA expectations to the operator's subcontractors (fourth parties from the bank's perspective).

## What the overlay puts into the inventory

In the **customer-protection controls** row: privacy-notice consistency control (the operator's surface-level privacy framing consistent with the sponsor bank's GLBA notice; evidence is the rendered surface read against the bank's notice). DSAR / consumer-rights handling control where state regimes apply.

In the **subcontractor and fourth-party register**: each material vendor's data-processing agreement coverage, secondary-use exception scope (model-improvement, benchmarking, anonymous-aggregate use), and the operator's audit cadence on vendor data handling.

In the **program-agreement control map**: the customer-data ownership clause, the post-termination data-handling clause, the §1033 implications where the operator is a covered data provider, the GLBA flow-down clause.

## §1033 status note

Repeat. Where the program operator is a data provider under §1033 (most consumer-account programs), the pack names the data-provider obligations, the implementation tier date for the firm, and the cross-link to `open-banking-data-controls` for the deeper review. Where the program operator is a data recipient (typically aggregator-fed analytics), the cross-link is to `open-banking-data-controls`. Verify the current docket status on each engagement and date-stamp the citation; the rule was finalised October 2024 but the docket has been active and tier dates may have shifted.

## Common pitfalls

- Treating GLBA as the sponsor bank's problem because the depository is the bank. Under §314.4(f), the bank is on the hook for the operator's posture; the operator must be inspectable on the same terms.
- Treating vendor data-processing agreements as evidence of operational compliance rather than as contractual baseline; DPA coverage and DPA-vs-actual reconciliation are separate questions.
- Missing secondary-use exception scope in monitoring-vendor contracts (model-improvement, benchmarking, anonymous-aggregate use). The sponsor bank's privacy team will ask.
- Defaulting the §1033 status to "we will be ready" without naming the firm's tier and implementation-date posture.
- Missing the state regime in CA, VA, CO, and others where the program operator falls under the threshold and the sponsor bank does not (CCPA / CPRA applies to many fintechs by virtue of revenue and California-resident book even when the sponsor bank does not meet the same threshold).
