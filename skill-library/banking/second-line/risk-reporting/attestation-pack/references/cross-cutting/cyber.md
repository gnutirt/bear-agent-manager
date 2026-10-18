# Cyber cross-cutting overlay for attestation-pack

When the scope record flags `cyber` for the attestation pack, this overlay sets the cyber-control-attestation content for named pack sections. Cyber-control attestations are a frequent use case (annual CISO certifications, NYDFS Form B, AOC for card-handling, CSF-aligned program attestations); the overlay lands as content in the pack rather than as background reading.

Loaded by: `attestation-pack/SKILL.md` when `scope.cross_cutting_set` includes `cyber`. Cited and section-referenced anchors live in `references/source-anchors.md`.

## Source basis

- NYDFS 23 NYCRR Part 500, especially §500.17(b) (annual notice of compliance, post-Second-Amendment Form B). Verify section labels at pack-write time.
- NIST Cybersecurity Framework 2.0 (February 2024) for governance and risk-management framing.
- FFIEC IT Examination Handbook (Information Security and Cybersecurity sections) for federally supervised banking organisations.
- PCI DSS v4.0 / v4.0.1 Attestation of Compliance for card-handling entities.
- NAIC Insurance Data Security Model Law (Model #668) for state-licensed insurers in adopting jurisdictions.

## What changes for cyber-flagged attestation packs

### 1. Annual CISO certification structure

For NYDFS-covered entities, §500.17(b) (post-Second-Amendment) requires an annual written notice of compliance signed by the CISO and the highest-ranking executive (Form B) or a written acknowledgement of non-compliance. The attestation pack supporting Form B typically:

- Anchors the assertion text to §500.17(b) explicitly.
- Organises the control inventory by Part 500 section requirements (cybersecurity program, governance, access controls, incident response, multi-factor authentication, training, third-party service providers, and the asset-class-specific requirements at §500.7, §500.12, §500.14, §500.15).
- Surfaces non-compliance items as exceptions with the acknowledgement-of-non-compliance route documented where the firm cannot certify full compliance.
- Carries CISO and highest-ranking executive sign-off; legal review by GC office.

For non-NYDFS-covered entities, the parallel content uses the firm's CISO reporting structure under the relevant regulator's expectations (FFIEC for banks; SEC Reg S-P for advisers, BDs, transfer agents; NAIC Model #668 for state-licensed insurers in adopting jurisdictions).

### 2. NIST CSF 2.0 control-inventory framing

Where the firm uses NIST CSF 2.0 as the cyber-control framework framing, the attestation pack control inventory organises by the six functions (Govern, Identify, Protect, Detect, Respond, Recover) rather than by lifecycle or by regulator subsection. The Govern function (added in CSF 2.0) covers organisational policies, roles and responsibilities, risk-management strategy, supply-chain risk, and policies and procedures; the Govern function attestation typically includes board-oversight evidence and the firm's risk-tolerance setting.

### 3. PCI DSS Attestation of Compliance

For card-handling entities, the AOC is itself the attestation pack output. The skill structures the underlying control inventory by the twelve PCI DSS requirements at v4.0 / v4.0.1, surfaces the cardholder-data environment (CDE) boundary in the scope statement, and carries the QSA assessment as an evidence-index entry where applicable. The PCI DSS v4.0 transition (v3.2.1 retired March 31, 2024) may surface as exceptions for the new authentication and cryptographic requirements where firm-side implementation is in transition.

### 4. Vendor-cyber posture as evidence

Cyber attestations frequently rely on vendor SOC 2 Type II reports as evidence for outsourced control coverage. The standard SOC-report-reliance discipline applies: review carve-outs, identify CUECs, and provide CUEC-level evidence at the user firm. A cyber attestation that cites vendor SOC reports without the CUEC-level evidence is the failure mode the troubleshooting file calls out.

### 5. CISO-program independence and resourcing

NYDFS §500.4 (CISO designation) and analogous regulatory expectations require CISO independence and resourcing. The attestation pack typically includes:

- A statement on CISO reporting line and independence from the business units the CISO oversees.
- A statement on cyber-program resourcing (budget, headcount, technology investment trend) as an evidence-index entry rather than in the assertion text.
- Material organisational changes affecting CISO independence in the period as a current-period exception or as a forward-looking item.

### 6. Sign-off and review machinery

Cyber attestation packs typically include the CISO (signer for Form B and CISO-program assertions), the highest-ranking executive (co-signer for Form B; CEO or equivalent), the General Counsel (legal review), the Chief Audit Executive's information-security relationship lead (witness or independent-review role), and the board's risk or audit committee chair (acknowledgement of receipt for the annual cyber report).

## Verification flags

- NYDFS Part 500 §500.17(b) Form B requirements — verify post-Second-Amendment text and any DFS-issued FAQs at pack-write time.
- PCI DSS version — verify v4.0 vs v4.0.1 and current AOC form.
- NIST CSF 2.0 — confirm function and category mapping if the firm has adopted a tailored crosswalk.
- NAIC Model #668 adoption — verify state-by-state for insurance carriers in scope.
