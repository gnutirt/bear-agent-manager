# Quality Standards

Used by: `course-reviewer`, and by every skill as a self-check before marking
its output ready for approval.

## Final course must pass

`Scope check, Objective check, Coverage check, Sequencing check, Timing
check, Activity purpose check, Practical alignment check, Assessment
alignment check, Difficulty check, Slide alignment check, Notebook alignment
check, Instructor guide alignment check, Cross-artifact consistency check,
Institutional requirements check`
(`README.md` §37, extended with the institutional requirements check for
programs like "حقيبة الكورسات" — see
`references/institutional-requirements/course-bag-program.md`).

## What each check verifies

| Check | Verifies |
|---|---|
| Scope | Course stays within stated audience/level/duration; no scope creep |
| Objective | Every course objective is covered by ≥1 session; every session objective traces to a course objective |
| Coverage | Every session's Topics are actually used downstream (activity/exercise/notebook/slides/assessment don't ignore taught content, and vice versa) |
| Sequencing | `references/instructional-design/learning-progression.md` rules hold |
| Timing | Every agenda sums exactly to session duration; course total sums to stated duration |
| Activity purpose | Every activity has a stated, traceable objective |
| Practical alignment | Exercises use only previously-taught concepts |
| Assessment alignment | Every assessment item maps to a taught objective |
| Difficulty | Content/exercise/assessment difficulty matches stated level throughout |
| Slide alignment | Slides reflect the session's actual Topics, not invented or copied-outline content |
| Notebook alignment | Notebook matches the session; no unexplained concepts |
| Instructor guide alignment | Guide references the session's real agenda/activities, not generic advice |
| Cross-artifact consistency | No contradictions between artifacts for the same session (the XGBoost example, `README.md` §17) |
| Institutional requirements | `schedule.total_hours` meets the program's minimum (6h) and, if under the certificate threshold (20h), the certificate rule is noted rather than silently omitted — `references/institutional-requirements/course-bag-program.md` |

## Skill contract shape

Every `skills/*/SKILL.md` should define, in this order:

```
Purpose               — one sentence, this skill's single responsibility
Trigger               — when this skill runs
Non-trigger conditions — when NOT to run / to defer to another skill
Inputs                — what it needs from course state/manifest
Outputs               — exact artifact(s) it produces
Dependencies          — which skills/artifacts must exist first
References            — which references/*.md it draws on
Templates             — which templates/*.md it fills
Downstream consumers   — which skills use this skill's output
Validation            — how to self-check before marking done
```

## Fix-when-possible rule

`course-reviewer` should fix an issue directly when the fix is unambiguous
(e.g. an agenda that's 5 minutes short — add to Recap; a session objective
that doesn't trace — either link it or flag for instructor decision if
genuinely ambiguous). Only report-without-fixing when the correct fix requires
an instructional judgment call only the instructor should make.
