# Claude Scholar Forensic Audit

**Repo:** `https://github.com/Galaxy-Dawn/claude-scholar`  
**Local clone:** `C:\Users\Test-User\Desktop\Tesi_Python_scRNA\nuove_skill\repo-forensics\claude-scholar`  
**Audit date:** 2026-03-29  
**Goal:** extract concrete ideas, patterns, and anti-patterns that can improve the evolution around the Vibe Science kernel

---

## Quick X-Ray

- repo shape: large workflow pack for research-oriented CLI use, centered on `CLAUDE.md`, commands, skills, agents, hooks, and a backup-aware installer
- strongest theme: **semi-automated research with the human kept explicitly in the loop**
- strongest reusable ideas: **evidence-first post-experiment flow, dual-store Zotero/Obsidian boundary, filesystem-first project memory, and durable writing-memory extraction**
- biggest risk: **prompt-pack sprawl and drift across commands, skills, agents, and copied vendor surfaces**
- biggest warning for us: **borrow the strong research workflow cuts, not the whole prompt marketplace**

---

## Pass 1 - Useful Elements To Capture

### 1. Human-centered semi-automation is stated clearly and repeatedly

**Where found**

- `README.md`
- `CLAUDE.md`

**Why it matters for Vibe Science**

- Claude Scholar is explicit that it is not a fully autonomous scientist.
- That is strategically aligned with what we want: accelerate structured research work without pretending the human disappears.
- The repo gets real value from saying this clearly instead of smuggling autonomy assumptions into every workflow.

**Draft Vibe Science implementation**

- Keep the outer product explicitly framed as:
  - integrity-preserving
  - semi-automated
  - human-decision-centered
- Do not let “agentic” language blur accountability boundaries.

---

### 2. The post-experiment split is one of the best ideas in the repo

**Where found**

- `README.md`
- `commands/analyze-results.md`
- `skills/results-analysis/SKILL.md`
- `skills/results-report/SKILL.md`

**Why it matters for Vibe Science**

- Claude Scholar separates strict analysis from decision/report narrative.
- That is one of the cleanest workflow cuts in the whole repo.
- It is directly relevant to our own push for evidence-before-story.

**Draft Vibe Science implementation**

- Keep analysis and reporting separate in our future outer-product writing flow.
- Treat:
  - statistics
  - figures
  - artifact generation
as upstream of:
  - summaries
  - discussion
  - handoff

---

### 3. Zotero and Obsidian have a strong dual-store contract

**Where found**

- `README.md`
- `MCP_SETUP.md`
- `OBSIDIAN_SETUP.md`
- `commands/zotero-review.md`
- `skills/zotero-obsidian-bridge/SKILL.md`

**Why it matters for Vibe Science**

- Zotero owns literature truth: metadata, collections, attachments, full text.
- Obsidian owns durable project knowledge: notes, synthesis, links, maps.
- This is one of the strongest and most reusable architectural decisions in the repo.

**Draft Vibe Science implementation**

- When we integrate external tools, define clear ownership like this:
  - source-of-truth system
  - durable project-memory system
  - transformation boundary between them
- Never let two stores both pretend to be truth for the same thing.

---

### 4. The Obsidian layer is genuinely filesystem-first

**Where found**

- `OBSIDIAN_SETUP.md`
- `commands/obsidian-init.md`
- `skills/obsidian-project-memory/SKILL.md`
- `skills/obsidian-project-memory/references/SCRIPT-VS-AGENT.md`

**Why it matters for Vibe Science**

- This is not an “Obsidian API magic” design. It is local files, explicit binding, deterministic helper scripts, and conservative sync.
- That matches our own instinct to prefer inspectable artifacts over opaque platform state.

**Draft Vibe Science implementation**

- Keep project memory and flow state filesystem-first wherever possible.
- Use scripts/helpers only where they make deterministic transformations on inspectable files.

---

