# 05 — Memory Layer

---

## Purpose

Maintain human-readable project memory that researchers can open in any text editor. This is a **mirror and synthesis layer**, NOT a truth layer. If memory and kernel disagree, the kernel wins. Always.

---

## The Four Mirror Rules

### Rule 1: Mirror, Do Not Compete
Runtime database is the authoritative source. Markdown mirrors reflect it. If they drift, the mirror is wrong, not the kernel.

### Rule 2: No Silent Truth Drift
Memory files MUST NOT silently rewrite claim status, citation verification, gate outcomes, or invent certainty. If a mirror says "claim C-003 is robust" but the kernel says it's disputed, the mirror is lying.

### Rule 3: Provenance Preserved
Every mirrored fact carries its source: claim_id, citation_id, session_id, sync timestamp. No anonymous facts.

### Rule 4: Notes Synthesize, Do Not Certify
Memory notes may summarize findings and connect themes. They may NOT declare claims validated, evidence sufficient, or citations verified on behalf of the kernel.

---

## Memory Surfaces

```
.vibe-science-environment/memory/
├── mirrors/
│   ├── project-overview.md   — "where am I" summary
│   ├── decision-log.md       — mirrored workflow decisions from control plane
│   ├── papers/               — one note per registered paper
│   ├── experiments/          — experiment summaries (mirrored from manifests)
│   └── results/              — stable findings (mirrored from claim heads)
├── sync-state.json           — freshness manifest for mirrors
├── index/
│   └── marks.jsonl           — session-scoped tags for retrieval/prioritization
└── notes/
    ├── writing/              — conventions, phrasing, reviewer patterns
    ├── daily/                — chronological work logs
    └── meetings/             — advisor meeting notes and prep
```

---

## Sync Model

### How Sync Works

Memory sync is **explicit and command-driven**. Never kernel-hook-driven in V1.

```bash
/sync-memory              # explicit researcher command
```

What happens:
1. Reads kernel projections via `core-reader-cli.js`
2. Reads experiment manifests from `.vibe-science-environment/experiments/`
3. Reads control-plane artifacts from `.vibe-science-environment/control/`
4. Writes/updates machine-owned markdown files in `.vibe-science-environment/memory/mirrors/`
5. Stamps every file with sync timestamp

**Build surfaces:**
- command shim: `commands/sync-memory.md`
- implementation helper: `environment/memory/sync.js`
- state file: `.vibe-science-environment/memory/sync-state.json`

### Sync Timestamp Contract

Every mirror file carries:
```markdown
<!-- synced: 2026-03-29T10:00:00Z -->
```

If sync timestamp is >24 hours old, the flow-status command shows:
```
STALE — run /sync-memory to refresh
```

### Manual Edit Conflict

If the researcher manually edits a mirror file (e.g., adds notes to `project-overview.md`) and then runs `/sync-memory`:
- Sync **OVERWRITES** the file completely from kernel projections
- Manual edits are LOST (mirrors are projections, not user-authored documents)
- If the researcher wants to preserve notes, they go in `daily/` or in separate files, NOT in mirrors

**Rule:** Mirror files are machine-written. Do not edit them manually. Put your notes elsewhere.

Sync MUST NEVER write into:
- `.vibe-science-environment/memory/notes/writing/`
- `.vibe-science-environment/memory/notes/daily/`
- `.vibe-science-environment/memory/notes/meetings/`

Those are human-owned note zones.

### Sync Failure

If sync fails partway:
- Leave the partial file (better than no file)
- Log warning to console
- NEVER corrupt kernel state
- Next sync overwrites cleanly

### Canonical Resume Surface

Canonical "where am I" state lives in:
`.vibe-science-environment/control/session.json`

`project-overview.md` MAY include a "Where You Left Off" section, but it is only a
snapshot taken at the last memory sync.

If `memory/sync-state.json` says the mirror is stale, any resume content inside
markdown mirrors is non-authoritative and must be labeled as such.

If flow-local state and control-plane session snapshot disagree, the control
plane snapshot wins for operator-facing resume.

### Provenance Marker Format

Every mirrored fact must carry explicit provenance markers.

Markdown convention:
```markdown
- C-014 — PROMOTED (0.91) [claim:C-014] [session:S-003] [synced:2026-03-29T10:00:00Z]
```

Minimum markers:
- `claim:` when claim-derived
- `citation:` when citation-derived
- `session:` when session-derived
- `synced:` always

---

## Project Overview Mirror

