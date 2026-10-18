# Adaptation Rules

Used by: `course-designer` (orchestrating `/adapt-course`), all skills that
own a downstream artifact.

## Core principle

When an upstream constraint or artifact changes, identify exactly what's
downstream of it in the dependency chain (`references/instructional-design/course-architecture.md`)
and regenerate only that. Never regenerate the whole course for a localized
change (`README.md` §38, §30).

## Common adaptations and their blast radius

| Change | Directly affected | Usually NOT affected |
|---|---|---|
| 6 sessions → 4 sessions | Course structure, session objectives redistribution, all session content, all downstream artifacts for merged/dropped sessions | Sessions untouched by the merge (if any) |
| 2h → 90min sessions | Every agenda (retiming), likely activity/practice durations trimmed | Learning objectives (unless content must be cut, then also course outline) |
| Beginner → Intermediate | Explanation depth, exercise difficulty, assessment difficulty, possibly prerequisites | Session count/timing (usually unchanged) |
| Offline → Online | Delivery-dependent activities (in-person role play, physical materials), instructor guide transitions | Core content/objectives |
| Internet available → unavailable | Any exercise/notebook step requiring network access, research-based content | Locally-runnable notebook cells |
| Single session content edit | That session's agenda/activity/exercise/notebook/slides/assessment items mapped to it, instructor guide for that session | Other sessions, course-level objectives (unless the edit changes scope) |

## Procedure

1. Read the change against the course manifest's current `status` values.
2. Walk the dependency chain from the changed node downward; list every
   artifact whose *inputs* changed.
3. For each: mark it `pending` in `status`, do not touch artifacts still
   `approved` whose inputs didn't change.
4. Regenerate marked artifacts only, using the same skill responsible for
   that artifact type.
5. Run `course-reviewer`'s consistency check scoped to the changed sessions
   (not a full course review) unless the change was course-wide (e.g. level
   change affecting every session).
6. Report to the user exactly what was regenerated and what was preserved.

## Example (from `README.md` §30)

```
Session 3 changes
→ Agenda 3, Activity 3, Exercise 3, Notebook 3, Slides 3,
  Assessment items mapped to Session 3, Instructor Guide 3
```
Sessions 1, 2, 4, 5, 6 and their artifacts are untouched.
