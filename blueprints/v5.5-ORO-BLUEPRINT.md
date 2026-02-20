# Vibe Science v5.5 — Architectural Blueprint

**Codename:** ORO (Observe-Recall-Operate)
**Autori:** Carmine Russo + Claude Code (Opus 4.6)
**Data:** 19 febbraio 2026
**Input:** Post-mortem CP+CRISPR run (12 errori, 7 RC), myBrAIn v1.1 reverse engineering, Vibe Science v5.0 IUDEX (1278 righe SKILL.md, 21 protocolli, 9 schema, 27 gate)
**Status:** DESIGN DOCUMENT — da implementare
**Relazione con v5.0:** ADDITIVO. v5.5 aggiunge, non riscrive. Tutto v5.0 resta invariato tranne dove esplicitamente indicato.

---

## 1. Executive Summary

### Il problema

Il run CP+CRISPR del 19 febbraio 2026 ha prodotto 8 findings pubblicabili e 6 figure, ma ha anche rivelato **12 errori** con **7 cause radice**. La statistica piu' importante:

> **ZERO errori intercettati da controlli automatici.**

Tutti gli errori sono stati trovati manualmente — da agenti (2), dall'utente (2), o da verifiche manuali (8). Vibe Science v5.0 ha 27 gate, 9 schema JSON, 4 hook di sistema, Seeded Fault Injection, Judge Agent, e Blind-First Pass. Eppure, nessuno di questi meccanismi ha intercettato i 12 errori reali. Perche'?

**Perche' i gate di v5.0 sono progettati per la qualita' scientifica (claims, evidence, R2 review) ma NON per la qualita' dei dati e la coerenza operativa.** I 12 errori erano tutti operativi: feature sbagliate, dataset ignorati, numeri desincronizzati, colonne fraintese, logbook non scritto. V5.0 assume che i dati siano corretti e verifica le conclusioni. V5.5 deve verificare anche i dati.

### La soluzione

V5.5 aggiunge **5 nuovi sottosistemi** ispirati a myBrAIn (MCP server open-source per memoria persistente):

| # | Sottosistema | Ispirato a | Problema risolto |
|---|-------------|-----------|-----------------|
| 1 | **VibeBrAIn** — MCP Memory Server | myBrAIn server.py + db.py | Amnesia tra sessioni, decisioni perse |
| 2 | **Silent Research Observer** | myBrAIn observer.py | Dataset inutilizzati, desync documenti |
| 3 | **Research Spine** (Logbook strutturato) | Nuovo (ispirato da RC6) | Logbook retroattivo, storia persa |
| 4 | **Data Quality Gate Engine** | Nuovo (ispirato da RC1) | Feature sbagliate, pipeline senza check |
| 5 | **SSOT + Auto-Generation** | Nuovo (ispirato da RC2) | Numeri desincronizzati tra documenti |

Inoltre, **5 sistemi esistenti** di v5.0 vengono potenziati: R2 continuo, Literature Gate, Feature Validation, Design Compliance, Data Dictionary.

### Cosa NON cambia

- Le 10 Leggi Immutabili restano invariate
- L'architettura OTAE-Tree resta il cuore del loop
- R2 Ensemble (4 reviewer), SFI, BFP, R3 Judge restano
- I 27 gate esistenti restano — ne aggiungiamo di nuovi, non rimuoviamo i vecchi
- Agent Teams (SOLO/TEAM) resta il modello di runtime
- Gli schema JSON (9 file) restano read-only

---

## 2. Evidence Base: Il Post-Mortem CRISPR

### I 12 errori

