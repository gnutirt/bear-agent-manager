# Banking sector overlay for attestation-pack

When the scope record names sector `banking`, this overlay adds banking-specific structure and content expectations to the attestation pack. Where there is conflict between capability defaults and this overlay, the overlay governs the banking-sector elements.

Loaded by: `attestation-pack/SKILL.md` when `scope.sector_overlay_set` includes `banking`, or when the institution type implicates a federal banking regulator (national bank, state member bank, savings association, BHC, FBO with US operations).

## Source basis

Cited and section-referenced in `references/source-anchors.md`. This overlay names the regulators and sources without restating excerpts.

## What changes for banking attestation packs

### 1. SOX 404 attestation framework with COSO 2013

Public BHCs and SLHCs run management's annual ICFR assessment under SOX §404 against COSO 2013. The attestation pack for a process-owner or function-head sub-certification anchors to the COSO components in the control inventory, surfaces deficiencies (control deficiency, significant deficiency, material weakness) per the SEC and PCAOB definitions, and feeds the executive certification under §302 / §906. The skill produces the sub-certification, not the executive certification; the executive certification is securities-counsel-led.

### 2. Heightened Standards risk-governance framework attestation linkage

For OCC-supervised covered banks, 12 CFR Part 30 Appendix D Section IV requires the board (or its risk committee) to review and approve the Risk Governance Framework. Process-owner and function-head sub-certifications under the firm's certification framework typically ladder up to the board attestation that the framework is in place and operating; the attestation pack supports that ladder. The sub-certification chain (`sub_certification_chain[]` in the schema) reflects the ladder explicitly.

### 3. Vendor-management attestation under interagency third-party guidance

The vendor-management attestation use case anchors to the interagency third-party risk management guidance (June 2023), particularly Section III.D (Ongoing Monitoring) and Section III.E (Termination). For each critical third-party relationship, the attestation pack carries:

- Vendor identification (anonymised in shareable artifacts) and criticality tier per the firm's tiering framework.
- Lifecycle-stage organisation of the control inventory (planning, due diligence, contract, ongoing monitoring, termination).
- SOC report reliance evidenced with carve-out review and CUEC-level evidence at the user firm; SOC report alone is not sufficient evidence under the user-firm attestation.
- Exit-test record (where exit testing is in scope under the firm's policy).
- Concentration analysis where the vendor sits at a sector-concentration threshold.

A vendor attestation that cites the SOC report without the CUEC-level evidence or without the carve-out review is the failure mode the troubleshooting file calls out.

### 4. BCBS 239 risk-data attestation

The risk-data attestation use case (Head of Risk Reporting attesting to data quality and report integrity) anchors to BCBS 239 Principle 1 (Governance). For G-SIBs and other in-scope firms, the attestation typically:

- Organises the control inventory by BCBS 239 principle group (overarching governance: Principles 1-2; aggregation: Principles 3-6; reporting: Principles 7-11; supervisory and remediation: Principles 12-14).
- Consumes the most recent self-assessment (produced by `bcbs239-gap-assessment`) as a primary evidence-index entry.
- Reflects current Top-5 priority gaps as exceptions in the current period.
- Feeds the regulatory-capital-reporting attestation chain where the firm files Y-14, Y-9, FFIEC 031/041, and similar regulatory reports.

For SSM-supervised institutions or US-IHC subsidiaries of SSM groups, the ECB Guide on effective risk data aggregation and risk reporting (May 2024 final) raises the bar incrementally; the overlay carries that distinction when the scope flags both jurisdictions.

### 5. Y-14 / Y-9 attestation chain

The regulatory-capital-reporting attestation chain at large BHCs typically includes:

- Sub-certifications from process owners on each in-scope reporting line (credit risk, market risk, operational risk, capital, liquidity).
- Function-head sub-certification from the Head of Risk Reporting.
- Function-head sub-certification from the Head of Regulatory Reporting on the report-production process and reconciliation to source.
- CFO-level certification on the financial-statement linkage.

The attestation pack supports each layer; the executive Y-14 attestation itself is owned by the CFO function and is out of scope for this skill.

### 6. CRA, BSA, and consumer-compliance attestations

BSA officer annual certification (firm-policy artifact, often required by board policy or by examination expectation) is a recurring use case. The attestation pack typically covers:

- The BSA program elements per 31 CFR Part 1020 (internal controls, training, independent testing, BSA Officer designation).
- Fifth Pillar (CDD Rule) elements.
- Sanctions-program elements where the BSA Officer also serves as the OFAC compliance lead.
- Findings from the most recent independent testing and any open MRA or MRIA on AML or sanctions topics.

CRA self-assessments and consumer-compliance attestations follow analogous patterns.

### 7. Sign-off and review machinery

For OCC-supervised covered banks, the named reviewers on a sub-certification pack typically include the function head's direct manager (one ladder up), the Head of Internal Audit's relationship lead for the function, and the General Counsel's office. For process-owner sub-certifications, the function head is the principal reviewer.

For BHCs, the Board Audit Committee receives the annual SOX 404 management report; the executive certification under §302 / §906 is filed with the SEC by the CEO and CFO with securities-counsel review.

## What the overlay leaves to the SKILL workflow

This overlay names the banking-specific anchors and use cases. It does not replicate the workflow steps. The SKILL.md walks the order of work; the overlay tells the SKILL which assertion shape, which evidence categories, and which sign-off ladder apply.
