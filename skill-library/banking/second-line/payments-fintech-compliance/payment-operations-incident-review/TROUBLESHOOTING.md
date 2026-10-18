# Troubleshooting: payment-operations-incident-review

Recurring pitfalls. Read before drafting if the engagement looks unfamiliar; consult after drafting if the artifact does not feel right to a senior payments-compliance reviewer or to a sponsor-bank operating-committee reader.

## Engineering post-mortem framing

Symptom: the artifact reads as a chronology with a root-cause appendix. Customer impact, named-rail notification triggers, sponsor-bank reporting, and lessons-learned blocks are short or missing.

Why it fails: the named sections are the centre of gravity for a regulator-facing or sponsor-bank-facing reader, not the technical timeline. An engineering post-mortem is necessary input but not the artifact.

Fix: rebuild against the named-section spine. The chronology is one section among many; the customer-impact, regulatory-notification-triggers, and sponsor-bank-reporting blocks carry the load for the audience this artifact serves.

## Clock-from-detection on the consumer-EFT investigation window

Symptom: the §1005.11 row of the regulatory-notification-triggers block runs the investigation-window clock from incident detection or from confirmed customer impact.

Why it fails: the consumer-EFT investigation-window clock runs from the consumer's notice of error, not from the firm's incident detection or from the confirmed-impact reconciliation. Mis-stating the basis is a near-automatic finding; the CFPB has pursued this in multiple Supervisory Highlights cycles.

Fix: record when each consumer's notice entered the queue, the queue's posture as of incident detection, and the timing exposure on each open claim. The §1005.11 sub-section names the clock-start basis explicitly.

## Missed sponsor-bank contractual clock

Symptom: the sponsor-bank-reporting block names the notification sent date but does not name the contractual deadline or the clock-start basis.

Why it fails: the program-agreement notification clause is contractual, runs independently of any named-rail or regulator clock, and is typically the tightest. The clock-start basis matters: detection-based, control-event-based, and customer-impact-based clocks behave differently. Sponsor-bank TPRM reads this row first.

Fix: record the clause reference, the clock-start basis (per the program agreement), the contractual deadline, the actual notification (channel, addressee role, timestamp), and any supplementary notification. If the deadline was missed, the artifact records it as a finding with a named remediation rather than as an open item.

## Reusing the card-rail recovery template for FedNow or RTP

Symptom: the FedNow or RTP rail row of the affected-transaction-population block carries a chargeback-status column. The faster-payments sub-section of the regulatory-notification-triggers block references chargeback windows.

Why it fails: settlement is final on receipt for FedNow and RTP. There is no chargeback. Recovery is request-for-return-of-funds plus monitoring escalation, and the response is at the receiving institution's discretion. The mechanics, the timing, and the artifact rows are different.

Fix: rebuild the FedNow and RTP rail rows and the faster-payments sub-section against the operative mechanics. Status columns: completed, returned-on-request, declined-on-request, in-flight. The faster-payments sub-section names request-for-return-of-funds posture, ISO 20022 message-field handling, and operating-hours coverage.

## Categorical MSB-vs-not assertion

Symptom: the artifact contains a sentence asserting that "the firm is an MSB" or "the firm is not an MSB" without configuration-specific grounding.

Why it fails: MSB status is fact-pattern-specific against the FinCEN administrative-ruling library. Different configurations of the same product can fall on different sides of the line. A categorical assertion is an examiner-friendly target.

Fix: name the configuration as fact, the determination as a legal question that sits with counsel, and the operative posture (registration on file, written AML program, CIP applicability, SAR-filing chain, state-by-state operational-incident notification triggers) as evidence. The MSB / MTL status note in the artifact carries this discipline.

## Default-to-USA on the state-track notification trigger

Symptom: the state-track row of the regulatory-notification-triggers block carries a single "USA" entry or is omitted because "this is a federal-rule incident".

Why it fails: many state money-transmitter regimes require notification of material operational incidents to the state regulator, often through NMLS. Notification thresholds, content, and timing vary state-by-state. A default-to-USA row hides the state-by-state triggers that an examiner reviewing through NMLS will look for.

Fix: one row per state where the firm is NMLS-licensed and the operational-incident notification trigger is met. Verify state-by-state on the analysis date. Where the trigger is not met, record the row as "not triggered" with the basis; do not omit it silently.

## Closing the incident without forward-control updates

Symptom: the lessons-learned-and-forward-controls block is empty or carries generic language ("review controls in light of incident").

Why it fails: the lesson is the artifact's reason to exist. An incident review that does not produce updates to specific controls in `fintech-partner-controls` or specific risk cells in `payments-risk-assessment` has not closed. The next incident-retrospective cycle will read this gap as evidence the firm is not learning from incidents.

