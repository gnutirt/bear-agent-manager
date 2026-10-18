# Troubleshooting: management-response

Recurring failure modes when a management response looks complete but is not. The reviewer pass should catch these; the builder pass should preempt them.

## Finding text paraphrased rather than quoted

Symptom: the finding-restatement section reads as a clean summary of the issuing party's wording, with phrasing softened or simplified.

Why it happens: the builder treats the response as the firm's voice throughout and rewrites the finding for stylistic consistency.

Fix: the finding text is quoted verbatim, with the issuing party's numbering preserved. The schema requires `finding_text_verbatim`. Paraphrasing, even slight, reads as a softening attempt and frequently draws the issuing party's challenge. Where the firm wishes to articulate its understanding of the finding, it does so in the root-cause section, not in the restatement.

## Root cause paraphrases the finding

Symptom: a finding that says "the firm's third-party-risk-management ongoing-monitoring controls are inadequate for critical fourth-party dependencies" is paired with a root cause that says "ongoing monitoring of fourth parties is inadequate".

Why it happens: builder treats root cause as a re-statement of the gap rather than as a mechanism-anchored explanation of why the gap occurred.

Fix: the root cause is named and mechanism-anchored. What in the firm's process produced the gap? The fourth-party identification process did not extend to operationally-critical sub-providers because the criticality rubric scored on direct contracted relationship. The exit-test cadence had slipped to ad-hoc because exit-test scheduling lived in the vendor-management system as ad-hoc tasks rather than as recurring policy-driven obligations. The board pack did not surface concentration metrics because the template was anchored on individual-vendor metrics. The schema validates `consistency_with_issue_writeup`; mismatch surfaces as a reviewer question.

## Action-plan milestones with no dependencies

Symptom: a 12-month milestone with a single target date and no dependency surfacing. The supervisor reads it, asks "what does this depend on?", and the response cannot answer.

Why it happens: dependency-mapping requires conversation across functions and is often deferred; the builder lists target dates without surfacing the underlying dependencies.

Fix: every milestone carries either named dependency identifiers (other milestones, named system upgrades, named vendor cooperation, named regulatory approvals) or the explicit assertion `no_external_dependencies = true`. The schema enforces this. A milestone without dependencies is brittle and frequently slips.

## Evidence of completion conflated with evidence of effectiveness

Symptom: the response treats "policy approved", "training delivered", "control documented", "attestation collected" as evidence the underlying risk has been resolved.

Why it happens: control-completion evidence is what the firm's testing function and project-management function track, and that material is at hand; residual-risk-reduction evidence requires post-implementation observation that the builder may not yet have.

Fix: the evidence-of-effectiveness plan is a separate object in the schema. It names the method (control-test, KRI-trend, external-validation, supervisor-walk-through), the period over which the evidence will be observed (commonly two consecutive quarters or two consecutive monthly readings), and the owner role for the evidence run. Completing an action is not the same as resolving the underlying risk; the evidence-of-effectiveness plan is the principal control on action-completed-without-risk-resolved closure.

## Acceptance posture without rationale

Symptom: the response carries `partially-accept` or `contest` in the acceptance posture without naming who approved the partial acceptance or contest, on what basis, or with what evidence of approval.

Why it happens: the partial-acceptance or contest decision was settled informally and the formal risk-acceptance approval was not documented.

Fix: the schema requires `risk_acceptance` (with `decision_maker`, `rationale`, `approval_evidence`) when `acceptance_posture` is `partially-accept` or `contest`. The acceptance posture cannot be drafted around; it has to be settled with the responding role and documented before the response goes out. The skill stops if the posture is not settled.

## Reporting cadence missing or vague

Symptom: the response says "we will keep the supervisor informed" or "we will report progress on a regular basis".

Why it happens: builder defers the cadence specification, expecting the issuing party to specify it.

Fix: the response names a specific frequency (monthly, quarterly, semi-annual, annual, event-driven), a specific form (written-progress-report, committee-update, supervisory-meeting, on-request), and a specific reporting role. Defaults flex by finding tier; the absence of a named cadence does not. The skill applies tier-specific defaults from the relevant sector overlay (e.g., monthly for the highest-severity supervisory tier).

## Confidence-label inflation

Symptom: confidence label is `high` while the action plan has unresolved dependencies, milestones with personal names instead of role owners, or no interim mitigation in place.

Why it happens: confidence label is treated as a brand statement rather than as an executability statement.

