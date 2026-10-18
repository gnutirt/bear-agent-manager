---
name: payment-operations-incident-review
description: |
  Drafts the incident-review pack for a payments-operations event at a fintech program operator, BaaS platform, money transmitter, neobank, wallet, BIN sponsor, or payments processor. The pack carries an incident summary, customer-impact population, named-rail and sponsor-bank notification triggers, root cause, affected transaction population by rail, remediation actions, sponsor-bank reporting, and the regulator-facing artifact list. Output is review-ready for the program operator's second line and for production to the sponsor bank, the named payment-rail authorities (where applicable), and the regulator-facing incident file.

  Best for:
  - An ACH return spike, mis-posted batch, double-debit, stuck FedNow / RTP transfer, faulty Reg E claim queue, card-network fraud-rate or chargeback program escalation, or processor-side outage has happened and second line owns the review pack.
  - A sponsor-bank annual review, internal audit, or examiner data request includes incident retrospectives and the team needs the structured artifact.
  - A subcontractor (processor, ledger provider, KYC vendor, fraud-decision vendor) outage has cascaded into the program operator's customer-impact surface and the team needs the rail-by-rail attribution and notification map.
  - A near-miss has been escalated and second line wants the same structure to evidence the control catch even though no customer was impacted.

  Not the right tool when:
  - The work is a top-down rail-and-segment risk assessment (use `payments-risk-assessment`).
  - The work is a controls inventory or sponsor-bank-facing self-evidence pack (use `fintech-partner-controls`, or `open-banking-data-controls` where the surface is §1033 data flows).
  - The incident is purely cyber with no payments-operational impact and the disclosure-track artifact is what is needed (use `risk-reporting/cyber-disclosure-readiness`). This skill defers the public-disclosure leg to that one and stays focused on the payments-operational chain.
  - The work is a SAR-decision review (use `financial-crime-governance/sar-decision-qa`).
  - The work is enterprise-wide incident management not anchored to payments rails (use the generic incident pattern in `risk-compliance-core` / `compliance-testing`).
argument-hint: "[incident reference, rails affected, customer-impact magnitude, source posture, audience]"
---

# Payment operations incident review

The pack is what a program-operator second line, a sponsor-bank operating committee, an internal auditor, or an examiner reaches for when a payments incident lands. The artifact has named sections — incident summary, chronology, customer impact, affected transaction population, regulatory notification triggers, root cause, remediation, sponsor-bank reporting, network reporting, regulator-facing posture, customer-facing posture, lessons learned — and a structured record. Audience is the head of payments compliance, the BSA officer, the head of operations, the program-operator second line, and on the sponsor-bank side the program-management team and the bank's chief compliance officer counterpart.

This is a payments-incident artifact, not a generic operational post-mortem and not a cyber-disclosure pack. The vocabulary is rails, return-reason codes, dispute-timing windows, settlement finality, request-for-return-of-funds, sponsor-bank notification SLA, FBO subledger reconciliation, customer-impact population, provisional credit. Engineering chronology is necessary input but not the centre of gravity; the centre is the rail-by-rail notification map and the sponsor-bank reporting chain. Where the incident has a cyber leg with public-registrant disclosure reach, the pack flags it and cross-references `risk-reporting/cyber-disclosure-readiness` for the disclosure-track artifact rather than duplicating that work.

The pack is a draft. The named approver — head of payments compliance, BSA officer, sponsor-bank operating committee, head of operations, internal audit on retrospective review — decides.

## Ask first

Most of the spine is set by the incident itself and the source posture. A few things settle before drafting.

