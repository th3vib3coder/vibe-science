# VRE Phase 1 — Implementation Plan

**Date:** 2026-03-30
**Scope:** Phase 1 only
**Status:** Active execution entrypoint

---

## Purpose

This file is intentionally short.

The actual implementation plan lives in:
- [implementation-plan/00-index.md](./implementation-plan/00-index.md)
- [implementation-plan/01-wave-0-foundation.md](./implementation-plan/01-wave-0-foundation.md)
- [implementation-plan/02-wave-1-lib-helpers.md](./implementation-plan/02-wave-1-lib-helpers.md)
- [implementation-plan/03-wave-2-control-plane.md](./implementation-plan/03-wave-2-control-plane.md)
- [implementation-plan/04-wave-3-flows-and-shims.md](./implementation-plan/04-wave-3-flows-and-shims.md)
- [implementation-plan/05-wave-4-tests-and-validators.md](./implementation-plan/05-wave-4-tests-and-validators.md)
- [implementation-plan/06-wave-5-evals-and-closeout.md](./implementation-plan/06-wave-5-evals-and-closeout.md)

The previous monolithic implementation plan was replaced because it was too
large, mixed phases, and reintroduced ownership drift that the definitive spec
had already removed.

---

## Phase 1 Only

Phase 1 includes:
- active schemas, templates, bundle manifests, and repo scaffolding
- Phase 1 lib helpers
- control-plane modules
- literature and experiment flow helpers
- command shim upgrade for `/flow-status`, `/flow-literature`, `/flow-experiment`
- Phase 1 tests, CI validators, eval definitions, and saved run artifacts

Phase 1 explicitly excludes:
- memory sync
- results packaging
- writing handoff
- `environment/lib/export-eligibility.js`
- export snapshot / export record / export alert runtime contracts

---

## Hard Rules

1. Middleware owns attempt lifecycle, telemetry, and snapshot publication.
2. Flow helpers own domain logic only; they do not open or close attempts.
3. Every Phase 1 exit gate closes with a saved artifact, not a verbal claim.
4. No outer-project code writes kernel truth.
5. Wave order is mandatory; parallelism happens inside a wave, not across waves.
