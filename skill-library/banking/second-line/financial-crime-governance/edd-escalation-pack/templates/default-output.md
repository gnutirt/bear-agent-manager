# EDD escalation pack

**Customer ID**: [canonical record ID; placeholder for sample]
**Customer (role / type)**: [no named natural persons or institutions in narrative]
**Institution type**: [bank | broker-dealer | mutual fund | covered-product life insurer | FCM/IB | MSB | fintech (sponsor-bank) | covered investment adviser | other]
**Operative anchors**: [e.g., FFIEC PEP / private banking / correspondent sections; `31 CFR §1010.620`; `§1010.610`; CDD Final Rule]
**Engagement ID**: [pointer to scope record, or "none — scope not formalised"]
**As of**: [date]
**EDD trigger**: [pep | private_banking | correspondent | cash_intensive | high_risk_jurisdiction | complex_ownership | msb_affiliated | sanctions_adjacent | event_driven | other]
**Pack type**: [initial_escalation | periodic_refresh | event_driven_refresh | exit_deliberation_basis]
**Owner (role)**: [e.g., second-line EDD reviewer]
**Approver (role)**: [EDD committee | designated EDD approver]
**Confidence label**: [high | medium | low | unknown]

## 1. Background and EDD trigger

- What surfaced the escalation (CDD QA finding, periodic cycle, event, regulatory inquiry).
- Pointer to upstream `cdd-risk-review` record where applicable.
- Date of last EDD refresh (if any) and what has changed since.
- Customer summary and product footprint at this institution.
- Cross-jurisdictional footprint relevant to the trigger.

## 2. Beneficial ownership and control chain

> Walk the chain layer by layer. Stop at the certification only when the rule scope warrants; do not stop at the form itself for high-risk profiles.

| Layer | Entity / person (role) | Role | Evidence | Residual uncertainty |
|---|---|---|---|---|
| 1 | | control / ownership | | |
| 2 | | | | |
| 3 (trust / nominee / foreign holding) | | | | |

- Inconsistency check vs. entity filings, signatories, public filings, transactional patterns: [findings].
- BOI filing status under `31 CFR §1010.380` (where applicable): [required | not_required | unknown | [verify]] with as-of date.
- Residual uncertainty at each layer: [explicit].

## 3. Derogatory information and adverse media

> Consume `negative-news-triage` outputs where present; do not re-litigate hit triage here.

| Hit | Source | Date | Materiality | Linkage confidence | Disposition pointer |
|---|---|---|---|---|---|
| 1 | | | material / moderate / minor | high / medium / low | |

- Pattern across hits (theme, geography, time-clustering): [observation].
- Open hits awaiting triage: [list with cross-reference to `negative-news-triage`].

## 4. PEP, sanctions-adjacency, and high-risk-jurisdiction posture

- PEP status: [pep | family_close_associate | none | unknown]; source of finding; date assessed.
- Specific role(s) and jurisdiction(s) underpinning the PEP determination.
- Sanctions-adjacency: connected parties; transactional counterparties; jurisdictional exposure.
- High-risk-jurisdiction nexus: nationality, residence, principal place of business, transactional corridors; FATF posture (where in scope) of each named jurisdiction.
- Linkage confidence on each finding.

## 5. Source of wealth and source of funds

> Customer narrative is the statement. Corroboration is what other file evidence provides. Keep them on different lines.

### Source of wealth

- Customer statement (paraphrased; do not quote unless verbatim is in the file).
- Corroboration evidence on file: [public records, third-party documentation, prior-firm references, asset documentation, family-trust deeds, business-sale documentation, employment / role history].
- Independent corroboration confidence: [high | medium | low].
- Residual gaps: [explicit; do not infer].

### Source of funds

- Funding instrument(s): [wire(s), ACH, check, cash, securities transfer, other].
- Originating accounts and counterparties (where evidenced).
- Corroboration evidence on file.
- Residual gaps.

## 6. Customer rationale and expected vs. actual activity