- **Which rails were affected and which customer surface bore the impact.** ACH, Same Day ACH, wire (Fedwire / CHIPS), card debit, card credit, FedNow, RTP, P2P, check, cross-border correspondent, virtual-currency on-ramp. The rail set determines which named-rule clocks apply, which recovery mechanic is available (chargeback vs request-for-return-of-funds), which sponsor-bank reporting clause triggers, and which network or scheme reporting is owed. Multi-rail incidents need the rail-by-rail attribution upfront; rolling them into one population is the most-frequent rework cause.
- **What is the source posture for the chronology.** Is the practitioner working from the firm's incident-management ticket, processor-side logs, sponsor-bank-side incident reports, customer-complaint records, or a public statement only. Posture sets evidence asks and the confidence the chronology can carry. Aspirational posture is not a posture.
- **Where is the incident on the clock today.** Detected, contained, customer-impact-reconciled, sponsor-bank-notified, remediated. The pack content shifts with the stage; pre-reconciliation work is chronology-and-population-heavy and remediation-light, post-reconciliation work is the inverse. The named-rail notification clocks and the sponsor-bank notification clock run independently; the pack tracks each.
- **Who is the audience and what is the read-out cadence.** Program-operator second line, sponsor-bank operating committee, sponsor-bank TPRM, internal audit, board risk committee, regulator-facing file (sponsor-bank-mediated, CFPB direct under the larger-participant rule, state-MTL via NMLS). Audience drives length and tone, not content; the named sections stay.
- **Is there a cyber leg.** A processor-side ransomware event, a credential-stuffing wave, a vendor-side data exposure, an operator-side breach can all sit underneath a payments-operational incident. If the firm or its sponsor bank is a public registrant, the cyber leg has public-disclosure reach. Flag it here; the disclosure-track artifact lives in `risk-reporting/cyber-disclosure-readiness`.

When `scope` (per `risk-compliance-core/scoping`) is supplied, the skill consumes it (`institution.type`, `institution.primary_regulators`, `sector_overlay_set`, `cross_cutting_overlay_set`, `persona.role`, `source_posture`). When it is not, the skill asks the four questions above and defaults to public posture if the practitioner declines. Note in the artifact that scope was not formalised.

## How the pack gets built

The pack has the same spine across incident types. A senior reviewer walks it roughly in the order the incident itself unfolded, not in lockstep. Cite a source from `references/source-anchors.md` (or a loaded overlay) by file path for every material claim; mark unsupported items `[evidence needed]` rather than letting them pass.

The **incident summary** is one paragraph. Rail or rails affected, product, customer-impact magnitude (population count and dollar value, even rough), incident-management status, whether the sponsor-bank notification clock has been triggered, whether any named-rail notification clock is in flight. This is the read securities counsel and the sponsor-bank chief compliance officer counterpart use to triage.

The **chronology** is timestamped end-to-end from first signal through customer-facing remediation. Each row carries timestamp_local, timestamp_UTC, actor (role, not person; subcontractor name where applicable), action, system or rail touched, evidence reference. The chronology distinguishes what is observed from what is inferred and from what is unknown; the unknowns drive the open-questions block. Subcontractor touchpoints (processor, ledger provider, KYC vendor, fraud-decision vendor, sponsor-bank operations) are explicitly named at each step where they sit in the chain.

The **customer impact** block names the population count, dollar magnitude, geographic breakdown by US state and corridor where cross-border, and segment breakdown where relevant (consumer, SMB, payroll-on-demand, gig disbursement, BNPL, cross-border remittance, high-risk vertical). It also names how the population was identified (full-population reconciliation against the system-of-record vs sample-based vs complaint-driven) and how the reconciliation closed. A population stated without an identification method is not a finding; it is an assertion.

The **affected transaction population** is the rail-by-rail breakdown. One row per rail in scope. Columns: volume, value, status (completed / reversed / re-initiated / still in flight / written off), source-system reference. The rail-by-rail view is what the sponsor bank's program-management team reconciles against its own reporting feed and what the named-rail authority sees if a network or scheme reporting line is owed.

The **regulatory notification triggers** block carries one sub-section per applicable regime. The sub-sections are explicit per source rather than rolled into a single "regulatory" line; the triggers run independently and treating them as one line is the most-frequent finding in this lane.

