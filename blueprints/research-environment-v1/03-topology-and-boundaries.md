# Topology And Boundaries

**Purpose:** Decide how the outer project relates to the Vibe Science kernel

---

## Recommended Topology

This document should now be read together with:

- [Repo Topology Decision](../REPO-TOPOLOGY-DECISION.md)

Decided V1 incubation shape:

- the outer research environment stays in the same repo for now
- it lives in a strictly separated top-level workspace
- the current placeholder name for that workspace is `environment/`

Recommended long-term shape:

- `vibe-science` remains the protected kernel repo
- the broader research environment becomes a separate outer project

Why this is the preferred direction:

- it keeps the kernel mentally and operationally clean
- it prevents shell convenience from being mistaken for truth infrastructure
- it allows kernel and environment to evolve at different speeds
- it makes scope ownership explicit

Short version:

**same repo now, separate product later, always coupled by contract**

---

## What Stays In Vibe Science

The following stays in the kernel repo:

- hook chain
- persistence schema
- claim lifecycle truth
- citation truth
- gate semantics
- integrity semantics
- stop semantics
- observer, patterns, and harness hints
- kernel-side read-only projection layer

---

## What Belongs In The Outer Project

The following belongs outside the kernel:

- workflow orchestration
- outer-project policy helpers (for example export eligibility or flow-state helpers)
- typed project memory
- experiment registry and packaging
- reporting and writing handoff
- dashboards and other operator-facing operational surfaces
- connectors and channels
- reminders, digests, and operator automations
- domain packs and presets

---

## Interaction Contract

The outer project may interact with the kernel through:

1. read-only projection interfaces
2. kernel-safe commands
3. kernel-owned CLI bridges that wrap read-only projection interfaces for prompt-driven commands
4. ordinary non-authoritative workspace artifacts

The outer project may not interact with the kernel through:

1. direct DB writes
2. direct mutation of kernel-owned projections
3. convenience shortcuts that bypass hooks
4. direct mutation of claim / citation / gate truth state
5. ad hoc inline module imports or SQL snippets embedded in command markdown as a substitute for a real contract surface

---

## Governance-Sensitive Artifact Rule

Some artifacts are too close to kernel truth to be treated like normal notes.

Examples:

- `CLAIM-LEDGER.md`
- review artifacts that feed lifecycle ingestion
- `STATE.md`
- canonical findings files tied to gate logic

These must only be modified through kernel-observed paths.

The outer project may stage or draft around them.
It may not silently write through them.

---

## Host-Facing Entrypoint Exception

Claude Code command registration is a host constraint, not a reason to blur ownership.

For V1:

- outer-project slash commands may appear as thin entrypoint files in top-level `commands/`
- expected examples: `commands/flow-status.md`, `commands/flow-literature.md`, `commands/flow-experiment.md`
- these files are **host-facing shims**, not the home of flow logic
- real flow assets, state helpers, templates, schemas, and policy helpers still live under `environment/`
- when a command needs structured DB-backed kernel facts, it reaches them through a kernel-owned CLI bridge such as `plugin/scripts/core-reader-cli.js`
- command shims depend only on the CLI bridge's stable JSON envelope, never on raw SQL, raw SQLite output, or incidental console text
- changing a flow command should normally mean editing `environment/` plus a minimal command shim, not adding domain logic to kernel files

This is the one deliberate topology exception: host registration lives where Claude Code expects it, while product logic remains in the outer workspace.

---

## V1 Workspace State Boundary

Runtime code and workspace state must be separated as clearly as kernel and shell code.

Kernel-owned workspace state:

- `.vibe-science/STATE.md`
- `.vibe-science/CLAIM-LEDGER.md`
- `.vibe-science/PROGRESS.md`
- any other kernel-authored projections and governance-sensitive artifacts

Outer-project workspace state for V1:

- `.vibe-science-environment/flows/index.json`
- `.vibe-science-environment/flows/literature.json`
- `.vibe-science-environment/flows/experiment.json`
- `.vibe-science-environment/experiments/manifests/`
- later outer-project artifacts under `.vibe-science-environment/experiments/`, `.vibe-science-environment/writing/`, and similar paths

Rule:

- the outer project must not write its own state into `.vibe-science/`
- the kernel does not auto-load outer flow state during SessionStart in V1
- flow resumption is explicit: outer commands read `.vibe-science-environment/` when invoked

This keeps kernel truth state and outer workflow state physically separate even when both live in the same workspace.

---

## Naming Clarification

Two similarly named paths serve different roles and must not be confused:

- `environment/` — source-controlled outer-project code and assets in the repo
- `.vibe-science-environment/` — workspace-local runtime state produced and consumed by the outer project

Short rule:

- `environment/` is product source
- `.vibe-science-environment/` is product state

They are related conceptually but neither one contains the other.

---

## Suggested Naming Model

The new outer project should likely have its own name.

Until branding is decided, this spec uses generic language:

- `outer project`
- `research environment`
- `workbench`

This is intentional.

The architecture matters first.
Branding can follow.

---

## Shared Contract Surface To Build First

Before outer implementation starts, the kernel should expose a small read-only surface, for example:

- project overview
- session summaries
- claim heads and timelines
- citation summaries
- gate history
- active patterns
- pending seeds
- harness hints
- latest `STATE.md` snapshot

Without this, the outer project will couple itself to raw schema internals and become brittle.

---

## Core Risk To Avoid

The main failure mode is not technical complexity.

It is **epistemic drift by convenience**:

- notes start acting like truth
- dashboards start acting like truth
- writing starts acting like truth
- automation starts acting like truth

The topology exists to stop that drift before it starts.
