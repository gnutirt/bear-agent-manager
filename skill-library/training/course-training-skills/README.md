# Course Training Skills

A modular Claude Skills toolkit for designing complete training courses from course requirements to instructor-ready materials.

The project is designed primarily for Claude and Claude Code.

The architecture should remain scalable for future support of other AI agents.

---

# 1. Project Purpose

Course Training Skills helps an instructor transform a small set of course requirements into a complete training package.

Typical input:

- Course name
- Audience
- Level
- Total duration
- Number of sessions
- Session duration

The system can generate:

- Course overview
- Learning objectives
- Prerequisites
- Course structure
- Session plans
- Detailed timed agendas
- Training activities
- Training games
- Practical exercises
- Assessments
- Instructor notes
- Jupyter notebooks when practical work benefits from them
- Slide content
- Editable PowerPoint presentations
- Course review

The system is modular.

It must not be implemented as one giant skill.

The architecture should use:

- Specialized skills
- Shared references
- Templates
- Configuration
- Course state
- Course manifests
- Tests
- Evaluations
- Scripts
- Examples

---

# 2. Core Principle

The course design is the source of truth.

All generated artifacts must remain consistent with the approved course structure.

The dependency relationship is:

Course Objectives
→ Session Objectives
→ Topics
→ Explanation
→ Activities
→ Practical Work
→ Notebook
→ Slides
→ Assessment
→ Instructor Guide

If an upstream artifact changes, identify downstream artifacts that may need to change.

Do not blindly regenerate the entire course.

---

# 3. Primary Use Case

The main use case is an instructor creating a complete course.

Example:

```text
Create a Machine Learning course.

Audience: University students
Level: Beginner
Duration: 12 hours
Sessions: 6
Session duration: 2 hours
```

The system should be able to infer reasonable missing information.

Do not ask unnecessary questions.

Ask for clarification only when missing information would materially affect the course design.

---

# 4. Input Model

Minimum required information:

- Course name
- Audience
- Level
- Duration
- Number of sessions
- Session duration

Optional information:

- Learning goals
- Prerequisites
- Delivery mode
- Class size
- Programming language
- Technology stack
- Available tools
- Available hardware
- Internet availability
- Existing materials
- Teaching preferences
- Assessment requirements
- Final project requirements

The system must adapt when optional constraints are provided.

---

# 5. Workflow Modes

The system supports two modes.

## Interactive Mode

Interactive mode is the default.

The workflow uses approval checkpoints.

```text
Requirements
    ↓
Course Architecture
    ↓
User Approval
    ↓
Session Design
    ↓
User Approval
    ↓
Activities + Practical Work
    ↓
Notebook Decision
    ↓
Notebook Generation
    ↓
Slide Content
    ↓
Presentation Design
    ↓
Assessment
    ↓
Instructor Guide
    ↓
Course Review
    ↓
Final Package
```

The instructor should be able to modify the design before downstream artifacts are generated.

## Full Mode

The user can request autonomous execution.

Example:

```text
/create-course --full
```

In full mode:

- Do not wait for approval.
- Execute the full workflow.
- Still validate each phase.
- Maintain course consistency.

---

# 6. Repository Architecture

Recommended structure:

```text
course-training-skills/
│
├── .claude-plugin/
│   └── plugin.json
│
├── skills/
│   ├── course-designer/
│   │   └── SKILL.md
│   ├── course-outline/
│   │   └── SKILL.md
│   ├── session-designer/
│   │   └── SKILL.md
│   ├── activity-designer/
│   │   └── SKILL.md
│   ├── practical-work/
│   │   └── SKILL.md
│   ├── notebook-designer/
│   │   └── SKILL.md
│   ├── slide-designer/
│   │   └── SKILL.md
│   ├── assessment-designer/
│   │   └── SKILL.md
│   ├── instructor-guide/
│   │   └── SKILL.md
│   └── course-reviewer/
│       └── SKILL.md
│
├── references/
│   ├── instructional-design/
│   ├── activities/
│   ├── practical-learning/
│   ├── notebooks/
│   ├── slides/
│   ├── assessment/
│   ├── instructor/
│   ├── adaptation/
│   └── quality/
│
├── templates/
├── config/
├── examples/
├── evals/
├── tests/
├── scripts/
│
├── README.md
├── CLAUDE.md
├── SKILL.md
└── LICENSE
```

