# Research Spine — Reference Protocol

The Research Spine is an append-only log of every significant action taken during an investigation. It serves as a tamper-evident audit trail, enables semantic recall across sessions, and provides the raw material for progress summaries.

---

## Purpose

The context window is a buffer that gets erased (LAW 10). The spine ensures that no action, decision, or result is lost between sessions. A new agent with access to the spine can reconstruct the full history of the investigation without relying on chat history.

---

## Spine Entry Format

Each entry is a structured record with the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO 8601 | Yes | When the action occurred |
| `action_type` | Enum | Yes | Category of action (see below) |
| `action` | String | Yes | Human-readable description of what was done |
| `inputs` | List[String] | Yes | Files or data consumed |
| `outputs` | List[String] | Yes | Files or artifacts produced |
| `gate_status` | String | No | Gate result if a gate was run (PASS / FAIL / SKIP) |
| `errors` | String | No | Any errors encountered |
| `next_action` | String | Yes | What should happen next |

---

## Action Types

| Action Type | When to Use |
|-------------|-------------|
| `INIT` | Project initialization, RQ definition |
| `DATA_LOAD` | Loading or downloading a dataset |
| `EXTRACT` | Feature extraction from raw data |
| `MODEL_TRAIN` | Training a model or running a statistical test |
| `CALIBRATE` | Calibrating predictions, adjusting thresholds |
| `FINDING` | Formulating a finding for the claim ledger |
| `REVIEW` | R2 review pass (inline or forced) |
| `BUG_FIX` | Fixing a bug in code or data processing |
| `DESIGN_CHANGE` | Changing the research design or methodology |
| `GATE_CHECK` | Running any quality gate (DQ1--DQ4, DD0, DC0, L-1) |
| `LITERATURE_SEARCH` | Searching literature, databases, or prior art |
| `DATASET_DOWNLOAD` | Downloading a new dataset from a repository |

---

## Auto-Append Rules

Spine entries are **mandatory** at the following points:

1. **Every CRYSTALLIZE phase** — The OTAE cycle's CRYSTALLIZE phase must produce at least one spine entry summarizing what was done and what was learned.
2. **Every gate check** — Pass or fail, the gate result is logged.
3. **Every R2 review** — The review outcome and any demands are logged.
4. **Every data load or download** — New data entering the project is logged with source and size.
5. **Every finding formulation** — Before a finding enters the CLAIM-LEDGER.

Entries are also recommended (but not mandatory) for intermediate steps, debugging sessions, and design discussions.

---

## Integration with CRYSTALLIZE

The OTAE cycle's CRYSTALLIZE phase is the primary trigger for spine entries. At CRYSTALLIZE, the agent must:

1. Summarize the cycle's work into one or more spine entries.
2. Write the entries to `SPINE.md`.
3. Update `STATE.md` to reflect the new state.

If CRYSTALLIZE completes without a spine entry, the Observer flags it as a WARN-level alert.

---

## Running the Script

```bash
# Add a single entry
python scripts/spine_entry.py \
  --spine SPINE.md \
  --type DATA_LOAD \
  --action "Loaded dataset from repository X, 15000 samples, 42 features" \
  --inputs "raw/dataset_v2.csv" \
  --outputs "processed/features.json" \
  --next "Run DQ1 on extracted features"

# Add an entry with gate status
python scripts/spine_entry.py \
  --spine SPINE.md \
  --type GATE_CHECK \
  --action "Ran DQ1 on features.json" \
  --inputs "processed/features.json" \
  --outputs "gates/DQ1-20260115.json" \
  --gate PASS \
  --next "Proceed to model training"
```

**Arguments:**

| Flag | Required | Description |
|------|----------|-------------|
| `--spine` | Yes | Path to SPINE.md |
| `--type` | Yes | Action type (from the enum above) |
| `--action` | Yes | Description of the action |
| `--inputs` | No | Comma-separated list of input files |
| `--outputs` | No | Comma-separated list of output files |
| `--gate` | No | Gate result: PASS, FAIL, or SKIP |
| `--errors` | No | Error description if any |
| `--next` | Yes | Next planned action |

---

## Example Entry (Markdown Format)

```markdown
### 2026-01-15T14:32:00Z | DATA_LOAD

- **Action:** Loaded dataset from repository X, 15000 samples, 42 features
- **Inputs:** `raw/dataset_v2.csv`
- **Outputs:** `processed/features.json`
- **Gate:** --
- **Errors:** --
- **Next:** Run DQ1 on extracted features
```

---

## Spine File Location

The spine is stored at `.vibe-science/SPINE.md` within the project. It is append-only: entries are never modified or deleted. The file grows over the life of the investigation.

---

## Semantic Recall

Spine entries are indexed for semantic search by the session-start hook. When a new session begins, the hook searches the spine for entries relevant to the current prompt, enabling continuity across sessions without requiring the full spine in context.

---

## v6.0 DB-BACKED SPINE

### Dual Storage
In v6.0, the research spine exists in two forms:
1. **SPINE.md file** — Human-readable, always available, managed by `spine_entry.py` script
2. **spine_entries DB table** — Machine-queryable, supports vector search, managed by PostToolUse hook

Both are kept in sync. The file is the source of truth; the DB enables cross-session queries and semantic recall.

### Auto-Logging
The PostToolUse hook automatically creates spine entries for every tool invocation:
- `action_type`: derived from tool name (e.g., "DATA_LOAD", "WEB_SEARCH", "FILE_WRITE")
- `input_summary`: first 200 chars of tool input
- `output_summary`: first 500 chars of tool output
- `agent_role`: detected from prompt context

### Embedding Queue
Spine entries are queued for vector embedding by an async worker. This enables semantic recall: when a new prompt arrives, the UserPromptSubmit hook searches embeddings for relevant past entries and injects them as `[MEMORY]`.

### Cross-Session Queries
The DB spine enables questions like:
- "What did we do in the last session?" (narrative summary)
- "When did we last run DQ1?" (action_type filter)
- "What were the key findings?" (COMPACT_SNAPSHOT entries)

---

*This protocol is domain-agnostic. Action types cover general research workflows and do not assume any specific field.*
