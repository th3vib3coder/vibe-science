<p align="center">
  <img src="logos/logo-v6.0.svg" alt="Vibe Science" width="700">
</p>

<p align="center">
  <a href="https://doi.org/10.5281/zenodo.18665031"><img src="https://zenodo.org/badge/1148022920.svg" alt="DOI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/version-6.0.0-purple.svg" alt="Version">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platform">
</p>

# Vibe Science

> An AI-native research engine that loops until discovery — with adversarial review, quality gates, serendipity tracking, and plugin-enforced integrity.

Vibe Science turns Claude Code into a disciplined research agent. Instead of letting the AI rush to conclusions, it forces every claim through adversarial review ("Reviewer 2"), quality gates, and confounder testing. Only what survives gets published.

**Field-tested over 21 CRISPR research sprints** — caught a claim with p < 10⁻¹⁰⁰ whose sign reversed under propensity matching. Without Vibe Science, it would have been published.

---

## Quick Start

Three steps. Copy-paste. Works on the first try.

### Step 1: Install Prerequisites

| Requirement | Minimum Version | Check Command |
|-------------|----------------|---------------|
| **Node.js** | >= 18.0.0 | `node --version` |
| **Claude Code** | >= 1.0.33 | `claude --version` |
| **Git** | any | `git --version` |

> **Don't have Node.js?** Download from [nodejs.org](https://nodejs.org/) (LTS recommended).
>
> **Don't have Claude Code?** Install with `npm install -g @anthropic-ai/claude-code`, then run `claude` to authenticate.

### Step 2: Clone and Install Dependencies

```bash
git clone https://github.com/th3vib3coder/vibe-science.git
cd vibe-science
npm install
```

> **On Windows?** If `npm install` fails with `better-sqlite3` errors, you may need build tools:
> ```powershell
> npm install -g windows-build-tools
> ```
> Or install Visual Studio Build Tools with the "Desktop development with C++" workload.

### Step 3: Launch Claude Code with the Plugin

```bash
claude --plugin-dir .
```

That's it. Claude Code starts with Vibe Science loaded. You'll see a confirmation message at startup.

---

## Installation Methods

There are three ways to use Vibe Science with Claude Code. Pick the one that fits your workflow.

### Method 1: `--plugin-dir` flag (Recommended for Getting Started)

Launch Claude Code from inside the plugin directory:

```bash
cd /path/to/vibe-science
claude --plugin-dir .
```

Or from anywhere, point to the plugin:

```bash
claude --plugin-dir /path/to/vibe-science
```

**Pros:** Simple, no configuration files to edit, works immediately.
**Cons:** You must pass the flag every time you launch Claude Code.

### Method 2: Global Settings (Permanent Install)

Add Vibe Science to your Claude Code settings so it loads automatically in every session.

**On Windows** — edit `%USERPROFILE%\.claude\settings.json`:
```json
{
  "plugins": ["C:\\path\\to\\vibe-science"]
}
```

**On macOS/Linux** — edit `~/.claude/settings.json`:
```json
{
  "plugins": ["/path/to/vibe-science"]
}
```

After saving, restart Claude Code. The plugin loads automatically.

> **Important:** Use the full absolute path to the `vibe-science` directory (the one containing `.claude-plugin/`).

### Method 3: Project-Level Settings (Per-Project)

Add to your project's `.claude/settings.json` to use Vibe Science only in a specific project:

```json
{
  "plugins": ["/path/to/vibe-science"]
}
```

This way, Vibe Science loads only when you open Claude Code in that project directory.

---

## Verify It's Working

After launching Claude Code with the plugin, you should see:

1. **Setup hook runs** — creates `~/.vibe-science/` directory, initializes the SQLite database
2. **SessionStart message** — injects research context (~700 tokens)
3. **The `/vibe` skill is available** — type `/vibe` to start a research session

If you don't see these, check the [Troubleshooting](#troubleshooting) section.

### Quick Test

Type this in Claude Code:

```
/vibe
```

If Vibe Science is loaded correctly, it will activate the research engine and guide you through setup.

---

## What Does It Do?

When Vibe Science is active, every Claude Code session becomes a structured research session:

