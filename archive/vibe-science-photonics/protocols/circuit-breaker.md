# Circuit Breaker Protocol

Deadlock prevention for the R2 Ensemble review loop. Detects irreconcilable disagreements between Researcher and R2, freezes the disputed claim, and allows the rest of the pipeline to proceed.

**v5.0 IUDEX**: New protocol. Addresses a class of liveness failures where R2 demands a test that is impossible given available data or tooling.

> Load this when: a claim enters its third consecutive review round with the same unresolved R2 objection.

## Problem: The Gossip Deadlock

In a multi-agent system with rigid quality gates, deadlocks are inevitable. The canonical scenario:

```
R2:         "You must run confounder harness for GC content bias"
Researcher: "Dataset lacks GC annotation — test is impossible with available data"
R2:         "Without harness, verdict is REJECT"
Researcher: "Gate won't pass without your ACCEPT"
  -> Infinite loop. Tokens burn. No progress.
```

This occurs whenever R2 demands a test that is correct in principle but impossible in practice. R2 is not wrong — the demand is methodologically sound. The Researcher is not wrong — the data genuinely lacks what is needed. The system simply has no mechanism to resolve an irreconcilable disagreement, so both agents repeat their positions indefinitely.

## Circuit Breaker Protocol

### Trigger

Same claim, same R2 objection, **3 consecutive rounds with no state change**.

A state change is any of the following:
- New evidence presented by the Researcher
- A test or experiment actually executed
- Confidence score revised
- Claim text modified or narrowed

If none of these occur across 3 rounds, the objection is classified as a **gossip loop**.

### Action

1. **Detection**: The Orchestrator identifies the gossip loop (identical objection repeated 3x, no state change in the claim record).
2. **Status transition**: Claim status is set to `DISPUTED`.
   - `claim.status = "DISPUTED"`
   - `claim.dispute_reason` = R2's unresolved objection (verbatim)
   - `claim.dispute_cycle` = current OTAE cycle number
   - `claim.researcher_position` = Researcher's last response (verbatim)
3. **Freeze**: The claim is frozen. It cannot be promoted, cannot be killed, and cannot be modified.
4. **Continue**: Processing resumes with all remaining claims. The OTAE loop is not interrupted.

The circuit breaker fires **loudly** — the event is logged, reported in the cycle summary, and visible in the claim ledger. No dispute is ever silent.

## DISPUTED State Properties

| Property | Value |
|----------|-------|
| DISPUTED = KILLED? | **No.** The claim survives, flagged, for later resolution. |
| DISPUTED = ACCEPTED? | **No.** The claim cannot be promoted to paper-grade evidence. |
| Can be modified? | **No.** Frozen verbatim until resolution. |
| R2 objection preserved? | **Yes.** Verbatim, no paraphrasing, no summarization. |
| Researcher position preserved? | **Yes.** Verbatim, same standard. |
| Visible in ledger? | **Yes.** Marked with `[DISPUTED]` tag. |

## S5 Poison Pill

Stage Synthesis (S5) **CANNOT close** while any claim has status `DISPUTED`. DISPUTED claims act as a hard block on the final stage of the pipeline. This prevents disputes from being quietly swept under the rug.

Resolution options at S5:

1. **New data**: Evidence or tooling that addresses R2's original objection becomes available. The claim is unfrozen, the test is run, and normal review resumes.
2. **Voluntary drop**: The Researcher voluntarily withdraws the claim. Status transitions from DISPUTED to KILLED with documented rationale.
3. **Human override**: The human operator explicitly resolves the dispute with a documented rationale. The rationale is preserved in the claim record as `claim.human_override_rationale`.

All three options produce an auditable record. There is no silent resolution path.

## OTAE Continues

While a claim is DISPUTED, all other claims process normally through the OTAE loop and R2 review. The circuit breaker is scoped to the individual claim, not the session. One deadlocked claim does not block the pipeline — it blocks only itself and, ultimately, Stage Synthesis closure.

## Why 3 Rounds

The threshold of 3 rounds is empirical. If R2 and the Researcher have not resolved a disagreement in 3 rounds without introducing any new evidence, they will not resolve it in 10. Additional rounds produce identical exchanges and burn tokens with zero information gain. The disagreement is real and requires external input: new data, human judgment, or cross-model audit.

The threshold is configurable (`circuit_breaker_rounds`, default: 3) but raising it is discouraged without strong justification.

## Re-examination Triggers

A DISPUTED claim is re-examined automatically when any of the following occurs:

- **Stage transition**: The session advances to a new stage, which may bring new data or context.
- **New data or tools**: A dataset, annotation, or tool becomes available that directly addresses R2's objection.
- **Cross-model audit**: An R3 Judge or external model reviews the dispute and provides a reasoned resolution.

Upon re-examination, if the trigger resolves the objection, the claim is unfrozen and re-enters normal review. If not, it remains DISPUTED until S5 forces resolution.
