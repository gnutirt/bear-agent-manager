# Example: bulk re-scan over a community-bank portfolio with a single tier-1 hit

Public-source-derived. No named institution. The shape mirrors a recurring pattern at community banks: an event-driven adverse-media triage on an individual customer following a tier-1 newspaper report on a regional fraud-ring indictment, where the customer's name appears as a co-defendant.

## Input

- **Institution**: a community bank with a single-state retail and small-business franchise; primary regulator FDIC for this example.
- **Customer**: an individual retail customer holding a checking account, a savings account, and a small consumer-installment loan. CDD file shows occupation, employer, and home address; no business-customer attributes.
- **Triage scope**: `event_driven`. Trigger: a tier-1 regional-newspaper article reporting on a federal indictment in a regional fraud-ring matter; the customer's full name appears in the indictment's named defendant list.
- **Hit set**: a single hit (the regional-newspaper article), surfaced by the firm's daily adverse-media feed and corroborated by an open-source pull that returned the underlying federal-court docket entry.
- **Engagement scope supplied**: institution = community bank; primary regulator = FDIC; persona = second-line negative-news triage reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = none initially. The conduct overlay is added to the triage when the underlying indictment surfaces vulnerable-customer-harm patterns (the alleged fraud targeted elder-care patients), per the scope amendment.
- **CDD file evidence available**: customer record, ID verification, account-opening interview note, and the recent transaction-monitoring history (no alerts in the last 24 months).

## Output sketch

The skill produces a triage memo against the single hit. Headlines:

- **Hit set summary** — 1 total hit. Source-class breakdown: 1 tier-1 (regional-newspaper article naming the federal-court docket entry; corroborated by the underlying docket pull). Publication-date 3 days before the triage; underlying-event-date (indictment filing date) 4 days before the triage.
- **Per-hit assessment**:
  - **`hit_id`: 001**. Headline: tier-1 newspaper coverage of a federal indictment in a regional elder-financial-exploitation-typology fraud-ring matter; the customer is named as a co-defendant.
  - **`identity_confidence`: high**. Identity-rationale: legal name matches; date of birth in the docket entry matches the CDD file; home address (city and state) matches; occupation in the docket-listed defendant profile matches the CDD file's occupation field.
  - **`source_class`: regulator/court** (federal indictment, corroborated by major-outlet coverage). **`source_tier`: tier_1**.
  - **`event_date`: indictment filing date** (4 days before the triage). **`publication_date`: 3 days before the triage**.
  - **`materiality`: material**. **`typology_tags`: [elder financial exploitation, fraud]**. The FinCEN advisory on elder financial exploitation (FIN-2022-A002) provides the typology indicators; the indictment surfaces multiple indicator patterns directly.
  - **`conduct_dimension_tag`: vulnerable-customer overlap** (the alleged victims are elder-care patients). The conduct overlay is loaded for the parallel routing.
  - **`linkage_strength`: direct** (the customer is named as a defendant).
  - **`disposition`: relevant**.
  - **`evidence_pointer`: federal-court docket URL; regional-newspaper article URL**.
- **Aggregated themes** — single hit, so no cross-hit themes. The triage notes the typology specifically because the FinCEN elder-financial-exploitation indicator overlap is direct.
- **Downstream routing**:
  - **`cdd-risk-review` (event-driven refresh)** — the indictment is a material customer-information event; the refresh reads against the four pillars (CIP unchanged, beneficial-ownership not applicable to individual customer, expected-activity now requires re-read against the alleged conduct, ongoing-monitoring scope re-evaluation).
  - **`edd-escalation-pack`** — the customer is not currently on an EDD profile; the indictment with elder-financial-exploitation typology is a candidate for EDD upgrade. Routed for the EDD analyst to open the pack.
  - **`sar-decision-qa` (evidence input)** — no in-flight alert exists, but the triage memo carries forward as evidence input on any future alert that may surface from the post-event monitoring scope re-evaluation. Routing line opened conditionally; not a current SAR-decision input.
  - **`sanctions-screening-qa`** — not implicated; no routing line.
  - **Conduct lane (parallel routing)** — vulnerable-customer overlap surfaced; routing line to the consumer-compliance function for the elder-financial-exploitation framework's parallel discipline (Reg E error-resolution and unauthorized-transfer rules where relevant; CFPB elder-financial-exploitation-related guidance; state adult-protective-services notification framework where the bank's program calls for it). The triage does not initiate APS notification; it routes the artifact to the named decisionmaker.
  - **Relationship-level review gate** — the BSA officer reviews the memo and decides on relationship-level posture (continued monitoring, EDD upgrade, account restriction, exit consideration). The triage does not recommend exit, restriction, or rating change.
- **Open questions and evidence-needed items**:
  - **Co-defendant-relationship inventory**: the indictment names co-defendants; the relationship owner pulls the firm's customer base for matches against co-defendants to surface related-party exposure. Owner: relationship owner. `[evidence needed]`.
  - **Transaction-monitoring scope re-evaluation against typology**: the customer's transaction history did not fire alerts under the in-scope scenarios; the typology indicators in the FinCEN advisory may not all be in the current scenario set. Cross-reference to `aml-model-monitoring`. Owner: AML monitoring team. `[evidence needed]`.
  - **Vulnerable-customer policy applicability**: the customer is named as alleged perpetrator, not as alleged victim, but the firm's vulnerable-customer-protection policy may carry a notification or review obligation when a customer is implicated in an elder-financial-exploitation matter. Owner: consumer-compliance function. `[evidence needed]`.
- **Source trace** — anchors to `references/source-anchors.md` (FFIEC CDD section, FinCEN CDD Final Rule fourth pillar, FinCEN Advisory on Elder Financial Exploitation FIN-2022-A002), `references/sector-overlays/banking.md` (typology-link patterns; bank routing patterns), and `references/cross-cutting/conduct.md` (vulnerable-customer overlap; consumer-compliance parallel routing).
- **Confidence label** — `high`. Identity-confidence is high; source class is tier-1; the typology tag is well-anchored to a named FinCEN advisory; the routing is well-aligned with the FFIEC ongoing-monitoring expectations.

## Why this scenario matters

- **A single hit can be a complete triage.** Volume is not the work; identity-confidence and typology-tagging are.
- **The FinCEN advisory on elder financial exploitation provides the typology link**; the typology tag is not "negative news" but the named advisory category.
- **The conduct overlay loads for vulnerable-customer overlap** even when the customer is the alleged perpetrator, not the alleged victim; the parallel consumer-compliance routing is the discipline.
- **The triage does not initiate APS notification, recommend exit, file a SAR, or change the rating.** It routes the artifact to the named decisionmaker.
- **Cross-reference to `aml-model-monitoring`** is real: the absence of alerts on a customer implicated in a typology-linked matter is a scope-re-evaluation question, not a clean-bill-of-health.
- **The transaction-monitoring history is read as context**, not as adjudication. The triage notes the no-alert posture and routes the scope re-evaluation rather than asserting a no-typology disposition.

## Anchors

- FinCEN Customer Due Diligence Final Rule (May 2016, compliance May 11, 2018) — fourth pillar.
- FFIEC BSA/AML Examination Manual — Customer Due Diligence section.
- FinCEN Advisory on Elder Financial Exploitation (FIN-2022-A002, June 15, 2022) [verify date].
- OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision (July 22, 2021).

See `references/source-anchors.md` for full citations, `references/sector-overlays/banking.md` for the bank-specific frame, and `references/cross-cutting/conduct.md` for the vulnerable-customer parallel routing.
