# Phase 0 — Repository Audit & Implementation Plan

Produced before any implementation, per `IMPLEMENTATION_PROMPT.md`'s Phase 0.

## Audit findings

- The repository did not exist yet — `README.md` was the only artifact
  (the product specification / architectural source of truth).
- No existing skills, references, templates, config, scripts, tests, evals,
  or Claude configuration to preserve or reconcile with.
- No artifact-generation capability was pre-confirmed available in this
  runtime for `.pptx` generation specifically (a presentation/design
  capability) — flagged as a Phase 8 risk, resolved by making Stage 2 of
  `slide-designer` conditional rather than assumed.
- No conflicts with the requested architecture — README's recommended
  structure (`.claude-plugin/`, `skills/`, `references/`, `templates/`,
  `config/`, `examples/`, `evals/`, `tests/`, `scripts/`) was adopted as-is.

## Implementation plan

```text
Repository structure
  .claude-plugin/, skills/(10), references/(9 domains), templates/(10),
  config/(4), examples/, evals/, tests/, scripts/, courses/ (generated output)

Skills
  Phase 5: course-outline, session-designer, course-designer, course-reviewer
  Phase 6: activity-designer, practical-work, assessment-designer, instructor-guide
  Phase 7: notebook-designer
  Phase 8: slide-designer

References
  9 domains per README §25, one file per topic, no duplication across skills

Templates
  10 templates per README §26, structure only — no instructional content

Configuration
  4 files per README §23 — instructor-specific, never hardcoded into skills

Scripts
  validate_manifest.py  — manifest schema + timing arithmetic
  validate_course.py    — agenda timing, notebook/pptx structural validity
  check_structure.py    — repo scaffolding completeness

Tests
  pytest suite over the three scripts above (deterministic behavior only)

Evals
  8 rubric files (judgment quality, not deterministic — scored separately
  from tests)

Artifact generation
  Markdown (native), YAML (native), .ipynb (raw nbformat-4 JSON, no
  external notebook library required), .pptx (Stage 2 — conditional on a
  presentation/design capability being available at generation time)

Dependencies
  course-outline -> session-designer -> {activity-designer, practical-work}
  -> {notebook-designer, slide-designer} -> assessment-designer ->
  instructor-guide -> course-reviewer, orchestrated throughout by
  course-designer. Full chain documented in
  references/instructional-design/course-architecture.md.

Risks
  1. .pptx generation capability may not be available — mitigated by
     making Stage 2 explicitly optional/skippable (never fabricated).
  2. Scope of "one complete example" could balloon into 6 fully-detailed
     sessions — mitigated by fully completing Session 1 as the calibration
     reference and keeping Sessions 2-6 at validated outline+agenda level,
     explicitly flagged rather than silently incomplete.
  3. Timing arithmetic errors are easy to make by hand when drafting
     agendas — mitigated by always running scripts/validate_course.py
     rather than trusting manual addition (this risk materialized once
     during Phase 13 — see the Phase 16 review).
```

Implementation then proceeded through Phases 1-17 in the order above.
