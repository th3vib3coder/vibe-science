# Esp@cenet API Configuration

Configuration for European Patent Office Open Patent Services.

## API Overview

Esp@cenet provides:
- Patent search (worldwide coverage)
- Full patent documents
- Patent families
- Legal status
- Citation data

## Authentication

### Free Tier (Anonymous)
```python
# No authentication needed for basic search
# Rate limited to 4 requests/minute
```

### Registered (Recommended)
```bash
# Register at: https://developers.epo.org/
export EPO_CONSUMER_KEY="your-consumer-key"
export EPO_CONSUMER_SECRET="your-consumer-secret"
```

### OAuth Token
```python
import requests
import base64

def get_epo_token():
    """Get OAuth token for EPO API."""
    credentials = base64.b64encode(
        f"{EPO_CONSUMER_KEY}:{EPO_CONSUMER_SECRET}".encode()
    ).decode()

    response = requests.post(
        "https://ops.epo.org/3.2/auth/accesstoken",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data="grant_type=client_credentials"
    )
    return response.json()["access_token"]
```

## Base URL

```
https://ops.epo.org/3.2/rest-services/
```

## Endpoints

### Search
```python
# CQL search
GET /published-data/search/biblio?q={query}

# Query examples
q = "ta=CRISPR"           # Title/Abstract
q = "pa=university"       # Applicant
q = "in=smith"            # Inventor
q = "pd=2020"             # Publication date
```

### Retrieve
```python
# Get patent document
GET /published-data/publication/epodoc/{document_id}/biblio
GET /published-data/publication/epodoc/{document_id}/claims
GET /published-data/publication/epodoc/{document_id}/description

# Document ID format: EP1234567 or US20200123456
```

### Patent Family
```python
# Get all family members
GET /family/publication/epodoc/{document_id}
```

## Example Code

```python
import requests

def espacenet_search(query: str, limit: int = 25):
    """Search Esp@cenet for patents."""

    token = get_epo_token()

    response = requests.get(
        "https://ops.epo.org/3.2/rest-services/published-data/search/biblio",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        },
        params={
            "q": query,
            "Range": f"1-{limit}"
        }
    )
    return response.json()

def espacenet_get_patent(doc_id: str):
    """Get full patent document."""

    token = get_epo_token()

    response = requests.get(
        f"https://ops.epo.org/3.2/rest-services/published-data/publication/epodoc/{doc_id}/biblio",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json"
        }
    )
    return response.json()
```

## Rate Limits

| Tier | Requests/minute | Daily Limit |
|------|-----------------|-------------|
| Anonymous | 4 | Unknown |
| Registered | 60 | 10,000 |

## Use Cases in Vibe Science

1. **Prior art search** - Check if methodology is patented
2. **Technology landscape** - What's being patented in field?
3. **Competitor analysis** - Who's patenting what?

## Status

- **API Available:** ✅ Yes (Open Patent Services)
- **Priority:** Phase 3 (specialized)
- **VPN Required:** No (public API)
- **MCP Server:** Feasible
