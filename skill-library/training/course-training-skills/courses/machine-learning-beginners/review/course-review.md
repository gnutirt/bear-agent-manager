# Course Review — Machine Learning (machine-learning-beginners)

Date: 2026-09-17
Reviewer: `course-reviewer` skill (manual run for this example package)
Scope: full course structure (all 6 sessions) + fully-generated Session 1
artifact set + Sessions 2–6 outline-level detail.

## Checks

| Check | Status | Notes |
|---|---|---|
| Scope | PASS | Stays within Beginner / university-student / 12-hour scope throughout; no scope creep (e.g. no deep learning, no math derivations) |
| Objective coverage | PASS | All 6 course objectives map to exactly one primary session (1↔1, 2↔2, ... 6↔6); each session's objectives trace upward |
| Coverage | PASS (Session 1); PARTIAL (Sessions 2–6) | Session 1's Topics are fully used downstream (activity, exercise, notebook, slides, assessment, instructor guide all verified). Sessions 2–6 have Topics/objectives defined but downstream artifacts beyond the session doc + agenda are not yet generated in this example package — see Known Limitations |
| Sequencing | PASS | Foundations precede applications throughout: types of ML (S1) → data handling (S2) → first model (S3) → second model + generalization concepts (S4) → refinement (S5) → integration (S6). No downstream artifact references a concept before its session |
| Timing | PASS | Every agenda validated programmatically (`scripts/validate_course.py`) to sum exactly to 120 minutes; one real timing bug (Session 2 agenda, 115≠120) was caught by the validator and fixed during authoring — see Change Log below |
| Activity purpose | PASS | Every activity (Session 1 fully, Sessions 2–6 named at outline level) states a traceable objective and debrief |
| Practical alignment | PASS (Session 1) | Session 1's exercise uses only prerequisite knowledge; prerequisites for Sessions 2–6's planned exercises are consistent with prior sessions' Topics |
| Assessment alignment | PASS | Every assessment item (Session 1 + final) maps to a stated objective; no item tests an untaught concept (reinforcement learning, introduced definitionally in S1, is correctly never assessed) |
| Difficulty | PASS | Content stays at Beginner level throughout (no formula derivation for decision trees/k-NN, precision/recall introduced via scenario before formula) |
| Slide alignment | PASS (Session 1) | Session 1's slide spec traces to its actual Topics; no outline-copying detected. Stage 2 (.pptx) not generated — see Known Limitations |
| Notebook alignment | PASS (Session 1) | Both notebooks valid `nbformat` 4 JSON (verified via `scripts/validate_course.py`); student notebook contains no Solutions section; no concept used beyond what Session 1 teaches |
| Instructor guide alignment | PASS (Session 1) | Fully specific to Session 1's real agenda blocks/activities/exercise, not generic |
| Cross-artifact consistency | PASS | No contradictions found (e.g. no session teaches X while a later artifact assumes Y not taught — the pattern in `README.md` §17's XGBoost example does not occur here) |

## Issues Found

1. **Session 2 agenda timing bug** — original draft summed to 115 minutes
   instead of 120 (an arithmetic error made while drafting, not caught by
   eye). *Auto-fixed*: `scripts/validate_course.py` flagged it; the
   Explanation block was extended from 20 to 25 minutes and the file
   corrected. Re-validated: now passes.
2. **Sessions 2–6 artifact depth** — only the session doc + agenda are
   fully written for Sessions 2–6; activities/exercises/notebooks/slides/
   assessments/instructor-guides for those sessions are named and scoped
   but not yet generated as standalone files. *Needs instructor/build
   decision*: not auto-fixable — this is additional generation work, not a
   quality defect in what exists. Flagged, not silently completed.
3. **Slide Stage 2 (.pptx)** — no presentation/design capability was
   available when this example was built, so only Stage 1 (the slide
   specification) was produced for Session 1, per
   `skills/slide-designer/SKILL.md`'s explicit rule against fabricating a
   fake `.pptx`. *Needs instructor/build decision*: run Stage 2 in an
   environment with that capability when ready.

## Overall
**PASS for everything actually generated**, with two explicitly flagged
scope gaps (items 2 and 3 above) rather than false completion claims. The
course structure, sequencing, timing, and Session 1's complete artifact set
all pass every check that applies to them.
