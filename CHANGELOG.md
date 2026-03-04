# Changelog

All notable changes to Vibe Science are documented here.

## [6.0.9] — 2026-03-04 — README/ARCHITECTURE Script Listings + Gate History

> **Trigger:** Round 21 paranoid deep debug — audited README.md, ARCHITECTURE.md, and gates/gates.md (files never previously scanned in debug mode). README.md script directory tree listed only 7 entries and omitted `pre-tool-use.js` and `subagent-stop.js` (added in v6.0.1), while labeling utility scripts (`setup.js`, `worker-embed.js`) as "hook implementations". ARCHITECTURE.md code table was missing 4 files (pre-compact.js, pre-tool-use.js, subagent-stop.js, pattern-extractor.js) and understated total LOC at ~6,600 when actual is ~7,100. gates/gates.md inline comment only mentioned v4.0 additions, omitting v5.0 (V0, J0) and v5.5 (L-1, DQ1-DQ4, DD0, DC0) gate additions — contradicting the correct header block.

### Fixed
- **README.md**: Script directory tree now lists all 9 files (7 hooks + 2 utilities) with correct descriptions. `pre-tool-use.js` (CLAIM-LEDGER write guard) and `subagent-stop.js` (Salvagente Rule enforcement) added. `setup.js` and `worker-embed.js` marked as utilities. LOC total updated ~6,600 → ~7,100
- **ARCHITECTURE.md**: Code table gains 4 missing rows: `pre-compact.js` (175), `pre-tool-use.js` (88), `subagent-stop.js` (98), `pattern-extractor.js` (111). Total updated ~6,600+ → ~7,100+
- **gates/gates.md**: Inline gate history expanded from v4.0-only to include v5.0 (V0, J0) and v5.5 (L-1, DQ1-DQ4, DD0, DC0) additions with "Total: 32 gates"

### Not Fixed (by design)
- Archive brainstorm-engine.md copies (v5.0/v5.5/photonics) still have stale "(0-15)" serendipity scale — these are historical snapshots and should reflect what each version actually contained, bugs included

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail**

## [6.0.8] — 2026-03-04 — Reference Docs Sync (Version Tags + Schema List)

> **Trigger:** Round 20 paranoid deep debug — audited all 34 .md files in `skills/vibe/references/` (the skill-bundled copies of protocol docs). Found 2 files still carrying pre-v6.0 version headers that had already been fixed in `protocols/` during Round 19, plus `schema-validation.md` referencing the old `vibe-science-v5.0/` directory name and listing only 9 schemas when there are now 12 (3 new v6.0 schemas: data-quality-gate, finding-validation, spine-entry were missing).

### Fixed
- **references/evidence-engine.md**: Version tag "Pillar 1 of v4.0 — ARBOR VITAE" → "Part of v6.0 NEXUS (originated as Pillar 1 in v4.0)" — now matches protocols/ copy
- **references/audit-reproducibility.md**: Version tag "Pillar 4 of v3.5 — TERTIUM DATUR" → "Part of v6.0 NEXUS (originated as Pillar 4 in v3.5)" — now matches protocols/ copy
- **references/schema-validation.md**: Directory name `vibe-science-v5.0/` → `vibe-science/`. Schema file list expanded from 9 → 12 entries with v6.0 additions annotated: `data-quality-gate.schema.json` (DQ1-DQ4 gate artifacts), `finding-validation.schema.json` (DQ4 finding validation), `spine-entry.schema.json` (research spine entries)

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail**

## [6.0.7] — 2026-03-04 — Protocol Version Tags & Serendipity Scale Fix

> **Trigger:** Round 19 paranoid deep debug — audited all 21 protocol .md files that hadn't been read in previous rounds. Found 4 protocols still referencing v3.5 TERTIUM DATUR / v4.0 ARBOR VITAE instead of v6.0 NEXUS (agent-teams, analysis-orchestrator, audit-reproducibility, evidence-engine). Also found 3 protocols using the old 5-component serendipity scale (0-15) instead of the v5.0+ 7-component scale (0-20) — agent-teams, brainstorm-engine, loop-otae. The response thresholds in loop-otae were also stale (0-3/4-7/8-11/12-15 instead of 0-4/5-9/10-14/15-20).

