<p align="center">
  <img src="assets/logo.svg" alt="Vibe Science v5.0 IUDEX" width="700">
</p>

# Vibe Science v5.0 — IUDEX

> **Codename**: IUDEX (Latin: *the judge*)
> **Lineage**: v3.5 TERTIUM DATUR → v4.0 ARBOR VITAE → v4.5 ARBOR VITAE (Pruned) → **v5.0 IUDEX**
> **Format**: OpenAI Codex Skill
> **License**: Apache 2.0
>

An agentic scientific research engine that makes adversarial review **architecturally unbypassable**. Tree search over hypotheses, serendipity detection at every cycle, and 27 quality gates that block advancement until standards are met.

---

## The Problem: AI Agents Optimize for Completion, Not Truth

AI agents given research tasks will find patterns, construct narratives, and declare results — as fast as possible. They do not spontaneously search for confounders, prior art, or contradictions. This is not theoretical. Over 21 sprints of CRISPR-Cas9 off-target research:

- The agent would have published a checkpoint signal (OR = 2.30, p < 10⁻¹⁰⁰). **Propensity matching reversed the sign** — it was completely confounded.
- The agent would have published "bidirectional positional effects." **Biologically impossible** — all mismatches reduce cleavage.
- The agent would have published a "regime switch" finding. **Cohen's d = 0.07** — noise.

None of these were hallucinations. The data was real, the statistics correct, the narratives plausible. The agent simply never asked: *"What if this is an artifact?"*

Peer-reviewed research confirms this is a fundamental limitation: **LLMs cannot self-correct reasoning without external feedback** (Huang et al., ICLR 2024). Self-correction works only with external tool feedback (Gou et al., ICLR 2024). No demonstration of successful self-correction from prompted LLMs alone exists (Kamoi et al., TACL 2024).

## The Solution: Reviewer 2 as Disposition, Not Gate

Vibe Science embeds an adversarial co-pilot — **Reviewer 2** — whose only job is to destroy claims. R2 is not a quality gate you pass; it is a permanent co-pilot you cannot fire.

| | Researcher (Builder) | Reviewer 2 (Destroyer) |
|---|---|---|
| **Optimizes for** | Completion — shipping results | Survival — claims that withstand hostile review |
| **Default assumption** | "This looks promising" | "This is probably an artifact" |
| **Reaction to strong signal** | Excitement → narrative → paper | Suspicion → confounders → controls |
| **Searches for** | Supporting evidence | Prior art, contradictions, known artifacts |

This asymmetry mirrors Kahneman's adversarial collaboration (Kahneman, 2003), builder-breaker practices in security engineering, and the observed behavior of effective peer reviewers (Krlev & Spicer, 2023).

**Result**: Of 34 claims registered across 21 sprints, 11 were killed or downgraded. The most dangerous claim (OR = 2.30) was caught in one sprint. Four validated findings survived 21 sprints of active demolition.

---

## Architecture

### OTAE-Tree Loop

Every research cycle follows the OTAE discipline:

```
OBSERVE → THINK → ACT → EVALUATE → CHECKPOINT → CRYSTALLIZE → loop
```

Cycles are organized as a **tree search over hypotheses** — not a linear pipeline. Each tree node is a full OTAE cycle. The tree enables parallel exploration of competing hypotheses, with backtracking and pruning when branches fail.

Three tree modes: **LINEAR** (literature reviews), **BRANCHING** (experiments), **HYBRID** (both).

### R2 Ensemble

Four domain-specific adversarial reviewers operate in concert:

- **R2-Methods** — experimental design, controls, baselines
- **R2-Stats** — statistical validity, multiple testing, effect sizes
- **R2-Bio** — biological plausibility, known artifacts, prior art
- **R2-Eng** — reproducibility, code quality, data integrity

Six activation modes: BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT. R2 runs adversarial review at every milestone, shadows every 3 cycles, and its demands are non-negotiable.

### 27 Quality Gates

Hard stops that block advancement. 8 are schema-enforced via JSON Schema — prose claims of completion are ignored.