```
You ask a research question
        ↓
Phase 0: BRAINSTORM — structured ideation, literature pre-check
        ↓
OTAE Loop (repeats):
  OBSERVE  → Read current state
  THINK    → Plan next action
  ACT      → Execute ONE action (search, analyze, compute)
  EVALUATE → Extract claims, score confidence, check gates
        ↓
Reviewer 2 — adversarial review (tries to DESTROY your claims)
        ↓
Only surviving claims advance
        ↓
Paper-ready output with verified claims
```

### What You'll Notice

- **Every claim gets a confidence score** (0-1) with a mathematical formula
- **Reviewer 2 is harsh** — it assumes every claim is wrong and demands evidence
- **Quality gates block progress** — you can't skip steps (34 gates total)
- **Files are created automatically** — STATE.md, PROGRESS.md, CLAIM-LEDGER.md
- **Serendipity is tracked** — unexpected findings get scored and preserved
- **Everything persists to SQLite** — cross-session memory, R2 calibration, audit trail

---

## Using Without Claude Code (Any LLM)

You can use the Vibe Science methodology with any LLM that accepts system prompts:

1. Upload `SKILL.md` as a system prompt or project knowledge file
2. Upload the `protocols/` directory for detailed procedure references
3. Upload `gates/gates.md` for quality gate definitions
4. Upload `assets/` for reference materials (fault taxonomy, rubrics)

> **Note:** Without the plugin, quality gates are prompt-enforced only (the LLM follows them voluntarily). The plugin adds code-level enforcement that makes violations structurally impossible.

---

## Troubleshooting

### "Plugin not found" or no startup message

**Cause:** Wrong path or directory structure.

**Fix:** Make sure you're pointing to the directory that contains `.claude-plugin/plugin.json`:
```bash
ls /path/to/vibe-science/.claude-plugin/plugin.json  # this file must exist
```

### `npm install` fails on Windows

**Cause:** `better-sqlite3` requires native compilation.

**Fix:**
```powershell
# Option A: Install build tools
npm install -g windows-build-tools

# Option B: Use pre-built binaries
npm install --build-from-source=false
```

### `npm install` fails on macOS

**Cause:** Missing Xcode command line tools.

**Fix:**
```bash
xcode-select --install
```

### Hooks don't fire (no gate enforcement)

**Cause:** Plugin not loaded as a plugin (just cloned without `--plugin-dir`).

**Fix:** Make sure you're using one of the [Installation Methods](#installation-methods) above. Simply cloning the repo is not enough — Claude Code must know it's a plugin.

### SQLite errors

**Cause:** Database corruption or permission issues.

**Fix:** Delete the database and let setup recreate it:
```bash
rm -rf ~/.vibe-science/db/
# Then restart Claude Code with the plugin
```

### Embedding worker fails

**Cause:** Missing ONNX runtime or out of memory.

**Impact:** Non-critical. Semantic search falls back to keyword-based search. Everything else works normally.

### "Permission denied" on hook scripts

**Cause:** Scripts not executable (Linux/macOS only).

**Fix:**
```bash
chmod +x plugin/scripts/*.js
```

---

## How It Works (Architecture Overview)

Vibe Science v6.0 has a **dual architecture**:

| Layer | What It Does | How |
|-------|-------------|-----|
| **Skill** (prompt-level) | Guides *what the agent thinks* | OTAE loop, R2 Ensemble, 10 Laws, 21 protocols |
| **Plugin** (code-level) | Controls *what the agent can do* | 5 hooks, gate engine, permissions, SQLite |

```
┌─────────────────────────────────────────────────────────────────┐
│  SKILL (prompt-level)           │  PLUGIN (code-level)          │
│  ─────────────────              │  ──────────────────           │
│  OTAE loop                      │  5 lifecycle hooks            │
│  R2 Ensemble (7 modes)          │  Gate Engine (34 gates)       │
│  10 Constitutional Laws         │  Permission Engine (6 roles)  │
│  21 protocols                   │  Research Spine (auto-log)    │
│  Evidence Engine                │  SQLite (11 tables)           │
│  Serendipity Engine             │  Silent Observer              │
│                                 │  R2 Auto-Calibration          │
│  Guides REASONING               │  Enforces BEHAVIOR            │
└─────────────────────────────────────────────────────────────────┘
```

