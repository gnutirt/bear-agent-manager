# Course Architecture

Used by: `course-designer`, `course-outline`, `course-reviewer`, `scripts/validate_manifest.py`.

## Dependency chain (source of truth)

```
Course Objectives
  → Session Objectives
    → Topics
      → Explanation
        → Activities
          → Practical Work
            → Notebook
              → Slides
                → Assessment
                  → Instructor Guide
```

An artifact may only assume what is above it in the chain has been decided.
`slide-designer` must not introduce a concept `session-designer` didn't put in
Topics. `assessment-designer` must not test a concept not in Explanation/Topics.

## Course state schema

Canonical in-memory/working shape (see `README.md` §18 for the annotated
version). `course-designer` owns writing this; every other skill reads it and
proposes updates rather than mutating it silently.

```yaml
course: {id, name, audience, level, duration, sessions, session_duration}
delivery: {mode, class_size, internet, hardware, software}
objectives: []          # course-level
sessions: []            # session-level state, one entry per session
activities: []
exercises: []
notebooks: []
slides: []
assessments: []
instructor_notes: []
constraints: []
research: {enabled: false}
status:
  outline: pending|in_progress|approved
  sessions: pending|in_progress|approved
  activities: pending|in_progress|approved
  practical_work: pending|in_progress|approved
  notebooks: pending|in_progress|approved|not_applicable
  slides: pending|in_progress|approved
  assessments: pending|in_progress|approved
  instructor_guide: pending|in_progress|approved
  review: pending|in_progress|passed|failed
```

## Course manifest schema

Persisted per-course at `courses/<course-id>/course-manifest.yaml`. This is
the file `scripts/validate_manifest.py` checks. Full annotated example:
`README.md` §19; machine-checkable schema notes below.

Required top-level keys: `course`, `schedule`, `delivery`, `artifacts`,
`research`, `status`.

Required fields and types:

```yaml
course:
  id: string            # kebab-case, unique
  name: string
  audience: string
  level: Beginner|Intermediate|Advanced
schedule:
  total_hours: number
  sessions: integer      # must satisfy: sessions * session_duration_hours == total_hours
  session_duration: string  # e.g. "2h", "90m" — normalize to minutes for validation
delivery:
  mode: offline|online|hybrid
artifacts:
  slides: boolean
  notebooks: boolean|auto
  assessments: boolean
  instructor_guide: boolean
research:
  enabled: boolean
status:
  outline: pending|approved|...
  sessions: pending|approved|...
  activities: pending|approved|...
  notebooks: pending|approved|not_applicable
  slides: pending|approved|...
  assessments: pending|approved|...
  review: pending|passed|failed
```

`scripts/validate_manifest.py` enforces the arithmetic check
(`sessions × session_duration == total_hours`) and required-field presence.
Schema changes must be documented here and in the script in the same commit.

## Research policy

See `references/instructional-design/research-policy.md` (off by default;
turned on only for current/fast-changing/explicitly-sourced topics).

## Output directory structure

```
courses/<course-id>/
  course-manifest.yaml
  course-plan.md
  sessions/session-NN.md
  activities/session-NN-activities.md
  exercises/session-NN-exercise.md
  notebooks/session-NN-student.ipynb
  notebooks/session-NN-instructor.ipynb
  slides/session-NN-slides.md          # Stage 1 spec
  slides/session-NN-slides.pptx        # Stage 2 artifact (if capability available)
  assessments/session-NN-assessment.md
  instructor-guide/session-NN-guide.md
  review/course-review.md
```
