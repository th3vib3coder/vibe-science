---
description: Run the WIKI_VRE structural and atomicity audit suite
allowed-tools: Read, Bash
model: sonnet
---

# lint-wiki

Run this when checking whether WIKI_VRE is structurally healthy and current.

## Usage

```text
/lint-wiki
/vibe-science:lint-wiki
```

## Command Suite

Run from the repository workspace root:

```bash
node vibe-science/blueprints/private/WIKI_VRE/tools/wiki-lint.mjs --json
node vibe-science/blueprints/private/WIKI_VRE/tools/generate-vre-coverage.mjs --check
node vibe-science/blueprints/private/WIKI_VRE/tools/build-registries.mjs --check
node vibe-science/blueprints/private/WIKI_VRE/tools/audit-entity-exports.mjs --json
node vibe-science/blueprints/private/WIKI_VRE/tools/audit-schema-fields.mjs --json
node vibe-science/blueprints/private/WIKI_VRE/tools/build-db-table-pages.mjs --check
node vibe-science/blueprints/private/WIKI_VRE/tools/audit-protocol-stubs.mjs --check --verified-date=2026-04-26
node vibe-science/blueprints/private/WIKI_VRE/tools/r2-audit-syntheses.mjs --check --verified-date=2026-04-26
node vibe-science/blueprints/private/WIKI_VRE/tools/refresh-verified-at.mjs --check --verified-date=2026-04-26
node vibe-science/blueprints/private/WIKI_VRE/tools/sync-mirror.mjs --check
```

## Output

Report a compact table:

```markdown
| Check | Result | Notes |
|---|---|---|
```

If any check fails, do not summarize as healthy. Name the failing command and the exact files or pages it reports.
