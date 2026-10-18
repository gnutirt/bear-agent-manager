# Course-Bag Timetable Spreadsheet Spec

Not a document template — this is the column spec for the `.xlsx` file
`course-designer` generates as the course-bag submission's uploadable
Timetable (form field #9 in
`references/institutional-requirements/course-bag-program.md`). One row per
session/lecture.

| Column | Type | Source |
|---|---|---|
| Lecture # | integer | Session number |
| Title | text | Session title |
| Duration | text | `session_duration` from the manifest (e.g. "2h") |
| Content taught | text | Condensed from the session's Topics/Key Concepts |
| Practical work (in-class) | text | The session's Activity name + Exercise name/summary |
| Post-lecture task | text | The session's Homework field, or "None" |

Output file: `courses/<course-id>/course-bag/timetable.xlsx`, sheet name
"Timetable", header row bold, one data row per session in order. Use the
`xlsx` document-creation skill available in this environment to produce a
real `.xlsx` — do not hand back a Markdown table pretending to be the
spreadsheet deliverable.
