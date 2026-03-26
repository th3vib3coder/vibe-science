# 01. Boundaries and Catalog

## Core Principle

**Adaptive harness, not adaptive truth.**

Allowed:

- short operator-facing carry-over hints
- reminders about recurring operational failures
- reminders about citation/STATE/SSOT/literature discipline

Forbidden:

- changing gate pass/fail semantics
- changing immutable laws
- changing claim or citation truth
- changing permission boundaries
- rewriting protocol files

## Non-Recursion

V0 may read from:

- `gate_checks`
- `observer_alerts`
- `sessions`

V0 may not change how those signals are collected.

## V0 Signal Catalog

### Gate-Based

- `H-01` DQ4 recurring failures
- `H-03` L-1+ recurring failures
- `H-05` L0 recurring failures
- `H-06` D1 recurring failures
- `H-07` SALVAGENTE recurring failures

All five are sourced from `gate_checks` joined to `sessions` by `session_id`.

### Observer-Based

- `H-09` STATE stale
- `H-10` SSOT desync
- `H-11` design-execution drift

All three are sourced from `observer_alerts`.

Important:

- V0 observer hints are **historical recurrence signals**, not mirrors of the current unresolved-alert set
- they may still activate from alerts that were raised and later resolved
- this is acceptable in V0 because the goal is carry-over adaptation, not live alert duplication
- if we want full alignment with live alert semantics later, that becomes a V0.1 design choice together with `alert_code`

## Explicit Exclusions

Not in V0:

- `H-17` seed escalation hint
  Because it already has strong visibility via `[ALERTS]` and `[PENDING SEEDS]`.

- permission hints
  Because permission denials are not yet persisted as stable project-level signals.

- retrieval/integrity hints
  They belong in a future dedicated section, not mixed with research-operational hints.

- R2 calibration hints
  They already exist through the calibration path and would be duplicate scope in V0.

## Hint Text Policy

Hints must be:

- short
- concrete
- actionable
- non-epistemic

Target:

- 15-25 tokens per hint
- maximum 3 hints per session
