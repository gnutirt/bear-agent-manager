#!/usr/bin/env python3
"""
One-off generator for the Session 1 example notebooks. Not part of the
runtime skill (notebook-designer builds these live, per session, from its
own procedure) — this script exists only to produce a concrete, valid
worked example for examples/ and courses/machine-learning-beginners/.
"""
import json
import copy

NBFORMAT = {
    "nbformat": 4,
    "nbformat_minor": 5,
    "metadata": {
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3",
        },
        "language_info": {"name": "python", "version": "3.11"},
    },
}


def md(text):
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": text.splitlines(keepends=True),
    }


def code(text):
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": text.splitlines(keepends=True),
    }


student_cells = [
    md("# Session 1 — What Is Machine Learning?\n\n"
       "**Learning Objectives**\n"
       "- Confirm your Python + Jupyter + pandas + scikit-learn environment works\n"
       "- See a real dataset loaded as a pandas DataFrame for the first time\n"),
    md("## Environment Setup\n\n"
       "Before running the cells below, install the required packages "
       "(skip if using a pre-configured lab machine):\n\n"
       "```bash\n"
       "pip install pandas scikit-learn jupyter\n"
       "```\n"),
    md("## Imports"),
    code("import pandas as pd\n"
         "from sklearn.datasets import load_iris\n"),
    md("## Instructor Demonstration\n\n"
       "The cell below loads the classic `iris` dataset (150 flowers, "
       "4 measurements each) and shows it as a pandas DataFrame — the "
       "format we'll use for the rest of the course."),
    code("data = load_iris()\n"
         "df = pd.DataFrame(data.data, columns=data.feature_names)\n"
         "print(\"Dataset shape:\", df.shape)\n"
         "df.head(3)\n"),
    md("## Guided Exercise — Smoke Test\n\n"
       "Confirm the printed shape above is `(150, 4)` and that 3 rows are "
       "displayed. If you saw an error instead, see the Hints in "
       "`exercises/session-01-exercise.md` before continuing."),
    md("## TODO\n\n"
       "Complete the cell below to print the **column names** of `df` "
       "(hint: DataFrames have a `.columns` attribute)."),
    code("# TODO: print the column names of df\n"
         "raise NotImplementedError(\"Print df.columns here\")\n"),
    md("## Practice Task\n\n"
       "Using `df.describe()`, find the minimum and maximum "
       "`petal length (cm)` in the dataset. Write your answer as a comment "
       "in the cell below."),
    code("# Practice: use df.describe() to find min/max petal length (cm)\n"
         "# Your answer (as a comment): min = ____, max = ____\n"),
    md("## Challenge Task (optional)\n\n"
       "Print `data.target_names` and `pd.Series(data.target).value_counts()` "
       "to see the three species this dataset contains and how many examples "
       "of each there are. We'll use this again in Session 3."),
    code("# Challenge (optional)\n"),
    md("## Reflection Questions\n\n"
       "1. What's the difference between the DataFrame `df` and the "
       "original `data` object returned by `load_iris()`?\n"
       "2. Why might a machine learning course start with loading data "
       "before writing any model code?\n"),
]

instructor_cells = copy.deepcopy(student_cells)

# Fill in the TODO cell (index of the TODO code cell in the list above)
for i, cell in enumerate(instructor_cells):
    src = "".join(cell["source"])
    if "TODO: print the column names" in src:
        instructor_cells[i] = code("# TODO: print the column names of df\n"
                                    "print(df.columns)\n")
    if "Practice: use df.describe()" in src:
        instructor_cells[i] = code(
            "# Practice: use df.describe() to find min/max petal length (cm)\n"
            "print(df.describe())\n"
            "# min = 1.0, max = 6.9\n"
        )
    if src.strip() == "# Challenge (optional)":
        instructor_cells[i] = code(
            "# Challenge (optional)\n"
            "print(data.target_names)\n"
            "print(pd.Series(data.target).value_counts())\n"
        )

instructor_cells.append(md(
    "## Solutions\n\n"
    "```python\n"
    "# TODO cell\n"
    "print(df.columns)\n\n"
    "# Practice Task\n"
    "print(df.describe())\n"
    "# petal length (cm): min = 1.0, max = 6.9\n\n"
    "# Challenge Task\n"
    "print(data.target_names)\n"
    "print(pd.Series(data.target).value_counts())\n"
    "```\n\n"
    "**Common wrong turns to watch for:** learners printing `data.columns` "
    "instead of `df.columns` (the raw sklearn Bunch object has no `.columns` "
    "attribute) — this is the same `sklearn` vs. `scikit-learn` naming "
    "confusion flagged in the exercise's Common Mistakes.\n"
))

student_nb = dict(NBFORMAT)
student_nb["cells"] = student_cells
instructor_nb = dict(NBFORMAT)
instructor_nb["cells"] = instructor_cells

with open("courses/machine-learning-beginners/notebooks/session-01-student.ipynb", "w") as f:
    json.dump(student_nb, f, indent=1)

with open("courses/machine-learning-beginners/notebooks/session-01-instructor.ipynb", "w") as f:
    json.dump(instructor_nb, f, indent=1)

print("Wrote session-01-student.ipynb and session-01-instructor.ipynb")
