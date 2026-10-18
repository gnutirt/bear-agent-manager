---
name: credit-risk-governance
description: |
  Produces the second-line credit risk governance review pack a US bank's chief credit officer or chief risk officer carries to the credit risk committee or hands the OCC, FRB, or FDIC examiner reviewing credit administration. Organises the artifact around credit policy alignment, underwriting framework, risk-rating discipline, concentration governance, allowance methodology oversight (ACL / CECL), Reg O and Reg W applicability for insider and affiliated credit, second-line challenge of first-line lending decisions, and (for covered banks) the Heightened Standards posture for credit risk. Audience is the chief credit officer, chief risk officer, head of credit risk review, ALLL / ACL governance committee, audit committee, and examiner-in-charge for a credit-administration scope cycle.

  Best for:
  - A national bank, state-member bank, state non-member bank, or federal savings association is refreshing its credit policy or credit risk-rating framework and second-line needs to challenge the first-line proposal against the public credit-administration expectations.
  - A bank is preparing for a credit-administration examination (OCC asset-quality scope, FDIC asset-quality and management scope, FRB BHC consolidated supervision) and needs the credit-governance evidence pack as a topical readiness slice.
  - A bank is responding to an MRA on credit risk-rating discipline, ALLL / CECL methodology, concentration management, or insider-lending governance and needs the second-line review artifact behind the response.
  - A bank is reviewing affiliated-credit or insider-credit transactions for Reg O or Reg W posture before a transaction lands or as part of a quarterly Reg O reporting cycle.
  - A bank's credit portfolio has crossed the 100% / 300% interagency CRE concentration screen and the credit risk committee has commissioned a second-line review of the proposed concentration governance refresh.

  Not the right tool when:
  - The work is fair-lending or ECOA review on consumer or small-business credit. Use the consumer-compliance fair-lending skills; this skill covers the safety-and-soundness lens, not the fair-lending lens (the two reviews are complementary but not the same artifact).
  - The work is model-risk validation of a credit scorecard or PD / LGD / EAD model. Use `ai-governance-model-risk/skills/validation-plan` (or `model-card-builder` for documentation); this skill covers second-line oversight of model use within the credit framework, not the validation itself.
  - The work is the BSA / AML aspect of customer due diligence on a borrower. Use the financial-crime-governance skills.
  - The work is broader than credit (enterprise risk-appetite review, the full CAMELS readiness pack, the full BHC supervisory cycle). Use `risk-reporting/skills/risk-committee-pack` or `banking-supervision-readiness`.
  - The work is a single MRA or MRIA write-up on one credit finding. Use `risk-compliance-core/skills/issue-writeup`; this skill bundles issues into the governance artifact, not the per-issue write-up.
argument-hint: "[institution type, primary federal regulator, asset size band, lending portfolios in scope, cycle trigger (policy refresh / exam prep / MRA response / transaction review / quarterly Reg O)]"
---

# Credit risk governance

The credit risk governance review pack is the second-line memo a chief credit officer or chief risk officer hands the credit risk committee, the audit committee, or an examiner reviewing credit administration. It is not the fair-lending review (different statutory frame, different audience, different artifact); it is not the CECL model validation (that lives in model risk). It is the safety-and-soundness governance view: how the credit policy aligns to the supervisory expectations, how underwriting and risk-rating discipline hold up, how concentrations are governed, how the allowance methodology is overseen at the second-line, how insider and affiliated credit transactions clear Reg O and Reg W, and how the credit-review function challenges first-line lending decisions independently.

The named lead attests. The pack is a draft until that step. The skill stops short of speaking for the bank to the regulator or approving any insider transaction.

## Ask first

Settle these before drafting. Most cycles answer them in the first conversation; default and flag where they do not.

- **What is the institution and who is the primary federal regulator.** National bank (OCC), state-member bank (FRB and state), state non-member bank (FDIC and state), federal or state savings association, BHC or SLHC (FRB consolidated supervision). The regulator drives which examination manual frames the pack and which supervisory letters apply.
- **What is the asset size band and is the bank a covered bank under 12 CFR Part 30 Appendix D.** Heightened Standards apply only to OCC-supervised banks (national banks, federal savings associations, federal branches) at or above $50B avg total consolidated assets; for those banks the pack carries a Heightened Standards section on credit-risk governance evidence (risk-appetite-statement coverage of credit, three-lines-of-defense maturity, board credit-committee charter and minutes). For state-member banks and state non-member banks the framework is not directly binding; FRB and FDIC carry their own large-institution governance expectations through SR 12-17 / SR 19-3 and the FDIC Manual respectively. Banks approaching the OCC threshold get a forward-looking section.
- **What lending portfolios are in scope.** Commercial, CRE, residential, consumer, specialty, capital-markets credit. Portfolio mix drives which Comptroller's Handbook booklets anchor the review and whether the CRE concentration screen is in play.
- **What triggered this cycle.** Policy refresh, examination prep, MRA or MRIA response, transaction review, quarterly Reg O cycle, annual credit review, concentration watch (the portfolio is approaching or has crossed an internal or interagency concentration trigger). The trigger drives where the pack focuses depth.
- **What is the source posture and the access population.** Public-only, public-plus-firm-policy, public-plus-firm-policy-plus-evidence, or connector-aware. CSI (prior supervisory letters, prior MRAs / MRIAs on credit) cannot leave the bank without the regulator's written authorisation; the access population for the pack constrains what it can carry.

