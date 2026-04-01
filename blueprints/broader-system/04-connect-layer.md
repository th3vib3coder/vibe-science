# 04. Connect Layer

## Purpose

Define external integrations that make Vibe Science broader without letting external tools become core judges.

## Thesis

Connectors should make Vibe Science easier to live with.
They should not become alternate scientific runtimes.

## Status Note

This document defines connector governance, not the final V1 runtime model.
The current product sequencing defers connectors until Phase 4+ and prefers Claude Code native transport surfaces where available.
If this file ever conflicts with the execution mechanics in `research-environment-v1/02-product-architecture.md` or `research-environment-v1/04-delivery-roadmap.md`, those product documents win on implementation shape while this file continues to govern boundaries.

## Target Connectors

### A. Zotero Connector

Use cases:

- import papers by DOI / PMID / arXiv / URL
- organize collections
- read metadata
- attach literature inventories to projects

Safe role:

- source of paper metadata and library organization

Unsafe role:

- source of citation truth in place of the core verification path

### B. Obsidian Connector

Use cases:

- project memory mirror
- literature notes
- experiment notes
- results reports
- advisor meeting packs

Safe role:

- durable human-readable knowledge surface

Unsafe role:

- canonical truth store for claims, citations, or gates

### C. Filesystem Connector

Use cases:

- notebooks
- figure directories
- export bundles
- shared paper repos

### D. Writing Export Connector

Use cases:

- paper repo handoff
- rebuttal pack export
- appendix export
- figure-catalog export

Safe role:

- transport/export surface for artifacts already produced by the Writing & Deliverables module

Unsafe role:

- owning advisor-pack generation, figure-catalog generation, or writing-policy decisions
- becoming a hidden second implementation of writing handoff

### E. Claude-Native Event Connector

Use cases:

- advisor feedback arriving over Telegram / Discord
- CI or webhook events surfacing into a live session
- remote approval / permission relay during active work

Safe role:

- transport and event ingress surface for the outer project

Unsafe role:

- product logic in disguise
- connector-defined workflow semantics
- a substitute for the Flow Engine, writing policy, or kernel truth

## Connector Rules

### Rule 1: Adapter, Not Authority

Every connector must declare:

- what it reads
- what it writes
- whether it is one-way or two-way
- what it is forbidden to mutate

### Rule 2: One-Way By Default

Preferred initial pattern:

- core -> connector surface

Bidirectional sync is high-risk and should be avoided early.

### Rule 3: No Connector-Side Gate Semantics

Connectors may surface warnings and metadata.
They may not define gate pass/fail meaning.

### Rule 4: Failure Must Degrade Gracefully

If Zotero, Obsidian, or any other external tool is unavailable:

- the core still works
- integrity remains honest
- connector failure is visible

### Rule 5: Prefer Host-Native Transport Over Custom Bridges

If Claude Code already provides a safe host surface for transport or ingress:

- use that host-native surface first
- build domain logic on top of it
- do not create a parallel Telegram / Discord / webhook bridge just to feel more "platform-like"

In practice, this means Claude Code **Channels** should be the default Phase 4+ event-ingress substrate unless a concrete connector need cannot be met there.

## Safe Early Connector Work

- Zotero import helper
- Obsidian project memory mirror
- paper-note exporter
- results-report exporter
- figure bundle exporter
- channel-backed event ingress layered on Claude Code Channels rather than a custom bridge

## Unsafe Early Connector Work

- letting external notes drive claim state
- treating library metadata as verified evidence
- silent two-way sync into canonical runtime artifacts
- rebuilding transport and notification infrastructure that Claude Code already provides natively
