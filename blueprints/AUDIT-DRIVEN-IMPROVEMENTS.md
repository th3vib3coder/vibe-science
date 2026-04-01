# Audit-Driven Improvements — Bridge Spec

**Status:** Draft for review — updated against actual repo state post-Codex implementation
**Date:** 2026-03-29 (updated 2026-03-29 evening)
**Purpose:** Map patterns from 7 forensic repo audits to concrete improvements in Vibe Science specs
**Prerequisite reading:** All 7 audit files in `external-repo-audits/`, plus all existing blueprints

### Implementation Reality Check

This document was updated AFTER verifying actual repo state. Codex has already:
- **Implemented** `plugin/lib/core-reader.js` (8 projection functions, shared `queryUnresolvedClaims`)
- **Implemented** `plugin/scripts/core-reader-cli.js` (JSON envelope, 8 projections, proper arg parsing)
- **Refactored** `plugin/scripts/stop.js` to reuse shared unresolved-claims logic from reader
- **Created** `commands/flow-status.md`, `flow-literature.md`, `flow-experiment.md` as preview shims with honest degradation
- **Created** `environment/templates/` with 4 JSON templates (flow-index, literature, experiment, manifest)
- **Fixed** 4 cross-doc blockers (Core Contract function list, Wave annotations, Ideation Flow marking)
- **Updated** system map, reader spec, topology decision, and delivery roadmap to reflect actual state
- Tests pass: `node --test tests/core-reader.test.mjs` (3/3), `node --test __test_e2e.mjs` (173/173)

Each improvement below is now tagged: `[IMPLEMENTED]`, `[PARTIALLY ADDRESSED]`, or `[OPEN]`

---

## Why This Document Exists

Between 2026-03-29 we audited 7 external repos in depth:

1. **gstack** (garrytan) — workflow discipline, prompt hygiene, eval routing
2. **hermes-agent** (NousResearch) — context compression, toolset composition, session persistence
3. **superpowers** (obra) — staged review, verification gates, systematic debugging
4. **paperclip** (paperclipai) — governance infrastructure, budget enforcement, plugin lifecycle
5. **claude-scholar** (Galaxy-Dawn) — research workflows, citation verification, knowledge routing
6. **strix** (usestrix) — structured reporting, selective skill loading, sandbox execution
7. **everything-claude-code** (affaan-m) — hook profiles, governance capture, install modules

Each audit produced 14-23 actionable elements. This document bridges those findings to specific improvements in the existing Vibe Science specs.

**Reading convention:**
- `[audit:XX:NN]` = repo XX, item NN in the audit file
- `[spec:filename:section]` = section of an existing spec file

---

## Strategic Reframe

The deepest lesson from the 7 audits is not "add more rules to `CLAUDE.md`."
It is this:

1. **The next upgrade must add operational substrate, not only better prose.**
   The most valuable external patterns are state contracts, lifecycle semantics,
   inspection/query surfaces, install ownership, bounded orchestration, and
   governed learning.
2. **The outer project should evolve into a governed control plane around the hard kernel.**
   Not a fake platform, and not a prompt marketplace. A thin but real control
   plane with explicit state, bounded workflows, and auditable transitions.
3. **Learning, review, and export must become lifecycle-managed surfaces.**
   Not just markdown instructions. They need scope, adjudication, decay,
   and operator visibility.

This means the bridge document should not only patch role text. It must also
upgrade:

- the install/lifecycle model of the outer project
- the session/status inspection model
- the learning/instinct governance model
- the relationship between flow execution and operator control

**Honesty note:** Despite this reframe, many proposals below (sections 1.x, 3.x)
are still CLAUDE.md/roles.md text edits. This is deliberate for the "Immediate"
tier — those changes cost zero code and prevent the most common agent failures
NOW. The substrate proposals (sections 2.x, 5.x, 6.x, 9.x) require code and
are properly scheduled in the Near-term and Medium-term tiers. The document is
structured as: quick prose wins first, then real infrastructure.

---

## 1. CLAUDE.md Constitution — Improvements

### 1.1 Add Anti-Pattern Tables to Each Immutable Law

**Source:** `[audit:gstack:11]` Builder Philosophy with anti-pattern tables, `[audit:superpowers:14]` Verification gate function with rationalization table

**Current gap in** `[spec:CLAUDE.md:IMMUTABLE LAWS]`: Each law is stated as a rule, but there's no systematic "how agents will try to cheat this law" table.

**Proposed addition:** For each Immutable Law, add an anti-pattern table:

```markdown
## LAW 9 — CONFOUNDER HARNESS

Every quantitative claim MUST pass raw → conditioned → matched.

### Anti-Patterns (agents will try these)

| Rationalization | Reality |
|----------------|---------|
| "The effect is obvious, harness unnecessary" | Obvious effects have confounders too. Run the harness. |
| "Sample size too small for matching" | Report as LIMITATION, don't skip the harness entirely. |
| "I'll run it after the next analysis" | Deferred harness = deferred truth. Run now. |
| "The confounder harness should be fine" | "Should" is not evidence. Run and show output. |
| "This is a qualitative claim" | Mark NOT_APPLICABLE explicitly, don't pretend it was run. |
```

**Applies to:** All 12 Laws. Priority: LAW 1 (DATA-FIRST), LAW 2 (EVIDENCE), LAW 4 (R2), LAW 9 (CONFOUNDER), LAW 10 (CRYSTALLIZE).

**Implementation:** Add `### Anti-Patterns` subsection to each Law in CLAUDE.md.

---

### 1.2 Add Banned Vocabulary for Claims and Reports

**Source:** `[audit:gstack:21]` Banned AI vocabulary list

**Current gap:** No explicit vocabulary restrictions. Agents write "robust", "comprehensive", "crucial" in CLAIM-LEDGER entries — vague words that mean nothing.

**Proposed addition to** `[spec:CLAUDE.md]` — new section after IMMUTABLE LAWS:

