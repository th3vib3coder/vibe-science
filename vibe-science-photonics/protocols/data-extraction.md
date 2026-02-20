# Data Extraction Protocol

## Core Rule: NO TRUNCATION

When reading supplementary files, data tables, or any research data:

- Read the **ENTIRE** file, not the first N lines
- If too large for single read: process in **documented chunks** covering ALL content
- Log progress: "Read lines 1-1000 of 5000" → ... → complete
- **Never** summarize data without having read the complete dataset
- **Never** claim "representative sample" as substitute for complete read

## Data Schema Contracts

### Performance Data Contract (Photonics)

Before any comparison or analysis, verify that extracted data meets this minimum schema.

```python
# REQUIRED fields (per measurement point)
required_fields = {
    'study_id': 'category',           # Source paper identifier (DOI or short key)
    'measurement_id': 'category',     # Unique measurement within study
    'device_type': 'category',        # Device type (VCSEL_850nm, DFB_1310nm, etc.)
    'wavelength_nm': 'float32',       # Operating wavelength in nm
    'temperature_C': 'float32',       # Operating temperature in Celsius
    'data_rate_Gbps': 'float32',      # Bit rate in Gb/s
    'modulation_format': 'category',  # NRZ, PAM4, PAM6, DMT, OFDM, etc.
}

# RECOMMENDED fields (per measurement point)
recommended_fields = {
    'fiber_type': 'category',         # MMF_OM3, MMF_OM4, SMF_G652, BTB, etc.
    'fiber_length_m': 'float32',      # Fiber length in meters (0 = back-to-back)
    'fec_type': 'category',           # KP4, KR4, None, pre-FEC, post-FEC
    'measurement_setup': 'category',  # Lab identifier or setup description
}

# REQUIRED performance metrics (at least 1 must be present)
performance_metrics = {
    'ber': 'float64',                 # Bit error rate (needs float64 for 1e-12 precision)
    'snr_dB': 'float32',             # Signal-to-noise ratio in dB
    'power_penalty_dB': 'float32',   # Power penalty vs back-to-back in dB
    'sensitivity_dBm': 'float32',    # Receiver sensitivity at target BER in dBm
    'eye_height_mV': 'float32',      # Eye diagram vertical opening in mV
    'eye_width_ps': 'float32',       # Eye diagram horizontal opening in ps
}

# OPTIONAL device parameters
device_parameters = {
    'threshold_current_mA': 'float32',    # Laser threshold current
    'slope_efficiency_W_A': 'float32',    # Laser slope efficiency
    'bandwidth_3dB_GHz': 'float32',       # Small-signal modulation bandwidth
    'oxide_aperture_um': 'float32',       # VCSEL oxide aperture diameter
    'bias_current_mA': 'float32',         # Operating bias current
    'rin_dB_Hz': 'float32',               # Relative intensity noise
    'extinction_ratio_dB': 'float32',     # Transmitter on/off ratio
}

# OPTIONAL system parameters
system_parameters = {
    'link_budget_dB': 'float32',          # Total link power budget
    'total_loss_dB': 'float32',           # Total link loss
    'receiver_sensitivity_dBm': 'float32', # Receiver sensitivity
    'launch_power_dBm': 'float32',        # Transmitter output power
    'energy_efficiency_pJ_bit': 'float32', # Energy per bit
}
```

### Data Quality Flags

