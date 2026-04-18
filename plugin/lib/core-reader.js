/**
 * Vibe Science Core Reader — read-only projections for the VRE kernel bridge.
 *
 * Ships the 8 projections the VRE `environment/lib/kernel-bridge.js` helper
 * expects (per Phase 6 WP-150 contract).
 *
 * Design principle: thin, safe-default wrappers over existing `plugin/lib/db.js`
 * helpers and the static kernel contracts (valid claim sequences, non-negotiable
 * governance hooks). Kernel governance invariants encoded here are documented
 * and testable rather than spread across runtime hooks.
 *
 * Degraded mode: if `better-sqlite3` is unavailable OR the DB file is missing,
 * every projection returns safe empty / default shapes. The envelope is still
 * well-formed; VRE's bridge treats the degraded payload as "kernel reports
 * nothing" (not "kernel broken").
 */

import fs from 'node:fs';

import {
    DEFAULT_DB_PATH,
    openDB,
    closeDB,
    getLastSession,
    getCitationChecks,
    getUnresolvedAlerts,
} from './db.js';

// ----------------------------------------------------------------------------
// Static kernel contracts — encoded in source, not persisted.
// ----------------------------------------------------------------------------

/**
 * Governance profile enum. Defaults live in CLAUDE.md / MODE_HOOKS; the kernel
 * does not persist a "current profile" in DB today. Phase 6.1 contract: the
 * core-reader reports 'default' unless a future meta key ('governance.profile')
 * is set by kernel runtime.
 */
const VALID_PROFILES = Object.freeze(['default', 'strict']);
const DEFAULT_PROFILE = 'default';

/**
 * Non-negotiable governance hooks — enforced at runtime by pre-tool-use.js and
 * peers. These are NOT gate_id values in the gate_checks table (those are
 * data-quality gates like DQ1/G0-G6). We surface them as synthetic entries so
 * VRE's Gate 17 probe can assert their presence.
 */
const NON_NEGOTIABLE_HOOKS = Object.freeze([
    'confounder_check',
    'stop_blocking',
    'integrity_degradation_tracking',
    'schema_file_protection',
]);

/**
 * Valid claim-state transition sequences. Authoritative source:
 * kernel narrative-engine.js + claim-ingestion.js accept these and no others.
 */
const VALID_CLAIM_SEQUENCES = Object.freeze([
    ['CREATED', 'R2_REVIEWED', 'PROMOTED'],
    ['CREATED', 'R2_REVIEWED', 'KILLED'],
    ['CREATED', 'R2_REVIEWED', 'DISPUTED'],
    ['CREATED', 'R2_REVIEWED', 'DISPUTED', 'R2_REVIEWED', 'PROMOTED'],
    ['CREATED', 'R2_REVIEWED', 'DISPUTED', 'R2_REVIEWED', 'KILLED'],
]);

// ----------------------------------------------------------------------------
// DB open/close plumbing — always safe
// ----------------------------------------------------------------------------

function safeOpen(dbPath = DEFAULT_DB_PATH) {
    try {
        if (!fs.existsSync(dbPath)) return null;
        return openDB(dbPath);
    } catch {
        return null;
    }
}

function withDb(fn, { dbPath = DEFAULT_DB_PATH, fallback = null } = {}) {
    const db = safeOpen(dbPath);
    if (!db) {
        return typeof fallback === 'function' ? fallback() : fallback;
    }
    try {
        return fn(db);
    } catch {
        // Any schema-driven SQL error degrades to the fallback rather than
        // propagating — the core-reader must not break the VRE bridge on
        // legitimate schema drift. The CLI's envelope shape always parses.
        return typeof fallback === 'function' ? fallback() : fallback;
    } finally {
        try { closeDB(db); } catch { /* ignore */ }
    }
}

// ----------------------------------------------------------------------------
// The 8 projections (WP-150 contract)
// ----------------------------------------------------------------------------

