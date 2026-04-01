# Superpowers Forensic Audit

**Repo:** `https://github.com/obra/superpowers`  
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\superpowers`  
**Audit date:** 2026-03-29  
**Goal:** extract concrete ideas, patterns, and anti-patterns that can improve the evolution around the Vibe Science kernel

---

## Quick X-Ray

- repo shape: host-packaged workflow system built from skills, commands, hooks, plugin manifests, docs, and a small visual companion runtime
- strongest theme: **treat the agent session as a disciplined workflow OS, not as an unstructured chat**
- strongest reusable ideas: **bootstrap discipline, plan-as-artifact, staged subagent execution, transcript-level testing, and a lightweight second visual surface**
- biggest risk: **multi-host packaging is broader than the actual maintained runtime surface**
- biggest warning for us: **copy the operating patterns, not the whole superpowers belief system**

---

## Pass 1 - Useful Elements To Capture

### 1. Bootstrap the session with one small operating skill, not with the whole library

**Where found**

- `skills/using-superpowers/SKILL.md`
- `README.md`
- `.claude-plugin/plugin.json`
- `.codex/INSTALL.md`

**Why it matters for Vibe Science**

- Superpowers gets leverage by teaching the agent how to find and invoke the rest of the library before it starts acting.
- The useful idea is not the coercive wording; it is the **seed skill** pattern.
- We already care about keeping Vibe Science lean at session start. A seed layer lets us keep the initial surface small while still exposing richer protocols on demand.

**Draft Vibe Science implementation**

- Add one small outer-project bootstrap asset, for example `environment/skills/using-vibe-environment/SKILL.md`.
- Its job should be narrow:
  - explain command shims
  - explain flow-state files
  - explain when to use workspace-first vs CLI bridge
  - point to specific outer-project protocols
- Keep it descriptive, not coercive. Do not copy the "1% chance means MUST use skill" stance.

---

### 2. Treat workflow as a first-class product surface, not as scattered tips

**Where found**

- `README.md`
- `skills/brainstorming/SKILL.md`
- `skills/writing-plans/SKILL.md`
- `skills/subagent-driven-development/SKILL.md`
- `skills/requesting-code-review/SKILL.md`

**Why it matters for Vibe Science**

- Superpowers is opinionated about order: clarify, design, plan, execute, review, finish.
- That sequence is what makes the repo feel coherent even though much of it is prompt text.
- Vibe Science needs the same discipline around research work:
  - orient
  - inspect evidence
  - move the right flow forward
  - create artifacts
  - review before promotion/export

**Draft Vibe Science implementation**

- Keep the outer project explicitly workflow-shaped:
  - `/flow-status`
  - `/flow-literature`
  - `/flow-experiment`
  - later `/flow-writing`
- For each flow, define:
  - entry conditions
  - required artifacts
  - allowed outputs
  - review/exit conditions
- Do not let the command layer become a loose pile of helper prompts.

---

### 3. One-question-at-a-time cognitive load management is a real design asset

**Where found**

- `README.md`
- `skills/brainstorming/SKILL.md`
- `skills/brainstorming/visual-companion.md`

**Why it matters for Vibe Science**

- Superpowers repeatedly breaks work into chunks that the operator can actually read and approve.
- This matters for us because research work is high-load and often ambiguity-heavy.
- The main benefit is not "friendlier UX"; it is **reducing premature consent and uninspected drift**.

**Draft Vibe Science implementation**

- In flow shims and future protocol docs, prefer:
  - one decision at a time
  - one unresolved ambiguity at a time
  - one reviewable artifact at a time
- Add an explicit style rule in outer-project prompts:
  - do not dump a whole design or a whole recovery plan when one clarification question would unblock the next step

---

### 4. Implementation plans as executable artifacts, not vague prose

**Where found**

- `skills/writing-plans/SKILL.md`
- `docs/superpowers/plans/2026-03-23-codex-app-compatibility.md`
- `docs/superpowers/specs/2026-03-23-codex-app-compatibility-design.md`

**Why it matters for Vibe Science**

- Superpowers is strongest when it turns a design into a concrete artifact with:
  - exact files
  - exact tests
  - exact commands
  - explicit handoff
- That fits our philosophy extremely well. We already care about spec fidelity and measurable gates.

**Draft Vibe Science implementation**

- When we move from blueprint to implementation plan, require a stricter artifact format:
  - file-level ownership
  - acceptance criteria
  - verification commands
  - rollback/boundary notes
- Store those plans in the repo, not in ephemeral chat.
- Reuse this pattern both for Vibe Science upgrades and for the future outer-product work.

---

### 5. Coordinator -> implementer -> reviewer is a reusable operating pattern

**Where found**

- `skills/subagent-driven-development/SKILL.md`
- `skills/requesting-code-review/SKILL.md`
- `skills/requesting-code-review/code-reviewer.md`
- `agents/code-reviewer.md`
- `docs/testing.md`

**Why it matters for Vibe Science**

- Superpowers uses structure, not vibes:
  - one coordinating agent
  - fresh implementers
  - explicit review passes
  - review order discipline
- This maps well to our adversarial-review culture.

**Draft Vibe Science implementation**

- Keep the pattern, but specialize it for research-product work:
  - drafter
  - adversarial reviewer
  - repo-grounding verifier
- When we automate plan execution later, encode review order explicitly:
  - spec compliance first
  - architecture/invariants second
  - code quality and tests third

---

### 6. Prompt behavior can be tested like product behavior

**Where found**

- `docs/testing.md`
- `tests/claude-code/README.md`
- `tests/claude-code/test-subagent-driven-development.sh`
- `tests/skill-triggering/run-test.sh`

**Why it matters for Vibe Science**

- This is one of the most important lessons in the repo.
- Superpowers does not treat prompt behavior as untouchable magic. It treats it as something testable through real sessions and transcript inspection.
- For our future flow shims, this is exactly the right mindset.

**Draft Vibe Science implementation**

- Add a later test harness for flow commands that validates:
  - the command chooses the right substrate
  - the command does not claim data it cannot read
  - the command writes the expected outer-project artifacts
  - the command degrades honestly when the CLI bridge is unavailable
- Keep unit tests for JS runtime code and transcript/session tests for prompt behavior.

---

### 7. A lightweight second surface can be valuable when the question is genuinely visual

**Where found**

- `skills/brainstorming/visual-companion.md`
- `skills/brainstorming/scripts/server.cjs`
- `skills/brainstorming/scripts/frame-template.html`
- `tests/brainstorm-server/server.test.js`
- `tests/brainstorm-server/ws-protocol.test.js`

**Why it matters for Vibe Science**

- The visual companion is not the whole product. It is a narrow second surface for cases where pictures beat prose.
- That is useful for us in specific situations:
  - figure layout review
  - architecture diagrams
  - flow maps
  - experiment comparison boards
- The real lesson is the **filesystem-state bus** idea: simple artifacts, simple server, explicit paths.

**Draft Vibe Science implementation**

- Do not add this in Phase 1.
- Consider a later optional helper for:
  - figure review
  - workflow diagrams
  - experiment gallery comparison
- If we build it, keep it narrow:
  - project-scoped files
  - local-only by default
  - no hidden state
  - no claim/evidence truth in the browser surface

---

### 8. Content-bundle packaging across hosts is better than rebuilding the product per host

**Where found**

- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`
- `.opencode/plugins/superpowers.js`
- `docs/README.codex.md`
- `docs/README.opencode.md`
- `gemini-extension.json`
- `GEMINI.md`

