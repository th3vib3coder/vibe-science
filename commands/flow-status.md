---
description: Show research environment status — where am I, what's pending, what's blocked
allowed-tools: Read, Bash, Glob, Grep
model: sonnet
---

## Flow State (auto-injected)
!`cat .vibe-science-environment/flows/index.json 2>/dev/null || echo "No flow state found."`

## Kernel State (auto-injected)
!`cat .vibe-science/STATE.md 2>/dev/null | head -30 || echo "No kernel session."`

# /flow-status — Research Environment Overview

> **Preview status:** This command shim is part of the outer-project incubation surface. It should prefer the live `plugin/scripts/core-reader-cli.js` bridge for DB-backed projections, and degrade honestly to workspace-first mode when the bridge is missing or fails.

You are rendering a status overview of the research environment. Follow this protocol EXACTLY.

## Step 0: Detect Structured Kernel Bridge

Check whether `plugin/scripts/core-reader-cli.js` exists.

- If it exists: DB-backed structured projections are attemptable.
- If it does not exist: enter **workspace-first degraded mode**. Skip CLI-backed projections and render them as `unavailable`.
- Important: if any CLI invocation exits non-zero or returns `ok: false`, treat the structured bridge as unavailable for the remainder of this command and fall back honestly.

## Step 1: Load Flow State

Read `.vibe-science-environment/flows/index.json` with the Read tool.

- If it exists: extract `activeFlow`, `currentStage`, `nextActions`, `blockers`, `lastCommand`, `updatedAt`.
- If it does not exist: report "No flow state initialized. Run /flow-literature or /flow-experiment to begin."

## Step 2: Load Kernel Overview

If the structured kernel bridge is available, run the CLI bridge to get the kernel projection:

```bash
node plugin/scripts/core-reader-cli.js overview --project .
```

Parse the JSON output. If the bridge is unavailable or returns `ok: false`, fall back to reading `.vibe-science/STATE.md` directly with the Read tool.

## Step 3: Load Unresolved Claims

If the structured kernel bridge is available, run:

```bash
node plugin/scripts/core-reader-cli.js unresolved-claims --project .
```

If unavailable, do **not** try to reconstruct stop-hook semantics from `.vibe-science/CLAIM-LEDGER.md`.
That file is useful context, but it is not the authoritative source for unresolved-claim resolution under current kernel rules.
In degraded mode, report unresolved-claim status as `unavailable without kernel DB` unless `.vibe-science/STATE.md` contains an explicit kernel-authored summary you can quote verbatim.

## Step 4: Load Observer Alerts

If the structured kernel bridge is available, run:

```bash
node plugin/scripts/core-reader-cli.js observer-alerts --project .
```

If unavailable, skip this section with a note that the kernel DB is not reachable.

## Step 5: Check Flow-Specific State

If `activeFlow` from Step 1 is `literature`, read `.vibe-science-environment/flows/literature.json`.
If `activeFlow` is `experiment`, read `.vibe-science-environment/flows/experiment.json`.

## Step 6: Render Status Report

Output a single structured report:

```
--- Research Environment Status ---

Active Flow: [flow name or "none"]
Stage:       [current stage or "—"]
Last Command: [last command + timestamp]

KERNEL OVERVIEW
  Last session:       [narrative summary or "no sessions"]
  Active claims:      [count or "unavailable"]
  Unresolved claims:  [count/list or "unavailable"]
  Unresolved alerts:  [count or "unavailable"]
  Recent gate fails:  [count or "unavailable"]

NEXT ACTIONS
  1. [action from index.json or kernel state]
  2. ...

BLOCKERS
  - [blocker from index.json]
  - [blocker from kernel: unresolved claims, gate failures, alerts]

FLOW-SPECIFIC STATE
  [literature: papers registered, gaps identified]
  [experiment: experiments registered, completed, blocked]
```

## Rules

- This command is READ-ONLY. It must not modify any files.
- Two-substrate rule: use Read for workspace files (STATE.md, flow JSON), use CLI bridge for structured kernel projections (overview, claims, alerts).
- Degrade gracefully: if the kernel DB is unavailable, still show flow state. If flow state is missing, still show kernel state. If both are missing, say so clearly.
- If a structured kernel projection is unavailable, render it as `unavailable`; do not guess it from non-authoritative files.
- Do not invent or guess data. If a projection returns empty, report it as empty.
