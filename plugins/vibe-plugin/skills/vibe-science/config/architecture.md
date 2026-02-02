# Loop Architecture

Design rationale for Vibe Science's agent structure.

## The Choice

Three architectures were considered:

| Architecture | Description | Pros | Cons |
|--------------|-------------|------|------|
| **Single-Agent Persona Switching** | One agent switches between Researcher and Reviewer 2 roles | Simple, no coordination | Self-review bias, context pollution |
| **Multi-Agent Spawn** | Separate agents for each role, orchestrator coordinates | True independence, clean separation | Complex, coordination overhead |
| **Hybrid** | Primary Researcher agent, spawns Reviewer 2 subagent when needed | Best of both, practical | Subagent has limited context |

## Decision: HYBRID

Vibe Science uses the **Hybrid** architecture.

### Rationale

1. **Researcher continuity matters**
   - Research is cumulative - each cycle builds on previous
   - Context switching between personas would lose nuance
   - The "I" doing research should be consistent

2. **Reviewer 2 benefits from fresh eyes**
   - Adversarial review is MORE effective with less context
   - A subagent that only sees the finding (not the journey) catches different issues
   - Prevents "I know why I did this, so I won't question it" bias

3. **Practical coordination**
   - Single orchestrating agent (Researcher) manages state
   - No need for complex multi-agent protocols
   - Clear handoff: Researcher prepares package → Reviewer 2 critiques → Researcher responds

### Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                      HYBRID ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    RESEARCHER                        │   │
│  │                  (Primary Agent)                     │   │
│  │                                                      │   │
│  │  - Maintains session state                          │   │
│  │  - Executes research loop                           │   │
│  │  - Manages .md files                                │   │
│  │  - Accumulates findings                             │   │
│  │  - Decides when to invoke Reviewer 2                │   │
│  │                                                      │   │
│  │         │                          ▲                │   │
│  │         │ Spawn with               │ Critique       │   │
│  │         │ finding package          │ + verdict      │   │
│  │         ▼                          │                │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │              REVIEWER 2                       │  │   │
│  │  │             (Subagent)                        │  │   │
│  │  │                                               │  │   │
│  │  │  - Fresh context (only sees package)         │  │   │
│  │  │  - Adversarial system prompt                 │  │   │
│  │  │  - Returns critique + verdict                │  │   │
│  │  │  - No access to Researcher's journey         │  │   │
│  │  │                                               │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Researcher Agent

### Identity

Loaded from `prompts/researcher.md` at session start.

### Responsibilities

1. **State management**
   - Read/write STATE.md
   - Append to PROGRESS.md
   - Create/update findings
   - Manage folder structure

2. **Research execution**
   - Run literature searches
   - Analyze papers
   - Extract data
   - Validate findings

3. **Loop control**
   - Decide cycle progression
   - Detect stop conditions
   - Handle serendipity pivots

4. **Reviewer 2 coordination**
   - Detect when review needed
   - Prepare finding package
   - Receive and address critique
   - Update findings post-review

### Context

The Researcher maintains FULL context:
- All previous cycles in session
- All findings accumulated
- Full reasoning chain

This is necessary because research is cumulative.

## Reviewer 2 Subagent

### Identity

Loaded from `prompts/reviewer2.md` (in main SKILL.md) when spawned.

### Responsibilities

1. **Adversarial critique**
   - Challenge claims
   - Demand counter-evidence
   - Question methodology
   - Check for hallucination

2. **Verdict delivery**
   - REJECTED / MAJOR CONCERNS / MINOR CONCERNS / APPROVED
   - Specific actionable feedback

### Context

Reviewer 2 receives MINIMAL context:
- The finding document(s) under review
- The research question (for context)
- NO access to Researcher's reasoning journey

This is deliberate:
- Fresh perspective catches different issues
- No "sunk cost" bias from seeing the work
- Simulates actual peer review (reviewer doesn't see your drafts)

### Spawning

```python
# Pseudo-code for spawning Reviewer 2

def invoke_reviewer2(finding_package, review_type):
    """
    Spawn Reviewer 2 subagent with minimal context.

    finding_package: The finding(s) to review
    review_type: 'major' | 'batch' | 'final' | 'pivot'
    """

    subagent = spawn_subagent(
        system_prompt=REVIEWER2_SYSTEM_PROMPT,
        context=[
            f"Review type: {review_type}",
            f"Research question: {current_rq}",
            f"Finding(s): {finding_package}"
        ],
        # Explicitly NO: session history, previous cycles, reasoning
    )

    critique = subagent.run()

    return critique
```

## Why Not Full Multi-Agent?

Considered but rejected:

### GSD-style Orchestration

GSD uses multiple specialized agents with a coordinator. For Vibe Science:

**Problem:** Research isn't cleanly decomposable.
- A "search agent" can't operate without knowing what previous searches found
- An "analysis agent" needs full context of the research question evolution
- Coordination overhead would exceed benefits

### Independent Parallel Agents

Multiple agents working on different aspects simultaneously.

**Problem:** Research is inherently sequential.
- Can't analyze before searching
- Can't validate before extracting
- Parallelism doesn't fit the domain

## Why Not Single-Agent Persona Switching?

Considered but rejected:

### Same Agent as Both Researcher and Reviewer 2

**Problem:** Self-review is weak.
- "I know why I made this decision" prevents questioning it
- Context pollution - can't unsee your own reasoning
- Confirmation bias amplified

**Experiment:** Early tests showed persona switching produced softer reviews.
The "Reviewer 2" would say "this seems reasonable because..." rather than
attacking assumptions.

## Hybrid Trade-offs

### Advantages

1. **Clean separation where it matters** (adversarial review)
2. **Continuity where it matters** (research accumulation)
3. **Simple coordination** (one primary agent)
4. **Practical implementation** (standard subagent spawning)

### Disadvantages

1. **Reviewer 2 has limited context** - may miss issues that require journey knowledge
2. **Single point of failure** - if Researcher gets confused, whole session derails
3. **Subagent overhead** - spawning takes time/tokens

### Mitigations

1. **For limited context:** Researcher can provide additional context if Reviewer 2 critique seems to miss something. But default to minimal.

2. **For single point of failure:** Frequent state crystallization to STATE.md. If session derails, can restart from last good state.

3. **For overhead:** Only spawn Reviewer 2 when needed (major findings, batch threshold, conclusion). Don't over-review.

## Future Considerations

### Potential Enhancement: Specialist Subagents

Could add domain-specific subagents:
- **Statistician** - for validating statistical claims
- **Methods Expert** - for checking reproducibility
- **Field Expert** - for domain-specific critiques

These would be spawned like Reviewer 2, with minimal context and specific prompts.

### Potential Enhancement: Parallel Search Agents

For large-scale literature surveys:
- Spawn multiple search agents for different databases
- Merge results back to main Researcher
- Could speed up discovery phase

Not implemented yet - current sequential approach works for typical RQs.

## Summary

```
ARCHITECTURE: Hybrid

PRIMARY AGENT: Researcher
- Full context
- Executes loop
- Manages state
- Coordinates reviews

SUBAGENT: Reviewer 2
- Minimal context
- Adversarial critique
- Spawned on demand
- Returns verdict

RATIONALE: Research needs continuity. Review needs fresh eyes.
Hybrid provides both.
```
