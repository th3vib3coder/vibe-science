# Blind-First Pass Protocol

Anti-anchoring barrier for R2 Ensemble reviews. Forces independent assessment before exposure to the researcher's framing, methodology, or confidence computation.

**v5.0 addition**: Two-phase review within a single R2 invocation, CoVe verification questions, self-consistency N=3 for SOLO mode, mandatory discrepancy accounting. Integrates with R3 Independence scoring.

**When**: Every FORCED R2 review. Not BATCH, not SHADOW, not BRAINSTORM.

---

## Phase 1 -- BLIND ASSESSMENT

R2 receives ONLY the following for each claim under review:

| Field | Content |
|-------|---------|
| `claim_id` | Claim identifier from CLAIM-LEDGER.md |
| `claim_text` | Exact text of the assertion |
| `claim_type` | `descriptive` / `correlative` / `causal` / `predictive` |
| `evidence_location` | File paths or DOIs -- NOT the interpretation |

R2 does NOT receive: researcher's methodology description, confidence computation (E, R, C, K, D), counter-evidence search results, confounder harness results, or any researcher commentary.

### Phase 1 Required Output

For each claim, R2 MUST produce:

1. **Evidence needed**: What specific evidence would I need to see to believe this claim?
2. **Alternative explanations**: The 3 most likely alternative explanations for the observed result.
3. **Falsification test**: One specific test that would falsify this claim if it fails.
4. **Confounders**: What confounders should I check before accepting this?
5. **Independent assessment**: `SUSPICIOUS` | `PLAUSIBLE` | `STRONG`

### CoVe Verification Questions (Phase 1 extension)

For each claim, R2 MUST also generate verification questions independent of the draft:

- What would need to be true in the data for this claim to hold?
- What database or source would contain counter-evidence? (IEEE Xplore, Optica, SPIE, arXiv physics.optics, manufacturer datasheets)
- What statistical test or diagnostic would detect an artifact here?

These questions are answered in Phase 2. They create a structured anti-anchoring barrier: R2 commits to what it needs to see BEFORE seeing the researcher's answer.

---

## Phase 2 -- FULL REVIEW

R2 additionally receives:

- Researcher's methodology description
- Confidence computation (E, R, C, K, D components)
- Counter-evidence search results
- Confounder harness results (if available)

### Phase 2 Required Actions

1. **Answer CoVe questions**: Using the full context, answer every verification question generated in Phase 1.
2. **Compare assessments**: For each claim, compare the Phase 1 blind assessment with the Phase 2 evidence.
3. **Flag gaps**: Flag any claim where Phase 2 evidence does NOT address Phase 1 concerns.
4. **Produce final report**: Standard R2 ensemble report (existing YAML schema from `reviewer2-ensemble.md`).
5. **Record discrepancies**: Add `blind_assessment_comparison` section to the output.

---

## Discrepancy Accounting (mandatory)

Every Phase 1 concern that changes or disappears in Phase 2 MUST be explained. Append to the ensemble report:

```yaml
blind_assessment_comparison:
  - claim_id: C-xxx
    phase1_assessment: SUSPICIOUS | PLAUSIBLE | STRONG
    phase2_assessment: PASS | WEAK | FAIL
    phase1_concerns: ["concern A", "concern B"]
    concerns_addressed: ["concern A — addressed by confounder harness"]
    concerns_unaddressed: ["concern B — not addressed, remains open"]
    discrepancy_explanation: "Phase 1 flagged X; Phase 2 showed Y resolved it because Z"
```

Rule: If a Phase 1 concern disappears in Phase 2 without the evidence explicitly addressing it, this is anchoring bias. R2 MUST retain the concern, and R3 MUST lower the Independence score.

---

## SOLO Mode Enhancement -- Self-Consistency

In SOLO mode, for FORCED reviews on high-risk claims (confidence >= 0.60):

1. R2 generates **N=3 independent Phase 1 assessments** using different sampling (temperature variance).
2. Each assessment produces its own evidence-needed list, alternatives, and verdict.
3. The **most conservative** verdict wins (not majority vote). Ordering: `SUSPICIOUS` > `PLAUSIBLE` > `STRONG`.
4. All three assessments are logged; the final Phase 1 output uses the most conservative.

This creates divergence without context separation. Self-consistency at equal compute cost compensates for the absence of a separate reviewer context window (Wang et al., arXiv:2203.11171).

---

## Integration with R3 (Judge Agent)

The R3 rubric scores an **Independence** dimension. BFP provides structural evidence:

- R3 reads the `blind_assessment_comparison` section from the ensemble report.
- If Phase 1 concerns vanish in Phase 2 without being addressed: Independence score drops (score 0-1 on that dimension).
- If Phase 1 concerns are retained or explicitly resolved: Independence score holds (score 2-3).
- In SOLO mode, R3 also checks whether self-consistency N=3 was performed for high-risk claims. If skipped, Independence score cannot exceed 1.

---

## Photonics-Specific BFP Extensions

### Phase 1 Standard Question for Photonics

For every claim entering Phase 1, R2 MUST ask the following standard question as part of the blind assessment:

> **"What physical limits constrain this claim? (Shannon, thermodynamic, diffraction, semiconductor bandgap)"**

This question is mandatory and must be answered before any assessment verdict is rendered. If the claim's plausibility cannot be evaluated against at least one of these physical limits, R2 must flag this as an incomplete assessment and rate the claim no higher than `PLAUSIBLE`.

### TEAM Mode: Architecturally Genuine Separation

BFP is architecturally genuine -- R2 receives claims in a truly separate context window. This means:
- R2 has NO access to the researcher's reasoning process during Phase 1
- R2 cannot see confidence computations, methodology choices, or intermediate results
- The separation is structural (different context window), not merely procedural (same context, different prompt section)
- This eliminates anchoring bias at the architecture level, not just the prompt level

In TEAM mode, the orchestrator passes only the BFP-permitted fields (`claim_id`, `claim_text`, `claim_type`, `evidence_location`) to the reviewer2 teammate. All other context is withheld until Phase 2.

### SOLO Mode Enhancement: BATCH and FORCED Coverage

BFP also applies to BATCH reviews (not just FORCED). The extended SOLO mode protocol:

1. **Phase 0.5 — Domain-Specific A Priori Critiques**: Before seeing any claims, R2 generates domain-specific critiques that commonly apply to the current research area (e.g., for VCSEL analysis: thermal rollover artifacts, oxide aperture effects, multimode competition; for optical link budgets: connector loss assumptions, fiber type mismatch, detector saturation). These a priori critiques form a pre-loaded checklist that is applied to every claim in the batch.

2. **N=5 for high-confidence claims**: For claims with confidence >= 0.70 (high-confidence), the self-consistency requirement increases from N=3 to N=5. The most conservative verdict still wins, but with 5 independent assessments, the probability of anchoring bias surviving is substantially reduced.

3. **BATCH BFP flow**:
   - Phase 0.5: Generate domain-specific a priori critiques (before seeing claims)
   - Phase 1: Standard blind assessment with N=5 self-consistency for high-confidence claims
   - Phase 2: Full review with discrepancy accounting
   - This ensures BATCH reviews receive meaningful anti-anchoring protection, not just FORCED reviews
