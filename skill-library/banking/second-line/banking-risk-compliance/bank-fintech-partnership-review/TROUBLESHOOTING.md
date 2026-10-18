# Troubleshooting: bank-fintech-partnership-review

Recurring defects in bank-fintech partnership packs and how to read past them. Read against `SKILL.md`, `references/source-anchors.md`, and `templates/default-output.md`. The lens here is sponsor-bank-side only; if the artifact reads as the fintech's compliance program, the wrong skill ran.

## The pack reads as a fintech compliance program

Symptom: section 1 leads with the fintech's product roadmap; section 2 takes the fintech's SOC 2 report and Reg E procedures at face value; sections 4 and 5 attribute Reg E §1005.11 timing and Reg DD §1030.4 disclosure responsibility to the fintech without naming the bank's residual obligation.

Why it happens. The reviewer ran the diligence by reading the fintech's deck and policies in order, and the artifact follows the source ordering. Or the engagement was scoped against the fintech-side mirror skill (`payments-fintech-compliance/skills/fintech-partner-controls`) by mistake.

Fix. Hard-stop and re-spine. The pack is the bank's record of how it discharges principal-supervisory accountability under the June 2023 Interagency Guidance, the 2024 Joint Agency Statement, and the Bank Service Company Act §1867(c). Section 1 leads with what the fintech does for the bank's customers, where the fintech sits in the customer experience, and the criticality classification the bank assigns. Sections 4 and 5 attribute Reg E and Reg DD obligations to the entity that holds them under §1005.2(i) and §1030.2 respectively; in a sponsor-bank deposit program that is the bank, regardless of which entity does intake. Fintech materials are evidence pointers in section 2, not the spine of the pack.

Check. The Reg O / Reg W / Reg E / Reg DD applicability summary in section 5 attests to the bank's position; the chief compliance officer or general counsel signs against it. If the summary cannot be signed without rephrasing every cell, the lens is still wrong.

## Reg E §1005.11 timing mis-stated as 5 business days

Symptom: section 4 or section 5 cites "5 business days for Reg E error investigation" or conflates the 10 / 45 / 90-day windows into a single shorter clock.

Why it happens. Industry shorthand collapses the 10-business-day investigation window with the 5-business-day provisional-credit issuance window (which is the deadline after extending the investigation to the 45-day window, not a separate investigation clock). The error sneaks in when the pack is drafted from memory rather than against the regulation.

Fix. Cite §1005.11 as it reads: investigation completed within 10 business days of the consumer's notice of error, OR (if the institution provisionally credits the consumer's account) extended to 45 calendar days for the full investigation (90 calendar days for new accounts opened within 30 days of the error, point-of-sale debit-card transactions, and foreign-initiated transfers). Written notification of the investigation results is due within 3 business days after completion. The bank has no contractual route to shorten or contract around the 10-business-day clock; the pack tests the bank's fallback when the fintech misses an intake event so the consumer's notice of error reaches the bank in time to start the clock.

Check. The Reg E row in section 4 cites §1005.11 with the 10 / 45 / 90 windows named explicitly, and the bank-fallback row carries a named SOP and a tested cadence (not a contract clause). If the pack only carries the contract clause, that is a section-3 control statement, not section-4 evidence.

## §1867(c) notification conflated with §1867(b) examination authority

Symptom: section 2 or section 3 cites "§1867(c) examination authority" and either skips the notification posture entirely or treats the contract's examiner-access clause as evidence the §1867(c) notification has been filed.

Why it happens. The Bank Service Company Act bundles examination, regulation, and notification into one section of the US Code, and practitioners refer to "§1867(c)" as shorthand for both the bank's 30-day notification obligation to its primary federal regulator and the agencies' examination authority over bank service providers. They are linked but separate.

