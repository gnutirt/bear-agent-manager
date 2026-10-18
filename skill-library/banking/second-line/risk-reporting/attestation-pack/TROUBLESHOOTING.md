# Troubleshooting: attestation-pack

Recurring failure modes when an attestation pack reads as complete but is not. Reviewer pass should catch these; builder pass should preempt them.

## Clean attestation while material exceptions exist elsewhere

Symptom: the assertion text reads "controls operated effectively in all material respects" while the firm carries open MRAs, audit issues, or known control gaps in the same scope.

Why it happens: builder treats the assertion as a procedural close-out and the exceptions as a separate workstream tracked in the issue log.

Fix: where exceptions exist in scope, name them in the exceptions section, link to the relevant control, and reflect the carve-out in the assertion text. A clean attestation with material open issues elsewhere is a frequent supervisory finding and an external-auditor exception in its own right. The schema requires `exceptions[]` to enumerate every exception with severity and status; "no exceptions" is itself a stated determination.

## Evidence index by reference

Symptom: evidence index says "all evidence is in the SharePoint folder" or "see audit binder". No itemised list, no system of record, no period covered.

Why it happens: the attesting role works against a binder that lives somewhere else and points to it rather than itemising.

Fix: one row per piece of evidence. Each row carries description, evidence type, system of record, period covered, producer role, and linked control IDs. An external assessor cannot accept "see folder" as the evidence index; the pack draft enforces the row-level discipline up front so the binder is built right rather than reconstructed later.

## Compensating-control hand-waving

Symptom: an exception narrative includes "compensated by management oversight" or "covered by quarterly review". No discrete control named, no evidence pointer.

Why it happens: builder accepts the narrative the control owner provided without pressing for the compensating control's identity.

Fix: where an exception has a compensating control, the compensating control is a named row in the control inventory with its own evidence and own owner role. The schema's `compensating_control_description` is rejected if it does not name a discrete control. A compensating control without evidence in the same period is no compensating control at all.

## Stale assertion language

Symptom: the assertion text is the prior-period text rolled forward. The version field reads the same as the prior period. The underlying source criteria have been updated (PCAOB AS revision, SSAE update, BCBS 239 supervisory expectation update, NYDFS Part 500 amendment) and the text does not reflect it.

Why it happens: assertion text is treated as boilerplate; the year-over-year change check happens after sign-off, not before.

Fix: every cycle, check the source criteria for changes since the prior assertion-text version. If criteria have updated, the text updates and the version increments. The skill's source-anchors discipline carries the verification flags; the year-over-year check is part of the workflow, not a post-sign-off catch.

## Process-owner sub-certification confused with executive certification

Symptom: a process-owner sub-certification pack reads as if it is the CEO/CFO certification under the executive-certification provisions. Securities counsel is named as the signing role; the assertion text borrows from the executive certification.

Why it happens: builder collapses the two layers; "attestation" reads as a single artifact.

Fix: this skill produces process-owner and function-head sub-certifications that ladder up to the executive certification. The executive certification under the relevant securities-law sections is securities-counsel-led work and out of scope. The sub-certification chain captures the ladder explicitly via `sub_certification_chain[]`. Where the engagement is the executive certification itself, route to securities counsel and stop.

## Vendor SOC report taken at face value

Symptom: evidence index cites "Vendor V SOC 2 Type II report" against a control. No carve-out review noted, no complementary user entity controls (CUECs) listed, no CUEC-level evidence at the user firm.

Why it happens: builder treats the SOC report as evidence of the firm's controls when it is evidence of the service organisation's controls.

Fix: a SOC report is the service organisation's management assertion. Where it is cited, the user firm reviews carve-outs, identifies the CUECs, and provides CUEC-level evidence at the user firm. The schema's `evidence_type` includes `cuec-evidence` distinct from `soc-report`; both rows should appear when a SOC report is cited as evidence for an in-scope control.

## Prior-period remediation skipped

Symptom: prior-period exceptions appear in the prior period's pack and disappear from the current period's pack, with no remediation status.

Why it happens: each cycle starts fresh; the prior-period log is treated as historical.

Fix: every prior-period exception carries a current-status row in `prior_period_remediation_status[]`. Items not remediated by the current attestation date are reportable and surface as current-period exceptions. The schema enforces the linkage via `current_period_exception_id` when a prior item rolls forward.

## Confidence-label inflation

Symptom: confidence label reads "high" while in-scope controls have missing evidence rows or are marked `not-tested`.

Why it happens: label is treated as a brand statement on the substantive control posture.

Fix: the label reflects the strength of the evidence base, not the substantive control posture. `high` requires complete evidence-index coverage. Where evidence is missing on any in-scope control, the label drops to medium at best. The schema-level check is documented; the workflow enforces it.

## Sector or cross-cutting overlay loaded but ignored

Symptom: insurance overlay loaded but no NAIC Model Audit Rule mapping in the pack; cyber overlay loaded but no CISO-program attestation slot; privacy overlay loaded but no Safeguards Rule annual-report linkage.

Why it happens: overlay treated as background reading rather than content that lands in the pack.

Fix: when the scope names an overlay, the matching content lands as named items in the pack (a section, an exception type, an evidence-row category, a sign-off question). Overlay-specific assertion language and sign-off questions go to the reviewer-question list.

## Pack stops too late

Symptom: the skill produces and "files" the attestation, marks it as signed, asserts the attesting role's sign-off without evidence.

Why it happens: builder over-runs the human-review gate.

Fix: the pack is a draft until the attesting officer signs and the named legal or audit reviewer reviews. The skill stops at the draft, surfaces the reviewer-question list, and leaves the signature fields blank. It does not assert sign-off, distribute, or post to the certification system.
