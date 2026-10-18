---
name: deposit-operations-controls
description: |
  Drafts the second-line deposit-operations control matrix for a US bank: account opening and CIP, beneficial-ownership collection at deposit channels, account-opening and advertising disclosures, EFT and ATM controls under the consumer-EFT regime, funds-availability holds and exception-hold notification, NSF and overdraft fee disclosure under the truth-in-savings regime, garnishments and levies, escheatment and dormant-account governance, deposit-insurance coverage representation under the federal misrepresentation rule, FBO-account ledgering and pass-through deposit-insurance recordkeeping for sponsor-bank fintech programs, exception handling, access controls, and evidence retention. Audience is the deposit-operations director, the bank's compliance officer, the BSA officer, internal audit, and the federal banking examiner reading the matrix line-by-line.

  Best for:
  - A bank standing up or refreshing the deposit-operations control framework after a process change, a system migration, an internal-audit finding, or an examiner finding.
  - A bank's deposit-operations team preparing for a federal-banking compliance examination touching consumer-EFT, truth-in-savings, funds-availability, or CIP and beneficial-ownership scope.
  - A bank integrating a new sponsor-bank fintech-program FBO account flow and needing the deposit-operations control overlay specific to ledgering, end-user reconciliation, and pass-through deposit-insurance recordkeeping.
  - A bank responding to a finding on dispute-timing failure, NSF or overdraft fee disclosure, hold-policy disclosure, or deposit-insurance representation on consumer surfaces.

  Not the right tool when:
  - The work is the partnership-level review of a fintech relationship (use `bank-fintech-partnership-review`); this skill produces the operations-control matrix once the partnership is in operation.
  - The work is the BSA / AML risk assessment of the customer base or the CDD program design (use `financial-crime-governance/cdd-risk-review`); CIP control activities are in scope here, the AML risk assessment is not.
  - The work is generic risk-control matrix design for a non-deposit process (use `risk-compliance-core/control-matrix` with the banking sector overlay).
  - The work is fair-lending review on overdraft programs or fees (use `consumer-compliance-fair-lending` skills); UDAAP screen rows on overdraft and fee overrides sit here, the fair-lending substantive review does not.
  - The work is incident-specific dispute-handling or hold-release (use `payment-operations-incident-review` for a payments-rail incident; this matrix is the standing control framework, not the incident workflow).
argument-hint: "[institution type, primary federal regulator, deposit scope, FBO program in scope?, process-change trigger]"
---

# Deposit operations controls

The deposit-operations control matrix is the artifact a bank's deposit-operations director, compliance officer, BSA officer, internal auditor, or examiner reads to see whether the bank's controls match the obligations binding on consumer and business deposit accounts. The shape is a matrix, not a narrative: one row per control, denominated by deposit-operations process area, with the standard control-matrix columns (obligation source, control objective, control activity, owner role, frequency, test method, evidence pointer, last test result, design effectiveness, operating effectiveness, open issues, human-review required) plus deposit-operations-specific cross-walks. The skill stops at draft; the deposit-operations director, the compliance officer, or the audit-committee chair attests.

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical deliverable is a Word memo with the matrix embedded (or lifted to Excel for tracker integration), via the `docx` and `xlsx` skills in the `document-skills` plugin. The matrix denominators are the thirteen deposit-operations process areas listed below; do not collapse them into a flat register and do not re-purpose the row vocabulary as generic control language.

## Ask first

Before drafting, get plain answers. Most engagements answer them in the first conversation; default and flag where they do not.

- **What is the institution and the primary federal regulator.** National bank, state-member bank, state-non-member bank, federal savings association, state savings association. The regulator drives the supervisory frame and the examination posture, not the regulation text (the consumer-deposit obligations are federal and apply across charter types). State licensing and state-DFI overlays apply where the bank is state-chartered.
- **What is the deposit-operations scope.** Retail deposit, business deposit, wealth deposit, sponsor-bank fintech program. A sponsor-bank-program scope unlocks the FBO overlay (daily end-user reconciliation, pass-through deposit-insurance recordkeeping, end-user ledger governance). A bank that issues prepaid products unlocks the prepaid-account sub-regime; do not fold prepaid into general consumer-EFT controls.
- **What triggered the matrix refresh.** Policy refresh, system migration, examiner finding, internal-audit finding, partnership change, routine refresh. The trigger sets the audience and the focus on which process areas need the deepest re-papering.
- **Who is the audience and what is the source posture.** Deposit-operations management, compliance committee, audit committee, examiner-response file, board-pre-read. Source posture is one of public-only, public-plus-firm-policy, public-plus-firm-policy-plus-evidence, or connector-aware. Posture sets what the matrix can assert at high confidence and what carries `[evidence needed]`.

When `scope` is supplied, the skill consumes it for institution profile, persona, source posture, sector overlay (always banking for this skill), and cross-cutting overlay set. When it is not supplied, ask the questions and default to public-only; flag the absence in the matrix. Aspirational source posture is not a posture; build the matrix against what the engagement actually has access to today.

