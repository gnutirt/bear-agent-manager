# Banking sector overlay — sanctions-screening-qa

When the scope flags banking, load this overlay alongside `references/source-anchors.md`. Carries the bank-specific sanctions-screening frame the generic capability skill does not own.

## Operative anchors

- **31 CFR Chapter V** — operative OFAC programs scoped to the bank's customer and counterparty population.
- **FFIEC BSA/AML Examination Manual — Office of Foreign Assets Control section** [verify section anchor] — examiner-facing detail on bank sanctions program elements.
- **OFAC Framework for Compliance Commitments** (May 2, 2019) — five-component frame the QA aligns findings to.

## Bank-specific screening rails the QA examines

- **Customer screening at onboarding** against the operative list set; full-rescreen cycle; delta-rescreen against new designations between full cycles. The QA reads both cycles; a program that runs deltas only and never full-rescans drops dropped designations over time.
- **Wire screening** — incoming and outgoing, including correspondent / cover-payment activity. SWIFT field-level screening (50, 52, 56, 57, 59 and the 70 narrative field) and the institution's stripping-prevention controls. The QA reads field coverage and the policy on suppressed-or-incomplete originator information.
- **ACH screening** — outbound ACH against the operative list set; the QA reads the IAT-vs-domestic distinction and the screening posture on each.
- **Trade-finance screening** — letter-of-credit, documentary-collection, and trade-loan transactions screened against the list set and against the program's dual-use-goods and red-flag-jurisdiction controls. The QA reads the field coverage on the LC text (applicant, beneficiary, advising bank, confirming bank, vessels, ports, goods description).
- **Correspondent-banking nested-relationship exposure** — the bank's downstream-respondent exposure to sanctions-evasion through nested arrangements. The QA reads the program's nested-relationship documentation and the periodic re-attestation evidence from respondents.
- **Customer rescreen cycle** — the cadence (delta vs full re-scan), the post-list-event sweep, and the evidence trail.

## Bank-specific 50 Percent Rule patterns

- Aggregate ownership across multiple SDN entities is the failure mode. A program reading single-owner ownership only misses aggregate-ownership cases.
- Chain-ownership reads (an SDN entity owns a parent that owns the customer) require the program to walk the chain; database-only reads on offshore corporate structures are a known gap.
- The QA reads the program's evidence basis (corporate registry, BO certification, commercial database, vendor analytics) and notes where database reads on opaque structures are not corroborated.

## Bank-specific SSI and sectoral handling

The Russia-related sectoral programs (E.O. 13662 and successor authorities) and other sectoral programs require directive-specific logic (debt / equity tenor restrictions, prohibited service categories, restricted-securities handling). The QA reads whether the program implements directive-specific logic or collapses sectoral into SDN-style blocking.

## List-update event cadence at a bank

- The OFAC publication date is the benchmark for response timing, not the bank's internal publication date.
- Post-event customer-base sweep evidence and post-event payment-rail re-scan evidence are separate reads. A bank that runs the customer sweep and not the rail-rescan misses in-flight transactions against the new designation.
- Cross-rail consistency check: a customer that hits on wire and clears on ACH within the same window without documentation is a `cross_rail_consistency` finding.

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the customer-segmentation and beneficial-ownership work. Where the screening QA flags a 50 Percent Rule aggregation gap, the CDD posture (especially the ownership prong on legal-entity customers) feeds the read; the QA cross-references rather than absorbing the CDD work.
- **`edd-escalation-pack`** carries EDD posture for high-risk customers (foreign correspondent, private banking, PEP). Sanctions-evasion exposure on these customer categories cross-references.
- **`aml-model-monitoring`** carries the screening-engine model governance (match-logic, threshold calibration, BTL testing). The QA notes whether model-risk coverage is current; it does not re-do tuning work.
- **`sar-decision-qa`** carries the SAR decision QA where a sanctions-adjacent alert escalates into an investigation that may produce a SAR.

## Output-template additions for banking

- Wire-message field-coverage status as a named field.
- Correspondent-banking nested-relationship attestation status as a named field.
- Trade-finance field-coverage status as a named field where the bank has trade-finance activity.
- Customer-rescreen cycle posture (delta vs full) as a named field.

## Common pitfalls in banking sanctions-screening QA

- Reading the FFIEC manual sections as binding rules rather than as examiner expectations layered on the OFAC programs.
- Treating wire-message screening as covering only the originator and beneficiary fields, missing intermediary-bank fields and the 70 narrative field where evasion language often sits.
- Letting the QA drift into a recommendation on a specific alert disposition; the QA reviews the program and the documentation, not the match-or-no-match call.
- Skipping the correspondent-banking nested-relationship read on a bank with material correspondent activity.
- Conflating SSI directive-specific prohibitions with SDN blocking treatment in the disposition pipeline.
- Reading delta-update timeliness without reading delta-vs-full reconciliation evidence; the program may be fast on deltas and still drop designations between full cycles.
