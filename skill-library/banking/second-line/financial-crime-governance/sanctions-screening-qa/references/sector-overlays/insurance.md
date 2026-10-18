# Insurance sector overlay — sanctions-screening-qa

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. The insurance overlay carries what the bank- and payments-flavoured frames do not.

## Operative anchors

- **31 CFR Chapter V** — operative OFAC programs scoped to the carrier's customer, beneficiary, producer, and counterparty population. Insurance carriers are US persons; OFAC is strict-liability and reaches every US person.
- **OFAC Framework for Compliance Commitments** (May 2, 2019).
- **31 USC §5318(h)** — AML program requirement for insurance companies (the operative AML compliance program rule). The OFAC sanctions program runs alongside; the QA reads against the carrier's written compliance program.
- **NAIC Insurance Data Security Model Law (Model #668)** [verify model number] — adjacent cybersecurity frame; intersects the sanctions screening pipeline at the IDV-and-onboarding layer.

## Insurance-specific screening rails the QA examines

- **Customer screening at policy underwriting** — applicant, policy owner, payor (where different), insured (where different from owner) screened against the operative list set.
- **Beneficiary screening at claim** — beneficiary screened at claim notification and again at payment. Beneficiary-change events post-issuance are an event-driven rescreen trigger; a designation occurring after policy issue but before claim has to be picked up.
- **Producer (agent / broker) screening at appointment and at periodic re-attestation** — the producer is a counterparty; producer-perpetrated schemes and producer-distribution-chain exposure are real.
- **Premium-payment counterparty screening** — third-party premium payors, lender-funded payors (premium-financing), and foreign-jurisdiction wire payors are screened.
- **Reinsurance counterparty screening** — ceding and assuming counterparties (and retrocessionaires) are screened. Reinsurance treaty re-attestation cycles carry the periodic read.
- **Payee screening at payout** — claim payees, surrender payees, dividend payees, policy-loan disbursement payees.

## Covered-products scoping interaction

The carrier's BSA / SAR program operates against covered products only (permanent life with cash value, annuities with cash value, certain other investment-type products). The carrier's **OFAC obligation does not stop at covered products** — OFAC is strict-liability and applies across all lines including P&C, term life, group, and health. The QA scopes carefully:

- The BSA / AML overlay applies to covered products.
- The OFAC sanctions screening obligation applies to all customer, beneficiary, producer, and counterparty populations regardless of product line.
- A program that scopes sanctions screening to covered products only has under-scoped its OFAC obligation; this is a foundational finding.

## Beneficiary-at-claim posture

The beneficiary-at-claim screening is the most-often-overlooked rail in insurance sanctions screening. The lifecycle is:

- Beneficiary screened at policy issue.
- Beneficiary-change events post-issue trigger rescreen.
- Beneficiary screened at claim notification.
- Beneficiary screened again at payment (post-list-update events between notification and payment).

A program that screens at issue and again at claim only, without the change-event rescreen and the payment-time refresh, has gaps. The QA reads the lifecycle, not a single point in it.

## Reinsurance counterparty exposure

Ceding and assuming reinsurance counterparties (and retrocessionaires) are counterparties for OFAC purposes. The QA reads:

- Treaty-level counterparty screening at execution and at periodic renewal.
- Facultative-level counterparty screening at placement.
- Retrocession-chain visibility (does the program know the retrocessionaires of its assuming counterparties).
- Run-off-portfolio counterparty rescreen on legacy treaties.

## Producer accountability

The insurance distribution model means the **producer** is a counterparty whose appointment and conduct sit inside the program's sanctions risk. The QA reads:

- Producer-screening at appointment against the operative list set.
- Periodic producer re-attestation including sanctions-screening refresh.
- Producer-distribution-chain screening (sub-producers, MGAs, MGUs).
- Producer-driven scheme indicators (policies steered to designated counterparties, beneficiary patterns inconsistent with customer profile).

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the carrier's covered-product CDD work and the producer-due-diligence frame. Where the screening QA flags a 50 Percent Rule aggregation gap on a legal-entity policy owner, the CDD posture feeds the read.
- **`edd-escalation-pack`** carries EDD posture for high-risk customers (PEPs, foreign-jurisdiction premium funding, large face-amount contracts).
- **`sar-decision-qa`** carries the SAR-decision QA where a sanctions-adjacent alert escalates. Note that SAR rule scope is covered-products-only; OFAC scope is broader.

## Cross-link to other plugins

- **`market-conduct-and-customer-outcomes`** plugin [verify skill availability in current build] — producer-perpetrated schemes overlap.
- **`third-party-operational-resilience/vendor-diligence`** for TPA / claims-administrator / underwriting-bureau / IDV-vendor diligence where the alert source is a third-party system.

## Output-template additions for insurance

- Beneficiary-at-claim screening lifecycle status as a named-field block (`issue`, `change-event`, `claim-notification`, `payment-time`).
- Producer-screening status as a named field (`appointment`, `periodic-re-attestation`, `sub-producer-chain`).
- Reinsurance-counterparty screening status as a named field (`treaty`, `facultative`, `retrocession-chain`, `run-off`).
- Covered-vs-non-covered scope read for the OFAC obligation as a named field (the BSA scope and the OFAC scope are different).
- Premium-financing counterparty screening status as a named field where the carrier has premium-finance volumes.

## Common pitfalls in insurance sanctions-screening QA

- Scoping sanctions screening to covered products only; OFAC is strict-liability across all product lines.
- Screening at policy issue and at claim only, missing the change-event rescreen and the payment-time refresh on the beneficiary lifecycle.
- Treating producer screening as a one-time appointment exercise; periodic re-attestation and sub-producer-chain reads are part of the program.
- Skipping reinsurance-counterparty screening because the cessions are treated as "between sophisticated counterparties"; OFAC reaches every US person regardless of counterparty sophistication.
- Importing FFIEC bank-flavoured continuing-cycle reads where the carrier's program is structured around policy-cycle and claim-cycle events instead.
- Confusing carrier insolvency / financial-condition triggers with sanctions-screening triggers; those route through different supervisory channels.
