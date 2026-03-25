/**
 * Vibe Science v7.0 TRACE — SQLite Database Wrapper
 *
 * Provides persistent storage for sessions, claims, gates, reviews,
 * serendipity seeds, literature searches, observer alerts, and calibration data.
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 * Database location: ~/.vibe-science/db/vibe-science.db
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Dynamic import: better-sqlite3 requires native compilation.
// If unavailable, all DB functions degrade gracefully (return null/no-op).
let Database = null;
try {
    const mod = await import('better-sqlite3');
    Database = mod.default;
} catch {
    // better-sqlite3 not installed or native build failed — degraded mode
}

// =====================================================
// Default paths
// =====================================================

export const DEFAULT_DB_DIR = path.join(os.homedir(), '.vibe-science', 'db');
export const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'vibe-science.db');
export const DEFAULT_SCHEMA_PATH = path.join(
    import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
    '..', 'db', 'schema.sql'
);

// =====================================================
// Core database functions
// =====================================================

/**
 * Open (or create) the SQLite database file.
 * Enables WAL mode for concurrent read performance.
 *
 * @param {string} [dbPath] - Path to the database file. Defaults to ~/.vibe-science/db/vibe-science.db
 * @returns {import('better-sqlite3').Database} The database instance
 */
export function openDB(dbPath = DEFAULT_DB_PATH) {
    if (!Database) return null; // graceful degradation: no native module

    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');

    // Enable foreign key enforcement
    db.pragma('foreign_keys = ON');

    return db;
}

/**
 * Initialize the database by executing the schema SQL file.
 * All tables use CREATE TABLE IF NOT EXISTS, so this is safe to call multiple times.
 *
 * @param {import('better-sqlite3').Database} db - The database instance
 * @param {string} [schemaPath] - Path to the schema.sql file
 */
export function initDB(db, schemaPath = DEFAULT_SCHEMA_PATH) {
    if (!db) return; // graceful degradation
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
}

/**
 * Close the database connection gracefully.
 *
 * @param {import('better-sqlite3').Database} db - The database instance
 */
export function closeDB(db) {
    if (db && db.open) {
        db.close();
    }
}

// =====================================================
// Prepared statement cache
// =====================================================

// We use a WeakMap keyed by db instance to cache prepared statements
// so they are cleaned up when the db is garbage collected.
const stmtCache = new WeakMap();

/**
 * Get or create a cached prepared statement for the given database and SQL.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sql
 * @returns {import('better-sqlite3').Statement}
 */
function stmt(db, sql) {
    let cache = stmtCache.get(db);
    if (!cache) {
        cache = new Map();
        stmtCache.set(db, cache);
    }
    let prepared = cache.get(sql);
    if (!prepared) {
        prepared = db.prepare(sql);
        cache.set(sql, prepared);
    }
    return prepared;
}

// =====================================================
// Session helpers
// =====================================================

/**
 * Get a session by ID.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {object|undefined} The session row, or undefined if not found
 */
export function getSession(db, sessionId) {
    return stmt(db,
        `SELECT * FROM sessions WHERE id = ?`
    ).get(sessionId);
}

/**
 * Create a new session record.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} sessionData
 * @param {string} sessionData.id - Session UUID
 * @param {string} sessionData.project_path - Absolute path to the project
 * @param {string} [sessionData.started_at] - ISO timestamp (defaults to now)
 * @returns {import('better-sqlite3').RunResult}
 */
export function createSession(db, sessionData) {
    const startedAt = sessionData.started_at || new Date().toISOString();
    return stmt(db,
        `INSERT INTO sessions (id, project_path, started_at, integrity_status, integrity_notes)
         VALUES (?, ?, ?, ?, ?)`
    ).run(
        sessionData.id,
        sessionData.project_path,
        startedAt,
        sessionData.integrity_status ?? 'INTEGRITY_OK',
        sessionData.integrity_notes ?? null,
    );
}

