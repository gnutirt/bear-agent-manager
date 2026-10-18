# Cyber cross-cutting overlay — sar-decision-qa

When the alert under review is a cyber-typology alert (ransomware, account-takeover, business-email-compromise, sanctions-evasion via convertible virtual currency, cyber-event referral), or when a cyber-event is material to the rationale for an otherwise non-cyber alert, load this overlay alongside `references/source-anchors.md`.

## Operative public anchors

- **FinCEN advisories and updates on convertible virtual currency and sanctions evasion** [verify specific advisory dates; named examples: FIN-2019-A003 on convertible virtual currency [verify], the 2021 ransomware advisory updating FIN-2020-A006 [verify], and any subsequent FinCEN guidance on sanctions evasion through digital assets]. The advisory typology language is the citation the SAR narrative draws on; the QA confirms the advisory is dated and apt.
- **OFAC Sanctions Compliance Guidance for the Virtual Currency Industry** (October 15, 2021) [verify date]. Anchor for sanctions-evasion typology in convertible-virtual-currency cases. Where the QA reads a SAR-decision file with on-ramp / off-ramp counterparty indicators connecting to sanctioned addresses or jurisdictions, OFAC guidance is the secondary anchor next to the FinCEN advisory.
- **OFAC enforcement actions against virtual-currency businesses** [verify current actions on the date of analysis]. The published settlements anchor "what does inadequate sanctions-evasion controls look like" in the supervisory record. The QA does not name-drop the actions in narrative; it uses them to calibrate the rigour expected of a SAR rationale citing this typology.
- **FFIEC IT Examination Handbook — Information Security booklet** [verify current edition] — examiner-facing detail on cyber-event detection, notification, and incident-response. Where the SAR-decision file rests on a cyber-event referral, the QA reads incident-response timing and evidence retention against the IT Handbook expectation.
- **SEC cyber-disclosure rule** (Item 1.05 Form 8-K and Reg S-K Item 106, effective 2023) — for publicly-listed registrants, where the cyber event behind the SAR is material to the firm's public reporting, the SAR-decision narrative and the 8-K disclosure path interact. The SAR-decision QA does not direct the disclosure decision; it surfaces the interaction.

## Cyber-typology SAR considerations

The QA reads cyber-typology SAR-decision files for a small set of recurring questions:

- **Is the typology language in the narrative the language of an apt FinCEN advisory, dated?** Generic "cyber" or "cybercrime" labels in narrative are the failure mode. The advisory typology language ("ransomware payment", "convertible-virtual-currency on-ramp connecting to mixer-adjacent addresses", "business-email-compromise") is the floor.
- **Are the cyber-event structured fields on the FinCEN SAR completed?** The current FinCEN SAR form has cyber-event fields including event type, indicators (IP addresses, file hashes, wallet addresses), and event timing. Templated populations of these fields are a `structured-field-completeness` finding even if the fields are technically present.
- **Is the relationship between the cyber event and the SAR-suspect typology clearly stated?** A cyber-event referral that becomes a SAR for a different typology (e.g., a BEC referral that becomes a sanctions-evasion SAR after on-ramp counterparty review) needs the chain-of-rationale spelled out.
- **Is the sanctions-officer cross-reference in the file or the handoff package?** Sanctions-evasion via virtual currency is the dominant cyber-typology overlap. The SAR-decision file or the sponsor-bank handoff package must route to the sanctions function. Missing routing is a `process_change_recommendation` finding.

## Sanctions-evasion via cyber and crypto

The overlap of FinCEN, OFAC, and the cyber overlay is where most cross-cutting work lives.

- **Convertible-virtual-currency on-ramp / off-ramp activity** with counterparties showing indicators consistent with mixer services, peel chains, or addresses one-or-two hops from sanctioned addresses (per commercial blockchain analytics). The QA reads the analytics evidence as a vendor output (vendor-diligence on the analytics tool sits adjacent in `third-party-operational-resilience/vendor-diligence`) and confirms the typology language and the dated FinCEN / OFAC anchors are in the narrative.
- **Wallet-address evidence handling** — the SAR's cyber-event-indicator fields can carry wallet addresses; the QA confirms the addresses are documented in the structured fields rather than only in the narrative.
- **Cross-border-transfer paths** through high-risk jurisdictions or sanctioned-jurisdiction-adjacent corridors — the QA confirms the geographic context is in the narrative and the structured geography fields are populated.

## Tipping-off in cyber-event-overlap cases

Cyber-event SARs intersect with active fraud-recovery interactions, customer-IT-firm communications, law-enforcement-liaison engagement, and cyber-insurance-claim engagement. The case-specific tipping-off assessment under **31 USC §5318(g)(2)** is high-leverage in these cases. A program-level tickbox does not satisfy:

- Customer-conversation language during fraud recovery.
- Communication-template language for outbound notifications to the customer's counterparties.
- Cyber-insurance-claim communication boundaries (insurer is a third party for SAR-confidentiality purposes; counsel-driven exception path for limited disclosure may apply [verify with firm's legal counsel]).
- Account-action language (hold, return, freeze) that does not telegraph the SAR existence.

The QA reads `confidentiality_posture.tipping_off_risk_assessed` as `true` only when the file evidences a case-specific assessment of the cyber-event-overlap interactions.

## Continuing-activity in cyber cases

Cyber-typology activity often continues across customer relationships and across the firm's customer base (e.g., a BEC actor pattern targeting many commercial customers). The 90-day continuing-review cadence applies; the QA reads the cadence at the customer level **and** flags whether the firm's program has cross-customer-pattern review (which sits in `aml-model-monitoring`, not here).

## Cross-link inside the plugin

- **`sanctions-screening-qa`** carries sanctions-screening alert-decision QA. Sanctions-evasion-via-crypto cases nearly always cross-reference.
- **`aml-model-monitoring`** carries cross-customer-pattern review and the underlying detection-system governance.
- **`negative-news-triage`** carries adverse-media triage on the counterparty side of cyber cases (e.g., the on-ramp business is in the news for an enforcement action).

## Cross-link to other plugins

- **`third-party-operational-resilience/vendor-diligence`** for blockchain-analytics-vendor diligence, fraud-decision-vendor diligence, and any cyber-event-detection-vendor that fed the alert.

## Output-template additions for cyber-overlap cases

- Cyber-event-indicator fields completion status (`complete`, `partial-templated`, `partial-missing-indicators`, `not-applicable`).
- Sanctions-officer cross-reference status (`in-file`, `in-handoff-package`, `missing`).
- Case-specific tipping-off assessment status (`evidenced`, `program-level-only`, `missing`).
- Cross-customer-pattern flag (`raised`, `not-raised-and-applicable`, `not-applicable`).

## Common pitfalls in cyber-overlap SAR-decision QA

- Generic "cybercrime" or "cyber-fraud" typology language in narrative when an apt FinCEN advisory exists; cite the advisory by name and date.
- Templated cyber-event-indicator structured fields treated as completion.
- Missing sanctions-officer cross-reference on convertible-virtual-currency typologies (the dominant cyber-sanctions overlap).
- Program-level tipping-off tickbox treated as satisfying the case-specific assessment in cyber-insurance-claim or law-enforcement-liaison cases.
- Skipping the cross-customer-pattern flag where the typology is a known repeat-actor pattern at the firm.
- Treating the analytics-tool output as a primary source; it is a vendor output and the QA notes the vendor in the source trace and cross-references vendor-diligence.
