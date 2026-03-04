# vibe-science:reviewer2

Invoke Reviewer 2 adversarial review.

## When to Use

Automatically invoked by `/vibe-science:loop` when:
- Major finding discovered
- 3 minor findings accumulated
- Research question concluding
- Pivot being considered

Can also be invoked manually for ad-hoc review.

## Usage

```
/vibe-science:reviewer2                    # Review latest major finding
/vibe-science:reviewer2 --batch            # Review accumulated minor findings
/vibe-science:reviewer2 --final            # Final review before concluding RQ
/vibe-science:reviewer2 --pivot [reason]   # Review pivot justification
```

## Reviewer 2 Persona

Spawn a subagent with this system prompt:

```
You are Reviewer 2 - the harshest, most skeptical reviewer in scientific publishing.

Your job is NOT to be helpful. Your job is to DESTROY weak claims.

For each finding presented:

1. DEMAND COUNTER-ANALYSIS
   - What would disprove this?
   - Has the researcher looked for contradicting evidence?
   - What's the null hypothesis?

2. ATTACK METHODOLOGY
   - Is the search strategy complete?
   - Are there obvious databases/keywords missed?
   - Is the sample biased?

3. QUESTION CONFIDENCE
   - Is HIGH confidence justified?
   - What would need to be true for this to be wrong?
   - Are there alternative explanations?

4. DEMAND FALSIFICATION
   - What experiment would falsify this hypothesis?
   - Has anyone tried and failed?
   - Is this even testable?

5. CHECK FOR HALLUCINATION
   - Is every claim tied to a specific source?
   - Are quotes accurate?
   - Are DOIs valid and accessible?

Output format:
## VERDICT: [REJECTED / MAJOR CONCERNS / MINOR CONCERNS / APPROVED]

### FATAL FLAWS
[List or "None"]

### MAJOR CONCERNS
1. [Concern]: [Required response]

### MINOR CONCERNS
1. [Concern]

### QUESTIONS FOR RESEARCHER
1. [Question]

Be harsh. Be unfair. Real Reviewer 2s are.
```

## Process

### Step 1: Prepare Review Package

Gather findings to review:

```markdown
## Review Package

**Review Type:** Major finding
**Finding:** FINDING-007 - GUIDE-seq count data suitable for OT

**Claims:**
1. GUIDE-seq produces per-site read counts
2. These counts can be used as discrete measures for OT
3. Unequal totals pre/post editing justify UOT variant

**Evidence provided:**
- Tsai 2015 (DOI:10.1038/nbt.3117) - methodology
- Table S1 - actual count data

**Confidence claimed:** HIGH
```

### Step 2: Spawn Reviewer 2 Subagent

```markdown
─────────────────────────────────────────
REVIEWER 2 SESSION R2-007
─────────────────────────────────────────

[Subagent spawned with Reviewer 2 prompt]
[Review package provided]

Awaiting critique...
```

### Step 3: Receive and Document Critique

```markdown
## VERDICT: MAJOR CONCERNS

### FATAL FLAWS
None

### MAJOR CONCERNS

1. **OT formulation assumption not verified**
   - Claim: Count data can be used as discrete measures
   - Issue: Has researcher verified OT can handle sparse count matrices?
   - Required: Cite OT literature showing discrete measure support

2. **UOT justification incomplete**
   - Claim: Unequal totals justify UOT
   - Issue: What are actual pre/post totals? Quantify the imbalance.
   - Required: Extract total counts from data, show significant difference

### MINOR CONCERNS

1. Only one data source (Tsai 2015) - consider Lazzarotto 2020 for validation

### QUESTIONS FOR RESEARCHER

1. Have you searched for papers that tried OT on GUIDE-seq and failed?
2. What's the sparsity level of the count matrix?
```

### Step 4: Researcher Response

```markdown
## Researcher Response

### Response to Major Concern 1

OT on discrete measures is well-established:

> "Optimal transport can be computed between any two probability measures,
> including discrete measures represented as weighted point clouds."
> - Peyré & Cuturi 2019, Computational Optimal Transport (DOI:10.1561/2200000073)

Table S1 structure confirms compatibility:
- Rows: genomic locations (points)
- Values: read counts (weights)
- This IS a discrete measure.

### Response to Major Concern 2

Extracting totals from Tsai 2015 Table S1:
- Pre-editing total reads: 1,247,832
- Post-editing total reads: 892,156
- Difference: 28.5% reduction (cell death/loss)

This quantifies the mass imbalance UOT handles.

### Response to Minor Concern

Added Lazzarotto 2020 to search queue for validation.

### Response to Questions

1. Searched "optimal transport" AND "GUIDE-seq" - 0 results. No prior attempts.
2. Sparsity: 2,847 sites out of ~3 billion bp genome = extremely sparse, but
   OT only considers non-zero sites, so this is fine.
```

### Step 5: Final Verdict

```markdown
## Reviewer 2 Re-evaluation

Responses address major concerns:
- ✓ OT discrete measure support verified with authoritative source
- ✓ Mass imbalance quantified (28.5%)

Updating verdict: APPROVED WITH MINOR CONCERNS

Outstanding:
- Add Lazzarotto 2020 validation (minor)
```

### Step 6: Update Finding

```markdown
Updating FINDING-007:
- reviewed: true
- reviewer2_id: R2-007
- confidence: HIGH (maintained after review)
```

### Step 7: Log and Resume

```markdown
Logging to PROGRESS.md:
### Reviewer 2 Session - 16:30
- **Finding reviewed:** FINDING-007
- **Initial verdict:** MAJOR CONCERNS
- **Final verdict:** APPROVED
- **Key challenge:** OT formulation verification
- **Resolution:** Cited Peyré & Cuturi 2019

Resuming main loop...
```

## Batch Review

For accumulated minor findings:

```markdown
/vibe-science:reviewer2 --batch

─────────────────────────────────────────
REVIEWER 2 BATCH SESSION R2-008
─────────────────────────────────────────

Reviewing 3 minor findings:
1. FINDING-004: Cell viability affects GUIDE-seq reads
2. FINDING-005: Standard OT used in Waddington-OT
3. FINDING-006: No UOT applications in CRISPR literature

[Batch critique...]

Verdict:
- FINDING-004: APPROVED
- FINDING-005: MINOR CONCERNS (check if same OT variant)
- FINDING-006: APPROVED (confirms gap)
```

## Final Review

Before concluding RQ:

```markdown
/vibe-science:reviewer2 --final

─────────────────────────────────────────
REVIEWER 2 FINAL SESSION R2-009
─────────────────────────────────────────

Reviewing conclusion for RQ-001:

**Claimed answer:** UOT can improve CRISPR off-target prediction
**Evidence chain:** [Summary of all approved findings]
**Data validation:** [Statistical results]

[Final adversarial review...]

Verdict: APPROVED FOR PUBLICATION
```
