# Vibe Science MCP Servers Architecture

Local MCP servers for academic database access via university VPN.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VIBE SCIENCE                                     │
│                     (Claude Code Skill)                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Researcher │  │  Reviewer 2  │  │   Knowledge  │                  │
│  │    Agent     │  │   Subagent   │  │     Base     │                  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘                  │
│         │                                                               │
│         │ MCP Protocol                                                  │
│         ▼                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                     MCP SERVER LAYER                              │ │
│  │                                                                    │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │
│  │  │ Scopus  │ │   WoS   │ │ PubMed  │ │ Reaxys  │ │Espacenet│   │ │
│  │  │   MCP   │ │   MCP   │ │   MCP   │ │   MCP   │ │   MCP   │   │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │ │
│  │       │           │           │           │           │         │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │ │
│  │  │OpenAlex │ │   JCR   │ │Torrossa │ │NotebookLM│ │ (future)│   │ │
│  │  │   MCP   │ │   MCP   │ │   MCP   │ │   MCP   │ │   ...   │   │ │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └─────────┘   │ │
│  │       │           │           │           │                     │ │
│  └───────┼───────────┼───────────┼───────────┼─────────────────────┘ │
│          │           │           │           │                       │
└──────────┼───────────┼───────────┼───────────┼───────────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌──────────────────────────────────────────────────┐
    │                 UNIVERSITY VPN                    │
    │              (UNIPI Institutional Access)         │
    └──────────────────────────────────────────────────┘
           │           │           │           │
           ▼           ▼           ▼           ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Elsevier│  │ Clarivate│  │  NCBI   │  │ Google  │
    │   API   │  │   API   │  │   API   │  │NotebookLM│
    └─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Database Availability via UNIPI VPN

| Database | Publisher | Access Type | API Available | Notes |
|----------|-----------|-------------|---------------|-------|
| **Scopus** | Elsevier | VPN | Yes (API key) | Literature search, citations |
| **Web of Science** | Clarivate | VPN | Yes (API key) | Literature search, impact |
| **PubMed** | NCBI | Public | Yes (free) | Biomedical literature |
| **OpenAlex** | OurResearch | Public | Yes (free) | Open scholarly data |
| **Reaxys** | Elsevier | VPN | Limited | Chemistry reactions, compounds |
| **Journal Citation Reports** | Clarivate | VPN | Limited | Journal impact factors |
| **Esp@cenet** | EPO | Public | Yes (free) | Patents search |
| **Torrossa** | Casalini | VPN | Limited | Italian/European books |
| **NotebookLM** | Google | Free | Via browser | RAG for uploaded docs |

## MCP Server Design

Each MCP server follows a common pattern inspired by `notebooklm-mcp-cli`:

### Common Structure

```
vibe-science-mcp-{database}/
├── pyproject.toml
├── README.md
├── src/
│   └── vibe_{database}_mcp/
│       ├── __init__.py
│       ├── server.py           # MCP server entry point
│       ├── client.py           # API client
│       ├── auth.py             # Authentication handling
│       ├── cache.py            # Local caching
│       ├── models.py           # Data models
│       └── tools/
│           ├── __init__.py
│           ├── search.py       # Search tools
│           ├── retrieve.py     # Document retrieval
│           └── citations.py    # Citation tools
└── tests/
```

### Common MCP Tools Pattern

Every database MCP provides these core tools:

```python
# Core tools (all databases)
@tool
def search(query: str, filters: dict = None, limit: int = 25) -> SearchResults:
    """Search the database with query and optional filters."""

@tool
def get_document(id: str) -> Document:
    """Retrieve full document/record by ID."""

@tool
def get_citations(id: str, direction: str = "cited_by") -> Citations:
    """Get citing or cited papers."""

@tool
def export_results(results: list, format: str = "bibtex") -> str:
    """Export search results to standard format."""

# Database-specific tools added as needed
```

## Individual MCP Server Specifications

### 1. Scopus MCP Server

**Purpose:** Literature search, citation analysis, author profiles

**Tools:**
```python
# Search
scopus_search(query: str, field: str = "all", year_range: tuple = None)
scopus_search_author(name: str, affiliation: str = None)

# Retrieve
scopus_get_abstract(scopus_id: str) -> Abstract
scopus_get_author(author_id: str) -> AuthorProfile
scopus_get_affiliation(affil_id: str) -> Affiliation

# Citations
scopus_get_citations(scopus_id: str, limit: int = 100) -> list[Citation]
scopus_get_references(scopus_id: str) -> list[Reference]

# Export
scopus_export_bibtex(scopus_ids: list[str]) -> str
```

**Authentication:** API key via environment variable + VPN

### 2. Web of Science MCP Server

**Purpose:** Literature search, impact metrics, citation networks

