# Payments-fintech sector overlay — sar-decision-qa

When the scope flags payments or fintech (sponsor-bank programs, BaaS platforms, money transmitters, MSBs, card-program operators, virtual-currency on-ramps), load this overlay alongside `references/source-anchors.md`.

## SAR-filing-responsibility allocation

The threshold question for a payments-fintech SAR-decision QA is which entity owns the SAR filing. The allocation is documented in the sponsor-bank program agreement and is not optional QA scope.

- **Sponsor-bank arrangement (BaaS, program operator, fintech with bank in the chain)**: the sponsor bank typically holds ultimate SAR-filing responsibility for activity in the bank's accounts under **31 CFR §1020.320**. The fintech's BSA program detects, investigates, and drafts; the sponsor bank's BSA officer reviews and files. The QA reviews the fintech's draft and decision file and confirms the handoff package to the sponsor bank is complete. The QA does not direct the sponsor bank's filing decision.
- **Standalone MSB**: the MSB itself files under **31 CFR §1022.320** [verify section]. Operative threshold $2,000 (and $5,000 for issuers / sellers / redeemers of money orders or traveler's checks identified through a clearance review). Filing window 30 days. The QA reviews the MSB BSA officer's decision file directly.
- **Dual-posture (MSB with sponsor-bank deposit account)**: both rules can apply to different segments of activity. The QA must scope which rule covers which alerts.

## Operative SAR rules in scope

- **31 CFR §1022.320** — MSB SAR rule (MSB own filing) [verify section].
- **31 CFR §1020.320** — bank SAR rule (sponsor-bank filing on behalf of activity in bank's accounts) [verify section].
- **31 CFR §1022.380** — MSB registration with FinCEN. Initial registration within 180 days of becoming an MSB; renewal every two years. Adjacent program-element check; not the BOI / CTA reporting rule at §1010.380, which is a separate obligation with its own legal status.

## Fintech-specific typology population the QA encounters most

- Money muling — consumer-account funding from multiple low-value sources with rapid onward disbursement (P2P, virtual currency, prepaid card cash-out).
- Synthetic-identity onboarding rings — alert-decision files often connect to the CIP / identity-verification vendor's outputs, anchored to fraud-detection and CIP failures.
- Account-takeover (ATO) — credential-stuffing attacks; the alert may sit in fraud-system output and only later be re-routed for SAR consideration.
- Business-email-compromise (BEC) — commercial fintech / treasury-card customers; downstream wire or ACH or card disbursement.
- Convertible-virtual-currency on-ramp activity — anchored to FinCEN's convertible-virtual-currency advisories and OFAC's sanctions-compliance guidance for the virtual currency industry [verify dates]; the cyber overlay engages.
- Romance-and-investment-scam victim funding (consumer customer is the victim, not the suspect; SAR posture under the elder-financial-exploitation advisory and FinCEN guidance on scams).

## Sponsor-bank handoff package

When the QA covers a fintech that drafts and hands off to a sponsor bank, the handoff package the QA must check for completeness:

- The drafted SAR (form fields and narrative).
- The investigation file (dated, attributed steps; evidence pointers).
- Cross-references to other functions (sanctions-officer routing where the typology is sanctions-adjacent; fraud-decision-vendor output where the alert is fraud-typology; CIP / identity-verification vendor output where synthetic-identity is in play).
- The fintech's tipping-off assessment specific to this decision.
- The fintech's recommendation (file, decline, supplement) — consultative only; the sponsor bank decides.

A handoff package missing the sanctions-officer cross-reference for a sanctions-adjacent typology, or missing the case-specific tipping-off assessment in a fraud-recovery / dispute case, is a `process_change_recommendation` finding.

## Cross-link inside the plugin

- **`cdd-risk-review`** carries the fintech's customer-segmentation and onboarding-CDD work. Synthetic-identity findings from the SAR-decision file feed back to CDD-program tuning.
- **`sanctions-screening-qa`** carries sanctions-screening alert-decision QA. Sanctions-adjacent SAR alerts (especially convertible-virtual-currency typologies) cross-reference here.
- **`aml-model-monitoring`** carries the fintech's transaction-monitoring scenario governance and the fraud-decision vendor model-risk view.

## Cross-link to other plugins

- **`third-party-operational-resilience/vendor-diligence`** carries the sponsor-bank, processor, BIN-sponsor, KYC-vendor, fraud-decision-vendor, and sanctions-screening-vendor diligence. The SAR-decision QA cross-references vendor-diligence findings where a sub-processor's posture is material to the SAR rationale.
- **`ai-governance-model-risk/llm-vendor-evidence-review`** carries the AI-vendor evidence-pack review for any AI tooling in the alert-decision pipeline (AI-driven KYC, AI-driven dispute decisioning, AI-augmented investigator workflows). The SAR-decision QA does not duplicate model-risk analysis.

## Output-template additions for payments-fintech

- SAR-filing-responsibility allocation as a named field (`sponsor-bank-files`, `msb-files`, `dual-posture`).
- Sponsor-bank handoff package status (`complete`, `partial`, `missing-sanctions-routing`, `missing-case-specific-tipping-off-assessment`, `other-gap`).
- Fintech-specific typology label drawn from the typology list above.
- Cross-link to vendor-diligence findings where a sub-processor posture is material.

## Common pitfalls in payments-fintech SAR-decision QA

- Reviewing the fintech's decision file as if the fintech were the filer; missing the sponsor-bank handoff package check.
- Applying the bank $5,000 threshold to MSB activity (the MSB threshold is $2,000).
- Treating the program-level tipping-off tickbox as satisfying the case-specific assessment in fraud-recovery, dispute, and customer-service-overlap cases.
- Skipping the sanctions-officer cross-reference on convertible-virtual-currency on-ramp typologies and other sanctions-adjacent fintech alerts.
- Conflating the alert-source-vendor (KYC, fraud-decision, sanctions-screening) governance with the SAR-decision quality; vendor-diligence and model-monitoring carry the source view.
- Treating "we are a fintech, not a bank" as a reason to apply lower decision-file rigour; the SAR rule the fintech operates under (own MSB or sponsor-bank-mediated) sets the rigour, not the firm's preferred narrative about itself.