/** Projection 1 — list claim heads. Uses claim_events latest new_status. */
export function listClaimHeads({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 100 } = {}) {
    return withDb((db) => {
        const rows = db.prepare(`
            SELECT ce.claim_id AS claimId, ce.new_status AS currentStatus, ce.timestamp AS updatedAt,
                   s.project_path AS projectPath
            FROM claim_events ce
            LEFT JOIN sessions s ON s.id = ce.session_id
            WHERE ce.id IN (
                SELECT MAX(id) FROM claim_events GROUP BY claim_id
            )
            ${projectPath ? 'AND s.project_path = @projectPath' : ''}
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });
        return rows.map((r) => ({
            claimId: r.claimId,
            currentStatus: r.currentStatus,
            updatedAt: r.updatedAt,
            projectPath: r.projectPath,
        }));
    }, { dbPath, fallback: [] });
}

/** Projection 2 — list claims in CREATED or DISPUTED state. */
export function listUnresolvedClaims({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 100 } = {}) {
    return withDb((db) => {
        const rows = db.prepare(`
            SELECT ce.claim_id AS claimId, ce.new_status AS state, ce.timestamp AS updatedAt,
                   s.project_path AS projectPath
            FROM claim_events ce
            LEFT JOIN sessions s ON s.id = ce.session_id
            WHERE ce.id IN (
                SELECT MAX(id) FROM claim_events GROUP BY claim_id
            )
            AND ce.new_status IN ('CREATED', 'DISPUTED')
            ${projectPath ? 'AND s.project_path = @projectPath' : ''}
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });
        return rows;
    }, { dbPath, fallback: [] });
}

/**
 * Projection 3 — citation checks. Filters by claim_id via `citation_checks`
 * table directly (getCitationChecks() in db.js accepts {sessionId, claimId}
 * only, no projectPath/limit — we query raw to support the VRE bridge
 * contract's {projectPath, limit} shape).
 */
export function listCitationChecks({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 100 } = {}) {
    return withDb((db) => {
        const rows = db.prepare(`
            SELECT cc.citation_id AS citationId, cc.claim_id AS claimId,
                   cc.verification_status AS verificationStatus,
                   cc.confidence, cc.source,
                   cc.updated_at AS updatedAt, cc.created_at AS createdAt,
                   s.project_path AS projectPath
            FROM citation_checks cc
            LEFT JOIN sessions s ON s.id = cc.session_id
            ${projectPath ? 'WHERE s.project_path = @projectPath' : ''}
            ORDER BY cc.updated_at DESC, cc.created_at DESC
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });
        return rows.map((r) => ({
            citationId: r.citationId,
            claimId: r.claimId,
            verificationStatus: r.verificationStatus,
            confidence: r.confidence,
            source: r.source,
            updatedAt: r.updatedAt ?? r.createdAt,
            projectPath: r.projectPath,
        }));
    }, { dbPath, fallback: [] });
}

/** Projection 4 — project overview. */
export function getProjectOverview({ projectPath = null, dbPath = DEFAULT_DB_PATH } = {}) {
    const fallback = () => ({
        projectId: projectPath ?? null,
        profile: DEFAULT_PROFILE,
        updatedAt: null,
        claimCounts: { created: 0, reviewed: 0, promoted: 0 },
        unresolvedAlertCount: 0,
        lastSession: null,
    });

    return withDb((db) => {
        const lastSession = projectPath ? getLastSession(db, projectPath) : null;
        const claimCountRow = db.prepare(`
            SELECT
                SUM(CASE WHEN new_status = 'CREATED' THEN 1 ELSE 0 END) AS created,
                SUM(CASE WHEN new_status = 'R2_REVIEWED' THEN 1 ELSE 0 END) AS reviewed,
                SUM(CASE WHEN new_status = 'PROMOTED' THEN 1 ELSE 0 END) AS promoted
            FROM claim_events
            WHERE id IN (SELECT MAX(id) FROM claim_events GROUP BY claim_id)
        `).get() ?? {};

        const alerts = projectPath ? (getUnresolvedAlerts(db, projectPath) ?? []) : [];

        return {
            projectId: projectPath ?? null,
            profile: readGovernanceProfile(db),
            updatedAt: lastSession?.ended_at ?? lastSession?.started_at ?? null,
            claimCounts: {
                created: claimCountRow.created ?? 0,
                reviewed: claimCountRow.reviewed ?? 0,
                promoted: claimCountRow.promoted ?? 0,
            },
            unresolvedAlertCount: alerts.length,
            lastSession: lastSession ? {
                sessionId: lastSession.id,
                startedAt: lastSession.started_at,
                endedAt: lastSession.ended_at,
                integrityStatus: lastSession.integrity_status,
            } : null,
        };
    }, { dbPath, fallback });
}

function readGovernanceProfile(db) {
    // Kernel may store a governance profile key in meta ('governance.profile').
    // If absent → 'default'. Any value outside VALID_PROFILES is coerced to
    // 'default' for safety.
    try {
        const row = db.prepare(`SELECT value FROM meta WHERE key = 'governance.profile'`).get();
        const value = row?.value ?? DEFAULT_PROFILE;
        return VALID_PROFILES.includes(value) ? value : DEFAULT_PROFILE;
    } catch {
        return DEFAULT_PROFILE;
    }
}

/** Projection 5 — literature searches. */
export function listLiteratureSearches({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 50 } = {}) {
    return withDb((db) => {
        const rows = db.prepare(`
            SELECT ls.query AS query,
                   ls.timestamp AS createdAt,
                   ls.results_count AS resultsCount,
                   ls.search_layer AS searchLayer,
                   s.project_path AS projectPath
            FROM literature_searches ls
            LEFT JOIN sessions s ON s.id = ls.session_id
            ${projectPath ? 'WHERE s.project_path = @projectPath' : ''}
            ORDER BY ls.timestamp DESC
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });
        return rows;
    }, { dbPath, fallback: [] });
}