| Category | Gates | Schema-Enforced |
|----------|-------|-----------------|
| Pipeline | G0–G6 (7) | — |
| Literature | L0–L2 (3) | L0, L2 |
| Decision | D0–D2 (3) | D1, D2 |
| Tree | T0–T3 (4) | — |
| Brainstorm | B0 (1) | B0 |
| Stage | S1–S5 (5) | S4, S5 |
| Vigilance | V0 (1) | V0 |
| Judge | J0 (1) | — (rubric-based) |

### 10 Constitutional Laws

Immutable rules governing all agent behavior:

1. **DATA-FIRST** — No thesis without evidence. `NO DATA = NO GO.`
2. **EVIDENCE DISCIPLINE** — Every claim has a `claim_id`, evidence chain, computed confidence.
3. **GATES BLOCK** — Quality gates are hard stops, not suggestions.
4. **REVIEWER 2 IS CO-PILOT** — R2 can VETO any finding, REDIRECT any branch, FORCE re-investigation.
5. **SERENDIPITY IS THE MISSION** — Actively hunt for the unexpected at every cycle.
6. **ARTIFACTS OVER PROSE** — If it can be a file, it must be a file.
7. **FRESH CONTEXT RESILIENCE** — Resumable from `STATE.md` + `TREE-STATE.json` alone.
8. **EXPLORE BEFORE EXPLOIT** — Exploration ratio >= 20% at T3.
9. **CONFOUNDER HARNESS** — Raw → conditioned → matched for every quantitative claim.
10. **CRYSTALLIZE OR LOSE** — `IF IT'S NOT IN A FILE, IT DOESN'T EXIST.`

### 5-Stage Experiment Manager

| Stage | Name | Goal |
|-------|------|------|
| 1 | Preliminary Investigation | First working experiment or literature scan |
| 2 | Hyperparameter Tuning | Optimize parameters of best approach |
| 3 | Research Agenda | Explore creative variants, sub-questions |
| 4 | Ablation & Validation | Validate components + multi-seed robustness |
| 5 | Synthesis & Review | Final R2 ensemble + conclusion + reporting |

### Serendipity Engine

Serendipity is not a side-effect — it is the primary engine of discovery (Swanson, 1986). The Serendipity Radar runs at every EVALUATE phase with a 5-scan protocol: anomalies, cross-branch patterns, contradictions, assumption drift, unexpected metrics. Score >= 15 triggers an INTERRUPT.

### Phase 0: Scientific Brainstorm

Mandatory before any OTAE cycle. Eight steps: UNDERSTAND → LANDSCAPE → GAPS (blue ocean hunting, inversion, collision-zone) → DATA audit → HYPOTHESES → TRIAGE → R2 REVIEW → COMMIT. Gate B0 must pass.

---

## v5.0 IUDEX — What's New

v5.0 addresses the empirical finding that prompted self-correction is ineffective (Huang et al., 2024) by making adversarial review **structurally unbypassable**. Four innovations and six enhancements:

### Innovations

**1. Seeded Fault Injection (SFI)** — Before FORCED R2 reviews, the orchestrator injects 1–3 known faults from an 8-category taxonomy (confounded claims, known findings, biological impossibilities, noise-as-signal, non-generalizable results, citation fabrication, statistical artifacts, missing controls). If R2 misses them, the review is invalid. Inspired by mutation testing theory (Jia & Harman, 2011; Papadakis et al., 2019; Kaufman & Just, 2022). Gate V0: RMS >= 0.80, FAR <= 0.10.

**2. Judge Agent (R3)** — A third agent meta-reviews R2's review quality on a 6-dimension rubric: specificity, counter-evidence search, confounder analysis, falsification demand, independence, escalation. Each scored 0–3, total >= 12 to pass. Anti-gaming: brevity is not penalized; specificity is rewarded (PMC, 2024). Gate J0: total >= 12/18, no dimension = 0.

**3. Blind-First Pass (BFP)** — For FORCED reviews, R2 receives claims without the researcher's justifications first, must form independent assessments, then receives full context. Discrepancies between phases reveal anchoring bias. Enhanced with CoVe verification questions (Dhuliawala et al., 2023) and self-consistency N=3 (Wang et al., 2022).

**4. Schema-Validated Gate Artifacts (SVG)** — 8 critical gates enforce structure via JSON Schema. The artifact must validate; prose claims of completion are ignored. Catches "hallucinated compliance" (claiming work was done without structured output).

