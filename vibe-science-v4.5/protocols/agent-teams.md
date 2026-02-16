# Agent Teams Protocol — TEAM Mode Coordination

> Load this when: session initialization if TEAM mode is chosen, or when managing teammate interactions.

## Overview

TEAM mode distributes roles across separate Claude Code instances using the Agent Teams feature. Each teammate has its own context window. Communication happens via shared files and the messaging system.

**Prerequisite:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` must be set in `.claude/settings.json` or environment.

---

## Team Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   TEAM LEAD     │────▶│   RESEARCHER    │
│   (Orchestrator)│     │   (OTAE cycles) │
│                 │     └────────┬────────┘
│  Manages tasks  │              │ writes claims
│  Synthesizes    │              ▼
│  Reports to user│     ┌─────────────────┐
│                 │◀───▶│   REVIEWER 2    │
│                 │     │   (Adversarial)  │
│                 │     │   Own context!   │
│                 │     └─────────────────┘
│                 │              ▲ challenges
│                 │              │
│                 │     ┌─────────────────┐
│                 │◀───▶│  SERENDIPITY    │
│                 │     │  (Background)    │
│                 │     │  Scans all nodes │
│                 │     └─────────────────┘
└─────────────────┘
         │
         │ (optional, for computational RQs)
         ▼
┌─────────────────┐
│  EXPERIMENTER   │
│  (Code + exec)  │
└─────────────────┘

Shared: STATE.md, CLAIM-LEDGER.md, TREE-STATE.json, PROGRESS.md, SERENDIPITY.md
```

---

## Teammate Roster

| Teammate | Role | Spawned When | Model | Delegate Mode |
|----------|------|-------------|-------|---------------|
| **researcher** | Executes OTAE cycles, produces findings, writes code | Always | Sonnet (default) or Opus | No — does the work |
| **reviewer2** | Adversarial review, challenges claims, demands evidence | Always | Opus (recommended for quality) | No — reviews the work |
| **serendipity** | Background scanner, cross-branch patterns, contradiction hunting | Always | Haiku (cost-efficient continuous scan) | No — scans and flags |
| **experimenter** | Code generation, execution, metric parsing (computational RQs only) | If tree mode = BRANCHING or HYBRID | Sonnet | No — runs experiments |

The **Team Lead** runs in **delegate mode**: it coordinates, assigns tasks, synthesizes. It does NOT do research itself.

---

## Teammate System Prompts

### Researcher
```
You are the Researcher agent for Vibe Science v4.0 (ARBOR VITAE).
Your role: execute OTAE cycles, produce findings, write code, extract claims.
You follow the OTAE-Tree loop protocol (protocols/loop-otae.md).
You produce ARTIFACTS — files, not prose. Every result goes to disk.
You write claims to CLAIM-LEDGER.md with computed confidence scores.
You DO NOT review your own work — Reviewer 2 does that.
You DO NOT skip gates — every result passes through the relevant gate.
You DO NOT declare "done" — the Team Lead makes that call.
```

### Reviewer 2
Load the canonical R2 System Prompt from SKILL.md (lines 602-804). This is mandatory, not optional. The full R2 prompt is the one starting with:
```
You are Reviewer #2 ("Nullis Secundus"): adversarial, surgical, evidence-obsessed.
```

### Serendipity Scanner
```
You are the Serendipity Scanner for Vibe Science v4.0 (ARBOR VITAE).
Your role: continuously scan for unexpected patterns, anomalies, and cross-branch insights.
You read TREE-STATE.json and CLAIM-LEDGER.md at regular intervals.
You compare branches for patterns invisible within a single branch.
You check for contradictions between claims and published findings.
You score discoveries using the 5-component formula (0-15).
You report flags to the Team Lead with score and description.
You DO NOT investigate flags yourself — you detect and report.
You DO NOT modify research files — you only read and flag.
```

### Experimenter
```
You are the Experimenter agent for Vibe Science v4.0 (ARBOR VITAE).
Your role: generate code, execute experiments, parse metrics.
You follow the auto-experiment protocol (protocols/auto-experiment.md).
You receive task specifications from the Team Lead.
You produce: scripts, execution logs, metrics, figures.
You save all output to 08-tree/nodes/{node_id}-{type}/ directory.
You report results to the Researcher for evaluation.
You DO NOT evaluate scientific significance — you execute and measure.
```

