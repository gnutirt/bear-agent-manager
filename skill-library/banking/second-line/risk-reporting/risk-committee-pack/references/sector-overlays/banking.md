# Banking sector overlay for risk-committee-pack

When the scope record names sector `banking`, this overlay adds banking-specific structure and content expectations to the committee pack. Where there is conflict between the capability defaults and this overlay, the overlay governs the banking-sector elements.

Loaded by: `risk-committee-pack/SKILL.md` when `scope.sector_overlay_set` includes `banking`, or when the institution type implicates a federal banking regulator (national bank, state member bank, savings association, BHC, FBO with US operations).

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for banking committee packs

### 1. Risk taxonomy follows the OCC Heightened Standards categories

The heat map for OCC-supervised covered banks uses the eight Risk Governance Framework categories named in 12 CFR Part 30 Appendix D Section II: credit, interest rate, liquidity, price, operational, compliance, strategic, and reputation. Most firms add at least three more in committee reporting (model risk, third-party risk, financial-crime risk), and most add cyber as a standalone category even though it sits under operational in the regulatory taxonomy. Climate is reported under strategic with documented rationale (see the climate cross-cutting overlay) unless the firm has elected a standalone climate cell.

For BHCs reporting under FRB SR 12-17, the risk taxonomy aligns to the LFI rating system components (capital, liquidity, governance and controls).

### 2. Risk Appetite Statement is the centrepiece

12 CFR Part 30 Appendix D Section III requires a written RAS with both qualitative components and quantitative limits, and the framework must provide for monitoring and reporting against the limits. The committee pack:

- Reports each RAS metric with limit, trigger, tolerance, and current value.
- Shows the ladder from the RAS metric to first-line operating limits. A pack that reports RAS metrics without the operating-limit linkage does not demonstrably meet the Section III expectation.
- Names breach owners and recalibration requests as decision items, not as status updates.

For non-OCC banks (state member banks, FDIC-supervised state nonmembers), the RAS expectation comes through Regulation YY (12 CFR Part 252 — Subpart C §252.22 risk-committee at $50B; Subpart D §§252.31-252.36 enhanced prudential standards at $100B), FDIC Statement of Policy on Bank Risk Management, or the firm's own framework; the substantive shape is the same. (SR 11-7 was the model-risk anchor, **superseded by the Joint Interagency Revised Guidance on Model Risk Management — OCC Bulletin 2026-13 / FRB SR 26-2 / FDIC FIL-15-2026, April 17, 2026** — and is not the RAS anchor.)

### 3. MRA / MRIA aging and closure status is a standing section

OCC and FRB supervisory letters distinguish Matters Requiring Attention (MRA) and Matters Requiring Immediate Attention (MRIA). The Issues and Remediation section of the pack carries:

- Open MRA count and over-age count, with the firm's defined age threshold.
- Open MRIA count and over-age count.
- Each MRA / MRIA over the age threshold listed individually with regulator, finding date, action plan, owner (role), forward action, and slippage commentary.
- Closure status for items closed in the period, with the regulator's response (closed by examiner letter, in dispute, awaiting examiner confirmation).

A counter-only treatment is insufficient under SR 12-17 and Heightened Standards.

### 4. Capital and liquidity content for stress-eligible BHCs

For BHCs subject to CCAR or DFAST, the pack carries:

- Most recent stress-test results (DFAST public results; CCAR objection / non-objection status; firm-side internal stress).
- Current capital ratios against the minimum, buffer, and management-buffer thresholds; movement against prior period.
- LCR and NSFR position for in-scope BHCs (Category I-IV per the FRB tailoring framework, with applicability varying by category); contingency funding plan test record; brokered-deposit and BaaS-deposit treatment for firms with material fintech-partner deposit relationships.
- Resolution-planning status for §165(d) covered companies.

Verify current CCAR / DFAST scope and tailoring-category applicability at pack-write time as the FRB tailoring framework (12 CFR §252.5) has been amended multiple times since 2019.

