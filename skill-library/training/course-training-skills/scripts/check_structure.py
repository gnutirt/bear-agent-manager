#!/usr/bin/env python3
"""
Check that the repository itself has the required scaffolding:
all skills present with SKILL.md, all core references present,
all templates present, config present.

Usage:
    python3 scripts/check_structure.py [repo_root]
"""
import sys
import os

REQUIRED_SKILLS = [
    "course-designer", "course-outline", "session-designer",
    "activity-designer", "practical-work", "notebook-designer",
    "slide-designer", "assessment-designer", "instructor-guide",
    "course-reviewer",
]

REQUIRED_REFERENCE_FILES = [
    "instructional-design/learning-objectives.md",
    "instructional-design/course-architecture.md",
    "instructional-design/learning-progression.md",
    "instructional-design/research-policy.md",
    "activities/activity-patterns.md",
    "activities/training-games.md",
    "practical-learning/practical-exercises.md",
    "notebooks/notebook-patterns.md",
    "slides/slide-patterns.md",
    "assessment/assessment-patterns.md",
    "instructor/instructor-guidance.md",
    "adaptation/adaptation-rules.md",
    "quality/quality-standards.md",
    "institutional-requirements/course-bag-program.md",
]

REQUIRED_TEMPLATES = [
    "course-template.md", "session-template.md", "agenda-template.md",
    "activity-template.md", "exercise-template.md", "notebook-template.md",
    "slide-template.md", "assessment-template.md",
    "instructor-guide-template.md", "course-review-template.md",
    "course-bag-submission-template.md", "course-bag-timetable-template.md",
]

REQUIRED_CONFIG = [
    "instructor-profile.md", "teaching-preferences.md",
    "presentation-style.md", "defaults.yaml",
]

REQUIRED_ROOT_FILES = ["README.md", "CLAUDE.md", "SKILL.md", ".claude-plugin/plugin.json"]


def main(argv):
    root = argv[1] if len(argv) > 1 else "."
    errors = []

    for f in REQUIRED_ROOT_FILES:
        if not os.path.isfile(os.path.join(root, f)):
            errors.append(f"missing root file: {f}")

    for s in REQUIRED_SKILLS:
        skill_md = os.path.join(root, "skills", s, "SKILL.md")
        if not os.path.isfile(skill_md):
            errors.append(f"missing skill file: skills/{s}/SKILL.md")

    for r in REQUIRED_REFERENCE_FILES:
        p = os.path.join(root, "references", r)
        if not os.path.isfile(p):
            errors.append(f"missing reference file: references/{r}")

    for t in REQUIRED_TEMPLATES:
        p = os.path.join(root, "templates", t)
        if not os.path.isfile(p):
            errors.append(f"missing template: templates/{t}")

    for c in REQUIRED_CONFIG:
        p = os.path.join(root, "config", c)
        if not os.path.isfile(p):
            errors.append(f"missing config file: config/{c}")

    for d in ["evals", "tests", "scripts", "examples"]:
        if not os.path.isdir(os.path.join(root, d)):
            errors.append(f"missing directory: {d}/")

    if errors:
        print(f"FAIL: {len(errors)} structural issue(s)")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("PASS: repository structure complete")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
