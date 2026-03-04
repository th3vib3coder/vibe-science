---
description: Execute a literature search across Scopus, PubMed, and OpenAlex databases
argument-hint: "--scopus | --pubmed | --openalex | --author | --citations"
allowed-tools: Read, Write, Edit, WebSearch, WebFetch, Glob, Grep
model: sonnet
---

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

Run searches across all selected databases.

### Step 3: Deduplicate and Merge

Combine results, remove duplicates, categorize.

### Step 4: Identify Gaps

```markdown
Gap analysis:
- "optimal transport" + CRISPR: 57 papers
- "unbalanced optimal transport" + CRISPR: 0 papers  ← POTENTIAL GAP
- "optimal transport" + "off-target": 3 papers ← SPARSE AREA
```

### Step 5: Log Results

Log to `queries.log` and `PROGRESS.md`.

### Step 6: Output Summary

Report total results, key findings, identified gaps, recommended deep-dives.

## Anti-Hallucination

For every search result:
- Store DOI/PMID
- Verify DOI resolves before citing
- Never fabricate paper titles or authors
- Mark confidence based on source verification