The most important memory surface. Solves Story 1 ("I don't know where I left off").

**Contents:**
```markdown
# Project Overview
<!-- synced: 2026-03-29T10:00:00Z -->

## Active Claims
- C-003: "Batch correction reverses DE sign" — CREATED (0.72) — pending R2 [claim:C-003] [session:S-004] [synced:2026-03-29T10:00:00Z]
- C-014: "Cell-type composition confounds bulk analysis" — PROMOTED (0.91) [claim:C-014] [session:S-003] [synced:2026-03-29T10:00:00Z]

## Pending Experiments
- EXP-003: Batch correction ablation — status: running
- EXP-004: Negative control — status: blocked (missing reagent data)

## Recent R2 Feedback
- C-003: R2 demanded additional matching on cell-type proportions [claim:C-003] [session:S-004] [synced:2026-03-29T10:00:00Z]
- C-007: KILLED — sign reversed after propensity matching [claim:C-007] [session:S-002] [synced:2026-03-29T10:00:00Z]

## Blockers
- EXP-004 blocked on missing negative control dataset
- C-003 pending R2 review (3 sessions overdue)

## Where You Left Off (snapshot at last sync)
Last session: 2026-03-28, flow: experiment, stage: result-packaging
Next actions: review EXP-003 outputs, run confounder harness on C-014
```

Use kernel-derived status names in mirrors (`CREATED`, `R2_REVIEWED`, `PROMOTED`, `KILLED`, `DISPUTED`), not paraphrases like "ROBUST" or "PROVISIONAL", unless explicitly labeled as human commentary.

---

## Daily Notes Warning

Daily notes are **ephemeral work logs**, not evidence surfaces.

A finding in a daily note is NOT a validated claim. A daily note that says "found interesting pattern in gene X" does NOT mean gene X is a claim. It means the researcher noted something that might become a claim after going through the full pipeline.

**Daily notes MUST NEVER be cited as evidence in CLAIM-LEDGER or writing exports.**

---

## Writing Memory

A special memory surface for capturing writing conventions:
- Preferred phrasing patterns per venue
- Reviewer response templates
- Section structure preferences
- Citation style notes

This is a **writing aid**, not a truth source. It helps the researcher write consistently, not decide what's true.

---

## Decision Log Mirror

The control plane owns append-only workflow decisions in:

`.vibe-science-environment/control/decisions.jsonl`

Memory mirrors them into:

`.vibe-science-environment/memory/mirrors/decision-log.md`

This restores a lost but important surface from the earlier broader-system work:
- why a flow was reset
- why a blocker was escalated
- why an export was deferred
- why a budget stop was overridden

Decision mirrors are convenience views. `decisions.jsonl` remains the source.

---

## Scoped Marks

Marks are lightweight retrieval hints, not truth claims.

Stored in:
`.vibe-science-environment/memory/index/marks.jsonl`

Example:
```json
{"targetType": "claim", "targetId": "C-014", "mark": "writing_ready"}
{"targetType": "experiment", "targetId": "EXP-003", "mark": "follow_up"}
{"targetType": "paper", "targetId": "LIT-008", "mark": "method_conflict"}
```

Use cases:
- prioritize what `/flow-status` surfaces first
- filter memory sync output for current work
- help future retrieval without inventing a second truth layer

---

## Tool Independence

Memory is filesystem-first. No external tools required.

- Plain markdown files
- Readable in any editor (VS Code, Obsidian, vim, anything)
- No Obsidian MCP, no Zotero API, no database connection needed
- If Obsidian is used later (Phase 4 connector), it's an overlay, not a requirement

---

## What's Safe Early (Phase 2)

- Project overview mirror (synced from kernel projections)
- Experiment registry mirror (synced from manifests)
- Results summary mirror (synced from claim heads)
- Daily work log exporter
- Paper note inventory

## What's Unsafe Early

- Bidirectional truth sync (memory → kernel)
- Note-driven claim mutation
- Note-driven gate changes
- Autonomous summary writing that overwrites canonical artifacts

---

## Invariants

1. Memory is mirror, never truth
2. Sync is command-driven, never hook-driven in V1
3. Every mirror carries sync timestamp
4. Stale mirrors are flagged, not silently trusted
5. Daily notes are ephemeral, never evidence
6. No external tool required — plain markdown
7. Writing memory aids writing, never validates findings
8. Canonical resume state comes from control plane, not markdown mirrors
9. Marks guide retrieval and prioritization, never validate truth
