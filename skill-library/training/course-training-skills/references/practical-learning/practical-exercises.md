# Practical Exercises

Used by: `practical-work`.

## Formats

`Coding, Data Analysis, Debugging, Configuration, System Design, API Usage,
Model Building, Experiments, Case Analysis, Tool Usage, Mini Projects`

Choose the format that matches how the concept is actually used in practice —
don't default to "coding exercise" for a concept that's really about system
design or configuration.

## Required structure

Every exercise defines: `Objective, Prerequisites, Starting Point, Task,
Constraints, Expected Output, Hints, Common Mistakes, Solution, Extension
Challenge`. See `templates/exercise-template.md`.

- **Objective** — one sentence, traces to a session objective.
- **Prerequisites** — only concepts already taught (check against
  `references/instructional-design/learning-progression.md`).
- **Starting Point** — exactly what the learner has in front of them
  (starter code, dataset, config file, blank state — be explicit).
- **Task** — the ask, stated unambiguously, one primary goal.
- **Constraints** — real limits (time, tools, allowed libraries) not
  artificial difficulty.
- **Expected Output** — concrete and checkable (a value, a passing test, a
  specific behavior) — avoid vague "make it work."
- **Hints** — progressive, 2–3 levels, each revealing less than the solution.
- **Common Mistakes** — anticipate the actual errors learners at this level
  make (from experience or common patterns for the topic).
- **Solution** — complete, correct, instructor-only.
- **Extension Challenge** — optional, for fast finishers; must not be
  required to meet the session objective.

## Student vs. instructor separation

Student-facing material contains: Objective, Prerequisites, Starting Point,
Task, Constraints, Expected Output, Hints. It must NOT contain Solution or
(unless intentionally pedagogical) Common Mistakes framed as answers.

Instructor-facing material contains everything, plus grading/evaluation notes
where relevant.

`practical-work` must generate these as distinguishable outputs (separate
sections or separate files), never interleaved in a way a student could
accidentally see the solution.

## Difficulty calibration

Match `references/instructional-design/learning-objectives.md`'s level table.
A Beginner exercise should be solvable with only concepts from Topics/Explanation
in that session and earlier ones — no reaching ahead.
