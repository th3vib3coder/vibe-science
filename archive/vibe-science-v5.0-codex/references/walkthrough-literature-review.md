# Example Walkthrough: Literature-Based Research Question

This annotated example shows a complete Vibe Science session investigating a literature-based research question through 5 OTAE cycles.

## Session Start

**User:** "Use vibe-science to explore whether unbalanced optimal transport has been applied to single-cell trajectory inference beyond Waddington-OT."

**Vibe Science responds:**

```
Vibe Science v3.5 activated for: OT applications in scRNA trajectory inference
Mode: DISCOVERY
Constitution loaded. R2 Ensemble armed. Gates active.
```

### RQ Shaping (conversational)

- **Testable hypothesis:** There exist published methods applying unbalanced OT to single-cell trajectory inference that go beyond the Waddington-OT framework (new cost functions, new biological applications, or methodological extensions).
- **Success criteria:** Identify >=3 independent methods/papers with distinct OT formulations for trajectory inference.
- **Kill conditions:** <3 results after exhaustive search across 3+ databases. OR: all results are trivial extensions of Waddington-OT.
- **Scope:** ~10 cycles.

### Initialization

Creates `.vibe-science/` with:
- `STATE.md` (version: 3.5.1, phase: discovery, cycle: 1)
- `PROGRESS.md`, `CLAIM-LEDGER.md`, `ASSUMPTION-REGISTER.md`, `SERENDIPITY.md`
- `RQ-001-ot-trajectory/RQ.md`

---

## Cycle 1: First Literature Search

### OBSERVE
Read STATE.md: cycle 1, new session, no prior findings.

### THINK
**Decision:** SEARCH — need initial literature scan.
Query: "unbalanced optimal transport" AND ("trajectory inference" OR "cell fate" OR "single-cell").
Databases: PubMed first (biomedical focus), then OpenAlex.

### ACT
**Load:** `search-protocol.md` + `skill-router.md`
**Dispatch to:** `pubmed-database` skill

Search results: 12 total, 7 relevant, 7 new.
Logged in `01-discovery/queries.log`.

Papers flagged for deep-dive:
1. Schiebinger et al. 2019 (Waddington-OT) — DOI:10.1016/j.cell.2019.01.006
2. Tong et al. 2020 (TrajectoryNet) — DOI:10.48550/arXiv.2002.04461
3. Lavenant et al. 2021 (Towards a mathematical theory of trajectory inference) — identified via forward citation

### EVALUATE
**Gate L0 (Source Validity):** 3 DOIs to verify.
- DOI 1: PASS (Cell, peer-reviewed)
- DOI 2: PASS (ICML proceedings, peer-reviewed)
- DOI 3: needs verification

**Claims extracted:**
- C-001: "Waddington-OT uses unbalanced OT to model cell growth/death in trajectory inference" (Type: DATA, E=1.0, Confidence: 0.82)
- C-002: "TrajectoryNet extends OT to continuous normalizing flows for trajectory" (Type: DATA, E=0.8, Confidence: 0.68)

### CHECKPOINT
No R2 trigger (no major finding yet, only 2 minor claims).

### CRYSTALLIZE
Update STATE.md: cycle=1, claims_total=2, queries_run=1.
Append to PROGRESS.md: Cycle 1 summary.

---

## Cycle 2: Expand Search + Snowball

### OBSERVE
Cycle 2. 2 claims, both UNVERIFIED. Need more coverage.

### THINK
**Decision:** SEARCH — snowball from Schiebinger 2019 (forward citations) + OpenAlex search.

### ACT
**Dispatch to:** `openalex-database` skill (forward citations of DOI:10.1016/j.cell.2019.01.006)

Results: 89 citing papers. Filtered by title/abstract relevance: 8 new candidates.
Key finds:
- Bunne et al. 2023 (Neural OT for trajectory inference) — DOI:10.1038/s41592-023-01969-x
- Zhang et al. 2021 (Optimal transport analysis reveals trajectories in steady-state systems)

**Gate L1 (Coverage):** 2 databases searched, 2 search strategies (keyword + snowball). Needs >=3 strategies. STATUS: PARTIAL.

