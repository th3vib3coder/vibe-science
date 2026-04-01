# 03 — Architecture Overview

---

## System Shape

```
┌─────────────────────────────────────────────┐
│         Vibe Science Kernel (plugin/)        │
│  hooks · gates · DB · claim/citation truth   │
└──────────────────┬──────────────────────────┘
                   │ read-only projections
          core-reader.js / CLI bridge
                   │
┌──────────────────▼──────────────────────────┐
│    Vibe Research Environment (environment/)   │
│                                               │
│  ┌───────────────────────────────┐            │
│  │ Control Plane / Query Surface │            │
│  │ session · attempts · events   │            │
│  └───────┬───────────────┬───────┘            │
│          │               │                    │
│  ┌───────▼──────┐ ┌──────▼──────┐ ┌────────┐ │
│  │    Flow      │ │   Memory    │ │Experiment││
│  │   Engine     │ │   Layer     │ │   Ops    ││
│  └──────┬───────┘ └──────┬──────┘ └────┬─────┘│
│         │                │              │      │
│  ┌──────▼──────┐  ┌──────▼──────┐ ┌────▼─────┐│
│  │ Writing &   │  │ Connectors  │ │Automation││
│  │   Export    │  │  (Phase 4)  │ │(Phase 4) ││
│  └─────────────┘  └─────────────┘ └──────────┘│
│                                               │
│              Domain Packs (Phase 4)           │
└───────────────────────────────────────────────┘
```

**User-facing center of gravity:** The Flow Engine.
**Operational substrate:** The Control Plane and Query Surface.

---

## Eight Modules

| # | Module | Phase | Purpose |
|---|--------|-------|---------|
| 1 | **Control Plane / Query Surface** | 1 | Canonical session snapshot, attempts, telemetry, decisions, capabilities, query layer |
| 2 | **Flow Engine** | 1 | Guide researcher through literature → experiment → results → writing |
| 3 | **Memory Layer** | 2 | Human-readable project memory synced from kernel projections |
| 4 | **Experiment Ops** | 1-2 | Registry, manifests, result bundles, figure catalogs |
| 5 | **Writing & Export** | 3 | Claim-aware writing handoff, advisor packs, deliverables |
| 6 | **Connectors** | 4+ | Zotero, Obsidian, filesystem adapters |
| 7 | **Automation** | 4+ | Digests, reminders, scheduled checks |
| 8 | **Domain Packs** | 4+ | Domain-specific overlays and templates |

Modules 1-5 are the product. Modules 6-8 are deferred but designed now so
nothing in 1-5 blocks them.

---

## Two-Substrate Execution Model

Every flow command uses exactly TWO data substrates. No others.

The control plane is a runtime coordination layer over those two substrates. It
is NOT a third data source.

### Substrate 1: Workspace Files (primary)

Read and write files in the project workspace. Used for:
- Control plane: `.vibe-science-environment/control/session.json`
- Flow state: `.vibe-science-environment/flows/index.json`
- Experiment manifests: `.vibe-science-environment/experiments/manifests/`
- Memory mirrors: `.vibe-science-environment/memory/`
- Kernel workspace files (read-only): `.vibe-science/STATE.md`, `CLAIM-LEDGER.md`

**Tools used:** Read, Write, Edit, Glob, Grep

### Substrate 2: Kernel CLI Bridge (when structured facts needed)