### Fixed
- **agent-teams.md**: Updated 3 system prompt templates from "v4.0 (ARBOR VITAE)" → "v6.0 NEXUS". Fixed serendipity formula reference: "5-component (0-15)" → "7-component (0-20)"
- **analysis-orchestrator.md**: Header updated from "Pillar 3 of v3.5 — TERTIUM DATUR" → "Part of v6.0 NEXUS (originated as Pillar 3 in v3.5)"
- **audit-reproducibility.md**: Header updated from "Pillar 4 of v3.5 — TERTIUM DATUR" → "Part of v6.0 NEXUS (originated as Pillar 4 in v3.5)"
- **evidence-engine.md**: Header updated from "Pillar 1 of v4.0 — ARBOR VITAE" → "Part of v6.0 NEXUS (originated as Pillar 1 in v4.0)"
- **brainstorm-engine.md**: Collision scoring scale "(0-15)" → "(0-20)", promotion threshold 8 → 10, example scores rescaled for 0-20
- **loop-otae.md**: OTAE serendipity scoring updated to 7-component formula (0-20) with Falsifiability (0-3) and Urgency (0-2). Response thresholds aligned with serendipity-engine.md canonical matrix (NOISE 0-4, FILE 5-9, QUEUE 10-14, INTERRUPT 15-20)

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail**

## [6.0.6] — 2026-03-04 — Schema Enum Alignment & Dead Code Removal

> **Trigger:** Round 18 paranoid deep debug — cross-validated every `classifyAction()` return value against `spine-entry.schema.json` action_type enum. Found 10 non-schema values in `post-tool-use.js` (CONFIGURATION, FEATURE_EXTRACTION, EVALUATION, VISUALIZATION, CODE_WRITE, OTHER, DOCUMENTATION, DATA_INSPECT, FILE_READ, SEARCH) and an entire dead duplicate in `gate-engine.js` (~160 lines, 26 wrong values, never imported by any hook). Also found `data-quality-gate.schema.json` missing WARN status that `finding-validation.schema.json` already had, version tag "v5.0" in enforcement.md, missing LAW 11 & 12 in roles.md, and undocumented `r2_verdict` column in calibration_log.

### Fixed
- **post-tool-use.js**: Remapped `classifyAction()` — all 16 return values now match `spine-entry.schema.json` enum exactly. Added DATASET_DOWNLOAD (wget/curl), DESIGN_CHANGE (architecture files). Grep/Glob returns null (not logged). All WebSearch/WebFetch returns LITERATURE_SEARCH.
- **gate-engine.js**: Removed dead `classifyAction()` duplicate (~160 lines). Function was exported but never imported — all hook scripts use the inline version in post-tool-use.js. Added removal comment documenting why.
- **data-quality-gate.schema.json**: Added WARN to status enum (`["PASS", "FAIL"]` → `["PASS", "FAIL", "WARN"]`) — consistent with finding-validation.schema.json. Synced to all 3 copies (schemas/, skills/vibe/assets/schemas/, archive/vibe-science-v6.0-claude-code/assets/schemas/).
- **enforcement.md**: Version tag corrected: "v5.0 Structural Enforcement" → "v6.0 Structural Enforcement"
- **roles.md**: Added universal constraints section with LAW 11 (LISTEN TO THE USER) and LAW 12 (INSTINCT) — were in CLAUDE.md and SKILL.md but missing from the rules file agents actually read.
- **schema.sql**: Documented `r2_verdict` column in `calibration_log` table (was undocumented, now: "ACCEPT/REJECT/DEFER from claim_events at resolution time")
- **__test_e2e.mjs**: Removed `classifyAction` export assertion from gate-engine test (function no longer exists there)

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail**

## [6.0.5] — 2026-03-04 — Hook Pattern Docs & Python Sync

> **Trigger:** Cross-reference audit of CLAUDE.md hook output patterns against actual code found 2 prefix mismatches (agents pattern-matching on documented strings would not match). Python audit of all 18 .py files found spine_entry.py VALID_TYPES missing 4 schema-valid action types and an unused variable in dq_gate.py.

