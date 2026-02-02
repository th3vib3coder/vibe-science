# Web of Science API Configuration

Configuration for Clarivate Web of Science API access.

## API Overview

Web of Science provides:
- Literature search across WoS Core Collection
- Citation analysis (cited/citing references)
- Author and organization profiles
- Journal impact metrics

## Authentication

### API Key

```bash
# Environment variable
export WOS_API_KEY="your-api-key-here"
```

To obtain API key:
1. UNIPI must have Clarivate API access (institutional subscription)
2. Contact UNIPI library for API key provisioning
3. Or apply at: https://developer.clarivate.com/

### Base URLs

```
# Web of Science Starter API (limited)
https://api.clarivate.com/apis/wos-starter/v1/

# Web of Science Expanded API (full access)
https://api.clarivate.com/api/wos/
```

## Headers

```python
HEADERS = {
    "X-ApiKey": WOS_API_KEY,
    "Accept": "application/json"
}
```

## Query Syntax

| Tag | Field | Example |
|-----|-------|---------|
| TS | Topic (title, abstract, keywords) | TS=(machine learning) |
| TI | Title | TI=(neural network) |
| AU | Author | AU=(Smith John) |
| SO | Source (journal name) | SO=(Nature) |
| OG | Organization | OG=(University of Pisa) |
| PY | Publication Year | PY=2020-2024 |
| DT | Document Type | DT=(Article) |
| WC | Web of Science Category | WC=(Biochemistry) |

## Example Queries

```python
import requests
import os

WOS_API_KEY = os.environ["WOS_API_KEY"]
BASE_URL = "https://api.clarivate.com/apis/wos-starter/v1"

def wos_search(query: str, limit: int = 50):
    """Search Web of Science."""
    response = requests.get(
        f"{BASE_URL}/documents",
        headers={"X-ApiKey": WOS_API_KEY},
        params={"q": query, "limit": limit}
    )
    return response.json()

# Usage
results = wos_search("TS=(CRISPR off-target) AND PY=2020-2024")
```

## Rate Limits

| Tier | Requests/sec | Daily Limit |
|------|--------------|-------------|
| Starter | 5 | 50,000 |
| Expanded | 10 | 500,000 |

## Status

- **API Available:** Yes
- **Requires:** Institutional API key (verify with UNIPI)
- **Priority:** Phase 2
- **VPN Required:** Yes for institutional access