**Why it matters for Vibe Science**

- Superpowers ships mostly the same content through several host wrappers.
- The useful idea is: **skills and workflow assets are the real product; host packaging is an adapter layer**.
- That aligns with our current decision to treat Claude-native channels/scheduling as substrate, not as product identity.

**Draft Vibe Science implementation**

- Keep V1 Claude Code-first.
- But structure `environment/` so it could later feed:
  - Claude Code command shims
  - other prompt hosts
  - future channel-driven surfaces
- Separate:
  - canonical content
  - host packaging metadata
  - runtime JS helpers

---

### 9. Keep deprecation shims instead of breaking operators abruptly

**Where found**

- `commands/brainstorm.md`
- `commands/write-plan.md`
- `commands/execute-plan.md`

**Why it matters for Vibe Science**

- These files are tiny, but the pattern is useful.
- When a command surface changes, a thin compatibility shim prevents user confusion and preserves migration clarity.
- This will matter for us if flow commands evolve or get renamed.

**Draft Vibe Science implementation**

- If we ever replace a command, ship a short compatibility shim for one release cycle.
- The shim should:
  - tell the operator what changed
  - point to the canonical replacement
  - avoid pretending the old behavior still exists

---

### 10. Anti-rationalization language is crude, but the underlying review discipline is valuable

