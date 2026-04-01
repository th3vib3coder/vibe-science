# 03. Memory Layer

## Status Note

This document defines **safe memory boundaries**, not the fully detailed Phase 2 execution model.

The Memory Layer must pass the same review standard as the Flow Engine did:

- explicit writer ownership
- explicit workspace path
- explicit sync triggers
- explicit degradation behavior

Until those are fully designed in the product track, this document should be read as a governance document rather than a runtime design.

## Purpose

Define a broader human-readable memory system without replacing runtime truth.

This is the layer that makes Vibe Science more usable across long projects, meetings, papers, and collaboration.

## Thesis

The Memory Layer is a **mirror and synthesis layer**, not a truth layer.

## Why It Is Needed

The current runtime is strong on:

- persistence
- claims
- citations
- reviews
- alerts
- patterns

But researchers also need:

- readable project context
- durable notes
- daily and weekly summaries
- paper notes
- experiment logs
- writing memory
- meeting preparation artifacts

## Proposed Memory Surfaces

### A. Project Memory

Suggested structure under the outer-project workspace:

- `.vibe-science-environment/memory/Project/`
- `.vibe-science-environment/memory/Papers/`
- `.vibe-science-environment/memory/Experiments/`
- `.vibe-science-environment/memory/Results/`
- `.vibe-science-environment/memory/Writing/`
- `.vibe-science-environment/memory/Daily/`
- `.vibe-science-environment/memory/Meetings/`

### B. Writing Memory

Use case:

- stable writing conventions
- accepted phrasing patterns
- reviewer-response memory
- section-level preferences

This is allowed as a writing aid, not as a source of scientific truth.

### C. Experiment Memory

Use case:

- run summaries
- ablation notes
- baseline tracking
- failure traces
- next-step proposals

### D. Literature Memory

Use case:

- paper notes
- synthesis notes
- topical maps
- literature inventories

## Memory Rules

### Rule 1: Mirror, Do Not Compete

If the same fact exists in both:

- runtime DB / canonical artifacts
- memory markdown

the runtime wins.

### Rule 2: No Silent Truth Drift

Memory sync may not silently:

- rewrite claim status
- rewrite citation status
- rewrite gate outcomes
- invent stronger certainty than the runtime contains

### Rule 3: Provenance Must Be Preserved

When memory surfaces derived runtime content, they should preserve origin:

- claim IDs
- citation IDs where useful
- report source
- timestamp or session source

### Rule 4: Notes May Synthesize, Not Certify

Notes may summarize and synthesize.
They may not certify scientific validity on behalf of the core.

## Sync Model

Mirrors must define when they update:

1. **By outer-project-owned actions, not kernel hooks**: the kernel stop hook must not write outer memory mirrors. That would make the kernel do shell work and would violate the boundary.
2. **On explicit command** (`/sync-memory`): researcher triggers a manual sync when needed mid-session or at session close.
3. **Possibly later via outer-project automation**: if the outer project later adds a session-close or scheduled sync surface, that automation must remain shell-owned rather than kernel-owned.
4. **Never automatically during scientific work**: sync must not interfere with the OTAE loop or gate enforcement.

Every mirror file must carry a visible timestamp showing when it was last synced. Stale mirrors are worse than no mirrors — they are lies.

Execution-model note:

- who writes mirrors in detail is still a Phase 2 product decision
- what is already decided is the boundary: mirrors are shell-owned, filesystem-first, and must not be written by kernel hooks

## Daily Notes Warning

Daily notes (`Daily/`) are ephemeral work logs, not evidence surfaces. A finding mentioned in a daily note is NOT a validated claim. Daily notes must never be cited as evidence in reports, papers, or writing handoffs. Findings must enter the core claim pipeline (CLAIM-LEDGER → R2 review → promotion) before they can be treated as validated.

## Tool Independence

The Memory Layer is **filesystem-first**: plain markdown files in a project subdirectory. No external tool is required. Obsidian, Notion, or any other knowledge tool is an optional adapter that adds linking, graph view, or sync — but the memory layer works without it.

## Safe Initial Moves

Safe V1 memory work:

- project overview note
- experiment registry mirror
- results summary mirror
- daily summary exporter
- paper-note inventory
- writing-memory store

Unsafe early moves:

- bidirectional truth sync
- note-driven claim mutation
- note-driven gate changes
- autonomous summary writing that overwrites canonical artifacts
