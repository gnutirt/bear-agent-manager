# Management response: [issuing-party finding ID or audit-report reference]

Starting structure for a management response to a regulator finding, internal-audit finding, or external-assessor observation. The cover and addressee block flexes for the issuing party; the body spine does not. If a section is omitted, the rationale is documented (for example, "no quantitative estimate available; impact statement is qualitative" goes in the materiality and impact section).

The response is a draft until the responding role and the firm-level signatory review.

---

## Cover

- Response date: [YYYY-MM-DD]
- Responding institution: [legal entity name; legal-entity hierarchy where relevant]
- Addressee: [regulator office / Audit Committee of the Board / external-assessor name]
- Addressee reference number: [issuing-party reference if any]
- Issuing party finding ID: [e.g., MRA-2025-014, INT-AUD-25-Q2-007, SOC-EX-2025-3]
- Internal issue ID: [foreign key to issue write-up; e.g., ISS-2025-0418]
- Period the finding relates to: [start YYYY-MM-DD] to [end YYYY-MM-DD]
- Classification: [internal / firm-restricted / privileged / regulator-confidential]
- Response version: [v1 / v1-revised / refresh-of-v1]
- Engagement-scope ID (if `scoping` was run): [ID]

---

## Addressee paragraph

[Formal salutation in the convention the issuing party expects. For a federal banking agency supervisory finding the convention is the formal supervisory-letter response form; for an audit committee response the convention is a memorandum form; for an external-assessor observation the convention follows the assessor's protocol.]

---

## Executive summary

Three to five bullets in the responding role's voice. Read by the chair or the examiner-in-charge before the body.

- [Acceptance posture and headline commitment]
- [Named root cause in one line]
- [Action-plan envelope: number of milestones, longest target date, named dependencies]
- [Interim mitigation status]
- [Reporting cadence to the issuing party]

---

## Finding restatement

The issuing party's wording, quoted verbatim. Sub-findings broken out where the issuing party broke them out; numbering preserved.

> [Verbatim finding text]

---

## Acceptance posture

- **Posture**: [accept / partially-accept / contest]
- **Rationale** (required for `partially-accept` or `contest`; optional for `accept`): [named rationale]
- **Risk-acceptance approval** (required for `partially-accept` or `contest`):
  - Decision-maker (role): [role]
  - Approval evidence: [pointer to committee minutes, named delegated-authority memo, or other approval artifact]

---

## Root cause acknowledgement

Named, mechanism-anchored statement of why the finding occurred. Not a paraphrase of the finding. Consistent with the linked issue write-up; the schema validates the cross-reference.

- **Root cause**: [mechanism-anchored statement]
- **Linked issue ID**: [foreign key to issue.schema.json]
- **Consistency with issue write-up**: [yes / under-revision; if under-revision, what changed]

---

## Materiality and impact

The current and reasonably-foreseeable impact, with a quantitative estimate where one is available. Source trace points to the underlying evidence.

- **Current impact**: [statement, with source]
- **Reasonably-foreseeable impact**: [statement, with source]
- **Quantitative estimate**: [number with unit, or "qualitative; basis named below"]
- **Basis**: [pointer to loss-event log, capital-impact estimate, customer-impact tally, or other source]

---

## Action plan

Each milestone has an action description, an owner role, a target date, dependency identifiers, and the evidence-of-completion expected at the milestone. A milestone with no dependencies carries the explicit assertion "no external dependencies".

| Milestone ID | Action description | Owner (role) | Target date | Dependencies | Evidence of completion expected |
|---|---|---|---|---|---|
| M1 | [action] | [role] | [YYYY-MM-DD] | [milestone IDs / "no external dependencies"] | [evidence] |
| M2 | [action] | [role] | [YYYY-MM-DD] | [milestone IDs / "no external dependencies"] | [evidence] |

---

## Interim mitigation

Steps already taken before the formal response date and any compensating controls in place pending full remediation. Each step carries date and owner role.

- [Step taken, date, owner role]
- [Compensating control in place, owner role, sunset condition]

---

## Evidence-of-effectiveness plan

Distinct from evidence of completion. Names the method, the period over which the evidence will be observed, and the owner role for the evidence run.

- **Evidence method**: [control-test / kri-trend / external-validation / supervisor-walk-through / other]
- **Evidence period post-remediation**: [e.g., "two consecutive quarters at GREEN", "two consecutive monthly readings at zero unreconciled items", "external validation by [external party type]"]
- **Evidence owner (role)**: [role]
- **Re-test cadence after closure**: [e.g., "annual re-test for two years post-closure"]

---

## Reporting cadence to the issuing party

Named frequency, form, and reporting role. Defaults flex by finding tier; the absence of a named cadence does not.

- **Frequency**: [monthly / quarterly / semi-annual / annual / event-driven / other]
- **Form**: [written progress report / committee update / supervisory meeting / on-request]
- **Reporting role**: [role]
- **Closure trigger**: [named condition under which the firm requests closure]

---

## Linked issues and prior responses

- **Linked issue IDs**: [list of internal issue IDs the response covers or cross-references]
- **Linked finding IDs**: [list of related findings sharing root cause or remediation actions]
- **Prior response history on this finding ID**:
  - [Prior response date, prior commitment, slippage description, what changed]

If this is a refresh of a prior response, the slippage commentary is not optional.

---

## Sign-off block

The response is a draft until the responding role and (where applicable) the firm-level signatory attest.

- **Responding role**: [role; sign-off date]
- **Firm-level signatory** (where applicable; e.g., for the highest-severity supervisory tier): [role; sign-off date]
- **Independent reviewer** (legal, second-line challenge): [role; sign-off date]

---

## Source trace

For every material claim in the response, especially in materiality and impact, action-plan dependencies, and evidence-of-effectiveness:

| Claim | Source | Evidence reference | Confidence |
|---|---|---|---|
| [claim] | [system, document, committee minute, or `[evidence needed]`] | [pointer] | [high / medium / low / evidence-needed] |

---

## Confidence label

- **Confidence label**: [high / medium / low / unknown]

The confidence label reflects the executability of the action plan, not the desirability of the outcome. A `high` label requires named owners on every milestone, dependency-mapped milestones, and demonstrable interim mitigation. Where any of these is absent, the label is medium at best.

---

## Reviewer questions

Questions the responding role expects from the issuing party in follow-up.

1. [Question tagged to the action-plan dependency most likely to slip]
2. [Question tagged to the evidence-of-effectiveness method]
3. [Question tagged to the materiality estimate]
4. [Question tagged to the reporting cadence]
5. [Question tagged to the prior-response slippage, where applicable]
