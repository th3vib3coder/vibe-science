# Measurement Normalizer Standard

Standard procedure for normalizing structured measurement data to meet schema compliance (Gate 1).

## Why This Exists

The #1 cause of silent comparison failures in multi-study photonics literature review is inconsistent measurement schema: mixed units, unstandardized device naming, missing operating conditions, ambiguous modulation format labels. The measurement normalizer eliminates these problems systematically.

## Normalization Steps

Execute in this exact order:

### Step 1: Dtype Normalization

```python
import pandas as pd

# Columns that MUST be categorical
categorical_cols = [
    'study_id', 'measurement_id', 'device_type', 'modulation_format',
    'fiber_type', 'wavelength_band', 'fec_type', 'measurement_setup'
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
# Device type: standardize to canonical forms
device_type_map = {
    "vcsel 850": "VCSEL_850nm",
    "VCSEL 850nm": "VCSEL_850nm",
    "vcsel_850": "VCSEL_850nm",
    "850nm VCSEL": "VCSEL_850nm",
    "vcsel 940": "VCSEL_940nm",
    "VCSEL 940nm": "VCSEL_940nm",
    "vcsel_940": "VCSEL_940nm",
    "940nm VCSEL": "VCSEL_940nm",
    "dfb 1310": "DFB_1310nm",
    "DFB 1310nm": "DFB_1310nm",
    "dfb_1310": "DFB_1310nm",
    "eml 1550": "EML_1550nm",
    "EML 1550nm": "EML_1550nm",
    "eml_1550": "EML_1550nm",
    "si-ph": "SiPh",
    "silicon photonics": "SiPh",
}

if 'device_type' in df.columns:
    df['device_type'] = (
        df['device_type']
        .map(lambda x: device_type_map.get(str(x).strip().lower(), str(x).strip()))
        .astype('category')
    )

# Modulation format standardization
modulation_map = {
    "nrz": "NRZ", "NRZ-OOK": "NRZ", "ook": "NRZ", "OOK": "NRZ",
    "pam4": "PAM4", "PAM-4": "PAM4", "pam-4": "PAM4",
    "pam6": "PAM6", "PAM-6": "PAM6",
    "dmt": "DMT", "discrete multi-tone": "DMT",
    "ofdm": "OFDM",
    "dp-qpsk": "DP-QPSK", "qpsk": "DP-QPSK",
    "dp-16qam": "DP-16QAM", "16qam": "DP-16QAM",
}

if 'modulation_format' in df.columns:
    df['modulation_format'] = (
        df['modulation_format']
        .map(lambda x: modulation_map.get(str(x).strip().lower(), str(x).strip()))
        .astype('category')
    )

# Fiber type standardization
fiber_map = {
    "om3": "MMF_OM3", "OM3": "MMF_OM3", "MMF OM3": "MMF_OM3",
    "om4": "MMF_OM4", "OM4": "MMF_OM4", "MMF OM4": "MMF_OM4",
    "om5": "MMF_OM5", "OM5": "MMF_OM5", "MMF OM5": "MMF_OM5",
    "smf": "SMF_G652", "SMF": "SMF_G652", "G.652": "SMF_G652",
    "g652": "SMF_G652", "G.652D": "SMF_G652",
    "g654": "SMF_G654", "G.654": "SMF_G654",
    "btb": "BTB", "back-to-back": "BTB", "B2B": "BTB",
}

if 'fiber_type' in df.columns:
    df['fiber_type'] = (
        df['fiber_type']
        .map(lambda x: fiber_map.get(str(x).strip(), str(x).strip()))
        .astype('category')
    )

# FEC type standardization
fec_map = {
    "kp4": "KP4", "KP4-FEC": "KP4", "RS(544,514)": "KP4",
    "kr4": "KR4", "KR4-FEC": "KR4", "RS(528,514)": "KR4",
    "none": "None", "no fec": "None", "uncoded": "None",
    "pre-fec": "pre-FEC",
    "post-fec": "post-FEC",
}

if 'fec_type' in df.columns:
    df['fec_type'] = (
        df['fec_type']
        .fillna("Not_Specified")
        .map(lambda x: fec_map.get(str(x).strip().lower(), str(x).strip()))
        .astype('category')
    )
```

### Step 3: Unit Normalization

```python
# Ensure consistent units across all studies

# Temperature: always in Celsius
if 'temperature_K' in df.columns:
    df['temperature_C'] = df['temperature_K'] - 273.15
    df.drop(columns=['temperature_K'], inplace=True)

# Data rate: always in Gb/s
if 'data_rate_Mbps' in df.columns:
    df['data_rate_Gbps'] = df['data_rate_Mbps'] / 1000
    df.drop(columns=['data_rate_Mbps'], inplace=True)

# Fiber length: always in meters
if 'fiber_length_km' in df.columns:
    df['fiber_length_m'] = df['fiber_length_km'] * 1000
    df.drop(columns=['fiber_length_km'], inplace=True)

# Power: always in dBm (log scale)
# If linear power in mW is given, convert
import numpy as np
if 'power_mW' in df.columns:
    df['power_dBm'] = 10 * np.log10(df['power_mW'])
    df.drop(columns=['power_mW'], inplace=True)

# BER: ensure scientific notation consistency
# Store as float64 for precision (BER can be 1e-12)
if 'ber' in df.columns:
    df['ber'] = df['ber'].astype('float64')
```

### Step 4: NaN Handling in Categoricals