/**
 * Update a session when it ends.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {object} data
 * @param {string} [data.ended_at] - ISO timestamp (defaults to now)
 * @param {string} [data.narrative_summary]
 * @param {number} [data.total_actions]
 * @param {number} [data.claims_created]
 * @param {number} [data.claims_killed]
 * @param {number} [data.gates_passed]
 * @param {number} [data.gates_failed]
 * @param {string} [data.integrity_status]
 * @param {string} [data.integrity_notes]
 * @returns {import('better-sqlite3').RunResult}
 */
export function endSession(db, sessionId, data = {}) {
    const endedAt = data.ended_at || new Date().toISOString();
    return stmt(db,
        `UPDATE sessions SET
            ended_at = ?,
            integrity_status = COALESCE(?, integrity_status),
            integrity_notes = COALESCE(?, integrity_notes),
            narrative_summary = COALESCE(?, narrative_summary),
            total_actions = COALESCE(?, total_actions),
            claims_created = COALESCE(?, claims_created),
            claims_killed = COALESCE(?, claims_killed),
            gates_passed = COALESCE(?, gates_passed),
            gates_failed = COALESCE(?, gates_failed)
        WHERE id = ?`
    ).run(
        endedAt,
        data.integrity_status ?? null,
        data.integrity_notes ?? null,
        data.narrative_summary ?? null,
        data.total_actions ?? null,
        data.claims_created ?? null,
        data.claims_killed ?? null,
        data.gates_passed ?? null,
        data.gates_failed ?? null,
        sessionId
    );
}

/**
 * Get the most recent session for a project.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {object|undefined}
 */
export function getLastSession(db, projectPath) {
    return stmt(db,
        `SELECT * FROM sessions
         WHERE project_path = ?
         ORDER BY started_at DESC
         LIMIT 1`
    ).get(projectPath);
}

// =====================================================
// Research Spine helpers
// =====================================================

/**
 * Log a spine entry (research action record).
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} entry
 * @param {string} entry.session_id
 * @param {string} entry.action_type - DATA_LOAD, EXTRACT, MODEL_TRAIN, CALIBRATION, etc.
 * @param {string} [entry.timestamp] - ISO timestamp (defaults to now)
 * @param {string} [entry.tool_name]
 * @param {string} [entry.input_summary]
 * @param {string} [entry.output_summary]
 * @param {string} [entry.agent_role]
 * @param {string} [entry.gate_result] - PASS/WARN/FAIL/null
 * @returns {import('better-sqlite3').RunResult}
 */
