# AgentScope Forensic Audit

**Repo:** `https://github.com/agentscope-ai/agentscope`
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\agentscope`
**Audit date:** 2026-03-30
**Auditor:** Claude Opus 4.6
**Goal:** extract concrete ideas, patterns, and anti-patterns for the Vibe Science Research Environment

---

## Quick X-Ray

- Repo shape: production-ready Python agent framework from Alibaba/ModelScope with deep architecture — agent system, dual-tier memory, planning, evaluation, RAG, tracing, MCP, A2A protocol, realtime voice, auto-tuning
- Scale: 517 files, ~40 modules, backed by arXiv paper (2402.14034)
- Stack: Python 3.10+, Pydantic, asyncio, OpenTelemetry, SQLAlchemy, Redis, multiple vector DBs
- Strongest themes: **metaclass-driven hooks**, **dual-tier memory with compression and marks**, **Pydantic plan model with partial state management**, **evaluation framework with metrics/benchmarks**, **async-first everything**
- Most mature repo audited so far — this is a real framework, not a skill pack or config collection
- Biggest warning: **this is a general agent framework, not a research integrity system — adopt patterns, not identity**

---

## Pass 1 — Useful Elements to Capture

### 1. Metaclass-Driven Hook System (Agent Lifecycle Interception)

**Where found**

- `src/agentscope/agent/_agent_meta.py` — metaclass that wraps `reply()`, `observe()`, `print()`
- `src/agentscope/agent/_react_agent_base.py` — extends with `pre_reasoning`, `post_reasoning`, `pre_acting`, `post_acting`
- `src/agentscope/types/_hook.py` — typed hook definitions

**What it is**

Every agent method is automatically wrapped by the metaclass. Before and after execution, registered hooks fire. Hooks can be registered at **instance level** (per-agent) or **class level** (all agents). Hook types:

| Hook | When it fires |
|------|--------------|
| `pre_reply` / `post_reply` | Before/after agent generates response |
| `pre_print` / `post_print` | Before/after displaying message |
| `pre_observe` / `post_observe` | Before/after receiving message |
| `pre_reasoning` / `post_reasoning` | Before/after ReAct reasoning step |
| `pre_acting` / `post_acting` | Before/after ReAct action step |

Pre-hooks can modify kwargs. Post-hooks can transform output. Deep-copies isolate hook state.

**Why this matters for Vibe Science**

Our hook system (7 lifecycle hooks in Claude Code) is event-based but not composable. AgentScope's pattern allows:
- Instance-level hooks (different behavior per agent role — researcher vs R2 vs R3)
- Class-level hooks (universal logging for all agents)
- ReAct-specific hooks (intercept reasoning before it becomes action)

The `pre_reasoning` / `post_reasoning` hooks are directly relevant: we could intercept the researcher's reasoning BEFORE it becomes a claim, adding confounder checks at the reasoning level, not just at the write level.

**Draft implementation for Vibe Science**

- Add pre/post hooks to our flow commands: `pre_flow_execute` (check governance profile), `post_flow_execute` (log to spine, update flow state)
- Instance-level hooks for R2 agent: `post_reasoning` hook that forces the two-stage review (hypothesis compliance before analysis quality)
- Class-level hook for all agents: `pre_reply` that checks context budget before generating

---

### 2. Dual-Tier Memory with Compression and Marking

**Where found**

- `src/agentscope/memory/_working_memory/` — InMemoryMemory, RedisMemory, AsyncSQLAlchemyMemory
- `src/agentscope/memory/_long_term_memory/` — Mem0, ReMe (personal/task/tool variants)
- `src/agentscope/agent/_react_agent.py` — memory compression via `SummarySchema`

**What it is**

**Working Memory** (conversation history):
- `add(memories, marks)` — add messages with tags
- `get_memory(mark, exclude_mark, prepend_summary)` — retrieve filtered by tags
- **Marking system**: messages tagged with strings for selective retrieval
- **Compressed summary**: old conversations summarized and prepended to active memory
- Storage pluggable: in-memory, Redis, SQLAlchemy

**Long-Term Memory** (semantic retrieval):
- `record(msgs)` — save important information
- `retrieve(msg, limit)` — semantic search across stored memories
- Three domain variants: personal, task-specific, tool-specific
- Integrates with Mem0 and ReMe platforms

**Memory Compression** (in ReActAgent):
- `SummarySchema` — Pydantic model for structured summaries
- Old conversation segments compressed to summaries with marks (`COMPRESSED`)
- Hint marks (`HINT`) for temporary context that clears after use

**Why this matters for Vibe Science**

Our memory is flat: SQLite spine entries + STATE.md projection. AgentScope shows a tiered model:

| AgentScope tier | Our equivalent | Gap |
|----------------|---------------|-----|
| Working Memory (tagged, filtered) | Spine entries (untagged) | No marking/filtering |
| Long-Term Memory (semantic retrieval) | FTS5 search (planned) | No semantic search yet |
| Memory Compression (summaries) | PreCompact snapshot (basic) | No structured summary schema |
| Memory Marks (HINT, COMPRESSED) | None | No temporary vs permanent marking |

The **marking system** is the most transferable pattern: tag each claim-related message with `claim:C-014`, each experiment message with `exp:EXP-003`, then retrieve only relevant context.

**Draft implementation for Vibe Science**

- Add tagging to spine entries: `tags` field with claim_id, experiment_id, flow_stage
- Implement filtered retrieval: "give me all spine entries tagged `claim:C-014`"
- Add structured compression schema (Pydantic) for PreCompact summaries
- Add HINT marks for temporary context that clears after a cycle

---

### 3. Pydantic SubTask/Plan Model with Partial State Management

**Where found**

- `src/agentscope/plan/_plan_model.py` — SubTask and Plan Pydantic models
- `src/agentscope/plan/_plan_notebook.py` — PlanNotebook for interactive management
- `src/agentscope/plan/_storage_base.py` — pluggable plan storage

**What it is**

```python
class SubTask(BaseModel):
    name: str
    description: str
    expected_outcome: str
    outcome: str | None = None
    state: Literal["todo", "in_progress", "done", "abandoned"] = "todo"
    created_at: str
    finished_at: str | None = None

    def finish(self, outcome: str) -> None: ...
    def to_markdown(self, detailed: bool = False) -> str: ...
