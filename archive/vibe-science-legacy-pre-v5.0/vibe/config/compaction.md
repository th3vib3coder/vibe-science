# Compaction Strategy

How to manage context when research sessions get long.

## The Problem

Research sessions can run many cycles. Context windows have limits. Without compaction:
- Session crashes when context exceeded
- Important early findings get truncated
- Reasoning chain becomes incoherent

## The Solution: Hierarchical State Crystallization

Inspired by OpenAI Codex's compaction approach, adapted for research.

```
┌─────────────────────────────────────────────────────────────┐
│                   COMPACTION HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LEVEL 1: Working Memory (in context)                      │
│  ├─ Current cycle details                                  │
│  ├─ Last 3-5 cycles summary                               │
│  └─ Active findings under investigation                    │
│                                                             │
│  LEVEL 2: Session State (STATE.md)                         │
│  ├─ Current RQ and phase                                  │
│  ├─ Key decisions made                                    │
│  ├─ Next action                                           │
│  └─ Max 100 lines                                         │
│                                                             │
│  LEVEL 3: Progress Log (PROGRESS.md)                       │
│  ├─ All cycles, append-only                               │
│  ├─ Queryable for specific cycles                         │
│  └─ No size limit (external storage)                      │
│                                                             │
│  LEVEL 4: Findings Archive (FINDINGS.md + individual)      │
│  ├─ Validated findings with full evidence                 │
│  ├─ Each finding is self-contained                        │
│  └─ Can be loaded individually                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## When to Compact

### Automatic Triggers

| Trigger | Action |
|---------|--------|
| Every 5 cycles | Summarize last 5 cycles to PROGRESS.md |
| Finding validated | Move full details to FINDINGS.md |
| Context warning | Emergency compaction |
| Session end | Full state crystallization |
| Phase transition | Archive phase, reset working memory |

### Manual Trigger

```
/vibe-science:compact
```

Forces immediate compaction without ending session.

## Compaction Process

### Step 1: Identify What to Keep

**MUST keep in working memory:**
- Current cycle state
- Active hypothesis
- Last major finding
- Immediate next steps
- Active Reviewer 2 concerns

**CAN move to external storage:**
- Completed cycle details
- Validated findings (with references)
- Resolved Reviewer 2 sessions
- Search queries already logged

**MUST preserve references:**
- DOIs for all cited papers
- Finding IDs
- Cycle numbers for traceability

### Step 2: Write State Summary

Create compact STATE.md:

```markdown
---
rq: RQ-001-uot-crispr
phase: analysis
cycle: 23
last_compacted: 2025-01-30T15:45:00Z
minor_findings_pending: 1
---

## Current Focus

