# Quality Gates v5.0

> **v5.0 IUDEX upgrades**: 2 new gates (V0, J0), schema enforcement on 8 gates, exploration budget in T3, S5 poison pill. Total: 27 gates. 8 schema-enforced.

Blocking gates that stop-the-line if failed. No analysis proceeds past a failed gate. Fix first, re-gate, then continue.

## Gate Philosophy

Gates are not optional checks — they are **blocking barriers**. The pipeline cannot continue if a gate fails. This prevents the accumulation of errors that produce "beautiful but fragile" outputs.

v4.0 adds: Tree Gates (T0-T3), Brainstorm Gate (B0), and Stage Gates (S1-S5).

---

## Pipeline Gates (G0-G6)

### Gate 0 — Input Sanity

**When:** After loading data, before any processing.

```
PASS criteria (ALL must be true):
□ .X contains integer counts (dtype int32/int64, or float with all .0 values)
□ .X.max() is reasonable (typically < 50000 for UMI data)
□ .raw.X exists if .X has been transformed
□ No NaN/Inf in count matrix
□ Gene names are present and non-empty
□ n_cells > 0, n_genes > 0
□ File loads without error

FAIL actions:
- Float counts with non-integer values → STOP. Investigate normalization history.
- raw.X missing and X is float → STOP. Cannot proceed without raw counts.
- NaN in counts → STOP. Data corruption.
```

### Gate 1 — Schema Compliance

**When:** After QC filtering, before HVG selection.
**Route to:** `assets/obs-normalizer.md` for dtype fixes.

```
PASS criteria (ALL must be true):
□ .obs contains: study_id, sample_id (at minimum)
□ All categorical columns are dtype 'category' (not string/object)
□ Categories are frozen (no unused categories lingering)
□ No NaN in categorical columns used as batch/covariate keys
□ study_id has ≥2 levels (otherwise no batch to correct)
□ platform column present and consistent with known platform names
□ pct_mito computed and stored
□ Gene symbols unique (var_names_make_unique applied if needed)

FAIL actions:
- String dtypes in batch columns → Run obs-normalizer, re-gate
- NaN in batch_key column → Drop cells with NaN or impute from metadata, document decision
- Single-study data → Cannot use scVI for batch correction; switch to scanpy-only workflow
- Missing pct_mito → Compute from MT- gene prefix, add to .obs
```

### Gate 2 — Design Justification

**When:** After choosing batch_key, covariates, n_HVG. Before training model.

```
PASS criteria (ALL must be true):
□ batch_key choice justified with evidence (variance decomposition, PCA plot, or literature)
□ batch_key has between 2 and ~50 levels (too many → encoder overfitting risk)
□ categorical_covariates justified (not just "because they exist")
□ n_HVG choice justified (default=3000 is acceptable with documented reasoning)
□ HVG selection method stated (seurat_v3, cell_ranger, etc.)
□ Decision logged in decision-log.md with alternatives considered
□ Confounding between batch_key and biology assessed

FAIL actions:
- batch_key not justified → Run PCA variance decomposition, document, re-gate
- batch_key perfectly confounded with biology → STOP. Cannot separate batch from signal.
- Covariates correlated with batch_key → Document risk in ASSUMPTION-REGISTER.md
```

### Gate 3 — Training / Execution Integrity

**When:** After model training completes. Before using outputs.

```
PASS criteria (ALL must be true):
□ ELBO/loss converged (visual inspection of convergence plot)
□ No training-validation divergence (overfitting check)
□ Final loss is not NaN or Inf
□ Model saved successfully (model.pt exists and loads)
□ At least 2 seed replicates run (or 1 with documented justification)
□ Training completed without errors (stderr.log clean)
□ Memory usage did not cause silent OOM

FAIL actions:
- Non-convergence → Increase epochs, reduce learning rate, check data
- Overfitting (train-val gap > 10%) → Add regularization, reduce n_latent
- NaN loss → Data issue (likely non-integer counts or extreme outliers)
- Single seed only → Run second seed before accepting results
```

