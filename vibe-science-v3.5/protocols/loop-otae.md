# OTAE-Science Loop — Detailed Protocol

> Load this when: first cycle of a session, or when the loop needs re-grounding.

## Overview

OTAE = Observe → Think → Act → Evaluate. Adapted from OpenAI Codex agent loop for scientific research.

Each cycle produces ONE meaningful action. No multi-step bundles. One action, verified, documented, then next cycle.

## OBSERVE Phase

### What to Read
1. `STATE.md` — entire file (max 100 lines)
2. `PROGRESS.md` — last 20 lines
3. Check: `minor_findings_pending` count in STATE.md frontmatter
4. Check: `cycle` number (warn at 15, force review at 20)

### Consistency Check
- Does STATE.md's "Next Action" match what PROGRESS.md last recorded?
- If mismatch → something was interrupted. Resume from PROGRESS.md (it's append-only, more reliable).
- If STATE.md is corrupt or >100 lines → rewrite from PROGRESS.md last 5 entries.

### Context Assembly
After reading, you should know:
- Current RQ and phase
- What was last done
- What needs doing next
- Any pending R2 reviews or gate failures

## THINK Phase

### Decision Framework
Ask yourself these questions IN ORDER:
1. Is there a pending R2 verdict I need to address? → Address it first (blocking)
2. Is there a gate failure I need to fix? → Fix it first (blocking)
3. What is the highest-priority open question for this RQ?
4. What single action would most advance toward answering it?
5. What tool/skill do I need to execute this action?

### Decision Types
- **SEARCH**: Need more literature evidence
- **EXTRACT**: Have a paper, need to pull specific data
- **VALIDATE**: Have a claim, need to verify numerically
- **COMPUTE**: Need to run analysis pipeline
- **REVIEW**: Need to invoke R2 (trigger reached)
- **PIVOT**: Serendipity detected, evaluate pivot
- **EXIT**: Stop conditions met

### Log the Decision
Before acting, write to PROGRESS.md:
```
### Cycle N - HH:MM
- **DECIDE:** [ACTION TYPE]: [specific plan] because [rationale]
```

## ACT Phase

### Execution Rules
1. ONE action per cycle. Not two. One.
2. Use the appropriate tool/skill (dispatch via skill-router if needed)
3. Produce ARTIFACTS — files, not prose. If you can save it as a file, do so.
4. Track exact inputs and outputs

### Action-Specific Protocols
| Action | Load | Do |
|--------|------|----|
| SEARCH | search-protocol.md | Query database, record in queries.log |
| EXTRACT | data-extraction.md | Download supplementary, parse tables |
| VALIDATE | analysis-orchestrator.md | Run validation, check statistical significance |
| COMPUTE | analysis-orchestrator.md + obs-normalizer.md | Execute pipeline step |
| REVIEW | reviewer2-ensemble.md | Invoke R2 adversarial protocol |

## EVALUATE Phase

### For Every Result
1. **Source check**: Does it have DOI/PMID/dataset_id?
2. **Accessibility check**: Can the data actually be accessed?
3. **Consistency check**: Does it match or contradict existing findings?
4. **Claim extraction**: What new claims emerge from this result?
5. **Confidence scoring**: Apply formula (see evidence-engine.md)
6. **Assumption check**: Did any assumption change?
7. **Serendipity check**: Anything unexpected?

### Gate Application
If the action was data-related, apply relevant gate:
- G0: Data loaded correctly?
- G1: obs normalized?
- G2: Preprocessing valid?
- G3: Model training converged?
- G4: Results biologically plausible?
- G5: Report complete with all artifacts?

Gate FAIL → stop, fix, re-gate. Do NOT continue past a failed gate.

### R2 Trigger Check
- Major finding this cycle? → INVOKE R2 NOW
- minor_findings_pending ≥ 3? → INVOKE R2 BATCH
- cycle ≥ 20? → INVOKE R2 COMPREHENSIVE
- Confidence explosion (>0.30 in 2 cycles)? → INVOKE R2 (confirmation bias check)

## CRYSTALLIZE Phase

### Always Update (in this order)
1. **CLAIM-LEDGER.md** — add new claims, update existing statuses
2. **ASSUMPTION-REGISTER.md** — add/update any assumptions
3. **PROGRESS.md** — append cycle summary
4. **STATE.md** — rewrite with current state (max 100 lines)

### Stop Condition Check
After crystallizing, check:
- SUCCESS? All criteria met + R2 cleared → EXIT
- NEGATIVE? Hypothesis disproven → EXIT
- SERENDIPITY? Unexpected discovery → Create new RQ
- DIMINISHING RETURNS? cycle>15, low finding rate → WARN
- CONTINUE? → LOOP BACK TO OBSERVE

## Cycle Timing

Each cycle should produce exactly ONE meaningful action. If a cycle is producing multiple actions or loading many files, it's doing too much. Break it into multiple cycles.

## Emergency Protocols

### Context Rot Detected
If you notice you're repeating yourself or contradicting earlier work:
1. STOP immediately
2. Read PROGRESS.md from the beginning (or last 50 lines)
3. Read CLAIM-LEDGER.md
4. Rewrite STATE.md from scratch based on these files
5. Resume

### State File Corruption
If STATE.md is missing or corrupt:
1. Check PROGRESS.md (it's append-only, most reliable)
2. Reconstruct STATE.md from last 5 PROGRESS entries
3. Continue from there

### Infinite Loop Detection
If cycle > 30 AND no new findings in last 5 cycles:
1. STOP
2. Force R2 comprehensive review of ALL findings
3. Present options to user: conclude, pivot, or new approach
