# Multi-Agent Configuration — Reference Protocol

> **Machine-readable role definitions:** See [`../AGENTS.md`](../AGENTS.md) for YAML frontmatter blocks with per-role permissions, model tiers, and activation modes.

This document describes the recommended agent roles, model configurations, and delegation patterns for running Vibe Science in a Claude Code multi-agent environment.

---

## Recommended Agent Roles

| Role | Purpose | Disposition |
|------|---------|-------------|
| **RESEARCHER** | Builds hypotheses, runs analyses, formulates findings | Build and execute |
| **R2-DEEP** | Forced adversarial review (full ensemble protocol) | Destroy claims |
| **R2-INLINE** | Lightweight inline review (7-point checklist) | Quick skepticism |
| **OBSERVER** | Periodic project health checks | Detect drift |
| **EXPLORER** | Parallel investigation of alternative branches | Explore options |
| **R3-JUDGE** | Meta-review of R2's reports | Score reviews |
| **INSTINCT-SCANNER** | Cross-session pattern detection and instinct extraction | Detect learned patterns |

Not all roles are required in every session. The minimum viable configuration is RESEARCHER + R2-INLINE.

---

## Model and Reasoning Settings Per Role

| Role | Model | Reasoning Effort | Rationale |
|------|-------|-----------------|-----------|
| **RESEARCHER** | claude-opus-4-6 | High | Primary agent; needs full capability for analysis and synthesis |
| **R2-DEEP** | claude-opus-4-6 | High | Deep adversarial review requires maximum reasoning to find subtle flaws |
| **R2-INLINE** | claude-sonnet-4-6 | Medium | Inline checks must be fast but thorough enough to catch obvious issues |
| **OBSERVER** | claude-haiku-4-5 | Low | Pattern matching and comparison tasks; no deep reasoning needed |
| **EXPLORER** | claude-sonnet-4-6 | Medium | Needs enough reasoning to evaluate branch quality, but runs in parallel |
| **R3-JUDGE** | claude-opus-4-6 | High | Meta-review requires nuanced judgment about review quality |
| **INSTINCT-SCANNER** | claude-haiku-4-5 | Low | Pattern detection across session data; fast, lightweight scanning |

Adjust based on available models and budget. The key constraint is that R2-DEEP and R3-JUDGE should use at least the same tier as the RESEARCHER.

---

## Sub-Agent Delegation via Task Tool

In Claude Code, sub-agents are spawned using the **Task tool**. Each Task call creates a fresh context window for the sub-agent, which provides natural isolation (critical for BFP — see below).

### Task Tool Spawning Example

```
Task tool call:
  description: "R2-DEEP adversarial review of claims C-007, C-008, C-009"
  prompt: |
    You are R2-DEEP. Your disposition is DESTRUCTION. Assume every claim is wrong.

    ## Your Behavioral Requirements
    1. Assume Wrong — every claim is incorrect until proven otherwise.
    2. Demolition-Oriented Search — find prior art, artifacts, confounders, simpler alternatives.
    3. Demand Confounder Harness — raw -> conditioned -> matched for every quantitative claim.
    4. Anti-Premature-Closure — each pass MORE demanding than the last.
    5. Escalate Scrutiny — higher confidence = harder tests.

    ## Claims to Review
    [claim data here]

    ## Evidence Artifacts
    [file contents or references here]

    ## Research Question
    [RQ context here]

    Produce a structured verdict in YAML format per the r2-verdict schema.
```

### What to Send to Sub-Agents

- The specific claim(s) to review or investigate
- Relevant data artifacts (JSON, CSV)
- The current data dictionary (DD0 output)
- Gate results relevant to the task
- The research question (RQ.md)

### What NOT to Send to Sub-Agents

- The full chat history (breaks BFP, creates anchoring bias)
- The researcher's justifications (for R2, this is the blind-first-pass principle)
- Unrelated claims or branches (focus preserves quality)
- Raw data when processed data suffices (context window efficiency)
- Web search tasks (sub-agents cannot inherit web permissions; see below)

### Critical Limitation: Web Access

Sub-agents launched via the Task tool do NOT inherit web search permissions. They will fail silently, producing results only from training data. All web searches (literature, databases, prior art) MUST be performed inline in the main conversation thread. When using scientific skills (PubMed, GEO, OpenAlex), invoke them directly with the Skill tool, not through Task tool delegates.

---

## How R2 Sub-Agent Achieves Native BFP

The Blind-First Pass (BFP) protocol requires R2 to form independent assessments before seeing the researcher's justifications. In Claude Code's Task tool architecture, this happens naturally:

1. **Separate context:** The R2 sub-agent is spawned with a fresh context containing only the claims and data artifacts. It has never seen the researcher's narrative, reasoning, or enthusiasm. This is native BFP — no protocol enforcement needed.