**Where found**

- `skills/using-superpowers/SKILL.md`
- `skills/requesting-code-review/code-reviewer.md`

**Why it matters for Vibe Science**

- Superpowers overstates the rule, but it is reacting to a real problem: agents love to improvise and then justify the shortcut after the fact.
- We have already seen that same failure mode in our own adversarial-review workflow.
- The part worth copying is the insistence on:
  - explicit checklisting
  - explicit review order
  - explicit severity
  - explicit verdicts

**Draft Vibe Science implementation**

- Keep our own review protocol strict.
- Borrow the useful mechanics:
  - checklist before claiming readiness
  - issue severity
  - file-grounded findings
  - no "looks good" without evidence
- Do not copy the overbearing tone or universal-skill absolutism.

---

### 11. Local persistence for auxiliary surfaces should be project-scoped and inspectable

**Where found**

- `skills/brainstorming/visual-companion.md`
- `skills/brainstorming/scripts/start-server.sh`
- `skills/brainstorming/scripts/stop-server.sh`

**Why it matters for Vibe Science**

- Superpowers stores brainstorm state under a project-local hidden directory and treats it as disposable runtime state.
- That is a good substrate pattern.
- We already made a similar move with `.vibe-science-environment/`; this repo strengthens that decision.

**Draft Vibe Science implementation**

- Keep auxiliary outer-project state in a project-scoped hidden directory.
- Make sure every extra surface writes inspectable files, not opaque session-only state.
- Keep a hard boundary:
  - `.vibe-science/` = kernel-owned truth/projections
  - `.vibe-science-environment/` = outer-project runtime state

---

## Pass 2 - What Not To Copy Blindly

### 1. Do not copy the coercive bootstrap contract

**Where found**

- `skills/using-superpowers/SKILL.md`

**Why it is risky**

- The "even a 1% chance means you ABSOLUTELY MUST invoke the skill" stance is designed to overpower lazy agent behavior.
- It does create discipline, but it also creates friction, over-triggering, and a slightly hostile operating style.
- For a research product, that tone would become annoying fast.

**Vibe Science stance**

- Keep explicit workflow guidance.
- Drop the absolutist language.
- Use narrow, context-specific triggers instead of universal compulsion.

---

### 2. Do not copy multi-host breadth unless we are ready to maintain it

**Where found**

- `README.md`
- `.claude-plugin/plugin.json`
- `.cursor-plugin/plugin.json`
- `.opencode/plugins/superpowers.js`
- `gemini-extension.json`
- `docs/README.codex.md`
- `docs/README.opencode.md`

**Why it is risky**

- The repo promises several host surfaces, but the maintenance quality is uneven.
- The code and docs still feel Claude-first, with partial drift on other hosts.
- Breadth without parity creates false confidence.

**Vibe Science stance**

- Stay Claude Code-first for V1.
- Only add new hosts when we can maintain them as first-class citizens.

---

### 3. Do not ship install/update paths that track live upstream by default

**Where found**

- `.codex/INSTALL.md`
- `.opencode/INSTALL.md`
- `docs/README.codex.md`
- `docs/README.opencode.md`

**Why it is risky**

- The install/update story is effectively "fetch from upstream and follow the latest state."
- That is fast for a moving tool, but it weakens reproducibility and reviewability.
- This is especially bad for a system where prompt behavior is part of the product.

**Vibe Science stance**

- Prefer pinned versions, reviewed releases, or explicit update gates.
- Treat prompt/skill changes like code changes.

---

### 4. Do not confuse "there are tests" with "the repo has a reliable test surface"

**Where found**

