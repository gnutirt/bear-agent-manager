# Example: management response to a federal banking agency MRIA on third-party risk management

Public-source-derived. No named institution. Framing patterns from FRB SR 13-13 (Communication of Supervisory Findings, June 2013), federal banking agencies' interagency third-party risk management guidance (June 2023), 12 CFR Part 30 Appendix D (OCC Heightened Standards), and FRB SR 12-17 (Consolidated Supervision Framework).

## Input

- Institution: Category III bank holding company under the FRB tailoring framework. Mid-cap regional, predominantly commercial and consumer banking, with material reliance on a third-party-risk-management platform and an extended population of fourth-party sub-providers.
- Engagement scope supplied: primary regulators FRB and OCC; persona = head of regulatory affairs, second line, working with the head of TPRM and the CRO; sector overlay = banking; cross-cutting overlays = cyber (because two of the three sub-findings touch IT controls); source posture = public-plus-firm-policy-plus-system-of-record-evidence.
- Finding source: Matter Requiring Immediate Attention from the consolidated supervisor following a continuous-monitoring review of the firm's third-party risk management program. Finding text is provided to the firm in the SR-13-13-conformant communication and is to be quoted verbatim in the response.
- Finding sub-elements: (i) inadequate ongoing-monitoring controls for critical fourth-party dependencies; (ii) the absence of an exit-test record for two critical vendors; (iii) insufficient board reporting on third-party concentration.
- Linked artifacts on file: ISS-2025-0418 (TPRM ongoing-monitoring gap); ISS-2025-0427 (exit-test cadence slippage on two named vendors); ISS-2025-0511 (board-reporting third-party concentration gap).
- Acceptance posture: accept in full, settled with the responding role.

## Output sketch

The skill emits a markdown response and a structured record. Headlines:

- **Cover and addressee** — response date; responding institution (BHC legal entity); addressee = the consolidated supervisor's named office; reference numbers (the supervisor's MRIA ID; internal issue IDs ISS-2025-0418, ISS-2025-0427, ISS-2025-0511); period covered; classification = regulator-confidential. Addressee paragraph follows formal supervisory-letter convention.
- **Executive summary** — five bullets in the head of regulatory affairs voice. Headline: full acceptance; root cause named per sub-finding; 11 milestones over up to 9 months; interim mitigation in place since 30 days post-MRIA receipt; monthly written progress reports to the supervisor until closure; firm-level signatory the General Counsel in addition to the CRO.
- **Finding restatement** — verbatim quotation of the supervisor's wording across the three sub-findings, with the supervisor's numbering preserved.
- **Acceptance posture** — accept for all three sub-findings; rationale brief (no contest).
- **Root cause** — named per sub-finding: (i) the firm's fourth-party identification process did not extend to non-critical-on-paper but operationally critical sub-providers (mechanism: the criticality rubric scored on direct contracted relationship rather than on operational-dependency mapping); (ii) exit-test cadence in policy was annual but had slipped to ad-hoc for the two named vendors (mechanism: exit-test scheduling lived in the vendor-management system as ad-hoc tasks rather than as recurring policy-driven obligations); (iii) the board pack's third-party section did not surface concentration metrics (mechanism: the board pack template was anchored to individual-vendor metrics rather than to portfolio-concentration metrics, and the concentration view existed in a separate management report not promoted to board level).
- **Materiality and impact** — quantified operational-risk exposure from the two named vendors; quantified fourth-party gap (number of operationally-critical sub-providers not covered by the existing identification process); concentration risk currently within RAS but trending toward the trigger; reasonably-foreseeable impact includes RAS breach within two quarters absent remediation. Source trace points to the loss-event log, the operational-risk capital model, and the latest RAS report.
- **Action plan** — 11 milestones across the three sub-findings:
  - Sub-finding (i): 5 milestones over 9 months. Owners: Head of TPRM, CRO, Head of Vendor Management. Dependencies: TPRM platform upgrade scheduled Q4 (named); fourth-party data feed from the platform vendor (named).
  - Sub-finding (ii): 3 milestones over 4 months. Owner: Head of Vendor Management. Dependencies: vendor cooperation on exit-test artifacts (named); business-continuity team availability for exit-test exercises (named).
  - Sub-finding (iii): 3 milestones over 6 months. Owners: Head of TPRM, Head of Risk Reporting, CRO. Dependencies: board-pack template change-control via the committee secretary (named); risk-committee approval of the revised template (named, target Q3 risk-committee meeting).
