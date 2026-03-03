# Data Extraction Protocol

## Core Rule: NO TRUNCATION

When reading supplementary files, data tables, or any research data:

- Read the **ENTIRE** file, not the first N lines
- If too large for single read: process in **documented chunks** covering ALL content
- Log progress: "Read lines 1-1000 of 5000" → ... → complete
- **Never** summarize data without having read the complete dataset
- **Never** claim "representative sample" as substitute for complete read

## Data Schema Contracts

### Structured Data Contract

Before any analysis, verify the data file meets the minimum schema for its format. Use appropriate domain tools for inspection.

```
# REQUIRED metadata (per record/sample)
metadata_required = {
    'source_id': 'category',        # Source identifier (study, experiment, batch)
    'sample_id': 'category',        # Individual sample/record identifier
    'group_label': 'category',      # Group/class/condition label
    'collection_method': 'category', # How data was collected (platform, instrument, survey type)
}

# RECOMMENDED metadata
metadata_recommended = {
    'subject_id': 'category',       # Individual subject/entity
    'demographic_1': 'category',    # Key demographic variable (varies by domain)
    'demographic_2': 'category',    # Secondary demographic variable
    'condition': 'category',        # Experimental condition or disease status
    'quality_score': 'float',       # Data quality metric
    'collection_date': 'date',      # When data was collected
}

# REQUIRED data properties
data_required = {
    'feature_names': 'unique identifiers for each feature/variable',
    'raw_values': 'original unprocessed values (or clear provenance if transformed)'
}
```

### Data Quality Flags

| Flag | Meaning |
|------|---------|
| VERIFIED | Data downloaded, read completely, schema compliant |
| PARTIAL | Only partial data accessible (document what's missing) |
| INACCESSIBLE | Data claimed but not available at provided link |
| NEEDS_PROCESSING | Raw data available but requires processing |
| SCHEMA_VIOLATION | Data exists but violates contract (specify which fields) |

### Schema Violation Triage

When data violates the contract:

| Violation | Severity | Fix |
|-----------|----------|-----|
| Values are pre-transformed (not raw) | P0 — Critical | Check for raw data layer; if absent, investigate transformation history |
| Missing source_id | P0 — Critical | Cannot proceed without batch/source identifier |
| Missing group_label | P1 — Major | Can proceed with clustering, but cannot validate annotations |
| Wrong data types | P2 — Minor | Convert to correct types with appropriate tools |
| Missing quality metrics | P1 — Major | Compute from data before quality control |
| Duplicate feature names | P1 — Major | Make unique (deduplicate with suffix) |
| Mixed identifier formats | P1 — Major | Standardize to one format + mapping table |

## Supplementary Material Extraction

For each paper with relevant supplementary data:

```markdown
## Supplementary Material Log

**Paper:** [Full title]
**DOI:** [doi]
**Journal:** [journal name]

**Files identified:**
- [ ] Table S1 — Data list (CSV) — downloaded / not accessible
- [ ] Table S2 — Statistical results (XLSX) — downloaded / not accessible
- [ ] Data S1 — Raw data (link to repository) — accession: ID-XXXXX

**Extraction notes:**
- Table S1: N rows, columns: [list], key observations: [...]
- Table S2: Contains [specific parameters needed]

**Extraction completeness:** FULL / PARTIAL (reason)
**Claim IDs populated:** C-xxx, C-yyy
```

## Cross-Referencing Protocol

When a finding depends on data from multiple papers:

1. Create cross-reference table: which data supports which claim
2. Check for contradictions between datasets
3. Note methodological differences
4. Register discrepancies in ASSUMPTION-REGISTER.md if unresolvable

## Repository Data (Public Databases)

Route to appropriate database skills:

1. Record accession numbers or dataset identifiers
2. Document: subject matter, conditions, collection method, technology
3. Note sample sizes per condition
4. Check if processed data (derived tables, matrices) available
5. Prefer processed data over raw unless specifically needed
6. Verify data integrity (correct types, expected value ranges) before accepting
