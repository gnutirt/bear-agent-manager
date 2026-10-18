# Example: Machine Learning (Beginner, 12h, 6×2h)

This is the repository's one complete, end-to-end example
(`README.md` §33), demonstrating the full toolkit on the canonical case:

```text
Course: Machine Learning
Audience: University students
Level: Beginner
Duration: 12 hours
Sessions: 6
Session duration: 2 hours
```

The generated package lives at
`courses/machine-learning-beginners/` (not duplicated here — that's the
real output location per `references/instructional-design/course-architecture.md`'s
output structure). This file is the pointer/README for the example.

## What's fully generated (all artifact types, for calibration)
- `courses/machine-learning-beginners/course-manifest.yaml` — validated,
  passes `scripts/validate_manifest.py`
- `courses/machine-learning-beginners/course-plan.md` — full course outline
- `courses/machine-learning-beginners/sessions/session-01.md` +
  `session-01-agenda.md` — full session design, agenda validated to sum to
  exactly 120 minutes
- `courses/machine-learning-beginners/activities/session-01-activities.md`
- `courses/machine-learning-beginners/exercises/session-01-exercise.md`
- `courses/machine-learning-beginners/notebooks/session-01-student.ipynb`
  and `session-01-instructor.ipynb` — real, valid `nbformat` 4 notebooks
- `courses/machine-learning-beginners/slides/session-01-slides.md` — Stage 1
  slide specification (Stage 2 `.pptx` not generated — no presentation/
  design capability was available when this example was built; see
  `courses/machine-learning-beginners/review/course-review.md`)
- `courses/machine-learning-beginners/assessments/session-01-assessment.md`
  and `final-assessment.md`
- `courses/machine-learning-beginners/instructor-guide/session-01-guide.md`
- `courses/machine-learning-beginners/review/course-review.md` — the QA pass

## What's outline-level only (Sessions 2–6)
`sessions/session-0{2..6}.md` + matching `-agenda.md` files exist and are
timing-validated, but their activities/exercises/notebooks/slides/
assessments/instructor-guides are not yet generated as separate files —
each session doc names what they should be. This is flagged explicitly, not
silently incomplete — see the review file.

## Validating this example yourself
```bash
python3 scripts/validate_manifest.py courses/machine-learning-beginners/course-manifest.yaml
python3 scripts/validate_course.py courses/machine-learning-beginners/
```
Both currently PASS.
