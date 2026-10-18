---
name: assessment-designer
description: Designs assessments mapped to learning objectives — diagnostic, knowledge checks, multiple choice, short answer, practical, debugging, case study, project, presentation, exit ticket, homework, and final formats — consistent with the course's overall assessment strategy. Never assesses a concept that wasn't taught.
---

# assessment-designer

## Purpose
Produce assessment items that measure whether stated objectives were met —
nothing more, nothing invented.

## Trigger
`course-designer` invokes per session (and once for the final assessment)
after `session-designer` (and, for the final, after all sessions) completes.
`/create-assessment` invoked directly.

## Non-trigger conditions
- Ungraded formative activities → `activity-designer`.
- Practical/hands-on exercise content itself → `practical-work` (this skill
  may reference/promote one of those exercises into a graded item, but does
  not redesign it).

## Inputs
This session's (or the whole course's, for the final) Objectives, Topics,
Explanation; `course-plan.md`'s Assessment Strategy (overall mix/weighting).

## Outputs
`assessments/session-NN-assessment.md` (and, for the final,
`assessments/final-assessment.md`), each item per
`templates/assessment-template.md`.

## Dependencies
`session-designer` (per-session) or all sessions (final assessment);
`course-outline`'s Assessment Strategy.

## References
`references/assessment/assessment-patterns.md`,
`references/instructional-design/learning-progression.md`.

## Templates
`templates/assessment-template.md`

## Downstream consumers
`course-reviewer` (Assessment alignment check), `instructor-guide` (Expected
Answers cross-references assessment expectations where relevant).

## Procedure

1. Read the course's overall Assessment Strategy — do not invent a different
   mix at the session level (e.g. don't add a project if the strategy didn't
   call for one at this point).
2. For each objective this session (or course) should measure, pick a format
   from `assessment-patterns.md` whose "best measures" column matches the
   objective type (recall vs. applied skill vs. judgment vs. integration).
3. Write Instructions, Expected Answer/Result (concrete), Evaluation Criteria
   (observable — a rubric row or pass condition, not "assess understanding").
4. Cross-check every item's content against this session's (and earlier
   sessions') actual Topics/Explanation — reject/rewrite anything that tests
   an untaught concept.
5. For the final assessment: ensure every course-level objective is covered
   by at least one item somewhere across the course's assessments (not
   necessarily all in the final).

## Validation
- [ ] Every item states an Objective it maps to
- [ ] No item tests a concept absent from Topics/Explanation up to this point
- [ ] Evaluation Criteria are observable/specific
- [ ] Format mix is consistent with the stated course Assessment Strategy
