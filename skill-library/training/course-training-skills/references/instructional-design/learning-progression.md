# Learning Progression

Used by: `course-outline`, `session-designer`, `course-reviewer`.

## Sequencing rules

1. **Foundations before applications.** A concept must be taught (appear in a
   session's Topics) before it is used as a prerequisite anywhere downstream
   (an activity, exercise, notebook, or assessment in a later or the same
   session, after the point it's introduced).
2. **Spiral, don't flatten.** Reintroduce earlier concepts at increasing depth
   rather than teaching everything about a topic in one pass, when the course
   duration allows it (typically 8+ sessions or clearly layered topics).
3. **Cognitive load ramps, then plateaus, then ramps again.** Don't stack the
   two hardest new concepts back-to-back in the same session unless the
   session is explicitly a deep-dive with reduced breadth elsewhere that day.
4. **Difficulty is level-relative, not absolute.** "Difficult" for a Beginner
   audience means unfamiliar vocabulary/abstraction, not necessarily
   mathematical complexity.

## Session-to-session handoff

Each session should state, in Instructor Notes, what the *next* session
assumes the learner can already do. `course-reviewer` cross-checks this
against the next session's stated prerequisites/Topics.

## Detecting a broken progression

Signs the reviewer should flag:

- A later session's exercise/notebook/assessment uses a tool, library, or
  concept that was never in any earlier session's Topics.
- Two consecutive sessions both introduce >2 genuinely new abstractions with
  no practice session between them.
- The final project/capstone requires a skill no session actually built.
- Prerequisites listed in `course-outline` are never referenced again (dead
  prerequisite — either drop it or use it).

## Worked example

```
Session 2 teaches "functions and parameters" (Beginner Python).
Session 4's exercise requires *args/**kwargs.
*args/**kwargs was never introduced.
→ Flag: either add it explicitly to Session 3 or 4's Topics, or simplify the exercise.
```
