# Research Policy

Used by: `course-designer` (sets `research.enabled` in the manifest),
`course-outline`, `session-designer`, and any skill that would otherwise be
tempted to browse for supporting content.

Extracted into its own file in Phase 12 (was previously a subsection of
`references/instructional-design/course-architecture.md`) so the policy has
one canonical location instead of being duplicated if referenced from
multiple skills.

## Default: OFF

Research (web lookups / current-info retrieval) is **off by default**
(`config/defaults.yaml`'s `research: false`, and `course-manifest.yaml`'s
`research.enabled: false`).

## When to turn it ON

- The user asks for the latest information.
- The topic changes frequently (fast-moving libraries/frameworks, current
  events, versioned tools).
- The course explicitly needs external references or sources.
- The user requests citations.

## Behavior when ON

- Prefer official documentation for technical subjects.
- Prefer primary sources over aggregators/summaries.
- Record the source and the research date directly in the artifact that
  used it (so a reader can judge how current the information still is).
- Clearly separate "current, dated" facts from static conceptual
  knowledge — a session should never present a fast-changing fact as if it
  were as stable as, say, "what a for-loop is."

## Behavior when OFF (the default)

- Do not browse for topics that are stable, foundational knowledge.
- Rely on the model's own knowledge for concepts, definitions, and
  standard practice.
- If a course genuinely needs current information but research is off
  (e.g. the instructor hasn't opted in), flag the gap rather than silently
  presenting possibly-stale information as current.

## Where this is consumed

`course-designer` reads/writes `research.enabled` in the manifest at
course-creation time; every content-generating skill checks it before
deciding whether to look anything up rather than deciding independently.
