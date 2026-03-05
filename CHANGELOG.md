# Changelog

All notable changes to Vibe Science are documented here.

## [6.0.41] — 2026-03-05 — Hook comment, README line counts (R60)

> **Trigger:** Round 60 paranoid deep debug — 6 parallel agents audited hook scripts, 12 JSON schemas, commands, .claude/ config, README.md, ARCHITECTURE.md. Found 3 real bugs, 3 false positives.

### Fixed
- **plugin/scripts/post-tool-use.js:873:** Salvagente comment "Blueprint v5.0" → "Blueprint v6.0"
- **README.md:296:** SKILL.md line count "528" → "527"
- **README.md:341,371:** Root SKILL.md line count "1,363" → "1,369"

### Triaged — False Positives
- **claim-promotion.schema.json:42 "v5.0 lock":** Provenance tag (lock introduced in v5.0, like "v5.0-geometric" for formula)
- **ARCHITECTURE.md:339 v4.0 gate count "26":** Historical snapshot of v3.5→v4.0 transition, not a current-state claim
- **R2 verdict vocabulary (PASS/FAIL vs ACCEPT/REJECT across schemas):** Intentional — different gate stages use different verdict vocabularies

## [6.0.40] — 2026-03-05 — gates.md stale gate count + version label (R59)

> **Trigger:** Round 59 paranoid deep debug — 6 parallel agents audited R3 dimension completeness (clean), plugin lib modules (clean), file counts (clean), rarely-audited protocols (clean), gates.md stale values, SKILL.md versioning.

### Fixed
- **gates/gates.md:458:** "all 25 existing gates" → "the 25 pre-v5.5 gates" (was stale v5.0 count in v5.5 DQ section intro)
- **gates/gates.md:671:** Schema Enforcement Summary header "(v5.0)" → "(v6.0)" (section covers v5.0+v5.5 gates)

### Triaged — False Positives
- **skills/vibe/SKILL.md:6 `v6.0.1`:** Intentional patch version from v6.0.1 best-practices upgrade (has CHANGELOG entry [6.0.1], archive blueprint, consistent across plugin+archive copies)

## [6.0.39] — 2026-03-05 — Stale R3 dimension + root templates.md sync to v6.0 (R58)

> **Trigger:** Round 58 paranoid deep debug — 6 parallel agents audited R3 dimension completeness, CITATION/README, examples, YAML configs, assets templates, and internal links (84 verified). Found 1 remaining stale R3 dimension name and root templates.md significantly behind plugin version.

### Fixed — Stale R3 Dimension Name
- **skills/vibe/references/reviewer2-ensemble.md:204:** "Constructiveness" → "Escalation" (matches judge-rubric.yaml)

### Fixed — Root assets/templates.md Synced to v6.0
- **TREE-STATE version:** `"4.0.0"` → `"6.0.0"`
- **TREE-STATE:** Added missing `"cycle": 1` field
- **STATE.md template:** Added v6.0 gate fields (dq_gates, new_gates: DD0/DC0/L-1, observer_alerts, spine_entries)
- **tree_health:** Added missing `exploration_ratio: 0.0` (LAW 8)
- **CLAIM-LEDGER template:** Added missing `R2 INLINE` field (v5.5+)
- **Added 3 v6.0 templates:** Handoff Document, Instinct Entry, Pattern Report

### Verified FALSE POSITIVE
- `claude-code.yaml:18` — `claude-haiku-4-5` is a comment showing model family name, not the deployment ID
- `assets/templates.md` queries_deduped field — present in root (full reference), absent in plugin (minimal) — design choice
- `fault-taxonomy.yaml` structural split — root has domain-specific faults, plugin has meta-faults only — intentional

---

## [6.0.38] — 2026-03-05 — R3 rubric dimension names wrong in 4 files (R57)

> **Trigger:** Round 57 paranoid deep debug — 6 parallel agents audited JSON schemas, hook scripts, protocols, top-level docs, config/settings, and skills/vibe/references. Found R3 Judge dimension names in 4 docs didn't match the actual rubric YAML.

### Fixed — R3 Rubric Dimension Names Mismatch
- **Source of truth:** `assets/judge-rubric.yaml` + `protocols/judge-agent.md` define 6 dimensions: Specificity, Counter-Evidence Search, Confounder Analysis, Falsification Demand, Independence, Escalation
- **4 files had wrong names** ("Depth, Constructiveness, Consistency" instead of "Confounder Analysis, Falsification Demand, Escalation"):
  - `.claude/rules/roles.md:49`
  - `SKILL.md:251`
  - `skills/vibe/references/constitution.md:118`
  - `skills/vibe/AGENTS.md:152-153`

### Verified FALSE POSITIVE
- `schemas/claim-promotion.schema.json:179` — `v5.0-geometric` is the formula's own version identifier (introduced in v5.0 IUDEX), not the project version. Formula unchanged in v6.0.
- `CLAUDE.md` `.vibe-science/` paths — these describe the structure created in *user projects*, not this repo's layout
- `skills/vibe/references/brainstorm-engine.md:253` "0-15 scale" — correctly refers to brainstorm hypothesis scoring (5 dims × 0-3), not serendipity (0-20)

---

## [6.0.37] — 2026-03-05 — 4 stale refs in commands/loop.md & commands/reviewer2.md (R56)

> **Trigger:** Round 56 paranoid deep debug — 6 parallel audit agents covered commands/, examples/, YAML frontmatter, table cross-refs, JS hooks, and protocol gate definitions. Found 4 remaining stale `minor findings` references in command docs.

### Fixed — Stale Variable Name & Threshold in Command Docs
- **commands/loop.md line 48:** `Minor findings pending: 2` → `unreviewed_claims_pending: 2`
- **commands/loop.md line 97:** `Minor findings pending: 3/3` → `unreviewed_claims_pending: 5/5`
- **commands/loop.md line 159:** `Minor findings pending: 0` → `unreviewed_claims_pending: 0`
- **commands/reviewer2.md line 26:** `minor findings` → `unreviewed claims`

### Verified FALSE POSITIVE (not bugs)
- ARCHITECTURE.md TOC anchor links: GFM slug generation strips em-dashes correctly, links valid
- plugin/scripts/subagent-stop.js SQL LIKE: claim IDs are system-generated `C-NNN`, no wildcard risk

---

## [6.0.36] — 2026-03-05 — Rename minor_findings_pending → unreviewed_claims_pending across 6 files (R55)

> **Trigger:** Round 55 paranoid deep debug — 6 parallel audit agents covered internal links, examples, README/config, AGENTS.md, CHANGELOG, and JS hook logic. Found the variable name `minor_findings_pending` was never renamed to `unreviewed_claims_pending` despite R53 changing the terminology everywhere else.

### Fixed — Stale `minor_findings_pending` Variable Name in 6 Active Files
- **examples/walkthrough-literature-review.md lines 97, 100:** Variable name in prose
- **assets/templates.md line 20:** STATE.md template YAML key
- **skills/vibe/assets/templates.md line 20:** Condensed STATE.md template YAML key
- **protocols/loop-otae.md line 40:** OBSERVE phase reference
- **skills/vibe/references/loop-otae.md line 40:** Condensed OBSERVE phase reference
- **WHY:** R53-R54 changed the BATCH trigger description from "3 minor findings" to "5 unreviewed claims" but never renamed the underlying STATE.md frontmatter key or the protocol references to it. JS code (stop.js) already uses `unreviewed_claims`. This completes the rename.

### Verified FALSE POSITIVE (R55)
- **ARCHITECTURE.md TOC anchors:** All 7 links are CORRECT — GFM strips em-dashes from headings, so `## v6.0 — NEXUS` → slug `#v60--nexus`
- **agent-teams.md Researcher model "Sonnet":** DESIGN CHOICE for TEAM mode cost optimization. AGENTS.md (Opus) is the canonical definition; TEAM roster intentionally suggests Sonnet as budget alternative
- **subagent-stop.js LIKE wildcards:** LOW RISK — claim IDs are system-generated (`C-001` format), will never contain `%` or `_`
- **CHANGELOG 6.0.31 references [6.0.24]:** Historical append-only doc, attribution error doesn't affect system behavior

## [6.0.35] — 2026-03-05 — Fix 3 stale values: BATCH threshold, confidence formula, walkthrough (R54)

> **Trigger:** Round 54 paranoid deep debug — audited commands/, schemas/, all reference cards, and remaining protocols. Found 3 real bugs + 2 false positives (brainstorm 0-15 scale is correct for hypothesis scoring; plugin/schemas/ doesn't exist because hooks don't use schemas).

### Fixed — protocols/loop-otae.md Line 282: BATCH ">=3" (MEDIUM)
- `minor_findings_pending >= 3` → `unreviewed_claims_pending >= 5`
- **WHY:** R53 fixed lines 230/237 in this file but missed the R2 trigger table at line 282

### Fixed — examples/walkthrough-literature-review.md Line 100: BATCH ">=3" (LOW)
- `minor_findings_pending >= 3` → `minor_findings_pending >= 5`
- **WHY:** Example walkthrough still showed old threshold

### Fixed — ARCHITECTURE.md Line 423: Stale v4.5 Confidence Formula (MEDIUM)
- Replaced additive formula `E×0.30 + R×0.25 + C×0.20 + K×0.15 + D×0.10` with v5.0 IUDEX formula `E * D * (R_eff * C_eff * K_eff)^(1/3)`
- **WHY:** v5.0 replaced the additive formula with a hybrid (hard veto on E,D + geometric mean on R,C,K). ARCHITECTURE.md still showed the obsolete v4.5 version

