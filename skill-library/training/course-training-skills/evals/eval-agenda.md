# Eval: Agenda Timing

**Skill:** `session-designer` (agenda-building step)
**Case:** Any session agenda.

## Rubric
| Dimension | Pass criteria |
|---|---|
| Timing | Sum of Minutes column == session_duration in minutes, exactly (mechanically checkable — should be a Fail with zero tolerance, not "close enough") |
| Consistency | Agenda block types vary appropriately across sessions in the same course (not an identical skeleton every time) |
| Audience/Level Appropriateness | Block choices fit delivery mode/class size (e.g. no "team competition" block for a 1-on-1 course) |

This is the eval most amenable to full automation — prefer running
`scripts/validate_course.py` over manual timing review.
