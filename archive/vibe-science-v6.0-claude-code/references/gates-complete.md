# Quality Gates v5.5 — Complete Reference (34 Gates)

> v5.0: V0, J0, 8 schema-enforced, T3 exploration, S5 poison pill. v5.5: DQ1-DQ4, DD0, DC0, L-1. **34 gates, 8 schema-enforced.**

## 1. Gate Philosophy

Gates are **blocking barriers**, not suggestions. PASS = continue. FAIL = hard stop (fix, re-gate, continue). WARN = advisory (logged, not blocking). Schema-enforced gates require a JSON artifact validated against a read-only schema. Prose claims of completion are IGNORED. Schemas are READ-ONLY for all agents.

---

## 2. Pipeline Gates (G0-G6)

### G0 — Input Sanity
**When:** After loading data, before any processing.
```
PASS (ALL): File loads without error | Dimensions non-zero | Types match expected
  format (see domain-config.yaml) | No NaN/Inf (or within tolerance) | Value ranges
  plausible | Raw/original preserved if transformed | Identifiers present and non-empty
FAIL: Load error / wrong types / NaN / missing raw --> STOP. Investigate.
```

### G1 — Schema Compliance
**When:** After initial filtering, before feature selection or modeling.
```
PASS (ALL): Schema matches expectation (required fields present) | Types correct per
  field | No invalid categories | No NaN in key/grouping columns | Sufficient grouping
  levels | Identifiers unique | Schema documented in data-dictionary.md
FAIL: Missing fields / wrong types / insufficient levels / duplicates --> STOP. Fix, re-gate.
```

### G2 — Design Justification
**When:** After choosing analysis parameters/pipeline design. Before execution.
```
PASS (ALL): Parameter choices justified with evidence | No circular dependencies |
  Confounders identified + handling documented | Method justified with alternatives |
  Decision logged | Technical-substantive confounding assessed
FAIL: Unjustified params / circular deps / unassessed confounding --> STOP. Document, re-gate.
```

### G3 — Training / Execution Integrity
**When:** After model training or main computation. Before using outputs.
```
PASS (ALL): Loss converged | No train-val divergence | No NaN/Inf | Artifacts saved +
  loadable | >= 2 seeds (or 1 justified) | No errors in logs | No resource exhaustion
FAIL: Non-convergence / overfitting / NaN / single seed --> Fix and re-run.
```

### G4 — Metrics Decision
**When:** After computing evaluation metrics.
```
PASS (ALL): Primary metric computed | Compared to baseline | Direction documented |
  Trade-offs explicit | Decision evidence-based | No metric gaming | Multi-seed reported
FAIL: No baseline / trade-off damage / gaming --> Investigate.
```

### G5 — Artifact Completeness
**When:** After run completion. Before marking run as valid.
```
PASS (ALL): manifest.json valid | report.md present | figures/ present | metrics.json
  present | Output files present | scripts/ + logs/ present
FAIL: Missing manifest --> invalid run. Missing figures/report --> generate before accepting.
```

### G6 — VLM Validation (OPTIONAL)
**When:** After figures generated. If VLM access available.
```
PASS: Readable figures | Axes labeled | Trends match metrics | Colorblind-friendly | Score >= 0.6
FAIL: Garbled --> regenerate. Unlabeled --> fix. Mismatch --> investigate. Skip if no VLM.
```

---

## 3. Literature Gates (L-1, L0-L2)

### L-1 — Literature Pre-Check (v5.5)
**When:** Before committing to any new direction (Phase 0 or mid-session pivot).
```
PASS (ALL): Databases searched for EXACT intersection | Components searched SEPARATELY |
  Prior work: PIVOT or DIFFERENTIATE with rationale | No prior work: null results documented |
  Decision logged
FAIL: Prior work not addressed / search not performed / queries undocumented --> HALT.
```

### L0 — Source Validity | **Schema**: `assets/schemas/source-validity.schema.json`
```
[ ] DOIs verified | No training-knowledge-only claims as DATA | All claims in CLAIM-LEDGER |
    Confidence computed | Schema validates
```

### L1 — Coverage Adequacy
```
[ ] >= 2 databases | >= 3 strategies | Negative results documented | Dedup applied
```

### L2 — Review Completeness | **Schema**: `assets/schemas/review-completeness.schema.json`
```
[ ] All findings reviewed | FATAL FLAWS resolved | DEMANDED EVIDENCE provided |
    Counter-evidence searched | Schema validates
```

---

## 4. Decision Gates (D0-D2)

### D0 — Decision Justification
```
[ ] Logged DEC-YYYYMMDD-NNN | >= 2 alternatives with rejection reasons | Trade-offs stated |
    Reversibility assessed (H/M/L) | Affected claim_ids listed | Evidence-based
```