- `docs/testing.md`
- `tests/brainstorm-server/`
- `tests/claude-code/`
- `tests/opencode/run-tests.sh`
- `package.json`

**Why it is risky**

- There are good tests in pockets of the repo.
- But there is no root `npm test`, no obvious CI workflow, and at least one host-specific harness is stale.
- This creates a misleading impression of overall health.

**Vibe Science stance**

- Keep one obvious test entrypoint for each layer we add.
- Do not let per-surface tests drift into hidden silos.

---

### 5. Do not normalize bypassed permissions as the default testing strategy

**Where found**

- `docs/testing.md`
- `tests/claude-code/README.md`

**Why it is risky**

- Some tests depend on broad or bypassed permissions to simulate end-to-end behavior.
- That may be pragmatic for agent testing, but it can normalize unsafe expectations.

**Vibe Science stance**

- Use elevated permissions only where the test truly requires them.
- Keep the normal runtime model and permission model visible in docs and tests.

---

### 6. Do not expose a local companion server as a casual remote service

**Where found**

- `skills/brainstorming/visual-companion.md`
- `skills/brainstorming/scripts/server.cjs`

**Why it is risky**

- The brainstorm server is fine as a local helper.
- But the docs also discuss non-loopback binding, and the server is not designed like an authenticated internet-facing app.
- That creates an attractive footgun.

**Vibe Science stance**

- If we ever build a similar helper, default to localhost only.
- If remote access ever becomes necessary, treat that as a separate security design, not as a flag flip.

---

### 7. Do not let Windows degrade silently

**Where found**

- `hooks/run-hook.cmd`
- `docs/windows/polyglot-hooks.md`

**Why it is risky**

- Cross-platform support that fails softly can create invisible behavior gaps.
- Silent "success" when a dependency is missing is worse than a loud failure in a workflow product.

**Vibe Science stance**

- Fail loudly when a required runtime helper is missing.
- Write degradation paths that are explicit to the operator, not hidden in wrapper scripts.

---

### 8. Do not keep deprecated affordances around too long

**Where found**

- `commands/brainstorm.md`
- `commands/write-plan.md`
- `commands/execute-plan.md`

**Why it is risky**

- The compatibility shims are useful for migration, but if they linger too long they become permanent ambiguity.
- A prompt product gets confusing fast when two ways of doing the same thing coexist.

**Vibe Science stance**

- Use deprecation shims deliberately and remove them on schedule.

---

## Pass 3 - Recommended Adoption Order For Vibe Science

### 1. Adopt immediately at the spec/process layer

- seed-skill/bootstrap pattern
- one-question-at-a-time operator pacing
- explicit review order and anti-rationalization checklists
- plan-as-artifact discipline

### 2. Adopt next at the outer-project runtime boundary

- keep content canonical and host packaging thin
- organize `environment/` into:
  - canonical prompt assets
  - templates/schemas
  - runtime JS helpers
  - host-specific wrappers only where needed

### 3. Adopt next in testing

- add transcript-level tests for flow command behavior
- validate degradation paths, not only happy-path CLI output
- keep one obvious test entrypoint per layer

### 4. Consider later as optional product enhancements

- a narrow visual companion for:
  - figure review
  - workflow diagrams
  - experiment comparison
- saved/reviewed procedural protocols derived from successful workflows

### 5. Explicitly reject for now

- multi-host parity promises
- remote-capable companion server
- coercive always-use-skill doctrine
- live unpinned update channels

---

## Validation Notes

### What I actually validated

- read the repo structure, install docs, host packaging files, skills, command stubs, hook wrappers, test docs, brainstorm runtime, and sample dogfooding specs/plans
- ran Node-based brainstorm-server tests after installing local test dependency:
  - `npm install --no-audit --no-fund`
  - `npm test`
  - `node ws-protocol.test.js`
- verified that the brainstorm-server test pocket is healthy
- verified that the repo root does **not** expose a usable `npm test` entrypoint
- verified that the OpenCode test harness is stale

### Command results

- `tests/brainstorm-server/npm test`: passed
- `tests/brainstorm-server/node ws-protocol.test.js`: passed
- repo root `npm test`: failed with missing script
- `bash tests/opencode/run-tests.sh`: failed immediately because expected `lib/` path is missing

