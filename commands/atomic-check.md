---
description: Check WIKI_VRE for existing surfaces before adding a feature
argument-hint: "<feature-description>"
allowed-tools: Read, Grep, Glob, Bash
model: opus
---

# atomic-check

Use this before writing code for any Phase 9 or Phase 10 feature. The purpose is anti-duplication: determine whether the requested behavior already exists, should extend an existing surface, or is genuinely new.

## Usage

```text
/atomic-check "<feature description>"
/vibe-science:atomic-check "<feature description>"
```

## Required Search Path

Read these pages first, in order:

1. `vibe-science/blueprints/private/WIKI_VRE/index.md`
2. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-exported-symbols.md`
3. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-db-writers.md`
4. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-schema-graph.md`
5. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-gate-triggers.md`
6. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-protocol-invariants.md`
7. `vibe-science/blueprints/private/WIKI_VRE/entities/registry-cli-verbs.md`

Then inspect the top matching entity, source, synthesis, or test-contract pages.

## Output

```markdown
## Atomic Check

Feature: <description>

### Candidates
| Rank | Existing surface | Why it may overlap | Recommendation |
|---:|---|---|---|

### Verdict
EXTEND <page/path> / NET-NEW / BLOCKED-DUPLICATE

### Required Follow-Up
- Source files to open before coding:
- Tests to extend:
- Wiki pages to update:
```

If no overlap is found, write exactly: `no duplicate detected`.

## Rules

- Do not rely on free-text search alone; the six registries are mandatory.
- If an existing surface covers at least half the requested behavior, recommend extension rather than a new module.
- If the feature touches tests, consult `entities/test-contracts-*.md` before proposing a new test file.
- The atomic-check result must be copied into the implementation ledger row or wiki log for the patch.
