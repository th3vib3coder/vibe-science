# Example Walkthrough: Literature-Based Research Question

This annotated example shows a complete Vibe Science session investigating a literature-based research question through 5 OTAE cycles.

## Session Start

**User:** "Use vibe-science to explore whether PAM4 modulation provides a net advantage over NRZ for VCSEL-based IM-DD links at 50+ Gb/s."

**Vibe Science responds:**

```
Vibe Science v5.0 Photonics activated for: PAM4 vs NRZ comparison for VCSEL-based IM-DD
Mode: DISCOVERY
Constitution loaded. R2-Physics Ensemble armed. Gates active.
Expert Knowledge Injection: ready (provide domain assertions anytime).
```

### RQ Shaping (conversational)

- **Testable hypothesis:** PAM4 achieves lower BER and longer reach than NRZ at equivalent data rates (50+ Gb/s) for 850nm VCSEL-based IM-DD links over multimode fiber, at the cost of higher energy consumption and DSP complexity.
- **Success criteria:** Identify >=5 independent studies with direct PAM4 vs NRZ comparison at matched conditions. Quantify power penalty advantage with >=3 studies agreeing on direction.
- **Kill conditions:** <3 comparable studies after exhaustive search across 3+ databases. OR: results are entirely device-specific with no generalizable trend.
- **Scope:** ~10 cycles.

### Initialization

Creates `.vibe-science/` with:
- `STATE.md` (version: 5.0.0-photonics, phase: discovery, cycle: 1)
- `PROGRESS.md`, `CLAIM-LEDGER.md`, `ASSUMPTION-REGISTER.md`, `SERENDIPITY.md`
- `EXPERT-ASSERTIONS.md` (empty, ready for expert input)
- `RQ-001-pam4-vs-nrz/RQ.md`

---

## Cycle 1: First Literature Search

### OBSERVE
Read STATE.md: cycle 1, new session, no prior findings.

### THINK
**Decision:** SEARCH — need initial literature scan.
Query: "VCSEL" AND "PAM4" AND ("50 Gb/s" OR "100 Gb/s") AND ("IM-DD" OR "intensity modulation").
Databases: IEEE Xplore first (primary source for photonics), then OpenAlex.

### ACT
**Load:** `search-protocol.md` + `skill-router.md`
**Dispatch to:** `openalex-database` skill + `web_search` (IEEE Xplore)

Search results: 18 total, 9 relevant, 9 new.
Logged in `01-discovery/queries.log`.

Papers flagged for deep-dive:
1. Kuchta et al. 2020 — 50 Gb/s NRZ and PAM4 VCSEL comparison — DOI:10.1109/JLT.2020.example1
2. Lavrencik et al. 2021 — 100 Gb/s PAM4 over MMF — DOI:10.1364/OE.example1
3. Szczerba et al. 2019 — Energy efficiency comparison NRZ vs PAM4 — DOI:10.1109/JLT.2019.example1

### EVALUATE
**Gate L0 (Source Validity):** 3 DOIs to verify.
- DOI 1: PASS (IEEE JLT, peer-reviewed)
- DOI 2: PASS (Optics Express, peer-reviewed)
- DOI 3: PASS (IEEE JLT, peer-reviewed)

**Claims extracted:**
- C-001: "PAM4 achieves 1.8 dB lower power penalty than NRZ at 50 Gb/s over 100m OM4 at 25°C" (Type: DATA, E=1.0, Confidence: 0.78)
- C-002: "PAM4 requires ~50% more DSP power than NRZ at equivalent data rate" (Type: DATA, E=0.8, Confidence: 0.65)

### CHECKPOINT
No R2 trigger (no major finding yet, only 2 minor claims).

### CRYSTALLIZE
Update STATE.md: cycle=1, claims_total=2, queries_run=1.
Append to PROGRESS.md: Cycle 1 summary.

---

## Cycle 2: Expand Search + Expert Knowledge Harvest

### OBSERVE
Cycle 2. 2 claims, both UNVERIFIED. Need more coverage.

### THINK
**Decision:** SEARCH — snowball from Kuchta 2020 (forward citations) + Optica search.

### ACT
**Dispatch to:** `openalex-database` skill (forward citations of DOI 1)

Results: 42 citing papers. Filtered by relevance: 6 new candidates.
Key finds:
- Patel et al. 2022 (100 Gb/s PAM4 VCSEL at 850nm) — DOI:10.1109/JLT.2022.example1
- Wang et al. 2023 (Temperature-dependent PAM4 vs NRZ comparison) — DOI:10.1364/OE.example2

**Expert assertion captured** (user input): "At high temperature (>70°C), VCSEL bandwidth degrades significantly. Any comparison that doesn't control for temperature is unreliable."
→ EA-001 created in EXPERT-ASSERTIONS.md. Confidence floor: 0.70.

**Gate L1 (Coverage):** 2 databases searched, 2 search strategies (keyword + snowball). Needs >=3 strategies. STATUS: PARTIAL.

