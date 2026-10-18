---
name: activity-designer
description: Designs learning activities and training games for a session, selected by topic, audience, level, class size, session duration, delivery mode, and learning objective. Every activity must have a traceable educational purpose — never adds activities purely for engagement.
---

# activity-designer

## Purpose
Produce activities (and, where appropriate, training games) that make a
specific session objective happen experientially, not just explained.

## Trigger
`course-designer` invokes per session after `session-designer` completes.
`/create-activities` invoked directly for one session.

## Non-trigger conditions
- Graded/practical exercises → `practical-work`.
- Assessment items (even if activity-shaped, like a quiz used for grading) →
  `assessment-designer`; this skill only produces ungraded/formative
  activities and games.

## Inputs
This session's Objectives, Topics, and agenda Activity block(s) (from
`session-designer`), plus `delivery` (mode, class size) from the manifest.

## Outputs
`activities/session-NN-activities.md`, one entry per
`templates/activity-template.md`, matching the agenda's allotted Activity
block duration(s) exactly.

## Dependencies
`session-designer` output for this session.

## References
`references/activities/activity-patterns.md`,
`references/activities/training-games.md`.

## Templates
`templates/activity-template.md`

## Downstream consumers
`instructor-guide` (Fast-Finisher/Transitions reference these),
`course-reviewer` (Activity purpose check).

## Procedure

1. For each Activity block in this session's agenda, identify which session
   objective it should serve.
2. Select a pattern from `activity-patterns.md` (or a game from
   `training-games.md`) whose "best for" and class-size fit match this
   session's inputs. Do not default to the same pattern used in the previous
   session unless it's genuinely the best fit again.
3. Fill every required field: Name, Objective, Duration (must match the
   agenda block), Participants, Materials, Instructions, Expected Outcome,
   Debrief, Difficulty.
4. Self-check: can you state, in one sentence, what evidence in the Debrief
   proves the objective happened? If not, redesign or drop it.
5. Check `delivery.mode`/`internet`/`hardware` — an activity requiring
   materials or connectivity not declared available is invalid; redesign for
   the actual constraints.
6. When `delivery.mode` is `offline` (in person), also design the embedded
   micro-activities for each Explanation block of 20+ minutes, following
   `activity-patterns.md#activity-density-for-in-person-sessions` and the
   pacing in `config/teaching-preferences.md`. Use physical-room mechanics
   (standing, paper, sticky notes, printed cards), not online tools.
7. Number all activities of the session consecutively (Activity 1, 2, …) in
   the order they run, and list every printed/physical material the
   instructor must prepare.

## Validation
- [ ] Every activity traces to a stated session objective
- [ ] Duration matches the agenda block it fills
- [ ] Class size / delivery mode fit is respected
- [ ] In-person sessions: every Explanation block of 20+ min has an embedded
      micro-activity, and no two consecutive activities share a mechanic
- [ ] No two consecutive sessions use the identical activity pattern without
      reason (vary format — check against the prior session's file)