Fix: confidence label reflects the executability of the action plan, not the desirability of the outcome. A `high` label requires named owner roles on every milestone, dependency-mapped milestones, and demonstrable interim mitigation. Where any of these is absent, the label is medium at best. The skill enforces this; the reviewer pass catches it where the skill misses.

## Stale prior-response history

Symptom: the response is a refresh of a prior response on the same finding ID, but the prior commitment, the slippage, and what changed are not surfaced. The supervisor reads the new commitment as a fresh start.

Why it happens: builder treats the new response as a clean draft, not as a continuation. The prior-response history lives in a separate file or in the regulatory-affairs team's notes.

Fix: where a prior response exists on the same finding ID, the current response surfaces the prior commitment, the slippage, and what changed. The schema enforces `prior_response_history` with the slippage description on refreshes. Silently revising the prior commitment fails the supervisor's expectation that the firm manages, not just counts, the open population.

## MRA and MRIA treated identically

Symptom: an MRIA response carries the same reporting cadence, the same firm-level signatory, and the same action-plan envelope as an MRA response.

Why it happens: builder treats severity as a finding-text concern rather than as a workflow-defaults concern.

Fix: the banking sector overlay applies tier-specific defaults; MRIA carries monthly written progress reports, a senior firm-level signatory (typically CEO or General Counsel), board-level attention, a tighter action-plan envelope, and an evidence-of-effectiveness method that typically includes a supervisor walk-through. MRA defaults are quarterly cadence, CRO or process-owner signatory, risk-committee notification rather than board-level attention. The skill applies the defaults; the responding role can adjust where the supervisor's specification differs.

## Personal names in the addressee or signatory blocks

Symptom: the addressee or signatory blocks name a specific examiner or a specific firm executive by personal name.

Why it happens: builder uses the most recent correspondence for context and pulls personal names directly.

Fix: the convention across all sectors is roles, not personal names. Personnel rotate; the response may be filed and read months or years after issue. The schema requires owner and signatory fields to be roles. The reviewer pass catches personal-name leakage.

## Linked-issue inconsistency

Symptom: the response root cause says one thing; the linked issue write-up says another. The supervisor reads both and asks why.

Why it happens: the issue write-up was authored separately and the response was drafted without re-reading it; the two artifacts drifted.

Fix: the schema requires `consistency_with_issue_writeup` to be set explicitly. Where it is `false`, the response surfaces the divergence as a reviewer question and the responding role decides whether the issue write-up needs revision or the response root cause needs adjustment.

## Customer-remediation strand omitted on consumer-protection findings

Symptom: a CFPB or state-attorney-general finding response treats the matter as a control-redesign issue without addressing remediation owed to affected consumers.

Why it happens: builder treats the finding as a process gap rather than as a customer-impact event.

Fix: the conduct cross-cutting overlay (`references/cross-cutting/conduct.md`) and the payments-fintech sector overlay both flag this. Where customers were affected, the response carries both the control-redesign strand and the customer-remediation strand: affected-population identification methodology, restitution methodology, restitution delivery, customer-remediation reporting cadence.

## Cyber evidence-of-effectiveness limited to "policy and training"

Symptom: cyber finding response evidence-of-effectiveness method is "training delivered to all affected staff" or "policy revision approved and disseminated".

Why it happens: builder reaches for the evidence that is in hand at the response date.

Fix: cyber findings turn on whether the redesign actually reduced the underlying risk. The evidence-of-effectiveness plan must distinguish control-completion evidence (policy, training, attestations) from residual-risk-reduction evidence (KRI trend showing reduced incident rate or improved MTTR; control-test results showing the control operating as designed; threat-emulation or red-team results showing the control resists realistic attack patterns). The cyber cross-cutting overlay covers the named methods.

## Counsel review missing on enforcement-referral indicators

Symptom: the response is drafted and ready for submission on a deficiency letter that contains language signaling possible enforcement consideration. Securities counsel has not reviewed.

Why it happens: builder treats the response as a routine artifact when the underlying communication is not routine.

Fix: where the deficiency letter contains enforcement-referral indicators (typical SEC EXAMS or FINRA language; CFPB PARR letter convention; explicit statement of possible enforcement consideration), securities counsel review is typical and the skill flags this. The skill stops if the responding role has not engaged counsel.

## Response stops too late

Symptom: the skill produces and files the response with the issuing party, marks the response as sent, asserts sign-off without evidence.

Why it happens: builder over-runs the human-review gate.

Fix: the response is a draft until the responding role and (where applicable) the firm-level signatory attest. The skill stops at the draft and surfaces the reviewer questions; it does not assert sign-off, send to the issuing party, or post to the response-file folder.
