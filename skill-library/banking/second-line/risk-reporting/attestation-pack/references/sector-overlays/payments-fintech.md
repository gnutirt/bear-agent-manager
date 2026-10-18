# Payments-fintech sector overlay for attestation-pack

When the scope record names sector `payments-fintech`, this overlay adds payments and fintech-specific structure and content expectations. Where there is conflict between capability defaults and this overlay, the overlay governs the payments-fintech-sector elements.

Loaded by: `attestation-pack/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`, or when the institution type is a money services business, payment processor, card network participant, or fintech in a sponsor-bank-partnership arrangement.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for payments-fintech attestation packs

### 1. PCI DSS Attestation of Compliance (AOC)

Card-handling entities (merchants, service providers, payment processors) attest annually to PCI DSS compliance via the Attestation of Compliance form. Level 1 merchants and service providers complete the AOC validated by a Qualified Security Assessor; lower-volume entities use a Self-Assessment Questionnaire. The attestation pack typically:

- Organises the control inventory by the twelve PCI DSS requirements (current version v4.0 / v4.0.1; verify at pack-write time).
- Surfaces in-scope cardholder-data environment (CDE) boundaries explicitly.
- Carries the QSA assessment as an evidence-index entry where applicable.
- Anchors to the AOC form structure and to PCI DSS v4.0 / v4.0.1 explicitly.
- Routes to the merchant acquirer or the card brands per the brand's compliance program (Visa, Mastercard, AMEX, Discover, JCB).

PCI DSS v3.2.1 retired March 31, 2024; v4.0 in force with v4.0.1 minor revisions. The new authentication and cryptographic requirements at v4.0 may surface as exceptions where firm-side implementation is in transition.

### 2. Sponsor-bank-partnership attestation linkage

For fintech entities in sponsor-bank-partnership arrangements (BaaS, deposit programs, credit-product partnerships), the sponsor bank is the regulated entity and the fintech operates under contractual flow-down of the sponsor bank's regulatory expectations. The attestation pack for the fintech typically:

- Anchors to the contractual flow-down terms from the sponsor bank's third-party-risk-management requirements.
- Carries process-owner sub-certifications on the operational controls the sponsor bank's third-party oversight tests against (KYC, transaction monitoring, complaint handling, dispute resolution under Reg E or Reg Z, fair-lending screening for credit products).
- Feeds the sponsor bank's vendor-management attestation as a vendor-side input.

The sponsor bank is in scope of the federal banking agencies' interagency third-party risk management guidance (June 2023); the fintech-side attestation supports the bank-side oversight rather than substituting for it.

### 3. State money transmitter and MSB attestation

For state-licensed money transmitters and FinCEN-registered MSBs, attestation expectations vary by state and by FinCEN registration category. Common elements include:

- BSA program attestation under 31 CFR Part 1022 (MSB rule), including the Section 314(a) and (b) processes.
- State surety-bond and net-worth maintenance attestations per the licensing state's requirements.
- Money Transmitter Modernization Act (MTMA) compliance attestations in states that have adopted MTMA.

### 4. Operational resilience attestation under Regulation E and Regulation Z

For payments and consumer-finance products, attestations on Reg E (electronic fund transfers, error resolution, prepaid accounts) and Reg Z (truth in lending, credit cards) compliance are standing obligations. The attestation pack typically:

- Carries process-owner sub-certifications on dispute resolution, provisional credit, error resolution timing.
- Surfaces metrics on dispute volumes, average resolution time, and aging against the Reg E ten-business-day clock.
- Anchors to the relevant subparts of Reg E (12 CFR Part 1005) and Reg Z (12 CFR Part 1026) explicitly in the assertion text.

### 5. Sign-off and review machinery

Payments-fintech attestation packs typically include the General Counsel, the Chief Compliance Officer, the BSA Officer, the CTO or CISO (for technical-control attestations such as PCI DSS), and the CEO at the executive layer. For sponsor-bank partnerships, the pack typically routes to the sponsor bank's vendor-management function as a deliverable to the partnership; the sponsor bank's own attestation chain consumes it.

## What the overlay leaves to the SKILL workflow

This overlay names the payments-fintech-specific anchors and use cases. It does not replicate the workflow steps.