### 5. Knowledge routing is more disciplined than in most note-heavy research repos

**Where found**

- `OBSIDIAN_SETUP.md`
- `commands/obsidian-ingest.md`
- `skills/obsidian-project-memory/SKILL.md`
- `skills/obsidian-research-log/SKILL.md`
- `skills/obsidian-experiment-log/SKILL.md`

**Why it matters for Vibe Science**

- Claude Scholar emphasizes canonical destinations and resists spraying knowledge everywhere.
- `Daily/` as staging plus canonical `Papers / Knowledge / Experiments / Results / Writing` is a useful anti-sprawl pattern.

**Draft Vibe Science implementation**

- If we later add richer file-backed outer memory, keep routing explicit:
  - incoming material
  - staged notes
  - durable canonical artifacts
  - archives

---

### 6. Literature completeness is treated as an operational problem, not just a reading problem

**Where found**

- `commands/zotero-review.md`
- `commands/zotero-notes.md`
- `skills/zotero-obsidian-bridge/SKILL.md`
- `skills/zotero-obsidian-bridge/references/COLLECTION-INVENTORY-SCHEMA.md`

**Why it matters for Vibe Science**

- Coverage tracking, inventory notes, canonical note schema, and verification passes are unusually concrete.
- That is highly relevant to our integrity goals.
- The repo is trying to ensure “all papers in the set have durable structured notes,” not just “we summarized some papers.”

**Draft Vibe Science implementation**

- For future literature handoff or evidence-tracking surfaces, support coverage-aware views:
  - items seen
  - items ingested
  - items canonically summarized
  - items still unresolved

---

### 7. The writing-memory pattern is tighter than most of the rest of the repo

**Where found**

- `commands/mine-writing-patterns.md`
- `agents/paper-miner.md`
- `skills/ml-paper-writing/SKILL.md`

**Why it matters for Vibe Science**

- This is one of the few places where the repo has a relatively clean layering:
  - command entrypoint
  - agent-owned extraction
  - shared canonical memory
- It is much less drift-prone than some of the literature/planning surfaces.

**Draft Vibe Science implementation**

- If we later support reusable writing memory or domain-pattern memory, keep one canonical extraction path and one canonical consumption surface.

---

### 8. The installer is actually useful, not just decorative

**Where found**

- `scripts/setup.sh`
- `settings.json.template`
- observed isolated installer smoke runs

**Why it matters for Vibe Science**

- The installer really does:
  - preserve existing `CLAUDE.md`
  - install sidecar scholar variants
  - merge hooks/MCP/plugins into existing settings
  - back up prior settings
- That is better than many similar repos, which overwrite or hand-wave install state.

**Draft Vibe Science implementation**

- If we ever package our outer-product workflow assets, ship a careful installer:
  - additive merge when possible
  - visible backup path
  - sidecar install for conflicting top-level files
  - no silent clobbering

---

### 9. Conservative graph/knowledge-model restraint is a good instinct

**Where found**

- `OBSIDIAN_SETUP.md`
- `commands/obsidian-views.md`
- `skills/obsidian-link-graph/SKILL.md`
- `skills/obsidian-synthesis-map/SKILL.md`

**Why it matters for Vibe Science**

- Claude Scholar explicitly rejects certain default expansions:
  - no default `Concepts/`
  - no default `Datasets/`
  - `.base` explicit-only
  - graph helpers optional
- That restraint is important. Many research systems die under their own ontology.

**Draft Vibe Science implementation**

- Prefer the smallest durable knowledge model that actually helps.
- Add new artifact types only when they solve a real workflow pain, not because they sound comprehensive.

---

## Pass 2 - What Not To Copy Blindly

### 1. Do not copy the oversized prompt-pack surface

**Where found**

- `CLAUDE.md`
- `README.md`
- `commands/sc/README.md`

**Why it is risky**

- The repo mixes a coherent research workflow core with a very broad surface of commands and imported/vendor-like material.
- That makes it feel more like a prompt marketplace than a tight operating system.

