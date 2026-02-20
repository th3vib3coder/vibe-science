# Changelog

All notable changes to Vibe Science are documented here.

## [6.0.0] — 2026-02-20 — NEXUS (Plugin Architecture)

### Added
- **Plugin architecture**: 5 lifecycle hooks (Setup, SessionStart, UserPromptSubmit, PostToolUse, Stop)
- **Gate Engine**: DQ1-DQ4, DC0, DD0, L-1+ enforcement with exit code 2 blocking
- **Permission Engine**: TEAM mode with 6 roles (researcher, reviewer2, judge, serendipity, lead, experimenter)
- **Research Spine**: Automatic structured logging of every significant action
- **Context Builder**: Progressive disclosure (~700 tokens) with semantic recall
- **Narrative Engine**: Template-based session summaries (no LLM, deterministic)
- **R2 Auto-Calibration**: Weakness tracking, SFI catch rates, J0 trends across sessions
- **Vector Search**: sqlite-vec integration with keyword fallback
- **Silent Observer**: Periodic checks for stale STATE.md, FINDINGS/JSON desync, orphaned data, design drift, literature staleness
- **Literature Registry**: 102 scientific databases across 12 categories
- **SQLite persistence**: 11 tables (sessions, spine_entries, claim_events, r2_reviews, serendipity_seeds, gate_checks, literature_searches, observer_alerts, calibration_log, prompt_log, embed_queue)
- **Embedding Worker**: Background daemon for async vector embedding
- **Domain Config Template**: Cross-domain DQ gate thresholds

### Changed
- Architecture: **Skill-only -> Skill + Plugin hybrid** (methodology stays prompt-level, enforcement becomes code-level)
- Gate L-1 upgraded to L-1+ (domain-aware literature pre-check with MCP server stack)
- All 10 Constitutional Laws now have plugin-level enforcement (not just prompt-level)
- SSOT rule enforced by DQ4 gate (automatic FINDINGS.md vs JSON sync check)
- Agent permissions enforced at PostToolUse (not just suggested in prompts)

### Technical
- ES modules throughout (type: "module")
- better-sqlite3 synchronous API
- Cross-platform path handling
- Graceful degradation (hooks never crash, return exit code 0 on internal errors)
- stdin/stdout JSON protocol for all hooks
- Exit code 0 = allow, exit code 2 = BLOCK

## [5.5.0] — 2026-02-19 — ORO (Post-Mortem Driven)

### Added
- 7 new gates: L-1, DQ1-DQ4, DD0, DC0 (34 total)
- R2 INLINE mode (7th activation mode)
- SSOT (Single Source of Truth) rule
- Structured logbook protocol
- Data dictionary gate (DD0)
- Design compliance gate (DC0)

### Changed
- All changes trace to 12 specific mistakes from CP+CRISPR post-mortem
- Post-mortem driven development: each gate maps to a real error

## [5.0.0] — 2026-02-16 — IUDEX (Verification Release)

### Added
- Seeded Fault Injection (SFI) — mutation testing for scientific claims
- Blind-First Pass (BFP) — breaks anchoring bias
- Judge Agent (R3) — meta-reviews R2's review quality
- Schema-Validated Gates (SVG) — 8 gates enforce JSON Schema
- Circuit Breaker — deadlock -> DISPUTED
- Agent Permission Model — separation of powers
- R2 Salvagente — killed claims produce serendipity seeds
- 9 JSON Schema files (read-only)

### Changed
- Gates: 26 -> 27 (+V0 vigilance, +J0 judge)
- R2 now architecturally unbypassable (not just prompted)

## [4.5.0] — 2026-02-14 — ARBOR VITAE (Pruned)

### Added
- Phase 0 Brainstorm Engine (10-step ideation)
- R2 expanded to 6 modes (+shadow, +veto, +redirect)
- Inversion Exercise, Collision-Zone Thinking, Productive Tensions
- Counter-evidence search mandatory at confidence >= 0.60

### Changed
- -381 lines removed via progressive disclosure
- Gates: 26 -> 25 (consolidated)

## [4.0.0] — 2026-02-12 — ARBOR VITAE (Tree Search)

### Added
- OTAE-Tree architecture (flat loop -> branching tree search)
- 7 node types, 3 tree modes, best-first selection
- 5-stage Experiment Manager
- VLM Gate, Writeup Engine, Auto-Experiment
- SOLO + TEAM modes
- 3 new Constitutional Laws (8-10)
- Cross-branch serendipity detection

### Changed
- Laws: 7 -> 10
- Gates: 12 -> 26
- Protocols: 9 -> 16

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
