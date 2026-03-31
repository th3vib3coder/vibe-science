-- plugin/db/schema.sql
-- Vibe Science v7.0 TRACE — Complete Database Schema

-- =====================================================
-- CORE: Sessions and Actions
-- =====================================================

CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    integrity_status TEXT NOT NULL DEFAULT 'INTEGRITY_OK',
    integrity_notes TEXT,
    narrative_summary TEXT,
    total_actions INTEGER DEFAULT 0,
    claims_created INTEGER DEFAULT 0,
    claims_killed INTEGER DEFAULT 0,
    gates_passed INTEGER DEFAULT 0,
    gates_failed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS spine_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    timestamp TEXT NOT NULL,
    action_type TEXT NOT NULL,  -- DATA_LOAD, EXTRACT, MODEL_TRAIN, CALIBRATION, etc.
    tool_name TEXT,
    input_summary TEXT,
    output_summary TEXT,
    agent_role TEXT,
    gate_result TEXT,  -- PASS/WARN/FAIL/NULL
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_spine_session ON spine_entries(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_spine_action ON spine_entries(action_type);

-- =====================================================
-- CLAIMS: Full lifecycle tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS claim_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    -- event_type: CREATED, PROMOTED, KILLED, DISPUTED, VERIFIED,
    --             R2_REVIEWED, GATE_PASSED, GATE_FAILED,
    --             CONFIDENCE_UPDATED, CONFOUNDER_TESTED
    old_status TEXT,
    new_status TEXT,
    confidence REAL,
    r2_verdict TEXT,  -- ACCEPT/REJECT/DEFER/NULL
    kill_reason TEXT,  -- INSUFFICIENT_EVIDENCE/CONFOUNDED/ARTIFACT/LOGICALLY_FALSE/NULL
    gate_id TEXT,
    narrative TEXT,  -- Human-readable event description
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_claims_id ON claim_events(claim_id);
CREATE INDEX IF NOT EXISTS idx_claims_session ON claim_events(session_id);

-- =====================================================
-- R2: Review quality tracking (per auto-calibration)
-- =====================================================

CREATE TABLE IF NOT EXISTS r2_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id TEXT NOT NULL UNIQUE,
    session_id TEXT NOT NULL,
    review_mode TEXT NOT NULL,  -- INLINE/FORCED/BATCH/SHADOW/BRAINSTORM
    claims_reviewed TEXT NOT NULL,  -- JSON array of claim_ids
    j0_score INTEGER,  -- R3 Judge total score (NULL if not FORCED)
    j0_dimensions TEXT,  -- JSON: {specificity: N, counter_evidence_search: N, confounder_analysis: N, falsification_demand: N, independence: N, escalation: N}
    sfi_injected INTEGER DEFAULT 0,
    sfi_caught INTEGER DEFAULT 0,
    sfi_missed TEXT,  -- JSON array of missed fault IDs
    r2_weaknesses TEXT,  -- JSON array: what R2 missed (for calibration)
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_r2_session ON r2_reviews(session_id);

-- =====================================================
-- SERENDIPITY: Seed survival across sessions
-- =====================================================

CREATE TABLE IF NOT EXISTS serendipity_seeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seed_id TEXT NOT NULL UNIQUE,
    created_session TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_TRIAGE',
    -- PENDING_TRIAGE, QUEUED, TESTING, KILLED, PROMOTED_TO_CLAIM
    source TEXT NOT NULL,  -- SCANNER/SALVAGED_FROM_R2/CROSS_BRANCH/USER
    score REAL,
    causal_question TEXT,
    discriminating_test TEXT,
    fallback_test TEXT,
    narrative TEXT,
    source_claim_id TEXT,
    last_reviewed_session TEXT,
    resolution TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (created_session) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_seeds_status ON serendipity_seeds(status);

-- =====================================================
-- GATES: Enforcement tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS gate_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    gate_id TEXT NOT NULL,  -- DQ1, DQ2, DQ3, DQ4, DC0, DD0, L-1, G0-G6, etc.
    claim_id TEXT,
    status TEXT NOT NULL,  -- PASS/WARN/FAIL
    checks_passed INTEGER,
    checks_warned INTEGER,
    checks_failed INTEGER,
    details TEXT,  -- JSON with specific check details
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_gates_session ON gate_checks(session_id);
CREATE INDEX IF NOT EXISTS idx_gates_claim ON gate_checks(claim_id);

-- =====================================================
-- GOVERNANCE: Append-only audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS governance_events (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES sessions(id),
    event_type TEXT NOT NULL,
    tool_name TEXT,
    severity TEXT,  -- info / warning / critical
    details TEXT,
    timestamp REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_governance_session ON governance_events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_event_type ON governance_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_governance_timestamp ON governance_events(timestamp);

CREATE TRIGGER IF NOT EXISTS governance_events_no_update
BEFORE UPDATE ON governance_events
BEGIN
    SELECT RAISE(ABORT, 'governance_events is append-only');
END;

CREATE TRIGGER IF NOT EXISTS governance_events_no_delete
BEFORE DELETE ON governance_events
BEGIN
    SELECT RAISE(ABORT, 'governance_events is append-only');
END;

-- =====================================================
-- LITERATURE: Search tracking per L-1+ enforcement
-- =====================================================

CREATE TABLE IF NOT EXISTS literature_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    query TEXT NOT NULL,
    sources TEXT NOT NULL,         -- JSON array: ["pubmed", "biorxiv"]
    results_count INTEGER,
    relevant_count INTEGER,
    key_papers TEXT,               -- JSON array of DOI/PMID/titles
    search_layer TEXT NOT NULL,    -- MCP / SKILL / RAG / MANUAL / WEBSEARCH
    gate_context TEXT,             -- L1_PRE_DIRECTION / OTAE_CONTINUOUS / AD_HOC
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_lit_session ON literature_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_lit_layer ON literature_searches(search_layer);

-- =====================================================
-- CITATIONS: Extraction + verification persistence
-- =====================================================

CREATE TABLE IF NOT EXISTS citation_checks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citation_id TEXT NOT NULL,
    session_id TEXT,
    claim_id TEXT,
    raw_ref TEXT NOT NULL,
    citation_text TEXT,
    citation_type TEXT NOT NULL,    -- DOI / PMID / ARXIV / URL / OTHER
    normalized_id TEXT,
    doi TEXT,
    pmid TEXT,
    arxiv_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING',
    -- PENDING / VERIFIED / UNRESOLVED / RETRACTED / ERROR
    verification_method TEXT,       -- web_fetch / database_lookup / manual
    resolver TEXT,                  -- DOI_ORG / CROSSREF / PUBMED / ARXIV / MANUAL
    source_url TEXT,
    resolved_title TEXT,
    title TEXT,                     -- legacy mirror for backward compatibility
    resolved_source_type TEXT,      -- peer_reviewed / preprint / conference / technical_report / other
    retraction_status TEXT,         -- RETRACTED / CLEAR / UNKNOWN / NULL
    resolved_payload TEXT,
    http_status INTEGER,
    http_status_code INTEGER,
    checked_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_citations_session ON citation_checks(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_citations_status ON citation_checks(verification_status);
CREATE INDEX IF NOT EXISTS idx_citations_claim ON citation_checks(claim_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_citations_lookup ON citation_checks(citation_type, normalized_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_dedupe ON citation_checks(citation_id);

-- =====================================================
-- OBSERVER: Alert tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS observer_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_path TEXT NOT NULL,
    level TEXT NOT NULL,  -- INFO/WARN/HALT
    message TEXT NOT NULL,
    resolved INTEGER DEFAULT 0,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observer_project ON observer_alerts(project_path, resolved);

-- =====================================================
-- CALIBRATION: R5.5-01 (Confidence calibration log)
-- =====================================================

CREATE TABLE IF NOT EXISTS calibration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT NOT NULL,
    predicted_confidence REAL NOT NULL,
    actual_outcome TEXT NOT NULL,  -- VERIFIED/REJECTED/ARTIFACT/CONFOUNDED/ROBUST
    r2_verdict TEXT,               -- ACCEPT/REJECT/DEFER (from claim_events at resolution time)
    stage_at_resolution INTEGER,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_calibration_claim ON calibration_log(claim_id);

-- =====================================================
-- PROMPT LOG: Audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_role TEXT,
    prompt_hash TEXT NOT NULL,  -- SHA-256, not the full prompt (privacy)
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_prompt_session ON prompt_log(session_id);

-- =====================================================
-- EMBEDDINGS: sqlite-vec virtual table
-- =====================================================

-- NOTE: vec_memories requires the sqlite-vec extension to be loaded.
-- This table is created by setup.js / worker-embed.js after loading the
-- extension. Included here for documentation because vec0 support is
-- optional in the runtime.

-- CREATE VIRTUAL TABLE vec_memories USING vec0(
--     embedding float[384],  -- all-MiniLM-L6-v2 dimension
--     +text TEXT,
--     +metadata TEXT,
--     +project_path TEXT,
--     +created_at TEXT
-- );

-- Tier 0 retrieval foundation: curated keyword-ranked memory index.
-- FTS5 is built into SQLite in the supported runtime and does not add
-- native dependencies. Metadata columns remain UNINDEXED to keep the
-- v7 baseline simple while preserving provenance.
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    text,
    source_key UNINDEXED,
    source_type UNINDEXED,
    source_id UNINDEXED,
    session_id UNINDEXED,
    project_path UNINDEXED,
    created_at UNINDEXED,
    tokenize = "porter unicode61 tokenchars '-_'"
);

-- Fallback table when sqlite-vec is not available.
-- Created by worker-embed.js at runtime, defined here for documentation.
-- Counted in the 16 schema-defined regular table definitions, but optional at
-- runtime because deployments using sqlite-vec may rely on vec_memories instead.
CREATE TABLE IF NOT EXISTS memory_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    embedding BLOB NOT NULL,
    metadata TEXT,
    project_path TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_membed_project ON memory_embeddings(project_path, created_at);

-- =====================================================
-- EMBED QUEUE: Async embedding processing (worker)
-- =====================================================

CREATE TABLE IF NOT EXISTS embed_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL,
    processed INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_embed_pending ON embed_queue(processed) WHERE processed = 0;

-- =====================================================
-- PATTERNS: Cross-session research pattern extraction
-- =====================================================

CREATE TABLE IF NOT EXISTS research_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pattern_type TEXT NOT NULL,
    -- GATE_FAILURE_CLUSTER, REPEATED_ACTION, CLAIM_LIFECYCLE
    description TEXT NOT NULL,
    evidence TEXT NOT NULL,          -- JSON array of supporting observations
    confidence REAL NOT NULL,        -- 0.0-1.0, decays -0.02/week
    occurrences INTEGER DEFAULT 1,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    project_path TEXT NOT NULL,
    active INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_patterns_project ON research_patterns(project_path, active);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON research_patterns(pattern_type);

-- ═══════════════════════════════════════════════
-- v6.0: Benchmark & Eval Tracking
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS benchmark_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL,
  skill_version TEXT NOT NULL,
  eval_case TEXT NOT NULL,
  category TEXT NOT NULL,
  passed INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  token_count INTEGER,
  notes TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bench_version ON benchmark_runs(skill_version);
CREATE INDEX IF NOT EXISTS idx_bench_case ON benchmark_runs(eval_case);
CREATE INDEX IF NOT EXISTS idx_bench_run ON benchmark_runs(run_id);