### Enhancements

- **A. R2 Salvagente** — Killed claims (INSUFFICIENT/CONFOUNDED/PREMATURE) must produce a serendipity seed. Every killed claim may contain the germ of discovery.
- **B. Structured Serendipity Seed Schema** — Seeds are actionable research objects (causal question, falsifiers, discriminating test, expected value), not free-text notes.
- **C. Quantified Exploration Budget** — LAW 8 gains a measurable 20% floor (exploration_ratio at T3).
- **D. Confidence Formula Revision** — `E × D × (R_eff × C_eff × K_eff)^(1/3)` with hard veto (E or D < 0.05 → 0) and dynamic floor by claim type/stage. Separates "unknown" from "contradicted" (Sentz & Ferson, 2002).
- **E. Circuit Breaker** — Same R2 objection × 3 rounds × no state change → DISPUTED. Frozen, not killed. S5 Poison Pill prevents closing with unresolved disputes.
- **F. Agent Permission Model** — Separation of verdict from execution. R2 writes verdicts; orchestrator writes ledger. Schemas are read-only for all agents.

### v5.0 FORCED Review Path

```
SFI injection → BFP Phase 1 (blind) → Full review Phase 2 → V0 (vigilance) → R3/J0 (judge) → Schema validation → Gate evaluation
```

---

## Relationship to Concurrent Work

Vibe Science was developed independently and concurrently with DeepMind's inference-time scaling research. The architectures are complementary:

| | DeepMind (Deep Think / Aletheia) | Vibe Science |
|---|---|---|
| **Level** | Inference-time (within model) | Agent-time (separate agents) |
| **Verifier** | Process Reward Model (trained) | R2 Ensemble (prompted + tool-grounded) |
| **Scaling axis** | More compute = more hypotheses | More OTAE cycles = more tree nodes |
| **Verification type** | Logical (reasoning-based) | Empirical (PubMed, Scopus, web search) |
| **Structural enforcement** | PRM weights (non-bypassable) | JSON Schema gates + SFI + R3 |
| **Cost** | Proprietary | Open source (Apache 2.0, any LLM) |
| **Catches** | Logical flaws in reasoning chains | Confounded claims, known artifacts, citation errors |

Deep Think catches what pure reasoning can catch. Vibe Science catches what only external empirical verification can catch. The ideal system uses both.

---

## Installation

### Per-repository

```bash
cp -r vibe-science-v5.0-codex/ $REPO_ROOT/.agents/skills/vibe-science/
```

### Per-user (all repositories)

```bash
cp -r vibe-science-v5.0-codex/ $HOME/.agents/skills/vibe-science/
```

## Usage

Codex will auto-detect and invoke this skill when your task matches scientific research patterns. You can also invoke explicitly:

```
$vibe-science
```

## File Structure