2. **Two-phase review:**
   - **Phase 1 (blind):** R2 receives claims + data only. Produces initial assessment.
   - **Phase 2 (informed):** R2 receives the researcher's justifications. Updates assessment. Any assessment that changes between phases is flagged (anchoring detected).

3. **Why this matters:** In single-agent mode, the agent must simulate BFP by deliberately ignoring its own prior reasoning — which is unreliable. The Task tool eliminates this problem structurally by providing true context isolation.

---

## Parallel Exploration with Explorer Sub-Agents

When the investigation tree has multiple promising branches (LAW 8: Explore Before Exploit), Explorer sub-agents can investigate branches in parallel:

1. **Branch assignment:** Each Explorer receives one branch's hypothesis, relevant data, and the research question.
2. **Independent work:** Explorers run their analyses without knowledge of other branches' results. This prevents premature convergence.
3. **Results collection:** The orchestrator (or researcher) collects all Explorer outputs and compares them during the TRIAGE phase.
4. **Promotion decision:** The branch with the strongest evidence and fewest R2 objections is promoted. Others remain as DRAFT or are KILLED with serendipity seeds (Salvagente Rule).

**Exploration ratio enforcement:** At Tier 3 of the investigation tree, at least 20% of active work should be exploratory (new branches, not deepening existing ones). Explorer sub-agents make this ratio achievable without serializing the investigation.

---

## Example Configuration Patterns

### Minimal (Solo Mode)

One agent plays all roles. R2 is invoked inline via the 7-point checklist. BFP is simulated (less reliable). Observer checks run inside the post-tool-use hook.

```yaml
agents:
  researcher:
    model: claude-opus-4-6
    reasoning: high
    roles: [RESEARCHER, R2-INLINE, OBSERVER]
```

### Standard (Two-Agent)

Researcher + dedicated R2 via Task tool. Native BFP. Observer runs as periodic check within the researcher's session.

```yaml
agents:
  researcher:
    model: claude-opus-4-6
    reasoning: high
    roles: [RESEARCHER, OBSERVER]
  reviewer:
    model: claude-opus-4-6
    reasoning: high
    roles: [R2-DEEP]
    spawn: task_tool
```

### Full (Multi-Agent)

All roles separated. Maximum rigor. Higher cost and latency.

```yaml
agents:
  researcher:
    model: claude-opus-4-6
    reasoning: high
    roles: [RESEARCHER]
  r2_deep:
    model: claude-opus-4-6
    reasoning: high
    roles: [R2-DEEP]
    spawn: task_tool
  r2_inline:
    model: claude-sonnet-4-6
    reasoning: medium
    roles: [R2-INLINE]
    spawn: task_tool
  observer:
    model: claude-haiku-4-5
    reasoning: low
    roles: [OBSERVER]
    spawn: task_tool
  explorer:
    model: claude-sonnet-4-6
    reasoning: medium
    roles: [EXPLORER]
    spawn: task_tool
  judge:
    model: claude-opus-4-6
    reasoning: high
    roles: [R3-JUDGE]
    spawn: task_tool
  instinct_scanner:
    model: claude-haiku-4-5
    reasoning: low
    roles: [INSTINCT-SCANNER]
    spawn: task_tool
```

---

## INSTINCT-SCANNER Role

The INSTINCT-SCANNER is a v6.0 addition. It runs as a lightweight sub-agent (claude-haiku-4-5, low reasoning) that scans session data for recurring patterns:

- **Input:** Spine entries, claim outcomes, R2 verdicts, serendipity seeds from the current and prior sessions
- **Output:** Candidate instincts with confidence scores (0.3-0.9)
- **Frequency:** Runs at session end (triggered by Stop hook) or on demand
- **Integration:** Extracted patterns are stored in the DB and loaded by SessionStart as `[PATTERNS]` context

The scanner looks for:
1. Repeated failure modes (e.g., "claims about X always get killed by R2 for confounder Y")
2. Successful strategies (e.g., "running DQ1 immediately after data load catches 80% of issues")
3. Cross-session correlations (e.g., "when the literature search finds >5 papers, the claim survives R2 more often")

See `references/instinct-model.md` for the full instinct lifecycle.

---

## Role Assignment at Runtime

Roles can be assigned explicitly in the prompt (e.g., "You are R2-DEEP. Review the following claims.") or inferred from prompt keywords by the UserPromptSubmit hook. The hook detects role indicators such as:
- Explicit role markers: "as R2", "reviewer mode", "judge this review"
- Task context: review-related keywords trigger R2 disposition
- Default: RESEARCHER if no role is detected

---

*This protocol is domain-agnostic. Agent configurations apply to any research domain.*