### D1 — Claim Promotion | **Schema**: `assets/schemas/claim-promotion.schema.json`
```
[ ] >= 1 verifiable source (DOI/PMID/URL) | Confidence computed with formula | E >= 0.2 |
    Counter-evidence searched | Confounder harness completed (LAW 9) | Dependencies >= VERIFIED |
    Assumptions registered | >= 3 falsification attempts | Schema validates
FAIL: E < 0.2 / no harness (BLOCK) / no counter-evidence / < 3 tests --> Cannot promote.
```

### D2 — RQ Conclusion | **Schema**: `assets/schemas/rq-conclusion.schema.json`
```
[ ] All success/kill criteria addressed | Claims R2-reviewed | No FATAL FLAWS | Harness passed |
    CLAIM-LEDGER consistent | Cross-dataset validation attempted | KB + PROGRESS updated |
    Reproducibility satisfied | Tree snapshot saved | Schema validates
```

---

## 5. Tree Gates (T0-T3)

### T0 — Node Validity | **When:** Before expanding a new node.
```
[ ] Valid type (draft|debug|improve|hyperparameter|ablation|replication|serendipity) |
    Valid parent in TREE-STATE.json, not pruned | Non-empty action plan | Type fits stage
FAIL: Fix type/parent. Empty plan --> complete THINK. Wrong type --> reassign.
```

### T1 — Debug Limit | **When:** After debug attempt.
```
[ ] debug_attempts <= 3 | Each addresses DIFFERENT root cause | Each documented
FAIL: > 3 --> PRUNE. Same fix repeated --> prune if no alternatives.
```

### T2 — Branch Diversity | **When:** Creating sibling nodes.
```
[ ] Siblings differ in >= 1 parameter/approach | No duplicates | Diversity documented
FAIL: Duplicates --> merge/differentiate. All identical --> introduce variation.
```

### T3 — Tree Health | **When:** Every 5 cycles or after prune.
```
[ ] good/total >= 0.2 | No 5+ consecutive non-improving | >= 2 branches (LAW 8, unless LINEAR) |
    Exploration ratio >= 0.20 (WARN < 0.20, FAIL < 0.10)
FAIL: < 0.2 ratio --> STOP + R2 emergency. 5+ non-improving --> soft-prune.
  Single branch --> create alt. Exploration < 0.10 --> HARD FAIL.
```

---

## 6. Brainstorm Gate (B0) | **Schema**: `assets/schemas/brainstorm-quality.schema.json`

**When:** After Phase 0, before OTAE. B0 MUST PASS before OTAE begins.
```
[ ] >= 3 gaps with evidence | >= 1 verified not-yet-addressed | DATA_AVAILABLE >= 0.5 |
    Falsifiable hypothesis (null stated) | Predictions stated | R2: WEAK_ACCEPT+ | User approved |
    Schema validates
FAIL: Insufficient gaps / no data / not falsifiable / R2 rejected / user not consulted.
```

---

## 7. Stage Gates (S1-S5)

### S1 — Stage 1 -> 2
```
[ ] >= 1 good node with valid metrics | Metrics meaningful | >= 2 seeds | R2 batch (BLOCKING)
```
### S2 — Stage 2 -> 3
```
[ ] Metric improved over S1 best | 2+ configs tested | >= 1 ablation | R2 batch
```
### S3 — Stage 3 -> 4
```
[ ] All sub-experiments attempted or time exceeded | Results documented | >= 3 drafts (LAW 8) | R2 batch
```
### S4 — Stage 4 -> 5 | **Schema**: `assets/schemas/stage4-exit.schema.json`
```
[ ] All components ablated + quantified | >= 3 seeds | Cross-dataset attempted |
    All harnesses run (LAW 9) | R2 batch | Schema validates
FAIL: Missing ablations / seeds / harness --> fix before advancing.
```
### S5 — Final Exit | **Schema**: `assets/schemas/stage5-exit.schema.json`
```
[ ] R2 verdict: ACCEPT | D2 PASS | All VERIFIED/CONFIRMED | No DISPUTED (poison pill) |
    All harnesses documented (LAW 9) | Tree snapshot + KB updated | All crystallized (LAW 10) |
    Schema validates
FAIL: R2 not ACCEPT / UNVERIFIED / DISPUTED / missing harnesses --> resolve first.
```

---

## 8. Data Quality Gates (DQ1-DQ4) — v5.5

DQ gates verify *data quality* (features, alignment, numeric consistency), not claim quality. They operate between pipeline phases.

### DQ1 — Post-Extraction | **When:** After feature extraction, before modeling.
```
[ ] No zero-variance features | Missing < threshold (see domain-config.yaml; default 50%) |
    Distributions plausible | Cross-checked against metadata | No |corr| > 0.95 with label |
    Feature/sample counts match description
FAIL: Zero-variance --> remove. Cross-check mismatch / leakage / count mismatch --> HALT.
```

### DQ2 — Post-Training | **When:** After model training, before interpretation.
```
[ ] Outperforms trivial baseline (see domain-config.yaml) | No feature > 50% importance |
    Fold/seed CV < threshold (see domain-config.yaml) | No train-test leakage | Adequate strata
FAIL: Worse than baseline / leakage --> HALT. Dominance / unstable --> WARN.
```

