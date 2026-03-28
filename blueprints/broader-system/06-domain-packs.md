# 06. Domain Packs

## Purpose

Define how Vibe Science can broaden across domains without bloating the core.

## Thesis

Domain variation belongs in packs, not in the kernel.

## Status Note

This document defines pack boundaries and safe contents, not the final loading/runtime behavior for V1.
Domain packs are deferred until Phase 4+ in the product roadmap, after the Flow Engine has real workflow stages to preset.
If this file conflicts with the product execution model, the product spec wins on loading mechanics while this file continues to govern what packs may and may not do.

## Why Packs Matter

Different fields need different:

- literature sources
- artifact expectations
- report templates
- checklists
- vocabulary
- workflow emphasis

These differences should not force the core runtime to become domain-fragmented.

## What a Pack May Contain

- literature source presets
- workflow templates
- report templates
- domain-specific memory scaffolds
- adapter presets
- advisory hint catalogs that remain outside truth semantics
- examples and starter commands

## What a Pack May Not Contain

- modified gate semantics
- altered claim truth rules
- altered citation truth rules
- weakened stop behavior
- hidden bypasses of core enforcement

## Candidate Packs

- ML / AI research
- biomed
- omics
- causal inference
- photonics
- computational social science

## Pack Design Rule

Every pack must declare:

- assumptions
- supported workflows
- external connectors used
- artifacts produced
- what it does **not** modify in the core

## Loading Mechanism

A pack is activated by a `domain-config.json` file in the project root. The file declares:

```json
{
  "domain": "ml",
  "display_name": "ML / AI Research",
  "literature_sources": ["arxiv", "semantic-scholar", "openreview"],
  "report_template": "ml-report",
  "workflow_presets": ["experiment-heavy", "ablation-tracking"]
}
```

For V1+, the pack is read by outer-project commands and helpers when they need workflow presets.
Kernel SessionStart does **not** auto-load domain packs for the outer project.
No environment variables are required. The pack is project-scoped, not global.

## Safe Early Pack Strategy

Start with:

- literature source presets
- report templates
- project-memory scaffolds
- connector presets
- flow defaults consumed by outer-project commands after the base Flow Engine exists

Avoid early:

- domain-specific runtime branching inside hooks
- conditional gate semantics by domain
- any pack-loading path that makes kernel hooks responsible for outer-project behavior
