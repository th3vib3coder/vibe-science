# vibe-science:loop v2.0 - ENHANCED RESEARCH LOOP

**11 PHASES instead of 6** - More rigorous, more complete.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                 VIBE SCIENCE LOOP v2.0                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 0: EXPERT SCAN                                          │
│     └─ What do experts say informally?                         │
│                                                                 │
│  PHASE 1: CRYSTALLIZE STATE                                    │
│     └─ Verify STATE.md consistent with PROGRESS.md             │
│     └─ Check pending items and blockers                        │
│                                                                 │
│  PHASE 2: FORMAL SEARCH                                        │
│     └─ Scopus → PubMed → OpenAlex → bioRxiv                   │
│                                                                 │
│  PHASE 3: SEARCH REFINEMENT                                    │
│     └─ Refine queries based on Phase 2 results                 │
│     └─ Synonym expansion, citation tracking                    │
│                                                                 │
│  PHASE 4: ANALYZE FINDINGS                                     │
│     ├─ Major finding? → Verification Gates → R2                │
│     └─ Minor finding? → Accumulate (batch @ 3)                 │
│                                                                 │
│  PHASE 5: COMPETITOR SCAN                                      │
│     └─ Who else is working on this?                            │
│     └─ Recent preprints, grants, patents                       │
│                                                                 │
│  PHASE 6: EXTRACT DATA                                         │
│     └─ Download supplementary (NO TRUNCATION)                  │
│     └─ Parse tables, verify accessibility                      │
│                                                                 │
│  PHASE 7: VALIDATE                                             │
│     └─ Orthogonal validation with 2+ datasets                  │
│     └─ Data exists? Continue : STOP                            │
│                                                                 │
│  PHASE 8: ASSUMPTION CHECK                                     │
│     └─ Update ASSUMPTIONS.md                                   │
│     └─ Flag critical unverified assumptions                    │
│                                                                 │
│  PHASE 9: CONFIDENCE UPDATE                                    │
│     └─ Recalculate confidence scores                           │
│     └─ Check for explosion (>0.30 in 2 cycles)                 │
│                                                                 │
│  PHASE 10: STOP CONDITIONS                                     │
│     ├─ Goal achieved? → FINAL REVIEW → EXIT                    │
│     ├─ Dead end? → EXIT with NEGATIVE                          │
│     ├─ Serendipity? → TRIAGE → PIVOT or LOG                   │
│     ├─ Diminishing returns? → WARN                             │
│     └─ None? → LOOP BACK TO PHASE 1                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 0: EXPERT SCAN (NEW)

**Purpose:** Capture informal expert knowledge before formal search.

```markdown
### Expert Scan

**Twitter/X/Bluesky threads:**
- @expert1: "Working on OT for single-cell..." (link)
- @expert2: No recent posts on topic

**Recent conference talks:**
- ISMB 2025: Session on computational biology methods
- Checked: No OT+CRISPR talks found

**Lab websites checked:**
- Schiebinger lab: Waddington-OT project
- No CRISPR applications mentioned

**Verdict:** No informal signals of competition. Proceed.
```

**Block if:** Major competitor discovered → escalate to PHASE 5 immediately

---

## PHASE 1: CRYSTALLIZE STATE (ENHANCED)

**Purpose:** Resume with verified consistency.

**Checks:**
```
□ STATE.md exists and is recent (<12h)
□ STATE.md "Next Action" is specific and actionable
□ STATE.md consistent with last 10 entries in PROGRESS.md
□ minor_findings_pending < 5 (else: trigger batch R2)
□ No unresolved R2 mandatory responses
□ All verification gates PASS
```

**If inconsistency found:**
```markdown
### Consistency Alert

STATE.md says: "Next: Extract Kim 2020 data"
PROGRESS.md Cycle 14 says: "Kim 2020 data extracted"

Resolution: Update STATE.md to match PROGRESS.md
Action: Set Next Action to "Analyze Kim 2020 data"
```

---

## PHASE 2: FORMAL SEARCH

**Purpose:** Systematic literature search across tier-1 databases.

**Databases (in order):**
1. Scopus (comprehensive, citation data)
2. PubMed (biomedical focus)
3. OpenAlex (open, good for connections)
4. bioRxiv/medRxiv (preprints <6 months)

**Query Log Format:**
```json
{
  "cycle": 15,
  "phase": 2,
  "timestamp": "2026-02-06T10:30:00Z",
  "database": "Scopus",
  "query": "TITLE-ABS-KEY(\"optimal transport\") AND TITLE-ABS-KEY(CRISPR)",
  "results_count": 57,
  "relevant_count": 4,
  "papers_to_review": ["doi1", "doi2", "doi3", "doi4"]
}
```

---

## PHASE 3: SEARCH REFINEMENT (NEW)

**Purpose:** Iterative search based on Phase 2 results.

**Steps:**
1. Analyze Phase 2 results for new keywords
2. Expand with synonyms
3. Citation tracking (forward and backward)
4. Author tracking