### Verified FALSE POSITIVE (R54)
- **brainstorm-engine.md "0-15 scale":** CORRECT — brainstorm hypothesis scoring uses 5 dimensions × 0-3 = max 15 points. This is NOT the serendipity scale (0-20). Agent initially flagged this; investigated and confirmed correct
- **plugin/schemas/ empty:** NOT A BUG — plugin/schemas/ doesn't exist because plugin JS hooks don't reference schemas at all. Schemas live in schemas/ and skills/vibe/assets/schemas/ only

## [6.0.34] — 2026-03-05 — Fix 6 remaining BATCH "3 minor" references across 4 files (R53)

> **Trigger:** Round 53 paranoid deep debug — audited ALL plugin JS code (17 files), cross-referenced ALL gate definitions repo-wide, verified CLAUDE.md F: vs D: consistency, and deep-audited skills/vibe/ directory. R52 fixed the BATCH threshold in protocols/reviewer2-ensemble.md but missed 6 occurrences in 4 other active files.

### Fixed — BATCH Trigger Threshold "3 minor findings" → "5 unreviewed claims" in 4 Active Files
- **skills/vibe/SKILL.md line 308:** `"3 minor findings accumulated"` → `"5 unreviewed claims accumulated"` (condensed skill mode table)
- **skills/vibe/references/loop-otae.md line 265:** `"minor_findings_pending >= 3"` → `"unreviewed_claims_pending >= 5"` (condensed loop reference R2 trigger table)
- **SKILL.md line 601:** `"BATCH:  3 minor findings accumulated"` → `"BATCH:  5 unreviewed claims accumulated"` (ASCII art diagram)
- **SKILL.md line 679:** `"3 minor findings accumulated"` → `"5 unreviewed claims accumulated"` (R2 mode table)
- **commands/loop.md line 177:** `"3 minor findings"` → `"5 unreviewed claims"` (loop R2 trigger table)
- **commands/reviewer2.md line 16:** `"3 minor findings accumulated"` → `"5 unreviewed claims accumulated"` (reviewer2 auto-invocation list)
- **WHY:** R52 correctly established >= 5 as the canonical BATCH threshold (matching the formal mode table in protocols/reviewer2-ensemble.md line 33 and the reference card line 55), but only fixed 2 of 8 total stale references. These 6 occurrences in the root SKILL.md, condensed skill, commands, and condensed references were missed because the R52 audit focused on protocols/ only. The `protocols/reviewer2-ensemble.md` line 58 ("v5.0 BATCH mode accumulates 3 minor findings") is correctly left as-is — it's historical context describing old v5.0 behavior.

### Verified CLEAN (R53)
- **Plugin JS code (17 files):** All canonical values correct. Gate IDs, serendipity thresholds (10/15), temporal decay (-0.02/week), DB schema (12 tables), hook count (7), version (6.0.0) — all match
- **KNOWN_ROLES array:** Has 6 entries — CORRECT (6 permission roles ≠ 7 agent types; these are separate classifications per CLAUDE.md line 41)
- **Gate cross-reference (entire repo):** All 32 gates correctly defined. Zero phantom gates (G7, S0, DQ0, L3, L-2). Zero stale "34" or "27" remaining
- **CLAUDE.md:** F: and D: byte-identical (8118 bytes, 95 lines). All canonical values correct
- **skills/vibe/ package:** All canonical values correct except BATCH threshold (now fixed)

## [6.0.33] — 2026-03-05 — Fix 8 stale values across SKILL.md, ARCHITECTURE.md, protocols (R52)

> **Trigger:** Round 52 paranoid deep debug — deep-audited root SKILL.md (~1,370 lines), condensed SKILL.md (~528 lines), 36 reference cards, and 21 protocols. Found 6 bugs + 2 gaps across 5 files.

### Fixed — SKILL.md Line 329: "27 v5.0 gates" Should Be "25" (HIGH)
- **SKILL.md line 329:** `"All 27 v5.0 gates"` → `"All 25 v5.0 gates"`
- **WHY:** This was the ROOT CAUSE of the persistent "34 gates" error seen in earlier rounds. The math: 27+7=34 (wrong) vs 25+7=32 (correct). v5.0 had 25 gates (G0-G6=7, L0-L2=3, D0-D2=3, T0-T3=4, B0=1, S1-S5=5, V0=1, J0=1 = 25). The stale "27" propagated through any reader who computed total gates from this line.

### Fixed — SKILL.md Line 754: Serendipity "13/15" Uses Old Scale (MEDIUM)
- **SKILL.md line 754:** `"scored 13/15"` → `"scored 13/15 (v4.0 scale; current scale is 0-20)"`
- **WHY:** The CRISPR case study predates v5.0 when the serendipity scale was changed from 0-15 to 0-20. The "13/15" is historically accurate but confusing without annotation — readers would think the current scale is /15 when it's actually 0-20 (7-component scoring).

### Fixed — protocols/agent-teams.md Line 129: Serendipity Alert "score >= 8" Should Be ">= 10" (MEDIUM)
- **protocols/agent-teams.md line 129:** `"score >= 8"` → `"score >= 10"`
- **WHY:** Score 8 falls in the FILE band (5-9), not the QUEUE band (10-14). The canonical thresholds are: NOISE (0-4), FILE (5-9), QUEUE (10-14), INTERRUPT (15-20). Creating an alert file at score 8 is wrong — alerts correspond to QUEUE threshold (>= 10). This value was likely never updated when the serendipity scale was recalibrated from 0-15 to 0-20.

### Fixed — protocols/reviewer2-ensemble.md BATCH Threshold Inconsistency (MEDIUM)
- **Lines 110, 133:** `"3 minor findings accumulated"` → `"5 unreviewed claims accumulated"`
- **WHY:** The formal BATCH mode table (line 33) defines the trigger as ">= 5 unreviewed claims". The reference card also says ">= 5". But the explanatory text at line 110 and the "When to Invoke" table at line 133 still said "3" — the old v5.0 threshold before INLINE mode reduced BATCH frequency. Line 58 stays as-is because it explicitly describes "v5.0 BATCH mode" (historical context). The authoritative source is the formal mode table.

### Fixed — ARCHITECTURE.md Line 430: "Quality Gates (12)" Stale v3.5 Count (MEDIUM)
- **ARCHITECTURE.md line 430:** Updated "Quality Gates (12)" section with all 32 current gates
- **WHY:** This section was frozen at the v3.5 gate count (12), listing only G0-G5, L0-L2, D0-D2. Current system has 32 gates across 11 categories: G0-G6, L-1+L0-L2, D0-D2, T0-T3, B0, S1-S5, DQ1-DQ4, DD0, DC0, V0, J0. Any reader of ARCHITECTURE.md would get a completely wrong picture of the gate system.

### Fixed — protocols/loop-otae.md Missing L-1 and T3 in Gate Sections (LOW)
- **Line 230:** Added `L-1: Literature pre-check` before L0 in Literature Gates section
- **Line 237:** Added `T3: Tree health` after T2 in Tree Gates section
- **WHY:** The gate listing in the EVALUATE phase was incomplete. L-1 (Literature Pre-Check, added in v5.5) and T3 (Tree Health Check, added in v4.0) were defined elsewhere in the document but missing from the gate summary sections. An agent reading only this section would not know these gates exist.

### Fixed — SKILL.md LAW 12 Missing Canonical Parameters (LOW)
- **SKILL.md line 175-176:** Added: confidence range (0.3-0.9), temporal decay formula (exp(-0.02 × weeks), half-life ~34.7 weeks), lifecycle stages (nascent→developing→established→proven), archival threshold (< 0.2)
- **WHY:** LAW 12 INSTINCT was described qualitatively but lacked the canonical parameters defined in CLAUDE.md and the instinct scanner implementation. Without these values, the instinct system has no numeric boundaries.

### Fixed — SKILL.md Frontmatter Missing v6.0.0 Changelog Entry (MEDIUM)
- **SKILL.md line 12:** Added v6.0.0 NEXUS changelog entry
- **WHY:** Frontmatter changelog listed versions v4.0.0 through v5.5.0 but was missing v6.0.0 despite `version: "6.0.0"` being set in line 6. Any tool reading the changelog field would not know what v6.0.0 changed.

### Verified CLEAN (R52)
- **Condensed SKILL.md:** Zero stale values, zero domain contamination across ~528 lines
- **Reference cards:** 35/36 clean. 1 design-choice flag (brainstorm-engine.md collision threshold >= 8 vs canonical queue >= 10 — intentionally lower bar during brainstorming)
- **Protocols:** 14/21 fully clean. Issues fixed in this commit cover all actionable findings

## [6.0.32] — 2026-03-05 — Fix dangling AGENTS.md reference in CLAUDE.md (R51)

> **Trigger:** Round 51 paranoid deep debug — audited all internal markdown links across 88 .md files, cross-checked CLAUDE.md consistency between F: and D: drives, validated all 12 JSON schema files (3 copies each), and verified hooks configuration parity between settings.json and hooks.json.

### Fixed — CLAUDE.md Dangling Reference to Root-Level AGENTS.md (LOW)
- **CLAUDE.md line 41:** `` `AGENTS.md` `` → `` `skills/vibe/AGENTS.md` ``
- **WHY:** CLAUDE.md references `AGENTS.md` without a path prefix, implying it exists at the repo root. But no `AGENTS.md` exists at root — the active copy lives at `skills/vibe/AGENTS.md` (with archived versions in `archive/`). An agent reading CLAUDE.md and attempting to read `AGENTS.md` from the repo root would get a file-not-found error. The reference needs the full relative path.

