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
- typed project memory
- experiment registry and packaging
- reporting and writing handoff
- dashboards and control plane
- connectors and channels
- reminders, digests, and operator automations
- domain packs and presets

---

## Interaction Contract

The outer project may interact with the kernel through:

1. read-only projection interfaces
2. kernel-safe commands
3. ordinary non-authoritative workspace artifacts

The outer project may not interact with the kernel through:

1. direct DB writes
2. direct mutation of kernel-owned projections
3. convenience shortcuts that bypass hooks
4. direct mutation of claim / citation / gate truth state

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
