# MCP Server Template

Template for creating Vibe Science MCP servers.

## Project Structure

```
vibe-science-mcp-{database}/
├── pyproject.toml
├── README.md
├── src/
│   └── vibe_{database}_mcp/
│       ├── __init__.py
│       ├── server.py           # MCP server entry point
│       ├── client.py           # API client
│       ├── auth.py             # Authentication
│       ├── cache.py            # Local caching
│       └── models.py           # Data models
└── tests/
    └── test_client.py
```

## pyproject.toml

```toml
[project]
name = "vibe-{database}-mcp"
version = "0.1.0"
description = "MCP server for {Database} academic database"
requires-python = ">=3.10"
dependencies = [
    "mcp>=1.0.0",
    "httpx>=0.27.0",
    "pydantic>=2.0.0",
]

[project.scripts]
vibe-{database}-mcp = "vibe_{database}_mcp.server:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

## server.py - MCP Entry Point

```python
"""MCP server for {Database} academic database."""

import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from .client import {Database}Client
from .models import SearchResult, Document

# Initialize
server = Server("vibe-{database}-mcp")
client = {Database}Client()


# ============================================
# TOOLS
# ============================================

@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="{database}_search",
            description="Search {Database} for academic papers",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results (default 25)",
                        "default": 25
                    },
                    "year_from": {
                        "type": "integer",
                        "description": "Filter by year (from)"
                    },
                    "year_to": {
                        "type": "integer",
                        "description": "Filter by year (to)"
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="{database}_get_document",
            description="Get full document by ID",
            inputSchema={
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "Document ID"
                    }
                },
                "required": ["doc_id"]
            }
        ),
        Tool(
            name="{database}_get_citations",
            description="Get citing papers for a document",
            inputSchema={
                "type": "object",
                "properties": {
                    "doc_id": {
                        "type": "string",
                        "description": "Document ID"
                    },
                    "limit": {
                        "type": "integer",
                        "default": 50
                    }
                },
                "required": ["doc_id"]
            }
        ),
        Tool(
            name="{database}_export_bibtex",
            description="Export results as BibTeX",
            inputSchema={
                "type": "object",
                "properties": {
                    "doc_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of document IDs"
                    }
                },
                "required": ["doc_ids"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""

    if name == "{database}_search":
        results = await client.search(
            query=arguments["query"],
            limit=arguments.get("limit", 25),
            year_from=arguments.get("year_from"),
            year_to=arguments.get("year_to")
        )
        return [TextContent(type="text", text=results.to_json())]

    elif name == "{database}_get_document":
        doc = await client.get_document(arguments["doc_id"])
        return [TextContent(type="text", text=doc.to_json())]

    elif name == "{database}_get_citations":
        citations = await client.get_citations(
            doc_id=arguments["doc_id"],
            limit=arguments.get("limit", 50)
        )
        return [TextContent(type="text", text=citations.to_json())]

    elif name == "{database}_export_bibtex":
        bibtex = await client.export_bibtex(arguments["doc_ids"])
        return [TextContent(type="text", text=bibtex)]

    else:
        raise ValueError(f"Unknown tool: {name}")


# ============================================
# MAIN
# ============================================

def main():
    """Run the MCP server."""
    asyncio.run(stdio_server(server))


if __name__ == "__main__":
    main()
```

## client.py - API Client

```python
"""API client for {Database}."""

import os
import httpx
from typing import Optional
from .models import SearchResult, Document, Citation
from .cache import CacheManager
from .auth import get_auth_headers


class {Database}Client:
    """Client for {Database} API."""

    BASE_URL = "https://api.example.com/v1"  # Replace with actual URL

    def __init__(self):
        self.api_key = os.environ.get("{DATABASE}_API_KEY")
        self.cache = CacheManager()
        self._client = httpx.AsyncClient(timeout=30.0)

    async def search(
        self,
        query: str,
        limit: int = 25,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None
    ) -> SearchResult:
        """Search for papers."""

        # Check cache
        cache_key = f"search:{query}:{limit}:{year_from}:{year_to}"
        cached = self.cache.get(cache_key)
        if cached:
            return SearchResult.from_dict(cached)

        # Build request
        params = {
            "query": query,
            "count": limit
        }
        if year_from:
            params["date"] = f"{year_from}-{year_to or 2099}"

        # Make request
        response = await self._client.get(
            f"{self.BASE_URL}/search",
            headers=get_auth_headers(self.api_key),
            params=params
        )
        response.raise_for_status()

        # Parse and cache
        result = SearchResult.from_api_response(response.json())
        self.cache.set(cache_key, result.to_dict())

        return result

    async def get_document(self, doc_id: str) -> Document:
        """Get full document by ID."""

        cache_key = f"doc:{doc_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return Document.from_dict(cached)

        response = await self._client.get(
            f"{self.BASE_URL}/documents/{doc_id}",
            headers=get_auth_headers(self.api_key)
        )
        response.raise_for_status()

        doc = Document.from_api_response(response.json())
        self.cache.set(cache_key, doc.to_dict())

        return doc

    async def get_citations(self, doc_id: str, limit: int = 50) -> list[Citation]:
        """Get papers citing this document."""

        response = await self._client.get(
            f"{self.BASE_URL}/documents/{doc_id}/citations",
            headers=get_auth_headers(self.api_key),
            params={"limit": limit}
        )
        response.raise_for_status()

        return [Citation.from_api_response(c) for c in response.json()["citations"]]

    async def export_bibtex(self, doc_ids: list[str]) -> str:
        """Export documents as BibTeX."""

        bibtex_entries = []
        for doc_id in doc_ids:
            doc = await self.get_document(doc_id)
            bibtex_entries.append(doc.to_bibtex())

        return "\n\n".join(bibtex_entries)
```

## auth.py - Authentication

```python
"""Authentication handling."""

import os
from typing import Optional


def get_auth_headers(api_key: Optional[str] = None) -> dict:
    """Get authentication headers."""

    if not api_key:
        api_key = os.environ.get("{DATABASE}_API_KEY")

    if not api_key:
        raise ValueError("{DATABASE}_API_KEY not set")

    return {
        "Authorization": f"Bearer {api_key}",
        # Or for X-ApiKey style:
        # "X-ApiKey": api_key,
        "Accept": "application/json"
    }
```

## cache.py - Local Caching

```python
"""Local cache for API responses."""

import json
import time
from pathlib import Path
from typing import Optional


class CacheManager:
    """File-based cache with TTL."""

    def __init__(self, cache_dir: Optional[Path] = None, ttl: int = 86400):
        self.cache_dir = cache_dir or Path.home() / ".vibe-science" / "cache" / "{database}"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl  # Default 24 hours

    def _key_to_path(self, key: str) -> Path:
        """Convert cache key to file path."""
        safe_key = key.replace(":", "_").replace("/", "_")[:100]
        return self.cache_dir / f"{safe_key}.json"

    def get(self, key: str) -> Optional[dict]:
        """Get cached value if not expired."""
        path = self._key_to_path(key)

        if not path.exists():
            return None

        with open(path) as f:
            data = json.load(f)

        if time.time() - data["timestamp"] > self.ttl:
            path.unlink()
            return None

        return data["value"]

    def set(self, key: str, value: dict):
        """Cache value with timestamp."""
        path = self._key_to_path(key)

        with open(path, "w") as f:
            json.dump({
                "timestamp": time.time(),
                "value": value
            }, f)

    def invalidate(self, pattern: str = "*"):
        """Invalidate matching cache entries."""
        for path in self.cache_dir.glob(f"{pattern}.json"):
            path.unlink()
```

## models.py - Data Models

```python
"""Data models for {Database}."""

import json
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class Document:
    """Academic document."""
    id: str
    title: str
    authors: list[str]
    abstract: Optional[str]
    doi: Optional[str]
    year: int
    journal: Optional[str]
    volume: Optional[str]
    pages: Optional[str]
    citations_count: int = 0

    @classmethod
    def from_api_response(cls, data: dict) -> "Document":
        """Parse from API response."""
        # Adapt to actual API response format
        return cls(
            id=data["id"],
            title=data["title"],
            authors=data.get("authors", []),
            abstract=data.get("abstract"),
            doi=data.get("doi"),
            year=data.get("year", 0),
            journal=data.get("journal"),
            volume=data.get("volume"),
            pages=data.get("pages"),
            citations_count=data.get("citedby_count", 0)
        )

    @classmethod
    def from_dict(cls, data: dict) -> "Document":
        return cls(**data)

    def to_dict(self) -> dict:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)

    def to_bibtex(self) -> str:
        """Export as BibTeX entry."""
        authors_str = " and ".join(self.authors)
        return f"""@article{{{self.id},
  title = {{{self.title}}},
  author = {{{authors_str}}},
  journal = {{{self.journal or 'Unknown'}}},
  year = {{{self.year}}},
  volume = {{{self.volume or ''}}},
  pages = {{{self.pages or ''}}},
  doi = {{{self.doi or ''}}}
}}"""


@dataclass
class SearchResult:
    """Search results container."""
    total: int
    documents: list[Document]
    query: str

    @classmethod
    def from_api_response(cls, data: dict) -> "SearchResult":
        return cls(
            total=data.get("total", 0),
            documents=[Document.from_api_response(d) for d in data.get("results", [])],
            query=data.get("query", "")
        )

    @classmethod
    def from_dict(cls, data: dict) -> "SearchResult":
        return cls(
            total=data["total"],
            documents=[Document.from_dict(d) for d in data["documents"]],
            query=data["query"]
        )

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "documents": [d.to_dict() for d in self.documents],
            "query": self.query
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


@dataclass
class Citation:
    """Citation reference."""
    citing_doc_id: str
    citing_title: str
    citing_authors: list[str]
    citing_year: int

    @classmethod
    def from_api_response(cls, data: dict) -> "Citation":
        return cls(
            citing_doc_id=data["id"],
            citing_title=data["title"],
            citing_authors=data.get("authors", []),
            citing_year=data.get("year", 0)
        )
```

## Claude Code Configuration

Add to Claude Code settings:

```json
{
  "mcpServers": {
    "vibe-{database}": {
      "command": "uv",
      "args": ["run", "vibe-{database}-mcp"],
      "env": {
        "{DATABASE}_API_KEY": "${env:{DATABASE}_API_KEY}"
      }
    }
  }
}
```

## Implementation Checklist

When implementing a new MCP server:

- [ ] Copy this template
- [ ] Replace `{database}` with actual name (e.g., `scopus`)
- [ ] Replace `{Database}` with capitalized name (e.g., `Scopus`)
- [ ] Replace `{DATABASE}` with uppercase (e.g., `SCOPUS`)
- [ ] Update BASE_URL in client.py
- [ ] Adapt auth.py to actual auth method
- [ ] Adapt models.py to actual API response format
- [ ] Add database-specific tools as needed
- [ ] Test with actual API
- [ ] Document rate limits