### EVALUATE
**Claims extracted:**
- C-003: "Neural OT extends WOT by learning continuous transport maps instead of discrete couplings" (Type: INFERENCE, E=0.8, C=0.6, Confidence: 0.64)
- C-004: "Steady-state OT trajectory inference does not require time-series data" (Type: DATA, E=0.8, Confidence: 0.72)

**minor_findings_pending:** 4 (accumulated).

### CHECKPOINT
minor_findings_pending >= 3 → **R2 BATCH REVIEW TRIGGERED**.

**Load:** `reviewer2-ensemble.md`
**Activated:** R2-Methods (search completeness check)

R2-Methods verdict (batch):
```yaml
decision: WEAK_ACCEPT
motivation: |
  Search covers 2 databases and 2 strategies.
  L1 gate requires >=3 strategies — missing author trail.
  Claims are appropriately typed but C-003 is INFERENCE with only 1 source.
demanded_evidence:
  - item: "Author trail search for Schiebinger, Bunne, Tong"
    type: citation
    deadline: before_next_cycle
convince_me:
  - artifact: "Author publication list showing no missed OT+trajectory papers"
    verdict_if_provided: ACCEPT
```

### CRYSTALLIZE
Update: cycle=2, claims_total=4, R2 pending response needed.

---

## Cycle 3: Address R2 Feedback + Author Trail

### OBSERVE
R2 demanded author trail search. Must address before advancing.

### THINK
**Decision:** SEARCH — author trail for Schiebinger, Bunne, Tong.

### ACT
Author trail via OpenAlex: 3 author publication lists retrieved.
2 additional relevant papers found:
- Bunne et al. 2022 (Proximal OT Modeling of Population Dynamics)
- Tong et al. 2023 (Simulation-Free Schr\u00f6dinger Bridge)

**Gate L1:** Now 3 strategies (keyword, snowball, author trail). PASS.

### EVALUATE
C-005: "Schr\u00f6dinger Bridge methods generalize OT trajectory inference by incorporating stochastic dynamics" (Type: INFERENCE, E=0.8, Confidence: 0.66)

**This is a MAJOR FINDING:** We now have >=3 distinct OT formulations (WOT, Neural OT, Schr\u00f6dinger Bridge, Steady-state OT). Success criterion approaching.

### CHECKPOINT
Major finding → **R2 FULL ENSEMBLE TRIGGERED**.

All 4 reviewers activated. Pass 1 (fatal-hunt):

R2-Methods: PASS (search now adequate, 3 strategies, 2 databases)
R2-Stats: N/A (no statistical claims yet)
R2-Bio: WEAK — "C-003 and C-005 are INFERENCE type but claim methodological novelty. Need to verify these are truly independent formulations, not reimplementations of same math."
R2-Eng: N/A (no code/pipeline reviewed)

Pass 2 (method-repair):
```yaml
falsification:
  - claim_id: C-003
    tests:
      - test: "Compare Neural OT loss function vs WOT formulation — are they mathematically distinct?"
        expected_if_true: "Different objective functions"
        expected_if_false: "Same objective with different solver"
      - test: "Check if Neural OT cites WOT as prior work vs independent development"
        expected_if_true: "Cites as related but distinct"
        expected_if_false: "Direct extension, not independent"
      - test: "Compare input requirements (time-series vs steady-state)"
        expected_if_true: "Different data requirements"
        expected_if_false: "Same requirements"
decision: WEAK_ACCEPT
conditions_for_upgrade: "Provide mathematical comparison table showing distinct formulations"
```

### CRYSTALLIZE
R2 response pending. Claims C-003, C-005 status → CHALLENGED.

---

## Cycle 4: Address R2, Build Comparison Table

### OBSERVE
R2 demands mathematical comparison. Need to verify independence of formulations.

### THINK
**Decision:** EXTRACT — deep-read the 5 key papers, extract mathematical formulations.

### ACT
**Load:** `data-extraction.md`
Read each paper's methods section. Extract:

