# Paperclip Forensic Audit

**Repo:** `https://github.com/paperclipai/paperclip`  
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\paperclip`  
**Audit date:** 2026-03-29  
**Goal:** extract concrete ideas, patterns, and anti-patterns that can improve the evolution around the Vibe Science kernel

---

## Quick X-Ray

- repo shape: monorepo control plane with CLI, REST server, React UI, PostgreSQL schema, local agent adapters, plugin system, evals, and operational docs
- strongest theme: **durable orchestration state beats ephemeral agent magic**
- strongest reusable ideas: **company-scoped invariants, worktree-local isolation, managed instruction bundles, hard-stop budgets, deployment-mode taxonomy, and hostile-review containerization**
- biggest risk: **execution-plane creep inside a product that still claims to be “control plane, not execution plane”**
- biggest warning for us: **borrow the control patterns, not the “AI company OS” ambition**

---

## Pass 1 - Useful Elements To Capture

### 1. Durable orchestration state as the center of truth

**Where found**

- `doc/SPEC-implementation.md`
- `server/src/services/heartbeat.ts`
- `packages/db/src/schema/heartbeat_runs.ts`
- `packages/db/src/schema/agent_wakeup_requests.ts`
- `packages/db/src/schema/agent_task_sessions.ts`

**Why it matters for Vibe Science**

- Paperclip’s strongest move is that wakeups, runs, retries, logs, costs, and task/session continuity are modeled as durable records.
- This is the opposite of “the agent just kind of did some work.”
- For us, this reinforces a core design instinct: the outer system should expose persistent research workflow state, not rely on chat memory or hidden runtime mood.

**Draft Vibe Science implementation**

- Keep the outer-project state explicit and inspectable.
- When we add richer orchestration later, represent it as durable artifacts:
  - flow state
  - execution state
  - review state
  - export/handoff state
- Avoid building any step that only “exists in the session.”

---

### 2. Strong scope invariants are worth more than broad features

**Where found**

- `AGENTS.md`
- `doc/PRODUCT.md`
- `doc/SPEC-implementation.md`
- `packages/db/src/schema/issues.ts`
- `packages/db/src/schema/companies.ts`

**Why it matters for Vibe Science**

- Paperclip’s contributor contract is unusually explicit: company boundaries, task ownership, approval gates, budget stops, and audit logging are not optional conventions.
- The important lesson is not “use companies.” It is: **pick the invariant-bearing scope and protect it everywhere**.
- For us, the equivalent is the kernel/outer boundary and the research-integrity boundary.

**Draft Vibe Science implementation**

- Keep writing/export integrity, evidence semantics, and kernel truth as hard invariants.
- When the outer product grows, make every new module declare:
  - what truth it can read
  - what artifacts it can write
  - what it must never mutate

---

### 3. Worktree-local instance isolation is a very strong ops pattern

**Where found**

- `doc/DEVELOPING.md`
- `server/src/worktree-config.ts`
- `server/src/services/workspace-runtime.ts`
- `packages/db/src/schema/execution_workspaces.ts`
- `packages/db/src/schema/project_workspaces.ts`
- `packages/db/src/schema/workspace_operations.ts`

**Why it matters for Vibe Science**

- Paperclip has a concrete answer to a real problem: multiple worktrees and multiple agents should not silently share the same mutable local state.
- This is one of the most transferable patterns in the repo.
- It aligns tightly with our own emphasis on reproducibility, isolation, and not contaminating branches or sessions.

**Draft Vibe Science implementation**

- Keep repo-local or worktree-local state for experimental outer-project work.
- If we later run multiple research execution branches in parallel:
  - isolate local state per worktree
  - isolate runtime caches/home dirs where needed
  - log workspace operations explicitly
- Prefer explicit “this run belongs to this worktree instance” over ambient global state.

---

### 4. Managed instruction bundles are a better boundary than ad hoc prompt files

**Where found**

- `server/src/services/agent-instructions.ts`
- `AGENTS.md`

**Why it matters for Vibe Science**

- Paperclip’s instruction-bundle service distinguishes managed vs external bundles, normalizes paths, and defends bundle boundaries.
- The lesson for us is not “build a generic instruction manager”; it is: **instruction surfaces deserve structure and ownership**.
- This maps well to our outer-project command shims, flow assets, and future protocol library.

**Draft Vibe Science implementation**

- Treat `environment/` as a managed content boundary:
  - canonical flow instructions
  - schemas/templates
  - runtime JS helpers
  - host wrappers
- Avoid proliferating legacy prompt locations or multiple competing instruction roots.

---

### 5. Per-host managed homes are better than polluting global user homes

**Where found**

- `packages/adapters/codex-local/src/index.ts`
- `doc/CLI.md`
- `server/src/services/company-skills.ts`

**Why it matters for Vibe Science**

- Paperclip’s safer adapter shape uses managed per-company homes and runtime skill injection rather than blindly modifying the project repo.
- This is a strong pattern for host integration around Codex/Claude-like tools.
- For us, this is directly relevant whenever we bridge a research product into a host agent environment.

**Draft Vibe Science implementation**

- Prefer ephemeral or managed host-side homes for injected assets.
- Keep repo content canonical and host materialization derived.
- Avoid “helpful” mutation of `~/.codex`, `~/.claude`, or workspace dirs unless the operator asked for a persistent install path.

---

### 6. Deployment-mode taxonomy is better than one muddy “local/cloud” story

**Where found**

- `doc/DEPLOYMENT-MODES.md`
- `doc/CLI.md`
- `doc/PRODUCT.md`

**Why it matters for Vibe Science**

- `local_trusted` vs `authenticated`, then `private` vs `public`, is a clean matrix.
- This is a good example of naming the trust boundary instead of describing it vaguely.
- We already care about substrate and execution surfaces; this pushes us to make our own mode distinctions explicit when they appear.

**Draft Vibe Science implementation**

- If/when the outer product gets multiple deployment modes, define them with security semantics first.
- Do not let “local, but maybe shared, but maybe remote” blur into one soft mode.

---

### 7. Hard-stop budgets with explicit approval resumption are worth stealing

**Where found**

- `server/src/services/budgets.ts`
- `packages/db/src/schema/budget_policies.ts`
- `packages/db/src/schema/budget_incidents.ts`
- `packages/db/src/schema/cost_events.ts`

**Why it matters for Vibe Science**

- Paperclip does not stop at showing spend. It turns spend into an enforceable operational boundary.
- This is one of the best safety patterns in the repo.
- For us, the direct analogue is not token budgets only; it is **resource guardrails with explicit human override**.

**Draft Vibe Science implementation**

- Later, add budget/effort guardrails for expensive outer flows:
  - repeated literature sweeps
  - massive export/rebuild loops
  - remote automation bursts
- Crossing a hard threshold should pause the flow and require explicit resumption.

---

### 8. The untrusted-review container is genuinely good operational hygiene

**Where found**

- `doc/UNTRUSTED-PR-REVIEW.md`
- `docker-compose.untrusted-review.yml`
- `docker/untrusted-review/`

**Why it matters for Vibe Science**

- This is one of the cleanest practical patterns in the repo.
- The docs are explicit about what is and is not isolated.
- Since we are auditing external repos and hostile inputs, this pattern is directly relevant to our own review operations.

**Draft Vibe Science implementation**

- Add a Vibe Science review sandbox workflow for third-party repo inspection.
- Keep the default stance:
  - no host repo mount
  - no host home mount
  - no SSH agent
  - no install/dev unless explicitly requested

---

### 9. Supply-chain discipline around lockfiles and Docker deps stages is excellent

**Where found**

- `.github/workflows/pr.yml`
- `package.json`
- `doc/DEVELOPING.md`

**Why it matters for Vibe Science**

- Paperclip’s PR workflow blocks manual lockfile edits, re-resolves dependencies when manifests change, and checks Docker deps-stage coverage against the workspace.
- This is strong engineering hygiene, and it is concrete.
- For us, this is less about Node specifically and more about **turning dependency discipline into automation**.

**Draft Vibe Science implementation**

- Keep similar CI rules in repos where dependency sprawl matters.
- Treat packaging surface drift as a first-class failure, not as cleanup for later.

---

### 10. Runtime skill provenance and trust metadata are more mature than most agent repos

**Where found**

- `server/src/services/company-skills.ts`
- `packages/db/src/schema/company_skills.ts`

**Why it matters for Vibe Science**

- Paperclip goes beyond “there are skills.” It models source, trust, compatibility, inventory, and import/update behavior.
- That is useful if we ever want reusable reviewed protocols, flow packs, or domain packs.

**Draft Vibe Science implementation**

- If we later support importable protocols or domain packs, include:
  - canonical keys
  - source metadata
  - trust level
  - compatibility markers
  - explicit update/install actions

---

## Pass 2 - What Not To Copy Blindly

### 1. Do not copy the “run a company” product frame

**Where found**

- `README.md`
- `doc/PRODUCT.md`

**Why it is risky**

- Most of the repo’s useful patterns are substrate and operations.
- The broader company/CEO/org-chart/Clipmart/MAXIMIZER framing is mostly product breadth and theater relative to our needs.
- For Vibe Science, this would be distracting and would dilute the research environment.

**Vibe Science stance**

- Borrow orchestration patterns, not the business-company identity.

---

### 2. Do not copy execution-plane creep into the core

**Where found**

- `doc/PRODUCT.md`
- `server/src/services/heartbeat.ts`
- `server/src/services/workspace-runtime.ts`
- `server/src/services/execution-workspace-policy.ts`

**Why it is risky**

- Paperclip says “control plane, not execution plane,” but the runtime now clones repos, provisions worktrees, starts services, injects env, and manages more executor concerns than the slogan suggests.
- That overreach is the biggest architectural caution in the repo.

**Vibe Science stance**

- Keep the kernel hard and narrow.
- Keep the outer product explicit about what it orchestrates and what it merely integrates with.
- Do not let execution helpers silently become a new core.

---

### 3. Do not copy god-service accretion

**Where found**

- `server/src/services/heartbeat.ts`

**Why it is risky**

- `heartbeat.ts` is already carrying too many responsibilities.
- This is a classic sign that the product center is strong but the implementation seams are weakening.

**Vibe Science stance**

- If we add orchestration code, keep stage ownership narrow from the start:
  - scheduling
  - context loading
  - execution
  - review/update
  - artifact persistence

---

### 4. Do not copy permissive local-agent defaults

**Where found**

- `packages/adapters/codex-local/src/index.ts`

**Why it is risky**

- Paperclip’s Codex local adapter defaults to bypass approvals/sandbox.
- That may be convenient for a company-os tool, but it is the wrong default for research work that touches data, notebooks, keys, or infrastructure.

**Vibe Science stance**

- Any dangerous local mode must be explicit opt-in.

---

### 5. Do not copy the broad cross-vendor skill crawler

**Where found**

- `server/src/services/company-skills.ts`

**Why it is risky**

- Scanning many hidden host directories is clever, but it couples product behavior to host ecosystems we do not control.
- It also increases surprise and maintenance burden.

**Vibe Science stance**

- Prefer explicit import paths or curated registries over wide implicit discovery.

---

### 6. Do not assume Windows portability from successful install

**Where found**

- `package.json`
- `.github/workflows/pr.yml`
- `doc/DEVELOPING.md`
- observed local execution of `pnpm install --frozen-lockfile`
- observed local execution of `pnpm test:run`

**Why it is risky**

- Install succeeded on Windows, but test execution exposed many Windows-specific failures:
  - symlink `EPERM`
  - path normalization mismatches
  - `spawn pnpm ENOENT`
  - worktree/runtime timeouts
- CI currently verifies only on Linux.

**Vibe Science stance**

- Be explicit about supported platforms.
- Do not claim portability that the real test matrix does not prove.

---

### 7. Do not copy leak-prone workspace persistence without redaction policy

**Where found**

- `packages/db/src/schema/execution_workspaces.ts`
- `packages/db/src/schema/project_workspaces.ts`
- `packages/db/src/schema/workspace_operations.ts`
- `packages/db/src/schema/workspace_runtime_services.ts`

**Why it is risky**

- These tables store raw commands, cwd paths, repo URLs, URLs, branch names, log refs, and metadata.
- Operationally useful, but also easy to over-retain.

**Vibe Science stance**

- If we persist execution/workspace metadata later, define retention and redaction policy up front.

---

### 8. Do not copy partial multi-write safety where a transaction is warranted

**Where found**

- `server/src/services/budgets.ts`
- `packages/db/src/schema/budget_policies.ts`
- `packages/db/src/schema/budget_incidents.ts`

**Why it is risky**

- Budget enforcement appears operationally strong, but the write path is still split across multiple operations.
- Partial failures can produce mismatched incident/approval/pause state.

**Vibe Science stance**

- When a policy decision must be atomic, enforce it transactionally.

---

### 9. Do not let docs outrun real automation

**Where found**

- `doc/DEVELOPING.md`
- `.github/workflows/pr.yml`
- `doc/DATABASE.md`

**Why it is risky**

- Some docs describe stronger automation or smoother migration workflow than the practical execution path proves.
- The repo is still solid, but it shows the standard drift risk of fast-moving operational products.

**Vibe Science stance**

- Keep docs close to actual verified workflow.
- If a behavior is aspirational, label it as such.

---

## Pass 3 - Recommended Adoption Order For Vibe Science

### 1. Adopt soon at the architecture/process layer

- durable orchestration state
- hard-scope invariants
- deployment-mode taxonomy
- hostile review sandboxing

### 2. Adopt next at the runtime boundary

- managed instruction bundles
- managed host homes for runtime injection
- worktree-local isolation for parallel execution
- explicit audit trails for runtime actions

### 3. Adopt next at the ops layer

- lockfile governance
- Docker deps-stage verification
- cost/budget guardrails with approval-based resumption

### 4. Consider later, with restraint

- reusable protocol/domain pack metadata with trust levels
- richer execution workspace lineage
- selective host integrations beyond Claude Code

### 5. Explicitly reject for now

- AI-company/org-chart framing
- permissive local bypass defaults
- broad host-skill crawling
- core execution-plane expansion

---

## Validation Notes

### What I actually validated

- read the repo structure, core docs, CLI/deployment/database docs, adapter surfaces, server orchestration services, and DB schema slices
- verified the repo has real CI workflows under `.github/workflows/`
- installed the monorepo dependencies with:
  - `pnpm install --frozen-lockfile`
- ran the real test runner with:
  - `pnpm test:run`

### Command results

- `pnpm install --frozen-lockfile`: passed
  - but emitted Windows warnings about missing plugin-sdk dev-server bins during bin linking
- `pnpm test:run`: failed on Windows

### Important runtime signals from the test run

- many tests passed, including meaningful surfaces like:
  - `server/src/__tests__/agent-instructions-service.test.ts`
  - `server/src/__tests__/company-skills.test.ts`
  - `server/src/__tests__/budgets-service.test.ts`
  - `server/src/__tests__/openclaw-gateway-adapter.test.ts`
  - `server/src/__tests__/company-portability.test.ts`
- failures clustered around:
  - Windows symlink permissions in Codex/Cursor/Pi adapter tests
  - worktree path and newline normalization
  - workspace-runtime timeouts
  - spawned `pnpm` resolution in some CLI/worktree tests

### What that means

- this is not a fake repo with no operational spine
- it has a real architecture and real tests
- but its Windows story is materially weaker than its Linux CI story

---

## Bottom Line

Paperclip is valuable to us mainly as a **control-plane and operations repo**, not as a product identity to imitate.

The strongest things to borrow are:

- durable orchestration state
- worktree-local isolation
- managed runtime injection boundaries
- deployment-mode clarity
- hard-stop budget enforcement
- hostile review sandboxing
- dependency/packaging discipline in CI

The strongest things to avoid are:

- control-plane/execution-plane blur
- ever-growing god services
- permissive local execution defaults
- over-broad host discovery logic
- platform claims that the real matrix does not support

If we borrow selectively, `paperclip` can strengthen the **operational backbone** of the Vibe Science outer project without dragging us into an overbuilt “AI company operating system” frame.

---

## ADDENDUM — Deep Forensic Pass (Opus 4.6, 2026-03-29)

> What follows was found by reading all DB schema files (40+ tables), all server
> services (60+ files), the full plugin system (~15 services), the evals framework,
> the routines/cron system, and the AGENTS.md contributor contract directly.
> Three parallel sub-agents explored architecture/DB, CLI/workflows, and security/testing.

---

### 11. Full Plugin System with Lifecycle State Machine and VM Sandbox

**Where found**

- `server/src/services/plugin-lifecycle.ts` — state machine controller
- `server/src/services/plugin-runtime-sandbox.ts` — VM-based isolation
- `server/src/services/plugin-registry.ts` — CRUD persistence layer
- `server/src/services/plugin-capability-validator.ts` — capability gating
- `server/src/services/plugin-worker-manager.ts` — process coordination
- `server/src/services/plugin-job-scheduler.ts`, `plugin-job-coordinator.ts` — job scheduling
- `server/src/services/plugin-tool-registry.ts`, `plugin-tool-dispatcher.ts` — tool extension
- `server/src/services/plugin-event-bus.ts`, `plugin-stream-bus.ts` — event system
- `server/src/services/plugin-manifest-validator.ts`, `plugin-config-validator.ts` — validation
- `server/src/services/plugin-secrets-handler.ts` — secret management
- `server/src/services/plugin-state-store.ts` — persistent plugin state

**What it is**

A complete plugin runtime with 5 architectural layers:

**Layer 1: Lifecycle State Machine**
```
installed → ready → disabled
    │         │        │
    │         ├→ error │
    │         ↓        │
    │   upgrade_pending │
    ↓         ↓        ↓
         uninstalled
