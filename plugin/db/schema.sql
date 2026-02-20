-- plugin/db/schema.sql
-- Vibe Science v6.0 NEXUS — Complete Database Schema

-- =====================================================
-- CORE: Sessions and Actions
-- =====================================================

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_path TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
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
    action_type TEXT NOT NULL,  -- DATA_LOAD, FEATURE_EXTRACTION, MODEL_TRAIN, etc.
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
    narrative TEXT,  -- Descrizione umana dell'evento
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
    j0_dimensions TEXT,  -- JSON: {specificity: N, counter_evidence: N, ...}
    sfi_injected INTEGER DEFAULT 0,
    sfi_caught INTEGER DEFAULT 0,
    sfi_missed TEXT,  -- JSON array of missed fault IDs
    r2_weaknesses TEXT,  -- JSON array: cio' che R2 ha mancato (per calibration)
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
    details TEXT,  -- JSON con check specifici
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_gates_session ON gate_checks(session_id);
CREATE INDEX IF NOT EXISTS idx_gates_claim ON gate_checks(claim_id);

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
    key_papers TEXT,               -- JSON array di DOI/PMID/titoli
    search_layer TEXT NOT NULL,    -- MCP / SKILL / RAG / MANUAL / WEBSEARCH
    gate_context TEXT,             -- L1_PRE_DIRECTION / OTAE_CONTINUOUS / AD_HOC
    timestamp TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_lit_session ON literature_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_lit_layer ON literature_searches(search_layer);

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
    r2_verdict TEXT,
    stage_at_resolution INTEGER,
    session_id TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_calibration_claim ON calibration_log(claim_id);

-- =====================================================
-- PROMPT LOG: Audit trail
-- =====================================================

CREATE TABLE IF NOT EXISTS prompt_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_role TEXT,
    prompt_hash TEXT NOT NULL,  -- SHA-256, non il prompt intero (privacy)
    timestamp TEXT NOT NULL
);

-- =====================================================
-- EMBEDDINGS: sqlite-vec virtual table
-- =====================================================

-- NOTE: vec_memories requires the sqlite-vec extension to be loaded.
-- This table is created by setup.js after loading the extension.
-- Included here for documentation; will be skipped if sqlite-vec
-- is not available (CREATE VIRTUAL TABLE does not support IF NOT EXISTS
-- in all sqlite-vec versions).

-- CREATE VIRTUAL TABLE vec_memories USING vec0(
--     embedding float[384],  -- all-MiniLM-L6-v2 dimension
--     +text TEXT,
--     +metadata TEXT,
--     +project_path TEXT,
--     +created_at TEXT
-- );

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
