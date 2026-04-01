# Strix Forensic Audit

**Repo:** `https://github.com/usestrix/strix`  
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\strix`  
**Audit date:** 2026-03-29  
**Goal:** extract concrete ideas, patterns, and anti-patterns that can improve the evolution around the Vibe Science kernel

---

## Quick X-Ray

- repo shape: Python CLI/TUI multi-agent security runtime with Docker sandboxing, XML-described tools, markdown skill packs, telemetry/event logging, and CI/CD-oriented scan modes
- strongest theme: **a real runtime with real artifacts beats chat-only agent theater**
- strongest reusable ideas: **supervisor/worker separation, unified target abstraction, run artifact ladder, evidence-gated reporting schema, selective skill loading, and event/render separation**
- biggest risk: **shared mutable runtime state and permissive sandbox assumptions are much weaker than the product surface suggests**
- biggest warning for us: **borrow the orchestration and artifact discipline, not the security/runtime shortcuts**

---

## Pass 1 - Useful Elements To Capture

### 1. Supervisor/worker split behind one tool-execution boundary

**Where found**

- `strix/tools/executor.py`
- `strix/runtime/tool_server.py`
- `strix/runtime/docker_runtime.py`
- `tests/tools/test_tool_registration_modes.py`

**Why it matters for Vibe Science**

- Strix has a clean conceptual split:
  - the main process plans and orchestrates
  - effectful tools run through one execution boundary
  - sandbox-only tools and supervisor-only tools are registered separately
- That is one of the most reusable architectural cuts in the repo.
- For us, this reinforces a good future direction: the Flow Engine should remain an orchestrator, while expensive or risky execution surfaces stay behind explicit adapters.

**Draft Vibe Science implementation**

- Keep Flow Engine logic outer-project side.
- Put effectful execution helpers behind thin, explicit boundaries:
  - reader/CLI bridge for kernel projections
  - later, execution helpers for experiment packaging or remote automation
- Preserve one clear contract for “plan here, execute there.”

---

### 2. Unified target abstraction is stronger than ad hoc per-mode workflows

**Where found**

- `strix/interface/main.py`
- `strix/interface/utils.py`
- `strix/agents/StrixAgent/strix_agent.py`

**Why it matters for Vibe Science**

- Strix treats repositories, local code, URLs, domains, and IPs as variations of one target model.
- That keeps the orchestration layer from splintering into one-off codepaths too early.
- We have the same pressure coming:
  - repos
  - datasets
  - notebooks
  - paper collections
  - maybe later live services or remote jobs

**Draft Vibe Science implementation**

- Introduce a small canonical “research target” concept later, rather than letting each flow invent its own target vocabulary.
- Let the target carry:
  - kind
  - source path or identifier
  - local workspace binding
  - trust/ownership metadata if needed

---

### 3. Run artifact ladder is one of the best ideas in the repo

**Where found**

- `strix/interface/cli.py`
- `strix/telemetry/tracer.py`
- `strix/interface/utils.py`

**Why it matters for Vibe Science**

- Strix makes each run materialize into an explicit folder with:
  - event stream
  - per-finding markdown
  - CSV index
  - final report
- This is excellent operational hygiene.
- It fits our own values almost perfectly: inspectable artifacts, post-hoc review, and no hidden “the model kind of did work” state.

**Draft Vibe Science implementation**

- Keep every meaningful future outer-project run materialized under a stable per-run directory.
- A Vibe Science run should eventually produce some combination of:
  - flow state snapshot
  - event log
  - generated artifacts
  - review/handoff outputs
  - summary index

---

### 4. Evidence-gated report schema is worth stealing

**Where found**

- `strix/tools/reporting/reporting_actions.py`
- `strix/interface/utils.py`
- `strix/telemetry/tracer.py`

**Why it matters for Vibe Science**

- Strix’s reporting path is not just “write some markdown.”
- It validates structure, requires critical fields, computes severity metadata, and deduplicates before persistence.
- This is exactly the kind of discipline that prevents sloppy output surfaces.

**Draft Vibe Science implementation**

- Reuse this idea for our own structured outer outputs:
  - experiment conclusions
  - writing handoff claims
  - remediation/revision suggestions
  - export-eligibility justification bundles
- Require explicit fields instead of freeform narrative only.

---

### 5. Skills as selective markdown knowledge packs is genuinely useful

**Where found**

- `strix/skills/README.md`
- `strix/skills/__init__.py`
- `strix/tools/load_skill/load_skill_actions.py`
- `strix/llm/llm.py`

**Why it matters for Vibe Science**

- This is one of the repo’s best reusable concepts:
  - domain knowledge lives in markdown packs
  - packs are loaded selectively
  - they enrich the agent only when needed
- For us this maps cleanly to domain packs, protocol packs, assay heuristics, instrument playbooks, or writing conventions.

**Draft Vibe Science implementation**

- Keep future domain packs as explicit, file-backed knowledge assets.
- Load them selectively at flow boundaries instead of bloating the always-on context.
- Add version/provenance metadata earlier than Strix does.

---

### 6. Event/render separation is better than coupling UI to agent internals

**Where found**

- `strix/interface/streaming_parser.py`
- `strix/interface/tool_components/registry.py`
- `strix/interface/tool_components/reporting_renderer.py`
- `strix/interface/tool_components/agents_graph_renderer.py`

**Why it matters for Vibe Science**

- The Strix UI layer does not need to know every implementation detail of the runtime.
- It mostly consumes parsed tool/agent events and renders them through components.
- That is a good pattern for any future research workbench or dashboard around Vibe Science.

**Draft Vibe Science implementation**

- If we build richer visual surfaces later, keep them event-fed:
  - flow events
  - review events
  - artifact events
  - run summaries
- Avoid coupling UI code directly to every runtime helper or DB query.

---

### 7. Small explicit agent state beats vague agent magic

**Where found**

- `strix/agents/state.py`
- `strix/agents/base_agent.py`
- `strix/tools/finish/finish_actions.py`

**Why it matters for Vibe Science**

- `AgentState` is intentionally compact:
  - task
  - iteration
  - waiting/completion flags
  - errors
  - message history
  - lightweight context
- That simplicity is a feature.
- It shows how much coordination clarity you can get before introducing a database or workflow engine.

**Draft Vibe Science implementation**

- Keep any first orchestration state object small and explicit.
- Separate:
  - flow progression state
  - run/execution state
  - artifact truth
- Do not let one “state blob” become a dumping ground.

---

### 8. Telemetry redaction and event sanitation are more mature than average

**Where found**

- `strix/telemetry/README.md`
- `strix/telemetry/tracer.py`
- `strix/telemetry/utils.py`

**Why it matters for Vibe Science**

- Strix’s telemetry posture is imperfect overall, but one piece is strong:
  - sanitize before emitting
  - keep a local event trail
  - isolate actor/payload/error/event concepts
- That is useful for any future audit trail or operator review surface we add.

**Draft Vibe Science implementation**

- If we emit flow telemetry later, build sanitization in from the start.
- Keep local audit artifacts first-class.
- Treat redaction policy as architecture, not polish.

---

### 9. Scan-mode taxonomy is a good pattern for effort-tiered workflows

**Where found**

- `docs/usage/scan-modes.mdx`
- `README.md`
- `strix/interface/main.py`

**Why it matters for Vibe Science**

- `quick / standard / deep` is simple, memorable, and operationally useful.
- The deeper lesson is not about security scanning specifically.
- It is about expressing effort-budget and coverage-budget in product language the operator can actually use.

**Draft Vibe Science implementation**

- Consider similar effort tiers later for outer flows that can become expensive:
  - quick orientation
  - standard structured pass
  - deep review or export-prep

---

## Pass 2 - What Not To Copy Blindly

### 1. Do not copy the in-memory global agent graph as a durable architecture

**Where found**

- `strix/tools/agents_graph/agents_graph_actions.py`
- `strix/agents/base_agent.py`

**Why it is risky**

- Delegation, messages, instances, and graph nodes live in process globals.
- That is fast and pragmatic, but it is not durable, replayable, or concurrency-safe enough for a serious research system.

**Vibe Science stance**

- Borrow the hierarchy idea, not the singleton-global implementation.

---

### 2. Do not copy prompt-heavy governance where stronger invariants are needed

**Where found**

- `strix/agents/StrixAgent/system_prompt.jinja`
- `strix/skills/coordination/root_agent.md`
- `strix/agents/StrixAgent/strix_agent.py`

**Why it is risky**

- Too much of the coordination policy lives in prompts and markdown instructions.
- That is fine for exploratory security work.
- It is not enough for our integrity-sensitive research workflows, where provenance and gating matter more.

**Vibe Science stance**

- Use prompt assets to shape behavior, but keep critical invariants in contracts, artifacts, and code.

---

### 3. Do not copy the mutable shared workspace model for parallel agents

**Where found**

- `strix/runtime/docker_runtime.py`
- `strix/tools/proxy/proxy_manager.py`
- `strix/agents/StrixAgent/system_prompt.jinja`

**Why it is risky**

- All agents effectively share one container, one workspace, and other mutable process-level surfaces.
- That helps speed, but it hurts isolation, blame assignment, and reproducibility.

**Vibe Science stance**

- For research work, shared mutable state should be explicit and rare.
- Prefer isolating per-run or per-worktree artifacts where reproducibility matters.

---

### 4. Do not copy memory compression that rewrites evidence-bearing history

**Where found**

- `strix/llm/memory_compressor.py`
- `strix/llm/llm.py`

**Why it is risky**

- Strix summarizes older history into model-generated compression objects.
- That is operationally useful, but dangerous for a scientific system because it mutates the evidence trail.

**Vibe Science stance**

- If we compress context later, keep the original evidence durable and separately addressable.
- Never let compressed summaries silently replace provenance.

---

### 5. Do not copy permissive sandbox assumptions

**Where found**

- `containers/Dockerfile`
- `containers/docker-entrypoint.sh`
- `strix/runtime/docker_runtime.py`
- `docs/tools/proxy.mdx`

**Why it is risky**

- The sandbox is not really a hard trust boundary:
  - passwordless sudo
  - added network capabilities
  - guest-access Caido
  - services bound to `0.0.0.0`
- This is acceptable for a pentesting tool in some contexts.
- It would be the wrong mental model for us.

**Vibe Science stance**

- Never let “containerized” be shorthand for “safe enough.”
- Explicitly separate convenience isolation from strong trust isolation.

---

### 6. Do not copy supply-chain drift and latest-without-verification installs

**Where found**

- `scripts/install.sh`
- `containers/Dockerfile`
- `benchmarks/README.md`

**Why it is risky**

- The install path resolves latest releases without verification.
- The container build pulls mutable upstream tools and latest tags.
- Benchmark claims are partly externalized and lag the shipped version.

**Vibe Science stance**

- If we publish installs or benchmark claims later, make them replayable and version-tied.

---

### 7. Do not copy destructive installer behavior

**Where found**

- `scripts/install.sh`

**Why it is risky**

- The installer removes other `strix` binaries it finds on `PATH`.
- That is too aggressive for a developer toolchain.

**Vibe Science stance**

- If we ever ship installers, they must be additive, reversible, and minimally surprising.

---

### 8. Do not copy ephemeral notes as if they were durable knowledge

**Where found**

- `strix/tools/notes/notes_actions.py`

**Why it is risky**

- Notes are process-local memory in a Python dict.
- Useful for one session, but not real project memory.

**Vibe Science stance**

- Our memory surfaces must be file-backed or otherwise durable and inspectable.

---

### 9. Do not copy placeholder-heavy docs/product surfaces

**Where found**

- `strix/skills/README.md`
- `strix/skills/cloud/.gitkeep`
- `strix/skills/reconnaissance/.gitkeep`
- `strix/skills/custom/.gitkeep`
- `docs/integrations/github-actions.mdx`
- `README.md`

**Why it is risky**

- The docs advertise broader capability than the checkout actually contains.
- That weakens trust and makes architectural reading noisier.

**Vibe Science stance**

- Keep spec and repo surface brutally aligned.
- Placeholder areas should be labeled as empty, not narrated as fully present.

---

### 10. Do not hide network I/O inside target parsing

**Where found**

- `strix/interface/utils.py`

**Why it is risky**

- Target classification does network probes to decide “repo or web app.”
- Clever, but surprising.
- Hidden side effects in parsing logic are a bad fit for predictable research tooling.

**Vibe Science stance**

- Parsing/normalization should be explicit and side-effect-light.

---

### 11. Do not ignore Windows line-ending breakage in shell-distributed repos

**Where found**

- `scripts/install.sh`
- `containers/docker-entrypoint.sh`
- observed local `bash -n` validation on Windows checkout

**Why it is risky**

- In this environment, both shell scripts fail `bash -n` because they were checked out with CRLF line endings.
- That means the repo’s shell-distributed surface is less portable in practice than the polished install story suggests.

**Vibe Science stance**

- If we distribute shell assets, line ending policy and platform validation must be part of the release discipline.

---

## Pass 3 - Recommended Adoption Order For Vibe Science

### 1. Adopt soon at the architecture layer

- supervisor/worker boundary for effectful tools
- unified target abstraction
- small explicit run/agent state
- event/render separation

### 2. Adopt next at the artifact layer

- per-run artifact directories
- local event stream logging
- structured report schemas with validation
- audit-friendly output materialization

### 3. Adopt next at the knowledge layer

- selective markdown knowledge packs
- explicit loading of domain packs only when needed
- redaction-aware telemetry/event sanitation

### 4. Consider later, carefully

- effort-tiered flow modes
- richer runtime tracing for operator review
- stronger typed capability contracts for domain packs

### 5. Explicitly reject for now

- process-global orchestration state as architecture
- evidence-destroying memory compression
- shared mutable multi-agent workspaces
- permissive “sandbox means safe” assumptions
- destructive installer behavior

---

## Validation Notes

### What I actually validated

- read the main runtime, CLI, TUI, config, telemetry, tool registry, reporting, sandbox, proxy, benchmark, and docs surfaces
- read concrete skill-loading, notes, and agent-state code
- used three parallel sub-audits for:
  - architecture/runtime
  - workflow/product/docs
  - security/test/maintainability

### Executed results

- `python -m compileall strix`: passed
- `python -m pytest tests/tools/test_load_skill_tool.py tests/tools/test_tool_registration_modes.py tests/config/test_config_telemetry.py -q -o addopts=''`: failed during collection
  - reason: missing dependencies in this environment, starting with `opentelemetry`
- `poetry --version`: unavailable in this environment
- `bash -n scripts/install.sh`: failed on this Windows checkout because of CRLF line endings
- `bash -n containers/docker-entrypoint.sh`: failed on this Windows checkout because of CRLF line endings

### What that means

- this is a real runtime repo, not a fake prompt pack
- the Python source surface at least compiles cleanly
- but the local test story is not self-contained outside its managed environment
- and the shell-distributed installer/runtime surface is less Windows-robust than the polished product story suggests

---

## Bottom Line

Strix is valuable to us mainly as a **runtime/orchestration repo with strong artifact discipline**, not as a trust model or sandbox model to imitate.

The strongest things to borrow are:

- supervisor/worker separation
- unified target modeling
- run artifact materialization
- structured evidence-gated reporting
- selective skill packs
- UI/event decoupling
- telemetry sanitation patterns

The strongest things to avoid are:

- global in-memory orchestration state
- prompt-only governance for critical boundaries
- mutable history compression
- shared mutable agent workspaces
- permissive sandbox assumptions
- destructive install behavior
- benchmark or product claims that outrun replayable local proof

If we borrow selectively, `strix` can strengthen the **runtime backbone and artifact rigor** of the Vibe Science outer project without importing unsafe execution assumptions or weak provenance habits.

---

## ADDENDUM — Deep Forensic Pass (Opus 4.6, 2026-03-29)

> What follows was found by reading all Python source files line-by-line,
> all XML tool schemas, all skill files, and the full telemetry/tracing system.
> Two parallel sub-agents explored runtime/tools and skills/config/telemetry.

---

### 11. XML-Based Tool Schema System with Dynamic Content Injection

**Where found**

- `strix/tools/registry.py` — `_load_xml_schema()`, `_process_dynamic_content()`
- 10 XML schema files: `reporting_actions_schema.xml`, `agents_graph_actions_schema.xml`, `browser_actions_schema.xml`, `file_edit_actions_schema.xml`, `finish_actions_schema.xml`, `load_skill_actions_schema.xml`, `notes_actions_schema.xml`, `proxy_actions_schema.xml`, `python_actions_schema.xml`, `terminal_actions_schema.xml`
- Uses `defusedxml` for safe XML parsing

**What it is**

Tools are defined in separate XML files, not inline in code. Each schema defines: name, description, parameters (with types, required flags, descriptions), return types, and examples. The registry loads schemas at import time, parsing XML with `defusedxml` (protection against XML injection attacks).

Dynamic content injection: `{{DYNAMIC_SKILLS_DESCRIPTION}}` in a schema is replaced at load time with the current list of available skills. This means tool descriptions adapt to what's installed.

**Why this matters for Vibe Science**

Our tools (hooks) are defined in JSON (`hooks.json`). The XML schema pattern is more expressive: each tool can have rich descriptions, examples, and parameter validation rules. The dynamic injection pattern is the most interesting part: our tool descriptions could include dynamic content like "available flows: /flow-literature, /flow-experiment" generated from the actual installed flows.

**Draft implementation for Vibe Science**

- Not XML necessarily, but the principle: tool/flow schemas as separate, validatable files with dynamic content injection
- When our flows change, tool descriptions should auto-update to reflect available options

---

### 12. Pydantic AgentState with Execution Lifecycle Methods

**Where found**

- `strix/agents/state.py` — `AgentState(BaseModel)`, 173 lines

**What it is**

A Pydantic BaseModel tracking the full agent lifecycle:

| Field | Purpose |
|-------|---------|
| `agent_id` | UUID-based unique ID |
| `parent_id` | Parent agent (for delegation hierarchy) |
| `sandbox_id`, `sandbox_token`, `sandbox_info` | Sandbox binding |
| `task` | Current task string |
| `iteration` / `max_iterations` (300) | Iteration budget |
| `completed`, `stop_requested`, `waiting_for_input` | Lifecycle flags |
| `messages`, `context` | Conversation state |
| `actions_taken`, `observations` | Timestamped execution log |
| `errors` | Error history with iteration numbers |

Key methods:
- `is_approaching_max_iterations(threshold=0.85)` — warns at 85% of budget
- `has_empty_last_messages(count=3)` — detects agent stuck in empty output loop
- `enter_waiting_state(llm_failed=False)` / `resume_from_waiting(new_task)` — pause/resume
- `get_execution_summary()` — structured dict for reporting

**Why this matters for Vibe Science**

Our session state lives across STATE.md, the DB, and in-memory context. The Pydantic model approach gives: type safety, validation, serialization for free, and clear lifecycle methods. The `is_approaching_max_iterations` method is directly useful: warn the researcher when they're about to hit a cycle budget.

The `actions_taken` + `observations` separation maps to our SPINE concept: actions are what the agent did, observations are what it found.

**Draft implementation for Vibe Science**

- Consider a Pydantic `CycleState` model for our cycle tracking:
  ```python
  class CycleState(BaseModel):
      cycle_id: str
      hypothesis: str
      iteration: int
      max_iterations: int = 50
      claims_produced: list[str]
      claims_killed: list[str]
      r2_reviews_pending: list[str]
      status: Literal["active", "paused", "completed", "blocked"]
  ```
- Add `is_approaching_budget()` check in our PostToolUse hook

---

### 13. Two-Mode Tool Execution (Local vs Sandbox via HTTP)

**Where found**

- `strix/tools/executor.py` — `execute_tool()`, `_execute_tool_in_sandbox()`, `_execute_tool_locally()`
- `strix/runtime/tool_server.py` — HTTP server inside Docker container
- `strix/runtime/docker_runtime.py` — container lifecycle

**What it is**

Each tool call goes through `execute_tool()` which checks `should_execute_in_sandbox(tool_name)`:
- **Local**: call the Python function directly
- **Sandbox**: send HTTP POST to `{sandbox_url}/execute` with bearer token auth, tool name, and kwargs as JSON

The sandbox tool server runs inside Docker. Communication is: JSON payload → HTTP → execution inside container → JSON response. Timeouts: 120s server-side + 30s buffer client-side.

Error handling is precise: 401 = auth failure, other HTTP errors = runtime error, request errors (network) = separate error class.

**Why this matters for Vibe Science**

If we ever need to run untrusted analysis code (user-provided scripts, external datasets), the two-mode execution pattern provides a clean boundary: safe operations run locally, risky operations run in a sandbox via HTTP.

**Draft implementation for Vibe Science**

- Define `should_execute_in_sandbox()` for our tools:
  - Bash commands with user-provided data → sandbox
  - Read-only operations on .vibe-science/ → local
  - Schema validation → local
- The HTTP boundary means sandbox failures can't crash the orchestrator

---

### 14. Structured Vulnerability Report Schema with Code Location Fixes

**Where found**

- `strix/tools/reporting/reporting_actions_schema.xml` — 371 lines, extremely detailed
- `strix/tools/reporting/reporting_actions.py` — CVSS parsing, code location validation, path traversal prevention

**What it is**

The most structured output format in any of the 6 repos audited. Each finding requires:
- **Title**, **description**, **impact**, **target** (all required)
- **Technical analysis** (root cause mechanism)
- **PoC description** + **PoC script code** (both required)
- **Remediation steps** (required)
- **CVSS 3.1 breakdown** (all 8 metrics, as nested XML)
- **Code locations** with: file (relative only), start_line, end_line, snippet, label, **fix_before** (verbatim original), **fix_after** (replacement)
- **Automatic LLM-based deduplication** — duplicates are rejected with confidence score

Code location validation:
- `_validate_file_path()`: rejects absolute paths and `..` traversal
- `_validate_code_locations()`: positive start_line, end_line >= start_line

The fix_before/fix_after system is designed for direct PR suggestion blocks: the fix literally replaces lines start_line through end_line.

**Why this matters for Vibe Science**

This is the most transferable pattern in strix. Our claims should have this level of structure:

| Strix field | Vibe Science equivalent |
|------------|----------------------|
| title | Claim title |
| description | Claim description |
| technical_analysis | Analysis method + rationale |
| cvss_breakdown | Confidence breakdown (statistical components) |
| code_locations + fix | Evidence chain (file:line references) |
| deduplication | Claim dedup across sessions |

The path validation (no absolute, no traversal) directly applies to our evidence file references.

**Draft implementation for Vibe Science**

- Add structured claim schema with required fields:
  ```
  claim_id, title, description, evidence_method, confidence_breakdown,
  confounder_status, evidence_locations: [{file, line, snippet}],
  supporting_figures: [{path, caption}]
  ```
- Add file path validation for evidence references
- Add LLM-based claim deduplication across sessions

---

### 15. Skill System with Category Discovery and Max-5 Enforcement

**Where found**

- `strix/skills/__init__.py` — `get_available_skills()`, `validate_skill_names()`, `load_skills()`, `validate_requested_skills()`

**What it is**

Skills live in `skills/{category}/{name}.md`. The system:
1. Discovers categories by scanning directory structure
2. Excludes internal categories (`scan_modes`, `coordination`)
3. Validates skill names against available set
4. **Enforces max 5 skills per agent** — prevents context bloat
5. Strips YAML frontmatter before injection
6. Generates dynamic tool descriptions from available skills

The max-5 limit is the key insight: even with 20+ available skills, an agent gets at most 5 per run. This forces the orchestrator to select the RIGHT skills, not dump everything.

**Why this matters for Vibe Science**

Our system loads all protocols into the agent context. With 21 protocol files, this bloats the context window. A max-N selection pattern would force the orchestrator to load only the relevant protocols for the current cycle.

**Draft implementation for Vibe Science**

- Add selective protocol loading: max 5 protocols per cycle, selected based on the current flow stage
- Literature flow → load: literature protocol, evidence protocol, citation protocol
- Experiment flow → load: experiment protocol, confounder protocol, stats protocol
- R2 review → load: review protocol, falsification protocol, gate protocol

---

### 16. OpenTelemetry Tracer with JSONL Event Streaming

**Where found**

- `strix/telemetry/tracer.py` — `Tracer` class, ~80 lines visible
- `strix/telemetry/utils.py` — sanitization, JSONL helpers

**What it is**

A run-level tracer that tracks:
- Agents (registered by ID)
- Tool executions (sequential ID counter)
- Chat messages
- Streaming content and interrupted content
- Vulnerability reports
- Scan results and configuration
- Run metadata (ID, name, start/end time, targets, status)

Events are written to JSONL files (local-first). OpenTelemetry integration via Traceloop SDK for remote tracing when configured. Thread-safe via write locks.

**Why this matters for Vibe Science**

Our spine system is append-only markdown. A JSONL event stream would be more machine-parseable and could support: replay, analytics, pattern detection across sessions. The sequential execution ID pattern (each tool call gets a monotonic ID) makes ordering unambiguous.

**Draft implementation for Vibe Science**

- Add a JSONL event stream alongside our spine markdown:
  - Each tool call → `{"type": "tool", "id": N, "name": "...", "timestamp": "...", "duration_ms": N}`
  - Each claim produced → `{"type": "claim", "id": "C001", "confidence": 0.7, "timestamp": "..."}`
  - Each R2 review → `{"type": "review", "claim_id": "C001", "verdict": "PASS/FAIL", "timestamp": "..."}`
- Keep the markdown spine for human readability, add JSONL for machine analysis

---

### 17. Domain-Specific Memory Compression (Preserving Security Context)

**Where found**

- `strix/llm/memory_compressor.py` — `SUMMARY_PROMPT_TEMPLATE`, compression logic

**What it is**

A compression template tailored to the security domain. Critical elements to preserve:
- Discovered vulnerabilities and attack vectors
- Scan results (compressed but key findings intact)
- Access credentials and authentication details found
- System architecture insights
- **Failed attempts and dead ends** (to avoid duplication)
- Decisions about testing approach

MAX_TOTAL_TOKENS = 100,000. MIN_RECENT_MESSAGES = 15.

The key insight Codex missed: **"Failed attempts and dead ends (to avoid duplication)"** is explicitly preserved. This prevents the compressed agent from re-trying approaches that already failed.

**Why this matters for Vibe Science**

Our compression should preserve: killed claims (so the agent doesn't re-investigate), failed hypotheses (so it doesn't repeat), confounder results (so it doesn't re-run harnesses), and R2 feedback (so it doesn't make the same mistakes).

**Draft implementation for Vibe Science**

- Add domain-specific preservation rules to our PreCompact summary:
  ```
  CRITICAL TO PRESERVE:
  - Killed claims with kill reason (avoid re-investigation)
  - Failed hypotheses with evidence of failure
  - Confounder harness results (raw → conditioned → matched outcomes)
  - R2 feedback patterns (what R2 objected to and why)
  - Decisions about analysis approach changes
  ```

---

## Updated Adoption Priority (post-addendum)

### Priority A+ — steal immediately (new items)

1. **Structured Report Schema with Code Location Validation** (item 14) — most transferable to claim schema
2. **Domain-Specific Compression Rules** (item 17) — preserve killed claims and failed approaches
3. **Max-5 Selective Skill Loading** (item 15) — prevent context bloat from protocol loading

### Priority A (confirmed from original audit)

4. Supervisor/worker boundary
5. Run artifact ladder
6. Evidence-gated reporting
7. Event/render separation

### Priority B+ — steal when building infrastructure (new items)

8. **Pydantic AgentState** (item 12) — typed cycle state with lifecycle methods
9. **JSONL Event Streaming** (item 16) — machine-parseable audit trail
10. **Two-Mode Execution** (item 13) — local vs sandbox routing
11. **Dynamic Content Injection in Tool Schemas** (item 11) — auto-updating descriptions

### Priority C

12. Effort-tiered flow modes
13. Telemetry sanitization
14. Unified target abstraction

---

## Meta-Observation

Strix's deepest contribution is not about security scanning. It's about **structured output discipline**.

The reporting schema (item 14) is the most precisely specified output format in any of the 6 repos audited. Every finding requires: title, description, impact, technical analysis, proof of concept, remediation, CVSS breakdown, and code locations with fix_before/fix_after. This isn't a template — it's an enforceable contract with validation.

Our claims currently require: claim_id, evidence chain, confidence, and confounder_status. But we don't require: structured impact assessment, analysis method documentation, specific file:line evidence locations, or fix/remediation proposals. Strix shows what it looks like when output structure is enforced at the tool level, not just in prose instructions.

The max-5 skill selection pattern is the second biggest insight. We have 21 protocol files. Loading all of them into every agent is wasteful. Forcing the orchestrator to pick the 5 most relevant protocols per cycle would both save tokens and force better flow routing.