| Flag | Meaning |
|------|---------|
| VERIFIED | Data extracted from paper, cross-checked with figures/tables, units confirmed |
| PARTIAL | Only partial data extractable (document what's missing and why) |
| INACCESSIBLE | Data claimed but not available (behind paywall, link broken, supplementary missing) |
| NEEDS_PROCESSING | Raw data available but requires digitization or conversion |
| SCHEMA_VIOLATION | Data exists but violates contract (specify which fields) |
| ESTIMATED | Value estimated from figure (not tabulated) — record estimation method |

### Schema Violation Triage

When data violates the contract:

| Violation | Severity | Fix |
|-----------|----------|-----|
| Missing temperature_C | P0 — Critical | Cannot compare VCSEL performance without temperature; extract from paper text or flag INACCESSIBLE |
| Missing modulation_format | P0 — Critical | BER is meaningless without knowing modulation; must be specified |
| BER without FEC specification | P0 — Critical | Pre-FEC and post-FEC BER differ by orders of magnitude; clarify from paper |
| Missing fiber_length_m | P1 — Major | Assume BTB if not stated, but flag in ASSUMPTION-REGISTER.md |
| Missing device_type | P1 — Major | Extract from paper title/abstract; if truly unknown, flag |
| Inconsistent units | P2 — Minor | Convert with measurement-normalizer (see assets/obs-normalizer.md) |
| Missing data_rate_Gbps | P1 — Major | Often inferable from modulation + baud rate; document conversion |
| BER from figure only | P2 — Minor | Digitize from figure, record as ESTIMATED with method description |
| Missing error bars | P2 — Minor | Note in ASSUMPTION-REGISTER.md; affects confidence (K component) |

## Supplementary Material Extraction

For each paper with relevant data:

```markdown
## Supplementary Material Log

**Paper:** [Full title]
**DOI:** [doi]
**Journal/Conference:** [journal or conference name (IEEE, OFC, ECOC, etc.)]
**Year:** [publication year]

**Data extracted from:**
- [ ] Table 1 — Device parameters (extracted / not accessible)
- [ ] Table 2 — BER performance at different data rates (extracted / not accessible)
- [ ] Figure 3 — BER waterfall curve (digitized / not digitizable)
- [ ] Figure 5 — Eye diagrams (qualitative assessment only)
- [ ] Supplementary — S-parameter data (extracted / not accessible)

**Operating conditions reported:**
- Temperature: [specified / range / not reported]
- Bias current: [specified / range / not reported]
- Launch power: [specified / not reported]

**Extraction notes:**
- Table 1: N device variants, columns: [list], key parameters: [...]
- Figure 3: Digitized N points per curve, BER range [1e-2 to 1e-12]
- Missing: [what data is referenced but not extractable]

**Extraction completeness:** FULL / PARTIAL (reason)
**Claim IDs populated:** C-xxx, C-yyy
```

## Data Dictionary Protocol (v5.5) — Gate DD0

### The Problem

Column names lie. `output_power` may be peak or average. `bandwidth` may be -3dB electrical or optical. Using a column based on its name alone leads to silent bugs that propagate through the entire pipeline (e.g., mixing pre-FEC and post-FEC BER, hours of wasted work).

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
| study_id | str | "JLT2024-01" | Unique identifier for each source paper | README | YES |
| wavelength_nm | float | 850.0 | Operating wavelength in nanometers | Paper Table 1 | YES |
| ber | float | 2.4e-4 | Bit error rate (pre-FEC unless noted) | Paper Table 2 | YES — confirmed pre-FEC in methods section |
| power_penalty_dB | float | 1.8 | Power penalty vs back-to-back at target BER | Paper Fig. 3 | YES — digitized from figure |
```

### Gate DD0 Check

Before analysis proceeds, verify:
- All columns used in the analysis appear in the data dictionary
- Each column has a verified meaning (not just assumed from name)
- Cross-checks performed where possible (e.g., recomputing a derived value and comparing)

DD0 FAIL → HALT. Document the column before using it.

---

## Cross-Referencing Protocol

When a finding depends on data from multiple papers:

1. Create cross-reference table: which data supports which claim
2. Check for contradictions between datasets (same device type, different reported performance)
3. Note methodological differences (measurement setup, environmental conditions, calibration)
4. Register discrepancies in ASSUMPTION-REGISTER.md if unresolvable
5. **Temperature alignment**: Ensure compared measurements are at same temperature (or note the difference)
6. **FEC alignment**: Ensure compared BER values use same FEC assumption

## Literature Data Sources

Route to appropriate MCP skills for literature search:

### Primary Sources (photonics-specific)
1. **IEEE Xplore** — Primary source for OFC, ECOC, JLT, PTL papers → use `web_search` skill
2. **Optica Publishing** (ex-OSA) — Optics Express, Optics Letters, JOSA B → use `web_search` skill
3. **SPIE Digital Library** — Photonics West, OPTO proceedings → use `web_search` skill
4. **arXiv** (physics.optics, eess.SP) — Preprints → use `openalex-database` skill

### Secondary Sources
5. **Scopus** — Cross-disciplinary search → use `openalex-database` skill
6. **Google Scholar** — Broad search, citation tracking → use `web_search` skill

### Standards and Reference Data
7. **ITU-T** — G.652, G.654, G.694 fiber standards → use `web_search` skill
8. **IEEE 802.3** — Ethernet physical layer standards → use `web_search` skill

### Conference Proceedings (often more current than journals)
- **OFC** (Optical Fiber Communication) — March annually
- **ECOC** (European Conference on Optical Communication) — September annually
- **CLEO** (Conference on Lasers and Electro-Optics) — May annually
- **VCSEL Day** — Specialized workshop, often co-located with SPIE

### NOT to use (bio-specific, irrelevant for photonics)
- ~~pubmed-database~~ — biomedical literature
- ~~biorxiv-database~~ — biology preprints
- ~~cellxgene-census~~ — single-cell genomics
- ~~geo-database~~ — gene expression omnibus

## Data Digitization Protocol

When performance data is available only in figures (common for BER curves, eye diagrams):

1. **Identify figure type**: BER waterfall, eye diagram, S-parameter, bandwidth curve
2. **Record axes**: x-axis (units, range), y-axis (units, range, log/linear)
3. **Extract data points**: Record each point with coordinates and estimated uncertainty
4. **Document method**: "Digitized from Figure X using [method]"
5. **Flag as ESTIMATED** in data quality
6. **Cross-validate**: If table data is also available for some points, compare
7. **Minimum points**: Extract enough points to reconstruct the curve (typically 5-10 per curve)

```markdown
## Digitization Log

**Paper:** [DOI]
**Figure:** Figure 3a — BER vs received optical power at 25°C, 50 Gb/s PAM4

**Axes:**
- X: Received optical power (dBm), range [-12, 0]
- Y: BER (log scale), range [1e-2, 1e-12]

**Extracted points:**
| Power (dBm) | BER | Uncertainty |
|-------------|-----|-------------|
| -2.0 | 1.0e-2 | ±0.5 dB |
| -4.0 | 3.2e-4 | ±0.5 dB |
| -5.5 | 1.0e-6 | ±0.5 dB |
| -7.0 | 2.1e-9 | ±0.5 dB |
| -8.0 | 1.0e-12 | ±0.5 dB |

**FEC threshold marked:** KP4 at BER = 2.4e-4 (−3.8 dBm)
**Back-to-back reference:** Yes, also digitized
```
