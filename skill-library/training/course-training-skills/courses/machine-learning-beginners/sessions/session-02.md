# Session 2: Working With Data

*(Outline-level in this example package — full activities/exercise/notebook/
slides/assessment/instructor-guide follow the same procedure demonstrated in
full for Session 1; see `skills/session-designer/SKILL.md` etc.)*

## Session Objectives
1. Load and inspect a tabular dataset with pandas (`.info()`, `.describe()`, `.head()`).
2. Clean data: handle missing values and incorrect column types.
3. Visualize basic distributions with matplotlib.
4. Split data into train/test sets correctly using `sklearn.model_selection.train_test_split`.

## Learning Outcomes
- Learners can load a CSV, inspect it, and describe its shape/quality issues.
- Learners can handle at least one missing-value strategy and justify the choice.
- Learners can produce a basic histogram/scatter plot from a DataFrame.
- Learners can correctly split data before any model touches it (no leakage).

## Topics
- pandas DataFrame basics: loading, inspecting, indexing
- Data cleaning: missing values, dtypes
- Basic visualization with matplotlib
- Train/test splitting and why it must happen before modeling

## Subtopics
- Loading/inspecting: `pd.read_csv`, `.shape`, `.info()`, `.describe()`, `.head()`
- Cleaning: `.isna().sum()`, `.dropna()` vs. `.fillna()` trade-offs, `.astype()`
- Visualization: `.hist()`, simple scatter plots, when a plot reveals a data problem
- Train/test split: why splitting before modeling prevents the model from
  "cheating" by seeing test data during training (builds on Session 1's ML workflow)

## Key Concepts
- **Missing value** — a cell with no recorded data; must be handled before modeling.
- **Train/test split** — dividing data so the model is evaluated on data it never trained on.
- **Data leakage** — when information from test data influences training, inflating evaluation results.

## Examples
- A real small dataset with a few missing values and one wrong dtype (e.g. a
  numeric column stored as text) inspected live.

## Activities
Spot-the-Dirty-Data card game (pattern: error analysis) — pairs are given a
printed DataFrame excerpt and spot which rows/columns have problems before
touching code.

## Practical Exercise
Load, inspect, clean, and visualize a provided dataset; perform a correct
train/test split.

## Assessment
5-item knowledge check (mirrors Session 1's exit-ticket format).

## Homework
Light pandas practice: explore one new dataset column on your own before
Session 3 (ungraded).

## Instructor Notes
Full instructor guide to be generated following `skills/instructor-guide/SKILL.md`.

## Required Materials
Printed dirty-data cards; provided CSV dataset.

## Required Tools
Python 3.11, pandas, matplotlib, scikit-learn (as in course manifest).

## Detailed Agenda
See `session-02-agenda.md` (must total exactly 120 minutes).
