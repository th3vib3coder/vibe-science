# 04 — Flow Engine

---

## Purpose

The Flow Engine guides researchers through the research lifecycle with explicit stages, next actions, and blockers. It is the center of gravity of the entire project.

**Design rule:** The Flow Engine coordinates work. It does NOT certify truth. Only the kernel certifies truth.

Every `/flow-*` command now runs through the control plane:
- open attempt
- read/update flow-local state
- publish canonical session snapshot
- close or fail the attempt honestly

---

## Four Flows

### A. Literature Flow (`/flow-literature`)

**What it does:** Register papers, track relevance to claims, surface gaps, flag methodology conflicts.

**Subcommands:**
- `/flow-literature` — show literature status
- `/flow-literature --register` — register a new paper
- `/flow-literature --gaps` — surface literature gaps
- `/flow-literature --link` — link paper to claim

**Paper registration schema:**
```json
{
  "id": "LIT-001",
  "doi": "10.1234/example",
  "title": "Paper Title",
  "authors": ["Author A", "Author B"],
  "year": 2026,
  "relevance": "directly supports claim C-003 methodology",
  "linkedClaims": ["C-003"],
  "methodologyConflicts": [],
  "registeredAt": "2026-03-29T10:00:00Z"
}
```

**State file:** `.vibe-science-environment/flows/literature.json`
**Template:** `environment/templates/literature-flow-state.v1.json`
**Schema:** `environment/schemas/literature-flow-state.schema.json`

**Kernel interaction:** Uses CLI bridge for `literature-searches` (what has been searched already) and `claim-heads` (which claims papers relate to).

