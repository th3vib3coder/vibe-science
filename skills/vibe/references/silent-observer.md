# Silent Observer — Reference Protocol

The Observer is a read-only sub-agent that runs periodic health checks on the project state. It detects drift, desync, orphaned artifacts, and naming inconsistencies before they compound into serious problems. The Observer never modifies files — it only reports.

---

## Purpose

Research projects accumulate entropy. Files get created but never referenced. State documents drift out of sync with the tree. Design documents say one thing while execution does another. The Observer catches these problems early, when they are cheap to fix.

---

## The 4 Checks

### Check 1 — Orphaned Data Files

**What:** Scans the project data directories for files that are not referenced by any analysis script, spine entry, or state document.

**Why:** Orphaned files indicate abandoned analyses, forgotten downloads, or incomplete cleanup. They create confusion about what is current.

**Alert levels:**
- 1--3 orphaned files: **INFO** (log it)
- 4--7 orphaned files: **WARN** (flag in next OBSERVE phase)
- 8+ orphaned files: **HALT** (stop and clean up before continuing)

### Check 2 — Document Desync

**What:** Compares key fields between `STATE.md` frontmatter and its tree section. Checks that the current node, active claims, and cycle count are internally consistent and match node files on disk.

**Why:** STATE.md is the single source of truth for session state. If the frontmatter and tree section diverge (e.g., partial update during CRYSTALLIZE), the next session will start with contradictory information.

**Alert levels:**
- Minor field mismatch (e.g., cycle count off by 1): **WARN**
- Major field mismatch (e.g., different current node): **HALT**
- One file missing entirely: **HALT**

### Check 3 — Design Drift (DC0-Related)

**What:** Compares the current execution path against the research design document (RQ.md or equivalent). Checks that the data sources, methods, and analysis steps being used match what was planned.

**Why:** Design drift is natural — investigations evolve. But undocumented drift is dangerous. If execution has departed from design, the deviation must be explicitly logged with a rationale.

**Alert levels:**
- Execution uses a data source not in the design: **WARN**
- Execution uses a method not in the design: **WARN**
- Multiple undocumented deviations: **HALT**

### Check 4 — Naming Inconsistencies

**What:** Scans file names, column names in data dictionaries, claim IDs, and variable references for inconsistent naming. Detects common problems: mixed case conventions, renamed variables mid-project, claim IDs that do not match the ledger.

**Why:** Inconsistent naming causes silent errors. A column called `age` in one file and `Age` in another may or may not refer to the same thing. Claim `C-003` in the spine but `C-3` in the ledger creates broken references.

**Alert levels:**
- 1--2 inconsistencies: **INFO**
- 3--5 inconsistencies: **WARN**
- 6+ inconsistencies or any broken claim ID reference: **HALT**

---

## Alert Levels

| Level | Action | Urgency |
|-------|--------|---------|
| **INFO** | Logged to Observer report. No pipeline interruption. | Low |
| **WARN** | Flagged in the next OBSERVE phase. Agent must acknowledge. | Medium |
| **HALT** | Pipeline stops. Issue must be resolved before continuing. | High |

---

## Observer as Sub-Agent

The Observer runs as a read-only sub-agent with the following constraints:

- **Read-only:** Cannot modify any file. Can only read project state and produce a report.
- **Parallel:** Runs alongside the main agent, not blocking it (unless HALT is triggered).
- **Low resource:** Uses minimal reasoning effort. The Observer's job is pattern matching and comparison, not deep analysis.
- **Periodic:** Runs at configurable intervals (default: every OBSERVE phase of the OTAE cycle).

---

## Running the Observer

```bash
# Run all 4 checks
python scripts/observer.py --project .vibe-science/

# Run with domain-specific configuration
python scripts/observer.py --project .vibe-science/ --config domain-config.yaml

# Run a specific check only
python scripts/observer.py --project .vibe-science/ --check orphaned
python scripts/observer.py --project .vibe-science/ --check desync
python scripts/observer.py --project .vibe-science/ --check drift
python scripts/observer.py --project .vibe-science/ --check naming

# Output as JSON (for programmatic consumption)
python scripts/observer.py --project .vibe-science/ --format json
```

**Arguments:**

| Flag | Required | Description |
|------|----------|-------------|
| `--project` | Yes | Path to the `.vibe-science/` directory |
| `--config` | No | Path to domain-specific config YAML |
| `--check` | No | Run a specific check: `orphaned`, `desync`, `drift`, `naming` |
| `--format` | No | Output format: `markdown` (default) or `json` |

**Output:** A report written to `.vibe-science/observer/report-{timestamp}.md` (or `.json`).

---

## Integration with Main Agent

1. **OBSERVE phase:** At the start of each OTAE cycle's OBSERVE phase, the agent checks for the most recent Observer report. Any WARN or HALT alerts must be addressed before proceeding.
2. **Post-tool-use hook:** The Observer checks run inside the post-tool-use hook at configurable intervals (default: every 10 tool invocations). Results are surfaced as advisory feedback.
3. **Session start:** The session-start hook includes any unresolved Observer alerts in the context injection.

---

## Domain Configuration

The `domain-config.yaml` file can override Observer thresholds:

```yaml
observer:
  orphaned_warn_threshold: 4
  orphaned_halt_threshold: 8
  naming_warn_threshold: 3
  naming_halt_threshold: 6
  check_interval_tools: 10
  data_directories:
    - data/
    - raw/
    - processed/
```

---

## v6.0 HOOK-BASED OBSERVER

### Automatic Monitoring
In v6.0, observer checks run automatically via the PostToolUse hook (every ~5 tool calls). No manual invocation needed.

### Hook-Based Checks
The PostToolUse hook runs these observer checks:
1. **Stale STATE.md** — if STATE.md hasn't been updated in >10 tool calls, warn
2. **FINDINGS/JSON desync** — if FINDINGS.md numbers don't match JSON source, warn
3. **Orphaned data** — files in data/ not referenced by any analysis, warn
4. **Design-execution drift** — execution deviating from RQ.md design, warn
5. **Literature staleness** — L-1 check >20 cycles old, warn

### DB Storage
Alerts are stored in the `observer_alerts` table:
- `level`: INFO, WARN, HALT
- `message`: human-readable description
- `project_path`: which project
- `resolved`: 0 (active) or 1 (resolved)

### Session Context
Unresolved alerts are loaded by SessionStart and injected as `[ALERTS]` in the context block. This ensures the agent sees them immediately.

---

*This protocol is domain-agnostic. It monitors project health regardless of the research domain.*