| Method | Paper | OT Formulation | Key Difference from WOT |
|--------|-------|----------------|-------------------------|
| Waddington-OT | Schiebinger 2019 | Unbalanced OT with entropy regularization | Baseline |
| TrajectoryNet | Tong 2020 | Continuous normalizing flows guided by OT | Continuous dynamics, not discrete coupling |
| Neural OT | Bunne 2023 | Monge map parameterized by neural network | Learns transport map directly |
| Schr\u00f6dinger Bridge | Tong 2023 | Entropic OT as stochastic differential equation | Adds diffusion/noise to trajectories |
| Steady-state OT | Zhang 2021 | OT without time-series requirement | Works from snapshot data only |

Saved as `02-analysis/ot-comparison-table.md`.

### EVALUATE
**Gate D0 (Decision Justification):** Comparison table produced with 5 distinct formulations. Each has different mathematical objective. Evidence supports independence.

C-003 upgraded: VERIFIED (confidence 0.78)
C-005 upgraded: VERIFIED (confidence 0.74)

**SUCCESS CRITERION MET:** >=3 independent OT formulations identified (we found 5).

### CHECKPOINT
Success criterion approaching → prepare for final R2 review.

---

## Cycle 5: Final R2 Review + Conclusion

### OBSERVE
5 methods identified. Success criterion met. Need final R2 clearance.

### THINK
**Decision:** REVIEW — final ensemble review before concluding.

### ACT
**Load:** `reviewer2-ensemble.md`

Full ensemble, final review:

```yaml
ensemble_id: ENS-20260207-003
review_type: final
claim_ledger:
  - claim_id: C-001
    type: descriptive
    status: PASS
  - claim_id: C-002
    type: descriptive
    status: PASS
  - claim_id: C-003
    type: descriptive
    status: PASS
  - claim_id: C-004
    type: descriptive
    status: PASS
  - claim_id: C-005
    type: descriptive
    status: PASS
fatal_flaws: []
major_flaws:
  - id: MF-001
    domain: methods
    description: "No bioRxiv search performed. Possible recent preprints missed."
    demanded_evidence: "1 bioRxiv search query with results"
    suggested_fix: "Run bioRxiv search before concluding"
decision: WEAK_ACCEPT
conditions_for_upgrade: "Add bioRxiv search"
```

Quick bioRxiv search: 2 additional preprints found, neither presenting fundamentally new OT formulation. Added to knowledge base.

**Gate D2 (RQ Conclusion):**
- All success criteria addressed: YES (5 methods > 3 required)
- All major claims R2-reviewed: YES
- No unresolved FATAL FLAWS: YES
- Knowledge base updated: YES

D2: PASS.

### CRYSTALLIZE

```markdown
## Research Conclusion: SUCCESS

**RQ:** Are there published methods applying unbalanced OT to scRNA trajectory
inference beyond Waddington-OT?

**Answer:** Yes. At least 5 distinct formulations exist, each with different
mathematical objectives and data requirements.

**Key evidence:**
1. C-001: Waddington-OT (Schiebinger 2019) — baseline (confidence: 0.82)
2. C-002: TrajectoryNet (Tong 2020) — continuous flows (confidence: 0.68)
3. C-003: Neural OT (Bunne 2023) — learned transport maps (confidence: 0.78)
4. C-004: Steady-state OT (Zhang 2021) — no time-series needed (confidence: 0.72)
5. C-005: Schrodinger Bridge (Tong 2023) — stochastic dynamics (confidence: 0.74)

**Effort:** 5 cycles, 3 databases, 3 search strategies, 2 R2 reviews.
```

---

## Key Patterns Demonstrated

1. **Progressive disclosure:** Only loaded protocol files when needed (search-protocol in cycle 1, data-extraction in cycle 4)
2. **R2 as structural gate:** R2 forced author trail search (cycle 2→3) and mathematical comparison (cycle 3→4) — the loop could not advance without addressing demands
3. **Typed claims:** All claims typed as DATA or INFERENCE, with evidence standards matching
4. **Evidence floor:** No claim promoted without DOI verification (Gate L0)
5. **D0-D2 gates in action:** D0 justified the comparison table, D2 cleared the conclusion
6. **One action per cycle:** Each cycle did exactly one thing, verified it, and logged it