## How the matrix gets built

The matrix has the same spine across deposit-operations scopes. A senior reviewer fills it in roughly in the order the engagement and the evidence offer it, not in lockstep. Cite a source from `references/source-anchors.md` for every material claim; mark unsupported items `[evidence needed]`; mark unconfirmed section references `[verify section]`.

The cover sets institution profile, deposit-operations scope, system landscape, source posture, and confidence label. Reviewer questions land here when a scope item is unclear (which charter, which sub-regime, which fintech-program FBO account, which audit-finding under remediation).

The body is the matrix itself, organised by thirteen process areas. Each row carries the standard control-matrix columns plus an obligation-source path back into `references/source-anchors.md`. The denominator is the process area, not a flat register; a pack organised as a flat list reads as a generic controls inventory and not as a deposit-operations matrix. Examiners read it process-area by process-area.

**Account opening and CIP** rows cover identity verification (documentary and non-documentary), government-list comparison, customer notice, and recordkeeping. **Beneficial-ownership collection** rows cover trigger identification for legal-entity customers, certification collection, refresh on triggering events, and recordkeeping; carry the FinCEN beneficial-ownership rule status note where the rule's docket has shifted.

**Account-opening disclosures** rows cover content, timing (before account opening), medium (electronic or paper), and subsequent-disclosure mechanics on fee changes. **Advertising review** rows split into ad-content review (the message), APY-accuracy review (the math), and triggering-term review (when an APY ad triggers additional disclosures); for sponsor-bank programs, an advertising approval-gate row covers the bank's review of fintech-surfaced advertising.

**Consumer-EFT and ATM operations** rows cover initial disclosures, receipts and periodic statements, preauthorised-transfer authorisations, error-resolution intake, provisional-credit timing, investigation completion, notification of results, consumer-liability application, and the prepaid-account sub-regime where applicable. Keep the dispute-timing rows (10 / 45 / 90 business-day windows) and the consumer-liability rows ($50 / $500 / unlimited tiers based on timeliness of consumer notice) as separate rows even when they surface in the same dispute case; conflating them is the most common defect on this process area.

**Funds availability** rows cover hold-policy disclosure, hold application against the general schedule, exception-hold notification, and disclosure-update on hold-policy changes. **NSF, overdraft, and fee disclosure** rows cover the truth-in-savings disclosure regime on fees, periodic-statement fee aggregation, fee-change notice timing, and the UDAAP screen on representment fees, surprise overdraft fees, and authorised-positive-settled-negative fee patterns; cite the current cycle of CFPB Supervisory Highlights and Circular series for the conduct overlay.

**Garnishments, levies, and account holds** rows cover federal-benefit-payment protection rules (the lookback, the protected-amount calculation, the notice to the account holder), state garnishment processing, IRS levy processing, and state-tax levy processing. **Escheatment and dormant accounts** rows cover dormancy classification, customer-contact attempt cadence, state escheatment filing, and reactivation governance for dormant accounts (joint-action requirements on large reactivations).

**Reconciliation and ledgering** rows cover daily ledger-to-GL reconciliation, variance investigation and aging, and (for sponsor-bank programs) FBO-account end-user ledger reconciliation against the fintech-reported ledger plus the pass-through deposit-insurance recordkeeping required to preserve coverage. **Exception handling and overrides** rows cover exception definition by category, override-authority matrix, aggregate-exception reporting cadence, and the UDAAP screen row on overrides that affect customers.

**Access controls and segregation of duties** rows cover privileged-access governance for deposit systems, joint-action requirements for high-risk transactions (large dormant-account reactivation, fraud-loss writeoffs, large funds-availability override), and periodic access recertification. **Evidence retention** rows align retention schedules to the federal recordkeeping requirements per regime (CIP, consumer-EFT, truth-in-savings, funds-availability), and cover system-of-record evidence pointers and the litigation-hold and exam-evidence preservation overlay.

Two deposit-operations rows deserve explicit treatment because they catch most of the recent enforcement themes in this lane.

The first is the deposit-insurance representation row. The federal misrepresentation rule (12 CFR Part 328 Subpart B) prohibits misrepresenting deposit-insurance coverage and provides standards for non-bank entities holding out deposit insurance; the bank's review obligation extends to the customer-facing surfaces of any sponsor-bank fintech program where the bank is named as the insured depository institution. Marketing-claim review against the misrepresentation rule belongs in the advertising-review process area; the customer-facing-surface review belongs in the FBO overlay; the periodic re-attestation belongs in the exception-handling process area as an aggregate report. Carry the row in all three places, not just one.

The second is the overdraft and NSF fee-disclosure row. The CFPB's Circular series and Supervisory Highlights have run continuously on representment fees, surprise overdraft fees, and the authorised-positive-settled-negative pattern; the fee-disclosure-vs-actual reconciliation is the operative test, and the truth-in-savings disclosure mechanic ties to a UDAAP screen on the customer-impact side. Read the row through both lenses; a row that reads only as a truth-in-savings disclosure check misses the conduct lane.

