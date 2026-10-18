---
name: course-training-skills
description: Designs complete training courses (outline, agendas, activities, exercises, notebooks, slides, assessments, instructor guide) from requirements. Use for building or reviewing a training course.
---

# Course Training Skills

This is the entry point. It routes to the ten specialized skills below rather
than doing their work itself. Read this file first; it tells you which skill
owns which responsibility and in what order they run.

## What this toolkit is for

Turning a small set of course requirements into a coherent, internally
consistent training package — and keeping that package consistent as the
course is adapted. Full input/output model: `README.md`.

## The ten skills and what each owns

| Skill | Owns | Does not own |
|---|---|---|
| `course-designer` | Orchestration, state, manifest, approval checkpoints, mode (interactive/full) | Any content generation itself |
| `course-outline` | Course-level architecture: overview, objectives, prerequisites, structure, session-by-session plan, assessment strategy, final project | Session-level detail, artifacts |
| `session-designer` | Per-session detail: objectives, topics, agenda (exactly matching duration) | Slide/notebook/exercise content itself |
| `activity-designer` | Learning activities & training games with a stated purpose | Practical/graded exercises |
| `practical-work` | Practical exercises (student + instructor versions) | Notebooks, activities |
| `notebook-designer` | Deciding if a notebook helps, and generating real `.ipynb` files | Slide decks |
| `slide-designer` | Slide specification (Stage 1) and real editable `.pptx` generation (Stage 2) | Session content design |
| `assessment-designer` | Assessments mapped to objectives | Practical exercises (unless the format is an assessed practical) |
| `instructor-guide` | Delivery guidance per session (misconceptions, interventions, transitions) | Student-facing content |
| `course-reviewer` | Cross-artifact QA, contradiction detection, fixing when possible | Original content generation |

## Read next

- **New course request** → `skills/course-designer/SKILL.md`
- **Just want the high-level outline** → `skills/course-outline/SKILL.md`
- **Editing one session** → `skills/session-designer/SKILL.md`
- **Adapting an existing course** (fewer sessions, different level, offline↔online) → `references/adaptation/adaptation-rules.md`, then `skills/course-designer/SKILL.md`
- **Reviewing a finished/in-progress course** → `skills/course-reviewer/SKILL.md`
- **Contributing to this repo itself** → `CLAUDE.md`

## Non-negotiables (see `README.md` §38 for the full list)

- Never build this as one giant skill — always delegate to the specific skill above.
- Never regenerate the whole course for a small change; use the dependency
  chain in `references/adaptation/adaptation-rules.md`.
- Never claim an artifact (`.ipynb`, `.pptx`, `.yaml`) works without validating it
  (`scripts/`, `tests/`).
- Never ask a clarifying question the system could reasonably infer.