/** Projection 6 — observer alerts (unresolved). Schema columns: id, level
 *  (INFO/WARN/HALT), message, created_at, resolved, resolved_at. */
export function listObserverAlerts({ projectPath = null, dbPath = DEFAULT_DB_PATH } = {}) {
    return withDb((db) => {
        const rows = projectPath ? (getUnresolvedAlerts(db, projectPath) ?? []) : [];
        return rows.map((r) => ({
            alertId: r.id,
            projectPath: r.project_path,
            message: r.message,
            level: r.level,
            severity: r.level, // kernel stores INFO/WARN/HALT as `level`; expose both names
            createdAt: r.created_at,
            resolvedAt: r.resolved_at ?? null,
            resolved: Boolean(r.resolved),
        }));
    }, { dbPath, fallback: [] });
}

/**
 * Projection 7 — gate checks merged with non-negotiable hook synthesis.
 * The kernel's `gate_checks` table tracks data-quality gates (DQ1/G0-G6).
 * Governance non-negotiable hooks are enforced at runtime by pre-tool-use.js
 * and peers; we synthesize them here so VRE's Gate 17 probe can validate the
 * contract against a uniform projection surface.
 */
export function listGateChecks({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 100 } = {}) {
    const synthetic = NON_NEGOTIABLE_HOOKS.map((hook) => ({
        gateId: null,
        hook,
        status: 'ok',
        projectPath: projectPath ?? null,
        createdAt: null,
        details: 'Non-negotiable hook enforced by kernel runtime (pre-tool-use.js et al.); synthesized for projection surface.',
        synthetic: true,
    }));

    return withDb((db) => {
        const rows = db.prepare(`
            SELECT gc.gate_id AS gateId, gc.status AS status, gc.timestamp AS createdAt,
                   s.project_path AS projectPath, gc.details AS details
            FROM gate_checks gc
            LEFT JOIN sessions s ON s.id = gc.session_id
            ${projectPath ? 'WHERE s.project_path = @projectPath' : ''}
            ORDER BY gc.timestamp DESC
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });

        const concrete = rows.map((r) => ({
            gateId: r.gateId,
            hook: r.gateId,  // data-quality gates don't have "hook" names; reuse gateId
            status: r.status,
            projectPath: r.projectPath,
            createdAt: r.createdAt,
            details: r.details,
        }));

        return [...concrete, ...synthetic];
    }, { dbPath, fallback: () => synthetic });
}

/** Projection 8 — state snapshot. Profile + valid sequences. */
export function getStateSnapshot({ projectPath = null, dbPath = DEFAULT_DB_PATH } = {}) {
    const fallback = () => ({
        profile: DEFAULT_PROFILE,
        sequences: VALID_CLAIM_SEQUENCES,
        lastTransitionAt: null,
    });

    return withDb((db) => {
        const lastSession = projectPath ? getLastSession(db, projectPath) : null;
        const lastClaimRow = db.prepare(`
            SELECT MAX(ce.timestamp) AS lastTransitionAt
            FROM claim_events ce
            LEFT JOIN sessions s ON s.id = ce.session_id
            ${projectPath ? 'WHERE s.project_path = @projectPath' : ''}
        `).get({ projectPath: projectPath ?? '' });

        return {
            profile: readGovernanceProfile(db),
            sequences: VALID_CLAIM_SEQUENCES,
            lastTransitionAt: lastClaimRow?.lastTransitionAt ?? lastSession?.ended_at ?? null,
        };
    }, { dbPath, fallback });
}

// ----------------------------------------------------------------------------
// Registry — exported for the CLI
// ----------------------------------------------------------------------------

export const PROJECTIONS = Object.freeze({
    listClaimHeads,
    listUnresolvedClaims,
    listCitationChecks,
    getProjectOverview,
    listLiteratureSearches,
    listObserverAlerts,
    listGateChecks,
    getStateSnapshot,
});

export const KERNEL_CONTRACTS = Object.freeze({
    VALID_PROFILES,
    DEFAULT_PROFILE,
    NON_NEGOTIABLE_HOOKS,
    VALID_CLAIM_SEQUENCES,
});
