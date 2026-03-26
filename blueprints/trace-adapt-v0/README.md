# TRACE+ADAPT V0 — Atomic Spec Set

This folder contains the implementation-facing breakdown of TRACE+ADAPT V0.

It exists to keep work packages small enough that sub-agents can operate without context blow-up.

## Files

1. [01-boundaries-and-catalog.md](./01-boundaries-and-catalog.md)  
   Scope, invariants, allowed signals, exact V0 hint catalog.

2. [02-registry-and-queries.md](./02-registry-and-queries.md)  
   `harness-hints.js` module shape, query contracts, cooldown behavior, observer debt.

3. [03-session-start-integration.md](./03-session-start-integration.md)  
   Exact insertion point and constraints for wiring the new hint block into TRACE context.

4. [04-test-and-readiness.md](./04-test-and-readiness.md)  
   Test coverage contract, readiness-path constraints, token-budget checks, regression traps.

## Implementation Principle

V0 is intentionally small:

- advisory only
- deterministic only
- no new tables
- no migrations
- no LLM calls

## Ownership Model

- One integrator owns `session-start.js`.
- Workers can independently reason about catalog, query logic, and test coverage because those concerns are separated here.
