# Session 1: What Is Machine Learning?

## Session Objectives
1. Explain, in plain language, what machine learning is and how it differs
   from traditional rule-based programming.
2. Name and distinguish the three main types of ML (supervised,
   unsupervised, reinforcement) with one example of each.
3. Describe the standard ML workflow (data → train → evaluate → use) and
   identify which stage a given task belongs to.
4. Have a working local (or lab) Python + Jupyter + scikit-learn + pandas
   environment confirmed by running a provided smoke-test notebook.

## Learning Outcomes
- Learners can distinguish "we wrote the rules" from "the model learned the
  rules from examples" for a given scenario.
- Learners can classify a described task as supervised, unsupervised, or
  reinforcement learning.
- Learners have a confirmed working environment for the rest of the course.

## Topics
- What machine learning is (and is not)
- Traditional programming vs. ML programming
- Types of machine learning: supervised, unsupervised, reinforcement
- The standard ML workflow
- Course tooling: Python, Jupyter, pandas, scikit-learn

## Subtopics
- What machine learning is: pattern-learning from examples vs. hand-written
  rules; why ML is used when rules are too complex/unknown to hand-write
- Types of machine learning: supervised (labeled examples → predict labels),
  unsupervised (no labels → find structure), reinforcement (learn by reward
  through interaction) — reinforcement is introduced only at a definitional
  level; not used again this course
- The standard ML workflow: collect/prepare data → choose & train a model →
  evaluate → use/deploy — framed as the spine the rest of the course follows

## Key Concepts
- **Machine learning** — a program that improves its behavior on a task by
  learning patterns from example data, rather than following rules a human
  wrote explicitly.
- **Supervised learning** — learning from examples that include the correct
  answer (label).
- **Unsupervised learning** — finding structure in data that has no labels.
- **Model** — the thing that has learned the pattern and can make
  predictions on new data.
- **Training** — the process of a model learning from example data.

## Examples
- Traditional programming example: a tax calculator (explicit rules) vs. an
  email spam filter (learned from thousands of labeled examples) —
  contrasted live.
- Supervised example: predicting house price from features.
- Unsupervised example: grouping customers by purchase behavior with no
  predefined groups.
- Reinforcement example (definitional only): a game-playing agent learning
  from win/loss reward.

## Activities
See `activities/session-01-activities.md` (Human Pattern-Recognition Game).

## Practical Exercise
See `exercises/session-01-exercise.md` (Environment Setup + Smoke Test).

## Assessment
See `assessments/session-01-assessment.md` (5-question exit ticket).

## Homework
None — Session 1 is foundational; homework begins from Session 2 onward
(light pandas practice before Session 3).

## Instructor Notes
See `instructor-guide/session-01-guide.md`.

## Required Materials
- Slide deck (`slides/session-01-slides.md` / `.pptx`)
- Printed or projected scenario cards for the pattern-recognition activity
- Smoke-test notebook (`notebooks/session-01-student.ipynb`)

## Required Tools
- Python 3.11, Jupyter (JupyterLab or VS Code notebooks), pandas,
  scikit-learn installed per the exercise's setup instructions
- Internet access for installation only (course otherwise runs offline-capable)

## Detailed Agenda
See `sessions/session-01-agenda.md` (must total exactly 120 minutes).
