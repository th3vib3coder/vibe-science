# 02. Flow Layer

## Status Note

This document defines **governance boundaries** for the flow layer.

Detailed V1 execution choices now live in:

- [Vibe Science Research Environment V1 Spec](../VIBE-SCIENCE-RESEARCH-ENVIRONMENT-V1-SPEC.md)
- [Product Architecture](../research-environment-v1/02-product-architecture.md)
- [Topology and Boundaries](../research-environment-v1/03-topology-and-boundaries.md)

If this document and the product spec disagree on flow execution mechanics, the product spec wins. This document is about what the flow layer may and may not do, not about the full runtime substrate.

## Purpose

Define the broader workflow layer around the core runtime.

The Flow Layer exists to help a PhD or research engineer move across the real lifecycle of work without pushing that lifecycle into the core hooks.

## Design Rule

The Flow Layer coordinates work.
It does not certify truth.

## Target Flows

### A. Ideation Flow (deferred — not in V1 product spec)

**Note:** The Ideation Flow is not present in the V1 product spec ([02-product-architecture.md](../research-environment-v1/02-product-architecture.md)). The existing `/start` command already covers early-stage brainstorming (Phase 0 scientific brainstorm in start.md). If a dedicated Ideation Flow is built later, it should not duplicate what `/start` already does.

Goal (when built):

- move from vague topic to researchable direction
- structure early literature discovery
- capture open questions and candidate hypotheses

Not allowed:

- bypassing `L-1+`
- validating claims before evidence exists

### B. Literature Flow

Goal:

- ingest, normalize, organize, and synthesize papers
- maintain inventories and reading-note pipelines

Allowed outputs:

- paper notes
- literature synthesis drafts
- gap maps
- bibliography bundles

Not allowed:

- turning imported references into verified citations without core verification

### C. Experiment Flow

Goal:

- organize experiment planning, run tracking, ablations, baselines, and result bundles

Allowed outputs:

- experiment registry entries
- run manifests
- result summaries
- figure manifests

Not allowed:

- elevating experiment summaries into validated scientific claims without the core path

### D. Results Flow

Goal:

- package validated outputs into human-facing artifacts

Allowed outputs:

- results reports
- stats appendices
- figure catalogs
- advisor summaries

Not allowed:

- new scientific truth judgments outside the claim pipeline

### E. Writing Handoff Flow

Goal:

- export validated material into writing workflows

Allowed outputs:

- paper section seeds
- rebuttal prep dossiers
- response-to-reviewer packs
- slide/poster outline packs

Not allowed:

- free writing that silently mutates validated findings

## User Interaction Model

Flows are invoked explicitly by the researcher through **Claude Code command entrypoints** (e.g. `/flow-literature`, `/flow-experiment`, `/flow-results`). They are never auto-triggered by hooks or hidden behind automatic orchestration.

The researcher decides when to enter a flow. The flow guides the work. The core gates still block if integrity conditions are not met.

## Writing-Core Boundary

The writing handoff is the most delicate boundary in the entire system. Rules:

1. The writing flow may only consume claims that are **export-eligible under current kernel facts**. In V1 that is a derived policy, not a single raw lifecycle label. Draft, disputed, killed, unresolved, or citation-unverified claims must not appear in Results-facing artifacts without explicit caveat.
2. Every claim-to-text export must carry the `claim_id` as traceability metadata, so the origin is auditable.
3. If a claim is killed or disputed after export, the memory layer should surface an alert in the writing memory (e.g. "Claim C-042 was killed after being exported to paper draft on 2026-03-25").
4. Free writing that invents findings not traceable to validated claims is the single most dangerous failure mode of this layer.

## Flow Layer Components

Likely components:

- command shims (invocable via `/flow-*`)
- orchestration helpers
- project templates
- artifact exporters
- helper scripts
- pack-specific workflow presets

## Flow Layer Placement

Preferred placement:

- `commands/`
- flow-specific helper modules
- documentation and templates outside the core plugin

Avoid pushing flow logic into:

- `post-tool-use.js`
- `stop.js`
- `session-start.js`
- gate engine internals

## Adversarial Review Questions

Every flow proposal must answer:

- is this workflow coordination or truth adjudication?
- can it be turned off without damaging TRACE?
- does it create a parallel truth path?
- does it tempt users to skip the hard core?

If the answer to the last two is yes, redesign it.
