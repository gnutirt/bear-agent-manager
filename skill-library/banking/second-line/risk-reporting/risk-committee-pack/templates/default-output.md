# Risk committee pack: [Committee name] — [Period]

Starting structure for an enterprise (or board) risk committee pack. Depth flexes with the firm's tier (Heightened Standards covered bank, Category III BHC, mid-cap regional, RIA, insurer, payments-fintech) and the audience (board risk committee, enterprise risk committee, adviser risk committee). Section list does not flex; if a section is omitted, the rationale is documented (for example, "climate not separately rated; reported under strategic with documented rationale" goes in the heat-map section).

The pack is a draft until the CRO and the head of risk reporting review and the committee secretary distributes.

---

## Cover

- Committee: [e.g., Risk Committee of the Board / Enterprise Risk Committee / Adviser Risk Committee]
- Meeting date: [YYYY-MM-DD]
- Period covered: [start YYYY-MM-DD] to [end YYYY-MM-DD]
- Classification: [internal / board-confidential / regulator-shareable]
- Pack version: [v1 / v1-revised]
- Engagement-scope ID (if `scoping` was run): [ID]

---

## Decision items requested

The first body section a committee member reads. A pack with no decision items is a status update, not a committee instrument.

| ID | Decision requested | Recommended option | Vote / acknowledgement | Owner |
|---|---|---|---|---|
| D1 | [decision] | [option] | [vote-required / acknowledgement-only / noting-only] | [role] |
| D2 | [decision] | [option] | [vote-required / acknowledgement-only / noting-only] | [role] |

Full detail of each decision (options, rationale, dissents, required vote) is in the Decision items section below.

---

## CRO summary

Up to seven bullets, in CRO voice. Read by the chair before the meeting.