The tail of the matrix carries coverage gaps (obligations with no mapped control), control redundancies (multiple controls testing the same obligation without distinct value), cross-references to obligations and issues elsewhere, the Heightened Standards posture for covered banks (tying deposit-ops controls into the operational-risk and risk-governance framework), recommended owner actions ahead of the next test cycle or examination, the source trace, and the sign-off block.

For sponsor-bank fintech programs, the FBO overlay sits as a sub-section of the reconciliation-and-ledgering process area: daily reconciliation control with risk-based variance threshold, pass-through deposit-insurance recordkeeping status (`documented` / `partial` / `not-applicable` / `gap`), end-user ledger governance (signed attestations from the fintech, independence and authority of the fintech officer signing), and the wind-down sequence tabletop status (cross-link to `bank-fintech-partnership-review` for the partnership-level view). Variance thresholds are risk-based per program; a single dollar threshold across heterogeneous programs is wrong — too tight on a $300M-deposit program, too loose on a $20M-deposit program.

Sector-overlay loading is fixed (banking-only). Cross-cutting overlays load when the scope implicates them. The conduct overlay is default-on wherever the matrix touches consumer-facing decisions on fees, holds, or disputes; the cyber overlay is default-on where deposit systems carry ATM-network, online-banking, or ACH-origination exposure (substantively all engagements); the privacy overlay is default-on where deposit operations handles consumer financial information (substantively all engagements). Climate is not loaded.

What does not flex: every material claim cites a source from `references/source-anchors.md` (or a loaded overlay) by file path; unsupported claims are marked `[evidence needed]` and unconfirmed section references `[verify section]`; the matrix denominator is the thirteen process areas (a generic enterprise-control taxonomy with deposit-flavoured rows dropped in is not this artifact); supervisory guidance is labelled "supervisory guidance" in the obligation-source column with the underlying regulation cited as the binding text; named institutions appear in narrative only when they are public defendants in a finalised enforcement action with a published consent order; the artifact is a draft and the named approver decides.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (federal consumer-EFT regime, truth-in-savings regime, funds-availability regime, CIP rule, beneficial-ownership rule, FBO-account guidance, deposit-insurance regulation, misrepresentation rule, IT-handbook retail payment systems booklet, deposits booklet).
- `references/cross-cutting/conduct.md` — UDAAP themes on overdraft, NSF, junk-fee enforcement, deposit-insurance misrepresentation, dispute-timing failures presented as both consumer-EFT and UDAAP findings.
- `references/cross-cutting/cyber.md` — ATM-network, online-banking authentication, ACH-origination cyber exposure (loaded conditionally — payments-fintech-style overlay, where present).
- `references/cross-cutting/privacy.md` — consumer-financial-information handling under the federal privacy regime (loaded conditionally).
- `references/sector-overlays/banking.md` — banking-only flavour; sector-overlay loading is fixed for this skill.
- `references/firm-overlay.md` — firm-installed taxonomy, named systems-of-record, fee-policy thresholds beyond the regulatory baseline; consumed when present.
- `templates/default-output.md` — matrix template denominated by the thirteen process areas with the FBO overlay as a sub-section.
- `examples/` — public-source-derived scenarios (consumer-EFT dispute-timing control refresh after an internal-audit finding; FBO-account ledgering control overlay for a sponsor-bank deposit program after a peer consent order).
- `TROUBLESHOOTING.md` — recurring pitfalls (conflating dispute-timing with consumer-liability rows; missing the prepaid sub-regime; treating advertising review as a single control; skipping pass-through deposit-insurance recordkeeping on FBO accounts; citing the small-entity compliance guide instead of the regulation; treating exception governance as hygiene; treating supervisory guidance as regulation).

The plugin-level shared references (`references/source-map.md`, `references/policy-control-library.md`, `references/public-regulatory-scenarios.md`) sit at the plugin root and are consulted alongside the skill-level files.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical pair is a Word memo via `docx` plus the matrix as an Excel workbook via `xlsx` (both in the `document-skills` plugin). The artifact carries the cover, the thirteen process-area sections with their rows, the FBO overlay where applicable, and the tail. Roles only, never named individuals; legal-entity placeholders, never named institutions in narrative beyond the public-defendant carve-out. The matrix is a draft until the deposit-operations director, the compliance officer, or the audit-committee chair attests; the skill stops at draft.

Downstream consumers: `risk-compliance-core/obligation-mapping` reads the obligation-source columns to refresh the obligations register; `risk-compliance-core/issue-writeup` reads the open-issues column to refresh individual finding artifacts; `bank-fintech-partnership-review` reads the FBO overlay sub-section for the partnership-level view; `risk-reporting/risk-committee-pack` reads the coverage-gaps and Heightened Standards rows for the standing committee section; `compliance-testing/test-plan-builder` reads the test-method and frequency columns for the testing cycle.
