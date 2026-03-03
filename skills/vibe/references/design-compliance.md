# Design Compliance (DC0 Gate) — Reference Protocol

Gate DC0 ensures that execution stays aligned with the research design. When deviations occur (and they will), DC0 requires that they are documented, justified, and logged — not silently ignored.

---

## Purpose

Research investigations evolve. Initial designs are hypotheses about what will work; reality forces changes. This is expected and healthy. What is NOT acceptable is undocumented drift — when execution quietly departs from the plan without anyone noticing or recording why.

Undocumented drift causes:
- Inability to reproduce the investigation (the design says X, but Y was actually done)
- Contradictions between reports and actual methodology
- Loss of rationale (nobody remembers why the plan changed)
- Observer alerts and wasted time diagnosing phantom inconsistencies

---

## When to Run

**Trigger:** At every stage transition and whenever execution deviates from design.

Specifically:
- At the transition between OTAE phases (OBSERVE, THINK, ACT, EXAMINE)
- When switching to a new branch in the investigation tree
- When the researcher uses a data source not mentioned in the design
- When the researcher applies a method not mentioned in the design
- When the Observer flags design drift (Check 3)
- At any point where the researcher thinks "this is different from what I planned"

---

## What to Check

DC0 compares the current execution state against the research design document (typically `RQ.md` or the investigation plan). The following aspects are verified:

### 1. Actions Match Design

Compare the actions taken (from SPINE.md) against the planned methodology in the design document. Are the steps being executed the ones that were planned?

- **Pass:** Actions align with design, or deviations are documented.
- **Fail:** Actions taken that have no basis in the design and no deviation record.

### 2. Data Sources Used

Compare the data sources actually loaded and used (from SPINE.md and data-dictionary.md) against those specified in the design.

- **Pass:** All data sources match the design, or additions are documented.
- **Fail:** Data sources used that are not in the design and not documented as deviations.

### 3. Methods Match

Compare the analytical methods applied (statistical tests, models, preprocessing steps) against those specified in the design.

- **Pass:** Methods match, or substitutions are documented with rationale.
- **Fail:** Methods used that differ from the design without documentation.

### 4. Deviations Documented

If any of the above checks find mismatches, verify that each mismatch has a corresponding deviation record in the deviation log.

- **Pass:** Every mismatch has a deviation record.
- **Fail:** Any mismatch without a deviation record.

---

## Deviation Documentation Format

When execution departs from the design, log it immediately. Each deviation record contains:

```markdown
### Deviation DEV-{NNN}

- **Date:** {ISO 8601 timestamp}
- **Design says:** {What was planned}
- **Execution did:** {What was actually done}
- **Reason:** {Why the change was necessary}
- **Impact:** {How this affects downstream analysis or conclusions}
- **Decision by:** {Who approved the change: user, researcher, or R2}
- **Logged in:** {SPINE.md entry reference}
```

Deviations are appended to `.vibe-science/DEVIATIONS.md`.

---

## Running the Gate

```bash
# Run DC0 check
python scripts/dc0_gate.py --design RQ.md --spine SPINE.md --deviations DEVIATIONS.md

# Run with data dictionary cross-check
python scripts/dc0_gate.py --design RQ.md --spine SPINE.md --deviations DEVIATIONS.md \
  --dict data-dictionary.md

# Quiet mode (only report failures)
python scripts/dc0_gate.py --design RQ.md --spine SPINE.md --deviations DEVIATIONS.md --quiet
```

**Arguments:**

| Flag | Required | Description |
|------|----------|-------------|
| `--design` | Yes | Path to the research design document (RQ.md) |
| `--spine` | Yes | Path to SPINE.md (execution history) |
| `--deviations` | Yes | Path to DEVIATIONS.md (deviation log) |
| `--dict` | No | Path to data-dictionary.md for data source cross-check |
| `--quiet` | No | Suppress passing checks, only show failures |

**Output:** A compliance report written to `.vibe-science/gates/DC0-{timestamp}.json`.

---

## Integration with Observer

The Observer's Check 3 (Design Drift) performs a lightweight version of DC0 continuously. When the Observer detects drift:

1. **WARN level:** The agent is notified at the next OBSERVE phase. The agent should run a full DC0 check and document any deviations.
2. **HALT level:** Multiple undocumented deviations detected. Pipeline stops. The agent must run DC0, document all deviations, and get user approval before continuing.

DC0 and the Observer are complementary:
- The Observer detects drift continuously (lightweight, heuristic-based).
- DC0 provides the detailed compliance check (thorough, document-based).

---

## Acceptable vs. Unacceptable Deviations

**Acceptable (document and continue):**
- Substituting a method that was unavailable or inappropriate for the data
- Adding a data source that strengthens the analysis
- Skipping a planned step that became unnecessary due to earlier results
- Changing preprocessing parameters based on data inspection

**Unacceptable (requires user approval):**
- Changing the research question
- Dropping a major analysis component
- Switching to a fundamentally different methodology
- Ignoring R2 demands

The researcher can document acceptable deviations independently. Unacceptable deviations require explicit user approval before proceeding.

---

*This protocol is domain-agnostic. It applies to any structured investigation with a design document.*