<details>
<summary><b>Five Lifecycle Hooks</b></summary>

| Hook | When | What It Does |
|------|------|-------------|
| **Setup** | Plugin install | Creates `~/.vibe-science/`, initializes SQLite DB (11 tables), launches embedding worker |
| **SessionStart** | New conversation | Builds ~700-token context, loads R2 calibration, checks for pending serendipity seeds |
| **UserPromptSubmit** | Every user message | Identifies agent role, logs prompt hash (SHA-256, privacy-safe) |
| **PostToolUse** | Every tool action | Gate enforcement (exit code 2 = BLOCK), permission check, auto-log to Research Spine, Silent Observer |
| **Stop** | Session end | Narrative summary, enforcement check (blocks if unreviewed claims exist) |

</details>

<details>
<summary><b>Plugin Subsystems</b></summary>

| Subsystem | Purpose |
|-----------|---------|
| **Gate Engine** | Enforces 34 quality gates. DQ4 auto-verifies numbers match source. Exit code 2 = BLOCK. |
| **Permission Engine** | 6 roles (researcher, reviewer2, judge, serendipity, lead, experimenter) with file-level access control |
| **Research Spine** | Automatic structured logging of every action with timestamps, inputs, outputs, gate status |
| **Context Builder** | Progressive disclosure in ~700 tokens: STATE.md summary + semantic recall + R2 hints |
| **Silent Observer** | Periodic integrity checks: stale STATE.md, number mismatches, orphaned datasets, design drift |
| **R2 Auto-Calibration** | Cross-session learning: tracks R2 weakness patterns, SFI miss categories, researcher errors |
| **Narrative Engine** | Deterministic session summaries (no LLM, template-based) |
| **Vector Search** | Semantic search via all-MiniLM-L6-v2 embeddings (384-dim), falls back to keyword search |

</details>

<details>
<summary><b>SQLite Persistence (11 Tables)</b></summary>

```
sessions              ← session lifecycle (start, end, stats)
spine_entries         ← Research Spine (every significant action)
claim_events          ← claim lifecycle (create → review → promote/kill)
r2_reviews            ← R2 review results + weakness patterns
serendipity_seeds     ← cross-session seed survival
gate_checks           ← every gate pass/fail with details
literature_searches   ← L-1+ audit trail
observer_alerts       ← Silent Observer findings
calibration_log       ← R2 calibration data
prompt_log            ← SHA-256 hashes only (privacy-safe)
embed_queue           ← async vector embedding queue
```

</details>

---

## The Problem Vibe Science Solves

AI agents are dangerous in science. Not because they hallucinate — that's the easy problem.

The dangerous problem is that they find **real patterns** in **real data** and construct **plausible narratives** around them, without ever asking: *"What if this is an artifact?"*

| What the agent does | What actually happened (21 sprints, CRISPR) |
|---|---|
| Optimizes for completion, not truth | OR = 2.30 → **reversed sign** under propensity matching |
| Gets excited by strong signals (p < 10⁻¹⁰⁰!) | "Bidirectional effects" → **biologically impossible** |
| Constructs narratives around artifacts | "Regime switch" → Cohen's d = **0.07** (noise) |
| Never searches for what kills its own claims | "Generalizable rankings" → **don't generalize** between assays |
| Declares "done" after 1 sprint | None of these were hallucinations. The data was real. |

**The solution:** embed a "Reviewer 2" whose ONLY job is to destroy claims. Only what survives both builder and destroyer gets published.

```
Builder (Researcher)              Destroyer (Reviewer 2)
───────────────────               ─────────────────────
Optimizes for: Completion         Optimizes for: Survival
Default: "This looks promising"   Default: "This is probably an artifact"
Strong signal → narrative         Strong signal → confounders → controls
Says "done": When results look    Says "done": When ALL counter-verifications
              good                              pass
```

---

## Key Concepts

<details>
<summary><b>OTAE Loop — The Research Cycle</b></summary>