### Fixed
- **CLAUDE.md**: PostToolUse advisory prefixes corrected: `SALVAGENTE FAIL` → `GATE SALVAGENTE FAIL`, `SEED ESCALATION` → `SERENDIPITY ESCALATION` / `SERENDIPITY INTERRUPT` (match actual code output)
- **spine_entry.py**: Added 4 missing action types to `VALID_TYPES`: `CALIBRATION`, `CONFORMAL_PREDICT`, `TOOL_USE`, `COMPACT_SNAPSHOT` (now matches spine-entry.schema.json enum)
- **dq_gate.py**: Removed unused `labels` variable in `check_dq1()` (dead code)
- **context-builder.js**: Updated docstring to include `[PURPOSE]` section and note about `[PATTERNS]` injection by session-start.js
- Archive synced for changed Python scripts

## [6.0.4] — 2026-03-04 — Critical SessionStart Hook Fix

> **Trigger:** Running the e2e test suite (`node --test __test_e2e.mjs`) for the first time revealed that `session-start.js` crashes with `ReferenceError: loadPendingSeeds is not defined`. The variable was assigned on lines 58 and 61 but never declared with `let`. In ES modules (strict mode), this causes an immediate crash at module load time, meaning the SessionStart hook has been silently failing since it was written — falling back to Claude Code's default error handling instead of injecting Vibe Science context.