### Gate 4 — Metrics Decision

**When:** After computing integration/analysis metrics.

```
PASS criteria (ALL must be true):
□ Standard metric suite computed (mixing + conservation + clustering metrics)
□ Metrics contextualized (compared to baseline or previous run)
□ Direction of improvement documented
□ Trade-offs between metrics explicit (No Free Lunch)
□ Decision motivated with metric evidence
□ No metric gaming flagged

FAIL actions:
- One metric improved at significant cost to another → Investigate
- No baseline comparison → Compute baseline first
- Missing calibration assessment (if probabilistic model) → Compute ECE/Brier
```

### Gate 5 — Artifact Completeness

**When:** After run completion. Before marking run as valid.

```
PASS criteria (ALL must be true):
□ manifest.json present and valid
□ report.md present, following standard template
□ figures/ directory present with expected figures
□ metrics.json present with all computed values
□ output files present (h5ad, model, etc. as applicable)
□ scripts/ directory present
□ logs/ directory present

FAIL actions:
- Missing manifest → Run is invalid. Cannot audit. Regenerate.
- Missing figures → Generate from saved output before accepting
- Missing report → Generate from manifest + metrics before accepting
```

### Gate 6 — VLM Validation (OPTIONAL)

**When:** After figures are generated. If VLM access available.

```
PASS criteria:
□ Figures are readable (not garbled, not blank)
□ Axes are labeled with units
□ Trends visible in figures match quantitative metrics
□ Color schemes are colorblind-friendly
□ VLM quality score >= 0.6

FAIL actions:
- Garbled/blank figures → Regenerate
- Axes unlabeled → Fix and regenerate
- Trend-metric mismatch → Investigate (potential bug in figure generation)

OPTIONAL: If no VLM access, skip this gate. Not blocking.
```

---

## Literature Gates (L0-L2)

### Gate L0 — Source Validity
```
□ All cited DOIs verified (accessible via web_fetch)
□ No training-knowledge-only claims marked as DATA
□ All claims registered in CLAIM-LEDGER.md
□ Confidence scores computed (not guessed)
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/source-validity.schema.json`

### Gate L1 — Coverage Adequacy
```
□ ≥2 databases searched
□ ≥3 search strategies used (keyword, snowball, author trail, etc.)
□ Negative results documented (what was NOT found)
□ Source dedup applied (no double-counting)
```

### Gate L2 — Review Completeness
```
□ All major findings reviewed by ensemble
□ All FATAL FLAWS resolved or finding rejected
□ All DEMANDED EVIDENCE provided or finding downgraded
□ Counter-evidence explicitly searched for every conclusion
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/review-completeness.schema.json`

---

## Decision Gates (D0-D2)

### Gate D0 — Decision Justification
```
□ Decision logged in decision-log.md with DEC-YYYYMMDD-NNN format
□ ≥2 alternatives considered and documented with rejection reasons
□ Trade-offs explicitly stated (what we lose)
□ Reversibility assessed (HIGH/MEDIUM/LOW)
□ Affected claims listed (claim_ids)
□ Evidence-based justification (not opinion-based)
```

### Gate D1 — Claim Promotion
```
□ Claim has ≥1 verifiable source with DOI/PMID
□ Confidence computed with formula (not subjective)
□ Evidence floor gate passed (E ≥ 0.2)
□ Counter-evidence actively searched
□ Confounder harness completed (LAW 9) — raw, conditioned, matched
□ Dependencies checked (all depends_on claims are ≥ VERIFIED)
□ Assumptions listed and registered
□ At least 3 falsification attempts performed
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- E < 0.2 → Cannot promote. Seek verifiable source first.
- No confounder harness → BLOCK. Run harness before promotion (LAW 9).
- No counter-evidence search → Perform search, document results
- < 3 falsification attempts → Design and run additional tests
```
**Schema**: `schemas/claim-promotion.schema.json`