Every research session runs in a structured loop:

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

Each cycle executes exactly one action, evaluates the result, and persists state to files before looping.

</details>

<details>
<summary><b>Reviewer 2 Ensemble — Adversarial Review</b></summary>

Not a gate you pass — a co-pilot you can't fire. 4 specialist reviewers run a double-pass workflow:

1. **Fatal Hunt** (purely destructive): find what's broken
2. **Method Repair** (constructive): propose what would fix it

**4 Domains:** Methods, Statistics, Biology, Engineering

**7 Activation Modes:**

| Mode | Trigger | Purpose |
|------|---------|---------|
| INLINE | Every finding | Lightweight 7-point checklist |
| FORCED | Every 20 cycles | Mandatory full review |
| BATCH | Multiple claims | Group review |
| SHADOW | Continuous | Background monitoring |
| BRAINSTORM | Phase 0 | Review ideation quality |
| VETO | R2-initiated | Emergency stop |
| REDIRECT | R2-initiated | Force direction change |

**Severity scoring (0-100):**

| Range | Level | Action |
|-------|-------|--------|
| 0-29 | MINOR | Note, continue |
| 30-59 | MAJOR | Must address before next cycle |
| 60-79 | SEVERE | Must fix + re-submit to R2 |
| 80-100 | FATAL | REJECT — no re-submission without new evidence |

</details>

<details>
<summary><b>10 Constitutional Laws</b></summary>

These laws apply to ALL agents, ALL modes. No agent, protocol, or user request can override them.

| # | Law | Rule |
|---|-----|------|
| 1 | DATA-FIRST | No thesis without evidence from data |
| 2 | EVIDENCE DISCIPLINE | Every claim: claim_id + evidence chain + confidence + status |
| 3 | GATES BLOCK | Quality gates are hard stops, not suggestions |
| 4 | R2 ALWAYS-ON | Every milestone passes adversarial review |
| 5 | SERENDIPITY PRESERVED | Unexpected discoveries are features, not distractions |
| 6 | ARTIFACTS OVER PROSE | If it can produce a file, it MUST |
| 7 | FRESH CONTEXT RESILIENCE | Resumable from STATE.md alone |
| 8 | EXPLORE BEFORE EXPLOIT | Minimum 3 draft nodes before any is promoted |
| 9 | CONFOUNDER HARNESS | Raw → Conditioned → Matched. Sign change = ARTIFACT. |
| 10 | CRYSTALLIZE OR LOSE | Not in a file = doesn't exist |

</details>

<details>
<summary><b>34 Quality Gates</b></summary>

Every gate is a hard stop. Fix first, re-gate, then continue.

| Category | Gates | What They Check |
|----------|-------|----------------|
| **Pipeline** | G0-G6 | Input sanity, schema, design, training, metrics, artifacts, VLM |
| **Literature** | L-1, L0-L2 | Pre-check, DOI validity, coverage (≥3 sources), review complete |
| **Decision** | D0-D2 | Decision justified, claim promotion, RQ conclusion |
| **Tree** | T0-T3 | Node validity, debug limit (3), branch diversity, tree health (≥20%) |
| **Data Quality** | DQ1-DQ4 | Post-extraction, post-training, post-calibration, post-finding |
| **Data & Design** | DD0, DC0 | Data dictionary, design compliance |
| **Verification** | V0, J0 | R2 vigilance (SFI), judge assessment (R3) |
| **Brainstorm & Stage** | B0, S1-S5 | Brainstorm quality, stage gates |

</details>

<details>
<summary><b>Evidence Engine</b></summary>

Every claim is quantified, not felt:

```
confidence = E×0.30 + R×0.25 + C×0.20 + K×0.15 + D×0.10

HARD VETO: E < 0.05 or D < 0.05 → confidence = ZERO
FLOOR:     E < 0.2 → capped at 0.20
```

**4 typed claims** with escalating evidence standards:
- `descriptive` — what the data shows
- `correlative` — what variables relate
- `causal` — what causes what (requires confounder harness)
- `predictive` — what will happen (requires out-of-sample validation)

</details>

<details>
<summary><b>Serendipity Engine</b></summary>

