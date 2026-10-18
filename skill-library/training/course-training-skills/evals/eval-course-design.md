# Eval: Course Design

**Skill:** `course-designer` + `course-outline`
**Case:** "Create a course on Machine Learning. Audience: university
students. Level: Beginner. Duration: 12 hours. Sessions: 6. Session
duration: 2 hours." (the canonical example, `README.md` §3/§33)

## Rubric
| Dimension | Pass criteria |
|---|---|
| Correctness | Timing arithmetic (6×2h=12h) is validated, not just assumed; objectives use observable verbs |
| Learning Objective Alignment | Every session in the structure maps to ≥1 course objective |
| Audience Appropriateness | No content assumes prior CS coursework beyond "basic Python" |
| Level Appropriateness | No objective uses Intermediate/Advanced-tier verbs (optimize, architect, critique) |
| Artifact Quality | `course-plan.md` contains all 8 required sections (`README.md` §9) |
| Consistency | Final Project (if any) is achievable using only what the session structure actually teaches |

**Reference output:** `examples/machine-learning/course-plan.md` (this repo's
worked example) scores Pass on all dimensions above — use it as the
calibration anchor.
