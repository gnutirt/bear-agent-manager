"""
Tests for scripts/validate_course.py — agenda timing, notebook JSON
validity, and pptx structural validity (README.md §35: "Agenda timing",
"Output structure").
"""
import json
import os
import sys
import tempfile
import zipfile

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import validate_course as vc  # noqa: E402


def write(tmp_path, name, content):
    p = os.path.join(tmp_path, name)
    with open(p, "w") as f:
        f.write(content)
    return p


def test_agenda_sums_correctly(tmp_path):
    content = (
        "# Session 1 Agenda\n\n"
        "| Block | Component | Minutes | Running Total |\n"
        "|---|---|---|---|\n"
        "| 1 | Opening | 10 | 10 |\n"
        "| 2 | Explanation | 50 | 60 |\n"
        "| 3 | Break | 10 | 70 |\n"
        "| 4 | Practice | 50 | 120 |\n"
    )
    path = write(str(tmp_path), "agenda.md", content)
    errors = vc.validate_agenda_file(path, 120)
    assert errors == []


def test_agenda_mismatch_detected(tmp_path):
    content = (
        "| 1 | Opening | 10 | 10 |\n"
        "| 2 | Explanation | 50 | 60 |\n"
    )
    path = write(str(tmp_path), "agenda.md", content)
    errors = vc.validate_agenda_file(path, 120)
    assert len(errors) == 1
    assert "60" in errors[0] and "120" in errors[0]


def test_agenda_no_rows_detected(tmp_path):
    path = write(str(tmp_path), "agenda.md", "no table here\n")
    errors = vc.validate_agenda_file(path, 120)
    assert any("no parseable agenda rows" in e for e in errors)


def _minimal_nb(cells):
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {},
        "cells": cells,
    }


def test_valid_notebook_passes(tmp_path):
    nb = _minimal_nb([
        {"cell_type": "markdown", "metadata": {}, "source": ["# Title"]},
        {"cell_type": "code", "metadata": {}, "source": ["print(1)"], "outputs": []},
    ])
    path = os.path.join(str(tmp_path), "session-01-instructor.ipynb")
    with open(path, "w") as f:
        json.dump(nb, f)
    assert vc.validate_notebook(path) == []


def test_notebook_wrong_nbformat_detected(tmp_path):
    nb = _minimal_nb([{"cell_type": "markdown", "metadata": {}, "source": ["x"]}])
    nb["nbformat"] = 3
    path = os.path.join(str(tmp_path), "nb.ipynb")
    with open(path, "w") as f:
        json.dump(nb, f)
    errors = vc.validate_notebook(path)
    assert any("nbformat must be 4" in e for e in errors)


def test_notebook_missing_cells_key_detected(tmp_path):
    path = os.path.join(str(tmp_path), "nb.ipynb")
    with open(path, "w") as f:
        json.dump({"nbformat": 4, "metadata": {}}, f)
    errors = vc.validate_notebook(path)
    assert any("cells" in e for e in errors)


def test_notebook_code_cell_missing_outputs_detected(tmp_path):
    nb = _minimal_nb([
        {"cell_type": "code", "metadata": {}, "source": ["1+1"]},
    ])
    path = os.path.join(str(tmp_path), "nb.ipynb")
    with open(path, "w") as f:
        json.dump(nb, f)
    errors = vc.validate_notebook(path)
    assert any("outputs" in e for e in errors)


def test_student_notebook_with_solutions_flagged(tmp_path):
    nb = _minimal_nb([
        {"cell_type": "markdown", "metadata": {}, "source": ["## Solutions\nhere"]},
    ])
    path = os.path.join(str(tmp_path), "session-01-student.ipynb")
    with open(path, "w") as f:
        json.dump(nb, f)
    errors = vc.validate_notebook(path)
    assert any("Solutions" in e for e in errors)


def test_invalid_json_notebook_detected(tmp_path):
    path = os.path.join(str(tmp_path), "nb.ipynb")
    with open(path, "w") as f:
        f.write("{not valid json")
    errors = vc.validate_notebook(path)
    assert any("not valid JSON" in e for e in errors)


def test_valid_pptx_passes(tmp_path):
    path = os.path.join(str(tmp_path), "deck.pptx")
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("[Content_Types].xml", "<Types/>")
        z.writestr("ppt/slides/slide1.xml", "<slide/>")
    assert vc.validate_pptx(path) == []


def test_pptx_missing_content_types_detected(tmp_path):
    path = os.path.join(str(tmp_path), "deck.pptx")
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("ppt/slides/slide1.xml", "<slide/>")
    errors = vc.validate_pptx(path)
    assert any("Content_Types" in e for e in errors)


def test_pptx_not_a_zip_detected(tmp_path):
    path = os.path.join(str(tmp_path), "deck.pptx")
    with open(path, "w") as f:
        f.write("not a zip file")
    errors = vc.validate_pptx(path)
    assert any("not a valid zip" in e for e in errors)


def test_parse_minutes():
    assert vc.parse_minutes("2h") == 120.0
    assert vc.parse_minutes("90m") == 90.0
    assert vc.parse_minutes(45) == 45.0