- **Reg E triggers** — the consumer-EFT error-resolution clocks under the named consumer-EFT rule. The investigation-window clock, the provisional-credit clock for extended investigations, and the new-account / POS / foreign-initiated extended clock all run from the consumer's notice, not from incident detection or confirmed impact. The pack records when consumer notices entered the queue, the queue's posture as of incident detection, and any timing exposure.
- **NACHA triggers** — return-reason coverage, reversal-mechanic eligibility (Originator-initiated reversals carry tight windows), Same Day ACH cutover and per-transaction-limit posture, ODFI return-rate threshold posture (administrative, overall, unauthorised). The named-rail rule is paywalled; cite to the firm's licensed copy with the disclaimer.
- **Card-network triggers** — chargeback-window posture per dispute-reason code, fraud-rate program and chargeback-rate program escalation thresholds at the firm-program level. Card-network rulebooks are paywalled; cite conceptually with the disclaimer.
- **Faster-payments triggers** — for FedNow and RTP, settlement-finality irrevocability is the operative fact. Recovery is request-for-return-of-funds plus monitoring escalation, not chargeback. The pack names the request-for-return-of-funds posture, ISO 20022 message-field handling where the bad value sat in a specific field (creditor account, end-to-end ID, structured remittance information), and operating-hours coverage of the response.
- **Sponsor-bank notification trigger** — the program-agreement clause, the contractual clock (typically tighter than any named-rail clock; often runs from detection or from confirmed control event rather than from confirmed customer impact), what was sent, when, by whom, against which clause. The contractual clock is the row sponsor-bank TPRM reads first; missing it is the second-most-frequent finding behind the Reg E clock-from-detection error.
- **State-track notification trigger** — many state money-transmitter regimes require notification of material operational incidents to the state regulator, often through NMLS. The pack carries one row per state in scope where the incident reaches reportable thresholds; thresholds vary state-by-state and require verification on the analysis date.
- **Cyber-leg triggers, if any** — public-registrant disclosure clocks, state regulator cyber-incident clocks, sponsor-bank prudential cyber-notification clocks, state breach-notification clocks. The pack records the analysis here and cross-references `risk-reporting/cyber-disclosure-readiness` for the disclosure-track artifact; the cross-cutting cyber overlay (`references/cross-cutting/cyber.md`) carries the parallel-clock detail.

The **root cause** block separates trigger from contributing factors and distinguishes control-design failures from control-execution failures. Subcontractor-side root cause is included where the firm has visibility (vendor incident report, vendor-side log access, vendor post-incident review). The block does not assign blame to a vendor without a basis; if visibility is limited, the block records that as a gap and names the vendor-management ask. Configuration questions (the program-agreement clause-set, the in-flight rail set, the geography footprint) sit beside engineering questions (the failed deployment, the misconfigured rule, the missed alert).

The **remediation actions** block is structured into immediate, short-term, and structural. Each row carries action, owner role, target date, status, and the control reference (the named control in `fintech-partner-controls` or in `payments-risk-assessment` that this remediation updates). Control-design changes (a new control needed) are distinguished from control-execution fixes (the existing control did not fire). The block does not approve or commit on behalf of vendors; vendor-side actions are recorded as commitments to be confirmed.

The **sponsor-bank reporting** block names what was sent, when, by whom, against which program-agreement clause, channel, and current status. A second row records what is still owed (the post-incident review report, the remediation-tracker update, the next operating-committee read-out). The sponsor-bank reporting chain is contractual and runs independently of any regulator-facing chain.

The **network or scheme reporting** block applies where the rail set requires it: network monitoring program reporting where the incident touched the program threshold, faster-payments scheme operational-incident reporting where the rail's operating procedures require it, NACHA Risk Management Framework reporting where the incident sits inside the framework's scope. Most incidents do not trigger every line; the block records what does and what does not, with the basis.

The **regulator-facing posture** block lists the regulator-facing artifact set (incident report to the state-MTL via NMLS, response file for a sponsor-bank-mediated examiner inquiry, response file for a CFPB EXAMS inquiry where the larger-participant rule designates the firm). Each artifact carries a named human-review gate before any outbound; the named approver — the head of payments compliance, the BSA officer, securities counsel where the cyber leg has public-disclosure reach, the sponsor-bank-side reviewer — decides.

The **customer-facing posture** block records the customer-notification language drafted, the channel (in-app, email, statement insert, regulatory-required disclosure form), the population covered, the date, and the status. It also records the error-resolution status (open consumer-EFT claims, provisional-credit posture, fee-reversal log) and any closed-account or hold-release commitments. Customer-facing posture is what a state-AG inquiry or a CFPB Supervisory Highlights desk-review reads; vague language ("we are addressing the issue") is a finding.

The **lessons learned and forward controls** block ties the incident back to specific controls in `fintech-partner-controls` or risk cells in `payments-risk-assessment`. Each row names the control reference, the recommended change (control-design vs control-execution), the owner role, and the target date. The lesson is the artifact's reason to exist; an incident review that does not produce control updates has not closed.

The artifact closes with **open items and named follow-ups**, **gaps**, the **recommended disposition** (`closed`, `monitoring`, `open-remediation`, `escalate`), and **source citations with date**. The named-rail rule citations carry the disclaimer "current edition; specific sections to be confirmed against the firm's licensed copy" wherever the named-rail rule is paywalled.

