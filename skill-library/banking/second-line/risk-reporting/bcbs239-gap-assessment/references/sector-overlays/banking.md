# Banking sector overlay for bcbs239-gap-assessment

When the scope record names sector `banking`, this overlay adds banking-specific fields and review demands to the assessment. Where there is conflict between the capability defaults and this overlay, the overlay governs the banking-sector elements.

Loaded by: `bcbs239-gap-assessment/SKILL.md` when `scope.sector_overlay_set` includes `banking`, or when the institution type implicates a federal banking regulator (national bank, state member bank, savings association, bank holding company, foreign banking organization with US operations).

BCBS 239 is the banking-anchored regime. This overlay is the primary one for the skill; it does the substantive work and the other sector overlays are lighter.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for banking BCBS 239 assessments

### 1. Binding for G-SIBs and operative for D-SIBs / large LFIs

BCBS 239 binds G-SIBs by Basel Committee designation and reaches D-SIBs through national-supervisor adoption with a three-year implementation window from designation. In the United States, the operative supervisory expectations flow through FRB SR 12-17 (Consolidated Supervision Framework for LFIs), the OCC Heightened Standards (12 CFR Part 30 Appendix D) for OCC-supervised covered banks, and FRB horizontal-review practice on RDARR.

Assessment-side implications:

- For a US G-SIB, all fourteen principles are in scope at the consolidated level; the rating uses the BCBS vocabulary and is the artifact a horizontal-review team will read.
- For a US D-SIB or LFI under SR 12-17, the assessment is operative even where the firm is not a G-SIB; the FRB expectation chain and the OCC Heightened Standards (where applicable) supply the prudential reach.
- For a foreign banking organization, the parent's home-supervisor BCBS 239 posture is the consolidated frame; the US operations carry SR 12-17 and (where the IHC crosses thresholds) Heightened Standards expectations independently.
- For a community or regional bank below the SR 12-17 / Heightened Standards thresholds, BCBS 239 is best-practice rather than binding; assessments at this scale are typically scoped to risk-data layer maturity rather than full fourteen-principle ratings.

### 2. FRB tailoring framework interaction

The FRB's tailoring framework (Categories I-IV under the 2019 final rule) sets prudential standards including capital, liquidity, stress-testing, and risk-management expectations by category. BCBS 239 expectations interact with the tailoring categories: Category I and II firms carry the heaviest BCBS 239 expectations (CCAR, daily liquidity reporting, FR 2052a granularity); Category III firms carry intermediate expectations (DFAST, less granular liquidity reporting); Category IV firms carry lighter expectations.

The assessment's supervisory-context block names the firm's tailoring category. The Principle 5 (timeliness) and Principle 6 (adaptability) ratings are read against the granularity and frequency expectations of the firm's category, not against a uniform G-SIB benchmark.

### 3. OCC Heightened Standards extension

For OCC-supervised covered banks, 12 CFR Part 30 Appendix D §II (Risk Governance Framework) [verify section labels] sets independent risk management, board composition and oversight, risk-appetite statements, and supporting infrastructure expectations. The risk-data infrastructure that supports the risk-appetite statement and the risk reporting that flows to the board sits inside §II and connects to BCBS 239 Principles 1, 2, and 11.

Assessment-side implications:

- Principle 1 (Governance) carries the OCC §II independence expectation; the chief risk executive and the risk-data committee composition are evidenced at the §II depth.
- Principle 2 (Data architecture and IT infrastructure) carries the supporting-infrastructure expectation; the §II frame demands evidence that the risk-data layer can support the risk-appetite statement reporting.
- Principle 11 (Distribution) carries the board-reporting expectation; the §II frame demands evidence that the board receives risk reporting on the cadence the §II governance framework requires.

### 4. CCAR / DFAST overlap on Principles 5 and 6

For banks subject to FRB stress testing (CCAR for Category I-II BHCs; DFAST for Category III-IV BHCs), the stress-testing data layer is the working evidence for Principle 5 (timeliness) and Principle 6 (adaptability). The assessment carries:

- Stress-testing data-aggregation cycle time as the working metric for Principle 5.
- Recent ad-hoc and stress-scenario aggregation runs (intra-cycle ad-hoc requests, ad-hoc capital actions, ad-hoc liquidity stress) as the working evidence for Principle 6.
- Cross-link to the firm's CCAR or DFAST submission cycle for evidence of working timeliness and adaptability.

### 5. Open MRA / MRIA linkage on Principle 13

Principle 13 (Remedial actions and supervisory measures) reads at the firm as posture toward open supervisory findings on risk data. The assessment names every open MRA, MRIA, or 4(m) action touching risk data, with the issue-register reference, owner, target date, and current status. An assessment with an empty Principle 13 finding-set is not credible at a large bank; supervisors expect linkage to the firm's open-finding population on the risk-data layer.

### 6. Home/host coordination on Principle 14

For a US G-SIB with material non-US operations, or for a foreign banking organization with material US operations, Principle 14 (Home/host cooperation) addresses the framework for sharing risk data with home and host supervisors. The assessment records:

- The home supervisor and the material host supervisors named.
- The data-sharing framework (supervisory college participation, information-sharing protocols, joint data requests).
- The firm's posture on cross-border consistency of risk-data definitions, lineage, and reporting.

For a US-domiciled G-SIB, the home supervisor is the FRB; the material host supervisors typically include the ECB (for SSM-supervised EU subsidiaries), the PRA (for UK subsidiaries), and others by footprint.

## Banking-specific output template additions

The following fields are added to the assessment (mapped to schema where present):

- `scope.tailoring_category` — Category I / II / III / IV / not-tailored / FBO-IHC.
- `scope.heightened_standards_inscope` — boolean, true for OCC-supervised covered banks.
- `scope.bank_charter_type` — national bank / state member / state nonmember / savings association / BHC / FBO-IHC.
- `scope.primary_federal_regulator` — OCC / FRB / FDIC / NCUA.
- `scope.stress_testing_inscope` — boolean with cross-reference to CCAR or DFAST submission.
- `principle_results[].evidence_summary` — Principle 5 and 6 entries reference stress-testing cycle evidence and recent ad-hoc-aggregation runs.
- `principle_results[].gaps[].linked_issue_id` — Principle 13 entries link to open MRAs, MRIAs, or 4(m) actions in the issue register.
- `linked_open_issues[]` — open supervisory findings on risk data named explicitly.

## Common pitfalls in banking BCBS 239 assessments

- Rating Principle 6 as `largely-compliant` without recent ad-hoc-aggregation evidence. The BCBS thematic-finding pattern reads this as not credible; supervisors probe Principle 6 evidence first.
- Treating CCAR / DFAST stress-testing capability as separate from BCBS 239 Principles 5 and 6. Stress testing is the working evidence for both principles at a CCAR/DFAST firm.
- Rating Principle 13 from a generic statement of remediation discipline without naming open MRAs / MRIAs. The Principle 13 evidence is the firm's open-finding population, not its policy.
- Treating the FBO IHC as a standalone perimeter without addressing parent-group BCBS 239 posture. The IHC inherits the parent's risk-data layer and the assessment's supervisory-context block must address both.
- Aggregating ratings across legal entities without a documented rationale. For multi-entity banking groups, per-entity ratings can vary; the aggregation rationale is part of the methodology section.
- Omitting the OCC Heightened Standards reach where the firm is OCC-supervised and crosses the threshold; supervisors catch the omission in the §II cross-walk.
- Importing financial-statement data-quality controls (SOX 404) as Principle 3 evidence. BCBS 239 is risk-data-anchored; SOX 404 is financial-statement-anchored. The doctrines do not substitute.
