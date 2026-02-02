# Deviation Rules

When and how to deviate from the planned research path.

## Philosophy

Research is not linear. Deviations happen. The question is: which deviations are acceptable autonomously, and which require human input?

**Guiding principle:** Deviate freely for TACTICAL decisions. Stop and ask for STRATEGIC decisions.

## Deviation Categories

### Category 1: AUTO-FIX (Do it, log it)

Small corrections that don't change direction.

| Situation | Action | Log Entry |
|-----------|--------|-----------|
| Typo in search query | Fix and re-run | "Fixed query typo: 'CRISPr' → 'CRISPR'" |
| API timeout | Retry up to 3x | "Scopus timeout, retry 2/3 succeeded" |
| Missing database | Add alternative | "Scopus down, used PubMed instead" |
| Duplicate result | Skip | "Skipped DOI:xxx (already analyzed)" |
| Broken DOI link | Try alternative source | "DOI redirect failed, used PubMed link" |
| Minor format issue | Normalize | "Converted Excel dates to ISO format" |

**No permission needed. Just do it and log.**

### Category 2: ADD (Expand scope slightly)

Missing elements that clearly belong.

| Situation | Action | Log Entry |
|-----------|--------|-----------|
| Obvious keyword missing | Add to search | "Added 'genome editing' synonym to query" |
| Key author discovered | Add author search | "Added author search for Lazzarotto C" |
| Related database found | Include | "Added OpenAlex for citation network" |
| Supporting evidence needed | Fetch | "Retrieved supporting paper for claim" |
| Missing control comparison | Add | "Added wild-type comparison from same study" |

**Allowed if clearly supports current RQ. Log the addition.**

### Category 3: ACCUMULATE (Track, don't act yet)

Interesting findings that aren't the current focus.

| Situation | Action | Log Entry |
|-----------|--------|-----------|
| Tangential finding | Log to SERENDIPITY.md | "Noted: CRISPR affects X - not current RQ" |
| Potential future RQ | Log for later | "Potential RQ: Does Y apply to Z?" |
| Interesting methodology | Bookmark | "Bookmarked: Alternative approach in Paper X" |
| Counter-evidence | Accumulate | "Counter-evidence #2 for batch review" |

**Don't pursue immediately. Don't ignore. Log and continue.**

### Category 4: STOP AND DECIDE (Human input needed)

Strategic changes requiring approval.

| Situation | Required Action | Why Stop? |
|-----------|-----------------|-----------|
| **RQ pivot** | Ask human | Changes entire research direction |
| **Kill condition hit** | Confirm with human | Ends significant effort |
| **Scope expansion** | Ask human | May exceed time/resources |
| **Methodology change** | Ask human | Different approach entirely |
| **Conflicting findings** | Present options | Human judgment needed |
| **Access/ethics issue** | Stop immediately | Cannot proceed without resolution |
| **Data quality concern** | Flag and ask | May invalidate findings |

**NEVER make strategic decisions autonomously.**

### Category 5: STOP IMMEDIATELY (Red flags)

Situations requiring immediate halt.

| Situation | Action | Why? |
|-----------|--------|------|
| Potential fabricated data in source | STOP | Integrity |
| Retracted paper discovered | STOP | Invalid evidence |
| Ethical concerns in methodology | STOP | Cannot use |
| Access violation risk | STOP | Legal |
| Contradiction with core evidence | STOP | May invalidate RQ |

**Stop loop. Document concern. Wait for human resolution.**

## Decision Tree

```
Deviation detected
│
├─ Is it tactical (query fix, retry, format)?
│   └─ YES → AUTO-FIX (Category 1)
│
├─ Does it clearly support current RQ?
│   └─ YES → ADD (Category 2)
│
├─ Is it interesting but not current focus?
│   └─ YES → ACCUMULATE (Category 3)
│
├─ Does it change research direction?
│   └─ YES → STOP AND DECIDE (Category 4)
│
└─ Is it a red flag (ethics, integrity, legal)?
    └─ YES → STOP IMMEDIATELY (Category 5)
```

