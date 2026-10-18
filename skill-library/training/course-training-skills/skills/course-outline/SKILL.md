---
name: course-outline
description: Designs the high-level architecture of a training course — overview, learning objectives, prerequisites, outcomes, course structure, session-by-session plan, assessment strategy, and final project — from a small set of course requirements. Does not produce session-level detail or any downstream artifact.
---

# course-outline

## Purpose
Decide *what* the course teaches and in what order, at the course level only.

## Trigger
- A new course request (name, audience, level, duration, sessions, session
  duration; optional extras per `README.md` §4).
- `/course-outline` invoked directly.
- `course-designer` invokes this as the first generation step after
  requirements are parsed.

## Non-trigger conditions
- Session-level detail (topics breakdown per session beyond a one-line focus,
  agendas) → `session-designer`.
- Any artifact generation (activities, exercises, notebooks, slides,
  assessments, instructor guide) → their respective skills.
- Adapting an *existing, approved* outline → still this skill's output type,
  but invoked via `references/adaptation/adaptation-rules.md`'s procedure,
  not from scratch.

## Inputs
Required: course name, audience, level, duration, sessions, session duration.
Optional (use if given, otherwise infer reasonably and state the assumption):
learning goals, prerequisites, delivery mode, class size, programming
language, tech stack, tools, hardware, internet availability, existing
materials, teaching preferences, assessment requirements, final project
requirements.

## Outputs
`course-plan.md` (via `templates/course-template.md`) containing: Course
Overview, Learning Objectives, Prerequisites, Course Outcomes, Course
Structure, Session-by-Session Plan (one-line-per-session focus, not full
detail), Assessment Strategy, Final Project. Also initializes/updates
`course-manifest.yaml`'s `course`, `schedule`, `objectives` fields.

## Dependencies
None upstream — this is the first content-generating skill.

## References
- `references/instructional-design/learning-objectives.md`
- `references/instructional-design/course-architecture.md`
- `references/instructional-design/learning-progression.md` (for structuring
  the session-by-session sequence)

## Templates
`templates/course-template.md`

## Downstream consumers
`session-designer` (reads objectives + structure), `assessment-designer`
(reads Assessment Strategy), `course-reviewer` (checks against this as the
source of truth for Scope/Objective/Coverage checks).

## Procedure

1. **Validate timing.** `sessions × session_duration` must equal `duration`.
   If they don't match, surface the discrepancy and ask which value is
   authoritative — this is a case where clarification is warranted because it
   materially affects every downstream artifact (unlike most missing
   optional fields, which should be inferred).
2. **Write 3–6 course-level learning objectives** per
   `references/instructional-design/learning-objectives.md`, calibrated to
   `level`.
3. **Infer prerequisites** from level + topic (e.g. Beginner ML course:
   "basic Python" is a reasonable inferred prerequisite; don't ask the user
   to spell this out unless it's genuinely ambiguous).
4. **Draft course structure**: one session-title + one-line-focus per
   session, following `learning-progression.md` (foundations before
   applications, ramp/plateau/ramp).
5. **Set assessment strategy** at the level of mix and weighting, not
   per-item detail (that's `assessment-designer`).
6. **Decide on a final project** if course length/level warrants one
   (typically ≥6 sessions or explicitly requested); state "None" otherwise
   rather than inventing one.
7. **Write `course-plan.md`** and initialize the manifest fields, setting
   `status.outline: in_progress` until approved (interactive mode) or
   `approved` (full mode, after self-validation).
8. **Self-validate**: objectives observable, structure sequenced correctly,
   prerequisites list is used somewhere (no dead prerequisites).

## Validation
Before marking `outline` status as ready: every objective passes the
`learning-objectives.md` checklist; session count/timing arithmetic is
correct; every listed prerequisite is referenced by ≥1 early session.
