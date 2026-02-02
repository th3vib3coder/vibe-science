# Researcher Knowledge Base

The researcher's persistent "bagaglio scientifico" - findings, patterns, and expertise accumulated across research questions.

## Concept

Unlike findings specific to one RQ, the Knowledge Base contains:
- **Reusable patterns** discovered during research
- **Methodological learnings** that apply across domains
- **Trusted sources** (papers, authors, datasets)
- **Domain expertise** built over time
- **NotebookLM integration** for source-grounded queries

The Knowledge Base is the researcher's long-term memory.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE BASE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  .vibe-science/                                             │
│  └── KNOWLEDGE/                                             │
│      ├── library.json        # Index of all knowledge       │
│      │                                                      │
│      ├── methods/            # Reusable methodologies       │
│      │   ├── optimal-transport-biology.md                  │
│      │   └── guide-seq-analysis.md                         │
│      │                                                      │
│      ├── sources/            # Trusted sources registry     │
│      │   ├── papers.json     # Key papers with metadata    │
│      │   ├── authors.json    # Key authors to follow       │
│      │   └── datasets.json   # Public datasets discovered  │
│      │                                                      │
│      ├── patterns/           # Cross-domain patterns        │
│      │   ├── mass-imbalance-signals.md                     │
│      │   └── count-data-ot-formulation.md                  │
│      │                                                      │
│      └── notebooks/          # NotebookLM integration       │
│          └── registry.json   # Linked NotebookLM notebooks │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## library.json Structure

```json
{
  "version": "1.0.0",
  "created": "2025-01-30",
  "last_updated": "2025-01-30T16:45:00Z",

  "methods": [
    {
      "id": "method-001",
      "name": "Optimal Transport for Cell Trajectory",
      "file": "methods/optimal-transport-biology.md",
      "domains": ["computational biology", "single-cell"],
      "source_rq": "RQ-001",
      "created": "2025-01-30",
      "use_count": 3,
      "tags": ["OT", "scRNA-seq", "trajectory"]
    }
  ],

  "papers": [
    {
      "id": "paper-001",
      "doi": "10.1016/j.cell.2019.01.006",
      "title": "Optimal-Transport Analysis of Single-Cell Gene Expression",
      "authors": ["Schiebinger G", "Shu J", "et al."],
      "year": 2019,
      "journal": "Cell",
      "relevance": "Core methodology for OT in biology",
      "discovered_in": "RQ-001",
      "citations_when_added": 892,
      "tags": ["OT", "Waddington", "methodology"]
    }
  ],

  "authors": [
    {
      "id": "author-001",
      "name": "Cicera R. Lazzarotto",
      "scopus_id": "37064674600",
      "affiliation": "St. Jude Children's Research Hospital",
      "expertise": ["CRISPR", "off-target", "GUIDE-seq"],
      "key_papers": ["paper-002", "paper-003"],
      "discovered_in": "RQ-001"
    }
  ],

  "datasets": [
    {
      "id": "dataset-001",
      "name": "GUIDE-seq off-target sites",
      "source_paper": "paper-002",
      "location": "Supplementary Table S1",
      "format": "CSV",
      "rows": 2847,
      "description": "Genome-wide off-target sites with read counts",
      "usable_for": ["OT formulation", "benchmark"]
    }
  ],

  "patterns": [
    {
      "id": "pattern-001",
      "name": "Mass Imbalance as Signal",
      "file": "patterns/mass-imbalance-signals.md",
      "domains": ["biology", "physics", "economics"],
      "description": "When total mass changes, UOT captures information standard OT loses",
      "discovered_in": "RQ-001",
      "applications": 2
    }
  ],

  "notebooks": [
    {
      "id": "notebook-001",
      "name": "CRISPR Off-Target Research",
      "notebooklm_url": "https://notebooklm.google.com/notebook/...",
      "description": "All papers and notes on CRISPR off-target prediction",
      "topics": ["CRISPR", "off-target", "GUIDE-seq", "OT"],
      "sources_count": 23,
      "linked_rqs": ["RQ-001"],
      "created": "2025-01-30",
      "last_queried": "2025-01-30T16:00:00Z"
    }
  ]
}
```

