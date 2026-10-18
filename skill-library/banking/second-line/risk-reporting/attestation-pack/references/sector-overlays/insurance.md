# Insurance sector overlay for attestation-pack

When the scope record names sector `insurance`, this overlay adds insurance-specific structure and content expectations. Where there is conflict between capability defaults and this overlay, the overlay governs the insurance-sector elements.

Loaded by: `attestation-pack/SKILL.md` when `scope.sector_overlay_set` includes `insurance`, or when the institution type is an insurer or insurance group.

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for insurance attestation packs

### 1. NAIC Model Audit Rule (Model #205) ICFR attestation

For insurers above the premium threshold (conventionally $500 million single insurer or $1 billion insurance group, with state-by-state variation), Model #205 Section 16 requires an annual management report of internal control over financial reporting filed with the domiciliary-state insurance department. The structure parallels SOX §404:

- Management assertion on the design and operating effectiveness of ICFR over financial-statement preparation.
- Identification of material weaknesses.
- Sub-certifications from process owners (claims, underwriting, reserving, investments, reinsurance, statutory reporting) feeding the function-head sub-certification feeding the CFO-level assertion.
- External-auditor attestation on the management assertion (where the carrier is in scope of the auditor-attestation requirement).

The attestation pack typically covers the function-head and process-owner layers; the CFO-level assertion is owned by the CFO function with auditor coordination.

### 2. ORSA management assertion (Model #505)

For insurers in scope of the Risk Management and Own Risk and Solvency Assessment Model Act (#505), the annual ORSA Summary Report carries an implicit management assertion on the risk-management framework and the own-risk-and-solvency assessment. The attestation pack supporting the ORSA Summary Report typically:

- Maps the control inventory to ORSA Summary Report Section 1 (Description of the Insurer's Risk Management Framework), Section 2 (Insurer's Assessment of Risk Exposure), and Section 3 (Group Risk Capital and Prospective Solvency Assessment).
- Carries CRO sub-certification on the risk-management framework.
- Carries Chief Actuary sub-certification on the prospective solvency assessment and capital projections.
- Carries CFO sub-certification on the group risk capital and the financial-statement linkage.

### 3. Statutory accounting and SAP attestation

Beyond GAAP-based ICFR under Model #205, statutory accounting principles (SAP) carry their own attestation expectations through the Annual Statement and the actuarial opinion. The attestation pack for statutory reporting typically:

- Anchors to the NAIC Accounting Practices and Procedures Manual.
- Carries process-owner sub-certifications on each Schedule of the Annual Statement (Schedule F reinsurance recoverables, Schedule D investments, Schedule P loss reserves where applicable).
- Coordinates with the appointed actuary on the actuarial opinion (which is a separate attestation under Section 5 of the actuarial opinion model regulation).

### 4. Cyber attestation under NAIC Insurance Data Security Model Law (#668)

For state-licensed insurers in jurisdictions that have adopted Model #668 (state-by-state adoption), the annual notice of compliance signed by the senior officer is a recurring attestation. The cyber overlay (`references/cross-cutting/cyber.md`) carries the substantive content; the insurance overlay reflects that for insurers, Model #668 is the parallel to NYDFS Part 500 §500.17(b) for non-NYDFS-licensed carriers.

### 5. Sign-off and review machinery

Insurance attestation packs typically include the appointed actuary as a named reviewer on actuarial-opinion-adjacent attestations, the General Counsel for legal review, the Chief Audit Executive for internal-audit perspective, and the CFO and CRO at the function-head layer. The board Audit Committee receives the annual Model #205 report; the lead state insurance department receives the ORSA Summary Report and (where applicable) the Model #205 management report.

## What the overlay leaves to the SKILL workflow

This overlay names the insurance-specific anchors and use cases. It does not replicate the workflow steps.
