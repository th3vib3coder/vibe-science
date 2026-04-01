# Agent Lightning Forensic Audit

**Repo:** `https://github.com/microsoft/agent-lightning`
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\agent-lightning`
**Audit date:** 2026-03-30
**Auditor:** Claude Opus 4.6
**Goal:** extract concrete ideas, patterns, and anti-patterns for the Vibe Science Research Environment

---

## Quick X-Ray

- Repo shape: **agent training framework** from Microsoft Research — NOT an agent builder, but a training loop for existing agents. RL + Automatic Prompt Optimization with zero code changes
- Scale: 348 files, ~18 modules, arXiv paper (2508.03680), backed by MSR
- Stack: Python 3.10+, Pydantic, OpenTelemetry, vLLM (for RL), uv package manager
- Strongest themes: **rollout/attempt lifecycle**, **emitter-based span collection**, **LightningStore as central control-plane**, **versioned resources**, **framework-agnostic training**
- Critical distinction: AgentScope (audit 08) builds agents. Agent Lightning TRAINS them. Both are valuable but in different ways.
- Biggest warning: **this is a training framework, not an integrity system — adopt the lifecycle and observability patterns, not the RL pipeline**
- Maturity caveat from source: the control-plane contracts are strong, but backend completeness is uneven (`InMemoryLightningStore` is rich; `store/sqlite.py` is still `TODO`)

---

## Pass 1 — Useful Elements to Capture

### 1. Rollout/Attempt Lifecycle with Retry and Timeout

**Where found**

- `agentlightning/types/core.py` — Rollout, Attempt, RolloutConfig, RolloutStatus, AttemptStatus
- Pydantic BaseModel with rich status enums

**What it is**

A two-level execution model:

**Rollout** = a complete task execution attempt:
```python
RolloutStatus = Literal[
    "queuing",     # initial
    "preparing",   # trace claimed
    "running",     # first trace received
    "failed",      # crashed
    "succeeded",   # OK
    "cancelled",   # user/watchdog cancelled
    "requeuing",   # retrying
]
```

**Attempt** = a single try within a rollout (supports retries):
```python
AttemptStatus = Literal[
    "preparing", "running", "failed", "succeeded",
    "unresponsive",  # no heartbeat
    "timeout",       # still alive but too slow
]
```

**RolloutConfig** = retry policy:
- `timeout_seconds` — max execution time
- `unresponsive_seconds` — heartbeat timeout
- `max_attempts` — retry count (default 1)
- `retry_condition` — which statuses trigger retry

Each Attempt tracks: rollout_id, attempt_id, sequence_id, start/end time, status, worker_id, last_heartbeat_time.

**Why this matters for Vibe Science**

Our experiment manifests have a simple `planned → running → completed | failed | blocked` lifecycle. Agent Lightning's model is far richer:
- **Attempt tracking**: if an analysis fails, we know which attempt failed and why
- **Heartbeat**: detect hung/unresponsive analyses
- **Retry policy**: configurable retry count and conditions
- **Separate "unresponsive" from "timeout"**: agent still sending logs but too slow vs agent dead

**Draft implementation for Vibe Science**

- Add `attempts` array to experiment manifests: each analysis run gets its own attempt record
- Add heartbeat detection: if a flow command runs >N minutes without progress, mark as unresponsive
- Add retry configuration: max_attempts, timeout_seconds per experiment type
- Distinguish `failed` (crashed) from `timeout` (too slow) from `unresponsive` (hung)

---

### 2. Emitter Pattern for Structured Span Collection

**Where found**

- `agentlightning/emitter/` — emit_reward, emit_message, emit_exception, emit_annotation, emit_object
- `agentlightning/emitter/reward.py` — reward decorator and utility functions

**What it is**

Instead of explicit logging, Agent Lightning uses **emitters**: lightweight functions that create structured spans:

```python
import agentlightning as agl

