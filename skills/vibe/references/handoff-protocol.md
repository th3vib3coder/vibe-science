# Agent Handoff Protocol — Reference Protocol

Agent handoffs are the most fragile points in multi-agent research. When one agent transfers context to another — R2 returning a verdict, an explorer reporting branch results, a stage transition — information is lost unless the transfer is structured. This protocol defines a formal handoff document inspired by ECC (Error Correction Code) principles: redundancy, checksums, and explicit structure to survive noisy channels.

---

## When to Use Handoffs

A formal handoff document is required in these situations:

1. **R2 returning verdict to Researcher** — After adversarial review, R2 must transfer its findings, demands, and verdict in a structured format that the researcher can act on without ambiguity.
2. **Explorer reporting branch results** — When an exploration branch completes (promoted or killed), the exploring agent must summarize what was found for the main research thread.
3. **Stage transitions** — Moving from one research stage to another (e.g., T2 to T3, or T3 to T4) requires capturing the state of all claims, gates, and open questions.
4. **Context compaction recovery** — After context compaction, the PreCompact snapshot is loaded, but the handoff document provides narrative continuity that raw data cannot.
5. **Session resumption** — When a new session picks up work from a previous session, the narrative summary serves as an implicit handoff.

---

## Handoff Template

Every handoff follows this structure. All fields are mandatory unless marked optional.

```markdown
## HANDOFF: [Source Role] --> [Target Role]
**Session:** [session_id] | **RQ:** [RQ-XXX] | **Stage:** [N] | **Cycle:** [N]

### Context
[1-3 sentences: what was being investigated, which claims, which branch]

### Findings
- [Finding 1 with claim_id and confidence]
- [Finding 2 with claim_id and confidence]
- ...

### Verdict (if applicable)
**Status:** [PASS | FAIL | CONDITIONAL | DISPUTED]
**Demands:** (numbered list of required actions before proceeding)

### Files Modified
- `path/to/file.md` (lines X-Y): [what changed]
- `path/to/data.json`: [what was added/removed]

### Open Questions
1. [Question that needs resolution]
2. [Question that needs resolution]

### Recommendations
1. [Suggested next action with priority: HIGH/MEDIUM/LOW]
2. [Suggested next action with priority]

### Checksum (optional)
Active claims: [N] | Pending gates: [N] | Serendipity seeds: [N]
```

---

## Field Specifications

### Context

Must answer three questions in 1-3 sentences:
1. What was being investigated? (the research question or sub-question)
2. Which claims were in scope? (list claim IDs)
3. Which tree branch was active? (node ID or branch name)

Bad: "I reviewed the claims." (too vague)
Good: "Reviewed C-003 (batch-corrected DE signature, confidence 0.65) and C-007 (sex-differential response, confidence 0.45) on branch T3-explore-2, investigating whether the DE signature survives confounder adjustment."

### Findings

Each finding must include:
- **Claim ID** — Reference to the CLAIM-LEDGER entry
- **Confidence** — Current confidence score (0-1)
- **Status change** — If the finding changes a claim's status, state the old and new status
- **Evidence** — Brief reference to the supporting artifact (file path or data reference)

### Verdict

Only required for R2 handoffs. Four possible statuses:
- **PASS** — All checks passed. Claims may proceed.
- **FAIL** — Critical issues found. Claims are blocked until resolved.
- **CONDITIONAL** — Claims may proceed if specific demands are met within N cycles.
- **DISPUTED** — Circuit breaker triggered (same objection x3, no state change). Claim is frozen.

### Demands

Numbered list of specific, actionable requirements. Each demand must be:
- **Testable** — There is a clear criterion for whether the demand is met.
- **Scoped** — The demand applies to specific claims, not vague "improve everything."
- **Prioritized** — HIGH (blocks all progress), MEDIUM (blocks claim promotion), LOW (advisory).

### Files Modified

Explicit list of every file that was created or modified during the handoff source's work. Include line ranges where relevant. This serves as an audit trail and helps the target agent know exactly what changed.

### Open Questions

Questions that the source agent could not resolve and is passing to the target. Each question should include enough context for the target agent to understand without re-reading the entire history.

### Recommendations

Ordered suggestions for next steps. Each recommendation includes a priority level. The target agent is not obligated to follow recommendations but must acknowledge them.

### Checksum

Optional but recommended. A quick count of system state that the target agent can verify against the actual files. If the checksum does not match reality, something was lost in transit.

---

## Example: R2 to Researcher Handoff

