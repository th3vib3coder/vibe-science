# 14 — Testing Strategy

---

## Purpose

Define how runtime code, compatibility checks, and CI validators prevent
regression and spec/runtime drift.

This document is about **tests**. Benchmark-style **evals** and operator
validation live in [14A-evaluation-harness.md](./14A-evaluation-harness.md).

---

## Two Testing Worlds

### Runtime Code

JavaScript modules in `environment/` are tested with unit and integration tests.

Examples:
- `environment/control/session-snapshot.js`
- `environment/control/attempts.js`
- `environment/control/decisions.js`
- `environment/control/events.js`
- `environment/control/capabilities.js`
- `environment/control/query.js`
- `environment/control/middleware.js`
- `environment/flows/literature.js`
- `environment/flows/experiment.js`
- `environment/lib/flow-state.js`
- `environment/lib/manifest.js`

### Compatibility Checks

Kernel-owned guarantees are tested through compatibility harnesses, not through
mock-only unit tests.

Examples:
- governance profiles
- claim event sequence enforcement
- config protection
- governance event immutability

---

## Three-Test Minimum per Shell Module

Every outer-project module must prove three things:

| Test | What it proves |
|------|---------------|
| Happy path | Module works when kernel is available |
| Graceful failure | Module degrades honestly when kernel is unavailable |
| Independence | Kernel still works correctly if this module disappears |

If any of the three fails, the module is not ready.

---

## Runtime Test Matrix

### Unit Tests

Focus:
- pure helper logic
- schema validation and rejection paths
- capability defaulting
- token counting mode selection
- attempt/session lifecycle invariants

Minimum modules:
- `environment/control/session-snapshot.js`
- `environment/control/attempts.js`
- `environment/control/decisions.js`
- `environment/control/events.js`
- `environment/control/capabilities.js`
- `environment/control/query.js`
- `environment/control/middleware.js`
- `environment/flows/literature.js`
- `environment/flows/experiment.js`
- `environment/lib/flow-state.js`
- `environment/lib/manifest.js`
- `environment/lib/token-counter.js`
- `environment/lib/session-metrics.js`

Later phases add:
- `environment/lib/export-eligibility.js` (Phase 3)

### Schema Tests

Every machine-owned file shape gets:
- one valid fixture
- one invalid fixture
- one partial/degraded fixture where allowed

Active Phase 1 schemas:
- `session-snapshot.schema.json`
- `capabilities-snapshot.schema.json`
- `attempt-record.schema.json`
- `event-record.schema.json`
- `decision-record.schema.json`
- `flow-index.schema.json`
- `literature-flow-state.schema.json`
- `experiment-flow-state.schema.json`
- `schema-validation-record.schema.json`
- `experiment-manifest.schema.json`
- `costs-record.schema.json`
- `install-state.schema.json`

Later phases add schema tests for:
- `export-snapshot.schema.json` (Phase 3)
- `export-record.schema.json` (Phase 3)
- `export-alert-record.schema.json` (Phase 3)

### Integration Tests

Minimum integration scenarios:
1. bootstrap creates `flows/` and `control/`
2. `/flow-status` rebuilds missing `control/session.json`
3. opening/updating/closing an attempt refreshes heartbeat and writes telemetry
4. corrupt flow state or control snapshot fails closed and rebuilds cleanly
5. `/flow-literature` registers a paper and persists linked claim IDs
6. `/flow-experiment` creates and lists manifests without duplicating attempt lifecycle

Later phases add integration scenarios for:
- export snapshot creation before claim-backed export (Phase 3)
- memory sync mirroring control-plane decisions without becoming a second truth path (Phase 2)

---

## Command Shim Validation

Prompt shims are not unit-tested. They are validated through real operator runs.

Every critical command must prove:
1. it reads and writes only its allowed state surfaces
2. it never writes kernel truth
3. degraded mode is explicit, not fabricated
4. it delegates lifecycle-sensitive behavior to shared middleware

See [14A-evaluation-harness.md](./14A-evaluation-harness.md) for saved benchmark and operator-validation artifacts.

---

## Kernel Compatibility Validation

These tests run against the real kernel contract surface.

Suggested location:
`environment/tests/compatibility/`

### Claim State Machine

```js
test('CREATED → PROMOTED without R2_REVIEWED is blocked', () => {
  // Verify parser rejects invalid sequence
});

test('valid sequence CREATED → R2_REVIEWED → PROMOTED passes', () => {
  // Verify accepted
});
```

### Profile Compatibility

```js
test('minimal profile still runs confounder check', () => {
  // Verify non-negotiable hook still blocks missing confounder_status
});
```

