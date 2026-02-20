# Analysis Orchestrator

Pillar 3 of Vibe Science — generates executable artifacts: structured comparison tables, analysis scripts, run plans, success/failure criteria. Every analysis produces standard outputs.

## Core Rule: Executable Over Descriptive

If a step can be a structured table, it MUST be a structured table. If a step can be a script, it MUST be a script. Prose descriptions of what to do are insufficient — produce the artifact that does it.

| Bad (descriptive) | Good (executable) |
|---|---|
| "Compare VCSEL performance" | `tables/01_vcsel_comparison.md` with exact parameters and metrics |
| "Check for temperature effects" | `scripts/02_temperature_analysis.py` producing `figures/ber_vs_temperature.png` |
| "The link reaches 100m" | `tables/reach_summary.md` with BER, power penalty, conditions |

## Artifact Contract

Every analysis run MUST produce these files. If any are missing, the run is **invalid** and Gate 5 fails.

```
run-YYYYMMDD-HHMMSS/
├── manifest.json          # REQUIRED — see schema below
├── report.md              # REQUIRED — standard report template
├── figures/               # REQUIRED — all generated figures
│   ├── [descriptive-name].png
│   └── ...
├── metrics.json           # REQUIRED — all computed metrics
├── tables/                # REQUIRED — structured comparison tables
│   ├── performance_comparison.md
│   └── ...
├── scripts/               # CONDITIONAL — if computational analysis performed
│   ├── 01_data_organize.py
│   ├── 02_comparison.py
│   └── ...
└── logs/                  # REQUIRED — execution logs and extraction notes
    ├── extraction_log.md
    └── decisions.md
```

### manifest.json Schema

```json
{
  "run_id": "run-20260218-143022",
  "created": "2026-02-18T14:30:22Z",
  "rq": "RQ-001",
  "description": "Literature comparison: PAM4 vs NRZ for VCSEL-based IM-DD at 50+ Gb/s",
  "parameters": {
    "device_type": "VCSEL_850nm",
    "wavelength_nm": 850,
    "temperature_range_C": [-40, 25, 85],
    "data_rate_Gbps": [25, 50, 100],
    "modulation_format": ["NRZ", "PAM4"],
    "fiber_type": ["MMF_OM3", "MMF_OM4", "MMF_OM5"],
    "fiber_length_m": [0, 100, 300, 500],
    "fec_type": "KP4",
    "target_ber": 2.4e-4,
    "n_studies_included": 15
  },
  "sources": {
    "total_papers_screened": 45,
    "papers_included": 15,
    "papers_excluded": 30,
    "exclusion_reasons": ["no VCSEL data", "different wavelength", "no BER reported"]
  },
  "input": {
    "search_queries": ["VCSEL PAM4 50Gbps", "850nm IM-DD high speed"],
    "databases_searched": ["IEEE Xplore", "Optica", "arXiv physics.optics"],
    "date_range": "2018-2026"
  },
  "output": {
    "files": ["tables/performance_comparison.md", "figures/ber_vs_datarate.png"],
    "n_datapoints": 87,
    "n_studies_represented": 15
  },
  "gates_passed": ["G0", "G1", "G2", "G3", "G4", "G5"],
  "decision": "ACCEPTED — PAM4 shows 2.1 dB power penalty advantage at 50 Gb/s over NRZ at equivalent BER",
  "previous_run": "run-20260217-091500",
  "comparison_summary": "Extended to include 2025-2026 papers, added temperature dependence analysis"
}
```

### report.md Standard Template

```markdown
# Run Report: [run_id]

## Summary
[2-3 sentences: what was compared, what was found, what was decided]

## Parameters
[Table of key parameters — copy from manifest.json]

## Gate Results
| Gate | Status | Notes |
|------|--------|-------|
| G0 — Input Sanity | PASS | Data from 15 papers verified, units normalized |
| G1 — Schema | PASS | All measurements have required fields |
| G2 — Design | PASS | Comparison methodology justified |
| G3 — Execution | PASS | All data extracted and cross-referenced |
| G4 — Metrics | PASS | See performance table below |
| G5 — Artifacts | PASS | All files present |

## Performance Comparison

| Study | Device | Data Rate (Gb/s) | Mod. | Temp (°C) | Fiber | Length (m) | BER | Power Penalty (dB) | Notes |
|-------|--------|-------------------|------|-----------|-------|------------|-----|-------------------|-------|
| [DOI] | VCSEL_850nm | 50 | PAM4 | 25 | MMF_OM4 | 100 | 2.1e-4 | 1.8 | KP4 FEC |
| [DOI] | VCSEL_850nm | 50 | NRZ | 25 | MMF_OM4 | 100 | 3.5e-4 | 3.9 | KP4 FEC |
| ... | | | | | | | | | |

## Key Metrics Summary

| Metric | NRZ | PAM4 | Delta | Decision |
|--------|-----|------|-------|----------|
| BER at 50 Gb/s (25°C, 100m OM4) | 3.5e-4 | 2.1e-4 | PAM4 better | Advantage confirmed |
| Power penalty vs BTB (dB) | 3.9 | 1.8 | PAM4 -2.1 dB | Significant advantage |
| Max reach at target BER (m) | 200 | 400 | PAM4 +200m | Substantial |
| Energy efficiency (pJ/bit) | 5.2 | 7.8 | NRZ -2.6 | NRZ advantage |

## Figures
- `figures/ber_vs_datarate.png` — BER comparison across data rates
- `figures/power_penalty_comparison.png` — Power penalty by modulation format
- `figures/temperature_sensitivity.png` — BER degradation with temperature
- `figures/reach_comparison.png` — Maximum reach at target BER

## Decision
**ACCEPTED.** PAM4 shows consistent advantages in BER and reach over NRZ at 50+ Gb/s for VCSEL-based IM-DD links. NRZ retains energy efficiency advantage. Trade-off documented.

## Assumptions Active
- A-001: KP4 FEC threshold (BER = 2.4e-4) used for all comparisons
- A-002: Temperature effects assumed comparable across devices at same temperature

## Open Issues
- [ ] Need ablation: temperature sensitivity at 85°C
- [ ] Need ablation: OM3 vs OM4 vs OM5 fiber comparison
- [ ] Missing: energy efficiency data for most PAM4 implementations
```

