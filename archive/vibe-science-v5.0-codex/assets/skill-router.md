# Skill Router

Vibe Science does not redo what other tools do. It orchestrates, gates, and audits. The Skill Router dispatches execution to the appropriate specialist tool.

## Routing Principle

Vibe Science is the **director**: it defines what needs to happen, checks if it happened correctly, and tracks the evidence chain. Specialist tools are the **executors**: they know how to do the actual work.

```
User request → vibe-science (classify) → skill-router (dispatch) → specialist tool (execute) → vibe-science (gate + audit)
```

## Input Classification

When a task arrives, classify it:

| Task Type | Primary Router | Vibe-Science Role |
|-----------|---------------|-------------------|
| **Scientific brainstorming** | **brainstorm-engine.md → scientific-brainstorming + hypothesis-generation tools** | **Gate B0 (brainstorm quality)** |
| **Dataset discovery** | **brainstorm-engine.md → geo-database, cellxgene-census, openalex-database tools** | **Gate B0 (data availability)** |
| Literature review | search-protocol.md → pubmed/openalex/biorxiv tools | Gate claims, track evidence, invoke reviewer |
| scRNA-seq pipeline | analysis-orchestrator.md → scanpy + scvi-tools tools | Gate every step, enforce artifact contract |
| Statistical analysis | → statistical-analysis + statsmodels tools | R2-Stats review, metrics validation |
| Data exploration | → exploratory-data-analysis + anndata tools | Schema validation (Gate 0-1) |
| Figure generation | → scientific-visualization + matplotlib tools | Figure in artifact contract (Gate 5, G6 VLM) |
| Paper writing | → scientific-writing + literature-review tools | Claim verification from ledger |
| Hypothesis generation | → hypothesis-generation + scientific-brainstorming | Reviewer ensemble on hypothesis |
| **Tree node experiment** | **auto-experiment.md + tree-search.md** | **Gates T0, G0-G4** |
| **Serendipity triage** | **serendipity-engine.md** | **Score, queue, or interrupt** |

## Routing Table: Key Tools

### Single-Cell Analysis Pipeline

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| Load data, inspect AnnData | `anndata` tool | G0: Input Sanity |
| QC (violin plots, filtering) | `scanpy` tool | G0: counts int, mito/ribo ok |
| Normalize obs schema | `assets/obs-normalizer.md` (internal) | G1: Schema Compliance |
| HVG selection | `scanpy` tool | G2: justify n_HVG choice |
| Batch correction (scVI) | `scvi-tools` tool | G2: batch_key justified, G3: convergence |
| Clustering | `scanpy` tool | G4: stability check |
| DE analysis | `scanpy` or `pydeseq2` tool | G4: statistical validity |
| Visualization | `scientific-visualization` tool | G5: figures present |
| Metrics (iLISI, etc.) | `scvi-tools` + custom | G4: metric table complete |
| Report | `analysis-orchestrator.md` (internal) | G5: artifact contract |

### Literature Research

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| PubMed search | `pubmed-database` tool | Anti-hallucination rules |
| OpenAlex search | `openalex-database` tool | Source dedup check |
| bioRxiv search | `biorxiv-database` tool | Preprint confidence penalty |
| Citation management | `citation-management` tool | DOI verification |
| Full-text fetch | `web_fetch` tool | Data extraction protocol |
| Systematic review | `literature-review` tool | Claim ledger update |

### Database Queries

| Database | Tool | When to Use |
|----------|-------|-------------|
| GEO (gene expression) | `geo-database` | Finding datasets for validation |
| Ensembl | `ensembl-database` | Gene annotation, cross-species |
| UniProt | `uniprot-database` | Protein function, structure |
| KEGG | `kegg-database` | Pathway analysis |
| Reactome | `reactome-database` | Pathway enrichment |
| OpenTargets | `opentargets-database` | Drug target associations |
| STRING | `string-database` | Protein-protein interactions |
| ClinVar | `clinvar-database` | Variant pathogenicity |
| CellxGene Census | `cellxgene-census` | Reference atlas queries (61M+ cells) |
| ChEMBL | `chembl-database` | Bioactive molecules |

### Analysis & Statistics

| Task | Tool | Notes |
|------|------|-------|
| Statistical tests | `statistical-analysis` | Guided test selection + assumptions |
| Regression, GLM, time series | `statsmodels` | Model diagnostics |
| ML classification/clustering | `scikit-learn` | Standard ML pipelines |
| Bayesian modeling | `pymc-bayesian-modeling` | Hierarchical models, MCMC |
| DE analysis (bulk) | `pydeseq2` | DESeq2 port in Python |
| Gene regulatory networks | `arboreto` | GRNBoost2, GENIE3 |
| Survival analysis | `scikit-survival` | Cox, RSF, competing risks |

### Visualization

| Task | Tool | Notes |
|------|------|-------|
| Publication figures | `scientific-visualization` | Multi-panel, journal-styled |
| Quick exploration | `seaborn` or `plotly` | Interactive or statistical |
| Custom plots | `matplotlib` | Full control |
| Scientific diagrams | `scientific-schematics` | Flowcharts, pathways, architecture |
| Infographics | `infographics` | Data communication |

### Document Generation

| Task | Tool | Notes |
|------|------|-------|
| Research paper | `scientific-writing` | IMRAD, citations, reporting guidelines |
| Peer review | `peer-review` | Structured manuscript review |
| Slides/presentation | `scientific-slides` | Conference talks |
| Posters | `latex-posters` | Research posters |

## Dispatch Protocol

When routing to a specialist tool:

1. **Prepare context**: Extract relevant parameters from run plan, claim ledger entries, gate requirements
2. **Discover tool**: Confirm the tool is available and get implementation guidance
3. **Read tool documentation**: Review the tool's reference documents for the specific task
4. **Execute**: Follow the tool's workflow
5. **Capture output**: File artifacts back into vibe-science folder structure
6. **Gate**: Apply the relevant quality gate to the output
7. **Log**: Register in PROGRESS.md and decision-log.md

## When NOT to Route

Vibe-science handles these internally (no dispatch needed):

- Claim extraction and ledger management → evidence-engine.md
- Confidence scoring → evidence-engine.md
- Reviewer ensemble invocation → references/reviewer2-ensemble.md
- Gate checking → references/gates.md
- Obs schema normalization → assets/obs-normalizer.md
- Decision logging → audit-reproducibility.md
- Run comparison → audit-reproducibility.md
- Template generation → assets/templates.md
