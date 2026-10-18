---
name: instructor-guide
description: Produces instructor-facing delivery guidance per session — teaching focus, explanation guidance, questions to ask, expected answers, common misconceptions and difficulties, intervention strategies, fast-finisher activity, recovery strategy, transitions, and session recap — specific to that session's actual content, so the instructor can deliver it without redesigning it.
---

# instructor-guide

## Purpose
Turn a fully-designed session (content + activities + exercise + agenda)
into concrete delivery guidance for whoever teaches it.

## Trigger
`course-designer` invokes per session after activities, practical work, and
(if applicable) notebooks/slides are generated for that session.
`/create-instructor-guide` invoked directly.

## Non-trigger conditions
- Do not redesign session content, activities, or exercises here — reference
  the real ones already produced.

## Inputs
This session's full artifact set: `session-NN.md`, `session-NN-agenda.md`,
`session-NN-activities.md`, `session-NN-exercise.md`, and, if present, its
notebook/slides/assessment.

## Outputs
`instructor-guide/session-NN-guide.md` per
`templates/instructor-guide-template.md`.

## Dependencies
`session-designer`, `activity-designer`, `practical-work` for this session
(and `assessment-designer` where Expected Answers should align with
assessment expectations).

## References
`references/instructor/instructor-guidance.md`.

## Templates
`templates/instructor-guide-template.md`

## Downstream consumers
The instructor directly; `course-reviewer` (Instructor guide alignment
check).

## Procedure

1. Teaching Focus: identify, from this session's objectives, the 1–2 things
   to protect if time is short.
2. Explanation Guidance: how to teach this session's actual Topics/Key
   Concepts — analogy/framing choices, not a restatement of the content.
3. Questions to Ask + Expected Answers: real questions tied to this session's
   Key Concepts, with correct/partial/incorrect answer shapes.
4. Common Misconceptions / Common Difficulties: specific to this topic and
   level — pull from the exercise's Common Mistakes where relevant, and add
   conceptual (not just procedural) misconceptions.
5. Intervention Strategies: a concrete action per misconception/difficulty
   listed above.
6. Fast-Finisher Activity: tie to the exercise's Extension Challenge if one
   exists; otherwise design something that needs no untaught material.
7. Recovery Strategy: name actual agenda blocks that can be compressed/cut,
   in priority order.
8. Transitions: the literal bridging line/action between each pair of
   adjacent agenda blocks.
9. Session Recap: instructor-facing summary (distinct from any learner-facing
   recap slide `slide-designer` produces).

## Validation
- [ ] Every reference (agenda block names, activity names, exercise details)
      matches the actual session artifacts, not generic placeholders
- [ ] Fast-Finisher Activity requires no material outside this session and
      earlier ones
- [ ] Recovery Strategy references real, named agenda blocks
