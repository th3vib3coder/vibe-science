<div align="center">

# Vibe Science v4.5

### ARBOR VITAE (Pruned)

**Agentic tree search for scientific research.**<br>
**Infinite loops until discovery. Adversarial review at every node.**

[![DOI](https://zenodo.org/badge/1148022920.svg)](https://doi.org/10.5281/zenodo.18665031)
[![Version](https://img.shields.io/badge/version-4.5.0-blue.svg)](#version-history)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](../LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-plugin-blueviolet.svg)](https://docs.anthropic.com/en/docs/claude-code)
[![Laws](https://img.shields.io/badge/constitutional_laws-10-orange.svg)](#10-constitutional-laws)
[![Gates](https://img.shields.io/badge/quality_gates-25-red.svg)](#quality-gates)

<br>

*"It's not the prompt that makes the difference.*
*It's the system that PREVENTS the prompt from lying."*

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

**Vibe Science embeds both dispositions in the same system.** The builder builds. The destroyer destroys. Only what survives both gets published.

---

## How It Works

```mermaid
graph TB
    subgraph "Phase 0: Scientific Brainstorm"
        U[UNDERSTAND<br>Context] --> L[LANDSCAPE<br>Field Map]
        L --> G[GAPS<br>Blue Ocean Hunt]
        G --> INV[INVERSION<br>Contrarian Claims]
        INV --> D[DATA<br>Reality Check]
        D --> H[HYPOTHESES<br>Testable Claims]
        H --> COL[COLLISION-ZONE<br>Cross-Domain]
        COL --> T[TRIAGE<br>Score & Rank]
        T --> PT[PRODUCTIVE<br>TENSIONS]
        PT --> R2B[R2 REVIEW<br>Adversarial]
        R2B --> |"WEAK_ACCEPT+"| COM[COMMIT<br>Lock Direction]
    end

    COM --> OTAE

    subgraph "OTAE-Tree Loop"
        OTAE[OBSERVE<br>Read State + Tree] --> THINK[THINK<br>Select Node]
        THINK --> ACT[ACT<br>Execute]
        ACT --> EVAL[EVALUATE<br>Score + Gate]
        EVAL --> CHECK[CHECKPOINT<br>R2 + Serendipity]
        CHECK --> CRYST[CRYSTALLIZE<br>Persist to Files]
        CRYST --> |"loop"| OTAE
    end

    CHECK --> |"FORCED/VETO"| R2[R2 Ensemble<br>4 Reviewers]
    CHECK --> |"score >= 12"| SER[Serendipity<br>New Branch]
    EVAL --> |"stage gate"| STAGE[Stage<br>Transition]

    style R2B fill:#ff6b6b,color:#fff
    style R2 fill:#ff6b6b,color:#fff
    style SER fill:#4ecdc4,color:#fff
    style INV fill:#ffe66d,color:#333
    style COL fill:#ffe66d,color:#333
    style PT fill:#ffe66d,color:#333
```

### OTAE Inside Tree Nodes

v3.5 had a flat loop. v4.5 has a **branching tree** where each node is a complete OTAE cycle:

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

---

## Key Features

<table>
<tr>
<td width="33%" valign="top">

### Reviewer 2 Co-Pilot

Not a gate you pass — a co-pilot you can't fire.

```mermaid
graph LR
    F[Finding] --> R2M[R2-Methods]
    F --> R2S[R2-Stats]
    F --> R2B[R2-Bio]
    F --> R2E[R2-Eng]
    R2M --> V{Verdict}
    R2S --> V
    R2B --> V
    R2E --> V

    style V fill:#ff6b6b,color:#fff
```

**6 modes:** BRAINSTORM · FORCED · BATCH · SHADOW · VETO · REDIRECT

**12 red flags** checked at every review (6 statistical + 6 methodological)

**Double-pass:** Fatal Hunt (destroy) → Method Repair (fix)

</td>
<td width="33%" valign="top">

### Evidence Engine

Every claim is quantified, not felt.

```
confidence =
    E × 0.30  Evidence Quality
  + R × 0.25  Robustness
  + C × 0.20  Concordance
  + K × 0.15  Confounding Risk
  + D × 0.10  Directness

FLOOR: E < 0.2 → capped at 0.20
```

**Confounder Harness (LAW 9):**
- Raw → Conditioned → Matched
- Sign change = ARTIFACT (killed)
- Collapse >50% = CONFOUNDED
- Survives = ROBUST

**Counter-evidence** search mandatory at confidence >= 0.60

**DOI verification** before any claim promotion

</td>
<td width="33%" valign="top">

### Serendipity Radar

Active scanner, not passive logger.

**5 scans every EVALUATE:**
1. Anomaly detection
2. Cross-branch patterns
3. Contradiction register
4. Connection discovery
5. Score computation

**Response matrix:**
- Score >= 12 → INTERRUPT
- Score >= 8 → QUEUE
- Score >= 4 → FILE
- Score < 4 → NOISE

**Cross-branch** serendipity is v4.0+ exclusive — patterns visible only when comparing tree branches.

</td>
</tr>
</table>

---

## 10 Constitutional Laws

> These govern ALL behavior. No protocol, no user request, no context can override them.

| | Law | Rule | Enforcement |
|---|-----|------|-------------|
| **1** | DATA-FIRST | No thesis without evidence from data | `NO DATA = NO GO` |
| **2** | EVIDENCE DISCIPLINE | Every claim: claim_id + evidence chain + confidence + status | Evidence floor gate |
| **3** | GATES BLOCK | Quality gates are hard stops, not suggestions | 25 gates block pipeline |
| **4** | R2 IS CO-PILOT | R2 can VETO, REDIRECT, FORCE. Non-negotiable. | 6 activation modes |
| **5** | SERENDIPITY IS THE MISSION | Actively hunt the unexpected at every cycle | Radar + cross-branch |
| **6** | ARTIFACTS OVER PROSE | If it can produce a file, it MUST | LAW 10 cascades |
| **7** | FRESH CONTEXT RESILIENCE | Resumable from STATE.md + TREE-STATE.json alone | File-based state |
| **8** | EXPLORE BEFORE EXPLOIT | Minimum 3 draft nodes before promotion | Tree health gate T3 |
| **9** | CONFOUNDER HARNESS | Raw → Conditioned → Matched for every quantitative claim | `NO HARNESS = NO CLAIM` |
| **10** | CRYSTALLIZE OR LOSE | Every result written to persistent file | `NOT IN FILE = DOESN'T EXIST` |

---

## Quality Gates

<table>
<tr>
<td valign="top">

**Pipeline (G0-G6)**
```
G0  Input Sanity
G1  Schema Validation
G2  Design Review
G3  Training Health
G4  Metrics Baseline
G5  Artifacts Exist
G6  VLM Validation (optional)
```

</td>
<td valign="top">

**Literature (L0-L2)**
```
L0  Source Validity (DOI verified)
L1  Coverage (>= 3 strategies)
L2  Review Complete
```

**Decision (D0-D2)**
```
D0  Decision Justified
D1  Claim Promotion
D2  RQ Conclusion
```

</td>
<td valign="top">

**Tree (T0-T3)**
```
T0  Node Validity
T1  Debug Limit (max 3)
T2  Branch Diversity
T3  Tree Health (>= 20%)
```

**Brainstorm + Stage**
```
B0  Brainstorm Quality
S1-S5  Stage Gates
```

</td>
</tr>
</table>

---

## 5-Stage Experiment Manager

```mermaid
graph LR
    S1["Stage 1<br>Preliminary<br>max 20 iter"] --> S2["Stage 2<br>Hyperparameter<br>max 12 iter"]
    S2 --> S3["Stage 3<br>Research Agenda<br>max 12 iter"]
    S3 --> S4["Stage 4<br>Ablation<br>max 18 iter"]
    S4 --> S5["Stage 5<br>Synthesis<br>max 5 iter"]

    S1 -.-> |"lit-only"| S5
    S1 -.-> |"analysis"| S2
    S2 -.-> |"analysis"| S4

    style S5 fill:#4ecdc4,color:#fff
```

Literature-only: S1 → S5 | Analysis: S1 → S2 → S4 → S5 | Full computational: all 5 stages

---

## SOLO vs TEAM Runtime

<table>
<tr>
<td width="50%">

### SOLO Mode (default)

```
┌──────────────────────────────────┐
│      SINGLE CONTEXT WINDOW       │
│                                  │
│  Orchestrator (OTAE loop)        │
│  + Researcher                    │
│  + Reviewer 2 (simulated)        │
│  + Serendipity Scanner           │
│  + Experiment Runner             │
│                                  │
│  Token cost: 1x                  │
└──────────────────────────────────┘
```

Best for: literature review, short sessions, token-constrained environments.

</td>
<td width="50%">

### TEAM Mode (opt-in)

```
┌────────────┐    ┌────────────┐
│  TEAM LEAD │───>│ RESEARCHER │
│            │    │  (Sonnet)  │
│            │    └─────┬──────┘
│            │          │
│            │<──>┌─────┴──────┐
│            │    │ REVIEWER 2 │
│            │    │  (Opus)    │
│            │    │ Own context│
│            │    └────────────┘
│            │<──>┌────────────┐
│            │    │SERENDIPITY │
│            │    │  (Haiku)   │
│            │    └────────────┘
└────────────┘
     Token cost: ~3-4x
```

Best for: computational experiments, high-stakes findings, long sessions.

Requires: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`

</td>
</tr>
</table>

Fallback from TEAM → SOLO is seamless. All state lives in files (LAW 7).

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

### 3. Choose runtime

```
[1] SOLO — Single agent. All roles in one context. Lower cost.
[2] TEAM — Agent Teams. R2 gets own context. Higher quality.
```

### 4. Phase 0 begins automatically

The system guides you through structured brainstorming. You don't need to know the protocol — just answer questions about your research domain.

---

## v4.5 Improvements (over v4.0)

| Intervention | File | What it does |
|-------------|------|-------------|
| **Inversion Exercise** | brainstorm-engine.md | Systematically invert top 3 consensus claims to generate contrarian hypotheses |
| **Collision-Zone Thinking** | brainstorm-engine.md | Force cross-domain hypothesis (physics × biology, economics × ecology) |
| **Productive Tensions** | brainstorm-engine.md | Preserve competing paradigms instead of premature convergence |
| **R2 Red Flag Checklist** | reviewer2-ensemble.md | 12 mandatory flags (statistical + methodological) at every review |
| **Counter-Evidence Search** | evidence-engine.md | Active hunt for contradicting evidence before claim promotion |
| **DOI Verification** | search-protocol.md | Verify every citation resolves before trusting it |
| **Progressive Disclosure** | SKILL.md | -381 lines removed, pointers to protocol files, faster context loading |

**Net result:** the skill is **206 lines smaller** than v4.0 while being more capable.

---

## Protocols

16 protocols loaded on-demand via progressive disclosure:

### Core Loop

| Protocol | File | Purpose |
|----------|------|---------|
| Loop OTAE | `protocols/loop-otae.md` | OTAE-Tree cycle with node context, best-first selection, emergency protocols |
| Evidence Engine | `protocols/evidence-engine.md` | Claim Ledger, confidence formula (E·R·C·K·D), confounder harness, counter-evidence, evidence floor |
| Reviewer 2 Ensemble | `protocols/reviewer2-ensemble.md` | 4-domain adversarial review, 6 modes, 12 red flags, double-pass, TEAM support |
| Search Protocol | `protocols/search-protocol.md` | Source priority (Scopus > PubMed > OpenAlex > bioRxiv), DOI verification, anti-hallucination |

### Tree & Experiment

| Protocol | File | Purpose |
|----------|------|---------|
| Tree Search | `protocols/tree-search.md` | 3 modes, 7 node types, best-first selection, pruning rules |
| Experiment Manager | `protocols/experiment-manager.md` | 5-stage lifecycle with iteration limits per stage |
| Auto-Experiment | `protocols/auto-experiment.md` | Code generation → execution → metric parsing pipeline |
| Brainstorm Engine | `protocols/brainstorm-engine.md` | Phase 0 + Inversion + Collision-Zone + Productive Tensions |
| Agent Teams | `protocols/agent-teams.md` | TEAM mode: 4 agents, shared filesystem, fallback to SOLO |

### Research Support

| Protocol | File | Purpose |
|----------|------|---------|
| Analysis Orchestrator | `protocols/analysis-orchestrator.md` | Artifact contract, manifests, OAT ablation, triage |
| Data Extraction | `protocols/data-extraction.md` | NO TRUNCATION, AnnData schema, supplementary materials |
| Serendipity Engine | `protocols/serendipity-engine.md` | Active radar, cross-branch scanning, sprints, escalation |
| Knowledge Base | `protocols/knowledge-base.md` | Cross-RQ persistence (library.json, patterns, dead-ends) |
| Audit & Reproducibility | `protocols/audit-reproducibility.md` | Decision log, run comparison, snapshots, 10-point contract |

### Output

| Protocol | File | Purpose |
|----------|------|---------|
| VLM Gate | `protocols/vlm-gate.md` | Optional figure validation via vision-language model (>= 0.8 to pass) |
| Writeup Engine | `protocols/writeup-engine.md` | IMRAD paper drafting from verified claims, confidence-to-language mapping |

---

## CLAUDE.md Constitution

A project constitution loaded into **every agent's context**, containing:

- **The Problem Statement** — why AI agents are dangerous in science (with real examples from the 21-sprint case study)
- **10 Immutable Laws** — non-overridable behavioral constraints
- **Role-Specific Constraints** — behavioral rules per agent role:
  - **Researcher**: BUILD + EXECUTE. Search for confounders first, not celebrations.
  - **Reviewer 2**: DESTRUCTION. Assume every claim is wrong. Never congratulate.
  - **Serendipity Scanner**: DETECTION. Continuous, cross-branch, escalating.
  - **Experimenter**: EXECUTION. Files, seeds, versions, parameter logs.
  - **Team Lead**: COORDINATION. Delegate, never implement.
- **Hooks Documentation** — what each system-level hook enforces

---

## Hooks Enforcement

Four Claude Code hooks in `.claude/hooks.json` provide **system-level** enforcement that cannot be overridden by any agent:

| Hook | Trigger | Enforces |
|------|---------|----------|
| **Stop** | Agent attempts to stop | Claims must have confounder harness + R2 review |
| **TaskCompleted** | Task marked complete | Required artifacts must exist |
| **TeammateIdle** | Teammate goes idle | No pending work can exist |
| **SubagentStop** | Subagent attempts to stop | Must have produced output files |

---

<details>
<summary><h2>File Structure (click to expand)</h2></summary>

### Plugin Structure

```
vibe-science-v4.5/
├── .claude-plugin/
│   └── plugin.json                 # Plugin manifest (v4.5.0)
├── SKILL.md                        # Core specification (1150 lines)
├── CLAUDE.md                       # Project constitution for all agents
├── README.md                       # This file
├── LICENSE                         # Apache 2.0
│
├── commands/
│   └── start.md                    # /start — SOLO/TEAM + session init
│
├── protocols/                      # Loaded on-demand by dispatch table
│   ├── brainstorm-engine.md        # Phase 0 + Inversion + Collision-Zone
│   ├── loop-otae.md                # OTAE-Tree cycle
│   ├── tree-search.md              # Tree modes, selection, pruning
│   ├── experiment-manager.md       # 5-stage manager
│   ├── auto-experiment.md          # Code gen + execution + metrics
│   ├── reviewer2-ensemble.md       # R2: 6 modes, 4 reviewers, red flags
│   ├── evidence-engine.md          # Claims, confidence, harness, counter-evidence
│   ├── serendipity-engine.md       # Radar, cross-branch, sprints
│   ├── search-protocol.md          # Literature search + DOI verification
│   ├── agent-teams.md              # SOLO/TEAM architecture
│   ├── vlm-gate.md                 # Visual validation (optional)
│   ├── writeup-engine.md           # IMRAD drafting
│   ├── analysis-orchestrator.md    # Data analysis pipeline
│   ├── knowledge-base.md           # Cross-RQ persistence
│   ├── data-extraction.md          # Supplementary extraction
│   └── audit-reproducibility.md    # Run manifests
│
├── gates/
│   └── gates.md                    # All 25 gates with pass/fail criteria
│
├── assets/
│   ├── node-schema.md              # TreeNode YAML schema
│   ├── stage-prompts.md            # Stage-specific guidance
│   ├── metric-parser.md            # Metric extraction
│   ├── obs-normalizer.md           # AnnData obs schema
│   ├── templates.md                # File templates
│   └── skill-router.md             # Tool dispatch table
│
├── examples/
│   └── walkthrough-literature-review.md
│
└── .claude/
    ├── settings.json               # Agent Teams, permissions
    └── hooks.json                  # Enforcement hooks
```

### Runtime Directory (created during research)

```
.vibe-science/
├── STATE.md                        # Current state (max 100 lines)
├── PROGRESS.md                     # Append-only log
├── CLAIM-LEDGER.md                 # All claims + evidence + confidence
├── ASSUMPTION-REGISTER.md          # Assumptions + risk + verification
├── SERENDIPITY.md                  # Discovery log
├── TREE-STATE.json                 # Full tree serialization
├── KNOWLEDGE/
│   ├── library.json
│   └── patterns.md
│
└── RQ-001-[slug]/
    ├── RQ.md
    ├── 00-brainstorm/              # Phase 0 outputs
    │   ├── context.md
    │   ├── landscape.md
    │   ├── gaps.md
    │   ├── data-audit.md
    │   ├── hypotheses.md
    │   └── triage.md
    ├── 01-discovery/
    ├── 02-analysis/
    ├── 03-data/
    ├── 04-validation/
    ├── 05-reviewer2/
    ├── 06-runs/
    ├── 07-audit/
    ├── 08-tree/
    │   ├── tree-visualization.md
    │   ├── nodes/                  # One YAML per node
    │   ├── stage-transitions.log
    │   └── best-nodes.md
    └── 09-writeup/
```

</details>

---

## Version History

| Version | Codename | Year | Key Changes |
|---------|----------|------|-------------|
| 1.0 | — | 2024 | 6-phase loop, basic R2, state files |
| 2.0 | Nullis Secundus | 2024 | Modular architecture, R2 ensemble, quality gates, confidence formula |
| 3.0 | Tertium Datur | 2025 | OTAE unrolled loop, MCP integration, knowledge base, Serendipity Sprints |
| 3.5 | Tertium Datur | 2025 | R2 double-pass, typed claims, tool-use audit, confounding table, No Free Lunch |
| 4.0 | Arbor Vitae | 2025 | Tree search, 5-stage manager, Phase 0, 10 Laws, Agent Teams, VLM gate, hooks |
| **4.5** | **Arbor Vitae (Pruned)** | **2025** | **Inversion + Collision-Zone, R2 red flags, counter-evidence, DOI verification, progressive disclosure** |

---

## Lineage

```mermaid
graph TD
    R[Ralph Wiggum<br>infinite loop] --> V1[Vibe Science<br>v1.0]
    GSD[GSD<br>file-based state] --> V1
    BMAD[BMAD<br>multi-agent] --> V1
    V1 --> V2[v2.0<br>Nullis Secundus]
    SP[Superpowers<br>skill dispatch] --> V2
    AB[Anthropic bio-research<br>toolkit] --> V2
    V2 --> V3[v3.0-3.5<br>Tertium Datur]
    V3 --> V4[v4.0<br>Arbor Vitae]
    AIS[AI-Scientist-v2<br>tree search] --> V4
    V4 --> V45[v4.5<br>Arbor Vitae Pruned]
    OBR[obra<br>thinking frameworks] --> V45
    DAV[davila7<br>verification patterns] --> V45
    OAI[OpenAI<br>progressive disclosure] --> V45

    style V45 fill:#4ecdc4,color:#fff,stroke:#333,stroke-width:2px
    style V4 fill:#45b7d1,color:#fff
    style V3 fill:#96ceb4,color:#333
    style V2 fill:#ffeaa7,color:#333
    style V1 fill:#dfe6e9,color:#333
```

---

## Design Philosophy

Vibe Science was built by reverse-engineering two complementary approaches:

<table>
<tr>
<td width="50%" valign="top">

**Agentic research loops**
*(Ralph, GSD, BMAD, AI-Scientist-v2)*

Excellent as **systems**: infinite loop, state management, tree search.

Missing: executability, adversarial review, serendipity.

</td>
<td width="50%" valign="top">

**Scientific toolkits**
*(Anthropic bio-research, Claude Scientific Skills, MCP)*

Excellent as **tools**: CLI scripts, database APIs, analysis pipelines.

Missing: loop, persistence, adversarial review.

</td>
</tr>
</table>

**Vibe Science fuses both:** the systematic rigor of a research loop with the concrete executability of a scientific toolkit, bound together by an adversarial co-pilot that prevents the system from lying to itself.

---

## Academic Foundations

Vibe Science v4.5 builds on peer-reviewed research in adversarial review, tree search, and agentic architectures:

### Agentic Architecture

| Paper / Source | Contribution to v4.5 |
|---|---|
| **Sakana AI-Scientist-v2** (Lu et al., arXiv:2504.08066v1) | Tree search architecture and 4-stage experiment manager. v4.0's OTAE-Tree is adapted from AI-Scientist-v2's search-evaluate loop. |
| **OpenAI Codex agent loop** (2024) | OTAE (Observe-Think-Act-Evaluate) cycle structure. The unrolled agent loop with explicit observe/act/evaluate phases. |
| **obra** — thinking frameworks | Structured inversion and collision-zone thinking patterns. Influenced the v4.5 Brainstorm Engine's contrarian hypothesis generation. |
| **davila7** — verification patterns | Systematic verification protocols. Influenced DOI verification, counter-evidence search, and the anti-hallucination mandate in search-protocol.md. |
| **OpenAI** — progressive disclosure | On-demand protocol loading pattern. v4.5's -381 lines refactor (smaller but more capable) follows this principle. |

### Peer Review as Model

| Paper | Key Finding | How v4.5 Uses It |
|---|---|---|
| **Krlev, G. & Spicer, A.** (2023). "Reining in Reviewer Two." *JMS*. DOI:10.1111/joms.12905 | Epistemic respect requires assessing arguments on soundness, not origin. Good review = specific, developmental, evidence-based. | R2 Ensemble calibration: destructive but epistemically rigorous. Not theatrical rejection — surgical evidence-based demolition. |
| **Watling, C., et al.** (2021). "Don't Be Reviewer 2! Reflections on Writing Effective Peer Review Comments." | Checklist-only reviews are mechanical and less effective. Best reviews are specific with developmental intent. | R2's 12 Red Flag Checklist is a *floor*, not the ceiling. The double-pass (Fatal Hunt → Method Repair) ensures reviews are developmental, not just destructive. |

### Self-Correction Limitations (foreshadowing v5.0)

| Paper | Key Finding | Implication |
|---|---|---|
| **Huang, J., et al.** (2024). "Large Language Models Cannot Self-Correct Reasoning Yet." *ICLR 2024*. arXiv:2310.01798 | Intrinsic self-correction is ineffective; performance *degrades* after self-correction without external feedback. | R2 in SOLO mode (same context) is fundamentally limited. This motivates v4.5's TEAM mode (separate context) and v5.0's structural enforcement innovations. |
| **Gou, Z., et al.** (2023). "CRITIC: LLMs Can Self-Correct with Tool-Interactive Critiquing." *ICLR 2024*. arXiv:2305.11738 | Self-correction works ONLY with external tool feedback. Model's own critiques "contribute marginally." | Validates R2's mandatory tool-use (PubMed, Scopus, OpenAlex, web search) as architecturally necessary, not optional. |

---

## Known Limitations & Non-Goals

### Limitations

- Only 1 slash command (`/start`) — all phases are implicit via the OTAE loop
- LLM non-determinism means exact replication is not guaranteed (seeds are logged)
- TEAM mode requires Claude Code with Agent Teams experimental feature
- VLM gate (G6) is optional and requires vision model access
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
| **Guaranteed reproducibility** | Tracks provenance and seeds, but LLM non-determinism means crystallized artifacts are the reproducibility anchor |
| **Domain universality** | Tested on scRNA-seq / CRISPR; other domains may need custom gates, reviewers, or MCP skills |

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

*Built with Claude. Tested against Reviewer 2. Survived 21 sprints.*

**Vibe Science v4.5 ARBOR VITAE (Pruned)** — Progressive disclosure, R2 hardened.

</div>
