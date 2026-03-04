# Data Normalizer Standard

Standard procedure for normalizing a dataset's metadata DataFrame to meet schema compliance (Gate 1).

## Why This Exists

The #1 cause of silent pipeline failures in multi-source data integration is inconsistent metadata schema: string vs category dtypes, mixed encodings, NaN in categorical columns, leftover unused categories. The data normalizer eliminates these problems systematically.

## Normalization Steps

Execute in this exact order:

### Step 1: Dtype Normalization

```python
import pandas as pd

# Columns that MUST be categorical
categorical_cols = [
    'source_id', 'sample_id', 'group_label', 'collection_method',
    'subject_id', 'condition', 'batch'
]

for col in categorical_cols:
    if col in df.columns:
        # Convert object/string to category
        if df[col].dtype == 'object' or df[col].dtype.name == 'string':
            df[col] = df[col].astype('category')

        # If already category, ensure clean
        if df[col].dtype.name == 'category':
            # Remove unused categories (leftover from filtering)
            df[col] = df[col].cat.remove_unused_categories()
```

### Step 2: Category Standardization

```python
# Collection method names: standardize to canonical forms
# (adapt this map to your domain — examples shown)
method_map = {
    "survey_v1": "Survey_v1",
    "Survey V1": "Survey_v1",
    "survey_v2": "Survey_v2",
    "Survey V2": "Survey_v2",
    "instrument_a": "Instrument_A",
    "Instrument-A": "Instrument_A",
    "instrument_b": "Instrument_B",
    "Instrument-B": "Instrument_B",
}

if 'collection_method' in df.columns:
    df['collection_method'] = (
        df['collection_method']
        .map(lambda x: method_map.get(str(x).strip(), str(x).strip()))
        .astype('category')
    )

# Generic label standardization (adapt to domain)
label_map = {
    "yes": "Yes", "YES": "Yes", "y": "Yes",
    "no": "No", "NO": "No", "n": "No",
    "unknown": "Unknown", "": "Unknown", "NA": "Unknown",
}

if 'group_label' in df.columns:
    df['group_label'] = (
        df['group_label']
        .fillna("Unknown")
        .map(lambda x: label_map.get(str(x).strip(), str(x).strip()))
        .astype('category')
    )
```

### Step 3: NaN Handling in Categoricals

```python
# Categoricals used as batch keys or covariates CANNOT have NaN
critical_categorical = ['source_id', 'sample_id', 'collection_method']

for col in critical_categorical:
    if col in df.columns:
        n_nan = df[col].isna().sum()
        if n_nan > 0:
            print(f"WARNING: {col} has {n_nan} NaN values")
            # Decision required: drop rows or impute from metadata
            # Log in decision-log.md
```

### Step 4: Category Freezing

After all normalization, freeze categories to prevent silent errors downstream:

```python
for col in df.select_dtypes(include='category').columns:
    df[col] = df[col].cat.remove_unused_categories()
    # Log category levels for audit
    n_cats = len(df[col].cat.categories)
    print(f"{col}: {n_cats} categories")
```

### Step 5: QC Columns

Ensure quality metrics are computed and present:

```python
# Compute domain-appropriate quality metrics
# Examples (adapt to your data):

# Completeness: fraction of non-null values per row
df['completeness'] = df.notna().mean(axis=1)

# Outlier flag: values beyond 3 standard deviations (for numeric columns)
numeric_cols = df.select_dtypes(include='number').columns
for col in numeric_cols:
    mean_val = df[col].mean()
    std_val = df[col].std()
    df[f'{col}_outlier'] = ((df[col] - mean_val).abs() > 3 * std_val)

# Rename to standard names if needed
rename_map = {
    # Map domain-specific names to standard names
    # 'original_name': 'standard_name',
}
df.rename(columns=rename_map, inplace=True)
```

## Validation Report

After normalization, produce a validation summary:

```markdown
## Data Normalization Report

**Date:** YYYY-MM-DD
**Input:** [filename]
**Records:** N_pre → N_post (if any dropped)

### Dtype Conversions
| Column | Before | After | Categories |
|--------|--------|-------|------------|
| source_id | object | category | 12 |
| collection_method | string | category | 3 |
| group_label | object | category | 3 (Yes, No, Unknown) |

### NaN Resolution
| Column | NaN count | Action | Decision ID |
|--------|-----------|--------|-------------|
| collection_method | 0 | — | — |
| subject_id | 45 | Filled "Unknown" | DEC-xxx |

### QC Metrics Added
- [x] completeness
- [x] outlier flags
- [x] [domain-specific metrics]

### Unused Categories Removed
| Column | Before | After | Removed |
|--------|--------|-------|---------|
| group_label | 24 | 21 | 3 (from filtered records) |

### Gate 1 Status: PASS / FAIL
[If FAIL: list specific violations]
```

## Common Pitfalls

| Problem | Symptom | Fix |
|---------|---------|-----|
| String categoricals | Model ignores covariate, no error thrown | Convert to `pd.Categorical` |
| Unused categories | One-hot encoding creates empty columns, wastes parameters | `remove_unused_categories()` |
| NaN in batch key | Model silently drops rows or crashes | Fill or drop, document decision |
| Mixed identifier formats | Feature selection fails or produces garbage | Standardize to one format |
| Float values where integers expected | Model trains but produces nonsense results | Verify data types match expectations |
| Duplicate feature names | Indexing errors, wrong feature in results | Make feature names unique |
