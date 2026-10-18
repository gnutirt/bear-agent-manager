# Insurance sector overlay — aml-model-monitoring

When the scope flags insurance, load this overlay alongside `references/source-anchors.md`. AML monitoring scope at insurance carriers is narrower than at banks, broker-dealers, or payments-fintech, but the lines that exist are well-defined.

## Operative scope

- **Covered products under `31 CFR §1025`.** Permanent life with cash value, annuities with cash value, and other insurance products with investment features. P&C, term life without cash value, group products, and health are generally outside scope.
- **AML program rule for insurance companies issuing covered products.** Program elements parallel the SAR-eligible-institution AML program structure: independent testing, designated officer, training, internal policies and procedures. [verify section labels.]
- **SAR rule under `31 CFR §1025.320`.** [verify section labels.]

## Insurance-typical typologies the monitoring scope addresses

The typology surface for insurance covered products is narrow but distinctive:

- **Early surrender** of a permanent life or annuity policy soon after purchase, especially with a willingness to absorb surrender charges — the cash value out is the typology, not the loss.
- **Large premium** payments that exceed the policyholder's documented income or wealth profile.
- **Single premium** purchases of cash-value products from sources or amounts that do not match the customer profile.
- **Third-party premium funding** (a third party paying premiums on a policy the third party does not own and has no documented insurable interest in).
- **Frequent loans or partial withdrawals** against policy cash value followed by repayment patterns suggestive of layering.
- **Free-look-period cancellation** patterns (purchase, free-look refund, repurchase) indicative of cash-value cycling.
- **Beneficiary changes** that move proceeds to high-risk parties or jurisdictions.
- **Policy assignments** to third parties, especially across jurisdictions.

## Distribution-channel nuance

Insurance carriers distribute through agents, brokers, banks (covered-product sales at the bank channel), wirehouses, registered investment advisers, and direct channels. The QA reads:

- Whether monitoring scope captures activity originated through each channel and whether agent / broker channel data feeds are integrated.
- Whether bank-distributed covered-product activity is monitored at the carrier or at the bank or at both, and whether the boundary is documented.
- Whether agent-of-record changes and producer-driven patterns (one producer originating multiple early-surrender cases) are within scope.

## Segmentation in an insurance context

Insurance segmentation is typically lighter than at a bank or broker-dealer because the population is less actively transacting. Common axes:

- Product type (universal life, variable life, fixed annuity, variable annuity, indexed annuity).
- Premium-payment pattern (single, periodic, flexible).
- Distribution channel.
- Producer / agent.
- Customer profile (individual, corporate-owned policy, trust-owned, institutional).

The QA reads whether the segmentation isolates corporate-owned and trust-owned policies (the beneficial-ownership read on these is harder than on individual policies) and whether agent-driven concentrations are visible.

## Productivity and SAR conversion in an insurance context

Insurance SAR rates are very low per policy and trend lines need long windows to be informative. The QA reads:

- Whether the monitoring system is exercised at all in the review window (a common finding is that the system runs but no alerts are generated in long stretches; the QA reads whether that reflects low typology surface, under-tuning, or coverage gaps).
- Whether scenario coverage matches the carrier's product mix (a fixed-annuity-only carrier has a different typology surface than a variable-product carrier).
- Whether SAR filings tie to monitoring output or only to agent-or-customer-reported events.

## Insurance-specific findings the QA is alert to

- Monitoring scope on covered products absent for a product the carrier issues.
- Distribution-channel data feed gaps (especially agent-channel-originated activity) outstanding.
- Beneficial-ownership read on corporate-owned and trust-owned policies absent.
- Agent-driven concentration patterns (one producer, repeated early-surrender or third-party-funded patterns) unmonitored.
- Free-look-cycling patterns absent from the scenario inventory.
- Cross-channel layering (bank channel + agent channel for the same customer) unaddressed where the carrier's data infrastructure could detect it.
