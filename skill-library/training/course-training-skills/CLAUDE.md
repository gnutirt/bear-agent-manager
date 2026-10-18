# CLAUDE.md — Repository Development Instructions

This file is for anyone (human or Claude) developing **inside** this repository.
`README.md` is the product spec for *using* the toolkit. This file is about
*maintaining and extending* it.

## Layers — keep them separate

| Layer | Location | Contains | Does NOT contain |
|---|---|---|---|
| 1. Skills | `skills/*/SKILL.md` | Behavior, workflow, triggers, orchestration | Instructional theory, output formatting rules, personal preferences |
| 2. References | `references/**` | Reusable instructional/domain knowledge | Course content, skill-specific workflow steps |
| 3. Templates | `templates/*.md` | Output document structure (headings, fields) | Instructional reasoning, examples with real content |
| 4. Configuration | `config/*` | One instructor's preferences and defaults | Anything another instructor forking the repo must edit code to change |
| 5. Artifacts | `courses/**` | Generated, course-specific output | Anything reusable across courses |

If you're about to add a paragraph of instructional advice inside a skill, stop —
it belongs in `references/`, with the skill linking to it instead. If you're about
to hardcode a name, a language preference, or a color palette inside a skill,
stop — it belongs in `config/`.

## Adding a new skill

1. Confirm the responsibility doesn't already belong to an existing skill
   (check `skills/*/SKILL.md` "Purpose" sections first).
2. Create `skills/<name>/SKILL.md` using the contract shape in
   `references/quality/quality-standards.md#skill-contract-shape`.
3. Point it at existing references/templates before writing new ones.
4. Register it in `.claude-plugin/plugin.json`.
5. Add at least one test (`tests/`) if the skill has deterministic behavior
   (timing, manifest fields, structure) and one eval (`evals/`) for judgment
   quality.

## Course state and manifest

`course-manifest.yaml` (schema in `references/instructional-design/course-architecture.md`
and mirrored in `scripts/validate_manifest.py`) is the single source of truth for
a generated course. Skills read from it and write to it — they do not keep
parallel state. When a skill changes something that affects other skills
(see the dependency chain in `README.md` §2 and `references/adaptation/adaptation-rules.md`),
it updates `status:` in the manifest so `course-designer` and `course-reviewer`
know what's stale.

## Running validation

```bash
python3 scripts/validate_manifest.py courses/<course-id>/course-manifest.yaml
python3 scripts/validate_course.py courses/<course-id>/
python3 scripts/check_structure.py
pytest tests/
```

Run these after generating or editing course artifacts, not just after editing
the skills themselves.

## Conventions

- Skills are instructions for Claude, written in imperative/declarative prose —
  not code. Scripts (`scripts/`) are real Python for the parts that are
  actually deterministic (arithmetic, schema/field checks, structure checks).
  Do not move instructional judgment into scripts.
- Every generated file must be a real, valid artifact of its stated format
  (valid YAML, valid `.ipynb` JSON, a real openable `.pptx`) — never a
  plain-text stand-in with the right extension.
- Do not regenerate a whole course when only one session/artifact changed;
  follow `references/adaptation/adaptation-rules.md`.
- Research (web lookups) is off by default; see
  `references/instructional-design/course-architecture.md#research-policy`.

## Known limitation

Stage 2 of `slide-designer` (turning a slide specification into an actual
editable `.pptx`) depends on a presentation/design capability being available
in the runtime (e.g. a document/slide-authoring tool). If that capability is
not available, `slide-designer` must stop after Stage 1 (the specification)
and say so — it must not fabricate a fake "pptx". A native editable deck
artifact (e.g. Claude Slides) counts as a valid Stage 2 target
(`references/slides/slide-patterns.md#stage-2-targets`).
