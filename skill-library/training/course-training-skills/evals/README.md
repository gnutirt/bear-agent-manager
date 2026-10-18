# Evaluations

Tests (`tests/`) check deterministic behavior (arithmetic, schema, file
validity). Evals check judgment quality — things that need a rubric, not an
assertion. Run these by generating the case's output with the named skill,
then scoring against the rubric below.

Each eval file names: the skill(s) under test, an input case, and a rubric
scored `Pass / Partial / Fail` per dimension from `README.md` §34
(`Correctness, Consistency, Timing, Learning Objective Alignment, Audience
Appropriateness, Level Appropriateness, Artifact Quality, Adaptation
Behavior`). Not every dimension applies to every eval — only score the ones
that are relevant to that artifact type.