**Vibe Science stance**

- Keep the surface small and purpose-built.
- Do not let the outer product turn into “skills for everything.”

---

### 2. Do not copy prompt duplication across commands, skills, and agents

**Where found**

- `commands/research-init.md`
- `agents/literature-reviewer.md`
- `skills/research-ideation/SKILL.md`
- `commands/zotero-review.md`
- `commands/zotero-notes.md`

**Why it is risky**

- The repo repeats core flow logic in multiple places.
- That makes local clarity easier, but it creates real drift risk.

**Vibe Science stance**

- Keep one canonical contract per workflow concept wherever possible.
- Let commands point to owned logic instead of restating it all.

---

### 3. Do not copy competing workflow authorities

**Where found**

- `CLAUDE.md`
- `skills/planning-with-files/SKILL.md`

**Why it is risky**

- `CLAUDE.md` and `planning-with-files` disagree on core planning behavior.
- When two workflow authorities disagree, the agent chooses arbitrarily or inconsistently.

**Vibe Science stance**

- For every important workflow decision, there should be one operational authority.

---

### 4. Do not copy insecure-by-default MCP settings

**Where found**

- `settings.json.template`
- `MCP_SETUP.md`

**Why it is risky**

- Shipping `UNSAFE_OPERATIONS: "all"` in a template normalizes destructive capability.
- That is especially bad in a repo users are encouraged to copy into live settings.

**Vibe Science stance**

- Default integrations should be least-privilege by default.

---

### 5. Do not overclaim security enforcement

**Where found**

- `rules/security.md`
- `hooks/security-guard.js`

**Why it is risky**

- The written rule says one thing; the hook actually enforces less.
- That kind of mismatch is dangerous because it creates false confidence.

**Vibe Science stance**

- If a security rule is claimed, either implement it fully or describe it honestly as partial.

---

### 6. Do not treat “cross-platform” Bash-on-Windows as true native portability

**Where found**

- `README.md`
- `scripts/setup.sh`

**Why it is risky**

- The repo works on Windows through Git Bash/WSL for install, not via a native Windows path.
- That may be fine, but it should not be confused with a fully native cross-platform stack.

**Vibe Science stance**

- Be explicit about what kind of platform support is real and what kind is compatibility-through-shell.

---

### 7. Do not keep multiple sources of truth for hook wiring

**Where found**

- `hooks/hooks.json`
- `settings.json.template`

**Why it is risky**

- Duplicating hook wiring in two places increases drift risk.
- The same logical hook stack should not require synchronized hand edits in two formats forever.

**Vibe Science stance**

- Generate or derive repetitive install surfaces from one canonical source when possible.

---

### 8. Do not commit author-local plugin state

**Where found**

- `plugins/installed_plugins.json`
- `plugins/known_marketplaces.json`
- `plugins/install-counts-cache.json`

**Why it is risky**

- These files look like workstation snapshots rather than portable project configuration.
- They also leak local machine details.

**Vibe Science stance**

- Keep repo state portable and project-owned, not author-home-derived.

---

### 9. Do not confuse branch-split support with one coherent multi-host product

**Where found**

- `README.md`

**Why it is risky**

- The repo advertises Claude, Codex, and OpenCode support, but the support is branch-separated.
- That is not the same thing as one unified install/update/test surface.

**Vibe Science stance**

- If we support multiple hosts later, describe the support model honestly.

---

### 10. Do not auto-bootstrap knowledge bindings too aggressively

**Where found**

- `OBSIDIAN_SETUP.md`
- `commands/obsidian-sync.md`
- `skills/obsidian-project-bootstrap/SKILL.md`
- `skills/obsidian-project-memory/SKILL.md`

**Why it is risky**

- “If it looks like a research repo, bootstrap it” is useful, but also easy to overshoot.
- In mixed repos or partial research repos, that can create unwanted churn.

