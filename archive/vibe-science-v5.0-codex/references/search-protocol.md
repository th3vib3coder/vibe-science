# Literature Search Protocol

## Source Priority

Route through Skill Router to appropriate scientific tools:

1. **Scopus** (via API/web) — comprehensive, citation data, best for systematic coverage
2. **PubMed** → `pubmed-database` skill — biomedical focus, MeSH precision
3. **OpenAlex** → `openalex-database` skill — open scholarly data, connection discovery
4. **bioRxiv** → `biorxiv-database` skill — preprints (confidence penalty applies)
5. **web_search** — fallback only (lowest confidence tier)

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

**Query:** TITLE-ABS-KEY("unbalanced optimal transport") AND TITLE-ABS-KEY(biology OR genomics)
**Database:** Scopus | PubMed | OpenAlex | bioRxiv
**Tool used:** pubmed-database | openalex-database | biorxiv-database | web_search
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

### PubMed (via pubmed-database skill)
```
"CRISPR-Cas Systems"[MeSH] AND "Off-Target Effects"[MeSH]
(optimal transport[tiab]) AND ("2020"[PDAT] : "2025"[PDAT])
```

### OpenAlex (via openalex-database skill)
Use skill's search API with filters for concept, year, cited_by_count.

## Confidence by Source Type

| Source | E-component (Evidence Quality) |
|--------|-------------------------------|
| Peer-reviewed, high-impact (Nature, Science, Cell, etc.) | 1.0 |
| Peer-reviewed, standard journal | 0.8 |
| bioRxiv/medRxiv preprint, credible methodology | 0.6 |
| Preprint without replication, conference proceedings | 0.4 |
| Blog, technical report, single unreplicated observation | 0.2 |
| Training knowledge only, web_search without verification | 0.0 |

## Anti-Hallucination Rules (Absolute)

1. **NEVER** present information without a source
2. **ALWAYS** include DOI or PMID for every cited paper
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

### PMID Verification (for PubMed sources)
1. Attempt: `web_fetch("https://pubmed.ncbi.nlm.nih.gov/{pmid}/")` — must return 200
2. If fail: search PubMed by title as fallback
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
