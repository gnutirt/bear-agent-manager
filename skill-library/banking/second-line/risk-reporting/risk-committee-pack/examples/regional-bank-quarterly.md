# Example: quarterly risk committee pack for a Category III BHC

Public-source-derived. No named institution. Framing patterns from FRB tailoring (12 CFR Part 252), OCC Heightened Standards (12 CFR Part 30 Appendix D), and TCFD (June 2017; October 2021). Climate posture reflects voluntary TCFD-aligned reporting because the parent group reports under EU CSRD; SEC climate rule treated with `[verify current effectiveness]` per the source-anchors discipline.

## Input

- Institution: Category III bank holding company under the FRB tailoring framework. Mid-cap regional, predominantly commercial and consumer banking, with a small payments-processing subsidiary.
- Engagement scope supplied: primary regulators FRB and OCC; persona = head of risk reporting, second line, reporting to the CRO; sector overlay = banking; cross-cutting overlays = climate, cyber; source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- Period: Q2; standing quarterly risk committee meeting.
- Upstream artifacts on file: 14 KRIs from the upstream feed (three from `kri-commentary` already drafted), the open-issues register from internal audit and regulatory affairs, the loss-event log for the period, the firm's risk appetite statement (22 metrics), the latest BCBS 239 self-assessment, the latest FRB stress test results, and a vendor-outage incident report.
- CRO has flagged operational risk and third-party concentration as deteriorating, model risk as stable but with two open MRAs from the most recent OCC continuous-monitoring letter, and climate as in-scope under TCFD-aligned voluntary disclosure.

## Output sketch

The skill emits a markdown pack and a structured record. Headlines:

- **Cover and decision items requested** — meeting date, committee = Risk Committee of the Board, period, classification = board-confidential. Two decisions requested up front: (i) extension request on the two model-risk MRAs with a revised remediation date; (ii) approval of a revised RAS metric on third-party concentration.
- **CRO summary** — five bullets in CRO voice. Headline: operational and third-party deteriorating, model stable but MRA load needs decision, climate scenario commentary added per TCFD, RAS within tolerance overall with one trigger-level alert on third-party concentration.
- **Heat map by risk type** — twelve-cell heat map. Operational: elevated, deteriorating, with YTD loss-event count quantified. Third-party: elevated, deteriorating, with concentration headroom narrative. Model: moderate, stable, with the two MRAs flagged. Cyber: moderate, stable. Climate: moderate, stable, narrative-only (no separately-rated cell because climate is reported under strategic with documented rationale per the climate overlay). Credit, market, liquidity, compliance, financial crime, strategic, reputational each carry current/prior/direction.
- **Top risks** — six named risks driving the elevated cells. Each has owner (role, not person), exposure where quantified, key drivers, and linkage to the heat-map cell. Top of the list: vendor-outage exposure in payments processing; concentration on a single sponsor relationship; two model-risk MRAs related to a transaction-monitoring model.
- **Material risk events** — one Tier 1 loss event (vendor outage in payments processing, 12-hour duration, customer-facing), with date, gross and net impact, root-cause summary, status = remediated, linked issue ID. Two near-misses logged but not material individually.
- **KRI movement and breaches** — table of 14 KRIs with prior, current, threshold, RAG, and commentary. Three RED breaches (operational loss, third-party concentration, model-risk MRA aging); one trigger-level alert (cyber phishing-click rate). Each breach commentary cites root cause, owner, and remediation status; the three drafts already produced by `kri-commentary` are consumed verbatim.
- **Risk appetite status** — 22 RAS metrics with limit, trigger, tolerance, current value, breach status, and the ladder-to-operating-limit column. One breach (third-party concentration), one at-trigger (operational-loss YTD), 20 within. Recalibration request named for third-party concentration; cited as decision item (ii).
- **Issues and remediation status** — open MRAs (3, two over 180 days), MRIAs (0), audit issues (12, four over 90 days), regulatory exam findings (4, all within age), internal high-severity (8, two over 60 days). Each over-age item carries owner, forward action, and slippage commentary; the MRA list is the source for decision item (i).
- **Forward-looking commentary** — three named items: FRB stress test 2026 hypothetical scenario published February 2026 and the firm's expected response posture; expected NYDFS Part 500 amendment effective date impact on the cyber program; the SEC climate disclosure rule current effectiveness flagged as unresolved with the firm's continuing voluntary TCFD posture noted.
- **Climate section** — TCFD-aligned governance and risk management subsections; NGFS Net Zero 2050 and Delayed Transition scenarios used; pointer to the parent group's CSRD-aligned disclosure. Source-trace appendix flags SEC climate disclosure rule current effectiveness.
- **Decision items (full detail)** — both decisions with options, recommended option, dissents (none recorded), requested vote (vote-required for both), owner (head of model risk for (i); head of TPRM for (ii)).
- **Appendices** — data confidence label = medium (three of 14 KRIs have known data-lineage gaps documented in the latest BCBS 239 self-assessment, so 'high' is not available); BCBS 239 known limitations enumerated; source trace per material claim; glossary; sign-off block (CRO and committee chair, with reviewer questions for the secretary to surface).

The pack stops at draft. The CRO and the head of risk reporting review before the committee secretary prepares for distribution.

## Why this scenario matters

- Heat map with movement and exposure is the centrepiece. Static heat maps fail; this one shows direction and quantified exposure on the deteriorating cells.
- Decision items are first, not last. The committee charter calls for a status update and decisions; the load-bearing section is decisions, and the pack reflects that.
- Climate is in scope and treated as enterprise risk, not a bolt-on appendix. The decision to map it under strategic (rather than as a separately-rated heat-map cell) is documented; the climate cross-cutting overlay covers the scenarios and the link to disclosure.
- SEC climate rule is treated with verification discipline. The forward-looking commentary names the unresolved status and the firm's continuing voluntary TCFD posture; no claim of current effectiveness is asserted.
- Data confidence label is not 'high' because BCBS 239 known limitations are non-empty. Schema validation enforces this; the label is medium.

## Anchors

- BCBS 239 (January 2013), Principles 7-11.
- COSO ERM (2017).
- 12 CFR Part 30 Appendix D (OCC Heightened Standards).
- FRB SR 12-17 (Consolidated Supervision Framework for Large Financial Institutions, December 2012).
- TCFD Final Report (June 2017); Implementing the Recommendations (October 2021).
- NGFS climate scenarios (current vintage, voluntary reference).
- 12 CFR Part 252 (FRB tailoring framework).

See `references/source-anchors.md` for full citations and verification flags.
