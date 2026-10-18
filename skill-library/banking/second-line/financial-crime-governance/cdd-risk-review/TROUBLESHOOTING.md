# Troubleshooting: cdd-risk-review

Recurring pitfalls. Read before producing the review memo and again before sign-off.

## Scope discipline

### Drifting into the rating decision

The QA produces findings, gaps, and routing recommendations against the CDD file. It does not set or change the customer risk rating, approve onboarding, file a SAR, or exit the relationship. The named decisionmaker is the BSA officer (with the customer-onboarding compliance lead and the EDD committee where the firm uses one). The skill outputs `recommendation`, not `decision`. A QA artifact that says "downgrade the rating to low" or "approve the account" or "exit the relationship" has misread its scope.

### Reading three pillars instead of four

CIP is identification and verification at onboarding. CDD adds beneficial ownership, nature-and-purpose / expected activity, and ongoing monitoring. A "file looks complete" finding that did not separately read all four pillars has under-read the work. The schema's `cip_coverage`, `beneficial_ownership`, `expected_activity`, and `ongoing_monitoring` fields force the four-pillar read.

### Treating CIP completeness as CDD completeness

A clean CIP is necessary but not sufficient. The QA marks `cip_status = sufficient` and still reads the next three pillars on their own. A frequent defect: a polished CIP folder masks thin work on expected activity and monitoring scope.

### Reading the wrong rule for the institution

A bank-flavoured read on a broker-dealer file applies the wrong CIP rule and misframes the EDD posture. Load the sector overlay first; the operative CIP/CDD rule set sits there.

## Beneficial-ownership discipline

### Beneficial ownership treated as a one-time form

A legal-entity customer's ownership changes between refresh cycles; the file does not always reflect it. The QA reads the certification date against the latest entity filings, the signatory list, public filings, and any transactional pattern that implies undisclosed control. A certification dated five years ago on an entity with a public ownership change last year is a material gap, not a stylistic observation.

### Trust, sole-prop, and unincorporated-association customers treated as legal entities under §1010.230

`§1010.230` applies to legal-entity customers as defined. Trusts, sole proprietors, and unincorporated associations are not legal-entity customers under the rule. The QA scopes the rule before applying the pillar; out-of-scope customers get the `not_applicable` status, not a "beneficial ownership missing" finding.

### Exempt-entity claims accepted as a default

`§1010.230` carries an exemption list (publicly traded companies, certain regulated entities, certain pooled investment vehicles, others). Exemption claims are read against the rule, not assumed. A default exemption status is a finding.

### BOI filing status asserted on stale ground

`31 CFR §1010.380` (CTA implementing rule) has had live litigation; the entity-class scope and the rule-state have moved through district-court rulings, nationwide injunctions, stays, and FinCEN interim final rulemaking. The QA marks `boi_filing_status` with an as-of date and the rule-state read on that date, and uses the `verify` enum value when the rule-state is unsettled for the customer's entity class. Asserting `required` or `not_required` without grounding is itself a finding.

## Expected-activity discipline

### Boilerplate profiles treated as adequate

"General business banking", "personal banking", "active trading" without specifics cannot drive monitoring scenario tuning. The QA flags non-specific expected-activity statements as a material gap, not a stylistic preference. The schema's `specificity = generic` value carries the finding.

### Quantification missing on customer types where it matters

Cash-intensive businesses, high-velocity retail traders, cross-border-payment customers, MSB customers, and large-premium covered-product customers all benefit from quantified expected-volume figures. Where the firm's monitoring scenarios depend on calibration to an expected baseline, the QA reads whether the baseline exists in the file.

### Customer self-attestation treated as corroboration

A source-of-wealth statement on a high-net-worth customer, an expected-volume narrative on a small-business customer, and a beneficial-ownership certification are all customer claims. The QA treats them as claims, not as corroboration; corroboration is what other file evidence provides. The schema separates customer self-attestation from corroborated evidence in the source-trace structure.

## Risk-rating discipline

