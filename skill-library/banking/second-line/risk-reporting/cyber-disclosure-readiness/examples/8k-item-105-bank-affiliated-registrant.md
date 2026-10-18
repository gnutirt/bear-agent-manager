# Example: 8-K Item 1.05 trigger pack for a bank-affiliated SEC registrant

Public-source-derived, no named institution. The structural reference patterns are public 8-K Item 1.05 filings from calendar year 2024 (the early Item 1.05 filings post-effectiveness, which set the four-element disclosure pattern: nature, scope, timing, material impact / reasonably likely material impact).

Verification posture: the Microsoft 8-K filed January 17, 2024 and the UnitedHealth Group / Change Healthcare 8-K filed February 22, 2024 are public structural references for the four-element pattern. This example does not name either; it adapts the pattern to a hypothetical bank-affiliated registrant. The MGM Resorts 8-K filed September 12, 2023 was a pre-Item-1.05 filing under Item 8.01 and is not an Item 1.05 reference.

## Input

- Institution: a bank holding company SEC registrant with a state-member-bank subsidiary (covered by 12 CFR Part 225 Subpart N), a NYDFS-licensed national-bank subsidiary, a registered broker-dealer subsidiary, and a registered investment adviser subsidiary. Large accelerated filer.
- Engagement scope supplied: primary regulators FRB, OCC, NYDFS, SEC; persona = head of disclosure, with disclosure committee and securities counsel as named reviewers; sector overlays = banking, capital-markets; cross-cutting overlays = cyber (core), privacy.
- Trigger: on Monday morning, the firm's SOC detected unauthorized access to a customer-information system at the broker-dealer subsidiary. Initial scope assessment confirmed access to customer account information (names, account numbers, SSNs); the count of affected customers was estimated at 50,000 to 200,000 and was being refined. The CISO briefed the head of operational risk and the GC office Monday afternoon. The disclosure committee was convening Tuesday morning to discuss materiality.
- Source posture: public (regulatory text); plus firm policy (firm's DCP, the disclosure-committee charter, the materiality-determination protocol); plus system-of-record evidence (incident-response system, materiality-workpaper template, draft 8-K body).
- Filer category: large accelerated filer. The 8-K Item 1.05 is in scope (effective December 18, 2023 for non-SRC filers).

## Output sketch

The skill emits a markdown pack and three structured records (one per artifact, but for this trigger only Artifact A is in scope; Artifacts B and C are referenced but not produced).

Headlines from Artifact A:

- **Cover and clock posture**: incident reference INC-2026-0042; detection Monday 06:14 ET; materiality determination "pending" as of Tuesday 09:00 ET (committee in session); disclosure clock has not started (clock starts at materiality determination, not detection); filing-clock posture = "pending — materiality call in session".
- **Incident timeline** distinguishes knowns (unauthorized access detected Monday 06:14; containment achieved Monday 14:00; vendor incident-response engaged Monday 17:00) from unknowns (full scope; whether SSNs were exfiltrated as opposed to merely accessed; whether other systems were touched; whether the threat actor had broader access than confirmed).
- **Materiality determination workpaper**:
  - Facts: unauthorized access to a customer-information system; 50,000-200,000 customer estimate, refining; access confirmed; exfiltration unconfirmed; containment achieved.
  - Reasonable-investor analysis: applying the TSC / Basic standard, the disclosure committee considers whether a reasonable investor would consider this incident important to an investment decision. Quantitatively the financial impact is modest in isolation; qualitatively the customer-impact count and the reputational dimension are weighty. The probability-magnitude analysis under Basic considers reasonably foreseeable consequences (customer-remediation cost, potential follow-on enforcement actions from NYDFS or SEC, possible class-action exposure).
  - Quantitative impact: financial impact estimate $5M to $25M direct response cost (range; confidence medium); customer-impact count 50,000 to 200,000 (refining); operational-impact summary = customer-information-system access, no operational disruption.
  - Qualitative impact: reputational (high; customer-impact count is the driver); regulatory (NYDFS examination engagement likely; SEC Reg S-P customer-notice trigger likely); strategic (modest); competitive (modest).
  - Aggregation analysis: prior incidents in the period reviewed; one prior phishing campaign in Q1 affected 200 customers and was determined not material on its own; Instruction 1 aggregation analysis under Item 1.05 considered; aggregation conclusion = the prior incident does not aggregate with this one (different threat actor, different attack vector, different system); empty-array aggregation is a stated determination, documented.
  - Determination = pending (committee in session). Once determined, `disclosure_clock_start` populates with the determination datetime and `disclosure_filing_due` computes as 4 business days from that.
- **Item 1.05 disclosure draft (placeholder, pending determination)**: drafted to the four required elements with "to the extent known" framing on scope and impact. Forensic detail (specific systems, threat-actor identification, IOCs, remediation specifics) is held out of the draft.
- **Delay-provision analysis**: not invoked. Rationale: the incident does not pose a substantial risk to national security or public safety. AG notification process not initiated.
- **Parallel-clocks table** (the row securities counsel pulls on first):

  | Regulator | Clock basis | Status |
  |---|---|---|
  | SEC (8-K Item 1.05) | 4 business days from materiality determination | pending (clock not started) |
  | OCC (12 CFR Part 53) | 36 hours from determination of notification incident | NOT-APPLICABLE (national-bank subsidiary not directly affected; incident is at broker-dealer subsidiary) |
  | FRB (12 CFR Part 225 Subpart N) | 36 hours from determination of notification incident | UNDER REVIEW (BHC consolidation question; head of operational risk evaluating whether the broker-dealer-subsidiary incident is material to BHC operations) |
  | NYDFS (23 NYCRR Part 500 §500.17) | 72 hours from determination of cybersecurity event | IN-PROGRESS (NYDFS-licensed national-bank subsidiary; CISO determined cybersecurity event Monday 14:00; clock starts there) |
  | SEC Reg S-P (17 CFR Part 248.30) | 30 days from awareness of unauthorized access (broker-dealer is covered institution) | IN-PROGRESS (Reg S-P clock running from Monday morning detection of unauthorized access; customer-notice content being drafted in parallel) |
  | State breach-notification (CA, NY, TX, IL, MA most cited; full state map TBD) | varies by state | IN-PROGRESS (state-by-state customer count being mapped) |
  | FINRA Rule 4530(a) | 30 days from event (FINRA-member broker-dealer) | UNDER REVIEW (whether 4530(a)(1) regulatory-action trigger applies depends on regulatory-engagement posture) |
  | Counterparty contractual | per contract | IN-PROGRESS (clearing-broker and custodian agreements identified; notifications being drafted) |

  The SEC clock has not started. Several other clocks have. Senior reviewer's job: resolve in parallel.
- **DCP trace**: detection (SOC analyst, Monday 06:14, log pointer); triage (IR lead, Monday 06:30, triage record pointer); containment (IR lead with vendor support, Monday 14:00, containment memo pointer); escalation to second line (CISO to head of operational risk, Monday 14:30, escalation memo pointer); escalation to GC office (head of operational risk to deputy GC for securities, Monday 16:00, escalation memo pointer); escalation to disclosure committee (committee secretary, Monday 18:00, convening notice pointer); materiality call (disclosure committee in session, Tuesday 09:00, meeting minutes pending). The trace is the evidence that DCP functioned for cyber.
- **Sign-off block**: committee chair, securities counsel, CISO, CFO; sign-off date pending materiality determination.
- **Reviewer questions for the disclosure committee**: (1) does the customer-impact-count uncertainty (50K-200K range) prevent a current materiality determination, or is the worst-case basis sufficient under the "to the extent known" framing; (2) does the prior Q1 phishing-campaign aggregation analysis hold given a different threat actor and different system; (3) the Reg S-P 30-day clock has started; should the 8-K filing precede the Reg S-P customer notice or follow it; (4) is the BHC-consolidation question on the federal banking agency 36-hour clock resolved.

## Why this scenario matters

- The 4-business-day clock starts at materiality determination, not at detection. The pack rejects any draft that conflates these; the schema computes `disclosure_filing_due` from `materiality_determination_date`, and the clock-not-started posture is a stated determination.
- Aggregation analysis under Item 1.05 Instruction 1 is surfaced explicitly even when the conclusion is that prior incidents do not aggregate. Empty-array aggregation is a stated determination, documented.
- The Item 1.05 disclosure draft holds to the four required elements only. Forensic detail and remediation specifics are kept out.
- The parallel-clocks table is multi-regulator. The SEC clock is one row among several; for a bank-holding-company registrant with a NYDFS-licensed banking subsidiary and a FINRA-member broker-dealer subsidiary, the count of regulator clocks running on a single incident is high, and the senior reviewer's job is to resolve them in parallel.
- The DCP trace is the evidence that the firm's disclosure controls and procedures functioned for cyber. The trace is what an SEC enforcement question, an examination engagement, or a future MWA-equivalent finding tests.
- Confidence label = medium (scope determination ongoing; customer-impact count refining); human review required = yes; the materiality-call meeting minutes attach the workpaper.

## Anchors

- SEC Final Rule (Release Nos. 33-11216 / 34-97989), Form 8-K Item 1.05, Reg S-K Item 106.
- Exchange Act Rule 13a-15 (DCP).
- TSC Industries v. Northway, 426 U.S. 438 (1976); Basic v. Levinson, 485 U.S. 224 (1988).
- 12 CFR Part 225 Subpart N (FRB Computer-Security Incident Notification Rule).
- 23 NYCRR Part 500 §500.17.
- 17 CFR Part 248.30 (Reg S-P, May 2024 amendments).
- FINRA Rule 4530.

See `references/source-anchors.md` for full citations and verification flags.
