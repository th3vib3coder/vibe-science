# Vibe Science Research Environment V1 Spec

**Status:** Draft for adversarial review  
**Date:** 2026-03-27  
**Scope:** Define an outer research environment that uses Vibe Science as integrity kernel without diluting the core

This document is the canonical entrypoint for the "outer project" track.

It is intentionally modular. The detailed spec lives under [research-environment-v1](./research-environment-v1/README.md).

Read these first:

1. [Current Vibe Science System Map](./CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md)
2. [Vibe Science Core Contract](./VIBE-SCIENCE-CORE-CONTRACT.md)
3. [Vibe Science Broader System Spec](./VIBE-SCIENCE-BROADER-SYSTEM-SPEC.md)

---

## Goal

Build a broader semi-automated research environment for real PhD work while keeping Vibe Science as the protected integrity kernel.

This outer project should cover the workflow territory that Vibe Science does not yet cover deeply:

- literature operations
- project memory
- experiment operations
- result packaging
- writing handoff
- connectors and channels
- reminders, digests, and operator automations

---

## Who This Is For And What They Cannot Do Today

The spec must start from real frustrations, not abstract modules. These are the concrete problems this environment solves.

### Story 1: "I open a new session and have no idea where I left off"

Carmine has been working on a scRNA-seq analysis for 3 weeks across 15+ sessions. He opens Claude Code on Monday morning. The TRACE runtime injects ~700 tokens of state, but that's a compressed machine summary. He has no human-readable project overview: which experiments ran, which claims survived, which are stuck, what the advisor asked for last Thursday. He spends 20 minutes re-reading STATE.md and PROGRESS.md to reconstruct context.

**What the environment gives him:** A typed project memory mirror — a human-readable `project-overview.md` synced at session end, showing: active claims and their status, pending experiments, open blockers, last advisor feedback, and a "where you left off" section. He reads it in 2 minutes and starts working.

### Story 2: "I ran 6 experiments but can't find the results from experiment 3"

The analysis produced multiple outputs across sessions: CSV files, plots, intermediate dataframes. Some are in `outputs/`, some in `figures/`, some lost in a previous session's working directory. When the advisor asks "show me the ablation where you removed batch correction," Carmine can't find it.

**What the environment gives him:** An experiment registry. Each experiment gets a manifest (parameters, code version, random seed, output paths). Results are bundled. When the advisor asks, Carmine runs `/experiment list` and gets a table of all runs with links to their bundles.

### Story 3: "I need to prepare for my advisor meeting and it takes me 2 hours"

The advisor wants: current results, what changed since last meeting, open questions, and next steps. Carmine manually assembles this from CLAIM-LEDGER.md, PROGRESS.md, scattered figures, and memory. It takes 2 hours of copy-paste and reformatting every time.

**What the environment gives him:** An advisor-meeting pack generator. It reads kernel state (validated claims, gate history, recent experiments) and assembles a structured report: claims with evidence status, new figures, open blockers, proposed next steps. Carmine reviews and edits it in 20 minutes.

### Story 4: "I want to write the Results section but I don't know which findings are safe to write about"

Carmine has 12 claims in the ledger. Some are PROMOTED, some DISPUTED, some still under review. He starts writing and accidentally includes a finding that R2 killed two sessions ago. The paper draft now contains a false claim.

**What the environment gives him:** A claim-aware writing handoff. When he starts writing Results, the environment shows only PROMOTED/ROBUST claims with their evidence chains. Killed and disputed claims are flagged with warnings. If a claim gets killed after being exported to a draft, he gets an alert.

### Story 5: "I found 3 papers that are directly relevant but I have no structured way to track them"

During analysis, Carmine finds papers via WebSearch that relate to his claims. He pastes URLs into notes, but there's no structured tracking. Two weeks later he can't remember which paper supported which claim, or whether he already checked a specific paper against his methodology.

**What the environment gives him:** A literature tracking flow. Papers get registered with metadata (DOI, relevance, which claims they relate to). The flow surfaces papers that haven't been cross-checked against methodology yet, and tracks which literature searches have been done for which research directions.

---

## Strategic Position

We are **not** trying to clone ScienceClaw, AutoResearchClaw, ResearchClaw, Claude Scholar, or any other workflow-first research assistant.

We are doing something else:

**build a workflow-capable research environment around an integrity-first kernel**

The core rule remains:

`hard integrity kernel + broad but subordinate operational shell`

---

## What This Track Learns From Competitors

This spec is informed by competitive review of:

- [ScienceClaw](https://github.com/lamm-mit/scienceclaw)
- [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw)
- [ResearchClaw](https://github.com/ymx10086/ResearchClaw)

But the output is deliberately our own architecture, built around Vibe Science rather than OpenClaw.

High-level lessons:

- breadth matters
- workflow packaging matters
- visible artifacts and deliverables matter
- control-plane UX matters
- persistent project state matters
- none of that is allowed to become a second truth system

---

## Product Thesis

The outer project should become:

**a local-first research environment that can plan, track, package, and semi-automate the full PhD workflow while delegating scientific integrity truth to Vibe Science**

This means:

- the environment may orchestrate work
- the environment may maintain project memory
- the environment may package outputs
- the environment may assist writing and reporting
- the environment may run reminders and digests
- the environment may integrate with external tools
- the environment may not validate claims on behalf of the kernel

---

## Modular Spec

1. [Competitive Lessons](./research-environment-v1/01-competitive-lessons.md)
2. [Product Architecture](./research-environment-v1/02-product-architecture.md)
3. [Topology and Boundaries](./research-environment-v1/03-topology-and-boundaries.md)
4. [Delivery Roadmap](./research-environment-v1/04-delivery-roadmap.md)

---

## Core Non-Negotiables

- The kernel remains authoritative for claim truth, citation truth, gate meaning, integrity state, and stop semantics.
- The outer project may consume projections, not mutate truth.
- Memory is a mirror, never a competing authority.
- Writing has three tiers: Results and quantitative conclusions are claim-backed (must reference PROMOTED/ROBUST claims). Methods are artifact-backed (must be grounded in experiment manifests and result bundles). Introduction, Discussion, and hypothesis-writing are free — the kernel has no authority over the researcher's prose.
- Automations may assist, remind, package, and summarize; they may not self-legitimate research conclusions.
- The environment must not consume so much context that the researcher can't do research. Lazy-loading and minimal SessionStart footprint are architectural requirements.

---

## Ready-for-Planning Rule

The outer-project track is ready for implementation planning only if all four modular docs agree on:

- repo topology
- kernel boundary
- safe data flow
- non-authoritative memory model
- claim-aware writing boundary
- phased delivery order

If any proposed feature requires weakening the kernel contract, it is out of scope for this track.

