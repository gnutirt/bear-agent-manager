# Exercise: Environment Setup + Smoke Test (Session 1)

## Objective
Confirm every learner has a working Python + Jupyter + pandas + scikit-learn
environment, satisfying Session Objective 4.

## Prerequisites
- Basic Python (per course prerequisites) — no ML knowledge required.

## Starting Point
Learners open the provided `notebooks/session-01-student.ipynb` in Jupyter
(local install or lab machine). The notebook contains a markdown cell with
install instructions and a code cell with import statements already written.

## Task
1. Follow the printed/projected setup instructions to install Python 3.11,
   `pip install pandas scikit-learn jupyter` (or confirm they're already
   installed on lab machines).
2. Open `session-01-student.ipynb`.
3. Run the "Imports" cell — it should execute with no errors.
4. Run the "Smoke Test" cell, which loads a tiny built-in dataset (the
   scikit-learn `iris` dataset), prints its shape, and prints the first 3
   rows as a pandas DataFrame.
5. Confirm the printed shape is `(150, 4)` and that 3 rows of data are
   displayed.

## Constraints
- Must use the exact package versions/tooling listed in the course manifest
  (`Python 3.11, pandas, scikit-learn, jupyter`) — this exercise is about
  environment parity for the rest of the course, not exploring alternatives.

## Expected Output
```
Dataset shape: (150, 4)
```
followed by a pandas DataFrame preview showing 3 rows and 4 numeric columns.

## Hints
1. If `pip install` fails, check you're using `pip3` and that Python 3.11+
   is on your PATH (`python3 --version`).
2. If Jupyter won't launch, try `python3 -m jupyter lab` instead of `jupyter lab`.
3. If the import cell errors with `ModuleNotFoundError`, the install step
   didn't target the same Python environment Jupyter is using — check
   `!which python` inside a notebook cell against your install location.

## Common Mistakes
- Installing packages for a different Python version than the one Jupyter
  is actually running (common on machines with multiple Python installs).
- Typo'ing `sklearn` vs. the pip package name `scikit-learn` (the import is
  `sklearn`, the install command is `scikit-learn`) — this trips up nearly
  every beginner at least once.
- Running cells out of order and getting a `NameError` — remind learners
  notebooks execute top-to-bottom, not by cell position on screen.

---
### INSTRUCTOR ONLY — do not distribute to students

## Solution
```python
# Imports
import pandas as pd
from sklearn.datasets import load_iris

# Smoke Test
data = load_iris()
df = pd.DataFrame(data.data, columns=data.feature_names)
print("Dataset shape:", df.shape)
print(df.head(3))
```
Expected: shape `(150, 4)`, 3 rows printed with columns `sepal length (cm)`,
`sepal width (cm)`, `petal length (cm)`, `petal width (cm)`.

## Extension Challenge
Optional, for fast finishers: print `data.target_names` and
`pd.Series(data.target).value_counts()` to see the three iris species and
how many examples of each exist in the dataset — a preview of Session 3's
classifier target.