### Limits of this pass

- I did not run Claude-hosted headless integration tests because that depends on host tooling/config not available in this environment.
- The audit is still strongly grounded because the repo itself documents the intended testing strategy and enough local runtime/tests were executable to expose the health pattern.

---

## Bottom Line

Superpowers is useful to us mainly as a **workflow-discipline repo**, not as a runtime architecture to clone.

The strongest things to borrow are:

- session bootstrap through a tiny seed layer
- plan and review as explicit artifacts
- transcript-level testing of agent behavior
- lightweight second surfaces only when the problem is genuinely visual
- host packaging as an adapter over canonical workflow content

The strongest things to avoid are:

- coercive bootstrap behavior
- multi-host promises without maintenance parity
- unpinned update flows
- silent degradation and fragmented test surfaces

If we borrow selectively, `superpowers` can improve the **operating discipline** of the Vibe Science outer project without pulling us into a bloated multi-host workflow framework.

---

## ADDENDUM — Deep Forensic Pass (Opus 4.6, 2026-03-29)

> What follows was found by reading every SKILL.md, every prompt template,
> every support file, and every test harness in the repo. These are elements
> the first pass either missed entirely or touched only at surface level.

---

### 12. Two-Stage Review Pipeline with Ordered Review Gates

**Where found**

- `skills/subagent-driven-development/SKILL.md` — full workflow with graphviz
- `skills/subagent-driven-development/spec-reviewer-prompt.md` — spec compliance reviewer
- `skills/subagent-driven-development/code-quality-reviewer-prompt.md` — quality reviewer

**What it is**

After each implementation task, TWO review stages run in strict order:

1. **Spec Compliance Review** — "Did you build what was asked?" Checks: missing requirements, extra/unneeded work, misunderstandings. Binary verdict: compliant or issues found.
2. **Code Quality Review** — "Is what you built well-made?" Only runs AFTER spec compliance passes.

The review order is a hard constraint: "Start code quality review before spec compliance is ✅" is listed as a Red Flag.

If either reviewer finds issues: the implementer fixes → reviewer re-reviews → repeat until approved. No moving to the next task while either review has open issues.

The spec-reviewer prompt contains this crucial line: **"The implementer finished suspiciously quickly. Their report may be incomplete, inaccurate, or optimistic. You MUST verify everything independently."**

**Why this matters for Vibe Science**

This is EXACTLY our R2 review architecture, but more precisely ordered. Our current system has R2 INLINE (during research) and R2 FORCED (at gates), but we don't explicitly sequence: "first check if the researcher answered the right question, then check if the answer is well-constructed."

The "do not trust the report" instruction maps directly to our Blind-First Pass (BFP) design.

**Draft implementation for Vibe Science**

- Split R2 review into two explicit passes:
  1. **Hypothesis Compliance**: Does the analysis answer the actual question? Is the evidence relevant? Is anything missing from the spec?
  2. **Analysis Quality**: Is the statistical method correct? Is the confounder harness applied? Are the confidence bounds right?
- Enforce order: quality review cannot start until hypothesis compliance is confirmed
- Add the "do not trust the researcher's summary" instruction to the R2 prompt

---

### 13. Four-Status Implementer Protocol (DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT)

**Where found**

- `skills/subagent-driven-development/implementer-prompt.md` — status definitions
- `skills/subagent-driven-development/SKILL.md` — controller handling per status

**What it is**

Every implementer sub-agent reports exactly one of four statuses:

| Status | Meaning | Controller action |
|--------|---------|-------------------|
| `DONE` | Completed, all good | Proceed to spec review |
| `DONE_WITH_CONCERNS` | Completed but has doubts | Read concerns, address if correctness-related, then review |
| `NEEDS_CONTEXT` | Missing information | Provide context, re-dispatch |
| `BLOCKED` | Cannot complete | Assess: context problem → more context; reasoning limit → more capable model; too large → break into pieces; plan wrong → escalate to human |

The controller handling for BLOCKED is explicitly graded: "Never ignore an escalation or force the same model to retry without changes. If the implementer said it's stuck, something needs to change."

**Why this matters for Vibe Science**

