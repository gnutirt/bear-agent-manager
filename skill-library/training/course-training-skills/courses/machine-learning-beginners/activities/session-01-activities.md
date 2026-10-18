## Activity: Human Pattern-Recognition Game

- **Objective:** Reinforces Session Objective 1 (ML learns patterns from
  examples rather than following hand-written rules) by having learners
  *be* the learning algorithm before any code is involved.
- **Duration:** 15 min
- **Participants:** Pairs
- **Materials:** One deck of 12 scenario cards per pair — 8 "training"
  cards, each showing a simple shape (colored, sized, labeled "YES"/"NO"
  by some hidden rule, e.g. "YES = red or large"), and 4 unlabeled "test"
  cards.
- **Instructions:**
  1. Each pair is dealt the 8 labeled training cards and told not to guess
     the rule out loud yet — just look for the pattern.
  2. After 3 minutes, pairs write down what rule they think separates
     YES from NO.
  3. Pairs are then given the 4 unlabeled test cards and predict YES/NO for
     each using their inferred rule, without being told the real rule.
  4. Instructor reveals the actual rule and the correct answers for the test
     cards.
- **Expected Outcome:** Most pairs correctly infer a reasonable rule from
  only the labeled examples, and most predictions on the unseen test cards
  are correct — demonstrating that a pattern can be learned from examples
  without being told the rule directly.
- **Debrief:** Ask: "Nobody told you the rule — how did you figure it out?"
  and "Were any of your test-card guesses wrong? What does that tell you
  about learning from limited examples?" Bridge directly into: this is
  exactly what a supervised learning model does with (data, label) pairs —
  the training cards are training data, the test cards are unseen data, the
  pair's guessed rule is the trained model.
- **Difficulty:** Easy — no prior ML/programming knowledge required; the
  point is intuition-building, not technical skill.
