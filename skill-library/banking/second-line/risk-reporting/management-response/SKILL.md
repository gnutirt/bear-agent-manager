---
name: management-response
description: |
  Drafts the management response to a regulator finding, an internal-audit finding, or an external-assessor observation: acceptance posture, root-cause acknowledgement, action plan with milestones and owners, interim mitigation, evidence-of-effectiveness plan, reporting cadence to the issuing party, and the linkage to the underlying issue write-up. The response is the load-bearing artifact a head of regulatory affairs, head of compliance, CRO, or general counsel takes back to the regulator or to the audit committee after qualified review.

  Best for:
  - Drafting the management response to a supervisory finding from a federal banking agency in the formal-letter format the regulator expects.
  - Drafting the management response to an internal-audit finding for the audit committee response file.
  - Drafting the management response to an external-assessor observation (SOC auditor, IIA peer review, third-party regulatory engagement).
  - Drafting the management response to a consumer-protection or markets-conduct supervisory finding, an examination deficiency letter, or a self-regulatory-organisation exam finding.
  - Refreshing a prior response on the same finding ID where remediation has slipped or scope has changed and an updated commitment is required.

  Not the right tool when:
  - The artifact is the underlying issue write-up itself (use `risk-compliance-core/skills/issue-writeup`; this skill consumes its output and validates consistency).
  - The artifact is the standing committee pack tracking issue ageing across the open population (use `risk-committee-pack`; the issues-and-remediation-status section consumes responses produced here).
  - The artifact is a public regulatory response forming part of a published enforcement action (these are securities-counsel-led; this skill is the second-line draft, not the final published response).
  - The artifact is the annual SOX 404 management's report on internal control over financial reporting (out of scope; securities-counsel-led).
  - The work is enforcement-action negotiation. Where the matter has escalated to a formal enforcement action, securities counsel and outside counsel lead; this skill drafts second-line responses to supervisory findings and audit findings, not consent orders.
argument-hint: "[finding text or pointer; finding type (regulator / audit / external); linked issue ID; scope ID or institution context]"
---

# Management response

The response is what a regulator, an audit committee, or an external assessor reads when the firm formally acknowledges a finding and commits to a remediation path. It is regulator-letter-shaped: cover, addressee, finding restatement verbatim, acceptance posture, named root cause, materiality and impact, action plan with milestones, interim mitigation, evidence-of-effectiveness plan, reporting cadence, linked issues, and a sign-off block. Internal-audit and external-assessor variants reuse the same shape with a different cover and addressee; the spine does not change.

This is a regulatory-affairs and risk-reporting artifact, not the underlying issue write-up. The issue write-up names the condition, criteria, cause, and impact for the firm's own books. The response carries that material across to the issuing party in the form the issuing party expects, with the commitments the firm intends to be held to. The two artifacts must be consistent; the schema validates the cross-reference.

The response is a draft until the responding role and the firm-level signatory attest. The skill stops at the draft.

## Ask first

Most of the spine is set by the finding itself and the engagement context. A few things settle before drafting:

- Which finding type. Supervisory finding from a prudential regulator, supervisory finding from a markets or consumer regulator, internal-audit finding, external-assessor observation, self-identified issue logged for response. The type drives the addressee, the formal-letter conventions, the expected response window, and whether the response is named on a regulator-style finding-ID convention or an internal-audit-report convention.
- Where the finding sits on the supervisory-severity ladder. The banking-supervision frame distinguishes Matters Requiring Attention from Matters Requiring Immediate Attention; markets and consumer supervisors use parallel constructs. The higher-severity tier carries a more rapid response expectation, board-level attention, a senior firm-level signatory, and a tighter reporting cadence to closure. Defaults differ by tier; the skill enforces them.
- What the acceptance posture is. Accept is the most common but not the only valid posture; partial acceptance and contest are valid where the firm has named rationale and named risk-acceptance approval. The posture cannot be drafted around; it has to be settled with the responding role before the action plan is committed.
- Whether a prior response exists on the same finding ID. Slippage is a common pattern; a refreshed response must explicitly acknowledge the prior commitment, the slippage, and what changed. Silently revising the prior commitment fails the supervisor's expectation that the firm manages, not just counts, the open population.
- What the source posture is for the supporting evidence. Materiality and impact statements are frequently challenged on evidence; the source posture sets what the response can claim and what carries `[evidence needed]`.

When the scope record is supplied, the skill reads `institution.type`, `institution.primary_regulators`, `persona.role`, and `confidentiality_posture` from it. Otherwise the skill works with what the practitioner names and flags the rest.

## How the response gets built