## Knowledge Types

### 1. Methods

Reusable methodological patterns.

```markdown
# methods/optimal-transport-biology.md

---
id: method-001
name: Optimal Transport for Cell Trajectory
domains: [computational biology, single-cell]
source_rq: RQ-001
confidence: HIGH
---

## Summary

Optimal transport provides a principled way to track cell populations
over time, handling proliferation and death.

## When to Use

- Comparing cell populations at different time points
- When cells can proliferate or die (mass changes)
- For trajectory inference in scRNA-seq

## Key Papers

- Schiebinger 2019 (DOI:10.1016/j.cell.2019.01.006) - Waddington-OT
- Chizat 2018 (DOI:xxx) - UOT formulation

## Implementation

```python
# Use WOT package: github.com/broadinstitute/wot
import wot

ot_model = wot.ot.OTModel(matrix, ...)
```

## Pitfalls

- Standard OT assumes mass conservation - use UOT for biology
- Regularization parameter matters - tune carefully
- Computational cost scales with cell count

## Applications in This Research

- RQ-001: Applied to CRISPR off-target prediction
```

### 2. Trusted Papers

Papers that have been verified and found valuable.

```json
{
  "id": "paper-001",
  "doi": "10.1016/j.cell.2019.01.006",
  "title": "Optimal-Transport Analysis...",
  "authors": ["Schiebinger G", "et al."],
  "year": 2019,
  "journal": "Cell",
  "impact_factor": 66.8,
  "citations": 892,

  "relevance": "Core methodology for OT in biology",
  "key_quotes": [
    {
      "text": "We account for cellular growth and death by allowing total mass to change",
      "section": "Methods",
      "page": "1234"
    }
  ],

  "supplementary": {
    "code": "https://github.com/broadinstitute/wot",
    "data": "GEO:GSE12345"
  },

  "reviewer2_cleared": true,
  "discovered_in": "RQ-001",
  "tags": ["methodology", "OT", "single-cell"]
}
```

### 3. Key Authors

Researchers to follow in specific domains.

```json
{
  "id": "author-001",
  "name": "Cicera R. Lazzarotto",
  "scopus_id": "37064674600",
  "orcid": "0000-0001-xxxx-xxxx",
  "affiliation": "St. Jude Children's Research Hospital",

  "expertise": ["CRISPR", "off-target detection", "deep sequencing"],

  "key_contributions": [
    "GUIDE-seq methodology improvements",
    "DISCOVER-seq development"
  ],

  "papers": ["paper-002", "paper-003"],
  "h_index": 18,
  "total_citations": 2847,

  "follow_new_papers": true,
  "last_checked": "2025-01-30"
}
```

### 4. Public Datasets

Reusable data sources.

```json
{
  "id": "dataset-001",
  "name": "GUIDE-seq benchmark dataset",
  "source_paper": "paper-002",
  "doi": "10.1038/nbt.3117",

  "location": {
    "type": "supplementary",
    "file": "Table S1",
    "url": "https://..."
  },

  "format": "CSV",
  "size": "2.3 MB",
  "rows": 2847,
  "columns": ["chr", "start", "end", "gene", "read_count", "mismatch"],

  "description": "Genome-wide CRISPR off-target sites with read counts",

  "usable_for": [
    "OT formulation testing",
    "Benchmark for prediction tools",
    "Cell death correlation"
  ],

  "downloaded": true,
  "local_path": ".vibe-science/data/guide-seq-tsai2015.csv",
  "verified": true
}
```

### 5. Cross-Domain Patterns

Insights that transfer across fields.

```markdown
# patterns/mass-imbalance-signals.md

---
id: pattern-001
name: Mass Imbalance as Signal
domains: [biology, physics, economics]
discovered_in: RQ-001
confidence: MEDIUM
---

## The Pattern

When comparing two distributions, standard optimal transport assumes
total mass is conserved. But mass changes often carry information:

- Biology: Cell death/proliferation
- Economics: Money entering/leaving system
- Physics: Energy dissipation

Unbalanced OT captures this signal. Standard OT loses it.

## Evidence

### Biology (RQ-001)
CRISPR editing causes 15-45% cell death. This mass loss correlates
with off-target activity. UOT can use this signal.

### Economics (Literature)
[Reference if found]

### Physics (Theoretical)
[Reference if found]

## Implications

When you see mass changing, ask:
1. Is the change itself informative?
2. Would standard OT lose this information?
3. Should I use UOT or similar?

## Related Methods
- method-001: Optimal Transport for Cell Trajectory
```

