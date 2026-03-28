# Vibe Science Broader System Spec

**Status:** Draft for adversarial review  
**Date:** 2026-03-27  
**Scope:** Broaden Vibe Science into a semi-automated research environment without weakening the integrity kernel

This file is the canonical entrypoint for the "broader system" work inside the repo.

It intentionally stays short. Detailed product and architecture guidance is split into atomic documents under [broader-system](./broader-system/README.md).

Before reading the outer-system docs, first anchor on the current kernel:

1. [Current Vibe Science System Map](./CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md)
2. [Vibe Science Core Contract](./VIBE-SCIENCE-CORE-CONTRACT.md)

## Relationship To Other Specs

There are two spec tracks. They are not duplicates — they serve different purposes:

- **This file + `broader-system/`** — internal architectural governance. Defines invariants, boundaries, protected zones, and sequencing rules. This is the "what must not break" reference. Read this when deciding whether a proposed feature is safe.
- **`VIBE-SCIENCE-RESEARCH-ENVIRONMENT-V1-SPEC.md` + `research-environment-v1/`** — the product spec. Defines user stories, competitive context, module shapes, and delivery roadmap. This is the "what we build and why" reference. Read this when planning implementation.

If the two tracks ever contradict each other:

- **kernel invariants, truth boundaries, and protected-zone rules** from `broader-system/01-core-invariants.md` win
- **execution model, command registration, flow-state substrate, and delivery sequencing** from `research-environment-v1/` win

This split is intentional: governance protects the kernel; the product spec defines how the outer project actually runs.

## Goal

Broaden Vibe Science from an integrity-first research runtime into a wider semi-automated research environment for real PhD work:

- literature operations
- experiment operations
- results packaging
- writing handoff
- project memory
- external connectors
- recurring automations
- domain packs

Core formula:

`hard scientific runtime + soft operational shell`

## Non-Negotiable Thesis

Vibe Science must **not** evolve from a hard scientific runtime into a soft assistant suite.

It must evolve from a hard scientific runtime into the **integrity kernel** of a broader research operating environment.

## Non-Negotiable Boundaries

- The core truth model is protected.
- The broad shell may accelerate workflow; it may not legitimize claims.
- The shell may read from the core and mirror the core; it may not override the core.
- Adapters are not sources of truth.
- Automation may orchestrate, remind, package, and synchronize; it may not promote claims, validate evidence, or relax gate semantics.

## Product Decomposition

The broader system is split into six modules:

1. [Core Invariants](./broader-system/01-core-invariants.md)
2. [Flow Layer](./broader-system/02-flow-layer.md)
3. [Memory Layer](./broader-system/03-memory-layer.md)
4. [Connect Layer](./broader-system/04-connect-layer.md)
5. [Automation Layer](./broader-system/05-automation-layer.md)
6. [Domain Packs](./broader-system/06-domain-packs.md)

Sequencing and governance are defined in:

7. [Sequencing and Governance](./broader-system/07-sequencing-and-governance.md)

## Competitive Context

This work is informed by competitive analysis of Claude Scholar (Galaxy-Dawn/claude-scholar, 2026) and similar semi-automated research frameworks. Claude Scholar covers the full PhD lifecycle (literature, experiments, writing, rebuttal) with 62 skills and Obsidian/Zotero integration — but has no structural integrity enforcement (no blocking gates, no claim lifecycle, no confounder harness, no adversarial review with separation of powers).

The strategic choice: **broaden around a hard integrity kernel** rather than build a broad assistant suite from scratch. Their moat is usability. Ours is that our core enforcement is architectural and cannot be bolted onto a workflow-first system after the fact.

## What This Spec Is Not

This is not:

- a license to add broad features directly into hook logic
- a request to weaken the claim, citation, or gate model
- a plan to turn markdown notes into competing truth stores
- a permission slip for autonomous "AI scientist" behavior

## Initial Product Direction

The target product shape is:

- **Core**: TRACE runtime, gates, claims, citations, observer, persistence
- **Flow**: guided workflows for ideation, literature, experiments, reporting, writing handoff
- **Memory**: filesystem and note-based mirrors for durable human-readable project state
- **Connect**: adapters for Zotero, Obsidian, notebooks, figure folders, and export targets
- **Automations**: recurring checks, digests, prep packs, stale-state reminders
- **Packs**: domain-specific overlays that never mutate the core truth model

## Ready-for-Planning Rule

The broader-system work is ready for implementation planning only if all detailed docs agree on:

- protected core boundaries
- adapter vs source-of-truth separation
- automation limits
- safe write paths
- sequencing that starts outside the core

If a proposed feature requires changing gate semantics, claim truth, citation truth, or the stop model, it is out of scope for this track and must stop for redesign.