This is the same protocol we found in gstack (item 13 of that audit). Its independent emergence in a second repo confirms it's a convergent pattern, not an accident. Our system needs this vocabulary for cycle termination AND for sub-agent returns.

The BLOCKED escalation ladder is particularly valuable: change context → change model → break task → escalate to human. This is a formal decision tree for what to do when an agent fails.

**Draft implementation for Vibe Science**

- Adopt this protocol for both cycle-level and sub-agent-level termination
- Add the escalation ladder to our researcher role: when analysis fails 3 times, the options are: more context, different approach, break the question, escalate to user

---

### 14. Verification Before Completion (Evidence Gate)

**Where found**

- `skills/verification-before-completion/SKILL.md` — complete skill

**What it is**

Iron Law: **"NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE."**

The gate function (applied before ANY claim of success):
1. **IDENTIFY**: What command/check proves this claim?
2. **RUN**: Execute it fresh and complete
3. **READ**: Full output, check exit code, count failures
4. **VERIFY**: Does output confirm the claim?
5. **ONLY THEN**: Make the claim

Common failure table:

| Claim | Requires | NOT sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Bug fixed | Test original symptom: passes | "Code changed, assumed fixed" |
| Requirements met | Line-by-line checklist | "Tests passing" |
| Agent completed | VCS diff shows changes | "Agent reports success" |

Red flags: "should", "probably", "seems to", expressing satisfaction before verification, trusting agent success reports, "just this once."

**Why this matters for Vibe Science**

This is a formalization of our LAW 3 (GATES BLOCK). But superpowers makes it more specific: it's not just "gates block" but "here's the exact 5-step gate function, and here are the 8 rationalizations you'll try to use to skip it." The rationalization table is the most useful part.

**Draft implementation for Vibe Science**

- Add the gate function to every Schema-Validated Gate:
  1. What artifact proves this gate passes?
  2. Run schema validation fresh
  3. Read validation output
  4. Verify: does output confirm all required fields present?
  5. Only then: mark gate as PASSED
- Add the rationalization table to R2's review prompt: "If the researcher says 'the confounder harness should be fine', that is a rationalization, not evidence"

---

### 15. Model Selection Strategy per Task Complexity

**Where found**

- `skills/subagent-driven-development/SKILL.md` — "Model Selection" section

**What it is**

Explicit guidance for choosing which model to use per sub-agent role:

| Task type | Model tier | Signals |
|-----------|-----------|---------|
| Mechanical implementation | Cheap/fast | 1-2 files, complete spec, isolated function |
| Integration and judgment | Standard | Multi-file coordination, pattern matching, debugging |
| Architecture, design, review | Most capable | Design judgment, broad codebase understanding |

The principle: "Use the least powerful model that can handle each role to conserve cost and increase speed."

**Why this matters for Vibe Science**

Our AGENTS.md defines 7 agent types with different model selections. But we don't have explicit complexity signals for when to escalate to a more capable model. The superpowers pattern makes this a decision tree, not a static mapping.

**Draft implementation for Vibe Science**

- Add complexity signals to our agent dispatch:
  - Literature search → standard model (mechanical, well-scoped)
  - Confounder analysis → capable model (multi-dataset integration)
  - R2 adversarial review → most capable model (requires judgment)
  - R3 meta-review → capable model (scoring rubric)
- Allow the orchestrator to re-dispatch with a more capable model when a sub-agent returns BLOCKED

---

### 16. Root Cause Tracing: Trace Backward, Fix at Source, Defense in Depth

**Where found**

- `skills/systematic-debugging/root-cause-tracing.md` — named technique
- `skills/systematic-debugging/defense-in-depth.md` — complementary pattern
- `skills/systematic-debugging/find-polluter.sh` — test bisection script

**What it is**

A 5-step tracing protocol:
1. Observe symptom
2. Find immediate cause
3. Ask "what called this?" → trace one level up
4. Keep tracing until you find the original trigger (often 5+ levels deep)
5. Fix at source, then add validation at every layer in between (defense in depth)

The "defense in depth" companion: after fixing the root cause, add validation at EACH layer the data passed through. This makes the same bug class impossible at multiple levels.