### Gate D2 — RQ Conclusion
```
□ All success/kill criteria from RQ.md explicitly addressed
□ All major claims R2-reviewed (final review completed)
□ No unresolved FATAL FLAWS from R2
□ All promoted claims have passed confounder harness (LAW 9)
□ CLAIM-LEDGER.md consistent (no UNVERIFIED claims cited in conclusion)
□ Cross-assay/cross-dataset validation attempted for generalizable claims
□ Knowledge base updated
□ PROGRESS.md complete (no gaps)
□ Reproducibility contract satisfied
□ Tree visualization final snapshot saved
□ Artifact validates against JSON Schema (structural completeness check)
```
**Schema**: `schemas/rq-conclusion.schema.json`

---

## Tree Gates (T0-T3) — NEW in v4.0

### Gate T0 — Node Validity
**When:** Before expanding a new tree node.

```
PASS criteria:
□ Node has a valid type (draft|debug|improve|hyperparameter|ablation|replication|serendipity)
□ Node has a valid parent (exists in TREE-STATE.json)
□ Node has a non-empty action plan (think_plan is not empty)
□ Node type is appropriate for current stage (e.g., hyperparameter only in Stage 2+)
□ Parent is not pruned

FAIL actions:
- Invalid type → Fix type assignment
- Invalid parent → Check tree structure integrity
- Empty action plan → Complete THINK phase before expanding
- Wrong type for stage → Select appropriate node type
```

### Gate T1 — Debug Limit
**When:** After a debug attempt on a buggy node.

```
PASS criteria:
□ debug_attempts <= 3 for the node being debugged
□ Each debug attempt addresses a DIFFERENT root cause (not repeating the same fix)
□ Debug attempt is documented with: what was tried, why, result

FAIL actions:
- debug_attempts > 3 → PRUNE the node. Mark as pruned with reason.
  Move on. Do not attempt a 4th fix.
- Same fix repeated → Document why, prune if no alternative approaches
```

### Gate T2 — Branch Diversity
**When:** When creating sibling nodes (multiple children of same parent).

```
PASS criteria:
□ Sibling nodes differ in at least 1 substantive parameter or approach
□ No exact duplicate configurations exist among siblings
□ Diversity documented (what differs between siblings)

FAIL actions:
- Duplicate configuration → Merge or differentiate
- All siblings doing the same thing → Introduce variation (different method, different features, different split)
```

### Gate T3 — Tree Health
**When:** Every 5 cycles, or after any node is pruned.

```
PASS criteria:
□ good_nodes / total_nodes >= 0.2 (at least 20% of nodes are productive)
□ No branch has 5+ consecutive non-improving nodes
□ At least 2 branches explored (LAW 8) unless tree_mode = LINEAR
□ Exploration ratio >= 0.20 (serendipity + draft + novel ablation nodes / total nodes)
  WARNING if < 0.20, FAIL if < 0.10 (LAW 8 quantified enforcement)

FAIL actions:
- Ratio < 0.2 → STOP expanding. R2 emergency review. Strategy revision.
  Do NOT add more nodes — the current approach is not working.
- 5+ non-improving → Soft-prune that branch. Try different approach.
- Single branch only → Create alternative branch (LAW 8: Explore Before Exploit)
- Exploration ratio < 0.20 → WARNING. Create exploration nodes before next expansion.
- Exploration ratio < 0.10 → FAIL. Must add exploration nodes before ANY further processing.
```

---

## Brainstorm Gate (B0) — NEW in v4.0

### Gate B0 — Brainstorm Quality
**When:** After Phase 0 BRAINSTORM completion, before any OTAE cycle.

```
PASS criteria (ALL must be true):
□ At least 3 gaps identified with evidence
□ At least 1 gap verified as not-yet-addressed (preprint check)
□ Data availability confirmed for chosen hypothesis (DATA_AVAILABLE >= 0.5)
□ Hypothesis is falsifiable (null hypothesis stated)
□ Predictions stated (if true → X, if false → Y)
□ R2 brainstorm review: WEAK_ACCEPT or better
□ User approved the chosen direction

B0 MUST PASS before any OTAE cycle begins.
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- Insufficient gaps → More literature search needed
- No verified gap → Check preprints on biorxiv
- DATA_AVAILABLE < 0.5 → Find better data source or adjust hypothesis
- Hypothesis not falsifiable → Reformulate with testable predictions
- R2 rejected → Address R2 demands, re-review
- User not consulted → Present options to user
```
**Schema**: `schemas/brainstorm-quality.schema.json`