## NotebookLM Integration

### Purpose

NotebookLM provides source-grounded, citation-backed answers from uploaded documents. For Vibe Science:

1. **Upload papers** discovered during research
2. **Query for facts** without hallucination risk
3. **Cross-reference** multiple sources
4. **Verify claims** with citations

### Workflow

```markdown
## Research → NotebookLM Pipeline

1. Discover paper during RQ investigation
2. Download full PDF + supplementary
3. Create/update NotebookLM notebook for domain
4. Upload documents to NotebookLM
5. Register notebook in Knowledge Base

Later:
1. Researcher has question: "What method did Tsai 2015 use for read counting?"
2. Query NotebookLM instead of relying on training data
3. Get source-grounded answer with citation
4. Use in research with confidence
```

### NotebookLM MCP Integration

Using `notebooklm-mcp-cli`:

```python
# Query notebook for factual information
mcp__notebooklm-mcp__notebook_query(
    notebook_id="crispr-research",
    query="What counting method does GUIDE-seq use?",
    source_ids=["tsai2015", "lazzarotto2020"]  # Optional
)

# Response is source-grounded with citations
```

### Notebook Registry

```json
{
  "notebooks": [
    {
      "id": "notebook-001",
      "name": "CRISPR Off-Target Research",
      "notebooklm_url": "https://notebooklm.google.com/notebook/abc123",
      "notebooklm_id": "abc123",

      "description": "All papers on CRISPR off-target prediction methods",

      "topics": ["CRISPR", "off-target", "GUIDE-seq", "DISCOVER-seq"],

      "sources": [
        {"paper_id": "paper-001", "notebooklm_source_id": "src-001"},
        {"paper_id": "paper-002", "notebooklm_source_id": "src-002"}
      ],

      "linked_rqs": ["RQ-001", "RQ-003"],

      "query_count": 47,
      "last_queried": "2025-01-30T16:00:00Z",

      "created": "2025-01-30",
      "updated": "2025-01-30"
    }
  ]
}
```

## Knowledge Base Operations

### Adding Knowledge

```markdown
## /vibe-science:kb add

Add item to Knowledge Base.

### Add Method
Vibe-science detected a reusable methodology in Finding #X.
Adding to Knowledge Base...

Created: methods/optimal-transport-biology.md
Indexed in library.json

### Add Paper
Paper verified and valuable. Adding to trusted sources...

Created entry in library.json papers[]
Tags: OT, methodology, single-cell

### Add Author
Key researcher identified. Adding to follow list...

Created entry in library.json authors[]
Set follow_new_papers: true
```

### Querying Knowledge

```markdown
## /vibe-science:kb search [query]

Search Knowledge Base for relevant items.

### Search "optimal transport"

Methods:
- method-001: Optimal Transport for Cell Trajectory (3 uses)

Papers:
- paper-001: Schiebinger 2019 (Cell) - 892 citations
- paper-005: Peyré 2019 (Computational OT textbook)

Patterns:
- pattern-001: Mass Imbalance as Signal

Notebooks:
- notebook-001: CRISPR Off-Target Research (OT methods uploaded)
```

### Using NotebookLM for Queries

```markdown
## /vibe-science:kb ask [notebook] [question]

Query NotebookLM for source-grounded answer.

### Example

> /vibe-science:kb ask "crispr-research" "What is the sensitivity of GUIDE-seq?"

Querying NotebookLM notebook: CRISPR Off-Target Research...

**Answer (Source-Grounded):**
GUIDE-seq sensitivity is estimated at detecting off-target sites with
≥0.1% modification frequency. [Source: Tsai 2015, Methods section]

The technique captures approximately 95% of sites with >1% modification.
[Source: Lazzarotto 2020, Supplementary Table 2]

**Citations:**
- Tsai et al., Nature Biotechnology, 2015
- Lazzarotto et al., Nature Protocols, 2020
```

