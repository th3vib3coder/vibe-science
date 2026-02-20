/**
 * Vibe Science v6.0 NEXUS — SQLite Database Wrapper
 *
 * Provides persistent storage for sessions, claims, gates, reviews,
 * serendipity seeds, literature searches, observer alerts, and calibration data.
 *
 * Uses better-sqlite3 for synchronous, high-performance SQLite access.
 * Database location: ~/.vibe-science/db/vibe-science.db
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// =====================================================
// Default paths
// =====================================================

const DEFAULT_DB_DIR = path.join(os.homedir(), '.vibe-science', 'db');
const DEFAULT_DB_PATH = path.join(DEFAULT_DB_DIR, 'vibe-science.db');
const DEFAULT_SCHEMA_PATH = path.join(
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
        `INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`
    ).run(sessionData.id, sessionData.project_path, startedAt);
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
 * @returns {import('better-sqlite3').RunResult}
 */
export function endSession(db, sessionId, data = {}) {
    const endedAt = data.ended_at || new Date().toISOString();
    return stmt(db,
        `UPDATE sessions SET
            ended_at = ?,
            narrative_summary = COALESCE(?, narrative_summary),
            total_actions = COALESCE(?, total_actions),
            claims_created = COALESCE(?, claims_created),
            claims_killed = COALESCE(?, claims_killed),
            gates_passed = COALESCE(?, gates_passed),
            gates_failed = COALESCE(?, gates_failed)
        WHERE id = ?`
    ).run(
        endedAt,
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
 * @param {string} entry.action_type - DATA_LOAD, FEATURE_EXTRACTION, MODEL_TRAIN, etc.
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
    const meta = typeof metadata === 'object' ? JSON.stringify(metadata) : metadata;
    return stmt(db,
        `INSERT INTO embed_queue (text, metadata, created_at) VALUES (?, ?, ?)`
    ).run(text, meta, new Date().toISOString());
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

export default {
    openDB,
    initDB,
    closeDB,
    openAndInit,
    getSession,
    createSession,
    endSession,
    getLastSession,
    logSpineEntry,
    logGateCheck,
    logLiteratureSearch,
    getCalibrationData,
    logClaimEvent,
    getClaimHistory,
    getUnresolvedAlerts,
    createAlert,
    queueForEmbedding
};