Active scanner, not passive logger. Quantitative triage (0-20 score):

| Score | Action |
|-------|--------|
| >= 15 | INTERRUPT — immediate attention |
| >= 10 | QUEUE — next available cycle |
| >= 4 | FILE — track for patterns |
| < 4 | NOISE — discard |

Cross-branch pattern detection finds connections invisible in linear exploration. Killed claims with potential become serendipity seeds (Salvagente Rule).

</details>

<details>
<summary><b>Verification Mechanisms (v5.0)</b></summary>

Four structural innovations that make adversarial review architecturally unbypassable:

| Innovation | What It Does |
|-----------|-------------|
| **Seeded Fault Injection (SFI)** | Inject known errors before R2 reviews. If R2 misses them → review INVALID. Mutation testing for scientific claims. |
| **Blind-First Pass (BFP)** | R2 reviews claims without seeing justifications first. Breaks anchoring bias. |
| **Judge Agent (R3)** | Meta-reviewer scores R2's review on 6 dimensions. Reviews the review, not the claims. |
| **Schema-Validated Gates** | 8 gates enforce JSON Schema. Prose claims of completion are ignored. |

Plus: Circuit Breaker (deadlock → DISPUTED), Agent Permission Model (separation of powers), R2 Salvagente (killed claims must produce serendipity seeds).

</details>

---

## Repository Structure

```
vibe-science/
├── README.md                    ← You are here
├── ARCHITECTURE.md              ← Deep technical details, version history
├── SKILL.md                     ← v5.5 ORO methodology (~1,300 lines)
├── CLAUDE.md                    ← Constitution + agent instructions
├── CHANGELOG.md                 ← Version history (v3.5 → v6.0)
├── CITATION.cff                 ← GitHub citation metadata (DOI)
├── LICENSE                      ← Apache 2.0
├── NOTICE                       ← Academic citation requirement
├── package.json                 ← Node.js dependencies
│
├── .claude-plugin/
│   └── plugin.json              ← Plugin manifest
│
├── plugin/                      ← v6.0 enforcement engine (~6,600 LOC)
│   ├── hooks/hooks.json         ← 5 lifecycle hook declarations
│   ├── scripts/                 ← Hook implementations
│   ├── lib/                     ← Engine modules (gate, permission, etc.)
│   └── db/                      ← Schema, literature registry, config
│
├── protocols/                   ← 21 methodology protocols
├── gates/                       ← 34 quality gate specifications
├── schemas/                     ← 9 JSON validation schemas
├── assets/                      ← Fault taxonomy, rubrics, templates
├── commands/                    ← start.md entry point
├── examples/                    ← Walkthrough
├── blueprints/                  ← Architecture documents
├── logos/                       ← Version-specific SVG logos
└── archive/                     ← Historical versions (v3.5 → v5.5)
```

---

## Version History

| Version | Codename | Key Innovation | Gates |
|---------|----------|----------------|:-----:|
| **v6.0** | NEXUS | Plugin enforcement, SQLite persistence, 5 lifecycle hooks | 34+ |
| **v5.5** | ORO | 7 new data quality gates, R2 INLINE mode, post-mortem driven | 34 |
| **v5.0** | IUDEX | SFI, blind-first pass, R3 judge, schema-validated gates | 27 |
| **v4.5** | ARBOR VITAE (Pruned) | Phase 0 brainstorm, R2 6 modes | 25 |
| **v4.0** | ARBOR VITAE | Tree search over hypotheses | 26 |
| **v3.5** | TERTIUM DATUR | Foundation: OTAE loop, R2 double-pass, field-tested (21 sprints) | 12 |

Each version is self-contained in `archive/` and independently installable. See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed version-by-version breakdown.

**Specialized forks:**
- **Photonics** — v5.5 fork for photonics research with R2-Physics and Human Expert Gates
- **Codex** — v5.0 port for OpenAI Codex (condensed SKILL.md)

---

## Academic Foundations

Vibe Science's architecture is grounded in peer-reviewed research:

<details>
<summary><b>Core Papers</b></summary>