```markdown
### Search Refinement

**From Phase 2:** Found "Wasserstein distance" in Schiebinger 2019
**Action:** Add synonym search

**Synonym queries added:**
- "Wasserstein distance" CRISPR → 12 results (3 new relevant)
- "earth mover distance" CRISPR → 2 results (0 new)

**Citation tracking:**
- Papers citing Tsai 2015: 457 total, 23 mention "computational"
- Reviewed 23: 2 potentially relevant

**Refinement complete:** Added 5 papers to review queue
```

---

## PHASE 4: ANALYZE FINDINGS

**Purpose:** Evaluate papers and generate findings.

**Classification:**
```
MAJOR if:
  - Absolute novelty (0 prior papers)
  - Contradicts evidence chain
  - Would change RQ conclusion
  - High confidence (>0.7) potential

MINOR if:
  - Supports existing finding
  - Adds detail without changing direction
  - Low-medium confidence
```

**Workflow:**
```
Paper reviewed
    ↓
Finding generated
    ↓
Classification (MAJOR/MINOR)
    ↓
IF MAJOR:
    → Verification Gates (all must PASS)
    → Reviewer 2 IMMEDIATE
    → Block until R2 complete

IF MINOR:
    → Add to pending queue
    → IF pending >= 3: Trigger batch R2
```

---

## PHASE 5: COMPETITOR SCAN (NEW)

**Purpose:** Check who else is working on this problem.

**Sources to check:**
```
□ bioRxiv/medRxiv (last 3 months)
□ arXiv (last 3 months)
□ NIH Reporter (active grants)
□ NSF Awards (active)
□ ERC grants (if relevant)
□ Google Patents (last year)
□ Lab websites of key researchers
```

**Competitor Report:**
```markdown
### Competitor Scan

**Preprints (last 3 months):**
- bioRxiv: 0 matches for "UOT" + "CRISPR"
- arXiv: 0 matches

**Active Grants:**
- NIH: 2 grants mention "optimal transport" + "genomics" (neither CRISPR specific)
- NSF: 1 grant on OT methods (theoretical, not applications)

**Patents:**
- 0 relevant patents

**Key Lab Activity:**
- Schiebinger lab: No CRISPR projects listed
- Tsai lab: Focus on GUIDE-seq methodology, not OT

**Verdict:** No immediate competition. Proceed normally.
**Risk:** LOW (no one actively pursuing this specific combination)
```

**If competitor found:**
```markdown
### Competition Alert!

**Competitor:** Preprint by Smith et al., bioRxiv 2026.01.15
**Title:** "Optimal Transport for CRISPR Off-Target Analysis"
**Overlap:** HIGH (same core idea)

**Action Required:**
1. Read preprint immediately
2. Identify differentiation opportunities
3. Decision: Pivot, accelerate, or acknowledge in limitations
```

---

## PHASE 6: EXTRACT DATA

**Purpose:** Download and verify supplementary materials.

**NO TRUNCATION RULE:**
- File < 50MB: Read complete
- File 50-500MB: Read in chunks, log coverage
- File > 500MB: Contact authors for subset

**Extraction Log:**
```markdown
### Data Extraction

**Paper:** Tsai 2015
**DOI:** 10.1038/nbt.3117

**Files:**
| File | Size | Status | Location |
|------|------|--------|----------|
| Table S1 | 2.3MB | Downloaded | data/tsai2015_s1.csv |
| Table S2 | 0.5MB | Downloaded | data/tsai2015_s2.csv |
| Methods S1 | 0.2MB | Downloaded | data/tsai2015_methods.pdf |

**Verification:**
- Row count Table S1: 2,847 (matches paper: "2,847 off-target sites")
- Column names: gene_id, position, read_count, significance ✓
- No missing values in key columns ✓
- MD5 hash stored for integrity
```

---

## PHASE 7: VALIDATE (ENHANCED)

**Purpose:** Orthogonal validation with multiple datasets.

**Requirements for HIGH confidence:**
- Finding must replicate in 2+ independent datasets
- If only 1 dataset: confidence capped at MEDIUM

```markdown
### Orthogonal Validation

**Finding:** GUIDE-seq count data shows mass imbalance pre/post editing

**Dataset 1:** Tsai 2015
- Pre-editing reads: 1,247,832
- Post-editing reads: 892,156
- Difference: -28.5%
- Verdict: SUPPORTS hypothesis

**Dataset 2:** Lazzarotto 2020
- Pre-editing reads: 987,234
- Post-editing reads: 723,456
- Difference: -26.7%
- Verdict: SUPPORTS hypothesis

**Orthogonal Validation:** PASS (2 datasets, consistent direction)
**Confidence Upgrade:** MEDIUM → HIGH eligible
```

**If validation fails:**
```markdown
### Validation Failure

**Dataset 2:** Kim 2020
- Pre-editing reads: 1,123,456
- Post-editing reads: 1,089,234
- Difference: -3.0%
- Verdict: CONTRADICTS hypothesis

**Action:**
- Investigate methodology difference
- Do NOT upgrade confidence
- Document contradiction in finding
```