When an `scope` record is supplied, consume it for institution profile, persona, source posture, and the conduct cross-cutting overlay flag. When not supplied, ask the questions and default; flag the defaults in the pack.

## How the pack gets built

The pack has a cover, an eight-section body, and a tail. Walk it in the order the conversation surfaces evidence.

**Cover and scope.** Institution profile, lending portfolios in scope, cycle trigger, source posture and access population, confidence label, and reviewer questions. The cover is the orientation any committee member reads first.

**1. Credit policy alignment.** Policy version and effective date. Cross-walk the policy coverage against the supervisory expectations on credit administration (underwriting standards, exception management, documentation, risk-rating, concentration, ACL governance, problem-loan management, loan-review independence). Name the gaps and the second-line recommendations against those gaps.

**2. Underwriting framework.** Documented underwriting standards by product. Exception governance: exception definition, approval authority, aggregate-tracking, board reporting cadence. Underwriting-data adequacy: cash-flow analysis, collateral valuation, guarantor support. Reviewer questions where the framework is silent.

**3. Risk-rating discipline.** Rating scale (pass / special mention / substandard / doubtful / loss; granularity within pass). Rating-assignment process (initial, annual, event-driven). Rating-override governance. Concurrence and challenge by the credit-review function. Backtesting and migration analysis evidence. Keep risk-rating override and underwriting exception separate; they are different governance artifacts.

**4. Concentration governance.** Concentration definitions (single-name, industry, geography, collateral type, structure). Threshold framework (board-approved limits, escalation triggers). Where applicable, CRE concentration position vs the interagency 100% / 300% screen with the framing that 300% is a monitoring trigger for enhanced risk-management expectations, not a regulatory cap. Concentration-management memo cadence to the board.

**5. Allowance methodology oversight (ACL / CECL).** Methodology summary: segmentation, loss-rate approach, qualitative-factor framework, reasonable-and-supportable forecast horizon, reversion approach. Governance: model-validation status (handed off to model risk; this section reads the validation outcome), qualitative-factor approval, sensitivity analysis, board reporting. Tie risk-rating migration into the expected-loss inputs to show the linkage between sections 3 and 5.

**6. Reg O and Reg W applicability.** Reg O scope: insider population (directors, executive officers, principal shareholders, related interests), covered transactions, prior-board-approval gate, aggregate lending-limit headroom, executive-officer specific limits, recordkeeping, quarterly reporting. Reg W scope: affiliate population, covered-transactions inventory, quantitative limits (10% per affiliate / 20% aggregate), collateral status, low-quality-asset prohibition, applicable exemptions. Open positions and reviewer questions. Run the section even on quiet quarters because the recordkeeping and reporting obligations exist regardless of transaction volume.

**7. Second-line challenge of first-line lending decisions.** Sample-based challenge results (concurrence rate, override rate, escalation pattern). Trend in challenge findings. Action items for first-line credit. Independence of the credit-review function: reporting line, scope authority, and evidence per the inter-agency credit-risk-review-system expectations.

**8. Heightened Standards posture (OCC-supervised covered banks only, under 12 CFR Part 30 Appendix D).** Risk-appetite-statement coverage of credit risk. Three-lines-of-defense maturity in credit. Board credit-committee charter and evidence. Risk-governance-framework attestation cross-walk for credit. For banks approaching the OCC threshold, run the section forward-looking; examiners probe ahead of the trigger. For non-OCC banks the section reads "not applicable" with a note pointing to the parallel FRB or FDIC governance expectations the pack actually walks.

**Tail.** Recommended owner actions (concrete, dated, named-role). Open issues feeding the MRA-tracking or audit pipeline. Source trace (every material claim cites a source from `references/source-anchors.md` or a loaded overlay; unsupported items `[evidence needed]`; section references that cannot be confirmed `[verify section]`). Sign-off block.

## Sector and cross-cutting overlays

This skill is banking-sector-only. The `references/sector-overlays/banking.md` file carries the deeper banking-specific nuance the body keeps generic (booklet-by-booklet citation patterns, charter-specific rule cites, Heightened Standards cross-walk lines for covered banks). `references/cross-cutting/conduct.md` loads when the credit program touches consumer or small-business borrowers and second-line review needs to surface UDAAP exposure on lending practices, with an explicit pointer to route the fair-lending lens out to the consumer-compliance plugin. Climate, privacy, and cyber overlays do not load.