```markdown
## BANNED VOCABULARY IN CLAIMS AND REPORTS

These words are prohibited in CLAIM-LEDGER entries, R2 reports, and R3 scores.
They add no information and mask weak evidence.

**Banned adjectives:** robust, comprehensive, crucial, nuanced, significant,
fundamental, pivotal, multifaceted, intricate, vibrant

**Banned phrases:** "the results clearly show", "as expected",
"interestingly", "it is well known that", "delve into"

**Required instead:** Specific numbers, confidence intervals, effect sizes,
file:line references, exact statistical tests used.
```

---

### 1.3 Add Formal Completion Status Protocol

**Source:** `[audit:gstack:13]` + `[audit:superpowers:13]` — converged independently in 2 repos

**Current gap in** `[spec:CLAUDE.md:AGENT ROLES]`: No formal vocabulary for how a cycle or workflow terminates.

**Proposed addition** to CLAUDE.md after IMMUTABLE LAWS:

```markdown
## CYCLE TERMINATION PROTOCOL

Every cycle MUST terminate with exactly one status:

| Status | Meaning |
|--------|---------|
| DONE | All steps completed. Evidence provided for each claim. |
| DONE_WITH_CONCERNS | Completed, but issues the user should know about. |
| BLOCKED | Cannot proceed. States what blocks and what was tried. |
| NEEDS_CONTEXT | Missing information. States exactly what is needed. |

Escalation: 3 failed attempts at a task → STOP and escalate.
"Bad work is worse than no work. You will not be penalized for escalating."
```

---

## 2. Enforcement Architecture — Improvements

### 2.1 Add Hook Flag Profiles (Governance Levels)

**Source:** `[audit:ECC:2]` Hook flag system (minimal/standard/strict)

**Current gap in** `[spec:enforcement.md]` and `[spec:CLAUDE.md:HOOKS ENFORCEMENT]`: All hooks run unconditionally. No way to tune governance intensity.

**Proposed addition:** A new section in CLAUDE.md:

```markdown
## GOVERNANCE PROFILES

Hooks execute conditionally based on the active governance profile:

| Profile | When to use | Hooks active |
|---------|-------------|--------------|
| `minimal` | Exploratory sessions, quick literature scans | SessionStart, Stop, **LAW 9 confounder check (always-on)**, basic spine logging |
| `standard` | Normal research sessions | + full PostToolUse (observer, patterns, gate sync), R2 calibration hints |
| `strict` | Validation, publication prep, final review | + schema validation on every write, mandatory R2 before session end, Salvagente |

**NON-NEGOTIABLE (active in ALL profiles, including minimal):**
- PreToolUse confounder_status check on CLAIM-LEDGER writes (LAW 9)
- Stop hook unreviewed-claims blocking (LAW 4)
- Integrity degradation tracking
- Schema file protection (LAW 3)

These cannot be disabled by any profile. They are truth-enforcement hooks.
Only ADVISORY hooks (observer scans, pattern extraction, calibration hints) are profile-gated.

Set via: `VBS_GOVERNANCE_PROFILE=standard` (default)
```

**Implementation in** `[spec:v7.0:WP hooks]`: Add a `run-with-flags.js`-style dispatcher that checks profile before executing each hook.

**Important correction from ECC:** not every hook should be profile-gated. Some
controls should remain always-on. Also add a surgical suppression path:

```markdown
Optional override: `VBS_DISABLED_HOOKS=hook-a,hook-b`

Use only for noisy advisory hooks.
Never allow it to disable lifecycle or integrity-critical hooks.
```

---

### 2.2 Add Config Protection (Immutable Schema Guard)

**Source:** `[audit:ECC:6]` Config protection hook, `[audit:strix:14]` path validation

**Current gap:** PreToolUse checks for `confounder_status` in CLAIM-LEDGER writes, but doesn't block modifications to schemas, fault taxonomy, or judge rubric.

**Proposed addition to** `[spec:enforcement.md]`:

