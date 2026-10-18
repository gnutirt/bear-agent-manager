# Example: 10-K Item 106 disclosure refresh for a large accelerated filer

Public-source-derived, no named institution. Structural reference patterns are public 10-K Item 106 disclosures filed in 2024 spring and 2025 spring filing seasons (e.g., the structural pattern in JPMorgan Chase's 10-K Item 106 filed February 2024 and the structural pattern in Bank of America's 10-K Item 106 filed February 2024 [verify section references at draft time]) — used as structural references only; this example does not claim or copy substantive disclosure language.

## Input

- Institution: a large accelerated filer; SEC-registered bank holding company; with state-member-bank subsidiary, registered broker-dealer subsidiary, and registered investment adviser subsidiary. NYDFS-licensed.
- Engagement scope supplied: primary regulators FRB, OCC, NYDFS, SEC; persona = head of disclosure preparing 10-K cycle; sector overlays = banking, capital-markets; cross-cutting overlays = cyber (core), climate.
- Trigger: large accelerated filer is preparing the FY 10-K. Item 106 was first disclosed in the prior-year 10-K. The second-line review function is refreshing Item 106 for the current year, with three changes: (1) a new third-party assessor engagement for cyber program review (replacing a different prior assessor); (2) a refreshed board-oversight cadence — cyber risk is now reported quarterly to the Risk Committee with an annual deep-dive to the full board (the prior-year cadence was twice-yearly to the Risk Committee with no full-board deep-dive); (3) a refreshed CISO function structure with a new dotted-line reporting to the CRO (the prior-year structure was solid-line to CIO only).
- Source posture: public (regulatory text); plus firm policy (information security policy, board charter, prior-year 10-K Item 106, Risk Committee charter); plus system of record (board minutes through the period, cyber-risk-register output, third-party assessor engagement letter and report).
- Material effects to date: zero material cybersecurity incidents in the FY period; prior-year period had one incident filed under Item 1.05 (currently in remediation; carried through this year's material-effects narrative).
- Filer category: large accelerated filer. Item 106 is in scope (effective for FY ending on or after December 15, 2023).

## Output sketch

The skill emits a markdown pack and the structured record. Headlines from Artifact B:

- **Filing context**: filing period end = December 31; filing type = 10-K; prior-year filing reference (filed February of prior year); year-over-year diff scope = "material refresh" (three substantive changes named above).
- **Item 106(b) draft** — five discrete subsections per the rule's required elements:
  - 106(b)(1) processes — describes the firm's cyber risk-management lifecycle: identification, assessment, mitigation, monitoring; references the firm's information-security program in FFIEC-aligned terms (because the firm operates against FFIEC expectations and the language is internally consistent); does not name FFIEC but uses the program's vocabulary.
  - 106(b)(1)(i) integration — describes how the cyber risk-management processes integrate into the firm's enterprise risk-management framework; cyber is a separately-rated risk category in the enterprise heat map (consistent with the firm's risk taxonomy).
  - 106(b)(1)(ii) third-party engagement — describes the firm's engagement of independent third-party assessors for periodic cyber-program review; does not name the assessor entity (the rule does not require it); discloses that the firm replaced its prior assessor with a new assessor for the current year and the current year's assessment is in progress.
  - 106(b)(1)(iii) third-party service-provider oversight — describes the firm's third-party risk management program for cyber including critical-vendor cyber-attestation, ongoing monitoring, contractual incident-notification provisions, and concentration-risk view; references the firm's TPRM framework consistent with interagency third-party risk management guidance.
  - 106(b)(2) material effects — names the prior-year incident (with reference to the prior-year 8-K Item 1.05 filing accession), summarizes its current remediation status, and concludes that it has not had, and is not reasonably likely to have, a material effect on the firm's business strategy, results of operations, or financial condition based on facts known as of the filing date.
- **Item 106(c) draft** — two discrete subsections:
  - 106(c)(1) board oversight — names the Risk Committee of the Board with cyber oversight; describes the cadence (refreshed: quarterly committee briefings, annual full-board deep-dive); describes the processes by which the Risk Committee is informed (CISO written report ahead of each meeting; quarterly KRI dashboard; ad-hoc briefings on material incidents and on supervisory-finding updates).
  - 106(c)(2) management role — names the CISO as the management position responsible for cyber risk; describes the named expertise (CISO with named credentials and prior experience; new dotted-line reporting to CRO is described); describes the reporting line to the board through the CRO and the Risk Committee Chair; describes the firm's Cybersecurity Steering Committee (chaired by the CISO with members from operational risk, technology, audit, GC office, business-unit heads).