The response has the same spine across finding types, with cover and addressee flexing for the issuing party. The order below is roughly how a head of regulatory affairs or head of audit response walks it; in practice sections fill out as the responding role and the linked issue write-up land.

Start with the cover and the finding restatement. The cover names the response date, the responding institution, the addressee (the regulator office, the audit committee, or the external assessor), reference numbers (the issuing party's finding ID, the firm's internal issue ID, the audit-report reference), the period the finding relates to, and the classification. Finding restatement quotes the issuing party's wording exactly; deviation from the original wording is a frequent challenge from the issuing party and reads as a softening attempt.

Acceptance posture is one of accept, partially accept, or contest. Accept is the most common; the response carries the named acceptance with the responding role's voice. Partial acceptance and contest carry named rationale and a named risk-acceptance approval; the schema fails the response without `risk_acceptance` populated. The posture is the responding role's call, not the drafter's; the skill surfaces the choice and stops if the posture has not been settled.

Root cause is the named, mechanism-anchored statement of why the finding occurred. The root cause is not a paraphrase of the finding; a finding that says "the firm's third-party-risk-management ongoing-monitoring controls are inadequate for critical fourth-party dependencies" is not closed by a root cause that says "ongoing monitoring of fourth parties is inadequate". The mechanism-anchored statement names what in the firm's process produced the gap (the fourth-party identification process did not extend to operationally-critical sub-providers; the exit-test cadence in the policy was annual but had slipped to ad-hoc; the board pack's third-party section did not surface concentration metrics). The root cause must be consistent with the linked issue write-up; the schema validates.

Materiality and impact carries the current impact and the reasonably-foreseeable impact, with a quantitative estimate where one is available. This is the section the issuing party reads for whether the firm understands the finding's significance; vague impact statements draw follow-up. Where the impact is quantified, the source trace points to the loss-event log, the operational-risk capital model, the regulatory-capital impact estimate, or the customer-impact tally.

The action plan is the load-bearing section. Each milestone has an action description, a named owner role (never a personal name), a target date, dependency identifiers, and the evidence-of-completion expected at the milestone. A milestone without dependencies is brittle and frequently slips; the schema requires either named dependencies or an explicit no-dependencies assertion. Owners are roles because personnel change; the responding role and the responsible function persist.

Interim mitigation covers steps already taken before the formal response date and any compensating controls in place pending full remediation. The issuing party reads this section for whether the firm has acted on the finding while the action plan completes; a response with no interim mitigation on a higher-severity tier reads as deferral.

Evidence of effectiveness is distinct from evidence of completion. Completing an action is not the same as resolving the underlying risk. The evidence-of-effectiveness plan names the method (control test, KRI trend, external validation, supervisor walk-through), the period over which the evidence will be observed (commonly two consecutive quarters or two consecutive monthly readings, depending on the metric cadence), and the owner role for the evidence run. This section is the principal control on action-completed-without-risk-resolved closure.

Reporting cadence to the issuing party names frequency and form (written progress report, committee update, supervisory meeting, on request) and the named reporting role. Defaults flex by finding tier; the skill applies tier-specific defaults and surfaces them for the responding role to confirm. A response with no reporting cadence reads as "we will keep you informed" and fails the issuing party's expectation that the firm carries the closure burden.

Linked issues and dependencies cross-references the underlying issue write-ups (foreign keys to `issue.schema.json`) and any other open findings that share root cause or remediation actions. Where the response is the latest in a sequence on the same finding ID, the prior-response history goes here with the slippage commentary.

The sign-off block names the responding role and the firm-level signatory where applicable. The firm-level signatory is more senior on higher-severity tiers; for the highest-severity supervisory tier the signatory is typically the CEO or the General Counsel, for an internal-audit high-rated finding the signatory is typically the responding executive. The reviewer questions list closes the body: questions the responding role expects from the issuing party in follow-up.

### Cyber

When the scope flags cyber, the cyber cross-cutting overlay (`references/cross-cutting/cyber.md` when installed) drives evidence-of-effectiveness expectations and the linkage to the cyber-program reporting cadence. Cyber findings frequently turn on whether a control redesign has actually reduced the residual risk, not just whether the control was reissued; the overlay covers the named evidence methods that demonstrate residual-risk reduction and the cross-link to `cyber-disclosure-readiness` where the underlying event has public-disclosure implications.

### Privacy

When the scope flags privacy, the privacy cross-cutting overlay sets evidence-of-effectiveness expectations for findings touching customer-information safeguarding, breach-notice procedures, and consumer-financial-data handling. Privacy findings often carry a parallel customer-notification clock that the response must reconcile with the action plan dates.

### Conduct

