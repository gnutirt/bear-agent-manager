---
name: practical-work
description: Designs practical exercises (coding, data analysis, debugging, configuration, system design, API usage, model building, experiments, case analysis, tool usage, mini projects) that match the concepts actually taught in the session, with student-facing and instructor-facing content kept strictly separate.
---

# practical-work

## Purpose
Produce the hands-on exercise a session's agenda allocates Practice time to.

## Trigger
`course-designer` invokes per session after `session-designer` completes.
`/create-exercise` invoked directly for one session.

## Non-trigger conditions
- Ungraded engagement activities/games → `activity-designer`.
- Executable notebook packaging of this exercise → `notebook-designer` (this
  skill defines the exercise; notebook-designer decides/builds the .ipynb
  container for it when warranted).
- Formal grading/assessment framing → `assessment-designer` (though a
  practical exercise can also be listed as an assessment format if the
  course's assessment strategy says so — `assessment-designer` handles that
  linkage, not this skill).

## Inputs
This session's Topics, Explanation, Key Concepts, Examples
(`session-designer`), and the agenda's Practice block duration.

## Outputs
`exercises/session-NN-exercise.md` per `templates/exercise-template.md`,
with a clear, literal separator between student-facing and instructor-only
content (Solution, and Common-Mistakes-as-answers if applicable).

## Dependencies
`session-designer` output for this session.

## References
`references/practical-learning/practical-exercises.md`,
`references/instructional-design/learning-progression.md`.

## Templates
`templates/exercise-template.md`

## Downstream consumers
`notebook-designer` (may wrap this exercise in an executable notebook),
`instructor-guide` (Common Mistakes → Intervention Strategies),
`course-reviewer` (Practical alignment check).

## Procedure

1. Pick the format (`Coding, Data Analysis, Debugging, Configuration, System
   Design, API Usage, Model Building, Experiments, Case Analysis, Tool Usage,
   Mini Projects`) that matches how this session's concept is actually used
   in practice.
2. Write Objective (traces to a session objective), Prerequisites (check
   against `learning-progression.md` — only what's already taught),
   Starting Point (exact), Task (single unambiguous goal), Constraints
   (real, not artificial), Expected Output (concrete/checkable).
3. Write 2–3 progressive Hints.
4. Write realistic Common Mistakes for this level/topic.
5. Write the complete Solution and, if the session/duration warrants,
   an Extension Challenge that is explicitly optional.
6. Separate student-facing vs. instructor-only content with a clear marker
   (see template) so nothing accidentally leaks the solution into
   student-distributed material.

## Validation
- [ ] Every prerequisite listed is already taught (earlier in this session
      or an earlier session)
- [ ] Expected Output is concrete/checkable, not vague
- [ ] Solution actually solves the Task under the stated Constraints
- [ ] Extension Challenge, if present, is clearly optional and not required
      to meet the session objective