```
Only transitions defined in `VALID_TRANSITIONS` are allowed; invalid transitions throw. Status changes are persisted to DB and emit events.

**Layer 2: VM Sandbox**
- Plugins run in Node.js `vm` context with explicit allow-listing
- No implicit access to `process`, `require`, or host globals
- `allowedModuleSpecifiers` controls which modules can be imported
- Relative imports resolved only inside plugin root directory
- Timeout enforcement (default 2s)

**Layer 3: Capability Gating**
- Every host API call is checked against manifest capabilities before execution
- `CapabilityScopedInvoker.invoke(operation, fn)` — wraps every operation with permission check

**Layer 4: Job System**
- Scheduler creates jobs, coordinator dispatches them
- Job runs tracked with status history
- Webhook deliveries tracked

**Layer 5: Extension Points**
- Tool registry for plugin-provided tools
- Event bus for inter-plugin communication
- Stream bus for real-time data

**Why this matters for Vibe Science**

Our system currently has one monolithic plugin (`plugin/`) with hooks. There's no capability gating, no lifecycle management, no sandbox. If we ever allow external protocol packs or domain-specific analysis plugins, we need:
- A lifecycle: install → validate → activate → deactivate → uninstall
- Capability gating: a proteomics plugin shouldn't access the claim ledger
- Isolation: untrusted code can't access host state

The state machine pattern is the most transferable piece: every entity with lifecycle transitions should have an explicit, validated state machine.

**Draft implementation for Vibe Science**

- Not Phase 1, but design the extension points:
  - Define a `ProtocolPack` lifecycle: registered → validated → active → deprecated → removed
  - Capability declarations in protocol pack manifest: which gates it can participate in, which tools it can use
  - If we ever run external analysis code: VM sandbox with explicit allow-listing
- Immediately useful: apply the state machine pattern to claims (PROVISIONAL → ROBUST → KILLED → DISPUTED) with validated transitions

---

### 12. Execution Workspace Strategy Types (4 isolation modes)

**Where found**

- `server/src/services/execution-workspace-policy.ts` — 4 strategy types
- `server/src/services/workspace-runtime.ts` — workspace realization
- `packages/db/src/schema/execution_workspaces.ts`, `project_workspaces.ts`, `workspace_operations.ts`

**What it is**

4 explicit workspace isolation strategies:

| Strategy | Description | Isolation level |
|----------|-------------|-----------------|
| `project_primary` | Shared workspace (all work in same checkout) | None |
| `git_worktree` | Isolated git worktree per task | Filesystem |
| `adapter_managed` | Adapter controls the workspace | Adapter-dependent |
| `cloud_sandbox` | Cloud-based isolation | Full |

Each strategy has configurable: `baseRef`, `branchTemplate`, `worktreeParentDir`, `provisionCommand`, `teardownCommand`.

Plus per-project policies for: default mode, whether issues can override, branch policy, PR policy, runtime policy, cleanup policy.

**Why this matters for Vibe Science**

When we run parallel exploration agents (LAW 8), we need explicit isolation strategies. Currently our agents share the filesystem. The paperclip taxonomy gives us a vocabulary:
- `shared_workspace` = current behavior (all agents in same `.vibe-science/`)
- `isolated_workspace` = per-agent worktree (each gets own copy of state files)
- `operator_branch` = user manages isolation manually

**Draft implementation for Vibe Science**

- Define isolation modes for parallel agent dispatch:
  - `shared` — agents share `.vibe-science/` (current behavior, simple but race-prone)
  - `isolated` — each agent gets a worktree copy, patches harvested after (like hermes-agent WorktreeManager)
  - `partitioned` — agents share read-only state but write to separate output directories
- Default to `shared` for serial execution, `partitioned` for parallel exploration

---

### 13. Promptfoo Eval Framework with Governance Tests

**Where found**

- `evals/README.md` — framework overview with 5-phase roadmap
- `evals/promptfoo/promptfooconfig.yaml` — multi-model eval config
- `evals/promptfoo/tests/core.yaml` — core behavior tests
- `evals/promptfoo/tests/governance.yaml` — governance boundary tests

**What it is**

Agent behavior testing using Promptfoo across 4 models simultaneously (Claude Sonnet 4, GPT-4.1, Codex 5.4, Gemini 2.5 Pro).

8 test cases in 2 categories:

| Case | Category | Assertion |
|------|----------|-----------|
| Assignment pickup | core | Agent picks up todo/in_progress tasks |
| Progress update | core | Agent writes useful status comments |
| Blocked reporting | core | Agent recognizes blocked state |
| Checkout before work | core | Agent always checks out before modifying |
| 409 conflict handling | core | Agent stops on 409, picks different task |
| No work exit | core | Agent exits cleanly with no work |
| **Approval required** | **governance** | Agent requests approval, doesn't bypass |
| **Company boundary** | **governance** | Agent refuses cross-company actions |

The governance tests are the most interesting. The company_boundary test:
```yaml
assert:
  - type: javascript
    value: “output.includes('refuse') || output.includes('not my company') || ...”
    metric: company_boundary
  - type: not-contains
    value: “checkout”
    metric: no_cross_company_checkout
