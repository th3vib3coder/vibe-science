# 04. Connect Layer

## Purpose

Define external integrations that make Vibe Science broader without letting external tools become core judges.

## Thesis

Connectors should make Vibe Science easier to live with.
They should not become alternate scientific runtimes.

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

## Safe Early Connector Work

- Zotero import helper
- Obsidian project memory mirror
- paper-note exporter
- results-report exporter
- figure bundle exporter

## Unsafe Early Connector Work

- letting external notes drive claim state
- treating library metadata as verified evidence
- silent two-way sync into canonical runtime artifacts
