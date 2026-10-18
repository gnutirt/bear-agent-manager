# Activity Patterns

Used by: `activity-designer`.

## Selection inputs (all required before choosing an activity)

`Topic, Audience, Level, Class Size, Session Duration, Delivery Mode, Learning Objective`

An activity is only valid if you can state, in one sentence, which specific
learning objective it serves and how the debrief proves it happened. If you
cannot, do not include the activity (see `README.md` §38: "do not generate
activities without educational purpose").

## Pattern catalog

| Pattern | Best for | Typical duration | Class size fit | Notes |
|---|---|---|---|---|
| Icebreaker | Session opening, low-stakes retrieval of prior knowledge | 5–10 min | any | Only in Session 1 or after a break of several days — not every session |
| Knowledge check | Quick formative check after Explanation | 3–7 min | any | Not graded; feeds into `assessment-designer` only if explicitly promoted |
| Think-Pair-Share | Conceptual reasoning, low material needs | 8–15 min | any, ideal 10–40 | Pair, think alone first, then share |
| Debugging challenge | Code/technical courses, post-explanation | 15–25 min | small teams (2–3) | Seed a realistic bug, not a trick |
| Case study | Applied judgment, non-single-right-answer topics | 20–40 min | teams of 3–5 | Needs a real or realistic scenario document |
| Role play | Soft skills, negotiation, interviews, stakeholder scenarios | 15–30 min | pairs/small groups | Needs clear role briefs |
| Build challenge | Hands-on synthesis after several concepts taught | 25–45 min | individual or pairs | Overlaps with `practical-work` — use activity framing only if ungraded and time-boxed as a game |
| Scenario challenge | Systems/design thinking | 20–35 min | teams of 3–5 | Present constraints, not a single correct architecture |
| Concept mapping | Consolidating a cluster of related concepts | 10–20 min | individual or pairs | Good before a summative assessment |
| Prediction activity | Priming before revealing a result/demo | 5–10 min | any | "What do you think will happen if...?" before running code/demo |
| Error analysis | Teaching common misconceptions directly | 10–20 min | individual or pairs | Show broken output/code/reasoning, ask learners to diagnose |
| Review game | End of session or course, retrieval practice | 10–20 min | any | Rotate format across sessions — do not reuse the same game every time |
| Team competition | High-energy retrieval or application practice | 15–25 min | teams of 3–5 | Use sparingly; not every session needs competitive framing |

## Activity density for in-person sessions

When `delivery.mode` is `offline` (in person), learners lose focus in long
listening stretches and the room itself is a resource. So:

- Embed one micro-activity (3–5 min) inside every Explanation block of 20+
  minutes, in addition to the agenda's own Activity/Practice blocks. Its time
  comes out of that Explanation block — the agenda total does not change —
  and the agenda row names it ("Explanation — X + activity: Y").
- Each micro-activity still serves one session objective and has a debrief
  (often a single question to the room). Engagement alone is not a purpose.
- Vary the mechanic across the session: whole-room, pairs, individual →
  room, small groups. Do not run the same mechanic twice in a row.
- Build on earlier activities where possible (a "before" score from an early
  peer audit gets re-scored in the final workshop).

### In-person micro-activity patterns

| Pattern | Mechanic | Best for | Materials |
|---|---|---|---|
| Standing poll ("Stand up if…") | 3 escalating statements; people stand, then sit as statements stop applying | Opening; making a gap visible without lecturing | none |
| Peer audit swap | Pairs swap devices/papers and score each other's artifact on a short rubric | Self-awareness before a "how to fix it" block | rubric on slide, paper |
| Sticky-note gallery + dot voting | Each person writes one item on a sticky note, posts it on a wall, room votes with 3 marker dots | Rewriting a short artifact (headline, title, hook); peer comparison | sticky notes, markers |
| Group battle | Groups of 4 draft several options, pick their best, present aloud, room applauds the winner | Persuasive/creative writing (hooks, pitches, openings) | paper |
| Role reversal ("You're the recruiter/client/user") | Groups get a printed brief card and act from the other side, then check their own work against it | Seeing one's work through the evaluator's eyes | printed brief cards |

## Anti-patterns (README §38)

- Selecting an activity for energy/fun alone with no traceable objective.
- Reusing the exact same activity type in every session (monotony; also a
  `course-reviewer` flag).
- Choosing team competitions or role play for a 1-on-1 or very small class
  where they don't functionally work — check class size fit.
- An activity that requires internet/tools not declared available in
  `delivery`.

## Required fields per activity

`Name, Objective, Duration, Participants, Materials, Instructions, Expected
Outcome, Debrief, Difficulty` — see `templates/activity-template.md`.
