# Privacy cross-cutting overlay for attestation-pack

When the scope record flags `privacy` for the attestation pack, this overlay sets the privacy-attestation content for named pack sections. Privacy-control attestations surface where the scoped process touches consumer financial information; the GLBA Safeguards Rule annual report is the recurring use case for nonbank financial institutions in scope.

Loaded by: `attestation-pack/SKILL.md` when `scope.cross_cutting_set` includes `privacy`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- GLBA Safeguards Rule, 16 CFR §314.4(g) (annual report to board) for FTC-regulated nonbank financial institutions. Verify section labels post-2021/2023 amendments.
- GLBA Privacy Rule (Regulation P, 12 CFR Part 1016 for CFPB-supervised; 16 CFR Part 313 for FTC-supervised) for consumer privacy notice obligations.
- Consumer Financial Protection Bureau information-security expectations under UDAAP authorities.
- State privacy laws where applicable (CCPA/CPRA, CDPA, CTDPA, others; verify the firm's footprint at pack-write time).

## What changes for privacy-flagged attestation packs

### 1. GLBA Safeguards Rule annual report

For nonbank financial institutions in FTC-supervised scope, §314.4(g) requires the qualified individual (CISO-equivalent) to report at least annually in writing to the board or governing body on the information-security program. The annual report covers:

- Overall status of the information-security program and compliance with the Safeguards Rule.
- Risk assessment results and any changes since the prior assessment.
- Service-provider arrangements and oversight.
- Testing and monitoring results.
- Security events and the firm's response.
- Recommendations for changes to the program.

The attestation pack supporting the §314.4(g) report typically:

- Anchors the assertion text to §314.4(g) explicitly.
- Organises the control inventory by Safeguards Rule elements (designation of qualified individual; risk assessment; access controls; encryption; multi-factor authentication; secure disposal; change management; incident response; service-provider oversight; training).
- Surfaces security events under §314.4(j) (the 2023 amendment's breach-notification requirement) where applicable.
- Carries qualified-individual sign-off and routes to the board or governing body.

### 2. Banking-organisation privacy attestation

For banking organisations supervised by the federal banking agencies, the parallel privacy-attestation content sits within the broader information-security program attestation under FFIEC IT Examination Handbook expectations. The attestation pack typically integrates the privacy elements (consumer privacy notice accuracy, opt-out processes, third-party-sharing oversight under Reg P) into the broader information-security program rather than as a standalone artifact.

### 3. State-privacy-law attestation linkages

Where the firm operates in states with comprehensive privacy laws (CCPA/CPRA in California; VCDPA in Virginia; CTDPA in Connecticut; others), state-privacy-law obligations surface in the attestation. These typically include:

- Consumer-rights-handling processes (right to know, right to delete, right to opt out of sale or sharing).
- Data-protection assessments (DPAs) where the law requires them.
- Sensitive-data-processing controls.
- Service-provider contractual flow-downs.

State privacy laws do not generally require a regulator-filed attestation, but firm-policy attestation frequently covers them. The attestation pack treats state-privacy-law obligations as control-inventory rows rather than as a separate artifact.

### 4. Material-event linkage

Privacy-related security events that meet the §314.4(j) threshold (Safeguards Rule), the SEC Reg S-P customer-notification threshold, the HIPAA Breach Notification Rule threshold, or state breach-notification thresholds surface as exceptions in the attestation period. The pack typically:

- Lists each event with the regulator-notification status, the customer-notification status, and the linked issue ID.
- Carries the firm's response and remediation status.
- Reflects any material findings in the assertion text as a carve-out where the response is incomplete.

### 5. Sign-off and review machinery

Privacy attestation packs typically include the qualified individual (CISO-equivalent for Safeguards Rule), the Chief Privacy Officer (where the firm has one), the General Counsel (legal review), the Chief Compliance Officer, and the board or governing body as the recipient of the annual report.

## Verification flags

- GLBA Safeguards Rule §314.4(g) and §314.4(j) — verify post-2021/2023 amendments.
- State privacy laws — verify the firm's footprint and the in-force compliance dates at pack-write time.
- HIPAA Breach Notification Rule applicability — verify entity classification (covered entity, business associate) where health-information processing is in scope.
