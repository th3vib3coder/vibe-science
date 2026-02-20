# Vibe Science Templates

All templates for creating files in the `.vibe-science/` folder structure.

## STATE.md Template

Max 100 lines. Rewritten each cycle (not append-only).

```yaml
---
vibe_science_version: 3.5.0
rq: RQ-001
phase: discovery|analysis|data|validation|pipeline
cycle: 1
last_updated: YYYY-MM-DDTHH:MM:SSZ
minor_findings_pending: 0
queries_run: 0
queries_deduped: 0
claims_total: 0
claims_verified: 0
claims_insufficient: 0
gates_status: {G0: pending, G1: pending, G2: pending, G3: pending, G4: pending, G5: pending}
---
```

```markdown
## Current Focus
[What we're investigating right now — 2-3 sentences max]

## Key Findings This Session
- [Finding 1 with claim_id and confidence score]
- [Finding 2 with claim_id and confidence score]

## Open Questions
1. [Question needing resolution]

## Active Assumptions
- A-xxx: [assumption text] (risk: HIGH/MEDIUM/LOW)

## Next Action
[Exact next step — must be specific, actionable, and reference the relevant gate]

## Blockers
- [If any — otherwise remove this section]
```

---

## PROGRESS.md Template

Append-only. Never edit previous entries. Newest at top.

```markdown
# Progress Log

## YYYY-MM-DD

### Cycle N — HH:MM
- **Action:** [What was done — search query, paper read, data extracted, script run]
- **Result:** [What was found — N papers, specific data, gate result, metric values]
- **Decision:** [What was decided — deep dive, continue, pivot, stop] (DEC-xxx)
- **Claims:** [New: C-xxx, C-yyy | Updated: C-zzz]
- **Gates:** [Passed: G0 | Failed: G2 (reason)]
- **Serendipity:** None / [unexpected discovery description]
- **Tokens saved:** [Dedup: N queries skipped | Diff: only X changed]
```

---

## CLAIM-LEDGER.md Template

See `protocols/evidence-engine.md` for full schema. Quick template:

```markdown
# Claim Ledger

## C-001
- **Text:** [atomic assertion]
- **Type:** DATA | INFERENCE | OPINION
- **Evidence:** [list of evidence items]
- **Confidence:** 0.XX (E=X.X, R=X.X, C=X.X, K=X.X, D=X.X)
- **Status:** UNVERIFIED | VERIFIED | CHALLENGED | REJECTED | CONFIRMED
- **Reviewer2:** [ensemble_id or null]
- **Depends on:** [claim_ids]
- **Assumptions:** [assumption_ids]
- **Created:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD
```

---

## ASSUMPTION-REGISTER.md Template

See `protocols/evidence-engine.md` for full schema. Quick template:

```markdown
# Assumption Register

## A-001
- **Text:** [what we assume]
- **Risk:** HIGH | MEDIUM | LOW
- **Verification plan:** [how to test]
- **Status:** ACTIVE | TESTED-OK | TESTED-FAIL | RETIRED
- **Claims affected:** [C-xxx, C-yyy]
```

---

## RQ.md Template

```yaml
---
id: RQ-001
created: YYYY-MM-DD
status: active|completed|abandoned|pivoted
priority: high|medium|low
serendipity_origin: null
---
```

```markdown
# Research Question

## Question
[Precise, falsifiable research question]

## Hypothesis
[Testable hypothesis — must be specific enough to be proven wrong]

## Success Criteria
- [ ] [Measurable criterion 1]
- [ ] [Measurable criterion 2]

## Data Requirements
- [What data is needed]
- [Where it might come from — specific databases/datasets]

## Kill Conditions
- [When to abandon this RQ — be specific]

## Gates Required
- [Which gates apply to this RQ's pipeline]

## Skills Required
- [Which scientific-skills MCP tools will be needed]
```

---

## Finding Document Template

```yaml
---
type: major|minor
confidence: 0.XX
reviewed: false
reviewer2_id: null
claim_ids: []
---
```

```markdown
# [Finding Title — descriptive, not generic]

## Summary
[2-3 sentences: finding + relevance to RQ]

## Claims Extracted
| Claim ID | Text | Type | Confidence |
|----------|------|------|------------|
| C-xxx | [atomic assertion 1] | DATA | 0.XX |
| C-yyy | [atomic assertion 2] | INFERENCE | 0.XX |

## Evidence

### Source 1
- **Paper:** [Full title]
- **DOI:** [doi]
- **Relevant quote:** "[exact quote]"
- **Page/Section:** [location]

## Implications
[What this means for the RQ]

## Counter-evidence
[Contradicting findings — be honest. If none: "No contradicting evidence found in N papers reviewed"]

## Confidence Justification
E=[score] (peer-reviewed), R=[score] (single study), C=[score] (2 sources agree), K=[score] (confounders addressed), D=[score] (direct observation)
Weighted: 0.XX
```

---

## Stop Condition Templates

### Successful Exit

```markdown
## Research Conclusion: SUCCESS

**RQ:** [question]
**Answer:** [validated answer — specific, evidence-based]

**Key evidence:**
1. C-xxx: [claim text] (confidence: 0.XX)
2. C-yyy: [claim text] (confidence: 0.XX)

**Data validation:**
- [Numerical confirmation — specific numbers]
- [Statistical test results]

**Reviewer Ensemble clearance:** [link to final ensemble review]

**Effort summary:**
- Cycles: N
- Papers reviewed: N
- Data sources checked: N
- Findings (major/minor): N/N
- Claims total: N (verified: N, rejected: N)
- Assumptions: N (tested-ok: N, still active: N)
- Computational runs: N
- Gates passed: N/N

**Reproducibility:**
- All manifests in 06-runs/
- Decision log in 07-audit/decision-log.md
- Claim ledger complete and reviewed
```

### Negative Exit

```markdown
## Research Conclusion: NEGATIVE

**RQ:** [question]
**Conclusion:** Hypothesis not supported

**Reasons:**
1. [Why — specific evidence, claim_ids]
2. [What was missing — specific data gaps]

**Effort summary:** [same as above]

**What would change this:**
- [Conditions under which to revisit]

**Value recovered:**
- [Useful findings despite failure]
- [Methodological insights]
- [Claims that survived and may be reusable]
```

### Serendipity Pivot

```markdown
## Serendipity Discovery

**Original RQ:** [what we were investigating]
**Discovery:** [what we found instead]
**Found during:** Cycle N of RQ-[XXX]

**Why this matters:**
[Significance — why worth a new RQ]

**Evidence:**
- C-xxx: [claim text] (confidence: 0.XX)

**Reviewer Ensemble clearance on pivot:** [link or "pending"]
**Action:** Creating RQ-[NNN]
**Link:** ./RQ-[NNN]-[slug]/RQ.md
```

---

## Decision Log Entry Template

See `references/audit-reproducibility.md` for full schema.

```markdown
## DEC-YYYYMMDD-NNN

**Date:** YYYY-MM-DD HH:MM
**Context:** [What prompted this decision]
**Decision:** [What was decided]
**Justification:** [Why — evidence-based]
**Alternatives considered:**
1. [Alt A] — rejected because [reason]
**Trade-offs accepted:** [What we lose]
**Reversibility:** HIGH | MEDIUM | LOW
**Claims affected:** [C-xxx]
**Gate:** [Which gate, if any]
```

---

## Ensemble Review Template

See `protocols/reviewer2-ensemble.md` for full mandatory output schema. File naming:

```
05-reviewer2/YYYY-MM-DD-ensemble-[major|batch|final|pivot|pipeline]-NNN.md
```