```

Plan = container of SubTasks with versioning.
PlanNotebook = converts plan to hint messages for agents.
Storage is pluggable (InMemoryPlanStorage, extendable).

**Why this matters for Vibe Science**

Our experiment manifests and flow state are raw JSON. AgentScope's SubTask model is a **typed, validated planning model** that:
- makes task state explicit instead of implicit in prose
- serializes to markdown for human review
- tracks expected vs actual outcomes
- timestamps creation and completion

Important caveat from direct source reading: the automatic plan-state logic is NOT a strict lifecycle engine. `Plan.refresh_plan_state()` only toggles `todo` ↔ `in_progress`, and the source itself contains `TODO: Handle the plan state much more formally.` So the transferable value is strong typing + markdown projection, not a fully enforced transition law.

This maps directly to our experiment manifests: `planned → running → completed | failed | blocked` could be a Pydantic model instead of a raw JSON file.

**Draft implementation for Vibe Science**

- Define `ExperimentTask(BaseModel)` with typed state transitions (extending AgentScope's pattern)
- Add `expected_outcome` and `actual_outcome` fields to experiment manifests
- Add `to_markdown()` for human-readable experiment summaries
- Replace raw JSON flow state with Pydantic models that validate transitions

---

### 4. Evaluation Framework (Task → Metric → Benchmark → Storage)

**Where found**

- `src/agentscope/evaluate/_task.py` — Task definition
- `src/agentscope/evaluate/_metric_base.py` — MetricBase, MetricResult, MetricType
- `src/agentscope/evaluate/_benchmark_base.py` — BenchmarkBase
- `src/agentscope/evaluate/_evaluator.py` — GeneralEvaluator, RayEvaluator
- `src/agentscope/evaluate/_evaluator_storage/` — FileEvaluatorStorage with checkpointing

**What it is**

A complete evaluation pipeline:
1. `BenchmarkBase` provides `Task` objects (input + ground_truth + metrics)
2. A solution function executes each Task → `SolutionOutput` (success, output, trajectory)
3. Each Task's metrics evaluate the SolutionOutput → `MetricResult`
4. `EvaluatorStorage` persists results in a hierarchical structure:
   ```
  save_dir/{task_id}/{repeat_id}/solution.json
  save_dir/{task_id}/{repeat_id}/evaluation/{metric_name}.json
   ```
5. Aggregation phase computes overall statistics

**Key features:**
- Resumable evaluation via checkpointing
- Distributed evaluation via Ray
- Custom metrics (CATEGORY or NUMERICAL type)
- Multi-repeat support for statistical significance

**Why this matters for Vibe Science**

Our eval system (WP-00 in v7.0) has L0-schema, L1-hook-runtime, L2-agent-behavior. AgentScope's framework is far more mature:

| AgentScope | Our equivalent | Gap |
|-----------|---------------|-----|
| Task + ground_truth | Golden Claims (YAML) | No structured Task object |
| MetricBase + MetricResult | Pass/fail assertions | No metric composition |
| BenchmarkBase (iterable) | eval-runner.mjs | No benchmark abstraction |
| Resumable checkpointing | None | No checkpoint/resume |
| Hierarchical result storage | Single result file | No per-task granularity |

**Draft implementation for Vibe Science**

- Define `ResearchTask(Task)` with claim_id, hypothesis, expected_outcome
- Define custom metrics: `ConfounderHarnessMetric`, `CitationVerificationMetric`, `R2ComplianceMetric`
- Add hierarchical result storage for evals (per-claim, per-gate, per-session)
- Add checkpoint/resume for long evaluation runs

---

### 5. Tool Middleware Chain

**Where found**

- `src/agentscope/tool/_toolkit.py` — Toolkit with middleware support

**What it is**

Tools execute through a middleware chain. Each middleware can intercept, transform, or block tool execution:
- `register_tool_function()` with `preset_kwargs` (hidden parameters) and `postprocess_func`
- `extended_model` (Pydantic) for dynamic schema extension at runtime
- Async generator-based streaming responses (`ToolResponse` with `is_last` flag)
- Tool groups with activation/deactivation (only "basic" always on)

**Why this matters for Vibe Science**

Our PreToolUse/PostToolUse hooks intercept at the Claude Code level. AgentScope's middleware chain operates at the tool function level with composable transforms. This enables:
- A "confounder check" middleware that wraps every analysis tool call
- A "citation verification" middleware that wraps every literature tool call
- A "budget tracking" middleware that counts tool calls per session

**Draft implementation for Vibe Science**

- Wrap analysis tool calls with confounder-check middleware
- Wrap citation tool calls with verification middleware
- Add budget tracking as a universal middleware layer

---

### 6. OpenTelemetry Tracing with Semantic Conventions

**Where found**

- `src/agentscope/tracing/_setup.py` — OTLP HTTP exporter setup
- `src/agentscope/tracing/_attributes.py` — SpanAttributes with semantic conventions
- `src/agentscope/tracing/_trace.py` — `@trace_llm`, `@trace_tool`, `@trace_agent`, `@trace_embedding` decorators

**What it is**

Full OpenTelemetry integration:
- Trace decorators for every operation type (LLM, tool, agent, formatter, embedding)
- Semantic attribute conventions (model name, token counts, provider, tool inputs/outputs)
- Generator-aware tracing for streaming operations
- Provider auto-detection from client configuration

**Why this matters for Vibe Science**

Our spine logging is custom. AgentScope uses standard OpenTelemetry, which means:
- Spans are exportable to any OTel-compatible backend (Jaeger, Zipkin, Grafana Tempo)
- Cross-session correlation via trace IDs
- Cost attribution via token counting spans
- Standard tooling for analysis

**Draft implementation for Vibe Science**

- Not immediate priority, but design our spine entries to be OTel-compatible
- Add trace IDs to spine entries for future export
- Consider `@trace_flow` decorator for flow commands

---

### 7. Thinking Block Privacy in Multi-Agent Communication

**Where found**

- `src/agentscope/agent/_agent_base.py` — `_broadcast_to_subscribers()` strips ThinkingBlocks
- `src/agentscope/pipeline/_msghub.py` — MsgHub auto-broadcasts with thinking stripped

**What it is**

When an agent broadcasts its reply to other agents, ThinkingBlocks (internal reasoning) are automatically stripped. This means:
- Agent A reasons internally (visible in its own context)
- Agent A's reply is broadcast to agents B and C WITHOUT the reasoning
- Agents B and C see only the conclusion, not the thought process

**Why this matters for Vibe Science**

This is directly relevant to our R2/R3 architecture:
- The researcher's reasoning should be available to R2 (for review)
- But R2's internal reasoning (Blind-First Pass) should NOT leak to the researcher
- R3's meta-review reasoning should NOT leak to R2

The automatic stripping of thinking blocks implements our BFP principle architecturally.

**Draft implementation for Vibe Science**

- When R2 reviews claims, strip thinking blocks before returning verdict to researcher
- When R3 reviews R2's work, strip thinking blocks before returning score to orchestrator
- This enforces BFP without relying on prompt discipline alone

---

### 8. StateModule for Nested Serialization

**Where found**

- `src/agentscope/module/_state_module.py`

**What it is**

A base class that enables full state capture and restoration:
- `state_dict()` → captures all registered attributes + nested StateModules
- `load_state_dict()` → restores state
- `register_state(attr_name, to_json, load_json)` → declare what's serializable

Agents, memory, tools, plans all inherit from StateModule. This means an entire agent tree (with memory, tools, plans) can be serialized and restored.

**Why this matters for Vibe Science**

Our session persistence relies on SQLite + STATE.md. AgentScope's pattern enables:
- Full checkpoint of a research session (all agents, all memory, all plans)
- Restore to exact point for reproducibility
- Transfer research state between machines

**Draft implementation for Vibe Science**

- Define `FlowState(StateModule)` that captures flow index + experiment manifests + memory sync state
- Enable full session checkpoint via `flow_state.state_dict()`
- Enable restore via `flow_state.load_state_dict()`

---

### 9. Auto-Tuning with Workflow/Judge Abstraction

**Where found**

- `src/agentscope/tuner/_tune.py` — main tuning orchestration
- `src/agentscope/tuner/prompt_tune/` — prompt optimization via DSPy MIPROv2
- `src/agentscope/tuner/model_selection/` — model selection via parallel evaluation

**What it is**

Three tuning capabilities:
1. **Model fine-tuning**: Workflow → Judge → Training loop (via Trinity-RFT)
2. **Prompt optimization**: Dataset → DSPy MIPROv2 → Optimized prompts
3. **Model selection**: Candidates → Parallel evaluation → Best model

The Workflow/Judge abstraction is key:
- `WorkflowType`: async function that takes task + model + system_prompt → `WorkflowOutput(reward, response, metrics)`
- `JudgeType`: async function that takes task + response → `JudgeOutput(reward)`

**Why this matters for Vibe Science**

We could define research workflows as tunable:
- `ResearchWorkflow`: takes hypothesis + model → finds evidence, runs confounder harness → reward = R2 approval rate
- `JudgeFunction`: takes claim + evidence → rates quality (0-1)

This enables empirical optimization of our research pipeline.

**Draft implementation for Vibe Science**

- Not Phase 1, but long-term: define `ResearchWorkflow` and `ClaimJudge` as tunable functions
- Use model selection to pick the best model per agent role (cheap for literature, expensive for R2)
- Use prompt tuning to optimize flow command prompts

---

### 11. Block-Based Composable Messages

**Where found**

- `src/agentscope/message/_message_block.py` — TextBlock, ThinkingBlock, ToolUseBlock, ToolResultBlock, ImageBlock, AudioBlock, VideoBlock

**What it is**

Messages are sequences of typed content blocks, not raw strings. Each block has a `type` field and specific structure:
```python
TextBlock = {"type": "text", "text": str}
ThinkingBlock = {"type": "thinking", "thinking": str}
ToolUseBlock = {"type": "tool_use", "id": str, "name": str, "input": dict}
ToolResultBlock = {"type": "tool_result", "id": str, "name": str, "output": ...}
```

**Why this matters for Vibe Science**

Our `vibe-claim`, `vibe-seed`, `vibe-review` structured blocks are embedded in markdown. AgentScope's pattern makes blocks FIRST-CLASS message content. A claim transition could be a `ClaimBlock` instead of a fenced markdown block — typed, validated, composable, and parseable without regex.

**Draft implementation for Vibe Science**

- For v7 structured-block-parser: treat blocks as typed objects, not regex-extracted strings
- Consider extending the block model: `ClaimBlock`, `ReviewBlock`, `SeedBlock` as typed dicts

---

### 12. MsgHub Subscriber Pattern for Multi-Agent Ensemble

**Where found**

- `src/agentscope/pipeline/_msghub.py` — MsgHub with subscriber registration
- `src/agentscope/agent/_agent_base.py` — `_broadcast_to_subscribers()`

**What it is**

Agents register as subscribers to a message hub. When one agent replies, the hub auto-broadcasts to all subscribers. Thinking blocks are stripped before broadcast. Agents can be added/removed dynamically.

```python
async with MsgHub(participants=[researcher, r2_reviewer, r3_judge]):
    await researcher()  # R2 and R3 receive the output (minus thinking)
    await r2_reviewer()  # Researcher and R3 receive R2's verdict