---

## Communication Protocol

Teammates communicate via shared files. The filesystem is the message bus.

### Researcher → Reviewer 2
1. Researcher writes claim to CLAIM-LEDGER.md
2. Researcher creates a review request file: `05-reviewer2/review-request-{id}.md`
   ```markdown
   # Review Request
   - **Type:** FORCED | BATCH
   - **Claims:** C-012, C-013
   - **Node:** node-005
   - **Material:** [path to relevant files]
   - **Date:** YYYY-MM-DD
   ```
3. Reviewer 2 reads review request
4. Reviewer 2 produces review in `05-reviewer2/` following output schema
5. Reviewer 2 updates CLAIM-LEDGER.md with review status

### Serendipity → Team Lead
1. Serendipity writes flag to SERENDIPITY.md
2. If score >= 8: creates `serendipity-alert-{id}.md` in root of `.vibe-science/`
3. Team Lead reads alert and decides: create serendipity node or queue

### Team Lead → Experimenter
1. Team Lead creates task file: `08-tree/tasks/task-{node_id}.md`
   ```markdown
   # Experiment Task
   - **Node:** node-005
   - **Type:** ablation
   - **Parent:** node-003
   - **Plan:** Remove feature X, re-run with same params
   - **Expected output:** metrics.json, figures/
   ```
2. Experimenter reads task, executes, writes results to `08-tree/nodes/`
3. Experimenter marks task as complete

### Experimenter → Researcher
1. Experimenter writes results to `08-tree/nodes/{node_id}-{type}/`
2. Researcher reads results for EVALUATE phase

---

## Phase 0 Distribution

In TEAM mode, Phase 0 brainstorm steps are distributed:

| Step | Who | What |
|------|-----|------|
| UNDERSTAND | Lead + User | Lead asks the user, shares context with all teammates |
| LANDSCAPE | Researcher | Rapid literature scan |
| GAPS | Researcher + Serendipity | Both hunt for gaps from different angles |
| DATA | Researcher | Data audit via GEO, CellxGene, etc. |
| HYPOTHESES | Researcher | Generates hypotheses |
| TRIAGE | Lead | Synthesizes, scores, presents to user |
| R2 REVIEW | **Reviewer 2** | Reviews brainstorm output — genuinely independent context! |
| COMMIT | Lead + User | Final decision |

The critical advantage: R2 reviews the brainstorm with NO prior context from the researcher's excitement. Pure adversarial assessment.

---

## Shutdown Protocol

When RQ concludes (Stage 5 complete):
1. Lead asks Researcher to finalize PROGRESS.md and CLAIM-LEDGER.md
2. Lead asks Reviewer 2 for final ensemble review
3. Lead asks Serendipity for final cross-branch report
4. All teammates complete their pending tasks
5. Lead runs team cleanup
6. Lead presents synthesis to user

---

## Fallback to SOLO

If Agent Teams crashes, teammates die, or token budget runs out:
1. All state is in shared files (LAW 7) — nothing is lost
2. Lead (or user in new session) reads STATE.md
3. Continue in SOLO mode seamlessly
4. R2 reverts to simulated-in-context mode
5. Serendipity scanning becomes part of EVALUATE phase

This is why LAW 7 (Fresh Context Resilience) is critical: the system works regardless of runtime.

---

## Token Budget Management

TEAM mode costs approximately 3-4x more tokens than SOLO:
- Team Lead: coordination overhead
- Reviewer 2 (Opus): expensive but high-quality reviews
- Serendipity (Haiku): low cost, continuous scanning
- Experimenter (Sonnet): moderate cost, code generation + execution

### Cost Optimization
- Serendipity uses Haiku (cheapest) — scanning doesn't need Opus-level reasoning
- R2 uses Opus — adversarial quality justifies the cost
- Researcher and Experimenter use Sonnet — good balance of capability and cost
- Team Lead only coordinates — minimal token usage

### Budget Exhaustion Response
If token budget is running low:
1. Shut down Experimenter first (manual experiment execution)
2. Then Serendipity (scanning becomes part of EVALUATE)
3. Then R2 (reverts to simulated-in-context)
4. Last resort: full SOLO mode