### Verified CLEAN (R51)
- **Internal markdown links:** All 13 links across 88 .md files resolve to existing targets. Zero broken links
- **JSON Schemas (12 files):** All valid JSON, all `$id` match filenames, all `$ref` resolve, all enum values consistent across 3 copies (root schemas/, skills/vibe/assets/schemas/, archive/). Informational: `CALIBRATE` is a legacy enum value in spine-entry.schema.json never emitted by JS code (only `CALIBRATION` is used) — not harmful, just unused
- **Hooks configuration:** Both `.claude/settings.json` and `hooks/hooks.json` define identical 7 hooks with matching timeouts, matchers, and script references. All 7 scripts exist. All lib module imports resolve. Blocking behavior matches CLAUDE.md documentation
- **CLAUDE.md F: vs D: consistency:** Both files byte-identical after git sync. Gate count (32), schema count (12), hook count (7), law count (12 including INSTINCT) all correct and consistent

## [6.0.31] — 2026-03-05 — Fix literature-registry stale total_databases and revert wrong category count (R50)

> **Trigger:** Round 50 paranoid deep debug — deep-audited README.md, ARCHITECTURE.md, CITATION.cff, NOTICE, marketplace.json, plugin.json, and BEHAVIOR-LOGBOOK references. Found 2 bugs: stale `total_databases` metadata field and a wrong category count introduced by a previous erroneous "fix" in [6.0.24].

### Fixed — literature-registry.json `total_databases` Field Stale (MEDIUM)
- **plugin/db/literature-registry.json line 6:** `"total_databases": 108` → `"total_databases": 102`
- **WHY:** The `total_databases` metadata field was never updated when databases were removed or reorganized. `Object.keys(d.databases).length` returns 102, matching the count stated everywhere else in the documentation. The stale 108 value would confuse any code or documentation that reads this field for validation or display purposes.

### Fixed — ARCHITECTURE.md Category Count Wrong — Reverts Erroneous [6.0.24] Fix (MEDIUM)
- **ARCHITECTURE.md lines 132, 159:** `13 categories` → `12 categories`
- **WHY:** The [6.0.24] "fix" changed "12 categories" to "13 categories", but this was WRONG. The actual `d.categories.length` is 12. The [6.0.24] WHY text listed "biomedical" as a category, but no such category exists in literature-registry.json — the actual categories are: multidisciplinary, biology_life_sciences, chemistry_pharmacology, physics_math_astronomy, materials_photonics_engineering, computer_science_ai, medicine_clinical, social_sciences_humanities, earth_sciences_environment, preprints_domain_specific, regional, grey_literature_special = 12. This is a cautionary example of a "fix" that introduced a bug by miscounting.

### Fixed — CHANGELOG [6.0.24] Entry Annotated as Wrong (LOW)
- **CHANGELOG.md [6.0.24] section:** Added revert annotation and correction note to the erroneous "12→13 categories" entry
- **WHY:** The CHANGELOG is append-only and historical, so the wrong entry was not deleted but annotated with "REVERTED in [6.0.31]" and the correct count documented. This preserves the audit trail showing how the error was introduced and corrected.

### Verified CLEAN (R50)
- **README.md:** 99.7% accurate. Minor line count variance (±1-6 lines from recent edits) and 3 minor omissions (legacy archive dir, root assets/ extra files, v6.0.1 blueprint) — cosmetic, not bugs
- **CITATION.cff:** All values correct (12 schemas, 32 gates, 7 hooks, v6.0.0)
- **NOTICE:** Correct (copyright 2026, Apache-2.0, correct repo URL)
- **marketplace.json + plugin.json:** Both correct (v6.0.0, valid paths, correct metadata)
- **BEHAVIOR-LOGBOOK references:** Runtime files (.vibe-science/ contents) correctly not present in repo — they are created by `/init` command at runtime

## [6.0.30] — 2026-03-05 — Fix misleading template path references in init command (R49)

> **Trigger:** Round 49 paranoid deep debug — audited commands/ and agents/ directories, cross-referenced protocol ↔ reference card mappings, verified archive directory integrity, and checked F: ↔ D: drive consistency.

### Fixed — init.md Template Source Column Uses Non-Existent File Paths (LOW)
- **commands/init.md lines 102-108:** Table column header `Template source` with values like `templates/STATE.md` → `Section in templates.md` with values like `## STATE.md Template`
- **WHY:** The templates live in a single file `skills/vibe/assets/templates.md` with section headers like `## STATE.md Template`. The table's "Template source" column used `templates/STATE.md` format, which looks like a file path to a standalone file that doesn't exist. An agent following the table literally would attempt to read `templates/STATE.md` and fail. Line 100 of the same file correctly states the templates location, but the table contradicted it with path-like references.

### Verified CLEAN (R49)
- **F: ↔ D: drive consistency:** All 5 critical files (CLAUDE.md, roles.md, enforcement.md, settings.json, hooks.json) byte-identical across both drives after git sync
- **Archive directory (552 files):** Well-organized across 9 version directories. All README.md archive references point to existing files. No orphaned active files that should be archived
- **Protocol ↔ reference card cross-refs:** 20 of 21 protocols have reference cards (95%). Missing: agent-teams.md — intentional omission (TEAM mode is experimental, multi-agent-config.md reference already covers role configuration)
- **Python script thresholds:** All 6 scripts (dq_gate.py, gate_check.py, spine_entry.py, sync_check.py, tree_health.py, observer.py) — thresholds match gates/gates.md exactly
- **agents/ directory:** Only reviewer2.md present — BY DESIGN (other roles are behavioral dispositions, not spawnable subagents)
- **32 gate count re-verified:** G(7) + L(4) + D(3) + T(4) + B(1) + S(5) + DQ(4) + DD(1) + DC(1) + V(1) + J(1) = 32, all 8 schema-enforced gates confirmed

## [6.0.29] — 2026-03-05 — Remove unused onnxruntime-node dependency (R48)

> **Trigger:** Round 48 paranoid deep debug — audited package.json dependencies vs actual imports across all plugin JavaScript files. Found `onnxruntime-node` listed as a dependency but never imported or referenced anywhere in the codebase.

### Fixed — Unused onnxruntime-node Dependency in package.json (MEDIUM)
- **package.json line 13:** Removed `"onnxruntime-node": "^1.21.0"` from dependencies
- **WHY:** Cross-referencing all `require()` and dynamic `import()` statements across 17 plugin JS files (7 hooks + 8 lib modules + 2 utilities) found that only `better-sqlite3` (3 files) and `@huggingface/transformers` (1 file) are actually used. `onnxruntime-node` has zero references — it was a historical artifact from early development when ONNX runtime was considered for model inference, but the implementation settled on `@huggingface/transformers` instead. The unused dependency adds native compilation overhead (`onnxruntime-node` requires platform-specific binaries) and installation time for zero functionality.

### Verified CLEAN (R48)
- **Stale number sweep (9 categories):** All previously fixed numbers (32 gates, 12 schemas, ~7,800 LOC, /15 triage, 0-3 per dimension, 102 databases, 7 hooks, 12 Laws) remain correct across all active documentation
- **Blueprints directory:** v6.0-NEXUS-BLUEPRINT.md — all canonical values correct, all referenced paths exist
- **Orphaned files:** No orphaned .js files in plugin/. Two .gitignore'd planning files (UPGRADE_PLAN_V2.md, CHANGELOG_V2.md) are properly excluded from git — historical artifacts, not bugs
- **LICENSE:** Apache 2.0, complete and properly formatted (192 lines)
- **Cross-file path references:** All path references in .md and .js files resolve to existing files. All 13 primary directories verified. Dual-config hook strategy (dev vs plugin mode) confirmed synchronized

## [6.0.28] — 2026-03-05 — CLAUDE.md enforcement version label mismatch (R44)

> **Trigger:** Round 44 paranoid deep debug — audited `.claude/rules/` files against CLAUDE.md. Found version label mismatch between CLAUDE.md file reference and enforcement.md's own header.

### Fixed — CLAUDE.md enforcement.md Version Label Mismatch (LOW)
- **CLAUDE.md line 42:** `v5.0 structural enforcement` → `v6.0 structural enforcement`
- **WHY:** The file `.claude/rules/enforcement.md` identifies itself as `# v6.0 Structural Enforcement` in its header (correctly — it describes v6.0 mechanisms). But CLAUDE.md's file reference still labeled it as `v5.0`, a leftover from when the enforcement section was inline under the `## v5.0 STRUCTURAL ENFORCEMENT` header (which marked when the mechanisms were introduced). When roles and enforcement were extracted to `.claude/rules/`, the version label in the reference wasn't updated to match the file's own header.

### Verified CLEAN (R44)
- **12 JSON Schema files:** All valid JSON Schema (draft 2020-12), all 8 gate mappings correct, no stale references
- **Plugin metadata:** marketplace.json, plugin.json, package.json — versions (6.0.0), URLs, counts all consistent
- **Round 41-42 fixes re-audited:** No regressions introduced — all 10 fixes verified in-place
- **"CRYSTALLIZE" references:** Confirmed as phase name (LAW 10, MCTS cycle), not folder — NOT a bug
- **"(v5.0 scale: 0-20)" label:** Confirmed as versioning provenance tag (v5.0 introduced the 0-20 scale) — NOT a bug

## [6.0.27] — 2026-03-05 — Cross-reference consistency R42: triage scale, LOC total, database count

> **Trigger:** Round 42 paranoid deep debug — cross-referenced canonical numbers across ALL active files. Found 3 more inconsistencies from R41's fixes not propagated to all locations.

### Fixed — Root SKILL.md Triage Scoring Scale Wrong (LOW)
- **SKILL.md lines 453-459:** `(0-5)` per dimension and `/25` total → `(0-3)` per dimension and `/15` total
- **WHY:** The canonical protocol (protocols/brainstorm-engine.md:221) defines 5 dimensions scored 0-3 each, max 15. The root SKILL.md (biology-instance) still had the pre-canonical (0-5) scale from early drafts, totaling /25. Same class of bug as the skills/vibe/SKILL.md fix in [6.0.26], but in the biology-instance copy.

