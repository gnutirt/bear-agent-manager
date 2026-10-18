# Payments-fintech sector overlay for management-response

When the scope record names `payments-fintech` for a management-response engagement, this overlay sets consumer-protection-supervisor, state-money-transmitter-licensor, and bank-partnership conventions for the response artifact.

Loaded by: `management-response/SKILL.md` when `scope.sector_overlay_set` includes `payments-fintech`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- CFPB supervisory communications including Potential Action and Request for Response (PARR) letters, supervisory letters, and examination findings under 12 CFR Part 1090 (consumer-protection supervision over larger participants in defined markets) and the agency's general supervisory authority.
- State money-transmitter examination conventions (vary by state); the Multistate MSB Licensing Agreement Program (MMLA) provides coordination for many state licensees, but the response form follows the lead state's protocol.
- Federal banking agencies' interagency third-party risk management guidance (June 2023) — for findings flowing through a sponsor bank to a fintech bank-partnership program.
- CFPB Compliance Bulletins and Circulars — interpretive guidance frequently cited in CFPB findings.
- State unfair-deceptive-acts-and-practices (UDAP) statutes — for state-attorney-general findings on consumer-conduct issues.

## What changes for payments-fintech-flagged management responses

### 1. Addressee conventions

- **CFPB findings**: addressee is the CFPB supervisory office identified in the communication (typically the assigned examiner-in-charge in the supervisory regional office). Response form follows the CFPB's protocol; PARR letters specifically have a defined response procedure.
- **State money-transmitter examination findings**: addressee is the lead state's Department of Financial Institutions or money-transmitter regulator (varies by state; in some states the Department of Banking or Department of Financial Services). For multi-state coordinated examinations under the MMLA, the lead state convention applies.
- **Sponsor-bank examination findings flowing to the fintech**: addressee is the sponsor bank's designated relationship office (the fintech's response is to the sponsor bank, who carries the response forward to the federal banking agency); the response form follows the sponsor bank's protocol, which typically follows the federal banking agency convention.

### 2. PARR letter convention

The CFPB's Potential Action and Request for Response letter is a distinct supervisory communication where the CFPB notifies the firm that the agency is considering enforcement action and invites a response. PARR responses are counsel-led; the management-response artifact is one input to the counsel-led response, not a substitute for it.

The skill flags PARR letter responses as requiring counsel review and stops if the responding role has not engaged counsel. The action-plan section may be deferred or partial pending counsel direction.

### 3. Sponsor-bank-program findings

For fintech firms operating under a sponsor-bank relationship, findings from the sponsor bank's federal banking agency examination of the bank-partnership program flow through the sponsor bank to the fintech. The response convention follows the sponsor bank's protocol, which typically follows the federal banking agency convention but is filtered through the sponsor bank's relationship-management framework.

The response carries:

- The original finding text from the federal banking agency examination (verbatim, per the standard rule).
- The sponsor bank's communication of the finding to the fintech (verbatim where the sponsor bank's communication adds substance).
- The fintech's action plan, which typically includes both (a) actions the fintech takes directly and (b) actions taken in coordination with the sponsor bank.
- A separate field for the sponsor-bank coordination role (the named contact at the sponsor bank to whom the fintech reports progress).

### 4. State money-transmitter coordination

For multi-state coordinated examinations under the MMLA, the response is typically addressed to the lead state with copies to participating states. The lead-state convention determines the response form, the response window, and the closure procedure. State variations are common; the skill defaults to the lead state's specification.

### 5. Consumer remediation strand

CFPB findings and state-attorney-general findings frequently turn on remediation the firm owes affected consumers in addition to control redesign. The response carries the consumer-remediation strand alongside the control strand:

- Consumer-remediation methodology (how the affected consumer population is identified; what restitution is owed; how restitution is delivered).
- Consumer-remediation timeline (how quickly affected consumers are notified and made whole; consumer-notice form).
- Consumer-remediation reporting (how the firm reports consumer-remediation completion to the supervisor, separately from control-redesign reporting).

The conduct cross-cutting overlay (`references/cross-cutting/conduct.md`) covers this in more depth.

### 6. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack: `risk-reporting/skills/risk-committee-pack` (issues-and-remediation-status section).
- Consumer-conduct overlay: `references/cross-cutting/conduct.md`.
- Privacy overlay where the finding touches consumer data: `references/cross-cutting/privacy.md`.

## Payments-fintech-specific output additions

Added to the response (mapped to schema where present):

- `addressee.addressee_name` — payments-fintech convention names the CFPB supervisory office, the lead state DFI, or the sponsor-bank relationship office, per the finding source.
- `finding_reference.finding_type` — `parr` for CFPB PARR letters; `external-assessor-finding` or `other` for state-money-transmitter examination findings (the schema enum may need extension in subsequent versions).
- `reporting_cadence.frequency` — varies by source; CFPB findings typically quarterly written reports until closure; state findings vary by lead state.
- `linked_finding_ids` — payments-fintech responses commonly cross-link to sponsor-bank examination findings or to state-coordinated findings across multiple state licensees.

## Common pitfalls in payments-fintech-flagged management responses

- Treating a CFPB PARR letter as a routine supervisory finding. PARR letters are counsel-led; the management-response artifact is not the response form for a PARR.
- Sponsor-bank-program response collapsing the federal banking agency finding into the fintech's internal taxonomy. The original federal-banking-agency finding text must be quoted verbatim; the sponsor-bank's filter is documented separately.
- Multi-state response addressed only to the firm's home state. For MMLA-coordinated examinations, the response addressee follows the lead state with copies to participating states.
- Consumer-remediation strand omitted on consumer-protection findings. Findings from the CFPB or state attorneys general frequently turn on consumer remediation; the response carries this strand alongside the control strand.
- Counsel review missing where the finding indicates possible enforcement consideration. CFPB findings can escalate quickly; counsel review is typical, and the skill flags this.
- Personal names in the addressee or signatory blocks. Payments-fintech convention is offices and roles; sponsor-bank relationship contacts may be named by role (e.g., "VP, Bank-Partnership Risk").
