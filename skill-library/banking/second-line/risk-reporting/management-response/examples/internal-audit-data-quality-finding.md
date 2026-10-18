# Example: management response to an internal-audit high-rated finding on data-quality controls

Public-source-derived. No named institution. Framing patterns from BCBS 239 Principles 2 and 3 (Architecture; Accuracy and Integrity), IIA International Standards (2400 series, Standard 2500.A1), and COSO ERM 2017 Review and Revision component.

## Input

- Institution: large regional bank with material reliance on a credit-loss data warehouse for regulatory reporting (Y-9C, FR Y-14 series, CCAR submissions). The bank is in scope of FRB BCBS 239 supervisory expectations and conducts an annual self-assessment.
- Engagement scope supplied: primary regulator FRB; persona = head of risk reporting, second line, working with the CDO and the head of risk-data engineering; sector overlay = banking; cross-cutting overlays = none (this finding is data-quality-anchored, not cyber, privacy, or conduct); source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- Finding source: high-rated internal-audit finding from the bank's internal audit function, communicated via the audit-report convention with management response due to the audit committee. Finding cites manual reconciliation between two source systems, lack of automated lineage to the regulatory-reporting layer, and absence of a data-quality SLA with the source-system owners.
- Linked artifacts on file: ISS-2025-0301 (manual reconciliation gap); ISS-2025-0312 (lineage gap); the latest BCBS 239 self-assessment which lists these as Principle 2 and Principle 3 priority gaps.
- Acceptance posture: accept, settled with the responding role.

## Output sketch

The skill emits a markdown response and a structured record. Headlines:

- **Cover and addressee** — response date; responding institution; addressee = Audit Committee of the Board (with copy to the Chief Audit Executive and the CRO); reference numbers (the audit report ID; internal issue IDs ISS-2025-0301, ISS-2025-0312); period covered; classification = internal. Addressee paragraph follows audit-committee memorandum convention.
- **Executive summary** — four bullets in the head of risk reporting voice. Headline: full acceptance; root cause named consistent with the BCBS 239 self-assessment Principle 2 and Principle 3 gaps; 7 milestones over 18 months with the data-platform-upgrade dependency surfaced explicitly; quarterly written progress reports to the audit committee until closure.
- **Finding restatement** — verbatim quotation of the audit-report wording, including the audit team's articulation of the three sub-elements (manual reconciliation, lineage, data-quality SLA).
- **Acceptance posture** — accept; rationale brief (no contest).
- **Root cause** — named consistent with the BCBS 239 gap-assessment Principle 2 (architecture) and Principle 3 (accuracy and integrity) gaps. Mechanism: (a) the credit-loss data warehouse was built on a star-schema design pre-dating the regulatory-reporting layer rebuild, and the manual reconciliation persisted because the two source systems were not integrated at the platform level; (b) lineage to the regulatory-reporting layer was documented in a separate data-catalog tool but not generated automatically from the warehouse build process, so lineage and warehouse drifted; (c) the data-quality SLA was treated as a service-management artifact rather than as a data-governance obligation, so the source-system owners had no data-quality-specific commitment in their service agreements. Cross-reference to ISS-2025-0301 and ISS-2025-0312 for the underlying issue write-ups.
- **Materiality and impact** — quantitative estimate of the risk-data restatements over the prior 12 months attributable to the manual reconciliation gap (number of restatements; aggregate restated value); reasonably-foreseeable impact on the BCBS 239 self-assessment rating if not remediated before the next FRB horizontal review (rating downgrade risk on Principles 2 and 3 from amber to red); reasonably-foreseeable impact on the regulatory-reporting attestation cycle. Source trace points to the restatement log and the BCBS 239 self-assessment.
- **Action plan** — 7 milestones over 18 months:
  - Reconciliation automation: 2 milestones (interim daily-batch reconciliation tool by month 6; full integration via the data-platform-upgrade by month 18). Owner: Head of Risk Data Engineering. Dependency: data-platform-upgrade scheduled completion month 16 (named).
  - Lineage automation: 2 milestones (lineage capture from the warehouse build by month 9; full automated lineage to the regulatory-reporting layer by month 14). Owner: CDO. Dependency: warehouse build-process refactor (named); data-catalog tool API enablement (named).
  - Data-quality SLA: 3 milestones (SLA template approval by month 3; SLA execution with the two named source-system owners by month 6; SLA monitoring dashboard live by month 9). Owner: Head of Risk Reporting. Dependency: source-system owner participation (named); service-management governance approval (named).
