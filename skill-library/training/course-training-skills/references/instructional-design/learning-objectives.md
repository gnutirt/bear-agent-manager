# Learning Objectives

Used by: `course-outline`, `session-designer`, `assessment-designer`, `course-reviewer`.

## Format

Every objective is a single sentence:

```
By the end of <course|session>, learners will be able to <verb> <object> <condition/context>.
```

Use an observable Bloom's-taxonomy verb appropriate to the target level:

| Level | Preferred verbs |
|---|---|
| Beginner | identify, describe, explain, list, demonstrate, apply, use |
| Intermediate | analyze, compare, implement, debug, design, differentiate |
| Advanced | evaluate, optimize, architect, critique, synthesize, justify |

Avoid unobservable verbs: *understand, know, learn, appreciate, be familiar with*.
If an objective can't be observed in an activity, exercise, or assessment, rewrite it.

## Course-level vs. session-level objectives

- Course-level objectives (3–6 typical) describe what the learner can do after
  the *whole* course.
- Session-level objectives (2–4 typical) are decomposition of course objectives
  — each session objective must trace to at least one course objective.
- `course-reviewer` flags any session objective that does not trace upward, and
  any course objective with no session covering it.

## Validation checklist

- [ ] Observable verb
- [ ] Single outcome per objective (no "and" hiding two objectives)
- [ ] Matches the stated level (a Beginner course should not require "optimize")
- [ ] Achievable within the allotted session/course duration
- [ ] Traceable to at least one assessment item (`assessment-designer` enforces this)
- [ ] Traceable to at least one session (course-level only)

## Anti-patterns

- Writing objectives *after* the content, purely descriptively ("this session
  covers X") — objectives drive content, not the reverse.
- Copy-pasting the same objective template across sessions with only the noun
  swapped, ignoring that later sessions should build on earlier ones
  (see `references/instructional-design/learning-progression.md`).
- More objectives than a session can realistically achieve — cap at 4 for a
  session under 2.5 hours.
