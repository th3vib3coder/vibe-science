# Vibe Science - Project Memory

**Questo file è la memoria del progetto. Leggilo SEMPRE prima di lavorare su Vibe Science.**

---

## Origine del Progetto

### L'Idea Iniziale dell'Utente

L'utente voleva creare una skill per Claude che facesse **ricerca scientifica in modalità "serendipity"**:

> "Voglio che Claude faccia ricerca come un ricercatore vero - loop infiniti fino alla scoperta, tracking rigoroso, review avversariale, e soprattutto: biologia teorica + validazione con dati. Senza conferme numeriche, si lascia perdere."

### Principio Core

**"Biologia teorica + validazione con dati. Senza conferme numeriche, si lascia perdere."**

Questo significa:
- Non basta avere un'idea teorica interessante
- Servono DATI per validarla
- NO DATA = NO GO (kill condition)

### Ispirazione

L'utente ha studiato diversi framework prima:
- Ralph (agentic framework)
- GSD (get shit done)
- BMAD (build measure analyze decide)
- Codex compaction strategy
- K-Dense repos

Da questi ha estratto pattern utili, specialmente:
- Compaction per gestire contesto lungo
- State crystallization
- Adversarial review

---

## Architettura Completa (Riferimento Futuro)

### Cosa Abbiamo Progettato

```
vibe-science/
├── SKILL.md                    # Main skill definition
├── README.md                   # Documentation
├── manifest.json               # Skill metadata (v1.1.0)
├── PROJECT-MEMORY.md           # QUESTO FILE - memoria del progetto
│
├── prompts/
│   └── researcher.md           # Researcher persona
│
├── templates/                  # 9 templates
│   ├── STATE.md               # Current state (max 100 lines)
│   ├── PROGRESS.md            # Append-only log
│   ├── SERENDIPITY.md         # Unexpected discoveries
│   ├── RQ.md                  # Research question
│   ├── FINDING.md             # Individual finding
│   ├── CONCLUSION.md          # RQ conclusion
│   ├── REVIEWER2-SESSION.md   # Review session
│   ├── SEARCH-LOG.md          # Search queries
│   └── SUPPLEMENTARY-LOG.md   # Supplementary materials
│
├── commands/                   # 4 commands
│   ├── init.md                # Initialize session
│   ├── loop.md                # Execute cycle
│   ├── reviewer2.md           # Invoke review
│   └── search.md              # Literature search
│
├── config/                     # Configuration
│   ├── apis.md                # Scopus/PubMed/OpenAlex
│   ├── apis-wos.md            # Web of Science (da completare)
│   ├── apis-reaxys.md         # Reaxys (da completare)
│   ├── apis-jcr.md            # JCR (da completare)
│   ├── apis-espacenet.md      # Patents (da creare)
│   ├── apis-torrossa.md       # Italian books (da creare)
│   ├── decision-framework.md  # Priority order
│   ├── architecture.md        # Hybrid agent rationale
│   ├── deviation-rules.md     # When to deviate
│   ├── compaction.md          # Context management
│   └── knowledge-base.md      # Bagaglio scientifico
│
├── examples/
│   └── uot-crispr-session.md  # Complete walkthrough
│
└── mcp-servers/
    └── ARCHITECTURE.md        # MCP servers design (9 servers)
```

### I 9 MCP Servers Progettati

| Server | API Disponibile | Priorità | Note |
|--------|-----------------|----------|------|
| Scopus | ✅ Sì (testata, key funzionante) | P1 | Core |
| PubMed | ✅ Sì (pubblica) | P1 | Core |
| OpenAlex | ✅ Sì (pubblica) | P1 | Core |
| NotebookLM | ✅ Sì (MCP esistenti) | P1 | Usa notebooklm-mcp-cli |
| Web of Science | ⚠️ Richiede key istituzionale | P2 | Verificare con UNIPI |
| JCR | ⚠️ Via WoS API | P2 | Dipende da WoS |
| Esp@cenet | ✅ Sì (Open Patent Services) | P3 | Patents |
| Reaxys | ❌ NO REST API | P3 | Solo web, problematico |
| Torrossa | ❌ Probabilmente no API | P3 | Solo web, problematico |

### Knowledge Base (Bagaglio Scientifico)

L'idea dell'utente era che il ricercatore accumuli conoscenza riutilizzabile:

```
.vibe-science/KNOWLEDGE/
├── library.json      # Index
├── methods/          # Metodologie riutilizzabili
├── sources/          # Papers, authors, datasets
├── patterns/         # Pattern cross-domain
└── notebooks/        # NotebookLM registry
```

Questo permette di:
- Non ricominciare da zero ogni RQ
- Riutilizzare paper già analizzati
- Seguire autori chiave
- Applicare pattern scoperti

### NotebookLM Integration

4 progetti analizzati in `D:\project_agents\nuove_skill\servers_mcp`:

1. **notebooklm-mcp-cli-main** - IL MIGLIORE
   - 31 MCP tools
   - Research workflow completo
   - Studio content generation
   - L'utente conferma che funziona

2. **notebooklm-mcp-main** (TypeScript)
   - NotebookLibrary class
   - Tool profiles

3. **notebooklm-skill-master** (Python)
   - Claude Code Skill
   - Stateless

4. **NotebookLM-MCP2-main** (Python FastMCP)
   - Alpha, basic

**Decisione:** Usare `notebooklm-mcp-cli-main` per RAG source-grounded.

---

## Decisioni Architetturali

### Perché Hybrid Agent (non Multi-Agent puro)

**Problema:** Multi-agent puro perde contesto tra agenti.