---

## Stage Gates (S1-S5) — NEW in v4.0

### Gate S1 — Preliminary Investigation Exit
**When:** Evaluating readiness to advance from Stage 1 to Stage 2.

```
PASS criteria:
□ At least 1 good node with valid metrics exists
□ Metrics are meaningful (not trivially achieved)
□ Multi-seed validation of best node (minimum 2 seeds)
□ R2 batch review at transition (BLOCKING)

FAIL actions:
- No good nodes → Continue Stage 1, try different approaches
- Trivial metrics → Investigate (random baseline comparison needed)
- Single seed → Run second seed before advancing
```

### Gate S2 — Hyperparameter Tuning Exit
**When:** Evaluating readiness to advance from Stage 2 to Stage 3.

```
PASS criteria:
□ Best metric confirmed improved over Stage 1 best
□ Improvement tested on 2+ configurations (not just 1 lucky config)
□ Ablation of at least 1 key hyperparameter completed
□ R2 batch review at transition

FAIL actions:
- No improvement → Consider that Stage 1 approach may be suboptimal
- Single config → Test at least 1 more variation
```

### Gate S3 — Research Agenda Exit
**When:** Evaluating readiness to advance from Stage 3 to Stage 4.

```
PASS criteria:
□ All planned sub-experiments attempted or time budget exceeded
□ Results documented for each sub-experiment
□ At least 3 draft nodes explored (LAW 8)
□ R2 batch review at transition

FAIL actions:
- Planned experiments remaining → Complete or document why skipped
- < 3 approaches explored → Create additional draft nodes
```

### Gate S4 — Ablation & Validation Exit
**When:** Evaluating readiness to advance from Stage 4 to Stage 5.

```
PASS criteria:
□ All key components ablated, contribution quantified
□ Multi-seed validation complete (minimum 3 seeds for best config)
□ Cross-dataset/cross-assay validation attempted (if generalizable claims)
□ Confounder harness run for ALL promoted claims (LAW 9)
□ R2 batch review at transition
□ Artifact validates against JSON Schema (structural completeness check)

FAIL actions:
- Missing ablations → Complete ablation matrix
- Single seed → Run additional seeds
- No cross-validation → Attempt or document why impossible
- Harness missing → Run confounder harness before advancing (LAW 9)
```
**Schema**: `schemas/stage4-exit.schema.json`

### Gate S5 — Synthesis & Review Exit
**When:** Final gate before concluding the RQ.

```
PASS criteria:
□ R2 full ensemble verdict: ACCEPT
□ Gate D2 (RQ Conclusion) PASS
□ All claims have status VERIFIED or CONFIRMED (no UNVERIFIED in conclusion)
□ No claims with status DISPUTED (S5 Poison Pill — circuit breaker resolution required)
□ All confounder harnesses completed and documented (LAW 9)
□ Tree visualization final snapshot saved
□ Knowledge base updated
□ All artifacts crystallized to files (LAW 10)
□ Artifact validates against schemas/stage5-exit.schema.json

FAIL actions:
- R2 not ACCEPT → Address demands, re-review
- D2 not PASS → Fix specific D2 failures
- UNVERIFIED claims → Either verify or remove from conclusion
- DISPUTED claims exist → Resolution required: (a) new data resolves dispute, (b) claim dropped, (c) human override with documented rationale
- Missing harnesses → Complete before concluding
```
**Schema**: `schemas/stage5-exit.schema.json`

---

## Vigilance Gate (V0) — NEW in v5.0

### Gate V0 — R2 Vigilance Check
**When:** After every FORCED R2 review completes, before accepting the review.

