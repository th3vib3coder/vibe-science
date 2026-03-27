# 05. Automation Layer

## Purpose

Define recurring and semi-automated behaviors for the real rhythm of research work.

## Thesis

Automation should remove friction, not remove accountability.

## Target Automation Classes

### A. Health and Staleness

Examples:

- stale literature reminder
- unresolved claims reminder
- pending seed escalation digest
- project-memory sync reminder
- idle experiment follow-up reminder

### B. Reporting and Packaging

Examples:

- weekly research digest
- advisor meeting prep pack
- result bundle packaging
- figure catalog refresh
- appendix skeleton refresh

### C. Workflow Orchestration

Examples:

- project kickoff checklist
- pre-submission checklist
- rebuttal prep checklist
- experiment closeout checklist

### D. Monitoring and Drift Detection

Examples:

- benchmark drift check
- repeated failure digest
- open review debt summary
- literature freshness scan on active direction

## Runtime Model

Claude Code does not have cron or background daemons. Automations execute in two ways:

1. **SessionStart-triggered checks**: lightweight checks that run when the researcher opens a session (like TRACE+ADAPT hints already do). These surface stale state, pending reviews, and drift without blocking.
2. **On-demand commands**: researcher invokes `/weekly-digest`, `/advisor-prep`, `/experiment-close` explicitly. These produce artifacts but never run unsupervised.

"Recurring" means "runs each time the researcher opens a session or invokes it" — not "runs on a schedule in the background."

## Automation Rules

### Rule 1: Recurring Does Not Mean Autonomous Scientist

Automations may:

- summarize
- remind
- package
- schedule
- synchronize
- alert

Automations may not:

- decide scientific truth
- promote claims
- close disputes
- mark citations verified
- bypass the user on critical decisions

### Rule 2: Outputs Must Be Reviewable

Every automation should produce reviewable outputs:

- digest
- checklist
- report
- inbox item
- export bundle

### Rule 3: Automations Must Be Idempotent Where Practical

Recurring runs should avoid producing:

- duplicate artifacts
- duplicate digests
- silent overwrites of human work

### Rule 4: Automations Must Respect Core State

If the core reports:

- unresolved claims
- degraded integrity
- pending review debt

automations should surface that, not hide it.

## Safe Early Automations

- weekly digest
- advisor meeting prep pack
- stale literature reminder
- unresolved-claim reminder
- pending-seed digest
- experiment packaging helper

## Unsafe Early Automations

- auto-creating validated result narratives
- auto-publishing notes as if approved
- any recurring task that mutates claim/citation truth