```markdown
## HANDOFF: R2 --> Researcher
**Session:** a1b2c3d4 | **RQ:** RQ-001 | **Stage:** T3 | **Cycle:** 12

### Context
Adversarial review of C-003 (batch-corrected integration signature in
treatment-response data, confidence 0.65) and C-007 (sex-differential
response to treatment, confidence 0.45). Both claims originated
from branch T3-explore-2, cycle 10.

### Findings
- C-003 (confidence 0.65 --> 0.40): Confounder harness revealed that
  the integration signature collapses by 60% after propensity matching for
  sample size. Status: CREATED --> CONFOUNDED (downgraded, not killed).
  Evidence: `.vibe-science/harness/C-003-propensity.json`
- C-007 (confidence 0.45 --> 0.45): Insufficient power to evaluate.
  Only 12 female samples vs. 45 male. Cannot distinguish real
  sex-differential effect from sampling noise.
  Evidence: `.vibe-science/data/sex-breakdown.json`

### Verdict
**Status:** CONDITIONAL
**Demands:**
1. [HIGH] Re-run C-003 DE analysis with library-size-normalized counts.
   The raw-count-based signature is confounded. If the normalized
   signature retains >50% of the original effect, C-003 may be
   re-promoted.
2. [MEDIUM] For C-007, either obtain additional female samples or
   explicitly state the power limitation in the claim text. Do not
   claim sex-differential effects with N=12.
3. [LOW] Consider whether library size is also confounding other claims
   on this branch. A systematic check is advisable.

### Files Modified
- `.vibe-science/CLAIM-LEDGER.md` (lines 45-52): C-003 confidence
  updated, confounder note added
- `.vibe-science/harness/C-003-propensity.json`: New file, propensity
  matching results
- `.vibe-science/data/sex-breakdown.json`: New file, sample counts by sex

### Open Questions
1. Is library size confounded with treatment group assignment? If so,
   the entire branch may need re-evaluation.
2. Are there public datasets with balanced sex ratios for this
   perturbation that could supplement the power analysis?

### Recommendations
1. [HIGH] Run the library-size normalization first. This is the
   highest-impact action.
2. [MEDIUM] Check batch metadata for library-size-treatment correlation.
3. [LOW] Search GEO for supplementary female samples.

### Checksum
Active claims: 5 | Pending gates: 2 (DQ2 for C-003, L-1 for C-009) |
Serendipity seeds: 1 (SEED-007)
```

---

## Example: Explorer to Researcher Handoff

```markdown
## HANDOFF: Explorer --> Researcher
**Session:** e5f6g7h8 | **RQ:** RQ-001 | **Stage:** T3 | **Cycle:** 15

### Context
Explored branch T3-explore-4: "Does the perturbation signature
replicate in an independent dataset (GSE198765)?" Investigated
whether C-003 (batch-corrected DE signature) generalizes beyond
the discovery cohort.

### Findings
- C-003-replication (new claim, confidence 0.55): 67% of the DE
  genes (42/63) show concordant direction in GSE198765, but only
  23% (15/63) reach nominal significance (p < 0.05). The signature
  partially replicates in direction but not in magnitude.
  Evidence: `.vibe-science/data/replication-GSE198765.json`
- Serendipity: GSE198765 contains time-course data (0h, 6h, 24h, 72h)
  not present in the discovery dataset. The perturbation signature
  appears to peak at 24h and decline by 72h. This temporal dynamic
  was not part of the original hypothesis.
  Filed as: SEED-012 in SERENDIPITY.md

### Files Modified
- `.vibe-science/data/replication-GSE198765.json`: Full replication
  analysis results
- `.vibe-science/SERENDIPITY.md` (appended): SEED-012, temporal
  dynamics observation
- `.vibe-science/TREE-STATE.json`: T3-explore-4 node marked as
  COMPLETED

### Open Questions
1. Should the partial replication (direction but not magnitude)
   increase or decrease confidence in C-003?
2. Is the temporal peaking at 24h biologically meaningful, or an
   artifact of the GSE198765 experimental design?

### Recommendations
1. [HIGH] Incorporate the replication result into C-003's evidence
   chain. Update confidence accordingly.
2. [MEDIUM] Promote SEED-012 to a new exploration branch if temporal
   dynamics are relevant to the RQ.
3. [LOW] Check if other public datasets have time-course data for
   this perturbation.

### Checksum
Active claims: 6 | Pending gates: 1 (DQ4 for C-003-replication) |
Serendipity seeds: 2 (SEED-007, SEED-012)
```

---

## Storage and Retrieval

Handoff documents are:

1. **Written to files** — Stored in `.vibe-science/handoffs/HANDOFF-{session_id}-{source}-to-{target}.md`.
2. **Logged to research spine** — A spine entry with type `HANDOFF` references the file path.
3. **Queued for embedding** — The context and findings sections are embedded for future semantic recall.
4. **Referenced in STATE.md** — The current STATE.md should note the most recent handoff and its status.

---

## Validation Rules

A handoff is considered **valid** if:
- All mandatory sections are present (Context, Findings, Files Modified, Open Questions, Recommendations)
- Every claim ID referenced exists in the CLAIM-LEDGER
- Every file path referenced exists on disk
- The checksum (if present) matches the actual system state

A handoff is considered **invalid** if any mandatory section is missing or any claim ID is unresolvable. Invalid handoffs are flagged by the Observer.

---

*This protocol applies to all agent-to-agent transfers. The template may be extended with domain-specific sections, but the core fields are mandatory.*
