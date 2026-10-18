# Example: private-banking PEP-family customer with foreign-procurement adverse media

Public-source-derived. No named institution or named natural person. The shape mirrors a standing pattern at mid-sized US bank private-banking businesses: a long-tenured non-US-person private-banking customer who is an immediate family member of a senior foreign government official, with an EDD pack last refreshed 30 months ago, periodic cycle now due, and a recent media report on the family member's involvement in a foreign-procurement matter.

## Input

- **Institution**: a mid-sized US bank private-banking business; primary regulator the OCC for this example; FFIEC manual frames examiner expectations.
- **Customer**: non-US person; immediate family member of a senior foreign government official; PEP-adjacent under FFIEC manual and Wolfsberg PEP guidance. Account opened five years ago in the bank's private-banking program. Funded by inbound wires routed through a foreign correspondent.
- **Pack inputs (as presented for QA)**:
  - Beneficial ownership: customer is the natural-person account holder; ownership chain runs through two foreign holding entities the customer controls; one foreign trust intermediary appears as ultimate beneficial recipient on a recent distribution.
  - SoW statement on file: customer-attested family-trust distribution; corroboration on file is one prior-firm reference and a copy of the trust deed (translated extract).
  - SoF on inbound wires: routed through one foreign correspondent in a higher-risk jurisdiction.
  - Adverse media: a triaged hit from `negative-news-triage` (recent media report on the family member's involvement in a foreign-procurement matter), materiality marked "material", linkage confidence "high".
  - Sanctions screening: clear at current scan; one historical hit on a connected party resolved with disposition rationale on file.
  - Expected vs. actual activity: expected profile from original onboarding documents wire activity within a defined band; actual activity over the lookback exceeds the band on volume and on counterparty concentration.
  - Conduct overlay: foreign-procurement exposure on the family member triggers the conduct lens.
- **Engagement scope supplied**: institution = mid-sized US bank private-banking business; primary regulators = OCC, FinCEN; persona = second-line EDD reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = conduct.
- **Pack type**: periodic_refresh (with material change since last refresh).
- **EDD trigger**: pep + private_banking.

## Output sketch

The skill produces an EDD pack against the file. Headlines:

- **Background and EDD trigger** — periodic refresh on the PEP-family / private-banking trigger; material change since last refresh is the new adverse-media report on the family member's foreign-procurement exposure. Cross-references upstream `cdd-risk-review` record and the `negative-news-triage` triaged hit.
- **Beneficial ownership and control chain** — three layers walked: customer (control); two foreign holding entities (ownership at named jurisdictions); foreign trust intermediary at the recent-distribution layer. Residual uncertainty on the trust intermediary's control parties (trust deed extract is partial; corroboration on the protector / trustee role is thin).
- **Derogatory information and adverse media** — one material hit consumed from `negative-news-triage` (foreign-procurement reporting on the family member; high linkage confidence; recent date). Pattern observation: the hit is the first publicly reported derogatory information on the customer's connected parties; no clustering yet.
- **PEP, sanctions-adjacency, and high-risk-jurisdiction posture** — PEP status: family_close_associate; source of finding: customer disclosure at onboarding plus commercial PEP-screening-tool corroboration; date of latest assessment: this refresh. The PEP role is named; the principal jurisdiction is named. Sanctions-adjacency: connected-party historical hit was resolved; current scan clear. High-risk-jurisdiction nexus: principal residence and source-of-funds origin in a higher-risk jurisdiction per FATF mutual-evaluation public report; transactional corridor concentrated to that jurisdiction.
- **Source of wealth and source of funds** — SoW: family-trust distribution; corroboration confidence is "low" on this refresh. Trust deed extract on file is partial; one prior-firm reference is on file but is dated; no independent public-source corroboration of the trust's underlying assets or distribution history. Residual gap: independent corroboration of the SoW statement. SoF: inbound wires through a foreign correspondent; corroboration on the originating account is thin.
- **Customer rationale and expected vs. actual activity** — customer rationale documented at onboarding (wealth management for international family). Expected wire-activity band documented at original onboarding; actual activity over the lookback exceeds the band on volume and on counterparty concentration. Deviation finding: actual exceeds expected; scenario links to the firm's wire-monitoring scenarios. Cross-reference to `aml-model-monitoring` for tuning consideration once the post-EDD profile is set.
- **Sanctions screening posture** — current clear; one resolved historical hit on a connected party with disposition rationale on file. List coverage: OFAC SDN, OFAC sectoral, UN, internal lists; no UK OFSI / EU consolidated coverage in scope at this institution.
- **Conduct-risk indicators** — material indicator: foreign-procurement exposure on the family member, with the source from the consumed `negative-news-triage` hit. Severity: material. Anchor: FFIEC manual relationship-behaviour treatment (US side); the conduct lens via the conduct overlay. Reputational exposure on connected parties surfaces as a secondary indicator.
- **Ongoing monitoring plan** — recommended scenarios in scope: wire-activity-anomaly (recalibrated to the post-EDD expected profile once set), counterparty-concentration, jurisdictional-concentration, PEP-adjacent-activity. Refresh-cycle interval recommended: 12 months given the elevated profile, with event-driven trigger on any further adverse-media activity. Cross-reference to `aml-model-monitoring` for tuning.
- **Open issues, evidence-needed items, and committee questions**:
  - Ownership: independent corroboration of the foreign trust intermediary's control parties — `[evidence needed]`.
  - SoW: independent public-source corroboration of the family-trust distribution narrative — `[evidence needed]`.
  - Activity: customer-rationale update for the post-onboarding deviation in expected-vs-actual activity — `[evidence needed]`.
  - Conduct: any further public reporting on the family member's foreign-procurement exposure since the consumed triage record — owner: relationship owner.
  - Sanctions: any additional connected-party screening implication of the named jurisdictions — owner: sanctions officer.
- **Recommended human-review gates and decision options** — gate: EDD committee review, composition includes BSA officer, CCO, sanctions officer, head of private banking, legal, relationship owner. Decision options the committee evaluates: retain_with_conditions; retain_with_enhanced_monitoring; retain_pending_further_evidence; restrict_products_or_volumes; escalate_to_relationship_exit_deliberation. Stop conditions: SoW corroboration not produced within the firm's defined window; sanctions exposure surfaces on a further connected-party screen; further material adverse-media reporting in the same theme. Cross-references to `cdd-risk-review`, `negative-news-triage`, `sanctions-screening-qa`, `aml-model-monitoring`. The pack does not retain, restrict, or exit; the committee decides.
- **Sign-off and source trace** — drafter: second-line EDD reviewer; reviewer: BSA officer; approver: EDD committee chair. Source trace anchors to `references/source-anchors.md` (FFIEC PEP / private-banking sections, `§1010.620`, CDD Final Rule, 2020 PEP joint statement), `references/sector-overlays/banking.md` (private-banking EDD frame), `references/cross-cutting/conduct.md` (conduct-overlay frame for the family-member foreign-procurement exposure), and the upstream `cdd-risk-review` record.
- **Confidence label** — `medium`. The financial-crime findings are at high confidence on the file evidence; the SoW corroboration gap is at medium confidence (a clear gap, but the gap itself is the finding, not the SoW conclusion); the conduct-overlay finding is at high confidence on linkage and at medium confidence on the customer-relationship implication pending the committee's read.

## Why this scenario matters

- **PEP status alone is not the EDD trigger; PEP combined with private-banking, foreign jurisdiction, and material adverse media is.** The 2020 joint statement framing carries here: the pack records the PEP determination but builds the EDD case on the risk-based combination, not on the PEP label.
- **SoW corroboration is the dominant defect on private-banking PEP packs.** Family-trust distributions corroborated only by customer self-attestation and a prior-firm reference are a thin SoW; the EDD pack flags the gap and asks for independent public-source or transactional corroboration.
- **The beneficial-ownership chain walks past the certification.** Two foreign holding entities and a trust intermediary at the recent-distribution layer mean the certification form alone is not the read; the pack walks the chain and surfaces residual uncertainty per layer.
- **Adverse media is consumed from `negative-news-triage`, not re-litigated.** The pack reads the triaged hit as input; it does not replay the source-tier or identity-confidence work.
- **The conduct overlay surfaces on top of the financial-crime frame.** The family member's foreign-procurement exposure is conduct-relevant and bears on the EDD committee's decision; the pack flags it without turning into a conduct review.
- **The pack stops at the recommendation.** Retention with conditions, restriction, escalation to exit deliberation are decision options the committee evaluates; the pack does not retain, restrict, or exit.

## Anchors

- FFIEC BSA/AML Examination Manual — Politically Exposed Persons, Private Banking Due Diligence, Customer Due Diligence sections [verify section anchors].
- 31 CFR §1010.620 — private-banking EDD [verify section].
- FinCEN CDD Final Rule (May 2016, compliance May 11, 2018).
- Joint Statement by Treasury, Federal Banking Agencies, and FinCEN on Banking Politically Exposed Persons (August 21, 2020).
- Wolfsberg Group Guidance on PEPs and on Source of Wealth / Source of Funds (most recent public versions; public industry standard reference).

See `references/source-anchors.md` for full citations, `references/sector-overlays/banking.md` for the bank-specific frame, and `references/cross-cutting/conduct.md` for the conduct overlay.