**Soluzione:**
- **Researcher** = agente principale, mantiene continuità
- **Reviewer 2** = subagent spawned on demand, fresh eyes

Il Researcher mantiene lo stato. Reviewer 2 viene chiamato solo per review, non ha bisogno di tutta la storia.

### Perché Compaction Gerarchica

**Problema:** Sessioni lunghe esauriscono il contesto.

**Soluzione:** 4 livelli
1. Working Memory (in context)
2. STATE.md (max 100 lines)
3. PROGRESS.md (append-only, esterno)
4. FINDINGS.md (self-contained)

Compatta ogni 5 cicli o su trigger.

### Perché Decision Priority: Data > Impact > Feasibility > Speed

L'utente ha insistito: **NO DATA = NO GO**.

Non importa quanto sia bella l'idea - senza dati disponibili, si abbandona.

Ordine:
1. **Data Availability** - GATE (must pass)
2. **Impact Potential** - filter
3. **Technical Feasibility** - filter
4. **Publication Speed** - nice to have

### Perché Deviation Rules a 5 Categorie

Per permettere autonomia tattica ma richiedere input umano per decisioni strategiche:

1. AUTO-FIX - typo, retry, format
2. ADD - expand scope slightly
3. ACCUMULATE - log, don't act
4. STOP AND DECIDE - strategic change
5. STOP IMMEDIATELY - red flags

---

## Discussione Critica (30 Gennaio 2026)

### Il Mio Feedback Onesto

Ho detto all'utente che stavamo costruendo una "cattedrale prima di testare la capanna":

> "Abbiamo progettato 9 templates, 4 commands, 6 config files, 9 MCP servers, Knowledge Base con 5 tipi di contenuto... Questo è un progetto da team per mesi."

### Rischi Identificati

1. **MCP irrealistici:** Reaxys e Torrossa NON hanno REST API
2. **Feature creep:** Ogni feature moltiplica complessità
3. **Non testato:** Non sappiamo se il loop base funziona

### Risposta dell'Utente

> "Facciamo dei test su una architettura semplificata e poi evolviamo MA RICORDATI DI SALVARE TUTTA LA DISCUSSIONE"

L'utente ha accettato l'approccio MVP ma vuole:
- Conservare tutto il design per riferimento futuro
- Poter riprendere senza rispiegare
- Implementare MCP solo per servizi con API reali

---

## Piano di Evoluzione

### Fase 1: MVP (Ora)

```
vibe-science/
├── SKILL.md (semplificato)
├── templates/STATE.md
├── config/apis.md (Scopus/PubMed/OpenAlex)
└── prompts/researcher.md
```

**Test:** Una RQ reale (es. UOT+CRISPR), 5-10 cicli, valutare output.

### Fase 2: Se MVP Funziona

- Aggiungere Knowledge Base
- Integrare NotebookLM (usando notebooklm-mcp-cli)
- Aggiungere templates necessari

### Fase 3: MCP Servers (Solo API Reali)

Priorità:
1. Scopus MCP (API testata)
2. PubMed MCP (API pubblica)
3. OpenAlex MCP (API pubblica)
4. Esp@cenet MCP (API pubblica)

**NON FARE:** Reaxys MCP, Torrossa MCP (no API).

### Fase 4: Unified Interface

Solo se servono davvero:
- Academic unified MCP
- Cross-database deduplication

---

## Credenziali e Test

### Scopus API

```
API Key: 3db28da606426ff5261092311e15bbd2
Status: TESTATA E FUNZIONANTE
```

### UNIPI VPN

Permette accesso a:
- Web of Science
- Scopus
- Reaxys
- JCR
- Torrossa
- Esp@cenet

---

## Idee Dell'Utente Da Ricordare

1. **"Bagaglio scientifico"** - Il ricercatore deve accumulare conoscenza, non ricominciare da zero

2. **"Serendipity mode"** - Loop infiniti, seguire le scoperte inattese

3. **"Reviewer 2"** - Review avversariale, non accettare findings senza challenge

4. **"NO DATA = NO GO"** - Principio non negoziabile

5. **"Server MCP locali per più potenza"** - Idea di avere MCP per ogni database

6. **Combinare soluzioni NotebookLM** - Prendere il meglio dai 4 progetti analizzati

---

## Come Riprendere il Lavoro

Quando riprendi questo progetto:

1. **LEGGI QUESTO FILE PRIMA DI TUTTO**

2. Verifica lo stato attuale:
   - Quali file esistono in `vibe-science/`?
   - Siamo in fase MVP o evoluzione?

3. Se l'utente chiede di continuare, hai tutto il contesto qui.

4. Se l'utente vuole aggiungere feature, verifica:
   - È in linea con la visione?
   - Ha API disponibili?
   - È necessaria ora o può aspettare?

5. **NON CHIEDERE** "cosa volevamo fare?" - è scritto qui.

---

## Files Chiave da Consultare

| File | Contenuto |
|------|-----------|
| `PROJECT-MEMORY.md` | QUESTO FILE - memoria completa |
| `SKILL.md` | Definizione skill principale |
| `manifest.json` | Metadata e struttura |
| `config/knowledge-base.md` | Design del bagaglio scientifico |
| `mcp-servers/ARCHITECTURE.md` | Design completo dei 9 MCP |
| `prompts/researcher.md` | Persona del ricercatore |
| `config/decision-framework.md` | Priorità decisioni |
| `examples/uot-crispr-session.md` | Esempio completo |

---

**Ultimo aggiornamento:** 2026-01-30
**Versione skill:** 1.1.0
**Stato:** Design completo, MVP da testare
