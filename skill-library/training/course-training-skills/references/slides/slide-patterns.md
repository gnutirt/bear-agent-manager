# Slide Patterns

Used by: `slide-designer` (Stage 1 — instructional content). Stage 2 (visual
generation) is governed by `config/presentation-style.md`, not this file.

## Rule: instructional content vs. visual design stay separate

This file governs *what a slide says and shows conceptually*. It never
specifies fonts, colors, or layout pixel positions — that's Stage 2.

## Slide types and when to use them

| Type | Use for |
|---|---|
| Concept | Introducing a new idea, one idea per slide |
| Visual explanation | A process, architecture, or relationship best shown, not told |
| Example | A concrete instance of the concept just introduced |
| Diagram | Structural/relational information (flow, hierarchy, sequence) |
| Definition | A term that needs a precise, quotable definition |
| Process | Ordered steps |
| Comparison | Two or more options/approaches side by side |
| Question | A prompt for the audience — pairs with an activity |
| Instructions | What to do for an upcoming activity/exercise |
| Exercise | The exercise prompt itself, projected during practice time |
| Recap | End-of-section or end-of-session summary |
| Section divider | Opening each major agenda part: number, title, duration |
| Trainer Intro | Who is teaching — identity and credibility, right after the title slide |
| Contact | How learners reach the instructor after the session |
| Closing | The final "Thank You" slide |

## Deck frame

Every session deck is wrapped in the same frame, whatever the topic:

1. **Title** — course/session name, format and duration, instructor name, date.
2. **Trainer Intro** — exactly three short items, one per stacked full-width
   card, large text, no paragraphs: (1) name, (2) professional title,
   (3) instructor title. Values come from `config/instructor-profile.md`.
   Keep it professional and minimal — the instructor tells the story out loud
   (speaker notes), the slide only anchors it.
3. **Agenda**, then **Objectives** — then the teaching body.
4. … **Recap**, then **Q&A**.
5. **Contact** — always the penultimate slide: every channel listed under
   "Contact channels" in `config/instructor-profile.md` (LinkedIn first,
   then WhatsApp, email, portfolio), plus one call-to-action line tied to the
   session ("send me a connection request using today's structure").
6. **Closing** — always the last slide: a visually distinctive "Thank You"
   (the most designed slide in the deck), a thanks line in the course
   language, instructor name and title.

A contact value missing from the profile appears as a bracketed placeholder
(`[+20 …]`) and is listed in the hand-off message — never invented.

## Activity slides

Every activity in `activities/session-NN-activities.md` — including the
short embedded ones — gets its own Instructions slide placed where it runs:
eyebrow `Activity N · duration · grouping`, a title, 3 numbered steps, and
the expected outcome as one line. Number activities consecutively across the
session. Materials, timing tips and the debrief question go in Speaker Notes,
not on the slide.

## Right-to-left (Arabic) decks

- Align text right and lay rows out right-to-left (reverse flex rows; in
  grids, place the first item in the right-hand cell).
- Arabic text that contains English terms renders in the wrong word order
  when the paragraph's base direction is left-to-right. If the tool has no
  `dir`/`direction` support, wrap each Arabic paragraph in U+202B (RLE) …
  U+202C (PDF) so it renders right-to-left.
- English-only lines (code, sample headlines, sample messages) stay
  left-to-right and unwrapped.
- Arrows in RTL flows point left (`←`) for "next".

## Per-slide required fields

`Slide Number, Title, Purpose, Main Content, Visual Recommendation, Speaker
Notes, Interaction`. See `templates/slide-template.md`.

- **Purpose** — one sentence: what this slide accomplishes in the learning
  sequence (not "shows X" — "establishes why X matters before demo").
- **Main Content** — the actual text/bullets, kept minimal (see below).
- **Visual Recommendation** — described, not designed: "diagram: 3-box flow
  showing input → model → output" not a rendered image.
- **Speaker Notes** — what the instructor says, not what's on the slide restated.
- **Interaction** — none, or a named interaction (poll, question, pause for
  activity, live demo).

## Content discipline

- Avoid text-heavy slides: prefer ≤6 bullets, ≤8 words per bullet as a
  default ceiling; move detail to Speaker Notes.
- Do not copy instructor notes verbatim onto the slide (`README.md` §38) —
  the slide is the visual anchor, the notes are what's *said*.
- Do not simply restate the course outline as slide titles — each slide earns
  its place by doing something (teach, show, ask, transition).

## Stage 2 targets

Any real, editable presentation format counts as Stage 2 output: a `.pptx`
file, or a native editable slide-deck artifact when the runtime offers one
(e.g. a Claude Slides artifact, which also exports to `.pptx`/PDF). Prefer
the native deck when available and the user hasn't asked for a file format;
record which target was used (file path or deck link) in the manifest's
`slides:` list entry for the session.

## Stage 2 handoff contract

Stage 1 output (the spec) is the only input Stage 2 may use for instructional
content. Stage 2 may not invent new content, only design how the specified
content is presented. If the presentation/design capability is unavailable,
stop after Stage 1 and say so plainly — do not fabricate a `.pptx`.
