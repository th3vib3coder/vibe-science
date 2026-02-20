# OTAE-Tree Loop — Detailed Protocol

> Load this when: first cycle of a session, or when the loop needs re-grounding.

## Overview

OTAE = Observe → Think → Act → Evaluate → Checkpoint → Crystallize. Adapted from OpenAI Codex agent loop for scientific research.

v3.5 had a flat OTAE loop: cycle 1 → cycle 2 → cycle 3 → ...

v4.0 has a **tree of OTAE nodes**:

```
                     root
                    /    \
                node-A   node-B        ← each is a full OTAE cycle
               / |  \      |
            A1  A2  A3    B1           ← children = variations
           /
         A1a                           ← deeper exploration
```

Each node executes one complete OTAE cycle (Observe parent → Think plan → Act execute → Evaluate score). The tree search engine selects which node to expand next based on Evidence Engine confidence + metrics.

**When to branch vs. stay linear:**
- Literature review → LINEAR (sequential cycles, like v3.5)
- Computational experiments → BRANCHING (tree search over variants)
- Mixed research → HYBRID (linear discovery phase, then branch for experiments)

Each cycle produces ONE meaningful action. No multi-step bundles. One action, verified, documented, then next cycle.

---

## OBSERVE Phase

### What to Read
1. `STATE.md` — entire file (max 100 lines)
2. `TREE-STATE.json` — current tree structure, current node, best node
3. `PROGRESS.md` — last 20 lines
4. Check: `minor_findings_pending` count in STATE.md frontmatter
5. Check: `cycle` number (warn at 15, force review at 20)
6. Identify current stage (1-5) from STATE.md frontmatter

### Load Node Context
- Read current node from TREE-STATE.json (`current_node` field)
- Read parent chain: current → parent → ... → root
- Load parent node's `evaluate_result` and `metrics` (this is the starting point for THINK)
- Check: is current node pending, running, good, buggy, pruned?

