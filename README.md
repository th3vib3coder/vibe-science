<p align="center">
  <img src="logos/logo-v5.0.svg" alt="Vibe Science" width="700">
</p>

# Vibe Science

> An AI-native research engine that loops until discovery — with adversarial review, quality gates, and serendipity tracking.

Vibe Science turns an LLM into a disciplined research agent. It provides a structured methodology (OTAE loop), an adversarial review system (Reviewer 2 Ensemble), typed evidence tracking, and quality gates — while preserving room for unexpected discoveries.

This repository tracks the evolution of Vibe Science across four major releases, from the original OTAE loop to a fully fault-injected verification framework. Each version is self-contained and independently installable.

---

## Version Evolution

| Version | Codename | Architecture | Key Innovation |
|---------|----------|-------------|----------------|
| [**v3.5**](vibe-science-v3.5/) | TERTIUM DATUR | OTAE Loop | R2 double-pass, typed claims, evidence formula |
| [**v4.0**](vibe-science-v4.0/) | ARBOR SCIENTIAE | OTAE-Tree | Tree search, branch scoring, serendipity branches |
| [**v4.5**](vibe-science-v4.5/) | COLLIGITE FRAGMENTA | OTAE-Tree + Brainstorm | Phase 0 brainstorm engine, R2 6 modes, 5-stage pipeline |
| [**v5.0**](vibe-science-v5.0/) | IUDEX | OTAE-Tree + Verification | SFI, blind-first pass, R3 judge agent, schema-validated gates |

<p align="center">
  <img src="logos/logo-v3.5.svg" alt="v3.5" width="340">
  <img src="logos/logo-v4.0.svg" alt="v4.0" width="340">
</p>
<p align="center">
  <img src="logos/logo-v4.5.svg" alt="v4.5" width="340">
  <img src="logos/logo-v5.0.svg" alt="v5.0" width="340">
</p>

---

## What Each Version Adds

### v3.5 — TERTIUM DATUR

The foundation. Introduces the OTAE (Observe-Think-Act-Evaluate) research loop with:

- **7 Constitutional Laws** governing all behavior (data-first, gates block, R2 always-on)
- **Reviewer 2 Ensemble**: 4 specialist reviewers (Methods, Stats, Bio, Engineering) with double-pass workflow
- **Typed claims**: descriptive / correlative / causal / predictive with scaled evidence standards
- **Confidence formula**: E·R·C·K·D → 0-1 computed score
- **11 quality gates**: G0-G5 (pipeline), L0-L2 (literature), D0-D2 (data)
- **Serendipity engine**: scheduled sprints + quantitative triage
- **State persistence**: resumable from STATE.md across sessions

### v4.0 — ARBOR SCIENTIAE

Evolves the linear loop into a search tree:

- **OTAE-Tree**: hypothesis branches scored and pruned dynamically
- **Tree search protocol**: branch, score, prune, backtrack
- **Serendipity branches**: unexpected findings become first-class tree nodes
- **R2 Ensemble enhanced**: branch-level review, tree-wide consistency checks
- **Knowledge base**: cross-RQ accumulated patterns

### v4.5 — COLLIGITE FRAGMENTA

Adds structured ideation and a 5-stage research pipeline:

- **Phase 0 Brainstorm Engine**: systematic ideation before the OTAE loop begins
- **R2 expanded to 6 modes**: standard, deep, comparative, meta, adversarial, constructive
- **5-stage pipeline**: Discovery → Analysis → Validation → Synthesis → Publication
- **Schema validation** for brainstorm quality
- **Auto-experiment protocol** for computational hypothesis testing

### v5.0 — IUDEX

The verification release. Every finding is tested before it's trusted:

