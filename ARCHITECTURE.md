# Vibe Science — Architecture & Version History

> This document contains the deep technical details of every Vibe Science version. For installation and getting started, see [README.md](README.md).

---

## Table of Contents

- [v6.0 NEXUS — Dual Architecture](#v60--nexus)
- [v5.5 ORO — Post-Mortem Release](#v55--oro)
- [v5.0 IUDEX — Verification Release](#v50--iudex)
- [v4.5 ARBOR VITAE (Pruned) — Brainstorm](#v45--arbor-vitae-pruned)
- [v4.0 ARBOR VITAE — Tree Search](#v40--arbor-vitae)
- [v3.5 TERTIUM DATUR — Foundation](#v35--tertium-datur)
- [Photonics Fork](#photonics-fork--oro-photonics)
- [Feature Evolution Tables](#feature-evolution-tables)
- [Academic Foundations](#academic-foundations)

---

## v6.0 — NEXUS

> *Methodology meets enforcement. The skill guides reasoning, the plugin makes violations structurally impossible.*

v5.5 proved that prompt-level methodology works — but it also proved that prompts can be ignored. 12 mistakes in the CP+CRISPR run, ZERO caught by automated checks. v6.0 solves this by splitting the system in two: the **skill** (methodology, unchanged from v5.5) guides *what to think*, while the **plugin** (new, code-level) controls *what can happen*.

### Dual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  SKILL (prompt-level)           │  PLUGIN (code-level)          │
│  ─────────────────              │  ──────────────────           │
│  OTAE loop                      │  5 lifecycle hooks            │
│  R2 Ensemble (7 modes)          │  Gate Engine (DQ/DC/DD/L-1+)  │
│  SFI, BFP, R3 Judge             │  Permission Engine (6 roles)  │
│  Brainstorm Engine               │  Research Spine (auto-log)    │
│  Evidence Engine                 │  Context Builder (~700 tok)   │
│  Serendipity Engine              │  Narrative Engine             │
│  10 Constitutional Laws          │  R2 Auto-Calibration          │
│  21 protocols                    │  Silent Observer              │
│                                  │  SQLite (11 tables)           │
│  Guides REASONING               │  Enforces BEHAVIOR            │
└─────────────────────────────────────────────────────────────────┘
```

### Plugin Subsystems

#### Gate Engine
Enforces DQ1-DQ4, DC0, DD0, L-1+ at PostToolUse. Exit code 2 = BLOCK.
- DQ4: auto-verifies FINDINGS.md numbers match JSON source
- L-1+: blocks research direction without prior literature search
- Domain-aware hints from `domain-config.json`

#### Permission Engine
TEAM mode with 6 roles: `researcher`, `reviewer2`, `judge`, `serendipity`, `lead`, `experimenter`.
- Glob-based file access control
- Role inference from prompt keywords
- Separation of powers enforced in code

#### Research Spine
Automatic structured logging of every significant action.
- 20+ action types classified
- Timestamps, inputs, outputs, gate status
- Links every numerical claim to its source

#### Context Builder
Progressive disclosure in ~700 tokens:
- Layer 1: STATE.md summary (~200 tok)
- Layer 2: Semantic recall (~500 tok)
- R2 calibration hints
- Pending serendipity seeds

#### Silent Observer
Periodic integrity checks (every 10 tool uses):
- Stale STATE.md detection
- FINDINGS.md / JSON desync
- Orphaned datasets
- Design-execution drift
- Literature staleness

#### R2 Auto-Calibration
Cross-session learning for R2:
- Top weakness patterns
- SFI miss categories
- J0 score trends
- Researcher error patterns
- Hints injected at SessionStart

### Five Lifecycle Hooks

| Hook | When | What It Does |
|------|------|-------------|
| **Setup** | Plugin install | Creates `~/.vibe-science/`, initializes SQLite DB, installs dependencies (smart marker), launches embedding worker daemon |
| **SessionStart** | New conversation | Creates session, builds ~700-token context, loads R2 calibration |
| **UserPromptSubmit** | Every user message | Identifies agent role, logs prompt hash (privacy), semantic recall |
| **PostToolUse** | Every tool action | **Gate enforcement**, permission check, auto-log to Spine, observer |
| **Stop** | Session end | Narrative summary, enforcement check (blocks if unreviewed claims), STATE.md export |

### SQLite Persistence (11 Tables)

```
sessions              ← session lifecycle
spine_entries         ← Research Spine (every action)
claim_events          ← claim lifecycle (create, review, promote, kill)
r2_reviews            ← R2 review results + weaknesses
serendipity_seeds     ← cross-session seed survival
gate_checks           ← every gate pass/fail with details
literature_searches   ← L-1+ audit trail
observer_alerts       ← Silent Observer findings
calibration_log       ← R2 calibration data
prompt_log            ← SHA-256 hashes only (privacy)
embed_queue           ← async vector embedding queue
```

Foreign keys: `calibration_log.session_id` and `prompt_log.session_id` reference `sessions(id)`. Index `idx_prompt_session` accelerates per-session prompt lookups.

### Embedding Strategy

v6.0 uses real ML embeddings for semantic search via the `all-MiniLM-L6-v2` model (~23 MB quantized ONNX). The worker daemon (`worker-embed.js`) processes the `embed_queue` table asynchronously:

- **Lazy model loading** — the transformer model is downloaded and cached on first use via `@huggingface/transformers`
- **Hash fallback** — if ML embedding fails (e.g., missing ONNX runtime), a deterministic SHA-256 hash vector provides graceful degradation
- **Async batch processing** — embeddings are computed in background ticks, keeping hook latency at zero

### Literature Engine (102 Databases)

L-1+ is domain-aware with a 4-layer architecture:

1. **Domain Registry** — 102 databases across 12 categories (genomics, chemistry, physics, materials, clinical, ...)
2. **MCP Server Stack** — PubMed, arXiv, Semantic Scholar, OpenAlex, ChEMBL, UniProt
3. **Scientific Skills** — 28+ K-Dense-AI database skills
4. **Local RAG** — Zotero, PaperQA2, NotebookLM integration

### What v6.0 Adds (Code)

| Component | Lines | Purpose |
|-----------|------:|---------|
| `post-tool-use.js` | 1,482 | Gate enforcement, permissions, auto-logging, observer |
| `session-start.js` | 387 | Context injection, R2 calibration, domain config |
| `worker-embed.js` | 519 | Background embedding daemon |
| `gate-engine.js` | 630 | DQ/DC/DD/L-1+ gate logic |
| `db.js` | ~500 | SQLite wrapper with prepared statement cache |
| `prompt-submit.js` | 239 | Agent identification, semantic recall |
| `context-builder.js` | 231 | Progressive disclosure |
| `permission-engine.js` | 288 | Role-based access control |
| `narrative-engine.js` | 333 | Template-based session summaries |
| `vec-search.js` | 355 | sqlite-vec with keyword fallback |
| `r2-calibration.js` | 196 | Cross-session R2 learning |
| `schema.sql` | ~250 | 11 tables + indices |
| `stop.js` | 171 | Session end enforcement |
| `setup.js` | 363 | DB init, dependency install, worker daemon launch |
| `literature-registry.json` | ~800 | 102 databases, 12 categories |
| **Total new code** | **~6,600+** | |

---

## v5.5 — ORO

> *The post-mortem release. Every change traces to a real mistake. 12 errors, 7 root causes, ZERO caught by v5.0's automated checks — now fixed.*

v5.5 is an **additive upgrade** born from the CP+CRISPR research run post-mortem. v5.0 verified *claim quality* (is the conclusion supported?) but not *data quality* (are the features correct? do the numbers match?). v5.5 adds the data quality layer.

### Seven New Gates

| Gate | When | What It Catches |
|------|------|-----------------|
| **L-1** Literature Pre-Check | Before committing to a research direction | Missing prior art, reinventing the wheel |
| **DQ1** Post-Extraction | After feature extraction | Zero-variance columns, leakage, missing data |
| **DQ2** Post-Training | After model training | Worse-than-baseline, single-feature dominance |
| **DQ3** Post-Calibration | After calibration | Suspiciously perfect results, insufficient samples |
| **DQ4** Post-Finding | After finding formulation | Number mismatches, missing sample sizes |
| **DD0** Data Dictionary | Before using any dataset column | Undocumented columns, semantic misunderstandings |
| **DC0** Design Compliance | At stage transitions | Execution drifting from design |

All gates are **domain-general** — no hardcoded thresholds. They work for any research domain.

### R2 INLINE Mode (7th Activation)

Lightweight 7-point checklist applied at **every finding formulation**, not just at FORCED reviews:

```
INLINE-R2 Checklist:
 1. NUMBERS MATCH SOURCE
 2. SAMPLE SIZE ADEQUATE
 3. ALTERNATIVE EXPLANATIONS
 4. TERMINOLOGY PRECISE
 5. CLAIM <= EVIDENCE
 6. TRACEABLE
 7. SURVIVES HOSTILE READ

Verdict: 7/7 = PASS | 5-6 = WARN | <5 = BLOCKED | Item 1 FAIL = HALT
```

### Other v5.5 Changes

| Change | What it does |
|--------|-------------|
| **SSOT Rule** | All numbers originate from structured data files. Documents reference, never define. |
| **Structured Logbook** | Mandatory LOGBOOK.md entry in CRYSTALLIZE for every OTAE cycle. Not optional, not retroactive. |
| **Operational Integrity** | OBSERVE phase checks for orphaned datasets, document sync, design drift. |
| **Literature Pre-Check** | Phase 0 gains Step 2b: search for prior art BEFORE committing to research direction. |
| **Data Dictionary** | Document every column meaning before using it. Column names lie. |

---

## v5.0 — IUDEX

> *The verification release. Every finding is tested before it's trusted. R2 is structurally unbypassable — not just prompted, architecturally enforced.*

Huang et al. (ICLR 2024) proved that **LLMs cannot self-correct reasoning without external feedback**. v4.5's R2 was strong but prompt-enforced. v5.0 makes adversarial review architecturally unbypassable.

### Four Innovations

| Innovation | What It Does | Gate |
|-----------|-------------|------|
| **Seeded Fault Injection (SFI)** | Inject known faults before R2 reviews. Miss = review INVALID. | V0 (RMS >= 0.80) |
| **Blind-First Pass (BFP)** | R2 reviews claims before seeing justifications. Breaks anchoring bias. | — (within review) |
| **Judge Agent (R3)** | Meta-reviewer scores R2's review on 6 dimensions. Reviews the review, not the claims. | J0 (>= 12/18) |
| **Schema-Validated Gates (SVG)** | 8 gates enforce JSON Schema. Prose claims ignored. | 8 schema gates |

### FORCED Review Flow (v5.0)

```
TRIGGER → SFI (inject faults) → BFP Phase 1 (blind review)
       → BFP Phase 2 (full context) → V0 (vigilance gate)
       → J0 (judge gate) → Schema Validation → Normal Gate Eval

       V0 FAIL or J0 FAIL → restart from BFP Phase 1
```

### Six Enhancements

| Enhancement | What it does |
|------------|-------------|
| **R2 Salvagente** | Killed claims with potential preserve serendipity seeds |
| **Structured Seeds** | Schema-validated research objects, not notes |
| **Exploration Budget** | LAW 8 gains measurable 20% floor at T3 |
| **Confidence Formula** | Hard veto + geometric mean with dynamic floor |
| **Circuit Breaker** | Same objection x 3 rounds → DISPUTED. Frozen, not killed. S5 poison pill. |
| **Permission Model** | R2 produces verdicts. Orchestrator executes. Separation of powers. |

### Agent Permission Model

```
R2 Ensemble (READ only) → verdict.yaml → Orchestrator (READ+WRITE)
                                              │
                    ┌─────────────────────────┤
                    ↓                         ↓
              R3 Judge (scores)         Claim Ledger (updated)

R2 NEVER writes to the claim ledger.
R3 NEVER modifies R2's report.
Schemas are READ-ONLY for all agents.
```

---

## v4.5 — ARBOR VITAE (Pruned)

> *Adds structured ideation (Phase 0) and a 5-stage research pipeline. 206 lines smaller than v4.0 while being more capable.*

### Phase 0: Brainstorm Engine

A mandatory 10-step ideation phase before the OTAE loop begins:

```
UNDERSTAND → LANDSCAPE → GAPS → INVERSION → DATA →
HYPOTHESES → COLLISION-ZONE → TRIAGE → PRODUCTIVE TENSIONS →
R2 REVIEW → COMMIT
```

**Key moves:**
- **Inversion Exercise**: systematically invert top 3 consensus claims to generate contrarian hypotheses
- **Collision-Zone Thinking**: force cross-domain hypotheses (physics x biology, economics x ecology)
- **Productive Tensions**: preserve competing paradigms instead of premature convergence

### R2 Expanded to 6 Modes

| Mode | Trigger | Purpose |
|------|---------|---------|
| BRAINSTORM | Phase 0 | Review ideation quality |
| FORCED | Every 20 cycles | Mandatory scheduled review |
| BATCH | Multiple claims | Group review of pending claims |
| SHADOW | Continuous | Background monitoring |
| VETO | R2-initiated | Emergency stop on a finding |
| REDIRECT | R2-initiated | Force a change of direction |

### Auto-Experiment Protocol

```
1. Researcher formulates hypothesis as testable code
2. Auto-Experiment generates script with seeds + version info
3. Execution → metric parsing → artifact creation
4. R2 reviews results (not just conclusions)
5. Gate evaluation → tree node scoring
```

---

## v4.0 — ARBOR VITAE

> *Evolves the flat OTAE loop into a branching tree search over hypotheses.*

### Architecture: OTAE-Tree

```
                     root
                    /    \
                node-A   node-B          ← each = full OTAE cycle
               / |  \      |
            A1  A2  A3    B1             ← children = variations
           /
         A1a                             ← deeper exploration

 Selection: Score = Evidence×0.6 + Metrics×0.3 + Novelty×0.1
 Pruning:   3 debug fails → prune | 5 non-improving → soft prune
 Health:    good_nodes / total >= 0.2 or EMERGENCY STOP
```

**7 node types:** `draft` · `debug` · `improve` · `hyperparameter` · `ablation` · `replication` · `serendipity`

**3 tree modes:** `LINEAR` (literature) · `BRANCHING` (experiments) · `HYBRID` (both)

### v3.5 → v4.0: What Changed

| Dimension | v3.5 | v4.0 |
|-----------|------|------|
| Loop | Flat OTAE | **OTAE-Tree** (nodes in a tree) |
| Exploration | Sequential | **Best-first** with branching + pruning |
| Serendipity | Linear scanning | **Cross-branch** pattern detection |
| Laws | 7 | **10** (+Explore, +Confounder Harness, +Crystallize) |
| Gates | 12 | **26** (+Tree T0-T3, +Brainstorm B0, +Stage S1-S5) |
| Protocols | 9 | **16** (+7 new) |
| Agents | Single context | **SOLO + TEAM** modes |
| Paper output | Manual | **Writeup Engine** (IMRAD from verified claims) |

### 3 New Constitutional Laws

| # | Law | Rule |
|---|-----|------|
| 8 | EXPLORE BEFORE EXPLOIT | Minimum 3 draft nodes before any is promoted |
| 9 | CONFOUNDER HARNESS | Raw → Conditioned → Matched. Sign change = ARTIFACT. `NO HARNESS = NO CLAIM` |
| 10 | CRYSTALLIZE OR LOSE | Every result written to persistent file. `NOT IN FILE = DOESN'T EXIST` |

### SOLO vs TEAM Mode

| | SOLO | TEAM |
|---|------|------|
| Context | All roles in one window | Separate agents per role |
| R2 independence | Simulated (double-pass) | **True** (own context window) |
| Cost | 1x | ~3-4x |
| Best for | Literature, short sessions | Computational experiments, high stakes |

### 5-Stage Experiment Manager

```
S1 Preliminary (max 20 iter) → S2 Hyperparameter (max 12)
→ S3 Research Agenda (max 12) → S4 Ablation (max 18) → S5 Synthesis (max 5)

Shortcuts: Literature-only: S1 → S5 | Analysis: S1 → S2 → S4 → S5
```

---

## v3.5 — TERTIUM DATUR

> *The foundation. Field-tested over 21 sprints of CRISPR-Cas9 research (VibeX 2026).*

### Architecture: OTAE Loop

```
╔══════════════════════════════════════════════════════════════╗
║                     OTAE-SCIENCE LOOP                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  OBSERVE     →  Read STATE.md + PROGRESS. Identify delta.    ║
║       ↓                                                      ║
║  THINK       →  Plan highest-value next action.              ║
║       ↓                                                      ║
║  ACT         →  Execute ONE action                           ║
║       ↓         (search / analyze / extract / compute)       ║
║  EVALUATE    →  Extract claims → score confidence → gate     ║
║       ↓                                                      ║
║  CHECKPOINT  →  R2 trigger? Serendipity triage? Stop?        ║
║       ↓                                                      ║
║  CRYSTALLIZE →  Update STATE.md, PROGRESS.md, CLAIM-LEDGER   ║
║       ↓         → LOOP BACK TO OBSERVE                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

### 7 Constitutional Laws

| # | Law | Rule |
|---|-----|------|
| 1 | DATA-FIRST | No thesis without evidence from data |
| 2 | EVIDENCE DISCIPLINE | Every claim: claim_id + evidence chain + confidence + status |
| 3 | GATES BLOCK | Quality gates are hard stops, not suggestions |
| 4 | R2 ALWAYS-ON | Every milestone passes adversarial review |
| 5 | SERENDIPITY PRESERVED | Unexpected discoveries are features, not distractions |
| 6 | ARTIFACTS OVER PROSE | If it can produce a file, it MUST |
| 7 | FRESH CONTEXT RESILIENCE | Resumable from STATE.md alone |

### Reviewer 2 Ensemble

4 specialist reviewers (Methods, Stats, Bio, Engineering) run a **double-pass** workflow:

1. **Fatal Hunt** (purely destructive): find what's broken
2. **Method Repair** (constructive): propose what would fix it

**3-level orthogonal attack**: L1-Logic · L2-Statistics · L3-Data

### Evidence Engine

```
confidence = E×0.30 + R×0.25 + C×0.20 + K×0.15 + D×0.10

FLOOR: E < 0.2 → capped at 0.20
```

**4 typed claims**: `descriptive` · `correlative` · `causal` · `predictive`

### Quality Gates (12)

- **Pipeline (G0-G5)**: Input Sanity, Schema, Design, Training, Metrics, Artifacts
- **Literature (L0-L2)**: Source Validity (DOI verified), Coverage (>= 3 sources), Review Complete
- **Decision (D0-D2)**: Decision Justified, Claim Promotion (R2 approved), RQ Conclusion

### Protocols (9)

| Protocol | Purpose |
|----------|---------|
| Loop OTAE | 6-phase cycle with emergency protocols |
| Evidence Engine | Claim Ledger, confidence formula, Assumption Register |
| Reviewer 2 Ensemble | 4-domain adversarial review, double-pass |
| Search Protocol | Source priority (Scopus > PubMed > OpenAlex > bioRxiv > web) |
| Analysis Orchestrator | Artifact contract (manifest + report + figures + metrics + scripts) |
| Serendipity Engine | Quantitative triage (0-15), scheduled Sprints |
| Knowledge Base | Cross-RQ persistence: library.json, patterns.md, dead-ends.md |
| Data Extraction | NO TRUNCATION rule, AnnData schema contract |
| Audit & Reproducibility | Decision log, run comparison, 10-point reproducibility contract |

### Field Testing: 21 Sprints

| Metric | Value |
|--------|-------|
| Sprints completed | 21 |
| Total claims registered | 34 |
| Claims killed or downgraded | 11 (32%) |
| Most dangerous claim caught | OR=2.30, p < 10⁻¹⁰⁰ — sign reversed by propensity matching |

---

## Photonics Fork — ORO-PHOTONICS

> *Domain-specialized fork for literature-based research in photonics and high-speed optical interconnects (IM-DD, VCSEL, PAM4).*

### What the Fork Adds

| Innovation | Description |
|-----------|-------------|
| **R2-Physics** | Domain-specialist reviewer: electromagnetic plausibility, Shannon limit, thermodynamic constraints |
| **Expert Knowledge Injection** | Capture and enforce expert assertions as ground truth |
| **Human Expert Gates (HE0-HE3)** | Four blocking gates where the domain expert validates physical plausibility |
| **EXPERT-ASSERTIONS.md** | Persistent expert ground truth file, consulted by R2 before every review |

### Gate Architecture: 36 Total

```
Base:      G0-G6 · L0-L2 · D0-D2 · T0-T3 · B0 · S1-S5 · V0 · J0   (25)
Photonics: HE0 (Context) · HE1 (Priority) · HE2 (Plausibility) · HE3 (Completeness)   (4)
v5.5 ORO:  L-1 · DQ1-DQ4 · DD0 · DC0   (7)
```

---

## Feature Evolution Tables

### Reviewer 2 Ensemble

| Feature | v3.5 | v4.0 | v4.5 | v5.0 | v5.5 | v6.0 |
|---------|------|------|------|------|------|------|
| Reviewers | 4 | 4 | 4 | 4 | 4 | 4 |
| Modes | 3 | 3 | **6** | 6 | **7** (+INLINE) | 7 |
| Workflow | Double-pass | Double-pass | + red flags | + **BFP** + **SFI** | + **INLINE** | + **auto-calibration** |
| Independence | Simulated | TEAM available | TEAM | TEAM + **R3 Judge** | TEAM + R3 + INLINE | + **plugin-enforced** |
| Schema enforcement | None | None | None | **8 gates** | 8 + 7 instruction | + **code-enforced** |

### Evidence Engine

| Feature | v3.5 | v4.0+ |
|---------|------|-------|
| Formula | Weighted sum | **Geometric mean** with hard veto |
| Floor | E < 0.2 → cap | E < 0.05 or D < 0.05 → **zero** |
| Counter-evidence | Not required | **Mandatory** at confidence >= 0.60 |
| Confounder harness | Not systematic | **LAW 9**: Raw → Conditioned → Matched |

### Serendipity Engine

| Feature | v3.5 | v4.0+ | v5.0 | v5.5 | v6.0 |
|---------|------|-------|------|------|------|
| Scale | 0-15 | 0-20 | 0-20 | 0-20 | 0-20 |
| Cross-branch | No | **Yes** | Yes | Yes | Yes |
| Salvagente | No | No | **Yes** | Yes | + **cross-session** |
| Persistence | File-based | File-based | File-based | File-based | **SQLite + vectors** |

---

## Academic Foundations

### Core: LLM Self-Correction Limitations

| Paper | Key Finding | Vibe Science Response |
|-------|------------|---------------|
| **Huang et al.** (ICLR 2024) — "LLMs Cannot Self-Correct Reasoning Yet" | Intrinsic self-correction ineffective; 74.7% retain initial answer | Foundation for entire architecture. R2 must be structurally separated. |
| **Gou et al.** (ICLR 2024) — "CRITIC" | Self-correction works ONLY with external tool feedback | Validates R2's mandatory tool-use. |
| **Kamoi et al.** (TACL 2024) | No prior work demonstrates successful self-correction from prompts alone | Motivates architectural triad (SFI + BFP + R3). |

### Multi-Agent Correction

| Paper | Key Finding | Vibe Science Response |
|-------|------------|---------------|
| **Du et al.** (ICML 2024) — "Multiagent Debate" | Multiple agents debating reduces factual errors by 30%+ | Direct validation of R2 multi-reviewer architecture. |
| **Wang et al.** (2022) — "Self-Consistency" | Sampling N independent chains outperforms single-pass | In SOLO mode, R2 generates N=3 independent assessments. |
| **Dhuliawala et al.** (2023) — "Chain-of-Verification" | Verification questions independently from original draft | Strengthens BFP Phase 1 design. |

### Peer Review as Model

| Paper | Key Finding | Vibe Science Response |
|-------|------------|---------------|
| **Krlev & Spicer** (JMS 2023) — "Reining in Reviewer Two" | Epistemic respect = assess on soundness, not origin | R2's calibration: destructive but rigorous. R3 enforces quality. |
| **Watling et al.** (2021) — "Don't Be Reviewer 2!" | Checklist-only reviews are mechanical | R2 Red Flag Checklist is a *floor*. R3 ensures depth. |
| **Jefferson et al.** (JAMA 2002) | Interventions to improve peer review "relatively unsuccessful" | Cannot fix with better instructions alone → SFI + R3. |

### Mutation Testing Theory

| Paper | Key Finding | Vibe Science Response |
|-------|------------|---------------|
| **Jia & Harman** (IEEE TSE 2011) | 10% random sampling ~84% as effective as exhaustive | Justifies 1-3 faults per FORCED review in SFI. |
| **Papadakis et al.** (2019) | Equivalent mutants inflate scores | EQUIV state in fault taxonomy. |

### Concurrent Work

| System | Relationship |
|--------|-------------|
| **DeepMind Aletheia** (2026) | Generator-Verifier-Reviser = architecturally isomorphic to Researcher-R2-Researcher loop |
| **DeepMind Deep Think** (2026) | Inference-time compute scaling. **Complementary:** Deep Think catches reasoning errors, Vibe Science catches empirical errors. |
| **Kumar et al. SCoRe** (ICLR 2025) | RL enables genuine self-correction (+15.6% MATH). SFI + R3 are the agent-level analog. |

---

*For installation and getting started, see [README.md](README.md).*
