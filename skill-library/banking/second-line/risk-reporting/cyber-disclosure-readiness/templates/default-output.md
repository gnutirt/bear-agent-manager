# Cyber disclosure readiness pack: [registrant short name] — [period or incident reference]

Starting structure for the second-line cyber-disclosure-readiness pack. Three artifacts share the same template; the engagement names which artifact is in scope and the rest compresses to a brief or is omitted with rationale.

- **Artifact A** — 8-K Item 1.05 trigger and disclosure-decision pack (incident-driven). Sections marked `[A]`.
- **Artifact B** — 10-K Item 106 disclosure pack (annual cycle). Sections marked `[B]`.
- **Artifact C** — Disclosure controls and procedures (DCP) readiness map. Sections marked `[C]`.

The pack is a draft until the disclosure committee, securities counsel, the CISO, and the CFO attest. The skill stops at the draft.

---

## Cover

- Registrant short name: [internal name; never the SEC accession number]
- Filer category: [large accelerated filer / accelerated filer / smaller reporting company / non-accelerated filer / foreign private issuer]
- Artifact in scope: [A — 8-K Item 1.05 / B — 10-K Item 106 / C — DCP readiness map / multiple — list]
- Engagement-scope ID (if `scoping` was run): [ID]
- Classification: [internal / disclosure-committee-confidential / regulator-shareable]
- Pack version: [v1 / v1-revised]

---

# Artifact A: 8-K Item 1.05 trigger and disclosure-decision pack `[A]`

## A1. Clock posture

| Field | Value |
|---|---|
| Incident reference ID (firm-internal) | [ID] |
| Date detected | [YYYY-MM-DD HH:MM tz] |
| Materiality determination date | [YYYY-MM-DD HH:MM tz, or "pending"] |
| Disclosure clock start | [= materiality determination date; not detection] |
| Disclosure filing due | [4 business days from clock start] |
| Delay provision invoked | [no / yes — if yes, see A6] |
| Filing-clock posture | [pre-determination / pending / determined-and-clocked / filed / amended / delay-invoked] |

The 4-business-day clock starts at the materiality determination, not at detection. If the determination is pending, the filing-due field is null; the workpaper drives the determination, not the calendar.

---

## A2. Incident timeline

Chronological with knowns and unknowns distinguished.

| Stage | Datetime | What is known | What is unknown |
|---|---|---|---|
| Detection | [datetime] | [known facts] | [unknowns] |
| Triage | [datetime] | | |
| Containment | [datetime] | | |
| Scope determination (initial) | [datetime] | | |
| Materiality call | [datetime, or "scheduled" / "pending"] | | |
| Disclosure decision | [datetime, or "pending"] | | |
| Filing | [datetime, or "pending"] | | |

---

## A3. Materiality determination workpaper

The centre of the pack. Fill each row; aggregation is surfaced explicitly even when empty.

### A3.1 Facts of the incident

- **What is known**: [bulleted facts]
- **What is unknown**: [bulleted unknowns]
- **What is reasonably knowable as of the determination date**: [bulleted; this row drives the "to the extent known" framing in the disclosure draft]

### A3.2 Reasonable-investor analysis (TSC Industries / Basic standard)

- Substantial-likelihood test applied to: [the facts and their reasonably foreseeable consequences as of the determination date]
- Probability-magnitude analysis (Basic) for forward-looking impact: [analysis]
- Source: TSC Industries v. Northway, 426 U.S. 438 (1976) [verify pin cite]; Basic v. Levinson, 485 U.S. 224 (1988) [verify pin cite]; SEC Final Rule Release No. 33-11216 commentary on the materiality standard.

### A3.3 Quantitative impact

| Dimension | Current | Reasonably foreseeable | Currency / unit | Confidence |
|---|---|---|---|---|
| Financial impact (direct loss, response cost, business interruption) | [number] | [number, or "not yet quantified"] | [USD / etc.] | [high / medium / low / unknown] |
| Customer impact (count of affected, segment) | [count] | [count] | [count] | [confidence] |
| Operational impact (systems, business lines, services) | [summary] | [summary] | n/a | [confidence] |

### A3.4 Qualitative impact

- **Reputational**: [analysis]
- **Regulatory**: [analysis; named regulators with current posture]
- **Strategic**: [analysis]
- **Competitive**: [analysis]