### Rating drivers as labels

"Cash-intensive", "international", "PEP-adjacent" without evidence underneath are labels. The QA reads whether each driver ties to file evidence and marks `rating_drivers[].evidence_status = label_only` where it does not. The rating itself stays the firm's call; the QA does not change it.

### QA changes the rating

The skill does not change the rating. A material misalignment between rating and drivers is a finding routed to the BSA officer and the rating-governance forum the firm uses; the QA frames the finding as a routing recommendation, not a directive.

### Refresh cycle treated as the only refresh trigger

Refresh is event-driven and time-based on a risk basis. A 24-month cycle was met, but a publicly known change in customer circumstances since the last refresh is itself an event-driven trigger. The QA reads both.

## Monitoring-scope discipline

### Re-tuning monitoring scenarios in the CDD QA

Monitoring scenario tuning belongs to `aml-model-monitoring`. The CDD QA surfaces a finding when the monitoring scope or the threshold calibration does not match the customer's risk profile or the expected-activity profile, and cross-references; it does not re-tune the scenarios.

### Generic monitoring scope on customers that warrant typology-specific tuning

A high-net-worth international customer, a cash-intensive business, a crypto-adjacent fintech customer all carry typology-specific monitoring expectations. A generic "small-business monitoring scenarios" entry on file is a `monitoring_scope_alignment` finding.

## EDD discipline

### EDD-trigger application without a sector-overlay read

The foreign-correspondent EDD frame (`§1010.610`) is for accounts maintained for foreign FIs; it is not a generic "international counterparty" rule. The private-banking EDD frame (`§1010.620`) carries a defined account-type scope. The QA scopes the rule before applying it.

### Building the EDD pack inside the CDD review

EDD escalation routes through `edd-escalation-pack`. The CDD QA marks `edd_status` and cross-references; it does not produce the EDD pack itself. A QA artifact that includes the EDD analysis has stepped into the next skill's scope.

## Sector-specific pitfalls

### Applying the bank rule to a broker-dealer or fund

Bank CIP under `§1020.220` is not the same as broker-dealer CIP under `§1023.220` or mutual-fund CIP under `§1024.220`. Load the sector overlay first.

### Applying the insurance rule to non-covered products

`§1025.210` covers permanent life with cash value, annuities with cash value, and other investment-type products. P&C, term life without cash value, group products, and health are generally outside scope. The QA scopes the product before applying any pillar.

### Treating an investment-adviser customer as in-scope before the FinCEN adviser rule's compliance date

The FinCEN adviser AML rule (August 2024) phased in compliance dates. The QA dates the read and scopes the rule's effective state on that date for the adviser in question.

### Reading the fintech onboarding artifact as the sponsor bank's CIP record

In a sponsor-bank model, the bank is the institution of record. The QA reads whether the bank reviewed and accepted the fintech's onboarding work, not whether the fintech's onboarding flow ran.

## Output discipline

### Citing without sections

Every regulator citation in the QA carries a section reference or a `[verify section]` placeholder. URL alone fails the source-anchor depth check. Use `references/source-anchors.md` for the canonical citation set; do not restate excerpts in the artifact body.

### Marking unsupported claims silently

Use `[evidence needed]` explicitly. An inferred claim presented as evidenced is the failure mode the source-trace structure exists to prevent.

### Closing with too much certainty

The confidence label is `high` only when the source posture, the file evidence, and the QA criteria all line up. `medium` and `low` are normal for early-stage QA work; `unknown` is honest where the firm has not yet resourced the evidence ask. A `high` confidence label on a memo with material gaps across two or three pillars is incoherent.

### Memo over-extending into the next skill

Each adjacent skill has its own scope: `edd-escalation-pack` builds the EDD pack; `sar-decision-qa` reviews the alert decision; `aml-model-monitoring` re-tunes scenarios; `negative-news-triage` triages adverse media; `sanctions-screening-qa` disposes screening matches. The CDD QA flags cross-references and stops at the cross-reference.