The `find-polluter.sh` script: bisects test files to find which test is polluting shared state. Runs tests one-by-one, stops at first polluter.

**Why this matters for Vibe Science**

When our confounder harness shows a sign reversal, the instinct is to flag the claim as ARTIFACT and move on. The root cause tracing pattern says: trace BACKWARD. Why did the sign reverse? Was it the matching algorithm? The covariate selection? The data quality? A batch effect in the raw data? Fix at the actual source, not at the symptom level.

**Draft implementation for Vibe Science**

- When the confounder harness produces unexpected results (sign change, massive collapse), require a tracing step before killing:
  1. Which stage caused the change? (raw→conditioned? conditioned→matched?)
  2. What variable drove the change?
  3. Is this a real confounder or a data artifact?
  4. Fix at source if artifact; kill claim only if real confounder
- Add defense-in-depth: validate data quality at input, validate covariate balance after matching, validate effect direction at output

---

### 17. TDD Applied to Skills (Red-Green-Refactor for Process Documentation)

**Where found**

- `skills/writing-skills/SKILL.md` — TDD mapping for skill creation

**What it is**

The core insight: **"Writing skills IS Test-Driven Development applied to process documentation."**

The mapping:

| TDD | Skill creation |
|-----|----------------|
| Test case | Pressure scenario with sub-agent |
| Production code | Skill document (SKILL.md) |
| RED (fails) | Agent violates rule WITHOUT skill loaded |
| GREEN (passes) | Agent complies WITH skill loaded |
| Refactor | Close loopholes, maintain compliance |

"If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing."

The refactor loop: run scenarios, find new rationalizations the agent uses to bypass the skill, plug those holes, re-verify.

**Why this matters for Vibe Science**

Our protocols and flow commands are essentially skills. When we add a new protocol (e.g., "always run confounder harness"), we should verify that WITHOUT the protocol the agent skips it, and WITH the protocol it doesn't. This is how we'd validate that our Immutable Laws actually work.

**Draft implementation for Vibe Science**

- When writing new protocols, add a "pressure test": does the agent follow the protocol under adversarial prompts?
- Document the rationalizations the agent uses to bypass each law
- Add those rationalizations to the law's description as explicit anti-patterns
- This is literally how our LAW 9 (CONFOUNDER HARNESS) should be validated

---

### 18. Receiving Code Review: Anti-Sycophancy Protocol

**Where found**

- `skills/receiving-code-review/SKILL.md` — complete skill

**What it is**

A protocol for how to RECEIVE review feedback (not just give it):

**Forbidden responses**: "You're absolutely right!", "Great point!", "Thanks for catching that!", ANY gratitude expression, ANY performative agreement.

**Required behavior**: Restate the technical requirement → verify against codebase → evaluate if technically sound → respond with evidence or reasoned pushback.

**Source-specific handling**: From the user = trusted, implement after understanding. From external reviewers = be skeptical, verify independently, push back if wrong.

**YAGNI check**: If reviewer suggests "implementing properly", grep codebase for actual usage. If unused, suggest removal.

When pushback is wrong: "You were right — I checked [X] and it does [Y]. Implementing now." State correction factually, move on. No apology.

**Why this matters for Vibe Science**

When R2 reviews the researcher's claims, the researcher should respond with evidence, not with "You're absolutely right, let me fix that." The researcher should push back when R2 is wrong (and R2 CAN be wrong). Currently our system doesn't have a protocol for how the researcher receives R2 feedback.

**Draft implementation for Vibe Science**

- Add to researcher role: when R2 raises an objection, the researcher MUST either:
  1. Provide evidence that addresses the objection
  2. Push back with specific reasoning ("R2 suggests batch effect, but the batch variable distribution shows no correlation with outcome")
  3. Acknowledge the objection and modify the claim
- Ban performative agreement: "R2 is absolutely right" is not an acceptable response. Provide evidence.

---

### 19. Parallel Agent Dispatching Decision Tree

**Where found**

- `skills/dispatching-parallel-agents/SKILL.md` — with graphviz decision tree

**What it is**

A formal decision tree for when to parallelize:

```
Multiple tasks? → Are they independent? → Can they work in parallel?
  yes→yes→yes = Parallel dispatch
  yes→yes→no (shared state) = Sequential agents
  yes→no (related) = Single agent investigates all
  no = Single agent
```

