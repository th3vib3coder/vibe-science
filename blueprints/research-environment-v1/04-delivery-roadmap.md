# Delivery Roadmap

**Purpose:** Sequence the outer project in a way that respects the kernel and produces useful value early

---

## Sequencing Principle

Build the outer project from **lowest epistemic risk** to **highest convenience value**.

That means:

1. read and mirror first
2. package and visualize second
3. orchestrate third
4. connect fourth
5. automate later

Never start by trying to automate the full research lifecycle.

---

## Phase 0: Contract First

Deliverables:

- `CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md` — **DONE** (2026-03-27)
- `VIBE-SCIENCE-CORE-CONTRACT.md` — **DONE** (2026-03-27)
- repo-topology decision — **PENDING** (to be formalized as `REPO-TOPOLOGY-DECISION.md`)
- minimal `core-reader.js` design — **PENDING**
- outer project naming decision — **PENDING**

Exit criteria:

- kernel boundary is explicit — **MET**
- protected zones are explicit — **MET**
- outer project contract is explicit — **PARTIALLY MET** (topology and naming still open)

---

## Phase 1: Read-Only Outer Surfaces

Goal:

- create useful human-readable and operator-readable mirrors without mutating truth

Deliverables:

- project overview view
- typed memory mirror
- session digest export
- claim / gate / alert summaries

Why this phase first:

- high user value
- low risk to kernel

---

## Phase 2: Experiment And Deliverable Packaging

Goal:

- make work easier to run and easier to package

Deliverables:

- experiment registry
- run manifests
- result bundles
- figure catalogs
- advisor-meeting pack
- rebuttal prep pack

Boundary:

- packaging is downstream of kernel truth

---

## Phase 3: Flow Engine

Goal:

- add stage-aware workflow support around literature, experiments, results, and writing

Deliverables:

- literature flow
- experiment flow
- results flow
- writing handoff flow
- blocker/remediation queue

Boundary:

- flows orchestrate work
- flows do not validate science

---

## Phase 4: Connectors

Goal:

- integrate with where researchers already work

Deliverables:

- bibliography adapter
- knowledge-tool adapter
- notebook / figures / export adapters
- optional messaging hooks

Boundary:

- connectors are adapters
- adapters are not truth

---

## Phase 5: Automations And Digests

Goal:

- reduce operator burden without creating an autonomous scientist

Deliverables:

- session-start reminders
- weekly digest
- stale-state digest
- advisor-prep digest
- review-debt digest

Boundary:

- assistance only
- no unsupervised legitimacy

---

## Phase 6: Domain Packs

Goal:

- specialize workflows without fragmenting the kernel

Deliverables:

- pack schema
- pack loader
- initial packs for one or two target domains

Boundary:

- packs change presets, not truth semantics

---

## What We Deliberately Avoid Early

- fully autonomous end-to-end paper generation
- continuous background autonomy as the default product mode
- dashboard-led truth mutation
- free-writing systems disconnected from validated claims
- giant connector surface before the read-only contract exists

---

## First Implementation Track I Recommend

If we start soon, the first practical track should be:

1. repo-topology decision
2. kernel read-only interface spec
3. read-only project overview + typed memory mirror
4. claim-aware export bundle for validated outputs

This gives immediate breadth without touching the hard core.