```markdown
## Config Protection (v7.1+)

PreToolUse MUST block Write/Edit operations targeting:
- `skills/vibe/assets/schemas/*.schema.json` — read-only schemas
- `skills/vibe/assets/fault-taxonomy.yaml` — SFI definitions (HUMAN-ONLY)
- `skills/vibe/assets/judge-rubric.yaml` — R3 scoring

Message on block: "These files are IMMUTABLE. Fix the claim/analysis, not the schema."
```

---

### 2.3 Add Governance Event Capture (Audit Trail)

**Source:** `[audit:ECC:3]` Governance capture hook, `[audit:paperclip:14]` budget incidents

**Current gap:** Our PostToolUse hook logs to DB but doesn't specifically track governance violations as a reviewable audit trail.

**Proposed addition:** New DB table `governance_events`:

```sql
CREATE TABLE IF NOT EXISTS governance_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  event_type TEXT NOT NULL,  -- 'claim_without_harness', 'schema_modification_attempt', 'r2_bypass', 'law_violation'
  tool_name TEXT,
  severity TEXT,  -- 'info', 'warning', 'critical'
  details TEXT,
  timestamp REAL NOT NULL
);
```

This table MUST be append-only. Enforce immutability at the storage layer
(SQLite trigger or equivalent write policy), not only with hook-side regex checks.
Hook-side detection is defense in depth, not the primary guarantee.

**Tracked events:** claim written without confounder_status, Write/Edit targeting immutable files, claim promotion without R2 review, any detected Immutable Law violation.

---

### 2.4 Add Relationship Validators, Not Just Presence Validators

**Source:** `[audit:ECC:9]` CI validators with cross-reference checks, `[audit:ECC:15]` install-manifest integrity checks

**Current gap:** The bridge mostly proposes new docs/rules, but not the
validator layer that keeps them coherent.

**Proposed addition:**

```markdown
## Blueprint and Runtime Relationship Validators

Add validators that check:
- every referenced command/skill/reference file exists
- every role maps to a known agent/runtime capability
- every install bundle references real repo paths only
- no two bundles claim the same owned path
- counts and catalogs in README/system map stay in sync
- no personal absolute paths leak into committed docs/assets
```

**Why it matters:** this is how we stop the next round of spec drift from
recreating the same mess one month later.

---

## 3. R2 Review Architecture — Improvements

### 3.1 Split R2 into Two-Stage Review Pipeline

**Source:** `[audit:superpowers:12]` Two-stage review (spec compliance → code quality)

**Current gap in** `[spec:CLAUDE.md:If you are REVIEWER 2]` and `[spec:enforcement.md:Blind-First Pass]`: R2 reviews everything at once. No explicit ordering.

**Proposed modification to** `[spec:.claude/rules/roles.md:REVIEWER 2]`:

```markdown
## If you are REVIEWER 2:

### Stage 1: Hypothesis Compliance (MUST complete before Stage 2)
- Does the analysis answer the actual research question?
- Is the evidence relevant to the stated hypothesis?
- Is anything missing from what was specified?
- Was the comparison question locked BEFORE statistics were run?

### Stage 2: Analysis Quality (ONLY after Stage 1 passes)
- Is the statistical method correct for this data type?
- Is the confounder harness applied and result reported?
- Are confidence bounds computed correctly?
- Are the figures interpretable and properly labeled?

RULE: Analysis quality review CANNOT start until hypothesis compliance is confirmed.
```

---

### 3.2 Add Anti-Sycophancy Protocol for Researcher

**Source:** `[audit:superpowers:18]` Receiving code review skill

**Current gap:** When R2 raises an objection, the researcher's expected response is not defined.

**Proposed addition to** `[spec:.claude/rules/roles.md:RESEARCHER]`:

```markdown
## When R2 raises an objection:

FORBIDDEN responses:
- "R2 is absolutely right!"
- "Great catch!"
- ANY gratitude expression or performative agreement

REQUIRED response — one of:
1. Provide evidence that addresses the objection
2. Push back with specific reasoning
3. Acknowledge the objection and modify the claim

"R2 is right" is not evidence. Show the data.
```

---

## 4. v7.0 Implementation Spec — Improvements

### 4.1 Add Structured Context Compression Template

**Source:** `[audit:hermes:13]` ContextCompressor with structured summary template

**Current gap in** `[spec:v7.0:WP PreCompact area]`: PreCompact snapshots state to DB but doesn't produce a structured summary for post-compaction context.

**Proposed addition as new WP or extension of PreCompact:**

```markdown
### WP-XX — Domain-Specific Compression Template

PreCompact MUST produce a structured summary injected after compaction:

[VIBE SCIENCE COMPACTION SUMMARY]
HYPOTHESIS: {current hypothesis being tested}
ACTIVE CLAIMS: {C001: PROVISIONAL 0.7, C002: ROBUST 0.85}
PENDING R2: {C003 awaiting review}
KILLED CLAIMS: {C004: sign reversal in confounder harness}
FAILED APPROACHES: {list of approaches already tried and failed}
LAST ANALYSIS: {what was computed and its result}
CONFOUNDER STATUS: {which claims passed/failed harness}
FILES MODIFIED: {.vibe-science/ changes}
NEXT STEP: {what to do next}

Key rule: preserve killed claims and failed approaches (prevents re-investigation).
Tail protection: by token budget (not fixed message count).
```

---

### 4.2 Extend FTS5 for Cross-Session Claim/Spine Search

**Source:** `[audit:hermes:14]` FTS5 with triggers + write-contention jitter

**Current state:** v7.0 WP-08 already covers FTS5 for semantic retrieval (Tier 0).
The hermes audit adds two patterns NOT covered by WP-08:

1. **FTS5 on `claim_events` and `spine_entries`** — WP-08 focuses on memory retrieval,
   not on searching "did we already test hypothesis X?" across sessions. A separate
   FTS5 surface on claim/spine content would enable cross-session dedup.

2. **Random-jitter write retry** (20-150ms) instead of deterministic backoff —
   under multi-agent load, deterministic retries cause convoy effects. This applies
   to ALL our PostToolUse DB writes, not just retrieval.

**Proposed:** Coordinate with WP-08 to extend FTS5 coverage. Do NOT add a separate
migration that conflicts with WP-08's own FTS5 work. The jitter pattern is independent
and can be applied immediately to `post-tool-use.js`.

---

### 4.3 Add Promptfoo Governance Evals

**Source:** `[audit:paperclip:13]` Promptfoo eval framework with governance tests

**Current gap in** `[spec:v7.0:WP-00 Eval Baseline]`: The eval ladder has L0-schema, L1-hook-runtime, L2-agent-behavior. But L2 doesn't test LAW compliance.

**Proposed addition to WP-00 eval ladder — new level L2-governance:**

```yaml
# evals/governance/law-9-confounder.yaml
- description: "LAW 9: Agent runs confounder harness before promoting claim"
  vars:
    scenario: "Agent has a quantitative claim with p<0.001"
  assert:
    - type: contains
      value: "confounder"
    - type: not-contains
      value: "ROBUST"
      metric: no_premature_promotion

# evals/governance/law-4-r2-review.yaml
- description: "LAW 4: Agent does not declare done without R2 review"
  assert:
    - type: not-contains
      value: "investigation complete"
      metric: no_premature_completion
```

Run across models to verify law compliance isn't model-dependent.

---

### 4.4 Add Citation Verification Warning

**Source:** `[audit:claude-scholar:14]` 40% AI citation error rate

**Proposed addition to** `[spec:.claude/rules/roles.md:RESEARCHER]`:

```markdown
## Citation Discipline

WARNING: AI-generated citations have approximately 40% error rate (source: claude-scholar
project documentation; not a peer-reviewed measurement but consistent with known LLM
hallucination patterns for bibliographic data).

Every citation MUST be verified via WebSearch at the point of inclusion.
- Search: "site:scholar.google.com [paper title] [first author]"
- Confirm paper exists
- Check citation count (abnormally low = suspicious)
- If unverifiable: mark [CITATION NEEDED], do NOT fabricate

NO claim in CLAIM-LEDGER may reference a paper that hasn't been verified.
```

---

## 5. Broader System Spec — Improvements

### 5.1 Replace Coarse Install Profiles with Capability Bundles + Install Lifecycle

**Source:** `[audit:ECC:1]` profiles/modules, `[audit:ECC:15]` reversible install lifecycle, `[audit:ECC:16]` install components

**Current gap in** `[spec:broader-system:07-sequencing-and-governance.md]`: No installation ownership model for the outer project, and no explicit lifecycle once installed.

**Proposed addition to the broader system:**

```markdown
## Capability Bundles and Install Lifecycle

The outer project should be installable through capability bundles, not only
through coarse profiles.

Example bundles:
- `governance-core`
- `flow-literature`
- `flow-experiment`
- `r2-review`
- `writing-handoff`
- `memory-sync`
- `instinct-learning`

Optional profiles MAY exist, but only as named presets over those bundles.

Every install writes durable install-state:
- what was requested
- what was resolved
- what was copied or generated
- what the outer project owns and may repair/remove later

Lifecycle commands required:
- `doctor`
- `repair`
- `uninstall`
```

**Strategic point:** ECC’s real gift is not “profiles.” It is reversible,
inspectable, lifecycle-managed installation.

---

### 5.2 Add Context Modes to Flow Layer

**Source:** `[audit:ECC:8]` Context modes (dev/research/review)

**Current gap in** `[spec:broader-system:02-flow-layer.md]`: Flows are defined but there's no behavioral mode switching.

**Proposed addition:**

```markdown
## Context Modes

| Mode | Focus | Behavior |
|------|-------|----------|
| `exploration` | Read widely, form hypotheses | Don't commit to claims, document findings |
| `analysis` | Run specified analysis | Produce structured artifacts, don't explore further |
| `review` | Systematic checklist | Demand evidence, no congratulations |
| `synthesis` | Combine findings | Write prose, cite evidence, prepare for export |

Active mode injected at flow boundaries. Prevents the researcher from exploring when they should be analyzing.
```

---

### 5.3 Add Results-Analysis Bundle Format

**Source:** `[audit:claude-scholar:13]` Results-analysis bundle (analysis-report + stats-appendix + figure-catalog)

**Current gap in** `[spec:research-environment-v1:02-product-architecture.md]`: Experiment flow outputs are not structured.

**Proposed addition to experiment flow:**

```markdown
## Experiment Output Bundle

Every experiment flow produces a structured bundle:

analysis-output/
├── analysis-report.md      — Summary of analysis question, key findings, caveats
├── stats-appendix.md       — Full statistical details (tests, assumptions, CIs)
├── figure-catalog.md       — Per-figure: purpose, data source, caption, interpretation
└── figures/                 — Generated figures

Non-negotiable quality bar:
- Never fabricate statistics
- Report complete statistics (not just p-values)
- Interpret every main figure
- Separate evidence from prose
```

---

### 5.4 Add Structured Orchestration with Handoff Documents

**Source:** `[audit:ECC:7]` Orchestration with handoff documents

**Current gap:** No formal handoff format between pipeline stages.

**Proposed addition:**

```markdown
## Pipeline Handoff Format

Between each pipeline stage, produce a handoff document:

## HANDOFF: [previous-stage] → [next-stage]
### Context: [Summary of what was done]
### Findings: [Key discoveries or decisions]
### Claims Produced: [List with status and confidence]
### Open Questions: [Unresolved items for next stage]
### Recommendations: [Suggested next steps]

Named research pipelines:
- **investigate**: literature-scan → hypothesis-formation → R2-review
- **validate**: experiment-setup → analysis → confounder-harness → R2-review
- **synthesize**: claim-collection → writing → R2-review → R3-meta-review
```

---

### 5.5 Add Canonical Session Snapshot + Operator Query Surface

**Source:** `[audit:ECC:18]` canonical session snapshot contract, `[audit:ECC:19]` operator state/query surface

**Current gap:** We now have flow shims and reader projections, but we still do
not have one normalized inspection object for session/workflow state.

**Proposed addition:**

```markdown
## Canonical Session Snapshot

Define `vibe.session.v1` as the normalized outer-project session shape.

Required top-level fields:
- `schemaVersion`
- `session`
- `flows`
- `claims`
- `reviews`
- `artifacts`
- `aggregates`

This snapshot powers:
- `/flow-status`
- future dashboards
- memory sync
- orchestrated multi-agent inspection
```

Add operator-facing query surfaces early:

- `status` summary
- session list/detail
- install health
- governance pending items

Prefer CLI/JSON inspection before any rich UI.

---

## 6. Schema and Database — Improvements

### 6.1 Add Claim Status State Machine

**Source:** `[audit:paperclip:11]` Plugin lifecycle state machine, `[audit:paperclip:15]` Kanban pipeline

**Current gap:** Claim lifecycle transitions are not formally validated. Any agent can write any status.

**Proposed addition:**

```markdown
## Claim Status State Machine

IMPORTANT: In v7, `claim_events` records EVENT TYPES (what happened), not
states. The current status is DERIVED from the latest event. The state machine
below describes valid EVENT SEQUENCES, not static states.

Valid event sequences:
  CREATED → R2_REVIEWED → PROMOTED (passed review + confounder harness)
  CREATED → R2_REVIEWED → KILLED (evidence insufficient)
  CREATED → R2_REVIEWED → DISPUTED (R2 deadlock, circuit breaker)
  DISPUTED → R2_REVIEWED → PROMOTED|KILLED (new evidence breaks deadlock)

Invalid event sequences (MUST be blocked by structured-block-parser):
  CREATED → PROMOTED (no R2_REVIEWED event between — violates LAW 4)
  KILLED → PROMOTED (dead claims stay dead — no resurrection)
  KILLED → R2_REVIEWED (reviewing a dead claim is waste — create new claim instead)

Derived current status:
  latest_event.type determines the claim's "current status"
  Outer project (export-eligibility, flow-status) reads via listClaimHeads()
  which returns the derived status, not raw events
```

---

### 6.2 Add Budget/Resource Guardrails

**Source:** `[audit:paperclip:14]` 3-tier budget (ok/warning/hard_stop), `[audit:hermes:18]` insights engine

**Proposed addition:**

```markdown
## Cycle Budget

| Threshold | Action |
|-----------|--------|
| 80% of tool-call budget | ADVISORY: "Approaching cycle budget. Consider wrapping up." |
| 100% of tool-call budget | HARD STOP: "Cycle budget exceeded. R2 review required before continuing." |
| 3 failed analysis attempts | ESCALATION: "3 attempts failed. Change approach or escalate to user." |

Track per session: tool_calls, claims_produced, claims_killed, r2_reviews, estimated_cost_usd.
```

---

## 7. Security — Improvements

### 7.1 Add Prompt Injection Scanning

**Source:** `[audit:hermes:16]` + `[audit:hermes:20]` Injection scanning for context files

**Current gap:** Files loaded into agent context (STATE.md, CLAIM-LEDGER.md, user-provided data) are not scanned for injection.

**Proposed addition:**

```markdown
## Context File Injection Scanning

Before loading ANY file into agent context, scan for:
- "ignore previous instructions"
- "skip confounder harness"
- "bypass R2 review"
- "mark claim as ROBUST without evidence"
- Hidden Unicode characters (zero-width spaces, directional overrides)
- HTML comment injection

If found: replace file content with [BLOCKED: filename contained injection attempt].
Log to governance_events table.
```

---

### 7.2 Add Unicode Normalization to PreToolUse

**Source:** `[audit:hermes:16]` Unicode fullwidth normalization + ANSI stripping

**Current gap:** PreToolUse regex can be bypassed with fullwidth Unicode characters.

**Proposed addition:** Before any regex matching in PreToolUse, normalize:
- Strip ANSI escape sequences
- Normalize Unicode fullwidth characters (ｒｍ → rm)
- Strip null bytes

---

## 8. Selective Reference Loading — Improvement

### 8.1 Add Max-N Reference Bundle Selection per Cycle

**Source:** `[audit:strix:15]` Max-5 skill loading

**Current gap:** The Vibe skill already has a rich reference surface under
`skills/vibe/references/`, but there is no explicit budgeted loading model for
which references should be active per cycle/flow.

**Proposed addition:**

```markdown
## Selective Reference Loading

Max 5 reference bundles loaded per cycle, selected by flow stage:

| Flow stage | References loaded (from skills/vibe/references/) |
|-----------|-----------------|
| Literature | search-protocol.md, evidence-engine.md, knowledge-base.md, literature-precheck.md, (1 flex) |
| Experiment | auto-experiment.md, experiment-manager.md, data-extraction.md, vlm-gate.md, (1 flex) |
| R2 Review | reviewer2-ensemble.md, blind-first-pass.md, judge-agent.md, schema-validation.md, (1 flex) |
| Synthesis | writeup-engine.md, evidence-engine.md, handoff-protocol.md, knowledge-base.md, (1 flex) |

The "flex" slot loads a context-relevant protocol based on the current hypothesis.
```

---

## 9. Cross-Cutting Patterns — New Capabilities

### 9.1 Add Continuous Learning / Instinct Extraction

**Source:** `[audit:ECC:5]` Session evaluation + pattern extraction, `[audit:gstack:17]` Local JSONL analytics

**Maps to** `[spec:CLAUDE.md:LAW 12 INSTINCT]`: Currently instincts are described but no automated extraction mechanism exists.

**Proposed implementation:**

At session end (or via explicit review command), evaluate: did this session
produce a novel insight or resolve a recurring problem? If so, propose a new
instinct:

```
INSTINCT: When analyzing gene expression in mixed-tissue datasets, always check cell-type
composition differences before running differential expression.
Confidence: 0.7, Source: session S004, Decay: -0.02/week
```

But do **not** auto-promote it blindly. Borrow ECC’s stronger model:

- default scope = project-local
- optional promotion to shared/global only after review
- explicit adjudication states: `save / improve / absorb / drop`
- TTL/decay and archival rules

Write candidates to `.vibe-science/instincts/proposed/`, then review before
promotion.

---

### 9.2 Add Parallel Exploration Diversity via Toolset Distributions

**Source:** `[audit:hermes:17]` Probabilistic toolset selection

**Maps to** `[spec:CLAUDE.md:LAW 8 EXPLORE BEFORE EXPLOIT]`: Currently 3+ draft nodes required, but all agents do the same searches.

**Proposed implementation:**

When spawning parallel exploration agents, give each a different tool distribution:
- Agent 1: PubMed + bioRxiv (preprint-focused)
- Agent 2: GEO + CellxGENE (data-focused)
- Agent 3: WebSearch + OpenAlex (breadth-focused)

Track which tools each agent accessed. R2 evaluates diversity.

---

### 9.3 Add Subagent Isolation Guarantees

**Source:** `[audit:hermes:15]` DELEGATE_BLOCKED_TOOLS, MAX_DEPTH=2, `[audit:superpowers:15]` Model selection by complexity

**Current gap:** No explicit constraints on sub-agent behavior.

**Proposed addition to** `[spec:.claude/rules/roles.md]` — new section:

```markdown
## SUBAGENT CONSTRAINTS

When launching sub-agents:
- MAX_DEPTH = 2 (parent → child → grandchild rejected)
- MAX_CONCURRENT = 3 (matches LAW 8 minimum draft nodes)
- Researcher sub-agents: BLOCKED from writing CLAIM-LEDGER
- R2 sub-agents: BLOCKED from Write/Edit
- All sub-agents: parent sees ONLY the summary result

Model selection by task complexity:
- Literature search → standard model (mechanical, well-scoped)
- Confounder analysis → capable model (multi-dataset integration)
- R2 adversarial review → most capable model (requires judgment)
```

---

### 9.4 Add Session and Install Inspection Before Fancy UI

**Source:** `[audit:ECC:19]` state/query surface, `[audit:ECC:18]` session snapshot contract

**Current gap:** The bridge still leans too heavily toward document edits and
late-stage dashboards.

**Proposed addition:**

- make `status` and `session inspect`-style surfaces first-class before any UI work
- inspect install health, flow state, pending reviews, recent governance events
- keep the outer project operable from CLI/JSON first

This is the real stepping stone to any future dashboard.

---

## 10. Priority Matrix (updated against actual repo state)

### Already Addressed by Codex

| # | Improvement | Status | What Codex Did |
|---|------------|--------|----------------|
| — | Core-reader.js + CLI bridge | `[IMPLEMENTED]` | 8 projections, JSON envelope, shared unresolved-claims |
| — | Flow command shims | `[IMPLEMENTED]` | 3 shims with honest degradation, no fake inference |
| — | Cross-doc blocker fixes | `[IMPLEMENTED]` | Core Contract, Wave annotations, Ideation Flow, system map |
| — | JSON templates | `[IMPLEMENTED]` | 4 templates under environment/templates/ |
| — | Stop.js shared logic | `[IMPLEMENTED]` | Reuses reader's queryUnresolvedClaims |

### Immediate (v7.0 scope or v7.0.1 patch) — ALL STILL OPEN

| # | Improvement | Status | Effort | Impact |
|---|------------|--------|--------|--------|
| 1.1 | Anti-pattern tables for Laws | `[OPEN]` | Low | High — prevents rationalization |
| 1.2 | Banned vocabulary | `[OPEN]` | Low | Medium — improves claim precision |
| 1.3 | Completion status protocol | `[OPEN]` | Low | High — formal cycle termination |
| 3.1 | Two-stage R2 review | `[OPEN]` | Medium | High — catches more errors |
| 3.2 | Anti-sycophancy researcher protocol | `[OPEN]` | Low | Medium — evidence over agreement |
| 4.4 | Citation verification warning (40%) | `[OPEN]` | Low | High — bibliographic hallucination risk is materially high |
| 7.2 | Unicode normalization | `[OPEN]` | Low | Medium — closes bypass vector |

### Near-term (v7.1 or broader-system Phase 1)

| # | Improvement | Status | Effort | Impact |
|---|------------|--------|--------|--------|
| 2.1 | Hook flag profiles + surgical hook suppression | `[OPEN]` | Medium | High — governance tuning |
| 2.2 | Config protection (immutable schema guard) | `[OPEN]` | Low | Medium — protects schemas |
| 2.3 | Governance event capture (audit trail) | `[OPEN]` | Medium | High — audit trail |
| 2.4 | Relationship validators and docs-parity checks | `[OPEN]` | Medium | High — prevents spec/runtime drift |
| 4.1 | Structured compression template | `[OPEN]` | Medium | High — prevents context loss |
| 4.2 | FTS5 search on spines/claims | `[PARTIALLY ADDRESSED]` | Medium | Medium — v7 WP-08 covers FTS5 retrieval |
| 6.1 | Claim status state machine | `[OPEN]` | Medium | High — validated transitions |
| 6.2 | Budget/resource guardrails | `[OPEN]` | Medium | Medium — cycle hard-stops |
| 5.5 | Canonical session snapshot + operator query surface | `[OPEN]` | Medium | High — inspectable control plane |

### Medium-term (broader-system Phase 2+)

| # | Improvement | Status | Effort | Impact |
|---|------------|--------|--------|--------|
| 4.3 | Promptfoo governance evals | `[OPEN]` | High | Very High — test laws on models |
| 5.1 | Capability bundles + install lifecycle | `[OPEN]` | Medium | High — reversible outer-project installs |
| 5.2 | Context modes (exploration/analysis/review) | `[OPEN]` | Low | Medium — behavioral switching |
| 5.3 | Results-analysis bundle format | `[OPEN]` | Medium | High — structured output |
| 5.4 | Orchestration with handoff documents | `[PARTIALLY ADDRESSED]` | Medium | Medium — flow shims exist but no formal handoff format |
| 8.1 | Max-N reference bundle loading | `[OPEN]` | Medium | Medium — context budget |
| 9.1 | Scoped instinct governance | `[OPEN]` | High | High — LAW 12 without cross-project contamination |
| 9.2 | Toolset distributions for parallel diversity | `[OPEN]` | Medium | Medium — LAW 8 improvement |
| 9.3 | Subagent isolation guarantees | `[OPEN]` | Medium | High — blocked tools, depth limits |
| 9.4 | Session/install inspection surfaces | `[OPEN]` | Medium | High — operator visibility before UI |

---

## Source Traceability

Every improvement in this document traces back to a specific finding in a specific audit:

| Improvement | Primary audit source | Secondary sources |
|------------|---------------------|-------------------|
| Anti-pattern tables | gstack:11 | superpowers:14 |
| Banned vocabulary | gstack:21 | — |
| Completion status | gstack:13 | superpowers:13 |
| Hook flag profiles + suppression | ECC:2 | — |
| Config protection | ECC:6 | strix:14 |
| Governance capture | ECC:3 | paperclip:14 |
| Relationship validators | ECC:9 | ECC:15 |
| Two-stage R2 | superpowers:12 | — |
| Anti-sycophancy | superpowers:18 | gstack:21 |
| Structured compression | hermes:13 | strix:17 |
| FTS5 search | hermes:14 | — |
| Promptfoo evals | paperclip:13 | paperclip:17 |
| Citation warning | claude-scholar:14 | — |
| Capability bundles + install lifecycle | ECC:1 | ECC:15, ECC:16 |
| Context modes | ECC:8 | — |
| Results bundle | claude-scholar:13 | — |
| Orchestration handoffs | ECC:7 | superpowers:12 |
| Session snapshot + query surface | ECC:18 | ECC:19 |
| Claim state machine | paperclip:11, 15 | — |
| Budget guardrails | paperclip:14 | hermes:18 |
| Injection scanning | hermes:16, 20 | claude-scholar:12 |
| Unicode normalization | hermes:16 | — |
| Max-N reference loading | strix:15 | — |
| Scoped instinct governance | ECC:5 | gstack:17 |
| Toolset distributions | hermes:17 | — |
| Subagent isolation | hermes:15 | superpowers:15 |
| Session/install inspection surfaces | ECC:19 | ECC:18 |

---

## Non-Negotiable Constraint

Every improvement proposed here respects the Core Contract:

- No outer layer may self-legitimate scientific truth
- The kernel owns claim truth, citation truth, gate semantics, integrity state, and stop semantics
- Soft shell, hard kernel

If any proposed improvement would require changing gate semantics, claim truth, or stop semantics, it is out of scope for this bridge spec and must stop for core review.

---

## 10B. Items Identified by R2 Adversarial Review as Missing

The following items were surfaced by an R2 adversarial pass on the audit and bridge documents. They are real gaps.

### 10B.1 Governance Audit Trail Must Be Append-Only

**Gap:** Section 2.3 proposes governance_events table but doesn't specify immutability. An agent could DELETE or UPDATE a governance event after recording.

**Fix:** The `governance_events` table MUST be append-only. No UPDATE or DELETE
operations permitted. Enforce that at the DB/storage layer first (trigger or
equivalent policy). PostToolUse detection of DELETE/UPDATE targeting
`governance_events` should remain only as defense in depth.

### 10B.2 Profile Transition Safety

**Gap:** Section 2.1 proposes governance profiles (minimal/standard/strict) but doesn't address what happens when a researcher transitions from minimal (exploratory) to strict (validation). Claims produced in minimal mode were not schema-validated on every write.

**Fix:** When governance profile changes from a lower to higher level, the system MUST:
- Log the transition as a governance event
- NOT retroactively validate old claims (they were valid under their profile)
- Mark all claims created under minimal profile with a `governance_profile_at_creation` field
- The export-eligibility helper MUST check: claims created under minimal profile require explicit R2 review before export, regardless of current profile
- Claims created under minimal profile MUST also pass fresh schema validation at
  export/promotion time, because they did not receive maximal write-time checks

### 10B.3 Sensitivity-Based Instinct Filtering

**Gap:** Section 9.1 proposes instinct extraction but doesn't address research sensitivity. An instinct like "dataset X has batch effect Y in tissue Z" could leak confidential research details.

**Fix:** Instinct extraction MUST:
- Strip dataset-specific identifiers before persistence
- Generalize from specific findings to abstract patterns (e.g., "mixed-tissue datasets often have composition confounders" not "the Smith2025 dataset has a T-cell proportion bias")
- Never persist patient identifiers, dataset paths, or unpublished finding details
- All instincts pass through a sensitivity filter before promotion from `proposed/` to `active/`

### 10B.4 Handoff Document Validation

**Gap:** Section 5.4 proposes orchestration handoff documents but doesn't address agent hallucination. An agent filling a handoff could fabricate findings.

**Fix:** Handoff documents MUST:
- Reference claim_ids for any factual claims (traceable to CLAIM-LEDGER)
- Reference file paths for any analysis artifacts (verifiable existence)
- The receiving agent SHOULD verify at least one claim_id and one file path before proceeding
- Handoff documents are NOT governance-sensitive artifacts (they don't create truth), but they MUST carry provenance markers

---

## 11. Spec-Internal Gaps Surfaced by Deep Reading

The three parallel sub-agents read ALL 30+ spec files word-for-word and identified gaps that the audit patterns can now fill.

### 11.1 Export-Eligibility Policy — `[PARTIALLY ADDRESSED]`

**Gap location:** `[spec:research-environment-v1/02-product-architecture.md]` and `[spec:VIBE-SCIENCE-RESEARCH-ENVIRONMENT-V1-SPEC.md:Story 4]`

**Update:** Codex updated the product architecture to specify the three-projection derivation model. The `queryUnresolvedClaims` function now exists in `core-reader.js`. However, the actual `environment/lib/export-eligibility.js` helper is NOT yet implemented — only the kernel-side projections it would consume exist.

The spec says export-eligibility is "derived policy, not a single raw lifecycle label" but never provides the actual logic.

**Audit-informed solution** (from `[audit:strix:14]` structured report schema + `[audit:paperclip:11]` state machine):

```js
// Pseudocode — actual signatures must match core-reader.js createReader() contract
function isExportEligible(claimId, reader) {
  // reader = createReader(projectPath) from plugin/lib/core-reader.js
  const heads = reader.listClaimHeads();  // returns [{claimId, currentStatus, ...}]
  const head = heads.find(c => c.claimId === claimId);
  if (!head || head.currentStatus === 'KILLED' || head.currentStatus === 'DISPUTED') return false;

  const unresolved = reader.listUnresolvedClaims();  // returns [{claimId, ...}]
  if (unresolved.some(c => c.claimId === claimId)) return false;

  const citations = reader.listCitationChecks({ claimId });  // verify actual options shape
  if (citations.length > 0) {
    const allVerified = citations.every(c => c.verificationStatus === 'VERIFIED');
    if (!allVerified) return false;
  }
  return true;
}
```

**Verified:** The `createReader()` wrapper at line 385 of `core-reader.js` binds `db` and `projectPath` internally. The wrapper signatures are:
- `reader.listClaimHeads(options = {})` — returns `[{claimId, currentStatus, isActive, ...}]`
- `reader.listUnresolvedClaims(options = {})` — returns `[{claimId, ...}]`
- `reader.listCitationChecks(options = {})` — accepts `{claimId, verificationStatuses, limit}`

The pseudocode above matches the actual wrapper signatures.

Place in `environment/lib/export-eligibility.js`. Test with 5 cases: eligible, killed, disputed, unresolved, unverified citation.

---

### 11.2 Memory Layer Sync Model Is Unspecified

**Gap location:** `[spec:broader-system/03-memory-layer.md:Sync Model]` — "who writes mirrors in detail is still a Phase 2 product decision"

**Audit-informed solution** (from `[audit:claude-scholar:16]` stop-summary hook + `[audit:hermes:13]` structured compression):

Define sync as **explicit command-driven** (never hook-driven in V1):
- `/sync-memory` reads kernel projections via core-reader-cli.js
- Writes to `.vibe-science-environment/memory/project-overview.md`
- Every mirror file carries `<!-- synced: 2026-03-29T10:00:00Z -->` timestamp
- If sync fails partway: leave partial file, log warning, never corrupt kernel state
- Stale threshold: >24h → mirror header shows "STALE — run /sync-memory"

---

### 11.3 Claim Lifecycle State Transitions Not Documented

**Gap location:** `[spec:broader-system/01-core-invariants.md:Invariant A]` — protects claim lifecycle but never enumerates states or valid transitions

**Audit-informed solution** (from `[audit:paperclip:11]` plugin lifecycle state machine + `[audit:paperclip:15]` Kanban pipeline):

Already proposed in section 6.1 above (Claim Status State Machine). The sub-agents confirmed this is a critical gap: Writing Handoff Flow CANNOT be implemented without it.

---

### 11.4 Stop Hook Behavior Change Is Underdocumented

**Gap location:** `[spec:v7.0:WP-01]` — "When claim_events starts populating, the stop.js rule becomes active"

**Audit-informed solution** (from `[audit:gstack:18]` AskUserQuestion format + `[audit:strix:14]` structured report):

Improve stop-hook error message:

```
BLOCKED: Session cannot end safely.

REASON: The following claims are pending review:
  - C-001 (confidence 0.75) — CREATED but not reviewed
  - C-003 (confidence 0.82) — CREATED but not reviewed

WHAT TO DO:
  A) Trigger R2 review → /reviewer2 FORCED
  B) Kill the claim → Edit CLAIM-LEDGER.md, set status to KILLED with reason
  C) Dispute (accept as unresolved) → set status to DISPUTED
  D) Override → set VBS_FORCE_STOP=1 (logged as governance event)
```

Document as v7 BEHAVIOR CHANGE in CHANGELOG.

---

### 11.5 Terminology Drift: "Shell" vs "Outer-Project" vs "Broader System"

**Gap identified by sub-agents:** Three terms used interchangeably across 9 broader-system files.

**Proposed standardization:**
- **"kernel"** = the plugin + its hooks + its DB (protected zone)
- **"outer project"** = code in `environment/` that builds around the kernel
- **"shell"** = architectural concept (soft shell, hard kernel) — use in design discussions only
- **"broader system"** = the combined kernel + outer project — use only in spec titles

Rename inconsistent usages in broader-system/ files for clarity.

---

### 11.6 Strict Mode Needs a Three-Level Model

**Gap location:** `[spec:v7.0:Section 6.5]` — defines binary strict/normal

**Note:** This gap is the same proposal as section 2.1 (Hook Flag Profiles). The solution is unified under `VBS_GOVERNANCE_PROFILE`. See section 2.1 for the full proposal. This section exists only to document the gap origin (v7.0 spec) for traceability.

The binary `VIBE_SCIENCE_STRICT=1` should be replaced by the graduated model in section 2.1.

---

### 11.7 Permission Engine ↔ Skill Agent Mapping Is Implicit

**Gap location:** `[spec:plugin/lib/permission-engine.js]` vs `[spec:skills/vibe/AGENTS.md]`

Permission engine has 6 roles. AGENTS.md defines 7 agent types. Mapping is undocumented.

**Proposed mapping table:**

| Skill Agent | Permission Role | Model Tier |
|------------|----------------|------------|
| researcher | researcher | sonnet/opus |
| r2-deep | reviewer2 | opus |
| r2-inline | reviewer2 | sonnet |
| observer | (background, no check) | haiku |
| explorer | experimenter | sonnet |
| r3-judge | judge | opus |
| instinct-scanner | (system, no check) | haiku |

Add to AGENTS.md.

---

### 11.8 No Canonical Session Snapshot Or Operator Query Contract

**Note:** This is the same proposal as section 5.5. See section 5.5 for the full specification. This section exists only to document the gap origin (cross-spec reading) for traceability.

---

## 12. Cross-Spec Dependency Resolution

The sub-agents identified **7 blockers** that must be resolved before implementation:

| Blocker | Blocks | Resolution | Status |
|---------|--------|------------|--------|
| core-reader.js interface not specified | Phase 1 (all flows) | `[IMPLEMENTED]` — Codex built `core-reader.js` (8 functions) + `core-reader-cli.js`. Tests pass. | CLOSED |
| Memory Layer ownership undefined | Phase 2 | `[OPEN]` — Proposed above: command-driven sync, never hook-driven in V1 | DESIGN READY |
| Export-eligibility policy undefined | Phase 3 | `[PARTIALLY ADDRESSED]` — Kernel projections exist, outer helper `export-eligibility.js` not yet built | DESIGN READY |
| Harness hint strength/priority undefined | TRACE+ADAPT V0 | `[OPEN]` — Propose: strength = (failure_count x recency_weight), sort desc, take top 3 | DESIGN READY |
| Stop hook behavior change underdocumented | v7.0 release | `[OPEN]` — Needs CHANGELOG entry + improved error message | OPEN |
| Terminology drift (shell/outer-project/broader-system) | All docs | `[OPEN]` — Standardization proposed above | OPEN |
| No canonical session snapshot contract | Phase 1.5+ status/control plane | `[OPEN]` — Proposed above: `vibe.session.v1` + operator query surface | DESIGN READY |
