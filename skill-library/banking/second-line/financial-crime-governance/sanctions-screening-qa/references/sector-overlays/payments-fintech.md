# Payments-fintech sector overlay — sanctions-screening-qa

When the scope flags payments or fintech (sponsor-bank programs, BaaS platforms, money transmitters, MSBs, card-program operators, virtual-currency on-ramps), load this overlay alongside `references/source-anchors.md`. The overlay carries the payments-rail-specific and sponsor-bank-allocation reads the bank-flavoured frame does not.

## Screening-responsibility allocation

The threshold question for a payments-fintech sanctions-screening QA is which entity owns the screening obligation on which activity. The allocation is documented in the sponsor-bank program agreement and is not optional QA scope.

- **Sponsor-bank arrangement (BaaS, program operator, fintech with bank in the chain)**: the sponsor bank typically holds the OFAC obligation for activity in the bank's accounts under the operative OFAC program(s). The fintech's program may detect, the sponsor bank reviews and decides. The QA reads the fintech's screening evidence, the handoff package to the sponsor bank, and confirms the bank-level read on the same activity is not double-counted or skipped.
- **Standalone MSB**: the MSB itself owns the OFAC obligation. Operative OFAC programs and the FFIEC OFAC section apply directly.
- **Money transmitter with multi-state licensure**: per-state requirements layer on top of the federal OFAC obligation; the QA notes the per-state population but reads against the federal anchor.
- **Dual-posture (MSB with sponsor-bank deposit account)**: both can apply to different segments of activity. The QA scopes which counterparty owns which screening read.

## Payments-rail-specific screening

- **Real-time card screening** — authorization-time screening latency tradeoffs. The QA reads the program's posture on declines for sanctions hits at authorization time (the customer-experience pressure to clear false positives within milliseconds is real; the disposition evidence trail still has to exist).
- **ACH screening** — outbound and inbound; same-day ACH compresses the screening window. The QA reads the cycle and the suspended-batch handling.
- **Faster-payments rail screening** (e.g., RTP, FedNow) — sub-second authorization windows; the program's pre-screening (customer-level, counterparty-level) versus per-transaction screening posture. The QA reads the rail-specific operating window.
- **Wire screening (where the fintech has wire capability)** — same field-level reads as a bank.
- **Card-program screening** — BIN-sponsor allocation of screening responsibility, prepaid-card cardholder screening, and the cross-card / cross-program reconciliation evidence. Multi-card / cross-program activity is a known evasion vector.
- **Crypto on-ramp / off-ramp screening** — exchange-side and custodial-wallet screening; address-level designations; analytics-vendor governance. The cyber overlay engages.

## Sponsor-bank screening responsibility

When the QA covers a fintech operating under a sponsor-bank model, the screening-responsibility allocation read is load-bearing:

- The drafted program (fintech's screening rules, fuzzy thresholds, exclusion lists).
- The investigation evidence (dated, attributed disposition decisions; evidence pointers).
- The handoff package to the sponsor bank (the alerts the fintech escalates; the rationale for non-escalated alerts; the periodic re-attestation to the sponsor bank).
- The sponsor bank's own screening read on the same activity (the QA reads whether the bank's read is independent or relies on the fintech's read; reliance has to be documented in the program agreement and tested).

A handoff package missing the periodic re-attestation, missing the rationale for non-escalated dispositions, or missing the sponsor-bank's independent-test evidence is a `process_change_recommendation` finding.

## MSB screening considerations

- **31 CFR §1022.380** — MSB registration with FinCEN. Initial registration within 180 days of becoming an MSB; renewal every two years. Adjacent program-element check; an unregistered MSB has a foundational program defect that the screening QA notes by reference even though registration is outside the screening artifact. Not the BOI / CTA reporting rule at §1010.380, which is a separate obligation with its own legal status.
- **State money-transmitter license set** — per-state populations.
- **Bank Secrecy Act and OFAC dual obligations** — the MSB's program-level posture on BSA / OFAC convergence is the operative read.

## Crypto on-ramp / off-ramp screening exposure

The FinCEN / OFAC convergence on virtual-currency activity is the dominant evasion vector at fintech and crypto-adjacent firms. The QA reads:

- **Address-level screening** against OFAC-designated addresses (mixers, sanctioned-jurisdiction-adjacent wallets). Name-only screening misses address-level designations.
- **Counterparty-attribution evidence** from blockchain-analytics vendors. Vendor outputs are vendor outputs; the QA cites the vendor and routes vendor-diligence to `third-party-operational-resilience/vendor-diligence`.
- **Hop-distance posture** — does the program treat addresses one or two hops from sanctioned addresses as alert-generating, and on what evidence basis.
- **Chain-hopping and cross-chain bridges** — does the program have visibility across chains the customer base uses.
- **The cyber overlay (`references/cross-cutting/cyber.md`) carries the deeper read** on these typologies.

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the fintech's customer-segmentation and onboarding-CDD work. Sanctions findings on synthetic-identity, deepfake, or BO opacity feed back to CDD-program tuning.
- **`sar-decision-qa`** carries the SAR-decision QA. Sanctions-adjacent alerts that escalate to SAR cross-reference; convertible-virtual-currency typologies are the dominant overlap.
- **`aml-model-monitoring`** carries the screening-engine and analytics-vendor model-risk view. The QA notes whether model-risk coverage is current.

## Cross-link to other plugins

- **`third-party-operational-resilience/vendor-diligence`** carries the sponsor-bank, processor, BIN-sponsor, KYC-vendor, fraud-decision-vendor, sanctions-screening-vendor, and blockchain-analytics-vendor diligence. The screening QA cross-references vendor-diligence findings where a sub-processor's posture is material.
- **`ai-governance-model-risk/llm-vendor-evidence-review`** carries the AI-vendor evidence-pack review for AI tooling in the screening or analytics pipeline.

## Output-template additions for payments-fintech

- Screening-responsibility allocation as a named field (`sponsor-bank-screens`, `msb-screens`, `dual-posture`).
- Per-rail screening posture (`real-time-card`, `same-day-ach`, `faster-payments`, `wire`, `crypto-on-ramp`) as a named-field block with operating-window observations.
- Sponsor-bank handoff package status (`complete`, `partial`, `missing-non-escalated-rationale`, `missing-periodic-re-attestation`, `missing-bank-independent-test-evidence`, `other-gap`).
- Address-level screening capability status (loaded with the cyber overlay).

## Common pitfalls in payments-fintech sanctions-screening QA

- Reviewing the fintech's screening as if the fintech were the obligor; missing the sponsor-bank screening-responsibility allocation read.
- Treating real-time rail latency pressure as a reason to lower disposition-evidence rigour; the disposition still has to be evidenced after the fact.
- Skipping the address-level screening read on programs with crypto on-ramp / off-ramp exposure (the cyber overlay engages).
- Reading the analytics-vendor output as a primary source (it is a vendor output; route vendor-diligence).
- Missing the cross-card / cross-program reconciliation read on multi-card programs (BIN-sponsor evasion vector).
- Importing bank-flavoured wire-message field reads to a fintech without wire capability; scope to the rails the program actually operates.
