# Changelog

All notable changes to Vibe Science are documented here.

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