- **Material effects to date — structured record**: one entry for the prior-year incident, with affected period (prior-year FY), effect summary (one paragraph), linked 8-K Item 1.05 reference (filing date and accession number).
- **Source trace per claim** — each governance and risk-management assertion is anchored:
  - Risk Committee oversight assertion → Risk Committee charter section + board minutes through the FY.
  - Quarterly cadence → board calendar + Risk Committee meeting minutes.
  - Full-board deep-dive → board calendar + full-board meeting minutes for the annual session.
  - CISO function structure → information security policy + organization chart effective dates + HR record of CRO dotted-line reporting effective date.
  - Third-party assessor engagement → engagement letter + scope-of-work document.
  - Cybersecurity Steering Committee → committee charter + meeting minutes.
- **Year-over-year diff** — one row per Item 106 element with prior-year text, current-year text, and rationale:
  - 106(b)(1)(ii) third-party assessors: rationale = "new assessor engaged for current year"; the diff is substantive.
  - 106(c)(1) board oversight: rationale = "cadence refreshed from twice-yearly Risk Committee to quarterly Risk Committee plus annual full-board deep-dive, effective Q1 of FY".
  - 106(c)(2) management role: rationale = "CISO function structure refreshed with new dotted-line reporting to CRO, effective Q2 of FY".
  - Other elements: rationale = "no substantive change — refreshed for currency".
- **Sign-off block**: head of disclosure, securities counsel, CISO, audit-committee secretary acknowledgement, disclosure committee chair; sign-off date.
- **Reviewer questions for the disclosure committee**: (1) the FFIEC-program-aligned language in 106(b)(1) is internally consistent with the firm's information-security policy; does the disclosure committee want explicit FFIEC reference in the disclosure or to retain the program-vocabulary-only treatment; (2) the new third-party assessor's engagement is in progress with the report due in Q2 of next year; does the disclosure address that timing or refer to it as "ongoing"; (3) the CISO-to-CRO dotted-line reporting refresh is recent (Q2 of current year); how does the disclosure committee want to characterize the maturity of the new structure; (4) the prior-year incident's current remediation status is described in 106(b)(2); does the disclosure committee want any additional detail on remediation milestones or hold to the materially-affected language; (5) the Risk Committee charter section reference is to the prior-year charter; has the charter been refreshed in the current year and if so, the source-trace pointer should reference the current charter.
- **Confidence label** = high on governance posture (well-evidenced through board minutes, charters, organization-chart records); medium on certain risk-management process claims pending the third-party assessor sign-off in Q2 of next year. Confidence label per the schema = medium overall (taking the lower of the discrete-section confidences).
- **Verification flags carried forward**: SEC C&DIs for Item 106 (verify current question numbers); FFIEC IT Handbook section labels (verify); prior-year 8-K Item 1.05 filing accession (verify against EDGAR).

## Why this scenario matters

- Item 106(b) and Item 106(c) are discrete subsections; rolling them together is the failure mode. The pack treats each required element as a discrete row.
- Year-over-year diff and rationale is required. "Rolled forward unchanged" Item 106 is a frequent finding; this example shows three substantive changes documented with effective dates and rationale.
- "Material effects to date" is treated as a stated determination. The empty case (no current-period incidents) and the non-empty case (the prior-year incident with linked 8-K Item 1.05 reference) are both addressed substantively.
- Specific titles and qualifications matter in 106(c). The example names the Risk Committee, the cadence, the CISO function structure, and the Cybersecurity Steering Committee. Generic "the appropriate management committee" reads as boilerplate.
- Source trace per claim links each governance assertion to a board minute, charter section, organization-chart record, or policy reference. The source-trace block is the evidence the disclosure committee and the audit-committee secretary review before sign-off.
- The confidence label is honestly mixed (high on governance, medium on risk-management pending the new assessor sign-off). The schema treats the overall label as the lower bound; reviewer questions surface where the label is medium.

## Anchors

- SEC Final Rule (Release Nos. 33-11216 / 34-97989), Reg S-K Item 106(b), 106(c).
- Exchange Act Rule 13a-15 (DCP).
- FFIEC IT Examination Handbook, Information Security booklet (September 2016).
- 12 CFR Part 30 Appendix D (OCC Heightened Standards) — Section IV's independent risk committee expectations.
- Interagency Guidance on Third-Party Relationships (June 2023) — for the 106(b)(1)(iii) third-party service-provider oversight content.
- SEC Compliance and Disclosure Interpretations (C&DIs) on Item 106.

See `references/source-anchors.md` for full citations and verification flags.