**Vibe Science stance**

- Prefer stricter qualification or explicit consent before heavy filesystem bootstrapping.

---

## Pass 3 - Recommended Adoption Order For Vibe Science

### 1. Adopt soon at the workflow-spec layer

- human-centered semi-automation language
- evidence-first split between analysis and reporting
- explicit dual-store contracts for external integrations

### 2. Adopt next at the file/state layer

- filesystem-first project memory
- conservative routing into canonical artifact buckets
- coverage-aware literature inventory patterns

### 3. Adopt next at the packaging layer

- backup-aware sidecar installer behavior
- additive merge where safe
- visible restore path when overwriting config

### 4. Consider later, carefully

- reusable writing-memory extraction
- selective Obsidian/Zotero bridges
- optional graph/canvas artifacts

### 5. Explicitly reject for now

- enormous prompt-pack surfaces
- duplicated workflow logic across layers
- unsafe integration defaults
- branch-split “support” presented as unified host support

---

## Validation Notes

### What I actually validated

- read the main docs, branch/support notes, installer, hook stack, selected research/analysis skills, Obsidian/Zotero commands, and package-manager helpers
- ran Node syntax validation on the executable JS surface:
  - `hooks/security-guard.js`
  - `hooks/session-start.js`
  - `hooks/session-summary.js`
  - `hooks/skill-forced-eval.js`
  - `hooks/stop-summary.js`
  - `scripts/setup-package-manager.js`
- ran the installer in isolated temporary homes

### Executed results

- `node --check ...` on the hook and setup JS files: passed
- isolated installer run into an empty temp home: passed
- isolated installer run with preexisting `CLAUDE.md` and `settings.json`: passed
  - preserved existing `CLAUDE.md`
  - installed `CLAUDE.scholar.md`
  - created `settings.json.bak`
  - created `.claude-scholar-backups/...`
  - merged existing `env` and plugins while adding repo hooks/MCP/plugin entries

### Important limits of this pass

- there is no conventional root test suite like `package.json`/`vitest` to run here
- the audit is therefore strongest on:
  - executable hook/install surface
  - workflow/document architecture
  - integration boundary quality

---

## Bottom Line

Claude Scholar is useful to us mainly as a **research-workflow pack with a good memory/integration model**, not as a clean architectural template.

The strongest things to borrow are:

- evidence-first analysis before reporting
- dual-store boundary: Zotero for literature truth, Obsidian for durable project knowledge
- filesystem-first project memory
- conservative knowledge routing
- coverage-aware literature synthesis
- backup-aware installer behavior

The strongest things to avoid are:

- prompt-pack bloat
- duplicated workflow logic across layers
- unsafe default integration settings
- overclaimed security
- branch-split host support presented as a unified product surface

If we borrow selectively, `claude-scholar` can strengthen the **research workflow and knowledge architecture** of Vibe Science without pulling us into prompt sprawl or integration drift.

---

## ADDENDUM — Deep Forensic Pass (Opus 4.6, 2026-03-29)

> What follows was found by reading all JS hook implementations line-by-line,
> all 47 skill directories, all 15 agent files, and the full command surface.
> Two parallel sub-agents explored hooks/scripts/rules and research skills/agents.

---

### 11. Keyword-to-Skill Pre-Matching Engine (Multilingual)

**Where found**

- `hooks/skill-forced-eval.js` — lines 141-168, `KEYWORD_SKILL_MAP` array
- `hooks/skill-forced-eval.js` — lines 171-179, `suggestSkills()` function

**What it is**

A UserPromptSubmit hook that:
1. Collects ALL installed skills (local `~/.claude/skills/` + plugin cache)
2. Categorizes skills into groups: Research & Writing, Development, Plugin Dev, Design & UI, Documents, Other
3. Matches user prompt keywords against a 25-entry keyword map
4. **Supports Chinese keywords** alongside English (e.g., `论文|写作|投稿` for paper writing)
5. Forces the agent to activate matching skills via `"**Pre-matched skills (MUST activate these)**"`
6. If Obsidian project memory is bound AND prompt is research-related, auto-suggests obsidian/zotero skills

