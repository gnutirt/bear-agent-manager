# AML transaction-monitoring second-line review memo

> Word memo. Render via the `docx` skill in the `document-skills` plugin. The named sections below are the content spec; the renderer styles and paginates.

---

**Engagement ID:** \<ENG-YYYY-XXX-NN>
**System under review:** \<system identifier; cross-link to model inventory entry>
**Review type:** \<annual / quarterly / pre-validation / post-tuning / pre-exam-readiness>
**Review window:** \<YYYY-MM-DD to YYYY-MM-DD>
**Author / persona:** \<role>
**Sponsor:** \<role>
**Audience:** \<role(s) / committee>
**As-of date:** \<YYYY-MM-DD>
**Status:** \<draft / under-revision / signed-off>

---

## 1. Program review

> Prose. The program-level lens that frames the rest of the memo. This is not a bulleted list. The reviewer states what the system is, that it is in scope as a model under the named model-risk supervisory guidance, what the review type is, and what the load-bearing question for this engagement is. Three to five paragraphs.

\<Paragraph one — the system, its scope, what it covers (products, channels, geographies), the review type and the operative review window.>

\<Paragraph two — the model-risk frame. State that AML transaction monitoring is in scope as a model under the named model-risk supervisory guidance the scope identifies, and that the review reads against model-risk discipline (development, implementation, use, validation, governance) as well as BSA/AML examination expectations. This frame is load-bearing; without it the review reads as a "rules check" and misses the discipline.>

\<Paragraph three — the load-bearing question for this review. Annual reviews carry "is the system meeting its design intent against the institution's risk profile". Post-tuning reviews carry "does the change evidence chain hold up". Pre-validation reviews carry "what should the next validation cycle scope". Pre-exam reviews carry "is the documentation ready to read in an examination". State the question explicitly so the rest of the memo answers it.>

\<Paragraph four — the regulator constellation and overlays in scope. Generic language; specifics live in the references.>

\<Paragraph five (optional) — material context the audience needs (open MRAs touching the system, prior-period validation themes, recent enforcement themes adjacent to the firm's typology surface).>

## 2. Scope, source posture, and engagement context

| Field | Value |
|---|---|
| Institution type | |
| Primary regulator(s) | |
| Sector overlay loaded | |
| Cross-cutting overlay loaded | |
| Source posture | public-only / public-plus-firm-policy / public-plus-firm-policy-plus-evidence / connector-aware |
| Engagement scope reference | |
| Firm overlay consumed | yes / no — \<reference> |

## 3. Model identifier and inventory linkage

- Model inventory ID: \<system-id>
- Model tier: \<tier from the firm's tiering output, link to the tiering artifact>
- Model owner: \<role>
- Last validation date: \<YYYY-MM-DD>
- Last full tuning cycle: \<YYYY-MM-DD>
- Last segmentation refresh: \<YYYY-MM-DD>
- Cross-references: \<links to model card, validation report, change-governance log, BSA/AML risk assessment>

## 4. Data quality posture

| Dimension | Status | Open issue (if any) | Cycle issue first surfaced | Remediation owner / target |
|---|---|---|---|---|
| Completeness | | | | |
| Timeliness | | | | |
| Integrity controls | documented / partially documented / not documented | | | |
| Identifier stability | | | | |

\<Short narrative for any data-quality issue outstanding more than two cycles. Outstanding multi-cycle data-quality issues read as governance gaps.>

## 5. Customer segmentation

### 5.1 Methodology and refresh

- Methodology summary: \<one paragraph; what axes the segmentation uses>
- Last refresh date: \<YYYY-MM-DD>
- Program cadence: \<as documented in firm policy or program>
- Cadence adherence: \<on cadence / overdue by N months>

### 5.2 Drift indicators

| Metric | Baseline | Current | Threshold / acceptable range | Status |
|---|---|---|---|---|
| Population per segment (count) | | | | |
| Behaviour per segment (volume / velocity / counterparty mix) | | | | |
| Risk-rating distribution | | | | |
| New-customer onboarding mix | | | | |

\<Short narrative on the drift signal. Population stable but behaviour moved is a separate signal from population moving; both belong here.>

### 5.3 Open segmentation issues

- \<issue> — \<bearing> — \<severity> — \<recommended gate>

## 6. Scenario inventory and tuning evidence

| Scenario | Typology | Last tuned | Tuning method (summary) | BTL posture | Productivity (defined) | SAR conversion (defined) | Open issues |
|---|---|---|---|---|---|---|---|
| | | YYYY-MM-DD | | not-performed / performed-no-sample-size / performed-with-sample-and-signoff | denominator: \<x> / value: \<y> | denominator: \<x> / value: \<y> | |

\<Productivity and SAR conversion are reported with the denominator definition explicit. A figure without a denominator is `[evidence needed]`.>

## 7. Threshold-change governance

| Scenario | Change type | Change effective date | Approval evidence date | Approver role | Approver independence documented | Post-change effect (window, metric, observation) |
|---|---|---|---|---|---|---|
| | | | | | yes / no | |

\<Short narrative on any change record where approval evidence post-dates the change effective date, where the approver-independence documentation is absent, or where the post-change effect is not on file at the review date.>

## 8. Alert volume and productivity trends

| Metric | Definition (denominator) | Trend (window) | Observation |
|---|---|---|---|
| Total alert volume | | | |
| Per-scenario productivity | | | |
| SAR conversion | | | |
| False-positive rate | | | |
| Auto-closure rate (where applicable) | | | |

\<Short narrative on productivity declines without documented tuning hypothesis; on auto-closure-rate changes; on volumes diverging from prior baseline without documented driver.>

## 9. Validation evidence

- Last validation date: \<YYYY-MM-DD>
- Validation scope: \<summary>
- Validator independence: \<status>
- Open validation findings: \<list with severity, target dates, remediation owner>
- Re-baselining since validation: \<summary, where applicable>

## 10. Material findings

| ID | Finding | Criterion (named regulatory anchor; reference file) | Severity | Evidence pointer | Recommended gate |
|---|---|---|---|---|---|
| | | | material / moderate / minor / observation | | |

## 11. Recommended human-review gates and owner actions

- \<gate name> — \<criterion> — \<gate owner role> — \<stop condition>

\<The skill produces gate recommendations and routing, not change decisions. Threshold changes, scenario approvals, validation conclusions, and SAR-side decisions are made by the named decisionmaker.>

## 12. Source trace and confidence

| Claim | Source | Confidence |
|---|---|---|
| | file evidence / firm policy / sector overlay / source-anchors / firm overlay / generated inference | high / medium / low / `[evidence needed]` |

---

**Sign-off**

- Practitioner: \<role, name on file in firm system>
- Sponsor: \<accountable-executive role, sign-off date>
- Independent reviewer (advisory or internal QA): \<role, sign-off date>

**Revision log**

| Date | Reason | Delta | Approved by |
|------|--------|-------|-------------|
| YYYY-MM-DD | initial draft | memo created | \<persona> |
