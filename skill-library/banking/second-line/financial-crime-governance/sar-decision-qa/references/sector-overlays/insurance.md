# Insurance sector overlay — sar-decision-qa

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. The insurance overlay carries what the bank-flavoured capability skill does not.

## Operative SAR rule

- **31 CFR §1025.320** — Reports by insurance companies of suspicious transactions [verify section]. Threshold $5,000. Filing window 30 days from initial detection (60 days where no suspect identified). The rule applies to **covered products** only:
  - Permanent life insurance with cash value, other than group life insurance.
  - Annuity contracts other than group annuities.
  - Other insurance products with features of cash value or investment.

  Property and casualty (P&C), term life without cash value, group products without individual ownership, health insurance, and reinsurance are generally outside the SAR rule's covered-products scope. The QA must scope the alert to whether the underlying product is a covered product before applying the rule.

## Insurance-specific typology population the QA encounters most

- Early-surrender of permanent life or annuity contracts shortly after funding — money-laundering layering pattern using insurance as a value-store.
- Unusual funding sources for premium payment (third-party cheques, structured cash, foreign-jurisdiction wires) inconsistent with customer profile.
- Free-look-period cancellations after large premium funding — washing the funds through the insurer's cash management.
- Policy-loan abuse — large policy loans against newly-funded contracts as a value-extraction route.
- Beneficiary changes coincident with sanctions, PEP, or adverse-media events on the new beneficiary.
- Producer-driven schemes — agent-perpetrated fraud where the producer steers customers into transactions inconsistent with the customer's profile (insider-conduct typology).

## Carrier-specific SAR program elements

- **31 USC §5318(h)** — AML program requirement for insurance companies (the operative AML compliance program rule). The SAR program is one element. The QA reads the SAR-decision file against the carrier's written AML compliance program and the FinCEN insurance-AML guidance and FAQs [verify current FinCEN insurance-AML guidance on the date of analysis].
- **NAIC Insurance Data Security Model Law (Model #668)** [verify model number] — adjacent cybersecurity frame. Where the alert involves account-takeover, claims fraud, or producer-perpetrated fraud, the cyber overlay engages and the carrier's incident-response posture under Model #668 may sit adjacent to the SAR-decision narrative.

## Producer accountability and the insider-conduct lens

The insurance distribution model means the **producer** (agent, broker) is often the practical interface to the customer. SAR alerts on producer-perpetrated patterns require:

- Producer-licensing-and-appointment status check (NAIC Producer Licensing Model Act [verify model number]; per-state).
- Producer-level continuing-activity tracking, not only customer-level.
- Cross-link to the carrier's market-conduct examination posture and the producer-discipline track (which sits outside this skill).

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the carrier's covered-product CDD work and the producer-due-diligence frame.
- **`edd-escalation-pack`** carries EDD posture for high-risk customers (PEPs, foreign-jurisdiction premium funding, large face-amount contracts).
- **`aml-model-monitoring`** carries the carrier's transaction-monitoring (where deployed; many carriers monitor through case-management with rule-based detection rather than scenario-driven systems).

## Cross-link to other plugins

- **`market-conduct-and-customer-outcomes`** plugin [verify skill availability in current build] — producer-perpetrated patterns and unfair-claims-handling overlap; SAR-decision QA cross-references rather than absorbing.
- **`third-party-operational-resilience/vendor-diligence`** for TPA / claims-administrator / underwriting-bureau diligence where the alert source is a TPA system.

## Output-template additions for insurance

- Covered-product scoping as a named field (`covered-product-confirmed`, `non-covered-product-out-of-scope`, `mixed-need-product-detail`).
- Producer-licensing-and-appointment status as a named field where the typology is producer-driven.
- ORSA-fit flag where the SAR-decision pattern points to a material outsourced or aggregated risk that belongs in the carrier's ORSA Summary Report.
- HIPAA-overlap note where claims-fraud alerts touch PHI.

## Common pitfalls in insurance SAR-decision QA

- Applying the SAR rule to a non-covered-product alert (e.g., P&C claim, term life without cash value); the rule simply does not reach the activity.
- Treating producer-perpetrated patterns as customer-fraud and missing the producer-discipline and licensing-check track.
- Importing the FFIEC bank-flavoured continuing-activity cadence assumption without checking the carrier's own program; insurance SAR-decision files often have less-developed continuing-activity infrastructure than bank programs.
- Skipping the covered-product scoping at the start of the QA and discovering halfway through that the alert was out of scope.
- Confusing carrier insolvency / financial-condition triggers with SAR-decision triggers; those route through different supervisory channels.
