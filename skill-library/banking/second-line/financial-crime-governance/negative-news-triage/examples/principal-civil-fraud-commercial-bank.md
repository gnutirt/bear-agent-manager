# Example: principal-level civil fraud (commercial customer at a mid-size US bank)

Public-source-derived. No named institution. The shape mirrors a recurring pattern at mid-size US banks: a periodic adverse-media re-scan on a commercial customer (legal entity) returns a populous hit set dominated by common-name false matches, with a small material subset surfacing principal-level adverse media.

## Input

- **Institution**: a mid-size US bank with a regional commercial-banking franchise; primary regulator OCC for this example (FRB or FDIC depending on charter).
- **Customer**: a private commercial-services LLC, mid-eight-figure annual revenue, two principals on file (one control-prong individual, one ownership-prong individual at 60%, second principal at 40%).
- **Triage scope**: `periodic_refresh` on the customer's risk-tier cycle (high-risk customer, annual cycle).
- **Hit set (as presented for triage)**: 42 hits across the firm's adverse-media vendor and a supplementary open-source pull. Vendor self-tags 14 hits as "high reliability", 18 as "medium", 10 as "low".
- **Engagement scope supplied**: institution = mid-size US bank; primary regulator = OCC; persona = second-line negative-news triage reviewer reporting to the BSA officer; source posture = public-plus-firm-policy-plus-system-of-record-evidence; sector overlay = banking; cross-cutting overlays = none.
- **CDD file evidence available**: customer record (legal name, formation, EIN, registered address, principal place of business), beneficial-ownership certification (named control-prong and ownership-prong individuals with matchable attributes), expected-activity profile (commercial-services-specific), risk-rating drivers (industry concentration, counterparty geography, transaction velocity), and the most recent CDD refresh memo.

## Output sketch

The skill produces a triage memo against the hit set. Headlines:

- **Hit set summary** — 42 total. Source-class breakdown: 4 tier-1 (a federal court filing, two regulator press releases, one major-outlet article); 12 tier-2 (trade press and aggregator content); 26 tier-3 (forum, social, unverified aggregator content). Publication-date range covers eight years; underlying-event-date range covers ten years.
- **Per-hit assessment headlines**:
  - **28 hits** (out of 42) **disposition `not_relevant`** on identity grounds. Common-name false matches: the customer's legal name shares a token with three unrelated entities surfaced in the hit set; the matchable-attribute join (jurisdiction, formation date, business activity) eliminates them. The triage names the false-match pattern in `aggregated_themes` rather than dispositioning each individually in the per-hit detail.
  - **8 hits** (tier-3 forum content) **disposition `unverified_pending`** carrying `[evidence needed]` for primary-source corroboration. The triage does not escalate on uncorroborated tier-3 content.
  - **4 hits** (the two regulator press releases and two of the trade-press hits) **disposition `not_relevant`** on entity-disambiguation grounds: the named entity is similar but not the customer (different jurisdiction, different EIN, different beneficial owners).
  - **2 hits** (the federal court filing and the major-outlet article reporting on the same matter) **disposition `relevant`**. Identity confidence high (the filing names one of the customer's principals with corroborating attributes — date of birth, address, prior employment — that match the CDD file's beneficial-ownership record). Tier-1 source class. `event_date` 14 months before the triage; `publication_date` 11 months before. Materiality `material`. Typology tag: `fraud` (civil fraud allegation in a commercial-counterparty matter; not a criminal indictment). Linkage strength: `direct` (the principal is named as a defendant in the civil filing).
- **Aggregated themes**:
  - Common-name false-match pattern dominates the bulk; the firm's vendor query likely needs review for the customer-segment context (a source-posture observation routed to the BSA program, not to per-customer escalation).
  - Principal-level adverse media (the two material hits both bear on one of the two named principals); no entity-level enforcement or court action surfaced.
  - No escalating-timeline pattern; the material subset is a single matter.
- **Downstream routing**:
  - **`cdd-risk-review` (event-driven refresh)** — the principal-level civil fraud allegation is a material-customer-information event under the CDD ongoing-monitoring pillar; the refresh re-reads the principal's role in the entity, the beneficial-ownership inconsistency check, and the expected-activity profile in light of the alleged conduct.
  - **`edd-escalation-pack`** — the principal's other public roles (per the open-question item below) may surface PEP-adjacency or correspondent-banking overlap warranting EDD upgrade. Routed conditionally on the corroboration of the principal's public-role inventory.
  - **`sanctions-screening-qa`** — not implicated by the material subset; no routing line.
  - **`sar-decision-qa`** — not implicated unless an in-flight or recent alert exists; the routing is conditional on the alert-history check.
  - No further action on the 38 non-material hits; next periodic re-scan on cycle.
- **Open questions and evidence-needed items**:
  - **Principal's public-role inventory** (PEP-adjacency check): public-record search for the principal's other directorships, political affiliations, and government-contracting roles. Owner: EDD analyst. `[evidence needed]`.
  - **Civil-matter outcome and counterparty identification**: the filing is 14 months old; the docket may carry an updated status the triage did not pull. Owner: source-corroboration owner. `[evidence needed]`.
  - **Beneficial-ownership inconsistency check**: the alleged conduct in the civil filing implies a counterparty relationship the customer's expected-activity profile does not reflect; the CDD refresh reads against this. Owner: relationship owner. `[evidence needed]`.
- **Source trace** — anchors to `references/source-anchors.md` (FFIEC CDD section, FinCEN CDD Final Rule fourth pillar, joint statement on risk-focused supervision, Wolfsberg adverse-media guidance) and `references/sector-overlays/banking.md` (commercial-customer adverse-media patterns, principal-versus-entity drift, common-name false-match handling).
- **Confidence label** — `medium`. Identity-confidence on the material subset is high; corroboration on the open questions is pending; the source-posture observation on the bulk false-match pattern is the lower-confidence read.

## Why this scenario matters

- **Identity confidence runs first.** Most of the 42 hits drop out on the identity cut; without it the triage would be 42 misallocated hours and a misleading materiality narrative.
- **Common-name false-match patterns are named at the theme level**, not dispositioned per hit, when the false-match basis is the same. This keeps the per-hit detail readable.
- **Source-tier is anchored to source class**, not to vendor self-tagging; the vendor's "low" reliability tag does not eliminate the obligation to read back to the source class.
- **Principal-versus-entity drift is the load-bearing pattern** in this scenario; the triage names it as a theme and the routing reflects it.
- **The triage does not change the rating, decline the relationship, file a SAR, or escalate to EDD as a closed decision.** It routes the artifact to the named decisionmaker.
- **Open questions carry forward** as `[evidence needed]` rather than being resolved by triage assertion.

## Anchors

- FinCEN Customer Due Diligence Final Rule (May 2016, compliance May 11, 2018) — fourth pillar (ongoing monitoring) covers material customer-information updates.
- FFIEC BSA/AML Examination Manual — Customer Due Diligence section.
- OCC / FRB / FDIC / NCUA Joint Statement on Risk-Focused BSA/AML Supervision (July 22, 2021).
- Wolfsberg Group guidance on adverse media / negative news (public industry reference).

See `references/source-anchors.md` for full citations and `references/sector-overlays/banking.md` for the bank-specific adverse-media frame.
