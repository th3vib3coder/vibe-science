# Delivery Roadmap

**Purpose:** Sequence the outer project in a way that respects the kernel and produces useful value early

---

## Sequencing Principle

Build from **highest researcher pain** to **lowest epistemic risk**.

The old sequencing ("read first, orchestrate later") was architecturally safe but backwards from user value. The Flow Engine is the product. Build it first with read-only kernel access, then add packaging and memory around it.

Revised order:

1. core-reader interface + minimal Flow Engine (literature + experiment flows)
2. project memory mirrors + experiment registry
3. writing handoff + deliverable packaging
4. connectors, automations, and domain packs (later)

---

## Phase 0: Contract First

Deliverables:

- `CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md` — **DONE** (2026-03-27)
- `VIBE-SCIENCE-CORE-CONTRACT.md` — **DONE** (2026-03-27)
- user stories — **DONE** (2026-03-27, in V1 spec)
- adversarial review of spec — **DONE** (2026-03-27)
- repo-topology decision — **DONE** ([`REPO-TOPOLOGY-DECISION.md`](../REPO-TOPOLOGY-DECISION.md))
- `core-reader.js` ownership decision — **DONE** (kernel-side contract surface)
- minimal `core-reader.js` design — **DONE** ([`CORE-READER-INTERFACE-SPEC.md`](../CORE-READER-INTERFACE-SPEC.md))
- Claude Code execution-bridge decision — **DONE** (`plugin/scripts/core-reader-cli.js` as the prompt-driven bridge over `core-reader.js`)
- V1 flow-state persistence decision — **DONE** (`workspace files`, not kernel tables)

Exit gate:

- [x] kernel boundary is explicit and reviewed
- [x] user stories exist and are grounded in real workflow pain
- [x] `core-reader.js` ownership is explicit: kernel-side contract surface in the Vibe Science repo
- [x] core-reader.js interface is designed (function signatures + return types)
- [x] prompt-driven execution model is explicit (command shims + CLI bridge)
- [x] V1 flow state is explicitly out-of-kernel and file-backed
- [x] repo topology is decided

Phase 0 is complete.

---

## Phase 1: Core Reader + Flow Engine MVP

This is the make-or-break phase. If the Flow Engine doesn't help the researcher, nothing else matters.

Goal:

- expose kernel state through a stable read-only API plus a prompt-friendly CLI bridge
- build the first two flows (literature + experiment) that solve Story 1, 2, and 5 from the user stories

Deliverables:

- `core-reader.js` — kernel-side read-only contract surface in the Vibe Science repo
- `plugin/scripts/core-reader-cli.js` — thin CLI bridge that exposes reader projections as JSON to prompt-driven command shims
- `commands/flow-status.md` — thin command shim that reloads outer-project flow state and renders "where am I, what's pending, what's blocked"
- `commands/flow-literature.md` — thin command shim for the literature flow
- `commands/flow-experiment.md` — thin command shim for the experiment flow, including manifest creation and manifest listing
- minimal outer-project workspace state under `.vibe-science-environment/flows/`
- experiment manifests under `.vibe-science-environment/experiments/manifests/`
- baseline context-budget measurement for kernel + one flow command

Exit gate:

- [x] core-reader.js has at least 5 tested projection functions
- [x] `plugin/scripts/core-reader-cli.js` can expose at least `overview` and one list projection as normalized JSON
- [x] the CLI bridge has a documented stable stdout envelope (`ok`, `projection`, `projectPath`, `data/error`) and non-zero exit behavior for real errors
- [ ] `/flow-status` can resume from `.vibe-science-environment/flows/index.json` and produce a useful human-readable summary
- [ ] `/flow-literature` registers a paper and links it to a claim
- [ ] `/flow-experiment` creates an experiment manifest and tracks outputs
- [ ] `/flow-experiment` can list existing experiment manifests and their output paths without requiring manual file inspection
- [x] flow state remains outside `.vibe-science/` and no new kernel tables are introduced for it
- [ ] at least one Phase 1 flow demonstrates the two-substrate rule clearly: workspace-first when files are enough, CLI bridge when structured kernel facts are needed
- [x] all new **runtime code** has tests (happy path + graceful failure + kernel works without it) — `core-reader.js`, `core-reader-cli.js`, and any JS helpers in `environment/`
- [ ] command shims (`commands/flow-*.md`) are validated by the operator session gate, not by unit tests — they are prompt text, not executable code
- [x] kernel test suite still passes (170+ tests green)
- [ ] at least one real operator session confirms the Flow Engine reduces orientation or retrieval pain without adding unacceptable overhead
- [ ] baseline context cost is measured and documented for: `CLAUDE.md`, `SKILL.md`, SessionStart injection, and one invoked flow command

