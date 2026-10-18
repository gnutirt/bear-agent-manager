# Session 6: End-to-End Project

*(Outline-level in this example package.)*

## Session Objectives
1. Apply the full ML workflow (prepare → train → evaluate → interpret)
   independently on a new, previously unseen dataset.
2. Choose and justify a classifier (decision tree or k-NN, scaled or not)
   based on the new dataset's characteristics.
3. Present a 3-minute summary of approach, results, and one honest
   limitation of the work.

## Learning Outcomes
- Learners complete an end-to-end classification task without step-by-step
  instructions, using only Sessions 1–5's toolkit.
- Learners can justify their modeling choices in plain language to a
  non-expert audience.

## Topics
- Independent application of: pandas data prep, train/test split, model
  training (choice of decision tree or k-NN), scaling (if applicable),
  evaluation (accuracy, confusion matrix, precision/recall as relevant)
- Communicating results simply

## Subtopics
- No new technical subtopics — this session integrates Sessions 1–5 rather
  than introducing new material (per `references/instructional-design/course-architecture.md`,
  a capstone session applies, it does not teach new content).

## Key Concepts
No new key concepts — application of all prior sessions' concepts.

## Examples
Project brief: a new small tabular dataset (e.g. a different scikit-learn
toy dataset or a small provided CSV), with the same shape of task learners
have practiced all course (predict a category from features).

## Activities
None separate from the project work itself — the project *is* the
integrative activity for this session.

## Practical Exercise
The mini-project: prepare data, split, train ≥1 classifier, evaluate,
write a 3–5 sentence summary of approach/results/limitations. Pairs or
individual, instructor's choice based on class size.

## Assessment
This session's practical work doubles as the course's summative assessment
— see `assessments/final-assessment.md`.

## Homework
None — course concludes this session.

## Instructor Notes
Full instructor guide to be generated following `skills/instructor-guide/SKILL.md`;
should include guidance for circulating during the 70-minute project block
and running lightweight 3-minute presentations for a class of 30 within the
allotted 20 minutes (e.g. a subset presents live, others submit a written
summary — instructor's call based on actual class size on the day).

## Required Materials
Project brief handout; new dataset (provided or downloaded in advance,
since `internet: true` per course manifest but not guaranteed reliable
mid-session).

## Required Tools
Python 3.11, scikit-learn, pandas, matplotlib (as in course manifest).

## Detailed Agenda
See `session-06-agenda.md` (must total exactly 120 minutes).
