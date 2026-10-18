---
name: session-designer
description: Designs one session in full detail — objectives, topics, subtopics, key concepts, examples, and a timed agenda that exactly matches the session duration. Does not write activity/exercise/notebook/slide/assessment content itself, only names where each belongs in the agenda.
---

# session-designer

## Purpose
Turn one line of `course-outline`'s session-by-session plan into a complete,
internally-coherent session design with a timing-exact agenda.

## Trigger
- `course-designer` invokes this once per session after the outline is
  approved (interactive mode) or automatically (full mode).
- `/create-session` or `/create-agenda` invoked directly for one session.
- A single-session edit under `references/adaptation/adaptation-rules.md`.

## Non-trigger conditions
- Do not invent course-level objectives — pull from `course-plan.md`, only
  decompose them.
- Do not write the actual activity instructions, exercise content, notebook,
  slides, or assessment items — name them (by title/reference) in the
  session doc and agenda, and hand off to the owning skill.

## Inputs
`course-plan.md` (objectives, structure, this session's one-line focus),
`course-manifest.yaml` (`session_duration`, `delivery`, `constraints`),
prior sessions' Topics (for prerequisite checking).

## Outputs
`sessions/session-NN.md` (`templates/session-template.md`) and
`sessions/session-NN-agenda.md` (`templates/agenda-template.md`) with:
Session Number, Title, Session Objectives, Learning Outcomes, Topics,
Subtopics, Key Concepts, Examples, [pointers to] Activities, Practical
Exercise, Assessment, Homework, [pointer to] Instructor Notes, Required
Materials, Required Tools, Detailed Agenda.

## Dependencies
`course-outline` must be approved/complete first.

## References
- `references/instructional-design/learning-objectives.md`
- `references/instructional-design/learning-progression.md`
- `references/instructional-design/course-architecture.md` (dependency chain)

## Templates
`templates/session-template.md`, `templates/agenda-template.md`

## Downstream consumers
`activity-designer`, `practical-work`, `notebook-designer`, `slide-designer`,
`assessment-designer`, `instructor-guide` all read this session's Topics/
Objectives as their primary input boundary — they must not exceed it.

## Procedure

1. **Decompose 2–4 session objectives** from the course objectives this
   session is meant to advance (per `course-plan.md`'s structure row).
2. **List Topics and Subtopics** needed to hit those objectives — no more,
   no less. Check every topic against
   `references/instructional-design/learning-progression.md`: anything not
   yet taught in an earlier session must either be introduced here explicitly
   or removed.
3. **Key Concepts**: one-line definitions for terms this session introduces.
4. **Examples**: concrete instances used in Explanation (not exercises —
   those are `practical-work`'s job).
5. **Required Materials/Tools**: derived from `delivery` constraints (offline/
   online, internet availability, hardware).
6. **Build the agenda** using only blocks appropriate to this session's
   content (`Opening, Review, Explanation, Activity, Practice, Break,
   Assessment, Recap` — a menu, not a mandatory sequence). Do not reuse an
   identical block structure every session — vary based on what this session
   actually needs.
7. **Timing arithmetic — hard requirement**: sum of agenda block minutes must
   equal `session_duration` in minutes, exactly. Compute and display the
   running total; if it doesn't match, adjust block lengths, not the
   requirement.
8. **Reference, don't write**, Activities/Exercise/Assessment/Homework by
   name — the owning skill fills in content afterward and links back here.
9. **In-person sessions** (`delivery.mode: offline`): label each Explanation
   block of 20+ minutes with the micro-activity it contains
   ("Explanation — X + activity: Y"); its minutes stay inside that block
   (`references/activities/activity-patterns.md#activity-density-for-in-person-sessions`).

## Validation
- [ ] Agenda minutes sum exactly to session duration (`scripts/validate_course.py`
      checks this programmatically)
- [ ] Every session objective traces to a course objective
- [ ] Every Topic is either used downstream or intentionally background-only
      (stated as such)
- [ ] No topic here requires a prerequisite not yet taught