export function logSpineEntry(db, entry) {
    const ts = entry.timestamp || new Date().toISOString();
    return stmt(db,
        `INSERT INTO spine_entries
            (session_id, timestamp, action_type, tool_name, input_summary, output_summary, agent_role, gate_result)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        entry.session_id,
        ts,
        entry.action_type,
        entry.tool_name ?? null,
        entry.input_summary ?? null,
        entry.output_summary ?? null,
        entry.agent_role ?? null,
        entry.gate_result ?? null
    );
}

// =====================================================
// Gate check helpers
// =====================================================

/**
 * Log a gate check result.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} check
 * @param {string} check.session_id
 * @param {string} check.gate_id - DQ1, DQ2, DQ3, DQ4, DC0, DD0, L-1, G0-G6, etc.
 * @param {string} check.status - PASS/WARN/FAIL
 * @param {string} [check.claim_id]
 * @param {number} [check.checks_passed]
 * @param {number} [check.checks_warned]
 * @param {number} [check.checks_failed]
 * @param {string|object} [check.details] - JSON string or object with check specifics
 * @param {string} [check.timestamp] - ISO timestamp (defaults to now)
 * @returns {import('better-sqlite3').RunResult}
 */
export function logGateCheck(db, check) {
    const ts = check.timestamp || new Date().toISOString();
    const details = typeof check.details === 'object'
        ? JSON.stringify(check.details)
        : (check.details ?? null);
    return stmt(db,
        `INSERT INTO gate_checks
            (session_id, gate_id, claim_id, status, checks_passed, checks_warned, checks_failed, details, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        check.session_id,
        check.gate_id,
        check.claim_id ?? null,
        check.status,
        check.checks_passed ?? null,
        check.checks_warned ?? null,
        check.checks_failed ?? null,
        details,
        ts
    );
}

// =====================================================
// Literature search helpers
// =====================================================

/**
 * Log a literature search for L-1+ enforcement.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} search
 * @param {string} search.session_id
 * @param {string} search.query
 * @param {string|string[]} search.sources - JSON array or array of source names
 * @param {string} search.search_layer - MCP / SKILL / RAG / MANUAL / WEBSEARCH
 * @param {number} [search.results_count]
 * @param {number} [search.relevant_count]
 * @param {string|string[]} [search.key_papers] - JSON array or array of DOI/PMID/titles
 * @param {string} [search.gate_context] - L1_PRE_DIRECTION / OTAE_CONTINUOUS / AD_HOC
 * @param {string} [search.timestamp] - ISO timestamp (defaults to now)
 * @returns {import('better-sqlite3').RunResult}
 */
export function logLiteratureSearch(db, search) {
    const ts = search.timestamp || new Date().toISOString();
    const sources = Array.isArray(search.sources)
        ? JSON.stringify(search.sources)
        : search.sources;
    const keyPapers = Array.isArray(search.key_papers)
        ? JSON.stringify(search.key_papers)
        : (search.key_papers ?? null);
    return stmt(db,
        `INSERT INTO literature_searches
            (session_id, query, sources, results_count, relevant_count, key_papers, search_layer, gate_context, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        search.session_id,
        search.query,
        sources,
        search.results_count ?? null,
        search.relevant_count ?? null,
        keyPapers,
        search.search_layer,
        search.gate_context ?? null,
        ts
    );
}

// =====================================================
// Calibration helpers
// =====================================================

/**
 * Get calibration data for a given agent role (typically 'reviewer2').
 * Returns aggregated stats about prediction accuracy.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} agentRole - The agent role to get calibration for
 * @returns {object} Calibration statistics
 */
export function getCalibrationData(db, agentRole) {
    // Get recent R2 reviews for calibration analysis
    const reviews = stmt(db,
        `SELECT r.review_mode, r.j0_score, r.sfi_injected, r.sfi_caught, r.r2_weaknesses
         FROM r2_reviews r
         JOIN sessions s ON r.session_id = s.id
         ORDER BY r.timestamp DESC
         LIMIT 20`
    ).all();

    // Get confidence calibration data
    const calibration = stmt(db,
        `SELECT predicted_confidence, actual_outcome, r2_verdict
         FROM calibration_log
         ORDER BY timestamp DESC
         LIMIT 50`
    ).all();

    // Compute weakness frequency
    const weaknessFrequency = {};
    for (const review of reviews) {
        if (review.r2_weaknesses) {
            try {
                const weaknesses = JSON.parse(review.r2_weaknesses);
                for (const w of weaknesses) {
                    weaknessFrequency[w] = (weaknessFrequency[w] || 0) + 1;
                }
            } catch {
                // Ignore malformed JSON
            }
        }
    }

    // Compute SFI catch rate
    const totalSfiInjected = reviews.reduce((sum, r) => sum + (r.sfi_injected || 0), 0);
    const totalSfiCaught = reviews.reduce((sum, r) => sum + (r.sfi_caught || 0), 0);
    const sfiCatchRate = totalSfiInjected > 0 ? totalSfiCaught / totalSfiInjected : null;

    // Compute calibration error (difference between predicted confidence and actual outcomes)
    let calibrationError = null;
    if (calibration.length > 0) {
        const verified = calibration.filter(c => c.actual_outcome === 'VERIFIED' || c.actual_outcome === 'ROBUST');
        const total = calibration.length;
        const avgPredicted = calibration.reduce((sum, c) => sum + c.predicted_confidence, 0) / total;
        const actualRate = verified.length / total;
        calibrationError = Math.abs(avgPredicted - actualRate);
    }

    return {
        total_reviews: reviews.length,
        total_calibration_points: calibration.length,
        sfi_catch_rate: sfiCatchRate,
        calibration_error: calibrationError,
        top_weaknesses: Object.entries(weaknessFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([weakness, count]) => ({ weakness, count })),
        avg_j0_score: reviews.filter(r => r.j0_score != null).length > 0
            ? reviews.filter(r => r.j0_score != null).reduce((sum, r) => sum + r.j0_score, 0)
              / reviews.filter(r => r.j0_score != null).length
            : null
    };
}

// =====================================================
// Claim event helpers
// =====================================================

/**
 * Log a claim lifecycle event.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 * @param {string} event.claim_id
 * @param {string} event.session_id
 * @param {string} event.event_type - CREATED, PROMOTED, KILLED, DISPUTED, VERIFIED, etc.
 * @param {string} [event.old_status]
 * @param {string} [event.new_status]
 * @param {number} [event.confidence]
 * @param {string} [event.r2_verdict] - ACCEPT/REJECT/DEFER
 * @param {string} [event.kill_reason]
 * @param {string} [event.gate_id]
 * @param {string} [event.narrative]
 * @param {string} [event.timestamp] - ISO timestamp (defaults to now)
 * @returns {import('better-sqlite3').RunResult}
 */
export function logClaimEvent(db, event) {
    const ts = event.timestamp || new Date().toISOString();
    return stmt(db,
        `INSERT INTO claim_events
            (claim_id, session_id, event_type, old_status, new_status, confidence,
             r2_verdict, kill_reason, gate_id, narrative, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        event.claim_id,
        event.session_id,
        event.event_type,
        event.old_status ?? null,
        event.new_status ?? null,
        event.confidence ?? null,
        event.r2_verdict ?? null,
        event.kill_reason ?? null,
        event.gate_id ?? null,
        event.narrative ?? null,
        ts
    );
}

/**
 * Mark a session as degraded or append integrity notes.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {{ status?: string, note?: string }} data
 * @returns {import('better-sqlite3').RunResult}
 */
export function updateSessionIntegrity(db, sessionId, data = {}) {
    const status = data.status ?? 'INTEGRITY_DEGRADED';
    const note = String(data.note || '').trim();
    return stmt(db,
        `UPDATE sessions SET
            integrity_status = CASE
                WHEN ? = 'INTEGRITY_DEGRADED' THEN 'INTEGRITY_DEGRADED'
                ELSE COALESCE(integrity_status, 'INTEGRITY_OK')
            END,
            integrity_notes = CASE
                WHEN ? = '' THEN integrity_notes
                WHEN integrity_notes IS NULL OR integrity_notes = '' THEN ?
                WHEN instr(integrity_notes, ?) > 0 THEN integrity_notes
                ELSE integrity_notes || char(10) || ?
            END
         WHERE id = ?`
    ).run(
        status,
        note,
        note || null,
        note || null,
        note || null,
        sessionId
    );
}

/**
 * Insert or update a serendipity seed.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} seed
 * @param {string} seed.seed_id
 * @param {string} seed.created_session
 * @param {string} [seed.status]
 * @param {string} seed.source
 * @param {number} [seed.score]
 * @param {string} [seed.causal_question]
 * @param {string} [seed.discriminating_test]
 * @param {string} [seed.fallback_test]
 * @param {string} [seed.narrative]
 * @param {string} [seed.source_claim_id]
 * @param {string} [seed.last_reviewed_session]
 * @param {string} [seed.resolution]
 * @param {string} [seed.created_at]
 * @param {string} [seed.updated_at]
 * @returns {import('better-sqlite3').RunResult}
 */
export function logSerendipitySeed(db, seed) {
    const createdAt = seed.created_at || new Date().toISOString();
    const updatedAt = seed.updated_at || createdAt;
    return stmt(db,
        `INSERT INTO serendipity_seeds
            (seed_id, created_session, status, source, score, causal_question,
             discriminating_test, fallback_test, narrative, source_claim_id,
             last_reviewed_session, resolution, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(seed_id) DO UPDATE SET
             status = excluded.status,
             source = excluded.source,
             score = excluded.score,
             causal_question = excluded.causal_question,
             discriminating_test = excluded.discriminating_test,
             fallback_test = excluded.fallback_test,
             narrative = excluded.narrative,
             source_claim_id = excluded.source_claim_id,
             last_reviewed_session = excluded.last_reviewed_session,
             resolution = excluded.resolution,
             updated_at = excluded.updated_at`
    ).run(
        seed.seed_id,
        seed.created_session,
        seed.status ?? 'PENDING_TRIAGE',
        seed.source,
        seed.score ?? null,
        seed.causal_question ?? null,
        seed.discriminating_test ?? null,
        seed.fallback_test ?? null,
        seed.narrative ?? null,
        seed.source_claim_id ?? null,
        seed.last_reviewed_session ?? null,
        seed.resolution ?? null,
        createdAt,
        updatedAt
    );
}

/**
 * Insert or update an R2 review artifact.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} review
 * @param {string} review.review_id
 * @param {string} review.session_id
 * @param {string} [review.review_mode]
 * @param {string[]|string} [review.claims_reviewed]
 * @param {number} [review.j0_score]
 * @param {object|string} [review.j0_dimensions]
 * @param {number} [review.sfi_injected]
 * @param {number} [review.sfi_caught]
 * @param {string[]|string} [review.sfi_missed]
 * @param {string[]|string} [review.r2_weaknesses]
 * @param {string} [review.timestamp]
 * @returns {import('better-sqlite3').RunResult}
 */
export function logR2Review(db, review) {
    const ts = review.timestamp || new Date().toISOString();
    const claimsReviewed = Array.isArray(review.claims_reviewed)
        ? JSON.stringify(review.claims_reviewed)
        : (review.claims_reviewed ?? '[]');
    const j0Dimensions = typeof review.j0_dimensions === 'object' && review.j0_dimensions !== null
        ? JSON.stringify(review.j0_dimensions)
        : (review.j0_dimensions ?? null);
    const sfiMissed = Array.isArray(review.sfi_missed)
        ? JSON.stringify(review.sfi_missed)
        : (review.sfi_missed ?? '[]');
    const weaknesses = Array.isArray(review.r2_weaknesses)
        ? JSON.stringify(review.r2_weaknesses)
        : (review.r2_weaknesses ?? '[]');

    return stmt(db,
        `INSERT INTO r2_reviews
            (review_id, session_id, review_mode, claims_reviewed, j0_score,
             j0_dimensions, sfi_injected, sfi_caught, sfi_missed,
             r2_weaknesses, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(review_id) DO UPDATE SET
             review_mode = excluded.review_mode,
             claims_reviewed = excluded.claims_reviewed,
             j0_score = excluded.j0_score,
             j0_dimensions = excluded.j0_dimensions,
             sfi_injected = excluded.sfi_injected,
             sfi_caught = excluded.sfi_caught,
             sfi_missed = excluded.sfi_missed,
             r2_weaknesses = excluded.r2_weaknesses,
             timestamp = excluded.timestamp`
    ).run(
        review.review_id,
        review.session_id,
        review.review_mode ?? null,
        claimsReviewed,
        review.j0_score ?? null,
        j0Dimensions,
        review.sfi_injected ?? null,
        review.sfi_caught ?? null,
        sfiMissed,
        weaknesses,
        ts
    );
}

/**
 * Insert or update a citation check record.
 * Extraction paths should call this with verification_status='PENDING';
 * verification paths should follow up with updateCitationVerification().
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} citation
 * @returns {import('better-sqlite3').RunResult}
 */
export function upsertCitationCheck(db, citation) {
    const createdAt = citation.created_at || new Date().toISOString();
    return stmt(db,
        `INSERT INTO citation_checks
            (citation_id, session_id, claim_id, raw_ref, citation_text, citation_type,
             normalized_id, doi, pmid, arxiv_id, verification_status, verification_method,
             resolver, source_url, resolved_title, title, resolved_source_type,
             retraction_status, resolved_payload, http_status, http_status_code,
             checked_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(citation_id) DO UPDATE SET
             claim_id = COALESCE(excluded.claim_id, citation_checks.claim_id),
             raw_ref = excluded.raw_ref,
             citation_text = COALESCE(excluded.citation_text, citation_checks.citation_text),
             citation_type = excluded.citation_type,
             normalized_id = excluded.normalized_id,
             doi = COALESCE(excluded.doi, citation_checks.doi),
             pmid = COALESCE(excluded.pmid, citation_checks.pmid),
             arxiv_id = COALESCE(excluded.arxiv_id, citation_checks.arxiv_id),
             verification_status = CASE
                 WHEN excluded.verification_status = 'PENDING'
                      AND citation_checks.verification_status IN ('VERIFIED', 'UNRESOLVED', 'RETRACTED')
                 THEN citation_checks.verification_status
                 ELSE excluded.verification_status
             END,
             verification_method = COALESCE(excluded.verification_method, citation_checks.verification_method),
             resolver = COALESCE(excluded.resolver, citation_checks.resolver),
             source_url = COALESCE(excluded.source_url, citation_checks.source_url),
             resolved_title = COALESCE(excluded.resolved_title, citation_checks.resolved_title),
             title = COALESCE(excluded.title, citation_checks.title),
             resolved_source_type = COALESCE(excluded.resolved_source_type, citation_checks.resolved_source_type),
             retraction_status = COALESCE(excluded.retraction_status, citation_checks.retraction_status),
             resolved_payload = COALESCE(excluded.resolved_payload, citation_checks.resolved_payload),
             http_status = COALESCE(excluded.http_status, citation_checks.http_status),
             http_status_code = COALESCE(excluded.http_status_code, citation_checks.http_status_code),
             checked_at = COALESCE(excluded.checked_at, citation_checks.checked_at)`
    ).run(
        citation.citation_id,
        citation.session_id ?? null,
        citation.claim_id ?? null,
        citation.raw_ref,
        citation.citation_text ?? citation.raw_ref,
        citation.citation_type,
        citation.normalized_id ?? null,
        citation.doi ?? null,
        citation.pmid ?? null,
        citation.arxiv_id ?? null,
        citation.verification_status ?? 'PENDING',
        citation.verification_method ?? null,
        citation.resolver ?? null,
        citation.source_url ?? null,
        citation.resolved_title ?? null,
        citation.title ?? citation.resolved_title ?? null,
        citation.resolved_source_type ?? null,
        citation.retraction_status ?? null,
        typeof citation.resolved_payload === 'object'
            ? JSON.stringify(citation.resolved_payload)
            : (citation.resolved_payload ?? null),
        citation.http_status ?? null,
        citation.http_status_code ?? citation.http_status ?? null,
        citation.checked_at ?? null,
        createdAt
    );
}

/**
 * Update a citation record after verification.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} citationId
 * @param {object} verification
 * @returns {import('better-sqlite3').RunResult}
 */
export function updateCitationVerification(db, citationId, verification) {
    const checkedAt = verification.checked_at || new Date().toISOString();
    return stmt(db,
        `UPDATE citation_checks SET
            verification_status = COALESCE(?, verification_status),
            verification_method = COALESCE(?, verification_method),
            resolver = COALESCE(?, resolver),
            source_url = COALESCE(?, source_url),
            resolved_title = COALESCE(?, resolved_title),
            title = COALESCE(?, title),
            resolved_source_type = COALESCE(?, resolved_source_type),
            retraction_status = COALESCE(?, retraction_status),
            resolved_payload = COALESCE(?, resolved_payload),
            http_status = COALESCE(?, http_status),
            http_status_code = COALESCE(?, http_status_code),
            checked_at = ?
         WHERE citation_id = ?`
    ).run(
        verification.verification_status ?? null,
        verification.verification_method ?? null,
        verification.resolver ?? null,
        verification.source_url ?? null,
        verification.resolved_title ?? null,
        verification.title ?? verification.resolved_title ?? null,
        verification.resolved_source_type ?? null,
        verification.retraction_status ?? null,
        typeof verification.resolved_payload === 'object'
            ? JSON.stringify(verification.resolved_payload)
            : (verification.resolved_payload ?? null),
        verification.http_status ?? null,
        verification.http_status_code ?? verification.http_status ?? null,
        checkedAt,
        citationId
    );
}

/**
 * Fetch citation rows for a session or claim.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {{sessionId?: string, claimId?: string}} filters
 * @returns {object[]}
 */
export function getCitationChecks(db, filters = {}) {
    if (!db) return [];
    const { sessionId = null, claimId = null } = filters;
    try {
        if (claimId && sessionId) {
            return stmt(db,
                `SELECT cc.* FROM citation_checks cc
                 JOIN sessions s ON s.id = cc.session_id
                 WHERE cc.claim_id = ?
                   AND s.project_path = (
                       SELECT project_path FROM sessions WHERE id = ?
                   )
                 ORDER BY cc.created_at DESC, cc.id DESC`
            ).all(claimId, sessionId);
        }
        if (claimId) {
            return stmt(db,
                `SELECT * FROM citation_checks
                 WHERE claim_id = ?
                 ORDER BY created_at DESC, id DESC`
            ).all(claimId);
        }
        if (sessionId) {
            return stmt(db,
                `SELECT * FROM citation_checks
                 WHERE session_id = ?
                 ORDER BY created_at DESC, id DESC`
            ).all(sessionId);
        }
    } catch {
        return [];
    }
    return [];
}

/**
 * Get all events for a specific claim.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} claimId
 * @returns {object[]}
 */
export function getClaimHistory(db, claimId) {
    return stmt(db,
        `SELECT * FROM claim_events WHERE claim_id = ? ORDER BY timestamp ASC`
    ).all(claimId);
}

// =====================================================
// Observer alert helpers
// =====================================================

/**
 * Get unresolved observer alerts for a project.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {object[]}
 */
export function getUnresolvedAlerts(db, projectPath) {
    return stmt(db,
        `SELECT * FROM observer_alerts
         WHERE project_path = ? AND resolved = 0
         ORDER BY level DESC, created_at DESC`
    ).all(projectPath);
}

/**
 * Create an observer alert.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} alert
 * @param {string} alert.project_path
 * @param {string} alert.level - INFO/WARN/HALT
 * @param {string} alert.message
 * @param {string} [alert.created_at] - ISO timestamp (defaults to now)
 * @returns {import('better-sqlite3').RunResult}
 */
export function createAlert(db, alert) {
    const ts = alert.created_at || new Date().toISOString();
    return stmt(db,
        `INSERT INTO observer_alerts (project_path, level, message, created_at)
         VALUES (?, ?, ?, ?)`
    ).run(alert.project_path, alert.level, alert.message, ts);
}

// =====================================================
// Embed queue helpers
// =====================================================

/**
 * Queue text for async embedding by the worker.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} text - The text to embed
 * @param {string|object} [metadata] - JSON metadata
 * @returns {import('better-sqlite3').RunResult}
 */
export function queueForEmbedding(db, text, metadata = null) {
    const meta = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata;
    return stmt(db,
        `INSERT INTO embed_queue (text, metadata, created_at) VALUES (?, ?, ?)`
    ).run(text, meta, new Date().toISOString());
}

/**
 * Resolve the latest known agent role for a session from prompt_log.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {string|null}
 */
export function getLatestPromptRole(db, sessionId) {
    if (!db || !sessionId) return null;
    try {
        const row = stmt(db,
            `SELECT agent_role
             FROM prompt_log
             WHERE session_id = ?
               AND agent_role IS NOT NULL
               AND trim(agent_role) != ''
             ORDER BY timestamp DESC, id DESC
             LIMIT 1`
        ).get(sessionId);
        return row?.agent_role ?? null;
    } catch {
        return null;
    }
}

// =====================================================
// Convenience: open + init in one call
// =====================================================

/**
 * Open the database and initialize the schema in one call.
 * Convenience function for hook scripts.
 *
 * @param {string} [dbPath] - Path to database file
 * @param {string} [schemaPath] - Path to schema.sql
 * @returns {import('better-sqlite3').Database}
 */
export function openAndInit(dbPath, schemaPath) {
    const db = openDB(dbPath);
    initDB(db, schemaPath);
    return db;
}

// =====================================================
// Research pattern helpers
// =====================================================

/**
 * Insert or update a research pattern.
 * If same type+description exists for this project, increment occurrences and update confidence.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} pattern
 * @param {string} pattern.pattern_type - GATE_FAILURE_CLUSTER, REPEATED_ACTION, CLAIM_LIFECYCLE
 * @param {string} pattern.description
 * @param {string|string[]} pattern.evidence - JSON array of supporting observations
 * @param {number} pattern.confidence - 0.0-1.0
 * @param {string} pattern.project_path
 * @returns {import('better-sqlite3').RunResult}
 */
export function upsertPattern(db, pattern) {
    const now = new Date().toISOString();
    const evidence = Array.isArray(pattern.evidence)
        ? JSON.stringify(pattern.evidence)
        : pattern.evidence;

    // Check if this pattern already exists
    const existing = stmt(db,
        `SELECT id, occurrences, evidence FROM research_patterns
         WHERE pattern_type = ? AND description = ? AND project_path = ? AND active = 1`
    ).get(pattern.pattern_type, pattern.description, pattern.project_path);

    if (existing) {
        // Merge evidence arrays
        let mergedEvidence;
        try {
            const oldEv = JSON.parse(existing.evidence);
            const newEv = JSON.parse(evidence);
            mergedEvidence = JSON.stringify([...oldEv, ...newEv].slice(-20)); // Keep last 20
        } catch {
            mergedEvidence = evidence;
        }

        return stmt(db,
            `UPDATE research_patterns
             SET occurrences = occurrences + 1,
                 confidence = MIN(1.0, MAX(confidence, ?) + 0.1),
                 evidence = ?,
                 last_seen = ?
             WHERE id = ?`
        ).run(pattern.confidence, mergedEvidence, now, existing.id);
    }

    return stmt(db,
        `INSERT INTO research_patterns
            (pattern_type, description, evidence, confidence, occurrences, first_seen, last_seen, project_path, active)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, 1)`
    ).run(
        pattern.pattern_type,
        pattern.description,
        evidence,
        pattern.confidence,
        now, now,
        pattern.project_path
    );
}

/**
 * Get active patterns for a project.
 * Applies temporal decay (-0.02/week from last_seen).
 * Archives patterns below 0.2 confidence.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {object[]} Active patterns with decayed confidence
 */
export function getActivePatterns(db, projectPath) {
    const patterns = stmt(db,
        `SELECT * FROM research_patterns
         WHERE project_path = ? AND active = 1
         ORDER BY confidence DESC, occurrences DESC`
    ).all(projectPath);

    const now = Date.now();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const result = [];

    for (const p of patterns) {
        const lastSeenTs = new Date(p.last_seen).getTime();
        const ageWeeks = isNaN(lastSeenTs) ? 0 : Math.max(0, (now - lastSeenTs) / msPerWeek);
        const decayedConfidence = p.confidence * Math.exp(-0.02 * ageWeeks);

        if (decayedConfidence < 0.2) {
            // Archive stale patterns
            stmt(db,
                `UPDATE research_patterns SET active = 0 WHERE id = ?`
            ).run(p.id);
            continue;
        }

        result.push({
            ...p,
            confidence: decayedConfidence,
            evidence: (() => { try { return JSON.parse(p.evidence); } catch { return []; } })()
        });
    }

    return result;
}

export default {
    openDB,
    initDB,
    closeDB,
    openAndInit,
    getSession,
    createSession,
    endSession,
    updateSessionIntegrity,
    getLastSession,
    logSpineEntry,
    logGateCheck,
    logLiteratureSearch,
    getCalibrationData,
    logClaimEvent,
    logSerendipitySeed,
    logR2Review,
    upsertCitationCheck,
    updateCitationVerification,
    getCitationChecks,
    getClaimHistory,
    getUnresolvedAlerts,
    createAlert,
    queueForEmbedding,
    upsertPattern,
    getActivePatterns
};