### Consistency Check
- Does STATE.md's "Current Tree State" match TREE-STATE.json?
- Does STATE.md's "Next Action" match what PROGRESS.md last recorded?
- If STATE ↔ TREE mismatch → TREE-STATE.json is authoritative (it's the structured format)
- If STATE ↔ PROGRESS mismatch → something was interrupted. Resume from PROGRESS.md (it's append-only, more reliable).
- If STATE.md is corrupt or >100 lines → rewrite from PROGRESS.md last 5 entries + TREE-STATE.json.

### Context Assembly
After reading, you should know:
- Current RQ, phase, stage, and tree mode
- Current node and its parent chain
- Best node and its metrics
- What was last done
- What needs doing next
- Any pending R2 demands or gate failures
- Any pending serendipity flags

---

## THINK Phase

### Mode-Dependent Decision

**TREE MODE (branching/hybrid computational phases):**

1. Is there a pending R2 verdict I need to address? → Address it first (blocking)
2. Is there a gate failure I need to fix? → Fix it first (blocking)
3. **Node Selection (Best-First):**
   - If pending debug nodes exist AND random() < 0.5: → Select oldest pending debug node
   - If current stage demands specific type (e.g. Stage 2 = hyperparameter): → Select best unexpanded node of that type
   - Otherwise: → Select node with highest score across all branches
   - Score = evidence_confidence * 0.6 + metric_improvement * 0.3 + novelty * 0.1
4. **Node Type Selection:**
   - Stage 1: `draft` (new approaches)
   - Stage 2: `hyperparameter` or `improve`
   - Stage 3: `draft` (creative variants)
   - Stage 4: `ablation` or `replication`
   - Any stage: `debug` (if parent is buggy, max 3 attempts)
   - Any stage: `serendipity` (if score >= 12)
5. What would falsify the parent node's result? (mandatory question)
6. Plan the specific action for this node

**LINEAR MODE (literature/discovery phases):**

Same as v3.5 — ask these questions IN ORDER:
1. Is there a pending R2 verdict I need to address? → Address it first (blocking)
2. Is there a gate failure I need to fix? → Fix it first (blocking)
3. What is the highest-priority open question for this RQ?
4. What single action would most advance toward answering it?
5. What tool/skill do I need to execute this action?

### Decision Types

| Type | Description | Dispatch |
|------|-------------|----------|
| SEARCH | Need more literature evidence | search-protocol.md |
| EXTRACT | Have a paper, need to pull specific data | data-extraction.md |
| VALIDATE | Have a claim, need to verify numerically | analysis-orchestrator.md |
| COMPUTE | Need to run analysis pipeline | analysis-orchestrator.md |
| TREE_EXPAND | Expand tree with new node (computational) | auto-experiment.md |
| BRAINSTORM | Phase 0 hypothesis generation | brainstorm-engine.md |
| SERENDIPITY_TRIAGE | Serendipity flag needs investigation | serendipity-engine.md |
| REVIEW | Need to invoke R2 (trigger reached) | reviewer2-ensemble.md |
| PIVOT | Research direction change | requires user approval |
| EXIT | Stop conditions met | → CRYSTALLIZE final state |

### Log the Decision
Before acting, write to PROGRESS.md:
```
### Cycle N — HH:MM [Stage S, Node node-xxx]
- **DECIDE:** [ACTION TYPE]: [specific plan] because [rationale]
```

### Gate T0 Check
Before expanding a new tree node, verify Gate T0 (Node Validity):
- Node has valid type for current stage
- Node has valid parent (exists in TREE-STATE.json, not pruned)
- Node has non-empty action plan (think_plan)
- Gate T0 FAIL → fix type/parent/plan before proceeding

---

## ACT Phase

### Execution Rules
1. ONE action per cycle. Not two. One.
2. Use the appropriate tool/skill (dispatch via skill-router.md if needed)
3. Produce ARTIFACTS — files, not prose. If you can save it as a file, do so.
4. Track exact inputs and outputs
5. If action produces code: save to `08-tree/nodes/{node_id}/` directory

### Action-Specific Protocols

| Action | Load | Do |
|--------|------|----|
| SEARCH | search-protocol.md | Query database, record in queries.log |
| EXTRACT | data-extraction.md | Download supplementary, parse tables |
| VALIDATE | analysis-orchestrator.md | Run validation, check statistical significance |
| COMPUTE | analysis-orchestrator.md + obs-normalizer.md | Execute pipeline step |
| TREE_EXPAND | auto-experiment.md | Generate code, execute, parse metrics |
| BRAINSTORM | brainstorm-engine.md | Gap analysis, hypothesis generation |
| SERENDIPITY_TRIAGE | serendipity-engine.md | Score, investigate, decide: NOISE/FILE/QUEUE/INTERRUPT |
| REVIEW | reviewer2-ensemble.md | Invoke R2 adversarial protocol |

### Debug Protocol (tree mode)
If the node's execution fails (buggy):
1. Mark node as `buggy` in TREE-STATE.json
2. Create a `debug` child node
3. Check Gate T1: debug_attempts <= 3 for the buggy parent
4. If T1 PASS → attempt fix with a DIFFERENT root cause approach
5. If T1 FAIL (>3 attempts) → PRUNE the node. Mark as `pruned` with reason. Move on. Do NOT attempt a 4th fix.
6. Each debug attempt MUST address a different root cause (not repeating the same fix)

---

## EVALUATE Phase

### For Every Result

1. **Source check**: Does it have DOI/PMID/dataset_id?
2. **Accessibility check**: Can the data actually be accessed?
3. **Consistency check**: Does it match or contradict existing findings?
4. **Claim extraction**: What new claims emerge from this result? → CLAIM-LEDGER.md
5. **Confidence scoring**: Apply formula (see evidence-engine.md) — computed, NOT felt
6. **Assumption check**: Did any assumption change? → ASSUMPTION-REGISTER.md
7. **Metric parsing** (if computational node): Extract metrics, compute delta from parent
8. **VLM feedback** (if figures generated and VLM available): Apply Gate G6

### Serendipity Radar (EVERY cycle, BEFORE gates)

Run the full 5-scan protocol (see serendipity-engine.md):

1. **ANOMALY SCAN**: Does this node's result contradict its parent's pattern? Is a metric moving in unexpected direction? Unexpected side-output?
2. **CROSS-BRANCH SCAN** (tree mode only): Compare with sibling branches. Pattern visible only when comparing? Two branches failing for different reasons suggesting a third approach?
3. **CONTRADICTION SCAN**: Contradicts any claim in CLAIM-LEDGER? Contradicts published finding in knowledge base?
4. **CONNECTION SCAN**: Connects to a different RQ? Echoes a pattern from a different domain? Unexpected similarity to an unrelated paper?
5. **SCORE** (0-15): Data availability (0-3) + Potential impact (0-3) + Connection strength (0-3) + Novelty (0-3) + Feasibility (0-3)

Response: 0-3 NOISE → log and move on | 4-7 FILE → log with details | 8-11 QUEUE → create tagged entry for Serendipity Sprint | 12-15 INTERRUPT → STOP, create serendipity node, triage immediately

### Gate Application

Apply ALL relevant gates for the action type:

**Pipeline Gates (data/compute actions):**
- G0: Data loaded correctly? (counts integer, no NaN/Inf)
- G1: obs schema normalized?
- G2: Design justified? (batch_key, HVG, covariates)
- G3: Training converged? (ELBO, no train-val gap)
- G4: Metrics meaningful? (contextualized, trade-offs explicit)
- G5: Artifacts complete? (manifest, report, figures, metrics)
- G6: VLM validation? (if VLM available — OPTIONAL)

**Literature Gates (search/extract actions):**
- L0: Source validity (DOIs verified, no training-knowledge claims as DATA)
- L1: Coverage adequacy (2+ databases, 3+ strategies, negative results documented)
- L2: Review completeness (all findings reviewed, counter-evidence searched)

**Tree Gates (tree mode):**
- T0: Node validity (valid type, valid parent, non-empty plan)
- T1: Debug limit (<=3 attempts per buggy node)
- T2: Branch diversity (siblings differ substantively)

Gate FAIL → stop, fix, re-gate. Do NOT continue past a failed gate.

### Node Status Update (tree mode)
After evaluation:
- Result valid + metrics computed → mark node `good`
- Execution failed or produced errors → mark node `buggy`
- Already `buggy` and T1 fails → mark node `pruned`
- Best in tree → candidate for `promoted` (after R2 clearance)

---

## CHECKPOINT Phase

### Stage Gate Check (S1-S5)
At the end of each node evaluation, check if the current stage gate is satisfied:
- S1: At least 1 good node with valid metrics + multi-seed validation
- S2: Best metric improved over Stage 1 + tested on 2+ configs + 1 ablation
- S3: All planned sub-experiments attempted + results documented
- S4: All key components ablated + multi-seed (3+ seeds) + cross-validation + confounder harness for all promoted claims
- S5: R2 full ensemble ACCEPT + Gate D2 PASS + all claims verified + all harnesses completed

If stage gate PASS → advance stage, R2 batch review at transition (BLOCKING), set best node as root for next stage.
If stage gate FAIL → remain in stage, address failure, re-check.

### Tree Health Check (T3)
Every 5 cycles, or after any node is pruned:
- good_nodes / total_nodes >= 0.2? (at least 20% productive)
- No branch with 5+ consecutive non-improving nodes?
- At least 2 branches explored (unless tree_mode = LINEAR)?

T3 FAIL → STOP expanding. R2 emergency review. Strategy revision. Do NOT add more nodes.

### R2 Co-Pilot Check

| Trigger | Mode | Action |
|---------|------|--------|
| Major finding this cycle | FORCED | Full ensemble review (BLOCKING) |
| Stage transition | FORCED | Full ensemble review (BLOCKING) |
| Confidence explosion (>0.30 in 2 cycles) | FORCED | Confirmation bias check (BLOCKING) |
| Pivot decision | FORCED | Full ensemble review (BLOCKING) |
| minor_findings_pending >= 3 | BATCH | Single-pass batch review (BLOCKING) |
| Every 3 cycles automatically | SHADOW | Passive review — see Shadow Protocol |
| R2 spots fatal flaw during any mode | VETO | Halts branch or entire tree (BLOCKING, cannot override except by human) |
| R2 identifies better direction | REDIRECT | Proposes alternative (soft — user chooses) |
| cycle >= 20 | FORCED | Comprehensive review of ALL findings |

**R2 Shadow Protocol (every 3 cycles):**
1. Read CLAIM-LEDGER.md — any confidence scores drifting up without new evidence?
2. Read ASSUMPTION-REGISTER.md — any HIGH-risk assumptions untested for 5+ cycles?
3. Read tree-visualization.md — is the tree lopsided? (one branch getting all attention)
4. Read SERENDIPITY.md — any flags ignored for 3+ cycles?
5. Compute: assumption_staleness, confidence_drift, tree_balance, serendipity_neglect
6. If ANY metric is concerning → log warning in PROGRESS.md
7. If 2+ metrics concerning → ESCALATE to FORCED R2 review

If R2 is triggered → load `protocols/reviewer2-ensemble.md` and execute. R2 is BLOCKING — demands must be addressed before continuing.

### Serendipity Sprint Check
- Every 10 cycles: dedicate 1 cycle to reviewing all QUEUEd serendipity entries
- Every 5 cycles in BRANCHING mode: scan ALL branches for cross-branch patterns
- If 3+ entries in QUEUE without review → forced sprint next cycle

### Stop Condition Check
After all checks:
- SUCCESS? All success criteria met + R2 cleared + S5 PASS → EXIT
- NEGATIVE? Hypothesis disproven by evidence → EXIT (still valuable — document)
- SERENDIPITY? Unexpected discovery confirmed → Create new RQ or extend current
- DIMINISHING RETURNS? cycle > 15, low finding rate → WARN user
- INFINITE LOOP? cycle > 30 AND no new findings in last 5 cycles → STOP, force R2 comprehensive, present options to user
- CONTINUE? → proceed to CRYSTALLIZE, then LOOP BACK TO OBSERVE

---

## CRYSTALLIZE Phase (LAW 10: NOT IN FILE = DOESN'T EXIST)

This is not optional. Every result of every cycle MUST be saved to disk. Context windows are ephemeral — files are permanent. If it's not in a file, it will be lost on the next compaction.

### Always Update (in this order)

1. **CLAIM-LEDGER.md** — add new claims, update existing statuses, record confounder harness results
2. **ASSUMPTION-REGISTER.md** — add/update any assumptions, increment cycles_untested counter
3. **TREE-STATE.json** — update node status, metrics, children, tree health counters
4. **Node file** in `08-tree/nodes/{node_id}.md` — full OTAE content for this node
5. **tree-visualization.md** in `08-tree/` — ASCII tree with current state
6. **PROGRESS.md** — append cycle summary (format from templates.md)
7. **STATE.md** — rewrite with current state (max 100 lines)
8. **Save intermediate data** — CSVs, metrics JSON, figures, scripts → appropriate directories
9. **Log decisions** — any decisions made this cycle → decision-log.md with DEC-YYYYMMDD-NNN format

### Verification
After writing all files, verify:
- Every ACT result exists as a file on disk (not just in the context window)
- TREE-STATE.json is valid JSON and consistent with STATE.md
- No claims exist only in prose — all are in CLAIM-LEDGER.md
- No serendipity observations exist only in context — all are in SERENDIPITY.md

### Then
→ LOOP BACK TO OBSERVE

---

## Cycle Timing

Each cycle should produce exactly ONE meaningful action. If a cycle is producing multiple actions or loading many files, it's doing too much. Break it into multiple cycles.

---

## Emergency Protocols

### Context Rot Detected
If you notice you're repeating yourself or contradicting earlier work:
1. STOP immediately
2. Read PROGRESS.md from the beginning (or last 50 lines)
3. Read CLAIM-LEDGER.md
4. Read TREE-STATE.json
5. Rewrite STATE.md from scratch based on these files
6. Resume

### State File Corruption
If STATE.md is missing or corrupt:
1. Check TREE-STATE.json (structured, most reliable for tree state)
2. Check PROGRESS.md (append-only, most reliable for chronology)
3. Reconstruct STATE.md from these two sources
4. Continue from there

### Tree State Corruption
If TREE-STATE.json is missing or corrupt:
1. Check `08-tree/nodes/` directory — individual node files are the ground truth
2. Check PROGRESS.md for node creation/update entries
3. Reconstruct TREE-STATE.json from node files + PROGRESS.md
4. Verify with STATE.md
5. Re-run Gate T3 (tree health)

### Infinite Loop Detection
If cycle > 30 AND no new findings in last 5 cycles:
1. STOP
2. Force R2 comprehensive review of ALL findings
3. Check tree health — is the tree stuck in one unproductive branch?
4. Present options to user: conclude, pivot, prune and restart, or new approach
