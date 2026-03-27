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
- domain-specific workflow overlays

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
- Writing is claim-aware and must remain traceable to validated kernel outputs.
- Automations may assist, remind, package, and summarize; they may not self-legitimate research conclusions.

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

