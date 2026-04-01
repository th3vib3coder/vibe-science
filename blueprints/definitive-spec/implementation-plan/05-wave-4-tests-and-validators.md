# Wave 4 — Tests And Validators

**Goal:** Make Phase 1 measurable, enforceable, and hard to regress.

---

## WP-18 — Active Phase 1 Schema Tests

Create 12 schema test files under `environment/tests/schemas/`:
- `session-snapshot.schema.test.js`
- `capabilities-snapshot.schema.test.js`
- `attempt-record.schema.test.js`
- `event-record.schema.test.js`
- `decision-record.schema.test.js`
- `flow-index.schema.test.js`
- `literature-flow-state.schema.test.js`
- `experiment-flow-state.schema.test.js`
- `schema-validation-record.schema.test.js`
- `experiment-manifest.schema.test.js`
- `costs-record.schema.test.js`
- `install-state.schema.test.js`

Acceptance:
- every active Phase 1 schema has valid, invalid, and degraded fixtures where allowed

---

## WP-19 — Unit Tests

Create unit tests for:

Control plane:
- `session-snapshot.test.js`
- `attempts.test.js`
- `decisions.test.js`
- `events.test.js`
- `capabilities.test.js`
- `query.test.js`
- `middleware.test.js`

Lib and flows:
- `flow-state.test.js`
- `manifest.test.js`
- `token-counter.test.js`
- `session-metrics.test.js`
- `literature.test.js`
- `experiment.test.js`

Acceptance:
- every shell module passes happy path, graceful failure, and independence checks where applicable

---

## WP-20 — Integration, Compatibility, And Install Tests

Integration:
- `flow-bootstrap.test.js`
- `control-plane-rebuild.test.js`
- `literature-register.test.js`
- `experiment-manifest-lifecycle.test.js`

Compatibility:
- `state-machine.test.js`
- `profiles.test.js`
- `config-protection.test.js`

Install:
- `install.test.js`
- `doctor.test.js`
- `repair.test.js`
- `uninstall.test.js`
- `upgrade.test.js`

Acceptance:
- install lifecycle proves reversibility
- compatibility suite proves kernel prerequisites that Phase 1 actually consumes

---

## WP-21 — CI Validators

Create:
- `validate-templates.js`
- `validate-runtime-contracts.js`
- `validate-references.js`
- `validate-install-bundles.js`
- `validate-bundle-ownership.js`
- `validate-counts.js`
- `validate-no-kernel-writes.js`
- `validate-roles.js`
- `validate-no-personal-paths.js`

Acceptance:
- validator list matches [08-governance-engine.md](../08-governance-engine.md) exactly
- validators run only on Phase 1 active surfaces

---

## Explicitly Deferred

Do NOT create in this wave:
- `export-eligibility.test.js`
- export schema tests
- `export-snapshot.test.js`
- `memory-sync.test.js`

Those begin when Phase 2 and Phase 3 start.

---

## Exit Condition

Wave 4 is complete when the Phase 1 codebase has enforceable tests and CI
validators with no future-phase placeholders mixed into the active suite.
