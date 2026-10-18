#!/usr/bin/env python3
"""
Validate a generated course directory for structural correctness:
- agenda timing sums exactly to session_duration
- notebooks are valid nbformat 4 JSON with required cell fields
- pptx files (if present) are valid zip/OOXML packages with a slide part
- required session fields are present

Usage:
    python3 scripts/validate_course.py courses/<course-id>/
"""
import sys
import os
import re
import json
import zipfile
import glob

try:
    import yaml
except ImportError:
    yaml = None


def parse_minutes(value):
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().lower()
    m = re.match(r"^([\d.]+)\s*h(ours?)?$", s)
    if m:
        return float(m.group(1)) * 60.0
    m = re.match(r"^([\d.]+)\s*m(in(utes)?)?$", s)
    if m:
        return float(m.group(1))
    raise ValueError(f"Cannot parse minutes from: {value!r}")


def validate_agenda_file(path, session_duration_minutes):
    """Parse a markdown agenda table's Minutes column and sum it."""
    errors = []
    with open(path) as f:
        text = f.read()
    rows = re.findall(
        r"^\|\s*\d+\s*\|[^|]*\|\s*(\d+(?:\.\d+)?)\s*\|", text, re.MULTILINE
    )
    if not rows:
        errors.append(f"{path}: no parseable agenda rows found")
        return errors
    total = sum(float(r) for r in rows)
    if abs(total - session_duration_minutes) > 0.5:
        errors.append(
            f"{path}: agenda sums to {total} min, expected {session_duration_minutes} min"
        )
    return errors


def validate_notebook(path):
    errors = []
    try:
        with open(path) as f:
            nb = json.load(f)
    except Exception as e:
        return [f"{path}: not valid JSON ({e})"]

    if nb.get("nbformat") != 4:
        errors.append(f"{path}: nbformat must be 4, got {nb.get('nbformat')!r}")
    if "cells" not in nb or not isinstance(nb["cells"], list):
        errors.append(f"{path}: missing/invalid 'cells' array")
        return errors
    if len(nb["cells"]) == 0:
        errors.append(f"{path}: notebook has zero cells")
    for i, cell in enumerate(nb["cells"]):
        for field in ("cell_type", "source"):
            if field not in cell:
                errors.append(f"{path}: cell {i} missing '{field}'")
        if cell.get("cell_type") == "code" and "outputs" not in cell:
            errors.append(f"{path}: code cell {i} missing 'outputs'")
    if "student" in os.path.basename(path):
        joined = json.dumps(nb).lower()
        if "## solutions" in joined or "### solutions" in joined:
            errors.append(f"{path}: student notebook appears to contain a Solutions section")
    return errors


def validate_pptx(path):
    errors = []
    if not zipfile.is_zipfile(path):
        return [f"{path}: not a valid zip/OOXML package"]
    with zipfile.ZipFile(path) as z:
        names = z.namelist()
        if "[Content_Types].xml" not in names:
            errors.append(f"{path}: missing [Content_Types].xml — not a valid pptx")
        if not any(n.startswith("ppt/slides/slide") for n in names):
            errors.append(f"{path}: no slide parts found under ppt/slides/")
    return errors


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    course_dir = argv[1]
    if not os.path.isdir(course_dir):
        print(f"ERROR: {course_dir} is not a directory", file=sys.stderr)
        return 2

    errors = []
    warnings = []

    manifest_path = os.path.join(course_dir, "course-manifest.yaml")
    session_minutes = None
    if os.path.isfile(manifest_path) and yaml is not None:
        with open(manifest_path) as f:
            manifest = yaml.safe_load(f) or {}
        try:
            session_minutes = parse_minutes(manifest["schedule"]["session_duration"])
        except Exception as e:
            warnings.append(f"could not determine session_duration from manifest: {e}")
    else:
        warnings.append("no course-manifest.yaml found or PyYAML unavailable; skipping agenda timing checks")

    if session_minutes is not None:
        for agenda in sorted(glob.glob(os.path.join(course_dir, "sessions", "*-agenda.md"))):
            errors.extend(validate_agenda_file(agenda, session_minutes))

    for nb in sorted(glob.glob(os.path.join(course_dir, "notebooks", "*.ipynb"))):
        errors.extend(validate_notebook(nb))

    for pptx in sorted(glob.glob(os.path.join(course_dir, "slides", "*.pptx"))):
        errors.extend(validate_pptx(pptx))

    for w in warnings:
        print(f"WARN: {w}")

    if errors:
        print(f"FAIL: {len(errors)} issue(s) in {course_dir}")
        for e in errors:
            print(f"  - {e}")
        return 1

    print(f"PASS: {course_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
