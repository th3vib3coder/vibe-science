# Instinct Model — Cross-Session Learned Behaviors

The instinct model captures atomic behavior patterns that the system learns over time. Unlike patterns (which describe what happened), instincts describe what to do — they are prescriptive, not descriptive. An instinct is a lesson learned from experience, encoded with confidence and subject to decay. Inspired by ECC (Error Correction Code) principles: observations are noisy, but repeated consistent signals converge toward reliable rules.

---

## What Is an Instinct?

An instinct is an atomic behavioral rule with four properties:

1. **Statement** — A clear, actionable directive. Always imperative: "Always check X before doing Y" or "Never assume Z without verifying."
2. **Confidence** — A score from 0.0 to 1.0 indicating how well-supported the instinct is.
3. **Scope** — Either `project` (applies to the current RQ only) or `global` (applies across all RQs).
4. **Evidence** — The observations that led to this instinct (references to sessions, claims, outcomes).

Instincts are NOT opinions, preferences, or heuristics without data. Every instinct must trace back to at least one concrete observation.

---

## Instinct Lifecycle

Instincts progress through four stages based on evidence accumulation:

### Stage 1: Observation (confidence: 0.3)

**Trigger:** Noticed once. A single session produces an outcome that suggests a behavioral rule.

**Example:** "Gate DQ1 failed because zero-variance columns were present in the extracted features." This happened once. It might be a fluke, or it might be a pattern.

**Action:** Recorded in the DB with confidence 0.3. Not yet surfaced in SessionStart context.

### Stage 2: Pattern (confidence: 0.5)

**Trigger:** Observed 3 or more times. The same behavioral pattern has appeared in multiple sessions or multiple contexts within a session.

**Example:** "Gate DQ1 has failed on zero-variance columns in 3 separate sessions." This is no longer a fluke.

**Action:** Confidence upgraded to 0.5. Now surfaced in SessionStart context as a suggestion.

### Stage 3: Instinct (confidence: 0.7)

**Trigger:** Confirmed by evidence. The pattern has been explicitly validated — either by a successful intervention (fixing the issue prevented the failure) or by consistent reproduction.

**Example:** "Adding a pre-extraction variance filter eliminated DQ1 failures in 2 subsequent sessions." The observation is now a confirmed instinct.

**Action:** Confidence upgraded to 0.7. Surfaced prominently in SessionStart context. Actively consulted during THINK phase.

### Stage 4: Strong Instinct (confidence: 0.9)

**Trigger:** Never contradicted. The instinct has been active for 5+ sessions and no contradicting evidence has appeared.

**Example:** "The variance filter instinct has been active for 8 sessions. DQ1 has not failed on zero-variance columns since it was adopted."

**Action:** Confidence upgraded to 0.9. Treated as near-certain. Would require strong contradicting evidence to override.

---

## Confidence Decay

Instincts decay over time if not reinforced. An instinct that was true six months ago may no longer apply (data changed, methodology evolved, new tools available).

**Rate:** -0.02 per week, applied as exponential decay.

**Formula:** `effective_confidence = confidence * exp(-0.02 * weeks_since_last_reinforced)`

Where `weeks_since_last_reinforced` is calculated from the most recent observation that supports the instinct.

**Archival:** When `effective_confidence` drops below 0.2, the instinct is archived (not deleted). It remains in the DB but is no longer surfaced in SessionStart.

**Reinforcement:** Each new supporting observation resets the decay clock (`last_seen` updated) and may increase confidence (see lifecycle stages).

---

## Storage

Instincts are stored in the `research_patterns` DB table with `pattern_type = 'INSTINCT'`:

| Column | Usage for Instincts |
|--------|-------------------|
| `id` | Auto-increment ID |
| `pattern_type` | Always `'INSTINCT'` |
| `description` | The instinct statement (imperative form) |
| `evidence` | JSON array of supporting observations |
| `confidence` | Current confidence (0.0 to 1.0) |
| `occurrences` | Number of supporting observations |
| `first_seen` | When the instinct was first observed |
| `last_seen` | When the instinct was last reinforced |
| `project_path` | RQ path for project-scoped instincts, `'__global__'` for global |
| `active` | 1 = active, 0 = archived |

**Scope encoding:** Project-scoped instincts store the RQ directory path in `project_path`. Global instincts store the literal string `'__global__'`.

---

## Scope Rules

### Project Scope

Applies only to the current RQ. These instincts capture domain-specific or dataset-specific lessons.

**Examples:**
- "Gate DQ1 fails when zero-variance columns present in extracted features" (confidence: 0.9, scope: project)
- "Batch 3 in this dataset has systematic quality issues — always exclude or flag" (confidence: 0.7, scope: project)
- "The treatment and control groups are imbalanced for age — always include age as a covariate" (confidence: 0.8, scope: project)

### Global Scope

Applies across all RQs. These instincts capture universal research methodology lessons.

**Examples:**
- "Always check batch effects before claiming differential expression" (confidence: 0.7, scope: global)
- "Literature L-1 gate catches 40% of dead-end directions early" (confidence: 0.5, scope: global)
- "Propensity matching frequently reverses effect direction — never skip the confounder harness" (confidence: 0.8, scope: global)
- "Claims with confidence > 0.7 that skip R2 review are overconfident 60% of the time" (confidence: 0.6, scope: global)

