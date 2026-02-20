# Knowledge Base — Protocol

> Load this when: session initialization (check for existing knowledge), RQ conclusion (update knowledge), or cross-RQ pattern search.

## Purpose

The Knowledge Base accumulates reusable information across research questions. It prevents starting from zero on recurring topics and captures cross-domain patterns that fuel serendipity.

## Structure

```
.vibe-science/KNOWLEDGE/
├── library.json          # Index of known papers, authors, datasets, methods
├── patterns.md           # Cross-domain patterns discovered
├── methods.md            # Reusable methodological knowledge
└── dead-ends.md          # What didn't work and why (prevents re-exploring)
```

## library.json Schema

```json
{
  "papers": [
    {
      "doi": "10.1109/JLT.2020.example",
      "title": "50 Gb/s PAM4 and NRZ VCSEL Comparison for Short-Reach Optical Interconnects",
      "authors": ["Kuchta DM", "..."],
      "year": 2020,
      "domain": ["VCSEL", "PAM4", "IM-DD", "optical-interconnect"],
      "rq_references": ["RQ-001", "RQ-003"],
      "key_insight": "PAM4 achieves lower power penalty than NRZ at 50+ Gb/s",
      "confidence": 0.85,
      "added": "2026-02-18"
    }
  ],
  "datasets": [
    {
      "accession": "IEEE802.3bs-2017",
      "source": "IEEE Standards",
      "domain": "optical Ethernet",
      "standard": "400 Gb/s Ethernet",
      "datapoints": 87,
      "rq_references": ["RQ-002"],
      "notes": "Performance targets for 400GbE using 850nm VCSEL + MMF",
      "quality": "verified",
      "added": "2026-02-18"
    }
  ],
  "methods": [
    {
      "name": "Temperature-controlled BER comparison",
      "domain": "optical-interconnect",
      "reference_doi": "standard methodology",
      "parameters": {"temperature_C": [25, 85], "fiber_type": "OM4", "fec": "KP4"},
      "notes": "Must control for temperature and fiber type when comparing modulation formats",
      "rq_references": ["RQ-001"]
    }
  ],
  "authors": [
    {
      "name": "Kuchta DM",
      "scopus_id": "example",
      "domain": ["VCSEL", "high-speed", "optical-interconnect"],
      "key_papers": ["10.xxx", "10.yyy"],
      "rq_references": ["RQ-001"]
    }
  ]
}
```

## Updating the Knowledge Base

### When to Update
- After concluding any RQ (SUCCESS or NEGATIVE)
- After validating a new method or dataset
- After discovering a cross-domain pattern
- After a Serendipity Sprint

### Update Protocol
1. Extract reusable elements from current RQ:
   - Papers that might be useful for future RQs
   - Datasets verified as accessible and clean
   - Methods with validated parameters
   - Authors/groups to follow
2. Add to library.json with proper indexing
3. Check for cross-domain patterns → update patterns.md
4. Check for dead ends → update dead-ends.md

## patterns.md Format

```markdown
## PAT-001: [Pattern Name]
- **Domains connected:** [field A] ↔ [field B]
- **Pattern:** [What's the connection]
- **Evidence:** [DOI or RQ reference]
- **Potential applications:** [Where else this might apply]
- **Discovered:** YYYY-MM-DD during RQ-XXX
- **Explored?** YES (RQ-YYY) / NO / PARTIALLY

## PAT-002: ...
```

## dead-ends.md Format

```markdown
## DE-001: [What was tried]
- **RQ:** RQ-XXX
- **Hypothesis:** [What we expected]
- **Why it failed:** [Specific reason]
- **Data:** [What data showed]
- **Lesson:** [What to avoid / what to do differently]
- **Would revisit if:** [Conditions that would make this worth trying again]
- **Date:** YYYY-MM-DD
```

## Querying the Knowledge Base

### At Session Start
When beginning a new RQ or resuming work:
1. Check library.json for relevant papers/datasets in the new domain
2. Check patterns.md for cross-domain connections
3. Check dead-ends.md for already-explored paths to avoid

### During Search Phase
Before executing a literature search:
1. Check if the topic has already been explored in a previous RQ
2. Check if relevant datasets are already catalogued
3. Use known author IDs for targeted searches

### During Serendipity Sprint
Feed the Knowledge Base into brainstorming:
1. Read patterns.md for cross-domain inspiration
2. Check: do any patterns connect to current domain?
3. Look for unexplored applications of known methods

## Maintenance

### Quarterly Review
Every 3 months (or every 5 completed RQs):
- Prune library.json entries that are no longer relevant
- Verify that catalogued datasets are still accessible
- Consolidate duplicate patterns
- Archive old dead-ends that are no longer informative
