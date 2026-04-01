---
description: Literature flow — register papers, track relevance, surface gaps
argument-hint: "--register [DOI] | --gaps | --status | --link [DOI] [claim-id]"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

## Flow State (auto-injected)
!`cat .vibe-science-environment/flows/literature.json 2>/dev/null || echo "No literature flow state."`

# /flow-literature — Literature Flow

> **Preview status:** This command shim is part of the outer-project incubation surface. It should use the live `plugin/scripts/core-reader-cli.js` bridge for structured kernel facts when available, and degrade honestly to workspace-first mode when that bridge is missing or fails.

Manage the literature registry: register papers, track relevance to claims, and surface gaps.

## Subcommands

Parse the user's input to determine which action to take:

- **No args / --status** — show literature flow status
- **--register [DOI or title]** — register a new paper
- **--gaps** — analyze and surface literature gaps
- **--link [DOI] [claim-id]** — link a paper to a specific claim

If no subcommand is recognized, show status.

## Bootstrap

Before any action, ensure the flow workspace exists:

1. Check if `.vibe-science-environment/flows/` directory exists. If not, create it.
2. If `.vibe-science-environment/flows/literature.json` does not exist, READ `environment/templates/literature-flow-state.v1.json` and write a populated copy with `updatedAt` set to current ISO timestamp.
3. If `.vibe-science-environment/flows/index.json` does not exist, READ `environment/templates/flow-index.v1.json` and write a populated copy.
4. Update `.vibe-science-environment/flows/index.json`:
   - Set `activeFlow` to `"literature"`
   - Set `lastCommand` to `"/flow-literature"`
   - Set `updatedAt` to current ISO timestamp
   - Preserve existing `nextActions` and `blockers`

## Structured Kernel Mode Detection

Check whether `plugin/scripts/core-reader-cli.js` exists.

- If it exists: structured kernel projections are attemptable.
- If it does not exist: continue in workspace-first mode and mark DB-backed kernel facts as unavailable rather than failing.
- Important: if any CLI invocation exits non-zero or returns `ok: false`, treat the structured bridge as unavailable for the remainder of this command and continue in workspace-first mode.

## Action: Status

1. Read `.vibe-science-environment/flows/literature.json` with the Read tool.
2. If the structured kernel bridge exists, get kernel search history via CLI bridge:
   ```bash
   node plugin/scripts/core-reader-cli.js literature-searches --project . --limit 10
   ```
   If unavailable, note that kernel search history is not accessible.
3. Report: total papers registered, papers linked to claims, papers not yet linked, identified gaps, recent kernel searches.

## Action: Register

1. Read current `literature.json`.
2. Check if paper is already registered (match by DOI or normalized title).
3. Add a new entry to `papers` array:
   ```json
   {
     "id": "LIT-[NNN]",
     "doi": "[DOI or null]",
     "title": "[title]",
     "authors": "[first author et al.]",
     "year": "[year]",
     "relevance": "[user-provided or ask]",
     "linkedClaims": [],
     "methodologyConflicts": [],
     "registeredAt": "[now ISO]"
   }
   ```
4. Write updated `literature.json`.
5. Update `index.json` with `lastCommand` and `updatedAt`.
6. Confirm registration with paper ID.
7. Re-read `literature.json` and verify it is still valid JSON before finishing.

## Action: Gaps

1. Read `literature.json` for registered papers.
2. Read `.vibe-science/CLAIM-LEDGER.md` with the Read tool to find active claims.
3. If the structured kernel bridge exists, get kernel claim heads via CLI bridge:
   ```bash
   node plugin/scripts/core-reader-cli.js claim-heads --project .
   ```
4. Cross-reference: if claim heads are available, use them as the authoritative active-claim surface; otherwise treat CLAIM-LEDGER-based gap analysis as best-effort workspace guidance only.
5. Identify:
   - Claims with no linked papers
   - Claims with papers but no methodology validation
   - Research directions with sparse coverage
   - Methodology conflicts across linked papers
6. Write identified gaps to the `gaps` array in `literature.json`.
7. Report gaps to the user with suggested next searches.

## Action: Link

1. Read `literature.json`.
2. Find the paper by DOI or LIT-ID.
3. Verify the claim ID exists in the kernel:
   - prefer the CLI bridge if it exists
   - otherwise fall back to CLAIM-LEDGER.md as a coarse workspace check and mark the verification as best-effort
4. Add the claim ID to the paper's `linkedClaims` array.
5. Write updated `literature.json`.
6. Confirm the link.
7. Re-read `literature.json` and verify it is still valid JSON before finishing.

## Rules

- Two-substrate rule: use Read for workspace files (literature.json, CLAIM-LEDGER.md), use CLI bridge for structured kernel projections (search history, claim heads).
- Papers are registered in the flow workspace, NOT in the kernel. The kernel is read-only from this flow's perspective.
- Do not fabricate paper metadata. If the user provides only a DOI, ask for title/authors or note them as unknown.
- Gap analysis is advisory. It surfaces questions, it does not certify or promote claims.
- Keep `literature.json` under reasonable size. If it grows past 50 papers, suggest archiving older entries.
- After any write to `literature.json` or `index.json`, re-read the file and ensure it remains valid JSON. Prompt-driven state files must fail loud on malformed writes.
- Use the template files under `environment/templates/` as the canonical shape for outer-project JSON state. Do not treat inline command prose as the only schema authority.
