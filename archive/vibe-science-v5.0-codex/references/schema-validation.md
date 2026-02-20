# Schema Validation Protocol — Gate Artifact Enforcement

> **v5.0 IUDEX Innovation 4.** Structural enforcement via JSON Schema. If the artifact does not validate, the gate FAILS — regardless of what the prose says.

## Schema-Enforced Gates

8 of 27 gates (the highest-stakes ones) require schema-valid artifacts, plus the serendipity-seed object.

| Gate | Schema File | What It Enforces |
|------|-------------|-----------------|
| D1 (Claim Promotion) | `assets/schemas/claim-promotion.schema.json` | Evidence chain with verified DOIs, confidence with all 5 float components, confounder_harness (raw/conditioned/matched), counter_evidence_search (>=1 DB) |
| D2 (RQ Conclusion) | `assets/schemas/rq-conclusion.schema.json` | All claims referenced by ID, all VERIFIED or CONFIRMED, R2 final verdict present, tree snapshot ref |
| S4 (Ablation Exit) | `assets/schemas/stage4-exit.schema.json` | Ablation matrix (component/removed/metric_delta), multi-seed results (>=3), confounder harnesses for all promoted claims |
| S5 (Synthesis Exit) | `assets/schemas/stage5-exit.schema.json` | R2 ensemble verdict = ACCEPT, D2 reference, all claims with final status |
| L0 (Source Validity) | `assets/schemas/source-validity.schema.json` | Each source has DOI with verified=true, confidence computed (not null), registered in claim ledger |
| L2 (Review Completeness) | `assets/schemas/review-completeness.schema.json` | R2 ensemble report references (array of IDs), all fatal flaws resolved (resolution field), counter-evidence search completed |
| B0 (Brainstorm Quality) | `assets/schemas/brainstorm-quality.schema.json` | Gaps array (min 3), data availability score (float >=0.5), hypothesis with null_hypothesis, R2 verdict |
| V0 (R2 Vigilance) | `assets/schemas/vigilance-check.schema.json` | Seeded faults array with caught boolean for each, all caught = true |
| -- (Serendipity Seed) | `assets/schemas/serendipity-seed.schema.json` | Structured seed object (origin claim, signal, testable prediction, data pointers) |

---

## Validation Protocol

```
WHEN: At every gate check for the 9 schema-enforced artifacts above.
HOW:  Before evaluating gate criteria, validate artifact against JSON Schema.

1. Gate check begins.
2. Load expected artifact (YAML/JSON file in .vibe-science/).
3. Validate against corresponding JSON Schema from assets/schemas/ directory.
4. If VALID   -> proceed with normal gate evaluation.
5. If INVALID -> gate FAILS immediately.
   - Error message specifies: which field, expected type, actual value (see format below).
   - Agent must fix the artifact and re-submit.
   - Prose claims of completion are IGNORED — only the schema matters.
```

---

## Enforcement Rules

- Validation runs as a self-check step before gate evaluation. The agent switches to validator persona.
- **Schema files are READ-ONLY** — agents cannot modify schemas during a session. Schema changes require a skill version bump.

---

## Error Message Format

When validation fails, the error message MUST follow this structure:

```
SCHEMA VALIDATION FAILED — Gate [GATE_ID]
  Field:    [json.path.to.field]
  Expected: [type or constraint from schema]
  Actual:   [value found, or MISSING if absent]
  Action:   Fix artifact at [file path] and re-submit to gate.
```

---

## Honest Limitation

Schema validation ensures **structural completeness** (all required fields present, correct types, non-empty arrays) but **NOT truthfulness**. An agent can produce a perfectly valid JSON artifact with fabricated results. SVG catches _hallucinated compliance_ (claiming work was done without producing structured output) but not _fabricated compliance_ (producing structured output with invented data). The defense against fabrication is layered: SFI tests whether R2 catches errors, BFP tests whether R2 thinks independently, and R3 tests whether R2's review references real evidence. No single mechanism is sufficient; the combination is the defense.

---

## Schema File Locations

All schema files live in the `assets/schemas/` directory at the skill root:

```
vibe-science-v5.0/
  assets/
    schemas/
      claim-promotion.schema.json
      rq-conclusion.schema.json
      stage4-exit.schema.json
      stage5-exit.schema.json
      source-validity.schema.json
      review-completeness.schema.json
      brainstorm-quality.schema.json
      vigilance-check.schema.json
      serendipity-seed.schema.json
```
