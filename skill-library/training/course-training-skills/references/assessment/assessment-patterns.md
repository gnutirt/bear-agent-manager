# Assessment Patterns

Used by: `assessment-designer`.

## Formats

`Diagnostic Assessment, Knowledge Checks, Multiple Choice, Short Answer,
Practical Exercises, Debugging Tasks, Case Studies, Projects, Presentations,
Exit Tickets, Homework, Final Assessment`.

| Format | Best measures | Typical timing |
|---|---|---|
| Diagnostic | Prior knowledge, prerequisite gaps | Before Session 1 |
| Knowledge check | Recall/comprehension | During/end of a session, ungraded or low-stakes |
| Multiple choice | Recall, discrimination between options | Formative or summative |
| Short answer | Explanation-level understanding | Formative or summative |
| Practical exercise (graded) | Applied skill | End of session/module |
| Debugging task | Diagnostic reasoning | Mid-to-late course |
| Case study | Judgment, synthesis | Mid-to-late course |
| Project | Integration across multiple objectives | End of module/course |
| Exit ticket | Quick end-of-session check | Last 5 min of session |
| Homework | Independent practice/reinforcement | Between sessions |
| Final assessment | Full-course objective coverage | End of course |

## Objective mapping (mandatory)

Every assessment item states which learning objective(s) it maps to. An item
with no mapping is invalid — either tie it to an existing objective or drop
it. `assessment-designer` must not test a concept absent from that session's
(or an earlier session's) Topics/Explanation — cross-check against
`references/instructional-design/learning-progression.md` and flag violations
the way `course-reviewer`'s worked example in `README.md` §17 does.

## Required fields per assessment

`Objective, Format, Instructions, Expected Answer/Result, Evaluation
Criteria`. See `templates/assessment-template.md`.

- **Evaluation Criteria** — observable and specific (a rubric row, a passing
  condition, a checklist) — not "assess understanding."

## Assessment strategy at the course level

`course-outline` sets the overall strategy (mix of formative/summative,
weighting, final project shape); `assessment-designer` fills in the per-session
and per-objective detail consistent with that strategy. Do not invent a
different overall strategy at the session level.
