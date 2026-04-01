# Gstack Forensic Audit

**Repo:** `https://github.com/garrytan/gstack`  
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\gstack`  
**Audit date:** 2026-03-29  
**Goal:** extract concrete ideas, patterns, and anti-patterns that can improve the evolution around the Vibe Science kernel

---

## Quick X-Ray

- repo shape: skill pack + runtime tools + browser daemon + design tooling + eval/test harness
- scale signal: ~30 `SKILL.md` files, ~60 test files, multiple generated-doc and host-packaging paths
- strongest theme: **workflow state is turned into explicit artifacts**
- biggest risk: **too much mutable Markdown/runtime/install logic mixed together without a hard packaging boundary**

---

## Pass 1 — Useful Elements To Capture

### 1. Single source of truth for commands and generated skill docs

**Where found**

- `browse/src/commands.ts`
- `scripts/resolvers/index.ts`
- `scripts/gen-skill-docs.ts`
- `test/gen-skill-docs.test.ts`

**Why it matters for Vibe Science**

- gstack’s best structural move is that runtime command definitions, generated docs, and validation all hang off the same source surface.
- This directly attacks one of the biggest failure modes in prompt-driven systems: docs and executable behavior drifting apart.

**Draft Vibe Science implementation**

- Introduce one canonical manifest for command surfaces, host metadata, examples, and dependencies.
- Generate from it:
  - command help / skill docs
  - host-specific prompt artifacts
  - static validation tests
- Use this for the outer project first, then selectively for kernel-facing command surfaces.

---

### 2. Prompt hygiene treated like code

**Where found**

- `scripts/skill-check.ts`
- `test/skill-validation.test.ts`
- `test/helpers/skill-parser.ts`
- `.github/workflows/skill-docs.yml`

**Why it matters for Vibe Science**

- gstack assumes prompts rot and validates them the way other repos validate schemas or APIs.
- That mindset is exactly right for our outer project, which is heavily prompt-driven and therefore vulnerable to silent drift.

**Draft Vibe Science implementation**

- Add prompt/meta tests for:
  - stale command examples
  - broken generated docs
  - invalid command references
  - host-surface drift
- Treat prompt drift as a blocking CI failure, not as “just docs.”

---

### 3. Tiered eval pipeline with touchfiles routing

**Where found**

- `.github/workflows/evals.yml`
- `.github/workflows/evals-periodic.yml`
- `test/helpers/touchfiles.ts`
- `test/skill-llm-eval.test.ts`
- `test/helpers/e2e-helpers.ts`

**Why it matters for Vibe Science**

- gstack separates cheap checks from expensive evals and uses diff-based routing to decide what deserves costly validation.
- This is one of the cleanest anti-sloppiness mechanisms in the repo.

**Draft Vibe Science implementation**

- Create two lanes:
  - `gate` lane for deterministic tests + essential evals
  - `periodic` lane for slower exploratory or broader evals
- Add `touchfiles.ts`-style routing so expensive research-environment evals only run when affected surfaces changed.

---

### 4. Observability for agent runs, not just pass/fail

**Where found**

- `test/helpers/session-runner.ts`
- `test/helpers/eval-store.ts`
- `scripts/eval-watch.ts`
- `test/helpers/observability.test.ts`

**Why it matters for Vibe Science**

- The useful idea is not only “run evals,” but “persist heartbeat, partial results, last tool call, transcript, and timing.”
- This makes agent failures debuggable instead of opaque.

**Draft Vibe Science implementation**

- For outer-project evals and later automation runs, persist:
  - run manifest
  - heartbeat
  - last tool / last step
  - partial results
  - failure transcript
- Add one small watcher/summary script that surfaces “where the agent died” without reading the whole log.

---

### 5. Structured review artifacts and readiness dashboard

**Where found**

- `review/SKILL.md`
- `review/checklist.md`
- `scripts/resolvers/review.ts`
- `bin/gstack-review-read`

**Why it matters for Vibe Science**

- gstack’s best review idea is not “many checks,” but a durable review state with scope, readiness, and verification.
- It keeps planning, implementation, and shipping connected.

**Draft Vibe Science implementation**

- Add review artifacts as JSONL or structured Markdown to the outer project.
- Render a compact readiness dashboard into the living spec / plan:
  - which passes ran
  - what remains open
  - whether plan and implementation still match

---

### 6. QA split into report-only and fix mode

**Where found**

- `qa/SKILL.md`
- `qa-only/SKILL.md`
- `qa/templates/qa-report-template.md`
- `test/skill-e2e-qa-workflow.test.ts`
- `test/skill-e2e-qa-bugs.test.ts`

**Why it matters for Vibe Science**

- gstack is right to split “evidence gathering” from “mutation.”
- That boundary is valuable for us too, especially for later experimental, browser, or literature workflows where observation and action must not blur.

**Draft Vibe Science implementation**

- Introduce paired modes for future outer-project QA / audit flows:
  - report-only
  - fix/act
- Enforce the difference at the harness/tool-permission level, not only in prose.

---

### 7. Guardrails that reduce accidental agent damage

**Where found**

- `careful/bin/check-careful.sh`
- `freeze/bin/check-freeze.sh`
- `test/hook-scripts.test.ts`

**Why it matters for Vibe Science**

- These are simple, high-leverage primitives: destructive-command warnings and directory edit freezing.
- The pattern fits our “integrity-first” posture well.

**Draft Vibe Science implementation**

- Add a pre-tool middleware for the outer project with outcomes:
  - `warn`
  - `deny`
  - `allow`
- Start with:
  - dangerous git commands
  - destructive shell commands
  - edit-scope freezes for focused work

---

### 8. Autoplan with one final approval gate

**Where found**

- `autoplan/SKILL.md`
- `office-hours/SKILL.md`
- `plan-ceo-review/SKILL.md`
- `plan-eng-review/SKILL.md`
- `plan-design-review/SKILL.md`

**Why it matters for Vibe Science**

- The useful pattern is sequential specialized passes collapsed into one operator-facing approval point.
- This is especially relevant for our spec work, where many review layers exist but we still want a single final user decision moment.

**Draft Vibe Science implementation**

- Add a “plan fusion” mode for major outer-project changes:
  - product pass
  - architecture pass
  - design/usability pass where relevant
- Log each pass, auto-decide only mechanical choices, and surface only real taste/strategy disagreements to the user.

---

### 9. Workflow state as explicit artifacts

**Where found**

- `office-hours/SKILL.md`
- `design/src/session.ts`
- `design/src/memory.ts`
- `design/src/gallery.ts`
- `design/src/serve.ts`

**Why it matters for Vibe Science**

- gstack’s strongest product instinct is to materialize workflow state into files and browser-visible artifacts.
- That matches our direction: hard kernel, soft outer shell, explicit project memory, explicit flow state.

**Draft Vibe Science implementation**

- Keep all outer-project workflow artifacts under one canonical run directory.
- Example shape:
  - `runs/<id>/manifest.json`
  - `runs/<id>/reviews.jsonl`
  - `runs/<id>/artifacts/...`
  - `runs/<id>/feedback/...`
- Link this to `.vibe-science-environment/` rather than scattering files across unrelated roots.

---

### 10. Browser persistence, handoff, and sidepanel cockpit

**Where found**

- `browse/src/browser-manager.ts`
- `browse/src/server.ts`
- `extension/background.js`
- `extension/sidepanel.js`
- `docs/designs/CONDUCTOR_CHROME_SIDEBAR_INTEGRATION.md`

**Why it matters for Vibe Science**

- The interesting idea is not just “browser automation,” but:
  - persistent browser session
  - human handoff/resume for blockers
  - live cockpit for observing and steering the agent
- If Vibe Science eventually grows browser-mediated research tasks, these are high-value patterns.

**Draft Vibe Science implementation**

- Do **not** copy the whole browser stack now.
- Keep this as a later-module idea:
  - persistent browser workspace
  - explicit handoff state
  - operator sidepanel/log view
- Only pursue it when a real Vibe Science flow truly needs browser-native work.

---

## Pass 2 — What Not To Copy Blindly

### 1. Overloaded repo root

**Where found**

- repo root layout itself
- `README.md`
- `CLAUDE.md`

**Why it matters**

- Skill folders, runtime code, extension code, tests, generated artifacts, docs, and setup machinery all sit too close together.
- This makes trust boundaries muddy.

**Draft Vibe Science implementation**

- Keep “one skill = one directory” if useful, but split top-level domains clearly:
  - `skills/`
  - `runtime/`
  - `hosts/`
  - `generated/`
  - `docs/`
  - `tests/`

---

### 2. `setup` does too much

**Where found**

- `setup`
- `package.json`
- `browse/scripts/build-node-server.sh`

**Why it matters**

- One script handles install, build, migration, prompts, host detection, symlinks, and platform-specific workarounds.
- That is hard to audit and hard to reproduce exactly.

**Draft Vibe Science implementation**

- Split setup into explicit idempotent commands:
  - build
  - package
  - install
  - verify
- Add a machine-readable install manifest.

---

### 3. Symlink-first install harms reproducibility

**Where found**

- `setup`
- `CLAUDE.md`

**Why it matters**

- Active skills point back to mutable source trees, so behavior changes immediately when the source checkout changes.
- That is hostile to reproducible research environments.

**Draft Vibe Science implementation**

- Prefer immutable versioned bundles.
- At most, keep one activation symlink pointing to a pinned version.
- Record exact active bundle versions in a lockfile.

---

### 4. Host compatibility by string rewriting is fragile

**Where found**

- `scripts/resolvers/types.ts`
- `scripts/gen-skill-docs.ts`
- `setup`
- `README.md`

**Why it matters**

- Claude/Codex/Kiro compatibility is achieved largely through path rewrites and generated layout tricks.
- Clever, but easy to break silently.

**Draft Vibe Science implementation**

- Model host support explicitly:
  - `supports_hooks`
  - `metadata_format`
  - `skill_root`
  - `runtime_sidecar`
  - `safety_mode`
- Snapshot-test generated host packages.

---

### 5. CI underuses cheap deterministic tests

**Where found**

- `.github/workflows/evals.yml`
- `.github/workflows/evals-periodic.yml`
- `.github/workflows/skill-docs.yml`
- `package.json`

**Why it matters**

- The repo has strong deterministic tests, but not all of them are clearly blocking in CI.
- That leaves cheap regressions on the table.

**Draft Vibe Science implementation**

- Always run deterministic/meta/prompt tests on PRs.
- Keep expensive agent evals on a separate lane.

---

### 6. Some security checks are source-string checks, not behavior checks

**Where found**

- `browse/test/server-auth.test.ts`
- `browse/test/adversarial-security.test.ts`

**Why it matters**

- Grepping for expected strings is weaker than hitting the real runtime surface.

**Draft Vibe Science implementation**

- Use string checks as smoke alarms only.
- Add at least one runtime behavior harness per critical safety surface.

---

### 7. Logging and artifact durability are overstated in places

**Where found**

- `bin/gstack-review-log`
- `bin/gstack-review-read`
- `scripts/eval-watch.ts`
- `test/helpers/eval-store.ts`

**Why it matters**

- Review logging is not actually atomic, and some path assumptions drift between watchers and storage code.
- This is exactly the kind of “looks rigorous / behaves loosely” gap we want to avoid.

**Draft Vibe Science implementation**

- Make artifact stores real:
  - atomic writes
  - locked append where needed
  - one canonical path module
  - end-to-end tests for actual artifact locations

---

## Pass 3 — Recommended Adoption Order For Vibe Science

### Priority A — steal now

1. **Generated prompt/command surface from one manifest**
2. **Prompt hygiene + freshness tests**
3. **Structured review artifacts + readiness dashboard**
4. **Touchfiles-based eval routing**
5. **Agent-run observability artifacts**

These are the highest-value, lowest-risk imports from gstack.

---

### Priority B — steal later if the outer shell matures

1. **Autoplan fused review pipeline**
2. **Artifactized workflow memory and lineage**
3. **Report-only vs mutation modes for QA / audits**
4. **Simple guardrails like careful/freeze**

These fit the Vibe Science outer project well, but should follow the first wave.

---

### Priority C — only steal if a real user need appears

1. **Persistent browser daemon**
2. **Human handoff/resume browser workflows**
3. **Chrome sidepanel cockpit**
4. **Design comparison board / taste-memory system**

These are interesting, but they are not Phase 1 needs for the research environment.

---

## Bottom Line

gstack is valuable to us **less** as a product to imitate wholesale and **more** as a repository of patterns for:

- generated prompt surfaces
- prompt drift control
- eval routing
- review-state persistence
- workflow artifactization
- human-in-the-loop orchestration

Its strongest lesson is:

**turn workflow state into explicit artifacts and validate the prompt layer like code.**

Its biggest warning is:

**do not let convenience tooling, host packaging, and mutable markdown composition become an unbounded second system.**

---

## ADDENDUM — Deep Forensic Pass (Opus 4.6, 2026-03-29)

> What follows was found by a second independent audit of the full gstack codebase
> (CLAUDE.md, AGENTS.md, ARCHITECTURE.md, ETHOS.md, all SKILL.md files, all TypeScript
> source, Supabase edge functions, Chrome extension). These are elements that the first
> pass either missed entirely or touched only at the surface.

---

### 11. Builder Philosophy System (ETHOS.md) — a codified disposition engine

**Where found**

- `ETHOS.md` (root)
- Injected into every skill via `{{PREAMBLE}}` resolver in `scripts/resolvers/preamble.ts`

**What it is**

Four named principles, each with anti-patterns, applied as an always-on disposition layer:

| Principle | Core rule | Anti-pattern |
|-----------|-----------|--------------|
| **Boil the Lake** | If the complete implementation costs minutes more than the shortcut, do the complete thing | "Ship the shortcut", "Defer tests to follow-up" |
| **Search Before Building** | Before building anything unfamiliar, search first. Three layers: tried-and-true (L1), new-and-popular (L2), first-principles (L3). Prize L3 above all. | Rolling a custom solution when runtime has a built-in; accepting blog posts uncritically |
| **User Sovereignty** | AI models recommend, users decide. Two models agreeing is signal, not proof. | Acting on cross-model agreement without asking |
| **Eureka Moment** | When first-principles reasoning reveals conventional wisdom is wrong, name it, celebrate it, build on it | Assuming tried-and-true is always right |

**Why this matters for Vibe Science**

Our system already has LAW 11 (LISTEN TO THE USER) but lacks a structured philosophy framework that explains WHY each disposition rule exists and HOW to detect violations. ETHOS.md is not rules, it's a reasoning framework. The anti-patterns are the best part: they turn vague principles into concrete "if you catch yourself thinking X, you are violating Y" checks.

The "Three Layers of Knowledge" model maps perfectly onto how our researcher should think about literature: L1 = established findings, L2 = recent preprints/trends, L3 = novel hypotheses from data. And Vibe Science's entire purpose ("find what has NOT been done") is literally the Eureka Moment search.

**Draft implementation for Vibe Science**

- Create a `DISPOSITION.md` alongside the existing `roles.md` and `enforcement.md`
- Define 4-5 named dispositions with anti-pattern tables, each linked to one of our Immutable Laws
- Inject a condensed disposition reminder into the SessionStart hook context (like gstack does via preamble)
- Use the anti-pattern table format in R2 reviews: "This claim exhibits anti-pattern X from disposition Y"

---

### 12. Unified Preamble Architecture — cross-cutting concerns solved once

**Where found**

- `scripts/resolvers/preamble.ts` (generator)
- Every `SKILL.md.tmpl` file starts with `{{PREAMBLE}}`
- Runtime output parsed by every skill

**What it is**

Every skill begins with the same ~70-line bash block that handles 8 cross-cutting concerns in one shot:

1. **Update check** (version drift detection)
2. **Session tracking** (touches `~/.gstack/sessions/$PPID`, counts active sessions)
3. **Multi-session awareness** (3+ sessions = "ELI16 mode" where every question re-grounds context)
4. **Contributor mode** (self-dogfooding with field reports)
5. **Proactive behavior toggle** (user can opt out of auto-suggestions)
6. **Skill prefix awareness** (namespace collisions between skill packs)
7. **Repo mode detection** (is this gstack's own repo vs a user's project?)
8. **Telemetry bootstrap** (session ID, start timestamp, analytics log)

The preamble emits named variables (`BRANCH`, `PROACTIVE`, `REPO_MODE`, `LAKE_INTRO`, etc.) that the skill body reads in natural language. State is passed between preamble and skill via console output, not shell variables.

**Why this matters for Vibe Science**

Our SessionStart hook (`session-start.js`) does something similar but at a lower fidelity. The gstack preamble is better because:
- It runs inside the agent's own context (not just hook injection), so the agent sees the raw values
- It handles multi-session awareness (we don't)
- It has a progressive onboarding flow (telemetry prompt, completeness intro, proactive prompt) that fires exactly once per user

**Draft implementation for Vibe Science**

- Factor our SessionStart context into a two-part system: (a) hook injects DB-backed state, (b) preamble block inside skill runs session-local concerns
- Add multi-session awareness: if 2+ Vibe Science sessions are running, inject extra context grounding into each prompt
- Add progressive onboarding: first-time users get a condensed briefing on the system's purpose and laws

---

### 13. Completion Status Protocol — universal workflow termination contract

**Where found**

- Every `SKILL.md` file, section "Completion Status Protocol"
- Used by investigate, canary, benchmark, qa, review, ship, cso

**What it is**

Every skill terminates with exactly one of four statuses:

| Status | Meaning |
|--------|---------|
| `DONE` | All steps completed. Evidence provided for each claim. |
| `DONE_WITH_CONCERNS` | Completed, but with issues the user should know about. |
| `BLOCKED` | Cannot proceed. States what blocks and what was tried. |
| `NEEDS_CONTEXT` | Missing information. States exactly what is needed. |

Plus a formal escalation protocol:
- 3 failed attempts at a task → STOP and escalate
- Uncertain about security-sensitive change → STOP and escalate
- Scope exceeds what you can verify → STOP and escalate
- **"Bad work is worse than no work. You will not be penalized for escalating."**

**Why this matters for Vibe Science**

Our current system lacks a formal workflow termination vocabulary. Claims have status (`PROVISIONAL`, `ROBUST`, `KILLED`, `DISPUTED`) but the workflow itself doesn't. This means an agent can be in an ambiguous terminal state: did it finish? Did it give up? Did it run out of ideas? The gstack protocol forces clarity.

The escalation philosophy ("you will not be penalized for escalating") is the exact same principle as our Salvagente Rule. But gstack makes it dispositional: the agent doesn't just save a seed when killing, it actively stops doing bad work.

**Draft implementation for Vibe Science**

- Add workflow-level status to every cycle in STATE.md: `CYCLE_STATUS: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT`
- Add to R2's toolkit: R2 can declare `BLOCKED` if the evidence presented doesn't allow a verdict
- Make the escalation explicit in LAW 11: "3 failed R2 objections on the same claim without state change → DISPUTED + BLOCKED, not infinite loops"

---

### 14. Systematic Debugging Framework (investigate skill) — Iron Law + Scope Lock

**Where found**

- `investigate/SKILL.md`
- `investigate/SKILL.md.tmpl`
- Uses `freeze/bin/check-freeze.sh` for scope locking

**What it is**

5-phase debugging protocol with hard rules:

1. **Root Cause Investigation** — gather evidence, trace code path, check git log for regressions
2. **Scope Lock** — after forming hypothesis, lock edits to the affected module via freeze
3. **Pattern Analysis** — match against known bug patterns (race condition, nil propagation, state corruption, integration failure, config drift, stale cache). WebSearch for unknowns.
4. **Hypothesis Testing** — 3-strike rule: if 3 hypotheses fail, STOP and escalate
5. **Verification & Report** — structured debug report with symptom, root cause, fix, evidence, regression test, related items

The **Iron Law**: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST." Fixing symptoms creates whack-a-mole debugging.

Red flags that mean slow down:
- "Quick fix for now" — there is no "for now"
- Proposing a fix before tracing data flow — you're guessing
- Each fix reveals a new problem elsewhere — wrong layer, not wrong code

**Why this matters for Vibe Science**

This maps directly onto how our researcher should handle unexpected findings:
- Don't celebrate strong signals (= don't apply quick fixes)
- Trace the data path first (= run the confounder harness before claiming)
- 3-strike rule (= our circuit breaker pattern)
- Scope lock (= our Schema-Validated Gates preventing claims without proper evidence)

The pattern analysis table is the best steal: a lookup table of known failure modes that helps the agent classify what it's seeing before guessing.

**Draft implementation for Vibe Science**

- Create a "Known Artifact Patterns" table in a protocol file: batch effects, dropout artifacts, age confounding, tissue-type leakage, etc.
- When the researcher finds a strong signal, force pattern-matching against this table before promoting
- The 3-strike escalation → adopt literally for R2 review cycles

---

### 15. Worktree Manager with Patch Harvesting

**Where found**

- `lib/worktree.ts` (300 lines, self-contained)

**What it is**

A `WorktreeManager` class that:
1. Creates isolated git worktrees per test/agent run
2. Copies gitignored build artifacts into the worktree (so tests work)
3. After the run, **harvests** all changes as patches
4. Deduplicates patches across runs using SHA-256 hashing
5. Produces a harvest report ("3 of 5 test suites produced new changes, apply: `git apply path.patch`")
6. Auto-cleans on process exit, prunes stale worktrees from previous runs

The key architectural insight: worktrees give true filesystem isolation (not just branch isolation), and patch harvesting lets you cherry-pick agent-generated fixes without merging entire branches.

**Why this matters for Vibe Science**

When we run parallel sub-agents (LAW 8: EXPLORE BEFORE EXPLOIT), each agent currently operates in shared filesystem space. If two agents modify CLAIM-LEDGER.md simultaneously, we have a race condition. Worktree isolation solves this at the git level.

Patch harvesting is equally interesting: instead of agents committing to branches, they produce patches. The orchestrator then selectively applies patches, deduplicating identical changes.

**Draft implementation for Vibe Science**

- Adapt the WorktreeManager for Python/Node (our stack)
- When launching parallel researcher agents, give each a worktree
- After each agent returns, harvest patches and let the orchestrator merge selectively
- Use the dedup index to detect when two agents independently reach the same finding

---

### 16. Design Memory Extraction (Vision AI → Structured Knowledge)

**Where found**

- `design/src/memory.ts` — extracts design language from approved mockups via GPT-4o vision
- `design/src/session.ts` — multi-turn design iteration state (PID+timestamp keyed, JSON in /tmp)
- `design/src/evolve.ts` — screenshot-to-mockup evolution (analyze current → generate improved version)

**What it is**

A pattern for extracting structured, reusable knowledge from visual outputs:
1. Feed an image to a vision model
2. Extract structured JSON (colors, typography, spacing, layout, mood)
3. Write to a persistent file (DESIGN.md) that constrains future generation

The `evolve.ts` pattern is particularly interesting: it takes a screenshot of reality, analyzes it, then generates a "what it should look like" mockup incorporating requested changes. It starts from reality, not a blank canvas.

**Why this matters for Vibe Science**

This is a pattern for what we might call "figure memory." When our system generates visualizations (UMAP plots, volcano plots, heatmaps), the underlying aesthetic choices (color scales, annotation density, layout) could be extracted and persisted as constraints for future figures. This ensures visual consistency across a multi-session research project.

The evolve pattern maps to iterative figure refinement: take the current plot, describe what's wrong ("the cluster labels overlap", "the color scale doesn't distinguish the three groups"), generate an improved version.

**Draft implementation for Vibe Science**

- Create a `FIGURE-CONVENTIONS.md` (analogous to DESIGN.md) that captures per-project visualization standards
- After each R2-approved figure, extract conventions (color palette, annotation style, layout) and merge into the convention file
- Use these conventions as constraints for future figure generation

---

### 17. Telemetry Architecture — 3-Tier Consent with Local-First Analytics

**Where found**

- Every `SKILL.md` preamble + telemetry footer
- `scripts/analytics.ts` — local CLI for viewing usage stats
- `supabase/functions/telemetry-ingest/index.ts` — server-side ingestion
- `supabase/functions/community-pulse/index.ts` — aggregated community dashboard

**What it is**

A complete telemetry system with:

1. **Local-first**: Every skill invocation logs to `~/.gstack/analytics/skill-usage.jsonl` unconditionally. No network needed.
2. **3-tier consent**: `community` (stable device ID, full data), `anonymous` (no ID, just counter), `off` (local only)
3. **Progressive consent UX**: First session asks about telemetry with a 2-step funnel (community → anonymous → off). Asks exactly once.
4. **Analytics CLI**: `bun run scripts/analytics.ts --period 7d` shows top skills, per-repo breakdown, safety hook fires
5. **Community pulse**: Server-side aggregation of weekly active users, top skills, crash clusters, version distribution. Cached for 1 hour to prevent DoS.

The local JSONL format:
```json
{"skill":"investigate","duration_s":"45","outcome":"success","browse":"false","session":"1234-1711700000","ts":"2026-03-29T10:00:00Z"}
```

**Why this matters for Vibe Science**

We already have a `spine` concept (append-only log entries) and a SQLite database. But we lack:
- Skill-level usage tracking (which flows are used most? which get abandoned?)
- Duration tracking (which analyses take unreasonably long?)
- Outcome tracking (success/error/abort per analysis type)
- Session-level aggregation (how many cycles per session? what's the dropout rate?)

The local-first philosophy is essential: our system already respects LAW 10 (CRYSTALLIZE OR LOSE). Telemetry should follow the same pattern.

**Draft implementation for Vibe Science**

- Add a `skill-usage.jsonl` to `.vibe-science/` that logs each flow/command invocation
- Track: flow name, duration, outcome, number of R2 reviews triggered, claims generated, claims killed
- Add an analytics command (`/flow-status analytics`) that surfaces patterns like "literature flows average 3 minutes, experiment flows average 45 minutes"
- Use these metrics to calibrate gate thresholds dynamically

---

### 18. AskUserQuestion Format — structured user interaction contract

**Where found**

- Every `SKILL.md` file, section "AskUserQuestion Format"
- Referenced in CLAUDE.md

**What it is**

A 4-part structure for every question to the user:

1. **Re-ground**: State the project, current branch, current task (1-2 sentences). Assumes the user hasn't looked at this window in 20 minutes.
2. **Simplify**: Explain in plain English a smart 16-year-old could follow. No jargon, no function names. Use analogies.
3. **Recommend**: `RECOMMENDATION: Choose [X] because [reason]`. Each option gets a `Completeness: X/10` score.
4. **Options**: Lettered `A) ... B) ... C) ...` with effort estimates showing both human and AI time.

The "20-minute assumption" is the key insight: treat every user interaction as if the user lost context.

**Why this matters for Vibe Science**

Our system forces user interaction at gates (LAW 11). But we don't have a standardized format for those interactions. The result is that some gate prompts are clear and some are walls of text. The gstack format solves this by:
- Always re-grounding (what are we doing? where are we?)
- Always simplifying (don't dump raw analysis)
- Always recommending with evidence
- Always giving discrete options

**Draft implementation for Vibe Science**

- Standardize all user-facing prompts in our flows to follow a 4-part template
- Add a `Confidence: X` to each option (mapping to our 0-1 confidence scale)
- Add the "20-minute assumption" to our flow protocols: every user prompt should be self-contained
- Add to CLAUDE.md as a required pattern for all AskUserQuestion calls

---

### 19. Canary Monitoring Pattern — baseline-relative anomaly detection

**Where found**

- `canary/SKILL.md`
- `benchmark/SKILL.md`

**What it is**

A monitoring pattern with key principles:

1. **Alert on changes, not absolutes** — a page with 3 console errors in baseline is fine if it still has 3. One NEW error is an alert.
2. **Transient tolerance** — only alert on patterns persisting across 2+ consecutive checks. Single blips are noise.
3. **Baseline is king** — without a baseline, monitoring is just a health check.
4. **Relative thresholds** — performance regression = >50% increase OR >500ms absolute. Warning = >20% increase.
5. **Evidence-based alerts** — every alert includes a screenshot/artifact path. No exceptions.

The benchmark skill adds:
- Performance budgets (industry baselines as fallback)
- Trend analysis across historical runs
- Leading indicators (bundle size is deterministic; load time varies with network)

**Why this matters for Vibe Science**

This is exactly the pattern we need for our confounder harness (LAW 9). When we run `raw → conditioned → matched`:
- "Alert on changes, not absolutes" = report the delta between stages, not the absolute p-value
- "Transient tolerance" = a single run showing collapse might be random; require replication
- "Baseline is king" = the raw analysis IS the baseline; conditioned and matched are the "post-deploy" checks
- "Relative thresholds" = collapse >50% = CONFOUNDED; sign change = ARTIFACT

**Draft implementation for Vibe Science**

- Formalize the confounder harness thresholds using the same graduated system: WARNING (>20% change), REGRESSION (>50% change), CRITICAL (sign reversal)
- Require 2+ concordant analyses before promoting a confounder result
- Track harness results over time (like benchmark trend analysis) to detect systematic biases

---

### 20. Cross-Model Verification (codex skill)

**Where found**

- `codex/SKILL.md`
- Referenced in `autoplan/SKILL.md` as part of the multi-review pipeline

**What it is**

A skill that sends the current plan/code to a second AI model (OpenAI Codex CLI) for an independent review. The second model doesn't see the first model's reasoning. The autoplan pipeline runs: CEO review → design review → eng review → codex review, where each pass is blind to the others.

Key principle from ETHOS.md: "Two AI models agreeing on a change is a strong signal. It is not a mandate."

**Why this matters for Vibe Science**

This is literally our R2 ensemble pattern. But gstack operationalizes it differently:
- They use it for plan review, not claim verification
- The blind-first pass is structural (codex doesn't see Claude's reasoning)
- They explicitly acknowledge that cross-model agreement is signal, not proof

The gstack implementation validates our Blind-First Pass (BFP) design.

**Draft implementation for Vibe Science**

- No structural change needed (we already have BFP + R2 ensemble)
- But adopt the explicit "agreement is signal, not proof" phrasing in our R3 judge rubric
- Consider adding cross-model verification for high-confidence claims: send to a different model family for independent validation

---

### 21. Voice/Tone System with Banned Vocabulary

**Where found**

- Every `SKILL.md` file, "Voice" section
- `ETHOS.md`
- `CLAUDE.md` section "Community PR guardrails"

**What it is**

A complete anti-sycophancy and anti-corporate-speak system:

**Banned AI vocabulary**: delve, crucial, robust, comprehensive, nuanced, multifaceted, furthermore, moreover, additionally, pivotal, landscape, tapestry, underscore, foster, showcase, intricate, vibrant, fundamental, significant, interplay

**Banned phrases**: "here's the kicker", "here's the thing", "plot twist", "let me break this down", "the bottom line", "make no mistake", "can't stress this enough"

**Required style**: short paragraphs, incomplete sentences sometimes, punchy standalone sentences ("That's it." "Wild." "Not great."), name the file/function/line number, real numbers not vague qualifiers.

**Why this matters for Vibe Science**

When an agent writes to CLAIM-LEDGER.md or produces R2 reports, it tends to use exactly this banned vocabulary. "The results are robust and comprehensive" means nothing. "p < 0.001 after matching, OR drops from 2.30 to 1.45, survives sensitivity analysis" means something.

**Draft implementation for Vibe Science**

- Add a banned vocabulary list to our CLAUDE.md or a protocol file
- PostToolUse hook: when writing to CLAIM-LEDGER or R2 reports, scan for banned words and emit a warning
- Not a hard block (would be too aggressive), but an advisory that says "ADVISORY: claim contains 3 banned AI-vocabulary words. Consider revising for precision."

---

### 22. Multi-Session Awareness

**Where found**

- Every `SKILL.md` preamble
- `~/.gstack/sessions/` directory
- `CLAUDE.md` reference to "ELI16 mode"

**What it is**

Each session touches a file `~/.gstack/sessions/$PPID`. The preamble counts files modified in the last 2 hours. When 3+ sessions are running, all skills enter "ELI16 mode" — every question re-grounds the user on context because they're juggling multiple windows.

**Why this matters for Vibe Science**

Our system already detects active sessions via the database. But we don't adapt behavior based on session count. When a user is running 3+ parallel research sessions, the prompts should be more self-contained and the status reports more compact, because the user is context-switching constantly.

**Draft implementation for Vibe Science**

- SessionStart hook: count active sessions from DB
- If 2+ active sessions: inject a `[MULTI-SESSION]` tag into context
- When `[MULTI-SESSION]` is active: all prompts include a 1-line summary of current state, and STATUS.md updates are more frequent

---

### 23. E2E Failure Blame Protocol

**Where found**

- `CLAUDE.md` section "E2E eval failure blame protocol"

**What it is**

A formal rule: **never claim "not related to our changes" without proving it**.

Required before attributing a failure to "pre-existing":
1. Run the same eval on main/base branch and show it fails there too
2. If it passes on main but fails on the branch — it IS your change
3. If you can't run on main — say "unverified — may or may not be related"

"Pre-existing without receipts is a lazy claim. Prove it or don't say it."

**Why this matters for Vibe Science**

This is exactly the problem we see when the researcher encounters unexpected results and says "this is a known artifact of the dataset." Our LAW 9 (confounder harness) addresses this at the quantitative level, but this blame protocol addresses it at the workflow level: you cannot dismiss a finding without evidence that the finding exists independently of your intervention.

**Draft implementation for Vibe Science**

- Add to the researcher role constraints: "When attributing an unexpected result to a known artifact, you MUST provide evidence (citation, prior analysis, baseline comparison). 'This is probably a batch effect' without showing the batch variable's distribution is insufficient."
- Add to R2's review checklist: "Did the researcher dismiss any unexpected findings? If so, was evidence provided?"

---

## Updated Adoption Priority (post-addendum)

### Priority A+ — steal immediately (new items)

1. **Builder Philosophy / Disposition Engine** (item 11) — highest-value, lowest-risk
2. **Completion Status Protocol** (item 13) — trivial to adopt, immediate clarity gain
3. **AskUserQuestion Format** (item 18) — standardizes all user interactions
4. **E2E Failure Blame Protocol** (item 23) — directly strengthens LAW 9
5. **Banned Vocabulary System** (item 21) — anti-sycophancy for R2 and claims

### Priority A (confirmed from original audit)

6. Generated prompt/command surface from one manifest
7. Prompt hygiene + freshness tests
8. Structured review artifacts + readiness dashboard
9. Touchfiles-based eval routing
10. Agent-run observability artifacts

### Priority B+ — steal when building infrastructure (new items)

11. **Telemetry Architecture** (item 17) — requires analytics table in our schema
12. **Unified Preamble Architecture** (item 12) — requires refactoring SessionStart
13. **Worktree Manager with Patch Harvesting** (item 15) — for parallel agent isolation
14. **Multi-Session Awareness** (item 22) — requires session counting in hooks
15. **Canary/Baseline-Relative Thresholds** (item 19) — for confounder harness formalization

### Priority B (confirmed from original audit)

16. Autoplan fused review pipeline
17. Artifactized workflow memory and lineage
18. Report-only vs mutation modes
19. Simple guardrails (careful/freeze)

### Priority C — later modules (new items)

20. **Design Memory Extraction** (item 16) — for figure conventions system
21. **Systematic Debugging Framework** (item 14) — already partially covered by our protocols
22. **Cross-Model Verification** (item 20) — already implemented via R2 ensemble

---

## Meta-Observation

The deepest lesson from this second pass is NOT about any single feature. It's about **dispositional engineering**.

gstack treats agent behavior as a first-class design surface. Every skill has: a philosophy (ETHOS), a disposition (Voice), a termination contract (Completion Status), an escalation path (3-strike rule), a self-diagnosis capability (contributor mode), and a feedback loop (telemetry). These aren't features. They're the immune system of the project.

Our Vibe Science system has the equivalent of ETHOS (the Immutable Laws) and disposition (the agent roles). But we lack:
- A formal termination contract (when is a cycle DONE vs BLOCKED?)
- A self-diagnosis capability (the system can't report on its own failures)
- A progressive onboarding flow (new sessions get the same cold start)
- Anti-sycophancy enforcement at the vocabulary level

These are the four gaps this addendum closes.
