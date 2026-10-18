# Example: AMBER cyber phishing-test KRI commentary with disclosure-controls overlay

Public-source-derived. No named institution. Framing patterns from BCBS 239 (January 2013) Principles 7 and 9, the FFIEC IT Examination Handbook Information Security and Cybersecurity sections, and the SEC cyber disclosure framework (Item 1.05; 8-K disclosure controls and procedures discipline). The cross-cutting cyber overlay is loaded; the climate and privacy overlays are not in scope.

## Input

- Institution: public-company bank holding company; SEC registrant; NYDFS-licensed at the bank-subsidiary level.
- Engagement scope supplied: primary regulators FRB, OCC, NYDFS, SEC; persona = head of risk reporting, second line, reporting to the CRO; sector overlay = banking; cross-cutting overlay = cyber; source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- KRI: `CYB-007 / Phishing simulation click-through rate`. Threshold structure: limit = 15%, trigger = 10%, tolerance = 7%. Current value = 12.4%. Prior month = 11.7% (AMBER). Three consecutive months at trigger or breach.
- The CISO function has produced a first-line draft proposing to recalibrate the trigger from 10% to 13% in light of a Q2 change to the phishing-test template population (introduction of AI-assisted spear-phishing templates). Second-line is rewriting and challenging the recalibration.
- Linked feeds: the firm's phishing-simulation test population log, the test-design change record from Q1 to Q2, the secure-email-gateway efficacy reports, the training-completion records, and the most recent BCBS 239 self-assessment (no known limitations bearing on this metric, but a non-comparability flag from the test-design change).

## Output sketch

The skill emits a per-KRI block. Headlines for this block:

- **Header table** — risk type = cyber; subtype = security-awareness; current = 12.4%; prior = 11.7%; direction = deteriorating (marginal); RAG current / prior = AMBER / AMBER; breach status = at-trigger; breach age = 3 periods; linked RAS metric = RAS-CYB-AWARENESS; owner = CISO (role).
- **Root cause (named)** — shift in phishing-test difficulty: Q1 used basic templates; Q2 introduced AI-assisted spear-phishing templates that raised the difficulty curve. The metric movement reflects test-design change, not a population control failure. The underlying control posture (mandatory training completion, multi-factor authentication coverage, secure-email-gateway efficacy) is unchanged across the three periods.
- **Contributing factors** — none `control-failure`; the underlying control posture is stable. `other` (test-design change) is the named driver.
- **Action taken in period** — communication to the workforce on AI-assisted phishing patterns (Owner: CISO; Completed: prior month; Evidence: workforce-communication record). Targeted retraining for the highest click-through cohort (Owner: CISO; Completed: prior month; Evidence: training-completion record).
- **Action planned** — refresh of the secure-email-gateway rules to detect AI-generated lures (Owner: CISO; Target: end of next month; Dependencies: vendor-rule-update ticket). Review of training content for AI-assisted phishing patterns (Owner: CHRO with CISO; Target: next quarter; Dependencies: none).
- **Residual-risk view** — Expected RAG next quarter: AMBER, trending toward GREEN once the gateway-rule refresh and training content land. Not yet evidenced; the residual-risk view is conservative on intent.
- **Linked items** — Issues: none (this is a metric movement attributable to test redesign, not a control issue). Material events: none.
- **Second-line challenge note** — first-line draft proposed recalibrating the trigger from 10% to 13% in light of the test-design change. The second-line view is that the trigger should remain at 10% pending two more periods of refreshed test-population data; recalibrating mid-stream would mask the metric movement and weaken the comparability of future commentary. The challenge note names this divergence and the rationale.
- **Threshold recalibration request** — first-line request named and surfaced for the RAS-owner: proposed change = trigger from 10% to 13%; rationale (first-line) = test-design change raised the difficulty curve; approver role = CRO with risk-committee acknowledgement. Second-line view (above) is to defer.
- **Data confidence note** — non-comparability flag: the Q2 test-population is not comparable with Q1 because of the template-difficulty change. The metric requires two more periods under the new template population to be reliable for trend.
- **Cyber overlay note** — three consecutive periods at trigger triggers the disclosure-controls leading-indicator review per the cross-cutting cyber overlay. Cross-reference `cyber-disclosure-readiness` Artifact C (DCP readiness map): the question for the disclosure-controls trace is whether sustained AMBER on a security-awareness KRI should feed the firm's leading-indicator monitoring under Item 106 disclosure-controls discipline. The pack carries the referral; the disclosure-process owner makes the call.
- **Source trace** — every material claim mapped to source (test-population log, test-design change record, training records, gateway efficacy reports). Confidence: medium across the block, driven by the non-comparability flag.
- **Confidence label** — medium. The test-design change introduces non-comparability with prior periods; the metric requires two more quarters under the new template population to be reliable.

## Why this scenario matters

- Threshold-recalibration request is named, not buried. The first-line ask is surfaced; the second-line view is named; the approver role is identified. The skill does not adjudicate the recalibration; it routes it.
- Non-comparability of metric data is treated as a data-confidence issue. The block carries the explicit non-comparability flag.
- Cross-cutting cyber overlay drives the disclosure-controls referral. Sustained cyber-KRI deterioration is a leading indicator that should feed the firm's disclosure-controls monitoring; the block names the cross-reference rather than absorbing it.
- Action plan has owners and target dates. Both action items carry role-level owners and explicit target dates; dependency IDs are included where relevant.
- Confidence label is medium, not high, because the test-design change degrades comparability.

## Anchors

- BCBS 239 (January 2013), Principles 7 (accuracy of the metric attribution) and 9 (clarity and usefulness).
- FFIEC IT Examination Handbook, Information Security and Cybersecurity sections, KRI examples for security-awareness programs.
- SEC cyber disclosure rule (Release Nos. 33-11216, 34-97989, July 2023) Item 1.05 trigger framework and Regulation S-K Item 106 disclosure-controls discipline; effectiveness verified at write time.
- Cross-link: `cyber-disclosure-readiness` Artifact C (DCP readiness map).

See `references/source-anchors.md` for full citations and verification flags.