```python
# Categoricals used as grouping variables CANNOT have NaN
critical_categorical = ['study_id', 'measurement_id', 'device_type']

for col in critical_categorical:
    if col in df.columns:
        n_nan = df[col].isna().sum()
        if n_nan > 0:
            print(f"WARNING: {col} has {n_nan} NaN values")
            # Decision required: drop rows or impute from paper metadata
            # Log in decision-log.md
```

### Step 5: Operating Condition Columns

Ensure operating conditions are present and properly typed:

```python
# REQUIRED operating conditions for meaningful comparison
operating_conditions = {
    'temperature_C': 'float32',       # Operating temperature
    'data_rate_Gbps': 'float32',      # Data rate
    'wavelength_nm': 'float32',       # Operating wavelength
    'fiber_length_m': 'float32',      # Fiber length (0 = back-to-back)
}

# RECOMMENDED performance metrics
performance_metrics = {
    'ber': 'float64',                  # Bit error rate (needs high precision)
    'snr_dB': 'float32',              # Signal-to-noise ratio
    'eye_height_mV': 'float32',       # Eye diagram vertical opening
    'eye_width_ps': 'float32',        # Eye diagram horizontal opening
    'power_penalty_dB': 'float32',    # Power penalty vs back-to-back
    'extinction_ratio_dB': 'float32', # Transmitter on/off ratio
    'sensitivity_dBm': 'float32',     # Receiver sensitivity at target BER
    'rin_dB_Hz': 'float32',           # Relative intensity noise
}

# RECOMMENDED device parameters
device_parameters = {
    'threshold_current_mA': 'float32',   # Laser threshold current
    'slope_efficiency_W_A': 'float32',   # Laser slope efficiency
    'bandwidth_3dB_GHz': 'float32',      # Modulation bandwidth
    'oxide_aperture_um': 'float32',      # VCSEL oxide aperture diameter
    'bias_current_mA': 'float32',        # Operating bias current
}

# Temperature normalization: normalize to 25°C baseline when comparing
if 'temperature_C' in df.columns and 'power_penalty_dB' in df.columns:
    # Flag measurements not at standard temperature
    df['temp_normalized'] = (df['temperature_C'] == 25.0)
    non_standard = (~df['temp_normalized']).sum()
    if non_standard > 0:
        print(f"NOTE: {non_standard} measurements at non-standard temperature")
        print("  Temperature compensation may be needed for fair comparison")
```

### Step 6: Category Freezing

After all normalization, freeze categories to prevent silent errors:

```python
for col in df.select_dtypes(include='category').columns:
    df[col] = df[col].cat.remove_unused_categories()
    # Log category levels for audit
    n_cats = len(df[col].cat.categories)
    print(f"{col}: {n_cats} categories — {list(df[col].cat.categories)}")
```

## Validation Report

After normalization, produce a validation summary:

```markdown
## Measurement Normalization Report

**Date:** YYYY-MM-DD
**Input:** [source papers/files]
**Measurements:** N_pre → N_post (if any dropped)

### Dtype Conversions
| Column | Before | After | Categories |
|--------|--------|-------|------------|
| device_type | object | category | 4 (VCSEL_850nm, VCSEL_940nm, DFB_1310nm, EML_1550nm) |
| modulation_format | string | category | 3 (NRZ, PAM4, DMT) |
| fiber_type | object | category | 4 (MMF_OM3, MMF_OM4, SMF_G652, BTB) |

### Unit Conversions Applied
| Column | Original Unit | Normalized Unit | N converted |
|--------|--------------|-----------------|-------------|
| temperature | K | °C | 23 |
| fiber_length | km | m | 45 |
| power | mW | dBm | 12 |

### NaN Resolution
| Column | NaN count | Action | Decision ID |
|--------|-----------|--------|-------------|
| device_type | 0 | — | — |
| temperature_C | 5 | Filled from paper text | DEC-xxx |

### Operating Conditions Present
- [x] temperature_C
- [x] data_rate_Gbps
- [x] wavelength_nm
- [x] fiber_length_m
- [ ] bias_current_mA (missing in 3 studies)

### Performance Metrics Present
- [x] ber
- [x] snr_dB
- [x] power_penalty_dB
- [ ] eye_height_mV (missing — not reported in all papers)
- [ ] eye_width_ps (missing — not reported in all papers)

### Gate 1 Status: PASS / FAIL
[If FAIL: list specific violations]
```

## Common Pitfalls

| Problem | Symptom | Fix |
|---------|---------|-----|
| Mixed BER formats | Some papers report -log10(BER), others raw BER | Standardize to raw BER (float64) |
| Missing temperature | Can't compare VCSEL performance across studies | Flag as P0, extract from paper text |
| Missing FEC assumption | BER 1e-3 pre-FEC vs 1e-12 post-FEC are incomparable | Always record fec_type |
| Inconsistent wavelength | "850nm" vs "850" vs "0.85um" | Standardize to nm (float32) |
| Back-to-back ambiguity | fiber_length=0 vs fiber_type="BTB" vs omitted | Use fiber_length_m=0 AND fiber_type="BTB" |
| Mixed power units | dBm vs mW vs "launch power" without units | Convert all to dBm, flag if units unclear |
| Data rate vs baud rate | 50 Gb/s NRZ vs 50 GBaud PAM4 (=100 Gb/s) | Always store data_rate_Gbps (bit rate, not symbol rate) |
| Measurement uncertainty | No error bars reported | Flag in ASSUMPTION-REGISTER.md |
