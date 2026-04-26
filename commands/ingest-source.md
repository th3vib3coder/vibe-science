---
description: Ingest a new raw source into WIKI_VRE with provenance and backlinks
argument-hint: "<path-or-url>"
allowed-tools: Read, Write, Edit, Grep, Glob, WebSearch, WebFetch, Bash
model: opus
---

# ingest-source

Use this when the operator adds a source document, URL, protocol, transcript, paper, plan file, or dataset note that should become persistent wiki knowledge.

## Usage

```text
/ingest-source <path-or-url>
/vibe-science:ingest-source <path-or-url>
```

## Workflow

1. Read the source completely enough to identify its claims, entities, protocols, and evidence.
2. Discuss key takeaways with the operator when emphasis is ambiguous.
3. Create or update `vibe-science/blueprints/private/WIKI_VRE/sources/<source-name>.md`.
4. Add LAW 13 frontmatter with non-empty provenance and `last-verified-at`.
5. Update affected entity, concept, synthesis, hypothesis, and test-contract pages.
6. Update `WIKI_VRE/index.md`.
7. Append `WIKI_VRE/log.md` entry:

```markdown
## [YYYY-MM-DD] ingest | <title>

Source: <path-or-url>
Pages created:
Pages updated:
Open questions:
Verification:
```

## Verification

Run before declaring done:

```bash
node vibe-science/blueprints/private/WIKI_VRE/tools/wiki-lint.mjs --json
node vibe-science/blueprints/private/WIKI_VRE/tools/generate-vre-coverage.mjs --check
node vibe-science/blueprints/private/WIKI_VRE/tools/refresh-verified-at.mjs --check --verified-date=2026-04-26
```

If ingestion creates new codebase coverage, regenerate coverage first with `generate-vre-coverage.mjs`, then rerun `--check`.
