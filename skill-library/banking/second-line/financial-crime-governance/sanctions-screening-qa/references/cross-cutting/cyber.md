# Cyber cross-cutting overlay — sanctions-screening-qa

When the scope flags cyber, or when the sanctions program touches virtual-currency activity, ransomware-payment paths, or cyber-enabled identity exposure at any rail, load this overlay alongside `references/source-anchors.md`. The overlay scopes narrowly to **sanctions-evasion via cyber and tech**, not generic cyber controls. Generic cyber controls (NYDFS Part 500 program-level, SEC cyber 8-K disclosure) sit elsewhere in the repo and are not duplicated here.

## Operative public anchors

- **OFAC Sanctions Compliance Guidance for the Virtual Currency Industry** (Office of Foreign Assets Control, October 15, 2021) [verify date]. Industry-specific application of the OFAC Framework's five components to virtual currency exchanges, administrators, miners, hosted-wallet providers, and other VC firms. Anchor for sanctions-evasion typology in convertible-virtual-currency cases. https://ofac.treasury.gov/media/913571/download?inline [verify current URL].

- **OFAC Updated Advisory on Potential Sanctions Risks for Facilitating Ransomware Payments** (Office of Foreign Assets Control, September 21, 2021) [verify date], updating the October 1, 2020 advisory. Articulates strict-liability sanctions exposure for facilitating ransomware payments to designated persons, the mitigating factors OFAC weighs, and the voluntary self-disclosure posture. https://ofac.treasury.gov/media/912981/download?inline [verify current URL].

- **OFAC enforcement actions against virtual-currency businesses** [verify current actions on the date of analysis: notable resolved actions through the date of analysis include matters against virtual-currency exchanges and custody providers]. The published settlements anchor "what does inadequate sanctions controls look like" in the supervisory record. The QA does not name-drop institutions; it uses these actions as calibration unless the institution is a public defendant in a finalized consent order.

- **OFAC SDN designations of virtual-currency mixers and addresses** — OFAC has designated specific mixer services and the wallet addresses associated with them (e.g., Blender.io May 2022, Tornado Cash August 2022) [verify designations current on the date of analysis]. The screening program reads address-level designations, not just name-level. Address-screening capability is itself an evidence ask.

