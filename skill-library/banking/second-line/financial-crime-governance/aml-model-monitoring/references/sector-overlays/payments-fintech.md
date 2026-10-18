# Payments and fintech sector overlay — aml-model-monitoring

When the scope flags payments-fintech, load this overlay alongside `references/source-anchors.md`. Sponsor-bank programs, money-transmitter licensees, P2P operators, prepaid issuers, third-party payment processors, and BaaS programs all carry monitoring nuance the generic skill does not own.

## Operative-program read

Before reading the monitoring system, the QA confirms whose program is operative.

- **Sponsor-bank program.** A non-bank fintech operating under a sponsor-bank model carries monitoring obligations under the program contract; the sponsor's BSA officer holds program oversight, and the fintech's monitoring system must meet the sponsor's program-level requirements. The QA reads against the sponsor program first, then the fintech's operating procedures.
- **Money services business (MSB) licensee.** A registered MSB operates its own program under FinCEN's MSB rules; the QA reads against the MSB's BSA program directly.
- **Independent bank or credit union with a fintech-style product (P2P, faster payments, mobile-first deposits).** Read against the institution's own program.
- **Third-party payment processor sponsored by a bank.** TPPP carries CDD-on-merchant and monitoring obligations downstream of the sponsor bank's program; data feed integrity from the TPPP into the bank's monitoring system is its own line of inquiry.

A monitoring memo that does not name the operative program is unread. The QA states the operative-program designation in the scope section.

## Segmentation in a payments-fintech context

Payments and fintech populations are typically high-volume, low-balance, and skew younger and more transient than a deposit bank's. Standard demographic-and-behaviour segmentation may misfire. The QA reads:

- Whether segmentation captures the customer-journey lifecycle (onboarding, activation, sustained use, dormant, churned, reactivated). Activation and reactivation cohorts behave very differently from sustained-use cohorts.
- Whether the segmentation captures channel and device signal (web vs mobile vs API; device-fingerprint stability; new-device-on-known-account events).
- Whether peer-network features (counterparty graph, repeated-counterparty patterns, social-graph-implied connections in P2P) are part of the segmentation, where the firm uses them.
- Whether prepaid and stored-value segments isolate by load source, load velocity, and spend velocity.

A segmentation refresh that re-clusters fintech customers on demographic axes alone is missing the most informative axis.

## Payments-typical scenario families

Beyond the bank-typical scenarios, payments-fintech monitoring typically covers:

- **P2P fraud-AML overlap scenarios.** Account-takeover-driven P2P sends, push-payment-fraud receipt patterns, scam-victim payout patterns, mule-account receipt-and-forward patterns.
- **Velocity scenarios** calibrated to the firm's product mix (intraday velocity, day-over-day velocity, week-over-week velocity), with thresholds tuned to the high-volume, low-balance population.
- **Funding-source typology scenarios** (linked-account funding, prepaid funding, third-party-card funding, faster-payment funding) and the rapid-cash-out patterns that follow.
- **MSB-customer scenarios** for sponsor banks banking MSBs.
- **Cross-border remittance typology scenarios** for licensed money transmitters (corridor-specific patterns, structuring across recipients, recipient-graph patterns, hawala-type indicators).
- **Faster-payment typology scenarios** (instant-credit-revoke abuse, unauthorised-push-payment patterns).
- **Card-not-present and BIN-attack indicators** where the program scope includes card issuance.
- **Virtual-currency on-ramp / off-ramp scenarios** where the institution serves customers transacting with VASPs (overlap with `references/cross-cutting/cyber.md`).

## Sponsor-bank program-level coverage

For sponsor banks, the QA reads the program-level monitoring across the BaaS or fintech-program portfolio:

- Whether the sponsor's monitoring system aggregates across program partners or runs partner-by-partner.
- Whether the monitoring scope covers programs with limited downstream visibility (the data-quality and data-feed integrity questions are foundational here).
- Whether program-partner-driven segmentation makes sense at the sponsor level (a single threshold across all partners rarely does).
- Whether sponsor-level reviews of partner monitoring posture are documented and dated.

## Data quality at velocity

Payments and fintech systems run high transaction volumes through layered architectures (ledger, processor, card network, ACH operator, RTP, sponsor-bank rail). The QA reads:

- Whether data feeds from each layer are documented (source, refresh, completeness, identifiers).
- Whether deprecated identifiers, processor migrations, or rail changes are tracked and the monitoring system's mappings are refreshed.
- Whether the firm's data-quality controls flag stale or missing feeds before the monitoring run.
- Whether identifier-stability across the lifecycle (account, device, customer) is monitored.

A data-quality issue on a payments rail outstanding for two cycles is heavier than the same issue on a low-volume product, given the throughput.

## Productivity and conversion in a payments-fintech context

Productivity and SAR-conversion metrics in payments populations skew differently than in a deposit bank. The QA names the denominator and reads the trend, not the absolute number. Per-customer SAR rates may be small and trend lines matter more than spot values.

Auto-closure thresholds (where the program closes alerts without analyst review based on rules) are a heightened concern in high-volume populations. The QA reads whether auto-closure rules are documented, validated, and re-tuned, and whether BTL covers the auto-closed population.

## Payments-specific findings the QA is alert to

- Segmentation that re-clusters on demographics rather than on lifecycle, channel, device, or peer-network features.
- Velocity scenarios with thresholds carried over from a deposit-bank baseline without re-calibration to the high-volume, low-balance population.
- Auto-closure rules without documented validation or BTL coverage.
- Sponsor-bank program-level monitoring run partner-by-partner without aggregated-portfolio visibility, leaving cross-partner typologies unobserved.
- Data feed gaps from a payment rail (RTP, FedNow, card processor, ACH operator) outstanding without remediation owner or target date.
- Faster-payment scenarios absent or under-tuned where the institution's faster-payment volume is material.
- VASP-counterparty exposure unaddressed in the scenario inventory where the customer base shows VASP transaction patterns; cross-link to `references/cross-cutting/cyber.md`.