- **Interim mitigation** — enhanced manual fourth-party review for the highest-criticality vendors completed within 30 days of the MRIA receipt; weekly third-party concentration updates to the CRO from issuance until concentration metrics are in the board pack; restricted on-boarding of new critical vendors pending TPRM platform upgrade.
- **Evidence of effectiveness** — two-consecutive-quarter KRI trend on third-party concentration within RAS; documented exit-test runs for the two named vendors with after-action reports; supervisor walk-through of the upgraded TPRM platform 90 days post-implementation. Owner role = Head of TPRM; re-test cadence after closure = annual TPRM walk-through with the supervisor for two years.
- **Reporting cadence** — monthly written progress reports to the consolidated supervisor's named office until closure; reporting role = Head of TPRM. Closure trigger = two consecutive quarters at GREEN on the relevant KRIs and supervisor-confirmed walk-through completion.
- **Linked issues** — ISS-2025-0418, ISS-2025-0427, ISS-2025-0511. No prior response on this finding ID (this is the initial response; a refresh would carry the slippage commentary).
- **Sign-off block** — responding role = head of regulatory affairs; firm-level signatory = General Counsel (consistent with MRIA convention for the highest-severity supervisory tier); independent reviewer = head of internal audit (challenge function).
- **Confidence label** — high (issues are well-scoped; action plan is dependency-mapped; interim mitigation is in place; all milestones have named owner roles).
- **Reviewer questions** — five questions including: dependency-management for the TPRM platform upgrade; evidence-of-effectiveness method for sub-finding (i) given the platform-upgrade dependency; whether the supervisor walk-through would prefer to review the upgraded platform live or via a structured demonstration; the materiality basis on the fourth-party gap quantification; the closure-trigger negotiation.

The response stops at draft. The General Counsel and the head of regulatory affairs review before the response is sent to the supervisor.

## Why this scenario matters

- The MRIA tier carries the highest-severity supervisory expectations: monthly written progress reports, board-level attention, a senior firm-level signatory in addition to the responding role. The skill applies these defaults; the responding role can adjust where the supervisor's communication specifies otherwise.
- Root cause is mechanism-anchored per sub-finding, not a paraphrase. Each sub-finding has a named mechanism (criticality-rubric scoring on contracted relationship rather than operational-dependency mapping; exit-test scheduling as ad-hoc rather than recurring; board-pack template anchored on individual-vendor rather than portfolio-concentration metrics).
- Action-plan milestones carry named dependencies. The TPRM platform upgrade is the load-bearing dependency; surfacing it explicitly is what the supervisor reads for. A milestone with a target date but no dependency surfacing reads as brittle.
- Evidence of effectiveness is distinct from evidence of completion. The KRI-trend, exit-test after-action reports, and supervisor walk-through together demonstrate the underlying risk has been reduced; documentation of the redesigned controls alone would be control-completion evidence, not residual-risk-reduction evidence.
- Interim mitigation is in place at the response date. For an MRIA, the supervisor reads for whether the firm has acted on the finding while the action plan completes; a response with no interim mitigation reads as deferral.
- Linked-issue consistency is validated. The schema requires the response root cause to match the linked issue write-up's cause field; mismatch surfaces as a reviewer question.

## Anchors

- FRB SR 13-13 (Supervisory Considerations for the Communication of Supervisory Findings, June 2013).
- Federal banking agencies' interagency third-party risk management guidance (June 2023).
- 12 CFR Part 30 Appendix D (OCC Heightened Standards), Sections II, III, IV.
- FRB SR 12-17 (Consolidated Supervision Framework for Large Financial Institutions, December 2012).
- IIA International Standards, Standard 2500.A1 (CAE follow-up; informs the response's evidence-of-effectiveness plan and re-test cadence).
- COSO ERM 2017, Review and Revision component.

See `references/source-anchors.md` for full citations and verification flags.
