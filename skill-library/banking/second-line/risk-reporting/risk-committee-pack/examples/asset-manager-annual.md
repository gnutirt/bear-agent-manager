# Example: annual adviser risk committee pack at a registered investment adviser

Public-source-derived. No named institution. The shape mirrors the standing annual cycle at a large SEC-registered investment adviser with a broker-dealer affiliate. The adviser-level risk committee (CRO function) is distinct from the fund boards; this pack is for the adviser, not the funds.

## Input

- Institution: large RIA with an affiliated broker-dealer; complex registered fund complex; significant separately-managed account business.
- Engagement scope supplied: primary regulators SEC (Investment Management, Trading and Markets) and FINRA; persona = head of risk reporting, second line, reporting to the CRO; sector overlay = capital-markets; cross-cutting overlays = cyber (because of SEC cyber disclosure obligations on the public parent and Reg S-P amendments touching adviser and fund records); climate not loaded (not material at the adviser-firm level for this period); source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- Period: full year; annual standing meeting of the adviser-level Enterprise Risk Committee.
- Upstream artifacts on file: adviser-level KRI feed (18 metrics across investment risk, operational risk, technology, vendor, regulatory, conduct, financial crime, cyber, fiduciary); the open-issues register from internal audit and the affiliated BD compliance function; the loss-event log; the firm's risk appetite statement (15 metrics); the latest cyber tabletop results; one Form PF current-event filing in the period; one BD net-capital headroom alert (within tolerance, no breach).

## Output sketch

- **Cover and decision items requested** — meeting date, committee = Adviser Enterprise Risk Committee (distinct from fund boards), period = full year, classification = internal. Two decisions: (i) approval of the refreshed adviser RAS for the next cycle, including a new RAS metric on cyber tabletop pass rate; (ii) acknowledgement of the Form PF current-event filing posture and the proposed forward escalation path.
- **CRO summary** — five bullets. Headline: risk profile stable across most types; cyber elevated due to threat-environment shift not firm-specific incidents; vendor concentration narrowing on a single trade-execution vendor flagged as elevated and deteriorating; one Form PF current-event filing during the period; BD net capital headroom adequate.
- **Heat map by risk type** — adviser-level taxonomy: investment, operational, technology, vendor, regulatory, conduct, financial-crime, cyber, fiduciary. Climate not separately rated this period; rationale documented (climate is not material at the adviser-firm level given product mix). Each cell carries current/prior/direction.
- **Top risks** — five named risks. Trade-execution vendor concentration; cyber threat environment with named impact pathway through the SaaS portfolio-management platform; Form PF current-event reporting accuracy and timeliness; fiduciary risk on best-execution evidence; regulatory risk around SEC cyber disclosure rule applicability to the public parent (Item 1.05 / Item 106 mechanics) and Reg S-P May 2024 amendments compliance posture.
- **Material risk events** — Form PF current-event filing logged with date, type, status = closed; one near-miss on the order-management system (failed-trade detection caught within tolerance); one regulatory-action item (FINRA inquiry not yet at exam stage).
- **KRI movement and breaches** — 18 KRIs with prior, current, threshold, RAG, commentary. Two RED breaches (vendor-concentration on trade execution; cyber phishing-click rate). One AMBER. The three over-threshold KRIs each have commentary from `kri-commentary`.
- **Risk appetite status** — 15 RAS metrics. One breach (vendor concentration), one at-trigger (cyber phishing). Ladder-to-operating-limit column populated for adviser-firm RAS metrics; the BD net-capital RAS metric ladders to Exchange Act Rule 15c3-1 limits and is reported separately for the BD entity within the adviser group.
- **Issues and remediation status** — open MRAs (0; not a bank), audit issues (9, three over 90 days), regulatory exam findings (2 from the most recent SEC adviser exam, both in remediation), internal high-severity (5).
- **Forward-looking commentary** — named items: SEC cyber disclosure rule applicability and the public parent's Item 1.05 / Item 106 readiness state; Reg S-P May 2024 amendments and the 30-day customer notice posture for individuals reasonably likely to have been affected (compliance dates flagged for verification at write time); SEC proposed Cybersecurity Risk Management Rule for advisers and funds with current state flagged for verification; NYDFS Part 500 amendments effective dates affecting the NY-licensed BD entity; FINRA Rule 4530 reporting items in motion.
- **Climate section** — omitted this period; rationale documented in the appendix.
- **Decision items (full detail)** — both decisions with options, recommended option, requested vote/acknowledgement, owner.
- **Appendices** — data confidence label = high on most KRIs (system-of-record evidence); medium on vendor-concentration KRI (tracker rebuilt this year); BCBS 239 not directly applicable but reference to the firm's internal data-quality framework; source trace; glossary; sign-off block (CRO, committee chair).

The pack stops at draft. The CRO reviews before the committee secretary distributes.

## Why this scenario matters

- The adviser-level enterprise risk committee is distinct from the fund boards. Items material to the fund board may also be material to the adviser, but the audiences and the recommendations differ; the pack reflects the adviser-firm scope.
- Risk taxonomy is adviser-shaped, not bank-shaped. Investment risk, fiduciary risk, and conduct risk are present. Credit, market, and liquidity in the bank sense are not in the heat map (market risk reads at the portfolio level, owned by investment risk; liquidity reads at the fund level, owned by fund boards).
- BD net capital and customer protection (Exchange Act Rules 15c3-1 and 15c3-3) feed the adviser-group view but are reported separately for the BD entity. The capital-markets sector overlay tells the skill how to surface this.
- Climate is not in scope this period, and the rationale is documented. The skill does not invent a climate cell; the cross-cutting overlay loader respects the scope.
- SEC cyber disclosure rule and Reg S-P amendments are forward-looking items, not in-period events. The forward-looking commentary names them with the verification posture intact.

## Anchors

- BCBS 239 (January 2013), Principles 7-11 (referenced as a leading-practice anchor for adviser data-quality discipline; not directly binding).
- COSO ERM (2017).
- SEC Investment Advisers Act Rule 206(4)-7 (compliance program).
- SEC cyber disclosure final rule (Release Nos. 33-11216, 34-97989; effective dates phased).
- SEC Reg S-P amendments (final May 16, 2024; phased compliance dates flagged).
- NYDFS 23 NYCRR Part 500 (post-November-2023 amendments).
- Exchange Act Rules 15c3-1 and 15c3-3 (BD net capital and customer protection).

See `references/source-anchors.md` for full citations and verification flags.
