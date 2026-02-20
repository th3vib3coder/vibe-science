# Skill Router

Vibe Science does not redo what other skills do. It orchestrates, gates, and audits. The Skill Router dispatches execution to the appropriate scientific-skills MCP tool.

## Routing Principle

Vibe Science is the **director**: it defines what needs to happen, checks if it happened correctly, and tracks the evidence chain. Specialist skills are the **executors**: they know how to do the actual work.

```
User request → vibe-science (classify) → skill-router (dispatch) → specialist skill (execute) → vibe-science (gate + audit)
```

## Input Classification

When a task arrives, classify it:

| Task Type | Primary Router | Vibe-Science Role |
|-----------|---------------|-------------------|
| **Scientific brainstorming** | **brainstorm-engine.md → scientific-brainstorming + hypothesis-generation skills** | **Gate B0 (brainstorm quality)** |
| **Dataset/literature discovery** | **brainstorm-engine.md → openalex-database, perplexity-search, literature-review, research-lookup skills** | **Gate B0 (data availability)** |
| Literature review | search-protocol.md → openalex/ieee-xplore/optica skills | Gate claims, track evidence, invoke reviewer |
| Photonics simulation pipeline | analysis-orchestrator.md → lumerical + interconnect skills | Gate every step, enforce artifact contract |
| Statistical analysis | → statistical-analysis + statsmodels skills | R2-Stats review, metrics validation |
| Data exploration | → exploratory-data-analysis + pandas skills | Schema validation (Gate 0-1) |
| Figure generation | → scientific-visualization + matplotlib skills | Figure in artifact contract (Gate 5, G6 VLM) |
| Paper writing | → scientific-writing + literature-review skills | Claim verification from ledger |
| Hypothesis generation | → hypothesis-generation + scientific-brainstorming | Reviewer ensemble on hypothesis |
| **Tree node experiment** | **auto-experiment.md + tree-search.md** | **Gates T0, G0-G4** |
| **Serendipity triage** | **serendipity-engine.md** | **Score, queue, or interrupt** |

## Routing Table: Key Skills

### Photonics Analysis Pipeline

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| Load simulation data | `pandas` / `numpy` skill | G0: Input Sanity |
| Data QC (range checks, units) | `data-validation` skill | G0: physical plausibility |
| Parameter sweep setup | `analysis-orchestrator.md` (internal) | G1: Schema Compliance |
| S-parameter extraction | `rf-analysis` / `skrf` skill | G2: port config justified |
| Eye diagram generation | `signal-analysis` skill | G3: BER convergence |
| Performance metrics | `photonics-metrics` + custom | G4: metric table complete |
| Visualization | `scientific-visualization` skill | G5: figures present |
| Report | `analysis-orchestrator.md` (internal) | G5: artifact contract |

> **For photonics: prefer IEEE Xplore and Optica Publishing Group via web_search for literature review as primary workflow.**

### Literature Research

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| OpenAlex search | `openalex-database` skill | Source dedup check |
| IEEE Xplore search | `ieee-xplore` / `web_search` skill | Anti-hallucination rules |
| Optica Publishing search | `optica-publishing` / `web_search` skill | Source dedup check |
| Perplexity search | `perplexity-search` skill | Cross-reference verification |
| Research lookup | `research-lookup` skill | DOI + abstract retrieval |
| Citation management | `citation-management` skill | DOI verification |
| Full-text fetch | `web_fetch` tool | Data extraction protocol |
| Systematic review | `literature-review` skill | Claim ledger update |

### Database & Literature Queries

| Source | Skill | When to Use |
|--------|-------|-------------|
| OpenAlex | `openalex-database` | Broad scientific literature search, citation graphs |
| IEEE Xplore | `web_search` (ieee.org) | Photonics, optoelectronics, silicon photonics papers |
| Optica Publishing | `web_search` (optica.org) | Optics, photonics, laser research |
| arXiv (physics.optics) | `web_search` (arxiv.org) | Preprints — confidence penalty applies |
| Perplexity | `perplexity-search` | AI-assisted literature synthesis |
| Research lookup | `research-lookup` | DOI resolution, abstract retrieval |

### Analysis & Statistics

| Task | Skill | Notes |
|------|-------|-------|
| Statistical tests | `statistical-analysis` | Guided test selection + assumptions |
| Regression, GLM, time series | `statsmodels` | Model diagnostics |
| ML classification/clustering | `scikit-learn` | Standard ML pipelines |
| Bayesian modeling | `pymc-bayesian-modeling` | Hierarchical models, MCMC |
| RF / microwave analysis | `scikit-rf` (skrf) | S-parameters, network analysis |
| Signal processing | `scipy.signal` + `numpy` | Filter design, FFT, eye diagrams |
| Optimization | `scipy.optimize` | Parameter fitting, design optimization |

### Visualization

| Task | Skill | Notes |
|------|-------|-------|
| Publication figures | `scientific-visualization` | Multi-panel, journal-styled |
| Quick exploration | `seaborn` or `plotly` | Interactive or statistical |
| Custom plots | `matplotlib` | Full control |
| Scientific diagrams | `scientific-schematics` | Flowcharts, pathways, architecture |
| Infographics | `infographics` | Data communication |

### Document Generation

| Task | Skill | Notes |
|------|-------|-------|
| Research paper | `scientific-writing` | IMRAD, citations, reporting guidelines |
| Peer review | `peer-review` | Structured manuscript review |
| Slides/presentation | `scientific-slides` | Conference talks |
| Posters | `latex-posters` | Research posters |

## Dispatch Protocol

When routing to a specialist skill:

1. **Prepare context**: Extract relevant parameters from run plan, claim ledger entries, gate requirements
2. **Call `find_helpful_skills`**: Confirm the skill exists and get implementation guidance
3. **Read skill document**: `read_skill_document` for the specific skill
4. **Execute**: Follow skill's workflow
5. **Capture output**: File artifacts back into vibe-science folder structure
6. **Gate**: Apply the relevant quality gate to the output
7. **Log**: Register in PROGRESS.md and decision-log.md

## When NOT to Route

Vibe-science handles these internally (no dispatch needed):

- Claim extraction and ledger management → evidence-engine.md
- Confidence scoring → evidence-engine.md
- Reviewer ensemble invocation → protocols/reviewer2-ensemble.md
- Gate checking → gates/gates.md
- Parameter schema normalization → assets/obs-normalizer.md
- Decision logging → audit-reproducibility.md
- Run comparison → audit-reproducibility.md
- Template generation → assets/templates.md
