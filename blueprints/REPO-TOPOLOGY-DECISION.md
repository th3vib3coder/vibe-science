# Repo Topology Decision

**Status:** Decided  
**Date:** 2026-03-27  
**Scope:** Define how the outer research environment should coexist with the Vibe Science kernel during V1

---

## Decision Summary

For **V1 incubation**, the outer research environment stays in the **same repository** as Vibe Science, but in a **strictly separated top-level workspace**.

Recommended incubation layout:

- `vibe-science/` existing kernel paths remain authoritative
- new outer-project code lives under a dedicated top-level directory such as `environment/`
- the only outer-project code allowed to touch kernel internals is the **kernel-side contract surface** such as `core-reader.js`

Long-term target remains:

- `vibe-science` as protected kernel repo
- outer research environment split into its own repo once the contract is stable and the Flow Engine has validated product value

Short version:

**same repo now, separate product later if earned**

---

## Why This Is The Right Decision Now

The kernel is real, but it is still actively evolving:

- TRACE is recent
- TRACE+ADAPT V0 is recent
- `core-reader.js` now exists but has only just become a live contract surface
- the outer product has its first working bridge and prompt shims, but the product track is still early

Splitting into a separate repo immediately would impose overhead too early:

- duplicated issue tracking
- duplicated release coordination
- premature packaging boundaries
- unstable contract churn across repos
- slower iteration on the first Flow Engine MVP

Keeping everything in one repo forever would create a different problem:

- shell convenience would blur into kernel truth
- contributors would stop seeing the boundary clearly
- release notes would mix integrity runtime changes with workflow-product changes
- the kernel would become harder to protect socially

So the correct compromise is:

- **conceptual separation immediately**
- **filesystem separation immediately**
- **repository separation later, when the contract earns it**

---

## Alternatives Considered

### Option A: Separate Repo Immediately

Pros:

- strongest isolation
- clean branding split
- clean ownership split

Cons:

- too much overhead before the reader contract has earned stability
- contract is still being crystallized
- Phase 1 would spend time on packaging and cross-repo mechanics instead of validating the Flow Engine

Verdict:

**Rejected for now.**

### Option B: Same Repo Forever

Pros:

- fastest iteration
- no repo coordination overhead

Cons:

- boundary erosion over time
- shell and kernel changes become socially indistinguishable
- future split gets harder, not easier

Verdict:

**Rejected as the long-term model.**

### Option C: Same Repo Now, Split Later

Pros:

- fast enough for Phase 1
- explicit boundary can still be enforced
- later split happens only when the contract is proven

Cons:

- requires discipline to keep directories and ownership clean
- needs explicit migration triggers

Verdict:

**Chosen.**

---

## Adopted V1 Topology

### Kernel Stays Here

Authoritative kernel surfaces remain in current Vibe Science paths:

- `plugin/`
- `skills/vibe/`
- `CLAUDE.md`
- runtime-facing commands that belong to the kernel track
- kernel-side blueprints and runtime specs

### Outer Project Incubates Here

Outer-project code should live in a new dedicated top-level path, tentatively:

- `environment/`

Suggested V1 incubation structure:

- `environment/flows/`
- `environment/memory/`
- `environment/experiments/`
- `environment/writing/`
- `environment/connectors/`
- `environment/automation/`
- `environment/tests/`
- `environment/README.md`

This path is a **technical incubation name**, not a product name.
Branding can change later without changing the topology decision.

### Contract Surface Lives In The Kernel

The following kind of code remains kernel-side even during outer-project incubation:

- `core-reader.js`
- any other read-only projection surfaces that formalize kernel outputs

Reason:

the kernel owns the contract.
The shell consumes it.

---

## Hard Boundary Rules

During V1 incubation:

- outer-project code must not be placed under `plugin/` except for explicit kernel contract surfaces
- outer-project code must not add new kernel truth tables
- outer-project code must not mutate kernel truth state directly
- shell tests and kernel tests must remain distinguishable
- release notes should keep kernel-track and outer-track changes separate even if they live in one repo

---

## Migration Triggers For Splitting Into A Separate Repo

The outer project should split into its own repo only after **all** of the following are true:

1. `core-reader.js` exists and has stayed stable across at least two implementation rounds
2. Phase 1 Flow Engine MVP has passed its operator-validation gate
3. most outer-project changes no longer require touching kernel files except the contract surface
4. the outer project has enough code and tests to justify its own release cadence
5. the product has a stable name and identity distinct from "Vibe Science"

Until then, split is aspiration, not obligation.

---

## What This Means For Phase 0

Phase 0 is now resolved as follows:

- repo topology is **decided**
- V1 starts in the same repo
- the outer project incubates under a dedicated top-level workspace
- the kernel contract surface stays kernel-side
- future repo split is conditional, not automatic

---

## Practical Consequence

The topology decision is no longer waiting on speculative design.

The kernel-side contract surface and CLI bridge now exist, the minimal `environment/` workspace shape exists, and the repo has prompt-driven Flow Engine shims plus concrete JSON templates.

So the next step after this decision is not more topology debate.

It is:

1. keep the kernel/outer boundary disciplined during Phase 1 implementation
2. validate the Flow Engine with real operator sessions
3. split repos later only if the migration triggers are actually met

That keeps speed without sacrificing boundary clarity.