## Run Plan Template

Before any analysis run, produce a run plan:

```markdown
# Run Plan: [description]

## Objective
[What question does this run answer?]

## Success Criteria
- [ ] [Specific metric threshold or comparison]
- [ ] [Specific artifact to produce]
- [ ] [Specific gate to pass]

## Failure Criteria (stop-the-line)
- [ ] [What would make this analysis invalid]
- [ ] [What data gap would require restart]

## Steps
1. [Search/extraction step] → produces [data table]
2. [Normalization step] → produces [normalized data]
3. [Comparison step] → produces [comparison table + figures]
4. ...

## Dependencies
- Input papers: [list with DOIs]
- Required MCP skills: [openalex-database, web_search, etc.]
- Measurement normalizer: assets/obs-normalizer.md

## Estimated Resources
- Papers to process: [estimate]
- Data points expected: [estimate]
- Figures to generate: [estimate]
```

## Ablation Runner

When comparison parameters are chosen, produce an ablation matrix:

```markdown
# Ablation Matrix for [run_id]

## Variables to Test

| Variable | Values | Baseline | Rationale |
|----------|--------|----------|-----------|
| data_rate_Gbps | [10, 25, 50, 100, 200] | 50 | Covers legacy to next-gen data center links |
| temperature_C | [-40, 25, 85] | 25 | Industrial temp range; VCSEL performance highly sensitive |
| fiber_length_m | [0, 100, 300, 500, 1000] | 100 | Standard data center reaches |
| modulation_format | [NRZ, PAM4] | PAM4 | Primary comparison axis |
| fiber_type | [MMF_OM3, MMF_OM4, MMF_OM5] | MMF_OM4 | Current standard vs alternatives |

## Execution Plan

One-at-a-time (OAT) ablation from baseline:
1. Baseline: 50 Gb/s, 25°C, 100m, PAM4, OM4
2. Vary data_rate: 10, 25, 100, 200 Gb/s (keep rest at baseline)
3. Vary temperature: -40, 85°C (keep rest at baseline)
4. Vary fiber_length: 0, 300, 500, 1000m (keep rest at baseline)
5. Vary modulation: NRZ (keep rest at baseline)
6. Vary fiber_type: OM3, OM5 (keep rest at baseline)

Total: 1 (baseline) + 4 + 2 + 4 + 1 + 2 = 14 comparison sets

## Comparison Table (fill after execution)

| Run | Delta from baseline | BER | Power Penalty (dB) | Reach (m) | Decision |
|-----|---------------------|-----|---------------------|-----------|----------|
| baseline | — | | | | |
| data_rate=25 | | | | | |
| data_rate=100 | | | | | |
| ... | | | | | |
```

## Triage Mode

When an error occurs mid-analysis:

1. **Diagnose**: What failed? (missing data, unit inconsistency, contradictory sources, extraction error)
2. **Classify**: Is this a data issue, methodology issue, or source issue?
3. **Fix schema first**: If the data schema is wrong, fix it before anything else. Do not attempt workarounds.
4. **Minimal fix**: Apply the smallest change that resolves the error
5. **Re-gate**: Re-run from the last clean gate, not from scratch
6. **Log**: Document the error, diagnosis, fix, and impact in decision-log.md

**Anti-pattern: "romantic analysis"** — jumping to conclusions from partial data without completing systematic extraction. Instead: extract all data, normalize, compare, then conclude.

## Analysis Patterns

When generating analyses, follow these patterns. Route to MCP skills for implementation details.

### Literature Comparison Pattern
```python
# Route to: openalex-database, web_search skills for paper discovery
# Route to: literature-review skill for systematic review
# Produces: tables/performance_comparison.md, figures/comparison_plots.png
# Gate: G0 (Input Sanity) + G1 (Schema)
# Decisions: inclusion/exclusion criteria, normalization choices
```

### Performance Curve Extraction Pattern
```python
# Route to: web_search skill for paper access
# Produces: tables/ber_curves.csv, figures/ber_waterfall.png
# Gate: G2 (Design) + G4 (Metrics)
# Decisions: digitization method, interpolation approach
```

### Technology Readiness Assessment Pattern
```python
# Route to: openalex-database, perplexity-search skills
# Produces: tables/technology_readiness.md, figures/timeline.png
# Gate: G4 (Metrics) + G5 (Artifacts)
# Decisions: readiness criteria, commercial vs research distinction
```

### Cross-Study Meta-Analysis Pattern
```python
# Route to: statistical-analysis skill for meta-analysis
# Produces: tables/meta_analysis.md, figures/forest_plot.png
# Gate: G4 (Metrics)
# Standard metrics: weighted mean BER, power penalty variance, reach distribution
# Confounders: temperature, device generation, measurement setup
```

### Report Generator Pattern
```python
# Route to: scientific-visualization skill for figures
# Produces: report.md (standard template), run-comparison.md
# Gate: G5 (Artifacts)
# Always: summary + parameters + gates + metrics table + figures + decision
```
