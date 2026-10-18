---
name: course-reviewer
description: Runs final and/or scoped quality assurance across the whole course — scope, objectives, coverage, sequencing, timing, activities, practical work, assessments, slides, notebooks, instructor guide, and cross-artifact consistency. Detects contradictions between artifacts and fixes them directly when the fix is unambiguous; otherwise flags for instructor decision.
---

# course-reviewer

## Purpose
Quality assurance across everything already generated — not original content
creation.

## Trigger
- `course-designer` invokes this as the last orchestration step.
- `/review-course` invoked directly.
- `references/adaptation/adaptation-rules.md`'s procedure calls this scoped
  to only the changed sessions after an adaptation.

## Non-trigger conditions
- Do not generate new activities/exercises/notebooks/slides/assessments as
  original content — only fix existing ones when the fix is unambiguous
  (per `references/quality/quality-standards.md`'s fix-when-possible rule).

## Inputs
Every artifact under `courses/<course-id>/`, plus `course-manifest.yaml`.

## Outputs
`review/course-review.md` (`templates/course-review-template.md`): pass/fail
per check, issues found, what was auto-fixed vs. flagged, overall verdict.
Direct edits to artifacts where auto-fixed. Updates `status.review`.

## Dependencies
All other skills' outputs for the scope being reviewed (whole course, or the
sessions named in a scoped adaptation review).

## References
`references/quality/quality-standards.md` (the checklist),
`references/instructional-design/learning-progression.md`,
`references/instructional-design/course-architecture.md`,
`references/institutional-requirements/course-bag-program.md` (the
Institutional requirements check).

## Templates
`templates/course-review-template.md`

## Downstream consumers
The user (final gate before the package is considered done);
`course-designer` (reads `status.review` to know if the course is complete).

## Procedure

1. Run each of the 14 checks in `references/quality/quality-standards.md`
   against the current artifact set.
2. For each failure, classify: **auto-fixable** (unambiguous — retiming an
   agenda, linking an orphaned objective, adding a missing required field) vs.
   **needs instructor decision** (a genuine content/design judgment call).
3. Apply auto-fixes directly, re-run the specific check to confirm.
4. For cross-artifact consistency specifically: build a per-session concept
   set from Topics/Explanation, then check every downstream artifact
   (activity, exercise, notebook, slides, assessment) for concepts used but
   not in that set (or an earlier session's set). This is the check that
   catches the `README.md` §17 XGBoost example.
5. For Institutional requirements specifically: confirm `schedule.total_hours`
   meets the 6-hour minimum in
   `references/institutional-requirements/course-bag-program.md` §1 (FAIL,
   needs-decision, if not — a course this short shouldn't have reached
   review without the Step 1 flag already having been raised by
   `course-designer`), and if it's under the 20-hour certificate threshold,
   confirm the course plan or course-bag draft notes the certificate rule
   rather than silently omitting it.
6. Write `review/course-review.md` with the full checklist table, issues
   list (each tagged auto-fixed or needs-decision), and an overall PASS/FAIL.
7. If FAIL with unresolved needs-decision items, clearly enumerate them for
   the instructor rather than declaring the course done.

## Validation
The review itself is validated by re-running each check after any auto-fix
and confirming it now passes — never report a check as fixed without
re-verifying it.