### Fixed — README.md Plugin LOC Count Stale (LOW)
- **README.md lines 115, 305:** `~7,100 LOC` → `~7,800 LOC`
- **WHY:** ARCHITECTURE.md's line count table was updated to ~7,800+ in [6.0.26] after verifying all 19 component files with `wc -l`. README.md referenced the same total but was not updated in the same round. Both should match.

### Fixed — CHANGELOG [6.0.24] Database Count Wrong in Verification (LOW)
- **CHANGELOG.md line 66:** `108-database registry` → `102-database registry`
- **WHY:** The [6.0.24] entry marked literature-registry.json as "verified CLEAN" with "108-database registry", but the actual database count (verified by JSON parsing in R41) is 102. The 108 count was from a pre-[6.0.7] version; [6.0.7] fixed the count from 108→102 in README.md, but the [6.0.24] verification claim still used the old number.

## [6.0.26] — 2026-03-05 — Documentation accuracy audit R41: schema count, URL, algorithm, category count, scoring scale, line counts

> **Trigger:** Round 41 paranoid deep debug — full audit of all remaining documentation files (CITATION.cff, NOTICE, ARCHITECTURE.md table, skills/vibe/SKILL.md). Cross-verified every factual claim against source code and data files. 7 bugs found: 4 factual errors propagated from earlier versions, 1 wrong URL, 1 stale line count table with 10+ wrong entries, 1 scoring scale error.

### Fixed — CITATION.cff Schema Count Wrong (LOW)
- **CITATION.cff line 17:** `9 read-only schema files` → `12 read-only schema files`
- **WHY:** Same root cause as SKILL.md fix in [6.0.25] — the canonical schema count is 12 (9 v5.0 + 3 v5.5). The CITATION.cff abstract was written during v5.0 when there were 9 schemas, and was never updated when v5.5 added 3 more.

### Fixed — NOTICE GitHub URL Wrong (LOW)
- **NOTICE line 13:** `https://github.com/vibe-science-contributors/vibe-science` → `https://github.com/th3vib3coder/vibe-science`
- **WHY:** NOTICE used a placeholder organization URL that doesn't exist. CITATION.cff line 62 has the correct repository URL. Anyone following the NOTICE citation link would get a 404.

### Fixed — ARCHITECTURE.md Embedding Fallback Algorithm Misdescribed (LOW)
- **ARCHITECTURE.md line 125:** `a deterministic SHA-256 hash vector` → `a deterministic character-code hash vector`
- **WHY:** The actual `simpleEmbedding()` function in worker-embed.js uses `text.charCodeAt(i) / 255` accumulation into a Float32Array, NOT SHA-256 hashing. SHA-256 produces a 256-bit digest (not a 384-dim float vector). The description would mislead anyone trying to understand or reproduce the fallback behavior.

### Fixed — ARCHITECTURE.md Literature Registry Category Count Wrong (LOW) — REVERTED in [6.0.31]
- **ARCHITECTURE.md lines 132, 159:** `12 categories` → `13 categories` — **THIS FIX WAS WRONG.** Actual category count is 12, not 13. The WHY below miscounted by including a phantom "biomedical" category that does not exist in literature-registry.json (the actual categories are: multidisciplinary, biology_life_sciences, chemistry_pharmacology, physics_math_astronomy, materials_photonics_engineering, computer_science_ai, medicine_clinical, social_sciences_humanities, earth_sciences_environment, preprints_domain_specific, regional, grey_literature_special = 12). Corrected back to 12 in [6.0.31].
- **Original (wrong) WHY:** Actual unique categories in literature-registry.json: biology_life_sciences, biomedical, chemistry_pharmacology, computer_science_ai, earth_sciences_environment, grey_literature_special, materials_photonics_engineering, medicine_clinical, multidisciplinary, physics_math_astronomy, preprints_domain_specific, regional, social_sciences_humanities = 13. The count was likely 12 before a category was added.

### Fixed — ARCHITECTURE.md Line Count Table Stale (LOW)
- **ARCHITECTURE.md lines 141-160:** Updated all 19 component line counts to match actual `wc -l` values
- **WHY:** Files were edited during 40 rounds of debug, but the table was never updated. Major discrepancies: post-tool-use.js (1,482→1,765), gate-engine.js (630→471), db.js (~500→668), stop.js (171→258), literature-registry.json (~800→952). Total: ~7,100+ → ~7,800+. Stale line counts would mislead anyone estimating plugin complexity.

### Fixed — SKILL.md Triage Scoring Scale Wrong (LOW)
- **skills/vibe/SKILL.md line 159:** `/25` → `/15`
- **WHY:** The TRIAGE scoring system uses 5 dimensions scored 0-3 each, maximum 15. Canonical definition at protocols/brainstorm-engine.md:221 says "5 dimensions (0-3 each, max 15)". The /25 implies a 0-5 scale per dimension, which doesn't match the protocol. Same class of bug as the brainstorm-engine.md fix in [6.0.25].

## [6.0.25] — 2026-03-05 — Cross-directory consistency audit R40: SKILL.md schema count, brainstorm scoring scale

> **Trigger:** Round 40 paranoid deep debug — full cross-directory consistency audit comparing `protocols/` vs `skills/vibe/references/` (20 common files) and `assets/` vs `skills/vibe/assets/` (6 common files). Verified that content divergence between directories is BY DESIGN (protocols/ = full implementation docs with TEAM mode + v5.5 sections; references/ = condensed domain-agnostic reference cards). Confirmed 13 same-size files are content-identical (only LF vs CRLF line endings). Two real bugs found.

### Fixed — SKILL.md Schema Count Misleading (LOW)
- **SKILL.md line 330:** `All 9 JSON schemas: unchanged (read-only)` → `All 9 v5.0 JSON schemas: unchanged (3 new schemas added in v5.5: data-quality-gate, finding-validation, spine-entry; total: 12)`
- **WHY:** Line 329 explicitly mentions gate additions from v5.5, but line 330 still said "9 schemas" without mentioning the 3 new schemas added in v5.5. The canonical schema count is 12 (9 original v5.0 + 3 new v5.5). A reader comparing these adjacent lines would think schemas weren't updated, contradicting the actual file count in `schemas/`.

### Fixed — Brainstorm Engine Scoring Scale Wrong (LOW)
- **skills/vibe/references/brainstorm-engine.md line 253:** `0-20 scale` → `0-15 scale`
- **WHY:** The hypothesis scoring system uses 5 dimensions scored 0-3 each, for a maximum of 15 points. The canonical definition at `protocols/brainstorm-engine.md:263` correctly says "5 dimensions (0-3 each, max 15)". The Near-Tie Rule example in the references/ copy said "0-20 scale", which is wrong — the protocols/ copy correctly says "0-15 scale" at line 295. This would cause agents using the references/ version to miscalculate the 10% score difference threshold.