- **Interim mitigation** — daily reconciliation reviews with documented sign-off, in place for six months pre-finding (this is a pre-existing compensating control; the response surfaces it); weekly data-quality dashboard to the data-management committee; restricted regulatory-reporting attestation cycle pending automated lineage (manual lineage-pack assembled for each filing, with explicit second-line review).
- **Evidence of effectiveness** — post-implementation, two consecutive months at zero unreconciled items on the daily reconciliation; automated lineage report run weekly for two consecutive quarters with zero broken-lineage exceptions; documented data-quality SLA executed with each source-system owner with quarterly SLA-monitoring dashboard reviewed at the data-management committee. Owner role = head of risk reporting; re-test cadence after closure = annual data-quality-control re-test for two years.
- **Reporting cadence** — quarterly written progress reports to the audit committee until closure; reporting role = head of risk reporting. Closure trigger = two consecutive months at zero unreconciled items, two consecutive quarters of clean automated lineage, and SLAs in force with all source-system owners.
- **Linked issues** — ISS-2025-0301, ISS-2025-0312. **Linked findings** — cross-reference to the BCBS 239 self-assessment Top-5 priority gaps (Principles 2 and 3). No prior response on this finding ID (initial response).
- **Sign-off block** — responding role = head of risk reporting; firm-level signatory = CRO (audit-committee response convention does not require a CEO-level signatory for this severity); independent reviewer = head of internal audit (the issuing party signs off the response receipt at the audit-committee meeting).
- **Confidence label** — medium (the data-platform-upgrade dependency is a known programme risk; the action plan is dependency-mapped but the platform timeline could slip).
- **Reviewer questions** — five questions including: data-platform-upgrade timeline confidence; whether the audit committee would prefer a faster interim reconciliation tool ahead of the full integration; the materiality basis on the restatement-log quantification; the SLA-monitoring dashboard governance; the FRB horizontal review scheduling (whether the response timeline aligns with the expected horizontal review).

The response stops at draft. The CRO and the head of risk reporting review before the response is filed with the audit committee.

## Why this scenario matters

- The internal-audit response convention is different from the regulator response convention: addressee is the audit committee (not a regulator office), the response is a memorandum (not a formal supervisory letter), the reporting cadence is quarterly to the audit committee (not monthly to a supervisor), and the firm-level signatory is the CRO (not the CEO or General Counsel). The skill applies these defaults.
- Root cause is mechanism-anchored and cross-references the BCBS 239 self-assessment. The response is consistent with the underlying issue write-ups; the schema validates `consistency_with_issue_writeup`.
- Action-plan milestones carry the data-platform-upgrade dependency explicitly. The platform timeline is a programme risk; the response surfaces it rather than burying it inside an aggregate target date.
- Evidence of effectiveness is distinct from evidence of completion. The two-consecutive-month zero-unreconciled-items target, the two-consecutive-quarter clean-lineage target, and the active SLA monitoring together demonstrate the underlying risk reduction; documentation of the redesigned controls alone would not.
- Interim mitigation includes pre-existing compensating controls. The response surfaces the daily reconciliation reviews already in place; this is normal practice when the gap predated the finding and the firm acted on it before formal communication.
- Confidence label is medium because the platform-upgrade dependency is a programme risk. A `high` label would require demonstrably-stable platform-upgrade timeline, which the firm cannot assert.

## Anchors

- BCBS 239 (January 2013), Principles 2 (Data architecture and IT infrastructure) and 3 (Accuracy and integrity).
- IIA International Standards, Standards 2400 series (Communicating Results) and Standard 2500.A1 (CAE follow-up).
- COSO ERM 2017, Review and Revision component.
- 12 CFR Part 30 Appendix D (OCC Heightened Standards), where applicable to the bank's regulatory framework.
- FRB SR 12-17 (Consolidated Supervision Framework for Large Financial Institutions, December 2012), where the bank's BHC is in scope.

See `references/source-anchors.md` for full citations and verification flags.
