# Changelog

All notable changes to Vibe Science are documented here.

## [3.5.0] — 2026-02-07 — TERTIUM DATUR (R2 Upgrade)

### Changed
- **Reviewer 2 Ensemble → v3.5**: Major protocol upgrade
  - Double-pass workflow: Pass 1 (fatal-hunt, purely destructive) → Pass 2 (method-repair, constructive)
  - Three-level orthogonal attack: L1-Logic / L2-Statistics / L3-Data
  - Typed claims in Claim Ledger: descriptive / correlative / causal / predictive
  - Evidence standard scales automatically with claim type
  - Tool-use obligation: R2 must inspect files, verify DOIs, grep logs before accepting any number
  - "No Free Lunch" principle: every improvement must account for trade-offs
  - Confounding Audit Table: mandatory for multi-batch/multi-study data
  - Falsification plan expanded to ≥3 independent tests per major claim
  - Numeric severity scoring: 0-29 minor, 30-59 major, 60-79 severe, 80-100 fatal
- **R2-Bio Checklist**: added Marker Gate (≥3 canonical markers for cell type labels), No Free Lunch bio variant
- **R2-Stats Checklist**: added No Free Lunch check

### Added
- `"What Would Convince Me"` section in R2 output: exact artifacts that would upgrade a REJECT verdict
- `.claude-plugin/plugin.json` manifest for Claude Code installation
- `commands/start.md` conversational entry point (/start command)
- `CHANGELOG.md` version history
- `.gitignore` for runtime data exclusion

## [3.0.0] — 2026-02-07 — TERTIUM DATUR

### Changed
- Loop architecture: 6-phase → OTAE (Observe-Think-Act-Evaluate-Checkpoint-Crystallize)
- State management: aligned with OpenAI Codex unrolled agent loop pattern
- SKILL.md: complete rewrite with dispatch table and progressive resource loading

### Added
- `protocols/loop-otae.md` — detailed OTAE cycle procedure with emergency protocols
- `protocols/serendipity-engine.md` — quantitative triage (scoring 0-15), scheduled Sprints every 10 cycles
- `protocols/knowledge-base.md` — cross-RQ knowledge persistence (library.json, patterns, dead-ends)
- Decision Tree Router in SKILL.md for automatic workflow dispatch
- MCP server integration references (PubMed, bioRxiv, OpenTargets, ChEMBL)
- Diminishing returns detection (cycle 15 warning, cycle 20 forced review)
- Context rot recovery protocols
- Infinite loop detection

## [2.0.0] — 2026-02-06 — NULLIS SECUNDUS

### Changed
- Loop: 6 phases → 11 phases (added refine search, competitor scan, orthogonal validation)
- Reviewer 2: single hostile prompt → 4-specialist ensemble (Methods, Stats, Bio, Eng)
- Confidence: subjective (HIGH/MEDIUM/LOW) → quantitative formula (0-1)

### Added
- `protocols/reviewer2-ensemble.md` — 4-domain adversarial review with structured YAML output
- `protocols/evidence-engine.md` — claim tracking, confidence formula, temporal decay
- `protocols/analysis-orchestrator.md` — data analysis pipeline coordination
- `protocols/search-protocol.md` — systematic literature search strategy
- `protocols/audit-reproducibility.md` — run manifests, audit trail
- `protocols/data-extraction.md` — supplementary material extraction protocol
- `gates/gates.md` — quality gates G0-G5 (data), L0-L2 (literature), D0-D2 (decision)
- `assets/obs-normalizer.md` — AnnData obs column schema contract
- `assets/templates.md` — file templates for STATE, PROGRESS, RQ, Finding, etc.
- `assets/skill-router.md` — tool and skill dispatch table
- Confidence explosion detection (>0.30 in 2 cycles → forced R2 review)
- Assumption register with dependency tracking
- Serendipity triage with priority scoring

## [1.0.0] — 2025-01 — Original

### Added
- Core 6-phase loop: Crystallize → Search → Analyze → Extract → Validate → Stop Check
- Single Reviewer 2 hostile prompt
- State files: STATE.md, PROGRESS.md, SERENDIPITY.md
- Folder structure per Research Question
- Anti-hallucination rules
- NO DATA = NO GO principle
- Literature search protocol (Scopus → PubMed → OpenAlex)
- Stop conditions: success, negative, serendipity pivot
