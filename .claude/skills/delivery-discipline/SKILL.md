---
name: delivery-discipline
description: Use when preparing or writing any committable deliverable (phase closeout, status report, skill file, wave spec, README section, summary document, CHANGELOG entry, or any markdown file declaring completion or pass/fail status). Applies before the write happens, not after. Without this discipline, agents ship 60% deliverables and declare closure prematurely.
---

# Delivery Discipline

## Overview

**Agents trained to optimize for completion will ship 60% of what's needed
and declare the work closed.** The pattern is reproducible. Scientific
truth is protected by the existing hooks (confounder harness, R2 review
gate, Salvagente Rule). **Delivery completeness is not.** This skill
closes that gap.

You (the agent) must apply the 4 rules below BEFORE writing any
deliverable that will declare anything CLOSED, PASS, DONE, SHIPPED,
COMPLETE, FINALIZED, or READY in a commit-relevant markdown file. A
PreToolUse hook will block your write if you skip the attestation block
defined below. A CI validator will catch bypasses.

## When To Use

**Activate before writing:**
- Any `*closeout*.md`, `*status*.md`, `*summary*.md`, `*verdict*.md`
- Any `phase*-*.md`, `wave*-*.md`, `sprint*-*.md`
- Any `skill*.md`, SKILL.md updates
- Any `README.md` or `CHANGELOG.md` entry that declares a version/release/completion
- Any document declaring a gate PASS, a phase CLOSED, a release SHIPPED

**Do NOT activate for:**
- Normal prose that mentions "done" in casual context ("I closed the file")
- Code files (`.js`, `.py`, etc.) — the skill governs deliverables, not source
- Exploratory notes that do NOT declare closure

## The 4 Non-Negotiable Rules

### Rule 1 — Surface mapping before writing

Before you write a deliverable that will declare anything CLOSED / PASS /
DONE / SHIPPED / COMPLETE, you MUST have a mechanical inventory of what
should be covered.

- If the inventory was produced by a subagent (Explore, general-purpose,
  etc.), you **verify at least the critical claims directly** before
  trusting it. Read the actual files the subagent describes. API
  signatures, file paths, function exports get verified first-hand, not
  assumed.
- Optimistic sampling is failure. "I covered the main cases" means you
  haven't looked at the edge cases.

### Rule 2 — Explicit scope cuts

Every deliverable MUST declare, in its own body, what was LEFT OUT and why.

- A scope-cut list of 0 items is suspicious by default. If your solution
  covers "everything", you probably haven't looked hard enough.
- Force yourself to name at least one cut. If you genuinely cannot find
  one, state that explicitly and pass self-review (Rule 4) first.

### Rule 3 — Completeness proof by enumeration

When you declare closure, list the concrete items verified. Not "all tests
pass" but "26 items in the surface map, 22 verified directly with Read
tool, 4 delegated to subagent report and cross-checked". Enumeration beats
summary.

### Rule 4 — Adversarial self-review before closure

Before you write "CLOSED" / "PASS" / "DONE", ask yourself: **"What would a
skeptical reviewer attack?"** List at least 3 findings. If you find 0,
assume you haven't looked hard enough and go back to Rule 1.

## The Attestation Block (MUST appear in every deliverable declaring closure)

Format: a `## Delivery Attestation` section (case-insensitive, `##` or
`###`) containing a fenced `json` block. The hook extracts the first
fenced json block under that heading and validates it against
`skills/vibe/assets/schemas/delivery-attestation.schema.json`.

````markdown
## Delivery Attestation

```json
{
  "covered": [
    "Concrete item 1 verified (not a summary)",
    "Concrete item 2 verified",
    "..."
  ],
  "scope_cuts": [
    {
      "item": "Thing left out of this deliverable",
      "reason": "Why it is outside this deliverable (not 'no time')"
    }
  ],
  "self_review_findings": [
    "Adversarial finding 1 (a skeptical reviewer would attack X because...)",
    "Adversarial finding 2",
    "Adversarial finding 3"
  ],
  "external_review_status": "pending"
}
```
````