- [Headline movement in the period]
- [Top risk drawing the committee's attention]
- [Material event or near-miss]
- [RAS posture, including any breach or trigger]
- [Forward-looking signal the committee should know about]
- [Decision pointer]
- [Confidence and BCBS 239 posture]

---

## Heat map by risk type

Every cell carries current rating, prior rating, direction, and short commentary. Deteriorating cells are addressed in the Top risks section. Climate is included as a separately-rated cell where the firm reports it that way; otherwise it is mapped under strategic with rationale documented in the cell commentary.

| Risk type | Current | Prior | Direction | Quantified exposure | Commentary |
|---|---|---|---|---|---|
| Credit | [low / moderate / elevated / high] | [same enum] | [improving / stable / deteriorating] | [optional] | [pointer to top-risks entry if elevated or high] |
| Market | | | | | |
| Liquidity | | | | | |
| Operational | | | | | |
| Compliance | | | | | |
| Financial crime | | | | | |
| Model | | | | | |
| Third-party | | | | | |
| Cyber | | | | | |
| Climate | | | | | [if separately rated; otherwise reported under strategic with rationale] |
| Strategic | | | | | |
| Reputational | | | | | |
| Conduct | | | | | [where the firm separately reports conduct] |

---

## Top risks

Each named risk drives one or more deteriorating heat-map cells. Owners are roles, not named individuals.

| Risk ID | Risk name | Risk type | Exposure (where quantified) | Key drivers | Owner | Linked heat-map cell |
|---|---|---|---|---|---|---|
| TR1 | [risk name] | [risk type] | [number with unit] | [drivers] | [role] | [cell] |

---

## Material risk events in the period

Loss events above the firm threshold, near-misses, control failures, regulatory actions, and external events. Each event has root-cause, impact, status, and linked issue IDs.

| Event ID | Date | Type | Description | Gross impact | Net impact | Status | Linked issues |
|---|---|---|---|---|---|---|---|
| E1 | [YYYY-MM-DD] | [loss-event / near-miss / control-failure / regulatory-action / external-event] | [description] | [number with unit, or null] | [number with unit, or null] | [open / under-investigation / remediated / closed] | [issue IDs] |

---

## KRI movement and breaches

KRIs from the upstream feed; breach commentary drafted by `kri-commentary` and consumed here. Each KRI carries threshold, prior, current, RAG, and commentary citing root cause, owner, and remediation status.

| KRI ID | KRI name | Risk type | Threshold | Prior | Current | RAG | Breach age (days) | Commentary |
|---|---|---|---|---|---|---|---|---|
| K1 | [KRI name] | [risk type] | [threshold] | [prior] | [current] | [green / amber / red] | [age in days; null if within] | [pointer to kri-commentary entry] |

---

## Risk appetite status

The committee owns the risk appetite statement. Each RAS metric reports limit, trigger, tolerance, current value, breach status, and the ladder-to-operating-limit column. The ladder column is required for OCC Heightened Standards covered banks and recommended for all firms with a layered RAS.

| RAS metric | Limit | Trigger | Tolerance | Current | Breach | Ladder to operating limit | Commentary |
|---|---|---|---|---|---|---|---|
| [metric name] | | | | | [within / at-trigger / breach] | [how the metric ladders to first-line operating limits] | |

Recalibration requests, where any, are surfaced as decision items.

---

## Issues and remediation status

Each over-age item carries owner, forward action, and slippage commentary. Counts and ageing alone fail the SR 12-17 / Heightened Standards expectation that the committee manages, not just counts, the open population.

| Bucket | Open count | Over age | Age threshold (days) |
|---|---|---|---|
| MRA | | | |
| MRIA | | | |
| Audit | | | |
| Regulatory exam | | | |
| Internal high-severity | | | |

For each over-age item:

- **[Issue ID]** — [issue name]. Owner: [role]. Age: [days]. Forward action: [action with date]. Slippage commentary: [why the prior commitment slipped, what changed].

---

## Forward-looking commentary

Named, dated, regulator-anchored items only. Generic "emerging risks include cyber, AI, and climate" fails the section; replace with named items the committee can act on.

- **Emerging risks**: [named items, with the source signal]
- **Regulatory horizon**: [named upcoming or in-flight rule changes, dated, with implication]
- **Scenario results**: [stress test or scenario results in the period, with breach flag if applicable]

---

## Climate section (when in scope)

When the scope flags climate, this section carries the climate-risk-specific reporting. Heat-map placement is reported in the Heat map by risk type section; this section carries governance, scenarios, and the link to disclosure.

- **Governance summary**: [board oversight, management oversight, climate-risk officer or equivalent]
- **Physical risk summary**: [acute and chronic, key exposures]
- **Transition risk summary**: [policy, technology, market, reputational, key exposures]
- **Scenarios used**: [e.g., NGFS Net Zero 2050, NGFS Delayed Transition, NGFS Current Policies, FRB pilot scenario]
- **Linked 10-K disclosure section**: [10-K Item 1500 series reference or "not in scope"; SEC climate rule current effectiveness flagged in source trace]

---

## Decision items (full detail)

For each decision listed at the top of the pack:

### [Decision ID]: [Decision title]

- **Background**: [one paragraph]
- **Options considered**: [option A, option B, option C]
- **Recommended option**: [option, with rationale]
- **Dissents (if any)**: [named role and dissent rationale]
- **Requested action**: [vote-required / acknowledgement-only / noting-only]
- **Owner**: [role]

---

## Appendix A: Data confidence and BCBS 239 posture

- **Data confidence label**: [high / medium / low / unknown]
- **BCBS 239 known limitations**: [list from the most recent self-assessment]
- **Restatements in this period**: [list, with reason]

If known limitations are non-empty, the data confidence label cannot be high.

---

## Appendix B: Source trace

For every material claim in the pack:

| Claim | Source | Evidence reference | Confidence |
|---|---|---|---|
| [claim] | [system, document, or `[evidence needed]`] | [pointer] | [high / medium / low / evidence-needed] |

---

## Appendix C: Glossary

Risk taxonomy terms used in the pack, in plain English. Aligned to the firm's risk taxonomy where one is in force.

---

## Sign-off block

The pack is a draft until the CRO and the head of risk reporting review.

- **CRO**: [role; sign-off date]
- **Head of risk reporting**: [role; sign-off date]
- **Committee chair acknowledgement**: [date once distributed]

Reviewer questions for the secretary to surface in the meeting:

1. [Question tagged to the heat-map movement]
2. [Question tagged to the over-age MRA or MRIA list]
3. [Question tagged to the RAS breach or trigger]
4. [Question tagged to the forward-looking item most likely to come up in the meeting]
5. [Question tagged to the data confidence label]
