# Vibe Science — Eval Framework

Schema-first eval framework for validating Vibe Science eval cases and benchmark recording.
Behavioral hook/agent harnessing remains future work; today the executable path is
`schema_validation_only` plus hook-level regression coverage in `__test_e2e.mjs`
and end-to-end smoke/readiness checks.

## Quick Start

```bash
npm run eval
```

## Eval Case Format

Each eval case is a YAML file in `cases/` with this structure:

```yaml
id: T01                    # Unique identifier
name: hypothesis-testing   # Human-readable name
category: trigger          # One of: trigger, anti_trigger, golden_claim
prompt: "..."              # The user prompt to test
expected_markers:          # Terms that SHOULD appear in response (for trigger/golden_claim)
  - "OTAE"
  - "claim"
expected_absent_markers:   # Terms that should NOT appear (for anti_trigger)
  - "OTAE"
  - "R2"
description: "..."        # What this test verifies
```

## Categories

| Category | Count | Purpose |
|----------|-------|---------|
| `trigger` | 6 | Prompts where Vibe Science SHOULD activate |
| `anti_trigger` | 6 | Prompts where Vibe Science should NOT activate |
| `golden_claim` | 12 | Regression tests from CRISPR post-mortem errors |

## Directory Structure

```
evals/
├── eval-runner.mjs         # Test runner (node:test)
├── README.md               # This file
└── cases/
    ├── trigger/            # T01-T06: Should-activate cases
    ├── anti-trigger/       # A01-A06: Should-NOT-activate cases
    └── golden-claims/      # GC01-GC12: CRISPR regression tests
```

## Adding New Cases

1. Create a `.yaml` file in the appropriate `cases/` subdirectory
2. Follow the format above
3. Run `npm run eval` to validate

## Golden Claims Test Suite

The 12 golden claims encode real errors from the CRISPR-Cas9 post-mortem (v5.5 ORO blueprint):

| ID | Error Class | Law/Gate Tested |
|----|-------------|-----------------|
| GC01 | Confounded odds ratio | LAW 9 (Confounder Harness) |
| GC02 | Already-known finding | Gate L-1 (Literature Pre-Check) |
| GC03 | Biologically impossible direction | R2 Adversarial Review |
| GC04 | Noise-as-signal | R2 Stats Reviewer |
| GC05 | Non-generalizable ranking | Stage 4 Validation |
| GC06 | Missing confounder harness | LAW 9 Enforcement |
| GC07 | Premature paper-ready | Gate S5 + R2 Final |
| GC08 | Number mismatch prose/data | Gate DQ4 Sync |
| GC09 | Skipped literature search | Gate L-1 |
| GC10 | Missing serendipity seed | Salvagente Rule |
| GC11 | R2 rubber-stamping | Gates V0 + J0 |
| GC12 | Context loss | LAW 10 (Crystallize) |

## Benchmark Integration

Eval results can be recorded to the plugin database via `benchmark-reporter.js`:
- `recordBenchmark(db, result)` — persist individual eval results
- `generateReport(db, version)` — aggregate pass rates, timing, tokens
- `compareVersions(db, vA, vB)` — A/B comparison between skill versions
