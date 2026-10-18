"""
Tests for scripts/check_structure.py — repository scaffolding completeness
(README.md §35: "Output structure").
"""
import os
import sys
import shutil
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import check_structure as cs  # noqa: E402

REPO_ROOT = os.path.join(os.path.dirname(__file__), "..")


def test_repo_structure_passes():
    assert cs.main(["check_structure.py", REPO_ROOT]) == 0


def test_missing_skill_detected(tmp_path):
    # Copy the real repo into a temp dir, then delete one skill file
    dest = os.path.join(str(tmp_path), "repo")
    shutil.copytree(REPO_ROOT, dest, ignore=shutil.ignore_patterns("courses", ".git"))
    os.remove(os.path.join(dest, "skills", "course-designer", "SKILL.md"))
    assert cs.main(["check_structure.py", dest]) == 1


def test_missing_reference_detected(tmp_path):
    dest = os.path.join(str(tmp_path), "repo")
    shutil.copytree(REPO_ROOT, dest, ignore=shutil.ignore_patterns("courses", ".git"))
    os.remove(os.path.join(dest, "references", "quality", "quality-standards.md"))
    assert cs.main(["check_structure.py", dest]) == 1