```
vibe-science-v5.0-codex/
├── SKILL.md                    Main specification (~480 lines)
├── README.md                   This file
├── LICENSE                     Apache 2.0
├── agents/
│   └── openai.yaml             Codex agent manifest
├── references/                 23 protocol files (loaded on demand)
│   ├── constitution.md         Full 10 Laws + role constraints + permission model
│   ├── brainstorm-engine.md    Phase 0: 8-step scientific brainstorm
│   ├── loop-otae.md            OTAE-Tree loop protocol
│   ├── tree-search.md          Tree search over hypotheses
│   ├── experiment-manager.md   5-Stage Experiment Manager
│   ├── reviewer2-ensemble.md   R2 Ensemble (4 reviewers, 6 modes)
│   ├── evidence-engine.md      Confidence formula + evidence chains
│   ├── serendipity-engine.md   Serendipity detection + Salvagente
│   ├── seeded-fault-injection.md   SFI protocol (v5.0)
│   ├── judge-agent.md          R3 Judge Agent (v5.0)
│   ├── blind-first-pass.md     BFP protocol (v5.0)
│   ├── schema-validation.md    SVG protocol (v5.0)
│   ├── circuit-breaker.md      Deadlock prevention (v5.0)
│   ├── gates.md                All 27 gate definitions
│   ├── search-protocol.md      Literature search strategies
│   ├── analysis-orchestrator.md    Tool dispatch + skill routing
│   ├── auto-experiment.md      Automated experiment execution
│   ├── data-extraction.md      Data extraction protocols
│   ├── knowledge-base.md       Cross-RQ knowledge accumulation
│   ├── writeup-engine.md       Paper drafting (Stage 5)
│   ├── vlm-gate.md             Visual Language Model gate (G6)
│   ├── audit-reproducibility.md    Reproducibility protocols
│   └── walkthrough-literature-review.md    Example walkthrough
├── assets/
│   ├── fault-taxonomy.yaml     8-category SFI fault definitions
│   ├── judge-rubric.yaml       R3 6-dimension scoring rubric
│   ├── templates.md            State/progress/claim templates
│   ├── skill-router.md         Tool dispatch routing
│   ├── stage-prompts.md        Stage-specific node prompts
│   ├── metric-parser.md        Metric extraction patterns
│   ├── node-schema.md          Tree node YAML schema
│   ├── obs-normalizer.md       scRNA-seq obs normalization
│   └── schemas/                JSON Schema enforcement (v5.0)
│       ├── brainstorm-quality.schema.json
│       ├── claim-promotion.schema.json
│       ├── review-completeness.schema.json
│       ├── rq-conclusion.schema.json
│       ├── serendipity-seed.schema.json
│       ├── source-validity.schema.json
│       ├── stage4-exit.schema.json
│       ├── stage5-exit.schema.json
│       └── vigilance-check.schema.json
└── .gitignore
```

## Origin

