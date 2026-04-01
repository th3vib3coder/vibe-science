# Competitive Lessons

**Purpose:** Extract only the useful patterns from adjacent systems and translate them into Vibe-Science-compatible design consequences

---

## Inputs Reviewed

The following repositories were reviewed as of 2026-03-27:

- [ScienceClaw](https://github.com/lamm-mit/scienceclaw)
- [AutoResearchClaw](https://github.com/aiming-lab/AutoResearchClaw)
- [ResearchClaw](https://github.com/ymx10086/ResearchClaw)

These systems are heterogeneous. They should not be treated as one family with one answer.

---

## What ScienceClaw Gets Right

ScienceClaw is strong on:

- a large scientific skill/tool surface
- immutable artifacts with lineage
- cross-agent need broadcasting
- persistent agent memory across cycles
- continuous heartbeat-style autonomous operation
- community-facing scientific discourse around produced artifacts

Design lesson for us:

- we should adopt **artifact-minded workflow design**
- we should support **explicit unmet-needs / next-steps surfaces**
- we should support **persistent project memory across sessions**
- we should consider an outer-layer artifact graph

What we should not import:

- a workflow system where artifact lineage becomes a substitute for claim truth
- plannerless autonomy as a justification engine

For us, artifact lineage may support workflow.
It must not replace the integrity kernel.

---

## What AutoResearchClaw Gets Right

AutoResearchClaw is strong on:

- end-to-end packaging from topic to deliverables
- visible output bundles
- experiment sandboxing and structured experiment outputs
- review artifacts attached to the production pipeline
- a strong "one entrypoint, many outputs" user experience
- portability across multiple agent backends and messaging surfaces
- reuse of lessons from prior runs

Design lesson for us:

- the outer project should produce **deliverable bundles**
- experiments should create **structured result packages**
- writing and reporting should have a clear export path
- cross-run lessons should feed operator guidance and workflow presets
- artifact and connector portability may matter later, but **host abstraction is not a V1 driver**

What we should not import:

- full autonomy as a default epistemic mode
- "one topic in, one paper out" as a scientific truth promise
- paper completion as the product's primary truth criterion
- premature multi-host abstraction before the Claude Code execution model proves itself

For us, deliverables are downstream of integrity, not proof of integrity.

---

## What ResearchClaw Gets Right

ResearchClaw is strong on:

- local-first control-plane thinking
- project -> workflow -> task -> artifact modeling
- structured notes across research phases
- claim/evidence graph thinking
- experiment tracking and blocker remediation
- dashboards, reminders, and runtime status
- automation, channels, and provider management

Design lesson for us:

- the outer project should model research as **project / workflow / task / artifact**
- memory should be **typed**, not just a note dump
- experiment operations should include **blocker tracking**
- operator-facing status surfaces and digests are worth building
- a visible operational surface can exist without weakening the kernel

What we should not import:

- a second research truth layer parallel to the kernel
- workflow convenience features that silently drift into authority

For us, any operator-facing operational surface is infrastructure, not scientific judge.

---

## Shared Market Signal

Across these systems, the market signal is clear:

- users want persistent state
- users want workflows, not just prompts
- users want packaging, not only reasoning
- users want project memory
- users want reminders, dashboards, and artifacts
- some users are attracted to multi-agent or multi-role orchestration, but this is not required to prove V1 value

This is exactly where Vibe Science is currently narrower than the field.

---

## Our Non-Copying Response

We do **not** copy their tools or mimic their architecture.

We translate the good ideas into our own stack:

- Vibe Science remains the kernel
- outer workflow becomes a separate layer or project
- memory is mirror-first
- writing is claim-aware
- artifact bundles are downstream of kernel truth
- automation is operator assistance, not autonomous legitimacy

---

## Design Consequences

The outer project should include:

1. a project / workflow / task / artifact model
2. typed research memory mirrors
3. deliverable and experiment bundles
4. blocker and reminder surfaces
5. cross-run workflow lessons
6. connectors and channels
7. a local-first operational surface without a second truth layer

The outer project must not include:

1. direct truth mutation
2. paper-writing as a substitute for claim validation
3. external memory overriding kernel state
4. autonomous workflows that bypass the kernel
