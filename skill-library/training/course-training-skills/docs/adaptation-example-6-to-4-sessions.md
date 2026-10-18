# Adaptation Example: 6 Sessions → 4 Sessions
(Machine Learning — Beginner — University Students)

A worked application of `references/adaptation/adaptation-rules.md` to
`courses/machine-learning-beginners/`, produced in Phase 11 as the
concrete demonstration the abstract rules needed.

## Requested change
"Compress the course from 6 sessions x 2h (12h total) to 4 sessions,
keeping session length at 2h (8h total)."

## Step 1 — read current status
From `course-manifest.yaml`: `outline: approved`, `sessions: in_progress`
(Session 1 fully generated; Sessions 2-6 outline-level).

## Step 2 — walk the dependency chain downward from the changed node
The change hits `schedule.sessions` directly — per
`adaptation-rules.md`'s table row "6 sessions → 4 sessions", this affects:
course structure, session objective redistribution, all session content,
and all downstream artifacts *for merged/dropped sessions*.

## Step 3 — decide the new structure (this is `course-outline`'s call, not
a mechanical merge)

Four sessions cannot teach 6 sessions' worth of depth at the same level, so
either scope must shrink or sessions must merge topics. For this course,
the natural merge points (per
`references/instructional-design/learning-progression.md`'s "spiral, don't
flatten" guidance — merge only where a genuine pause point exists):

| New Session | Absorbs | Rationale |
|---|---|---|
| 1 | Old Session 1 (What Is ML) + Old Session 2 (Working With Data), compressed | Both are foundational/tooling; can share one 2h block by trimming the pattern-recognition game to 10 min and the dirty-data game to 10 min |
| 2 | Old Session 3 (First Classifier) — unchanged | Standalone, high density already; do not compress further |
| 3 | Old Session 4 (Comparing Models) + Old Session 5 (Improving Your Model), compressed | Both are "second pass on modeling"; merge by dropping the separate overfit/underfit sorting game and folding its point into the explanation |
| 4 | Old Session 6 (End-to-End Project) — unchanged | Capstone; cannot be compressed without losing the course's summative assessment |

## Step 4 — mark only the affected items `pending`

```yaml
status:
  outline: pending        # structure changed
  sessions: pending        # every session's agenda changes
  activities: pending      # merged sessions' activities need re-selection/re-timing
  notebooks: pending        # session numbering changes which notebook maps to which content
  slides: pending
  assessments: pending      # final assessment untouched in content, but session numbering shifts
  review: pending
```
Untouched by this change: the 6 course-level learning objectives
themselves (content scope, not count, is what's compressing) — those stay
`approved` and are *inputs* to the re-run, not regenerated from scratch.

## Step 5 — regenerate only the marked items

`course-designer` re-invokes `course-outline` (new 4-session structure),
then `session-designer` for each of the 4 new sessions (new agendas, still
timing-validated to sum to 120 min each), then the owning skills for
activities/exercises/notebooks/slides/assessments/instructor-guides for
the *new* session numbering. Session 1's already-complete artifact set is
not thrown away — its content is redistributed into New Session 1 rather
than rewritten from zero.

## Step 6 — scoped review, not full rebuild

`course-reviewer` re-runs only against the new 4-session structure's
cross-artifact consistency (the same 13 checks), not a from-scratch course.

## What this example demonstrates
Exactly the principle `README.md` §30 states: "Do not rebuild unrelated
sessions." Here, *every* session happens to be touched because the
requested change was course-wide (session count), unlike the single-session
edit example already in `adaptation-rules.md`. The blast-radius analysis
in Step 2-4 is what tells you *that* — not an assumption that "structural"
changes always mean "regenerate everything blindly."

**Note:** this document is a worked *plan*, not an executed regeneration —
`courses/machine-learning-beginners/` on disk still reflects the original
6-session structure. Executing this plan is future work, not part of this
example package.
