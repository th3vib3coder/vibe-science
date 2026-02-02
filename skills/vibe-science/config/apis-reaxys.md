# Reaxys API Configuration

Configuration for Elsevier Reaxys database access.

## ⚠️ IMPORTANT: NO REST API

**Reaxys does NOT have a simple REST API like Scopus.**

Access methods:
1. **Web interface** (VPN required) - https://www.reaxys.com/
2. **KNIME integration** (programmatic)
3. **Export + Parse** (manual workflow)

## What Reaxys Provides

- Chemical reaction search
- Compound/substance search
- Synthesis route planning
- Property data
- Literature references for reactions

## Practical Workflow for Vibe Science

Since there's no REST API, use this workflow:

### Step 1: Human does web search
```
1. Connect to UNIPI VPN
2. Go to https://www.reaxys.com/
3. Login via Shibboleth
4. Execute search
5. Export results (CSV, RD file)
```

### Step 2: Claude parses export
```python
import pandas as pd

def parse_reaxys_export(file_path: str):
    """Parse exported Reaxys data."""
    if file_path.endswith('.csv'):
        return pd.read_csv(file_path)
    # Handle other formats
```

### Step 3: Integrate in research
```markdown
## In /vibe-science:loop

If chemistry data needed:
1. STOP and ask human to query Reaxys
2. Human exports to .vibe-science/data/reaxys-export.csv
3. Claude parses and continues
```

## Data Structures

### Reaction Record
```json
{
  "rxn_id": "RX-123456",
  "reactants": [{"smiles": "Cc1ccccc1", "name": "toluene"}],
  "products": [{"smiles": "c1ccccc1C=O", "name": "benzaldehyde"}],
  "conditions": {"catalyst": "Pd/C", "yield": 85},
  "reference": {"doi": "10.1021/..."}
}
```

## Status

- **API Available:** ❌ NO (web-only)
- **Priority:** Phase 3 (chemistry-specific)
- **VPN Required:** Yes
- **Workaround:** Human export + Claude parse
- **MCP Server:** Not feasible without API
