# Capital markets sector overlay for bcbs239-gap-assessment

When the scope record names sector `capital-markets`, this overlay adds capital-markets-specific fields and review demands to the assessment. Where there is conflict between the capability defaults and this overlay, the overlay governs the capital-markets-sector elements.

Loaded by: `bcbs239-gap-assessment/SKILL.md` when `scope.sector_overlay_set` includes `capital-markets`. This is a light overlay. BCBS 239 applies at the BHC level; broker-dealer subsidiaries inherit it. The overlay covers the broker-dealer subsidiary view and the SEC / FINRA reporting data-quality interactions.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for capital-markets BCBS 239 assessments

### 1. BCBS 239 reach to broker-dealer subsidiaries flows through the parent BHC

For a US BHC with a broker-dealer subsidiary, BCBS 239 binds at the consolidated parent level; the broker-dealer subsidiary inherits the parent's risk-data layer through consolidation and through the parent's risk-aggregation responsibilities. The assessment's supervisory-context section names the parent BHC and identifies the broker-dealer subsidiary as a child entity within the consolidated perimeter.

For a standalone broker-dealer that is not part of a BHC (typical at SEC-registered investment advisers and at standalone BDs), BCBS 239 does not directly apply. The assessment frames as voluntary internal benchmark and uses the BCBS 239 grammar without the BCBS supervisory rating posture.

### 2. SEC Rule 17h overlap on Principles 3, 4, 5, and 7

For broker-dealers above the Rule 17h threshold (currently a tentative-net-capital threshold), 17 CFR §240.17h-1T and §240.17h-2T require risk-assessment recordkeeping and reporting on material associated persons. The data layer supporting 17h reporting overlaps with the consolidated risk-data layer that supports BCBS 239 at the parent.

Assessment-side mapping:

- Principle 3 (Accuracy and integrity) and Principle 7 (Accuracy of risk reporting) carry the 17h reporting accuracy as working evidence at the broker-dealer level.
- Principle 4 (Completeness) carries the 17h scope of material associated persons as working evidence on the BD-side of the consolidated perimeter.
- Principle 5 (Timeliness) carries the 17h reporting cycle as working evidence on the BD-side.

### 3. FINRA reporting data quality

For FINRA-member broker-dealers, the data layer supporting FINRA-mandated reporting (FOCUS reports under Rule 17a-5; large trader reporting under Rule 13h-1; CAT under SEC Rule 613; OATS predecessor data; supervision-system reporting under FINRA Rule 3110) is the BD-level evidence for Principle 3 (accuracy), Principle 5 (timeliness), and Principle 7 (accuracy of reporting). The assessment names the in-scope FINRA reports and the data layer that supports them.

### 4. Liquidity and concentration risk reporting at the BD

For broker-dealers carrying material customer or proprietary positions, liquidity and concentration risk reporting at the BD level is the operative working test for Principle 4 (completeness) on the BD-side. The assessment carries the BD's liquidity-stress-testing posture and the concentration-risk reporting cadence.

### 5. CAT data quality is a Principle 3 and Principle 5 concern

The Consolidated Audit Trail (CAT) under SEC Rule 613 imposes data-quality and timeliness expectations on BD-side trade reporting. CAT data-quality issues are operative evidence for Principle 3 (accuracy) and Principle 5 (timeliness) on the BD-side.

### 6. Asset-management subsidiary view

For a BHC with an asset-management subsidiary (1940 Act funds, separate accounts, alternatives), the asset-management subsidiary's risk-data layer (NAV calculation, performance reporting, holdings reporting under Form N-PORT and Form PF) inherits the parent BCBS 239 frame at the consolidated perimeter but operates under SEC reporting-data discipline on the subsidiary side. The assessment notes the subsidiary perimeter and the SEC reporting data layer without conflating the two regimes.

## Capital-markets-specific output template additions

- `scope.legal_entity_perimeter` — names the BHC parent and the BD / IA / asset-management subsidiaries within the consolidated perimeter.
- `scope.broker_dealer_inscope` — boolean.
- `scope.rule_17h_inscope` — boolean.
- `scope.cat_reporter_inscope` — boolean.
- `principle_results[].evidence_summary` — Principles 3, 4, 5, 7 entries reference 17h, FOCUS, CAT, and N-PORT / PF data layers where applicable on the BD or asset-management subsidiary side.

## Common pitfalls in capital-markets BCBS 239 assessments

- Asserting BCBS 239 binding reach to a standalone BD outside a BHC. It does not directly apply; the assessment frames as voluntary internal benchmark.
- Treating CAT data-quality issues as a separate operational matter. CAT is operative evidence for Principle 3 and Principle 5 on the BD-side; a clean BCBS 239 assessment with open CAT data-quality issues is not credible.
- Conflating SEC reporting-data discipline (1940 Act, Form N-PORT, Form PF) with BCBS 239 risk-data discipline. The two regimes are different; the assessment cites each in its proper section.
- Omitting the parent-BHC consolidation context for a BD subsidiary. The BD inherits the parent's BCBS 239 posture; the assessment must address both.
- Treating the broker-dealer's books-and-records discipline (Rule 17a-3 / 17a-4) as Principle 3 evidence. Books-and-records discipline is recordkeeping; Principle 3 is risk-data accuracy and integrity. The doctrines do not substitute.