The exact structure may evolve.

Do not add complexity without a reason.

---

# 7. Skills

The project contains ten core skills:

```text
course-designer
course-outline
session-designer
activity-designer
practical-work
notebook-designer
slide-designer
assessment-designer
instructor-guide
course-reviewer
```

Each skill must have one clear responsibility.

Do not duplicate responsibilities.

---

# 8. course-designer

`course-designer` is the main orchestrator.

Responsibilities:

- Parse user requirements
- Create course state
- Create course manifest
- Determine workflow
- Invoke specialized skills
- Manage approval checkpoints
- Track dependencies
- Trigger downstream updates
- Maintain consistency
- Support interactive mode
- Support full mode
- Run final quality review

It should orchestrate specialized skills instead of duplicating their logic.

---

# 9. course-outline

Responsible for high-level course architecture.

Output:

```text
Course Overview
Learning Objectives
Prerequisites
Course Outcomes
Course Structure
Session-by-Session Plan
Assessment Strategy
Final Project
```

It determines what should be taught.

It should not generate detailed notebooks or presentations.

---

# 10. session-designer

Responsible for detailed session design.

Every session should include:

```text
Session Number
Session Title
Session Objectives
Learning Outcomes
Topics
Subtopics
Key Concepts
Examples
Activities
Practical Exercise
Assessment
Homework
Instructor Notes
Required Materials
Required Tools
Detailed Agenda
```

The session must contribute to one or more course objectives.

---

# 11. activity-designer

Responsible for learning activities and training games.

Select activities based on:

```text
Topic
Audience
Level
Class Size
Session Duration
Delivery Mode
Learning Objective
```

Possible activities:

```text
Icebreakers
Knowledge Checks
Team Competitions
Guessing Games
Debugging Challenges
Case Studies
Role Play
Build Challenges
Scenario Challenges
Quizzes
Think-Pair-Share
Problem Solving
Concept Mapping
Prediction Activities
Error Analysis
Mini Projects
Review Games
```

Every activity must have a learning purpose.

For each activity provide:

```text
Name
Objective
Duration
Participants
Materials
Instructions
Expected Outcome
Debrief
Difficulty
```

Do not add activities simply to make the course look interactive.

---

# 12. practical-work

Responsible for practical exercises.

Possible formats:

```text
Coding
Data Analysis
Debugging
Configuration
System Design
API Usage
Model Building
Experiments
Case Analysis
Tool Usage
Mini Projects
```

Each exercise should contain:

```text
Objective
Prerequisites
Starting Point
Task
Constraints
Expected Output
Hints
Common Mistakes
Solution
Extension Challenge
```

Student instructions and instructor solutions must remain separate.

---

# 13. notebook-designer

Determine whether a notebook materially improves the learning experience.

Generate notebooks when practical work benefits from executable material.

Examples:

```text
Machine Learning experiment → YES
Data Analysis → YES
Deep Learning experiment → YES
Python syntax lecture → MAYBE
System Design lecture → NO
Soft Skills → NO
```

Preferred format:

```text
.ipynb
```

Possible structure:

```text
Title
Learning Objectives
Environment Setup
Imports
Dataset/Input Preparation
Concept Explanation
Instructor Demonstration
Guided Exercise
TODO Sections
Practice Tasks
Challenge Task
Expected Outputs
Reflection Questions
Solutions
```

When useful, generate:

```text
session-01-student.ipynb
session-01-instructor.ipynb
```

The notebook must match the corresponding session.

Do not introduce unexplained concepts.

---

# 14. slide-designer

Responsible for instructional slide content and presentation generation.

## Stage 1

Generate slide specifications.

Each slide should contain:

```text
Slide Number
Title
Purpose
Main Content
Visual Recommendation
Speaker Notes
Interaction
```

Slides should support:

```text
Concepts
Visual Explanations
Examples
Diagrams
Definitions
Processes
Comparisons
Questions
Instructions
Exercises
Recaps
```

