# 01. Core Invariants

## Purpose

Define the invariants that a broader Vibe Science system must preserve.

These invariants are not optional architecture preferences.
They are identity constraints.

## Invariant A: Protected Truth Model

The following remain authoritative and may not be redefined by any outer layer:

- claim lifecycle truth state
- citation truth state
- gate semantics
- confounder semantics
- stop semantics
- integrity degradation semantics
- adversarial review consequences

No connector, workflow helper, note system, or automation is allowed to redefine these concepts.

## Invariant B: Canonical Sources of Truth

Canonical truth remains in:

- the runtime database
- canonical structured artifacts
- hook-enforced claim and citation state

Human-readable mirrors may exist in:

- markdown notes
- project memory folders
- external vaults
- reports
- dashboards

These mirrors are derivative, not authoritative.

## Invariant C: Shell Features Are Downstream or Side-Channel

Broader features may:

- read from core state
- mirror core state
- prepare inputs for core workflows
- package validated outputs for humans
- orchestrate recurring checks and reminders

Broader features may not:

- promote claims
- kill claims
- validate evidence
- mark citations verified
- close review disputes
- soften gates
- bypass stop conditions

## Invariant D: Adapters Are Not Judges

Zotero, Obsidian, notebook, filesystem, reporting, and export adapters are operational bridges.

They are never judges of:

- claim validity
- evidence validity
- citation validity
- review quality

## Invariant E: Automation May Accelerate, Never Self-Legitimate

Allowed automation behavior:

- reminders
- digests
- scheduling
- synchronization
- report assembly
- inventory checks
- stale-state detection
- meeting-prep packaging

Forbidden automation behavior:

- autonomous result approval
- autonomous claim promotion
- automatic scientific truth decisions
- runtime-law relaxation
- silent mutation of core protocol behavior

## Invariant F: Soft Shell, Hard Kernel

If a shell feature fails:

- user experience may degrade
- convenience may degrade
- synchronization may degrade

But:

- claim truth must remain intact
- gate semantics must remain intact
- integrity status must remain honest
- the core must keep working without the shell

## Invariant G: Breadth Must Not Increase Epistemic Softness

The project may broaden in:

- workflow support
- integrations
- automation
- packaging
- memory systems
- domain overlays

But it must not broaden by replacing rigor with convenience.

## Core Read Interface

The shell must never query the TRACE database directly. All shell modules access core state through `core-reader.js`, a dedicated kernel-side read-only contract surface.

The full interface — factory, function signatures, return shapes, CLI bridge contract, and execution model — is specified in [CORE-READER-INTERFACE-SPEC.md](../CORE-READER-INTERFACE-SPEC.md). Do not duplicate function lists here; they will drift.

Key invariant: the reader is projection-only. It exposes facts. It does not compute policy (like export-eligibility), write state, or mutate kernel truth.

## Acceptance Test For Any New Feature

Every broad-shell proposal must answer all six questions:

1. Does it read from the core or redefine the core?
2. If it breaks, does the core stay honest?
3. Can it change claim or citation truth? If yes, reject.
4. Can it bypass a gate or stop condition? If yes, reject.
5. Is it a mirror, orchestrator, or packager rather than a judge?
6. Can it be disabled without collapsing TRACE?

If any answer is unsafe, the feature is out of scope for the broad-shell track.