---

## PHASE 8: ASSUMPTION CHECK (NEW)

**Purpose:** Keep assumptions explicit and tracked.

**Checklist:**
```
□ Any new assumptions made this cycle?
□ Any existing assumptions challenged by findings?
□ Critical assumptions still valid?
□ ASSUMPTIONS.md updated?
```

**Update Example:**
```markdown
### Assumption Update (Cycle 15)

**New Assumption Added:**
A5: Lazzarotto 2020 methodology comparable to Tsai 2015
- Criticality: MEDIUM
- Verification: Partial (methods sections compared)

**Existing Assumption Status:**
A1 (GUIDE-seq representativity): Still valid, no new evidence
A2 (Cell death random): CHALLENGED by finding in Cycle 14
- Action: Upgrade to CRITICAL, add risk mitigation
```

---

## PHASE 9: CONFIDENCE UPDATE (NEW)

**Purpose:** Quantitative confidence tracking.

**Calculate using config/confidence_scoring.yaml**

```markdown
### Confidence Update (Cycle 15)

**FINDING-001:**
| Component | Previous | Current | Delta |
|-----------|----------|---------|-------|
| Sources | 0.65 | 0.75 | +0.10 |
| Data | 0.80 | 0.85 | +0.05 |
| Methodology | 0.70 | 0.70 | 0.00 |
| Reviewer 2 | 0.10 | 0.15 | +0.05 |
| **TOTAL** | 0.56 | 0.61 | +0.05 |

**Level:** MEDIUM (maintained)
**Trajectory:** ↑ (improving)
```

**Explosion Check:**
```
IF delta > 0.30 in 2 cycles:
    TRIGGER: Forced Reviewer 2 check
    REASON: Possible confirmation bias
```

---

## PHASE 10: STOP CONDITIONS

**Check in order:**

### 1. Goal Achieved?
```
IF all success criteria in RQ.md satisfied:
    AND all major findings R2-approved:
    AND no outstanding mandatory R2 responses:
    AND numerical validation obtained:
    → TRIGGER: Final R2 review
    → IF approved: EXIT with SUCCESS
```

### 2. Dead End Confirmed?
```
IF hypothesis definitively disproven:
    OR data unavailable and cannot proceed:
    OR critical assumption falsified:
    → EXIT with NEGATIVE (documented)
```

### 3. Serendipity Found?
```
IF unexpected discovery with high potential:
    → Create SERENDIPITY-TRIAGE.md
    → Assess novelty, data, impact
    → DECISION:
        - HIGH potential: Create new RQ, consider pivot
        - MEDIUM potential: Queue for later
        - LOW potential: Document and continue
```

### 4. Diminishing Returns?
```
IF cycles > 15:
    AND new_finding_rate < 1 per 3 cycles:
    → WARN: Possible over-exploration
    → OPTIONS:
        - 3 more targeted cycles
        - Conclude with current evidence
        - Pivot to related question
```

### 5. None Apply?
```
→ Update STATE.md with specific Next Action
→ Log cycle summary to PROGRESS.md
→ LOOP BACK TO PHASE 1
```

---

## CYCLE SUMMARY FORMAT

At end of each cycle:

```markdown
## Cycle 15 Summary

**Date:** 2026-02-06
**Duration:** 45 minutes

**Phases Completed:**
- [x] Expert Scan (no signals)
- [x] Crystallize (consistent)
- [x] Formal Search (23 new papers)
- [x] Refinement (+5 papers from synonyms)
- [x] Analyze (1 major, 2 minor)
- [x] Competitor Scan (no threats)
- [x] Extract Data (Lazzarotto 2020)
- [x] Validate (orthogonal: PASS)
- [x] Assumption Check (A2 upgraded)
- [x] Confidence Update (+0.05)
- [x] Stop Check (continue)

**Major Findings:** 1 (pending R2)
**Minor Findings:** 2 (total pending: 2)
**Confidence Change:** +0.05 (MEDIUM maintained)
**Next Action:** Complete R2 for FINDING-007

**Blockers:** None
**Serendipity:** None
```

---

## COMPARISON: v1.0 vs v2.0

| Aspect | v1.0 (6 phases) | v2.0 (11 phases) |
|--------|-----------------|------------------|
| Expert scan | None | Phase 0 |
| Search refinement | None | Phase 3 |
| Competitor scan | None | Phase 5 |
| Orthogonal validation | Optional | Required (Phase 7) |
| Assumption tracking | Implicit | Explicit (Phase 8) |
| Confidence scoring | Subjective | Quantitative (Phase 9) |
| Diminishing returns | None | Detected (Phase 10) |
| Verification gates | None | Integrated throughout |

---

## USAGE

```
/vibe-science:loop              # Execute full cycle
/vibe-science:loop --quick      # Skip Phase 0, 5 (for rapid iteration)
/vibe-science:loop --validate   # Focus on Phases 6-9 (data focus)
/vibe-science:loop --conclude   # Focus on Phase 10 (wrap up)
```