**Tools:**
```python
# Search
wos_search(query: str, database: str = "WOS", timespan: str = None)
wos_search_cited_references(source_id: str)

# Retrieve
wos_get_record(ut: str) -> Record  # UT = Web of Science ID
wos_get_citing_articles(ut: str, limit: int = 100)

# Metrics
wos_get_journal_impact(journal: str, year: int = None) -> JournalMetrics
wos_get_h_index(author_id: str) -> int

# Export
wos_export_results(uts: list[str], format: str = "bibtex") -> str
```

**Authentication:** API key + VPN

### 3. PubMed MCP Server

**Purpose:** Biomedical literature, MeSH terms, clinical trials

**Tools:**
```python
# Search
pubmed_search(query: str, filters: dict = None, retmax: int = 100)
pubmed_search_mesh(mesh_term: str, subheadings: list = None)

# Retrieve
pubmed_get_abstract(pmid: str) -> Abstract
pubmed_get_full_text(pmid: str) -> FullText  # If PMC available

# Related
pubmed_get_related(pmid: str, limit: int = 20) -> list[RelatedArticle]
pubmed_get_cited_by(pmid: str) -> list[Citation]

# Clinical
pubmed_search_clinical_trials(condition: str, intervention: str = None)
```

**Authentication:** Optional API key for higher rate limits

### 4. OpenAlex MCP Server

**Purpose:** Open scholarly data, concepts, institutions

**Tools:**
```python
# Search
openalex_search_works(query: str, filters: dict = None)
openalex_search_authors(query: str)
openalex_search_concepts(query: str)

# Retrieve
openalex_get_work(openalex_id: str) -> Work
openalex_get_author(author_id: str) -> Author
openalex_get_institution(institution_id: str) -> Institution

# Analysis
openalex_get_citing_works(work_id: str, limit: int = 100)
openalex_get_related_concepts(concept_id: str)

# Trends
openalex_get_concept_trends(concept_id: str, years: int = 10)
```

**Authentication:** Email for polite pool (higher rate limits)

### 5. Reaxys MCP Server

**Purpose:** Chemical reactions, compounds, synthesis routes

**Tools:**
```python
# Search
reaxys_search_reactions(reactants: list, products: list = None)
reaxys_search_compounds(structure: str, type: str = "smiles")
reaxys_search_substances(name: str)

# Retrieve
reaxys_get_reaction(rxn_id: str) -> Reaction
reaxys_get_compound(compound_id: str) -> Compound
reaxys_get_synthesis_route(target: str) -> SynthesisRoute

# Properties
reaxys_get_properties(compound_id: str) -> Properties
```

**Authentication:** VPN required, session-based

### 6. Journal Citation Reports MCP Server

**Purpose:** Journal metrics, impact factors, rankings

**Tools:**
```python
# Search
jcr_search_journals(query: str, category: str = None)
jcr_get_top_journals(category: str, year: int = None, limit: int = 50)

# Retrieve
jcr_get_journal_profile(issn: str) -> JournalProfile
jcr_get_impact_factor(issn: str, year: int = None) -> float

# Trends
jcr_get_impact_trend(issn: str, years: int = 5) -> list[YearlyIF]
jcr_get_category_ranking(issn: str) -> CategoryRanking
```

**Authentication:** VPN required

### 7. Esp@cenet MCP Server

**Purpose:** Patent search, prior art, inventor profiles

**Tools:**
```python
# Search
espacenet_search(query: str, cpc: str = None, date_range: tuple = None)
espacenet_search_family(publication_number: str)
espacenet_search_inventor(name: str, country: str = None)

# Retrieve
espacenet_get_patent(publication_number: str) -> Patent
espacenet_get_claims(publication_number: str) -> list[Claim]
espacenet_get_description(publication_number: str) -> Description

# Citations
espacenet_get_citing_patents(publication_number: str)
espacenet_get_cited_patents(publication_number: str)
```

**Authentication:** Free API (Open Patent Services)

### 8. Torrossa MCP Server

**Purpose:** Italian/European academic books and journals

**Tools:**
```python
# Search
torrossa_search(query: str, type: str = "all")  # book, article, chapter
torrossa_search_publisher(publisher: str)
torrossa_search_series(series: str)

# Retrieve
torrossa_get_record(record_id: str) -> Record
torrossa_get_toc(book_id: str) -> TableOfContents

# Access
torrossa_check_access(record_id: str) -> AccessInfo
torrossa_get_pdf_link(record_id: str) -> str  # If accessible
```

**Authentication:** VPN required

### 9. NotebookLM MCP Server

**Purpose:** RAG for uploaded documents, source-grounded queries

**Using existing `notebooklm-mcp-cli`:**
```python
# Already available tools
notebook_list()
notebook_create(title: str)
notebook_query(notebook_id: str, query: str)
source_add(notebook_id: str, source_type: str, ...)
research_start(query: str, notebook_id: str)
```

## Unified Interface Layer

To simplify usage, create a unified "Academic MCP" that routes to specific databases:

