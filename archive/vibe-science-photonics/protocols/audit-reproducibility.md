# Audit & Reproducibility

Pillar 4 of Vibe Science v3.5 — TERTIUM DATUR. Every decision logged, every run traceable, every comparison documented. If you cannot reproduce it, it did not happen.

## Decision Log

Append-only. Every decision with justification. Stored in `07-audit/decision-log.md`.

### Decision Entry Schema

```markdown
## DEC-YYYYMMDD-NNN

**Date:** YYYY-MM-DD HH:MM
**Context:** [What prompted this decision — cycle number, gate result, review finding]
**Decision:** [What was decided]
**Justification:** [Why — evidence-based, not opinion-based]
**Alternatives considered:**
1. [Alternative A] — rejected because [reason]
2. [Alternative B] — rejected because [reason]
**Trade-offs accepted:** [What we lose by this choice]
**Reversibility:** HIGH | MEDIUM | LOW
**Claims affected:** [C-xxx, C-yyy]
**Gate:** [Which gate required this decision, if any]
```

### Example

```markdown
## DEC-20260218-003

**Date:** 2026-02-18 15:30
**Context:** Gate 2 — modulation format selection for link budget analysis across 15 studies
**Decision:** Compare NRZ vs PAM4 at fixed data rate (50 Gb/s), with temperature and fiber type as controlled variables
**Justification:**
- Literature survey shows data_rate_Gbps is the primary performance differentiator (explains 42% of BER variance)
- Temperature is confounded with device generation (older VCSELs tested at 25°C only, newer at full range)
- Controlling for temperature allows fair comparison without conflating device improvements with modulation gains
**Alternatives considered:**
1. Compare across all data rates simultaneously — rejected: mixes fundamentally different operating regimes
2. Group by device_type — rejected: too many device variants, under-powered per group
3. Include all modulation formats (NRZ, PAM4, PAM6, DMT) — rejected: PAM6 and DMT have <5 papers each, insufficient for comparison
**Trade-offs accepted:** Device-to-device variation within modulation format not fully controlled
**Reversibility:** HIGH — can re-run with different grouping variables
**Claims affected:** C-001, C-005, C-012
**Gate:** G2 (Design Justification)
```

## Run Comparison

When multiple runs exist, produce a structured comparison in `07-audit/run-comparison.md`.

### Comparison Template

```markdown
# Run Comparison: [Run A] vs [Run B]

## Summary
| | Run A | Run B |
|---|---|---|
| Date | YYYY-MM-DD | YYYY-MM-DD |
| Key change | [what changed] | [what changed] |
| Decision | [accepted/rejected] | [accepted/rejected] |

## Parameter Diff

| Parameter | Run A | Run B | Δ |
|-----------|-------|-------|---|
| data_rate_Gbps | 50 | 50 | 0 |
| temperature_C | 25 | 85 | +60 |
| fiber_length_m | 100 | 100 | same |

## Metric Diff

| Metric | Run A | Run B | Δ | Better? |
|--------|-------|-------|---|---------|
| BER | 2.1e-4 | 8.5e-4 | +6.4e-4 | degraded |
| Power penalty (dB) | 1.8 | 3.9 | +2.1 | degraded |
| Reach (m) | 400 | 150 | -250 | degraded |

## Figure Comparison
[Side-by-side BER waterfall curves, eye diagrams, power penalty bar charts]

## Decision Motivation
Run B confirms significant temperature degradation: at 85°C, BER increases by 4x and reach drops by 62%. The 2.1 dB additional power penalty at high temperature is consistent with VCSEL thermal rollover. This must be controlled for in any cross-study comparison.

## Claims Affected
- C-002 (PAM4 advantage over NRZ): temperature dependence must be documented as confounder
```

## Run Manifest

Every run MUST produce a `manifest.json` (see analysis-orchestrator.md for full schema). The manifest enables:

1. **Exact reproduction**: Same parameters + same seeds + same versions → same output
2. **Provenance chain**: Input hash → processing → output hash
3. **Comparison**: Diff two manifests to see exactly what changed

### Manifest Validation Checklist

```
□ All parameters recorded (no implicit defaults — everything explicit)
□ Random seeds listed (minimum 2 for stochastic methods)
□ Package versions exact (not ranges, not "latest")
□ Input file checksums present (SHA-256)
□ Output file checksums present (SHA-256)
□ Gates passed listed
□ Decision recorded (accepted/rejected + reason)
□ Previous run referenced (if applicable)
```

## Snapshot Protocol

At key milestones, create a snapshot of the entire .vibe-science/ state:

### When to Snapshot

- Before a serendipity pivot
- Before a major architectural change
- After final Reviewer Ensemble approval
- Before concluding an RQ (positive or negative)

### Snapshot Contents

```
snapshots/YYYY-MM-DD-[reason]/
├── STATE.md                    (copy)
├── CLAIM-LEDGER.md             (copy)
├── ASSUMPTION-REGISTER.md      (copy)
├── PROGRESS.md                 (last 50 lines)
├── latest-run/manifest.json    (copy)
└── SNAPSHOT-NOTE.md            (why this snapshot was taken)
```

## Diff Thinking

To save tokens and time, apply diff thinking:

1. **Before each cycle**: What changed since last cycle? Only process the delta.
2. **Claim ledger updates**: Only re-score claims whose evidence changed.
3. **Run comparisons**: Only highlight parameters and metrics that differ.
4. **Search deduplication**: Before running a query, check queries.log. If already run with ≤7 day staleness, skip.
5. **Finding deduplication**: Before creating a finding doc, check FINDINGS.md. If substantially similar finding exists, update instead of creating new.

### Dedup Protocol for Sources

```markdown
## Source Dedup Check

Before adding a source:
1. Check if DOI already appears in CLAIM-LEDGER.md or any finding doc
2. If yes: reference existing entry, do not re-extract
3. If no: extract and add as new source
4. Maintain a source registry:

| DOI | First seen | Referenced by | Last checked |
|-----|-----------|---------------|-------------|
| 10.1038/xxx | 2025-02-07 | C-001, C-005 | 2025-02-07 |
```

## Triage Classification

Not everything is equally important. Classify issues before investing effort:

| Priority | Criteria | Action |
|----------|----------|--------|
| **P0 — Critical** | Invalidates current conclusions. Data integrity issue. Gate-blocking. | Fix immediately. Stop all other work. |
| **P1 — Major** | Significantly affects quality. Weakens claims. Missing required evidence. | Fix before next cycle. Log in decision-log. |
| **P2 — Minor** | Cosmetic. Additional supporting evidence. Nice-to-have ablation. | Queue for batch processing. Do not block progress. |
| **P3 — Deferred** | Future improvement. Optimization. Alternative approach to try later. | Log in PROGRESS.md. Address in future RQ or session. |

## Reproducibility Contract

A research output is reproducible if and only if:

1. **All inputs** are specified with checksums
2. **All parameters** are explicit (no implicit defaults)
3. **All seeds** are recorded
4. **All versions** are pinned
5. **All decisions** are logged with justification
6. **All gates** are documented with pass/fail evidence
7. **All claims** are in the ledger with computed confidence
8. **All assumptions** are registered with risk and verification plan
9. **All artifacts** exist as files (not just prose descriptions)
10. **A fresh execution** from the manifest would produce equivalent results (stochastic methods: within seed-replicate variance)