Fix. The notification under §1867(c) is a bank-side filing obligation (notify the OCC, FRB, or FDIC within 30 days of entering into a contract for, or starting to receive, a covered service). The examination authority that lets the agencies examine the service provider directly sits at §1867(b) and (c) read together. The contract's examiner-access flow-down is the third element (the contractual seam that gives the bank a right to insist the fintech cooperates with the regulator's examination). The pack carries all three: notification status (filed yes / no / not-yet-required, with date), examination-authority recognition (the contract acknowledges the agencies' authority), and the flow-down clause (examiner cooperation, books-and-records access, subcontractor cooperation). A partnership without §1867(c) flow-down is a finding regardless of how strong the rest of the contract reads.

Check. Section 2 carries the notification posture as its own row in the Reg O / Reg W / §1867(c) cluster; section 3 carries the flow-down clause as the load-bearing first row of the contract-gap table. If both are not separately named, the pack is missing one of them.

## Reg W §223.42 sister-bank reference applied to a non-sister relationship

Symptom: section 2's Reg W affiliate test concludes "covered transactions exempt under §223.42 sister-bank exemption" or words to that effect, when the fintech is not a sister bank but an unaffiliated third-party fintech.

Why it happens. The Reg W subpart structure is dense; §223.41 and §223.42 sit close together in the exemption subpart, and the sister-bank exemption (§223.41(a) [verify exact paragraph]) is the most-cited Reg W exemption in BHC-internal training material. Practitioners reach for it by reflex on any affiliate-styled question.

Fix. Run the Reg W screen in two steps. First, determine whether the fintech is an affiliate at all under §223.2 (the 25%-control test, management-interlock, or common control through a holding-company structure). A typical bank-fintech relationship where the fintech is an unrelated third party is not an affiliate; Reg W does not apply, and §223.41 / §223.42 exemptions are inapplicable because there is nothing to exempt. Mark Reg W "not applicable" with the screen result documented. Second, where the fintech is an affiliate (most often where the fintech is a BHC-subsidiary or shares common ownership), then run the §§223.11 / 223.12 covered-transaction analysis with the §223.13 collateral and §223.14 low-quality-asset screens, and only then reach for §223.41 / §223.42 exemptions if any apply. The sister-bank exemption requires that both entities be insured depository institutions under common control; a fintech is rarely both.

Check. The Reg W row in section 5 reads "applicable: no" with the screen result, OR "applicable: yes" with the affiliate determination basis named (control test, management interlock, or common control) and the covered-transaction inventory set out. Citation to §223.41 / §223.42 only appears where the affiliate determination is "yes."

## BaaS deposit program reviewed without the FDIC Part 328 Subpart B misrepresentation lens

Symptom: section 4's UDAAP screen on customer-facing copy reads as a CFPB-only review; the FDIC misrepresentation rule at 12 CFR Part 328 Subpart B is absent from the contract-gap section, the customer-facing-controls section, and the recommended-owner-actions tail.

Why it happens. The misrepresentation rule moved into Part 328 Subpart B in 2022 and the practitioner muscle memory still reads "FDIC sign and advertising rules" as Subpart A only. On a sponsor-bank deposit program where the fintech surfaces "FDIC-insured" representations to end users, the operative rule is Subpart B.

Fix. Carry Part 328 Subpart B as a named row in three places. Section 3 contract-gap: the contract requires the fintech (and any middleware platform) to comply with FDIC misrepresentation requirements on customer-facing copy that names the bank as the insured depository institution; absence is a finding. Section 4 customer-facing controls: the bank's marketing-review approval gate covers the fintech's mobile-app, web, email, and in-app messaging surfaces; the inventory is named, the cadence is named, and the bank's attestation owner is named. Section 6 termination triggers: a Part 328 Subpart B violation by the fintech is a documented termination trigger, not just a remediation event.

Check. Section 4 lists each customer-facing surface (mobile app, web, email, in-app, statements) and the bank's most-recent attestation date for each. Inconsistency across surfaces (the most common defect) surfaces in the row, not in a separate footnote.

## Pass-through deposit insurance reviewed without FBO recordkeeping under Part 330

Symptom: section 1 names pass-through deposit insurance as a feature of the deposit program; section 2 confirms the FBO-account structure; the Part 330 §330.5 [verify section] recordkeeping conditions go unexamined.

Why it happens. Pass-through coverage feels like a marketing-side feature ("deposits are FDIC-insured up to $250k per end user"), and reviewers confirm the FBO-account structure exists without testing whether the recordkeeping at the bank, at the fintech, or at the middleware platform actually meets the conditions for pass-through coverage to attach. Without compliant recordkeeping the pass-through coverage fails, end users are exposed to the bank's solvency rather than the FDIC fund, and the bank carries the reputational and operational-risk consequence.

Fix. Section 1's money-flow row names the ledgering location (bank, fintech, or middleware platform); section 2 carries a Part 330 §330.5 recordkeeping row that names the named-role owner of the recordkeeping at each location, the reconciliation cadence, the most recent independent reconciliation test, and the bank's attestation that the records meet the §330.5 conditions. A "documented" status without an attestation is a partial finding. Where the recordkeeping sits at the middleware platform, the platform is a fourth-party and the bank's program covers it; section 3 contract-gap carries a flow-down row to the platform on the §330.5 obligations.

Check. Section 1 names the ledgering location explicitly; section 2 carries the §330.5 row with status, evidence pointer, and most-recent reconciliation date; section 3 carries the platform flow-down row. If any of the three is missing, the pass-through claim has not been evidenced and the pack should mark it `[evidence needed]`.

## OCC Heightened Standards (12 CFR Part 30 Appendix D) cited for a non-OCC-supervised sponsor bank

Symptom: section 1's Heightened Standards row cites Part 30 Appendix D as the operative framework for a $52B state non-member bank supervised by the FDIC, or for a state-member bank supervised by the FRB.

Why it happens. Part 30 Appendix D is the most-cited "large bank governance" framework in industry training, and reviewers apply it by asset-size reflex without checking the supervisor. The OCC owns Part 30 Appendix D and applies it to its own large national banks and federal savings associations. The FRB has its own large-bank governance framework (LFI rating, the SR-letter set on risk-management expectations); the FDIC supervises state non-member banks under its own large-bank examination program but does not have a direct Part 30 Appendix D analogue.

Fix. The Heightened Standards row in section 1 reads "applicable" only where the bank is OCC-supervised AND meets the $50B+ avg total consolidated assets threshold. For FRB-supervised state-member banks, cite the FRB's large-bank governance framework (LFI rating, SR letters) as the operative analogue and name the analogue rather than citing Part 30 Appendix D. For FDIC-supervised state non-member banks at the same asset band, cite the FDIC's large-bank examination program as the analogue. The substantive expectation (that third-party-risk integration into the risk-governance framework is examined alongside the partnership pack) holds across all three regulators; the citation does not.

Check. Section 1's Heightened Standards row carries the bank type and the primary federal regulator named alongside the asset band. If the bank is not OCC-supervised, Part 30 Appendix D is not the citation; the FRB or FDIC analogue is.

## Section 6 wind-down reads as theoretical

Symptom: section 6 carries the wind-down sequence as a narrative ("in the event of termination, the bank would notify customers, return data, and reconcile the FBO account") with no test date, no named owner per step, and a "most recent simulated wind-down" field reading `none` or left blank.

Why it happens. The contract has wind-down clauses, the reviewer reads them, and the pack paraphrases them. The clauses are control statements; the wind-down sequence as evidenced is a different artifact (the most recent tabletop or simulated wind-down test record).

Fix. Section 6 carries the wind-down sequence with each step (customer notification, customer-account portability, FBO-account wind-down, resolution of pending Reg E disputes, Reg DD obligations, cyber-side wind-down) keyed to a named role at the bank and the fintech, and with the most-recent-test-date field populated. Where the field reads `none`, that is itself a finding; the recommended-owner-actions tail carries an action with a target date to run the first tabletop, not a narrative reassurance. For critical-activity classifications, examiners read the test-record field first; an unfilled field reads as not-ready.

Check. Section 6's most-recent-test-date row carries a date or `none`; section 6's wind-down sequence carries named roles for each step; the recommended-owner-actions tail carries a tabletop-cadence action where the test-record field reads `none`. If section 6 reads as a paraphrase of the contract, the spine has not been re-built against the test record.

## CSI carried forward into a pack at a wider access population

Symptom: section 1 or the executive summary references a prior MRA or supervisory letter against the sponsor bank by verbatim text, including the regulator's findings language; the pack distribution list includes the partnership owner, the fintech relationship-management lead, and the head of vendor management (a wider access population than the bank's CSI access population).

Why it happens. Confidential supervisory information about the bank (prior MRAs, MRIAs, supervisory letters, examination reports) is often the most material context for the partnership review, and the reviewer pulls it forward to motivate the recommended actions. Without the access-population check, the pack carries CSI to recipients outside the bank's CSI population.

Fix. CSI under 12 CFR Part 4 Subpart C (OCC), Part 261 (FRB), or Part 309 (FDIC) is bound to the bank's CSI access population; verbatim text cannot leave that population without the regulator's written authorisation. Either summarise the finding without verbatim text (acceptable for a wider access population), or restrict the pack distribution to the CSI access population (named at the cover). The cover-block "Access population" field exists for exactly this constraint; if it reads "wide" or "partnership-team," verbatim CSI cannot appear in the body.

Check. The cover names the access population; section 1, the executive summary, and the source-trace cross-check that no verbatim CSI appears in the body where the access population is wider than the bank's CSI population. Where the substantive finding still needs to motivate the recommended actions, the body summarises (e.g., "the bank has an open supervisory finding on third-party-risk-management governance" without quoting the regulator's language) and the source-trace marks the underlying citation as restricted.