| Paper | Key Finding | Vibe Science Response |
|-------|------------|---------------|
| **Huang et al.** (ICLR 2024) — "LLMs Cannot Self-Correct Reasoning Yet" | Intrinsic self-correction ineffective; 74.7% retain initial answer | Foundation for the entire architecture. R2 must be structurally separated. |
| **Gou et al.** (ICLR 2024) — "CRITIC" | Self-correction works ONLY with external tool feedback | Validates R2's mandatory tool-use (PubMed, Scopus, web search). |
| **Du et al.** (ICML 2024) — "Multiagent Debate" | Multiple agents debating reduces factual errors by 30%+ | Direct validation of the R2 multi-reviewer architecture. |
| **Kamoi et al.** (TACL 2024) | No prior work demonstrates successful self-correction from prompts alone | Motivates architectural triad (SFI + BFP + R3). |
| **Jia & Harman** (IEEE TSE 2011) — "Mutation Testing" | 10% random sampling ~84% as effective as exhaustive | Justifies 1-3 faults per FORCED review in SFI. |
| **Krlev & Spicer** (JMS 2023) — "Reining in Reviewer Two" | Epistemic respect = assess on soundness, not origin | R2's calibration: destructive but rigorous. |

</details>

<details>
<summary><b>Concurrent Work</b></summary>

| System | Comparison |
|--------|-----------|
| **DeepMind Aletheia** (2026) | Generator-Verifier-Reviser = architecturally isomorphic to Researcher-R2-Researcher loop |
| **DeepMind Deep Think** (2026) | Inference-time compute scaling. Complementary: Deep Think catches reasoning errors, Vibe Science catches empirical errors. |
| **Kumar et al. SCoRe** (ICLR 2025) | RL enables genuine self-correction (+15.6% MATH). SFI + R3 are the agent-level analog. |

**Complementary, not competing.** Deep Think catches what pure reasoning can catch. Vibe Science catches what only external empirical verification can catch.

</details>

---

## Design Philosophy

Vibe Science fuses two complementary approaches:

| Agentic Research Loops | Scientific Toolkits |
|---|---|
| *(Ralph, GSD, BMAD, AI-Scientist-v2)* | *(Anthropic bio-research, Claude Scientific Skills, MCP)* |
| Excellent as **systems**: loop, state, tree search | Excellent as **tools**: CLI scripts, database APIs, pipelines |
| Missing: executability, adversarial review | Missing: loop, persistence, adversarial review |

**Vibe Science = Loop + Tool + Adversarial Co-pilot.**

<details>
<summary><b>Lineage</b></summary>

| Ancestor | Pattern Taken |
|----------|--------------|
| **Ralph Wiggum** | Bounded iterative loop (warn@15, forced-R2@20, alert@30) |
| **GSD** | File-based state persistence (STATE.md, PROGRESS.md) |
| **BMAD** | Multi-agent ensemble pattern |
| **OpenAI Codex loop** | OTAE cycle structure, single action per cycle |
| **Anthropic bio-research** | CLI scripts, MCP endpoints, executability |
| **Superpowers** | Dispatch/routing architecture |
| **AI-Scientist-v2** | Tree search architecture, 4-stage manager |

</details>

---

## Citation

If you use Vibe Science in your research, please cite:

> Vibe Science Contributors (2026). *Vibe Science: an AI-native research engine with adversarial review and serendipity tracking.* GitHub: [th3vib3coder/vibe-science](https://github.com/th3vib3coder/vibe-science) · DOI: [10.5281/zenodo.18665031](https://doi.org/10.5281/zenodo.18665031)

```bibtex
@software{vibe_science_2026,
  title     = {Vibe Science: AI-native research with adversarial review and serendipity tracking},
  author    = {{Vibe Science Contributors}},
  year      = {2026},
  version   = {6.0.0},
  url       = {https://github.com/th3vib3coder/vibe-science},
  doi       = {10.5281/zenodo.18665031},
  license   = {Apache-2.0}
}
```

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

© 2026 Vibe Science Contributors

## Authors

**Carmine Russo, Elisa Bertelli (MD)**

---

*Built with Claude Code · Powered by Claude Opus · Made with adversarial love*
