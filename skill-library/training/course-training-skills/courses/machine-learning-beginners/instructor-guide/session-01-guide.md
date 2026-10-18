# Instructor Guide — Session 1: What Is Machine Learning?

## Teaching Focus
If time is short, protect: (1) the traditional-vs-ML distinction and (2) a
working environment for every learner. Everything else (workflow steps,
type-of-ML taxonomy detail) can be compressed; those two cannot — the rest
of the course depends on both.

## Explanation Guidance
Lead with the tax-calculator vs. spam-filter contrast before naming "machine
learning" at all — let learners feel the distinction, then attach the term.
For the ML workflow, explicitly map it to the course structure ("Session 2
is step 1, Sessions 3–5 are steps 2–3, Session 6 is all four") so it isn't
an abstract diagram but a preview of what's coming.

## Questions to Ask
- "Can anyone think of a task where writing explicit rules would be really hard?"
- "What made the pattern-recognition game hard or easy?"
- "Which of the three ML types would you use to detect spam email? Why?"

## Expected Answers
- Rules-are-hard question: correct answers include spam detection, image
  recognition, handwriting recognition, recommendation systems; partial
  answers name a task but can't say why rules would be hard (probe further);
  incorrect answers describe a task that's actually easy to rule-write
  (e.g. "check if a number is even") — gently redirect.
- Spam detection: correct = supervised (we have labeled spam/not-spam
  examples); a common partial/incorrect answer is unsupervised — correct by
  noting we *do* have historical labels, which is the deciding factor.

## Common Misconceptions
- "Machine learning means the computer thinks/understands like a human." It
  doesn't — it's pattern-matching from statistics, with no comprehension.
  Correct this explicitly and early; it recurs across the whole course if
  left unaddressed.
- "Unsupervised learning has no data, just the model guessing." It does have
  data — it just lacks labels. Distinguish "no labels" from "no data."

## Common Difficulties
- Environment setup: the `sklearn` (import) vs. `scikit-learn` (pip package
  name) naming mismatch trips up nearly every cohort — call this out
  proactively on Slide 10 before learners hit the error themselves.
- Multiple Python installations on personal laptops causing
  `ModuleNotFoundError` despite a "successful" pip install.

## Intervention Strategies
- For the "ML = understanding" misconception: ask "does the model know
  *why* red things are YES, or did it just notice red things tend to be
  YES?" — reconnects to the card game's mechanical pattern-matching.
- For setup failures: pair a stuck learner with a working neighbor rather
  than debugging solo at the front of the room while 29 others wait.

## Fast-Finisher Activity
Learners who finish the smoke test early should attempt the Extension
Challenge in `exercises/session-01-exercise.md` (printing `target_names` and
class counts) — it previews Session 3's classifier target and needs nothing
beyond what's already been taught.

## Recovery Strategy
If running behind: compress Block 4 (Types of ML + workflow, 20 min) to 12
min by cutting the reinforcement-learning example to a one-line mention
(it's definitional-only and not used again) and moving faster through
unsupervised. Do not cut Block 6 (Environment Setup) — a learner without a
working environment cannot participate in Session 2 onward.

## Transitions
- Opening → Explanation (traditional vs. ML): "Let's start with something
  you already know — writing rules."
- Explanation → Pattern-Recognition Activity: "Before I tell you what ML
  is, I want you to *be* it for five minutes."
- Activity → Types of ML/Workflow: "You just did supervised learning by
  hand — let's name what you did and see the other flavors."
- Explanation → Break: "Ten minutes — when we're back, we get our hands
  dirty with actual code."
- Break → Environment Setup: "Time to make sure everyone's toolkit works
  before we start building anything real next session."
- Setup → Exit Ticket → Recap: "Quick five questions, then let's recap
  where we've been."

## Session Recap
Learners now have: the traditional-vs-ML distinction, the three ML types
(supervised used going forward, unsupervised and reinforcement at a
conceptual level), the 4-step ML workflow as the course's spine, and a
confirmed environment. Session 2 begins step 1 of that workflow with real
data.
