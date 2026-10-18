# Cyber cross-cutting overlay — aml-model-monitoring

When the scope flags the cyber cross-cutting overlay, load this file. It carries the cyber-typology lens for transaction-monitoring scenario coverage. The overlay is scoped to typologies that surface in transaction monitoring, not to general cyber controls (NYDFS Part 500 program-level, SEC cyber 8-K, cyber-resilience framework reviews) which sit elsewhere.

## Scope of this overlay

Transaction monitoring is one of the points where cyber-enabled financial crime becomes visible to second-line review. Account takeover, ransomware-payment facilitation, BEC-payout patterns, virtual-currency conversion typologies, and synthetic-identity patterns generate transaction signal that the monitoring system either picks up or misses. The overlay focuses on whether the scenario inventory and the segmentation reflect this typology surface.

## Anchoring sources

- **OFAC Updated Advisory on Potential Sanctions Risks for Facilitating Ransomware Payments (September 21, 2021)** [verify date and the most recent revision] — sanctions-risk frame for ransomware payments to designated parties; downstream signal that monitoring may surface (large-dollar virtual-currency conversions, third-party-payment patterns paying ransom-related counterparties).
- **FinCEN Advisory FIN-2021-A004 on Ransomware (November 8, 2021)** [verify advisory number and date] — typology indicators for ransomware-related financial activity.
- **FinCEN guidance on virtual-currency-related activity** for money services businesses and convertible-virtual-currency exchangers and administrators (FIN-2019-G001, May 9, 2019, and related) [verify the operative guidance set] — typology indicators and the BSA/AML expectations on VASP-adjacent activity.
- **FinCEN Advisory on BEC and Email Compromise** (FIN-2016-A003 and successor advisories) [verify advisory references] — typology indicators for BEC-driven payment patterns.
- **FinCEN Advisory on synthetic identity fraud and identity-related typologies** [verify the operative advisories].

## Cyber-driven typologies the monitoring scope addresses

The QA reads whether the scenario inventory and segmentation address:

- **Account takeover (ATO) downstream payment patterns.** Push-payment-out events shortly after a credential-change or device-change signal; rapid drain to external accounts; P2P sends to first-time counterparties; mobile-channel-originated activity diverging from the customer's historical channel. The monitoring system needs the device, channel, and identity-event signal to detect this; the QA reads whether those feeds are integrated.
- **Ransomware-payment facilitation.** Large-dollar virtual-currency conversions; payments to known VASPs around incident dates; third-party-payment-processor patterns around incident windows; rapid funding-and-conversion sequences. The OFAC sanctions-evasion concern is loud: where the firm's monitoring surfaces these patterns, the QA reads whether the screening interlock with `sanctions-screening-qa` is documented.
- **BEC payout patterns.** Inbound wires to first-time business counterparties; rapid distribution to multiple accounts after receipt; correspondent-routed patterns from foreign jurisdictions; mule-account receipt patterns where the firm hosts the mule account.
- **Virtual-currency on-ramp and off-ramp typologies** for customers transacting with VASPs, mixers, or cross-chain bridges. Where the customer base shows VASP transaction patterns, the monitoring scope needs scenario coverage on conversion velocity, counterparty-of-counterparty exposure (where the firm has visibility), and rapid-cash-out sequences.
- **Synthetic-identity patterns.** Shell-customer identifiers (date-of-birth and SSN combinations that do not credential-history), thin-file customers acquiring credit and rapidly drawing cash, identity-cluster patterns (multiple customers sharing device, IP, or address fingerprints).
- **Mule-account receipt-and-forward patterns.** Inbound from one source, outbound to another within a short window, with no economic rationale tied to the customer's profile. Common across ATO, BEC, romance-scam, and government-benefit fraud.

## Segmentation signal the cyber overlay informs

Cyber-typology coverage benefits when segmentation includes:

- **Channel and device features.** New-device-on-known-account events, device-fingerprint stability, IP geolocation drift, channel-mix changes.
- **Identity-event timeline.** Credential change, contact-info change, beneficiary-link change, payee-add events, and the activity following them.
- **Counterparty-graph features.** First-time counterparty events, shared-counterparty clusters across customers, repeated-counterparty patterns suggestive of mule networks.
- **VASP-counterparty exposure.** Customers with material VASP transaction volume isolated as a segment.

A segmentation that does not include channel, device, or identity-event signal will miss the cyber-typology surface entirely; the QA flags the gap.

## Findings the cyber overlay surfaces

- Scenario inventory absent ATO, ransomware-facilitation, BEC-payout, or VASP-conversion scenarios where the customer base or transaction history shows the typology surface.
- Device, channel, and identity-event signal feeds not integrated into the monitoring system.
- VASP-counterparty exposure unaddressed in segmentation despite material customer volume.
- Sanctions-screening interlock with the monitoring system undocumented for ransomware-related typologies (cross-link to `sanctions-screening-qa`).
- BTL testing on ATO and BEC scenarios absent or under-sampled.
- Auto-closure rules in payments populations covering ATO-typical alert clusters without documented validation (a common loss point).
- FinCEN advisory coverage gaps — the firm's risk assessment names a typology covered by an active advisory, but the scenario inventory does not address it.

## Boundaries of this overlay

This overlay is for transaction monitoring's cyber-typology coverage. Cyber controls at the program level (incident response, third-party cyber due diligence, NYDFS Part 500 program review, SEC cyber 8-K disclosure) are out of scope here; sanctions-screening interlock detail lives in `sanctions-screening-qa` and its `references/cross-cutting/cyber.md`; CDD intersection (KYC for VASP-counterparty customers, identity-verification controls) lives at `cdd-risk-review`.
