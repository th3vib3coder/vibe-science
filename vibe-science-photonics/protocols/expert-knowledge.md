# Expert Knowledge Injection Protocol

## Purpose

In expert-guided research, the domain expert's knowledge is a primary source of truth.
This protocol captures, structures, and integrates expert assertions into the research workflow.

## When This Activates

### Linguistic Triggers (automatic detection)
The system monitors user input for phrases indicating expert knowledge:
- "That doesn't work because..."
- "Actually, the real issue is..."
- "The problem is that..."
- "In practice, what happens is..."
- "This is well known in the field but..."
- "The literature gets this wrong because..."
- "From my experience with [device/system]..."

### Explicit Injection
The user can also explicitly inject knowledge:
- "Record this: [assertion]"
- "Expert note: [assertion]"

## EXPERT-ASSERTIONS.md Format

Located at `.vibe-science/EXPERT-ASSERTIONS.md`. Each assertion follows this format:

```yaml
EA-001:
  assertion: "VCSEL bandwidth degrades above 85°C due to thermal rollover, not just RIN increase"
  source: Expert
  domain: VCSEL/thermal
  confidence: 0.90  # expert self-assessed
  timestamp: 2026-XX-XX
  context: "User corrected model's assumption about high-temperature VCSEL behavior"
  status: ACTIVE
  referenced_by: []  # claim IDs that reference this assertion
```

## Integration Points

### 1. Brainstorm Engine (Step 1 — UNDERSTAND)
Before generating hypotheses, the system performs "Expert Knowledge Harvest":
- "What do you already know about this topic that the literature might not capture?"
- "Are there common misconceptions in this area?"
- "What practical constraints should we keep in mind?"

### 2. R2-Physics Review
Before every review, R2 MUST:
1. Read EXPERT-ASSERTIONS.md
2. Check if any claim under review contradicts an expert assertion
3. If contradiction found → FLAG IMMEDIATELY with reference to EA-xxx
4. Expert assertions have confidence floor 0.70 — they cannot be casually dismissed

### 3. Claim Collision Detection
When a new claim is registered:
- Compare against all ACTIVE expert assertions
- If the claim contradicts an assertion → automatic WARNING
- The researcher must either:
  a. Provide evidence strong enough to override (E >= 0.85, peer-reviewed)
  b. Modify the claim to be consistent
  c. Request expert re-evaluation of the assertion

### 4. Serendipity Engine
Expert assertions that contradict the literature are HIGH-PRIORITY serendipity seeds:
- Score minimum 10 (out of 20)
- Tagged as source: EXPERT_CONTRADICTION
- These represent potential "undiscovered public knowledge" (Swanson 1986)

## Expert Override Protocol

The expert can override R2's verdict on specific claims:
1. Expert states disagreement with R2's assessment
2. System captures the override as EA-xxx with context
3. Claim status → EXPERT_OVERRIDE (not VERIFIED, not KILLED)
4. At Stage 5 synthesis, EXPERT_OVERRIDE claims are listed separately with full context
5. This is NOT a rubber stamp — the override and R2's original objection are both preserved

## Assertion Lifecycle

- ACTIVE → assertion is in force, R2 must respect it
- REVISED → expert updated the assertion (original preserved in history)
- SUPERSEDED → new literature evidence convinced expert to change position
- WITHDRAWN → expert explicitly withdrew the assertion

## Anti-Gaming Note

Expert assertions are NOT a way to bypass adversarial review. They are a way to inject domain knowledge that the model lacks. R2 still reviews all claims. The difference: R2 must explain WHY it disagrees with an expert assertion, not just flag a generic concern.
