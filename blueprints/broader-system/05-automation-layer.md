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
- advisor meeting prep refresh (not primary ownership of pack generation)
- result bundle packaging refresh/helper
- figure catalog refresh (not primary ownership of catalog generation)
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

**Note:** This section has been superseded by the product spec decisions in [02-product-architecture.md](../research-environment-v1/02-product-architecture.md) and [04-delivery-roadmap.md](../research-environment-v1/04-delivery-roadmap.md). The current agreed model is:

1. **Command-driven automations**: the researcher invokes `/weekly-digest`, `/advisor-prep`, `/experiment-close` explicitly. These produce artifacts but never run unsupervised.
2. **Claude Code Scheduled Tasks** for durable automation: session-scoped (`/loop`, CronCreate — 3-day max) for in-session polling; Desktop/Cloud Scheduled Tasks for persistent recurring work like weekly digests.
3. **Kernel SessionStart is NOT an outer-project automation trigger.** SessionStart is kernel-owned and handles TRACE+ADAPT hints. Outer-project automation does not piggyback on it.

"Recurring" means "runs when the researcher invokes a command, or when a Claude Code Scheduled Task fires" — not "injected by the kernel at session start."

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

## Safe Later Automations

These become safe only **after** the underlying artifact-producing modules already exist and have a clear owner.
Automation may trigger, refresh, or schedule them; it does not become the primary owner of the artifact itself.

- weekly digest refresh
- advisor meeting prep refresh (after the advisor-pack generator exists in the writing/deliverables layer)
- stale literature reminder
- unresolved-claim reminder
- pending-seed digest
- experiment packaging refresh/helper (after experiment bundles already exist)

## Unsafe Early Automations

- auto-creating validated result narratives
- auto-publishing notes as if approved
- any recurring task that mutates claim/citation truth
