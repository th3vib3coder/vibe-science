# Obs Normalizer Standard

Standard procedure for normalizing AnnData `.obs` DataFrame to meet schema compliance (Gate 1).

## Why This Exists

The #1 cause of silent pipeline failures in multi-study scRNA-seq integration is inconsistent `.obs` schema: string vs category dtypes, mixed encodings, NaN in categorical columns, leftover unused categories. The obs normalizer eliminates these problems systematically.

## Normalization Steps

Execute in this exact order:

### Step 1: Dtype Normalization

```python
import pandas as pd

# Columns that MUST be categorical
categorical_cols = [
    'study_id', 'sample_id', 'cell_type', 'platform',
    'donor_id', 'sex', 'disease', 'tissue', 'batch'
]

for col in categorical_cols:
    if col in adata.obs.columns:
        # Convert object/string to category
        if adata.obs[col].dtype == 'object' or adata.obs[col].dtype.name == 'string':
            adata.obs[col] = adata.obs[col].astype('category')

        # If already category, ensure clean
        if adata.obs[col].dtype.name == 'category':
            # Remove unused categories (leftover from filtering)
            adata.obs[col] = adata.obs[col].cat.remove_unused_categories()
```

### Step 2: Category Standardization

```python
# Platform names: standardize to canonical forms
platform_map = {
    "10x chromium v2": "10X_v2",
    "10x_v2": "10X_v2",
    "10X Chromium v2": "10X_v2",
    "10x chromium v3": "10X_v3",
    "10x_v3": "10X_v3",
    "10X Chromium v3": "10X_v3",
    "smart-seq2": "SmartSeq2",
    "Smart-Seq2": "SmartSeq2",
    "smartseq2": "SmartSeq2",
    "drop-seq": "DropSeq",
    "Drop-seq": "DropSeq",
    "inDrop": "InDrop",
    "indrop": "InDrop",
    "CEL-Seq2": "CELSeq2",
    "cel-seq2": "CELSeq2",
}

if 'platform' in adata.obs.columns:
    adata.obs['platform'] = (
        adata.obs['platform']
        .map(lambda x: platform_map.get(str(x).strip(), str(x).strip()))
        .astype('category')
    )

# Sex standardization
sex_map = {
    "male": "M", "Male": "M", "m": "M", "MALE": "M",
    "female": "F", "Female": "F", "f": "F", "FEMALE": "F",
    "unknown": "Unknown", "": "Unknown", "NA": "Unknown",
}

if 'sex' in adata.obs.columns:
    adata.obs['sex'] = (
        adata.obs['sex']
        .fillna("Unknown")
        .map(lambda x: sex_map.get(str(x).strip(), str(x).strip()))
        .astype('category')
    )
```

### Step 3: NaN Handling in Categoricals

```python
# Categoricals used as batch_key or covariates CANNOT have NaN
critical_categorical = ['study_id', 'sample_id', 'platform']

for col in critical_categorical:
    if col in adata.obs.columns:
        n_nan = adata.obs[col].isna().sum()
        if n_nan > 0:
            print(f"WARNING: {col} has {n_nan} NaN values")
            # Decision required: drop cells or impute from metadata
            # Log in decision-log.md
```

### Step 4: Category Freezing

After all normalization, freeze categories to prevent silent errors downstream:

```python
for col in adata.obs.select_dtypes(include='category').columns:
    adata.obs[col] = adata.obs[col].cat.remove_unused_categories()
    # Log category levels for audit
    n_cats = len(adata.obs[col].cat.categories)
    print(f"{col}: {n_cats} categories")
```

### Step 5: QC Columns

Ensure QC metrics are computed and present:

```python
import scanpy as sc

# Mitochondrial genes
adata.var['mt'] = adata.var_names.str.startswith('MT-')  # Human
# For mouse: adata.var['mt'] = adata.var_names.str.startswith('mt-')

# Ribosomal genes
adata.var['ribo'] = adata.var_names.str.startswith(('RPS', 'RPL'))

# Compute QC metrics
sc.pp.calculate_qc_metrics(
    adata, qc_vars=['mt', 'ribo'],
    percent_top=None, log1p=False, inplace=True
)

# Rename to standard names
rename_map = {
    'pct_counts_mt': 'pct_mito',
    'pct_counts_ribo': 'pct_ribo',
    'total_counts': 'n_counts',
    'n_genes_by_counts': 'n_genes',
}
adata.obs.rename(columns=rename_map, inplace=True)
```

## Validation Report

After normalization, produce a validation summary:

```markdown
## Obs Normalization Report

**Date:** YYYY-MM-DD
**Input:** [filename]
**Cells:** N_pre → N_post (if any dropped)

### Dtype Conversions
| Column | Before | After | Categories |
|--------|--------|-------|------------|
| study_id | object | category | 12 |
| platform | string | category | 3 (10X_v2, 10X_v3, SmartSeq2) |
| sex | object | category | 3 (M, F, Unknown) |

### NaN Resolution
| Column | NaN count | Action | Decision ID |
|--------|-----------|--------|-------------|
| platform | 0 | — | — |
| donor_id | 45 | Filled "Unknown" | DEC-xxx |

### QC Metrics Added
- [x] pct_mito
- [x] pct_ribo
- [x] n_counts
- [x] n_genes

### Unused Categories Removed
| Column | Before | After | Removed |
|--------|--------|-------|---------|
| cell_type | 24 | 21 | 3 (from filtered cells) |

### Gate 1 Status: ✅ PASS / ❌ FAIL
[If FAIL: list specific violations]
```

## Common Pitfalls

| Problem | Symptom | Fix |
|---------|---------|-----|
| String categoricals | scVI ignores covariate, no error thrown | Convert to `pd.Categorical` |
| Unused categories | One-hot encoding creates empty columns, wastes parameters | `remove_unused_categories()` |
| NaN in batch_key | scVI silently drops cells or crashes | Fill or drop, document decision |
| Mixed gene ID formats | HVG selection fails or produces garbage | Standardize to one format |
| Float counts | scVI trains but produces nonsense latent space | Verify integer, check .raw.X |
| Duplicate var_names | Indexing errors, wrong gene in DE results | `var_names_make_unique()` |