## Quality bar

Every material claim about credit-administration expectation, rating-system definition, concentration trigger, ACL methodology requirement, insider-credit prior-approval gate, or affiliate-transaction limit cites a source from `references/source-anchors.md` (or a loaded overlay) by path. Unsupported items carry `[evidence needed]`. Section references that cannot be confirmed get `[verify section]`. Source evidence, bank management assertion, public-source obligation, generated inference, and open legal question stay distinguishable. Roles only, never named individuals. No named institutions in narrative beyond a public defendant in a finalised consent order, and only for structural pattern. The pack stops short of speaking for the bank to the regulator or approving any insider transaction. The named lead attests.

## Adaptation

Pack depth scales to the trigger: a quarterly Reg O cycle reads short, organised around section 6 with the other sections running as a one-line posture confirmation; an exam-prep pack on credit administration reads long, with all eight sections fully populated; a CRE concentration policy refresh reads as section 1 (policy alignment) plus section 4 (concentration governance) plus section 5 (allowance) in depth, with the rest as posture confirmation. Audience drives shape: the credit risk committee reads the operational version, the audit committee reads a tighter executive view, and a board pre-read distills to the executive summary plus the recommended owner-action list. Source posture drives what the pack can assert at high confidence. Where firm-specific policy, named credit-policy-committee machinery, or internal rating-system definitions apply, they live in `references/firm-overlay.md` and are consumed when present.

## Common pitfalls

- Treating the pack as a fair-lending review. The two are distinct artifacts. Safety-and-soundness credit governance covers underwriting, rating, ALLL / ACL, concentration, insider and affiliate. Fair lending covers ECOA, FHA, Reg B, HMDA, Section 1071, disparate impact and treatment. Cross-reference the consumer-compliance plugin; do not blur the lenses.
- Skipping the Reg O section on quarterly cycles where no insider transactions occurred. The recordkeeping and reporting obligations exist regardless of transaction volume; the pack confirms posture even on quiet quarters.
- Confusing risk-rating override with underwriting exception. A risk-rating override changes the assigned grade away from the rule-based output. An underwriting exception is a deviation from policy at origination. Both have governance; the artifact keeps them separate.
- Treating the 300% CRE concentration threshold as a hard limit. The interagency CRE guidance treats 300% as a monitoring trigger for enhanced risk-management expectations, not a regulatory cap. Phrase it as a trigger, not a violation.
- Replicating CECL model validation work inside section 5. Validation is a model-risk function and lives there; section 5 covers second-line oversight of how CECL outputs land into credit governance (methodology approval, qualitative-factor governance, the linkage to risk-rating migration).
- Skipping the Heightened Standards section for covered banks. For $50B+ banks the section is not optional; examiners read it first.
- Citing a Comptroller's Handbook booklet without pinning the edition. Booklets are revised periodically. Pin the edition date in the source trace; mark `[verify current edition]` when uncertain.

## Pointers

- `references/source-anchors.md` — citations and excerpts for the named anchors (Comptroller's Handbook credit booklets, FDIC RMS Manual asset-quality section, interagency credit-risk-review-system guidance, interagency CRE concentration guidance, CECL standard and interagency CECL guidance, Reg O, Reg W, Heightened Standards).
- `references/sector-overlays/banking.md` — banking-specific deeper detail on charter-by-charter rule cites, booklet edition tracking, and Heightened Standards cross-walk lines for credit.
- `references/cross-cutting/conduct.md` — UDAAP overlay on lending practices and the explicit route-out to the consumer-compliance fair-lending lens.
- `references/firm-overlay.md` — firm-installed credit policy version, named credit-policy-committee machinery, internal rating-system definitions, sustained-operation policy threshold for closure, response-letter style guide; consumed when present.
- `templates/default-output.md` — pack template carrying the cover, the eight-section body, and the tail.
- `examples/` — public-source-derived scenarios (community-bank CRE concentration policy refresh; midsize national bank Reg O quarterly review with director-related-interest transactions).
- `TROUBLESHOOTING.md` — recurring defects in credit-governance packs.

## Output

Default to drafting against `templates/default-output.md`. Render as Word, Excel, PowerPoint, or Markdown when the audience or workflow asks for it; the typical deliverable is a Word memo via the `docx` skill in the `document-skills` plugin, with concentration tables that lift to Excel for the credit risk committee. Produce the structured record at `schemas/credit-risk-governance.schema.json` when downstream automation or a registered consumer needs it. The named lead (chief credit officer or chief risk officer) attests; the memo is a draft until that step.

Downstream consumers: `banking-supervision-readiness` reads the credit-governance posture into the asset-quality CAMELS-component preparation. `issue-writeup` consumes the open-issue rows for individual MRA or MRIA write-ups. `risk-committee-pack` consumes the credit-risk-committee headline plus the open-action list for the standing credit section. The pack itself is firm-confidential by convention; CSI references constrain what the pack can carry forward across access populations.