Avoid text-heavy slides.

Do not simply copy instructor notes.

## Stage 2

Use the available presentation/design capability to generate the actual PowerPoint.

The slide skill is responsible for instructional content.

The presentation/design capability is responsible for visual design.

The result must be an actual editable `.pptx`.

Do not flatten the entire presentation into images.

Keep editable:

```text
Text
Shapes
Diagrams
Tables
Charts
Code Blocks
Layout Elements
```

where supported.

Images may remain images.

---

# 15. assessment-designer

Responsible for assessments.

Possible formats:

```text
Diagnostic Assessment
Knowledge Checks
Multiple Choice
Short Answer
Practical Exercises
Debugging Tasks
Case Studies
Projects
Presentations
Exit Tickets
Homework
Final Assessment
```

Every assessment must map to a learning objective.

Each assessment should define:

```text
Objective
Format
Instructions
Expected Answer/Result
Evaluation Criteria
```

Do not assess concepts that were not taught.

---

# 16. instructor-guide

Responsible for instructor-facing guidance.

For every session:

```text
Teaching Focus
Explanation Guidance
Questions to Ask
Expected Answers
Common Misconceptions
Common Difficulties
Intervention Strategies
Fast-Finisher Activity
Recovery Strategy
Transitions
Session Recap
```

The instructor should be able to deliver the session without redesigning it.

---

# 17. course-reviewer

Responsible for quality assurance.

Review:

```text
Course Scope
Learning Objectives
Coverage
Session Sequencing
Timing
Difficulty
Activities
Practical Work
Assessments
Slides
Notebooks
Instructor Guide
Consistency
```

The reviewer should detect contradictions.

Example:

```text
Session 4 teaches Decision Trees.

Notebook uses XGBoost.

Assessment tests XGBoost.

XGBoost is not taught.

The reviewer must flag this.
```

When possible, fix the issue instead of only reporting it.

---

# 18. Course State

Every course should maintain a central state.

Example:

```yaml
course:
  id:
  name:
  audience:
  level:
  duration:
  sessions:
  session_duration:

delivery:
  mode:
  class_size:
  internet:
  hardware:
  software:

objectives: []

sessions: []

activities: []

exercises: []

notebooks: []

slides: []

assessments: []

instructor_notes: []

constraints: []

research:
  enabled: false

status:
  outline: pending
  sessions: pending
  activities: pending
  practical_work: pending
  notebooks: pending
  slides: pending
  assessments: pending
  instructor_guide: pending
  review: pending
```

The exact implementation can evolve.

The concept must remain.

---

# 19. Course Manifest

Each course should have a central manifest.

Example:

```yaml
course:
  id: machine-learning-beginners
  name: Machine Learning
  audience: University Students
  level: Beginner

schedule:
  total_hours: 12
  sessions: 6
  session_duration: 2h

delivery:
  mode: offline

artifacts:
  slides: true
  notebooks: auto
  assessments: true
  instructor_guide: true

research:
  enabled: false

status:
  outline: approved
  sessions: approved
  activities: in_progress
  notebooks: pending
  slides: pending
  assessments: pending
  review: pending
```

---

# 20. Timing Rules

The system must validate time.

Example:

```text
6 sessions × 2 hours = 12 hours
```

Every agenda must exactly match the session duration.

For:

```text
Session duration = 120 minutes
```

the agenda must total:

```text
120 minutes
```

Agenda components may include:

```text
Opening
Review
Explanation
Activity
Practice
Break
Assessment
Recap
```

Use only components appropriate to the topic.

Do not use the same agenda structure for every session.

---

# 21. Adaptation

The system must support changes to course constraints.

Examples:

```text
6 sessions → 4 sessions
2 hours → 90 minutes
Beginner → Intermediate
Offline → Online
Internet available → Internet unavailable
```

Identify affected artifacts.

Example:

```text
Requirement Change
↓
Course Structure
↓
Affected Sessions
↓
Agendas
↓
Activities
↓
Exercises
↓
Notebooks
↓
Slides
↓
Assessments
```

Do not regenerate unrelated artifacts.

---

