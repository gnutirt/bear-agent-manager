# Payments-fintech sector overlay for kri-commentary

When the scope record flags `payments-fintech`, this overlay sets the KRI-commentary content for payments processors, money-services businesses, fintech-bank partnerships (BaaS), and non-bank payment service providers.

Loaded by: `kri-commentary/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- OCC Bulletin 2020-10 and the interagency third-party risk management guidance (June 2023) for bank-fintech relationships and bank-partner program KRIs.
- OCC, FRB, FDIC joint guidance on third-party risk management (2023) for monitoring KRIs on third-party providers, especially for BaaS bank partners.
- CFPB supervisory expectations for consumer-protection KRIs in the payments / digital-banking context (e.g., Reg E unauthorized-transaction KRIs, error-resolution timeliness, complaint volume).
- FinCEN BSA / AML KRI expectations: SAR filing volume and timeliness, CTR filing accuracy, transaction-monitoring alert disposition KRIs.
- Network operator (Visa, Mastercard, ACH operator) chargeback and exception KRIs; while not regulator-issued, these are commonly carried in committee packs.
- For state-licensed money transmitters: state-by-state operating expectations and the Conference of State Bank Supervisors' Money Transmitter Modernization Act framework; varies materially by state.

## What changes for payments-fintech-flagged KRI commentary

### 1. Bank-partner BaaS KRIs

For BaaS programs, the KRI population the committee or BaaS oversight committee sees commonly includes:

- Program-level transaction volume and concentration on individual BaaS clients.
- Sponsor-bank exposure to BaaS-client failure (operational, reputational, prudential).
- BaaS-client onboarding and monitoring KRIs (unmitigated risk-rating distribution, time-since-last-review, open-issue load).
- BaaS-client complaint and dispute KRIs.

Block commentary names the sponsor-bank role and the BaaS-client role explicitly. For sponsor banks, the committee pack often consumes a roll-up of the BaaS-client KRI population (top-N concentration, watch-list count, exited-relationship summary). For the BaaS client, the committee pack consumes the KRI commentary that flows back from the sponsor.

### 2. Consumer-protection KRIs

For consumer-facing payments and digital-banking firms, Reg E KRIs (unauthorized-transaction claim volume, provisional-credit timeliness, error-resolution timeliness) and complaint KRIs are CFPB-attention metrics. Block commentary names:

- The Reg E timing benchmark (10 business days for provisional credit; 45-90 days for resolution).
- The current performance against the timing benchmark.
- The disposition cohort and any patterns by channel, product, or customer segment.

### 3. BSA / AML KRIs

For payments and money-services firms, BSA / AML KRIs (alert volume by typology, alert-to-disposition cycle time, SAR-filing timeliness, CTR-filing accuracy) are continuous-monitoring metrics. Block commentary names the typology mix (driver of the alert volume), the disposition cycle time, and the SAR-filing timeliness against the 30-day default deadline. Where the alert population is materially affected by a model recalibration (transaction-monitoring rule change, scenario tuning), the contributing-factors enum picks up `model-driver` and the data-confidence note carries the model context.

### 4. Network-operator chargeback and exception KRIs

Card-network chargeback rate, ACH return rate, and other network-operator exception metrics carry network-imposed thresholds (above which the operator imposes monitoring or restrictions). Block commentary names:

- The network-operator threshold and current headroom.
- The chargeback-reason distribution.
- The first-line exception-management posture and any remediation in flight.

### 5. Concentration KRIs

For payments processors, concentration on a single sponsor bank, a single BaaS client, a single network operator, or a single rail (card, ACH, wire, RTP) is an enterprise-risk metric. The block carries top-N concentration, headroom against any internal or contractual threshold, and the diversification trajectory.

## Payments-fintech-specific output additions

- `risk_subtype` populated against the firm's payments / fintech taxonomy.
- Wrapper-level role-scope field (sponsor-bank role versus BaaS-client role).
- `linked_material_event_ids` populated for chargeback-rate breaches that trip a network-operator monitoring threshold and for BSA / AML model-recalibration events that materially shifted alert volume.

## Common pitfalls in payments-fintech-flagged KRI commentary

- BaaS KRIs reported without sponsor / client scope distinction. For a sponsor-bank committee, the roll-up; for the BaaS client, the firm-level view; conflation fails both audiences.
- Reg E KRI commentary that reports volumes without the timing-benchmark performance. The CFPB lens is on timing and substance.
- BSA / AML alert volume reported without disposition cycle time and SAR-timeliness. Counts alone do not demonstrate program effectiveness.
- Chargeback-rate KRI without the network-operator threshold context. Headroom matters; absolute rate alone is insufficient.
- Concentration KRI without top-N detail and headroom. Aggregate figures alone are insufficient.
- Money-transmitter KRIs reported as a single national metric where the state-by-state variation is material. State-level breakdown belongs in the block where the firm's licence portfolio warrants.
