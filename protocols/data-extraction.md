# Data Extraction Protocol

## Core Rule: NO TRUNCATION

When reading supplementary files, data tables, or any research data:

- Read the **ENTIRE** file, not the first N lines
- If too large for single read: process in **documented chunks** covering ALL content
- Log progress: "Read lines 1-1000 of 5000" → ... → complete
- **Never** summarize data without having read the complete dataset
- **Never** claim "representative sample" as substitute for complete read

## Data Schema Contracts

### AnnData Contract (scRNA-seq)

Before any analysis, verify the h5ad file meets this minimum schema. Route to `anndata` skill for inspection.

```python
# REQUIRED in .obs (per cell)
obs_required = {
    'study_id': 'category',      # Source study identifier
    'sample_id': 'category',     # Biological sample within study
    'cell_type': 'category',     # Cell type annotation (standardized)
    'platform': 'category',      # Sequencing platform (10X_v2, 10X_v3, SmartSeq2, etc.)
}

# RECOMMENDED in .obs
obs_recommended = {
    'donor_id': 'category',      # Individual donor
    'sex': 'category',           # M/F/Unknown
    'age': 'float32',            # Age in years (NaN if unknown)
    'disease': 'category',       # Disease status (healthy, disease_name)
    'tissue': 'category',        # Tissue of origin (standardized ontology)
    'n_genes': 'int32',          # QC: genes per cell
    'n_counts': 'float32',       # QC: total counts per cell
    'pct_mito': 'float32',       # QC: mitochondrial percentage
    'pct_ribo': 'float32',       # QC: ribosomal percentage
    'doublet_score': 'float32',  # Scrublet/DoubletFinder score
}

# REQUIRED data layers
layers_required = {
    'X': 'raw integer counts (or in .raw.X if X is normalized)',
    'raw': 'backup of raw counts if X is transformed'
}

# REQUIRED in .var
var_required = {
    'gene_symbols': 'unique gene names (index or column)',
    'ensembl_ids': 'Ensembl gene IDs (for unambiguous cross-referencing)'
}
```

### Data Quality Flags

| Flag | Meaning |
|------|---------|
| ✅ VERIFIED | Data downloaded, read completely, schema compliant |
| ⚠️ PARTIAL | Only partial data accessible (document what's missing) |
| ❌ INACCESSIBLE | Data claimed but not available at provided link |
| 🔄 NEEDS PROCESSING | Raw data available but requires processing |
| 🔴 SCHEMA VIOLATION | Data exists but violates contract (specify which fields) |

### Schema Violation Triage

When data violates the contract:

| Violation | Severity | Fix |
|-----------|----------|-----|
| X contains float (not int counts) | P0 — Critical | Check .raw.X; if absent, investigate normalization history |
| Missing study_id | P0 — Critical | Cannot proceed without batch identifier |
| Missing cell_type | P1 — Major | Can proceed with clustering, but cannot validate annotations |
| String instead of category | P2 — Minor | Convert with obs-normalizer (see assets/obs-normalizer.md) |
| Missing pct_mito | P1 — Major | Compute from gene annotations before QC |
| Duplicate gene names | P1 — Major | Make unique (var_names_make_unique) |
| Mixed gene ID formats | P1 — Major | Standardize to one format + mapping table |

## Supplementary Material Extraction

For each paper with relevant supplementary data:

```markdown
## Supplementary Material Log

**Paper:** [Full title]
**DOI:** [doi]
**Journal:** [journal name]

**Files identified:**
- [ ] Table S1 — Gene list (CSV) — downloaded / not accessible
- [ ] Table S2 — Statistical results (XLSX) — downloaded / not accessible
- [ ] Data S1 — Raw sequencing (link to GEO/SRA) — accession: GSEXXXXX

**Extraction notes:**
- Table S1: N rows, columns: [list], key observations: [...]
- Table S2: Contains [specific parameters needed]

**Extraction completeness:** FULL / PARTIAL (reason)
**Claim IDs populated:** C-xxx, C-yyy
```

## Data Dictionary Protocol (v5.5) — Gate DD0

### The Problem

Column names lie. `Protospacer_sequence` may not be the designed protospacer. `mismatch_count` may be computed differently than you expect. Using a column based on its name alone leads to silent bugs that propagate through the entire pipeline (M7: CHANGE-seq alignment bug, hours of wasted work).

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
| guide_id | str | "sg001" | Unique identifier for each guide RNA | README | YES |
| off_target_seq | str | "ATCG..." | Genomic sequence at off-target site | README | YES |
| mismatch_count | int | 3 | Number of mismatches between guide and off-target | Computed | YES — matches manual count |
| activity_score | float | 0.42 | Normalized read count (CHANGE-seq signal) | Paper Table S1 | YES |
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

## Sequencing Data (GEO/SRA/ENA)

Route to `geo-database` or `ena-database` skills:

1. Record accession numbers (GSE, SRR, etc.)
2. Document: organism, tissue, condition, technology
3. Note sample sizes per condition
4. Check if processed data (count matrices) available
5. Prefer processed matrices over raw FASTQ unless specifically needed
6. Verify raw count integrity (integer dtype) before accepting