Phase 3 adds:

```js
test('minimal-created claim requires fresh schema validation before export', () => {
  // Verify export helper refuses until validation artifact exists
});
```

### Config Protection And Immutability

```js
test('Write to schema file is blocked', () => {
  // Verify exit code 2 and governance event logged
});

test('governance_events rejects UPDATE at storage layer', () => {
  // Verify append-only guarantee
});
```

---

## CI Validators

Run on every commit and PR:

| Validator | What it checks |
|-----------|---------------|
| `validate-templates.js` | JSON templates parse correctly |
| `validate-runtime-contracts.js` | runtime contracts and gating artifacts match schema contracts |
| `validate-references.js` | every referenced file exists |
| `validate-install-bundles.js` | every bundle manifest references real repo paths |
| `validate-bundle-ownership.js` | no two bundles claim the same managed path |
| `validate-counts.js` | documented counts still match reality |
| `validate-no-kernel-writes.js` | no outer-project code bypasses read-only rule |
| `validate-roles.js` | every role in roles.md maps to a known permission-engine role |
| `validate-no-personal-paths.js` | no hardcoded user paths in committed files |

---

## Regression Triggers

### When Modifying Kernel Contract

1. update `CORE-READER-INTERFACE-SPEC.md`
2. rerun kernel tests
3. rerun outer-project consumer tests
4. rerun capability defaulting tests

### When Modifying Control Plane

1. rerun schema tests
2. rerun attempt lifecycle tests
3. rerun snapshot rebuild tests
4. rerun degraded-mode tests

### When Modifying Install Or Lifecycle Logic

1. rerun install, doctor, repair, uninstall, and upgrade tests
2. verify bundle ownership validators still pass
3. verify uninstall removes only owned paths
4. verify backed-up content restores correctly

---

## Test Location

```
environment/tests/
├── control/
│   ├── session-snapshot.test.js
│   ├── attempts.test.js
│   ├── decisions.test.js
│   ├── events.test.js
│   ├── capabilities.test.js
│   ├── query.test.js
│   └── middleware.test.js
├── flows/
│   ├── literature.test.js
│   └── experiment.test.js
├── schemas/
│   ├── session-snapshot.schema.test.js
│   ├── capabilities-snapshot.schema.test.js
│   ├── attempt-record.schema.test.js
│   ├── event-record.schema.test.js
│   ├── decision-record.schema.test.js
│   ├── flow-index.schema.test.js
│   ├── literature-flow-state.schema.test.js
│   ├── experiment-flow-state.schema.test.js
│   ├── schema-validation-record.schema.test.js
│   ├── experiment-manifest.schema.test.js
│   ├── costs-record.schema.test.js
│   └── install-state.schema.test.js
├── lib/
│   ├── flow-state.test.js
│   ├── manifest.test.js
│   ├── token-counter.test.js
│   └── session-metrics.test.js
├── compatibility/
│   ├── state-machine.test.js
│   ├── profiles.test.js
│   └── config-protection.test.js
├── install/
│   ├── install.test.js
│   ├── doctor.test.js
│   ├── repair.test.js
│   ├── uninstall.test.js
│   └── upgrade.test.js
├── integration/
│   ├── flow-bootstrap.test.js
│   ├── control-plane-rebuild.test.js
│   ├── literature-register.test.js
│   └── experiment-manifest-lifecycle.test.js
└── ci/
    ├── validate-templates.js
    ├── validate-runtime-contracts.js
    ├── validate-references.js
    ├── validate-install-bundles.js
    ├── validate-bundle-ownership.js
    ├── validate-counts.js
    ├── validate-no-kernel-writes.js
    ├── validate-roles.js
    └── validate-no-personal-paths.js
```

Later phases add:
- `environment/tests/lib/export-eligibility.test.js` (Phase 3)
- `environment/tests/schemas/export-snapshot.schema.test.js` (Phase 3)
- `environment/tests/schemas/export-record.schema.test.js` (Phase 3)
- `environment/tests/schemas/export-alert-record.schema.test.js` (Phase 3)
- `environment/tests/integration/export-snapshot.test.js` (Phase 3)
- `environment/tests/integration/memory-sync.test.js` (Phase 2)

---

## Invariants

1. Every runtime module has unit or integration coverage
2. Every machine-owned runtime contract or gating artifact validates against a schema
3. Every shell module passes happy, failure, and independence checks
4. Kernel contract changes trigger both kernel and outer-project suites
5. CI validators run on every commit
6. Prompt behavior is validated through saved operator/eval artifacts, not unit tests