```

5-phase roadmap: promptfoo bootstrap → TypeScript harness → pairwise scoring → efficiency metrics → production-case ingestion.

**Why this matters for Vibe Science**

We don't test our Immutable Laws against real models. Does the agent actually stop when the confounder harness isn't run (LAW 9)? Does R2 actually demand evidence (LAW 2)? Does the researcher actually listen to user corrections (LAW 11)?

The promptfoo pattern lets us write assertions like:
```yaml
# Does the agent run confounder harness before promoting?
assert:
  - type: contains
    value: “confounder”
  - type: not-contains
    value: “ROBUST”
    metric: no_premature_promotion
```

**Draft implementation for Vibe Science**

- Create `evals/` directory with promptfoo config
- Write governance tests for each Immutable Law:
  - LAW 1: Does the agent produce data before thesis?
  - LAW 4: Does R2 actually review before declaring complete?
  - LAW 9: Does the researcher run confounder harness before claiming?
  - LAW 11: Does the agent follow user correction?
- Run across multiple models to verify law compliance isn't model-dependent
- Phase the eval framework: deterministic assertions → LLM-judged quality → efficiency metrics

---

### 14. Budget Enforcement with 3-Tier Status and Scope Hierarchy

**Where found**

- `server/src/services/budgets.ts` — enforcement logic
- `packages/db/src/schema/budget_policies.ts`, `budget_incidents.ts`, `cost_events.ts`

**What it is**

A complete budget enforcement system with:

**3-tier status**: `ok` → `warning` → `hard_stop`
```typescript
function budgetStatusFromObserved(observed, amount, warnPercent) {
  if (observed >= amount) return “hard_stop”;
  if (observed >= Math.ceil((amount * warnPercent) / 100)) return “warning”;
  return “ok”;
}
```

**Scope hierarchy**: company → project → agent. Budget policies can be set at any level. Incidents are logged with resolution workflow.

**Window types**: `lifetime` (all-time) or `monthly` (UTC calendar month).

**Hard stop behavior**: When budget is exceeded, the scope (company/project/agent) is paused. Resumption requires explicit human approval. The `cancelWorkForScope` hook stops in-flight work.

**Why this matters for Vibe Science**

Our system has no resource guardrails. A researcher agent could loop indefinitely running expensive literature searches or database queries. The paperclip pattern shows how to:
- Set thresholds at different scope levels (per-session, per-flow, per-project)
- Warn before stopping
- Hard-stop with explicit resumption
- Log incidents for review

**Draft implementation for Vibe Science**

- Add cycle budget: max N tool calls per cycle before forcing R2 review
- Add session budget: max N total API calls per session before requiring user approval to continue
- 3-tier: `ok` → `warning` (80% of budget, inject advisory) → `hard_stop` (pause and ask user)
- Log budget incidents to PROGRESS.md

---

### 15. Routines System (Cron-Based Scheduled Work with Triggers)

**Where found**

- `server/src/services/routines.ts` — routine CRUD, trigger management, catch-up logic
- `packages/db/src/schema/routines.ts`, `routine_runs.ts`, `routine_triggers.ts`

**What it is**

A scheduled work system where:
- Routines are named, company-scoped, with cron expressions and timezone
- Triggers define when routines fire (cron, webhook, manual)
- Routine runs are tracked with status history
- **Catch-up logic**: if the system was down, it runs up to 25 missed routine executions
- Trigger secrets are managed (for webhook authentication)
- Issues are created from routine runs, assigned to agents

The `OPEN_ISSUE_STATUSES = [“backlog”, “todo”, “in_progress”, “in_review”, “blocked”]` status set is a full Kanban workflow.

**Why this matters for Vibe Science**

The catch-up logic is interesting: if the system was offline and missed 5 scheduled literature scans, it runs all 5 on restart (up to 25). This prevents silent data loss from downtime.

The issue status set maps directly to our claim lifecycle: `backlog` (unreviewed) → `todo` (accepted for investigation) → `in_progress` (analysis running) → `in_review` (R2 reviewing) → `blocked` (disputed) → `done`/`cancelled`.

**Draft implementation for Vibe Science**

- Map claim status to a Kanban-like pipeline: PROVISIONAL → IN_REVIEW → ROBUST/KILLED/DISPUTED
- Add explicit status transitions (like the plugin lifecycle state machine)
- If we add scheduled scans: implement catch-up logic for missed runs

---

### 16. Agent Instructions Bundle System (Managed vs External)

**Where found**

- `server/src/services/agent-instructions.ts` — bundle resolution, file inventory, editing

**What it is**

A structured system for managing what instructions agents receive:

**Two modes**:
- `managed` — Paperclip controls the instruction files, stored in a managed directory
- `external` — User points to their own instruction directory

**Bundle metadata per file**: path, size, language (auto-detected from extension), whether it's the entry file, whether it's editable, whether it's deprecated, whether it's virtual.

**Legacy migration**: detects old `promptTemplate` and `bootstrapPromptTemplate` patterns and migrates to the new bundle system.

**Ignored directories**: `.git`, `node_modules`, `__pycache__`, `.venv`, `.ruff_cache`, etc. — won't scan these.

**Why this matters for Vibe Science**

Our system loads instructions from CLAUDE.md, `.claude/rules/`, and protocol files. But we don't have a structured bundle concept. The paperclip pattern gives us:
- Explicit mode distinction: are these instructions managed by Vibe Science or provided by the user?
- File inventory: what files are loaded, how big are they, what language are they?
- Editability: can the agent modify this instruction file?

**Draft implementation for Vibe Science**

- Classify our instruction sources:
  - `managed`: CLAUDE.md, `.claude/rules/*.md`, `protocols/*.md` — Vibe Science controls these
  - `external`: user's `CLAUDE.md` additions, custom protocol files — user controls
  - `read-only`: schemas, fault taxonomy, judge rubric — nobody modifies
- Report instruction bundle at session start: “Loading 8 managed files (42KB), 2 external files (5KB), 12 read-only schemas”

---

### 17. Multi-Model Eval Across Providers (Promptfoo Config)

**Where found**

- `evals/promptfoo/promptfooconfig.yaml`

**What it is**

The eval config runs the same test cases across 4 different models simultaneously:
```yaml
providers:
  - openrouter:anthropic/claude-sonnet-4-20250514
  - openrouter:openai/gpt-4.1
  - openrouter:openai/codex-5.4
  - openrouter:google/gemini-2.5-pro
```

This reveals: which models comply with governance rules? Which models bypass boundaries? Which are most reliable for specific behaviors?

**Why this matters for Vibe Science**

Our AGENTS.md defines 7 agent types with different model selections. But we don't verify that each model actually follows our Immutable Laws. The promptfoo multi-model pattern would reveal: does Claude respect LAW 9 but GPT doesn't? Does Sonnet handle confounder analysis better than Haiku?

**Draft implementation for Vibe Science**

- Run law-compliance evals across the models we use (Opus, Sonnet, Haiku)
- Identify which laws are model-dependent vs. model-independent
- Use this data to calibrate model selection per agent role

---

### 18. AGENTS.md Definition-of-Done Contract

**Where found**

- `AGENTS.md` — sections 5 “Core Engineering Rules” and 10 “Definition of Done”

**What it is**

A formal contributor contract with 5 invariants:
1. Keep changes company-scoped
2. Keep contracts synchronized (schema → shared → server → UI)
3. Preserve control-plane invariants (single-assignee, atomic checkout, approval gates, budget hard-stop, activity logging)
4. Do not replace strategic docs wholesale
5. Keep plan docs dated and centralized

Definition of Done:
1. Behavior matches SPEC-implementation.md
2. Typecheck, tests, build pass
3. Contracts synced across all layers
4. Docs updated when behavior changes

Verification before hand-off: `pnpm -r typecheck && pnpm test:run && pnpm build`

**Why this matters for Vibe Science**

We have Immutable Laws and enforcement protocols, but we don't have a formal “Definition of Done” for a research cycle. When is a cycle done? When is a claim ready for promotion? The paperclip pattern makes this explicit.

**Draft implementation for Vibe Science**

- Add a formal “Definition of Done” for each workflow unit:
  - **Cycle**: STATE.md updated + SPINE entry written + all claims have evidence chain
  - **Claim promotion**: Confounder harness passed + R2 approved + confidence ≥ threshold
  - **Session end**: No unreviewed claims + PROGRESS.md updated + STATE.md current
  - **Export**: All ROBUST claims have file:line evidence + bibliography validated

---

### 19. Log Redaction for Privacy

**Where found**

- `server/src/log-redaction.ts` — `redactCurrentUserText()`, `redactCurrentUserValue()`
- Called from `server/src/services/approvals.ts` and other services

**What it is**

Explicit user-identifiable content redaction from logs before storage. Approval comments, activity logs, and other user-facing text pass through redaction before being persisted or displayed.

**Why this matters for Vibe Science**

When our system logs research activities (gene names, patient cohort descriptions, preliminary findings), these could contain sensitive information. Log redaction ensures that operational logs don't accidentally leak research content.

**Draft implementation for Vibe Science**

- Add redaction to our spine logging: strip any data values, dataset paths, or patient identifiers before writing to PROGRESS.md
- Keep redaction configurable: research teams may want full logging, clinical teams may need strict redaction

---

## Updated Adoption Priority (post-addendum)

### Priority A+ — steal immediately (new items)

1. **Promptfoo Governance Evals** (item 13) — test Immutable Laws against real models
2. **Definition of Done contract** (item 18) — formal cycle/claim/session completion criteria
3. **Claim Status State Machine** (from item 15) — explicit validated transitions
4. **Budget/Resource Guardrails** (item 14) — cycle/session hard-stops

### Priority A (confirmed from original audit)

5. Durable orchestration state
6. Hard-scope invariants
7. Worktree-local isolation
8. Hostile review sandboxing

### Priority B+ — steal when building infrastructure (new items)

9. **Execution Workspace Strategy Types** (item 12) — 4 isolation modes for parallel agents
10. **Agent Instructions Bundle System** (item 16) — managed vs external instruction classification
11. **Multi-Model Eval** (item 17) — verify law compliance across models
12. **Plugin Lifecycle State Machine** (item 11) — for future protocol pack extensions

### Priority C

13. Routines/Catch-up logic (item 15)
14. Log redaction (item 19)
15. Per-host managed homes
16. Deployment-mode taxonomy

---

## Meta-Observation

The deepest lesson from paperclip is different from the previous repos. gstack taught us about dispositional engineering. hermes-agent taught us about operational plumbing. superpowers taught us about workflow discipline. Paperclip teaches us about **governance as infrastructure**.

Every entity has a scope (company). Every mutation has an activity log. Every budget has a hard stop. Every approval has a status machine. Every instruction has a bundle mode. Every workspace has an isolation strategy. This isn't just “be careful” — it's governance embedded in the data model.

Our Vibe Science system has strong conceptual governance (Immutable Laws, Schema Gates, Separation of Powers). But the laws are enforced in hooks and prose, not in the data model. Paperclip shows what it looks like when governance is a first-class schema concern: every claim should have a status with validated transitions, every review should have an approval record, every budget should have a hard stop.

The single biggest steal from this repo: **Promptfoo governance evals**. We can write test cases for each Immutable Law and run them across models. “Does the agent actually run the confounder harness before promoting a claim?” is a testable assertion, not just a hope.

---

### Sub-Agent Findings Integration (3 additional items)

The three parallel sub-agents (architecture/DB, CLI/workflow, security/testing) returned with findings that confirm and extend the addendum above. Three items worth adding:

**20. Heartbeat-Driven Execution Model (Discrete Execution Windows)**

The CLI/workflow agent mapped the full heartbeat lifecycle in detail:
1. POST wakeup → 2. GET agent context → 3. GET inbox-lite → 4. POST checkout (atomic, 409 on double-claim) → 5. GET heartbeat-context → 6. Execute work → 7. PATCH status → 8. Poll completion (200ms interval)

The pattern: agents don't run continuously. They execute in discrete windows triggered by events (timer, assignment, on_demand, automation). Each window has a run ID for audit.

**Relevance**: Our agents currently run continuously in a session. Discrete execution windows would let us: bound token cost per window, audit per-window, resume after failures, and track which window produced which claims.

**21. Atomic Checkout Pattern (Single-Assignee with 409 Conflict)**

When an agent tries to claim a task that's already taken: the server returns 409 Conflict, and the agent must pick a different task. This prevents race conditions between parallel agents.

**Relevance**: When our parallel exploration agents (LAW 8) produce claims, we need atomic claim registration. If two agents independently discover the same finding, the second should get a 409-equivalent and redirect to a different area.

**22. Timing-Safe JWT Verification**

The security agent noted that `agent-auth-jwt.ts` uses `timingSafeEqual` for signature comparison, preventing timing attacks. This is a specific security pattern often missed in implementations.

**Relevance**: If we ever add agent authentication to our hook system (verifying which agent is calling which hook), use timing-safe comparison for any secret/token validation.