- Customer rationale for the relationship and product mix at this institution.
- Documented expected-activity profile (qualitative and quantified).
- Actual activity summary over the lookback period.
- Deviation findings: [where actual diverges from expected, with the monitoring-scenario link].
- Scenario links: [the firm's monitoring scenarios that fire or should fire on the deviation pattern; cross-reference to `aml-model-monitoring` for tuning consideration].

## 7. Sanctions screening posture

- Current screening status: [clear | hit_in_review | hit_resolved].
- Historical hits and dispositions: [list with disposition rationale pointer; cross-reference to `sanctions-screening-qa`].
- List coverage and watchlist scope at this institution: [OFAC SDN, OFAC sectoral, EU consolidated where in scope, UN, UK OFSI where in scope, internal lists].
- Connected-party screening posture (beneficial owners, signatories, key counterparties).

## 8. Conduct-risk indicators

> Loaded when the scope flags conduct or when a PEP / wealth / private-banking profile makes conduct exposure material. See `references/cross-cutting/conduct.md`.

| Indicator | Evidence | Severity | Anchor |
|---|---|---|---|
| | | material / moderate / minor / observation | [e.g., FCA conduct guidance; FFIEC manual relationship-behaviour treatment; CFPB UDAAP framing where retail harm is in scope] |

## 9. Ongoing monitoring plan

- Scenarios in scope for this customer at this risk profile.
- Threshold calibration vs. the (post-EDD) expected-activity profile.
- Refresh-cycle interval recommended (event-driven vs time-based).
- Off-cycle refresh triggers in scope.
- Cross-reference to `aml-model-monitoring` where tuning is implicated.

## 10. Open issues, evidence-needed items, and committee questions

| ID | Topic | Question / gap | Owner role | Severity |
|---|---|---|---|---|
| 1 | ownership | | | |
| 2 | sof / sow | | | |
| 3 | activity | | | |
| 4 | conduct | | | |
| 5 | sanctions | | | |

> Mark any item without evidence on file as `[evidence needed]`. Do not infer the missing fact.

## 11. Recommended human-review gates and decision options

- **Gate**: EDD committee review (composition: [BSA officer | CCO | sanctions officer | head of private banking / correspondent / wealth | legal | relationship owner]).
- **Decision options the gate evaluates**: [retain_with_conditions | retain_with_enhanced_monitoring | retain_pending_further_evidence | restrict_products_or_volumes | escalate_to_relationship_exit_deliberation | other].
- **Stop conditions**: [conditions under which retention is incompatible with the file evidence; e.g., uncorroborated source of wealth after second cycle; sanctions exposure through connected parties; material derogatory information unresolved after a defined window].
- **Conditions on retention** (if recommended): [bulleted, specific, verifiable, with refresh interval].
- **Cross-references**: [`cdd-risk-review` record; `negative-news-triage` record; `sanctions-screening-qa` record; `aml-model-monitoring` ticket; `sar-decision-qa` linkage if a SAR has been filed or is under consideration].
- The pack is a review artifact. The EDD committee or designated approver decides; the pack does not retain, restrict, or exit.

## 12. Sign-off and source trace

### Sign-off block

- Drafter (role): [second-line EDD reviewer]; date.
- Reviewer (role): [BSA officer or AML QA team lead]; date.
- Approver (role): [EDD committee chair or designated EDD approver]; decision date.
- Decision recorded: [as captured by the gate; pack does not pre-record].

### Source trace

| Claim | Source (file evidence \| customer attestation \| public source \| sector overlay \| source-anchors \| firm overlay) | Section / date | URL or file ref | Confidence |
|---|---|---|---|---|
| | | | | high / medium / low / unknown |

> Cite `references/source-anchors.md` for canonical regulatory citations. Use `[verify section]` only inside the source-anchors file; never in the pack body.

---

*Pack depth scales to trigger and customer profile.* A correspondent-bank EDD pack reads differently from a private-banking PEP pack from a cash-intensive-business pack from a complex-ownership-structure pack. The spine is the same; the load on each section shifts.

*Audience shapes the pack.* The EDD committee reads for the decision; the relationship owner reads for the conditions and the asks; the BSA officer reads for the program-level pattern across packs. Lead with what the audience must decide.