Each parallel agent gets: specific scope (one test file/subsystem), clear goal, constraints ("don't change other code"), expected output format.

After agents return: review each summary → verify fixes don't conflict → run full suite → integrate.

**Why this matters for Vibe Science**

Our LAW 8 (EXPLORE BEFORE EXPLOIT) requires minimum 3 draft nodes. But we don't have a decision tree for when parallel exploration is appropriate vs. when sequential is better. The superpowers tree gives us a framework.

**Draft implementation for Vibe Science**

- Add a decision tree before launching parallel exploration:
  - Are the hypotheses independent? (No shared dataset assumptions?)
  - Can they work in parallel? (No shared state in CLAIM-LEDGER?)
  - If yes: dispatch one agent per hypothesis branch
  - If shared state: sequential investigation
  - After return: check for conflicting findings, run R2 on each

---

### 20. Graphviz Decision Trees as Workflow Specification Language

**Where found**

- Every SKILL.md uses `dot` code blocks for decision trees
- Used for: when-to-use, process flow, TDD cycle, debugging phases

**What it is**

Superpowers consistently uses Graphviz dot notation to express decision logic. Not as decoration, but as the PRIMARY specification of workflow behavior. The prose EXPLAINS the graph; the graph IS the workflow.

**Why this matters for Vibe Science**

Our protocols are currently prose-only. A decision tree that says "if confounder collapse > 50% AND sign unchanged → DOWNGRADED" is more precise as a graph than as a paragraph. It also makes the logic machine-testable: you can verify that all branches are covered.

**Draft implementation for Vibe Science**

- Add dot-notation decision trees to key protocols:
  - Confounder harness outcome tree: raw→conditioned→matched → which outcomes lead to ROBUST/CONFOUNDED/ARTIFACT
  - R2 review decision tree: when to demand more evidence vs. when to pass
  - Gate outcome tree: schema validates → prerequisites met → pass/fail actions

---

## Updated Adoption Priority (post-addendum)

### Priority A+ — steal immediately (new items)

1. **Two-Stage Review Pipeline** (item 12) — split R2 into hypothesis compliance + analysis quality
2. **Verification Before Completion gate function** (item 14) — formalize our LAW 3 implementation
3. **Anti-Sycophancy Review Reception** (item 18) — researcher must provide evidence, not agreement
4. **Four-Status Termination Protocol** (item 13) — convergent pattern from 2 repos, adopt now

### Priority A (confirmed from original audit)

5. Seed-skill bootstrap
6. Plan-as-artifact discipline
7. One-question cognitive load management
8. Explicit review order and checklists

### Priority B+ — steal when building infrastructure (new items)

9. **Root Cause Tracing protocol** (item 16) — for confounder harness analysis
10. **Model Selection Strategy** (item 15) — complexity-based model dispatch
11. **Parallel Agent Decision Tree** (item 19) — for LAW 8 implementation
12. **Graphviz Decision Trees** (item 20) — for protocol specification

### Priority C

13. TDD for Skills (item 17) — for validating protocol effectiveness
14. Transcript-level testing
15. Visual companion surface
16. Content bundle packaging

---

## Meta-Observation

Superpowers' deepest contribution to our thinking is not any single pattern. It's the idea that **workflow discipline can be specified as precisely as code**.

Every skill has: an Iron Law (one-sentence rule), a gate function (how to verify compliance), a rationalization table (how agents will try to cheat), red flags (when to stop), and a decision tree (graphviz). This is not "best practices" — it's executable specification of agent behavior.

Our Vibe Science system has Immutable Laws and enforcement protocols. But they're currently prose-heavy and rationalization-vulnerable. Superpowers shows how to close the gap: add gate functions, add rationalization tables, add decision trees. Make the discipline as testable as the code.

The single biggest steal from this repo: **the two-stage review pipeline with ordered gates**. Our R2 currently reviews everything at once. Splitting into "did you answer the right question?" (spec compliance) then "is your answer well-constructed?" (quality) would catch errors that currently slip through because R2 is overwhelmed by reviewing both dimensions simultaneously.
