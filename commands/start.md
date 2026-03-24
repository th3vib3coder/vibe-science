---
description: Start or resume a Vibe Science research session
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, Task
model: opus
---

## Session State (auto-injected)
!`cat .vibe-science/STATE.md 2>/dev/null || echo "No active session found."`

## Pending Claims
!`grep -c "status: PENDING\|status: DISPUTED" .vibe-science/CLAIM-LEDGER.md 2>/dev/null || echo "0 claims"`

## Last Progress
!`tail -5 .vibe-science/PROGRESS.md 2>/dev/null || echo "No progress yet."`

# /start — Vibe Science v7.0 TRACE Session Initialization

> **REMEMBER: Think first, analyse second.** Before any analysis, know what exists in the literature and what gaps remain. Every analysis must answer something that has NOT been done yet. If you cannot explain in one sentence what new thing it will reveal, you are not ready to run it.

You are starting a Vibe Science research session. Follow this orientation protocol EXACTLY.

## FIRST QUESTION (asked once, before anything else)

Before checking for existing sessions, ask the user:

```
Before we begin, choose your runtime:

  [1] SOLO — Single agent. Classic Vibe Science. All roles (researcher,
      reviewer, serendipity scanner) run inside one context window.
      Lower token cost. Works everywhere.

  [2] TEAM — Agent Teams. Reviewer 2 gets its own context window.
      Serendipity Scanner runs in background. Parallel exploration.
      Higher token cost. Requires CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1.

Which one? (1 or 2)
```

Save the answer. This determines the entire session architecture.

## Step 1: Check for Existing Session

Look for `.vibe-science/STATE.md` in the current workspace.

### If it exists → RESUME

```
1. Read STATE.md (entire file)
2. Version check: STATE.md must have vibe_science_version field.
   - If < 4.0.0 → WARN: "Session created with older version."
     Offer: continue linear (v3.5 compat) or upgrade to tree mode.
   - If >= 4.0.0 → check STATE.md has tree state fields
3. Read runtime field: solo or team
   - If team → verify Agent Teams is enabled, check teammates alive
   - If team + teammates dead → offer: respawn team or continue solo
4. Read last 20 lines of PROGRESS.md
5. Read tree state from STATE.md (tree structure + current stage)
6. Read CLAIM-LEDGER.md frontmatter (counts, statuses)
7. Check: pending R2? pending gate failures? pending debug nodes?
8. Resume from "Next Action" in STATE.md
9. Announce: "Resuming RQ-XXX, cycle N, stage S. Runtime: [SOLO|TEAM].
   Tree: X nodes (Y good). Next: [Z]."
```

### If it does NOT exist → INITIALIZE

```
1. Record runtime choice from FIRST QUESTION: SOLO or TEAM
2. If TEAM → verify Agent Teams enabled
   - If not enabled: WARN and offer to continue in SOLO
   - If enabled: spawn team (see protocols/agent-teams.md)
3. → PHASE 0: SCIENTIFIC BRAINSTORM (mandatory, not skippable)
   SOLO: all steps run in single context
   TEAM: Phase 0 steps distributed across teammates
   3a. UNDERSTAND: Clarify domain, interests, constraints with user
   3b. LANDSCAPE: Rapid literature scan, field mapping
   3c. GAPS: Blue ocean hunting (cross-domain, assumption reversal, etc.)
   3d. DATA: Reality check — does data exist? (GEO, CellxGene, etc.)
   3e. HYPOTHESES: Generate 3-5 testable, falsifiable hypotheses
   3f. TRIAGE: Score by impact × feasibility × novelty × data × serendipity
   3g. R2 REVIEW: Reviewer 2 challenges the chosen direction (BLOCKING)
       TEAM: R2 is a separate teammate — genuinely adversarial
       SOLO: R2 is simulated in same context (v3.5 behavior)
   3h. COMMIT: Lock RQ, success criteria, kill conditions
4. Gate B0 must PASS before proceeding
5. Determine tree mode: LINEAR | BRANCHING | HYBRID
6. Create folder structure (see SKILL.md)
7. Populate files using TEMPLATE-FIRST pattern:
   - For each file (STATE.md, PROGRESS.md, SERENDIPITY.md, RQ.md, ASSUMPTIONS.md):
     READ the corresponding template from `skills/vibe/assets/templates.md` first,
     then WRITE the populated version to `.vibe-science/`.
   - STATE.md MUST keep the YAML frontmatter (rq, phase, cycle, last_updated)
     because stop.js and narrative-engine.js parse it.
   - PROGRESS.md MUST follow the entry format from the template:
     `### Cycle N - HH:MM` with Action/Result/Decision/Serendipity fields.
   - Never invent file formats — downstream hooks depend on template structure.
8. Enter first OTAE cycle
```

## Step 2: Announcement

```
Vibe Science v7.0 TRACE activated for: [RESEARCH QUESTION]
Mode: [DISCOVERY | ANALYSIS | EXPERIMENT | BRAINSTORM | SERENDIPITY]
Tree: [LINEAR (literature) | BRANCHING (experiments) | HYBRID]
Runtime: [SOLO | TEAM]
I'll loop until discovery or confirmed dead end.
Constitution: Data-first. Gates block. Reviewer 2 co-pilot. Explore before exploit.
```

## Phase 0 → OTAE-Tree Transition

After Phase 0 completes and Gate B0 passes:
1. Set tree mode based on RQ type
2. Create root node in STATE.md
3. Enter Stage 1: Preliminary Investigation
4. Begin first OTAE cycle at OBSERVE phase