agl.emit_reward(0.85, name="r2_approval")     # numeric reward
agl.emit_message(prompt, response)              # interaction record
agl.emit_exception(error)                       # failure record
agl.emit_annotation("phase", "confounder_harness")  # metadata marker
agl.emit_object("experiment_manifest", manifest_dict)  # structured data
```

Emitters work in two modes:
1. **propagate=True**: span sent to active tracer (live collection)
2. **propagate=False**: span creation request returned for later use

The `@reward` decorator turns a function into a reward emitter:
```python
@agl.reward
def check_confounder(raw, conditioned, matched):
    if sign_reversed(raw, matched): return 0.0  # ARTIFACT
    if collapse > 0.5: return 0.3               # CONFOUNDED
    return 1.0                                   # ROBUST
```

**Why this matters for Vibe Science**

Our spine logging uses `post-tool-use.js` to capture tool calls. Agent Lightning's emitter pattern is more flexible:
- `emit_reward()` could track R2 approval rates per claim
- `emit_annotation()` could tag spine entries without modifying the spine schema
- `emit_exception()` could capture gate failures with structured context
- The `@reward` decorator could wrap our confounder harness as a reward function

**Draft implementation for Vibe Science**

- Add domain-specific emitters to our flows:
  - `emitClaimEvent(claimId, eventType, metadata)` — structured claim lifecycle events
  - `emitGateResult(gateId, status, details)` — gate pass/fail with context
  - `emitR2Verdict(claimId, verdict, score)` — R2 review outcomes as structured spans
- Use emitters as the single collection point, replacing scattered DB writes

---

### 3. LightningStore as Central Coordination Hub

**Where found**

- `agentlightning/store/` — LightningStore (abstract), InMemoryLightningStore, CollectionBasedLightningStore, LightningStoreThreaded, Client/Server variants
- `agentlightning/store/collection/` — pluggable storage backends

**What it is**

A central store that coordinates between runners (agents), tracers (observers), and algorithms (optimizers):
- Stores rollouts, spans, resources, tasks
- Pluggable backends: in-memory, MongoDB, client/server (HTTP)
- Thread-safe variant for concurrent access
- Capabilities model: store declares what it supports

The store connects three loops:
1. **Runner** → produces rollouts with spans
2. **Store** → persists and indexes spans
3. **Algorithm** → reads spans, produces improved resources

Important caveat from direct source reading: this abstraction is stronger than every concrete backend underneath it. The in-memory implementation is substantial; the SQLite store is currently a placeholder. So the value to steal is the **contract**, not an assumption that all persistence adapters are production-complete.

**Why this matters for Vibe Science**

Our data flows through: hooks → SQLite → core-reader projections → flow commands. Agent Lightning centralizes this into a single store. The pattern is:
- Everything flows through ONE hub (not scattered writes to different tables)
- The hub has a capabilities model (what this store supports)
- The hub can be in-memory (dev), threaded (production), or client/server (distributed)

**Draft implementation for Vibe Science**

- Not immediate, but consider: a `ResearchStore` abstraction that unifies our spine, claims, citations, and governance events into a single query surface
- In-memory variant for tests, then a local durable backend that WE implement to our needs (likely SQLite-backed, but not by copying Agent Lightning's placeholder adapter)
- The store declares capabilities: "I can search claims", "I can list experiments", "I can check export eligibility"

---

### 4. Automatic Prompt Optimization (APO)

**Where found**

- `agentlightning/algorithm/apo/` — APO algorithm implementation

**What it is**

APO takes: a set of rollout traces (what the agent did) + rewards (how well it did) and produces: optimized prompts that improve agent behavior.

The process:
1. Run agent on tasks → collect traces + rewards
2. APO analyzes which prompts led to high/low rewards
3. APO generates improved prompt variants
4. Re-run agent with new prompts → measure improvement
5. Repeat until convergence

This is prompt tuning without model fine-tuning — it works with ANY closed-source model (GPT-4, Claude, etc.).

**Why this matters for Vibe Science**

We have many prompts: CLAUDE.md, roles.md, flow command shims, R2 protocol. Currently these are hand-tuned. APO could:
- Optimize our flow command prompts based on success rates
- Optimize R2 review prompts based on detection of known faults (SFI)
- Optimize the researcher's system prompt based on claim survival rates

The key insight: APO works with CLOSED models. We don't need access to model weights. We just need traces + rewards.

**Draft implementation for Vibe Science**

- Long-term (Phase 4+): define reward functions for our flows:
  - Literature flow reward: papers registered correctly / total papers attempted
  - Experiment flow reward: experiments that produce claims surviving R2
  - R2 flow reward: SFI detection rate
- Use APO to optimize prompt variants for each flow
- A/B test: original prompt vs APO-optimized prompt

---

### 5. Triplet Model (Prompt → Response → Reward)

**Where found**

- `agentlightning/types/core.py` — Triplet(BaseModel): prompt, response, reward, metadata

**What it is**

The fundamental data unit: every interaction is a (prompt, response, reward) triplet with metadata. This enables:
- RL training: triplets are training examples
- Analysis: which prompts produce which rewards?
- Debugging: trace back from a bad reward to its prompt

**Why this matters for Vibe Science**

Every claim interaction is naturally a triplet:
- Prompt: "analyze batch correction effect on C-014"
- Response: "sign reversal detected, OR drops from 2.30 to 0.45"
- Reward: 1.0 (ROBUST) or 0.0 (ARTIFACT)

Tracking triplets would enable us to analyze: which analysis prompts lead to claims that survive R2? Which prompts lead to artifacts?

**Draft implementation for Vibe Science**

- Tag spine entries with triplet structure: action (prompt), result (response), outcome (reward equivalent — claim survived or killed)
- Use triplet data for the auto-tuning mentioned in agentscope audit item 9

---

### 6. Instrumentation Layer (Framework-Agnostic Tracing)

**Where found**

- `agentlightning/instrumentation/` — framework-specific adapters
- `agentlightning/adapter/` — adapters for LangChain, AutoGen, OpenAI Agent SDK, etc.
- `agentlightning/tracer/` — OtelTracer, AgentOpsTracer, DummyTracer

**What it is**

Agent Lightning instruments EXISTING agent frameworks without modifying them. The instrumentation layer:
- Intercepts LLM calls at the API level (OpenAI client monkey-patching)
- Captures prompts, responses, tool calls, and errors as OTel spans
- Routes spans through pluggable tracers
- Works with: LangChain, AutoGen, CrewAI, OpenAI Agent SDK, plain OpenAI Python

**Why this matters for Vibe Science**

Our hooks intercept at the Claude Code level. Agent Lightning shows how to intercept at the LLM API level. This could enable:
- Capturing exact token usage per flow command (not estimated)
- Capturing exact model responses for replay/debugging
- Framework-independent tracing that works even if Claude Code hooks change

**Draft implementation for Vibe Science**

- Not immediate, but note: if we ever need to trace LLM interactions INSIDE our flow commands, the instrumentation pattern (API-level interception) is more reliable than prompt-level logging

---

### 7. Worker/Runner Architecture with Heartbeat

**Where found**

- `agentlightning/runner/` — Runner base class, worker management
- `agentlightning/types/core.py` — Worker, WorkerStatus

**What it is**

Workers execute rollouts. Each worker:
- Has a unique `worker_id`
- Reports status: preparing, running, failed, succeeded, unresponsive, timeout
- **Span-as-heartbeat**: NO separate heartbeat channel. Spans ARE heartbeats. First span = preparing→running. Each new span refreshes `last_heartbeat_time`. No span for N seconds = unresponsive. Zero overhead.
- Can be pooled, distributed, or single-threaded

The runner manages workers: assigns rollouts, monitors heartbeats, triggers retries on failure/timeout.

**Why this matters for Vibe Science**

When we run parallel exploration agents (LAW 8), each agent is essentially a "worker" executing a "rollout" (hypothesis investigation). Agent Lightning shows:
- How to track worker health (heartbeat)
- How to detect stale workers (unresponsive vs timeout)
- How to retry failed investigations

**Draft implementation for Vibe Science**

- When dispatching parallel exploration agents: assign worker_id, track heartbeat
- If a sub-agent goes silent for >5 minutes: mark unresponsive, consider retry
- Log all attempts per hypothesis investigation (not just final result)

---

### 8. Dataset as First-Class Type with Pagination

**Where found**

- `agentlightning/types/core.py` — Dataset, PaginatedResult, FilterOptions, SortOptions, FilterField

**What it is**

Datasets are not just lists. They support:
- Pagination (PaginatedResult with offset/limit)
- Filtering (FilterOptions with field-level predicates)
- Sorting (SortOptions with field + direction)

This enables efficient browsing of large result sets without loading everything into memory.

**Why this matters for Vibe Science**

Our `core-reader.js` projections return flat arrays. For a project with 100+ claims across 50 sessions, this becomes unwieldy. Agent Lightning's pagination pattern would let:
- `/flow-status` show "claims 1-20 of 87, sorted by confidence descending"
- `/flow-experiment` paginate experiment manifests
- Memory mirrors show recent N items, not everything

**Draft implementation for Vibe Science**

- Add `limit` and `offset` to core-reader projections (partially exists: `options.limit`)
- Add sort options: by confidence, by date, by status
- Add filter options: by status, by experiment, by claim ID

---

### 9. Versioned Resource Records with Stable Lookup

**Where found**

- `agentlightning/types/resources.py` — Resource, LLM, PromptTemplate, NamedResources, ResourcesUpdate

**What it is**

Resources (prompt templates, model configs) are versioned records with IDs and timestamps:
- `add_resources()` creates a new `resources_id`
- `start_rollout()` and `enqueue_rollout()` resolve the latest `resources_id` when none is provided
- `RolloutConfig` and metadata are deep-copied before persistence to avoid shared-reference leakage

Important caveat from direct source reading: the resource model is VERSIONED, but not fully immutable in the strict enterprise sense. `update_resources(resources_id, resources)` mutates the existing record and increments `version` on the same `resources_id`. So the repo provides stable addressing + versioning, not a hard append-only snapshot ledger.

**Why this matters for Vibe Science**

A `/flow-writing` session should see a consistent claim set. Agent Lightning suggests the right direction, but we should implement it more strictly than the repo does:
- snapshot the export set at flow start
- bind the flow to that snapshot explicitly
- warn on drift after the export completes

**Draft implementation for Vibe Science**

- Snapshot export-eligible claims at flow-writing start
- Run export against snapshot, not live projections
- Compare snapshot with current state after export → surface drift warnings
- Keep snapshots append-only on our side, even though Agent Lightning's `update_resources()` is mutable

---

### 10. Capabilities Declaration on Store

**Where found**

- `agentlightning/store/base.py` — `LightningStoreCapabilities`

**What it is**

Store declares: thread_safe, async_safe, zero_copy, otlp_traces. Consumers check before using features.

**Why this matters for Vibe Science**

Our reader returns `dbAvailable: boolean` but not what the DB CAN DO. A capabilities model would let flow commands check: "does this DB support FTS5?" before attempting a search.

**Draft implementation for Vibe Science**

- Add capabilities to core-reader: `{ claimSearch, fts5, citationChecks }`
- Flow commands check before assuming advanced features available

---

## ADDENDUM — Independent Deep Pass (Codex, 2026-03-30)

These findings come from direct source reading of the store, tracer, runner, emitter, and resource internals. They matter if we want enterprise substrate rather than just "RL vibes".

### 11. CollectionBasedLightningStore Is the Real Enterprise Asset

**Where found**

- `agentlightning/store/collection_based.py`

**What it is**

The strongest thing in this repo is not APO. It is the control-plane discipline in `CollectionBasedLightningStore`:
- labeled atomic contexts around storage operations
- `_with_collections_execute()` for commit + retry delegation
- `tracked()` decorator that emits latency/counter metrics tagged by public and private store methods
- explicit developer notes in the source on which internal method sequences must stay paired

That is serious control-plane engineering. It is the part of the repo that feels most enterprise.

**Why this matters for Vibe Science**

We still lack a canonical operator/query surface. This store design shows how to build one without turning the whole system into distributed theater:
- one contract surface
- observable public methods
- disciplined internal locking boundaries

**Draft implementation for Vibe Science**

- Build our future session/query surface as a contract first, implementation second
- Track query/command latency and status by method
- Keep write orchestration rules explicit in the code, not just in prose docs

---

### 12. Health Supervision Is Explicit and Better Than The Report Initially Said

**Where found**

- `agentlightning/store/utils.py`
- `agentlightning/store/collection_based.py`

**What it is**

There are two separate health semantics:
- `timeout`: too much wall-clock time since `attempt.start_time`
- `unresponsive`: no heartbeat/span for too long, or no heartbeat ever within the unresponsive window

`healthcheck_before` runs a debounced watchdog pass before selected public store methods, and unhealthy attempts propagate to rollout status via retry policy.

This is cleaner than a vague "heartbeat support" claim. The timing semantics are concrete.

**Why this matters for Vibe Science**

When we eventually run long experiments or multi-agent reviews, we should distinguish:
- dead
- slow but alive
- failed

That is operator-grade behavior.

**Draft implementation for Vibe Science**

- Give long-running experiment attempts both timeout and unresponsive thresholds
- Surface different remediation guidance for each case
- Treat health scans as first-class control-plane logic, not ad-hoc polling

---

### 13. ProxyLLM Encodes Attempt-Level Attribution At The Endpoint Layer

**Where found**

- `agentlightning/types/resources.py` — `ProxyLLM`

**What it is**

`ProxyLLM` is more interesting than the previous report made explicit:
- it discourages direct access to `.endpoint`
- it rewrites the base URL with `/rollout/{rollout_id}/attempt/{attempt_id}`
- it can bake an `AttemptedRollout` into a concrete `LLM` resource

This is an attribution pattern: the routing layer itself carries execution identity.

**Why this matters for Vibe Science**

We likely do not need proxy routing in V1. But the principle is valuable:
- bind expensive operations to a specific claim/export/experiment attempt
- make attribution part of the resource contract, not an afterthought in logs

That is useful for exports, reviewer packs, and expensive analysis runs.

---

### 14. The In-Memory Store Has Real Operational Ideas, Not Just Dev Convenience

**Where found**

- `agentlightning/store/memory.py`

**What it is**

The in-memory backend contains several serious operational patterns:
- capability declaration
- completion events for `wait_for_rollout`
- running-rollout cache
- span byte accounting
- eviction and safe-memory thresholds
- explicit refusal when spans for a rollout have been evicted

This is not just "toy dev storage". It treats observability data as a memory-pressure problem.

**Why this matters for Vibe Science**

If we start storing rich traces, review trajectories, or large experiment artifacts, memory pressure becomes real. The transferable lesson is:
- degrade honestly under pressure
- make eviction visible
- separate "data unavailable because absent" from "data unavailable because evicted"

---

### 15. Emitter Hygiene Is Better Framed As Telemetry Discipline

**Where found**

- `agentlightning/emitter/annotation.py`
- `agentlightning/emitter/reward.py`
- `agentlightning/emitter/message.py`

**What it is**

The emitter layer is not just syntactic sugar around logs:
- nested attributes are flattened
- attributes are sanitized before span creation
- emitters require an active tracer or fall back to a dummy tracer when propagation is disabled
- reward emitters support multi-dimensional rewards with a declared primary dimension

This is a telemetry discipline pattern: structured emission with hygiene rules.

**Why this matters for Vibe Science**

If we add claim/gate/review emitters, we should steal the discipline, not just the function names:
- normalize before persistence
- reject malformed structures early
- keep local-only emission possible for dry runs and tests

---

### 16. What This Repo Actually Gives Us Is A Better Control Plane, Not Better Agents

**Where found**

- `agentlightning/store/base.py`
- `agentlightning/runner/base.py`
- `agentlightning/tracer/base.py`

**What it is**

The enterprise takeaway is architectural:
- runner = executor
- tracer = observability spine
- store = coordination plane
- algorithm = optimizer

That decomposition is more valuable to us than the RL stack itself.

**Why this matters for Vibe Science**

Our broader system is moving toward autonomous research operations. What we still need most is not RL. It is a clearer control-plane boundary between:
- execution
- observation
- storage/query
- future optimization

Agent Lightning gives a very strong blueprint for that separation.

---

## Pass 2 — What Not to Copy

### 1. The RL training pipeline
Agent Lightning's core value is RL training with vLLM. We don't train models. Don't copy the training loop, loss functions, or gradient computation.

### 2. Framework-specific adapters
LangChain, AutoGen, CrewAI adapters are irrelevant — we're Claude Code native.

### 3. The vLLM/GPU infrastructure
Multi-GPU distributed training is not our domain.

### 4. The client/server HTTP store
Our SQLite + file-based approach is correct for V1. Don't add HTTP store complexity.

### 5. The Tinker/Atropos RL infrastructure
Advanced RL training infrastructure from Microsoft's internal tooling. Not applicable.

### 6. Any illusion that backend maturity is uniform
The store contract is mature. The backends are not equally mature. Do not copy the repo's marketing shape more than its actual implementation strength.

---

## Pass 3 — Recommended Adoption Priority

### Priority A — steal now (patterns, not code)

1. **Rollout/Attempt lifecycle** — richer experiment execution tracking with retry, heartbeat, timeout
2. **Emitter pattern** — structured span creation for claims, gates, reviews
3. **Triplet model** (prompt→response→reward) — natural fit for claim analysis tracking

### Priority B — steal for Phase 2-3

4. **LightningStore abstraction** — unified query surface for research data
5. **Pagination/filter/sort** on data projections
6. **Worker heartbeat (span-as-heartbeat)** — zero-overhead health monitoring
7. **Capabilities declaration** — store declares what it supports
8. **Versioned resource binding with explicit snapshots on our side** — consistent claim sets during export sessions

### Priority C — steal if ever needed

9. **APO (Automatic Prompt Optimization)** — optimize flow prompts from success metrics
10. **API-level instrumentation** — capture exact LLM interactions per flow
11. **Dataset as first-class type** — typed collections with query support

---

## Validation Notes

- Read directly in this independent pass: README.md, `types/core.py`, `types/resources.py`, `types/tracer.py`, `store/base.py`, `store/collection_based.py`, `store/utils.py`, `store/memory.py`, `store/sqlite.py`, `runner/base.py`, `runner/agent.py`, `tracer/base.py`, `emitter/annotation.py`, `emitter/reward.py`, `emitter/message.py`
- Earlier parallel exploration existed, but the addendum and corrections above are grounded in direct source reads from this pass
- Did NOT run tests (requires uv + GPU dependencies)
- Verified architecture from source code and arXiv paper reference

---

## Bottom Line

Agent Lightning is fundamentally different from all previous repos audited. It's not about building or configuring agents — it's about **training agents with reinforcement learning**. The core insight is: agent behavior can be OPTIMIZED empirically by collecting traces and computing rewards.

For Vibe Science, the directly useful patterns are:
- **Rollout/Attempt lifecycle** with retry, heartbeat, and timeout — maps to experiment execution tracking
- **Emitter pattern** for structured span creation with attribute hygiene — cleaner than scattered DB writes
- **Triplet model** (prompt→response→reward) — natural for claim tracking (analysis→result→R2 verdict)
- **Store / runner / tracer separation** as the control-plane decomposition we still need

The most important correction from this deep pass is that the repo's strongest gift to us is **control-plane architecture**, not RL. Its best ideas are the lifecycle contract, watchdog semantics, telemetry discipline, capability declaration, and query surface patterns. Its backend maturity is uneven, so we should steal the abstractions and reimplement them to our own standard rather than assuming the concrete adapters are already the gold standard.

The strongest warning: don't import the RL training pipeline. We don't train models. But the OBSERVABILITY patterns (how to collect, structure, and analyze agent behavior) are production-grade and directly applicable.

**Compared to AgentScope (audit 08):** AgentScope builds agents. Agent Lightning trains them. Both contribute: AgentScope for memory/planning/evaluation patterns, Agent Lightning for lifecycle/tracing/optimization patterns. Together they cover the full agent lifecycle: build → observe → improve.