### EVALUATE
**Claims extracted:**
- C-003: "100 Gb/s PAM4 VCSEL-based link achieves BER < 2.4e-4 over 100m OM4 at 25°C" (Type: DATA, E=0.8, Confidence: 0.72)
- C-004: "Temperature increase from 25°C to 85°C degrades PAM4 BER by >10x" (Type: DATA, E=0.8, Confidence: 0.74)

**EA-001 collision check:** C-001 does not specify temperature → flagged for confounder control per EA-001.

**minor_findings_pending:** 4 (accumulated).

### CHECKPOINT
minor_findings_pending >= 3 → **R2 BATCH REVIEW TRIGGERED**.

**Load:** `reviewer2-ensemble.md`
**Activated:** R2-Physics (physical plausibility check)

R2-Physics verdict (batch):
```yaml
decision: WEAK_ACCEPT
motivation: |
  Search covers 2 databases and 2 strategies.
  L1 gate requires >=3 strategies — missing conference proceeding search (OFC/ECOC).
  C-001 needs temperature control per expert assertion EA-001.
  C-004 is consistent with known VCSEL thermal physics.
demanded_evidence:
  - item: "OFC/ECOC conference search for recent PAM4 vs NRZ results"
    type: citation
    deadline: before_next_cycle
  - item: "Confounder harness for C-001 controlling for temperature"
    type: analysis
    deadline: within_2_cycles
convince_me:
  - artifact: "Comparison table with temperature as controlled variable"
    verdict_if_provided: ACCEPT
```

### CRYSTALLIZE
Update: cycle=2, claims_total=4, R2 pending response needed.

---

## Cycle 3: Address R2 Feedback + Conference Search

### OBSERVE
R2 demanded conference search and temperature-controlled comparison. Must address before advancing.

### THINK
**Decision:** SEARCH — OFC/ECOC proceedings + SPIE Photonics West for recent PAM4 vs NRZ results.

### ACT
Conference search via web_search: OFC 2023-2025, ECOC 2023-2025 proceedings.
3 additional relevant conference papers found:
- OFC 2024: 200 Gb/s PAM4 VCSEL demonstration at 25°C and 75°C
- ECOC 2023: Systematic NRZ vs PAM4 comparison across temperature range
- OFC 2025: Energy-efficient PAM4 with low-power DSP

**Gate L1:** Now 3 strategies (keyword, snowball, conference search). PASS.

### EVALUATE
C-005: "PAM4 power penalty advantage over NRZ increases with data rate: 1.2 dB at 50 Gb/s, 2.8 dB at 100 Gb/s" (Type: DATA, E=0.6 (conference), Confidence: 0.64)

**This is a MAJOR FINDING:** We now have >=5 studies with PAM4 vs NRZ comparisons. Success criterion approaching.

### CHECKPOINT
Major finding → **R2 FULL ENSEMBLE TRIGGERED**.

R2-Physics: PASS (search now adequate, 3 strategies, 3 databases)
R2-Physics: WEAK — "C-001 still lacks temperature-controlled comparison. C-005 is conference-only (E=0.6). Need peer-reviewed confirmation."

Pass 2 (method-repair):
```yaml
falsification:
  - claim_id: C-001
    tests:
      - test: "Compare PAM4 advantage at 25°C vs 85°C — does advantage hold?"
        expected_if_true: "PAM4 advantage persists (possibly reduced) at high temperature"
        expected_if_false: "PAM4 advantage disappears or reverses at high temperature"
      - test: "Check if studies reporting PAM4 advantage used equalization — unfair comparison if NRZ had no EQ"
        expected_if_true: "Both use comparable DSP or comparison explicitly noted"
        expected_if_false: "PAM4 had advanced DSP, NRZ was raw — confounded"
decision: WEAK_ACCEPT
conditions_for_upgrade: "Provide temperature-controlled comparison table"
```

### CRYSTALLIZE
R2 response pending. Claim C-001 status → CHALLENGED.

---

## Cycle 4: Address R2, Build Comparison Table

### OBSERVE
R2 demands temperature-controlled comparison. Need to verify PAM4 advantage isn't confounded.

### THINK
**Decision:** EXTRACT — deep-read the 7 key papers, extract performance data with temperature as controlled variable.

### ACT
**Load:** `data-extraction.md`
Read each paper's results section. Extract:

| Study | Device | Data Rate (Gb/s) | Mod. | Temp (°C) | Fiber | Length (m) | BER | Power Penalty (dB) | Equalization |
|-------|--------|-------------------|------|-----------|-------|------------|-----|---------------------|-------------|
| Kuchta 2020 | VCSEL_850nm | 50 | PAM4 | 25 | OM4 | 100 | 2.1e-4 | 1.8 | FFE |
| Kuchta 2020 | VCSEL_850nm | 50 | NRZ | 25 | OM4 | 100 | 3.5e-4 | 3.9 | FFE |
| Wang 2023 | VCSEL_850nm | 50 | PAM4 | 85 | OM4 | 100 | 8.5e-4 | 4.2 | FFE+DFE |
| Wang 2023 | VCSEL_850nm | 50 | NRZ | 85 | OM4 | 100 | 1.2e-3 | 5.8 | FFE+DFE |
| Patel 2022 | VCSEL_850nm | 100 | PAM4 | 25 | OM4 | 100 | 1.9e-4 | 3.1 | FFE+DFE |