---

## Phase 2: Memory Mirrors + Experiment Packaging

Goal:

- make project state durable and human-readable across sessions (Story 1)
- make experiment results findable and packageable (Story 2)

Boundary note:

- Phase 2 must explicitly define the Memory Layer execution model
- the kernel stop hook must not become the writer of outer-project mirrors
- writer ownership, sync trigger, and degradation behavior must be specified before memory implementation starts

Deliverables:

- typed memory mirror synced at session end (project-overview.md, decision-log.md)
- experiment result bundles (parameters + outputs + figures in one place)
- figure catalog
- session digest export

Exit gate:

- [ ] memory mirror updates at session end and carries a visible timestamp
- [ ] experiment bundles contain manifest + outputs + link to claim
- [ ] researcher can find any past experiment's results in < 1 minute
- [ ] kernel test suite still passes

---

## Phase 3: Writing Handoff + Deliverable Packaging

Goal:

- make advisor meetings and paper writing substantially easier (Story 3 and 4)

Deliverables:

- `/flow-writing` — claim-aware export for Results section
- `/flow-results` — aggregate validated findings with figure catalogs
- `environment/lib/export-eligibility.js` — shared outer-project policy helper used by writing and results flows
- advisor-meeting pack generator
- rebuttal prep pack

Exit gate:

- [ ] writing handoff only exports claims that are export-eligible under current kernel facts (lifecycle head not killed/disputed, absent from `listUnresolvedClaims`, citations VERIFIED)
- [ ] export-eligibility logic is implemented once in a shared outer-project helper, not duplicated across flows
- [ ] killed claims produce visible warnings if referenced
- [ ] advisor pack is assembleable from one command
- [ ] free writing (intro, discussion) is not blocked by claim status
- [ ] kernel test suite still passes

---

## Phase 4+: Connectors, Automations, Domain Packs (deferred)

These are real and useful but they depend on Phases 1-3 existing. Do not build:

- bibliography adapters before the literature flow works
- automations before the flow engine defines "stale" and "blocked"
- domain packs before the flow engine defines workflow stages

Plan these when Phase 3 is done and tested.

Platform substrate for Phase 4+: build connectors on Claude Code **Channels** (event ingress, two-way chat, webhook receivers, permission relay — v2.1.80+). Build durable automations on Claude Code **Desktop/Cloud Scheduled Tasks** (survive session close, unlike session-scoped `/loop`). Do not reinvent transport or scheduling infrastructure.

---

## What We Deliberately Avoid

- fully autonomous end-to-end paper generation
- host-adapter abstraction for non-existent second hosts
- dashboard-led truth mutation
- giant connector surface before inner flows work
- domain packs before the base workflow exists
- kernel truth-semantic changes during shell development; only contract-surface work such as `core-reader.js` is allowed on the kernel track

---

## Context Budget Gate

Every module added to the environment consumes context in Claude Code sessions. CLAUDE.md + SKILL.md + hooks already consume significant tokens. This must be measured, not merely acknowledged.

Before a phase that adds new flow surfaces can exit, record its context cost:

- How many tokens does its command shim or skill definition add?
- How much does its SessionStart output add?
- Is there a way to make it lazy-loaded (only present when invoked)?
- Can the same user value be delivered through a command shim plus workspace files instead of more always-loaded prompt text?

A system that is so large it suffocates the context available for actual research is worse than no system at all.
