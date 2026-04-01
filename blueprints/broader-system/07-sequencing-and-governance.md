# 07. Sequencing and Governance

## Purpose

Define the safe order for broadening Vibe Science.

The goal is not maximum speed.
The goal is breadth without softness.

## Governance Principle

Every broader-system change should be judged by this order:

1. protect the kernel
2. add mirrors and exports
3. add orchestration
4. add connectors
5. add recurring automation
6. add packs

If an initiative tries to invert this order, it increases risk.

## Recommended Waves

**Note:** The wave sequencing below was written before the product spec decided "Flow Engine first." The current operational sequencing is in [04-delivery-roadmap.md](../research-environment-v1/04-delivery-roadmap.md), which puts Phase 1 (core-reader + Flow Engine MVP) before mirrors, reporting, and connectors. The waves below remain valid as a governance priority order (low-risk first) but they no longer reflect the actual implementation sequence.

### Wave 1: Human-Readable Outer Shell

Build:

- project memory mirror → product Phase 2
- experiment registry mirror → product Phase 2
- results summary mirror → product Phase 2
- literature inventory → product Phase 1 (via `/flow-literature`)
- advisor meeting prep pack → product Phase 3

Why first (as governance priority):

- high usability gain
- low threat to core truth

### Wave 2: Reporting and Writing Handoff

Build:

- results-report → product Phase 3
- stats appendix → product Phase 3
- figure catalog → product Phase 2
- paper handoff pack → product Phase 3
- rebuttal prep pack

Why second:

- expands usefulness
- still mostly downstream of validated artifacts

### Wave 3: Connectors

Build:

- Zotero connector
- Obsidian connector
- export adapters

Why third:

- broad adoption value
- manageable if treated as adapters

### Wave 4: Recurring Automation

Build:

- weekly digests
- stale-state reminders
- pending review debt digests
- advisor meeting automations
- literature freshness reminders

Why fourth:

- only safe once mirrors and exports are stable

### Wave 5: Domain Packs

Build:

- domain overlays
- templates
- source presets

Why fifth:

- packs should sit on top of a stable shell, not compensate for its absence

## Write-Set Discipline

Broad-shell work should begin outside the deepest runtime files whenever possible.

Preferred early write zones:

- `commands/`
- `blueprints/`
- memory/export helper modules
- connector modules
- automation definitions
- templates

Protected zones (shell work must not modify these without core-track review):

- `plugin/lib/gate-engine.js`
- `plugin/lib/harness-hints.js` (hint catalog is as protected as gates)
- `plugin/scripts/post-tool-use.js`
- `plugin/scripts/session-start.js` (now contains TRACE+ADAPT)
- `plugin/scripts/pre-tool-use.js` (LAW 9 enforcement)
- `plugin/scripts/stop.js` (review enforcement)
- `plugin/db/schema.sql`
- claim/citation truth paths
- stop semantics

## Review Rule

Every substantial broader-system proposal should be reviewed under an adversarial template:

- what user value does this add?
- why must it exist outside the core?
- what truth paths does it touch?
- what happens if it fails?
- can it be disabled cleanly?
- what temptation does it create to bypass rigor?

## Next Step Rule

**Note:** Phase 0 in the product spec is now complete. The governance principle below remains valid — plan before coding — but the planning work (core-reader interface spec, topology decision, execution model, CLI bridge contract, flow state persistence) has been done. The next step per the roadmap is Phase 1 implementation, not more planning artifacts.

Original governance principle (still valid as a check):

Before coding any new module, there should be:

- explicit write sets
- acceptance criteria
- red-line boundaries

The implementation-planning detail now lives in the Phase exit gates of [04-delivery-roadmap.md](../research-environment-v1/04-delivery-roadmap.md).

## Testing Strategy

Every shell module must have at minimum:

1. One happy-path test (the feature works as intended)
2. One graceful-failure test (the feature fails without breaking the core)
3. One independence test (the core works identically without the shell module loaded)

Shell tests go in `__test_e2e.mjs` under B10+ blocks, following the same pattern as B9 (Harness Hints).

**Important distinction:** runtime code (`core-reader.js`, `core-reader-cli.js`, JS helpers in `environment/`) is tested with unit/integration tests. Command shims (`commands/flow-*.md`) are prompt text and are validated by operator-session gates, not by unit tests. See the product spec testing notes in [04-delivery-roadmap.md](../research-environment-v1/04-delivery-roadmap.md).

## Competitive Context

This broader-system work is informed by competitive analysis of Claude Scholar (Galaxy-Dawn, 2026) and similar semi-automated research frameworks. The key strategic choice is to broaden around a hard integrity kernel rather than building a broad assistant suite from scratch. Their advantage is workflow breadth and adoption. Our advantage is that our core enforcement value is architectural, not cosmetic — and cannot be replicated by adding features to a workflow-first system.
