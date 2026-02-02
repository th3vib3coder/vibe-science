# vibe-science:search

Execute a literature search across databases.

## When to Use

- During `/vibe-science:loop` discovery phase
- Ad-hoc searches outside the main loop
- Exploring a tangent or serendipity lead

## Usage

```
/vibe-science:search [query]                    # Search all databases
/vibe-science:search --scopus [query]           # Scopus only
/vibe-science:search --pubmed [query]           # PubMed only
/vibe-science:search --openalex [query]         # OpenAlex only
/vibe-science:search --author [name]            # Author search
/vibe-science:search --citations [DOI]          # Papers citing this DOI
```

## Database Priority

1. **Scopus** - Most comprehensive, has citation data
2. **PubMed** - Best for biomedical, free API
3. **OpenAlex** - Open data, good for connections

## Search Syntax

### Scopus

```
# Basic
TITLE-ABS-KEY(term1 AND term2)

# Phrase
TITLE-ABS-KEY("exact phrase")

# Field-specific
TITLE("in title only") AND ABS("in abstract")

# Author
AU-ID(12345678)
AUTHLAST(Smith) AND AUTHFIRST(J)

# Date range
PUBYEAR > 2020
PUBYEAR = 2023

# Document type
DOCTYPE(ar)  # articles
DOCTYPE(re)  # reviews

# Combining
TITLE-ABS-KEY(CRISPR) AND TITLE-ABS-KEY("off-target") AND PUBYEAR > 2020

# Sort (via API parameter)
&sort=citedby-count   # Most cited
&sort=pubyear         # Most recent
```

### PubMed

```
# Basic
term1 AND term2

# Phrase
"exact phrase"

# Field-specific
term[Title]
term[Abstract]
term[MeSH Terms]

# Author
Smith J[Author]

# Date range
2020:2024[Publication Date]

# Article type
Review[Publication Type]

# Combining
CRISPR[Title] AND off-target[Title/Abstract] AND 2020:2024[pdat]
```

### OpenAlex

```
# Search works
https://api.openalex.org/works?search=term1 term2

# Filter
?filter=publication_year:2020-2024
?filter=cited_by_count:>100
?filter=author.id:A123456

# Combining
?search=CRISPR off-target&filter=publication_year:>2020

# Sorting
&sort=cited_by_count:desc
&sort=publication_date:desc
```

## Process

### Step 1: Parse Query

```markdown
Input: /vibe-science:search optimal transport CRISPR

Parsed:
- Terms: ["optimal transport", "CRISPR"]
- Databases: all
- Filters: none
- Sort: relevance
```

### Step 2: Execute Searches

```markdown
─────────────────────────────────────────
SCOPUS
─────────────────────────────────────────
Query: TITLE-ABS-KEY("optimal transport") AND TITLE-ABS-KEY(CRISPR)
Results: 57

Top 5 by citations:
1. [142 cites] Schiebinger 2019 - Optimal transport for scRNA-seq
2. [89 cites] Weinreb 2018 - Lineage tracing with OT
3. [45 cites] ...

─────────────────────────────────────────
PUBMED
─────────────────────────────────────────
Query: "optimal transport"[Title/Abstract] AND CRISPR[Title/Abstract]
Results: 23

Top 5 by date:
1. [2024] Recent paper...
2. [2023] ...

─────────────────────────────────────────
OPENALEX
─────────────────────────────────────────
Query: search=optimal transport CRISPR
Results: 89

Additional insights:
- Related concepts: cell fate, trajectory inference
- Key authors: Schiebinger G, Weinreb C
```

### Step 3: Deduplicate and Merge

```markdown
Combined results: 112 unique papers
Overlap: 57 appeared in multiple databases

Categorized:
- Methodology papers: 12
- Application papers: 78
- Reviews: 8
- Preprints: 14
```

### Step 4: Identify Gaps

```markdown
Gap analysis:
- "optimal transport" + CRISPR: 57 papers
- "unbalanced optimal transport" + CRISPR: 0 papers  ← POTENTIAL GAP
- "optimal transport" + "off-target": 3 papers ← SPARSE AREA
```

### Step 5: Log Results

```markdown
Logging to queries.log:

### Query 015 - 2025-01-30 16:45
- **Databases:** Scopus, PubMed, OpenAlex
- **Query:** "optimal transport" AND CRISPR
- **Results:** 112 unique
- **Gap identified:** YES - UOT + CRISPR = 0 results
- **Papers flagged:** Schiebinger 2019, Weinreb 2018
```

### Step 6: Output Summary

```markdown
─────────────────────────────────────────
SEARCH COMPLETE
─────────────────────────────────────────

Query: optimal transport CRISPR
Total unique papers: 112

**Key finding:** No papers on UNBALANCED optimal transport + CRISPR
This is a potential research gap.

**Recommended deep-dives:**
1. Schiebinger 2019 (DOI:10.1016/j.cell.2019.01.006) - OT methodology
2. Weinreb 2018 (DOI:10.1073/pnas.1714723115) - Lineage application

**Next:** Download abstracts for flagged papers?
```

## Author Search

```
/vibe-science:search --author Lazzarotto C

─────────────────────────────────────────
AUTHOR SEARCH: Lazzarotto C
─────────────────────────────────────────

Scopus Author ID: 37064674600
Name: Cicera R. Lazzarotto
Affiliation: St. Jude Children's Research Hospital
Documents: 39
Citations: 2,847
h-index: 18

Recent papers:
1. [2023] "Improved GUIDE-seq..." - DOI:xxx
2. [2022] "DISCOVER-Seq..." - DOI:xxx

Research areas:
- CRISPR off-target detection
- Genome editing safety
- Deep sequencing methods
```

## Citation Search

```
/vibe-science:search --citations 10.1038/nbt.3117

─────────────────────────────────────────
PAPERS CITING: Tsai 2015 (GUIDE-seq)
─────────────────────────────────────────

Total citations: 1,247

By year:
- 2024: 89
- 2023: 156
- 2022: 203
- ...

Highly cited citing papers:
1. [523 cites] Kleinstiver 2016 - High-fidelity Cas9
2. [312 cites] Slaymaker 2016 - eSpCas9

Papers mentioning "optimal transport" in citations: 0
→ Confirms gap: No one has applied OT to GUIDE-seq data
```

## Anti-Hallucination

For every search result:
- Store DOI/PMID
- Verify DOI resolves before citing
- Never fabricate paper titles or authors
- Mark confidence based on source verification

```markdown
Verification:
- DOI 10.1038/nbt.3117 → ✓ Resolves to Tsai 2015
- DOI 10.1016/j.cell.2019.01.006 → ✓ Resolves to Schiebinger 2019
```