# 22. Research

Research is OFF by default.

Research becomes ON when:

- The user asks for latest information.
- The topic is current.
- The technology changes frequently.
- The course requires external references.
- The user explicitly requests sources.

When research is enabled:

- Prefer authoritative sources.
- Prefer official documentation for technical subjects.
- Prefer primary sources.
- Record sources.
- Record research date.
- Distinguish current information from static knowledge.

Do not browse unnecessarily.

---

# 23. Configuration

Instructor-specific preferences belong in:

```text
config/
├── instructor-profile.md
├── teaching-preferences.md
├── presentation-style.md
└── defaults.yaml
```

Do not hardcode personal preferences inside core skills.

Example:

```yaml
instructor:
  name:

defaults:
  research: false
  generate_notebook_when_useful: true
  generate_slides: true
  create_instructor_notes: true
  include_assessments: true

workflow:
  mode: interactive
  require_course_approval: true
  require_session_approval: true

output:
  create_real_files: true
```

---

# 24. Presentation Design System

Presentation design should be configurable.

Possible settings:

```text
Typography
Color System
Spacing
Layout
Visual Density
Diagram Style
Code Block Style
Chart Style
Title Style
Footer
Branding
```

The default style should live in:

```text
config/presentation-style.md
```

The instructional content must remain separate from visual design.

---

# 25. References

Shared knowledge belongs in:

```text
references/
├── instructional-design/
│   ├── learning-objectives.md
│   ├── course-architecture.md
│   └── learning-progression.md
│
├── activities/
│   ├── activity-patterns.md
│   └── training-games.md
│
├── practical-learning/
│   └── practical-exercises.md
│
├── notebooks/
│   └── notebook-patterns.md
│
├── slides/
│   └── slide-patterns.md
│
├── assessment/
│   └── assessment-patterns.md
│
├── instructor/
│   └── instructor-guidance.md
│
├── adaptation/
│   └── adaptation-rules.md
│
└── quality/
    └── quality-standards.md
```

Do not duplicate shared knowledge across skills.

---

# 26. Templates

Templates define output structure.

Recommended:

```text
templates/
├── course-template.md
├── session-template.md
├── agenda-template.md
├── activity-template.md
├── exercise-template.md
├── notebook-template.md
├── slide-template.md
├── assessment-template.md
├── instructor-guide-template.md
└── course-review-template.md
```

---

# 27. Commands

The system should support:

```text
/create-course
/course-outline
/create-session
/create-agenda
/create-activities
/create-exercise
/create-notebook
/create-slides
/create-assessment
/create-instructor-guide
/review-course
/adapt-course
```

The exact runtime implementation can vary.

The conceptual command interface should remain stable.

---

# 28. Output Structure

Generated courses should use:

```text
courses/
└── machine-learning-beginners/
    ├── course-manifest.yaml
    ├── course-plan.md
    ├── sessions/
    ├── activities/
    ├── exercises/
    ├── notebooks/
    ├── slides/
    ├── assessments/
    ├── instructor-guide/
    └── review/
```

---

# 29. Approval System

Interactive mode should use meaningful approval checkpoints.

```text
Requirements
↓
Course Outline
↓
APPROVAL

Session Design
↓
APPROVAL

Activities + Practical Work
↓
APPROVAL

Notebooks + Slides
↓
APPROVAL if needed

Assessment + Instructor Guide
↓
Quality Review
```

Do not ask for approval after every small operation.

---

# 30. Dependency Management

When an upstream component changes:

1. Identify affected downstream components.
2. Regenerate only affected components.
3. Preserve unaffected work.
4. Run consistency checks.

Example:

```text
Session 3 changes
↓
Agenda 3
Activity 3
Exercise 3
Notebook 3
Slides 3
Assessment items mapped to Session 3
Instructor Guide 3
```

Do not rebuild unrelated sessions.

---

# 31. File Generation

The system should generate real files.

Supported formats:

```text
Markdown → .md
Notebook → .ipynb
Presentation → .pptx
Configuration → .yaml
```

Do not represent requested files as plain text when an actual artifact is required.

---

# 32. Open Source Strategy