## Populating the Knowledge Base

### From RQ Conclusion

When an RQ concludes:

```markdown
## Knowledge Extraction

RQ-001 concluded successfully. Extracting knowledge...

### Methods discovered:
- Optimal Transport for count data (→ method-001)
- UOT for mass imbalance (→ method-002)

### Valuable papers:
- Schiebinger 2019 (→ paper-001)
- Tsai 2015 (→ paper-002)
- Kim 2020 (→ paper-003)

### Key authors:
- Lazzarotto C (→ author-001)

### Reusable datasets:
- GUIDE-seq Table S1 (→ dataset-001)

### Cross-domain patterns:
- Mass imbalance as signal (→ pattern-001)

### NotebookLM:
- Upload papers to "CRISPR Research" notebook
- Register in knowledge base

Knowledge Base updated with 8 new items.
```

### Manual Curation

The researcher can manually add items:

```bash
# Add a paper found outside normal research
/vibe-science:kb add paper --doi 10.1016/j.cell.2019.01.006 --tags "OT,methodology"

# Add a methodology document
/vibe-science:kb add method --file methods/new-method.md

# Link a NotebookLM notebook
/vibe-science:kb add notebook --url "https://notebooklm.google.com/notebook/..." --name "Domain X Research"
```

## Cross-RQ Knowledge Reuse

### Before Starting New RQ

```markdown
## RQ-002: Can UOT improve cancer cell classification?

### Knowledge Base Check

Searching for relevant existing knowledge...

**Relevant Methods:**
- method-001: Optimal Transport for Cell Trajectory
  → Directly applicable! Same OT formulation.

- method-002: UOT for Mass Imbalance
  → Cancer cells proliferate/die → mass imbalance applies!

**Relevant Papers:**
- paper-001: Schiebinger 2019
  → Already read, methodology understood

**Relevant Datasets:**
- None directly applicable
- BUT: pattern-001 suggests looking for datasets with cell counts

**Relevant NotebookLM:**
- notebook-001: Has OT methodology papers uploaded
  → Can query for implementation details

### Starting RQ-002 with Prior Knowledge

Instead of starting from scratch, we have:
- Methodology: Already understood OT/UOT
- Implementation: WOT package, verified
- Conceptual: Mass imbalance pattern transfers
- Reference: Can query NotebookLM for details

Estimated cycle reduction: 30-40%
```

## Integration with Vibe Science Loop

### In /vibe-science:init

```markdown
Before defining RQ, check Knowledge Base:

1. Search for related methods
2. Search for related papers
3. Check if NotebookLM has relevant content
4. Pre-populate RQ.md with prior knowledge

"RQ-002 initialized with 3 related methods, 5 related papers,
and 1 linked NotebookLM notebook from prior research."
```

### In /vibe-science:loop

```markdown
During SEARCH phase:

1. Check if paper already in Knowledge Base
   → If yes, skip re-analysis, use existing notes

2. Check if author is tracked
   → If yes, prioritize their recent papers

3. Query NotebookLM for factual questions
   → Source-grounded answers, no hallucination
```

### In /vibe-science:reviewer2

```markdown
Reviewer 2 can query Knowledge Base:

"You claim OT works on discrete measures. Is this in your Knowledge Base?"

→ Yes, paper-005 (Peyré 2019) confirms: [exact quote]

"Have you checked if this contradicts prior findings?"

→ Searching Knowledge Base for contradictions...
→ No contradictions found in 5 related papers.
```

## Summary

The Knowledge Base transforms the researcher from a stateless agent into one with accumulated expertise:

| Without KB | With KB |
|------------|---------|
| Re-read papers each RQ | Reference existing notes |
| Re-discover authors | Follow tracked experts |
| Re-learn methods | Apply known methodologies |
| Risk hallucination | Query NotebookLM for facts |
| Start from zero | Build on prior work |

This is how human researchers work - they accumulate expertise. Vibe Science should too.
