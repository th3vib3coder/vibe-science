# Adversarial Review Protocol

**Status:** Active working protocol  
**Date:** 2026-03-28  
**Scope:** How to use Claude/Codex-like agents for spec and architecture review without accepting premature closure

---

## Purpose

This protocol exists because drafting models are useful, but they tend to:

- stop at the first plausible version
- confuse "implementation detail" with unresolved architecture
- declare a spec ready too early
- underweight execution-model mismatches

The goal is simple:

**use models as drafting engines, not as their own final judges**

---

## Operating Rules

### 1. Separate drafting from judgment

Never let the same pass both write a spec and immediately certify it as ready.

Minimum pattern:

1. draft
2. adversarial attack
3. repo-grounding
4. patch
5. hostile reread
6. only then commit

### 2. Do not ask "is this good?"

Ask for attack, not reassurance.

Good prompts:

- "Find 5 real problems."
- "What breaks first in implementation?"
- "Where does this spec assume a runtime that does not exist?"
- "Which open questions are still architectural, not merely implementative?"

### 3. Force repo grounding

Every nontrivial judgment must be tied to the real repo.

The reviewer must say:

- which files were read
- which code paths were checked
- which schema or runtime artifacts were verified
- whether a claim is inferred from code, from docs, or from the spec only

If it cannot cite real files, the judgment is not grounded enough.

### 4. Label the level of each problem

Every finding should be classified as one of:

- architecture
- execution model
- ownership / boundaries
- data model
- API contract
- testing / validation
- wording / documentation

This prevents fake closure through category collapse.

### 5. Force the six implementation questions

For every proposed module or feature, demand explicit answers to:

1. How does it enter the system?
2. Where does its state live?
3. Who reads that state?
4. Who writes that state?
5. How is it tested or validated?
6. How does it degrade without harming the kernel?

If one of these is unanswered, the design is not done.

### 6. For Claude Code systems, demand a host reality check

Before accepting any flow, command, or agent surface, ask:

- Is this prompt text, code, hook, command, skill, script, file, MCP tool, or DB state?
- Who actually executes it?
- What tool substrate does it depend on?
- Is there a hidden assumption of a runtime that Claude Code does not provide?

This catches the most common spec hallucination: describing an application runtime where there is really only prompt-driven tool orchestration.

### 7. Do not accept concepts without substrate

If the spec says:

- flow engine
- control plane
- policy helper
- resume surface
- automation layer

then the reviewer must ask:

- which file?
- which format?
- invoked how?
- by whom?
- with what failure mode?

### 8. Force explicit uncertainty

A strong review does not say "everything is closed."

It says:

- which issues are blockers
- which issues are real but non-blocking
- which issues can be deferred to implementation
- why those deferred issues are safe to defer

### 9. Distinguish testable code from prompt text

In Claude Code systems, not everything is unit-testable.

Reviewers must distinguish:

- runtime code: JS/TS/scripts/helpers/CLI wrappers
- prompt surfaces: command markdown, skill instructions
- artifacts: JSON, Markdown, manifests, mirrors

Validation expectations differ:

- runtime code -> unit/integration tests
- prompt surfaces -> operator-session validation
- artifacts -> schema/format validation where appropriate

### 10. Ban premature "ready to implement"

A reviewer may not declare a spec ready unless it states:

- what remains open
- why those open points are no longer architectural blockers
- which gates were checked
- what the first implementation round is allowed to assume

If this is not explicit, "ready" means nothing.

---

## Minimum Workflow

Use this workflow for serious spec work:

1. Draft the module or spec.
2. Ask for concrete adversarial findings.
3. Ground those findings against the repo.
4. Patch the spec.
5. Reread the whole thing from zero.
6. Ask what is still open.
7. Commit only after the reread no longer reveals hidden architectural gaps.

---

## Prompt Template

Use a prompt like this when the model starts getting complacent:

> Do not tell me the spec is good.  
> Read the repo and attack the spec.  
> Find concrete architectural gaps, execution-model mismatches, hidden assumptions, boundary violations, and untestable surfaces.  
> Distinguish blocker vs non-blocker.  
> Cite the real files you checked.  
> If you call something an implementation detail, justify why it is no longer an architectural decision.

---

## Interpretation Rule

Claude/Codex-like models are:

- strong first-draft engines
- useful second-pass critics when pushed
- weak final judges if left alone

Treat them accordingly.

---

## Exit Rule

A spec is ready to leave adversarial review only when:

- its execution model is explicit
- its boundaries are explicit
- its state ownership is explicit
- its validation model is explicit
- remaining open questions are consciously deferred rather than unseen

Until then, keep attacking.