```
PASS criteria (ALL must be true):
□ All non-EQUIV seeded faults caught by R2 (caught=true)
□ RMS (Review Miss Score) >= 0.80: faults_caught / faults_injected (EQUIV excluded from denominator)
□ FAR (False Accusation Rate) <= 0.10: false_accusations / real_claims_count
□ Schema validation: artifact validates against schemas/vigilance-check.schema.json

FAIL actions:
- R2 missed seeded faults → review INVALID, R2 must re-review ENTIRE claim set
- RMS < 0.80 → insufficient vigilance, re-review required
- FAR > 0.10 → R2 is trigger-happy, recalibrate
- RETRY LIMIT: max 3 V0 failures per session. After 3 → ESCALATE to human.
```

**Protocol**: `protocols/seeded-fault-injection.md`
**Schema**: `schemas/vigilance-check.schema.json`

---

## Judge Gate (J0) — NEW in v5.0

### Gate J0 — Judge Agent Assessment
**When:** After every FORCED R2 review passes V0, before accepting the review into the pipeline.

```
PASS criteria (ALL must be true):
□ R3 rubric total >= 12 (out of 18)
□ No dimension scored 0 (all 6 aspects addressed)
□ Counter-evidence search dimension >= 2 (must actually search, not rubber-stamp)

FAIL actions:
- Total < 12 → R2 must redo FORCED review with R3's specific feedback
- Any dimension = 0 → R2 gets specific guidance on which aspect was missing
- RETRY LIMIT: max 2 consecutive J0 failures. After 2 → ESCALATE to human.
```

**Rubric dimensions** (see `assets/judge-rubric.yaml` for full scoring):
1. Specificity (0-3): Did R2 cite exact files, lines, claim IDs?
2. Independence (0-3): Did R2 generate its own concerns (BFP Phase 1)?
3. Counter-Evidence (0-3): Did R2 actually search databases?
4. Confounder Analysis (0-3): Did R2 demand raw/conditioned/matched estimates?
5. Falsification Demand (0-3): Did R2 specify concrete falsification tests?
6. Escalation (0-3): Did R2 escalate unresolved issues appropriately?

**Protocol**: `protocols/judge-agent.md`
**Rubric**: `assets/judge-rubric.yaml`

---

## Gate Tracking Format

In every run report, sprint report, and decision log:

```markdown
| Gate | Status | Evidence | Notes |
|------|--------|----------|-------|
| G0 | PASS | dtype=int32, max=47823 | |
| G1 | PASS | obs-normalizer applied | 3 string→category |
| T0 | PASS | node-003, type=hyper, parent=node-001 | |
| T3 | PASS | 4/6 good (67%) | healthy |
| S1 | PASS | node-001 acc=0.72, 2 seeds | advancing to S2 |
| V0 | PASS | 3/3 caught, RMS=1.00, FAR=0.00 | |
| J0 | PASS | total=14/18, min=2 | |
```

---

## Schema Enforcement Summary (v5.0)

| Gate | Schema File | Key Enforcement |
|------|-------------|-----------------|
| D1 | claim-promotion.schema.json | Evidence chain, confidence formula, confounder harness, counter-evidence |
| D2 | rq-conclusion.schema.json | All claims verified, R2 ACCEPT, tree snapshot |
| S4 | stage4-exit.schema.json | Ablation matrix, multi-seed (>=3), all harnesses |
| S5 | stage5-exit.schema.json | R2 ACCEPT only, no DISPUTED (poison pill), all crystallized |
| L0 | source-validity.schema.json | Verified DOIs, computed confidence, ledger registration |
| L2 | review-completeness.schema.json | R2 reports, flaws resolved, counter-evidence searched |
| B0 | brainstorm-quality.schema.json | >=3 gaps, data availability >=0.5, falsifiable hypothesis |
| V0 | vigilance-check.schema.json | All non-EQUIV faults caught, RMS >=0.80, FAR <=0.10 |

**Protocol**: `protocols/schema-validation.md`
**Schemas are READ-ONLY**: No agent can modify schema files. Only the human architect can change them.
