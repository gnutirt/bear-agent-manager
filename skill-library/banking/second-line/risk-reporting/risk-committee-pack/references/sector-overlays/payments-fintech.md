# Payments-fintech sector overlay for risk-committee-pack

When the scope record names sector `payments-fintech`, this overlay adds payments and fintech-specific structure and content expectations to the committee pack. Where there is conflict between the capability defaults and this overlay, the overlay governs the payments-fintech-sector elements.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`, or when the institution type is a money transmitter, payments processor, neobank, BaaS-sponsor bank, BaaS-end-platform, card program manager, payments-rail operator, or other nonbank payments / fintech entity.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for payments-fintech committee packs

### 1. Two committee patterns: nonbank fintech and BaaS sponsor bank

Two distinct committee patterns sit under this overlay:

- **Nonbank fintech / money transmitter / payments processor**: the risk committee is typically a board-level or executive risk committee with no federal prudential regulator oversight. Audience is the board or executive committee; primary regulators are state DFI / DOB (for money transmitters), the CFPB (for §1024 larger participants and §1031 / §1036 enforcement reach), and (for some entities) the OCC under the SPNB charter. The pack should not assert a federal prudential supervisor where none applies.
- **BaaS sponsor bank**: the sponsor bank's risk committee is a federally regulated bank committee (national bank, state member, state nonmember, savings association). The pack inherits the banking sector overlay for the bank-side governance frame and adds the BaaS-specific content described below for the partner-relationship view.

The pack carries one or the other pattern; rarely both in a single artifact.

### 2. Third-party concentration and BaaS partner roll-up

The Interagency Guidance on Third-Party Relationships (OCC Bulletin 2023-17 / FRB SR 23-4 / FDIC FIL-29-2023, June 6, 2023) sets the bank-side risk-management expectations for third-party relationships including fintech partners. For sponsor banks, the committee pack carries:

- BaaS partner inventory with criticality tier, asset / deposit / volume share, and activity scope.
- Partner concentration metrics: top-N partner share of deposits, top-N share of transaction volume, geographic concentration, customer-base concentration.
- Partner-by-partner status on the lifecycle (planning, due-diligence, contract, ongoing-monitoring, termination phase) for any partner in active diligence or termination.
- Subcontractor and fourth-party visibility: processor, ledger, KYC, fraud-decision vendor; the four-party pyramid is a recurring exam topic.
- Partner-driven loss events, regulatory actions, customer complaints, and remediation status.

For nonbank fintechs, the inverse view applies: sponsor-bank concentration, processor concentration, BIN-sponsor concentration, payments-rail concentration. A nonbank fintech whose payments rail or sponsor bank exits has the same operational impact as a sponsor bank whose top BaaS partner exits.

### 3. Money transmitter / nonbank payments-specific risk taxonomy

The heat map for nonbank payments / fintech entities covers, at minimum: financial-crime risk (BSA / AML, OFAC, fraud); payments-operations risk (rail outage, settlement failure, processor failure); third-party / sponsor-bank risk; technology and cyber risk; consumer-compliance risk (Reg E, Reg DD, Reg Z where applicable, UDAAP); state-licensing risk (NMLS posture, state exam findings); operational risk; strategic risk; reputational risk. For larger participants under CFPB §1024 supervisory authority, regulatory risk is its own category.

For sponsor banks, the heat map follows the banking taxonomy with explicit BaaS partner-driven cells under operational, third-party, financial-crime, and (for material partner exposure) strategic.

### 4. NACHA Operating Rules and rail-specific content

For ODFI sponsor banks and Third-Party Senders, NACHA Operating Rules (current edition) set the program-operator and originator-management expectations. The pack carries:

- Return-rate posture against current NACHA thresholds (administrative-return, overall-return, unauthorized-return) for each Originator and aggregate.
- Third-Party Sender registration status for any in-scope counterparty and the Originator agreements that Third-Party Sender holds.
- Rule-violation events in the period (NACHA Rules Enforcement Panel actions, fines, member-bank-administered enforcement).

Verify current NACHA thresholds and Rules Enforcement framework at pack-write time.

For card-rail operators (issuers, acquirers, processors), the parallel content covers PCI DSS posture, dispute and chargeback rates against thresholds, and brand-network compliance program status.

For instant-payments entities (FedNow, RTP, Same Day ACH), the pack carries fraud-rate and authorization-failure posture; instant-payment fraud is a recurring committee topic.

### 5. CFPB nonbank supervision and §1033 / §1071 implementation

For nonbank entities under CFPB §1024 supervisory authority (larger participants in defined markets), the pack carries CFPB exam status, MRA / MRIA-equivalent supervisory letter posture, and any §1031 / §1036 enforcement engagement. The pack should not represent CFPB authority as out of scope for nonbanks; that is a recurring committee misframing.

For in-scope entities, §1033 (open banking, final rule October 2024; **§1033 compliance dates stayed as of October 29, 2025 per Forcht Bank, N.A. v. CFPB; CFPB-initiated reconsideration with ANPR August 22, 2025**) and §1071 (small-business lending data collection; **§1071 revised final rule May 1, 2026 — 1,000 covered transactions, effective June 30, 2026, compliance January 1, 2028 — supersedes 2023 tiered schedule**) implementation status belongs in the regulatory-horizon section. Verify current effectiveness at pack-write time.

### 6. State-licensing posture

Money transmitters and other state-licensed entities carry standing committee content on:

- NMLS license inventory by state and license type (money transmitter, lender, debt collector, mortgage, etc., as applicable).
- State exam status (open exams, recent exam findings, remediation status).
- License renewal and material-change-filing posture.
- Multi-State MSB Examination Program (MMET) coordination status for entities licensed in multiple states.

State-licensing-driven loss events (license suspension, license-revocation proceeding, surety-bond call) belong in material risk events, not as a footnote.

### 7. Cross-link to other capability skills and to sector skills

- KRI commentary for individual RAG-breached metrics: `risk-reporting/skills/kri-commentary`.
- Open-issue write-ups beyond the standing aging summary: `risk-compliance-core/skills/issue-writeup`.
- Payments-specific risk assessment: `payments-fintech-compliance/skills/payments-risk-assessment`.
- Fintech partner controls (sponsor-bank-side review): `payments-fintech-compliance/skills/fintech-partner-controls`.
- Open-banking data controls: `payments-fintech-compliance/skills/open-banking-data-controls`.
- Payment-operations incident review (post-incident): `payments-fintech-compliance/skills/payment-operations-incident-review`.

## Payments-fintech-specific output template additions

Added to the pack (mapped to schema where present):

- `pack_metadata.entity_pattern` — enum (nonbank-fintech / money-transmitter / payments-processor / baas-sponsor-bank / card-program-manager / instant-payments-operator).
- `pack_metadata.cfpb_larger_participant_status` — boolean for §1024 in-scope nonbanks.
- `pack_metadata.nmls_states` — array of states where licensed (for money transmitters and other state-licensed entities).
- `heat_map[]` — payments-taxonomy rows (financial-crime, payments-operations, third-party / sponsor-bank, technology / cyber, consumer-compliance, state-licensing, operational, strategic, reputational).
- `partner_concentration` — object with top-N partner share by deposits / volume / geography / customer base for sponsor banks; or top-N sponsor / processor / BIN-sponsor concentration for nonbank fintechs.
- `nacha_return_rates` — object with current return-rate posture against NACHA thresholds for ODFI and Third-Party Sender programs.
- `state_exam_status` — object with open and closed state exams, MRA-equivalent items, and aging.
- `cfpb_supervision_status` — object with §1024 exam status and §1031 / §1036 enforcement engagement for in-scope nonbanks.

## Common pitfalls in payments-fintech committee packs

- Asserting a federal prudential supervisor for a nonbank fintech where none applies. State DFI / DOB and CFPB are the operative regulators for most nonbanks; the pack should not borrow the bank-style framing without earning it.
- Treating CFPB authority as out of scope for nonbanks. §1024 supervisory authority and §1031 / §1036 enforcement reach apply; the pack carries the posture.
- Reporting BaaS partner concentration without the subcontractor / fourth-party view. The processor, ledger, KYC, and fraud-decision vendor are the four-party pyramid; concentration on a single fourth-party vendor across multiple partners is a recurring committee topic that one-level-deep reporting misses.
- Missing the bank-fintech BSA / AML allocation question. Sponsor banks carry the BSA / AML program responsibility; the pack should be explicit about which entity owns which step (CIP, CDD, BO, transaction monitoring, SAR filing, OFAC screening) and how that allocation is monitored.
- Carrying a generic operational-risk view rather than payments-rail-specific posture. Rail outage, settlement failure, instant-payment fraud, and dispute / chargeback rates are the operative payments lens; the pack carries them by name.
- State-licensing items reported as compliance overhead. License suspension or surety-bond call are material risk events; the pack treats them accordingly.
- §1033 (open banking) and §1071 (small-business data) treated as future-state when they are implementation-active for in-scope entities. The regulatory-horizon section carries the implementation milestones with the verification-flag discipline.
