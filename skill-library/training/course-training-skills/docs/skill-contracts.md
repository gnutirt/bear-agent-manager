# Phase 2 — Skill Contracts

Defined before implementing detailed skill behavior (Phases 5-8), per
`IMPLEMENTATION_PROMPT.md`'s Phase 2. Each contract below was elaborated
into the full `skills/<name>/SKILL.md` in the phase noted. The contract
shape itself is documented for reuse at
`references/quality/quality-standards.md#skill-contract-shape`.

| Skill | Purpose | Trigger | Dependencies | Phase implemented |
|---|---|---|---|---|
| `course-designer` | Orchestrate state, manifest, approval checkpoints, mode | New course request / `/create-course` / `/adapt-course` | None (entry point) | 5 |
| `course-outline` | Course-level architecture: objectives, structure, assessment strategy | New course request / `/course-outline` | None | 5 |
| `session-designer` | Per-session detail + timing-exact agenda | Per session, after outline approved | `course-outline` | 5 |
| `course-reviewer` | Cross-artifact QA, contradiction detection, fix-when-possible | Last orchestration step / `/review-course` | All other skills' output | 5 |
| `activity-designer` | Learning activities/games with traceable purpose | Per session, after session design | `session-designer` | 6 |
| `practical-work` | Practical exercises, student/instructor split | Per session, after session design | `session-designer` | 6 |
| `assessment-designer` | Assessments mapped to objectives | Per session + final | `session-designer`, `course-outline` (strategy) | 6 |
| `instructor-guide` | Delivery guidance specific to the real session | After activities/exercise exist | `session-designer`, `activity-designer`, `practical-work` | 6 |
| `notebook-designer` | Decide + generate real `.ipynb` when warranted | Per session, after practical work | `session-designer`, `practical-work` | 7 |
| `slide-designer` | Slide spec (Stage 1) + real `.pptx` (Stage 2, conditional) | Per session, after session design | `session-designer` | 8 |

## Responsibility non-overlap check

Each row's "Purpose" is unique — no two skills own the same output type.
Boundary decisions made explicitly during this phase:

- A practical exercise that is later *graded* is still authored by
  `practical-work`; `assessment-designer` only adds the grading/objective
  mapping layer, it does not redesign the exercise.
- A game-framed activity used for *review/recall* stays with
  `activity-designer` even when it resembles a quiz — `assessment-designer`
  only owns items that count toward the course's stated assessment
  strategy.
- Notebook *content* (what's taught/practiced) is bounded by
  `session-designer`'s Topics and `practical-work`'s exercise;
  `notebook-designer` packages, it does not invent new pedagogy.

## Validation applied to every contract

Before Phase 5 began, each row above was checked against
`references/quality/quality-standards.md`'s skill-contract-shape template
(Purpose, Trigger, Non-trigger conditions, Inputs, Outputs, Dependencies,
References, Templates, Downstream consumers, Validation) — the full
10-field version lives in each skill's own `SKILL.md`, not duplicated here.
