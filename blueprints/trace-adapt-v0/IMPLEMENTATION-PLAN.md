# TRACE+ADAPT V0 Implementation Plan

> **For agentic workers:** Prefer subagents when available, otherwise execute the tasks sequentially. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic advisory adaptation layer that injects carry-over hints at SessionStart based on recurring runtime failures.

**Architecture:** New `harness-hints.js` module with a static catalog of 8 hint entries. Computed on-the-fly from existing `gate_checks` and `observer_alerts` tables. Wired into `session-start.js` as a single injection step before `--- END CONTEXT ---`.

**Tech Stack:** Node.js (ESM), better-sqlite3, node:test

**Spec:** See sibling files in this directory:
- [01-boundaries-and-catalog.md](./01-boundaries-and-catalog.md) — invariants and catalog
- [02-registry-and-queries.md](./02-registry-and-queries.md) — query contracts
- [03-session-start-integration.md](./03-session-start-integration.md) — wiring
- [04-test-and-readiness.md](./04-test-and-readiness.md) — test contract

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `plugin/lib/harness-hints.js` | **CREATE** | Catalog registry, strength functions, `computeHarnessHints()` API |
| `plugin/scripts/session-start.js` | **MODIFY** | Import harness-hints, compute at step 4c, inject `[HARNESS HINTS]` |
| `__test_e2e.mjs` | **MODIFY** | Add harness-hints to B1 inventory, add B9 test block |

**Not touched:** schema.sql, post-tool-use.js, context-builder.js, v7-readiness.mjs

---

## Task Sequence

Three tasks, executed in order. Each is self-contained and ends with a commit.

- [Task 1: harness-hints.js](./plan-task-01-harness-hints.md) — the catalog module
- [Task 2: session-start wiring](./plan-task-02-session-start.md) — integration
- [Task 3: test and readiness](./plan-task-03-tests.md) — test coverage + validation

---

## Stop Conditions

If any of these become true during implementation, STOP and re-evaluate:

- A schema change is needed → not V0
- `context-builder.js` needs modification → wrong integration point
- An LLM call is needed in a hook → not V0
- `v7-readiness.mjs` needs modification → scope creep
- Total context exceeds 850 tokens in test → token budget blown