### Promotion Rules

An instinct can be promoted from project to global scope if:
1. It has been independently observed in 2+ different RQs.
2. Its confidence is >= 0.5 in each RQ.
3. The instinct statement is generalizable (not dataset-specific).

Promotion is recorded in the evidence chain as a `SCOPE_PROMOTION` event.

---

## Integration Points

### 1. THINK Phase

Before planning any analysis, the agent checks active instincts relevant to the current context:

```
[INSTINCTS] 3 relevant instincts:
  [0.9] Always check batch effects before claiming differential expression (global)
  [0.7] Gate DQ1 fails on zero-variance columns — pre-filter (project)
  [0.5] Literature L-1 gate catches dead-end directions — search before branching (global)
```

The agent should incorporate high-confidence instincts into its plan. Ignoring a strong instinct (>= 0.7) without justification is flagged by the Observer.

### 2. EVALUATE Phase

After completing an analysis or receiving a review outcome, the agent evaluates whether any instincts are reinforced or contradicted:

- **Reinforced:** The outcome is consistent with the instinct. Increment occurrences, update `last_seen`, potentially upgrade confidence stage.
- **Contradicted:** The outcome contradicts the instinct. Log an override event (see Override section below).
- **New observation:** The outcome suggests a new instinct not yet in the DB. Create with confidence 0.3.

### 3. Stop Hook

The Stop hook runs instinct extraction as part of pattern extraction (see `pattern-extraction.md`):

1. Review the session's spine entries for outcomes that suggest behavioral rules.
2. Check existing instincts — reinforce those that were validated, flag those that were contradicted.
3. Create new instinct candidates from novel observations.

---

## Override Mechanism

Any instinct can be overridden by contradicting evidence. This is expected and healthy — the world changes, and instincts must adapt.

**Override process:**

1. The agent encounters an outcome that contradicts an active instinct.
2. The agent logs an `OVERRIDE` event in the instinct's evidence chain:
   ```json
   {
     "type": "OVERRIDE",
     "session_id": "abc123",
     "timestamp": "2026-01-20T10:00:00Z",
     "description": "DQ1 passed despite zero-variance columns — new preprocessing step handles them",
     "confidence_impact": -0.2
   }
   ```
3. The instinct's confidence is reduced by 0.2.
4. If confidence drops below 0.2, the instinct is archived.

**Multiple overrides:** Each override reduces confidence by 0.2. An instinct at 0.9 that is overridden twice drops to 0.5. Three overrides drop it to 0.3 (back to Observation stage). Four overrides archive it.

**Override is not deletion.** Archived instincts remain in the DB. If new evidence later supports the instinct, it can be reactivated.

---

## Examples in Practice

### Example 1: Project-Scoped Instinct Formation

**Session 1:** Researcher runs DE analysis. Gate DQ1 fails on zero-variance columns.
- New instinct created: "Pre-filter zero-variance columns before DQ1" (confidence: 0.3, project)

**Session 3:** DQ1 fails again on zero-variance columns in a different extraction.
- Instinct reinforced. Occurrences: 2.

**Session 4:** DQ1 fails a third time. Occurrences: 3.
- Instinct promoted to Pattern stage (confidence: 0.5).

**Session 5:** Researcher adds variance filter. DQ1 passes.
- Instinct promoted to Instinct stage (confidence: 0.7). Evidence includes the successful intervention.

**Sessions 6-12:** DQ1 never fails on zero-variance columns.
- Instinct promoted to Strong Instinct (confidence: 0.9).

### Example 2: Global Instinct via Promotion

**RQ-001, Session 8:** "Always run confounder harness before promoting claims" observed (confidence: 0.5).
**RQ-002, Session 3:** Same lesson learned independently (confidence: 0.5).
- Instinct promoted from project to global scope. Evidence chain records both RQs.

### Example 3: Override

**Session 15:** New preprocessing pipeline handles zero-variance columns automatically.
- DQ1 passes without manual filtering.
- Override event logged. Confidence: 0.9 --> 0.7.
- The instinct is not wrong — it is less relevant because the environment changed.

**Session 18:** DQ1 passes again without filtering.
- Second override. Confidence: 0.7 --> 0.5.
- Instinct demoted back to Pattern stage.

---

## Relationship to Pattern Extraction

Instincts and patterns are stored in the same DB table but serve different purposes:

| Aspect | Pattern | Instinct |
|--------|---------|----------|
| Nature | Descriptive (what happened) | Prescriptive (what to do) |
| Example | "DQ1 failed 3 times on zero-variance columns" | "Pre-filter zero-variance columns before DQ1" |
| Created by | Automatic extraction in Stop hook | Extraction + agent judgment |
| Confidence source | Occurrence frequency | Occurrence + intervention outcome |
| `pattern_type` | `GATE_FAILURE_CLUSTER`, `REPEATED_ACTION`, `CLAIM_LIFECYCLE` | `INSTINCT` |

High-confidence patterns can be manually promoted to instincts by the agent, but this is not automatic. A pattern describes the problem; an instinct describes the solution.

---

*This protocol defines the instinct model for Vibe Science v6.0. The lifecycle, decay, and override mechanisms are designed to be self-correcting: good instincts strengthen, bad instincts fade, and the system improves with every session.*