The keyword map covers: git, debug, TDD, code review, paper writing, research, rebuttal, frontend, skill/hook/command creation, MCP, architecture, package management, Kaggle, citation, LaTeX, ablation, experiment report, planning, verification, self-review, anti-AI writing, and general implementation.

**Why this matters for Vibe Science**

Our system routes work through flows (/flow-literature, /flow-experiment, /flow-status) but doesn't pre-match user intent to the appropriate flow. The keyword matching engine could help: if the user says "check if there's a batch effect," the system could pre-match to the confounder analysis flow before the agent starts improvising.

The multilingual support is also relevant: our system should work for researchers who think in languages other than English.

**Draft implementation for Vibe Science**

- Add a UserPromptSubmit pre-matcher that routes to appropriate flows:
  - Keywords like "literature", "papers", "what's been done" → suggest /flow-literature
  - Keywords like "analyze", "test", "compare" → suggest /flow-experiment
  - Keywords like "write", "draft", "manuscript" → suggest flow-writing (future)
- Make it advisory (suggest), not coercive (force) — LAW 11 says listen to the user, not override them

---

### 12. Two-Tier Security Guard Hook (Block + Confirm)

**Where found**

- `hooks/security-guard.js` — complete implementation, 170 lines

**What it is**

A PreToolUse hook with two tiers:

**Tier 1: Block (exit 2, hard deny)**
- `rm -rf /`, `rm --no-preserve-root`, `dd if=/dev/zero`, write to block devices, mkfs, remove system dirs, remove user home dirs

**Tier 2: Confirm (exit 0 + system message requiring user approval)**
- `git push --force`, `git reset --hard`, `git clean -f`, `git checkout .`, `rm -rf`, `chmod 777`, `npm/pip publish`, `docker system prune`, SQL DROP/TRUNCATE/DELETE without WHERE, UPDATE without WHERE

**File write security:**
- Blocks writes to system paths (/etc, /usr, /bin, /dev, /proc, /sys)
- Blocks path traversal: resolves path, checks if inside repo root AND home. Outside both = deny ("Path traversal attack detected")
- Confirms writes outside repo but inside home (with relative path in message)
- Confirms sensitive files: `.env*`, `credentials.json`, `key.pem`, `id_rsa`, `.aws/credentials`, `.npmrc`

**Why this matters for Vibe Science**

Our PreToolUse hook checks for `confounder_status` in CLAIM-LEDGER writes (LAW 9). But we don't have general security tiers. The claude-scholar two-tier pattern (block catastrophic, confirm dangerous) is more complete than what we have.

The path traversal check is particularly important: our agents should NEVER write outside `.vibe-science/` and the project root without explicit confirmation.

**Draft implementation for Vibe Science**

- Extend our PreToolUse hook with two tiers:
  - **Block**: writes to schema files, fault taxonomy, judge rubric (read-only by design)
  - **Confirm**: writes outside `.vibe-science/`, destructive git operations, large file deletions
- Add path traversal detection: resolve all file paths, verify inside project root

---

### 13. Results-Analysis Skill (Strict Evidence-First Analysis Bundle)

**Where found**

- `skills/results-analysis/SKILL.md` — complete workflow

**What it is**

A strict analysis protocol that produces a **structured bundle**, not a narrative:
- `analysis-report.md` — main findings
- `stats-appendix.md` — full statistical details
- `figure-catalog.md` — figure inventory with interpretation
- `figures/` — actual generated figures

The workflow:
1. **Inventory and validate artifacts** — metric tables, training curves, seeds, baselines, ablations, evaluation protocol metadata
2. **Lock comparison questions** — which method vs which baseline, primary metric, repeated-measure unit, decision-changing findings
3. **Run strict statistics** — with complete reporting, not just best scores or p-values
4. **Generate real figures** — "Prefer real figures over figure specs"

