# Payments-fintech sector overlay for cyber-disclosure-readiness

When the scope names payments-fintech, PCI DSS contractual notification obligations apply on the card-handling side; CFPB supervisory expectations for large nonbanks frame the consumer-facing disclosure posture; and Reg E error-resolution clocks affect customer transactions where a cyber incident causes erroneous or unauthorized transfers.

Loaded by: `cyber-disclosure-readiness/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- PCI DSS v4.0.1 (Payment Card Industry Data Security Standard, current version effective March 31, 2024 through 2025 phase-in for new requirements [verify current version at draft time]). Card-brand contractual obligation, not a regulatory rule directly; enforced through merchant-services contracts, acquirer relationships, and card-brand operating regulations.
- Card-brand operating rules and incident-notification requirements (Visa Core Rules, Mastercard Rules, American Express Operating Regulations, Discover Network Operating Regulations) [verify current versions at draft time]. Each carries incident-notification obligations and forensic-investigation triggers.
- CFPB supervisory expectations for large nonbanks under the Larger Participant Rules and the Section 1024 supervision authority. CFPB has issued circulars and guidance that touch on cyber-program failures and consumer-impact considerations [verify current circulars at draft time].
- Regulation E (12 CFR Part 1005) error-resolution requirements for electronic fund transfers (typically 10 business days for provisional credit on disputed transfers; 45-day investigation for new accounts; 90 days for foreign-initiated or POS errors). Where a cyber incident results in unauthorized EFTs, the Reg E error-resolution clocks apply.
- Regulation Z (12 CFR Part 1026) for credit-card billing errors and unauthorized use; 60-day customer-notice window for billing-error claims.
- NACHA Operating Rules for ACH-related cyber events.
- For state-licensed money transmitters and similar nonbank fintechs: state-specific cybersecurity and incident-notification requirements (varies by state) [verify state-specific rules at draft time].
- NYDFS Part 500 for NYDFS-licensed nonbank entities (some virtual-currency businesses, money transmitters, and fintechs are NYDFS-licensed).

## What changes for payments-fintech-flagged disclosure-readiness work

### 1. PCI DSS contractual notification

For card-handling entities, PCI DSS sets the data-security frame and the card-brand operating rules set the incident-notification obligations. PCI DSS itself is not a regulator-enforced rule; it is a contractual obligation enforced through merchant-services contracts, acquirer relationships, and card-brand operating regulations. Notification clocks vary by card brand and by acquirer agreement.

Typical card-brand-side obligations include:

- Notify the acquirer of any suspected or confirmed account-data compromise as soon as discovered.
- Engage a PCI Forensic Investigator (PFI) for events involving account data compromise.
- Comply with card-brand operating rule timelines for forensic investigation and remediation.

The pack carries the contractual-notification obligations as a row in the parallel-clocks table (labelled "card-brand contractual" with the specific card-brand basis); the regulatory-clock columns (SEC, federal banking agency, NYDFS, Reg S-P, state breach-notification, HIPAA where applicable) carry the regulatory clocks alongside.

### 2. CFPB supervisory expectations

For large nonbanks under CFPB Section 1024 supervision (consumer reporting, debt collection, residential mortgage, payday lending, student loan servicing, auto-loan servicing, large larger-participant categories), CFPB supervisory expectations on cyber-program adequacy and on consumer-facing communications during a cyber incident frame the disclosure posture. CFPB enforcement actions have addressed cyber-program failures.

The Item 106(b) disclosure for a CFPB-supervised nonbank typically references the firm's cyber program in CFPB-aligned terms where applicable.

### 3. Reg E error-resolution for cyber-driven unauthorized EFTs

Where a cyber incident results in unauthorized electronic fund transfers, the Reg E error-resolution timelines apply:

- Customer notice of unauthorized transfer must be received within 60 days of statement transmission to preserve full Reg E protections.
- Provisional credit within 10 business days of receiving customer notice.
- Investigation completed within 45 days (existing accounts) or 90 days (new accounts, foreign-initiated transfers, POS).
- Final resolution and customer notice.

These clocks run on the customer-account side, independent of the registrant-side disclosure clocks. The pack flags Reg E applicability when EFTs are implicated and carries the customer-impact-count drivers in the materiality workpaper.

### 4. Reg Z billing-error resolution for credit-card-related cyber events

Where a cyber incident affects credit-card billing (unauthorized charges, fraud-driven billing errors), Reg Z's billing-error resolution requirements apply:

- Customer notice of billing error within 60 days of statement transmission.
- Acknowledgment of customer notice within 30 days; resolution within 90 days.
- Customer's $50 maximum liability for unauthorized credit-card use.

### 5. NACHA Operating Rules

For ACH-related cyber events (ACH origination, fraudulent ACH transactions), NACHA Operating Rules apply alongside the regulatory clocks. ODFIs (originating depository financial institutions) and RDFIs (receiving depository financial institutions) have specific NACHA-rule obligations on incident reporting and on transaction reversal under specific NACHA rules.

### 6. BaaS and bank-partner concentration

Many fintechs operate via Banking-as-a-Service relationships with chartered banks. A cyber incident at a fintech can affect the bank-partner's customer base; the bank-partner's federal banking agency 36-hour clock can be triggered by an incident at the fintech (through the bank-service-provider 4-hour customer-notification trigger that the fintech-as-bank-service-provider faces, and through the bank-partner's own determination of whether the incident is a notification incident).

The pack flags BaaS-relationship status and surfaces the bank-partner's regulatory-notification path.

### 7. State-licensed money transmitter specifics

State money-transmitter licensing (varies by state) brings state-specific cybersecurity and incident-notification requirements. NYDFS-licensed money transmitters are NYDFS-covered entities subject to 23 NYCRR Part 500. California's Money Transmission Act and similar state regimes carry their own cyber-related expectations. Multi-state-licensed money transmitters map state-by-state.

## Payments-fintech-specific output additions

When payments-fintech is in scope:

- Artifact A's parallel-clocks table includes the card-brand contractual row (Visa, Mastercard, AmEx, Discover as applicable), Reg E error-resolution clocks where EFTs are implicated, Reg Z billing-error clocks where credit cards are implicated, NACHA Operating Rules where ACH is implicated, and state money-transmitter-license-specific rows.
- Artifact A's DCP trace includes the acquirer / card-brand notification stage and the bank-partner notification stage where BaaS applies.
- Artifact B's Item 106(b) draft references PCI DSS-aligned data-security program elements, CFPB supervisory expectations where applicable, and the firm's third-party-bank-partner risk management.
- Artifact B's Item 106(b)(1)(iii) (third-party service-provider oversight) is content-rich for fintechs given heavy reliance on bank partners, payment processors, and shared infrastructure.
- Artifact C's DCP map documents the card-brand notification, bank-partner notification, and consumer-facing communication stages alongside the SEC-disclosure and regulatory-notification stages.

## Common pitfalls

- Treating PCI DSS as a regulatory rule rather than a contractual obligation. The clocks and the enforcement run on a different basis.
- Missing the bank-partner regulatory-notification path for BaaS-relationship fintechs. The bank-partner's federal banking agency 36-hour clock is on the bank's side but is triggered by events at the fintech.
- Conflating the registrant-side disclosure clocks with the customer-side Reg E and Reg Z error-resolution clocks. The two run on different audiences and different content.
- Naming a generic "compliance function" in the Item 106(b) disclosure for a CFPB-supervised nonbank without referencing the CFPB-aligned program elements where the firm operates against CFPB expectations.
- Inconsistency between the PCI DSS-aligned data-security program documentation and the Item 106(b) disclosure narrative on processes, oversight, and controls.
- Treating a cyber incident at a fintech as a fintech-only matter when the BaaS relationship exposes the bank partner's customer base.
- For state-licensed money transmitters: missing state-specific cybersecurity-rule obligations (NYDFS Part 500, California Money Transmission Act, similar state regimes) in the parallel-clocks table.
- Omitting the customer-side communications obligations (Reg E, Reg Z) when the cyber incident has direct consumer-transaction impact. The disclosure-clock posture is one consideration; the consumer-rights posture is another.