### A3.5 Aggregation of related occurrences (Item 1.05 Instruction 1)

- Related prior incidents in the relevant period: [list of incident IDs, or "none identified"]
- Aggregation analysis: [analysis applying the Instruction 1 standard for a series of related occurrences from the same threat actor or related occurrences]
- Aggregation conclusion: [individually material / aggregately material / neither / pending]

An empty list is a stated determination, not an absence; document the analysis.

### A3.6 Determination

- **Determination**: [material / not-material / pending]
- **Determined by**: [role; disclosure committee chair, with securities counsel input is the standard composition]
- **Determined on**: [datetime; this populates A1]
- **Rationale summary**: [one paragraph]

---

## A4. Item 1.05 disclosure draft

The 8-K body, structured into the four required elements only. Forensic detail, IOCs, named threat actors, remediation specifics, and content that could prejudice ongoing investigation belong elsewhere.

### Item 1.05. Material Cybersecurity Incidents

On [date], [registrant short name] (the "Company") determined that a cybersecurity incident the Company experienced is material under the Securities and Exchange Commission's Form 8-K Item 1.05 standard.

**Nature of the incident**: [description, to the extent known as of the date of this filing]

**Scope**: [description, to the extent known as of the date of this filing]

**Timing**: [description of when the incident occurred and the timeline of the Company's discovery and response, to the extent known as of the date of this filing]

**Material impact (or reasonably likely material impact)**: [description of the material impact or reasonably likely material impact on the Company, including its financial condition and results of operations]

The Company will continue to investigate the incident and will file an amendment to this Form 8-K if and when material new information becomes available, as required by Item 1.05(b).

---

## A5. Delay-provision analysis

- Delay invoked: [no / yes]
- If no: rationale that the incident does not pose a substantial risk to national security or public safety; AG notification not initiated. [analysis]
- If yes: AG notification process documented per SEC Final Rule Release No. 33-11216 Section II.B and Justice Department guidance on the AG delay-determination process; coordinate with counsel before any reliance on the provision. [process documented]

---

## A6. Parallel notification clocks

| Regulator | Clock basis | Due | Status |
|---|---|---|---|
| SEC (8-K Item 1.05) | 4 business days from materiality determination | [datetime] | [not-started / in-progress / submitted / not-applicable] |
| Federal banking agency (12 CFR 53/225/304) | 36 hours from determination of notification incident | [datetime] | [status] |
| NYDFS (23 NYCRR Part 500 §500.17(a)) | 72 hours from determination of cybersecurity event | [datetime] | [status] |
| NYDFS (23 NYCRR Part 500 §500.17(c)) | 24 hours from extortion payment (if applicable) | [datetime] | [status] |
| SEC Reg S-P (17 CFR Part 248.30) | 30 days from awareness of unauthorized access (covered institutions) | [datetime] | [status] |
| State breach-notification laws | [varies by state; identify states implicated] | [datetimes by state] | [status] |
| HIPAA Breach Notification Rule (45 CFR §§164.400-414, if in scope) | 60 days from discovery (individual notice); concurrent for 500+ (HHS) | [datetime] | [status] |
| GLBA Interagency Guidance (5-business-day SAR-equivalent triggers, where applicable) | [trigger] | [datetime] | [status] |
| FINRA Rule 4530 (if FINRA-member) | 30 days from quarter-end / event-driven | [datetime] | [status] |
| Counterparty contractual notification | [contractual basis; identify contracts] | [datetimes] | [status] |
| State insurance department (if NAIC #668-adopting state) | 72 hours from determination | [datetime] | [status] |

The SEC clock is one row among several. Surface every clock applicable to the registrant; missing one is a frequent regulator finding.

---

## A7. DCP trace

How the incident moved through the disclosure controls and procedures.

| Stage | Actor role | Timestamp | Documentation pointer |
|---|---|---|---|
| Detection | [SOC analyst / IR on-call / vendor notification / customer report] | [datetime] | [pointer to detection log] |
| Triage | [IR lead / CISO designee] | [datetime] | [pointer to triage record] |
| Escalation to second line | [head of operational risk / head of cyber risk] | [datetime] | [pointer to escalation memo] |
| Escalation to disclosure committee | [committee secretary / GC office] | [datetime] | [pointer to convening notice] |
| Materiality call | [disclosure committee chair, with securities counsel] | [datetime] | [pointer to meeting minutes and workpaper] |
| Disclosure decision | [disclosure committee] | [datetime] | [pointer to decision memo] |
| Filing | [head of disclosure / SEC reporting lead] | [datetime] | [pointer to filing record] |

---

## A8. Sign-off block

The pack is a draft until the named officers attest.

- Disclosure committee chair: [role; sign-off date]
- Securities counsel (internal or external; named role): [role; sign-off date]
- CISO or designee: [role; sign-off date]
- CFO: [role; sign-off date]

Reviewer questions for the disclosure committee:

1. [Question on a known unknown that materially shapes the disclosure draft]
2. [Question on the aggregation analysis]
3. [Question on a parallel-clock that is in-progress]
4. [Question on the DCP trace where a stage carries `[evidence needed]`]
5. [Question on whether amendment under Item 1.05(b) is reasonably foreseeable]

---

# Artifact B: 10-K Item 106 disclosure pack `[B]`

## B1. Filing context

| Field | Value |
|---|---|
| Filing period end | [YYYY-MM-DD] |
| Filing type | [10-K / 20-F (FPI Item 16K)] |
| Prior-year Item 106 reference | [filing date / accession number / pointer] |
| Year-over-year diff scope | [no change / minor refresh / material refresh] |
| Engagement-scope ID | [ID] |

Year-over-year diff and rationale is required. Rolled-forward-unchanged Item 106 is a frequent finding.

---

## B2. Item 106(b) — Risk management and strategy

Each required element is a discrete subsection.

### B2.1 Processes for assessing, identifying, and managing material risks from cybersecurity threats

[Disclosure draft]

### B2.2 Integration into the firm's overall risk-management system

[Disclosure draft]

### B2.3 Engagement of assessors, consultants, auditors, or other third parties

[Disclosure draft. Name the function (e.g., "the Company engages independent third-party assessors"); the SEC Final Rule does not require naming the assessor entity.]

### B2.4 Processes to oversee and identify material risks from third-party service-provider use

[Disclosure draft]

### B2.5 Material effects on the firm

[Disclosure draft. The empty case ("no risks from cybersecurity threats have materially affected, or are reasonably likely to materially affect, the Company") is a stated determination. The non-empty case names the incident or pattern with reference to any prior 8-K Item 1.05 filing.]

---

## B3. Item 106(c) — Governance

### B3.1 Board oversight

[Disclosure draft. Name the specific board committee (Risk Committee / Audit Committee / Cybersecurity Committee); the cadence (e.g., quarterly committee briefings, annual full-board deep-dive); the processes by which the board or committee is informed.]

### B3.2 Management's role

[Disclosure draft. Name the positions / committees responsible (e.g., CISO reporting to CIO with dotted-line to CRO; Cybersecurity Steering Committee chaired by CISO); the named expertise (CISO with named credentials and prior experience; reporting line); the processes by which management is informed about and monitors cybersecurity risks.]

---

## B4. Material effects to date — structured record

| Incident / pattern | Affected period | Effect summary | Linked 8-K Item 1.05 reference (if any) |
|---|---|---|---|
| [name] | [period] | [summary] | [filing date / accession number, or "none filed"] |

Empty array is acceptable when no incidents materially affected the period; the stated determination lives in B2.5.

---

## B5. Source trace per claim

Each governance and risk-management assertion is anchored to a board minute, charter section, risk-register entry, third-party assessor report, or policy reference.

| Claim | Evidence pointer | Evidence type |
|---|---|---|
| [claim] | [pointer] | [policy / board-minutes / charter / risk-register / system-output / third-party-assessor-report / other] |

---

## B6. Year-over-year diff and rationale

| Section | Prior year text | Current year text | Diff rationale |
|---|---|---|---|
| 106(b)(1) processes | [prior] | [current] | [why changed; or "no substantive change — refreshed for currency"] |
| 106(b)(2) integration | | | |
| 106(b)(3) third-party assessors | | | |
| 106(b)(4) third-party service providers | | | |
| 106(b)(5) material effects | | | |
| 106(c)(1) board oversight | | | |
| 106(c)(2) management role | | | |

---

## B7. Sign-off block

- Head of disclosure: [role; sign-off date]
- Securities counsel: [role; sign-off date]
- CISO: [role; sign-off date]
- Audit Committee secretary acknowledgement: [role; date once distributed]
- Disclosure committee chair: [role; sign-off date]

Reviewer questions for the disclosure committee:

1. [Question on a year-over-year change that is material to the disclosure]
2. [Question on the named board committee and cadence]
3. [Question on the named CISO expertise where the prior-year disclosure read more aspirationally]
4. [Question on a B5 claim where the evidence pointer is `[evidence needed]`]
5. [Question on the empty-or-non-empty determination in B2.5]

---

# Artifact C: DCP readiness map `[C]`

## C1. Trigger detection points

Where in the firm an incident becomes visible.

| Source | Owner role | Time-to-triage SLA | Documentation requirement |
|---|---|---|---|
| Security operations centre | [role] | [hours] | [pointer to runbook] |
| Fraud function | [role] | | |
| Customer service | [role] | | |
| Vendor notification (under contractual SLAs) | [role] | | |
| Regulator notification (federal banking agency 4-hour bank-service-provider rule) | [role] | | |
| Internal whistleblower or anomaly report | [role] | | |

---

## C2. Escalation paths

First-line to second-line to disclosure committee.

| Stage | Source role | Target role | Trigger threshold | Time-bound step |
|---|---|---|---|---|
| First line to second line | [SOC lead / fraud lead] | [head of operational risk / head of cyber risk] | [criteria, e.g., "Tier 1 or Tier 2 incident severity"] | [hours] |
| Second line to GC office | [head of cyber risk] | [GC / deputy GC for securities] | [criteria, e.g., "potentially material under Item 1.05"] | [hours] |
| GC office to disclosure committee | [GC office] | [disclosure committee chair] | [criteria, e.g., "potentially material; convening of materiality call"] | [hours] |

---

## C3. Materiality-determination protocol

- **Decision-makers**: [list of roles; disclosure committee with securities counsel input is the standard composition]
- **Criteria framework**: [TSC Industries / Basic standard, applied per the firm's DCP and the SEC Final Rule commentary; quantitative-and-qualitative composite; aggregation analysis under Instruction 1 to Item 1.05]
- **Time-box**: [internal target hours from escalation to determination; typically tighter than the 4-business-day SEC backstop]
- **Tie-break**: [escalation to GC and CFO if the committee cannot reach consensus]

---

## C4. Required documentation per stage

| Stage | Documentation | Owner role | Retention |
|---|---|---|---|
| Detection | [detection log entry] | [role] | [retention period per firm policy] |
| Triage | [triage record] | | |
| Escalation | [escalation memo] | | |
| Materiality call | [meeting minutes; materiality workpaper Artifact A3] | | |
| Disclosure decision | [decision memo] | | |
| Filing | [filing record; copies of submissions] | | |

---

## C5. Gaps and remediation

| Gap | Severity | Owner | Target remediation date |
|---|---|---|---|
| [gap description] | [low / medium / high / critical] | [role] | [YYYY-MM-DD] |

---

## C6. Sign-off block

- Head of disclosure: [role; sign-off date]
- Disclosure committee chair: [role; sign-off date]
- Head of operational risk (second line): [role; sign-off date]
- CISO: [role; sign-off date]

Reviewer questions:

1. [Question on a gap that materially affects DCP effectiveness]
2. [Question on the time-box target where current performance lags]
3. [Question on the federal banking agency 4-hour bank-service-provider trigger if any vendor's exposure is material]

---

## Appendix: Source trace and confidence

For every material claim across A, B, and C:

| Claim | Source | Evidence pointer | Confidence | Artifact |
|---|---|---|---|---|
| [claim] | [system / document / `[evidence needed]`] | [pointer] | [high / medium / low / evidence-needed] | [A / B / C] |

---

## Appendix: Verification flags carried forward

Items in this pack that carry `[verify section]`, `[verify current effectiveness]`, or `[verify pin cite]` and require resolution at draft time:

- [list, with the line reference and the verification action needed]

The SEC Climate Disclosure Rule, where referenced in any cross-cutting climate content, carries `[verify current effectiveness]` and is not asserted as currently effective without checking SEC posture at draft time.
