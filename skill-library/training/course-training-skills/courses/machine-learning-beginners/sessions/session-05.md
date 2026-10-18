# Session 5: Improving Your Model

*(Outline-level in this example package.)*

## Session Objectives
1. Explain why feature scaling matters for distance-based models like k-NN
   (and why decision trees don't need it).
2. Apply `StandardScaler` and retrain k-NN, observing the effect on accuracy.
3. Perform a basic hyperparameter search (varying `k`) and pick a
   better-performing value using held-out data, not test data.
4. Read a precision/recall trade-off in a real-world framing (false
   positives vs. false negatives).

## Learning Outcomes
- Learners can explain, in one sentence, why unscaled features distort
  distance-based predictions.
- Learners can apply `StandardScaler` correctly (fit on train, transform
  both train and test).
- Learners can describe what a false positive and false negative mean in a
  concrete scenario (e.g. medical screening) and why the "right" trade-off
  depends on context.

## Topics
- Feature scaling
- Hyperparameter tuning (basic)
- Precision and recall

## Subtopics
- Scaling: why k-NN's distance calculation is sensitive to feature scale;
  decision trees split on thresholds per feature independently, so they
  don't need it — direct callback to Session 4's model comparison
- Tuning: trying multiple `k` values and comparing performance without
  touching the test set (validation-style thinking, introduced simply)
- Precision/recall: precision = "of predicted positives, how many were
  right"; recall = "of actual positives, how many did we catch"; framed via
  a concrete false-positive/false-negative scenario, not formulas first

## Key Concepts
- **Feature scaling** — transforming features to a common scale so no
  feature dominates a distance calculation purely due to its units/range.
- **Hyperparameter** — a setting chosen before training (like `k` in k-NN)
  rather than learned from data.
- **Precision** — of everything predicted positive, the fraction that was
  actually positive.
- **Recall** — of everything actually positive, the fraction the model caught.

## Examples
- A feature-scale mismatch shown concretely (e.g. two features on very
  different numeric ranges) before/after scaling, with k-NN accuracy
  compared.
- A precision/recall scenario: a spam filter (false positive = a real
  email marked spam) vs. a disease screening test (false negative = a sick
  patient marked healthy) to show the trade-off depends on context.

## Activities
Precision/Recall Scenario Matching game — learners match short scenario
descriptions to "prioritize precision" or "prioritize recall" and justify why.

## Practical Exercise
Apply `StandardScaler` to the iris features, retrain k-NN, compare to the
unscaled version from Session 4; try 3 values of `k` and pick the best
using a validation approach; compute precision and recall on the final
model.

## Assessment
5-item knowledge check including one applied item: given a scenario,
choose whether to prioritize precision or recall.

## Homework
None additional — Session 6 is independent project work.

## Instructor Notes
Full instructor guide to be generated following `skills/instructor-guide/SKILL.md`.

## Required Materials
Precision/recall scenario cards.

## Required Tools
Python 3.11, scikit-learn, pandas (as in course manifest).

## Detailed Agenda
See `session-05-agenda.md` (must total exactly 120 minutes).
