# API Configuration

Configuration for literature database APIs used by Vibe Science.

## Scopus (Elsevier)

### Requirements

- Institutional subscription (via university VPN)
- API key from https://dev.elsevier.com/

### Configuration

```yaml
scopus:
  api_key: "${SCOPUS_API_KEY}"  # Store in environment variable
  base_url: "https://api.elsevier.com/content"
  rate_limit: 9  # requests per second (institutional)

  endpoints:
    search: "/search/scopus"
    abstract: "/abstract/scopus_id/{scopus_id}"
    author: "/search/author"
    citations: "/search/scopus"
```

### Headers

```
X-ELS-APIKey: {api_key}
Accept: application/json
```

### Example Calls

```bash
# Search
curl -s -X GET \
  "https://api.elsevier.com/content/search/scopus?query=TITLE-ABS-KEY(CRISPR)&count=25&sort=citedby-count" \
  -H "X-ELS-APIKey: ${SCOPUS_API_KEY}" \
  -H "Accept: application/json"

# Abstract retrieval
curl -s -X GET \
  "https://api.elsevier.com/content/abstract/scopus_id/85060123456" \
  -H "X-ELS-APIKey: ${SCOPUS_API_KEY}" \
  -H "Accept: application/json"

# Author search
curl -s -X GET \
  "https://api.elsevier.com/content/search/author?query=authlast(Lazzarotto)+AND+authfirst(C)" \
  -H "X-ELS-APIKey: ${SCOPUS_API_KEY}"

# Citation search (papers citing a DOI)
curl -s -X GET \
  "https://api.elsevier.com/content/search/scopus?query=REF(10.1038/nbt.3117)&count=25" \
  -H "X-ELS-APIKey: ${SCOPUS_API_KEY}"
```

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| query | Search query | TITLE-ABS-KEY(term) |
| count | Results per page | 25 (max 200) |
| start | Offset | 0 |
| sort | Sort order | citedby-count, pubyear |
| field | Fields to return | dc:title,dc:creator,prism:doi |

### Response Fields

```json
{
  "search-results": {
    "opensearch:totalResults": "57",
    "entry": [
      {
        "dc:identifier": "SCOPUS_ID:85060123456",
        "dc:title": "Paper title",
        "dc:creator": "First Author",
        "prism:publicationName": "Journal Name",
        "prism:coverDate": "2024-01-15",
        "prism:doi": "10.1038/xxx",
        "citedby-count": "142",
        "affiliation": [...],
        "author": [...]
      }
    ]
  }
}
```

---

## PubMed (NCBI)

### Requirements

- No API key required for basic use
- Optional API key for higher rate limits: https://www.ncbi.nlm.nih.gov/account/

### Configuration

```yaml
pubmed:
  api_key: "${NCBI_API_KEY}"  # Optional
  base_url: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
  rate_limit: 3  # requests per second (10 with API key)

  endpoints:
    search: "/esearch.fcgi"
    fetch: "/efetch.fcgi"
    summary: "/esummary.fcgi"
```

### Example Calls

```bash
# Search (get PMIDs)
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=CRISPR[Title]+AND+off-target[Title/Abstract]&retmax=25&retmode=json"

# Fetch abstracts
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=25513782,28107648&retmode=xml"

# Document summary
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=25513782&retmode=json"

# With API key (higher rate limit)
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=GUIDE-seq&api_key=${NCBI_API_KEY}&retmode=json"
```

### Query Syntax

| Field | Syntax | Example |
|-------|--------|---------|
| Title | [Title] | CRISPR[Title] |
| Abstract | [Abstract] | off-target[Abstract] |
| Title/Abstract | [Title/Abstract] | CRISPR[Title/Abstract] |
| Author | [Author] | Smith J[Author] |
| MeSH | [MeSH Terms] | CRISPR-Cas Systems[MeSH] |
| Date | [pdat] | 2020:2024[pdat] |

### Response Fields (JSON)

