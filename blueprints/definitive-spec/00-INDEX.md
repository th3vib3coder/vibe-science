# Vibe Research Environment — Definitive Spec

**Version:** 1.1-draft
**Date:** 2026-03-30
**Status:** Draft — undergoing adversarial review

---

## What This Is

This is the **definitive, implementation-ready specification** for the Vibe Research Environment: a separate project that wraps around the Vibe Science v7.0 TRACE kernel to provide a complete semi-automated research workflow.

This spec consolidates and replaces the following previous documents:
- `broader-system/` (governance track, 8 files)
- `research-environment-v1/` (product track, 5 files)
- `VIBE-SCIENCE-BROADER-SYSTEM-SPEC.md` (entrypoint)
- `VIBE-SCIENCE-RESEARCH-ENVIRONMENT-V1-SPEC.md` (entrypoint)
- `AUDIT-DRIVEN-IMPROVEMENTS.md` (bridge from the first 7 repo audits)

Those files remain in the repo as design lineage. This spec is the authoritative reference for implementation.

---

## Reading Order

Read in numerical order. Each document is self-contained but builds on previous ones.

| # | Document | What it covers | Size target |
|---|----------|---------------|-------------|
| 01 | [Identity and Boundaries](01-identity-and-boundaries.md) | What this project IS, what it's NOT, relationship to kernel | ~200 lines |
| 02 | [Kernel Contract](02-kernel-contract.md) | How we talk to Vibe Science (read-only API, CLI bridge, rules) | ~250 lines |
| 03 | [Architecture Overview](03-architecture-overview.md) | Modules, data flow, execution model, state zones | ~250 lines |
| 03A | [Control Plane and Query Surface](03A-control-plane-and-query-surface.md) | Canonical session snapshot, attempts, telemetry, decisions, capabilities, query layer | ~250 lines |
| 04 | [Flow Engine](04-flow-engine.md) | Literature, Experiment, Results, Writing flows | ~300 lines |
| 05 | [Memory Layer](05-memory-layer.md) | Project memory, sync model, mirror rules | ~200 lines |
| 06 | [Experiment Operations](06-experiment-ops.md) | Registry, manifests, bundles, results packaging | ~200 lines |
| 07 | [Writing and Export](07-writing-and-export.md) | Export eligibility, claim-backed writing, deliverables | ~200 lines |
| 08 | [Governance Engine](08-governance-engine.md) | Profiles, audit trail, state machine, config protection | ~250 lines |
| 09 | [Install and Lifecycle](09-install-and-lifecycle.md) | Capability bundles, doctor/repair, testing strategy | ~200 lines |
| 10 | [Connectors](10-connectors.md) | Zotero, Obsidian, filesystem (Phase 4, designed now) | ~150 lines |
| 11 | [Automation](11-automation.md) | Digests, reminders, scheduled checks (Phase 4, designed now) | ~150 lines |
| 12 | [Domain Packs](12-domain-packs.md) | Overlays, templates, presets (Phase 4, designed now) | ~150 lines |
| 13 | [Delivery Roadmap](13-delivery-roadmap.md) | Phases, exit gates, acceptance criteria | ~250 lines |
| 14 | [Testing Strategy](14-testing-strategy.md) | How to test each module, regression approach | ~250 lines |
| 14A | [Evaluation Harness](14A-evaluation-harness.md) | Benchmarks, operator validation, checkpointed quality runs | ~200 lines |

**Total: ~2,750 lines across 17 files** distributed into atomic modules instead of scattered overlapping tracks.

---

## Design Principles

1. **Each Phase 1-3 document is one agent's workload.** An implementation agent reads ONE document and builds what it describes. Deferred docs (10-12) are boundary specs first and only become implementation tickets when their phase opens.
2. **No document exceeds 300 lines.** If it's longer, it's doing too much.
3. **Every proposal has a file path.** "Add a flow engine" is not enough. Where does the code live? What format? How is it invoked?
4. **Operational substrate is explicit.** Flow logic does not improvise its own control plane. Session snapshot, attempts, capabilities, and telemetry have their own document and code surface.
5. **Governance rules are embedded, not separate.** Each module document includes its own invariants, not a pointer to a governance doc.
6. **Deferred modules are designed now.** Connectors, automation, and domain packs are Phase 4, but their boundaries and rules are specified here so nothing built in Phase 1-3 blocks them.

---

## Relationship to Existing Documents

| Existing document | Status after this spec |
|-------------------|----------------------|
| `broader-system/*` | **Design lineage.** Governance rules absorbed into this spec. |
| `research-environment-v1/*` | **Design lineage.** Product decisions absorbed into this spec. |
| `VIBE-SCIENCE-CORE-CONTRACT.md` | **Still authoritative.** This spec references but does not replace it. |
| `CORE-READER-INTERFACE-SPEC.md` | **Still authoritative.** Kernel-owned, referenced in doc 02. |
| `CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md` | **Still authoritative.** Kernel snapshot, referenced in doc 01. |
| `REPO-TOPOLOGY-DECISION.md` | **Absorbed.** Topology rules in doc 01. |
| `AUDIT-DRIVEN-IMPROVEMENTS.md` | **Design lineage.** Improvements distributed across this spec. |
| `v7.0-IMPLEMENTATION-SPEC.md` | **Kernel-only.** Not part of this spec. |
| `ADVERSARIAL-REVIEW-PROTOCOL.md` | **Process doc.** Not part of this spec. |

---

## Provenance

This spec was built from:
1. 33 existing spec files written March 21-28, 2026
2. 9 forensic repo audits (gstack, hermes-agent, superpowers, paperclip, claude-scholar, strix, everything-claude-code, AgentScope, Agent Lightning)
3. The AUDIT-DRIVEN-IMPROVEMENTS bridge document (28 improvements + later hardening)
4. Multiple adversarial review rounds on the predecessor specs, plus ongoing review of this definitive spec
5. Verification against the actual Vibe Science repo state (core-reader.js implemented, flow shims drafted, key kernel tests passing at consolidation time)

---

## Non-Negotiable Rule

If any document in this spec proposes changing:
- claim truth semantics
- citation truth semantics
- gate meaning
- integrity meaning
- stop semantics

...it is **out of scope** and must stop for kernel core review. This spec builds AROUND the kernel, never INTO it.
