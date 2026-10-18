#!/usr/bin/env python3
"""
Validate a course-manifest.yaml against the schema in
references/instructional-design/course-architecture.md.

Usage:
    python3 scripts/validate_manifest.py courses/<course-id>/course-manifest.yaml

Exit code 0 on success, 1 on validation failure, 2 on usage/parse error.
"""
import sys
import re

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML is required (pip install pyyaml)", file=sys.stderr)
    sys.exit(2)

REQUIRED_TOP_LEVEL = ["course", "schedule", "delivery", "artifacts", "research", "status"]
REQUIRED_COURSE_FIELDS = ["id", "name", "audience", "level"]
REQUIRED_SCHEDULE_FIELDS = ["total_hours", "sessions", "session_duration"]
REQUIRED_DELIVERY_FIELDS = ["mode"]
REQUIRED_ARTIFACT_FIELDS = ["slides", "notebooks", "assessments", "instructor_guide"]
VALID_LEVELS = {"Beginner", "Intermediate", "Advanced"}
VALID_MODES = {"offline", "online", "hybrid"}
VALID_STATUS_VALUES = {
    "pending", "in_progress", "approved", "not_applicable", "passed", "failed"
}
STATUS_KEYS = [
    "outline", "sessions", "activities", "notebooks", "slides",
    "assessments", "review",
]


def parse_duration_to_hours(value):
    """Parse '2h', '90m', '1.5h', 2 (already hours) -> float hours."""
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().lower()
    m = re.match(r"^([\d.]+)\s*h(ours?)?$", s)
    if m:
        return float(m.group(1))
    m = re.match(r"^([\d.]+)\s*m(in(utes)?)?$", s)
    if m:
        return float(m.group(1)) / 60.0
    raise ValueError(f"Cannot parse duration: {value!r}")


def validate(manifest: dict) -> list:
    errors = []

    for key in REQUIRED_TOP_LEVEL:
        if key not in manifest:
            errors.append(f"missing top-level key: {key}")
    if errors:
        return errors  # can't safely go deeper

    course = manifest["course"]
    for f in REQUIRED_COURSE_FIELDS:
        if f not in course or course[f] in (None, ""):
            errors.append(f"course.{f} is required")
    if course.get("level") not in VALID_LEVELS and "level" in course:
        errors.append(f"course.level must be one of {VALID_LEVELS}, got {course.get('level')!r}")

    schedule = manifest["schedule"]
    for f in REQUIRED_SCHEDULE_FIELDS:
        if f not in schedule or schedule[f] in (None, ""):
            errors.append(f"schedule.{f} is required")

    if all(f in schedule for f in REQUIRED_SCHEDULE_FIELDS):
        try:
            total_hours = float(schedule["total_hours"])
            sessions = int(schedule["sessions"])
            session_hours = parse_duration_to_hours(schedule["session_duration"])
            computed = sessions * session_hours
            if abs(computed - total_hours) > 1e-6:
                errors.append(
                    f"timing mismatch: sessions ({sessions}) x session_duration "
                    f"({session_hours}h) = {computed}h, but total_hours = {total_hours}h"
                )
        except ValueError as e:
            errors.append(f"schedule timing fields invalid: {e}")

    delivery = manifest["delivery"]
    for f in REQUIRED_DELIVERY_FIELDS:
        if f not in delivery or delivery[f] in (None, ""):
            errors.append(f"delivery.{f} is required")
    if delivery.get("mode") not in VALID_MODES and "mode" in delivery:
        errors.append(f"delivery.mode must be one of {VALID_MODES}, got {delivery.get('mode')!r}")

    artifacts = manifest["artifacts"]
    for f in REQUIRED_ARTIFACT_FIELDS:
        if f not in artifacts:
            errors.append(f"artifacts.{f} is required")

    research = manifest["research"]
    if "enabled" not in research:
        errors.append("research.enabled is required")
    elif not isinstance(research["enabled"], bool):
        errors.append("research.enabled must be boolean")

    status = manifest["status"]
    for k in STATUS_KEYS:
        if k not in status:
            errors.append(f"status.{k} is required")
        elif status[k] not in VALID_STATUS_VALUES:
            errors.append(
                f"status.{k} = {status[k]!r} not in {VALID_STATUS_VALUES}"
            )

    return errors


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    path = argv[1]
    try:
        with open(path) as f:
            manifest = yaml.safe_load(f)
    except Exception as e:
        print(f"ERROR: could not parse {path}: {e}", file=sys.stderr)
        return 2

    if not isinstance(manifest, dict):
        print("ERROR: manifest root must be a mapping", file=sys.stderr)
        return 2

    errors = validate(manifest)
    if errors:
        print(f"FAIL: {path} — {len(errors)} issue(s):")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"PASS: {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