Saved as `02-analysis/pam4-nrz-comparison-table.md`.

**Confounder harness for C-001:**
- Raw: PAM4 advantage = 2.1 dB (not controlling temperature)
- Conditioned: PAM4 advantage = 1.6 dB (controlling for temperature at matched conditions)
- Matched: PAM4 advantage = 1.5 dB (matched device, fiber, equalization)
- Verdict: **ROBUST** (same sign, <50% collapse: 2.1 → 1.5 dB = 29% reduction)

### EVALUATE
**Gate D0 (Decision Justification):** Comparison table produced with temperature as controlled variable. Confounder harness passed.

C-001 upgraded: ROBUST (confidence 0.82)
C-006 new: "PAM4 advantage persists at 85°C but is reduced from 2.1 dB to 1.6 dB power penalty difference" (Type: DATA, confidence: 0.76)

**SUCCESS CRITERION MET:** >=5 studies with direct comparison, >=3 agreeing on PAM4 advantage direction.

### CHECKPOINT
Success criterion approaching → prepare for final R2 review.

---

## Cycle 5: Final R2 Review + Conclusion

### OBSERVE
7 studies analyzed. Success criterion met. Need final R2 clearance.

### THINK
**Decision:** REVIEW — final ensemble review before concluding.

### ACT
**Load:** `reviewer2-ensemble.md`

Full ensemble, final review:

```yaml
ensemble_id: ENS-20260218-003
review_type: final
claim_ledger:
  - claim_id: C-001
    type: descriptive
    status: ROBUST (harness PASS)
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
    status: PASS (conference source noted)
  - claim_id: C-006
    type: descriptive
    status: PASS
fatal_flaws: []
major_flaws:
  - id: MF-001
    domain: physics
    description: "Energy efficiency comparison incomplete. PAM4 DSP overhead not quantified for all studies."
    demanded_evidence: "Summary of DSP power estimates where available"
    suggested_fix: "Add caveat to conclusion about DSP overhead"
decision: WEAK_ACCEPT
conditions_for_upgrade: "Add energy efficiency caveat"
```

Added energy efficiency caveat to conclusion. R2 upgraded to ACCEPT.

**Gate D2 (RQ Conclusion):**
- All success criteria addressed: YES (7 studies > 5 required, 5 agree on direction)
- All major claims R2-reviewed: YES
- No unresolved FATAL FLAWS: YES
- Confounder harness completed: YES (C-001 ROBUST)
- Expert assertions consulted: YES (EA-001 addressed)
- Knowledge base updated: YES

D2: PASS.

### CRYSTALLIZE

```markdown
## Research Conclusion: SUCCESS

**RQ:** Does PAM4 provide a net advantage over NRZ for VCSEL-based IM-DD
links at 50+ Gb/s?

**Answer:** Yes, with caveats. PAM4 consistently achieves lower power penalty
and longer reach than NRZ at 50+ Gb/s, but the advantage is
temperature-dependent and comes at the cost of higher DSP complexity and
energy consumption.

**Key evidence:**
1. C-001: PAM4 achieves 1.5-2.1 dB lower power penalty at 50 Gb/s (confidence: 0.82, harness: ROBUST)
2. C-004: Temperature degrades PAM4 BER >10x from 25°C to 85°C (confidence: 0.74)
3. C-005: PAM4 advantage increases with data rate (confidence: 0.64, conference source)
4. C-006: PAM4 advantage persists at 85°C but reduced by ~30% (confidence: 0.76)

**Confounder Harness Summary:**
| Claim | Raw → Conditioned → Matched | Verdict |
|-------|------------------------------|---------|
| C-001 | 2.1 dB → 1.6 dB → 1.5 dB | ROBUST |

**Expert Assertions:**
- EA-001: Temperature control mandatory for fair comparison — ADDRESSED

**Reviewer Ensemble clearance:** ENS-20260218-003 (ACCEPT with energy caveat)

**Effort:** 5 cycles, 3 databases, 3 search strategies, 2 R2 reviews.
```

---

## Key Patterns Demonstrated

1. **Progressive disclosure:** Only loaded protocol files when needed (search-protocol in cycle 1, data-extraction in cycle 4)
2. **R2 as structural gate:** R2 forced conference search (cycle 2→3) and temperature comparison (cycle 3→4) — the loop could not advance without addressing demands
3. **Expert Knowledge Injection:** EA-001 (temperature control) shaped the entire investigation direction
4. **Confounder harness in action:** C-001 passed raw → conditioned → matched with 29% reduction but same sign = ROBUST
5. **Typed claims:** All claims typed as DATA with evidence standards matching
6. **Evidence floor:** No claim promoted without DOI verification (Gate L0)
7. **D0-D2 gates in action:** D0 justified the comparison table, D2 cleared the conclusion
8. **One action per cycle:** Each cycle did exactly one thing, verified it, and logged it
