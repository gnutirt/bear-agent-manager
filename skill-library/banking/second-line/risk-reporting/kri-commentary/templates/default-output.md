# KRI commentary set: [Period start] to [Period end]

A set of per-KRI commentary blocks for one reporting period. The skill produces one block per KRI in scope (typically the AMBER, RED, breached, and watch-list population). The set is consumed by the risk committee pack and by any regulator response or board memo where a specific KRI is the subject.

The set is a draft until the second-line lead and the head of risk reporting review.

---

## Cover

- Reporting period: [YYYY-MM-DD] to [YYYY-MM-DD]
- Risk taxonomy in force: [firm taxonomy name and version]
- Engagement-scope ID (if `scoping` was run): [ID]
- Aggregate counts: RED [n], AMBER [n], at trigger or breach [n]
- Aggregate confidence label: [high / medium / low / unknown]

---

## Per-KRI block

Repeat the block below for each KRI in scope. Block is the same shape regardless of risk type; the contributing-factors list and the data-confidence note flex with risk type and source posture.

### [KRI ID] / [KRI name]

| Field | Value |
|---|---|
| Risk type | [credit / market / liquidity / operational / compliance / financial-crime / model / third-party / cyber / climate / strategic / reputational / conduct] |
| Risk subtype | [optional, firm taxonomy sub-classification] |
| Period | [YYYY-MM-DD] to [YYYY-MM-DD] |
| Threshold structure | [limit / trigger / tolerance as the firm expresses it] |
| Prior value | [value with unit] |
| Current value | [value with unit] |
| Direction | [improving / stable / deteriorating] |
| RAG status (current / prior) | [enum] / [enum] |
| Breach status | [within / at-trigger / breach] |
| Breach age | [periods at trigger or breach] |
| Linked RAS metric | [metric ID or "none"] |
| Owner | [role; never a named individual] |

**Root cause (named).** [One paragraph naming the discrete drivers of the movement; not "investigation ongoing" for a multi-period breach.]

**Contributing factors.** [data-quality / control-failure / external-driver / capacity / vendor / model-driver / other; named with a sentence of evidence each.]

**Action taken in period.**

- [Action description]. Owner: [role]. Completed: [YYYY-MM-DD]. Evidence: [pointer].

**Action planned.**

- [Action description]. Owner: [role]. Target: [YYYY-MM-DD]. Dependencies: [IDs or "none"].

**Residual-risk view.** Expected RAG next period: [green / amber / red]. Rationale: [tied to the action plan and external-driver outlook; not wishful thinking.]

**Linked items.**

- Issues: [issue IDs]
- Material events: [event IDs]

**Second-line challenge note.** [Present where the second-line view diverges from first-line; named, evidence-pointed. If alignment is documented, state that explicitly.]

**Threshold recalibration request.** [Present only where the first-line or risk-appetite owner is requesting a recalibration in response to the movement; carries proposed change, rationale, and the approver role. Otherwise omit.]

**Data confidence note.** [Required for KRIs that rely on vendor or third-party data of variable quality (climate, third-party telemetry, vendor-supplied scenario data). Otherwise omit.]

**Source trace.**

| Claim | Source | Evidence reference | Confidence |
|---|---|---|---|
| [material claim] | [system, document, or `[evidence needed]`] | [pointer] | [high / medium / low / evidence-needed] |

**Confidence label.** [high / medium / low / unknown]

---

## Cross-KRI correlations

Where multiple KRIs share a root cause, surface the correlation once. Avoid repeating the same root-cause text in each block.

| Correlation ID | Description | Linked KRI metric IDs |
|---|---|---|
| C1 | [shared root cause across the linked KRIs] | [list] |

---

## Aggregate posture and reviewer questions

- Trend versus prior period: [direction across the population]
- BCBS 239 known limitations bearing on the set: [from the most recent self-assessment; if non-empty, aggregate confidence cannot be high]
- Reviewer questions for the committee secretary and the chair:
  1. [Question on the most material movement]
  2. [Question on the over-age action plan]
  3. [Question on any threshold recalibration request]
  4. [Question on any data-confidence caveat]

---

## Sign-off block

The set is a draft until the second-line lead and the head of risk reporting review.

- Second-line lead: [role; sign-off date]
- Head of risk reporting: [role; sign-off date]
