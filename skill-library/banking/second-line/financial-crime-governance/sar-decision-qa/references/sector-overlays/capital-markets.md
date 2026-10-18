# Capital-markets sector overlay — sar-decision-qa

When the scope flags capital markets (broker-dealers, investment advisers running affiliated BD activity, mutual funds, futures commission merchants), load this overlay alongside `references/source-anchors.md`.

## Operative SAR rules in scope

- **31 CFR §1023.320** — Reports by brokers or dealers in securities of suspicious transactions [verify section]. The BD SAR rule. Threshold $5,000; 30-day filing window; 60-day window where no suspect identified. **Per October 9, 2025 SAR FAQ posture: 90-day continuing-SAR cadence is firm-policy convention, not a rule requirement.**
- **31 CFR §1024.320** — Reports by mutual funds of suspicious transactions [verify section]. Open-end management investment companies registered under the Investment Company Act. The fund or the fund's transfer agent / principal underwriter, depending on the program design, files.
- **31 CFR §1026.320** — Reports by futures commission merchants and introducing brokers of suspicious transactions [verify section]. The FCM SAR rule.

Investment advisers do not currently have a stand-alone SAR rule; advisers may be reached through their affiliated BD's SAR program or through SEC-supervisory expectations. Track the FinCEN rulemaking on covered investment advisers as it evolves [verify current state of FinCEN IA AML and SAR rulemaking on the date of analysis].

## SEC- and FINRA-supervised SAR program elements

- **FFIEC manual is not the operative examiner anchor for BDs and funds** — SEC examination staff and FINRA examiners are. The QA reads the BD's written supervisory procedures (WSPs) under **FINRA Rule 3110 (supervision)** and the fund's compliance program under **Investment Company Act Rule 38a-1**. The SAR program sits inside those frames.
- **FINRA Rule 3310** — AML compliance program. Independent testing, designated AML officer, ongoing training, CIP. The SAR program reports up through the firm's AML officer.
- **SEC Division of Examinations risk alerts on AML programs at advisers and BDs** [verify specific risk alerts current on the date of analysis] — read for current examination focus.

## Capital-markets-specific typology population the QA encounters most

- Microcap pump-and-dump — coordinated buying activity in a low-float security followed by mass distribution.
- Match-trading and prearranged-trading patterns — wash-trade signatures, often crossing related accounts at the BD or across affiliated BDs.
- Insider trading-adjacent patterns — pre-news anomalous activity in a security subject to a known event; the SAR-decision file routes through legal and compliance and the BD's market-surveillance team.
- Spoofing and layering on equities or futures — order-book manipulation patterns.
- Late-trading and market-timing in mutual funds — mostly historical typology but still on the FFIEC and SEC radar.
- Securities-account funding from third-party sources unrelated to the customer — money-laundering-through-securities pattern.
- Sanctions-adjacent activity in custody or settlement chains.

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the BD's or fund's customer-segmentation work. SAR-decision findings on segment-mismatch (e.g., a retail brokerage account showing institutional-trading patterns) feed back.
- **`aml-model-monitoring`** carries the BD's transaction-monitoring and surveillance-system governance.
- **`sanctions-screening-qa`** carries sanctions-screening alert-decision QA.

## Cross-link to other plugins

- **`market-conduct-and-customer-outcomes/best-execution-surveillance`** [verify skill exists in current build] — where the SAR alert sits adjacent to a best-execution or market-manipulation pattern, cross-reference rather than absorbing both lenses.
- **`third-party-operational-resilience/vendor-diligence`** for transfer-agent, fund-accountant, principal-underwriter, custodian SAR-program-handoff diligence.

## Output-template additions for capital markets

- Operative SAR rule as a named field (`bd-1023-320`, `mutual-fund-1024-320`, `fcm-1026-320`).
- Surveillance-system source attribution (the BD's order-book surveillance, the fund's transfer-agent monitoring) as a named field.
- Market-manipulation-typology label drawn from the typology list above where applicable.
- Cross-reference to market-surveillance and best-execution work where the alert sits adjacent.

## Common pitfalls in capital-markets SAR-decision QA

- Importing the FFIEC bank-flavoured frame as if it were operative for a BD or fund; the FFIEC manual SAR section informs but does not bind, and SEC / FINRA examiners are the primary audience.
- Treating an investment-adviser-only firm as if a BD SAR rule applied directly; the rule applies to the affiliated BD, not the IA, until FinCEN's IA SAR rulemaking is operative.
- Missing the route into market-surveillance work for spoofing, layering, microcap, and insider-trading-adjacent patterns; the SAR-decision file should reflect the surveillance-team handoff.
- Skipping the late-trading / market-timing typology read on mutual-fund alerts as "historical" when the customer activity matches the pattern.
- Confusing CIP findings (which sit in `cdd-risk-review`) with SAR-decision findings.