- **FinCEN advisories and updates on convertible virtual currency, ransomware, and cyber-enabled financial crime** [verify specific advisory dates; named examples include FinCEN's 2019 advisory on illicit activity involving convertible virtual currency, the 2020 ransomware advisory and its updates, and subsequent FinCEN guidance on sanctions evasion through digital assets]. The QA reads parallel FinCEN material alongside the OFAC anchor.

- **FinCEN final rule on suspected attempted or actual cyber-events SAR reporting** and the structured cyber-event indicator fields on the current FinCEN SAR form [verify current form version and fields on the date of analysis]. Where the screening alert routes into a SAR, the SAR-decision QA picks up the cyber-event field-population read; this skill stops at the screening-disposition QA and cross-references.

- **OFAC and FinCEN parallel guidance** on the convergence of MSB / virtual-currency / OFAC obligations [verify specific guidance on the date of analysis]. The institution's posture on dual-registration (MSB) and on whether the program treats virtual-currency activity inside the sanctions-screening pipeline or in a parallel pipeline is part of the QA scope read.

## Sanctions-evasion typologies the overlay reads for

The overlay reads the sanctions program for exposure to a small set of named evasion typologies. Each typology is anchored in OFAC and FinCEN public material, not speculative.

- **Ransomware payments to OFAC-listed groups** — incident-response payment paths, cyber-insurance claim payments, remediation-vendor payments, payment-processor relationships. The QA reads the sanctions-officer routing on these payment paths and the pre-payment OFAC analysis evidence.

- **Virtual-currency obfuscation through mixers, peel chains, and chain-hopping** — counterparty addresses one or two hops from sanctioned addresses (per blockchain-analytics output). The QA reads the program's address-screening capability and the analytics-vendor governance (vendor-diligence sits in `third-party-operational-resilience/vendor-diligence`).

- **Cyber-enabled identity manipulation defeating name-and-DOB matching** — synthetic identity, deepfake document fraud, identity-takeover at onboarding. The QA reads the integration between the identity-verification pipeline and the screening pipeline; an identity that defeats the IDV layer arrives at screening as a name-and-DOB string with no anomaly flag.

- **Deepfake / synthetic-identity at onboarding screening** — overlaps with the identity-manipulation typology; the QA reads anomaly-detection evidence at the IDV layer and any biometric-attestation posture.

- **BIN sponsorship and prepaid-card abuse for sanctions circumvention** — multi-card / cross-program activity that defeats single-program screening. The QA reads the program's cross-card and cross-program reconciliation evidence at the BIN-sponsor.

- **Decentralized finance and bridge exposure** — DeFi protocols, cross-chain bridges, and mixer-adjacent activity that route value around traditional choke points. The QA reads exposure (does the program have any rail touching this activity) and controls evidence (analytics-vendor coverage, address-screening, governance).

## Cyber-typology screening considerations

The QA reads cyber-typology sanctions-screening evidence for a small set of recurring questions:

- **Does the screening capability cover address-level and entity-level designations?** Name-matching alone misses OFAC's mixer-address and wallet-address designations. The QA reads whether the screening engine ingests the SDN List's identifier records (digital currency address fields) and applies them.

- **Is the analytics-vendor output integrated into the alert disposition?** Where the program uses a blockchain-analytics vendor (e.g., for transaction-attribution or address-clustering), the analytics output feeds the disposition rationale. The QA reads the vendor as a vendor (not a primary source), confirms vendor-diligence is current via `third-party-operational-resilience/vendor-diligence`, and reads the disposition-rationale evidence trail.

- **Is the pre-payment OFAC analysis evidenced for ransomware-payment paths?** A program that pays out a ransomware demand without an evidenced pre-payment OFAC analysis carries the strict-liability exposure articulated in the OFAC ransomware advisory. The QA reads the evidence trail for the analysis, not just the policy statement.

- **Is the sanctions-officer routing in place for cyber-insurance, remediation-vendor, and incident-response payment paths?** Treasury or operations teams making time-pressure payments without sanctions-officer routing is the failure mode. The QA reads the routing evidence at the case level.

- **Is the IDV-to-screening pipeline read end-to-end?** Identity defeats at the IDV layer flow downstream as name-and-DOB strings; the QA reads whether the pipeline carries an anomaly-or-confidence signal from IDV through to screening, or whether the screening engine sees a sanitized name with no provenance.

## Sanctions-officer-and-incident-response interfaces

Cyber events compress the timeline for sanctions decisions. The 24-to-72-hour window between a ransomware demand and a payment decision does not give the sanctions function the time it gets in a routine alert. The QA reads:

- The pre-incident playbook for ransomware-payment sanctions analysis (named roles, evidence asks, escalation chain to OFAC counsel).
- Cyber-insurance carrier handoff posture (the carrier is a third party for sanctions purposes; counsel-driven exception path for limited information sharing may apply [verify with firm's sanctions counsel]).
- Documentation cadence during an active incident (the file the QA reads after the fact has to evidence the work done under time pressure).

## Cross-link inside the plugin

- **`sar-decision-qa`** carries the SAR-decision QA for cyber-event-related alerts. Sanctions-evasion-via-crypto cases nearly always cross-reference (the screening alert escalates to an investigation that may produce a SAR).
- **`aml-model-monitoring`** carries the screening-engine and analytics-vendor model governance. The QA notes whether model-risk coverage is current; it does not re-do model-monitoring work.
- **`negative-news-triage`** carries adverse-media triage on the counterparty side of cyber cases.

## Cross-link to other plugins

- **`third-party-operational-resilience/vendor-diligence`** for blockchain-analytics-vendor diligence, IDV-vendor diligence, fraud-decision-vendor diligence, and any cyber-event-detection-vendor that fed the alert.
- **`ai-governance-model-risk/llm-vendor-evidence-review`** for any AI-driven analytics-vendor or AI-augmented investigator-workflow vendor.

## Output-template additions for cyber-overlap cases

- Address-level designation screening capability status (`in-place`, `partial`, `name-only`, `not-applicable`).
- Analytics-vendor integration status (`integrated`, `parallel-pipeline-only`, `not-in-use`).
- Pre-payment ransomware OFAC-analysis evidence status (`evidenced`, `policy-only`, `missing`, `not-applicable`).
- Sanctions-officer routing status for cyber-payment paths (`in-place`, `partial`, `missing`).
- IDV-to-screening pipeline integration status (`end-to-end-signal`, `name-only-handoff`, `unknown`).

## Common pitfalls in cyber-overlap sanctions-screening QA

- Treating mixer-address designations as a name-match exercise; the operative read is address-level screening against the SDN List's identifier records.
- Reading the analytics-vendor output as a primary source rather than a vendor output; the QA notes the vendor in the source trace and routes vendor-diligence.
- Missing the pre-payment OFAC analysis on a ransomware-payment path because the institution treats incident-response as outside the sanctions pipeline.
- Treating cyber-insurance carrier handoff as a sanctions-cleared path because the carrier "checks sanctions"; the institution's own pre-payment analysis is the operative control.
- Reading the IDV layer in isolation from screening; identity defeats at IDV propagate downstream and the screening engine has no anomaly signal.
- Importing generic cyber-controls language (NYDFS Part 500, SEC 8-K) into the sanctions-screening QA; those sit elsewhere in the repo. Keep this overlay tight to evasion typologies anchored in OFAC and FinCEN material.