## Quality bar

- Every material claim cites a source from `references/source-anchors.md` (or a loaded overlay) by file path. Unsupported claims are marked `[evidence needed]`.
- The consumer-EFT error-resolution clock runs from the consumer's notice, not from incident detection or confirmed impact. Mis-stating that is an automatic finding; the chronology and the Reg E triggers block separate the two.
- The sponsor-bank notification clock is contractual, runs independently of any named-rail or regulator clock, and is typically the tightest. The pack records the clause, the clock-start basis (detection vs confirmed control event vs confirmed customer impact), the deadline, and the actual send.
- Faster-payments rails (FedNow, RTP) carry settlement-finality irrevocability. The recovery mechanic is request-for-return-of-funds, not chargeback. The pack does not reuse the card-rail recovery template for these rails.
- Subcontractor attribution is named where it sits in the chain, with vendor-side root cause recorded only where the firm has visibility. The program operator still owes the customer and the sponsor bank a coherent root cause and a corrective-action commitment from the vendor.
- The MSB / MTL configuration is fact-pattern-specific against the named MSB-rule administrative-ruling library and the state-by-state MTL footprint. Categorical "the firm is / is not an MSB" assertions in the artifact are wrong.
- Named institutions appear in narrative only when they are public defendants in a finalised enforcement action with a published consent order.
- The skill stops at draft. The named approver decides.

## Adaptation

Pack depth and length scale to the trigger and the audience. A sponsor-bank operating-committee read-out runs longer than a quarterly internal-audit retrospective. A near-miss pack carries the same named sections but with the customer-impact population at zero and the lessons-learned block as the centre of gravity. A multi-rail incident keeps the rail-by-rail breakdown visible at every relevant block; a single-rail incident collapses the unused rail rows to status lines.

Sector overlay loading is fixed (this skill is in the payments-fintech sector flagship; the overlay is `references/sector-overlays/payments-fintech.md` and is required-on for every engagement). Cross-cutting overlay loading: cyber is required-on for any incident touching processor / ledger / fraud-decision / sanctions-screening / KYC vendor exposure (substantively all of them) and for any incident with a cyber leg; privacy is required-on where the incident touched personal data; conduct is recommended where the customer-impact pattern maps to UDAAP themes (mis-applied holds, account closures, mis-disclosed fees, missed dispute timing).

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/payments-fintech.md` — payments-fintech sector flavour (rail-specific notification mechanics, sponsor-bank notification chain, faster-payments recovery mechanics, named-rail authority reporting lines).
- `references/cross-cutting/cyber.md` — cyber-leg parallel clocks, sponsor-bank prudential cyber-notification clock, vendor-stack cyber posture; cross-link to `risk-reporting/cyber-disclosure-readiness` for the public-disclosure artifact.
- `references/cross-cutting/privacy.md` — personal-data leg, state breach-notification clocks, the named GLBA Safeguards incident-response posture, §1033 implications where authorisation flows or developer-interface tokens were involved.
- `references/firm-overlay.md` — firm-installed program-agreement clause-set, named runbooks, named approver chain; consumed when present.
- `templates/default-output.md` — incident-review pack template (named sections; markdown is the content spec, the deliverable is a Word memo).
- `examples/` — public-source-derived scenarios (mis-applied ACH return batch causing consumer-EFT timing exposure; FedNow outage with payroll-on-demand fall-back to Same Day ACH).
- `TROUBLESHOOTING.md` — recurring pitfalls (engineering post-mortem framing; clock-from-detection on the consumer-EFT clock; missed sponsor-bank contractual clock; reusing card-rail recovery template for faster-payments; categorical MSB assertions; closing without forward-control updates).

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/public-regulatory-scenarios.md`) sit at the plugin root and are consulted alongside the skill-level files.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical deliverable is a Word memo via the `docx` skill in the `document-skills` plugin, with rail-by-rail population tables that can lift to Excel for sponsor-bank reconciliation. The plugin README names `document-skills` as a companion plugin.

Downstream consumers — `payments-risk-assessment` (to update the rail / segment / geography baseline after the incident), `fintech-partner-controls` (to update the program-agreement-mapped controls inventory after the lessons-learned block lands), `risk-reporting/cyber-disclosure-readiness` (where the cyber leg has public-disclosure reach) — read the named blocks directly. The named-section structure is the cross-skill contract.
