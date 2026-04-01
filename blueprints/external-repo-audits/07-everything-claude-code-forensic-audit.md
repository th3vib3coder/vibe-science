# Everything Claude Code (ECC) Forensic Audit

**Repo:** `https://github.com/affaan-m/everything-claude-code`
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\everything-claude-code`
**Audit date:** 2026-03-29
**Auditor:** Claude Opus 4.6 (first pass, Codex will do addendum)
**Goal:** extract concrete ideas, patterns, and anti-patterns for the Vibe Science upgrade

---

## Quick X-Ray

- Repo shape: massive Claude Code plugin with 28 agents, 127 skills, 60 commands, 60+ rule files, 10 JSON schemas, 29 hook scripts, multiple harness bundles, and an `ecc2` Rust TUI control plane; the concrete install/runtime target layer currently centers on Claude, Codex, Cursor, Antigravity, and OpenCode rather than a clean six-host parity story
- Scale: largest repo audited (210+ files excluding node_modules)
- Strongest themes: **profiled install system**, **hook flag governance**, **continuous learning loop**, **structured orchestration with handoff documents**
- Stack: Node.js scripts, JSON schemas (Ajv validation), SQLite state store, Rust TUI (ecc2)
- Biggest risk: sheer breadth — 127 skills means inevitable drift and duplication
- Biggest warning: **borrow the infrastructure patterns, not the full skill catalog**

---

## Pass 1 — Useful Elements to Capture

### 1. Install Profiles with Modular Composition

**Where found**

- `manifests/install-profiles.json` — 5 profiles: core, developer, security, research, full
- `manifests/install-modules.json` — 17+ modules with cost/stability metadata
- `manifests/install-components.json` — individual component declarations
- `schemas/install-profiles.schema.json`, `schemas/install-modules.schema.json` — JSON Schema validation

**What it is**

Instead of "install everything or nothing", ECC defines 5 named profiles:

| Profile | Modules | Use case |
|---------|---------|----------|
| **core** | rules-core, agents-core, commands-core, hooks-runtime, platform-configs, workflow-quality | Minimal baseline |
| **developer** | core + framework-language, database, orchestration | Most users |
| **security** | core + security | Security-focused |
| **research** | core + research-apis, business-content, social-distribution | Research workflows |
| **full** | All 17 modules | Everything |

Each module has: `id`, `kind`, `description`, `paths`, `targets` (which hosts), `dependencies`, `cost` (light/medium/heavy), `stability` (stable/experimental).

**Why this matters for Vibe Science**

Our system loads everything at once: all 12 Immutable Laws, 21 protocol files, all hook scripts. A profiled install would let us:
- Core: laws + basic hooks + schema gates
- Researcher: core + literature protocols + experiment protocols
- R2 Review: core + review protocols + falsification protocols
- Full: everything

**Draft implementation for Vibe Science**

- Define install profiles in a manifest:
  - `core`: CLAUDE.md, roles.md, enforcement.md, session-start hook, pre-tool-use hook
  - `researcher`: core + literature flow, experiment flow, confounder protocol
  - `reviewer`: core + R2 protocols, judge rubric, BFP protocol
  - `full`: all protocols and hooks
- Each module has `cost` metadata so we can estimate context budget impact

---

### 2. Hook Flag System (run-with-flags.js)

**Where found**

- `scripts/hooks/run-with-flags.js` — dispatcher
- `scripts/lib/hook-flags.js` — flag checking
- Every hook in `hooks/hooks.json` references a flag profile: `minimal`, `standard`, or `strict`

**What it is**

A hook execution dispatcher that:
1. Receives a `hookId`, `scriptPath`, and `profilesCsv` (e.g., "standard,strict")
2. Checks if the hook is enabled for the current profile via `isHookEnabled()`
3. Only runs the hook script if enabled
4. Handles stdin passthrough, stderr forwarding, exit codes

This means the same `hooks.json` contains ALL hooks, but only the profile-appropriate ones actually fire. A "minimal" install gets fast, lightweight hooks. A "strict" install gets every quality gate.

**Why this matters for Vibe Science**

Our hooks currently run unconditionally. If a user wants a lighter experience (e.g., quick literature scan without full governance), they can't easily disable the heavier hooks. The flag system would let us:
- `minimal`: session-start + stop (basic lifecycle only)
- `standard`: + pre-tool-use confounder check + post-tool-use logging
- `strict`: + schema validation on every write + R2 mandatory review + salvagente enforcement

**Draft implementation for Vibe Science**

- Add a `VBS_HOOK_PROFILE` env var (default: "standard")
- Wrap each hook script with a flag check: if the hook's required profile doesn't match, skip silently
- Let the user set `strict` for final validation sessions, `minimal` for exploratory sessions

---

### 3. Governance Capture System

**Where found**

- `scripts/hooks/governance-capture.js` — PreToolUse/PostToolUse hook
- `scripts/lib/state-store/queries.js` — durable governance event insertion path

**What it is**

A hook that detects governance-relevant events and emits structured JSON about them to stderr for downstream consumers. A separate state-store query layer exists for durable persistence, but the hook itself is not the whole persistence pipeline:

| Event type | Detection |
|-----------|-----------|
| `secret_detected` | Regex: AWS keys, generic secrets, private keys, JWTs, GitHub tokens |
| `policy_violation` | Commands matching: git push --force, git reset --hard, rm -rf, SQL DROP/DELETE |
| `security_finding` | Security-relevant tool invocations (Bash) |
| `approval_requested` | Operations requiring explicit approval |
| `hook_input_truncated` | Input exceeded 1MB safe inspection limit |

Each event gets: unique ID (`gov-{timestamp}-{random}`), session correlation, tool name, event type, severity, details.

**Why this matters for Vibe Science**

Our system has LAW 9 (confounder harness) enforced by PreToolUse, but we don't capture governance events as a durable audit trail. The ECC pattern captures: what was attempted, what was blocked, what was detected. This creates a reviewable security log.

**Draft implementation for Vibe Science**

- Add governance event capture to our PostToolUse hook:
  - `claim_without_harness`: claim written to CLAIM-LEDGER without confounder_status
  - `schema_modification_attempt`: any Write/Edit targeting schema files
  - `r2_bypass_attempt`: claim promotion without R2 review
  - `law_violation`: detected violation of any Immutable Law
- Persist those events explicitly to a `governance_events` table in our SQLite DB instead of assuming hook emission equals durable storage

---

### 4. Cost Tracking via JSONL Metrics

**Where found**

- `scripts/hooks/cost-tracker.js` — Stop hook
- Writes to `~/.claude/metrics/costs.jsonl`

**What it is**

On every session stop, captures:
```json
{
  "timestamp": "2026-03-29T10:00:00Z",
  "session_id": "abc123",
  "model": "opus",
  "input_tokens": 50000,
  "output_tokens": 12000,
  "estimated_cost_usd": 1.65
}
```

Per-model rate estimation: haiku ($0.80/$4.00 per 1M), sonnet ($3.00/$15.00), opus ($15.00/$75.00).

**Why this matters for Vibe Science**

We track claims and spines but not token cost per session. This data would help: which flows are expensive? Is the confounder harness worth its token cost? How much does an R2 review cycle cost?

**Draft implementation for Vibe Science**

- Add cost tracking to our Stop hook
- Append to `.vibe-science/metrics/costs.jsonl`
- Track: session_id, flow_type, model, tokens_in/out, estimated_cost, claims_produced, claims_killed

---

### 5. Continuous Learning / Session Evaluation

**Where found**

- `scripts/hooks/evaluate-session.js` — Stop hook, extracts patterns from sessions
- `skills/continuous-learning-v2/` — full learning system with hooks, agents, config, scripts
- `commands/learn.md` — manual pattern extraction command

**What it is**

ECC actually has two different layers here, and the second one is the important one:

1. `scripts/hooks/evaluate-session.js` is a lightweight threshold/check hook: it inspects transcript length and decides whether the session should be evaluated
2. `skills/continuous-learning-v2/` is the real learning system: observation hooks, scoped instinct storage, review/curation commands, and lifecycle rules around what gets promoted

The `/learn` command allows manual extraction with criteria:
- Error resolution patterns
- Debugging techniques
- Workarounds (library quirks, API limitations)
- Project-specific conventions

Output: skill files in `~/.claude/skills/learned/[pattern-name].md` with Problem, Solution, Example, When to Use sections.

The v2 system has: observation hooks (pre/post on every tool use), a learning agent, and a config-driven evaluation pipeline.

**Why this matters for Vibe Science**

Our system has LAW 12 (INSTINCT: learned patterns from past sessions) but doesn't have an automated extraction mechanism. The ECC pattern shows how to: capture observations on every tool use, evaluate at session end, extract reusable patterns.

For Vibe Science: after a session where the confounder harness revealed a systematic bias, the system could extract: "When analyzing gene expression in mixed-tissue datasets, always check for cell-type composition differences before running DE analysis."

**Draft implementation for Vibe Science**

- Add observation capture to our PostToolUse hook (lightweight, just log tool name + brief context)
- At session end, run a separate instinct-evaluation step; do not pretend a threshold hook is already a learning pipeline
- Store instincts as reviewable proposals, not auto-promoted truth

---

### 6. Config Protection Hook (Agent Shouldn't Weaken Rules)

**Where found**

- `scripts/hooks/config-protection.js` — PreToolUse hook for Write/Edit
- Blocks modifications to 30+ linter/formatter config files

**What it is**

When an agent tries to edit a linter/formatter config file (ESLint, Prettier, Biome, Ruff, ShellCheck, StyleLint, MarkdownLint, etc.), the hook blocks with exit code 2 and message: "Fix the code, not the config."

This prevents a common agent failure mode: instead of fixing the actual code issue, the agent weakens the linter configuration to make the error go away.

**Why this matters for Vibe Science**

Our schemas are read-only by design (LAW 3: Schema-Validated Gates). But we don't programmatically block modifications to: `fault-taxonomy.yaml`, `judge-rubric.yaml`, or schema files. An agent could theoretically edit a schema to make a non-compliant claim pass validation.

**Draft implementation for Vibe Science**

- Add config protection to our PreToolUse hook:
  - Block: `skills/vibe/assets/schemas/*.schema.json` (read-only schemas)
  - Block: `skills/vibe/assets/fault-taxonomy.yaml` (SFI definitions)
  - Block: `skills/vibe/assets/judge-rubric.yaml` (R3 scoring)
  - Message: "These files are IMMUTABLE. Fix the claim/analysis, not the schema."

---

### 7. Orchestration with Structured Handoff Documents

**Where found**

- `commands/orchestrate.md` — orchestration command
- `scripts/orchestrate-worktrees.js` — tmux/worktree multi-agent execution
- `scripts/orchestration-status.js` — control-plane snapshot

**What it is**

There are two layers here too:

- `commands/orchestrate.md` defines guidance, recommended stages, and operator-facing conventions
- the executable side (`scripts/orchestrate-worktrees.js` + tmux/worktree helpers) materializes worktrees, task files, status files, and simpler handoff artifacts

So the strong idea is real, but some of the richer pipeline semantics still live partly in markdown conventions rather than fully enforced runtime contracts.

Named workflow pipelines:
- **feature**: planner → tdd-guide → code-reviewer → security-reviewer
- **bugfix**: planner → tdd-guide → code-reviewer
- **refactor**: architect → code-reviewer → tdd-guide
- **security**: security-reviewer → code-reviewer → architect
- **custom**: user-defined agent sequence

Between each agent, a **handoff document** is created:
```markdown
## HANDOFF: [previous-agent] -> [next-agent]
### Context: [Summary of what was done]
### Findings: [Key discoveries]
### Files Modified: [List]
### Open Questions: [Unresolved items]
### Recommendations: [Next steps]
```

Final output includes an **Orchestration Report** with per-agent summaries and a **SHIP / NEEDS WORK / BLOCKED** recommendation.

For multi-session orchestration, a **Control Plane Block** tracks: active sessions, branch/worktree paths, git status, pending approvals, telemetry (idle signal, cost drift, policy events).

**Why this matters for Vibe Science**

Our current agent orchestration is informal: the lead assigns tasks, agents return results. The structured handoff pattern would formalize:
- Researcher → R2: handoff with claims, evidence, and open questions
- R2 → R3: handoff with review findings, scores, and objections
- Orchestrator → User: control-plane snapshot with session status

The tmux/worktree orchestrator is directly relevant for parallel exploration (LAW 8): each exploration branch gets its own worktree, with seedPaths to share specific files.

**Draft implementation for Vibe Science**

- Define named research pipelines:
  - **investigate**: literature-scan → hypothesis-formation → R2-review
  - **validate**: experiment-setup → analysis → confounder-harness → R2-review
  - **synthesize**: claim-collection → writing → R2-review → R3-meta-review
- Use structured handoff documents between pipeline stages
- Add control-plane snapshot for multi-session research projects

---

### 8. Context Modes (dev / research / review)

**Where found**

- `contexts/dev.md` — development mode
- `contexts/research.md` — research mode
- `contexts/review.md` — review mode

**What it is**

Named behavioral contexts that change the agent's disposition:

| Mode | Focus | Behavior |
|------|-------|----------|
| **dev** | Active development | "Write code first, explain after. Prefer working solutions." |
| **research** | Exploration | "Read widely before concluding. Form hypothesis. Verify with evidence." |
| **review** | Quality checking | (presumably: systematic review, checklists, evidence-based) |

The research context is particularly interesting:
1. Understand the question
2. Explore relevant code/docs
3. Form hypothesis
4. Verify with evidence
5. Summarize findings

"Findings first, recommendations second."

**Why this matters for Vibe Science**

Our system has agent roles (researcher, R2, serendipity, etc.) but doesn't have explicit behavioral modes. A "research mode" that says "read widely before concluding" vs an "analysis mode" that says "run the analysis, don't explore" would prevent the common failure where the researcher keeps exploring instead of executing.

**Draft implementation for Vibe Science**

- Define context modes for our flows:
  - `exploration`: read widely, form hypotheses, document findings, don't commit to claims
  - `analysis`: run the specified analysis, produce structured artifacts, don't explore further
  - `review`: systematic checklist, demand evidence, no congratulations
  - `synthesis`: combine findings, write prose, cite evidence
- Inject the active mode into the agent's context at flow boundaries

---

### 9. Comprehensive CI Validation (8 Validators)

**Where found**

- `scripts/ci/validate-agents.js` — validates 28 agents
- `scripts/ci/validate-skills.js` — validates 127 skills
- `scripts/ci/validate-commands.js` — validates 60 commands
- `scripts/ci/validate-rules.js` — validates 60+ rules
- `scripts/ci/validate-hooks.js` — validates 28 hook matchers
- `scripts/ci/validate-install-manifests.js` — validates manifest JSON against schemas
- `scripts/ci/validate-no-personal-paths.js` — prevents hardcoded personal paths
- `scripts/ci/catalog.js` — generates text catalog of all assets

**What it is**

Each validator checks: file exists, frontmatter valid, required sections present, naming conventions followed. The personal-path validator prevents `~/.claude/` or `/Users/affaan/` from leaking into committed files.

Executed as: `npm test` which chains the validator stack and the full test suite.

Results from our validation: asset validators are strong, but the full chain is not fully green in this clone. The most important real failure is documentation/catalog drift (README and AGENTS still advertise 126 skills while the repo has 127).

**Why this matters for Vibe Science**

We have schema validation for gates (LAW 3) but don't validate the consistency of our own protocol files, role definitions, or hook configurations. A CI validator that checks: "every protocol has required sections", "every role in roles.md maps to a known agent type", "every hook script referenced in hooks.json exists" would catch drift.

**Draft implementation for Vibe Science**

- Add validators for our asset types:
  - `validate-protocols.js`: every protocol file has required sections
  - `validate-schemas.js`: every schema file is valid JSON Schema
  - `validate-hooks.js`: every hook script referenced exists and passes `node --check`
  - `validate-roles.js`: every role in roles.md has matching constraints
  - `validate-no-personal-paths.js`: no hardcoded user paths in committed files

---

### 10. 10 JSON Schemas for Self-Validation

**Where found**

- `schemas/ecc-install-config.schema.json`
- `schemas/hooks.schema.json`
- `schemas/install-components.schema.json`
- `schemas/install-modules.schema.json`
- `schemas/install-profiles.schema.json`
- `schemas/install-state.schema.json`
- `schemas/package-manager.schema.json`
- `schemas/plugin.schema.json`
- `schemas/provenance.schema.json`
- `schemas/state-store.schema.json`

**What it is**

JSON Schema definitions (Draft-07) for every structured data type in the system. Validated at CI time via Ajv (the `ajv` npm dependency). The schemas enforce: required fields, naming patterns (kebab-case), enums, minimum values, no additional properties.

The `provenance.schema.json` is particularly interesting: tracks where each installed component came from, what version, when it was installed.

**Why this matters for Vibe Science**

We already have 12 JSON Schema files in `skills/vibe/assets/schemas/`. The ECC pattern adds: schemas for the INSTALL system itself, for the state store, and for provenance tracking. Our system would benefit from schemas for: session state, claim lifecycle, spine entries, governance events.

**Draft implementation for Vibe Science**

- Add JSON Schemas for currently unvalidated structures:
  - `session-state.schema.json`: validates STATE.md structure
  - `claim.schema.json`: validates individual claim entries
  - `governance-event.schema.json`: validates governance capture events
  - `instinct.schema.json`: validates learned instinct entries

---

### 11. ecc2: Rust TUI Control Plane

**Where found**

- `ecc2/Cargo.toml` — Rust project
- `ecc2/src/` — TUI implementation

**What it is**

A Rust TUI dashboard (ratatui + crossterm) for monitoring agent sessions. Dependencies: rusqlite (state), git2 (git integration), tokio (async), serde/serde_json/toml (serialization), clap (CLI), tracing (logging), chrono (time), uuid (session IDs).

This is the "next generation" of ECC: a compiled binary control plane instead of Node.js scripts.

**Why this matters for Vibe Science**

Not directly relevant for Phase 1, but signals the direction: compiled control planes with TUI dashboards. For a long research session, a live dashboard showing: active claims, pending R2 reviews, session cost, exploration coverage would be more useful than scrolling through markdown files.

**Draft implementation for Vibe Science**

- Consider for later: a TUI dashboard for research sessions showing:
  - Active hypothesis
  - Claims: produced/pending/killed/robust
  - R2 status: reviews pending/completed
  - Token budget: used/remaining
  - Serendipity seeds: pending/followed-up

---

### 12. Quality Gate Hook (Auto-Format + Type Check)

**Where found**

- `scripts/hooks/quality-gate.js` — PostToolUse hook for Edit/Write
- `scripts/hooks/post-edit-format.js` — auto-format after edits
- `scripts/hooks/post-edit-typecheck.js` — TypeScript check after edits
- `scripts/hooks/post-edit-console-warn.js` — warn about console.log

**What it is**

After every file edit, a pipeline runs:
1. Detect language/tooling for the edited file
2. Run formatter (Biome or Prettier, auto-detected)
3. Run type checker (TypeScript for .ts/.tsx)
4. Warn about console.log statements

This catches issues immediately, not at commit time.

**Why this matters for Vibe Science**

Our PostToolUse hook does advisory checks. The ECC pattern goes further: it auto-fixes formatting issues and immediately surfaces type errors. For our use case: after the researcher writes a claim to CLAIM-LEDGER, immediately validate it against the schema and warn about missing fields.

**Draft implementation for Vibe Science**

- Upgrade our PostToolUse to include immediate validation:
  - After Write/Edit to CLAIM-LEDGER: validate against claim schema
  - After Write/Edit to STATE.md: validate structure
  - After Write/Edit to any .py analysis script: run basic syntax check
  - Emit warning (not block) for advisory issues

---

### 13. MCP Health Monitoring

**Where found**

- `scripts/hooks/mcp-health-check.js` — PreToolUse/PostToolUseFailure hook
- Tracks MCP server health, blocks unhealthy calls, attempts reconnect

**What it is**

Before any MCP tool call, checks if the target MCP server is healthy. On PostToolUseFailure, marks the server as unhealthy and attempts reconnect. This prevents the agent from wasting turns on dead MCP connections.

**Why this matters for Vibe Science**

When our system uses MCP tools (PubMed, GEO, OpenAlex, bioRxiv), an unhealthy MCP connection wastes the agent's turn budget. Health monitoring would: detect failures early, skip unhealthy tools, attempt reconnect, and warn the user.

**Draft implementation for Vibe Science**

- Add MCP health tracking to our hook system
- Before invoking any scientific database MCP: check last health status
- On failure: mark unhealthy, suggest alternative (e.g., WebSearch fallback)

---

### 14. Suggest-Compact Hook (Context Budget Awareness)

**Where found**

- `scripts/hooks/suggest-compact.js` — PreToolUse hook for Edit/Write
- `skills/context-budget/SKILL.md` — context budget management skill

**What it is**

Monitors context usage and suggests manual compaction at logical intervals. The skill provides guidance: "Avoid last 20% of context window for large refactoring. Lower-sensitivity tasks tolerate higher utilization."

**Why this matters for Vibe Science**

Our system doesn't monitor context usage proactively. The agent could be at 90% context and start a complex analysis that gets cut off by compaction mid-way. The suggest-compact pattern would warn: "Context at 75%. Consider compacting before starting confounder harness (which typically uses 15% of context)."

**Draft implementation for Vibe Science**

- Add context budget awareness to our PreToolUse hook
- Before expensive operations (confounder harness, full literature scan), check estimated context usage
- If approaching threshold: suggest compaction first, or warn that the operation may trigger auto-compaction

---

## Pass 2 — What Not to Copy Blindly

### 1. Do not copy 127 skills into a research system

The sheer volume guarantees duplication and drift. Our system should have 10-15 focused protocols, not 127 general skills.

### 2. Do not copy the breadth story as if all host surfaces were equally real

Supporting Claude, Codex, Cursor, Kiro, OpenCode, and Trae creates massive maintenance surface. Stay Claude Code-first.

### 3. Do not copy the universal-developer-tool framing

ECC is a general developer productivity tool. Vibe Science is a domain-specific research integrity system. The framing difference matters for which patterns to import.

### 4. Do not copy agent orchestration without adaptation

The feature/bugfix/refactor/security pipelines are developer-oriented. Research needs different pipelines: investigate/validate/synthesize.

### 5. Do not copy permissive "core" profile for research

The "core" profile doesn't include research-specific modules. Our "core" must always include evidence integrity.

---

## Pass 3 — Recommended Adoption Priority

### Priority A — steal immediately

1. **Install Profiles with Modules** (item 1) — profiled installation for different use cases
2. **Hook Flag System** (item 2) — conditional hook execution by profile
3. **Config Protection** (item 6) — block schema/config modifications
4. **Governance Capture** (item 3) — audit trail for policy violations

### Priority B — steal next

5. **Context Modes** (item 8) — exploration/analysis/review behavioral switches
6. **Orchestration with Handoff Documents** (item 7) — structured pipeline handoffs
7. **Cost Tracking** (item 4) — JSONL session cost metrics
8. **CI Validation** (item 9) — validators for all asset types

### Priority C — steal later

9. **Continuous Learning** (item 5) — automated instinct extraction
10. **Quality Gate** (item 12) — immediate post-edit validation
11. **JSON Schemas for Everything** (item 10) — validate all structured data
12. **Context Budget Awareness** (item 14) — proactive compaction suggestions
13. **MCP Health Monitoring** (item 13) — pre-call health checks
14. **Rust TUI Dashboard** (item 11) — live research session monitor

---

## Validation Notes

### What I actually validated

- Read: CLAUDE.md, AGENTS.md, package.json, EVALUATION.md, all hooks, all schemas, all manifests, contexts, key commands, key skills, ecc2 Cargo.toml
- Ran CI validators:
  - `node scripts/ci/validate-agents.js` → **28 agents validated**
  - `node scripts/ci/validate-skills.js` → **127 skills validated**
  - `node scripts/ci/validate-hooks.js` → **28 hook matchers validated**
- 3 parallel sub-agents explored: architecture/schemas/hooks, skills/commands/agents, testing/security/docs
- Re-ran the full test suite locally during the addendum pass

### Validation results

| Check | Result |
|-------|--------|
| Agent validation | 28/28 passed |
| Skill validation | 127/127 passed |
| Hook validation | 28/28 passed |
| Node syntax | All hook scripts parse clean |
| **Full test suite** | **1626/1634 passed (8 failures)** |

The failure set is mixed:
- one cluster is a real repo drift signal (`catalog.js` catches 126-vs-127 documentation mismatch)
- the rest are mostly Windows/symlink/permission-sensitive failures in utility and orchestration tests

That still confirms serious test infrastructure, but not a cleanly green repo.

---

## Bottom Line

Everything Claude Code is the largest and most feature-complete repo in our 7-repo audit. It's valuable not as a template to clone (too broad, too dev-focused) but as a **comprehensive infrastructure pattern library**.

The strongest patterns to borrow are:

- **Profiled installation** (items 1-2) — the most mature install/flag system of all 7 repos
- **Governance capture** (item 3) — audit trail for policy violations
- **Config protection** (item 6) — "fix the code, not the rules"
- **Context modes** (item 8) — behavioral switches per task type
- **Orchestration with handoffs** (item 7) — structured pipeline communication
- **Continuous learning** (item 5) — automated pattern extraction

The strongest warnings are:

- Don't copy the 127-skill catalog mentality
- Don't copy the breadth story as if every host surface were equally real
- Don't copy the general-developer framing
- Adapt pipelines for research (investigate/validate/synthesize), not development (feature/bugfix/refactor)

## Meta-Observation

ECC's deepest contribution is the idea of **profiled governance**. Not all sessions need the same level of oversight. An exploratory literature scan doesn't need strict schema validation. A final claim promotion does. The hook flag system makes this concrete: `minimal` for exploration, `standard` for analysis, `strict` for publication-ready work.

This maps perfectly onto our system: early exploration cycles can run with minimal governance (LAW 8: explore before exploit), while late validation cycles must run with strict governance (LAW 3: gates block, LAW 9: confounder harness mandatory).

The single biggest steal from this repo: **hook flag profiles**. One configuration file, conditional execution by profile, instant governance tuning without editing hook scripts.

---

## ADDENDUM — Deep Forensic Pass (Codex, 2026-03-29)

> This addendum is the second adversarial pass on ECC. It tightens factual claims from the first pass and adds the strongest patterns the first audit underweighted or missed.

---

### 15. Reversible Install Lifecycle Is More Important Than Profiles Alone

**Where found**

- `scripts/lib/install-lifecycle.js`
- `schemas/install-state.schema.json`
- `scripts/doctor.js`
- `scripts/repair.js`
- `scripts/uninstall.js`

**What it is**

ECC’s strongest install idea is not just “profiles/modules.” It is the full lifecycle:

- write durable install-state
- inspect what ECC owns
- diagnose drift from recorded operations
- repair from the recorded contract
- uninstall cleanly and selectively

That turns installation from a one-shot copy step into a governed, reversible substrate.

**Why it matters for Vibe Science**

If we ship outer-project assets around the kernel, they will drift. The critical pattern is:

- know exactly what was installed
- know what may be repaired automatically
- know what may be removed safely later

That is much more important than a pretty install profile table.

**Draft implementation for Vibe Science**

- Treat future outer-project install as lifecycle-managed, not copy-and-forget
- Record installed modules, generated files, merge operations, and ownership in durable install-state
- Support `doctor`, `repair`, and `uninstall` before chasing multi-host breadth

---

### 16. Capability Components Beat Coarse Profiles

**Where found**

- `manifests/install-components.json`
- `scripts/lib/install/request.js`
- `scripts/lib/install/config.js`
- `scripts/install-apply.js`

**What it is**

ECC has a second selection layer beyond profiles:

- user-facing components
- `--with` / `--without`
- schema-backed `ecc-install.json`

This is more composable than “core / developer / research / full” alone.

**Why it matters for Vibe Science**

Our future system needs to turn capabilities on and off independently:

- literature
- experiment
- review
- synthesis
- governance extras
- learning extras

That is a better fit than hardwiring a few broad profiles too early.

**Draft implementation for Vibe Science**

- Keep high-level profiles if useful, but build them from smaller capability bundles
- Support explicit enable/disable of bundles like `flow-literature`, `flow-experiment`, `r2-review`, `instinct-learning`, `memory-sync`
- Let project config declare selected bundles in a schema-backed file

---

### 17. Target Adapters Are the Right Multi-Host Pattern

**Where found**

- `scripts/lib/install-targets/registry.js`
- `scripts/lib/install-targets/helpers.js`
- `scripts/lib/install-targets/cursor-project.js`
- `scripts/lib/install-targets/antigravity-project.js`

**What it is**

ECC’s real reusable host pattern is adapterized target planning:

- one manifest surface
- one install intent model
- per-target planners for paths and landing semantics

**Why it matters for Vibe Science**

If we ever support more than one host surface, we should not fork the project conceptually. We should keep:

- one kernel/outer-project model
- thin per-host landing adapters

**Draft implementation for Vibe Science**

- Stay Claude-first now
- If a second host is ever earned, add a target adapter layer instead of reauthoring the whole asset tree

---

### 18. Canonical Session Snapshot Contract Is a Major Missing Pattern

**Where found**

- `docs/SESSION-ADAPTER-CONTRACT.md`
- `scripts/lib/session-adapters/registry.js`
- `scripts/lib/session-adapters/canonical-session.js`
- `scripts/lib/session-adapters/claude-history.js`
- `scripts/lib/session-adapters/dmux-tmux.js`

**What it is**

ECC defines a canonical `ecc.session.v1` snapshot so different session sources normalize into one inspection shape.

That is stronger than ad hoc “read this file / read that tmux pane” logic.

**Why it matters for Vibe Science**

We are already heading toward multiple session forms:

- solo research session
- R2 review session
- orchestrated multi-agent session
- future cloud/scheduled surfaces

One normalized snapshot contract would let status, dashboards, and future memory sync reason about all of them consistently.

**Draft implementation for Vibe Science**

- Define a canonical session snapshot for kernel + outer-project status
- Include: session metadata, active flows, pending reviews, artifacts, open risks, and last known governance state
- Use it for `/flow-status`, future dashboards, and cross-session inspection

---

### 19. The State Store’s Real Gift Is a Queryable Operator Surface

**Where found**

- `scripts/lib/state-store/index.js`
- `scripts/lib/state-store/queries.js`
- `scripts/status.js`
- `scripts/sessions-cli.js`

**What it is**

ECC does not just persist data. It gives operators query surfaces over that data:

- status snapshot
- session list/detail
- install health
- governance pending items

**Why it matters for Vibe Science**

The transferable pattern is not “build a TUI later.” It is:

- expose a queryable operational surface early
- do not bury state only in markdown and ad hoc DB reads

**Draft implementation for Vibe Science**

- Add a small operator-facing status surface over kernel + outer-project state
- Keep it projection-oriented and inspectable
- Favor CLI/status JSON before any rich UI

---

### 20. Scoped Learning Governance Is Better Than Naive “Instinct Extraction”

**Where found**

- `skills/continuous-learning-v2/SKILL.md`
- `skills/continuous-learning-v2/scripts/instinct-cli.py`
- `commands/learn-eval.md`

**What it is**

ECC’s learning system is stronger than the first audit described:

- project-scoped instincts
- controlled promotion between scopes
- TTL pruning
- manual adjudication (`Save / Improve / Absorb / Drop`)

**Why it matters for Vibe Science**

Scientific heuristics are dangerous if they:

- leak across unrelated projects
- persist forever
- promote themselves without review

**Draft implementation for Vibe Science**

- Make learned instincts scoped and reviewable
- Default to project-local scope
- Allow explicit promotion to broader reusable heuristics only after review
- Add decay and archival rules
- Add a curation step before instinct promotion

---

### 21. Observation Hygiene Is a First-Class Requirement

**Where found**

- `skills/continuous-learning-v2/hooks/observe.sh`

**What it is**

ECC’s observation layer includes practical hygiene the first pass underweighted:

- anti-self-observation guards
- cleanup of old observations
- secret scrubbing before persistence

**Why it matters for Vibe Science**

Without these protections, our system could:

- learn from its own automation noise
- recursively reinforce bad habits
- leak sensitive research text into memory

**Draft implementation for Vibe Science**

- Exclude self-generated control artifacts from learning
- scrub secrets and sensitive content before persistence
- expire low-value observation residue automatically

---

### 22. Governed Multi-Model Orchestration Matters More Than `/orchestrate` Prose

**Where found**

- `commands/multi-plan.md`
- `commands/multi-execute.md`
- `scripts/lib/tmux-worktree-orchestrator.js`
- `scripts/lib/orchestration-session.js`
- `skills/autonomous-loops/SKILL.md`

**What it is**

The deeper orchestration ideas in ECC are:

- code sovereignty and governed final writes
- worktree-based execution with coordination artifacts
- durable cross-iteration notes
- reviewer/author separation
- bounded autonomous loops

That is stronger than the first pass’s emphasis on markdown pipeline names alone.

**Why it matters for Vibe Science**

If we parallelize research seriously, we need:

- bounded loops
- explicit separation between authoring and reviewing branches
- governed final-write ownership

**Draft implementation for Vibe Science**

- Keep orchestrated research bounded by iteration/cost ceilings
- Separate authoring agents from review agents structurally
- Make final claim-writing ownership explicit
- Preserve cross-iteration notes as first-class artifacts

---

### 23. Primary-Source Retrieval Discipline Is Hidden in ECC’s Research Surfaces

**Where found**

- `.claude/research/everything-claude-code-research-playbook.md`
- `.codex/agents/docs-researcher.toml`
- `commands/docs.md`
- `skills/deep-research/SKILL.md`
- `skills/iterative-retrieval/SKILL.md`

**What it is**

ECC ships a stronger research discipline than the first pass gave it credit for:

- current-doc retrieval
- source/recency rules
- read-only docs verification
- iterative retrieval refinement

**Why it matters for Vibe Science**

The reusable pattern is not generic “research mode.” It is:

- primary-source-first retrieval
- freshness-aware retrieval
- iterative narrowing/refinement

**Draft implementation for Vibe Science**

- Strengthen literature and methods retrieval around primary-source discipline
- Make recency/freshness explicit when relevant
- Add iterative retrieval refinement to `/flow-literature` instead of one-shot searching

---

## Corrections To First Pass

- ECC’s reusable host pattern is adapterized planning, not a clean six-host parity story.
- `governance-capture.js` detects and emits governance events, but durable persistence is a separate layer and should not be treated as already end-to-end wired.
- Not every hook is profile-gated; some protections remain always-on. That is a better model for Vibe Science than making every safeguard optional.
- `evaluate-session.js` is a threshold stub, not the real learning engine. The real reusable pattern is `continuous-learning-v2`.
- The first pass overstated orchestration runtime completeness; part of the richness still lives in markdown guidance rather than hard execution contracts.
- Full-suite validation in this clone is **1626/1634 passed, 8 failed**, not `1628/1633` with 5 failures. The most important non-environmental failure is real catalog/documentation drift (`126` documented skills vs `127` actual).

---

## Updated Priority (post-addendum)

### Priority A+ — steal immediately

1. **Scoped learning governance** (items 20-21) — instincts must be local, reviewable, and hygienic
2. **Canonical session snapshot contract** (item 18) — one inspection surface for solo, review, and orchestrated sessions
3. **Operator query surface** (item 19) — status and session inspection before any fancy UI
4. **Install lifecycle + repair/uninstall** (item 15) — reversible governed installs

### Priority A — steal next

5. **Capability bundles over coarse profiles** (item 16) — finer-grained outer-system activation
6. **Target adapters** (item 17) — if a second host is ever earned, do it through planners
7. **Governed multi-model orchestration** (item 22) — bounded loops, author/reviewer separation
8. **Primary-source retrieval discipline** (item 23) — better literature/methods retrieval