The project is primarily optimized for the author's own workflow.

However, it is intentionally open source.

Other instructors should be able to:

1. Fork the repository.
2. Replace configuration.
3. Modify templates.
4. Modify references.
5. Add new skills.
6. Change presentation style.
7. Change workflow behavior.

Do not hardcode personal information into core skills.

---

# 33. Examples

The repository should contain at least one complete example.

Recommended:

```text
examples/
├── machine-learning/
├── python/
└── data-science/
```

The first complete example should use:

```text
Course:
Machine Learning

Audience:
University students

Level:
Beginner

Duration:
12 hours

Sessions:
6

Session duration:
2 hours
```

---

# 34. Evaluation

Create evaluations for:

```text
Course Design
Session Design
Agenda
Activities
Practical Work
Notebooks
Slides
Assessments
```

Evaluate:

```text
Correctness
Consistency
Timing
Learning Objective Alignment
Audience Appropriateness
Level Appropriateness
Artifact Quality
Adaptation Behavior
```

---

# 35. Tests

Tests should validate deterministic behavior.

At minimum:

```text
Manifest validation
Duration calculation
Agenda timing
Required fields
Dependency detection
State updates
Configuration loading
Output structure
```

---

# 36. Scripts

Scripts should support deterministic validation and maintenance.

Potential:

```text
scripts/
├── validate_course.py
├── validate_manifest.py
└── check_structure.py
```

Do not move instructional reasoning into scripts unless required.

---

# 37. Quality Standards

The final course must pass:

- Scope check
- Objective check
- Coverage check
- Sequencing check
- Timing check
- Activity purpose check
- Practical alignment check
- Assessment alignment check
- Difficulty check
- Slide alignment check
- Notebook alignment check
- Instructor guide alignment check
- Cross-artifact consistency check

---

# 38. What the System Must Not Do

Do not:

- Build one giant skill.
- Duplicate instructional knowledge.
- Generate activities without educational purpose.
- Generate notebooks without practical value.
- Generate slides by copying the course outline.
- Assess concepts that were not taught.
- Use the same agenda for every session.
- Browse unnecessarily.
- Regenerate the entire course after a small change.
- Flatten PowerPoint slides into images.
- Hardcode personal preferences into core skills.
- Ask unnecessary clarification questions.
- Claim an artifact works without testing it.

---

# 39. Future Extensions

The architecture should allow future skills such as:

```text
curriculum-mapper
rubric-designer
certificate-designer
student-workbook
quiz-generator
lab-designer
capstone-designer
learning-path-designer
course-translator
course-localizer
course-summarizer
video-script-designer
```

Do not implement these initially.

---

# 40. Implementation Order

The project should be implemented in this order:

```text
Phase 0
Repository Audit

Phase 1
Repository Foundation

Phase 2
Skill Contracts

Phase 3
Shared References

Phase 4
Templates

Phase 5
Core Skills

Phase 6
Learning Experience Skills

Phase 7
Notebook Generation

Phase 8
Slide Generation

Phase 9
Configuration

Phase 10
Course State + Manifest

Phase 11
Adaptation

Phase 12
Research Policy

Phase 13
Examples

Phase 14
Tests

Phase 15
Evaluations

Phase 16
End-to-End Quality Review

Phase 17
Final Repository Review
```

---

# 41. Definition of Done

The project is complete when an instructor can provide:

```text
Course name
Audience
Level
Duration
Number of sessions
Session duration
```

and receive a coherent course package containing the appropriate:

```text
Course Plan
Session Plans
Timed Agendas
Activities
Practical Exercises
Notebooks
Slides
Assessments
Instructor Guide
Course Review
```

The instructor remains responsible for educational decisions.

The system automates course production.

---

# 42. Final Architecture

The project consists of five main layers:

```text
Layer 1
Skills
Behavior + Workflow

Layer 2
References
Instructional Knowledge

Layer 3
Templates
Output Structure

Layer 4
Configuration
Instructor Preferences

Layer 5
Artifacts
Generated Course Materials
```

These layers should remain separate.

The system should be modular, testable, maintainable, extensible, and usable
by other instructors through forking and configuration.
