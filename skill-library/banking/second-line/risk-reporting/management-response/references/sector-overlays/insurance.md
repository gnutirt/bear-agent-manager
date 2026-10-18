# Insurance sector overlay for management-response

When the scope record names `insurance` for a management-response engagement, this overlay sets state-DOI-shaped and NAIC-peer-review-shaped conventions for the response artifact.

Loaded by: `management-response/SKILL.md` when `scope.sector_overlay_set` includes `insurance`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- State Insurance Department examination conventions vary by lead state; the NAIC Financial Condition Examiners Handbook sets the framework most state DOIs follow but does not bind the response form, which is the lead-state DOI's call.
- NAIC Risk Management and Own Risk and Solvency Assessment Model Act (#505) and ORSA Guidance Manual — for findings touching the firm's ORSA framework or the ORSA Summary Report content, the response references the Model #505 framework.
- NAIC Insurance Holding Company System Regulatory Act (Model #440) — for findings touching the holding-company-level risk reporting expectations.
- NAIC Accreditation Standards — for findings flowing from NAIC accreditation peer reviews of the lead state's regulatory program (these are the lead state's findings, not the firm's, but the firm may be in scope as a sample subject).
- NAIC Insurance Data Security Model Law (Model #668) — for cyber-related insurance examination findings in adopting states.

## What changes for insurance-flagged management responses

### 1. Addressee conventions

- **Lead-state DOI findings**: addressee is the lead state Insurance Department's named examination office (e.g., "Insurance Department of [state], [bureau]"). The response form follows the lead state's examination protocol; common forms include a written response appended to the examination report and a separate corrective-action plan.
- **Multi-state coordinated examination findings**: where multiple state DOIs participated in the examination, the response is typically addressed to the lead state with copies to participating states. The lead-state's communication identifies the addressee convention.
- **NAIC-led findings**: where a finding is communicated through an NAIC committee or working group (less common; the firm is typically in scope as a sample subject of an accreditation review or a Holding Company Working Group review), the addressee is the NAIC committee chair via the lead state.

### 2. Severity convention

State DOI examination findings are typically less stratified than the federal-banking-agency MRA / MRIA distinction. Common conventions:

- **Recommendations** — informal observations that the firm is expected to consider but not required to remediate; the response may acknowledge without a full action plan.
- **Required corrective actions** — formal findings the firm is required to remediate; the response carries the full action-plan, evidence-of-effectiveness, and reporting-cadence sections.
- **Material findings** — the most serious tier (used variously by states; some use "material adverse findings" or similar terms); the response carries a more rapid cadence and a more senior firm-level signatory (commonly the President or CEO of the regulated entity in addition to the responding role).

### 3. Linkage to ORSA framework

For insurers above the Model #505 premium threshold ($500 million single insurer, $1 billion group as adopted by most states), findings that touch the risk-management framework or the ORSA process typically require the response to acknowledge:

- Which ORSA Summary Report section the finding relates to (Section 1 Description of the Insurer's Risk Management Framework; Section 2 Insurer's Assessment of Risk Exposure; Section 3 Group Risk Capital and Prospective Solvency Assessment).
- Whether the next ORSA Summary Report will reflect the remediation; if not, the response identifies the timing relative to the next filing.
- Whether the finding implicates the firm's risk-management policies, in which case the policy revision is itself a milestone in the action plan.

### 4. Linkage to Holding Company supervision

For insurance holding companies in scope of Model #440, findings touching enterprise-risk-management at the holding-company level typically require the response to acknowledge:

- The Form F (Enterprise Risk Report) implications, where the finding affects content in or omitted from the Form F.
- The lead-state coordination implications, where the finding affects entities in multiple states.

### 5. Cross-link to other capability skills

- Underlying issue write-up: `risk-compliance-core/skills/issue-writeup`.
- Standing committee pack carrying the finding ageing: `risk-reporting/skills/risk-committee-pack` (issues-and-remediation-status section).
- Cyber findings (where Model #668 or Part 500 applies): `references/cross-cutting/cyber.md` and `risk-reporting/skills/cyber-disclosure-readiness`.

## Insurance-specific output additions

Added to the response (mapped to schema where present):

- `addressee.addressee_name` — insurance convention names the lead state DOI examination office; for multi-state examinations, the participating states are listed in the addressee block as copy recipients.
- `finding_reference.finding_type` — insurance findings often map to "external-assessor-finding" in the schema enum where the regulator is a state DOI; alternatively, the firm may set its own internal taxonomy and use "other" with a free-text label.
- `reporting_cadence.frequency` — typically aligned to the firm's ORSA filing cycle (annual) for ORSA-related findings, with interim updates as the lead state requests.
- `linked_finding_ids` — for multi-state examinations, the response cross-links to any related findings from participating states.

## Common pitfalls in insurance-flagged management responses

- Treating a state DOI examination finding as a federal-banking-style MRA. The conventions are different; the response form follows the lead state's protocol, not the SR-13-13 framework.
- Missing the ORSA linkage on Model #505-relevant findings. Findings that touch the ORSA framework should reference the relevant ORSA Summary Report section explicitly.
- Missing the lead-state convention for multi-state coordinated examinations. The response addressee, copy recipients, and cadence follow the lead state's specification.
- Treating Holding Company supervision as out of scope when the finding touches enterprise-risk-management at the parent. Form F implications are typically a topic the lead state will press on at the holding-company level.
- Personal names in the addressee or signatory blocks. State DOI convention is roles and offices, not personal names.
