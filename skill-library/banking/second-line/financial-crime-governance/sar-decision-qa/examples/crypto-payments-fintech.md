# Example: crypto-adjacent unusual-pattern alert at a payments fintech with sponsor bank

Public-source-derived. No named institution. The shape mirrors a SAR-decision QA pattern at a payments fintech operating under a sponsor-bank arrangement, where customer-funded card disbursements pass through to a virtual-currency on-ramp showing indicators consistent with sanctions-evasion typologies in published OFAC and FinCEN advisories.

## Input

- **Institution**: a US payments fintech operating consumer prepaid card and account-funding services through a sponsor bank. The fintech runs first-line transaction monitoring; the sponsor bank carries ultimate SAR-filing responsibility under 31 CFR §1020.320 for activity in the bank's accounts. The fintech's BSA officer (designated under the sponsor-bank program agreement) drafts the SAR; the sponsor-bank BSA officer reviews and files. SAR-filing-responsibility allocation is documented in the program agreement.
- **Alert**: an unusual-pattern scenario fires on a consumer customer who, over a 60-day window, funds the prepaid card from multiple low-value sources and disburses the bulk to a virtual-currency on-ramp connected to addresses flagged in commercial blockchain analytics as associated with a mixer service. Aggregate $42k. Customer geography is consistent with US footprint; counterparty addresses show indicators consistent with the typology in FinCEN's advisories on convertible virtual currency [verify advisory dates] and OFAC's sanctions compliance guidance for the virtual currency industry [verify date].
- **Investigation file (closed by the fintech BSA program before QA, prior to sponsor-bank handoff)**:
  - Investigator pulled funding-source detail and on-ramp counterparty detail.
  - Blockchain-analytics report attached: addresses tagged as mixer-adjacent; one hop from a sanctions-listed address per the analytics tool [verify tool's underlying source attribution].
  - Customer-segment refresh review: customer is consumer-grade with no business activity claimed; activity is materially outside profile.
  - Sanctions screening: clear at the customer-name level; no direct match.
  - Negative-news search: clean.
  - Disposition: SAR drafted, recommended for filing; cyber-event structured fields populated; FinCEN convertible-virtual-currency advisory cited in narrative; OFAC virtual-currency guidance cited in narrative; tipping-off considerations noted at program level.
- **Engagement scope supplied**: institution = payments fintech with sponsor-bank arrangement; primary regulators = FinCEN (MSB), state money-transmitter regulators, sponsor bank's prudential regulator indirectly via the program; persona = second-line BSA QA reviewer at the fintech; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = payments-fintech; cross-cutting overlays = cyber.

## Output sketch

The skill produces a QA memo against the SAR draft and decision file. Headlines:

- **Alert summary** — unusual-pattern scenario; aggregate $42k over 60 days; convertible-virtual-currency on-ramp counterparty with mixer indicators; one-hop analytics flag to a sanctions-listed address.
- **Customer and account context** — consumer customer; activity outside profile; no prior SAR history at customer level; segment refresh on file but pre-dates the activity.
- **Investigation steps performed** — six dated, attributed steps with evidence pointers (funding-source pull, on-ramp counterparty pull, blockchain-analytics report, segment review, sanctions screen, negative-news search).
- **Disposition** — `escalated_pending` from the fintech side; the sponsor bank's BSA officer holds the file decision under the program agreement. Filing window: well inside 30 days of detection given the escalation date.
- **Decision rationale** — typology cited as "sanctions evasion via convertible virtual currency"; FinCEN convertible-virtual-currency advisory cited and dated; OFAC virtual-currency-industry guidance cited and dated; narrative ties on-ramp counterparty indicators to the cited typology and to the analytics evidence; `narrative_coherence_label = coherent`.
- **Confidentiality posture** — tipping-off considerations noted at program level only; not assessed for this specific decision (the customer is in dispute over a card-funding hold and there is an active customer-service interaction). `tipping_off_risk_assessed = false` is the QA finding here.
- **Continuing activity posture** — first SAR draft for this customer; cadence not yet set because disposition is `escalated_pending`.
- **QA reviewer findings**:
  - `criterion = confidentiality-tipping-off`, severity material. Tipping-off assessment specific to this decision is not in the file despite an active customer-service interaction; the program-level tickbox does not satisfy the case-specific assessment expected under 31 USC §5318(g).
  - `criterion = advisory-citation`, severity observation. Advisories are cited and dated; OFAC guidance cited but the SAR draft does not flag the OFAC sanctions-evasion path explicitly to the sponsor bank's sanctions officer in the handoff package. The QA recommends adding the sanctions-officer cross-reference; this is a process-change recommendation, not a SAR-filing directive.
  - `criterion = structured-field-completeness`, severity minor. Cyber-event structured fields populated; the cyber-event-indicator subfields could be more specific than the templated language used.
- **Material gaps** — case-specific tipping-off assessment artifact; sanctions-officer cross-reference in the sponsor-bank handoff package; specificity in cyber-event-indicator subfields.
- **Recommendation** — `process_change_recommendation` (case-specific tipping-off assessment must be evidenced in fraud-recovery-overlap and dispute-overlap cases); `escalate_to_sar_review_committee` to consider the sponsor-bank handoff template change (sanctions-officer routing). Explicit note: the QA does not recommend whether to file, decline to file, amend, or supplement the SAR. The sponsor bank's BSA officer holds the file decision; the fintech's BSA officer holds the draft.
- **Source trace** — anchors to `references/source-anchors.md` (FFIEC SAR section, 31 USC §5318(g) confidentiality, FinCEN MSB rules at 31 CFR §1022.320, FinCEN convertible-virtual-currency advisories, OFAC sanctions compliance guidance for the virtual currency industry), `references/sector-overlays/payments-fintech.md` (sponsor-bank SAR-filing-responsibility allocation), `references/cross-cutting/cyber.md` (cyber-typology SAR considerations and sanctions-evasion via virtual currency).
- **Confidence label** — `high` for the QA findings on tipping-off and on the handoff-package gap; `medium` for the structured-field-specificity observation pending sponsor-bank review preference.

## Why this scenario matters

- **Sponsor-bank SAR-filing responsibility allocation is the operative facts pattern at payments fintechs**. The QA must know which entity files and where the handoff happens, and route findings accordingly. The fintech's QA does not direct the sponsor bank's filing decision.
- **The cyber overlay engages even when the alert is routed through a transaction-monitoring scenario, not a cyber-event referral**. Sanctions-evasion via virtual currency is the dominant cyber-typology overlap, anchored to OFAC and FinCEN public guidance.
- **Case-specific tipping-off assessments are the most common confidentiality-posture gap** in fraud-recovery-overlap, dispute-overlap, EDD-overlap, and law-enforcement-liaison cases. Program-level tickboxes do not substitute.
- **Advisory-citation discipline matters in two directions**. Citing an apt advisory is the floor; citing inapt advisories for window-dressing is a separate finding. Date the advisory; treat dated guidance as evidence the typology citation rests on.
- **The recommendation set explicitly excludes the SAR-filing decision itself**. The QA can recommend escalation to the SAR review committee for process change; it cannot direct the SAR-filing decision for this alert.

## Anchors

- FFIEC BSA/AML Examination Manual — Suspicious Activity Reporting section.
- 31 CFR §1020.320 — Reports by banks of suspicious transactions (sponsor bank's filing rule).
- 31 CFR §1022.320 — Reports by money services businesses of suspicious transactions [verify section].
- 31 USC §5318(g) — statutory SAR authority and confidentiality (case-specific tipping-off).
- FinCEN advisories on convertible virtual currency [verify advisory dates].
- OFAC Sanctions Compliance Guidance for the Virtual Currency Industry (October 15, 2021) [verify date].

See `references/source-anchors.md` for full citations.
