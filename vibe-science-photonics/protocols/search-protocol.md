# Literature Search Protocol

## Source Priority

Route through Skill Router to appropriate MCP skills:

1. **IEEE Xplore** (primary) — comprehensive photonics/optoelectronics coverage, conference proceedings
2. **Optica Publishing** — optics and photonics journals (Optica, Photonics Research, JOSA, etc.)
3. **SPIE Digital Library** — proceedings, journals, device physics and optical engineering
4. **arXiv physics.optics** — preprints (confidence penalty applies)
5. **Scopus** (via API/web) — cross-disciplinary coverage, citation data
6. **Google Scholar** — broad fallback, citation tracking
7. **OpenAlex** → `openalex-database` skill — open scholarly data, connection discovery

**MCP Skills available:** `openalex-database`, `perplexity-search`, `literature-review`, `research-lookup`, `web_search`

> **Note:** Conference proceedings (OFC, ECOC, CLEO) are often more current than journal publications in photonics. Prioritize recent proceedings for cutting-edge device results.

> **Note:** Review paper detection: survey/review papers in photonics are high-value for landscape mapping. When found, use as starting point for citation network exploration.

## Search Deduplication

Before executing any search:

1. Check `queries.log` in the current RQ directory
2. If same query was run within 7 days: skip, reference previous results
3. If similar query (>80% keyword overlap): review previous results first, only run if gap identified
4. Maintain running dedup counter in STATE.md: `queries_run: N, queries_deduped: N`

## Search Log Entry

Every search must be logged:

```markdown
## Search Log Entry

**Query:** TITLE-ABS-KEY("silicon photonics") AND TITLE-ABS-KEY("microring resonator" OR "WDM")
**Database:** IEEE Xplore | Optica Publishing | SPIE Digital Library | arXiv | Scopus | Google Scholar
**MCP Skill used:** openalex-database | perplexity-search | literature-review | research-lookup | web_search
**Date:** YYYY-MM-DD
**Results:** N total
**Relevant:** N relevant
**New (not in source registry):** N new
**Gap identified:** Yes/No — [description]
**Dedup check:** [new query | similar to SLOG-xxx, different because...]

**Papers to deep-dive:**
1. DOI: 10.xxx — [reason for selection]
2. DOI: 10.xxx — [reason for selection]
```

## Query Syntax Quick Reference

### Scopus
```
TITLE-ABS-KEY(term1) AND TITLE-ABS-KEY(term2)
AU-ID(37064674600)
REFEEID(2-s2.0-85060123456)
PUBYEAR > 2020 &sort=citedby-count
```

### IEEE Xplore
```
("silicon photonics" OR "integrated optics") AND ("datacom" OR "co-packaged optics")
Filter: Conference (OFC, ECOC, CLEO) OR Journal (JLT, PTL)
```

### Optica Publishing / SPIE
```
Search by topic: "microring resonator" AND "thermal tuning"
Filter: Optica, Photonics Research, JOSA B, Optics Express
```

### arXiv (physics.optics, eess.SP)
```
Search: ti:"photonic integrated circuit" AND abs:"wavelength division multiplexing"
Sort: submittedDate descending
```

### OpenAlex (via openalex-database skill)
Use skill's search API with filters for concept, year, cited_by_count.

## Confidence by Source Type

| Source | E-component (Evidence Quality) |
|--------|-------------------------------|
| Peer-reviewed, high-impact (Nature Photonics, Optica, JLT, etc.) | 1.0 |
| Peer-reviewed, standard journal (Optics Express, PTL, etc.) | 0.8 |
| Top-tier conference proceedings (OFC, ECOC, CLEO) — peer-reviewed | 0.7 |
| arXiv preprint (physics.optics, eess.SP), credible methodology | 0.6 |
| Workshop/symposium proceedings, preprint without replication | 0.4 |
| Blog, technical report, single unreplicated observation | 0.2 |
| Training knowledge only, web_search without verification | 0.0 |

## Anti-Hallucination Rules (Absolute)

1. **NEVER** present information without a source
2. **ALWAYS** include DOI for every cited paper (PMID where applicable)
3. **QUOTE** exact text — do not paraphrase factual claims
4. **VERIFY** DOIs are accessible (web_fetch on doi.org/DOI)
5. **MARK** confidence using quantitative formula (see evidence-engine.md)
6. Training knowledge only → E=0.0, flag with ⚠️
7. Register every claim in CLAIM-LEDGER.md upon discovery

## Citation Verification (Before Claim Promotion)

Before any claim can cite a paper as evidence for Gate D1 promotion, the citation MUST be verified.

### DOI Resolution Check
1. Attempt: `web_fetch("https://doi.org/{doi}")` — must return HTTP 200
2. If fail: attempt `web_fetch("https://api.crossref.org/works/{doi}")` as fallback
3. If both fail: **citation is UNVERIFIED**
   - Evidence Quality (E component) for this citation = 0.0
   - Claim confidence capped at 0.20 by evidence floor gate
   - Log: "DOI {doi} unresolvable — citation removed from evidence list"
4. If success: record verification in CLAIM-LEDGER.md evidence field:
   - `[DOI:10.xxx — VERIFIED YYYY-MM-DD]`

### IEEE/Optica Verification (for conference proceedings)
1. Attempt: `web_fetch("https://ieeexplore.ieee.org/document/{doc_id}")` — must return 200
2. If fail: search IEEE Xplore by title as fallback
3. Same consequences as DOI failure if unresolvable

### When to Run
- BEFORE Gate D1 (Claim Promotion) — for every DOI/PMID in the claim's evidence list
- BEFORE Gate L0 (Source Validity) — for every source in the literature review
- BEFORE R2 FORCED review — R2 independently verifies citations (Step 0 of invocation)

### Batch Verification
When verifying multiple citations:
- Run all DOI checks in parallel (no dependencies between citations)
- Log results in `queries.log` with format: `CITE-CHECK | DOI | STATUS | DATE`
- Failed citations → immediately flag in PROGRESS.md

## Search Iteration Strategy

When few results:
1. Broaden terms, use synonyms
2. Decompose complex query into sub-queries
3. Snowball: references of found papers
4. Reverse snowball: who cites key papers
5. Cross-database: same query on different database
6. Author trail: key authors' full publication lists

When too many results:
1. Add constraints: date, journal, methodology
2. Sort by citations
3. Find recent review first, chase its references

## Cross-Paper Contradiction Detection

When two papers report conflicting results for the same device or configuration, flag immediately:
1. Log both papers with DOIs in the search log
2. Note the specific contradiction (e.g., reported loss values, bandwidth claims, fabrication tolerances)
3. Tag as `CONTRADICTION_DETECTED` in the search log
4. Prioritize for follow-up — contradictions often indicate measurement methodology differences, different operating conditions, or evolving fabrication processes

## Expert-Guided Snowball Search

When the domain expert cites a paper or author, use as seed for citation network exploration:
1. Retrieve the cited paper's full reference list
2. Identify all papers citing the seed paper (forward snowball)
3. Check the cited author's full publication list for related work
4. Use the expert-cited seed as a high-confidence anchor — the expert's domain knowledge makes these seeds more reliable than algorithmic discovery
