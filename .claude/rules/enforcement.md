# v6.0 Structural Enforcement

## Seeded Fault Injection (SFI)
The orchestrator injects known faults into claim sets before FORCED R2 reviews. R2 does not know which claims are seeded. If R2 misses seeded faults, the review is INVALID. This is not a test of R2's knowledge — it is a test of R2's vigilance.

## Blind-First Pass (BFP)
For FORCED reviews, R2 receives claims WITHOUT researcher justifications first. R2 must form independent assessments before seeing the full context. This breaks anchoring bias.

## Schema-Validated Gates
8 critical gates require artifacts that validate against JSON Schema. Prose claims of completion ("confounder harness: DONE") are IGNORED — only the schema matters. Schemas are READ-ONLY for all agents.

## Circuit Breaker
Same R2 objection × 3 rounds × no state change → claim becomes DISPUTED. Frozen, not killed. Pipeline continues with other claims. DISPUTED claims block Stage 5 synthesis (S5 Poison Pill).

## Agent Permission Model (Separation of Powers)

| Agent | Claim Ledger | R2 Reports | Schemas |
|-------|-------------|------------|---------|
| Researcher | READ+WRITE | READ | READ |
| R2 Ensemble | READ only | WRITE | READ |
| R3 Judge | READ only | READ only | READ |
| Orchestrator | READ+WRITE | READ | READ (enforce) |

**Key rule**: R2 produces verdict artifacts. The ORCHESTRATOR writes to the claim ledger. R2 NEVER writes to the claim ledger directly. R3 NEVER modifies R2's report.

## Salvagente Rule
When R2 kills a claim with reason INSUFFICIENT_EVIDENCE, CONFOUNDED, or PREMATURE, R2 MUST produce a serendipity seed. This is mandatory, not optional. Failure to salvage is a J0 scorable offense.
