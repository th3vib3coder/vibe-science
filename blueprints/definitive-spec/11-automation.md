# 11 — Automation

**Phase:** 4+ (deferred — designed now so Phases 1-3 don't block it)

---

## Purpose

Remove friction from recurring tasks without removing accountability. Automation should remind, summarize, package, and schedule. It should NEVER decide scientific truth.

---

## Four Automation Rules

### Rule 1: Recurring Does Not Mean Autonomous Scientist
**Allowed:** summarize, remind, package, schedule, sync, alert.
**Forbidden:** decide truth, promote claims, close disputes, mark citations verified, bypass user on critical decisions.

### Rule 2: Outputs Must Be Reviewable
Every automation produces a visible artifact: digest, checklist, report, inbox item, or export bundle. Never invisible side-effects.

### Rule 3: Idempotent Where Practical
Running the same automation twice should not produce duplicate artifacts, duplicate digests, or silent overwrites.

### Rule 4: Respect Core State
Automation must surface (not hide) unresolved claims, degraded integrity, pending review debt, and stale experiment blockers.

---

## Automation Classes

### A. Health and Staleness
- Stale literature reminder (papers >30 days without review)
- Unresolved claims reminder (claims pending R2 >N sessions)
- Pending seed escalation digest
- Project-memory sync reminder (mirror >24h stale)
- Idle experiment follow-up (blocked experiments >7 days)

### B. Reporting and Packaging
- Weekly research digest (summary of claims, experiments, R2 reviews)
- Advisor meeting prep refresh (once the generator exists)
- Result bundle packaging refresh
- Figure catalog refresh

### C. Workflow Orchestration
- Project kickoff checklist
- Pre-submission checklist
- Rebuttal prep checklist
- Experiment closeout checklist

### D. Monitoring and Drift Detection
- Benchmark drift check
- Repeated failure digest
- Open review debt summary
- Literature freshness scan

---

## Runtime Model

Automations are command-driven or scheduled. NEVER kernel-hook-triggered.

| Trigger | Mechanism |
|---------|-----------|
| Explicit command | Researcher types `/weekly-digest` |
| Claude Code Scheduled Task | 3-day max session-scoped, or Desktop/Cloud persistent |
| Desktop Scheduled Task | Persistent, survives session end |

**Critical rule:** SessionStart is NOT an outer-project automation trigger. The kernel's SessionStart injects TRACE context. The outer project's automations run on-demand or on schedule.

---

## What's Safe Later (after Phases 1-3)

- Weekly digest refresh
- Stale literature reminder
- Unresolved-claim reminder
- Pending-seed digest
- Experiment packaging refresh (after bundles exist)
- Advisor meeting prep refresh (after generator exists)

## What's Unsafe Early

- Auto-creating validated result narratives
- Auto-publishing notes as approved
- Recurring tasks mutating claim/citation truth
- Automations that run without researcher awareness

---

## Invariants

1. Automation accelerates, never self-legitimates
2. Every output is a reviewable artifact
3. Command-driven or scheduled, never hook-triggered
4. Must surface (not hide) core state problems
5. Idempotent where practical
