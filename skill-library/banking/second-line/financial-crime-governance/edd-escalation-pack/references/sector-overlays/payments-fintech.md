# Payments-fintech sector overlay — edd-escalation-pack

When the scope flags payments or fintech (sponsor-bank model, licensed MSB, payment processor, BaaS arrangement, neobank, virtual-asset on-ramp / off-ramp), load this overlay alongside `references/source-anchors.md`. It carries the fintech-and-payments EDD frame the generic capability skill does not own.

## Regulatory perimeter — the EDD pack's first read

The applicable EDD frame depends on which entity is the institution of record:

- **Sponsor-bank (BaaS) model.** The sponsor bank carries the BSA/AML program for the customer relationship. EDD escalations flow through the sponsor bank's program; the fintech operates under the program contract. The pack reads against the sponsor bank's EDD trigger set and decision machinery, not against a fintech-only standard. Where the program contract allocates EDD investigation work to the fintech, the pack reads whether the bank-side oversight posture (bank monitoring of the fintech's EDD work) is documented; allocation alone is not evidence of execution.
- **Licensed MSB.** MSBs operate under `31 CFR §1022.210` (AML program rule) and `§1022.320` (SAR rule). EDD on high-risk MSB customers is on the MSB's program; the pack reads against the program. Where the MSB also serves as agent for a payment-processor or sponsor-bank arrangement, the EDD obligation may sit on the principal's program; the pack scopes the obligation before drafting.
- **OCC-chartered fintech, state-chartered fintech bank, industrial loan company.** Same EDD frame as a bank. Read alongside the banking overlay.
- **Payment processor.** Where the processor is not itself an FI under the BSA, the EDD work sits with the sponsor bank. The processor's KYB / KYC may inform the bank's pack but does not substitute for it.

## Fintech-specific EDD trigger profiles

- **MSB-affiliated fintech customers.** A fintech customer that is itself an MSB (or operates a money-transmission business under a fintech wrapper) carries the heavier customer-CDD frame banking an MSB implies; the EDD pack reads the MSB's own program, business model, customer base by jurisdiction, and consistency of expected vs actual activity.
- **Virtual-asset service providers (VASPs) and crypto on-ramp / off-ramp customers.** EDD on a customer transacting with VASPs (or being a VASP customer) reads the FinCEN guidance on virtual currency [verify guidance dates]; the pack walks the VASP's compliance posture (registration as MSB where applicable, public source on regulatory standing, jurisdiction of operation), the customer's transactional pattern with the VASP, and the typology exposure (mixers, chain-hopping, decentralised-finance bridges, peel chains). Sanctions-evasion typologies in the virtual-asset space are documented in OFAC and FinCEN advisories.
- **Third-party payment processors (TPPP) as customers of a bank.** Banking a TPPP carries customer-CDD obligations on the TPPP's own merchant base (where the bank's program asks for it). EDD on a TPPP customer reads the TPPP's merchant-onboarding program, merchant-category-code distribution, expected vs actual chargeback patterns, and the existence of any high-risk merchant verticals (high-risk-jurisdiction merchants, adult content, certain online-gambling categories where in scope, certain telemarketing categories).
- **High-velocity P2P customers.** Fintech customers running high-velocity P2P with structured patterns (round-number transactions just below reporting thresholds; rapid pass-through; mule-pattern indicators) are EDD candidates. The pack reads the structured pattern, not the velocity alone.
- **PEP and PEP-adjacent fintech customers.** Same risk-based PEP framing as banking. The 2020 joint statement applies; the pack records the PEP determination, the source, the date, and the risk-based judgment.
- **Cross-border remittance customers with corridor concentration.** EDD on a money-transmission customer with concentrated activity into a high-risk jurisdiction reads the corridor specifically; the FATF mutual-evaluation public report for the jurisdiction is the cleanest public-source frame.
- **Sanctions-adjacent customers in cross-border payments.** Customers transacting near sanctions thresholds (50 percent rule application, sectoral-sanctions exposure, jurisdiction-of-concern transactional flow) are EDD candidates; the pack reads the sanctions-screening QA outputs and walks the connected-party exposure.

## Beneficial ownership in fintech contexts

Beneficial-ownership work on fintech customers (legal-entity customers under `§1010.230`) is the same rule, but the evidence stack is often thinner because onboarding is non-face-to-face and the verification corroboration is data-stack rather than document-stack. The EDD pack walks the chain layer by layer; for high-risk fintech customers (PEP-adjacent, complex-structure, high-risk-jurisdiction nexus, MSB-affiliated), the certification form alone is not enough. The pack reads identity-verification corroboration, transactional consistency with the certification, and any inconsistency with public sources.

## BOI reporting status — the dating discipline

`31 CFR §1010.380` BOI reporting status applies to many small fintech LLC customers. The CTA implementing rule has live litigation history; the pack marks `boi_filing_status` with an as-of date and the rule-state read on that date. A fintech EDD pack from early 2024 reads differently from one from late 2024 or from later periods; assertion without grounding is itself a finding.

## Sponsor-bank program contract — the EDD walk in BaaS

In BaaS arrangements the EDD work involves both entities:

1. **Trigger surfacing.** The fintech's onboarding or monitoring stack surfaces the EDD trigger; the program contract specifies how the trigger flows to the sponsor bank.
2. **Investigation work.** The contract typically allocates investigation work; the pack reads whether the work was executed (not just whether it was allocated).
3. **Bank-side EDD decision.** The sponsor bank's EDD committee or designated approver decides; the fintech does not.
4. **Conditions and ongoing monitoring.** Where retention with conditions is the decision, the program contract specifies how conditions are operationalised in the fintech's stack and how the sponsor bank monitors compliance with the conditions.

The pack reads each step; a gap at any step is a finding.

## Cross-link inside the plugin

- **`cdd-risk-review`** is the upstream baseline.
- **`negative-news-triage`** for adverse-media triage on fintech customers.
- **`sanctions-screening-qa`** for sanctions-screening QA on customers and counterparties; the cyber overlay on that skill carries the virtual-currency and ransomware-evasion typology frame.
- **`aml-model-monitoring`** for monitoring scenario tuning where post-EDD profile changes implicate scenario calibration.
- **`sar-decision-qa`** sits downstream where an alert closes against the customer.

## Common pitfalls in fintech EDD packs

- Reading the fintech's investigation as the sponsor bank's EDD work without evidence the bank reviewed and accepted it.
- Treating the program contract's allocation of EDD work as evidence the work was done.
- Stopping at the beneficial-ownership certification form on a complex-structure fintech customer or on a customer with crypto-business or MSB exposure.
- Asserting `boi_filing_status` under `§1010.380` without an as-of date and a rule-state read.
- Treating a TPPP customer's program assertions as evidence without reading the TPPP's merchant base and chargeback patterns.
- Missing the corridor-specific read on a cross-border-remittance customer (volume into a jurisdiction without reading the FATF posture of the jurisdiction is a thin EDD pack).
- Treating PEP status as automatically EDD-required (the 2020 joint statement frames it as risk-based).
- Importing crypto-transactional-pattern findings without anchoring to the FinCEN / OFAC virtual-currency guidance.
