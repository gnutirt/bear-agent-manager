# Institutional Requirements — "حقيبة الكورسات" (Course Bag) Program

Used by: `course-designer` (Duration/scope-gathering step, and the closing
course-bag submission draft), `course-reviewer` (Institutional requirements
check).

This file exists so courses built with this plugin automatically satisfy
one specific institution's submission rules, without the instructor having
to remember or re-check them by hand every time.

## 1. Minimum course duration

**6 training hours minimum.** A course request under 6 total hours is not
eligible for submission to this program at all — flag this immediately when
parsing requirements (see the wiring in `skills/course-designer/SKILL.md`),
not after the whole course has been designed.

## 2. Certificate rule

**No certificate is issued for any course under 20 total hours.**

This is a *soft* constraint, not a hard minimum like #1 — a 6–19 hour course
is a legitimate, submittable course; it just won't carry a certificate. The
instructor decides whether that's acceptable, so `course-designer` must
surface the trade-off rather than silently proceeding or silently blocking.

When the planned total falls in **6–19 hours**, present these options
explicitly during the Duration/scope step:

1. **Add a session** — increase session count, keeping session length the same.
2. **Extend session length** — keep session count, increase per-session duration.
3. **Proceed without a certificate** — keep the course as planned; note in
   the course plan that no certificate will be issued.

At **20+ hours**, no flag is needed — the certificate threshold is already met.

## 3. Course-bag submission form fields

The 13 fields the institution's submission form asks for. A finished course
from this plugin should be able to answer every one of these directly from
its own artifacts — if it can't, that's a gap in the course plan, not just
in the submission draft.

| # | Field | Source in the course package |
|---|---|---|
| 1 | Email | Not derived from the course — auto-filled from the submitter's Google account at submission time. `course-designer` leaves this as a placeholder in the draft. |
| 2 | Department | Kids / Language / Human Development / Management / Computer — instructor selects; not inferable from course content alone unless obvious (e.g. a Python course → Computer). |
| 3 | Course name (marketing version) | A punchier restatement of `course.name`, not necessarily identical to it |
| 4 | Course name (scientific/official version) | `course.name` from `course-plan.md`, as-is |
| 5 | Course Objective — what the student gains | Synthesized from `course-plan.md`'s Learning Objectives + Course Outcomes |
| 6 | Prerequisites | `course-plan.md`'s Prerequisites section, as-is |
| 7 | Targeted Audience | `course-plan.md`'s Audience + Level |
| 8 | Course Outline — main topics (marketing) | `course-plan.md`'s Course Structure table, reworded for a prospective-student audience rather than an instructor audience |
| 9 | Course Timetable (uploadable file) | **Not** the marketing outline — see §4 below; a separate spreadsheet, one row per lecture |
| 10 | Preferred assessment method | `course-plan.md`'s Assessment Strategy, mapped to the form's categories (end-of-course exam / graduation project / presentation / other) |
| 11 | Total course hours | `schedule.total_hours` from the manifest |
| 12 | Number of lectures | `schedule.sessions` from the manifest |
| 13 | Two-line description of the desired promotional image | Not derivable from course content — instructor supplies this; `course-designer` leaves it as an open prompt in the draft, optionally suggesting a starting idea based on the course topic |

## 4. Course Timetable spreadsheet

A separate file from the 13-field form draft — an uploadable spreadsheet
(institution accepts PDF/Word/PPT/Excel, ≤100MB; this plugin generates
`.xlsx`), one row per lecture (= per session), columns:

| Column | Source |
|---|---|
| Lecture number | Session number |
| Title | Session title |
| Duration | Session duration (from the manifest's `session_duration`) |
| Content taught | The session's Topics/Key Concepts, condensed to a few lines |
| Practical work (in-class) | The session's Activity + Exercise names/summaries |
| Post-lecture task | The session's Homework field, or "None" if the session has none |

This mirrors the structure already used for the Python-for-AI-diploma
course-bag submission — see `templates/course-bag-submission-template.md`
for the field-by-field draft layout and
`templates/course-bag-timetable-template.md` for the spreadsheet's column
spec.
