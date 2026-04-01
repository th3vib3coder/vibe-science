# Wave 0 — Foundation

**Goal:** Build the active contracts and repo scaffold that every later wave depends on.

---

## WP-01 — Active Phase 1 Schemas

Create these schemas under `environment/schemas/`:
- `session-snapshot.schema.json`
- `capabilities-snapshot.schema.json`
- `attempt-record.schema.json`
- `event-record.schema.json`
- `decision-record.schema.json`
- `flow-index.schema.json`
- `literature-flow-state.schema.json`
- `experiment-flow-state.schema.json`
- `experiment-manifest.schema.json`
- `costs-record.schema.json`
- `install-state.schema.json`
- `schema-validation-record.schema.json`

Spec sources:
- [03A-control-plane-and-query-surface.md](../03A-control-plane-and-query-surface.md)
- [04-flow-engine.md](../04-flow-engine.md)
- [06-experiment-ops.md](../06-experiment-ops.md)
- [08-governance-engine.md](../08-governance-engine.md)
- [09-install-and-lifecycle.md](../09-install-and-lifecycle.md)

Acceptance:
- valid JSON Schema draft-07
- every active machine-owned Phase 1 artifact has one schema
- no export Phase 3 schemas are created in this wave

---

## WP-02 — Missing Templates

Create:
- `environment/templates/session-snapshot.v1.json`
- `environment/templates/attempt-record.v1.json`

Acceptance:
- both files validate against their schemas
- templates are minimal and machine-oriented, not prose-heavy

---

## WP-03 — Bundle Manifests And Scaffold

Create:
- `environment/install/bundles/governance-core.bundle.json`
- `environment/install/bundles/control-plane.bundle.json`
- `environment/install/bundles/flow-literature.bundle.json`
- `environment/install/bundles/flow-experiment.bundle.json`

Create directories if missing:
- `environment/control/`
- `environment/flows/`
- `environment/lib/`
- `environment/install/bundles/`
- `environment/evals/tasks/`
- `environment/evals/metrics/`
- `environment/evals/benchmarks/`

Acceptance:
- manifest ownership matches [09-install-and-lifecycle.md](../09-install-and-lifecycle.md) exactly
- no two bundles claim the same path
- scaffold contains only Phase 1 surfaces

---

## Parallelism

- WP-01 and WP-02 can run in parallel
- WP-03 can start after the schema path list is frozen

---

## Exit Condition

Wave 0 is complete when:
- 12 schemas exist
- 2 missing templates exist
- 4 bundle manifests exist
- scaffold directories are present
