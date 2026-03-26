# TRACE+ADAPT V0 Design

**Status:** Draft for implementation planning  
**Date:** 2026-03-26  
**Scope:** Minimal harness adaptation layer for Vibe Science TRACE

This file is the canonical entrypoint for TRACE+ADAPT V0 inside the repo.

It intentionally stays short. Detailed implementation guidance is split into atomic documents under [trace-adapt-v0](./trace-adapt-v0/README.md).

## Goal

Add a small, deterministic, advisory adaptation layer that injects short carry-over hints at `SessionStart`, based only on already-persisted runtime failures.

Core formula:

`observed failure -> deterministic hint -> next-session injection`

## Non-Negotiable Boundaries

- The harness may adapt.
- Scientific truth criteria may not.
- No schema changes in V0.
- No LLM calls in hooks.
- No file rewrites.
- No changes to gate semantics, immutable laws, citation truth, claim verdicts, or permission boundaries.

## Runtime Placement

The only valid insertion point is `plugin/scripts/session-start.js`.

Why:

- DB is open there.
- `projectPath` is available there.
- The context string is assembled there.
- TRACE already injects `[PATTERNS]` there after formatting.

## V0 Scope

V0 is split into four atomic specs:

1. [Boundaries and Catalog](./trace-adapt-v0/01-boundaries-and-catalog.md)
2. [Registry and Queries](./trace-adapt-v0/02-registry-and-queries.md)
3. [SessionStart Integration](./trace-adapt-v0/03-session-start-integration.md)
4. [Test and Readiness Contract](./trace-adapt-v0/04-test-and-readiness.md)

## Sequencing

Implementation should stay this small:

1. add `plugin/lib/harness-hints.js`
2. wire it into `plugin/scripts/session-start.js`
3. extend `__test_e2e.mjs`
4. run smoke + readiness

Anything that requires migrations, persistent hint state, or hook-time model reasoning is out of V0 and must stop for redesign.

## Write Set

Expected V0 write set:

- `plugin/lib/harness-hints.js`
- `plugin/scripts/session-start.js`
- `__test_e2e.mjs`

Not in V0:

- `plugin/db/schema.sql`
- `plugin/scripts/post-tool-use.js`
- `plugin/lib/context-builder.js`
- `scripts/v7-readiness.mjs`

## Ready-for-Implementation Rule

TRACE+ADAPT V0 is ready to implement only if all detailed docs agree on:

- zero schema changes
- zero epistemic drift
- no hidden readiness command changes
- test execution through the existing TRACE gate

If one of those stops being true, the design is no longer V0.
