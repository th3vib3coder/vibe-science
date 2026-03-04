# Journal Citation Reports API Configuration

Configuration for Clarivate JCR access.

## API Overview

JCR provides:
- Journal Impact Factor (JIF)
- Journal Citation Indicator (JCI)
- Eigenfactor Score
- Category rankings
- Historical trends

## Access Method

JCR data is available via:
1. **Web interface** (VPN) - https://jcr.clarivate.com/
2. **Web of Science API** (includes JCR data)
3. **InCites API** (advanced metrics, separate subscription)

## Authentication

Uses same API key as Web of Science:

```bash
export WOS_API_KEY="your-wos-api-key"
```

## Key Metrics

| Metric | Description |
|--------|-------------|
| JIF | 2-year Impact Factor |
| JIF 5-Year | 5-year average |
| JCI | Category-normalized (cross-field comparable) |
| Eigenfactor | Weighted by citing journal prestige |
| Quartile | Q1-Q4 ranking in category |

## Example Usage

```python
def jcr_get_journal_metrics(issn: str):
    """Get JCR metrics via WoS API."""
    response = requests.get(
        "https://api.clarivate.com/apis/wos-starter/v1/journals",
        headers={"X-ApiKey": WOS_API_KEY},
        params={"issn": issn}
    )
    return response.json()
```

## Use Cases in Vibe Science

1. **Evaluate source quality** - Check if journal is Q1/Q2
2. **Journal selection** - Find best journals for publishing
3. **Track trends** - Is journal impact rising/falling?

## Status

- **API Available:** ⚠️ Via WoS API (depends on WoS key)
- **Priority:** Phase 2
- **VPN Required:** Yes
- **Note:** Verify WoS API includes JCR data for UNIPI subscription