```

**Why this matters for Vibe Science**

Our R2 ensemble (7 activation modes) currently works through sequential prompting. MsgHub would enable:
- Researcher publishes finding → R2 receives automatically (sans thinking)
- R2 publishes verdict → R3 receives automatically for meta-review
- Decoupled: adding a new reviewer doesn't change existing agents

**Draft implementation for Vibe Science**

- Phase 2+: when implementing multi-agent research sessions, use hub-based communication
- Each agent role registers as subscriber with appropriate thinking-block-stripping rules

---

### 13. RAG Knowledge Base with Pluggable Readers

**Where found**

- `src/agentscope/rag/_reader/` — TextReader, PDFReader, WordReader, ExcelReader, PowerPointReader, ImageReader
- `src/agentscope/rag/_store/` — QdrantStore, MilvusLiteStore, MongoDBStore
- `src/agentscope/rag/_knowledge_base.py` — KnowledgeBase with threshold filtering

**What it is**

A complete RAG pipeline: Reader → chunks → Embedding → Vector Store → Retrieval with score threshold.

The **readers** are the most interesting part: PDF, Word, Excel, PowerPoint parsers that produce `Document` objects with metadata (doc_id, chunk_id, total_chunks). Chunking is configurable (character/sentence/paragraph level).

**Why this matters for Vibe Science**

Our literature flow registers papers with metadata (DOI, title, authors). But we can't READ the papers programmatically. AgentScope's readers would enable:
- Parse a PDF paper → extract text → chunk → search against claims
- Parse an Excel results file → extract data for analysis
- Parse a Word protocol document → extract methods for experiment manifests

**Draft implementation for Vibe Science**

- Phase 2-3: integrate PDF reader for literature flow (full-text paper search)
- Phase 2: integrate Excel reader for experiment data import
- Use score-threshold filtering to find relevant chunks per claim

---

### 14. Provider-Specific Token Counter for Budget Tracking

**Where found**

- `src/agentscope/token/` — OpenAITokenCounter, AnthropicTokenCounter, GeminiTokenCounter, HuggingFaceTokenCounter, CharTokenCounter

**What it is**

Token counting abstracted per provider. Each uses the native counting library (tiktoken for OpenAI, Anthropic's API for Claude, etc.). Falls back to character-based estimate for unknown providers.

**Why this matters for Vibe Science**

Our budget guardrails (doc 08 of definitive-spec) track `estimated_cost_usd` per session but don't specify HOW to count tokens. AgentScope shows the right pattern: provider-specific counting with fallback.

**Draft implementation for Vibe Science**

- Use provider-specific token counting in the cost-tracker hook (Anthropic counter for Claude)
- Fall back to character-based estimate if provider unknown
- Track cache read/write tokens separately (Anthropic-specific)

---

## ADDENDUM — Independent Deep Pass (Codex, 2026-03-30)

What follows comes from direct source reading of the framework internals, not from the previous audit narrative alone. These are the parts that matter if we want enterprise-grade substrate rather than impressive-sounding bullets.

### 15. Working-Memory Marks Are Relational, Session-Scoped, and Snapshot-Friendly

**Where found**

- `src/agentscope/memory/_working_memory/_base.py`
- `src/agentscope/memory/_working_memory/_sqlalchemy_memory.py`

**What it is**

The strongest memory pattern in AgentScope is not "long-term semantic memory". It is the working-memory substrate:
- `MemoryBase` carries a registered `_compressed_summary` state, so summaries participate in snapshot/restore
- SQLAlchemy memory stores messages and marks in separate tables (`message`, `message_mark`, `session`, `users`)
- message IDs are composite (`user_id-session_id-message_id`) to avoid collisions across sessions
- retrieval is ordered and filterable by `mark` / `exclude_mark`

This is much more enterprise-ready than a flat "history list with tags". Marks are first-class relational data.

**Why this matters for Vibe Science**

This is the closest pattern to what our broader system still lacks:
- claim-scoped retrieval without regex
- experiment-scoped context windows without re-reading everything
- resumable compressed summaries that are part of state, not an ad-hoc note

The direct steal is not "semantic memory". It is **scoped, queryable, durable working memory**.

**Draft implementation for Vibe Science**

- Add `tags` / `marks` as first-class data in outer-project session state, not just markdown annotations
- Scope them at least by `claim_id`, `experiment_id`, `flow_stage`, `review_role`
- Treat compaction summaries as registered state that can be checkpointed and diffed

---

### 16. Toolkit Middleware Is a Real Runtime Chain, Not Just a Postprocess Hook

**Where found**

- `src/agentscope/tool/_toolkit.py` — `_apply_middlewares()`, `Toolkit`

**What it is**

This is stronger than the earlier report made it sound:
- middleware is a runtime chain wrapped around tool execution
- middleware units receive the `ToolUseBlock` and the downstream handler
- tool execution is async-generator-based, so middleware can stream, transform, or block incrementally
- tool groups can be activated/deactivated, while hidden preset kwargs keep non-model parameters off the schema surface

That is a real substrate for governance and observability, not just "run a callback after tool use".

**Why this matters for Vibe Science**

This gives us a better pattern for:
- confounder guards around analysis tools
- citation-verification wrappers around literature tools
- budget/accounting wrappers around expensive calls

In our ecosystem, this is a better conceptual model than piling more logic into one giant `PostToolUse`.

**Draft implementation for Vibe Science**

- Introduce per-tool middleware layers in the outer project before adding more global hooks
- Separate enforcement middleware from annotation middleware
- Keep a strict distinction between "tool unavailable", "tool blocked by policy", and "tool succeeded with warnings"

---

### 17. Evaluation Storage Is Better Than Advertised, but Simpler Than It Sounds

**Where found**

- `src/agentscope/evaluate/_task.py`
- `src/agentscope/evaluate/_metric_base.py`
- `src/agentscope/evaluate/_solution.py`
- `src/agentscope/evaluate/_evaluator_storage/_file_evaluator_storage.py`

**What it is**

The evaluation layer has a good enterprise shape:
- `Task` carries `input`, `ground_truth`, `metrics`, `tags`, and `metadata`
- `SolutionOutput` persists `success`, final `output`, and full `trajectory`
- `MetricResult` is timestamped and metadata-capable
- file storage is resumable through existence checks and per-artifact persistence

But it is also important to stay precise:
- the storage is filesystem-first, not some elaborate distributed result plane
- the actual directory layout is `task_id/repeat_id/...`, not `repeat_id/task_id/...`

This is still extremely useful for us, because it operationalizes per-task checkpointing and per-metric persistence without dragging in distributed complexity.

**Why this matters for Vibe Science**

This is a better target for our eval substrate than a single pass/fail YAML runner:
- one claim or one gate can be resumed independently
- metric outputs can carry metadata and timestamps
- trajectories can be inspected after a failure instead of being lost in chat

**Draft implementation for Vibe Science**

- Persist evaluation artifacts per claim and per gate
- Store the trajectory that led to a verdict, not just the verdict
- Keep filesystem-native checkpointing before dreaming about remote eval infra

---

### 18. The Plan Layer Is Good Product Scaffolding, Not a Mature Orchestrator

**Where found**

- `src/agentscope/plan/_plan_model.py`

**What it is**

The `SubTask` / `Plan` models are useful, but the maturity boundary matters:
- subtasks are well typed and export clean markdown
- `finish()` methods stamp outcomes and timestamps cleanly
- automatic lifecycle enforcement is intentionally incomplete

So the value is not "strict task law". The value is "typed notebook for operator-visible planning".

**Why this matters for Vibe Science**

This matches our need almost perfectly:
- flow state should be typed
- it should render to human-readable markdown
- but we should not pretend it is a scheduler or durable workflow engine unless we actually build one

This argues for an enterprise posture of **honest scaffolding first**, not faux-orchestration theater.

---

### 19. Long-Term Memory Is Mostly an Integration Seam, Not Core Substrate

**Where found**

- `src/agentscope/memory/_long_term_memory/_mem0/_mem0_long_term_memory.py`
- `src/agentscope/memory/_long_term_memory/_reme/`

**What it is**

The long-term memory layer is real code, but a lot of its practical value comes from wrapping external ecosystems:
- provider registration hacks for mem0 compatibility
- ReMe app execution wrappers for personal/task/tool memory flows
- heavy dependency on external memory semantics and infrastructure

So the durable pattern here is the **integration seam**, not the concrete backend choice.

**Why this matters for Vibe Science**

We should not read this repo and conclude "we need semantic memory now". The stronger lesson is:
- build a clean extension seam for future long-term memory
- keep V1 on simpler local substrate
- avoid hard-coding ourselves to a heavyweight memory product before the operator-facing flows are stable

That is the enterprise move: delay expensive infrastructure until the control plane and query surface are already disciplined.

---

## Pass 2 — What Not to Copy

### 1. General-purpose framework identity
AgentScope is a framework for building ANY agent. We build a specific research integrity system. Don't adopt their generality.

### 2. Heavy async runtime for prompt-driven system
AgentScope is async-first with asyncio event loops. Our system runs as Claude Code commands (prompt-driven, synchronous). Adopting full async would over-engineer our execution model.

### 3. Vector DB dependency for memory
AgentScope supports Qdrant, Milvus, MongoDB, etc. for vector storage. We should stay with SQLite + FTS5 for V1. Vector stores are Phase 4+ if ever.

### 4. Distributed evaluation via Ray
Our eval needs are much simpler. GeneralEvaluator patterns yes, RayEvaluator overkill.

### 5. Realtime voice / TTS
Not relevant for research integrity.

---

### 10. Streaming JSON Repair Parser

**Where found**

- `src/agentscope/_utils/_common.py` — `_json_loads_with_repair()`, `_parse_streaming_json_dict()`

**What it is**

Incremental JSON parser that repairs malformed output from streaming LLMs. Uses `json_repair` library as backend. Handles partial JSON, missing closing brackets, truncated strings.

**Why this matters for Vibe Science**

Our `structured-block-parser.js` (WP-00B in v7.0) must parse `vibe-claim`/`vibe-seed`/`vibe-review` YAML blocks that are often malformed by the LLM (missing fields, extra whitespace, truncated). AgentScope's repair-first parser philosophy — try to understand what the LLM meant, not just reject malformed output — is directly applicable.

**Draft implementation for Vibe Science**

- Add YAML repair logic to `structured-block-parser.js`: try strict parse first, fall back to lenient parse with warnings
- Accept common LLM variants (extra blank lines, inconsistent indentation, missing optional fields)
- Never silently accept; always log the repair as a warning

---

## Pass 3 — Recommended Adoption Priority

### Priority A — steal now (patterns, not code)

1. **Pydantic SubTask/Plan model** — replace raw JSON manifests with typed models
2. **Memory marking/tagging** — tag spine entries by claim, experiment, flow
3. **Thinking block stripping** — enforce BFP architecturally for R2/R3
4. **Evaluation Task/Metric/Benchmark** — upgrade eval-runner from YAML linter to framework
5. **Block-based typed messages** — ClaimBlock, ReviewBlock as typed objects, not regex
6. **Streaming JSON/YAML repair** — lenient parsing for LLM-generated structured blocks

### Priority B — steal for Phase 2-3

7. **Tool middleware chain** — composable wrappers for analysis/citation tools
8. **Structured compression schema** — Pydantic model for PreCompact summaries
9. **Nested state serialization** — full session checkpoint/restore
10. **Hierarchical eval storage** — per-claim, per-gate result storage with checkpointing
11. **RAG readers for PDF/Word/Excel** — literature flow full-text paper search
12. **MsgHub subscriber pattern** — decoupled R2/R3 ensemble communication
13. **Provider-specific token counter** — accurate budget tracking per model

### Priority C — steal if ever needed

14. **OpenTelemetry tracing** — OTel-compatible spine entries
15. **Auto-tuning** — workflow/judge abstraction for pipeline optimization
16. **Dual-level hooks** — instance vs class hooks for agent roles
17. **A2A protocol** — distributed agent communication with service discovery
18. **Embedding cache** — persistent cache for embedding API calls

---

## Validation Notes

- Read directly in this independent pass: README.md, `message/_message_block.py`, `plan/_plan_model.py`, `memory/_working_memory/_base.py`, `memory/_working_memory/_sqlalchemy_memory.py`, `module/_state_module.py`, `tool/_toolkit.py`, `rag/_knowledge_base.py`, `rag/_reader/_pdf_reader.py`, `evaluate/_task.py`, `evaluate/_metric_base.py`, `evaluate/_solution.py`, `evaluate/_evaluator_storage/_file_evaluator_storage.py`, `token/_token_base.py`, `token/_anthropic_token_counter.py`, `tracing/_trace.py`, plus selected long-term memory adapters
- Earlier parallel exploration existed, but the addendum and corrections above are grounded in direct source reads from this pass
- Did NOT run tests (requires Python venv + dependencies)
- Verified architecture from source code, not just docs

---

## Bottom Line

AgentScope is the most architecturally sophisticated repo we've audited. It's not a skill pack, not a config collection, not a workflow tool — it's a **production agent framework** from a research lab (Alibaba/ModelScope) with a backing paper.

The strongest patterns to borrow are:
- **Pydantic-typed plan/task models** with markdown export and explicit state, even if the lifecycle law is only partial
- **Memory marking/tagging** for selective context retrieval
- **Thinking block privacy** for adversarial review separation
- **Block-based typed messages** instead of regex-parsed fenced blocks
- **Evaluation framework** with Task/Metric/Benchmark hierarchy
- **Tool middleware** for composable pre/post processing
- **RAG readers** for PDF/Word literature processing
- **MsgHub subscriber pattern** for decoupled multi-agent communication
- **Streaming YAML/JSON repair** for LLM output tolerance
- **Provider-specific token counting** for accurate budget tracking

The strongest warnings are:
- Don't adopt the general-purpose identity
- Don't adopt heavy async runtime for prompt-driven system
- Don't adopt vector DB dependencies in V1
- Don't adopt distributed evaluation for our scale
- Don't adopt A2A protocol complexity for single-host research sessions

AgentScope's value to us is **architectural patterns**, not code to fork. The patterns are mature, well-typed, and production-tested — exactly the kind of substrate that makes our research environment stronger without changing what it is.

The most important correction from this deep pass is strategic: the repo's biggest steal is not "general agent magic". It is the combination of **scoped working memory**, **typed operator-visible planning**, **tool middleware**, and **checkpointable evaluation artifacts**. Those are enterprise substrate moves we can actually absorb without becoming a generic framework ourselves.

**Compared to previous 7 repos:** AgentScope is the only repo that provides patterns at the FRAMEWORK level (typed models, middleware chains, evaluation hierarchies) rather than at the CONFIG level (skill files, hook scripts, prompt templates). The quality delta is significant: 3.2:1 test-to-code ratio, full Pydantic typing, async-first architecture. This is production engineering, not hobbyist tooling.