Invoke `core-reader-cli.js` for DB-backed projections. Used when:
- Flow needs claim lifecycle state (not just what's in CLAIM-LEDGER.md prose)
- Flow needs unresolved-claims set (stop-hook semantics)
- Flow needs citation verification status
- Flow needs gate history

**Tools used:** Bash (node plugin/scripts/core-reader-cli.js ...)

### Decision Rule

```
Does the flow need structured kernel facts
that workspace files don't reliably contain?
  YES → use CLI bridge
  NO  → use workspace files directly
```

Examples:
- "List my experiments" → workspace files (manifests are ours)
- "Which claims are export-eligible?" → shared export helper over claim heads + citation checks + profile-safety metadata (with unresolved-claim diagnostics when useful)
- "Show current STATE.md" → workspace file (it's a readable projection)
- "How many gates failed last session?" → CLI bridge (gate_checks table)

---

## State Zones

Two distinct state zones. They NEVER overlap.

### Kernel-Owned State (do not touch)

```
.vibe-science/
├── STATE.md              — kernel-authored session projection
├── CLAIM-LEDGER.md       — claim lifecycle truth
├── PROGRESS.md           — append-only research log
├── SERENDIPITY.md        — serendipity seed registry
└── ASSUMPTION-REGISTER.md — assumption tracking
```

Plus: SQLite database (16 tables), managed entirely by kernel hooks.

### Outer-Project State (ours)

```
.vibe-science-environment/
├── .install-state.json    — lifecycle-owned install/repair state
├── control/
│   ├── session.json        — canonical operator snapshot
│   ├── attempts.jsonl      — append-only attempt ledger
│   ├── events.jsonl        — append-only telemetry stream
│   ├── decisions.jsonl     — append-only workflow decisions
│   ├── capabilities.json   — capability snapshot
│   └── locks/              — atomic write guards
├── flows/
│   ├── index.json          — flow-local plan state owned by active flow
│   ├── literature.json     — registered papers, gaps
│   ├── experiment.json     — experiment summaries
│   └── handoffs/           — cross-flow handoff notes
├── experiments/
│   └── manifests/          — one JSON per experiment (completedAt, blockers, notes included)
├── results/
│   ├── experiments/        — per-experiment bundles
│   └── summaries/          — flow-level result summaries
├── memory/
│   ├── mirrors/            — MACHINE-WRITTEN (overwritten by /sync-memory)
│   │   ├── project-overview.md
│   │   ├── decision-log.md
│   │   ├── papers/
│   │   ├── experiments/
│   │   └── results/
│   ├── index/
│   │   └── marks.jsonl     — relational retrieval marks
│   ├── sync-state.json     — freshness manifest for mirrors
│   └── notes/              — HUMAN-WRITTEN (never overwritten by sync)
│       ├── writing/        — conventions, phrasing, reviewer patterns
│       ├── daily/          — chronological work logs
│       └── meetings/       — advisor notes
├── governance/
│   └── schema-validation/  — fresh validation artifacts for profile-safety export checks
├── metrics/
│   └── costs.jsonl         — outer-project session/cost tracking
├── operator-validation/
│   └── benchmarks/         — per-task/per-repeat benchmark and operator artifacts
└── writing/
    ├── exports/            — claim-backed writing artifacts
    ├── advisor-packs/      — meeting bundles
    └── rebuttal/           — rebuttal prep bundles
```

**Rule:** Outer project MUST NOT write into `.vibe-science/`. Kernel does NOT auto-load `.vibe-science-environment/`.

---

## Command Registration

Flow commands are registered as Claude Code command shims in `commands/`:

| Command | File | What it does |
|---------|------|-------------|
| `/flow-status` | `commands/flow-status.md` | Show environment status overview |
| `/flow-literature` | `commands/flow-literature.md` | Literature tracking and gap analysis |
| `/flow-experiment` | `commands/flow-experiment.md` | Experiment registry and tracking |
| `/flow-results` | `commands/flow-results.md` | Results packaging (Phase 2-3) |
| `/flow-writing` | `commands/flow-writing.md` | Claim-aware writing handoff (Phase 3) |
| `/sync-memory` | `commands/sync-memory.md` | Refresh memory mirrors from kernel projections (Phase 2) |

These are **thin entrypoints** (prompt shims), not executable JS. Real logic lives in `environment/`. The shims:
1. Detect whether the CLI bridge is available
2. Load flow state from workspace files
3. Invoke CLI bridge for structured kernel facts when needed
4. Degrade honestly when bridge unavailable

Phase rule:
- Phase 1 is NOT prompt-only
- command shims are the host-facing layer
- minimal reusable logic must live in `environment/lib/` and `environment/flows/`
- if a flow behavior is repeated across commands, it belongs in a JS helper, not duplicated in markdown

---

## Source Code Layout

```
environment/
├── control/                — canonical outer-project operational substrate
│   ├── session-snapshot.js
│   ├── attempts.js
│   ├── decisions.js
│   ├── events.js
│   ├── capabilities.js
│   ├── middleware.js
│   └── query.js
├── flows/                  — flow orchestration logic
│   ├── literature.js       — literature flow helpers
│   ├── experiment.js       — experiment flow helpers
│   ├── results.js          — results packaging helpers
│   └── writing.js          — writing handoff helpers
├── lib/
│   ├── export-eligibility.js — derived policy from kernel projections
│   ├── flow-state.js       — read/write flow state JSON
│   ├── manifest.js         — experiment manifest CRUD
│   ├── token-counter.js    — provider-aware token counting with fallback
│   └── session-metrics.js  — per-session metric accumulation for budget guardrails
├── schemas/                — JSON schemas for machine-owned runtime contracts and gating artifacts
│   ├── session-snapshot.schema.json
│   ├── capabilities-snapshot.schema.json
│   ├── attempt-record.schema.json
│   ├── event-record.schema.json
│   ├── decision-record.schema.json
│   ├── flow-index.schema.json
│   ├── literature-flow-state.schema.json
│   ├── experiment-flow-state.schema.json
│   ├── export-snapshot.schema.json
│   ├── export-record.schema.json
│   ├── export-alert-record.schema.json
│   ├── schema-validation-record.schema.json
│   ├── experiment-manifest.schema.json
│   ├── costs-record.schema.json
│   └── install-state.schema.json
├── evals/                  — benchmark definitions (not runtime truth)
│   ├── tasks/
│   ├── metrics/
│   └── benchmarks/
├── memory/
│   └── sync.js             — mirror kernel state to markdown
├── templates/
│   ├── flow-index.v1.json
│   ├── session-snapshot.v1.json
│   ├── attempt-record.v1.json
│   ├── literature-flow-state.v1.json
│   ├── experiment-flow-state.v1.json
│   └── experiment-manifest.v1.json
└── tests/
    └── ...                 — outer-project tests (not kernel tests)
```

**Note:** For V1 incubation, this lives inside the vibe-science repo. Future: separate repo.

---

## Context Budget

The environment consumes Claude Code session context. Budget matters.

**Always loaded:** CLAUDE.md + SKILL.md + SessionStart injection = ~800-1000 tokens
**Per-command:** Each flow command adds its own prompt (~200-400 tokens)
**CLI bridge calls:** Each call adds JSON response to context

**Rule:** Modules MUST be lazy-loaded. Don't inject flow state at SessionStart. Load it only when a `/flow-*` command runs. Measure context cost before each phase exit.

---

## Error Philosophy

Errors in the outer project MUST NOT corrupt the kernel.

1. **Flow state corrupt?** Reset flow state, ask user to re-run `/flow-status`. Kernel unaffected.
2. **Control-plane snapshot corrupt?** Rebuild from flow state + kernel projections. Kernel unaffected.
3. **CLI bridge fails?** Degrade to workspace-first mode. Show "kernel DB unavailable."
4. **Experiment manifest invalid?** Warn and skip. Don't cascade to kernel gates.
5. **Memory sync fails partway?** Leave partial file. Log warning. Kernel unaffected.
6. **Telemetry or attempt history partial?** Surface "partial visibility" explicitly. Never fake completeness.

**The shell may degrade experience. It must not degrade truth.**
