---
name: notebook-designer
description: Decides whether a session's practical work benefits from an executable Jupyter notebook, and when it does, generates real, valid .ipynb files (student and instructor versions) that match the session exactly. Never generates a notebook automatically for every technical session, and never invents content beyond what the session teaches.
---

# notebook-designer

## Purpose
First decide if a notebook is the right medium; only then build one — and
build a real, valid one.

## Trigger
`course-designer` invokes per session after `practical-work` completes.
`/create-notebook` invoked directly.

## Non-trigger conditions
- Sessions whose practical work is not meaningfully improved by being
  executable/iterative (system design lectures, soft skills, most
  configuration-only work) — decide NO and record why, don't generate one
  by default just because the course is technical.
- Slide content → `slide-designer`.

## Inputs
This session's Topics, Explanation, Key Concepts (`session-designer`) and
Exercise (`practical-work`); `artifacts.notebooks` setting in the manifest
(`true`/`false`/`auto`) and `config/defaults.yaml`'s
`generate_notebook_when_useful`.

## Outputs
When warranted: `notebooks/session-NN-student.ipynb` and
`notebooks/session-NN-instructor.ipynb`, real `nbformat` 4 JSON files.
When not warranted: a one-line note in the session's status
(`notebooks: not_applicable`) with the reason — not a stub file.

## Dependencies
`session-designer`, `practical-work` for this session.

## References
`references/notebooks/notebook-patterns.md`.

## Templates
`templates/notebook-template.md` (spec stage before generating actual JSON).

## Downstream consumers
`course-reviewer` (Notebook alignment check, file-validity check via
`scripts/validate_course.py`).

## Procedure

1. **Decide.** Run the session's content through
   `notebook-patterns.md`'s decision table. If `artifacts.notebooks: false`
   in the manifest, skip regardless of content (instructor opted out). If
   `true`, always generate. If `auto` (default), use the decision table.
2. **If NO:** record `not_applicable` with a one-line reason in the manifest;
   stop.
3. **If YES:** fill the spec (`templates/notebook-template.md`) first —
   Title, Learning Objectives, Environment Setup, Imports, Dataset/Input
   Preparation, Concept Explanation, Instructor Demonstration, Guided
   Exercise, TODO Sections, Practice Tasks, Challenge Task, Expected
   Outputs, Reflection Questions, Solutions.
4. **Generate the student notebook**: markdown cells for
   Explanation/Objectives/Reflection; code cells for Demonstration
   (complete, runnable) and Guided Exercise/TODOs (incomplete, with
   `# TODO:` markers and either `raise NotImplementedError` or an
   intentionally incomplete line — never a fully-working cell mislabeled as
   a TODO). No Solutions section.
5. **Generate the instructor notebook**: same structure, TODOs filled in
   correctly, plus a Solutions section with complete code and commentary.
6. **Content discipline check**: every function/library/concept used in
   either notebook must appear in this session's (or an earlier session's)
   Topics/Explanation. If something new is genuinely needed, add a brief
   scoped markdown explanation cell for it rather than using it unexplained.
7. **Validate JSON structure** (`scripts/validate_course.py` — checks
   `nbformat`, `cells` array, required per-cell fields) before considering
   the notebook done.

## Validation
- [ ] Decision was made against the table, not defaulted to "yes" for every
      technical session
- [ ] Both notebooks (if generated) are valid `nbformat` 4 JSON
- [ ] No concept/library appears that wasn't taught by this point
- [ ] Student notebook contains no Solutions section
