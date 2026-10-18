# Conduct cross-cutting overlay for attestation-pack

When the scope record flags `conduct` for the attestation pack, this overlay sets the conduct-attestation content for named pack sections. Conduct attestations surface at firms with consumer-facing businesses (sales-practices attestations, fair-lending self-assessments, suitability and best-interest attestations).

Loaded by: `attestation-pack/SKILL.md` when `scope.cross_cutting_set` includes `conduct`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- FINRA supervisory rules: Rule 3110 (supervision), Rule 3120 (supervisory control), Rule 3130 (CEO certification), Rule 2111 (suitability), Rule 2090 (KYC).
- SEC Regulation Best Interest (17 CFR §240.15l-1) and Form CRS (17 CFR §240.17a-14) for broker-dealers.
- Investment Advisers Act Rule 204A-1 (Code of Ethics) and Rule 206(4)-7 (compliance).
- Equal Credit Opportunity Act (Regulation B, 12 CFR Part 1002) and Fair Housing Act for fair-lending attestation.
- CFPB UDAAP authority under Sections 1031 and 1036 of the Consumer Financial Protection Act.
- HMDA reporting under Regulation C (12 CFR Part 1003) for fair-lending data attestation.

## What changes for conduct-flagged attestation packs

### 1. FINRA Rule 3130 CEO certification

For FINRA member firms, Rule 3130 requires the CEO to certify annually that the firm has processes in place to establish, maintain, review, test, and modify policies and procedures reasonably designed to achieve compliance with applicable securities laws. The attestation pack supporting Rule 3130 typically:

- Anchors the assertion text to Rule 3130(b) explicitly.
- Carries process-owner and CCO sub-certifications on each substantive compliance area (supervision, suitability, KYC, anti-money-laundering, books and records, regulatory reporting).
- Surfaces the Rule 3120 supervisory-control report as an evidence-index entry.
- Carries CEO sign-off (this is the executive certification at the broker-dealer level).

### 2. Reg BI and Form CRS attestation

For broker-dealers in scope of Regulation Best Interest, attestations on Reg BI compliance frequently surface as part of the annual compliance review or as a discrete artifact. The attestation pack typically:

- Anchors to Reg BI's four obligations (disclosure, care, conflict of interest, compliance) explicitly.
- Carries process-owner sub-certifications on each obligation.
- Surfaces Form CRS filing and delivery process attestations.

### 3. Fair-lending self-assessment

For lenders subject to ECOA (Reg B) and the Fair Housing Act, fair-lending self-assessments are recurring attestations frequently consumed by examiners and by the firm's board. The attestation pack typically:

- Anchors to ECOA / Reg B and to the firm's fair-lending policy.
- Covers the underwriting, pricing, marketing, servicing, and loss-mitigation phases.
- Carries the most recent statistical analysis (HMDA-data analysis where applicable; comparative-file review results) as evidence-index entries.
- Surfaces any disparate-treatment or disparate-impact findings as exceptions with linked issues.
- Carries Head of Fair Lending or CCO sign-off and routes to the board.

### 4. Sales-practices and suitability attestation

For broker-dealers and investment advisers, sales-practices and suitability attestations surface periodically (annually or quarterly depending on firm policy). The attestation pack typically:

- Covers the suitability-determination process, the supervisory review structure, and the exception-handling flow.
- Surfaces sample-test results from the supervisory review as evidence-index entries.
- Reflects findings from the most recent independent-testing exercise.
- Carries CCO sign-off.

### 5. UDAAP attestation linkages

For consumer-finance firms supervised by the CFPB (or state-level analogs), UDAAP-program attestations frequently surface. The attestation pack typically:

- Covers the UDAAP risk assessment, the complaint-handling process, the marketing review process, and the third-party oversight (UDAAP risk extends to service providers under Section 1031).
- Surfaces complaint trends and root-cause analysis as evidence-index entries.
- Reflects any consent orders, MRAs, or regulatory findings on UDAAP topics as current or prior-period exceptions.

### 6. Sign-off and review machinery

Conduct attestation packs typically include the Chief Compliance Officer, the Head of Fair Lending (where the firm has one), the General Counsel, the Chief Audit Executive, and the CEO or business-unit head at the executive layer. Routing depends on the artifact: Rule 3130 to FINRA-relevant senior management; fair-lending self-assessments to the board (typically Audit Committee or a dedicated Fair Lending Committee); UDAAP attestations to CCO and the board's risk or audit committee.

## Verification flags

- FINRA Rule 3130(b) — confirm current text and any FINRA-issued guidance.
- Reg BI — confirm any SEC staff guidance updates at pack-write time.
- Reg B / ECOA — confirm any CFPB rulemaking updates affecting fair-lending data collection or analysis.
