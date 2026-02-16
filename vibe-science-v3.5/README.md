<div align="center">

# Vibe Science v3.5

### TERTIUM DATUR

**Scientific research in serendipity mode.**<br>
**Infinite loops until discovery. Adversarial review at every milestone.**

[![DOI](https://zenodo.org/badge/1148022920.svg)](https://doi.org/10.5281/zenodo.18663141)
[![Version](https://img.shields.io/badge/version-3.5.1-blue.svg)](#version-history)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-blueviolet.svg)](https://docs.anthropic.com/en/docs/claude-code)
[![Laws](https://img.shields.io/badge/constitutional_laws-7-orange.svg)](#7-constitutional-laws)
[![Gates](https://img.shields.io/badge/quality_gates-12-red.svg)](#quality-gates)
[![Protocols](https://img.shields.io/badge/protocols-9-teal.svg)](#protocols)
[![Field-Tested](https://img.shields.io/badge/field--tested-21_sprints_CRISPR-gold.svg)](#field-tested-vibex-2026)
[![Lines](https://img.shields.io/badge/codebase-~3%2C394_lines-lightgrey.svg)](#codebase-metrics)

<br>

*"A research system that doesn't execute is a wish.*
*A toolkit that doesn't iterate is a toolbox.*
*You need both: loop + tool."*

</div>

---

## The Problem

AI agents are dangerous in science. Not because they hallucinate — that's the easy problem.

The dangerous problem is that they find **real patterns** in **real data** and construct **plausible narratives** around them, without ever asking: *"What if this is an artifact?"*

<table>
<tr>
<td width="50%">

**What the agent does:**
- Optimizes for completion, not truth
- Gets excited by strong signals (p < 10⁻¹⁰⁰!)
- Constructs narratives around artifacts
- Never searches for what kills its own claims
- Declares "done" after 1 sprint

</td>
<td width="50%">

**What actually happened (21 sprints, CRISPR):**
- OR = 2.30 → **reversed sign** under propensity matching
- "Bidirectional effects" → **biologically impossible**
- "Regime switch" → Cohen's d = **0.07** (noise)
- "Generalizable rankings" → **don't generalize** between assays

</td>
</tr>
</table>

None of these were hallucinations. The data was real. The statistics were correct. The problem was dispositional: **the agent never tried to destroy its own claims.**

---

## Field-Tested: VIBEX 2026

> **This is the version used in the 21-sprint CRISPR-Cas9 case study** documented in the VIBEX 2026 paper.

| Metric | Value |
|--------|-------|
| **Sprints completed** | 21 |
| **Total claims registered** | 34 |
| **Claims killed or downgraded** | 11 (32%) |
| **Retraction rate** | ~50% (including downgrades) |
| **Most dangerous claim caught** | OR=2.30, p < 10⁻¹⁰⁰ — sign reversed by propensity matching |
| **Cross-assay validation** | Rankings don't generalize between CROP-seq and Perturb-seq |
| **Paper reference** | *Vibe Science: Adversarial Epistemic Architecture for LLM-Driven Research* (VIBEX 2026) |

The case study demonstrated that without the adversarial R2 architecture, every single confounded claim would have been published as a finding. The system's value is not in what it discovers — it's in **what it prevents from being reported**.

---

## The Solution

```
                    Builder (Researcher)              Destroyer (Reviewer 2)
                    ───────────────────               ─────────────────────
  Optimizes for:    Completion                        Survival
  Default stance:   "This looks promising"            "This is probably an artifact"
  Strong signal:    Excitement → narrative → paper     Suspicion → confounders → controls
  Web search for:   Supporting evidence               Contradictions, prior art, known artifacts
  Says "done":      When results look good            When ALL counter-verifications pass
```

**Vibe Science embeds both dispositions in the same system.** The builder builds. The destroyer destroys. Only what survives both gets reported.

> Of 34 claims registered across 21 sprints, 11 were killed or downgraded. The most dangerous claim (OR=2.30, p < 10⁻¹⁰⁰) was caught in ONE sprint — it was completely confounded.

---

## How It Works

```
╔═══════════════════════════════════════════════════════════════╗
║                    OTAE-SCIENCE LOOP                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  OBSERVE    →  Read STATE.md + PROGRESS. Identify delta.      ║
║       ↓                                                       ║
║  THINK      →  Plan highest-value next action.                ║
║       ↓        Which skill to dispatch? What to falsify?      ║
║  ACT        →  Execute ONE action                             ║
║       ↓        (search / analyze / extract / compute / write) ║
║  EVALUATE   →  Extract claims → score confidence → gate       ║
║       ↓        Detect serendipity → flag for triage           ║
║  CHECKPOINT →  R2 trigger? Serendipity triage? Stop?          ║
║       ↓                                                       ║
║  CRYSTALLIZE → Update STATE.md, PROGRESS.md, CLAIM-LEDGER.   ║
║       ↓        → LOOP BACK TO OBSERVE                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

Adapted from the OpenAI Codex unrolled agent loop. Key constraint: **one action per cycle**. Progressive disclosure loads protocol files only when entering a phase — never all at once.

### Mini Walkthrough — One Concrete Cycle

> **Cycle 5, Sprint 7 — Validate ATAC accessibility ratio** (from the 21-sprint case study)

| Phase | Agent Action | File(s) Touched |
|-------|-------------|-----------------|
| **OBSERVE** | Read `STATE.md`: current claim C-07 (ATAC ratio = 0.76×) is UNVERIFIED | `STATE.md` (read) |
| **THINK** | Decide: VALIDATE — cross-check reported ratio against primary GEO source | Decision logged in `PROGRESS.md` |
| **ACT** | Query `geo-database` for GSE series; download supplementary table; extract actual ratio | `03-data/atac_ratio_check.csv` |
| **EVALUATE** | Actual value = 1.344×. Claim C-07 was placeholder data — **REJECT**. Gate G0 (Input Sanity) fails | `CLAIM-LEDGER.md`: C-07 → REJECTED |
| **CHECKPOINT** | Severity triggers R2-Eng review (data integrity). No serendipity signal | `05-reviewer2/r2-sprint7-review.md` |
| **CRYSTALLIZE** | Rewrite `STATE.md` with corrected claim. Append to `PROGRESS.md`. Update ledger | `STATE.md` (rewrite), `PROGRESS.md` (append) |

This cycle illustrates how **Tool-Use Obligation** (R2 must open source files) and **Evidence Floor Gate** (E < 0.2 caps confidence) interact in practice.

### Cycle Safeguards

| Cycle | Event |
|-------|-------|
| 15 | Diminishing returns warning |
| 20 | Forced review — mandatory R2 ensemble |
| 30 | Infinite loop detection — emergency break |
| Any | Confidence explosion (>0.30 in 2 cycles) → forced R2 |

---

## Key Features

<table>
<tr>
<td width="33%" valign="top">

### Reviewer 2 Ensemble

Not a gate you pass — a co-pilot you can't fire.

**4 reviewers:**
- R2-Methods
- R2-Stats
- R2-Bio
- R2-Eng

**v3.5 Double-Pass:**
1. Fatal-Hunt (purely destructive)
2. Method-Repair (constructive)

**3-level orthogonal attack:**
L1-Logic · L2-Statistics · L3-Data

</td>
<td width="33%" valign="top">

### Evidence Engine

Every claim is quantified, not felt.

```
confidence =
    E × 0.30  Evidence Quality
  + R × 0.25  Robustness
  + C × 0.20  Concordance
  + K × 0.15  Knowledge Alignment
  + D × 0.10  Data Quality

FLOOR: E < 0.2 → capped at 0.20
```

**Typed claims:**
`descriptive` · `correlative` · `causal` · `predictive`

Evidence standard scales with type.

</td>
<td width="33%" valign="top">

### Serendipity Engine

Active scanner, not passive logger.

**Quantitative triage** (0-15):
- 5 scoring criteria
- Sprints every 10 cycles
- Generate 10 ideas, rank, formalize top 3

**Response matrix:**
- Score >= 12 → INTERRUPT
- Score >= 8 → QUEUE
- Score >= 4 → FILE
- Score < 4 → NOISE

</td>
</tr>
</table>

---

## 7 Constitutional Laws

> These govern ALL behavior. No protocol, no user request, no context can override them.

| | Law | Rule | Enforcement |
|---|-----|------|-------------|
| **1** | DATA-FIRST | No thesis without evidence from data | `NO DATA = NO GO` |
| **2** | EVIDENCE DISCIPLINE | Every claim: claim_id + evidence chain + confidence + status | Evidence floor gate |
| **3** | GATES BLOCK | Quality gates are hard stops, not suggestions | 12 gates block pipeline |
| **4** | R2 ALWAYS-ON | Every milestone passes adversarial review before promotion | R2 is structural gate |
| **5** | SERENDIPITY PRESERVED | Unexpected discoveries are features, not distractions | Dedicated tracking + triage |
| **6** | ARTIFACTS OVER PROSE | If it can produce a file, it MUST | Scripts > descriptions |
| **7** | FRESH CONTEXT RESILIENCE | Resumable from STATE.md alone | File-based state |

---

## Quality Gates

12 quality gates organized in 3 categories. Each is a **hard stop** — the pipeline cannot advance until the gate passes.

<table>
<tr>
<td valign="top">

**Pipeline (G0-G5)**
```
G0  Input Sanity
G1  Schema Compliance
G2  Design Justification
G3  Training Integrity
G4  Metrics Decision
G5  Artifact Completeness
```

</td>
<td valign="top">

**Literature (L0-L2)**
```
L0  Source Validity (DOI verified)
L1  Coverage Adequacy (>= 3 sources)
L2  Review Completeness
```

**Decision (D0-D2)** — *New in v3.5*
```
D0  Decision Justified (>= 2 alternatives)
D1  Claim Promotion (R2 approved)
D2  RQ Conclusion (final R2 clearance)
```

</td>
</tr>
</table>

---

## Protocols

9 protocols loaded on-demand via progressive disclosure:

| Protocol | File | Purpose |
|----------|------|---------|
| **Loop OTAE** | `protocols/loop-otae.md` | 6-phase cycle procedure with emergency protocols (context rot, state corruption, infinite loop) |
| **Evidence Engine** | `protocols/evidence-engine.md` | Claim Ledger, confidence formula (E·R·C·K·D → 0-1), Assumption Register, anti-hallucination rules |
| **Reviewer 2 Ensemble** | `protocols/reviewer2-ensemble.md` | 4-domain adversarial review, double-pass workflow, typed claims, tool-use obligation, severity scoring (0-100) |
| **Search Protocol** | `protocols/search-protocol.md` | Source priority (Scopus > PubMed > OpenAlex > bioRxiv > web), dedup, confidence-by-source |
| **Analysis Orchestrator** | `protocols/analysis-orchestrator.md` | Artifact contract (manifest + report + figures + metrics + scripts), OAT ablation, triage mode |
| **Serendipity Engine** | `protocols/serendipity-engine.md` | Quantitative triage (0-15), scheduled Sprints every 10 cycles, PURSUE/QUEUE/FILE/DISCARD |
| **Knowledge Base** | `protocols/knowledge-base.md` | Cross-RQ persistence: library.json, patterns.md, dead-ends.md, quarterly maintenance |
| **Data Extraction** | `protocols/data-extraction.md` | NO TRUNCATION rule, AnnData schema contract, data quality flags, GEO/SRA/ENA handling |
| **Audit & Reproducibility** | `protocols/audit-reproducibility.md` | Decision log (DEC-YYYYMMDD-NNN), run comparison, manifests, 10-point reproducibility contract |

---

## Reviewer 2 v3.5 — Deep Dive

The R2 upgrade is what defines v3.5. Here's what changed:

| Feature | v2.0 | v3.5 |
|---------|------|------|
| Workflow | Single-pass | **Double-pass** (fatal-hunt → method-repair) |
| Attack vectors | Generic | **3-level orthogonal** (Logic/Stats/Data) |
| Claim types | Untyped | **4 types** with scaled evidence standards |
| Tool use | Optional | **Mandatory** — R2 must inspect files, verify DOIs |
| Confounders | Ad hoc | **Confounding Audit Table** (mandatory for multi-batch) |
| Trade-offs | Not checked | **No Free Lunch** — every improvement must account for trade-offs |
| Severity | Qualitative | **Numeric** (0-29 minor, 30-59 major, 60-79 severe, 80-100 fatal) |
| Constructive output | None | **"What Would Convince Me"** — exact artifacts to upgrade REJECT |
| Falsification | 1 test | **>= 3 independent tests** per major claim |
| Bio validation | None | **Marker Gate** (>= 3 canonical markers for cell type labels) |

### R2 Decision Matrix

Every flaw found by R2 gets a numeric severity score (0-100). The **overall verdict** is determined by the highest-severity flaw:

| Severity Range | Level | Meaning | Action |
|----------------|-------|---------|--------|
| 0-29 | MINOR | Cosmetic or improvement suggestion | Note, continue |
| 30-59 | MAJOR | Significant flaw, cannot proceed as-is | Must address before next cycle |
| 60-79 | SEVERE | Claim fundamentally weakened | Must fix + re-submit to R2 |
| 80-100 | FATAL | Claim invalid, conclusion breaks | **REJECT** — no re-submission without new evidence |

| Highest Flaw | Verdict |
|-------------|---------|
| All < 30 | **ACCEPT** |
| 30-59 | **WEAK_ACCEPT** (address concerns) |
| 60-79 | **WEAK_REJECT** (major revision required) |
| Any ≥ 80 | **REJECT** |

### Claim Lifecycle

```
UNVERIFIED ──→ VERIFIED ──→ CONFIRMED
                  │
                  ▼
              CHALLENGED ──→ REJECTED
```

After R2 review: claims with FATAL FLAW → `REJECTED`. Claims with MAJOR FLAW → `CHALLENGED` (pending fix). Claims that survived → `VERIFIED` (if confidence ≥ 0.60).

---

## Assets

| Asset | File | Purpose |
|-------|------|---------|
| **Obs Normalizer** | `assets/obs-normalizer.md` | 5-step AnnData `.obs` normalization: dtype fix → category standardization → NaN handling → category freezing → QC columns |
| **Templates** | `assets/templates.md` | 9 template types: STATE.md, PROGRESS.md, CLAIM-LEDGER.md, ASSUMPTION-REGISTER.md, RQ.md, Finding doc, Stop conditions, Decision log, Ensemble review |
| **Skill Router** | `assets/skill-router.md` | Dispatch table mapping 42+ task types to MCP scientific skills across 6 categories |

---

## MCP Skill Integration

Vibe Science is the **orchestrator** — it dispatches to specialist MCP scientific skills but never executes pipelines directly.

### Used in the 21-Sprint Case Study

| MCP Skill | Purpose | Confidence Cap | Sprints Used |
|-----------|---------|---------------|-------------|
| `pubmed-database` | Biomedical literature, MeSH queries | Standard | 1-21 |
| `openalex-database` | Open scholarly data, citation graphs | Standard | 1-21 |
| `biorxiv-database` | Preprints (uncertified) | E=0.6 max | 3, 7, 12 |
| `geo-database` | GEO dataset queries, supplementary tables | Standard | 2-18 |
| `ensembl-database` | Gene annotations, genomic coordinates | Standard | 5-14 |
| `web_search` | Fallback only | E=0.0 if unverified | rare |

### Available but Not Exercised

| MCP Skill | Purpose | Why Not Used |
|-----------|---------|-------------|
| `uniprot-database` | Protein sequences/functions | Not needed for scRNA-seq RQs |
| `kegg-database` | Pathway maps | Reactome used instead |
| `reactome-database` | Pathway analysis | Wired; pathway queries minimal |
| `opentargets-database` | Target–disease associations | Out of scope |
| `string-database` | PPI networks | Not required |
| `clinvar-database` | Variant significance | No variant RQs |
| `cellxgene-census` | 61M+ single-cell atlas | Own GEO data used |

### Planned / Pluggable (dispatch-ready, no MCP skill)

| Category | Skills | Execution Mode |
|----------|--------|---------------|
| **Bioinformatics Pipeline** | `anndata`, `scanpy`, `scvi-tools`, `pydeseq2` | Embedded Python |
| **Analysis & Statistics** | `statsmodels`, `scikit-learn`, `pymc`, `arboreto` | Local imports |
| **Visualization** | `matplotlib`, `seaborn`, `plotly`, `scientific-visualization` | Local execution |
| **Document Generation** | `scientific-writing`, `peer-review`, `latex-posters` | Available for future |

### Dispatch Protocol

```
1. Identify task type (search? analyze? extract? compute?)
2. Call find_helpful_skills(task_description)
3. Read relevant skill document
4. Execute following skill's workflow
5. Capture output into .vibe-science/ structure
6. Apply relevant quality gate
7. Log in PROGRESS.md and decision-log
```

---

## Installation & Quick Start

### 1. Install

```bash
git clone https://github.com/th3vib3coder/vibe-science.git
claude plugins add ./vibe-science
```

### 2. Start

```bash
/start
```

Or simply tell Claude:
> "Use vibe-science to explore [your research question]"

### 3. The system guides you through:

1. Shaping a testable, falsifiable research question
2. Defining success criteria and kill conditions
3. Creating the `.vibe-science/` folder structure
4. Entering the first OTAE cycle

---

<details>
<summary><h2>File Structure (click to expand)</h2></summary>

### Plugin Structure

```
vibe-science-v3.5/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (v3.5.1, TERTIUM DATUR)
├── SKILL.md                     # Core specification (constitution, loop, dispatch)
├── CHANGELOG.md                 # Full version history (v1.0 → v3.5.1)
├── README.md                    # This file
├── LICENSE                      # Apache 2.0
│
├── commands/
│   └── start.md                 # /start — session initialization
│
├── protocols/                   # Loaded on-demand by dispatch table
│   ├── loop-otae.md             # OTAE cycle with emergency protocols
│   ├── reviewer2-ensemble.md    # R2 v3.5: double-pass, 4 reviewers
│   ├── evidence-engine.md       # Claims, confidence formula, assumptions
│   ├── search-protocol.md       # Literature search with source priority
│   ├── analysis-orchestrator.md # Artifact contract, manifests, ablation
│   ├── serendipity-engine.md    # Discovery tracking + Sprint protocol
│   ├── knowledge-base.md        # Cross-RQ persistence
│   ├── data-extraction.md       # Supplementary extraction, AnnData contract
│   └── audit-reproducibility.md # Decision log, run comparison, snapshots
│
├── gates/
│   └── gates.md                 # All 12 gates (G0-G5, L0-L2, D0-D2)
│
├── assets/
│   ├── obs-normalizer.md        # AnnData obs schema contract
│   ├── templates.md             # File templates (STATE, PROGRESS, RQ, ...)
│   └── skill-router.md          # Tool/skill dispatch table (42+ tasks)
│
├── examples/
│   └── walkthrough-literature-review.md  # Annotated 5-cycle walkthrough
│
└── .gitignore                   # Excludes .vibe-science/ runtime data
```

### Runtime Directory (created during research)

```
.vibe-science/
├── STATE.md                    # Current state (max 100 lines, rewritten each cycle)
├── PROGRESS.md                 # Append-only log (newest at top)
├── CLAIM-LEDGER.md             # All claims with evidence + confidence
├── ASSUMPTION-REGISTER.md      # Assumptions with risk + verification
├── SERENDIPITY.md              # Unexpected discovery log
├── KNOWLEDGE/                  # Cross-RQ accumulated knowledge
│   ├── library.json            # Papers, methods, datasets, authors
│   └── patterns.md             # Cross-domain patterns
│
└── RQ-001-[slug]/              # Per Research Question
    ├── RQ.md                   # Question, hypothesis, criteria
    ├── 01-discovery/           # Literature phase
    │   └── queries.log
    ├── 02-analysis/            # Pattern analysis
    ├── 03-data/                # Data extraction + validation
    │   └── supplementary/
    ├── 04-validation/          # Numerical validation
    ├── 05-reviewer2/           # R2 ensemble reviews
    ├── 06-runs/                # Run bundles (manifest + report + artifacts)
    └── 07-audit/               # Decision log + snapshots
```

</details>

---

## Example Walkthrough

See [`examples/walkthrough-literature-review.md`](examples/walkthrough-literature-review.md) for an annotated **5-cycle literature review** on optimal transport in single-cell trajectory inference, demonstrating:

- Progressive literature search (PubMed → OpenAlex → bioRxiv)
- R2 batch review forcing author trail exploration
- R2 full ensemble demanding mathematical comparison tables
- Gate D2 clearing for the final conclusion
- Key patterns: progressive disclosure, R2 as structural gate, typed claims, evidence floor

---

## Version History

| Version | Codename | Key Changes |
|---------|----------|-------------|
| 1.0 | — | 6-phase loop, single R2 prompt, basic state files |
| 2.0 | Nullis Secundus | Modular architecture, R2 ensemble (4 specialists), quality gates G0-G5/L0-L2, confidence formula |
| 3.0 | Tertium Datur | OTAE unrolled loop, MCP integration, knowledge base, Serendipity Sprints |
| **3.5** | **Tertium Datur** | **R2 double-pass, typed claims, tool-use audit, confounding table, No Free Lunch, D0-D2 gates** |
| 3.5.1 | Tertium Datur | Bugfix: all file references corrected, D0-D2 defined, evidence floor, version tracking |

---

## Design Philosophy

Vibe Science was built by reverse-engineering two complementary approaches:

<table>
<tr>
<td width="50%" valign="top">

**Agentic research loops**
*(Ralph, GSD, BMAD, Codex)*

Excellent as **systems**: infinite loop, state management, iterative refinement.

Missing: executability, adversarial review, serendipity.

</td>
<td width="50%" valign="top">

**Scientific toolkits**
*(Anthropic bio-research, MCP scientific skills)*

Excellent as **tools**: CLI scripts, database APIs, analysis pipelines.

Missing: loop, persistence, adversarial review.

</td>
</tr>
</table>

**v3.5 fuses both:** the systematic rigor of a research loop with the concrete executability of a scientific toolkit, bound together by an adversarial co-pilot that prevents the system from lying to itself.

---

## Feature → Evidence Pointer Table

Where each core feature is defined in source, and what runtime artifact it produces:

| Feature | Defined In | Runtime Artifact |
|---------|-----------|-----------------|
| Evidence Floor Gate | `protocols/evidence-engine.md` §Confidence Computation | `CLAIM-LEDGER.md` confidence column |
| Tool-Use Obligation | `protocols/reviewer2-ensemble.md` §Step 0 | R2 review log (`05-reviewer2/`) |
| Double-Pass R2 | `protocols/reviewer2-ensemble.md` §Pass 1/§Pass 2 | R2 verdict + severity scores |
| Serendipity Triage | `protocols/serendipity-engine.md` §Triage Scoring | `SERENDIPITY.md` entries |
| Crystallize or Lose | `protocols/loop-otae.md` §CRYSTALLIZE phase | STATE.md rewrite + PROGRESS.md append |
| Confounder Harness | `protocols/reviewer2-ensemble.md` §Confounding Audit Table | Confounding audit table in R2 log |
| Quality Gates G0-G5 | `gates/gates.md` §Data/Pipeline Gates | Gate pass/fail log in PROGRESS.md |
| Knowledge Base | `protocols/knowledge-base.md` §Cross-RQ Persistence | `KNOWLEDGE/library.json`, `patterns.md` |

---

## Genealogy

Vibe Science was built by reverse-engineering complementary patterns from existing systems. **No source code was reused — all implementations are original.**

| Ancestor | Pattern Taken |
|----------|--------------|
| **Ralph Wiggum** | Bounded iterative loop: keep cycling until discovery or dead end, with hard caps (warn@15, forced-R2@20, alert@30) |
| **GSD** | File-based state persistence (STATE.md, PROGRESS.md), resume protocol |
| **BMAD** | Multi-agent ensemble pattern, specialist roles |
| **OpenAI Codex loop** | OTAE cycle structure, single action per cycle |
| **Anthropic bio-research** | CLI scripts, MCP endpoints, decision trees, executability |
| **Superpowers** | Dispatch/routing architecture |

---

## Internal Dependency Graph

```
SKILL.md (hub — loaded first, always)
  ├── commands/start.md
  ├── protocols/loop-otae.md
  │     ├── evidence-engine.md
  │     ├── search-protocol.md
  │     ├── analysis-orchestrator.md
  │     │     ├── obs-normalizer.md
  │     │     └── skill-router.md
  │     ├── reviewer2-ensemble.md
  │     ├── serendipity-engine.md
  │     │     └── knowledge-base.md
  │     ├── data-extraction.md
  │     └── audit-reproducibility.md
  ├── gates/gates.md
  └── assets/templates.md
```

All files are loaded **on-demand via progressive disclosure** — only when entering the relevant phase. SKILL.md is the only file loaded at startup.

---

## Codebase Metrics

| File | Lines |
|------|------:|
| `SKILL.md` | 320 |
| `protocols/reviewer2-ensemble.md` | 390 |
| `assets/templates.md` | 304 |
| `examples/walkthrough-literature-review.md` | 299 |
| `gates/gates.md` | 272 |
| `protocols/analysis-orchestrator.md` | 267 |
| `protocols/evidence-engine.md` | 215 |
| `protocols/audit-reproducibility.md` | 186 |
| `assets/obs-normalizer.md` | 186 |
| `protocols/knowledge-base.md` | 144 |
| `protocols/loop-otae.md` | 143 |
| `protocols/serendipity-engine.md` | 137 |
| `assets/skill-router.md` | 125 |
| `protocols/data-extraction.md` | 122 |
| `protocols/search-protocol.md` | 98 |
| `CHANGELOG.md` | 96 |
| `commands/start.md` | 61 |
| `.gitignore` | 20 |
| `LICENSE` | 22 |
| `.claude-plugin/plugin.json` | 14 |
| **Total** | **~3,394** |

---

## Known Limitations & Non-Goals

### Limitations

- Only 1 slash command (`/start`) — all phases are implicit via the OTAE loop
- LLM non-determinism means exact replication is not guaranteed (seeds are logged)
- Single context window means R2 shares the builder's context (bias risk mitigated by double-pass)
- No tree search — sequential exploration only (addressed in v4.0)
- No TEAM mode — single agent only (addressed in v4.0)
- Designed for single-operator use (one researcher + one session)
- Context window limits mean very long sessions may need manual resume via STATE.md

### Non-Goals

| Category | What Vibe Science Does NOT Do |
|----------|-------------------------------|
| **Wet-lab execution** | Cannot run experiments; all evidence is computational or from published data |
| **Model training** | Does not train or fine-tune LLMs; uses existing Claude models as-is |
| **Autonomous publication** | Cannot submit papers; human signs off on all outputs |
| **Multi-user collaboration** | Single-operator design; no access control or concurrent sessions |
| **Real-time data streams** | No streaming API; all data is batch-fetched per cycle |
| **Guaranteed reproducibility** | Tracks provenance and seeds, but LLM non-determinism means exact replication is not guaranteed; crystallized artifacts (CSVs, scripts) are the reproducibility anchor |
| **Domain universality** | Tested on scRNA-seq / CRISPR; other domains may need new gates, reviewers, or MCP skills |

---

<div align="center">

## Citation & Attribution

If you use Vibe Science in your research, please cite:

> Russo, C. & Bertelli, E. (MD) (2026). *Vibe Science: an AI-native research engine with adversarial review and serendipity tracking.* https://github.com/th3vib3coder/vibe-science · DOI: [10.5281/zenodo.18665031](https://doi.org/10.5281/zenodo.18665031)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

© 2026 Carmine Russo & Dr. Elisa Bertelli (MD)

---

**Authors**: [Carmine Russo](https://github.com/th3vib3coder) · Dr. Elisa Bertelli (MD)

*Built with Claude. Tested against Reviewer 2. Survived 21 sprints of CRISPR-Cas9 research.*

**Vibe Science v3.5 TERTIUM DATUR** — The version that powered the VIBEX 2026 paper.

</div>