**Field semantics:**
- `covered`: array of strings, ≥1 item, each ≥3 chars. Concrete items, not summaries.
- `scope_cuts`: array of `{item, reason}` objects. Empty array allowed but suspicious.
- `self_review_findings`: array of strings, **≥3 items required**, each ≥20 chars.
- `external_review_status`: enum `"pending" | "cleared" | "blocked"`.

## Quick Reference

| Intent | Action |
|--------|--------|
| Writing a phase closeout | Include the `## Delivery Attestation` section with filled JSON block |
| Writing a skill file | Include attestation even if short skill — the skill itself is a deliverable |
| Updating CHANGELOG | Attestation required when declaring a release / version |
| Updating README status section | Attestation required when declaring pass/fail or coverage |
| Exempting a file legitimately | Add `<!-- delivery-discipline: exempt -->` comment near the top. Logged as audit event; abuse tracked. |

## Rationalization Table — DO NOT fall for these

| Excuse | Counter |
|--------|---------|
| "This is just a small doc, discipline is overkill" | Small docs are where premature closure starts. The attestation takes 60 seconds. |
| "I don't have time for scope cuts" | The cut list takes 30 seconds. Skipping it costs 30 minutes when user pushes back. |
| "Self-review feels self-indulgent" | It's the cheap version of R2. Skip it and you pay in R2 corrections later. |
| "The block only triggers on 'CLOSED' — I'll say 'finalized' instead" | The regex covers synonyms: CLOSED, DONE, PASS, PASSED, SHIPPED, COMPLETE, COMPLETED, FINALIZED, READY. Evasion gets logged. |
| "I verified with a subagent, that's enough" | Subagents sample too. Spot-check critical items with Read tool before trusting. |
| "External review status: cleared" (without actually running review) | Lying about external_review_status is traceable — the governance log keeps a record. A false `cleared` is caught by the CI validator cross-referencing audit events. |
| "I'll add the attestation at the end, after writing everything" | Writing the attestation FORCES you to enumerate. Skipping that step defeats the whole point. Write it as you go, not as an afterthought. |

## Red Flags — STOP and apply the skill

- About to write a deliverable containing "CLOSED", "PASS", "DONE", "SHIPPED", "COMPLETE", or synonyms in declarative context
- About to mark a TodoWrite task `completed` after a large deliverable
- About to stop the session with a "here's what I did" summary
- About to commit a markdown file whose name matches `*closeout*`, `*status*`, `*summary*`, `*verdict*`, `*phase*`, `*wave*`, `*skill*`, `readme`, `changelog`
- About to declare a release or version bump

**All of these mean: stop, map the surface, declare scope cuts, write the
attestation block, then continue.**

## Common Mistakes

- **Fake attestation**: filling fields with generic strings ("looked at everything"). Schema enforces minLength; hook validates; CI validator cross-references. Lying is cheaper to catch than 60% shipping.
- **Skipping scope_cuts because "nothing was cut"**: if you genuinely cut nothing, you probably didn't look hard enough. Use the self-review step to find a scope cut.
- **Putting attestation in a comment or footer**: it must be in a `## Delivery Attestation` section with a fenced json block. Other placements won't be parsed.
- **Writing attestation as YAML or markdown list**: must be fenced `json` block. Other formats fail schema validation.
- **Adding exemption comment to bypass**: exemptions ARE allowed and don't block, but they're logged as `delivery_discipline_exemption_used` events. Frequent use signals audit target.

## Why This Exists

vibe-science v7.0 protects scientific truth (confounder harness, R2 gate,
Salvagente Rule). It did NOT protect delivery completeness — agents
could still ship 60% skills, declare phases closed prematurely, sample
the surface optimistically.

The pattern was observed repeatedly: Phase 6.1 "closed" but re-retracted
when fresh-eyes review found P1s. Phase 7 Wave 1 shipped at 60%. The
initial Phase 8 skill was missing 40% of the surface.

This skill + the PreToolUse hook + the CI validator + the governance
event log **force the same discipline on delivery that the existing
hooks force on scientific claims**. A hook that blocks the write, not a
review that catches the failure after the fact.

## When in Doubt

Apply the rules. The cost is 60-120 seconds per deliverable. The cost of
skipping is the "user pushes back → retract → patch" cycle we've seen
multiple times.

Default: write the attestation. It's cheaper than the correction loop.