Non-negotiable quality bar:
- **Never fabricate statistics** — if data is missing, state the blocker
- **Report complete statistics** — no cherry-picking
- **Interpret every main figure** — purpose, caption requirements, post-figure notes
- **Separate evidence from prose** — this skill produces artifacts, NOT manuscript sections

The explicit scope boundary: "Do **not** use this skill to draft a paper Results section. Those belong to `ml-paper-writing` or `results-report`."

**Why this matters for Vibe Science**

This is the closest existing implementation to what our researcher agent should do. The key insight is the explicit separation: analysis produces structured artifacts, writing consumes those artifacts. This is exactly our LAW 6 (ARTIFACTS OVER PROSE) and LAW 2 (EVIDENCE DISCIPLINE).

The "lock comparison questions BEFORE running statistics" step maps directly to our approach: define the hypothesis before analyzing, not after.

**Draft implementation for Vibe Science**

- Adopt the analysis bundle format for our experiment flow outputs:
  - `analysis-report.md` → maps to our CLAIM-LEDGER entries
  - `stats-appendix.md` → maps to confounder harness results
  - `figure-catalog.md` → maps to our future FIGURE-CONVENTIONS.md
- Add "lock comparison questions" as a mandatory step before any statistical analysis
- Add the quality bar as a gate: no claim promotion without complete statistics

---

### 14. Citation Verification Skill (40% AI Error Rate Warning)

**Where found**

- `skills/citation-verification/SKILL.md`

**What it is**

A proactive citation verification protocol with a specific warning: **"AI-generated citations have approximately 40% error rate; every citation must be verified via WebSearch."**

Verification steps:
1. Search Google Scholar: `"site:scholar.google.com [paper title] [first author]"`
2. Confirm paper exists in results
3. Check citation count (abnormally low = suspicious)
4. Get BibTeX from "Cite" button
5. Verify: title matches, authors match (at least first author), year matches, venue matches

Core principle: **"Verify during writing, not after."** Every citation is verified at the moment it's added, not in a post-hoc sweep.

**Why this matters for Vibe Science**

Our system generates literature-backed claims. If the agent cites papers that don't exist (40% error rate!), the entire evidence chain is compromised. This skill gives us a concrete verification protocol.

**Draft implementation for Vibe Science**

- Add to our literature flow: every citation must be verified via WebSearch at the point of inclusion
- Add a verification gate for claims that cite specific papers: the paper must exist on Google Scholar / PubMed
- Flag the 40% AI citation error rate in our researcher role constraints
- Consider adding citation verification as a mandatory R2 checkpoint

---

### 15. Research Project Detection and Obsidian Binding

**Where found**

- `hooks/hook-common.js` — `detectResearchProject(cwd)`, `getProjectMemoryBinding(cwd)`
- `hooks/session-start.js` — lines 32-95, binding detection and research candidate detection
- `hooks/skill-forced-eval.js` — lines 186-200, auto-suggest research skills when bound

**What it is**

The hook system detects whether the current directory is a research project by looking for markers (papers/, experiments/, datasets/, etc.). If detected:
- **Bound**: shows sync status, suggests /obsidian-sync
- **Candidate (not bound)**: shows detected markers, suggests /obsidian-init

When bound, multiple hooks adapt their behavior:
- SessionStart: shows project memory status
- SkillForcedEval: auto-suggests obsidian-project-memory, zotero-obsidian-bridge, obsidian-literature-workflow
- Stop: reminds about Obsidian KB maintenance (Daily/YYYY-MM-DD.md, project-memory file, 00-Hub.md)

**Why this matters for Vibe Science**

Our SessionStart hook checks the database for session state. But we don't detect project type. The claude-scholar pattern shows how to adapt hook behavior based on what kind of project is detected. For a bioinformatics project vs. a clinical trial vs. a literature review, different flows should be suggested.

