# Session 4: Comparing Models

*(Outline-level in this example package.)*

## Session Objectives
1. Explain how k-nearest neighbors (k-NN) makes a prediction.
2. Train a k-NN classifier and compare its accuracy to Session 3's decision
   tree on the same train/test split.
3. Describe overfitting and underfitting intuitively, using observed model
   behavior rather than formal derivation.
4. Give a plain-language description of the bias/variance trade-off.

## Learning Outcomes
- Learners can describe k-NN's "look at the closest neighbors" logic.
- Learners can train and evaluate a second classifier and compare metrics
  head-to-head with the first.
- Learners can recognize signs of overfitting (great train accuracy, poor
  test accuracy) vs. underfitting (poor on both) from real output.

## Topics
- k-nearest neighbors classification
- Overfitting vs. underfitting
- Bias/variance trade-off (intuitive framing only)

## Subtopics
- k-NN: distance to nearest `k` training points, majority vote; effect of
  changing `k` (previewed here, tuned properly in Session 5)
- Overfitting/underfitting: a model too complex for the data vs. too simple;
  shown via train-accuracy vs. test-accuracy comparison, not a learning-curve plot
- Bias/variance: "biased = consistently wrong in the same way, high
  variance = wildly different results on different data" — plain language,
  no formal math

## Key Concepts
- **k-nearest neighbors (k-NN)** — a model that predicts by majority vote
  among the `k` closest training examples.
- **Overfitting** — a model that memorizes training data and performs
  worse on new data.
- **Underfitting** — a model too simple to capture the pattern, performing
  poorly on both training and new data.

## Examples
- Same iris dataset, same train/test split as Session 3, for a fair
  head-to-head comparison.

## Activities
Overfit/Underfit Sorting Game — learners are shown several (fabricated)
train-vs-test accuracy pairs and sort them into "overfit / underfit /
good fit" categories.

## Practical Exercise
Train a `KNeighborsClassifier` on the same split as Session 3; compare
accuracy and confusion matrix to the decision tree; try 2–3 different `k`
values and observe the effect (sets up Session 5's tuning).

## Assessment
5-item knowledge check including one item asking learners to classify a
given train/test accuracy pair as overfit, underfit, or good fit.

## Homework
None additional.

## Instructor Notes
Full instructor guide to be generated following `skills/instructor-guide/SKILL.md`.

## Required Materials
Overfit/underfit sorting cards (fabricated accuracy pairs).

## Required Tools
Python 3.11, scikit-learn, pandas (as in course manifest).

## Detailed Agenda
See `session-04-agenda.md` (must total exactly 120 minutes).