This is the OpenAI Codex adaptation of [Vibe Science v5.0 IUDEX](https://github.com/th3vib3coder/vibe-science), originally developed as a Claude Code skill. The architecture, constitutional laws, and all protocols are preserved; platform-specific elements (hooks, multi-agent dispatch, plugin manifest) have been adapted to the Codex skill format.

---

## Academic Foundations

Vibe Science's architectural decisions are grounded in peer-reviewed research. The references below are organized by the design decision they inform.

### Core: LLM Self-Correction Limitations

These papers establish the fundamental problem Vibe Science solves — LLMs cannot reliably self-correct without structural external feedback.

1. Huang, J., Chen, X., Mishra, S., Zheng, H.S., Yu, A.W., Song, X., & Zhou, D. (2024). "Large Language Models Cannot Self-Correct Reasoning Yet." *ICLR 2024*. arXiv:2310.01798.

2. Gou, Z., Shao, Z., Gong, Y., Shen, Y., Yang, Y., Duan, N., & Chen, W. (2023). "CRITIC: Large Language Models Can Self-Correct with Tool-Interactive Critiquing." *ICLR 2024*. arXiv:2305.11738.

3. Kamoi, R., Zhang, Y., et al. (2024). "When Can LLMs Actually Correct Their Own Mistakes? A Critical Survey of Self-Correction of LLMs." *TACL 2024*. arXiv:2406.01297.

### Peer Review as Architectural Model

These papers inform R2's calibration and R3's anti-gaming design.

4. Krlev, G. & Spicer, A. (2023). "Reining in Reviewer Two: How to Uphold Epistemic Respect in Academia." *Journal of Management Studies*. DOI:10.1111/joms.12905.

5. Watling, C., et al. (2021). "Don't Be Reviewer 2! Reflections on Writing Effective Peer Review Comments."

6. Jefferson, T., Wager, E., & Davidoff, F. (2002). "Measuring the Quality of Editorial Peer Review." *JAMA*.

7. Bruce, R., Chauvin, A., Trinquart, L., Ravaud, P., & Boutron, I. (2016). "Impact of Interventions to Improve the Quality of Peer Review of Biomedical Journals: A Systematic Review and Meta-Analysis." *BMC Medicine*, 14:85. DOI:10.1186/s12916-016-0631-5.

### Adversarial and Multi-Agent Correction

These papers validate the R2 Ensemble's multi-reviewer architecture.

8. Du, Y., et al. (2024). "Improving Factuality and Reasoning in Language Models through Multiagent Debate." *ICML 2024*. arXiv:2305.14325.

9. Kumar, A., et al. (2024). "Training Language Models to Self-Correct via Reinforcement Learning (SCoRe)." *ICLR 2025*. arXiv:2409.12917.

10. Jin, J., et al. (2024). "AgentReview: Exploring Peer Review Dynamics with LLM Agents." *EMNLP 2024*.

11. McAleese, N., et al. (2024). "LLM Critics Help Catch LLM Bugs." arXiv:2407.00215.

### Inference-Time Scaling and Process Verification

These papers provide theoretical grounding for the OTAE-Tree loop and R3 Judge.

12. Snell, C., et al. (2024). "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters." arXiv:2408.03314.

13. DeepMind (2024). "Rewarding Progress: Scaling Automated Process Verifiers for LLM Reasoning." arXiv:2410.08146.

14. DeepMind — Aletheia (2026). "Towards Autonomous Mathematics Research." arXiv:2602.10177.

15. DeepMind (2026). "Accelerating Scientific Research with Gemini: Case Studies and Common Techniques." arXiv:2602.03837.

16. ThinkPRM (2025). "Process Reward Models That Think." arXiv:2504.16828.

### Serendipity and Adversarial Collaboration

These papers inform the Serendipity Engine and R2's co-design of discriminating tests.

17. Swanson, D.R. (1986). "Undiscovered Public Knowledge." *The Library Quarterly*, 56(2), 103–118. DOI:10.1086/601720.

18. Kahneman, D. (2003). "Experiences of Collaborative Research." *American Psychologist*.

### Self-Consistency and Anti-Anchoring (BFP Design)

These papers inform the Blind-First Pass and self-consistency mechanisms.

19. Wang, X., et al. (2022). "Self-Consistency Improves Chain of Thought Reasoning in Language Models." arXiv:2203.11171.

20. Dhuliawala, S., et al. (2023). "Chain-of-Verification Reduces Hallucination in Large Language Models." arXiv:2309.11495.

21. Chen, J., et al. (2024). "RECONCILE: Round-Table Conference Improves Reasoning via Consensus."

22. Zheng, C., et al. (2024). "Personas in System Prompts Do Not Improve Factual QA." arXiv:2311.10054.

### Meta-Review Quality (R3 Design)

23. PMC (2024). "Peer Reviews of Peer Reviews: A Randomized Controlled Trial." PMC:11964232.

### Mutation Testing Theory (SFI Design)

These papers provide the theoretical basis for Seeded Fault Injection.

24. Jia, Y. & Harman, M. (2011). "An Analysis and Survey of the Development of Mutation Testing." *IEEE TSE*, 37(5). DOI:10.1109/TSE.2010.62.

25. Papadakis, M., et al. (2019). "Mutation Testing Advances: An Analysis and Survey." *Advances in Computers*, 112.

26. Kaufman, S. & Just, R. (2022). "Prioritizing Mutants to Guide Mutation Testing." *ICSE*.

### Evidence Aggregation Theory (Confidence Formula)

These papers inform the confidence formula's separation of "unknown" from "contradicted."

27. Sentz, K. & Ferson, S. (2002). "Combination of Evidence in Dempster-Shafer Theory." Sandia National Laboratories, SAND2002-0835.

28. Grabisch, M. (2000). "Application of the Choquet Integral in Multicriteria Decision Making."

### Correctness Benchmarking

29. CorrectBench (2025). "Can LLMs Correct Themselves? A Benchmark of Self-Correction in LLMs." arXiv:2510.16062.

---

## Design Philosophy

> *"Non e' il prompt che fa la differenza. E' il sistema che IMPEDISCE al prompt di mentire."*
>
> — It's not the prompt that makes the difference. It's the system that PREVENTS the prompt from lying.

---

## Citation & Attribution

If you use Vibe Science in your research, please cite:

> Russo, C. & Bertelli, E. (MD) (2026). *Vibe Science: an AI-native research engine with adversarial review and serendipity tracking.* https://github.com/th3vib3coder/vibe-science · DOI: [10.5281/zenodo.18665031](https://doi.org/10.5281/zenodo.18665031)

---

## License

Apache 2.0 — see [LICENSE](LICENSE).

© 2026 Carmine Russo & Dr. Elisa Bertelli (MD)

---

**Authors**: [Carmine Russo](https://github.com/th3vib3coder) · Dr. Elisa Bertelli (MD)