### DQ3 — Post-Calibration | **When:** After statistical validation or UQ.
```
[ ] Metric within plausible range | Not suspiciously perfect (see domain-config.yaml) |
    Sample size adequate for precision | Reproducible across seeds
FAIL: Outside range / perfect --> HALT. Inadequate sample --> WARN.
```

### DQ4 — Post-Finding | **When:** After writing finding to FINDINGS.md.
```
[ ] Numbers match source (JSON/CSV/output) | Sample size reported | Surprising results: >= 1
    alternative explanation | Terminology consistent across docs | Evidence source referenced
FAIL: Mismatch --> HALT. No sample size --> add. Inconsistency --> fix all references.
```

---

## 9. Data Dictionary Gate (DD0) — v5.5

**When:** Before using any column/field for the FIRST TIME.
```
[ ] All columns listed (dtype + examples) | Used columns documented (what, units, source) |
    Name verified against actual semantics (NEVER assume) | In persistent file
FAIL: Undocumented column / meaning assumed from name --> HALT. Verify first.
```

---

## 10. Design Compliance Gate (DC0) — v5.5

**When:** Stage transitions + any deviation from design.
```
[ ] Actions match design (RQ.md, planned branches) | All specified sources used |
    Methods match design | Deviations documented (what, why, decision logged)
FAIL: Source ignored --> WARN. Method changed undocumented / design mismatch --> HALT.
```

---

## 11. Vigilance Gate (V0) | **Schema**: `assets/schemas/vigilance-check.schema.json`

**When:** After FORCED R2 review, before accepting. **Protocol**: `references/seeded-fault-injection.md`
```
[ ] All non-EQUIV faults caught | RMS >= 0.80 | FAR <= 0.10 | Schema validates
FAIL: Missed faults --> INVALID, full re-review. RMS low --> re-review. FAR high --> recalibrate.
RETRY: max 3 per session. After 3 --> ESCALATE to human.
```

---

## 12. Judge Gate (J0) | **Rubric**: `assets/judge-rubric.yaml`

**When:** After FORCED R2 passes V0, before accepting into pipeline. **Protocol**: `references/judge-agent.md`
```
[ ] R3 total >= 12/18 | No dimension = 0 | Counter-evidence >= 2
FAIL: < 12 / any 0 --> R2 redoes with R3 feedback. RETRY: max 2 consecutive. After 2 --> ESCALATE.
```
Dimensions (0-3 each): Specificity | Independence | Counter-Evidence | Confounder Analysis | Falsification Demand | Escalation.

---

## 13. Gate Tracking Format

```markdown
| Gate | Status | Evidence | Notes |
|------|--------|----------|-------|
| G0   | PASS   | rows=5000, cols=120, no NaN | verified |
| G1   | PASS   | schema match, types correct | 2 fixes |
| DQ1  | PASS   | no zero-var, no leakage | 23 features |
| DD0  | PASS   | 15 columns documented | data-dictionary.md |
| V0   | PASS   | 3/3 caught, RMS=1.00 | vigilant |
| J0   | PASS   | total=14/18, min=2 | acceptable |
```

## 14. Schema Enforcement Summary

| Gate | Schema File | Key Enforcement |
|------|-------------|-----------------|
| L0 | source-validity.schema.json | DOIs, confidence, ledger |
| L2 | review-completeness.schema.json | R2 reports, flaws, counter-evidence |
| D1 | claim-promotion.schema.json | Evidence, confidence, harness |
| D2 | rq-conclusion.schema.json | Claims verified, R2 ACCEPT, snapshot |
| B0 | brainstorm-quality.schema.json | 3+ gaps, data >= 0.5, falsifiable |
| S4 | stage4-exit.schema.json | Ablation, seeds >= 3, harnesses |
| S5 | stage5-exit.schema.json | R2 ACCEPT, no DISPUTED, crystallized |
| V0 | vigilance-check.schema.json | Faults caught, RMS >= 0.80 |

Schemas are READ-ONLY. Protocol: `references/schema-validation.md`.

## 15. v5.5 Summary Table

| Group | Gates | Count | Schema | New in v5.5 |
|-------|-------|-------|--------|-------------|
| Pipeline | G0-G6 | 7 | -- | -- |
| Literature | L-1, L0-L2 | 4 | L0 | L-1 |
| Decision | D0-D2 | 3 | D1, D2 | -- |
| Tree | T0-T3 | 4 | -- | -- |
| Brainstorm | B0 | 1 | B0 | -- |
| Stage | S1-S5 | 5 | S4, S5 | -- |
| Data Quality | DQ1-DQ4 | 4 | -- | DQ1-DQ4 |
| Data Dictionary | DD0 | 1 | -- | DD0 |
| Design Compliance | DC0 | 1 | -- | DC0 |
| Vigilance | V0 | 1 | V0 | -- |
| Judge | J0 | 1 | -- | -- |
| **Total** | | **34** | **8** | **7 new** |