### Fixed
- **session-start.js**: Added `loadPendingSeeds` to `let` declaration on line 35 (was: `let loadR2CalibrationData;`, now: `let loadR2CalibrationData, loadPendingSeeds;`). This undeclared variable caused `ReferenceError` in ES strict mode whenever the module loaded, crashing the entire SessionStart hook.
- **__test_e2e.mjs**: B6 "forbidden personal names" test now excludes files that legitimately contain author attribution (README.md, CITATION.cff, LICENSE, NOTICE, .claude-plugin/*, SKILL.md). These files require author names for academic citation, GitHub publishing, and skill metadata.

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail** (was 48 pass, 2 fail before fix)

## [6.0.3] — 2026-03-04 — Language & Schema Doc Consistency

> **Trigger:** Deep audit of previously unread files (pre-tool-use.js, subagent-stop.js, setup.js, r2-calibration.js, pattern-extractor.js, vec-search.js) found Italian text in R2 calibration hint strings and documentation examples. Since the actual code now outputs English, all documentation (SKILL.md, judge-agent.md, seeded-fault-injection.md, blueprint pseudocode) and SQL comments were aligned to English. Also fixed r2-calibration.md reference doc claiming a non-existent `project_path` column in `r2_reviews` table and incorrect review_mode enum values.

### Fixed
- **r2-calibration.js**: 4 Italian hint strings → English (matched CLAUDE.md expected output format)
- **SKILL.md**: Italian calibration hint example → English
- **judge-agent.md**: Italian J0 warning example → English
- **seeded-fault-injection.md**: Italian SFI hint example → English
- **v6.0-NEXUS-BLUEPRINT.md**: 5 Italian strings in pseudocode → English
- **r2-calibration.md**: Removed non-existent `project_path` column from `r2_reviews` table doc; fixed `review_mode` enum: `INLINE, FORCED, SFI` → `INLINE, FORCED, BATCH, SHADOW, BRAINSTORM`
- **schema.sql**: 5 Italian SQL comments → English (lines 54, 76, 119, 137, 186)
- **session-start.js**: Italian fallback state string → English ("Prima sessione su questo progetto." → "First session on this project.")
- **context-builder.js**: Same Italian fallback string → English (2 occurrences)
- Archive synced for all changed files

## [6.0.2] — 2026-03-04 — Hardening & Modular Rules

> **Trigger:** Paranoid debug audit — systematic file-by-file review of the entire repo found ~80 consistency bugs across 50 files (stale version numbers, wrong gate/hook/law/table counts, broken column references in JS, Python logic errors, phantom script references, archive desync). Additionally, best-practices research on Claude Code hook specification revealed missing fields and non-standard frontmatter.

### Added
- **`permissions.deny`**: Structural protection for schemas — `Edit(.vibe-science/schemas/*)` and `Write(.vibe-science/schemas/*)` denied at settings level
- **Modular rules directory**: `.claude/rules/roles.md` (6 agent role constraints) and `.claude/rules/enforcement.md` (v5.0 structural enforcement protocols)
- **Hook timeouts**: All 7 hooks now have explicit `timeout` field (10-30s) to prevent hangs
- **Regex matcher on PreToolUse**: Matcher upgraded from `"Write"` to `"Write|Edit"` — prevents LAW 9 bypass via Edit tool
- **Environment variables**: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` (auto-compact at 50% context), `BASH_MAX_TIMEOUT_MS=600000` (10-min max for long-running scripts)

### Changed
- **CLAUDE.md trimmed**: 176 → ~100 lines. Role constraints and enforcement protocols moved to `.claude/rules/` (auto-loaded by Claude Code). Adherence improves under 150 lines (documented in best-practices research).
- **CLAUDE.md hooks section**: Now documents all 7 hooks with summary table (was missing PreToolUse and SubagentStop descriptions)
- **Hook output patterns**: Condensed to tag-based reference format

### Fixed
- CLAUDE.md previously only documented 5 hooks despite v6.0.1 adding PreToolUse and SubagentStop — now all 7 are documented
- **CLAUDE.md gate count**: 34 → 32 (pre-debug artifact, correct count confirmed in SKILL.md gate table)
- **ARCHITECTURE.md**: Removed phantom "Setup" hook row (auto-setup runs inside SessionStart); updated SQLite table count 11 → 12 (added `research_patterns`)
- **CITATION.cff**: Hook count 5 → 7, hook names corrected to match actual implementation
- **Logo SVG**: Updated summary line — 12 laws, 32 gates, 12 tables, 7 hooks (was 10, 34+, 11, 5)
- **CLAUDE.md law count**: Added missing LAW 12 (INSTINCT) — had only 11 laws, README/SKILL both say 12
- **ARCHITECTURE.md law count**: "10 Constitutional Laws" → "12 Constitutional Laws" in dual architecture diagram
- **CITATION.cff numbers**: Constitutional laws 10→12, quality gates 27→32, R2 modes 6→7 (added INLINE)
- **marketplace.json**: Gate count 34+ → 32 in plugin description
- **constitution.md** (skill reference): Hook count 5 → 7, added PreToolUse and SubagentStop to enforcement list, title v5.5 → v6.0
- **`__test_e2e.mjs`**: Expected tables 11 → 12 (added `research_patterns`), required hooks 5 → 7 (added PreToolUse, PreCompact, SubagentStop; removed phantom Setup), fixed hooks.json path (`plugin/hooks/` → `hooks/`), fixed hook entry structure parsing for new nested format
- **`__test_e2e.mjs`**: JS file count 13 → 17 (added pre-tool-use, pre-compact, subagent-stop scripts + pattern-extractor lib), B4 test assertions now check `hookSpecificOutput` wrapper instead of top-level fields
- **`subagent-stop.js`**: Fixed query on non-existent `source_claim_id` column — now searches `narrative` and `causal_question` via LIKE
- **`post-tool-use.js`**: Fixed `checkPermission` degraded-mode fallback (returned truthy object, callers treat truthy as violation — now returns null)
- **`post-tool-use.js`**: SALVAGENTE seed lookup now also searches `causal_question` field (was only checking `narrative`)
- **`context-builder.js`**: Wrapped `loadPendingSeeds` in try/catch (was the only unwrapped Layer 2 section)
- **`dq_gate.py`**: DQ3 now requires ≥2 seeds (was passing with 1), uses sample stdev (Bessel's correction), falsy-safe `expected_n` check (`is not None`), unconditional alternative explanations per spec
- **Schema `$id` fields**: 9 schemas updated from `vibe-science-v5.0` → `vibe-science-v6.0`
- **Version references**: gates-complete.md, reviewer2-ensemble.md, commands/start.md, CITATION.cff, observer.py, walkthrough, templates.md, fault-taxonomy.yaml — all updated to v6.0
- **gates/gates.md**: Gate count 34 → 32, base count 27 → 25
- **protocols/schema-validation.md**: "8 of 34" → "8 of 32"
- **blueprints/v6.0-NEXUS-BLUEPRINT.md**: Gate count 34 → 32 (all occurrences), hook count 5 → 7
- **Root SKILL.md**: License MIT → Apache-2.0, gate count 34 → 32, law count 10 → 12
- **CHANGELOG.md**: Gate count 34 → 32 in v5.5 entry, law count 10 → 12 in v6.0 entry
- **reviewer2-ensemble.md**: R3 rubric dimensions aligned with judge-rubric.yaml, r2-verdict.schema.json → review-completeness.schema.json, verdict version 5.5 → 6.0
- **seeded-fault-injection.md**: Gate range G1-G7 → G0-G6
- **data-dictionary.md**: Removed reference to non-existent `dd0_gate.py`
- **design-compliance.md**: Removed reference to non-existent `dc0_gate.py`
- **commands/init.md**: Template path `vibe-science/vibe/templates/` → `skills/vibe/assets/templates.md`
- **commands/start.md**: Template path updated to `skills/vibe/assets/templates.md`
- **Archive sync**: `archive/vibe-science-v6.0-claude-code/` re-synced with `skills/vibe/`

## [6.0.1] — 2026-03-04 — Best Practices Upgrade

> **Trigger:** Research into Claude Code best practices (official hook specification, command frontmatter fields, tool restrictions, environment variables) revealed gaps between the plugin implementation and the platform spec.

### Added
- **PreToolUse hook**: Blocks Write to CLAIM-LEDGER without confounder_status (LAW 9 structural enforcement)
- **SubagentStop hook**: Enforces Salvagente Rule — killed claims must produce serendipity seed
- **Dynamic context injection**: `/start` and `/loop` pre-inject STATE.md, PROGRESS.md, TREE-STATE.json via `!` bash prefix
- **Environment variables**: MCP_TIMEOUT=30000, MAX_MCP_OUTPUT_TOKENS=100000, CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1
- **Blueprint**: v6.0.1-BEST-PRACTICES-BLUEPRINT.md

### Changed
- **Reviewer 2 agent**: Added `tools: Read, Grep, Glob, WebSearch, WebFetch` — R2 structurally cannot Write/Edit/Bash
- **All 5 commands**: Added `allowed-tools`, `model` (official spec fields)
- **2 commands**: Replaced non-standard `args` with official `argument-hint`
- **Search command**: `model: sonnet` (retrieval-heavy workload)
- **Reviewer2 command**: `allowed-tools` restricted to read-only tools
- **SKILL.md frontmatter**: Trimmed to 3 official fields (name, description, allowed-tools)
- Hook count: 5 → 7 (added PreToolUse, SubagentStop)

### Fixed
- `package.json` license: MIT → Apache-2.0
- Removed non-standard `capabilities` field from reviewer2 agent
- Removed non-standard `args` field from command frontmatter

## [6.0.0] — 2026-02-20 — NEXUS (Plugin Architecture)

> **Trigger:** Realization that prompt-only enforcement (SKILL.md instructions) is insufficient — agents drift, skip gates, and ignore R2. Moving enforcement from suggestions to code-level hooks with exit-code blocking creates structural guarantees.

### Added
- **Plugin architecture**: 7 lifecycle hooks (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, Stop, SubagentStop)
- **Gate Engine**: DQ1-DQ4, DC0, DD0, L-1+ enforcement with exit code 2 blocking
- **Permission Engine**: TEAM mode with 6 roles (researcher, reviewer2, judge, serendipity, lead, experimenter)
- **Research Spine**: Automatic structured logging of every significant action
- **Context Builder**: Progressive disclosure (~700 tokens) with semantic recall
- **Narrative Engine**: Template-based session summaries (no LLM, deterministic)
- **R2 Auto-Calibration**: Weakness tracking, SFI catch rates, J0 trends across sessions
- **Vector Search**: sqlite-vec integration with keyword fallback
- **Silent Observer**: Periodic checks for stale STATE.md, FINDINGS/JSON desync, orphaned data, design drift, literature staleness
- **Literature Registry**: 102 scientific databases across 12 categories
- **SQLite persistence**: 12 tables (sessions, spine_entries, claim_events, r2_reviews, serendipity_seeds, gate_checks, literature_searches, observer_alerts, calibration_log, prompt_log, embed_queue, research_patterns)
- **Embedding Worker**: Background daemon for async vector embedding
- **Domain Config Template**: Cross-domain DQ gate thresholds

### Changed
- Architecture: **Skill-only -> Skill + Plugin hybrid** (methodology stays prompt-level, enforcement becomes code-level)
- Gate L-1 upgraded to L-1+ (domain-aware literature pre-check with MCP server stack)
- All 12 Constitutional Laws now have plugin-level enforcement (not just prompt-level)
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

> **Trigger:** Post-mortem of 21 CP+CRISPR research sprints revealed 12 specific failure modes (confounded claims, undocumented data columns, design drift, fabricated numbers passing review). Each new gate maps to a real mistake.

### Added
- 7 new gates: L-1, DQ1-DQ4, DD0, DC0 (32 total)
- R2 INLINE mode (7th activation mode)
- SSOT (Single Source of Truth) rule
- Structured logbook protocol
- Data dictionary gate (DD0)
- Design compliance gate (DC0)
- 3 new JSON schemas: data-quality-gate, finding-validation, spine-entry (12 total)

### Changed
- All changes trace to 12 specific mistakes from CP+CRISPR post-mortem
- Post-mortem driven development: each gate maps to a real error

## [5.0.0] — 2026-02-16 — IUDEX (Verification Release)

> **Trigger:** Discovery that R2 adversarial review alone is insufficient — R2 can be anchored by researcher justifications, and there is no way to verify R2 is actually doing its job. Solution: SFI (test R2), BFP (break anchoring), R3 Judge (meta-review R2), and schema validation (eliminate prose claims).

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

> **Trigger:** v4.0 SKILL.md exceeded effective context limits — adherence dropped with file length. Aggressive pruning (-381 lines) via progressive disclosure pattern. Also added brainstorming phase (Phase 0) to prevent premature convergence.

### Added
- Phase 0 Brainstorm Engine (10-step ideation)
- R2 expanded to 6 modes (+shadow, +veto, +redirect)
- Inversion Exercise, Collision-Zone Thinking, Productive Tensions
- Counter-evidence search mandatory at confidence >= 0.60

### Changed
- -381 lines removed via progressive disclosure
- Gates: 26 -> 25 (consolidated)

## [4.0.0] — 2026-02-12 — ARBOR VITAE (Tree Search)

> **Trigger:** Flat OTAE loop couldn't handle multi-hypothesis investigations — it explored one path linearly with no branching or backtracking. Tree search architecture enables parallel exploration of multiple hypotheses with best-first selection.

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

> **Trigger:** R2 v3.0 was too generic — a single hostile prompt couldn't catch domain-specific errors (wrong statistical tests, biological implausibility, data quality issues). Split into 4-specialist ensemble with typed claims and scaled evidence standards.

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

> **Trigger:** v2.0 11-phase loop was rigid and sequential — no way to checkpoint, resume, or detect diminishing returns. OTAE cycle (Observe-Think-Act-Evaluate) with explicit Checkpoint and Crystallize phases enables resumability and context rot recovery.

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

> **Trigger:** v1.0 was too simple — single hostile R2 prompt missed statistical errors, confidence was subjective (HIGH/MEDIUM/LOW), and there was no structured evidence tracking. Added quantitative confidence formula, 4-specialist R2 ensemble, and structured protocols.

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

> **Trigger:** Need for a systematic research methodology that prevents AI agents from hallucinating findings, skipping validation, and declaring premature completion during scientific investigations.

### Added
- Core 6-phase loop: Crystallize → Search → Analyze → Extract → Validate → Stop Check
- Single Reviewer 2 hostile prompt
- State files: STATE.md, PROGRESS.md, SERENDIPITY.md
- Folder structure per Research Question
- Anti-hallucination rules
- NO DATA = NO GO principle
- Literature search protocol (Scopus → PubMed → OpenAlex)
- Stop conditions: success, negative, serendipity pivot
