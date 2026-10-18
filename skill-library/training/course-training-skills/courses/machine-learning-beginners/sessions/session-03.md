# Session 3: Your First Classifier

*(Outline-level in this example package.)*

## Session Objectives
1. Explain, at an intuitive level, how a decision tree makes a prediction
   (a sequence of yes/no splits).
2. Train a decision tree classifier with scikit-learn on the iris dataset
   (introduced in Session 1's environment smoke test).
3. Evaluate the trained model using accuracy and a confusion matrix.
4. Interpret a confusion matrix to identify which classes the model
   confuses.

## Learning Outcomes
- Learners can describe a decision tree's prediction process without code.
- Learners can call `.fit()` / `.predict()` on a scikit-learn classifier.
- Learners can compute and read `accuracy_score` and `confusion_matrix`.
- Learners can point to a specific confusion-matrix cell and explain what
  error it represents.

## Topics
- Decision trees: how they split, what a "leaf" prediction means
- The scikit-learn fit/predict pattern
- Accuracy as a metric and its limits
- Confusion matrices

## Subtopics
- Decision trees: root/split/leaf vocabulary, Gini/entropy mentioned only
  at a "the tree picks the split that best separates classes" level — no
  formula derivation, this is a Beginner course
- fit/predict: `X_train, y_train` in, `.fit()`, `.predict(X_test)` out —
  reusing Session 2's train/test split directly
- Accuracy: correct predictions / total predictions; when it's misleading
  (imbalanced classes — mentioned, not deeply explored here)
- Confusion matrix: rows = actual, columns = predicted, reading off-diagonal
  cells as specific error types

## Key Concepts
- **Decision tree** — a model that predicts by asking a sequence of yes/no
  questions about the input's features.
- **Accuracy** — the fraction of predictions the model got right.
- **Confusion matrix** — a table showing predicted vs. actual class counts.

## Examples
- The iris dataset (from Session 1) as the running example: predicting
  species from 4 measurements.

## Activities
Human Decision Tree game — learners act out a small decision tree by hand
on paper index cards before any code, reusing the pattern-recognition
mechanic from Session 1 at a deeper level.

## Practical Exercise
Train a `DecisionTreeClassifier` on the iris train split (from Session 2),
predict on the test split, compute accuracy and a confusion matrix,
interpret the results.

## Assessment
5-item knowledge check plus a short applied item (read a provided confusion
matrix and answer 2 interpretation questions).

## Homework
None additional beyond finishing the practical if not completed in session.

## Instructor Notes
Full instructor guide to be generated following `skills/instructor-guide/SKILL.md`.

## Required Materials
Paper index cards for the tree activity; iris dataset (already available
from Session 1).

## Required Tools
Python 3.11, scikit-learn, pandas (as in course manifest).

## Detailed Agenda
See `session-03-agenda.md` (must total exactly 120 minutes).
