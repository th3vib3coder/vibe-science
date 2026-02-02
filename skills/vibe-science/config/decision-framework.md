# Decision Framework

How to make decisions during Vibe Science research.

## Priority Order (Non-Negotiable)

When evaluating research directions, apply these criteria IN ORDER:

```
┌─────────────────────────────────────────────────────────────┐
│                    DECISION PRIORITY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DATA AVAILABILITY           ← GATE (must pass)         │
│     │                                                       │
│     ├─ Data exists?                                        │
│     │   ├─ YES → Continue to #2                            │
│     │   └─ NO  → STOP. Non-negotiable.                     │
│     │                                                       │
│     └─ Data accessible?                                    │
│         ├─ Public → Best case                              │
│         ├─ Request → Acceptable (with timeline)            │
│         └─ Impossible → STOP                               │
│                                                             │
│  2. IMPACT POTENTIAL            ← Filter                   │
│     │                                                       │
│     ├─ Does this matter if true?                           │
│     ├─ Who cares? (field, practitioners, patients?)        │
│     ├─ What changes? (methods, understanding, treatment?)  │
│     │                                                       │
│     └─ Low impact + high effort → Deprioritize             │
│                                                             │
│  3. TECHNICAL FEASIBILITY       ← Filter                   │
│     │                                                       │
│     ├─ Can we actually do this analysis?                   │
│     ├─ Do tools exist?                                     │
│     ├─ Is compute reasonable?                              │
│     │                                                       │
│     └─ Infeasible → Find simpler approach or abandon       │
│                                                             │
│  4. PUBLICATION SPEED           ← Nice to have             │
│     │                                                       │
│     ├─ How fast can this become a paper?                   │
│     ├─ Is the field moving fast? (scoop risk)              │
│     │                                                       │
│     └─ Speed is LEAST important criterion                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Availability Deep Dive

This is the GATE. Everything else is irrelevant if data doesn't exist.

### Data Exists?

| Status | Meaning | Action |
|--------|---------|--------|
| YES - Public | Data in GEO, SRA, Zenodo, supplement | Proceed immediately |
| YES - Request | Data available on reasonable request | Contact authors, set timeline |
| YES - Restricted | Data exists but access unlikely | Evaluate alternatives |
| MAYBE | Mentioned but not deposited | Search harder, then decide |
| NO | Data never generated | **STOP. Find different approach.** |

### Questions to Ask

1. Has anyone generated this type of data?
2. Is it deposited in a public repository?
3. Is it in supplementary materials?
4. Can it be derived from existing public data?
5. Would generating it be feasible? (usually NO for us)

### Examples

**GO:**
- "GUIDE-seq data in Table S1" → Data exists, accessible
- "scRNA-seq deposited in GEO GSE12345" → Data exists, public
- "Raw data available on request" → Contact, set 2-week deadline

**NO GO:**
- "We performed experiments but data not shown" → No data
- "Future work could generate..." → Hypothetical
- "In principle, one could..." → No data exists

## Impact Potential Assessment

After data gate passes, evaluate impact.

### Impact Tiers

| Tier | Description | Examples |
|------|-------------|----------|
| HIGH | Changes practice or understanding | New method outperforms standard, mechanism discovery |
| MEDIUM | Useful contribution | Benchmark, comparison, validation |
| LOW | Incremental | Minor optimization, narrow application |

### Questions to Ask

1. If this hypothesis is TRUE, what changes?
2. Who would cite this paper?
3. What journal tier is realistic?
4. Does this enable future work?

### Impact vs Effort Matrix

```
                    IMPACT
                 LOW    HIGH
           ┌─────────┬─────────┐
      LOW  │ Maybe   │  YES    │
EFFORT     ├─────────┼─────────┤
      HIGH │  NO     │ Careful │
           └─────────┴─────────┘

- High impact + Low effort = Best case
- High impact + High effort = Worth it if data is solid
- Low impact + Low effort = Maybe, if quick win
- Low impact + High effort = NO
```

## Technical Feasibility Check

Can we actually do this?

### Feasibility Checklist

- [ ] Required tools/libraries exist?
- [ ] Compute requirements reasonable? (< 1 week on available hardware)
- [ ] Statistical methods well-established?
- [ ] No custom wet-lab work required?
- [ ] Skills within capability?

### Red Flags

- "Would require developing new algorithm" → Scope creep
- "Needs GPU cluster for months" → Resource constraint
- "Requires experimental validation" → We can't do wet lab
- "Novel statistical approach needed" → Risky

## Publication Speed (Lowest Priority)

Only consider after 1-3 pass.

### When Speed Matters

- Fast-moving field (COVID, AI) - scoop risk
- Time-sensitive application
- Grant deadline approaching

### When Speed Doesn't Matter

- Established field, steady pace
- Novel methodology (inherently takes time)
- Foundation work others will build on

### Default Position

Speed is nice but NOT a reason to:
- Skip validation steps
- Accept weak evidence
- Rush Reviewer 2 process
- Compromise rigor

## Decision Tree Summary

```
Is data available?
├─ NO → STOP (non-negotiable)
└─ YES → Is impact sufficient?
         ├─ NO → Deprioritize
         └─ YES → Is it feasible?
                  ├─ NO → Find simpler approach
                  └─ YES → PROCEED
                           └─ Speed? (nice to have)
```

## Applying the Framework

### During /vibe-science:init

Before committing to an RQ:

```markdown
## Decision Framework Check

**RQ:** Can UOT improve CRISPR off-target prediction?

**1. Data Availability:**
- GUIDE-seq data: YES (Tsai 2015 Table S1)
- Cell viability data: YES (Kim 2020)
- Verdict: PASS ✓

**2. Impact Potential:**
- If true: New prediction method, improved safety
- Who cares: Gene therapy field, FDA reviewers
- Journal tier: NAR, Bioinformatics realistic
- Verdict: HIGH ✓

**3. Technical Feasibility:**
- OT libraries: POT, WOT available
- Compute: Laptop-scale
- Stats: Well-established
- Verdict: FEASIBLE ✓

**4. Publication Speed:**
- Field pace: Moderate
- Scoop risk: Low (novel combination)
- Verdict: Not urgent, but achievable in months

**DECISION: PROCEED**
```

### During /vibe-science:loop

When choosing between paths:

```markdown
## Path Decision

**Option A:** Apply UOT to GUIDE-seq data
- Data: Available ✓
- Impact: High (novel) ✓
- Feasible: Yes ✓

**Option B:** Also include DISCOVER-seq data
- Data: Available but harder to access
- Impact: Higher (more comprehensive)
- Feasible: More work

**Option C:** Compare with machine learning methods
- Data: Would need new benchmarks
- Impact: Higher (broader comparison)
- Feasible: Significant additional work

**Decision:** Start with Option A (data ready, impact sufficient).
Option B as follow-up if A succeeds.
Option C is scope creep - defer to future work.
```

## Anti-Patterns

### "But it would be cool if..."

NO. Cool is not a criterion. Data availability is.

### "We could probably get the data..."

NO. "Probably" is not "yes". Verify before proceeding.

### "The impact would be huge if..."

NO. Hypothetical impact doesn't compensate for missing data.

### "It's fast to try..."

NO. Speed doesn't justify low-impact work.

## Remember

The framework exists to PREVENT wasted effort.

A rigorous "no" at the data gate saves weeks of work on a dead end.
A honest "low impact" assessment prevents publishing forgettable papers.

Apply the framework honestly. The research will be stronger for it.
