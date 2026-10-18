# SAR Decision QA sample roll-up

> Status: draft until the BSA officer or the SAR review committee acts. The roll-up aggregates per-case QA reads across a sample for pattern detection, recurring-finding rates, and training-feedback themes. It does not file, decline to file, amend, supplement, or close any SAR; SAR filing is a regulated act reserved to the BSA officer or designee.

This template is the artifact shape for sample-based program QA over a lookback window (the first review type named in `SKILL.md` "Ask first"). For single-decision review, use `default-output.md`. The structured record per `schemas/sar-decision-qa.schema.json` is emitted per case; this roll-up reads the records across cases.

## Executive summary

- [Population, sample, and lookback window in one line]
- [Top one or two recurring findings with material defensibility implications]
- [Routing recommendation to the named decision forum]

## Scope

| Field | Value |
|---|---|
| Jurisdiction | |
| Institution type | |
| SAR rule loaded | 31 CFR 1020.320 / 1022.320 / 1023.320 / 1024.320 / 1025.320 / 1026.320 |
| Sector overlay | banking / payments-fintech / capital-markets / insurance |
| Lookback window | [start] to [end] |
| Population frame | [closed alerts (filed and unfiled) in window; describe] |
| Sample size | [n] |
| Sample-selection method | random / risk-weighted / typology-targeted / stratified / other (firm-policy reference) |
| Source posture | public only / public plus firm policy / public plus firm policy plus evidence / connector-aware |
| Assumptions | |

## Per-case findings table

One row per case in the sample. Confidence labels follow the per-case QA memo; vendor and counterparty self-attestation in the case file carry lower confidence than system-of-record extracts.

| Case ID | Disposition | Filing-window posture | Material findings (count and tags) | Severity (case-level) | Confidence | Cross-reference |
|---|---|---|---|---|---|---|
| | filed / not-filed-closed / closed-with-continuing-review / escalated-pending | met / not-met / not-applicable | [count] [tags: typology-citation / FinCEN-advisory-linkage / narrative-coherence / no-file-rationale / continuing-activity / confidentiality-tipping-off / evidence-completeness / structured-field-narrative-mismatch] | material-defensibility / documentation-gap / training-observation / process-change-candidate | high / medium / low / unknown | per-case memo path |

## Recurring themes

- [Theme: a finding tag appearing in N of M cases, with the criterion violated (FFIEC SAR section, the operative SAR rule, FinCEN form, applicable advisory, the institution's SAR program) and a one-line description]
- [Theme]
- [Theme]

## Recommendations

| Recommendation | Type | Owner role | Forum | Due date |
|---|---|---|---|---|
| | training-feedback / process-change / re-open-investigation-list / escalation-to-SAR-review-committee / no-further-action | | BSA officer / SAR review committee / QA team lead / AML director | YYYY-MM-DD |

> Recommendations to file, amend, supplement, or decline any SAR are out of scope. Where a per-case finding implies a filing decision, route as escalation to the SAR review committee or the BSA officer, who decide.

## Material gaps

- [evidence needed]
- [legal or compliance review needed]

## Source trace

| Claim | Source | Section | Date | URL or file path |
|---|---|---|---|---|
| | | | | |

- Confidence label (roll-up level): high / medium / low / unknown
- Per-case `[verify section]` markers from the sector overlay propagate into the per-case memos and into the relevant rows of the per-case findings table; do not smooth them at roll-up level.

## Decision forum

- Named forum: BSA officer / SAR review committee / QA team lead / AML director / audit
- Decision status: draft / submitted / in-review / decided / deferred
- Decision date: [YYYY-MM-DD]
- Conditions: [where applicable]
