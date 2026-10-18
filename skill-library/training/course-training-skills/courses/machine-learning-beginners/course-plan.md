# Machine Learning — Course Plan

## Course Overview
A 12-hour introduction to machine learning for university students with basic
Python experience and no prior ML background. Learners move from "what is
ML and why does it work" through supervised learning fundamentals to a small
end-to-end classification project, using scikit-learn on tabular data
throughout.

## Audience
University students

## Level
Beginner

## Duration
12 hours across 6 sessions of 2 hours each

## Learning Objectives
1. Explain what machine learning is, how it differs from traditional
   programming, and when it is (and isn't) an appropriate tool.
2. Prepare and explore a tabular dataset using pandas (cleaning, basic
   visualization, train/test splitting).
3. Train and evaluate a supervised classification model using scikit-learn,
   and correctly interpret accuracy, precision, recall, and a confusion
   matrix.
4. Compare at least two classification algorithms (decision trees and
   k-nearest neighbors) and explain the bias/variance and overfitting
   trade-offs between them.
5. Apply feature scaling and basic hyperparameter tuning to improve a
   model's performance.
6. Build and present a small end-to-end classification project on a new
   dataset, including data prep, modeling, evaluation, and a short summary
   of findings.

## Prerequisites
- Basic Python (variables, functions, loops, lists/dicts) — no ML or
  statistics background assumed.
- A laptop capable of running Python/Jupyter locally, or lab access.

## Course Outcomes
By the end, a learner can take a new small tabular dataset, prepare it,
train a baseline classifier, evaluate it honestly, and explain their results
and choices to a non-expert.

## Course Structure
| Session | Title | Focus |
|---|---|---|
| 1 | What Is Machine Learning? | ML vs. traditional programming, types of ML, the ML workflow, environment setup |
| 2 | Working With Data | pandas basics, data cleaning, exploration, visualization, train/test split |
| 3 | Your First Classifier | Decision trees, training/predicting, accuracy, confusion matrix |
| 4 | Comparing Models | k-nearest neighbors, overfitting vs. underfitting, bias/variance intuition |
| 5 | Improving Your Model | Feature scaling, basic hyperparameter tuning, precision/recall trade-offs |
| 6 | End-to-End Project | Independent mini-project applying Sessions 1–5 on a new dataset, presentations |

## Session-by-Session Plan
### Session 1: What Is Machine Learning?
Grounds the whole course: what ML is, the standard workflow (data → model →
evaluation), and getting every learner's environment working. Full detail:
`sessions/session-01.md`.

### Session 2: Working With Data
pandas fundamentals applied to a real small dataset; the "garbage in, garbage
out" principle; splitting data correctly. Full detail: `sessions/session-02.md`
(outline-level in this example package).

### Session 3: Your First Classifier
Decision trees end-to-end: train, predict, evaluate with accuracy and a
confusion matrix. Full detail: `sessions/session-03.md` (outline-level).

### Session 4: Comparing Models
k-NN alongside decision trees; introduces overfitting/underfitting and
bias/variance intuitively via observed behavior, not heavy math. Full detail:
`sessions/session-04.md` (outline-level).

### Session 5: Improving Your Model
Feature scaling (why k-NN needs it, trees don't), a first pass at
hyperparameter tuning, and reading precision/recall trade-offs for a
real-world framing (e.g. false positives vs. false negatives). Full detail:
`sessions/session-05.md` (outline-level).

### Session 6: End-to-End Project
Learners apply Sessions 1–5 independently or in pairs on a new dataset, then
give a 3-minute summary. Full detail: `sessions/session-06.md` (outline-level).

## Assessment Strategy
Primarily formative: a short knowledge check and a hands-on exercise each
session (Sessions 1–5), building toward one summative deliverable — the
Session 6 mini-project and presentation, which integrates every course
objective. No high-stakes exam; the project is the capstone measure.

## Final Project
A small end-to-end classification project (Session 6): learners choose or
are given a new small tabular dataset, prepare it, train and evaluate at
least one classifier, and present a 3-minute summary of their approach and
results. Rubric: `assessments/final-assessment.md`.