| ID | Errore | Costo | Root Cause | Rilevato da |
|----|--------|-------|-----------|------------|
| M1 | Spin glass dead end | ~1h | RC4 (literature late) | Brainstorm critique |
| M2 | CRISPRoffT scaricato ma non usato per 7h | ~7h | RC7 (design drift) | Self-reflection |
| M3 | 3 bug critici nel primo run (cal/test leak, source-cal su train, features spurie) | ~2h | RC1 (no gates) | Code-reviewer agent |
| M4 | CFD score semplificato (240 penalita' → approssimazione che azzera 7.6%) | ~1h | RC3 (no feature check) | Code-reviewer agent |
| M5 | Bulge samples corrompono features (225/1903 = 11.7%) | Ore di confusione | RC3 (no feature check) | Manual analysis |
| M6 | v2→v3 numeri desincronizzati in FINDINGS.md | ~1h + rischio pubblicazione | RC2 (no SSOT) | Proactive cross-check |
| M7 | **CHANGE-seq alignment bug** (Protospacer vs Guide[:20]) | ~2h + finding invalidato | RC3 (no feature check) | R² suspiciously low |
| M8 | Subsampling troppo aggressivo (36/112 guide) | ~30min | RC1 (no gates) | Guide count check |
| M9 | "Concept drift" overclaim | Minor | RC5 (R2 post-hoc) | REV2 verification |
| M10 | Cross-assay vs cross-study terminology | Minor | RC4 (literature late) | REV2 verification |
| M11 | Logbook creato retroattivamente | Dettagli persi | RC6 (no logbook) | User request |
| M12 | F6b vs F7 naming inconsistency | Minor | RC2 (no SSOT) | REV2 agent |

### Le 7 cause radice

| RC | Pattern | Errori | Fix in v5.5 |
|----|---------|--------|------------|
| RC1 | Nessun gate tra fasi operative | M3, M4, M5, M7, M8 | Data Quality Gate Engine |
| RC2 | Nessuna single source of truth per numeri | M6, M12 | SSOT + Auto-Generation |
| RC3 | Nessuna validazione delle feature | M4, M5, M7, M8 | Feature Validation Protocol |
| RC4 | Literature check troppo tardi | M1, M10 | Literature Gate obbligatorio |
| RC5 | R2 invocato post-hoc, non continuamente | M6, M9, M10 | R2 Continuous Gate |
| RC6 | Logbook non incrementale | M11 | Research Spine + VibeBrAIn |
| RC7 | Drift design-esecuzione | M2 | Design Compliance Gate + Silent Observer |

### La domanda chiave

> Perche' un sistema con 27 gate non ha intercettato NESSUNO di questi errori?

**Risposta:** I gate di v5.0 operano a livello di *claim quality* (la conclusione e' supportata? R2 l'ha validata? Lo schema JSON e' compilato?). Nessun gate opera a livello di *data quality* (le feature sono corrette? Il dataset e' quello giusto? I numeri nei documenti matchano il JSON?). V5.5 aggiunge questo layer mancante.

---

## 3. Root Cause → Solution Mapping

```
RC1 (no gates)           ──→ Data Quality Gate Engine (Sez. 7)
                              + Feature Validation Protocol (Sez. 9.3)
RC2 (no SSOT)            ──→ SSOT + Auto-Generation (Sez. 8)
RC3 (no feature check)   ──→ Feature Validation Protocol (Sez. 9.3)
                              + Data Dictionary Gate (Sez. 9.6)
RC4 (literature late)    ──→ Literature Gate pre-direzione (Sez. 9.2)
RC5 (R2 post-hoc)        ──→ R2 Continuous Gate (Sez. 9.1)
RC6 (logbook assente)    ──→ Research Spine (Sez. 6)
                              + VibeBrAIn memoria persistente (Sez. 4)
RC7 (design drift)       ──→ Design Compliance Gate (Sez. 9.4)
                              + Silent Research Observer (Sez. 5)
```

---

## 3b. v5.5 Pre-Planned Roadmap (dal Blueprint v5.0)

Il blueprint di v5.0 gia' definiva 5 item per v5.5. Questi sono CONFERMATI e integrati con i nuovi sottosistemi dal post-mortem CRISPR:

| ID | Item pre-pianificato | Stato in v5.5 | Integrazione |
|----|---------------------|---------------|-------------|
| R5.5-01 | **Calibration Log** — claim_id → predicted_confidence → actual_outcome | CONFERMATO | Integrato in VibeBrAIn: store_memory(category="calibration") per ogni claim risolto. Accumula dati per Brier score/ECE in v6.0 |
| R5.5-02 | **Golden Claims Test Suite** — 10-15 claims a esito noto come regression test | CONFERMATO | Basato sui 12 errori CRISPR (M1-M12). Ogni errore diventa un test: "Il sistema intercetterebbe M7 (alignment bug)?" |
| R5.5-03 | **Cross-Model Audit Protocol** — formalizzare R2 cross-model opzionale | CONFERMATO | Formalizzato come modalita' opzionale di R2 FORCED. Non obbligatorio (costo), ma raccomandato per claims paper-critical (confidence >= 0.80) |
| R5.5-04 | **Anti-Gaming Metrics** — false kill rate, review diversity, SFI rotation | CONFERMATO | Integrato in R2 INLINE: traccia false_kill_rate e review_diversity per sessione. SFI fault retirement gia' in v5.0 |
| R5.5-05 | **Dataset Hash in Seed Schema** — SHA-256 per provenienza leggera | CONFERMATO | Integrato in Research Spine: ogni DATA_LOAD entry include SHA-256 del file. Esteso a schema serendipity-seed |

### R5.5-01: Calibration Log (dettaglio)

Ogni claim che raggiunge un esito finale (VERIFIED, REJECTED, ARTIFACT, CONFOUNDED, ROBUST) viene registrato:

```yaml
calibration_entry:
  claim_id: C-xxx
  predicted_confidence: 0.72      # al momento della promozione
  actual_outcome: VERIFIED         # esito finale
  r2_verdict: ACCEPT               # verdetto R2
  stage_at_resolution: 4           # stadio quando risolto
  session_id: abc123               # VibeBrAIn session
  timestamp: 2026-02-19T15:30:00Z
```

**Storage:** VibeBrAIn `store_memory(content=yaml, category="calibration")`. Accumulato cross-sessione.

**Uso in v6.0:** Con 50+ claims calibrati, calcolare Brier score e ECE. Aggiustare i floor del confidence formula in base ai dati empirici.

### R5.5-02: Golden Claims Test Suite (dettaglio)

12 test cases derivati dai 12 errori CRISPR:

| Test ID | Derivato da | Test | Expected |
|---------|-------------|------|----------|
| GC-01 | M1 | Proponi spin glass + CRISPR. Il sistema cerca Fu 2022? | L-1 HALT: prior work found |
| GC-02 | M2 | Scarica CRISPRoffT, poi procedi senza usarlo. Observer rileva? | WARN: orphaned dataset |
| GC-03 | M3 | Pipeline con cal/test non guide-held-out. DQ1 rileva? | DQ1 check: leakage detection |
| GC-04 | M4 | CFD che azzera 7.6% dei siti. DQ1 rileva? | DQ1 WARN: CFD pct_nonzero < 0.30 |
| GC-05 | M5 | Bulge samples con mm discrepancy. DQ1 rileva? | DQ1 HALT: mm_crosscheck > 1.5 |
| GC-06 | M6 | JSON aggiornato, FINDINGS.md no. DQ4 rileva? | DQ4 HALT: json_match FAIL |
| GC-07 | M7 | Protospacer usata come guida → mean_mm=0. DQ1 rileva? | DQ1 HALT: mean_mismatch outside [2,8] |
| GC-08 | M8 | Subsampling a 36/112 guide. DQ2 rileva? | DQ2 WARN: insufficient groups per fold |
| GC-09 | M9 | Claim "concept drift" senza alternative. DQ4 rileva? | DQ4 WARN: no alternative explanations |
| GC-10 | M10 | "Cross-assay" quando e' cross-study. R2 INLINE rileva? | R2 INLINE: terminology imprecise |
| GC-11 | M11 | Sessione senza Research Spine. Hook rileva? | Hook HALT: SPINE.md not found |
| GC-12 | M12 | F6b in un file, F7 in un altro. Observer rileva? | WARN: naming inconsistency |

**Uso:** Regression test prima di ogni release di Vibe Science. Se un golden claim non viene intercettato → la modifica e' insufficiente.

---

## 3c. Integrazione Precisa nel Loop OTAE

### Dove si inseriscono le modifiche v5.5 nel loop OTAE esistente

Il loop OTAE di v5.0 ha 6 fasi: OBSERVE → THINK → ACT → EVALUATE → CHECKPOINT → CRYSTALLIZE.

v5.5 NON modifica la struttura del loop. Aggiunge operazioni DENTRO le fasi esistenti:

```
OBSERVE (v5.5 enhanced)
  ├── [v5.0] Read STATE.md + TREE-STATE.json
  ├── [v5.0] Identify current stage, load node context
  ├── [v5.0] Check pending gates, R2 demands
  ├── [v5.5 NEW] recall_context() ← VibeBrAIn RECALL
  │   └── Recupera: errori passati, assunzioni, decisioni, data_dictionary
  └── [v5.5 NEW] observer.check_alerts() ← Silent Observer
      └── Se HALT alert pending → STOP, risolvi prima di procedere

THINK (invariato v5.0)
  ├── Best-first node selection (TREE) or highest-priority (LINEAR)
  └── Plan action

ACT (v5.5 enhanced — gate inline)
  ├── [v5.5 NEW] Gate DD0 (Data Dictionary) ← PRIMA di usare nuove colonne
  │   └── Documenta colonne → store_memory(category="data_dictionary")
  ├── [v5.0] Execute action (search, extract, compute, experiment)
  ├── [v5.5 NEW] Gate DQ1 (Post-Extraction) ← DOPO feature extraction
  │   └── Checks: zero_variance, mean_mismatch, mm_crosscheck, cfd_nonzero, leakage
  ├── [v5.5 NEW] Gate DQ2 (Post-Training) ← DOPO model training
  │   └── Checks: min_auc/r2, no_dominance, fold_stability
  └── [v5.5 NEW] Gate DQ3 (Post-Calibration) ← DOPO CP calibration
      └── Checks: marginal_coverage, not_trivial, not_perfect

EVALUATE (v5.5 enhanced)
  ├── [v5.0] Source check, consistency check
  ├── [v5.0] Claim extraction → CLAIM-LEDGER
  ├── [v5.0] Confidence scoring (formula v5.0: hard veto + geometric mean)
  ├── [v5.5 NEW] validate_finding() ← VibeBrAIn contraddizioni
  ├── [v5.5 NEW] Gate DQ4 (Post-Finding) ← numeri matchano JSON?
  ├── [v5.0] Assumption check → ASSUMPTION-REGISTER
  ├── [v5.0] Metric parsing, VLM feedback
  ├── [v5.0] Serendipity Radar (5-scan)
  └── [v5.0] Gate application (G0-G6, L0-L2, T0-T3, V0, J0)

CHECKPOINT (v5.5 enhanced)
  ├── [v5.0] Stage gate check (S1-S5)
  ├── [v5.0] Tree health check (T3)
  ├── [v5.5 MODIFIED] R2 Co-Pilot Check:
  │   ├── [v5.0] BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT (invariati)
  │   └── [v5.5 NEW] INLINE mode: ogni finding → R2 lightweight check (7-point checklist)
  │       └── Usa Haiku per INLINE (veloce, economico); Opus per FORCED (approfondito)
  ├── [v5.5 NEW] Design Compliance Gate DC0 ← ad ogni cambio di fase
  │   └── "Sto facendo quello che il design dice?"
  ├── [v5.0] Serendipity sprint check (invariato)
  └── [v5.0] Stop condition check (invariato)

CRYSTALLIZE (v5.5 enhanced)
  ├── [v5.0] CLAIM-LEDGER.md, ASSUMPTION-REGISTER.md
  ├── [v5.0] TREE-STATE.json, node files, tree visualization
  ├── [v5.0] PROGRESS.md, STATE.md
  ├── [v5.0] Save intermediate data, log decisions
  ├── [v5.5 NEW] log_spine_entry() ← Research Spine auto-append
  │   └── Tipo, inputs, outputs, gate_results, timestamp
  ├── [v5.5 NEW] store_memory() ← VibeBrAIn MEMORIZE
  │   └── Findings, decisioni, errori, assunzioni → vector store
  ├── [v5.5 NEW] SSOT sync_check() ← se FINDINGS.md aggiornato
  │   └── Verifica numeri matchano JSON
  └── [v5.5 NEW] R5.5-01 calibration log ← se claim risolto
      └── predicted_confidence → actual_outcome → VibeBrAIn
```

### Interazione VibeBrAIn con Resumability (LAW 7)

v5.0 resume da STATE.md + TREE-STATE.json. v5.5 aggiunge VibeBrAIn come TERZO pilastro:

```
Resume protocol (v5.5):
  1. [v5.0] Read STATE.md → dove siamo
  2. [v5.0] Read TREE-STATE.json → struttura albero
  3. [v5.5 NEW] recall_context("session resume") → VibeBrAIn
     └── Recupera: ultimi errori, assunzioni non verificate, decisioni pendenti
  4. [v5.0] Read PROGRESS.md (last 20 lines) → contesto
  5. [v5.0] Read CLAIM-LEDGER frontmatter
  6. [v5.5 NEW] observer.check_alerts() → problemi accumulati
  7. Resume from "Next Action" in STATE.md
```

**Invariante critico:** VibeBrAIn e' COMPLEMENTARE, non sostitutivo. Se ChromaDB non e' disponibile, il sistema deve funzionare con STATE.md + TREE-STATE.json da soli (fallback graceful). La memoria vettoriale ARRICCHISCE il contesto, non lo sostituisce.

### R2 INLINE: Interazione con i 6 Modi Esistenti

| Modo R2 | Trigger (v5.0) | Modifica v5.5 |
|---------|----------------|---------------|
| BRAINSTORM | Phase 0 completion | **INVARIATO** |
| FORCED | Major finding, stage transition, confidence explosion | **INVARIATO** — INLINE non sostituisce FORCED |
| BATCH | 3 minor findings accumulati | **MODIFICATO** — INLINE review ogni finding, BATCH non piu' necessario come trigger. BATCH rimane come fallback se INLINE disabilitato |
| SHADOW | Ogni 3 cicli | **INVARIATO** |
| VETO | Fatal flaw | **INVARIATO** |
| REDIRECT | Better direction | **INVARIATO** |
| **INLINE** (NEW) | Ogni singolo finding | **NUOVO** — 7-point checklist, Haiku model, non blocking per findings minori ma BLOCKING per anomalie |

**Regola di priorita':** Se un finding triggera sia INLINE che FORCED (es. finding maggiore), FORCED ha precedenza (include SFI + BFP + R3). INLINE non duplica.

**Costo stimato:** INLINE usa Haiku (~0.25$/M tokens in, 1.25$/M out). Per un run tipico con 8 findings, INLINE costa ~$0.50 aggiuntivi. BATCH (che rimpiazza) costava simile per 2-3 review aggregate.

---

## 4. Sottosistema 1: VibeBrAIn — MCP Memory Server per la Ricerca

### Concept

Adattamento di myBrAIn (MCP server con ChromaDB + SilentObserver) al contesto della ricerca scientifica. myBrAIn e' pensato per il coding (regole architetturali, stile, componenti standard). VibeBrAIn estende il concetto alla ricerca: decisioni metodologiche, findings, assunzioni, errori, dizionari dati.

### Architettura (da myBrAIn)

```
┌─────────────────────────────────────────────────────┐
│                    VibeBrAIn MCP Server              │
│                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │ init_session │  │ store_memory │  │recall_context│ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │         │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴──────┐ │
│  │validate_find│  │audit_methodo │  │export_session│ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │         │
│         └────────────────┼──────────────────┘         │
│                          │                            │
│              ┌───────────┴──────────┐                 │
│              │      ChromaDB        │                 │
│              │  (Vector Store)      │                 │
│              │  all-MiniLM-L6-v2    │                 │
│              │  cosine distance     │                 │
│              └──────────────────────┘                 │
│                                                       │
│              ┌──────────────────────┐                 │
│              │  Silent Research     │                 │
│              │  Observer (daemon)   │ ← Sezione 5     │
│              └──────────────────────┘                 │
└─────────────────────────────────────────────────────┘
```

### I 6 MCP Tools

#### 4.1 `init_research_session(project_path, research_question)`

Adattato da `initialize_workbase()` di myBrAIn.

**Differenze da myBrAIn:**
- myBrAIn usa solo il path del progetto per generare il workbase_id
- VibeBrAIn usa `SHA256(normalized_path + research_question)` → sessioni diverse per lo stesso progetto con RQ diverse
- Scansiona la struttura del progetto E i dati disponibili (file CSV/TSV/H5AD nella cartella dati)
- Crea il contesto iniziale: RQ, datasets disponibili, design document (se esiste)

```python
@mcp.tool()
def init_research_session(project_path: str, research_question: str) -> dict:
    path = analyzer.normalize_path(project_path)
    session_id = hashlib.sha256(
        f"{str(path).lower()}|{research_question}".encode()
    ).hexdigest()

    # Scansiona struttura progetto
    structure = analyzer.scan_structure(path)

    # Scansiona datasets disponibili
    datasets = scan_available_datasets(path)

    # Salva contesto iniziale
    db.add_memory(
        memory_id=f"context_{session_id}",
        text=f"RQ: {research_question}\nStructure:\n{structure}\nDatasets:\n{datasets}",
        metadata={
            "session_id": session_id,
            "project_name": path.name,
            "root_path": str(path),
            "research_question": research_question,
            "type": "context",
            "category": "session_init"
        }
    )

    # Inizializza Research Spine (logbook auto)
    init_research_spine(path, session_id, research_question)

    return {"session_id": session_id, "datasets": datasets, "status": "initialized"}
```

#### 4.2 `store_memory(content, category, session_id, force=False)`

Adattato da `store_insight()` di myBrAIn.

**Categorie specifiche per ricerca:**

| Categoria | Quando usare | Esempio CRISPR |
|-----------|-------------|----------------|
| `methodology` | Decisione su metodo/pipeline | "Usiamo guide-held-out split, non random" |
| `finding` | Risultato verificato | "Coverage marginale 95.2% a alpha=0.05" |
| `assumption` | Assunzione da verificare | "CRISPRoffT Protospacer_sequence e' la guida" |
| `decision` | Scelta tra alternative | "TrueOT per classificazione, CHANGE-seq per regressione" |
| `mistake` | Errore trovato e corretto | "CFD approssimato azzerava 7.6% dei siti" |
| `data_dictionary` | Significato di colonne/campi | "Guide_sequence[:20] = guida progettata (20nt senza PAM)" |
| `gate_result` | Esito di un quality gate | "Gate post-extraction: PASS (mismatch mean=4.2)" |

**Conflict detection** (da myBrAIn): se una nuova memoria e' semanticamente troppo vicina (cosine distance < 0.5) a una esistente nella stessa categoria, chiede conferma prima di sovrascrivere. Questo previene findings contraddittori non risolti.

**Esempio concreto — come avrebbe prevenuto M7:**
```
1. Agent estrae features da CHANGE-seq
2. Chiama store_memory("Protospacer_sequence usata come guida per alignment",
                        category="assumption", session_id=...)
3. Piu' tardi, R² = 0.032 → agent indaga
4. Agent chiama recall_context("alignment guide sequence CHANGE-seq")
5. Trova l'assunzione salvata → verifica → scopre l'errore
6. Chiama store_memory("ERRORE: Protospacer_sequence e' il protospacer OFF-target,
                         non la guida. Usare Guide_sequence[:20]",
                        category="mistake", session_id=...)
7. Il conflitto con l'assunzione precedente viene rilevato automaticamente
```

#### 4.3 `recall_context(query, session_id)`

Identico a myBrAIn `recall_context()`. Ricerca semantica nel vector store, filtrata per session_id.

**Uso nel loop OTAE:** Chiamata OBBLIGATORIA all'inizio di ogni ciclo OTAE. L'agente deve fare recall prima di ragionare. Questo e' il pattern RECALL→RESEARCH→MEMORIZE adattato dal RECALL→CODE→MEMORIZE di myBrAIn.

#### 4.4 `validate_finding(finding_text, evidence_json_key, session_id)`

NUOVO — non presente in myBrAIn. Specifico per ricerca.

```python
@mcp.tool()
def validate_finding(finding_text: str, evidence_json_key: str,
                     session_id: str) -> dict:
    """
    Valida un finding contro:
    1. Memorie esistenti (contraddizioni?)
    2. JSON source of truth (numeri corretti?)
    3. Findings precedenti (coerenza?)
    """
    # 1. Cerca contraddizioni semantiche
    conflicts = db.check_conflict(finding_text, session_id, category="finding")

    # 2. Verifica numeri contro JSON
    json_check = verify_against_json(evidence_json_key, session_id)

    # 3. Cerca findings correlati
    related = db.search(finding_text, session_id, limit=3)

    return {
        "conflicts": conflicts,
        "json_verified": json_check,
        "related_findings": related,
        "recommendation": "STORE" if not conflicts else "REVIEW_CONFLICT"
    }
```

#### 4.5 `audit_methodology(session_id)`

Adattato da `audit_codebase()` di myBrAIn. Invece di cercare drift architetturale nel codice, cerca drift metodologico nella ricerca.

**Cosa controlla:**
- Tutte le assunzioni (`category="assumption"`) sono state verificate?
- Ci sono errori (`category="mistake"`) non risolti?
- Il design document e' coerente con le decisioni prese?
- Ci sono dataset disponibili non usati? (→ previene M2)

#### 4.6 `export_session(session_id, format="json")`

Adattato da `export_memory_to_json()` di myBrAIn. Esporta tutte le memorie di una sessione.

**Uso:** Fine sessione, condivisione con collaboratori, input per paper writing.

### Il Ciclo RECALL→RESEARCH→MEMORIZE

Adattato dal Integration Protocol di myBrAIn (RECALL→CODE→MEMORIZE):

```
OGNI CICLO OTAE:

┌─ RECALL ──────────────────────────────────┐
│  1. recall_context("current task keywords") │
│  2. Leggi memorie: assunzioni, errori,      │
│     decisioni rilevanti                     │
│  3. Se trovi un errore passato simile:      │
│     ATTENZIONE — non ripeterlo              │
└──────────────────────────────────────────────┘
            │
┌─ RESEARCH ────────────────────────────────┐
│  4. Esegui il ciclo OTAE normale           │
│  5. Se formuli un finding:                  │
│     → validate_finding() PRIMA di salvare  │
│  6. Se prendi una decisione metodologica:   │
│     → recall_context() per verificare       │
│       coerenza con decisioni passate        │
└──────────────────────────────────────────────┘
            │
┌─ MEMORIZE ────────────────────────────────┐
│  7. store_memory() per ogni:                │
│     - Nuovo finding verificato             │
│     - Nuova assunzione                     │
│     - Decisione presa                      │
│     - Errore trovato                       │
│     - Definizione colonna/campo            │
│  8. Log automatico nel Research Spine       │
└──────────────────────────────────────────────┘
```

### Implementazione tecnica

**Dipendenze:**
- `chromadb` — vector store (gia' usato da myBrAIn)
- `sentence-transformers` — embeddings (all-MiniLM-L6-v2)
- `mcp` (FastMCP) — protocollo MCP
- `tenacity` — retry logic per lock SQLite (da myBrAIn)

**Integrazione con Vibe Science:** VibeBrAIn puo' essere:
1. **Standalone MCP server** (come myBrAIn) — registrato in `mcpServers` config
2. **Integrato nel skill** — chiamate dirette da SKILL.md via istruzioni prompt

L'opzione 1 e' preferibile: separation of concerns, debuggabile separatamente, riusabile per altri progetti.

---

## 5. Sottosistema 2: Silent Research Observer

### Concept

Adattamento del SilentObserver di myBrAIn (daemon thread che scansiona il codice per drift architetturale) al contesto della ricerca. Invece di cercare violazioni di naming convention, cerca:

1. **Dataset inutilizzati** — file scaricati ma mai referenziati negli script
2. **Documenti desincronizzati** — JSON aggiornato ma FINDINGS.md no
3. **Design drift** — esecuzione che diverge dal design document
4. **Naming inconsistencies** — finding chiamato F6b in un file e F7 in un altro

### Come avrebbe prevenuto errori specifici

| Errore | Cosa avrebbe rilevato l'Observer |
|--------|----------------------------------|
| M2 (CRISPRoffT non usato) | "WARN: File `CRISPRoffT_hg38.tsv.gz` scaricato 3h fa, mai referenziato in nessuno script" |
| M6 (v2/v3 desync) | "HALT: `results.json` aggiornato 10min fa, `FINDINGS.md` contiene numeri dalla versione precedente" |
| M12 (F6b vs F7) | "WARN: Finding referenziato come 'F6b' in LOGBOOK.md ma come 'Finding 7' in FINDINGS.md" |

### Architettura (da myBrAIn observer.py)

```python
class SilentResearchObserver(threading.Thread):
    """
    Daemon thread che monitora la directory .vibe-science/
    e rileva problemi operativi.
    """
    def __init__(self, vibe_dir: Path, session_id: str, interval: int = 120):
        super().__init__(daemon=True)
        self.vibe_dir = vibe_dir
        self.session_id = session_id
        self.interval = interval  # 2 minuti (myBrAIn usa 5 min)
        self.alerts = []

    def _perform_scan(self):
        """Scansione periodica — 4 controlli."""

        # CHECK 1: Dataset inutilizzati
        data_files = self._find_data_files()
        script_files = self._find_script_references()
        orphaned = data_files - script_files
        if orphaned:
            self._alert("WARN", f"Dataset scaricati ma non usati: {orphaned}")

        # CHECK 2: Documento/JSON desync
        json_mtime = self._get_mtime("07_eval/*.json")
        findings_mtime = self._get_mtime("FINDINGS.md")
        if json_mtime > findings_mtime + timedelta(minutes=5):
            self._alert("HALT", "JSON aggiornato ma FINDINGS.md non rigenerato")

        # CHECK 3: Design compliance
        design_datasets = self._extract_design_datasets()
        used_datasets = self._extract_used_datasets()
        if design_datasets - used_datasets:
            self._alert("WARN", f"Design dice di usare {design_datasets - used_datasets}, non ancora usati")

        # CHECK 4: Naming consistency
        finding_names = self._extract_finding_names_across_files()
        inconsistencies = self._find_naming_inconsistencies(finding_names)
        if inconsistencies:
            self._alert("WARN", f"Naming inconsistencies: {inconsistencies}")

    def _alert(self, level: str, message: str):
        """
        Livelli:
        - INFO: solo nel log
        - WARN: incluso nel prossimo R2 review
        - HALT: blocca il prossimo ciclo OTAE fino a risoluzione
        """
        self.alerts.append({"level": level, "message": message, "time": now()})
        # Scrivi anche nel Research Spine
        append_to_spine(f"[OBSERVER {level}] {message}")
```

### Differenze da myBrAIn SilentObserver

| Aspetto | myBrAIn | VibeBrAIn |
|---------|---------|-----------|
| Target | File di codice (.py, .js, .ts) | File di ricerca (.json, .md, .csv, .py scripts) |
| Cosa cerca | Violazioni naming, print() vietati | Dataset orfani, desync documenti, design drift |
| Intervallo | 5 minuti | 2 minuti (ricerca piu' dinamica) |
| Alert levels | Nessuna azione automatica | INFO/WARN/HALT con integrazione R2 |
| Integrazione | Standalone dashboard | Integrato nel loop OTAE via R2 |

---

## 6. Sottosistema 3: Research Spine (Logbook Strutturato)

### Problema (M11)

Il logbook CRISPR e' stato creato nella Fase 18, dopo che la maggior parte del lavoro era fatta. Ricostruito dalla memoria e dalla git history. Dettagli persi.

### Soluzione

Il Research Spine e' il **documento centrale** della sessione di ricerca. Non e' opzionale. Non e' creato alla fine. E' inizializzato PRIMA di qualsiasi altra azione e incrementato automaticamente.

### Struttura

```markdown
# Research Spine — {project_name}
## Session: {date} | RQ: {research_question}
## Session ID: {session_id}

---

### Entry 001 | {timestamp} | INIT
- **Action:** Session initialized
- **Datasets available:** [list]
- **Design document:** [link]
- **Gate status:** N/A

### Entry 002 | {timestamp} | DATA_LOAD
- **Action:** Loaded TrueOT v1.1 dataset
- **Input:** F:\crispr_papers\TrueOT_v1.1.csv
- **Output:** 1903 sites, 36 guides, 11 studies
- **Gate status:** G0 PASS (file exists, readable, expected columns present)

### Entry 003 | {timestamp} | FEATURE_EXTRACTION
- **Action:** Extracted 23 features from sequence alignment
- **Input:** 1903 sites
- **Output:** 1678 sites (225 bulge-filtered)
- **Gate status:** Feature Validation PASS (mean_mm=3.8, CFD non-zero=87%)
- **Note:** Bulge samples removed — position-by-position features invalid for indels

### Entry 004 | {timestamp} | MODEL_TRAIN
- **Action:** XGBoost classifier (5 seeds x 5 folds)
- **Input:** 1678 sites, 23 features
- **Output:** Mean AUC = 0.847 ± 0.031
- **Gate status:** G3 PASS (AUC > 0.55)

### Entry 005 | {timestamp} | FINDING
- **Action:** Finding F1 formulated
- **Claim:** "In-domain marginal coverage matches nominal"
- **Evidence:** results.json → regression_cp_summary.marginal
- **R2 status:** PENDING
- **Gate status:** Finding Gate — numbers verified against JSON: PASS
```

### Implementazione nel loop OTAE

```
session_start():
    → init_research_session()         # VibeBrAIn
    → create_research_spine()          # Auto-crea SPINE.md
    → log_spine_entry("INIT", ...)     # Prima entry

every_significant_action():
    BEFORE:
        → recall_context(action_keywords)   # VibeBrAIn RECALL
    ACTION:
        → esegui azione
    AFTER:
        → log_spine_entry(action_type, inputs, outputs, gate_result)  # Spine
        → store_memory(summary, category, session_id)                  # VibeBrAIn MEMORIZE
```

**Le azioni che triggerano una entry:**
- `DATA_LOAD` — caricamento dataset
- `FEATURE_EXTRACTION` — estrazione feature
- `MODEL_TRAIN` — training modello
- `CP_CALIBRATE` — calibrazione conformal prediction
- `FINDING` — formulazione finding
- `R2_REVIEW` — review di R2
- `BUG_FIX` — correzione errore
- `DESIGN_CHANGE` — modifica al design
- `GATE_CHECK` — esito quality gate
- `LITERATURE_SEARCH` — ricerca bibliografica
- `DATASET_DOWNLOAD` — download dataset (cruciale per M2!)

---

## 7. Sottosistema 4: Data Quality Gate Engine

### Problema (RC1)

V5.0 ha 27 gate ma nessuno controlla la qualita' dei dati. M3 (3 bug nel primo run), M4 (CFD sbagliato), M5 (bulge corrompono feature), M7 (alignment bug), M8 (subsampling eccessivo) — tutti passano i gate di v5.0 perche' quelli controllano claims, non dati.

### I 4 Gate

#### Gate DQ1: Post-Extraction (dopo estrazione feature)

```python
def gate_post_extraction(df, task="off-target"):
    checks = []

    # 1. No degenerate features
    zero_var = [c for c in feature_cols if df[c].std() == 0]
    checks.append(("zero_variance", len(zero_var) == 0,
                    f"Zero-variance features: {zero_var}"))

    # 2. Mismatch distribution plausible
    if "mismatch_count" in df.columns:
        mean_mm = df["mismatch_count"].mean()
        checks.append(("mean_mismatch", 2 < mean_mm < 8,
                        f"Mean mismatch {mean_mm:.1f} outside [2,8]"))

    # 3. Cross-check computed vs reported
    if "reported_mm" in df.columns and "mismatch_count" in df.columns:
        discrep = (df["mismatch_count"] - df["reported_mm"]).abs().mean()
        checks.append(("mm_crosscheck", discrep < 1.5,
                        f"Mismatch discrepancy {discrep:.2f}"))

    # 4. CFD non-zero (se calcolato)
    if "cfd_score" in df.columns:
        pct_nonzero = (df["cfd_score"] > 0).mean()
        checks.append(("cfd_nonzero", pct_nonzero > 0.30,
                        f"CFD non-zero: {pct_nonzero:.1%}"))

    # 5. No perfect correlation with label (leakage)
    if "label" in df.columns:
        for col in feature_cols:
            corr = df[col].corr(df["label"])
            checks.append((f"leakage_{col}", abs(corr) < 0.95,
                            f"Feature {col} corr with label: {corr:.3f}"))

    return evaluate_gate("DQ1", checks)
```

**Avrebbe intercettato:** M4 (CFD pct_nonzero sarebbe stato basso), M5 (mm_crosscheck fallito), M7 (mean_mismatch = 0 → HALT immediato)

#### Gate DQ2: Post-Training (dopo training modello)

```python
def gate_post_training(metrics):
    checks = []

    # 1. Model learns something
    if "auc" in metrics:
        checks.append(("min_auc", metrics["auc"] > 0.55,
                        f"AUC {metrics['auc']:.3f} < 0.55"))
    if "r2" in metrics:
        checks.append(("min_r2", metrics["r2"] > 0.05,
                        f"R² {metrics['r2']:.3f} < 0.05"))

    # 2. No single-feature dominance
    if "feature_importances" in metrics:
        top_imp = max(metrics["feature_importances"].values())
        checks.append(("no_dominance", top_imp < 0.50,
                        f"Top feature importance {top_imp:.2f} > 0.50"))

    # 3. Fold variance not insane
    if "fold_metrics" in metrics:
        cv = np.std(metrics["fold_metrics"]) / np.mean(metrics["fold_metrics"])
        checks.append(("fold_stability", cv < 0.50,
                        f"Fold CV {cv:.2f} > 0.50"))

    return evaluate_gate("DQ2", checks)
```

**Avrebbe intercettato:** M7 (R² = 0.032 < 0.05 → HALT), M8 (fold_stability con poche guide)

#### Gate DQ3: Post-Calibration (dopo calibrazione CP)

```python
def gate_post_calibration(results, alpha):
    checks = []

    # 1. Marginal coverage reasonable
    cov = results["marginal_coverage"]
    target = 1 - alpha
    gap = abs(cov - target)
    checks.append(("marginal_coverage", gap < 0.10,
                    f"Coverage {cov:.3f} vs target {target:.3f}, gap {gap:.3f}"))

    # 2. Not trivially wide
    if "mean_width" in results:
        checks.append(("not_trivial", results["mean_width"] < results.get("max_width_threshold", 10),
                        f"Mean interval width {results['mean_width']:.3f}"))

    # 3. Coverage not suspiciously perfect (possible leakage)
    checks.append(("not_perfect", cov < 0.999,
                    f"Coverage {cov:.3f} suspiciously high"))

    return evaluate_gate("DQ3", checks)
```

#### Gate DQ4: Post-Finding (dopo formulazione di un finding)

```python
def gate_post_finding(finding, json_path, findings_md_path):
    checks = []

    # 1. Numbers match JSON
    json_numbers = extract_numbers_from_json(json_path, finding["json_key"])
    md_numbers = extract_numbers_from_text(finding["text"])
    match = compare_numbers(json_numbers, md_numbers, tolerance=0.001)
    checks.append(("json_match", match,
                    f"Numbers in finding don't match JSON"))

    # 2. Sample size reported
    checks.append(("sample_size", "n=" in finding["text"] or "sites" in finding["text"],
                    "No sample size in finding text"))

    # 3. Alternative explanations listed (for negative/surprising results)
    if finding.get("surprising"):
        checks.append(("alternatives", finding.get("alternatives", []) != [],
                        "Surprising finding without alternative explanations"))

    return evaluate_gate("DQ4", checks)
```

**Avrebbe intercettato:** M6 (json_match FAIL: v2 numbers in v3 context), M9 (alternatives FAIL: overclaim senza alternative)

### Integrazione nel loop OTAE

```
OTAE CYCLE (enhanced v5.5):
  OBSERVE
    → recall_context()           # VibeBrAIn RECALL
  THINK
    → [ragionamento]
  ACT
    → extract_features()
    → GATE DQ1                   # NEW: blocca se features sbagliate
    → train_model()
    → GATE DQ2                   # NEW: blocca se modello non impara
    → calibrate_cp()
    → GATE DQ3                   # NEW: blocca se coverage insensata
  EVALUATE
    → formulate_finding()
    → GATE DQ4                   # NEW: blocca se numeri desincronizzati
    → R2_gate()                  # EXISTING (v5.0): ora continuo, non batch
  CHECKPOINT
    → store_memory()             # VibeBrAIn MEMORIZE
    → log_spine_entry()          # Research Spine
    → observer.check_alerts()    # Silent Observer
```

### La funzione `evaluate_gate()`

```python
def evaluate_gate(gate_id: str, checks: list) -> dict:
    """
    Valuta una lista di checks e ritorna PASS/WARN/HALT.

    Returns:
        {"status": "PASS"|"WARN"|"HALT",
         "gate_id": gate_id,
         "passed": [...], "warned": [...], "failed": [...]}
    """
    passed, warned, failed = [], [], []
    for name, result, message in checks:
        if result:
            passed.append(name)
        else:
            # Checks che iniziano con "HALT_" bloccano; gli altri sono WARN
            if name.startswith("HALT_") or name in CRITICAL_CHECKS:
                failed.append({"name": name, "message": message})
            else:
                warned.append({"name": name, "message": message})

    status = "HALT" if failed else ("WARN" if warned else "PASS")

    # Auto-log nel Research Spine
    log_spine_entry("GATE_CHECK", {
        "gate_id": gate_id, "status": status,
        "passed": len(passed), "warned": len(warned), "failed": len(failed)
    })

    # Auto-store in VibeBrAIn
    store_memory(
        f"Gate {gate_id}: {status}. {len(passed)} passed, {len(warned)} warned, {len(failed)} failed.",
        category="gate_result"
    )

    return {"status": status, "gate_id": gate_id,
            "passed": passed, "warned": warned, "failed": failed}
```

---

## 8. Sottosistema 5: SSOT + Auto-Generation

### Problema (RC2)

M6: FINDINGS.md aveva numeri v2 con intestazione v3. M12: finding F6b in un file, F7 in un altro. Causa: numeri copiati manualmente tra file multipli.

### Architettura

```
                    ┌──────────────┐
                    │ results.json │  ← UNICA source of truth
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
    ┌─────────────┐ ┌──────────┐ ┌──────────┐
    │ FINDINGS.md │ │RESULTS.md│ │LOGBOOK.md│
    │ (tabelle    │ │ (auto-   │ │ (numeri  │
    │  auto-gen,  │ │  gen)    │ │  auto-gen│
    │  testo      │ │          │ │  dal JSON│
    │  manuale)   │ │          │ │  )       │
    └─────────────┘ └──────────┘ └──────────┘
```

### Regole

1. **JSON e' l'UNICA fonte di numeri.** Nessun numero viene scritto manualmente in FINDINGS.md.
2. **Le tabelle in FINDINGS.md sono generate** da `generate_documents.py` che legge il JSON.
3. **Le interpretazioni sono scritte manualmente** (solo testo, nessun numero specifico senza `{{json_key}}`).
4. **`sync_check.py`** verifica che tutti i numeri nei .md matchano il JSON. Eseguito come gate DQ4.

### Template system

```python
# generate_documents.py

FINDING_TEMPLATE = """
### Finding {id}: {title}

{interpretation}

| {col_headers} |
|{col_sep}|
{rows_from_json}

**Evidence:** `{json_path}` → `{json_key}`
**Sample size:** n = {n}
**R2 status:** {r2_status}
"""

def generate_findings_md(json_path, interpretations_file):
    """
    Genera FINDINGS.md combinando:
    - Numeri dal JSON (automatico)
    - Interpretazioni dal file interpretazioni (manuale)
    """
    data = json.load(open(json_path))
    interpretations = yaml.load(open(interpretations_file))

    findings = []
    for finding_id, interp in interpretations.items():
        numbers = extract_finding_numbers(data, interp["json_key"])
        findings.append(FINDING_TEMPLATE.format(
            id=finding_id,
            title=interp["title"],
            interpretation=interp["text"],
            col_headers=...,
            rows_from_json=format_rows(numbers),
            json_path=json_path,
            json_key=interp["json_key"],
            n=numbers.get("n", "?"),
            r2_status=interp.get("r2_status", "PENDING")
        ))

    write_findings_md(findings)
```

### sync_check.py

```python
def sync_check(json_path, findings_md_path):
    """
    Verifica che OGNI numero in FINDINGS.md
    sia presente e identico nel JSON.
    """
    json_data = json.load(open(json_path))
    md_text = open(findings_md_path).read()

    # Estrai tutti i numeri dal markdown
    md_numbers = extract_all_numbers(md_text)

    # Per ogni numero, cerca nel JSON
    mismatches = []
    for num, context in md_numbers:
        json_match = find_in_json(json_data, num, tolerance=0.001)
        if not json_match:
            mismatches.append({
                "number": num,
                "context": context,
                "status": "NOT_FOUND_IN_JSON"
            })

    if mismatches:
        print(f"SYNC CHECK FAILED: {len(mismatches)} mismatches")
        for m in mismatches:
            print(f"  {m['number']} in '{m['context']}' — {m['status']}")
        return False

    print(f"SYNC CHECK PASSED: all numbers verified")
    return True
```

---

## 9. Potenziamenti ai Sistemi Esistenti di v5.0

### 9.1 R2 come Gate Continuo (P4) — era post-hoc

**v5.0:** R2 ha 6 modi di attivazione (BRAINSTORM, FORCED, BATCH, SHADOW, VETO, REDIRECT). BATCH accumula 3 findings prima di triggerare.

**v5.5:** Aggiungere modalita' **INLINE** — R2 review dopo OGNI singolo finding, non dopo 3.

```
v5.0 loop:
  finding_1 → log
  finding_2 → log
  finding_3 → R2 BATCH review  ← problemi in 1-2 scoperti tardi

v5.5 loop:
  finding_1 → R2 INLINE review → PASS/FAIL  ← problemi scoperti subito
  finding_2 → R2 INLINE review → PASS/FAIL
  finding_3 → R2 INLINE review → PASS/FAIL
```

**Checklist R2 INLINE (obbligatoria per ogni finding):**
1. Numeri matchano JSON? (→ previene M6)
2. Sample size adeguato per la forza del claim?
3. Alternative explanations listate? (→ previene M9)
4. Terminologia precisa? (→ previene M10)
5. Claim non piu' forte dell'evidenza?
6. Tracciabilita': Claim → Evidence → Script → Data?
7. Sopravviverebbe a un reviewer ostile?

**Costo:** Piu' review ma ognuna piu' piccola. Net: simile a BATCH ma i problemi si trovano prima.

**Implementazione:** Aggiungere `INLINE` come settima modalita' in `protocols/reviewer2-ensemble.md`. Usare modello Haiku per INLINE (veloce, economico) e Opus per FORCED (approfondito).

### 9.2 Literature Gate Obbligatorio (P5)

**v5.0:** L0 (Source Validity), L1 (Coverage), L2 (Review Complete) — verificano la letteratura DOPO che e' stata cercata.

**v5.5:** Aggiungere **L-1 (Literature Pre-Check)** — PRIMA di investire in una direzione.

```
PRIMA di ogni nuova direzione di ricerca:
  1. Cerca PubMed + bioRxiv + arXiv per l'intersezione esatta
  2. Cerca le COMPONENTI separatamente
  3. Se prior work: PIVOT o DIFFERENZIA (decisione esplicita, loggata)
  4. Documenta query e risultati nel Research Spine
  5. GATE L-1: PASS solo se (a) nessun prior work, oppure
                              (b) differenziazione esplicita documentata
```

**Avrebbe prevenuto:** M1 (spin glass — Fu 2022 trovato subito)

### 9.3 Feature Validation Protocol (P6)

Gia' dettagliato nella sezione P6 del POST_MORTEM. In v5.5, diventa parte del Gate DQ1 (Sezione 7).

**Aggiunta v5.5: Cross-dataset validation.**
```python
def validate_features_cross_dataset(df1, df2, feature_cols):
    """
    Verifica che le stesse feature abbiano distribuzioni
    ragionevolmente simili tra due dataset.
    """
    for col in feature_cols:
        ks_stat, p_val = scipy.stats.ks_2samp(df1[col], df2[col])
        if p_val < 0.001:
            warn(f"Feature '{col}' drastically different between datasets "
                 f"(KS={ks_stat:.3f}, p={p_val:.2e})")
```

### 9.4 Design Compliance Gate (P7)

**v5.0:** Nessun controllo che l'esecuzione segua il design.

**v5.5:** Aggiungere gate **DC0** all'inizio di ogni fase:

```
DC0 Gate (Design Compliance):
  1. Leggi il design document (RQ.md + TREE-STATE.json)
  2. Elenca: "Cosa dice il design che dovrei fare in questa fase?"
  3. Elenca: "Sto usando i dataset/metodi specificati nel design?"
  4. Se deviazione: decisione ESPLICITA loggata con razionale
  5. store_memory(deviation_rationale, category="decision")
```

**Avrebbe prevenuto:** M2 (design diceva CRISPRoffT, esecuzione usava solo TrueOT)

### 9.5 Incremental Checkpointing (P8)

Per pipeline lunghe (es. 5 seeds x 5 folds x 3 alpha = 75 combinazioni):

```python
def run_with_checkpoints(pipeline_fn, configs, checkpoint_dir):
    for i, config in enumerate(configs):
        checkpoint_file = checkpoint_dir / f"checkpoint_{i:03d}.json"

        # Se gia' completato, skip
        if checkpoint_file.exists():
            continue

        result = pipeline_fn(config)

        # Early stopping se chiaramente sbagliato
        if result.get("coverage", 1.0) < 0.30:
            raise DataQualityError(
                f"Coverage {result['coverage']} < 0.30 at config {i} — likely bug"
            )

        # Salva checkpoint
        save_json(checkpoint_file, {"config": config, "result": result})

    # Assembla risultati
    return load_all_checkpoints(checkpoint_dir)
```

### 9.6 Data Dictionary Gate (P9)

**PRIMA di usare qualsiasi colonna di un dataset:**

```
GATE DD0 (Data Dictionary):
  1. PRINT tutte le colonne con dtype e valori esempio
  2. Per ogni colonna usata: DOCUMENTA cosa significa
  3. VERIFICA: "Questa colonna e' quello che penso?"
  4. store_memory(column_definition, category="data_dictionary")
  5. ATTENZIONE: MAI assumere che il nome implichi il significato
     (es. Protospacer_sequence ≠ protospacer della guida progettata)
```

**Avrebbe prevenuto:** M7 (CHANGE-seq alignment bug — la colonna `Protospacer_sequence` non era la guida progettata)

### 9.7 Agent Workflow Formalization (P10)

**v5.0:** Agenti lanciati ad-hoc.

**v5.5:** Handoff strutturati:

```
RESEARCHER:
  → Esegue analisi
  → Produce: result JSON + finding draft
  → Chiama: GATE DQ1-DQ3 automaticamente
  → Passa a R2

R2 (INLINE mode):
  → Riceve: finding draft + JSON + gate results
  → Esegue: checklist 7 punti (Sez. 9.1)
  → Ritorna: PASS / FAIL con issue specifiche
  → Se FAIL: RESEARCHER deve risolvere prima di procedere

OBSERVER (background):
  → Scansiona ogni 2 minuti
  → Inietta alert nel prossimo ciclo R2
  → Non blocca direttamente (solo HALT blocca)

SERENDIPITY:
  → Invariato da v5.0 (funziona bene)
  → Aggiunta: recall_context() all'inizio di ogni scan
```

---

## 10. Implementation Priority Matrix

### Fase A: DO FIRST (Fondamenta)

| # | Cosa | Effort | Impact | Previene |
|---|------|--------|--------|---------|
| P1 | Research Spine (logbook auto) | Medio | Critico | M11 |
| P2 | Data Quality Gates (DQ1-DQ4) | Medio | Critico | M3,M4,M5,M7,M8 |
| VB1 | VibeBrAIn MCP base (init + store + recall) | Alto | Critico | Amnesia, M2 |

**Deliverable Fase A:** Il sistema logga tutto, blocca feature sbagliate, e ricorda le decisioni.

### Fase B: DO SECOND (Coerenza)

| # | Cosa | Effort | Impact | Previene |
|---|------|--------|--------|---------|
| P3 | SSOT + Auto-Generation | Alto | Alto | M6, M12 |
| P4 | R2 INLINE (continuo) | Basso | Alto | M6, M9, M10 |
| P5 | Literature Gate L-1 | Basso | Alto | M1, M10 |
| P6 | Feature Validation (in DQ1) | Medio | Alto | M4, M5, M7 |

**Deliverable Fase B:** I documenti non desincronizzano, R2 trova problemi subito, la letteratura e' verificata prima.

### Fase C: DO THIRD (Robustezza)

| # | Cosa | Effort | Impact | Previene |
|---|------|--------|--------|---------|
| P7 | Design Compliance Gate DC0 | Basso | Medio | M2 |
| P8 | Incremental Checkpointing | Medio | Medio | Pipeline lunghe |
| P9 | Data Dictionary Gate DD0 | Basso | Medio | M7 |
| P10 | Agent Workflow Formalization | Alto | Medio | Handoff confusi |
| VB2 | VibeBrAIn validate_finding + audit | Medio | Medio | Contraddizioni |
| VB3 | Silent Research Observer | Alto | Medio | M2, M6 |

**Deliverable Fase C:** Il sistema e' robusto, auto-monitorante, con agenti ben coordinati.

### Timeline stimata

- **Fase A:** 2-3 sessioni di lavoro (Research Spine + DQ Gates + VibeBrAIn base)
- **Fase B:** 2-3 sessioni (SSOT + R2 INLINE + L-1 + Feature Validation)
- **Fase C:** 3-4 sessioni (Design Compliance + Checkpointing + Observer + Agent formalization)

---

## 11. Cosa Mantenere da v5.0

Queste componenti funzionano bene e NON vanno cambiate:

| ID | Cosa | Perche' funziona |
|----|------|-----------------|
| W1 | Guide-held-out splitting | Decisione corretta dal principio |
| W2 | Multiple seeds (5×5) | Stime robuste con SD |
| W3 | Falsificazione aggressiva | Ha trovato bug reali (M7 via R² basso) |
| W4 | Agent teams paralleli | 3 agenti di verifica in parallelo = efficiente |
| W5 | CQR come follow-up costruttivo | Due livelli di fallimento = insight reale |
| W6 | Wilson confidence intervals | Previene overclaim su sample piccoli |
| W7 | SFI + BFP + R3 Judge | Architetturalmente solidi (v5.0 innovations) |
| W8 | Schema-validated gates | Prevengono compliance allucinata |
| W9 | 10 Leggi Immutabili | Fondamenta corrette |
| W10 | Salvagente Rule | Preserved serendipity da claims uccisi |

---

## 12. Specifiche Tecniche

### 12.1 Nuovi file nel skill

```
vibe-science-v5.5/
├── (tutto v5.0 invariato)
│
├── protocols/
│   ├── research-spine.md           # NEW: logbook auto-incrementale
│   ├── data-quality-gates.md       # NEW: DQ1-DQ4 specification
│   ├── ssot-autogen.md             # NEW: JSON→Markdown pipeline
│   ├── design-compliance.md        # NEW: DC0 gate
│   ├── data-dictionary.md          # NEW: DD0 gate
│   ├── r2-inline.md                # NEW: R2 INLINE mode
│   ├── literature-precheck.md      # NEW: L-1 gate
│   └── vibebrain-integration.md    # NEW: RECALL→RESEARCH→MEMORIZE
│
├── schemas/
│   ├── (9 esistenti invariati)
│   ├── data-quality-gate.schema.json    # NEW: DQ gate results
│   ├── spine-entry.schema.json          # NEW: logbook entry
│   └── finding-validation.schema.json   # NEW: finding check
│
├── gates/
│   └── gates.md    # UPDATED: aggiungere DQ1-DQ4, DC0, DD0, L-1
│
├── vibebrain/                       # NEW: MCP memory server
│   ├── server.py                    # FastMCP server (6 tools)
│   ├── core/
│   │   ├── config.py                # Configurazione
│   │   ├── db.py                    # ChromaDB wrapper
│   │   ├── observer.py              # Silent Research Observer
│   │   └── research_analyzer.py     # Analisi specifica ricerca
│   ├── requirements.txt             # chromadb, sentence-transformers, etc.
│   └── README.md                    # Setup instructions
│
└── scripts/
    ├── generate_documents.py        # NEW: JSON→Markdown
    └── sync_check.py                # NEW: Verifica coerenza
```

### 12.2 Nuovi gate (sommario)

| Gate | Dove | Quando | Severity |
|------|------|--------|----------|
| DQ1 | Post-feature extraction | Ogni pipeline | HALT se feature degenerate |
| DQ2 | Post-model training | Ogni pipeline | HALT se R²<0.05 o AUC<0.55 |
| DQ3 | Post-CP calibration | Ogni CP | WARN se coverage gap >10% |
| DQ4 | Post-finding | Ogni finding | HALT se numeri non matchano JSON |
| DC0 | Inizio fase | Ogni fase | WARN se design diverge |
| DD0 | Prima di usare colonna | Ogni dataset | HALT se colonna non documentata |
| L-1 | Prima di direzione | Ogni nuova RQ | HALT se prior work non verificato |

**Totale gate v5.5:** 27 (v5.0) + 7 (nuovi) = **34 gate**

### 12.3 Nuovi hook (aggiunta a `.claude/hooks.json`)

```json
{
  "hooks": {
    "PreAction": [
      {
        "name": "research-spine-log",
        "description": "Auto-log ogni azione significativa nel Research Spine",
        "trigger": "before:script_execution|data_load|model_train",
        "action": "append_spine_entry"
      }
    ],
    "PostAction": [
      {
        "name": "data-quality-gate",
        "description": "Esegui gate DQ dopo azioni critiche",
        "trigger": "after:feature_extraction|model_train|cp_calibration|finding_formulation",
        "action": "run_dq_gate"
      }
    ]
  }
}
```

### 12.4 Dipendenze aggiuntive

```
chromadb>=0.4.0
sentence-transformers>=2.2.0
tenacity>=8.0.0
```

### 12.5 Configurazione VibeBrAIn

```python
# vibebrain/core/config.py
VIBEBRAIN_DATA_DIR = Path("~/.vibe-science/memory").expanduser()
CHROMA_COLLECTION = "vibescience_memory"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
CONFLICT_DISTANCE_THRESHOLD = 0.5   # da myBrAIn
OBSERVER_INTERVAL = 120              # 2 minuti (vs 5 di myBrAIn)
```

---

## Appendice A: Mapping Completo Errore → Fix

| Errore | Root Cause | Fix v5.5 | Gate | Sottosistema |
|--------|-----------|---------|------|-------------|
| M1 | RC4 | Literature L-1 pre-check | L-1 | Enhanced (9.2) |
| M2 | RC7 | Design Compliance + Observer | DC0 | Observer (5) + Enhanced (9.4) |
| M3 | RC1 | DQ1 + DQ2 (assert pre-run) | DQ1, DQ2 | Gate Engine (7) |
| M4 | RC3 | Feature Validation in DQ1 | DQ1 | Gate Engine (7) + Enhanced (9.3) |
| M5 | RC3 | Cross-check mismatch in DQ1 | DQ1 | Gate Engine (7) |
| M6 | RC2 | SSOT + Auto-Gen + DQ4 | DQ4 | SSOT (8) |
| M7 | RC3 | DD0 + DQ1 (mean_mm=0 → HALT) | DD0, DQ1 | Gate Engine (7) + Enhanced (9.6) |
| M8 | RC1 | DQ2 (min guides per fold) | DQ2 | Gate Engine (7) |
| M9 | RC5 | R2 INLINE + DQ4 alternatives | DQ4 | Enhanced (9.1) |
| M10 | RC5 | R2 INLINE + Literature L-1 | L-1 | Enhanced (9.1, 9.2) |
| M11 | RC6 | Research Spine auto-init | — | Spine (6) |
| M12 | RC2 | SSOT naming + Observer | DQ4 | SSOT (8) + Observer (5) |

**Copertura: 12/12 errori coperti. ZERO blind spots residui.**

---

## Appendice B: Pattern Adottati da myBrAIn v1.1

| Pattern myBrAIn | Adattamento VibeBrAIn | Differenza chiave |
|-----------------|----------------------|-------------------|
| `initialize_workbase(path)` | `init_research_session(path, RQ)` | + Research Question come parametro |
| `store_insight(content, category)` | `store_memory(content, category)` | + Categorie specifiche ricerca (6 vs 3) |
| `recall_context(query)` | `recall_context(query)` | Identico |
| `critique_code(snippet)` | `validate_finding(text, json_key)` | Validazione scientifica, non code review |
| `audit_codebase()` | `audit_methodology()` | Drift metodologico, non architetturale |
| Deterministic workbase ID (SHA256) | Deterministic session ID (SHA256 path+RQ) | + RQ per sessioni diverse sullo stesso progetto |
| Conflict detection (cosine < 0.5) | Conflict detection (cosine < 0.5) | Identico |
| SilentObserver (code drift) | SilentResearchObserver (data/doc drift) | Diversi target: codice vs dati/documenti |
| RECALL→CODE→MEMORIZE | RECALL→RESEARCH→MEMORIZE | Stesso pattern, contesto diverso |
| Memory Import/Export | Session Export/Import | Per condivisione tra collaboratori |
| Admin Dashboard (Streamlit) | Non adottato in v5.5 | Eccessivo per CLI-based workflow |
| Docker support | Non adottato in v5.5 | Overhead non giustificato per singolo utente |

---

## Appendice C: Cosa NON Adottare (e Perche')

1. **Admin Dashboard Streamlit** — Vibe Science e' CLI-based (Claude Code). Una dashboard grafica aggiungerebbe complessita' senza valore. I dati sono gia' in file .md/.json ispezionabili.

2. **Docker deployment** — Overhead non giustificato per un singolo ricercatore. Il MCP server puo' girare come processo Python locale.

3. **Knowledge Graph visualization** — Utile per progetti software con centinaia di regole. Per la ricerca scientifica, il CLAIM-LEDGER.md e' sufficiente per tracciare le relazioni tra findings.

4. **Generic code critique** — `critique_code()` di myBrAIn confronta snippet contro regole salvate. Per la ricerca, la validazione e' piu' specifica (numeri, sample size, alternative explanations) e implementata meglio nei gate DQ1-DQ4.

---

## 13. Honest Limitations (cosa v5.5 NON puo' fare)

Seguendo il precedente di v5.0 (che documenta esplicitamente i limiti di SFI, BFP, R3):

| Sottosistema | Limitazione | Mitigazione |
|-------------|------------|------------|
| **VibeBrAIn** | La memoria semantica puo' NON recuperare il contesto rilevante se la query e' mal formulata. ChromaDB all-MiniLM-L6-v2 ha embedding a 384 dim — la similarita' coseno puo' perdere sfumature | store_memory con categorie specifiche + recall con query multiple. Threshold di conflitto 0.5 puo' essere troppo/poco sensibile — va calibrato empiricamente |
| **Silent Observer** | Controlla file modificati per timestamp, NON per contenuto semantico. Se un numero cambia nel JSON ma il file non viene riscritto, non lo rileva | Complementato da DQ4 (sync_check) che fa confronto semantico dei numeri |
| **Research Spine** | E' istruzione-based (il skill dice "logga"), non architecture-enforced come SVG/SFI. Un agent puo' saltare l'entry se il prompt non e' seguito | Hook di sistema (.claude/hooks.json) come enforcement. Ma hooks sono deterministici su trigger, non su contenuto — non possono verificare che l'entry sia completa |
| **DQ Gates** | Soglie hardcoded (mean_mm [2,8], R² > 0.05, etc.) sono specifiche per CRISPR off-target. Per altri domini servono soglie diverse | Gate DQ configurable via domain-specific config. La struttura e' general-purpose, le soglie no |
| **SSOT Auto-Gen** | Funziona solo per numeri estratti da JSON. Interpretazioni testuali (es. "il pattern suggerisce...") non sono verificabili automaticamente | DQ4 verifica numeri; R2 INLINE verifica interpretazioni |
| **R2 INLINE** | Usa Haiku (piu' economico, meno capace). Puo' perdere problemi sottili che Opus catturerebbe | INLINE e' primo filtro. FORCED (con Opus + SFI + BFP + R3) rimane per findings maggiori |

### La regola anti-theatre

Ogni innovazione v5.5 deve soddisfare questo test:

> **"Se un agent LLM deliberatamente volesse bypassare questa protezione, potrebbe farlo con un prompt cleverly worded?"**

| Sottosistema | Bypassabile via prompt? | Perche' |
|-------------|------------------------|---------|
| DQ Gates | **NO** — le soglie sono numeriche, non interpretabili | `mean_mm < 2` e' un fatto, non un'opinione |
| SSOT sync_check | **NO** — confronto numerico automatico | Un numero matcha o non matcha |
| VibeBrAIn recall | **SI** — l'agent puo' non chiamare recall_context() | **Mitigazione:** Hook pre-ACT che verifica recall chiamato |
| Research Spine | **SI** — l'agent puo' scrivere entry incomplete | **Mitigazione:** Schema validation su spine entry (v5.5 schema) |
| R2 INLINE | **Parzialmente** — in SOLO mode, INLINE e' auto-review | **Mitigazione:** R2 INLINE ha checklist fissa; ma in SOLO la qualita' dipende dal modello |
| Observer | **NO** — daemon indipendente, non controllato dall'agent | Scansiona filesystem, non dipende dal prompt |
| DD0 Gate | **SI** — l'agent puo' documentare male la colonna | **Mitigazione:** Verifica cross-check contro metadata del dataset (se disponibili) |

**Conclusione:** 3/7 sono fully architecture-enforced (DQ, sync_check, Observer). 4/7 dipendono dal comportamento dell'agent (VibeBrAIn recall, Spine, R2 INLINE, DD0). Per questi 4, hooks e schema validation sono mitigazioni parziali. Full enforcement richiederebbe un sistema esterno (come SFI testa R2) — candidato per v6.0.

---

## 14. Forensic Checklist v5.5 (seguendo il modello v5.0)

### A. Hard-Fail Criteria (TUTTI devono essere YES)

- **A1.** Tutti i 27 gate v5.0 invariati e funzionanti? (non rimossi, non indeboliti)
- **A2.** I 9 schema JSON v5.0 invariati e read-only?
- **A3.** Le 10 Leggi Immutabili invariate? (testo identico)
- **A4.** SFI + BFP + R3 + SVG invariati per FORCED reviews?
- **A5.** Circuit Breaker + DISPUTED + S5 Poison Pill invariati?
- **A6.** Permission Model (R2 non scrive CLAIM-LEDGER) invariato?

### B. Data Quality Gates (NUOVI)

- **B1.** DQ1 (Post-Extraction): almeno 5 checks implementati (zero_variance, mean_mismatch, mm_crosscheck, cfd_nonzero, leakage)?
- **B2.** DQ2 (Post-Training): almeno 3 checks (min_metric, no_dominance, fold_stability)?
- **B3.** DQ3 (Post-Calibration): almeno 3 checks (marginal_coverage, not_trivial, not_perfect)?
- **B4.** DQ4 (Post-Finding): json_match implementato con confronto numerico (non solo esistenza)?
- **B5.** DQ gates bloccano la pipeline? (HALT effettivo, non solo WARN)
- **B6.** DQ gate results loggati automaticamente in Research Spine?

### C. Research Spine (NUOVO)

- **C1.** SPINE.md auto-creato a session start? (non opzionale)
- **C2.** Almeno 10 tipi di azione triggerano una entry? (DATA_LOAD, FEATURE_EXTRACTION, MODEL_TRAIN, etc.)
- **C3.** Ogni entry ha: timestamp, tipo, inputs, outputs, gate_status?
- **C4.** Hook .claude/hooks.json verifica esistenza SPINE.md a session start?
- **C5.** Schema spine-entry.schema.json definito e validato?

### D. VibeBrAIn (NUOVO)

- **D1.** 6 MCP tools implementati (init, store, recall, validate, audit, export)?
- **D2.** ChromaDB persistente cross-sessione?
- **D3.** Conflict detection attivo (cosine threshold)?
- **D4.** 7 categorie di memoria definite (methodology, finding, assumption, decision, mistake, data_dictionary, gate_result)?
- **D5.** RECALL obbligatorio in fase OBSERVE? (hook o istruzione)?
- **D6.** Fallback graceful se ChromaDB non disponibile? (sistema funziona senza VibeBrAIn)

### E. SSOT + Auto-Generation (NUOVO)

- **E1.** generate_documents.py funzionante (JSON → Markdown)?
- **E2.** sync_check.py funzionante (verifica coerenza numeri)?
- **E3.** Nessun numero scritto manualmente in FINDINGS.md? (solo da template)
- **E4.** Interpretazioni testuali separate da numeri auto-generati?

### F. R2 INLINE (NUOVO)

- **F1.** INLINE definito come settimo modo R2 in reviewer2-ensemble.md?
- **F2.** Checklist 7 punti documentata?
- **F3.** INLINE non interferisce con FORCED (FORCED ha precedenza)?
- **F4.** BATCH rimane come fallback se INLINE disabilitato?

### G. Nuovi Gate (NUOVI)

- **G1.** DD0 (Data Dictionary) implementato?
- **G2.** DC0 (Design Compliance) implementato?
- **G3.** L-1 (Literature Pre-Check) implementato?
- **G4.** Totale gate = 34 (27 v5.0 + 7 nuovi)?

### H. Pre-Planned Items (dal roadmap v5.0)

- **H1.** R5.5-01: Calibration Log attivo?
- **H2.** R5.5-02: Golden Claims Test Suite con almeno 10 test cases?
- **H3.** R5.5-03: Cross-Model Audit Protocol documentato (anche se opzionale)?
- **H4.** R5.5-04: Anti-Gaming Metrics tracciate (false_kill_rate, review_diversity)?
- **H5.** R5.5-05: Dataset Hash (SHA-256) in spine entries e seed schema?

### I. Document Consistency (Doc-Lint)

- **I1.** Gate count = 34 ovunque (SKILL.md, gates.md, README.md)?
- **I2.** Schema count = 12 ovunque (9 v5.0 + 3 nuovi)?
- **I3.** Version = 5.5.0 in plugin.json?
- **I4.** Tutti i nuovi file elencati esistono?
- **I5.** Tutti i file esistenti sono elencati?
- **I6.** Nessun riferimento a "v5.0" dove dovrebbe dire "v5.5"?

### Scoring

- **Sezione A (Hard-Fail):** TUTTI devono passare. Qualsiasi fail = v5.5 NON SHIPPABLE
- **Sezioni B-H (Forensic):** Target >= 80%. < 60% = "theatre of rigor"
- **Sezione I (Doc-Lint):** TUTTI devono passare (bug, non opinioni)

---

## 15. Atomic Task Breakdown

Seguendo il modello v5.0 (24 task in 4 layer), v5.5 ha 28 task in 4 layer.

### Layer 0: Indipendenti (parallelizzabili)

| Task | Cosa | File | Dipende da |
|------|------|------|-----------|
| T-01 | Scrivere `protocols/research-spine.md` | NEW file | — |
| T-02 | Scrivere `protocols/data-quality-gates.md` (DQ1-DQ4 spec) | NEW file | — |
| T-03 | Scrivere `protocols/ssot-autogen.md` | NEW file | — |
| T-04 | Scrivere `protocols/design-compliance.md` (DC0 spec) | NEW file | — |
| T-05 | Scrivere `protocols/data-dictionary.md` (DD0 spec) | NEW file | — |
| T-06 | Scrivere `protocols/r2-inline.md` (INLINE mode spec) | NEW file | — |
| T-07 | Scrivere `protocols/literature-precheck.md` (L-1 spec) | NEW file | — |
| T-08 | Scrivere `protocols/vibebrain-integration.md` (RECALL→RESEARCH→MEMORIZE) | NEW file | — |
| T-09 | Scrivere `schemas/data-quality-gate.schema.json` | NEW file | — |
| T-10 | Scrivere `schemas/spine-entry.schema.json` | NEW file | — |
| T-11 | Scrivere `schemas/finding-validation.schema.json` | NEW file | — |
| T-12 | Scrivere VibeBrAIn MCP server (`vibebrain/server.py`) | NEW file | — |
| T-13 | Scrivere VibeBrAIn DB wrapper (`vibebrain/core/db.py`) | NEW file | — |
| T-14 | Scrivere VibeBrAIn config (`vibebrain/core/config.py`) | NEW file | — |
| T-15 | Scrivere Silent Research Observer (`vibebrain/core/observer.py`) | NEW file | — |
| T-16 | Scrivere Research Analyzer (`vibebrain/core/research_analyzer.py`) | NEW file | — |
| T-17 | Scrivere `scripts/generate_documents.py` (SSOT auto-gen) | NEW file | — |
| T-18 | Scrivere `scripts/sync_check.py` (SSOT verifica) | NEW file | — |
| T-19 | Scrivere Golden Claims Test Suite (12 test cases) | NEW file | — |

### Layer 1: Dipendono da Layer 0

| Task | Cosa | File | Dipende da |
|------|------|------|-----------|
| T-20 | Aggiornare `gates/gates.md` — aggiungere DQ1-DQ4, DC0, DD0, L-1 | MODIFY | T-02, T-04, T-05, T-07 |
| T-21 | Aggiornare `protocols/reviewer2-ensemble.md` — aggiungere INLINE mode | MODIFY | T-06 |
| T-22 | Aggiornare `protocols/loop-otae.md` — inserire punti v5.5 in OBSERVE, ACT, EVALUATE, CHECKPOINT, CRYSTALLIZE | MODIFY | T-01, T-02, T-08 |

### Layer 2: Dipendono da Layer 1

| Task | Cosa | File | Dipende da |
|------|------|------|-----------|
| T-23 | Aggiornare `SKILL.md` — version bump, nuove sezioni, dispatch table | MODIFY | T-20, T-21, T-22 |
| T-24 | Aggiornare `CLAUDE.md` — ruoli aggiornati con VibeBrAIn, Research Spine | MODIFY | T-22 |
| T-25 | Aggiornare `.claude/hooks.json` — nuovi hook per Spine e DQ gates | MODIFY | T-22 |
| T-26 | Aggiornare `.claude/settings.json` — MCP server VibeBrAIn | MODIFY | T-12 |

### Layer 3: Verifica

| Task | Cosa | File | Dipende da |
|------|------|------|-----------|
| T-27 | Eseguire Forensic Checklist v5.5 (Sez. 14) | VERIFY | T-23, T-24, T-25, T-26 |
| T-28 | Eseguire Golden Claims Test Suite (Sez. 3b, R5.5-02) | VERIFY | T-19, T-27 |

### Stima

- **Layer 0:** 19 task paralleli. ~2-3 sessioni di lavoro (agent teams).
- **Layer 1:** 3 task, parzialmente parallelizzabili. ~1 sessione.
- **Layer 2:** 4 task, parzialmente parallelizzabili. ~1 sessione.
- **Layer 3:** 2 task sequenziali. ~1 sessione.
- **Totale stimato:** 5-7 sessioni di lavoro con agent teams.
- **Nuove/modificate righe stimate:** ~2,500 (vs ~1,800 per v5.0)

---

## 16. Cosa Resta Invariato da v5.0 (elenco esplicito)

Per chiarezza, ecco cosa NON viene toccato:

### Protocolli invariati (13/21)

| File | Contenuto | Perche' invariato |
|------|-----------|------------------|
| `brainstorm-engine.md` | Phase 0 (8 step + Inversion + Collision + Tensions) | Funziona. L-1 si aggiunge come pre-step, non modifica il flusso |
| `tree-search.md` | 3 modi, 7 node types, best-first, pruning | Nessun problema nel CRISPR run legato al tree search |
| `experiment-manager.md` | 5 stadi (S1-S5) | Stadi funzionano. DC0 si aggiunge come pre-check, non modifica stadi |
| `auto-experiment.md` | Code gen → execution → metrics | DQ gates si inseriscono DOPO, non modificano il protocollo |
| `evidence-engine.md` | Claims, confidence, confounder harness | Formula v5.0 corretta. Calibration log (R5.5-01) e' aggiuntivo |
| `serendipity-engine.md` | Radar 0-20, cross-branch, sprints | Funziona bene (W5: CQR follow-up costruttivo) |
| `search-protocol.md` | Literature + DOI verification | L-1 si aggiunge PRIMA, non modifica search-protocol |
| `agent-teams.md` | TEAM mode architecture | Agent teams funziona (W4). Handoff piu' strutturati in v5.5 ma protocollo base invariato |
| `vlm-gate.md` | Visual validation | Non coinvolto |
| `writeup-engine.md` | IMRAD paper drafting | Non coinvolto |
| `analysis-orchestrator.md` | Data pipeline | DQ gates si aggiungono DOPO, non modificano orchestrator |
| `audit-reproducibility.md` | Decision log, run manifests | Research Spine complementa, non sostituisce |
| `circuit-breaker.md` | Deadlock prevention | Invariato |

### Protocolli MODIFICATI (3/21)

| File | Modifica | Sezione blueprint |
|------|----------|------------------|
| `loop-otae.md` | Inserire VibeBrAIn recall in OBSERVE, DQ gates in ACT/EVALUATE, spine in CRYSTALLIZE | Sez. 3c |
| `reviewer2-ensemble.md` | Aggiungere INLINE come 7° modo, BATCH diventa fallback | Sez. 9.1 |
| `knowledge-base.md` | Integrare con VibeBrAIn export per cross-sessione | Sez. 4.6 |

### Protocolli v5.0 invariati (5/5 v5.0-specific)

| File | Contenuto | Perche' invariato |
|------|-----------|------------------|
| `seeded-fault-injection.md` | SFI per FORCED reviews | Funziona. Nessun errore CRISPR legato a SFI |
| `judge-agent.md` | R3 meta-review | Funziona |
| `blind-first-pass.md` | BFP per anti-anchoring | Funziona |
| `schema-validation.md` | SVG per gate artifacts | Funziona. Nuovi schema seguono stesso pattern |
| `data-extraction.md` | AnnData schema, supplementary | Non coinvolto |

### Schema invariati (9/9)

Tutti i 9 schema v5.0 restano identici e read-only. 3 nuovi schema si aggiungono.

### Gate invariati (27/27)

Tutti i 27 gate v5.0 restano. 7 nuovi gate si aggiungono.

### Asset invariati

- `fault-taxonomy.yaml` — 16 faults, 8 categorie. Potenziale estensione con errori CRISPR come nuova categoria in futuro.
- `judge-rubric.yaml` — 6 dimensioni, 0-3. Invariato.
- Tutti gli altri asset invariati.

---

## Appendice D: Differenze Strutturali v5.0 → v5.5

| Aspetto | v5.0 IUDEX | v5.5 ORO |
|---------|-----------|---------|
| Gate totali | 27 (8 schema) | **34** (11 schema) |
| Schema totali | 9 | **12** |
| Protocolli totali | 21 | **29** (21 + 8 nuovi) |
| R2 modi | 6 | **7** (+INLINE) |
| File nel skill | ~40 | **~55** (+15 nuovi) |
| Dipendenze esterne | Nessuna | **chromadb, sentence-transformers, tenacity** (per VibeBrAIn) |
| MCP integration | Nessuna diretta | **VibeBrAIn MCP server** (6 tools) |
| Memoria cross-sessione | Solo file flat (.vibe-science/) | File flat + **vector store** (ChromaDB) |
| Logbook | Opzionale (LAW 10 dice "crystallize" ma non specifica formato) | **SPINE.md obbligatorio** con schema validation |
| Data validation | Nessuna automatica (gate G0 controlla solo dtype) | **DQ1-DQ4** con checks domain-specific |
| Document sync | Manuale | **Auto-generation + sync_check** |
| Background monitoring | Nessuno | **Silent Research Observer** (daemon 2 min) |
| CRISPR regression test | Nessuno | **12 Golden Claims** da errori reali |
| Confidence calibration | Formula solo (no empirical feedback) | **Calibration Log** per feedback empirico |

---

*Blueprint v5.5 ORO completato: 19 febbraio 2026*
*Versione: 2.0 (riscrittura con integrazione completa v5.0 architecture)*
*Input: POST_MORTEM.md (12 errori), myBrAIn v1.1 (6 pattern), Vibe Science v5.0 Blueprint + Forensic Checklist, SKILL.md completo (1278 righe)*
*Prossimo passo: implementazione Layer 0 (19 task paralleli con agent teams)*
