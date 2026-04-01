---
description: Experiment flow — register experiments, track outputs, surface blockers
argument-hint: "--register [name] | --list | --update [EXP-id] | --blockers"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

## Flow State (auto-injected)
!`cat .vibe-science-environment/flows/experiment.json 2>/dev/null || echo "No experiment flow state."`

# /flow-experiment — Experiment Flow

> **Preview status:** This command shim is part of the outer-project incubation surface. It should use the live `plugin/scripts/core-reader-cli.js` bridge for structured kernel facts when available, and degrade honestly to workspace-first mode when that bridge is missing or fails.

Manage the experiment registry: register experiments with manifests, track outputs, list status, and surface blockers.

## Subcommands

Parse the user's input to determine which action to take:

- **No args / --list** — list all registered experiments with status
- **--register [name]** — register a new experiment with a manifest
- **--update [EXP-id]** — update experiment status or outputs
- **--blockers** — surface all blocking dependencies

If no subcommand is recognized, show the list.

## Bootstrap

Before any action, ensure the flow workspace exists:

1. Check if `.vibe-science-environment/flows/` and `.vibe-science-environment/experiments/manifests/` directories exist. If not, create them.
2. If `.vibe-science-environment/flows/experiment.json` does not exist, READ `environment/templates/experiment-flow-state.v1.json` and write a populated copy with `updatedAt` set to current ISO timestamp.
3. If `.vibe-science-environment/flows/index.json` does not exist, READ `environment/templates/flow-index.v1.json` and write a populated copy.
4. Update `.vibe-science-environment/flows/index.json`:
   - Set `activeFlow` to `"experiment"`
   - Set `lastCommand` to `"/flow-experiment"`
   - Set `updatedAt` to current ISO timestamp
   - Preserve existing `nextActions` and `blockers`

## Structured Kernel Mode Detection

Check whether `plugin/scripts/core-reader-cli.js` exists.

- If it exists: structured kernel projections are attemptable.
- If it does not exist: continue in workspace-first mode and mark DB-backed kernel facts as unavailable rather than failing.
- Important: if any CLI invocation exits non-zero or returns `ok: false`, treat the structured bridge as unavailable for the remainder of this command and continue in workspace-first mode.

## Action: List

1. Read `.vibe-science-environment/flows/experiment.json` with the Read tool.
2. If the structured kernel bridge exists, get kernel claim heads to cross-reference related claims:
   ```bash
   node plugin/scripts/core-reader-cli.js claim-heads --project .
   ```
   If unavailable, skip claim cross-reference.
3. For each experiment, report: ID, title, status, related claims, output artifacts.
4. Summary: total experiments, completed, in-progress, blocked.

## Action: Register

1. Read current `experiment.json`. Assign next ID: `EXP-[NNN]` (increment from highest).
2. Collect from user: **title** (required), **objective** (required — what question does this answer?), **parameters** (seeds, thresholds), **codeRef** (entrypoint + git commit), **inputArtifacts**, **relatedClaims**.
3. READ `environment/templates/experiment-manifest.v1.json`, then create a populated manifest at `.vibe-science-environment/experiments/manifests/[EXP-id].json`. Set `status` to `"planned"` and fill all fields from user input, defaulting missing optional fields to `null` or `[]`.
4. Add summary entry `{ id, title, status, createdAt }` to `experiment.json` experiments array.
5. Update `index.json`: set `lastCommand`, `updatedAt`, add experiment to `nextActions`.
6. Confirm registration with experiment ID and manifest path.
7. Re-read the manifest, `experiment.json`, and `index.json` to ensure all edited JSON still parses.

## Action: Update

1. Read manifest from `.vibe-science-environment/experiments/manifests/[EXP-id].json`. Error if not found.
2. Accept updates to: **status** (`planned`|`running`|`completed`|`failed`|`blocked`), **outputArtifacts**, **blockers**, **notes**.
3. Write updated manifest and sync the summary entry in `experiment.json`.
4. If status changed to `blocked`, add to `index.json` blockers. If `completed`, move from nextActions to "review [EXP-id] results".
5. Re-read the manifest, `experiment.json`, and `index.json` to ensure all edited JSON still parses.

## Action: Blockers

1. Read `experiment.json` for all experiments.
2. Read manifests of experiments with status `blocked` or `planned`.
3. If the structured kernel bridge exists, get kernel gate checks to find gate-related blockers:
   ```bash
   node plugin/scripts/core-reader-cli.js gate-checks --project . --statuses '["FAIL"]'
   ```
   If unavailable, skip kernel gate cross-reference.
4. If the structured kernel bridge exists, get unresolved claims:
   ```bash
   node plugin/scripts/core-reader-cli.js unresolved-claims --project .
   ```
5. Compile blocker report: experiments marked `blocked` (with reasons), dependency chains (inputArtifacts referencing incomplete experiment outputs), and when available, unresolved-review or gate-failure facts from the kernel.
6. Report blockers with suggested remediation. Update `index.json` blockers array.

## Rules

- Two-substrate rule: use Read for workspace files (experiment.json, manifests), use CLI bridge for structured kernel projections (claim heads, gate checks, unresolved claims).
- Manifests are registered in the flow workspace, NOT in the kernel. The kernel is read-only.
- Every experiment MUST have an objective. Reject registration without one.
- Status transitions: `planned` -> `running` -> `completed` | `failed` | `blocked`. The `blocked` status can be set from any active state.
- Manifests are the source of truth for experiment details. The `experiment.json` summary array is an index for quick listing.
- Do not declare experiment conclusions valid. That is the kernel's job through claim review.
- Include random seeds and version info in parameters when the user provides them.
- After any write to a manifest or flow-state JSON file, re-read it and ensure it remains valid JSON. Prompt-driven registries must not silently accumulate malformed state.
- Use the template files under `environment/templates/` as the canonical shape for outer-project JSON state. Do not rely on prose blueprint paragraphs as the only schema definition.
