# Vibe Science v6.0 — Provisional Baseline

**Data:** 24 marzo 2026  
**Modalita':** `schema_validation_only`  
**Scopo:** fissare una baseline minima e riproducibile per il runner eval corrente, senza fingere che questa sia gia' una baseline behavioral completa.

## Cosa misura davvero

La baseline corrente misura:

- discovery dei case YAML in `evals/cases/`
- validazione strutturale dei campi richiesti
- presenza di `expected_markers` o `expected_absent_markers`
- registrazione opzionale in `benchmark_runs`

Non misura ancora:

- esecuzione reale dell'agente
- invocazione dei hook
- marker matching su output dell'agente
- enforcement behavioral di `GC01-GC12`

## Snapshot corrente

Comando:

```bash
node evals/eval-runner.mjs --version 6.0.0
```

Risultato osservato il 24/03/2026:

- eval cases trovati: `24`
- passati: `24`
- falliti: `0`
- artifact: generato sempre dal runner
- record DB: supportato con `--record`

## Interpretazione corretta

Questa baseline e' utile come:

- prova che il layer `eval -> artifact -> benchmark_runs` funziona
- snapshot riproducibile del corpus eval attuale
- punto di partenza per i report comparativi `6.0.0` vs `7.0.0-rc*`

Artifact machine-readable fissato nel repo:

- `evals/baselines/v6.0.0-schema-baseline.json`

Non va usata come prova che Vibe Science passi gia' i Golden Claims a livello behavioral. Quel gap resta esplicitamente aperto finche' non esiste la harness behavioral dedicata.
