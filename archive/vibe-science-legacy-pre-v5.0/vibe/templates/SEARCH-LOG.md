# Search Log

Database queries run for this phase.

<!--
Track ALL queries to avoid duplication and enable reproducibility.
-->

## Queries

### Query 001

- **Date:** YYYY-MM-DD HH:MM
- **Database:** Scopus | PubMed | OpenAlex
- **Query string:**
  ```
  TITLE-ABS-KEY("term1") AND TITLE-ABS-KEY("term2")
  ```
- **Filters:** PUBYEAR > 2020, DOCTYPE(ar)
- **Sort:** citedby-count desc
- **Total results:** N
- **Relevant results:** M
- **Gap identified:** Yes/No - [description if yes]

**Papers flagged for deep dive:**

| # | DOI | Title | Reason |
|---|-----|-------|--------|
| 1 | 10.xxx | [Title] | [Why relevant] |
| 2 | 10.xxx | [Title] | [Why relevant] |

**Notes:** [Any observations about this search]

---

### Query 002

[Repeat structure]

---

## Summary Statistics

- Total queries run: X
- Total papers found: Y
- Papers deep-dived: Z
- Gaps identified: N

## Query Evolution

Track how search strategy evolved:

1. Started with: [initial query]
2. Refined to: [better query] because [reason]
3. Added: [new terms] after finding [paper]