```json
{
  "esearchresult": {
    "count": "1247",
    "idlist": ["25513782", "28107648", ...],
    "querytranslation": "CRISPR[Title] AND off-target[Title/Abstract]"
  }
}
```

---

## OpenAlex

### Requirements

- No API key required
- Optional: Register for polite pool (faster responses)

### Configuration

```yaml
openalex:
  base_url: "https://api.openalex.org"
  email: "your.email@institution.edu"  # For polite pool
  rate_limit: 10  # requests per second

  endpoints:
    works: "/works"
    authors: "/authors"
    concepts: "/concepts"
    institutions: "/institutions"
```

### Headers

```
mailto: your.email@institution.edu
```

### Example Calls

```bash
# Search works
curl -s "https://api.openalex.org/works?search=CRISPR%20off-target&per_page=25&mailto=you@email.com"

# Filter by year
curl -s "https://api.openalex.org/works?filter=publication_year:2020-2024,title.search:CRISPR"

# Get specific work by DOI
curl -s "https://api.openalex.org/works/doi:10.1038/nbt.3117"

# Author works
curl -s "https://api.openalex.org/works?filter=author.id:A123456789"

# Citing works
curl -s "https://api.openalex.org/works?filter=cites:W2741809807"

# Sort by citations
curl -s "https://api.openalex.org/works?search=optimal%20transport&sort=cited_by_count:desc"
```

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| search | Full-text search | search=CRISPR off-target |
| filter | Field filters | filter=publication_year:>2020 |
| sort | Sort order | sort=cited_by_count:desc |
| per_page | Results per page | per_page=50 (max 200) |
| page | Page number | page=2 |

### Response Fields

```json
{
  "meta": {
    "count": 89,
    "page": 1
  },
  "results": [
    {
      "id": "https://openalex.org/W2741809807",
      "doi": "https://doi.org/10.1038/nbt.3117",
      "title": "GUIDE-seq enables genome-wide profiling...",
      "publication_year": 2015,
      "cited_by_count": 1247,
      "authorships": [...],
      "concepts": [...],
      "open_access": {
        "is_oa": true,
        "oa_url": "https://..."
      }
    }
  ]
}
```

---

## Rate Limiting Strategy

To avoid hitting rate limits:

```python
# Pseudo-code for rate limiting
import time

class RateLimiter:
    def __init__(self, calls_per_second):
        self.interval = 1.0 / calls_per_second
        self.last_call = 0

    def wait(self):
        elapsed = time.time() - self.last_call
        if elapsed < self.interval:
            time.sleep(self.interval - elapsed)
        self.last_call = time.time()

# Usage
scopus_limiter = RateLimiter(9)  # 9 calls/sec for institutional
pubmed_limiter = RateLimiter(3)  # 3 calls/sec without key
openalex_limiter = RateLimiter(10)  # 10 calls/sec
```

## Error Handling

| API | Error | Action |
|-----|-------|--------|
| Scopus | 401 | Check API key, VPN connection |
| Scopus | 429 | Rate limited - wait 60s |
| PubMed | 429 | Rate limited - wait 10s |
| OpenAlex | 503 | Service busy - retry with backoff |
| All | Timeout | Retry up to 3 times |

## Environment Variables

Store sensitive credentials:

```bash
# .env (DO NOT COMMIT)
SCOPUS_API_KEY=3db28da606426ff5261092311e15bbd2
NCBI_API_KEY=your_ncbi_key_here

# Load in shell
export $(cat .env | xargs)
```

## Testing Connection

Quick test for each API:

```bash
# Test Scopus
curl -s "https://api.elsevier.com/content/search/scopus?query=test&count=1" \
  -H "X-ELS-APIKey: ${SCOPUS_API_KEY}" | jq '.["search-results"]["opensearch:totalResults"]'

# Test PubMed
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=test&retmax=1&retmode=json" \
  | jq '.esearchresult.count'

# Test OpenAlex
curl -s "https://api.openalex.org/works?search=test&per_page=1" \
  | jq '.meta.count'
```

Expected: All return a count > 0.
