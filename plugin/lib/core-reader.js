import fs from 'node:fs';
import path from 'node:path';

import { closeDB, getActivePatterns, getLastSession, getUnresolvedAlerts, openAndInit } from './db.js';
import { canonicalizeProjectPath } from './path-utils.js';
import { loadPendingSeeds } from './r2-calibration.js';

const TERMINAL_CLAIM_STATUSES = new Set(['KILLED', 'DISPUTED']);
const UNRESOLVED_TERMINAL_EVENTS = ['R2_REVIEWED', 'KILLED', 'DISPUTED'];

function projectDbPath() {
    return process.env.VIBE_SCIENCE_DB_PATH || undefined;
}

function asArray(value) {
    if (value == null) return null;
    return Array.isArray(value) ? value : [value];
}

function parseJsonIfPossible(value) {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function normalizeProjectPath(projectPath) {
    return canonicalizeProjectPath(projectPath || process.cwd());
}

function degradedOverview(projectPath) {
    return {
        projectPath,
        lastSession: null,
        activeClaimCount: 0,
        unresolvedAlertCount: 0,
        pendingSeedCount: 0,
        activePatternCount: 0,
        recentGateFailures: [],
    };
}

export function getStateSnapshot(projectPath) {
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const statePath = path.resolve(canonicalProjectPath, '.vibe-science', 'STATE.md');
    if (!fs.existsSync(statePath)) {
        return {
            exists: false,
            path: statePath,
            updatedAt: null,
            content: null,
        };
    }

    const stats = fs.statSync(statePath);
    return {
        exists: true,
        path: statePath,
        updatedAt: stats.mtime.toISOString(),
        content: fs.readFileSync(statePath, 'utf-8'),
    };
}

export function queryUnresolvedClaims(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 100;
    return db.prepare(`
        WITH ranked AS (
            SELECT
                ce.claim_id,
                ce.event_type,
                ce.timestamp,
                ce.id,
                ROW_NUMBER() OVER (
                    PARTITION BY ce.claim_id
                    ORDER BY ce.timestamp DESC, ce.id DESC
                ) AS rn
            FROM claim_events ce
            WHERE ce.session_id IN (
                SELECT id FROM sessions WHERE project_path = ?
            )
        )
        SELECT
            claim_id AS claimId,
            event_type AS latestEventType,
            timestamp AS latestEventTimestamp
        FROM ranked
        WHERE rn = 1
          AND event_type NOT IN ('R2_REVIEWED', 'KILLED', 'DISPUTED')
        ORDER BY latestEventTimestamp DESC, claimId ASC
        LIMIT ?
    `).all(canonicalProjectPath, limit);
}

export function listUnresolvedClaims(db, projectPath, options = {}) {
    return queryUnresolvedClaims(db, projectPath, options);
}

export function listClaimHeads(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const statuses = asArray(options.statuses)?.map(s => String(s).trim().toUpperCase()).filter(Boolean) ?? null;
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 100;

    const rows = db.prepare(`
        WITH ranked AS (
            SELECT
                ce.id,
                ce.claim_id,
                ce.session_id,
                ce.new_status,
                ce.event_type,
                ce.confidence,
                ce.r2_verdict,
                ce.kill_reason,
                ce.gate_id,
                ce.narrative,
                ce.timestamp,
                ROW_NUMBER() OVER (
                    PARTITION BY ce.claim_id
                    ORDER BY ce.timestamp DESC, ce.id DESC
                ) AS rn
            FROM claim_events ce
            JOIN sessions s ON s.id = ce.session_id
            WHERE s.project_path = ?
              AND ce.new_status IS NOT NULL
        )
        SELECT
            claim_id,
            session_id,
            new_status,
            event_type,
            confidence,
            r2_verdict,
            kill_reason,
            gate_id,
            narrative,
            timestamp
        FROM ranked
        WHERE rn = 1
        ORDER BY timestamp DESC, claim_id ASC
    `).all(canonicalProjectPath);

    const projected = rows
        .map(row => ({
            claimId: row.claim_id,
            sessionId: row.session_id,
            currentStatus: row.new_status,
            statusSourceEventType: row.event_type,
            confidence: row.confidence ?? null,
            r2Verdict: row.r2_verdict ?? null,
            killReason: row.kill_reason ?? null,
            gateId: row.gate_id ?? null,
            narrative: row.narrative ?? null,
            timestamp: row.timestamp,
            isActive: !TERMINAL_CLAIM_STATUSES.has(row.new_status),
        }))
        .filter(row => !statuses || statuses.includes(row.currentStatus))
        .slice(0, limit);

    return projected;
}

export function listGateChecks(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const gateIds = asArray(options.gateIds)?.map(String) ?? null;
    const statuses = asArray(options.statuses)?.map(s => String(s).trim().toUpperCase()).filter(Boolean) ?? null;
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 50;

    const where = ['s.project_path = ?'];
    const params = [canonicalProjectPath];

    if (gateIds?.length) {
        where.push(`gc.gate_id IN (${gateIds.map(() => '?').join(', ')})`);
        params.push(...gateIds);
    }

    if (statuses?.length) {
        where.push(`gc.status IN (${statuses.map(() => '?').join(', ')})`);
        params.push(...statuses);
    }

    params.push(limit);

    return db.prepare(`
        SELECT
            gc.session_id,
            gc.gate_id,
            gc.claim_id,
            gc.status,
            gc.checks_passed,
            gc.checks_warned,
            gc.checks_failed,
            gc.details,
            gc.timestamp
        FROM gate_checks gc
        JOIN sessions s ON s.id = gc.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY gc.timestamp DESC, gc.id DESC
        LIMIT ?
    `).all(...params).map(row => ({
        sessionId: row.session_id,
        gateId: row.gate_id,
        claimId: row.claim_id ?? null,
        status: row.status,
        checksPassed: row.checks_passed ?? null,
        checksWarned: row.checks_warned ?? null,
        checksFailed: row.checks_failed ?? null,
        details: parseJsonIfPossible(row.details),
        timestamp: row.timestamp,
    }));
}

export function listLiteratureSearches(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const searchLayers = asArray(options.searchLayers)?.map(String) ?? null;
    const gateContexts = asArray(options.gateContext)?.map(String) ?? null;
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 50;

    const where = ['s.project_path = ?'];
    const params = [canonicalProjectPath];

    if (searchLayers?.length) {
        where.push(`ls.search_layer IN (${searchLayers.map(() => '?').join(', ')})`);
        params.push(...searchLayers);
    }

    if (gateContexts?.length) {
        where.push(`ls.gate_context IN (${gateContexts.map(() => '?').join(', ')})`);
        params.push(...gateContexts);
    }

    params.push(limit);

    return db.prepare(`
        SELECT
            ls.session_id,
            ls.query,
            ls.sources,
            ls.results_count,
            ls.relevant_count,
            ls.key_papers,
            ls.search_layer,
            ls.gate_context,
            ls.timestamp
        FROM literature_searches ls
        JOIN sessions s ON s.id = ls.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY ls.timestamp DESC, ls.id DESC
        LIMIT ?
    `).all(...params).map(row => ({
        sessionId: row.session_id,
        query: row.query,
        sources: parseJsonIfPossible(row.sources),
        resultsCount: row.results_count ?? null,
        relevantCount: row.relevant_count ?? null,
        keyPapers: parseJsonIfPossible(row.key_papers),
        searchLayer: row.search_layer,
        gateContext: row.gate_context ?? null,
        timestamp: row.timestamp,
    }));
}

export function listObserverAlerts(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const unresolvedOnly = options.unresolvedOnly ?? true;
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 50;

    const rows = unresolvedOnly
        ? getUnresolvedAlerts(db, canonicalProjectPath).slice(0, limit)
        : db.prepare(`
            SELECT *
            FROM observer_alerts
            WHERE project_path = ?
            ORDER BY level DESC, created_at DESC, id DESC
            LIMIT ?
        `).all(canonicalProjectPath, limit);

    return rows.map(row => ({
        id: row.id,
        level: row.level,
        message: row.message,
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at ?? null,
        createdAt: row.created_at,
    }));
}

export function listCitationChecks(db, projectPath, options = {}) {
    if (!db) return [];
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    const claimId = options.claimId ?? null;
    const verificationStatuses = asArray(options.verificationStatuses)?.map(s => String(s).trim().toUpperCase()).filter(Boolean) ?? null;
    const limit = Number.isFinite(options.limit) ? Math.max(1, options.limit) : 100;

    const where = ['s.project_path = ?'];
    const params = [canonicalProjectPath];

    if (claimId) {
        where.push('cc.claim_id = ?');
        params.push(claimId);
    }

    if (verificationStatuses?.length) {
        where.push(`cc.verification_status IN (${verificationStatuses.map(() => '?').join(', ')})`);
        params.push(...verificationStatuses);
    }

    params.push(limit);

    return db.prepare(`
        SELECT
            cc.citation_id,
            cc.claim_id,
            cc.raw_ref,
            cc.citation_type,
            cc.normalized_id,
            cc.verification_status,
            cc.resolver,
            cc.resolved_title,
            cc.retraction_status,
            cc.checked_at,
            cc.created_at
        FROM citation_checks cc
        JOIN sessions s ON s.id = cc.session_id
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(cc.checked_at, cc.created_at) DESC, cc.id DESC
        LIMIT ?
    `).all(...params).map(row => ({
        citationId: row.citation_id,
        claimId: row.claim_id ?? null,
        rawRef: row.raw_ref,
        citationType: row.citation_type,
        normalizedId: row.normalized_id ?? null,
        verificationStatus: row.verification_status,
        resolver: row.resolver ?? null,
        resolvedTitle: row.resolved_title ?? null,
        retractionStatus: row.retraction_status ?? null,
        checkedAt: row.checked_at ?? null,
        createdAt: row.created_at,
    }));
}

export function getProjectOverview(db, projectPath, options = {}) {
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    if (!db) {
        return degradedOverview(canonicalProjectPath);
    }

    const overview = degradedOverview(canonicalProjectPath);
    const lastSession = getLastSession(db, canonicalProjectPath);
    overview.lastSession = lastSession
        ? {
            id: lastSession.id,
            startedAt: lastSession.started_at,
            endedAt: lastSession.ended_at ?? null,
            integrityStatus: lastSession.integrity_status,
            narrativeSummary: lastSession.narrative_summary ?? null,
            totalActions: lastSession.total_actions ?? 0,
            claimsCreated: lastSession.claims_created ?? 0,
            claimsKilled: lastSession.claims_killed ?? 0,
            gatesPassed: lastSession.gates_passed ?? 0,
            gatesFailed: lastSession.gates_failed ?? 0,
        }
        : null;
    overview.activeClaimCount = listClaimHeads(db, canonicalProjectPath, { limit: Number.MAX_SAFE_INTEGER })
        .filter(row => row.isActive)
        .length;
    overview.unresolvedAlertCount = getUnresolvedAlerts(db, canonicalProjectPath).length;
    overview.pendingSeedCount = loadPendingSeeds(db, canonicalProjectPath).length;
    overview.activePatternCount = getActivePatterns(db, canonicalProjectPath).length;
    overview.recentGateFailures = listGateChecks(db, canonicalProjectPath, {
        statuses: ['FAIL'],
        limit: options.recentGateLimit ?? 5,
    });
    return overview;
}

export function createReader(projectPath) {
    const canonicalProjectPath = normalizeProjectPath(projectPath);
    let db = null;
    let dbAvailable = false;
    let error = null;
    let closed = false;

    try {
        db = openAndInit(projectDbPath());
        dbAvailable = Boolean(db);
        if (!dbAvailable) {
            error = 'Database unavailable (better-sqlite3 not installed or failed to load).';
        }
    } catch (err) {
        db = null;
        dbAvailable = false;
        error = `Database open failed: ${err.message}`;
    }

    function close() {
        if (closed) return;
        closed = true;
        closeDB(db);
    }

    return {
        projectPath: canonicalProjectPath,
        dbAvailable,
        error,
        getProjectOverview: (options = {}) => getProjectOverview(db, canonicalProjectPath, options),
        listClaimHeads: (options = {}) => listClaimHeads(db, canonicalProjectPath, options),
        listUnresolvedClaims: (options = {}) => listUnresolvedClaims(db, canonicalProjectPath, options),
        listGateChecks: (options = {}) => listGateChecks(db, canonicalProjectPath, options),
        listLiteratureSearches: (options = {}) => listLiteratureSearches(db, canonicalProjectPath, options),
        listObserverAlerts: (options = {}) => listObserverAlerts(db, canonicalProjectPath, options),
        listCitationChecks: (options = {}) => listCitationChecks(db, canonicalProjectPath, options),
        getStateSnapshot: () => getStateSnapshot(canonicalProjectPath),
        close,
    };
}

export default {
    createReader,
    getProjectOverview,
    listClaimHeads,
    listUnresolvedClaims,
    queryUnresolvedClaims,
    listGateChecks,
    listLiteratureSearches,
    listObserverAlerts,
    listCitationChecks,
    getStateSnapshot,
};
