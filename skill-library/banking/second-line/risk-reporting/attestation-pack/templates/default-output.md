# Attestation pack: [Attesting role] — [Attestation period]

Starting structure for a periodic management attestation pack. Section list is the spine; depth and overlay-driven content flex with the attestation type (SOX sub-certification, vendor-management, BCBS 239 risk-data, fund CCO annual, BSA officer annual, cyber annual, privacy annual, SOC 1 / SOC 2 management assertion). When a section is omitted, the rationale is documented (for example, "sub-certification chain not applicable; standalone CISO certification" goes in the chain section).

The pack is a draft until the attesting officer signs and the named legal or audit reviewer reviews.

---

## Cover

- Attesting role: [e.g., Head of Vendor Management / Head of Risk Reporting / CISO / Process Owner — Wholesale Credit Risk]
- Attestation type: [sox-sub-certification / soc1-management-assertion / soc2-management-assertion / ffiec-self-assessment / vendor-management / bcbs239-risk-data / cyber-annual / privacy-annual / fund-cco-annual / bsa-officer-annual / other]
- Attestation period: [start YYYY-MM-DD] to [end YYYY-MM-DD]
- Scope: [process / product / function / legal entity]
- Assertion language version: [e.g., v4.2]
- Source posture: [public-only / public-plus-firm-policy / public-plus-firm-policy-plus-evidence / connector-aware]
- Engagement-scope ID (if `scoping` was run): [ID]

---

## Executive summary

Five bullets in attesting role's voice. Headline movement, named exceptions, compensating-control posture where relevant, sub-certification chain (if applicable), confidence label.

- [Headline]
- [Top exception or carve-out]
- [Compensating-control posture]
- [Chain pointer]
- [Confidence and review status]

---

## Scope statement

The precise boundary being attested. Names the in-scope processes, systems, and legal entities; names the time period; names the exclusions.

- **Processes**: [list]
- **Systems**: [list]
- **Legal entities**: [list]
- **Time period**: [start YYYY-MM-DD] to [end YYYY-MM-DD]
- **Exclusions**: [list, with rationale where material]

---

## Source criteria

The framework or rule against which the attestation is made. Named, dated, with section references where appropriate.

- [e.g., COSO Internal Control — Integrated Framework (2013), Components and Principles 16, 17]
- [e.g., SOX §302 / §404 sub-certification structure]
- [e.g., AICPA SSAE 18 AT-C 320 (SOC 1) / AT-C 105 / 205 (SOC 2)]
- [e.g., BCBS 239 (January 2013), Principle 1 and supporting principles]
- [e.g., U.S. interagency third-party risk management guidance (June 2023), Section III.D]
- [Firm-policy criteria: policy ID and version]

---

## Control inventory

Named controls in scope, sourced from the upstream control matrix. One row per control. Where a sector or cross-cutting overlay applies, the inventory organises by the framework component the overlay specifies.

| Control ID | Control name | Owner role | Framework component | Design effectiveness | Operating effectiveness | Linked evidence | Linked exception |
|---|---|---|---|---|---|---|---|
| C1 | [control name] | [role] | [e.g., COSO Control Activities / BCBS 239 Principle 6 / TPRM lifecycle stage] | [effective / partially-effective / not-effective / not-tested] | [same enum] | [evidence IDs] | [exception ID if any] |

---

## Evidence index

One row per piece of evidence supporting the attestation. "All evidence is in the SharePoint folder" does not satisfy this section.

| Evidence ID | Description | Type | System of record | Period covered | Producer role | Linked controls |
|---|---|---|---|---|---|---|
| E1 | [description] | [system-output / report / sign-off-log / minutes / policy / external-assessor-output / sample-test-result / reconciliation / soc-report / cuec-evidence] | [system] | [start to end] | [role] | [control IDs] |

For each SOC report cited, an additional CUEC-evidence row at the user firm is included for each complementary user entity control the report identifies.

---

## Exceptions

Controls that did not operate as designed in the period, or where evidence is insufficient. Severity, compensating control (if any), status, and link to issue log.

| Exception ID | Linked control | Description | Severity | Compensating control | Status | Target remediation date | Linked issue |
|---|---|---|---|---|---|---|---|
| X1 | [control ID] | [description] | [low / medium / high / critical] | [discrete control name and ID, or null] | [open / remediated / accepted-risk / pending-review] | [YYYY-MM-DD or null] | [issue ID] |

A clean exceptions section in scope with material open issues elsewhere is a stated determination, not an absence; document the determination explicitly.

---

## Prior-period remediation status

Every prior-period exception carries a current-status row. Items not remediated by the current attestation surface as current-period exceptions and link to the matching exceptions row.

| Prior issue ID | Current status | Evidence pointer | Current-period exception (if rolled forward) |
|---|---|---|---|
| [prior ID] | [remediated / in-progress / slipped / carried-as-current-period-exception / accepted-risk] | [closure memo / status note] | [exception ID if applicable] |

---

## Sub-certification chain

For ladder-up attestations, the chain of upstream sub-certifications consumed and the executive certification this pack supports. Roles, not named individuals.

| Role | Level | Direction | Scope summary |
|---|---|---|---|
| [role] | [process-owner / function-head / subsidiary-officer / executive-officer] | [received-from / provides-to] | [scope summary] |

For a SOX sub-certification: the chain typically runs process-owner → function-head → subsidiary-officer → executive-officer, with this pack sitting at one of the lower layers.

For a vendor-management attestation: the chain typically runs vendor-manager → Head of Vendor Management → Head of Operational Risk → CRO → Risk Committee.

---

## Reviewer questions

Questions the attesting role anticipates from internal audit, the external assessor, or the regulator. Surfaced for the named reviewer to address before sign-off.

1. [Question on the most material exception]
2. [Question on the compensating-control posture]
3. [Question on the prior-period roll-forward]
4. [Question on the source-criteria year-over-year change]
5. [Question on the sub-certification chain or the SOC-report reliance]

---

## Assertion language

The actual attestation text the attesting role signs. Carried verbatim from the firm's assertion-language register; year-over-year change reflected when source criteria update.

> [Assertion text v[version]. The named carve-outs in the Exceptions section are surfaced in the qualification clause where applicable.]

---

## Sign-off block

The pack is a draft until the attesting officer signs and the named reviewer reviews.

- **Attesting role**: [role]; signature: [blank until signed]; date: [YYYY-MM-DD]
- **Witness role (where required)**: [role]; signature: [blank until signed]; date: [YYYY-MM-DD]
- **Legal review**: [GC office / securities counsel role]; review date: [YYYY-MM-DD]
- **Internal-audit relationship lead (where applicable)**: [role]; review date: [YYYY-MM-DD]

---

## Source trace

For every material claim in the pack, the source mapping. Carried as an appendix.

| Claim | Source | Evidence reference | Confidence |
|---|---|---|---|
| [claim] | [source citation or `[evidence needed]`] | [pointer] | [high / medium / low / evidence-needed] |

---

## Confidence label and review gate

- **Confidence label**: [high / medium / low / unknown]. Reflects strength of the evidence base, not substantive control posture. `high` requires complete evidence-index coverage of in-scope controls.
- **Human review required**: yes (always).
- **Recommended owner actions before sign-off**: [list, including any reviewer-question responses or any source-criteria year-over-year checks the legal reviewer should run].

The skill stops at the draft. The attesting officer signs after the named reviewers review; the firm's certification system records the signed pack.
