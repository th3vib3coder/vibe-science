# 10 — Connectors

**Phase:** 4+ (deferred — designed now so Phases 1-3 don't block it)

---

## Purpose

Make Vibe Science easier to live with by connecting to external tools. Connectors are adapters, NOT alternative scientific runtimes.

---

## Five Connector Rules

### Rule 1: Adapter, Not Authority
Every connector must declare: what it reads, what it writes, whether one-way or two-way, and what mutations are forbidden. No connector may validate claims, verify evidence, or certify citations.

### Rule 2: One-Way by Default
Preferred direction: kernel/outer-project → external tool. Bidirectional sync is high-risk and requires explicit design review before implementation.

### Rule 3: No Gate Semantics in Connectors
Connectors may surface warnings and metadata. They may NOT define gate pass/fail logic.

### Rule 4: Graceful Failure
If Zotero, Obsidian, or any external tool is unavailable: the core still works, integrity is honest, failure is visible to the researcher.

### Rule 5: Prefer Host-Native Transport
Prefer Claude Code's native event and scheduling surfaces (Channels, Scheduled Tasks, or their successors) for event ingress and persistent automation. Don't reinvent transport that the host already provides.

---

## Target Connectors

### A. Zotero
**Safe:** Paper metadata import, collection organization, PDF attachment for full-text reading.
**Unsafe:** Treating library metadata as verified citations without kernel verification.

### B. Obsidian
**Safe:** Durable human-readable knowledge surface. Project memory mirror displayed in Obsidian vault.
**Unsafe:** Obsidian notes as canonical truth store for claims/citations/gates.

### C. Filesystem
**Safe:** Notebooks, figures, export bundles, shared paper repos. Experiment output directories.
**Unsafe:** File-based claim mutation bypassing kernel hooks.

### D. Writing Export
**Safe:** Transport for artifacts from Writing & Deliverables module. LaTeX templates, BibTeX export.
**Unsafe:** Connector owns generation or has hidden second writing-handoff implementation.

### E. Claude-Native Event Connector
**Safe:** Event ingress via Claude Code Channels for external notifications.
**Unsafe:** Connector defines workflow semantics or substitutes for Flow Engine.

---

## What's Safe to Build Early (once Phase 3 stable)

- Zotero paper import helper (one-way: Zotero → literature flow)
- Obsidian project memory mirror (one-way: outer project → vault)
- Paper-note exporter (one-way: memory → markdown)
- Results-report exporter (one-way: bundles → external format)
- Figure bundle exporter (one-way: bundles → folder)

## What's Unsafe Early

- External notes driving claim state
- Library metadata treated as verified evidence
- Silent bidirectional sync
- Rebuilding transport that Claude Code already provides

---

## Invariants

1. Connectors are adapters, not truth sources
2. One-way by default; bidirectional requires design review
3. External tool failure doesn't affect kernel integrity
4. No gate semantics in connectors
5. Prefer Claude Code native transport
