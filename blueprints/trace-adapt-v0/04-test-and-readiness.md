# 04. Test and Readiness

## Readiness Constraint

TRACE readiness runs:

- `node --test __test_e2e.mjs`

Therefore V0 tests must execute through that path.

Allowed options:

- put harness-hints tests directly in `__test_e2e.mjs`
- or import them from there explicitly

Disallowed:

- creating a standalone test file that readiness never touches

## Required Coverage

Minimum:

- one gate-based activation case, preferably `H-01`
- gate cooldown with fewer than 3 completed sessions
- gate cooldown after 3 clean completed sessions
- observer regex positive matches
- observer regex negative match for unrelated drift text
- session-start includes `[HARNESS HINTS]` when expected
- session-start omits `[HARNESS HINTS]` when expected
- the final assembled `session-start.js` context remains within a measured budget sentinel
- graceful degradation when the hint computation path fails

## Special Traps

The repo already has a custom test harness in `__test_e2e.mjs`.

So implementation must account for:

- hardcoded file inventory checks that may need updating if a new JS module is added
- local tracked pass/fail counters that can drift if tests are moved into a separate file without proper wiring
- `session-start.js` opens the default DB under `os.homedir()`, so integration tests must override `HOME` / `USERPROFILE` (or equivalent) to an isolated temp home before spawning the hook

If these are not updated, readiness can fail or report misleading counts even when the new logic is correct.

## Token-Budget Check

The token budget must be treated as a **measured constraint**, not only a prose estimate.

Required sanity check:

- worst-case V0 hint block remains compact
- total injected context remains within the intended TRACE ceiling
- the assertion must inspect real `session-start.js` output, not only static string estimates in docs

Important:

- the current TRACE runtime documents a target budget, but does not enforce token count directly
- `[PATTERNS]` and `[DOMAIN]` are appended after formatter output in `session-start.js`
- therefore V0 must validate the final assembled context, not the formatter output in isolation
- observer regression should exercise the actual `harness-hints.js` behavior, not a second copy of the regex literals in the test file

## Readiness Contract

V0 is not ready unless all pass:

- `node --test __test_e2e.mjs`
- `node evals/smoke-trace.mjs`
- `node scripts/v7-readiness.mjs`

No new readiness command is needed in V0.
