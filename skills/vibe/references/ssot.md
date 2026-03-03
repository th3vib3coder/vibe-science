# Single Source of Truth (SSOT) — Reference Protocol

The SSOT principle ensures that every number in a human-readable document traces back to exactly one structured source. JSON is the canonical source of all quantitative results. Markdown documents are generated from JSON, never written freehand with numbers.

---

## The Principle

**JSON is the only source of numbers.**

When a finding says "accuracy = 0.847", that number must exist in a JSON file. The markdown is a presentation layer; the JSON is the truth. If the two disagree, the JSON wins and the markdown is wrong.

This eliminates:
- Transcription errors (copying numbers from output to prose)
- Version drift (updating JSON but forgetting to update prose)
- Fabrication (numbers that appear in prose but have no computed source)

---

## Auto-Generation Pattern

The recommended workflow is:

1. **Compute** — Run analysis, save all results to structured JSON.
2. **Generate** — Use a template or script to produce markdown from the JSON.
3. **Review** — Read the generated markdown for narrative quality.
4. **Edit prose only** — Adjust wording, add context, improve flow. Never change numbers.

If you must add a number manually (e.g., from an external source), add it to the JSON first, then reference it.

```
[Structured JSON] --generate--> [Markdown Document]
                                      |
                                 (prose edits only,
                                  numbers are read-only)
```

---

## Sync Check Protocol

The sync check extracts every number from the markdown document and verifies that each one exists in the JSON source.

### What Counts as a "Number"

The sync check identifies and extracts these formats:

| Format | Example | Extracted As |
|--------|---------|-------------|
| Integer | `1500` | `1500` |
| Decimal | `0.847` | `0.847` |
| Percentage | `84.7%` | `0.847` (converted) |
| Scientific notation | `3.2e-5` | `0.000032` |
| Negative | `-0.15` | `-0.15` |

The following are **excluded** from sync checks:
- Dates and timestamps (e.g., `2026-01-15`)
- Version numbers (e.g., `v5.5`)
- Section/figure numbers (e.g., `Table 3`, `Figure 2`)
- Page numbers and line references
- Numbers inside code blocks (these are code, not claims)

### Matching Rules

A number in the markdown is considered "matched" if:
- It exists in the JSON within the specified tolerance (default: 0.001)
- OR it is a derived value (sum, ratio, percentage) that can be recomputed from JSON values

Numbers that cannot be matched are reported as **UNMATCHED** and fail the gate.

---

## Running the Sync Check

```bash
# Basic sync check
python scripts/sync_check.py --json results.json --md FINDINGS.md

# With custom tolerance
python scripts/sync_check.py --json results.json --md FINDINGS.md --tolerance 0.01

# Check multiple JSON sources
python scripts/sync_check.py --json results.json --json calibration.json --md FINDINGS.md

# Verbose output (shows all matched numbers)
python scripts/sync_check.py --json results.json --md FINDINGS.md --verbose
```

**Arguments:**

| Flag | Required | Description |
|------|----------|-------------|
| `--json` | Yes | Path to JSON source file(s). Can be specified multiple times. |
| `--md` | Yes | Path to the markdown document to check |
| `--tolerance` | No | Numeric tolerance for matching (default: 0.001) |
| `--verbose` | No | Show all matches, not just failures |

---

## Mismatch Report Format

When mismatches are found, the script produces a report:

```
SSOT SYNC CHECK — FAILED

Source:  results.json (last modified: 2026-01-15T14:00:00Z)
Target:  FINDINGS.md  (last modified: 2026-01-15T15:30:00Z)

UNMATCHED NUMBERS (3):
  Line 12: "accuracy of 0.891" — 0.891 not found in JSON (closest: 0.847)
  Line 28: "p = 0.003" — 0.003 not found in JSON
  Line 45: "N = 2500" — 2500 not found in JSON (closest: 2487)

MATCHED: 14/17 numbers verified
```

---

## Error Handling

- **JSON parse error** — If the JSON file is malformed, the check fails with a clear error. Fix the JSON first.
- **Empty markdown** — If the markdown contains no extractable numbers, the check passes trivially (nothing to verify). This is logged as a WARNING.
- **Multiple JSON sources** — Numbers are matched against the union of all provided JSON files. A number need only appear in one source.
- **Tolerance edge cases** — If a number matches within tolerance in one source but exactly in another, the exact match is preferred.

---

## Integration

- **DQ4** gate calls the sync check as its first step. DQ4 cannot pass if SSOT fails.
- The **Observer** monitors modification timestamps. If markdown is newer than JSON, it flags a WARN (possible manual edit of numbers).
- Sync check results are logged to the **Research Spine** automatically.

---

*This protocol is domain-agnostic. It applies to any project where quantitative results are reported in documents.*
