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
| Literature review | search-protocol.md → pubmed/openalex/biorxiv skills | Gate claims, track evidence, invoke reviewer |
| scRNA-seq pipeline | analysis-orchestrator.md → scanpy + scvi-tools skills | Gate every step, enforce artifact contract |
| Statistical analysis | → statistical-analysis + statsmodels skills | R2-Stats review, metrics validation |
| Data exploration | → exploratory-data-analysis + anndata skills | Schema validation (Gate 0-1) |
| Figure generation | → scientific-visualization + matplotlib skills | Figure in artifact contract (Gate 5) |
| Paper writing | → scientific-writing + literature-review skills | Claim verification from ledger |
| Hypothesis generation | → hypothesis-generation + scientific-brainstorming | Reviewer ensemble on hypothesis |

## Routing Table: Key Skills

### Single-Cell Analysis Pipeline

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| Load data, inspect AnnData | `anndata` skill | G0: Input Sanity |
| QC (violin plots, filtering) | `scanpy` skill | G0: counts int, mito/ribo ok |
| Normalize obs schema | `assets/obs-normalizer.md` (internal) | G1: Schema Compliance |
| HVG selection | `scanpy` skill | G2: justify n_HVG choice |
| Batch correction (scVI) | `scvi-tools` skill | G2: batch_key justified, G3: convergence |
| Clustering | `scanpy` skill | G4: stability check |
| DE analysis | `scanpy` or `pydeseq2` skill | G4: statistical validity |
| Visualization | `scientific-visualization` skill | G5: figures present |
| Metrics (iLISI, etc.) | `scvi-tools` + custom | G4: metric table complete |
| Report | `analysis-orchestrator.md` (internal) | G5: artifact contract |

### Literature Research

| Step | Dispatch to | Vibe-Science Gate |
|------|-----------|-------------------|
| PubMed search | `pubmed-database` skill | Anti-hallucination rules |
| OpenAlex search | `openalex-database` skill | Source dedup check |
| bioRxiv search | `biorxiv-database` skill | Preprint confidence penalty |
| Citation management | `citation-management` skill | DOI verification |
| Full-text fetch | `web_fetch` tool | Data extraction protocol |
| Systematic review | `literature-review` skill | Claim ledger update |

### Database Queries

| Database | Skill | When to Use |
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

| Task | Skill | Notes |
|------|-------|-------|
| Statistical tests | `statistical-analysis` | Guided test selection + assumptions |
| Regression, GLM, time series | `statsmodels` | Model diagnostics |
| ML classification/clustering | `scikit-learn` | Standard ML pipelines |
| Bayesian modeling | `pymc-bayesian-modeling` | Hierarchical models, MCMC |
| DE analysis (bulk) | `pydeseq2` | DESeq2 port in Python |
| Gene regulatory networks | `arboreto` | GRNBoost2, GENIE3 |
| Survival analysis | `scikit-survival` | Cox, RSF, competing risks |

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
- Obs schema normalization → assets/obs-normalizer.md
- Decision logging → audit-reproducibility.md
- Run comparison → audit-reproducibility.md
- Template generation → assets/templates.md
