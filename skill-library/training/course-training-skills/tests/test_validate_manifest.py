"""
Tests for scripts/validate_manifest.py — manifest schema and timing
arithmetic validation (README.md §35: "Manifest validation", "Duration
calculation", "Required fields").
"""
import copy
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import validate_manifest as vm  # noqa: E402


def base_manifest():
    return {
        "course": {
            "id": "test-course",
            "name": "Test Course",
            "audience": "Adults",
            "level": "Beginner",
        },
        "schedule": {
            "total_hours": 12,
            "sessions": 6,
            "session_duration": "2h",
        },
        "delivery": {"mode": "offline"},
        "artifacts": {
            "slides": True,
            "notebooks": "auto",
            "assessments": True,
            "instructor_guide": True,
        },
        "research": {"enabled": False},
        "status": {
            "outline": "approved",
            "sessions": "approved",
            "activities": "pending",
            "notebooks": "pending",
            "slides": "pending",
            "assessments": "pending",
            "review": "pending",
        },
    }


def test_valid_manifest_passes():
    assert vm.validate(base_manifest()) == []


def test_missing_top_level_key_detected():
    m = base_manifest()
    del m["delivery"]
    errors = vm.validate(m)
    assert any("delivery" in e for e in errors)


def test_missing_course_field_detected():
    m = base_manifest()
    del m["course"]["audience"]
    errors = vm.validate(m)
    assert any("course.audience" in e for e in errors)


def test_invalid_level_detected():
    m = base_manifest()
    m["course"]["level"] = "Expert"
    errors = vm.validate(m)
    assert any("level" in e for e in errors)


def test_timing_mismatch_detected():
    m = base_manifest()
    m["schedule"]["sessions"] = 5  # 5 x 2h = 10h != 12h
    errors = vm.validate(m)
    assert any("timing mismatch" in e for e in errors)


def test_timing_match_with_minutes_duration():
    m = base_manifest()
    m["schedule"]["total_hours"] = 6
    m["schedule"]["sessions"] = 4
    m["schedule"]["session_duration"] = "90m"
    errors = vm.validate(m)
    assert errors == []


def test_invalid_delivery_mode_detected():
    m = base_manifest()
    m["delivery"]["mode"] = "telepathic"
    errors = vm.validate(m)
    assert any("delivery.mode" in e for e in errors)


def test_missing_artifact_field_detected():
    m = base_manifest()
    del m["artifacts"]["notebooks"]
    errors = vm.validate(m)
    assert any("artifacts.notebooks" in e for e in errors)


def test_research_enabled_must_be_bool():
    m = base_manifest()
    m["research"]["enabled"] = "false"  # string, not bool
    errors = vm.validate(m)
    assert any("research.enabled" in e for e in errors)


def test_invalid_status_value_detected():
    m = base_manifest()
    m["status"]["outline"] = "maybe"
    errors = vm.validate(m)
    assert any("status.outline" in e for e in errors)


def test_missing_status_key_detected():
    m = base_manifest()
    del m["status"]["review"]
    errors = vm.validate(m)
    assert any("status.review" in e for e in errors)


def test_parse_duration_hours_and_minutes():
    assert vm.parse_duration_to_hours("2h") == 2.0
    assert vm.parse_duration_to_hours("90m") == 1.5
    assert vm.parse_duration_to_hours("1.5h") == 1.5
    assert vm.parse_duration_to_hours(2) == 2.0


def test_parse_duration_invalid_raises():
    import pytest
    with pytest.raises(ValueError):
        vm.parse_duration_to_hours("banana")