Validating that UOT improves off-target prediction over standard OT.
Key evidence chain established (see FINDINGS.md #1-5).
Currently comparing Wasserstein distance metrics.

## Session Summary (Cycles 1-20)

- Cycles 1-5: Gap identification confirmed (0 papers on UOT+CRISPR)
- Cycles 6-10: Methodology transfer validated (Waddington-OT applicable)
- Cycles 11-15: Data extraction complete (Tsai 2015, Kim 2020)
- Cycles 16-20: Initial validation shows promise (see Finding #5)

## Key Decisions

1. Using entropy-regularized UOT (Chizat formulation) - Cycle 8
2. GUIDE-seq as primary data source - Cycle 12
3. Benchmarking against CFD tool - Cycle 18

## Active Work

- Comparing UOT vs standard OT Wasserstein distances
- Need: Statistical significance test
- Blocker: None

## Next Action

Run statistical comparison on extracted count data.
Reference: Finding #5, data/tsai2015-counts.csv
```

### Step 3: Archive Detailed Cycles

Move detailed cycle logs to PROGRESS.md:

```markdown
# PROGRESS.md

## Compaction Event - 2025-01-30T15:45

Cycles 1-20 compacted. Summary in STATE.md.
Full details preserved below.

---

## 2025-01-30

### Cycle 20 - 15:30
[Full details...]

### Cycle 19 - 15:15
[Full details...]

[...continues for all cycles...]
```

### Step 4: Validate Findings Externally

Each validated finding becomes self-contained:

```markdown
# findings/FINDING-005.md

---
id: FINDING-005
type: major
confidence: HIGH
reviewed: true
reviewer2_id: R2-003
validated_cycle: 20
---

# UOT Distances Correlate with Off-Target Activity

## Claim

Unbalanced optimal transport distance between intended and observed
editing distributions correlates with measured off-target activity
(r=0.73, p<0.001).

## Evidence

[Full evidence chain with DOIs...]

## Validation

[Statistical details...]

## Reviewer 2 Clearance

Approved in session R2-003 (see 05-reviewer2/R2-003.md)
```

### Step 5: Clear Working Memory

After compaction:

```markdown
─────────────────────────────────────────
COMPACTION COMPLETE
─────────────────────────────────────────

Compacted cycles: 1-20
STATE.md updated: ✓
PROGRESS.md archived: ✓
Findings externalized: #1-5

Working memory now contains:
- STATE.md summary
- Last 3 cycles (18-20)
- Active finding (#5 details)
- Current hypothesis

Continuing from cycle 21...
─────────────────────────────────────────
```

## Session Resumption

When starting a new session (after context reset):

### Load Order

1. Read STATE.md (compact summary)
2. Read last 10 entries of PROGRESS.md
3. Read active findings from FINDINGS.md
4. Resume from "Next Action"

### Restoration Prompt

```markdown
─────────────────────────────────────────
SESSION RESUMPTION
─────────────────────────────────────────

Loading Researcher persona...

Reading STATE.md...
- RQ: RQ-001-uot-crispr
- Phase: analysis
- Last cycle: 23

Reading PROGRESS.md (last 10)...
- Cycle 23: Statistical comparison in progress
- Cycle 22: Data preprocessing complete
- [...]

Reading active findings...
- FINDING-005: UOT correlation (under validation)

Resuming from: "Run statistical comparison"

Ready to continue cycle 24.
─────────────────────────────────────────
```

## Emergency Compaction

When context is about to overflow:

```markdown
⚠️ CONTEXT WARNING: Approaching limit

Initiating emergency compaction...

1. Saving current cycle state
2. Writing STATE.md
3. Archiving to PROGRESS.md
4. Externalizing findings

Compaction complete. Session can continue.

If session crashes, resume with:
/vibe-science:resume
```

## Compaction Rules

### What to NEVER Lose

Even in emergency compaction:

- Current RQ definition
- Validated findings (references, not full text)
- Key decision points
- Active hypothesis
- Next action

### What to Aggressively Compact

- Search query details (logged in queries.log)
- Paper reading details (summarized in findings)
- Reviewer 2 full transcripts (archived in 05-reviewer2/)
- Exploration dead ends (logged but not in working memory)

### Reference vs Content

**Keep references in working memory:**
```markdown
Finding #3 established UOT applicability (see FINDING-003.md)
```

**Don't keep full content:**
```markdown
Finding #3: UOT can handle mass imbalance because [500 words of detail...]
```

## Implementation Notes

### STATE.md Max Size

Hard limit: 100 lines

If STATE.md exceeds 100 lines:
- Move "Session Summary" details to PROGRESS.md
- Keep only current phase summary
- Reference external files

### PROGRESS.md Structure

Append-only, but structured for querying:

```markdown
## 2025-01-30

### Cycle 25 - 16:00
- **Action:** ...
- **Result:** ...
- **Decision:** ...
- **Serendipity:** ...

### Cycle 24 - 15:45
...
```

Can grep for specific cycles:
```bash
grep -A5 "### Cycle 15" PROGRESS.md
```

### Finding References

Use consistent IDs:
- FINDING-001, FINDING-002, ...
- R2-001, R2-002, ... (Reviewer 2 sessions)

Allows loading specific findings without full history.

## Summary

```
COMPACTION STRATEGY

When: Every 5 cycles, at triggers, on demand
What: Move details to external files, keep references
How: Hierarchical (working memory → STATE → PROGRESS → findings)
Why: Enable long research sessions without context overflow

Key files:
- STATE.md: Compact current state (≤100 lines)
- PROGRESS.md: Full history (append-only)
- FINDINGS.md: Validated findings (self-contained)

Resumption: Load STATE → recent PROGRESS → active findings → continue
```
