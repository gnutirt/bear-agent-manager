---
name: slide-designer
description: Two-stage skill. Stage 1 produces an instructional slide specification (per-slide title, purpose, content, visual recommendation, speaker notes, interaction) matching the session's actual content. Stage 2 uses an available presentation/design capability to generate a real, editable .pptx — never a flattened image deck, and never fabricated if no such capability is available.
---

# slide-designer

## Purpose
Specify what each slide teaches (Stage 1), then, only if a real
presentation/design capability exists in the current runtime, produce an
actually editable `.pptx` from that spec (Stage 2).

## Trigger
`course-designer` invokes per session after `session-designer` (and usually
after activities/exercise, since slides may reference them) completes.
`/create-slides` invoked directly.

## Non-trigger conditions
- Do not design session content here — pull it from `session-designer`'s
  Topics/Explanation, don't invent new content at slide time.
- Do not attempt Stage 2 if no presentation/design capability is available in
  the current environment — stop after Stage 1 and say so plainly
  (`CLAUDE.md`'s "Known limitation").

## Inputs
This session's Topics, Key Concepts, Examples (`session-designer`);
Activities/Exercise names for Instructions/Exercise-type slides;
`config/instructor-profile.md` (Trainer Intro, Contact, Closing slides);
`config/presentation-style.md` (Stage 2 only).

## Outputs
Stage 1: `slides/session-NN-slides.md`, one entry per
`templates/slide-template.md`. Stage 2 (capability permitting):
`slides/session-NN-slides.pptx`, or a native editable slide-deck artifact
when the runtime offers one (`slide-patterns.md#stage-2-targets`) — real,
editable text/shapes/diagrams/tables/charts/code blocks where the tool
supports them; images may remain images.

## Dependencies
`session-designer` (required); `activity-designer`, `practical-work`
(referenced, not required — slides can be drafted before them and revised).

## References
`references/slides/slide-patterns.md` (Stage 1),
`config/presentation-style.md` (Stage 2, visual design only — never
instructional content).

## Templates
`templates/slide-template.md`

## Downstream consumers
`course-reviewer` (Slide alignment check); the instructor (delivery).

## Procedure

### Stage 1 — specification
1. Walk this session's Topics/Key Concepts/Examples in teaching order.
2. For each teaching beat, choose a slide type from `slide-patterns.md`'s
   catalog (Concept, Visual explanation, Example, Diagram, Definition,
   Process, Comparison, Question, Instructions, Exercise, Recap).
3. Fill Slide Number, Title, Purpose, Main Content (≤6 bullets/≤8 words
   default), Visual Recommendation (described, not designed), Speaker Notes
   (what's said, not a restatement of the slide), Interaction.
4. Do not copy the course outline or the instructor guide verbatim onto
   slides — each slide earns its place in the teaching sequence.
5. Include at least one Recap slide at session end, and an
   Instructions/Exercise slide immediately before any Practice block.
6. Wrap the deck in the frame from `slide-patterns.md#deck-frame`: Title →
   Trainer Intro → Agenda → Objectives → … → Recap → Q&A → Contact
   (penultimate) → Closing "Thank You" (last). Fill the Trainer Intro and
   Contact from `config/instructor-profile.md`; a missing value becomes a
   bracketed placeholder listed in the hand-off, never an invented one.
7. Give every activity in `activities/session-NN-activities.md` (embedded
   micro-activities included) its own Instructions slide where it runs, per
   `slide-patterns.md#activity-slides`.
8. If the course language is right-to-left, apply
   `slide-patterns.md#right-to-left-arabic-decks` in Stage 2.

### Stage 2 — presentation generation
1. Check whether a presentation/design capability is available in this
   runtime. If not: stop, and clearly state the limitation — Stage 1's spec
   is still delivered as complete and usable on its own.
2. If available: feed Stage 1's spec as the only source of instructional
   content. Apply visual design (typography, color, spacing, layout,
   diagram/code/chart style) from `config/presentation-style.md`.
3. Build the deck with real, editable elements — text boxes, shapes,
   tables, charts, code blocks — never a full-slide screenshot/image
   standing in for the whole slide. Photographic/illustrative images may
   remain images.
4. Validate the resulting file is a structurally valid `.pptx`
   (`scripts/validate_course.py`) before calling it done. For a native deck
   artifact, record its link in the manifest's `slides:` entry instead.

## Validation
- [ ] Every slide's content traces to this session's actual Topics/Explanation
- [ ] No slide is a verbatim copy of the outline or instructor guide
- [ ] Deck frame present: Trainer Intro second, Contact penultimate,
      Closing "Thank You" last
- [ ] Every activity in the session's activities file has its own slide
- [ ] Stage 2 either produced a real editable `.pptx`, verified valid, or was
      explicitly skipped with the limitation stated — never a fabricated file