### 5. Three-lines-of-defense and independent-risk-management evidence

Under 12 CFR Part 30 Appendix D Sections IV-VI, the board oversees compliance through an independent risk committee, the CRO is independent of front-line units, and internal audit is independent of both. The committee pack typically includes a brief on:

- CRO and head-of-internal-audit attestations on the independence of their respective functions.
- Front-line risk-management maturity (Section IV expectations on front-line unit responsibility).
- Any open issues affecting the framework itself (e.g., a structural independence gap surfaced by internal audit).

This content is light in routine quarterly packs and substantial in the annual pack ahead of a Heightened Standards horizontal review.

### 6. CRA, fair-lending, and consumer-compliance roll-up

Where the BHC has consumer banking subsidiaries, the committee pack carries a brief on CRA performance status, fair-lending exam findings, and consumer-compliance issue posture. Depth varies by BHC structure; a holding-company-level pack typically references a separate compliance committee pack for detail.

CRA modernization rule (2023 final rule) has been subject to legal challenge; verify current effective state and the firm's posture at pack-write time.

### 7. Cross-link to other capability skills

- KRI commentary for individual RAG-breached metrics: `risk-reporting/skills/kri-commentary`.
- Open-issue write-ups beyond the standing aging summary: `risk-compliance-core/skills/issue-writeup`.
- Management responses to open MRAs / MRIAs: `risk-reporting/skills/management-response`.
- BCBS 239 self-assessment for the data confidence appendix: `risk-reporting/skills/bcbs239-gap-assessment`.
- Cyber-disclosure-decision content (Item 1.05 8-K trigger analysis): `risk-reporting/skills/cyber-disclosure-readiness`.

## Banking-specific output template additions

Added to the pack (mapped to schema where present):

- `pack_metadata.heightened_standards_inscope` — boolean, true for OCC large banks subject to 12 CFR Part 30 Appendix D.
- `pack_metadata.bank_charter_type` — national bank / state member / state nonmember / savings association / BHC / FBO IHC.
- `pack_metadata.primary_federal_regulator` — OCC / FRB / FDIC.
- `pack_metadata.tailoring_category` — FRB tailoring category (I, II, III, IV) for in-scope BHCs.
- `pack_metadata.stress_testing_inscope` — boolean, with cross-reference to CCAR or DFAST submission.
- `heat_map[]` — twelve-cell layout (eight Heightened Standards categories plus model, third-party, financial-crime, cyber); climate under strategic unless separately rated.
- `ras_status[]` — operating-limit-ladder column added; breach owner field required.
- `issues_summary` — MRA / MRIA buckets with regulator-letter dates and closure status.
- `forward_looking.regulatory_horizon[]` — named items (e.g., FRB stress test scenario publication; expected NYDFS Part 500 amendment effective date; Heightened Standards horizontal-review schedule).

## Common pitfalls in banking committee packs

- Reporting RAS metrics without the operating-limit ladder. Section III expects monitoring and reporting against limits; the ladder is the reviewer's check that limits flow through to the front line.
- Treating MRA / MRIA as a counter rather than a manager. Each over-age item needs an owner, forward action, and slippage commentary; the standing aging summary is necessary but not sufficient.
- Stress-test summaries that report only the public DFAST result without the firm's internal stress posture and the implications for the management buffer. The committee owns the buffer policy; the pack supports that ownership.
- Cyber as a separate floating appendix rather than a heat-map cell or a documented sub-category. Cyber risk affects multiple Heightened Standards categories (operational, compliance, strategic, reputation) and the pack treats it as enterprise risk.
- Climate as bolt-on rather than mapped under strategic (or separately rated with documented rationale). The climate cross-cutting overlay covers the substantive content; the heat-map placement is a pack-architecture decision the chair should not have to make at the meeting.
- Carrying three years of stress-test detail in every quarterly pack. The standing pack carries the current cycle and a short trend; the annual pack carries the multi-cycle view.
