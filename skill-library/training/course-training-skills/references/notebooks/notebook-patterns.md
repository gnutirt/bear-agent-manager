# Notebook Patterns

Used by: `notebook-designer`.

## Decision rule: should this session get a notebook?

A notebook is warranted when the practical work is meaningfully improved by
being *executable and iterative* — the learner benefits from running code,
seeing output change, and modifying in place.

| Session content | Notebook? |
|---|---|
| Machine learning experiment | Yes |
| Data analysis | Yes |
| Deep learning experiment | Yes |
| API usage with live responses | Yes |
| Python syntax lecture | Maybe — yes if exercises are code-run, no if purely conceptual |
| System design lecture | No — use a design document/diagram instead |
| Soft skills / communication | No |
| Configuration/infra (non-code) | Usually no — a runbook or shell script is more honest than a notebook |

Default when genuinely ambiguous: check `config/defaults.yaml
generate_notebook_when_useful`; if still ambiguous, prefer NOT generating one
— an unnecessary notebook is clutter (`README.md` §38).

## Structure

`Title, Learning Objectives, Environment Setup, Imports, Dataset/Input
Preparation, Concept Explanation, Instructor Demonstration, Guided Exercise,
TODO Sections, Practice Tasks, Challenge Task, Expected Outputs, Reflection
Questions, Solutions`.

Use markdown cells for Explanation/Objectives/Reflection, code cells for
everything executable. `TODO` sections are code cells with an explicit
`# TODO: ...` comment and either a `raise NotImplementedError` or a clearly
broken/incomplete line — never a fully working cell disguised as a TODO.

## Student vs. instructor notebooks

- `session-NN-student.ipynb` — Explanation, Demonstration, Guided Exercise,
  TODO cells (unsolved), Practice/Challenge Tasks, Reflection Questions. No
  Solutions section.
- `session-NN-instructor.ipynb` — everything in the student version, TODOs
  filled in, plus a Solutions section with the complete correct code and
  commentary on why it's correct and common wrong turns.

## Content discipline

Do not introduce a library, function, or concept in a notebook that wasn't in
the session's Topics/Explanation (`course-reviewer` will flag this — see the
XGBoost example in `README.md` §17). If a notebook needs something not yet
taught, either teach it in a markdown cell first (brief, scoped) or don't use
it.

## File validity

Generated notebooks must be real, valid Jupyter `.ipynb` JSON (schema
`nbformat` 4) — openable in Jupyter/VS Code, not a `.md` file with a `.ipynb`
extension. `scripts/validate_course.py` checks this structurally.