**Draft implementation for Vibe Science**

- Add project type detection to our SessionStart hook:
  - Look for `.vibe-science/` → this is a Vibe Science project
  - Look for `*.h5ad`, `*.fastq`, `Seurat*/` → bioinformatics project markers
  - Look for `*.csv` with clinical columns → clinical data markers
- Adapt initial context based on detected project type

---

### 16. Stop-Summary Hook with Temp File Detection and KB Maintenance

**Where found**

- `hooks/stop-summary.js` — complete implementation

**What it is**

At session end, the hook:
1. Shows git status with change categories (added/modified/deleted)
2. **Detects temporary files** across known roots: `plan/`, `docs/plans/`, `.claude/temp/`, `tmp/`, `temp/`
3. Groups temp files by directory for clean display
4. If Obsidian KB is bound: reminds about minimum maintenance files that should be updated

The temp file detection is a real quality pattern: it surfaces work-in-progress artifacts that might need cleanup or promotion.

**Why this matters for Vibe Science**

Our Stop hook checks for unreviewed claims (LAW 4). But we don't detect orphaned artifacts. After a session, there might be partial analysis scripts, intermediate CSV files, or half-written claims that need cleanup. The temp file detection pattern would help.

**Draft implementation for Vibe Science**

- Add to our Stop hook: detect files in `.vibe-science/` that were modified but not properly recorded:
  - Claims without evidence chains
  - Spines without cycle completion markers
  - Analysis scripts that ran but whose results weren't recorded
- Show a "session hygiene" summary before allowing exit

---

### 17. 47 Skills + 15 Agents (Scale of Research Workflow Coverage)

**Where found**

- `skills/` — 47 directories (some with UPSTREAM-LICENSE indicating vendor/imported)
- `agents/` — 15 agent type files

**What it is**

The full skill surface covers:
- **Research**: research-ideation, results-analysis, results-report, citation-verification, paper-self-review, review-response, post-acceptance, daily-paper-generator, writing-anti-ai
- **Obsidian integration** (10+ skills): project-memory, research-log, experiment-log, literature-workflow, link-graph, synthesis-map, project-bootstrap, project-lifecycle, bases, markdown, cli
- **Zotero**: zotero-obsidian-bridge
- **ML/Paper writing**: ml-paper-writing, latex-conference-template-organizer
- **Development**: coding, git, code-review, bug-detective, architecture, TDD, planning, verification, webapp-testing
- **Plugin development**: skill-development, skill-improver, skill-quality-reviewer, command-development, hook-development, agent-identifier, plugin-structure, mcp-integration

Agent types include: literature-reviewer, paper-miner, research-knowledge-curator-obsidian, rebuttal-writer, plus code-reviewer, architect, dev-planner, etc.

**Why this matters for Vibe Science**

The sheer coverage shows what a research-oriented skill pack looks like at scale. But it also shows the drift risk: 47 skills means inevitable duplication and inconsistency. Our system should learn from the COVERAGE without copying the SPRAWL.

**Draft implementation for Vibe Science**

- Map claude-scholar's research workflow to our flows:
  - `research-ideation` → `/flow-literature` gap analysis phase
  - `results-analysis` → `/flow-experiment` analysis phase
  - `results-report` → future `/flow-writing` phase
  - `citation-verification` → R2 literature checkpoint
- Keep our skill count much smaller (5-8 domain-specific protocols, not 47)

---

## Updated Adoption Priority (post-addendum)

### Priority A+ — steal immediately (new items)

1. **Results-Analysis bundle format** (item 13) — analysis-report + stats-appendix + figure-catalog
2. **Citation verification at point of inclusion** (item 14) — 40% AI error rate warning
3. **Two-tier security guard** (item 12) — block catastrophic + confirm dangerous + path traversal
4. **"Lock comparison questions before statistics"** (from item 13) — hypothesis before analysis