```python
# vibe-science-academic-mcp

@tool
def academic_search(
    query: str,
    databases: list[str] = ["scopus", "wos", "pubmed", "openalex"],
    filters: dict = None,
    limit: int = 25
) -> UnifiedResults:
    """Search across multiple academic databases."""

@tool
def academic_get_document(
    id: str,
    database: str  # Auto-detected from ID format if possible
) -> Document:
    """Get document from any database by ID."""

@tool
def academic_get_citations(
    id: str,
    databases: list[str] = None  # Search citations across databases
) -> CrossDatabaseCitations:
    """Get citations from multiple databases."""

@tool
def academic_verify_claim(
    claim: str,
    notebooklm_notebook: str = None
) -> VerificationResult:
    """Verify a claim against literature and NotebookLM."""
```

## Integration with Vibe Science

### In SKILL.md

```markdown
## MCP Server Integration

Vibe Science uses local MCP servers for academic database access.

### Available MCP Servers

| Server | Tools | Use Case |
|--------|-------|----------|
| vibe-scopus-mcp | scopus_* | Literature search, citations |
| vibe-wos-mcp | wos_* | Impact metrics, WoS search |
| vibe-pubmed-mcp | pubmed_* | Biomedical literature |
| vibe-openalex-mcp | openalex_* | Open scholarly data |
| vibe-reaxys-mcp | reaxys_* | Chemistry research |
| vibe-jcr-mcp | jcr_* | Journal metrics |
| vibe-espacenet-mcp | espacenet_* | Patent search |
| notebooklm-mcp | notebook_* | RAG queries |
| vibe-academic-mcp | academic_* | Unified interface |

### Usage in Loop

During SEARCH phase:
```python
# Multi-database search
results = academic_search(
    query="unbalanced optimal transport CRISPR",
    databases=["scopus", "wos", "pubmed"]
)

# Verify finding with NotebookLM
verification = academic_verify_claim(
    claim="GUIDE-seq produces count data suitable for OT",
    notebooklm_notebook="crispr-research"
)
```
```

### MCP Configuration

In Claude Code settings:

```json
{
  "mcpServers": {
    "vibe-scopus": {
      "command": "uv",
      "args": ["run", "vibe-scopus-mcp"],
      "env": {
        "SCOPUS_API_KEY": "${SCOPUS_API_KEY}"
      }
    },
    "vibe-wos": {
      "command": "uv",
      "args": ["run", "vibe-wos-mcp"],
      "env": {
        "WOS_API_KEY": "${WOS_API_KEY}"
      }
    },
    "vibe-pubmed": {
      "command": "uv",
      "args": ["run", "vibe-pubmed-mcp"]
    },
    "vibe-openalex": {
      "command": "uv",
      "args": ["run", "vibe-openalex-mcp"]
    },
    "notebooklm-mcp": {
      "command": "notebooklm-mcp"
    }
  }
}
```

## Caching Strategy

Each MCP server implements local caching:

```python
class CacheManager:
    """Local cache for API responses."""

    def __init__(self, cache_dir: Path, ttl: int = 86400):
        self.cache_dir = cache_dir
        self.ttl = ttl  # Default 24 hours

    def get(self, key: str) -> Optional[dict]:
        """Get cached response if not expired."""

    def set(self, key: str, value: dict):
        """Cache response with timestamp."""

    def invalidate(self, pattern: str):
        """Invalidate cache entries matching pattern."""
```

Benefits:
- Reduce API calls
- Faster repeated queries
- Work offline with cached data
- Respect rate limits

## Rate Limiting

Each server manages rate limits:

```python
class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, calls_per_second: float):
        self.rate = calls_per_second
        self.tokens = calls_per_second
        self.last_update = time.time()

    async def acquire(self):
        """Wait if necessary to respect rate limit."""
```

| Database | Rate Limit | Strategy |
|----------|------------|----------|
| Scopus | 9/sec (institutional) | Token bucket |
| WoS | 5/sec | Token bucket |
| PubMed | 3/sec (10 with key) | Token bucket |
| OpenAlex | 10/sec | Token bucket |
| Reaxys | Unknown | Conservative (1/sec) |
| JCR | Unknown | Conservative (1/sec) |
| Esp@cenet | 10/sec | Token bucket |

## Implementation Priority

1. **Phase 1 (Core):**
   - Scopus MCP (already have API key, tested)
   - PubMed MCP (free, well-documented API)
   - OpenAlex MCP (free, excellent API)
   - NotebookLM MCP (use existing)

2. **Phase 2 (Extended):**
   - Web of Science MCP (need API key)
   - JCR MCP (useful for journal selection)

3. **Phase 3 (Specialized):**
   - Reaxys MCP (chemistry-specific)
   - Esp@cenet MCP (patents)
   - Torrossa MCP (Italian/European)

4. **Phase 4 (Unified):**
   - Academic unified MCP
   - Cross-database deduplication
   - Smart routing

## Summary

Local MCP servers give us:
- **Unified API** across all databases
- **Local caching** for performance
- **Rate limiting** to avoid bans
- **Offline capability** with cached data
- **VPN integration** for institutional access
- **Direct integration** with Vibe Science skill

This architecture transforms fragmented database access into a cohesive research infrastructure.
