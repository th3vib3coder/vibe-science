# Torrossa API Configuration

Configuration for Casalini Torrossa database access.

## ⚠️ IMPORTANT: LIMITED API

**Torrossa has limited or no public REST API.**

Access primarily via:
1. **Web interface** (VPN required) - https://www.torrossa.com/
2. **OAI-PMH** (metadata harvesting)
3. **MARC records** (library integration)

## What Torrossa Provides

- Italian and European academic books
- E-books (full text with subscription)
- Journals (selected Italian publishers)
- Conference proceedings
- Book chapters

## OAI-PMH Access

Torrossa may expose metadata via OAI-PMH:

```python
# OAI-PMH base URL (verify if available)
OAI_BASE = "https://www.torrossa.com/oai"

def torrossa_list_records(set_spec: str = None):
    """Harvest metadata via OAI-PMH."""
    params = {
        "verb": "ListRecords",
        "metadataPrefix": "oai_dc"
    }
    if set_spec:
        params["set"] = set_spec

    response = requests.get(OAI_BASE, params=params)
    return response.text  # XML response
```

## Practical Workflow for Vibe Science

Since full-text API access is limited:

### Step 1: Human searches web interface
```
1. Connect to UNIPI VPN
2. Go to https://www.torrossa.com/
3. Login via institutional access
4. Search for books/chapters
5. Download PDFs or export metadata
```

### Step 2: Claude processes results
```python
# Parse exported metadata
def parse_torrossa_export(file_path: str):
    """Parse Torrossa export."""
    # Handle CSV, BibTeX, or RIS format
    pass

# Or extract from downloaded PDF
def extract_from_pdf(pdf_path: str):
    """Extract text from downloaded PDF."""
    pass
```

## Data Structure

```json
{
  "record_id": "torrossa-12345",
  "title": "Metodologie di ricerca in biologia",
  "authors": ["Rossi, Mario"],
  "publisher": "Il Mulino",
  "year": 2020,
  "isbn": "978-88-15-12345-6",
  "type": "book",
  "language": "ita",
  "subjects": ["biologia", "metodologia"],
  "toc": ["Cap 1: Introduzione", "Cap 2: Metodi"],
  "access": "full_text_via_vpn"
}
```

## Use Cases in Vibe Science

1. **Italian scholarly literature** - Books not in Scopus/WoS
2. **Humanities/Social sciences** - Better coverage than STEM databases
3. **Book chapters** - Granular access to edited volumes

## Status

- **API Available:** ⚠️ Limited (OAI-PMH for metadata)
- **Full Text API:** ❌ No (web download only)
- **Priority:** Phase 3 (specialized)
- **VPN Required:** Yes for full access
- **MCP Server:** Limited to metadata harvesting
- **Workaround:** Human download + Claude parse
