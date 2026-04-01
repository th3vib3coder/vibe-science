# 01 — Identity and Boundaries

---

## What This Project Is

A **local-first research environment** that can plan, track, package, and semi-automate the full PhD workflow while delegating scientific integrity truth to Vibe Science.

**Product name:** `Vibe Research Environment`
**Short name:** `VRE`
**Planned repo slug:** `vibe-research-environment`

**One sentence:** Hard integrity kernel (Vibe Science) + broad but subordinate operational shell (Vibe Research Environment).

---

## What This Project Is NOT

- NOT an autonomous "AI scientist" that writes papers unsupervised
- NOT a replacement for Vibe Science — it wraps around it
- NOT a second truth store — it reads kernel truth, never creates its own
- NOT a platform or marketplace — it's a focused research workflow tool
- NOT a multi-host abstraction layer — it runs on Claude Code first, others later only if earned

---

## The Five Problems We Solve

These are real researcher frustrations, not abstract module ideas.

### Story 1: "I open a session and don't know where I left off"
**Pain:** 20 minutes re-reading STATE.md and PROGRESS.md to reconstruct context.
**Solution:** Typed project memory mirror — human-readable `project-overview.md` showing active claims, pending experiments, blockers, last advisor feedback.

### Story 2: "I ran 6 experiments but can't find experiment 3's results"
**Pain:** Outputs scattered across sessions and directories.
**Solution:** Experiment registry with manifests. `/flow-experiment list` shows all runs with links.

### Story 3: "Advisor meeting prep takes 2 hours"
**Pain:** Manual assembly from CLAIM-LEDGER, PROGRESS, figures, memory.
**Solution:** Advisor-meeting pack generator reading kernel state + experiment bundles.

### Story 4: "I don't know which findings are safe to write about"
**Pain:** Writing Results with killed/disputed claims accidentally included.
**Solution:** Claim-aware writing handoff. Only export-eligible claims visible.

### Story 5: "No structured way to track relevant papers"
**Pain:** URLs pasted in notes, no link to claims or methodology.
**Solution:** Literature tracking flow. Papers registered with metadata and linked to claims.

---

## Relationship to Vibe Science Kernel

```
Vibe Science Kernel (plugin/)
    ↓ read-only projections
core-reader.js → core-reader-cli.js
    ↓ JSON envelope
Vibe Research Environment (environment/)
    ↓ workflow artifacts
.vibe-science-environment/
```

**The kernel owns:** claim truth, citation truth, gate semantics, session integrity, stop semantics, authoritative audit history.

**This project owns:** workflow orchestration, project memory (mirrors only), experiment packaging, writing assistance, operator-facing surfaces, connectors, automations, domain packs.

**The rule:** This project may read kernel projections. It may NOT write to kernel truth. If the kernel and this project disagree, the kernel wins. Always.

---

## Repo Topology (V1 Incubation)

**Decision:** Same repo now, separate repo later.

For V1, this project lives inside the Vibe Science repo:
- Source code: `environment/` (flows, memory, templates, helpers)
- Runtime state: `.vibe-science-environment/` (flow state, experiment manifests, memory mirrors)
- Command shims: `commands/flow-*.md` (thin entrypoints registered in Claude Code)

**Hard boundaries during incubation:**
- Outer code MUST NOT go under `plugin/` (except contract surfaces like core-reader)
- Outer code MUST NOT add new truth tables to the kernel DB
- Outer code MUST NOT mutate CLAIM-LEDGER.md, STATE.md, or review artifacts directly

**Migration triggers for separate repo:**
1. Core-reader API stable across 2+ implementation rounds
2. Phase 1 operator validation complete
3. Outer changes no longer touch kernel except via contract
4. Outer code has enough substance for its own release cadence
5. Product identity frozen (`Vibe Research Environment` / `vibe-research-environment`)

---

## What We Learned From Competitors

From 9 forensic repo audits (gstack, hermes-agent, superpowers, paperclip, claude-scholar, strix, everything-claude-code, AgentScope, Agent Lightning) + 3 prior competitive reviews (ScienceClaw, AutoResearchClaw, ResearchClaw — documented in `research-environment-v1/01-competitive-lessons.md`):

**Adopt:**
- Artifact-minded workflow (every flow produces files, not just chat)
- Persistent project memory across sessions
- Deliverable bundles downstream of kernel truth
- Typed memory, not note dumps
- Local-first operation without external tool requirements
- Coverage-aware literature tracking
- Structured analysis bundles (analysis-report + stats-appendix + figure-catalog)

**Reject:**
- Artifact lineage as substitute for claim truth (we have the real thing)
- Full autonomy as default mode (we keep human in the loop)
- Paper completion presented as scientific truth (writing is downstream, not truth)
- External memory overriding kernel state (mirrors only)
- Multi-host abstraction before core product works
- 127-skill catalogs (we keep 10-15 focused protocols)

---

## Strategic Position

Other tools are workflow-first with no integrity enforcement.
We are integrity-first with workflow capabilities built around it.

Their moat: broad usability.
Our moat: architectural enforcement that cannot be bolted on after the fact.

The strategy: **broaden around the hard kernel**, never soften the kernel to be broader.
