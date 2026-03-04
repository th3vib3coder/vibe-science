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

## Data Dictionary Protocol (v5.5) — Gate DD0

### The Problem

Column names lie. `measurement_value` may not be what you expect. `score` may be computed differently than assumed. Using a column based on its name alone leads to silent bugs that propagate through the entire pipeline (hours of wasted work when assumptions about column semantics turn out to be wrong).

### The Rule

**Before using ANY column from a dataset for the FIRST TIME in a session**, you MUST:

1. **INSPECT**: Print ALL columns with their dtype and 3-5 example values.
2. **DOCUMENT**: For each column you will USE in analysis, write a one-line definition:
   - What does it represent?
   - What are its units or categories?
   - How was it computed or measured? (if known from documentation)
3. **VERIFY**: Cross-check your understanding against the dataset's README, metadata, publication, or supplementary materials. NEVER trust the column name alone.
4. **RECORD**: Write the data dictionary to `data-dictionary.md` (or equivalent) in the project directory. This is persistent — it survives context window compaction.

### Template

```markdown
# Data Dictionary — {dataset_name}

| Column | dtype | Example | Meaning | Source | Verified? |
|--------|-------|---------|---------|--------|-----------|
| sample_id | str | "S001" | Unique identifier for each sample | README | YES |
| feature_name | str | "feat_42" | Name of the measured feature | README | YES |
| raw_count | int | 3 | Raw measurement count before normalization | Computed | YES — matches manual count |
| normalized_score | float | 0.42 | Normalized measurement value (method in paper) | Paper Table S1 | YES |
```

### Gate DD0 Check

Before analysis proceeds, verify:
- All columns used in the analysis appear in the data dictionary
- Each column has a verified meaning (not just assumed from name)
- Cross-checks performed where possible (e.g., recomputing a count and comparing)

DD0 FAIL → HALT. Document the column before using it.

---

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
