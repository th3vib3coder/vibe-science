# Quality Gates

Blocking gates that stop-the-line if failed. No analysis proceeds past a failed gate. Fix first, re-gate, then continue.

## Gate Philosophy

Gates are not optional checks — they are **blocking barriers**. The pipeline cannot continue if a gate fails. This prevents the accumulation of errors that produce "beautiful but fragile" outputs.

## Gate Definitions: scRNA-seq / scVI Pipeline

### Gate 0 — Input Sanity

**When:** After loading data, before any processing.
**Route to:** `anndata` skill for inspection.

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
□ Confounding between batch_key and biology assessed (e.g., disease mixed across batches?)

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
□ Standard metric suite computed:
  - Mixing: iLISI (or kBET acceptance rate)
  - Conservation: cLISI (or cell-type silhouette score)
  - Clustering: ARI and/or NMI against reference labels
  - Batch leakage: batch classifier accuracy on latent space
□ Metrics contextualized:
  - Compared to baseline (uncorrected) or previous run
  - Direction of improvement documented
  - Trade-offs between mixing and conservation explicit
□ Decision motivated: "We accept/reject because [metric evidence]"
□ No metric gaming: improving one metric at the cost of others must be flagged

FAIL actions:
- iLISI improved but cLISI dropped significantly (>0.05) → Weak reject, investigate
- Batch classifier accuracy still high (>0.7) → Batch not fully corrected
- No baseline comparison available → Cannot decide, compute baseline first
- Silhouette dropped below 0.3 → Cell types merging, over-correction likely
```

### Gate 5 — Artifact Completeness

**When:** After run completion. Before marking run as valid.

```
PASS criteria (ALL must be true):
□ manifest.json present and valid
□ report.md present, following standard template
□ figures/ directory present with expected figures:
  - UMAP by batch
  - UMAP by cell type
  - Convergence plot (if model trained)
  - Metrics comparison (if previous run exists)
□ metrics.json present with all computed values
□ output.h5ad present (if applicable)
□ model/ directory present (if model trained)
□ scripts/ directory present with all execution scripts
□ logs/ directory present

FAIL actions:
- Missing manifest → Run is invalid. Cannot audit. Regenerate.
- Missing figures → Generate from saved output before accepting
- Missing report → Generate from manifest + metrics before accepting
- Missing h5ad → Critical failure, investigate data loss
```

## Gate Definitions: Literature Research

### Gate L0 — Source Validity

```
□ All cited DOIs verified (accessible via web_fetch)
□ No training-knowledge-only claims marked as DATA
□ All claims registered in CLAIM-LEDGER.md
□ Confidence scores computed (not guessed)
```

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
```

## Gate Definitions: Decision Quality

### Gate D0 — Decision Justification

**When:** Before any strategic decision (batch_key choice, method selection, RQ pivot, RQ conclusion).

```
PASS criteria (ALL must be true):
□ Decision logged in decision-log.md with DEC-YYYYMMDD-NNN format
□ ≥2 alternatives considered and documented with rejection reasons
□ Trade-offs explicitly stated (what we lose)
□ Reversibility assessed (HIGH/MEDIUM/LOW)
□ Affected claims listed (claim_ids)
□ Evidence-based justification (not opinion-based)

FAIL actions:
- Missing alternatives → Document at least 2 before proceeding
- No trade-off analysis → Identify and document what is sacrificed
- Opinion-only justification → Find data/literature to support the choice
```

### Gate D1 — Claim Promotion

**When:** Before promoting any claim to VERIFIED or CONFIRMED status.

```
PASS criteria (ALL must be true):
□ Claim has ≥1 verifiable source with DOI/PMID
□ Confidence computed with formula (not subjective), all 5 components scored
□ Evidence floor gate passed (E ≥ 0.2, see evidence-engine.md)
□ Counter-evidence actively searched (documented in finding)
□ Claim type correct (DATA only if directly observed, INFERENCE if derived)
□ Dependencies checked (all depends_on claims are ≥ VERIFIED)
□ Assumptions listed and registered

FAIL actions:
- E < 0.2 → Cannot promote. Seek verifiable source first.
- No counter-evidence search → Perform search, document results
- Dependency chain broken → Downgrade to CHALLENGED
```

### Gate D2 — RQ Conclusion

**When:** Before writing any conclusion (SUCCESS, NEGATIVE, or PIVOT).

```
PASS criteria (ALL must be true):
□ All success/kill criteria from RQ.md explicitly addressed
□ All major claims R2-reviewed (final review completed)
□ No unresolved FATAL FLAWS from R2
□ CLAIM-LEDGER.md consistent (no UNVERIFIED claims cited in conclusion)
□ Knowledge base updated (library.json, patterns.md, dead-ends.md)
□ PROGRESS.md complete (no gaps)
□ Reproducibility contract satisfied (see audit-reproducibility.md)

FAIL actions:
- Unreviewed major claims → Invoke final R2 ensemble before concluding
- Unresolved FATAL FLAWS → Fix or reject affected claims
- UNVERIFIED claims in conclusion → Either verify or remove from conclusion
- Knowledge base not updated → Update before closing RQ
```

---

## Generic Gate Template

For custom pipelines, define gates using this template:

```markdown
### Gate [ID] — [Name]

**When:** [trigger condition]

PASS criteria:
□ [criterion 1]
□ [criterion 2]
...

FAIL actions:
- [condition] → [action]
```

## Gate Tracking Format

In every run report and decision log:

```markdown
| Gate | Status | Evidence | Notes |
|------|--------|----------|-------|
| G0 | ✅ PASS | dtype=int32, max=47823 | |
| G1 | ✅ PASS | obs-normalizer applied | 3 string→category conversions |
| G2 | ✅ PASS | DEC-20250207-003 | batch_key=study_id justified |
| G3 | ✅ PASS | convergence.png | converged epoch 280 |
| G4 | ✅ PASS | metrics.json | iLISI↑, cLISI stable |
| G5 | ✅ PASS | all artifacts present | |
```
