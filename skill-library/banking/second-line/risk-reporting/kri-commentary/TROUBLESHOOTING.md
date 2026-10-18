# Troubleshooting: kri-commentary

Recurring defects in per-KRI commentary blocks. The skill should detect these at draft time; the head of risk reporting catches them at review.

## 1. Commentary that restates the metric

The block reads "OPS-001 was RED at $14.8m, breaching the $10m limit." That is the metric, not commentary. The block must include a named root cause, contributing factors, action taken, action planned, and a residual-risk view. A block that fails this shape goes back to the drafter; the schema enforces it for status = red and for amber where breach age > 1.

## 2. First-line voice in second-line commentary

The block reads as a first-line restatement: "The team is investigating the loss events and will report back next quarter." Second-line commentary is challenge, not narration. Either an explicit `second_line_challenge_note` or a documented rationale that the second-line view aligns with first-line is required.

## 3. "Investigation ongoing" for multi-period breaches

A second consecutive period of breach with no named root cause is not credible. The schema requires a named root cause for `breach_age_periods > 1`. If the root cause is genuinely unknown after multiple periods, the named owner and target date for when the root cause will land are required instead, and the second-line challenge note carries the issue.

## 4. Action planned without owner or target date

The block lists an action like "Review the vendor concentration" with no role-level owner and no target date. Schema rejects. Owners are roles, never named individuals; target dates are ISO dates, not "next quarter".

## 5. Residual-risk view as wishful thinking

Expected RAG is GREEN next quarter on a multi-period breach where the action plan has not yet completed and the external driver persists. Schema rejects `expected_rag = green` where breach age > 1 and the action plan has not yet completed. The rationale must tie to the action plan and the external-driver outlook, not to optimism.

## 6. Threshold recalibration buried in commentary

The first line is requesting a trigger or limit change in response to the breach, but the request is folded into the root-cause paragraph. The block must surface the recalibration request as a named item, with proposed change, rationale, and approver role. Recalibration in response to a breach is sometimes legitimate (the metric or population has changed) and sometimes masking; the committee, not the commentary, makes the call.

## 7. Cyber KRI without disclosure-controls cross-reference

A cyber KRI has been at trigger or breach for two or more consecutive periods, and the block does not cross-reference `cyber-disclosure-readiness`. Sustained cyber-KRI deterioration is a leading indicator that should feed the disclosure-controls trace. The cross-cutting cyber overlay sets the cross-reference; the block carries it.

## 8. Climate KRI without data-confidence caveat

A climate KRI relies on vendor-supplied scenario or emissions data, and the block does not carry a `data_confidence_note`. The cross-cutting climate overlay requires the BCBS 239 Principle 3 / Principle 6 caveat to be named on any climate KRI block. Without it, the block over-asserts the data quality the firm actually has.

## 9. Cross-KRI correlation repeated in every block

Three KRIs share the same root cause (e.g., a vendor outage drove an operational-loss KRI, a third-party-availability KRI, and a customer-complaint KRI). The block-level commentary repeats the vendor outage narrative three times. The wrapper's `cross_kri_correlations` array exists to surface the shared root cause once; each block then references the correlation ID rather than restate.

## 10. Owners as named individuals

Owner is "Jane Smith, VP of Cyber Operations". The skill rejects named individuals as owners; owner is "CISO" or "head of cyber operations". Named individuals belong in firm-internal artifacts and not in the commentary that may be shared upward, with the regulator, or with the auditor.

## 11. Source trace empty for material claims

The block names a 14-hour vendor outage as a contributing factor; the source-trace table does not carry the vendor incident report as the evidence pointer. Every material claim needs a source-trace entry; unsupported items carry `[evidence needed]` and are routed to the engagement issue log, not silently into the block.

## 12. Confidence label "high" with non-empty BCBS 239 known limitations on the metric

The block claims confidence = high; the metric is on the BCBS 239 self-assessment's known-limitations list (e.g., manual data extract, unreconciled source). The wrapper's aggregate confidence label is also constrained; high is unavailable while the metric is on that list. Medium at best.