Fix: every closed incident produces at least one named control or risk-cell update. The block records the control reference, the recommended change, the control-design vs control-execution split, the owner role, and the target date.

## Conflating cyber-leg disclosure clocks with payments-operational notification clocks

Symptom: the regulatory-notification-triggers block rolls the SEC Form 8-K Item 1.05 clock, the NYDFS 23 NYCRR Part 500 §500.17(a) clock, the federal banking agencies' 36-hour rule clock, the state breach-notification clocks, the sponsor-bank contractual clock, and the consumer-EFT clocks into a single "regulatory" timeline.

Why it fails: each clock runs independently, has its own clock-start basis, and is filed by a different entity through a different channel. A single timeline hides each clock's posture. The disclosure-track artifact (`risk-reporting/cyber-disclosure-readiness`) handles the public-disclosure leg; the payment-operations-incident-review pack handles the payments-operational chain and flags the cyber leg.

Fix: one sub-section per regime in the regulatory-notification-triggers block. The cyber-leg sub-section carries the parallel cyber clocks separately and cross-references the disclosure-track artifact. The cross-cutting cyber overlay (`references/cross-cutting/cyber.md`) carries the parallel-clock detail.

## Customer-impact population without an identification method

Symptom: the customer-impact block names a population count and dollar magnitude but does not name how the population was identified.

Why it fails: a population stated without an identification method is an assertion, not a finding. A sponsor-bank reviewer or an examiner cannot reconcile against the firm's system-of-record without knowing which method produced the count. A complaint-driven count under-counts; a sample-based count is statistical; a vendor-side report carries the vendor's reconciliation discipline rather than the firm's.

Fix: the customer-impact block names the identification method, the reconciliation method, the reconciliation cadence, the break-resolution log, and the FBO subledger posture during the incident window. A revised population count after reconciliation closure is normal; record both the preliminary and the final with the basis.

## Drafting against the "current edition" of NACHA without the disclaimer

Symptom: the NACHA sub-section of the regulatory-notification-triggers block cites NACHA Operating Rules section numbers without the paywalled-disclaimer. Same pattern for the card-network sub-section against Visa Core Rules / Visa Product and Service Rules / Mastercard Rules.

Why it fails: NACHA Operating Rules and the card-network rulebooks are paywalled. Section numbers and threshold values shift between editions. Without the disclaimer, the citation reads as if it were verified against the current edition when it cannot be (the firm holds the licensed copy; the artifact cites against it conceptually).

Fix: every NACHA citation and every card-network citation carries the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy."

## Drafting the cyber leg as a parallel artifact

Symptom: the artifact carries a full disclosure-decision workpaper, a Form 8-K Item 1.05 disclosure draft, and a 10-K Item 106 governance section.

Why it fails: the disclosure-track artifact lives in `risk-reporting/cyber-disclosure-readiness`. Duplicating that work here pollutes the payments-operational pack and risks divergence between the two artifacts.

Fix: the cyber leg sits as a flagged row in the regulatory-notification-triggers block with the parallel cyber clocks, a cross-link to the disclosure-track artifact, and the named human-review gate (securities counsel, the disclosure committee). The cross-cutting cyber overlay carries the parallel-clock detail.

## Vendor blame without basis

Symptom: the root-cause block assigns the trigger or the contributing factors to a named vendor (processor, ledger provider, KYC vendor, fraud-decision vendor) without naming the basis (vendor incident report, vendor-side log access, vendor post-incident review).

Why it fails: the artifact is a draft that the sponsor-bank reviewer and the firm's counsel will read. Unsupported vendor blame creates litigation exposure and breaks the program-vendor relationship. The risk-management discipline is to record the firm's visibility honestly.

Fix: subcontractor attribution is recorded only where the firm has visibility, with the basis named (vendor incident report on file, vendor-side log access reviewed, vendor post-incident review participated in). Where visibility is limited, the block records that as a gap and names the vendor-management ask. The program operator still owes the customer and the sponsor bank a coherent root cause and a corrective-action commitment from the vendor.

## Engagement scope absent and not flagged

Symptom: the artifact reads as if a formal scope record were on file when it was not.

Why it fails: downstream skills key off the scope record (institution type, primary regulators, sector overlay set, persona, source posture). When scope was not formalised, the pack must say so; otherwise downstream consumers (`payments-risk-assessment` updating after the incident, `fintech-partner-controls` consuming the lessons-learned block) cannot calibrate.

Fix: when the practitioner did not supply a formal scope record, ask the four questions (rails affected, source posture, incident-clock stage, audience) and default to public posture if the practitioner declines. Note in the artifact that scope was not formalised; do not silently apply a default.