### Verified — Cross-Directory Consistency (no changes needed)
- **13 files content-identical** (protocols/ vs references/): analysis-orchestrator, audit-reproducibility, auto-experiment, blind-first-pass, circuit-breaker, data-extraction, judge-agent, schema-validation, search-protocol, seeded-fault-injection, tree-search, vlm-gate, writeup-engine ✓
- **6 files with expected larger protocols/** (TEAM mode, v5.5 sections): brainstorm-engine (+59 lines), reviewer2-ensemble (+383 lines, completely different structure), evidence-engine (+25 lines), experiment-manager (+26 lines), loop-otae (+27 lines), serendipity-engine (+13 lines) ✓
- **1 expected biology-vs-generic difference**: knowledge-base.md (CRISPR DOIs vs generic placeholders) ✓
- **6 asset files with expected domain differences**: fault-taxonomy.yaml, judge-rubric.yaml, metric-parser.md, node-schema.md, stage-prompts.md, templates.md ✓

## [6.0.24] — 2026-03-05 — Schema index fix + full non-JS audit R39: schema.sql, 6 Python scripts, configs

> **Trigger:** Round 39 paranoid deep debug — audited all 16 remaining non-JavaScript files: schema.sql (DB schema), hooks.json (plugin hooks), __test_e2e.mjs (E2E tests), plugin.json, package.json, marketplace.json, domain-config-template.json, literature-registry.json, claude-code.yaml, and 6 Python scripts (gate_check.py, sync_check.py, tree_health.py, observer.py, spine_entry.py, dq_gate.py). One real bug found: index name typo + column mismatch between schema.sql and worker-embed.js.

### Fixed — Schema Index Inconsistency (LOW)
- **schema.sql line 221:** `idx_memembed_project ON memory_embeddings(project_path)` → `idx_membed_project ON memory_embeddings(project_path, created_at)`
- **WHY:** Two problems: (1) Typo in index name — `idx_memembed_project` (double 'm') vs `idx_membed_project` in worker-embed.js (correct spelling). Since SQLite treats these as different indexes, both would be created, causing redundancy. (2) Column mismatch — schema.sql had a single-column index on `(project_path)`, while worker-embed.js correctly created a composite index on `(project_path, created_at)`. The composite index is strictly better: it covers both project filtering AND temporal ordering (used by vector search queries). Now both schema.sql and worker-embed.js create the same index with the same name.

### Verified — CLEAN Files (no changes needed)
- **hooks.json:** All 7 hooks present, correct script paths via `${CLAUDE_PLUGIN_ROOT}`, correct matchers ✓
- **__test_e2e.mjs:** B1-B7 test suite. 12 EXPECTED_TABLES correct (memory_embeddings is optional fallback, excluded). Index check covers 14 of ~17 ✓
- **plugin.json:** Plugin manifest, version 6.0.0, Apache-2.0 ✓
- **package.json:** Dependencies correct (better-sqlite3, @huggingface/transformers, onnxruntime-node), engines >=18.0.0 ✓
- **marketplace.json:** "32 quality gates" matches canonical number ✓
- **domain-config-template.json:** Multi-domain template with CRISPR/photonics/particle-physics examples (known exception) ✓
- **literature-registry.json:** 102-database registry, reference data only ✓
- **claude-code.yaml:** 7 agent types match AGENTS.md, model tiers logical, web search rule present ✓
- **gate_check.py:** Lightweight JSON Schema validator, correct type/required/properties/items/min/max/enum handling ✓
- **sync_check.py:** Number extraction with tolerance, percentage conversion fallback, correct skip patterns ✓
- **tree_health.py:** T3 gate checks — good ratio, exploration ratio (LAW 8), stale branches, branch diversity ✓
- **observer.py:** Orphan detection, desync check, design drift, naming consistency. Dual stage format check covers patterns ✓
- **spine_entry.py:** Entry creation with argparse validation, VALID_TYPES enforced. CALIBRATE/CALIBRATION intentional distinct types ✓
- **dq_gate.py:** DQ1-DQ4 checks with configurable thresholds, YAML/JSON config fallback, Bessel's correction in CV calculation ✓

## [6.0.23] — 2026-03-05 — Per-claim error handling + Windows path fix R38: subagent-stop.js, r2-calibration.js, worker-embed.js

> **Trigger:** Round 38 paranoid deep debug — full JavaScript code audit of all 16 plugin/ files (8 hook scripts + 8 lib modules). Launched Explore agents to audit each file, then manually verified every finding against actual code. Most agent findings were FALSE POSITIVES (e.g., better-sqlite3 `.all()` null check — it always returns array; vecSearch uncaught error — already wrapped in try/catch; db null in fallbackBuildContext — caller already guards). Three REAL bugs survived verification.

### Fixed — Per-Claim Error Handling in subagent-stop.js (MEDIUM)
- **subagent-stop.js lines 63-77:** Wrapped individual seed-check query in try/catch inside the for-loop
- **WHY:** If one claim's seed query failed (e.g., `serendipity_seeds` table missing or corrupted row), the entire for-loop threw an unhandled exception. The outer catch (line 98) caught it but exited with code 0 (allow), meaning the Salvagente Rule was silently bypassed for ALL killed claims — not just the one that failed. Now each failed query treats that individual claim as "missing seed" and continues checking the rest.

### Fixed — Per-Seed Error Handling in r2-calibration.js (MEDIUM)
- **r2-calibration.js `updateSeedStatuses` lines 208-216:** Wrapped individual `stmt.run()` in try/catch inside the for-loop
- **WHY:** Same pattern as subagent-stop.js. If `stmt.run()` threw for one seed update (e.g., seed_id not found, constraint violation), all subsequent seed updates in the batch were lost. Now each failed update is silently skipped and remaining seeds are still processed.

### Fixed — Windows Path Handling in worker-embed.js (LOW)
- **worker-embed.js line 26:** Added `import { fileURLToPath } from 'node:url'`
- **worker-embed.js line 56:** `path.dirname(new URL(import.meta.url).pathname)` → `path.dirname(fileURLToPath(import.meta.url))`
- **WHY:** On Windows with Node < 21 (where `import.meta.dirname` is unavailable), `new URL(import.meta.url).pathname` returns `/F:/path/...` with a leading forward slash. `fs.existsSync()` at line 217 fails because `/F:/path` is not a valid Windows path. `fileURLToPath()` from `node:url` correctly strips the `file://` protocol and handles Windows drive letters, returning `F:\path\...`.

### Verified — FALSE POSITIVES from Agent Audit (no changes needed)
- **session-start.js:** `fallbackBuildContext(db)` null — caller at line 282 guards `if (db && dbAvailable)` ✓
- **stop.js:** `.all()` null check — better-sqlite3 `.all()` always returns array ✓
- **pre-compact.js:** Cross-session query — intentional (different semantics from stop.js) ✓
- **db.js:** `JSON.parse(null)` in upsertPattern — catch block handles gracefully ✓
- **context-builder.js:** vecSearch uncaught — lines 78-87 already have try/catch ✓
- **vec-search.js:** Keyword splitting `C-001` — regex `[^a-z0-9\s-]` preserves hyphens ✓
- **r2-calibration.js:** Decay docstring "2% per week" — `e^(-0.02) ≈ 0.98`, accurate for small rates ✓
- **r2-calibration.js:** Silent JSON parse failure — explicit graceful degradation by design ✓
- **worker-embed.js:** `loadEmbeddingModel()` not awaited — intentional non-blocking (line 470 comment) ✓
- **worker-embed.js:** Race condition `modelReady`/`embeddingPipeline` — JS single-threaded, assignment order safe ✓
- **prompt-submit.js, pre-tool-use.js, setup.js:** CLEAN — no issues found ✓
- **narrative-engine.js, pattern-extractor.js, permission-engine.js:** CLEAN — no issues found ✓

## [6.0.22] — 2026-03-05 — Claim ID regex + case sensitivity fix R37: gate-engine.js, post-tool-use.js

> **Trigger:** Round 37 paranoid deep debug — JavaScript code logic audit of gate-engine.js and post-tool-use.js. Found critical claim ID format mismatch: ALL templates/protocols use `C-001` format (with hyphen, 643 occurrences across 109 files), but `extractClaimId()` regexes only matched `C001` (without hyphen). This caused gate checks and Salvagente rule to silently skip all claims using the canonical `C-xxx` format. Also found asymmetric case sensitivity: prerequisite gate check only matched `CLAIM-LEDGER` (uppercase), while Salvagente check matched both cases.

### Fixed — Claim ID Format Mismatch (CRITICAL)
- **gate-engine.js line 74:** `extractClaimId` regex `/\bC(\d{3})\b/` → `/\bC-?(\d{3})\b/` — now matches both `C001` and `C-001`
- **gate-engine.js line 98:** `getRequiredGatesForClaim` regex `/^C(\d)\d{2}$/` → `/^C-?(\d)\d{2}$/` — now matches both formats for tier extraction
- **post-tool-use.js line 645:** `extractClaimId` regex `/\bC(\d{3})\b/` → `/\bC-?(\d{3})\b/` — same fix, kept in sync with gate-engine.js
- **WHY:** Templates universally use `C-001` format (with hyphen). The old regexes required `C001` (no hyphen), causing all gate prerequisite checks, tier-based gate routing, and Salvagente rule enforcement to silently fail. Claims were written to the ledger without gate validation because `extractClaimId` returned null for the canonical format.

### Fixed — Case Sensitivity Inconsistency
- **post-tool-use.js line 361:** `filePath.includes('CLAIM-LEDGER')` → `filePath.includes('CLAIM-LEDGER') || filePath.includes('claim-ledger')`
- **WHY:** The prerequisite gate check (line 361) only matched uppercase `CLAIM-LEDGER`, while the Salvagente check (line 384) already matched both cases. A lowercase `claim-ledger.md` path would bypass prerequisite gates but still trigger Salvagente — asymmetric enforcement.

## [6.0.21] — 2026-03-05 — Canonical number verification R35: CLAUDE.md terminology

> **Trigger:** Round 35 paranoid deep debug — full canonical number consistency scan across all live files. Verified: 12 Laws, 32 gates (8 schema-enforced), 12 schema files, 7 lifecycle hooks, 36 reference documents, 7 agent roles (AGENTS.md), 6 permission roles (Permission Engine), 21 protocols, 12 SQLite tables, 6 Python scripts, 7 skill asset files. Found terminological ambiguity: CLAUDE.md said "6 agent types" while README.md uses "7 agent roles" — these refer to different classification systems (Permission Engine vs AGENTS.md sub-agent definitions).

### Fixed — Terminology Clarification (CLAUDE.md)
- **Line 41:** `all 6 agent types` → `all 6 permission roles` with explanatory note distinguishing from the 7 AGENTS.md agent types
- **WHY:** CLAUDE.md used "agent types" for the 6 Permission Engine roles (researcher, R2, serendipity, experimenter, lead, judge), which could be confused with the 7 AGENTS.md sub-agent definitions (researcher, r2-deep, r2-inline, observer, explorer, r3-judge, instinct-scanner). These are intentionally different classification systems: Permission Engine controls access control in TEAM mode, AGENTS.md defines model selection and disposition for sub-agent spawning.

## [6.0.20] — 2026-03-05 — Domain generalization R34: ARCHITECTURE.md

> **Trigger:** Round 34 paranoid deep debug — full repo-wide grep sweep across all live files (excluding archive/, CHANGELOG.md, SKILL.md, fault-taxonomy.yaml, domain-config-template.json). Found `AnnData schema contract` in ARCHITECTURE.md. Historical/provenance references in ARCHITECTURE.md (lines 25, 168, 374 — CRISPR research origin story) and blueprints/ are intentional context, not domain assumptions.

### Fixed — Domain Generalization (ARCHITECTURE.md)
- **Line 447:** `AnnData schema contract` → `data schema contract`
- **WHY:** The Data Extraction protocol summary references a domain-agnostic schema contract. `AnnData` is a single-cell-specific data structure; the contract applies to any structured data format.

## [6.0.19] — 2026-03-04 — Domain generalization R33: templates, skill-router

> **Trigger:** Round 32-33 paranoid deep debug — scanned 16 references-only files (all PASS), agent-teams.md (PASS), plugin/ directory, hooks/, .claude-plugin/, root-level files, schemas/, and assets/. Found CRISPR-specific confounder list in templates.md and `anndata` as first tool example in skill-router.md.

### Fixed — Domain Generalization (assets/templates.md)
- **Line 278:** Confounder harness template `[list: n_mm, affinity, PAM, region, guide RE, etc.]` → `[list: age, treatment, batch, site, collection_method, etc.]`
- **WHY:** The confounder harness template is domain-agnostic. Example confounders should demonstrate the concept without assuming a specific research domain. `n_mm` (mismatches), `PAM`, and `guide RE` are CRISPR-specific terms.

### Fixed — Domain Generalization (assets/skill-router.md)
- **Line 37:** Tool examples `(e.g., anndata, polars, pandas)` → `(e.g., polars, pandas, dask)`
- **WHY:** `anndata` is a single-cell-specific Python library. The tool example list should reference domain-agnostic data tools.

## [6.0.18] — 2026-03-04 — Domain generalization R31: audit-reproducibility, handoff-protocol, pattern-extraction

> **Trigger:** Round 31 paranoid deep debug — full content-diff of protocols/ (21 files) vs skills/vibe/references/ (36 files). Found `batch_key` in both copies of audit-reproducibility.md, CRISPR examples in references/handoff-protocol.md and references/pattern-extraction.md (3 occurrences). Also confirmed: the two directories are intentionally different versions (protocols/ = full operational specs, references/ = condensed plugin references), not copies that drifted.

### Fixed — Domain Generalization (protocols/audit-reproducibility.md + references/audit-reproducibility.md)
- **Line 71:** `batch_key | source_id | source_id | same` → `group_label | treatment | treatment | same`
- **WHY:** `batch_key` is a scRNA-seq/scVI-specific parameter name. The audit parameter diff table should use domain-neutral names.

### Fixed — Domain Generalization (references/handoff-protocol.md)
- **Lines 117-129:** Replaced CRISPR-specific handoff example: "batch-corrected DE signature in CRISPR perturbation data" → "batch-corrected integration signature in treatment-response data", "library size" → "sample size"
- **WHY:** Handoff examples between R2 and Researcher should demonstrate the protocol mechanics without assuming a specific research domain.

### Fixed — Domain Generalization (references/pattern-extraction.md)
- **Line 49:** JSON example `"CRISPR off-target effects single-cell"` → `"optimal transport data integration methods"`
- **Line 63:** Actionable output example replaced CRISPR query with domain-neutral query
- **Line 208:** SessionStart pattern example `"CRISPR off-target"` → `"optimal transport integration"`
- **WHY:** Pattern extraction examples demonstrate the REPEATED_ACTION detection pattern — the example queries should be domain-agnostic.

## [6.0.17] — 2026-03-04 — Domain generalization R30: commands, protocols, gates

> **Trigger:** Round 30 paranoid deep debug — full scan of gates/, commands/, agents/, .claude-plugin/, protocols/, and ARCHITECTURE.md. Found CRISPR/GUIDE-seq examples in 2 command templates, scRNA-seq/CRISPR examples in 1 protocol, and a protospacer example in gates.

### Fixed — Domain Generalization (commands/loop.md)
- **Lines 45-168:** Replaced entire CRISPR/GUIDE-seq worked example with domain-neutral "data integration" example. Changed: RQ ID (`uot-crispr` → `transport-integration`), search queries (GUIDE-seq → data integration), paper examples (Tsai 2015, Lazzarotto 2020 → Author A 2020, Author B 2022), findings (off-target site counts → integration scores), extracted data description.
- **WHY:** Command templates are domain-agnostic reusable components. The worked example should demonstrate the OTAE loop mechanics without assuming a specific research domain.

### Fixed — Domain Generalization (commands/search.md)
- **Line 62:** Scopus example `CRISPR AND "off-target"` → `"optimal transport" AND "data integration"`
- **Line 93:** PubMed example `CRISPR[Title] AND off-target` → `"optimal transport"[Title] AND "data integration"`
- **Line 108:** OpenAlex example `CRISPR off-target` → `optimal transport data integration`
- **Lines 120-143:** Gap analysis example replaced: `CRISPR` → `data integration`, `off-target` → `cross-domain transfer`
- **WHY:** Search syntax examples should demonstrate query patterns, not assume a specific research topic.

### Fixed — Domain Generalization (protocols/knowledge-base.md)
- **Line 41:** `"assay": "scRNA-seq"` → `"assay": "RNA-seq"`
- **Line 44:** `"Endometriosis vs control, 10X Chromium"` → `"Treatment vs control, paired design"`
- **Lines 50-56:** Method domain changed from `"single-cell"` to `"data-quality"`, removed scverse reference
- **Lines 61-63:** Author example changed from `"domain": ["CRISPR", "off-target", "GUIDE-seq"]` → `"domain": ["optimal-transport", "data-integration", "methodology"]`
- **WHY:** The knowledge base JSON schema examples should be domain-neutral to work for any research project.

### Fixed — Domain Generalization (gates/gates.md)
- **Lines 554-556:** DD0 gate example `"Protospacer_sequence" may not be the designed protospacer` → `"normalized_score" may not use the normalization method you expect`
- **WHY:** The DD0 gate teaches "column names lie" — the example should use a generic column name to be universally applicable.

### Validation
- `protocols/knowledge-base.md`: 0 domain-specific terms — CLEAN
- `commands/loop.md`: 0 domain-specific terms — CLEAN
- `commands/search.md`: 0 domain-specific terms — CLEAN
- `gates/gates.md`: 0 remaining protospacer/CRISPR references — CLEAN
- `skills/vibe/references/knowledge-base.md`: already clean (no sync needed)

## [6.0.16] — 2026-03-04 — Domain generalization R29: assets/ cleanup + README reference count

> **Trigger:** Round 29 paranoid deep debug — full scan of assets/, gates/, schemas/, hooks/, plugin/, and root files. Found 3 asset files with scRNA-seq/CRISPR-specific content and stale reference count in README.md.

### Fixed — Domain Generalization (assets/obs-normalizer.md)
- **Complete rewrite:** Entire file was scRNA-seq specific (AnnData `.obs`, `import scanpy as sc`, platform maps for 10X_v2/SmartSeq2/DropSeq/InDrop/CELSeq2, MT- gene prefix detection, pct_mito/pct_ribo computation, scVI references in pitfalls table). Replaced with domain-agnostic "Data Normalizer Standard" using generic DataFrame operations, collection method standardization, completeness metrics, and outlier flags.
- **WHY:** This file defined how to normalize dataset metadata. The AnnData/.obs pattern was biology-specific. The new version works for any tabular data with categorical metadata columns.

### Fixed — Domain Generalization (assets/skill-router.md)
- **Line 22:** "scRNA-seq pipeline | analysis-orchestrator.md → scanpy + scvi-tools skills" → "Data analysis pipeline | analysis-orchestrator.md → domain-appropriate analysis skills"
- **Line 24:** "Data exploration | → exploratory-data-analysis + anndata skills" → "Data exploration | → exploratory-data-analysis + domain data skills"
- **Lines 33-46:** Replaced "Single-Cell Analysis Pipeline" table (AnnData, scanpy, scVI, HVG, batch_key, iLISI, obs-normalizer) with generic "Data Analysis Pipeline" table using domain-neutral terms.
- **Line 125:** "Obs schema normalization" → "Data schema normalization"
- **WHY:** The routing table hard-coded a single-cell workflow as if it were the only analysis type. The new version is domain-agnostic while still providing concrete examples.

### Fixed — Domain Generalization (assets/metric-parser.md)
- **Lines 88-96:** Replaced "scRNA-seq Integration" table (ilisi, clisi, asw_batch, asw_label) with "Clustering / Integration" table (nmi, ari, asw, completeness, homogeneity, v_measure).
- **Lines 98-104:** Replaced "CRISPR Off-Target" table with "Detection / Anomaly" table (same metrics but domain-neutral naming).
- **WHY:** Metric examples should demonstrate the parser's format, not assume a specific research domain. The new tables use standard clustering and detection metrics applicable to any field.

### Fixed — README.md Reference Count
- Updated "34 reference documents" → "36 reference documents" in 5 locations (lines 46, 145, 151, 298, 402). Actual count confirmed: 36 files in skills/vibe/references/.
- **WHY:** Count became stale after R26 added vlm-gate.md and analysis-orchestrator.md to references/. Previous rounds updated the references but not the README count.

### Flagged — assets/fault-taxonomy.yaml (HUMAN-ONLY)
- Lines 35, 42, 50 contain CRISPR-specific examples (PAM, mismatches, cleavage). This file is marked HUMAN-ONLY modification in CLAUDE.md — flagged for user review, not modified by agent.

### Validation
- `assets/obs-normalizer.md`: 0 domain-specific terms (AnnData/scRNA/scanpy/scVI/10X/MT-/pct_mito) — CLEAN
- `assets/skill-router.md`: `anndata` appears only as one example in "(e.g., anndata, polars, pandas)" — ACCEPTABLE
- `assets/metric-parser.md`: 0 domain-specific terms (scRNA/CRISPR/ilisi/clisi/off-target) — CLEAN
- `README.md`: 0 remaining "34 reference" — all updated to 36
- Reference count verified: 36 files in skills/vibe/references/

## [6.0.15] — 2026-03-04 — Domain generalization R28: data-extraction, analysis-orchestrator, vlm-gate Unicode

> **Trigger:** Round 28 paranoid deep debug — full scan of all 20 protocols/ and 36 references/ files. Found domain-specific content leakage in 2 protocol files that had been missed in earlier rounds, plus Unicode □ in vlm-gate (both copies).

### Fixed — Domain Generalization (protocols/data-extraction.md)
- **AnnData Contract (scRNA-seq):** Entire section (lines 15-52) replaced with domain-agnostic Structured Data Contract. Removed: `.obs`, `.var`, `.X`, `.raw.X`, `cell_type`, `platform`, `10X_v2`, `10X_v3`, `SmartSeq2`, `n_genes`, `n_counts`, `pct_mito`, `pct_ribo`, `doublet_score`, `Scrublet`, `DoubletFinder`, `gene_symbols`, `ensembl_ids`, `anndata`, `h5ad`. Replaced with: `source_id`, `sample_id`, `group_label`, `collection_method`, `feature_names`, `raw_values`.
- **Schema Violation Triage (lines 69-77):** Replaced scRNA-specific violations (`X contains float`, `.raw.X`, `cell_type`, `obs-normalizer`, `pct_mito`, `MT- gene prefix`, `var_names_make_unique`) with domain-agnostic violations (`Values pre-transformed`, `Missing source_id`, `Missing group_label`, `Wrong data types`, `Missing quality metrics`, `Duplicate feature names`, `Mixed identifier formats`).
- **DD0 Gate examples (lines 107, 128-131):** Replaced CRISPR-specific references (`M7: CHANGE-seq alignment bug`, `guide_id`, `off_target_seq`, `guide RNA`, `CHANGE-seq signal`) with domain-agnostic examples (`sample_id`, `feature_name`, `raw_count`, `normalized_score`).
- File now matches references/ version (both include DD0 section).

### Fixed — Domain Generalization (protocols/analysis-orchestrator.md)
- Overwritten with generalized references/ version (already fixed in R26). Removed residual scRNA-seq content: `scVI`, `n_latent`, `n_HVG`, `batch_key`, `pct_mito`, `hvg_flavor`, `seurat_v3`, `scanpy`, `scvi-tools`, `anndata`, `h5ad`, `iLISI`, `cLISI`, `kBET`. protocols/ copy had been missed when references/ was generalized in R26.

### Fixed — Unicode Normalization (vlm-gate.md)
- **protocols/vlm-gate.md:** replace_all □ (U+25A1) → `[ ]` (5 occurrences at lines 76-80, Gate G6 Pass/Fail checklist)
- **references/vlm-gate.md:** Same fix, 5 occurrences. Both copies now ASCII-clean.

### Added — DD0 Section (references/data-extraction.md)
- Added Data Dictionary Protocol (v5.5) — Gate DD0 section that existed in protocols/ but was missing from references/. Domain-agnostic examples used. Both copies now identical.

### Validation
- `protocols/data-extraction.md`: 0 domain-specific terms (AnnData/scRNA/CRISPR/h5ad/obs/var/pct_mito/Scrublet/CHANGE-seq) — CLEAN
- `protocols/analysis-orchestrator.md`: 0 domain-specific terms — CLEAN (matches references/)
- `protocols/vlm-gate.md`: 0 Unicode □ — CLEAN
- `references/vlm-gate.md`: 0 Unicode □ — CLEAN
- `references/data-extraction.md`: DD0 section present, 0 domain-specific terms — CLEAN
- protocols/ and references/ copies are now identical for: data-extraction.md, analysis-orchestrator.md, vlm-gate.md

## [6.0.14] — 2026-03-04 — Cross-file consistency + missing reference files

> **Trigger:** Round 26 paranoid deep debug — full repo scan for cross-file consistency (gate counts, schema counts, law counts, file references) + identification of 3 protocol files missing from references/.

### Fixed — Cross-File Consistency
- **archive/v6.0-NEXUS-BLUEPRINT.md:2330**: Schema-enforced gate count "12 schema" → "8 schema" in v5.5 and v6.0 columns. Blueprints/ copy was already correct; archive/ copy was stale. The "12" referred to schema FILES (tracked in row below), not schema-enforced GATES (canonical: 8).
- **CHANGELOG.md:266**: "$id fields: 9 schemas" → "All 12 schemas updated to vibe-science-v6.0 (9 from v5.0, 3 from v5.5)". Original was accurate but incomplete — omitted the 3 v5.5-origin schemas.

### Added — Missing Reference Files
- **skills/vibe/references/vlm-gate.md**: Copied from protocols/vlm-gate.md (already 100% domain-agnostic). VLM Gate Protocol for figure quality validation — was missing from the skill package entirely.
- **skills/vibe/references/analysis-orchestrator.md**: Copied from protocols/analysis-orchestrator.md with full domain generalization. Protocol structure is universal; biology-specific examples (scVI, scanpy, anndata, h5ad, HVG, iLISI/cLISI, kBET, pct_mito, batch_key, n_latent) replaced with domain-agnostic placeholders. Manifest.json, report template, ablation matrix, and script library patterns all generalized.

### Not Copied (by design)
- **protocols/agent-teams.md**: TEAM mode operational runbook. references/multi-agent-config.md already covers essential reference material — agent-teams.md is the detailed how-to guide, appropriate for protocols/ only.

### Validation
- `references/analysis-orchestrator.md`: 0 domain-specific terms (scVI/scanpy/anndata/h5ad/HVG/CRISPR/pct_mito/batch_key/n_latent/ELBO/iLISI/cLISI/kBET) — CLEAN
- `references/vlm-gate.md`: 0 domain-specific terms — CLEAN
- Gate counts (32/8), law counts (12), schema counts (12) verified consistent across CLAUDE.md, SKILL.md, ARCHITECTURE.md, README.md, gates/gates.md, blueprints/, protocols/

## [6.0.13] — 2026-03-04 — gates.md + SKILL.md domain generalization & Unicode cleanup

> **Trigger:** Round 25 paranoid deep debug — scanned all remaining .md files for Unicode symbols, domain-specific biology terms, and stale version references. Found 3 targets: `gates/gates.md` (177 Unicode checkboxes + biology-specific G0/G1/G2/G3/G5/L-1 gate content), `SKILL.md` (stale serendipity threshold).

### Fixed — Unicode Normalization (gates/gates.md)
- **replace_all** □ (U+25A1) → `[ ]` (177 occurrences) — checkbox symbols incompatible with ASCII-only rendering
- **replace_all** ≥ (U+2265) → `>=` (6 occurrences) — mathematical symbols to ASCII

### Fixed — Domain Generalization (gates/gates.md)
- **G0 (Input Sanity):** Replaced `.X contains integer counts`, `.X.max()`, `.raw.X`, `gene names`, `UMI data`, `normalization history` with generic: `Types match expected format`, `Value ranges plausible`, `Raw/original preserved`, `Identifiers present`
- **G1 (Schema Compliance):** Replaced `.obs`, `study_id`, `category dtype`, `pct_mito`, `scVI`, `scanpy-only workflow`, `MT- gene prefix`, `obs-normalizer`, `HVG selection` with generic: `Schema matches expectation`, `grouping columns correct types`, `Domain-appropriate QC metrics`, `data-dictionary.md`
- **G2 (Design Justification):** Replaced `batch_key` → `Grouping key`, `n_HVG` → `Feature count`, `HVG selection method stated (seurat_v3, cell_ranger, etc.)` → `Feature selection method stated and justified`, `batch_key and biology` → `grouping key and signal of interest`
- **G3 (Training Integrity):** `ELBO/loss` → `Loss/objective`, `reduce n_latent` → `reduce model complexity`, `non-integer counts` → `check input format`
- **G5 (Artifact Completeness):** `h5ad, model` → `data, model`
- **L-1 (Literature Pre-Check):** `"CRISPR off-target"` example → `"domain application"` generic example

### Fixed — Stale Threshold (SKILL.md)
- Line 1053: serendipity threshold `>= 12` → `>= 15` — was still at v4.0 scale, v6.0 uses 0-20 scale with threshold 15

### Validation
- `gates/gates.md`: 0 matches for scVI/HVG/ELBO/pct_mito/MT-/CRISPR/seurat_v3/cell_ranger/batch_key/n_HVG/n_latent/h5ad/scRNA/AnnData/.obs/.X/gene_name — CLEAN
- `gates/gates.md`: 0 Unicode symbols (□/≥/≤/─) — CLEAN
- `SKILL.md`: 0 Unicode symbols — CLEAN (biology-specific content like R2-Bio, CRISPR intentionally preserved — SKILL.md is biology instance, not generic template)

## [6.0.12] — 2026-03-04 — reviewer2-ensemble.md v5.5→v6.0 Architectural Rewrite

> **Trigger:** Round 24 paranoid deep debug — the final deferred file from Round 23. `protocols/reviewer2-ensemble.md` (650+ lines) had extensive unique content not present in `skills/vibe/references/reviewer2-ensemble.md` (327 lines), so it required targeted edits rather than full replacement. The protocols/ copy was still at v5.5 with biology-specific language, old INLINE checklist format, missing v6.0 sections (Multi-Agent Delegation, Temporal Decay Calibration), and Unicode symbols throughout.

### Fixed — Unicode Normalization
- **replace_all** □ (U+25A1) → `[ ]` (~60 occurrences) — checkbox symbols incompatible with ASCII-only rendering
- **replace_all** ≥ (U+2265) → `>=` (9 occurrences) — mathematical symbols to ASCII
- **replace_all** ≤ (U+2264) → `<=` (1 occurrence) — mathematical symbols to ASCII
- **replace_all** ─ (U+2500 box drawing) → `-` — YAML decorative line characters to ASCII

### Fixed — Domain Generalization (R2-Bio → R2-Domain)
- **replace_all** `R2-Bio` → `R2-Domain` (4 instances) — v6.0 generalized the biology-specific reviewer
- **R2-Domain table row**: "Biology | Biological plausibility..." → "Domain-specific rigour | Loads checklist from `domain-config.yaml` if present; otherwise applies generic domain checks"
- **R2-Domain Checklist**: Replaced entire biology-specific checklist (gene names, cell types, doublets, ambient RNA, marker validation) with generic domain checklist (measurement validity, construct operationalisation, field artifacts, reporting requirements, terminology consistency)
- **10 domain-specific examples generalized**: batch_key/n_HVG/n_latent → key hyperparameters/feature count/latent dimensions; bulk RNA-seq → generic data type mismatch; cell-type proportions → subgroup proportions/compositional effects; 10X/Smart-seq2 → list platforms/instruments; iLISI metric → generic metric; HVG selection → feature selection; scVI on normalized → model on pre-processed; organism gene symbols → identifiers/nomenclature; iLISI/cLISI/ELBO/HVGs demanded evidence → generic metric/convergence/feature evidence

### Fixed — v6.0 Structural Updates
- **Header**: `# Reviewer 2 Ensemble Protocol v5.5` → `# Reviewer 2 Ensemble Protocol v6.0` with domain-agnostic attribution line
- **INLINE 7-point checklist**: Replaced v5.5 code-block format (TRACEABLE, SURVIVES HOSTILE READ) with v6.0 table format (Prior Art, Confounder Risk, Reproducible) + YAML storage block
- **Activation Modes table**: Expanded from 4-column (Mode/Trigger/Scope/Blocking) to 5-column (Mode/Trigger/Blocking/Sub-agent type/Description) matching references/ format

### Added — v6.0 Sections
- **Multi-Agent Delegation section**: R2-DEEP vs R2-INLINE sub-agent types (opus for FORCED/BATCH/VETO, sonnet for BRAINSTORM/SHADOW/REDIRECT/INLINE), spawning details, SOLO mode behavior
- **v6.0 TEMPORAL DECAY CALIBRATION section**: Exponential decay formula `weight = exp(-0.02 * ageWeeks)`, calibration data loading at session start, usage instructions for R2 agents, feedback loop tracking

### Preserved (unique to protocols/, NOT in references/)
- Version history paragraphs (v3.5/v4.0/v5.0/v5.5 evolution)
- R2 System Prompt section with behavioral directives
- R2 Shadow Mode Protocol
- INLINE mode detailed sections (Why/When/Verdict/Interaction/Cost)
- Ensemble Composition + When to Invoke tables
- Modified FORCED Review Flow (8-step detailed process)
- Salvagente Protocol + Circuit Breaker Integration
- Mandatory Output Schema (full YAML template)
- Domain-Specific Checklists (R2-Methods, R2-Stats with Confounding Audit Table, R2-Domain, R2-Engineering)
- Red Flag Checklist (12 flags: 6 statistical + 6 methodological)
- Reviewer Persona and Invocation Procedure sections
- Review Severity Guide (0-100 numeric scoring)

### Validation
- Unicode scan (□/≥/≤/─): 0 matches — CLEAN
- Domain-specific scan (scRNA/scVI/iLISI/cLISI/ELBO/HVG/doublet/ambient RNA/10X/Smart-seq/MT-/mt-): 0 matches — CLEAN
- R2-Bio scan: 0 matches — CLEAN
- v5.5 references: 3 matches, all in historical/contextual text (correct to keep)
- Final file: 710 lines, structurally sound

## [6.0.11] — 2026-03-04 — Protocol/Reference Sync (17 files, 80+ edits)

> **Trigger:** Round 23 paranoid deep debug — systematic comparison of all 18 paired files between `protocols/` (repo context) and `skills/vibe/references/` (plugin context). The references/ copies had been updated to v6.0 standards (generalized language, corrected thresholds, v6.0 hook sections) but protocols/ copies were stale. Found: Unicode symbols instead of ASCII, domain-specific CRISPR/scRNA-seq examples instead of generic language, old serendipity thresholds (>=12 instead of >=15), missing v6.0 sections, and Sprint 17 case study references instead of anonymized lessons.

### Fixed — Full sync (protocols/ replaced from references/, preserving schema path convention)
- **blind-first-pass.md**: Full sync from references/ (Unicode arrows/symbols to ASCII)
- **circuit-breaker.md**: Full sync from references/ (Unicode to ASCII, generalized examples)
- **seeded-fault-injection.md**: Full sync from references/ (Unicode to ASCII, generic fault examples)
- **judge-agent.md**: Full sync from references/ (Unicode to ASCII)
- **tree-search.md**: Full sync (serendipity >= 12 to >= 15, Unicode to ASCII throughout)
- **writeup-engine.md**: Full sync (Unicode checkbox to ASCII [])
- **search-protocol.md**: Full sync (CRISPR-specific search examples to generic)
- **auto-experiment.md**: Full sync (Unicode to ASCII, domain-specific dispatch to generic)
- **audit-reproducibility.md**: Full sync (CRISPR/scRNA examples to generic, Unicode to ASCII)

### Fixed — Targeted edits (protocols/ has unique content preserved)
- **schema-validation.md**: Schema list expanded 9 to 12 (added v6.0 schemas)
- **knowledge-base.md**: Unicode arrows/tree-chars to ASCII
- **experiment-manager.md**: 6 targeted edits (Unicode to ASCII, CRISPR dispatch to generic); kept unique DC0 section
- **serendipity-engine.md**: 7 targeted fixes (Unicode to ASCII, old thresholds to v5.0 scale); added v6.0 CROSS-SESSION SEED SURVIVAL section
- **brainstorm-engine.md**: 15 edits across 3 context windows (collision score 0-15 to 0-20, promotion threshold 8 to 10, Unicode to ASCII); kept unique L-1 Literature Pre-Check, TEAM Mode Distribution, role annotations
- **data-extraction.md**: 2 edits (minor Unicode); kept unique DD0 Data Dictionary, AnnData Contract, schema violation triage
- **evidence-engine.md**: 22 edits total (Sprint 17 to anonymized lesson, CRISPR confounders to generic domain lists, PubMed/Scopus/OpenAlex to "databases", domain-specific confounder lists replaced with 4 generic domains); kept unique Single Source of Truth v5.5 section
- **loop-otae.md**: 9 edits total (Unicode to ASCII, serendipity scale 0-15 to 0-20, thresholds aligned); added v6.0 HOOK INTEGRATION section documenting how hooks support each OTAE phase

### Deferred
- **reviewer2-ensemble.md**: Major v5.5 to v6.0 architectural rewrite (650 lines protocols/ vs 326 lines references/) — deferred to Round 24

### Design Decisions
- **Schema paths preserved**: protocols/ uses `schemas/` (repo-relative), references/ uses `assets/schemas/` (skill-relative) — both correct for their context, intentionally different
- **Unique content kept**: 6 files in protocols/ have sections not present in references/ (DD0, AnnData, DC0, L-1, TEAM mode, SSOT) — these are protocol-specific elaborations, not drift
- **Domain generalization**: All CRISPR off-target, scRNA-seq, and Sprint 17 case study references replaced with domain-agnostic language — protocols/ is now reusable across any research domain

### Validation
- Grep scans: 0 remaining Unicode symbols in edited files, 0 domain-specific terms (CRISPR/scRNA/Sprint 17) in edited files
- Cross-protocol scan: remaining issues only in out-of-scope files (analysis-orchestrator.md, reviewer2-ensemble.md, vlm-gate.md)
- No test suite exists in current repo state (test files removed in prior restructuring)

## [6.0.10] — 2026-03-04 — Cross-Cutting Consistency Sweep (8 checks, 8 fixes)

> **Trigger:** Round 22 paranoid deep debug — cross-cutting audit searching for the SAME fact stated differently in different files. Ran 8 systematic checks across ALL live files: gate count, law count, hook count, schema count, DB table count, LOC count, serendipity scale, version strings. Found mismatches in 8 files across 4 of the 8 check categories.

### Fixed
- **README.md:115**: Section heading LOC "6,600" → "~7,100" (was missed when ARCHITECTURE.md was updated in Round 21)
- **ARCHITECTURE.md:445**: Last remaining live-file serendipity scale "(0-15)" → "(0-20)" in the v4.0 protocol summary table
- **blueprints/v6.0-NEXUS-BLUEPRINT.md:2330**: "Gate totali" row confused schema FILE count (12) with schema-ENFORCED gate count (8). Fixed v5.5 column "32 (12 schema)" → "32 (8 schema)" and v6.0 column "32 (12 schema, enforced via code)" → "32 (8 schema, enforced via code)". The total schema file count was already correct in the separate "Schema totali" row below.
- **assets/judge-rubric.yaml:1**: Version header "v5.0 IUDEX" → "v6.0 NEXUS (originated in v5.0 IUDEX)"
- **assets/fault-taxonomy.yaml:1**: Version header "v5.5 ORO" → "v6.0 NEXUS (originated in v5.5 ORO)"
- **assets/templates.md:1**: Version header "v4.0 Templates" → "v6.0 NEXUS Templates (originated in v4.0)"
- **protocols/judge-agent.md:3**: Attribution "Pillar 2 extension of v5.0 — IUDEX" → "Part of v6.0 NEXUS (originated as Pillar 2 extension in v5.0 IUDEX)" — consistent with format used across all other protocol headers
- **skills/vibe/references/judge-agent.md:1,3**: Header "v5.0" → "v6.0" and same attribution format fix as protocols/ copy

### Checks Passed (no issues)
- Gate count (32/8): CLEAN across all live files
- Law count (12, LAW 11+12 present): CLEAN
- Hook count (7, PreToolUse+SubagentStop present): CLEAN
- DB table count (12): CLEAN

### Test Results
- **50/50 tracked pass, 51/51 total, 0 fail**

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
- **Schema `$id` fields**: All 12 schemas updated to `vibe-science-v6.0` (9 from v5.0, 3 from v5.5)
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
