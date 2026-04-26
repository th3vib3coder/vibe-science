---
description: Query WIKI_VRE and optionally file the answer back into the wiki
argument-hint: "<question>"
allowed-tools: Read, Grep, Glob, Bash
model: opus
---

# query

Use this to answer questions against WIKI_VRE as the compiled project knowledge layer.

## Usage

```text
/query "<question>"
/vibe-science:query "<question>"
```

## Required Search Path

1. Start with `vibe-science/blueprints/private/WIKI_VRE/index.md`.
2. Search the six registries when the question asks whether a feature, symbol, DB writer, schema, gate, protocol invariant, or CLI verb exists.
3. Read the directly relevant source/entity/synthesis pages.
4. If the question is implementation-facing, read the relevant `entities/test-contracts-*.md` page.

## Answer Format

```markdown
## Answer

<direct answer>

## Evidence
- [[page]] — why it matters

## Implementation Implication
Extend <existing surface> / create new surface / operator decision needed.

## File-Back Candidate
Yes/No. If yes: proposed page path and page type.
```

## Filing Back

If the answer creates durable knowledge, ask the operator whether to file it back as:

- `syntheses/<name>.md` for cross-cutting conclusions
- `concepts/<name>.md` for a reusable concept
- `hypotheses/<name>.md` for unresolved or refuted claims
- `queries/<name>.md` only after the query directory is formally introduced

Do not silently create durable pages from exploratory answers without operator intent.