When the scope flags conduct, the conduct cross-cutting overlay sets evidence-of-effectiveness expectations for findings touching customer-conduct controls, fair-lending controls, and retail-investor-protection controls. Conduct findings frequently turn on remediation that the firm owes affected customers in addition to control redesign; the response carries the customer-remediation strand alongside the control strand.

### Sector overlays

Load only the overlay the scope names. Banking responses are the prudential-supervisor-shaped case; the formal-letter conventions and the supervisory-severity-ladder defaults are tightest here. Insurance responses follow state insurance-department and peer-review conventions, which vary by state. Capital-markets responses cover markets-supervisor examination deficiency letters and self-regulatory-organisation examination findings; the formal-letter conventions and the response windows differ from the banking case. Payments-fintech responses cover consumer-protection supervisory findings, state money-transmitter examination findings, and bank-partnership examination findings flowing through the sponsor bank.

The sector overlay is content that lands in the response, not background reading. A banking overlay loaded but no severity-tier default applied, or an insurance overlay loaded but no state-DOI convention reflected in the addressee block, is the failure mode the troubleshooting file calls out.

## Quality bar

- Finding text is quoted verbatim. Paraphrasing the finding, even slightly, reads as a softening attempt and frequently draws the issuing party's challenge. The schema requires `finding_text_verbatim`.
- Root cause is mechanism-anchored, not a paraphrase of the finding. The schema validates `consistency_with_issue_writeup`; mismatch surfaces as a reviewer question.
- Action-plan milestones carry dependencies (or an explicit no-dependencies assertion) and named owner roles. A milestone without dependencies is brittle; a milestone with a personal name is unmaintainable.
- Evidence of effectiveness is distinct from evidence of completion. The schema requires the evidence-of-effectiveness plan as a separate object.
- Acceptance postures of `partially-accept` or `contest` carry named rationale and named risk-acceptance approval. The schema fails the response without `risk_acceptance` populated for these postures.
- Reporting cadence to the issuing party is named (frequency, form, reporting role). Defaults flex by finding tier; the absence of a named cadence does not.
- Where a prior response exists on the same finding ID, the current response acknowledges the slippage and the changed commitment. Silently revising the prior commitment fails the schema check.
- The response is a draft until the responding role and the firm-level signatory attest. The skill does not assert sign-off, send to the issuing party, or post to the response-file folder.
- Supervisory finding text and prior supervisory communications are confidential supervisory information for federal banking findings (12 CFR Part 4 Subpart C for OCC; Part 261 for FRB; Part 309 for FDIC) and carry parallel restrictions for SEC EXAMS, FINRA, NYDFS, and state-DOI matters. The response itself becomes part of the supervisory record when delivered. The pack's access population and any onward circulation honour the issuing regulator's confidentiality regime; do not move CSI to a population reading at a lower clearance.

## Adaptation

Finding tier drives reporting-cadence defaults and signatory level (higher tier = more rapid cadence, more senior signatory). Sector overlays drive addressee conventions and response-window expectations. Cross-cutting overlays drive the evidence-of-effectiveness expectations for cyber, privacy, and conduct findings. Where firm-specific signatory conventions, classification handling, or response-file routing applies, it lives in `references/firm-overlay.md` (consumed when present) and never in the response directly.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the response itself rides as a Word memo on letterhead, with the action-plan milestones lifting to Excel for tracker integration. Produce the structured record at `schemas/management-response.schema.json` when downstream automation or a registered consumer needs it. The reviewer attestation block is filled by the responding role and (where applicable) the firm-level signatory; the response is sent to the issuing party only after.

Downstream consumers: the structured object feeds `risk-committee-pack` (the issues-and-remediation-status section consumes the response posture, owner, target date, and evidence-of-effectiveness plan). The cyber-overlay-flagged responses cross-link to `cyber-disclosure-readiness` where the underlying event has public-disclosure implications. The schema is the cross-skill contract; additive changes only, never silent renames. Breaking changes ship as a versioned migration with the consumers told in advance.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors.
- `references/sector-overlays/{banking,insurance,capital-markets,payments-fintech}.md` — sector overlays loaded from scope.
- `references/cross-cutting/{cyber,privacy,conduct}.md` — cross-cutting overlays loaded from scope.
- `references/firm-overlay.md` — firm-installed signatory conventions, classification handling, response-file routing (consumed when present).
- `templates/default-output.md` — response template with the named sections.
- `schemas/management-response.schema.json` — structured-output contract; reuses `issue.schema.json` for finding linkage.
- `examples/` — anonymised public-source-derived scenarios.
- `TROUBLESHOOTING.md` — recurring defects in management responses.