- **10 Constitutional Laws** (3 new: Blind Before Belief, Falsify First, Schema Enforces)
- **Seeded Fault Injection (SFI)**: deliberately corrupted inputs test pipeline resilience
- **Blind-First Pass (BFP)**: initial review without seeing the hypothesis
- **R3 Judge Agent**: independent arbiter when R2 reviewers disagree
- **Schema-Validated Gates (SVG)**: 8 of 27 gates enforced by JSON Schema
- **Circuit breaker**: automatic research halt on critical failures
- **VLM Gate**: vision-language model verification for figures
- **Serendipity Salvagente**: rescued findings from rejected analyses

---

## Repository Structure

```
vibe-science/
├── README.md                   ← You are here
├── CHANGELOG.md                ← Version history
├── logos/                      ← Version-specific SVG logos
│   ├── logo-v3.5.svg
│   ├── logo-v4.0.svg
│   ├── logo-v4.5.svg
│   └── logo-v5.0.svg
│
├── vibe-science-v3.5/          ← Claude Code skill (v3.5)
│   ├── SKILL.md
│   ├── protocols/
│   ├── gates/
│   └── assets/
│
├── vibe-science-v4.0/          ← Claude Code skill (v4.0)
│   ├── SKILL.md
│   ├── CLAUDE.md
│   ├── protocols/
│   ├── gates/
│   └── assets/
│
├── vibe-science-v4.5/          ← Claude Code skill (v4.5)
│   ├── SKILL.md
│   ├── CLAUDE.md
│   ├── protocols/
│   ├── gates/
│   └── assets/
│
└── vibe-science-v5.0/          ← Claude Code skill (v5.0 IUDEX)
    ├── SKILL.md
    ├── CLAUDE.md
    ├── protocols/
    ├── gates/
    ├── schemas/
    └── assets/
```

The **OpenAI Codex** version of v5.0 is maintained on the [`codex`](../../tree/codex) branch.

---

## Installation

### Claude Code

```bash
git clone https://github.com/carminoski/vibe-science.git

# Install the version you want:
claude plugins add ./vibe-science/vibe-science-v5.0    # latest
claude plugins add ./vibe-science/vibe-science-v3.5    # stable, paper version
```

### OpenAI Codex

Switch to the `codex` branch:

```bash
git checkout codex
# Follow instructions in that branch's README.md
```

### Manual (any LLM interface)

Upload the `SKILL.md` of your chosen version as a system prompt or project knowledge file. Upload `protocols/`, `gates/`, and `assets/` directories for on-demand reference loading.

---

## Design Philosophy

Vibe Science was built by combining two approaches:

- **Toolkit approach** (Anthropic bio-research plugin): excellent tools, but no research loop, no persistence, no adversarial review
- **Agentic loop approach** (OpenAI Codex, Ralph, GSD, BMAD): excellent systems, but lacking executability and scientific rigor

Vibe Science fuses both: a systematic research loop that dispatches to executable tools, tracks evidence with mathematical rigor, and subjects every finding to adversarial review.

> *"A research system that doesn't execute is a wish.*
> *A toolkit that doesn't iterate is a toolbox.*
> *You need both: loop + tool."*

---

## For the Paper

This repository documents the evolution of Vibe Science for the **VibeX 2026** publication. Each version directory is a complete, standalone snapshot:

- **v3.5** is the version described in the paper
- **v4.0 → v4.5 → v5.0** show the progression of ideas
- Commit history provides traceable evolution

---

## Citation & Attribution

If you use Vibe Science in your research and it contributes to published results, please cite:

> Carmine Russo & Claudio Bertelli, *Vibe Science: an AI-native research engine with adversarial review and serendipity tracking*, 2026. Available at: https://github.com/carminoski/vibe-science

---

Se utilizzi Vibe Science nella tua ricerca e questa contribuisce a risultati pubblicati, ti chiediamo di citare:

> Carmine Russo & Claudio Bertelli, *Vibe Science: un motore di ricerca AI-nativo con revisione avversariale e tracciamento della serendipità*, 2026. Disponibile su: https://github.com/carminoski/vibe-science

---

## License

MIT — see [LICENSE](vibe-science-v5.0/LICENSE).

## Authors

**Carmine Russo** (carminoski) · **Claudio Bertelli**