### Priority A (confirmed from original audit)

5. Evidence-first analysis/report split
6. Dual-store boundary (Zotero=truth, Obsidian=synthesis)
7. Filesystem-first project memory
8. Conservative knowledge routing

### Priority B+ — steal when building infrastructure (new items)

9. **Keyword-to-flow pre-matching** (item 11) — route user intent to appropriate flow
10. **Research project detection** (item 15) — adapt hooks to detected project type
11. **Temp file / orphan artifact detection** (item 16) — session hygiene at stop
12. **Research workflow mapping** (item 17) — ideation→analysis→report pipeline

### Priority C

13. Obsidian project memory binding
14. Writing-memory extraction
15. Installer behavior

---

## Meta-Observation

Claude-scholar's deepest contribution is not any single skill. It's the **workflow cut between analysis and reporting**.

The explicit rule "results-analysis produces artifacts, NOT manuscript sections" is the same principle as our LAW 6 (ARTIFACTS OVER PROSE), but more precisely scoped. When you force the analysis phase to produce a structured bundle (analysis-report + stats-appendix + figure-catalog) instead of prose, you get:
- Reviewable intermediate artifacts (R2 can inspect the stats independently of the narrative)
- Reusable evidence (the same analysis bundle can feed multiple manuscript drafts)
- Auditable claims (the stats-appendix is the evidence chain)

This maps perfectly onto our architecture: the researcher produces artifacts, R2 reviews artifacts, and only after both agree does the synthesis phase (future writing flow) consume those artifacts into prose.

The 40% AI citation error rate is the most concrete warning in any of the 5 repos audited so far. It's a number. It should be in our researcher's system prompt.

---

### Sub-Agent Findings Integration (3 additional items from hooks/rules deep read)

**18. Experiment Reproducibility Rules (Seed, Environment, Checkpoint)**

Found in `rules/experiment-reproducibility.md`. Defines: deterministic seed management (random + numpy + torch + cuda + PYTHONHASHSEED + cudnn.deterministic), environment recording (python/torch/cuda/GPU versions), output directory naming (`{experiment}_{timestamp}`), checkpoint format (epoch + model + optimizer + scheduler + best_metric + config), and dataset version tracking (SHA256 hash).

**Relevance**: Our system doesn't currently enforce reproducibility metadata. When the experimenter runs analyses, we should capture: random seed, package versions, dataset hash, and parameter config. This is a gate requirement, not a nice-to-have.

**19. Session-Summary Hook with CLAUDE.md Sync Detection**

Found in `hooks/session-summary.js`. At session end, writes a work log to `.claude/logs/session-{date}-{id}.md` with: git changes, tool usage counts (top 10), and a CLAUDE.md freshness check. The `checkClaudeMdUpdate()` function compares CLAUDE.md mtime against all skill/command/agent/hook files — if any source is newer, it warns "CLAUDE.md memory needs updating." Logs auto-delete after 30 days.

**Relevance**: Our system doesn't detect when its own configuration has drifted from the installed state. If protocol files are updated but CLAUDE.md hasn't been regenerated, the agent operates on stale instructions. A freshness check would catch this.

**20. ML Coding Style Rules with Factory/Registry Pattern**

Found in `rules/coding-style.md`. Enforces: 200-400 line files (split at 400), frozen dataclasses for configs, factory/registry pattern for models and datasets, Hydra config-driven architecture, `__all__` in `__init__.py`, logger instead of print, and specific prohibited patterns (>800 lines, >4 nesting, mutable defaults, bare except, hardcoded hyperparameters).

**Relevance**: When our experimenter generates analysis code, it should follow research-code best practices. The factory/registry pattern for analysis methods (e.g., `ANALYSIS_REGISTRY["differential_expression"]`) would make our system more composable. The file size limit (400 lines) is a concrete quality gate for generated code.
