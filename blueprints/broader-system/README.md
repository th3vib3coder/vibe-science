# Broader System

This folder contains the modular specification for broadening Vibe Science around its hard integrity core.

The design principle is simple:

`protect the kernel, widen the shell`

Read these kernel documents first:

1. [Current Vibe Science System Map](../CURRENT-VIBE-SCIENCE-SYSTEM-MAP.md)
2. [Vibe Science Core Contract](../VIBE-SCIENCE-CORE-CONTRACT.md)
3. [Vibe Science Research Environment V1 Spec](../VIBE-SCIENCE-RESEARCH-ENVIRONMENT-V1-SPEC.md)
4. [Adversarial Review Protocol](../ADVERSARIAL-REVIEW-PROTOCOL.md)

Read in this order:

1. [Core Invariants](./01-core-invariants.md)
2. [Flow Layer](./02-flow-layer.md)
3. [Memory Layer](./03-memory-layer.md)
4. [Connect Layer](./04-connect-layer.md)
5. [Automation Layer](./05-automation-layer.md)
6. [Domain Packs](./06-domain-packs.md)
7. [Sequencing and Governance](./07-sequencing-and-governance.md)

## Why this is split

The broader-system work will likely be executed by multiple agents and over multiple rounds.

This folder is intentionally modular so that:

- each document stays narrow
- implementation planning can be delegated atomically
- context windows are used efficiently
- the project does not drift into vague "assistant suite" thinking

## Global Rule

Every module in this folder is subordinate to [Core Invariants](./01-core-invariants.md).

If any proposed feature conflicts with core invariants, the feature loses.