**NOT allowed:** Marking citations as VERIFIED (that's kernel-only via citation_checks table).

---

### B. Experiment Flow (`/flow-experiment`)

**What it does:** Register experiments, track parameters/seeds/outputs, surface blockers, link to claims.

**Subcommands:**
- `/flow-experiment` — list existing experiments
- `/flow-experiment --register` — create new experiment manifest
- `/flow-experiment --update` — update experiment status
- `/flow-experiment --blockers` — show blocked experiments

**Experiment manifest schema:**
```json
{
  "schemaVersion": "vibe.experiment.manifest.v1",
  "experimentId": "EXP-003",
  "title": "Batch correction ablation",
  "objective": "Measure whether removing batch correction changes sign of claim C-014",
  "status": "planned",
  "createdAt": "2026-03-28T09:45:00Z",
  "executionPolicy": {
    "timeoutSeconds": 3600,
    "unresponsiveSeconds": 300,
    "maxAttempts": 2
  },
  "latestAttemptId": null,
  "parameters": {"batchCorrection": false, "seed": 17},
  "codeRef": {"entrypoint": "scripts/run_ablation.py", "gitCommit": "abc1234"},
  "inputArtifacts": ["data/processed/matrix.h5ad"],
  "outputArtifacts": [],
  "relatedClaims": ["C-014"]
}
```

**Manifest status transitions:** `planned → active → completed | failed | blocked | obsolete`

**Attempt lifecycle:** tracked in `control/attempts.jsonl`. See doc 06.

**State file:** `.vibe-science-environment/flows/experiment.json` (index)
**Manifests:** `.vibe-science-environment/experiments/manifests/EXP-003.json`
**Template:** `environment/templates/experiment-manifest.v1.json`
**Schemas:** `environment/schemas/experiment-flow-state.schema.json`, `environment/schemas/experiment-manifest.schema.json`

**Kernel interaction:** Uses CLI bridge for `claim-heads` (validate related claims exist), `gate-checks` (surface recent failures related to this experiment), `unresolved-claims` (warn if related claims are stuck).

**NOT allowed:** Elevating experiment summaries into validated claims. That goes through the kernel's claim_events pipeline.

---

### C. Results Flow (`/flow-results`) — Phase 2-3

**What it does:** Aggregate validated findings, prepare claim summaries, generate figure catalogs.

**Output bundle format** (from claude-scholar audit pattern):
```
.vibe-science-environment/results/summaries/RUN-2026-03-29-01/
├── analysis-report.md      — key findings, caveats
├── stats-appendix.md       — full statistical details
├── figure-catalog.md       — per-figure: purpose, source, caption, interpretation
└── figures/                — generated figures
```

**Quality bar:**
- Never fabricate statistics
- Report complete statistics (not just p-values or best scores)
- Interpret every main figure
- Separate evidence from prose (this is NOT a manuscript draft)

**Kernel interaction:** Uses the shared `exportEligibility()` helper (defined in Doc 07, implemented in `environment/lib/export-eligibility.js`).

**Export-eligibility summary** (full definition in Doc 07):
A claim is eligible ONLY when: status is PROMOTED, at least one citation exists and all are VERIFIED, and profile-safety rules pass.

- export-eligible claims may appear as validated findings
- non-eligible claims may appear only as blocked/caveated items or open questions
- results packaging MUST NOT treat non-eligible claims as validated findings

**NOT allowed:** Creating new truth judgments. Results flow packages what the kernel already validated.

---

### D. Writing Handoff Flow (`/flow-writing`) — Phase 3

**What it does:** Export validated claims with evidence chains for paper writing.

**Three tiers of writing:**

| Tier | What | Kernel authority |
|------|------|-----------------|
| **Claim-backed** | Results, quantitative conclusions | MUST reference export-eligible claims only |
| **Artifact-backed** | Methods, preprocessing, protocols | MUST be grounded in experiment manifests |
| **Free** | Introduction, Discussion, hypotheses | Kernel has NO authority; researcher writes freely |

**Export-eligibility rule:** Do NOT restate it inline. Writing Flow and Results Flow MUST both call the single normative helper in `environment/lib/export-eligibility.js`.

**Safety mechanisms:**
- Every claim-to-text export carries `claim_id` for audit traceability
- Alert when exported claims later become killed/disputed
- Free writing that invents findings not traceable to claims is flagged

**NOT allowed:** Generating a full paper autonomously. Writing handoff prepares materials; the human writes the paper.

---

## Flow State Management

### Flow-Local State File: `index.json`

```json
{
  "schemaVersion": "vibe.flow.index.v1",
  "activeFlow": "experiment",
  "currentStage": "result-packaging",
  "nextActions": ["review experiment 3 outputs", "run confounder harness on C-014"],
  "blockers": ["missing negative control for experiment 4"],
  "lastCommand": "/flow-experiment",
  "updatedAt": "2026-03-28T09:30:00Z"
}
```

**Location:** `.vibe-science-environment/flows/index.json`
**Schema:** `environment/schemas/flow-index.schema.json`

This file is flow-owned working state. It is NOT the canonical operator snapshot.
Canonical resume state lives in `.vibe-science-environment/control/session.json`.

### Ownership of `nextActions` and `blockers`

`index.json` is owned by the currently invoked flow command.

That means:
- `/flow-status` may summarize state, but it does not invent a new workflow plan
- `/flow-literature` updates literature-specific next actions
- `/flow-experiment` updates experiment-specific next actions and blockers
- `/flow-results` and `/flow-writing` update export/writing next actions

The control plane then republishes the operator-facing snapshot based on this
flow-local state plus kernel and budget signals.

**Conflict rule:** If `flows/index.json` and `control/session.json` disagree
(e.g., after a crash or manual edit), the flow state in `flows/index.json` wins
because it was written by the last actual flow invocation. The control plane
rebuilds `session.json` from flow state + kernel projections on the next
`/flow-status` invocation. Manual edits to `session.json` are overwritten.

`nextActions` MUST be derived from explicit sources, not free-form assistant
intuition:
- current flow stage
- known blockers
- unresolved required artifacts
- export-safety failures
- missing experiment outputs or literature links

Rules:
- max 5 next actions
- blockers come before optional work
- each action must be concrete and executable in one session
- every flow command updates `lastCommand` and `updatedAt`

### Planning Boundary

Flow state is typed working scaffolding, not a mature autonomous planner. It stores stage, blockers, next actions, and handoff context. It does NOT silently infer long hidden plans or rewrite workflow intent.

### Resume Model

Flow resumption is **command-driven**, not hook-driven.

- `/flow-status` reads `.vibe-science-environment/control/session.json`
- if the session snapshot is missing, rebuild it from flow state + kernel projections
- The kernel SessionStart does NOT auto-load flow state in V1
- The researcher explicitly invokes `/flow-status` to see where they are

**Why not auto-load?** Context budget. Auto-injecting flow state at every SessionStart wastes tokens on sessions that aren't doing flow work.

### Bootstrap

When a flow command runs for the first time:
1. Check if `.vibe-science-environment/flows/` exists
2. Check if `.vibe-science-environment/control/` exists
3. If missing, create both from `environment/templates/`
4. Populate with initial empty state + initial session snapshot
5. Report "Flow state initialized"

### Execution Lifecycle

Every flow command follows this lifecycle:
1. open attempt in `.vibe-science-environment/control/attempts.jsonl`
2. load capability snapshot
3. read or update flow-local state
4. query kernel projections if available
5. publish canonical session snapshot
6. close attempt as `succeeded`, `blocked`, `failed`, `timeout`, or `unresponsive`

This lifecycle is executed through the shared control middleware, not re-encoded inside each markdown prompt. That keeps flow prompts thin and makes status/debugging queryable after the fact.

---

## Flow-to-Flow Handoff

When transitioning between flows (e.g., literature → experiment), produce a handoff note:

**Location:** `.vibe-science-environment/flows/handoffs/2026-03-29T15-00-00Z-literature-to-experiment.md`

```markdown
## HANDOFF: literature → experiment
### Context: Registered 8 papers, identified 3 gaps in batch correction methods
### Claims affected: C-003 (methodology gap), C-014 (new baseline needed)
### Evidence refs:
- claim_ids: C-003, C-014
- files: .vibe-science-environment/flows/literature.json
### Next: Design experiment to test batch correction impact on C-014
```

This is a workspace artifact, NOT a governance document. It exists for researcher convenience, not kernel enforcement.

However, it MUST still carry provenance markers:
- factual claims reference `claim_id`
- artifact mentions reference workspace file paths
- receiving agents verify at least one referenced `claim_id` and one file path before acting on the handoff

---

## Writing-Core Boundary (CRITICAL)

The most dangerous failure mode: **the researcher writes a "Result" that wasn't validated by the kernel.**

Prevention:
1. Writing flow ONLY shows export-eligible claims
2. Every exported claim carries `claim_id`
3. If a claim is killed after export, the writing flow surfaces a warning
4. Free writing (intro, discussion) is explicitly labeled as "not claim-backed"

**If in doubt:** The writing flow should refuse to export rather than export an invalid claim.

---

## Invariants

1. Flows coordinate work — they do NOT certify truth
2. Flow state lives in `.vibe-science-environment/`, NOT in kernel
3. Flows read kernel state via core-reader, never write to it
4. Every flow degrades honestly when kernel DB is unavailable
5. No flow auto-triggers — the researcher explicitly invokes commands
6. Comparison questions are locked BEFORE statistics are run (from claude-scholar audit)
7. Citations are verified at point of inclusion, not post-hoc (40% AI hallucination risk)
8. Flow-local state and canonical session snapshot are distinct; `/flow-status` reads the latter