## Examples

### Example 1: Missing Synonym

**Situation:** Searching "CRISPR off-target" returns 500 papers. Realize "genome editing off-target" might catch more.

**Decision:** Category 2 (ADD)

**Action:** Add synonym query, log it, continue.

```markdown
### Cycle 12 - 14:30
- **Deviation:** Added synonym query
- **Query added:** "genome editing" AND "off-target"
- **Reason:** Broader coverage
- **New results:** +47 papers (12 unique)
```

### Example 2: Serendipitous Finding

**Situation:** While searching for GUIDE-seq methods, find paper on GUIDE-seq applied to CAR-T safety.

**Decision:** Category 3 (ACCUMULATE)

**Action:** Log to SERENDIPITY.md, don't pursue now.

```markdown
## SERENDIPITY.md entry

### 2025-01-30 - CAR-T Safety Application

**Original search:** GUIDE-seq methodology
**Found:** Zhang 2023 - GUIDE-seq for CAR-T off-target profiling
**Relevance:** Different application of same method
**Potential RQ:** Could UOT improve CAR-T safety prediction?
**Action:** Logged. Not pursuing now. May revisit after current RQ.
```

### Example 3: Conflicting Evidence

**Situation:** Paper A says UOT handles mass imbalance. Paper B says standard OT with reweighting is equivalent.

**Decision:** Category 4 (STOP AND DECIDE)

**Action:** Stop loop, present conflict to human.

```markdown
─────────────────────────────────────────
DEVIATION: Conflicting Evidence
─────────────────────────────────────────

**Finding:** Two papers disagree on UOT vs reweighted OT

**Paper A (Chizat 2018):**
> "Unbalanced OT provides principled handling of mass changes"

**Paper B (Peyré 2019):**
> "Reweighting can achieve similar results in many cases"

**Options:**
1. Investigate which applies to our specific case (CRISPR/GUIDE-seq)
2. Pivot to comparing both approaches
3. Accept limitation and note in findings

**Waiting for human decision.**
─────────────────────────────────────────
```

### Example 4: Retracted Paper in Evidence Chain

**Situation:** Key supporting paper (Evidence #2 in chain) was retracted.

**Decision:** Category 5 (STOP IMMEDIATELY)

**Action:** Halt everything, document, wait.

```markdown
─────────────────────────────────────────
🚨 CRITICAL: Retracted Paper in Evidence Chain
─────────────────────────────────────────

**Paper:** Smith 2021 (DOI:10.xxx)
**Role in our research:** Evidence #2 supporting UOT applicability
**Retraction notice:** https://...
**Reason:** Data integrity concerns

**Impact:**
- Directly affects Finding #3
- May invalidate supporting argument

**Action taken:**
- Loop HALTED
- Finding #3 flagged as potentially invalid
- Human decision required

**Options for human:**
1. Find alternative evidence for the claim
2. Remove claim from findings
3. Reassess entire RQ validity

**WAITING FOR RESOLUTION**
─────────────────────────────────────────
```

## Deviation Logging

All deviations must be logged. Format:

```markdown
### Deviation Log Entry

**Cycle:** 15
**Time:** 2025-01-30 14:45
**Category:** [1-5]
**Situation:** [What happened]
**Decision:** [What was decided]
**Action:** [What was done]
**Rationale:** [Why this was appropriate]
```

For Categories 1-3, log and continue.
For Categories 4-5, log and STOP.

## Integration with Loop

In `/vibe-science:loop`, after each step:

```markdown
[Step complete]

Deviation check:
- Unexpected result? → Classify
- Category 1-2? → Handle and continue
- Category 3? → Log and continue
- Category 4-5? → STOP

[Next step or STOP]
```

## Remember

Deviations are NORMAL in research. The system is designed to handle them.

The rules exist to:
1. **Empower** autonomous handling of routine issues
2. **Protect** against unilateral strategic changes
3. **Document** everything for reproducibility

When in doubt, err toward STOP AND DECIDE. Better to ask than to derail.
