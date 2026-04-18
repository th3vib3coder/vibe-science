/**
 * Vibe Science Core Reader — read-only projections for the VRE kernel bridge.
 *
 * Ships the 8 projections the VRE `environment/lib/kernel-bridge.js` helper
 * expects (per Phase 6 WP-150 contract).
 *
 * Design principle: thin wrappers over existing `plugin/lib/db.js` helpers,
 * hook configuration files, and static kernel contracts. Degraded projections
 * are explicitly marked in the CLI envelope; they are never reported as
 * verified kernel-backed zeroes.
 */

import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const here = path.dirname(fileURLToPath(import.meta.url));
const KERNEL_ROOT = path.resolve(here, '..', '..');
const PROJECTION_META = Symbol('vibeScienceProjectionMeta');

/**
 * Governance profile enum. Defaults live in CLAUDE.md / MODE_HOOKS; the kernel
 * does not persist a "current profile" in DB today. Phase 6.1 contract: the
 * core-reader reports 'default' unless a future meta key ('governance.profile')
 * is set by kernel runtime.
 */
const VALID_PROFILES = Object.freeze(['default', 'strict']);
const DEFAULT_PROFILE = 'default';

const GOVERNANCE_HOOKS = Object.freeze([
    {
        hook: 'confounder_check',
        event: 'PreToolUse',
        script: 'plugin/scripts/pre-tool-use.js',
        testHint: 'tests/governance-hooks.test.mjs',
    },
    {
        hook: 'schema_file_protection',
        event: 'PreToolUse',
        script: 'plugin/scripts/pre-tool-use.js',
        testHint: 'tests/governance-hooks.test.mjs',
    },
    {
        hook: 'stop_blocking',
        event: 'Stop',
        script: 'plugin/scripts/stop.js',
        testHint: 'tests/governance-hooks.test.mjs',
    },
    {
        hook: 'integrity_degradation_tracking',
        event: 'PostToolUse',
        script: 'plugin/scripts/post-tool-use.js',
        testHint: 'tests/governance-hooks.test.mjs',
    },
]);

const NON_NEGOTIABLE_HOOKS = Object.freeze(GOVERNANCE_HOOKS.map((entry) => entry.hook));

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

function attachProjectionMeta(value, meta) {
    if (value != null && (typeof value === 'object' || typeof value === 'function')) {
        Object.defineProperty(value, PROJECTION_META, {
            value: Object.freeze({ ...meta }),
            enumerable: false,
            configurable: false,
        });
    }
    return value;
}

export function getProjectionMeta(value) {
    return value?.[PROJECTION_META] ?? {
        dbAvailable: true,
        sourceMode: 'kernel-backed',
        degradedReason: null,
    };
}

function safeOpen(dbPath = DEFAULT_DB_PATH) {
    try {
        if (!fs.existsSync(dbPath)) {
            return {
                db: null,
                degradedReason: `kernel DB missing at ${dbPath}`,
            };
        }
        const db = openDB(dbPath);
        if (!db) {
            return {
                db: null,
                degradedReason: 'better-sqlite3 unavailable; kernel DB cannot be opened',
            };
        }
        return { db, degradedReason: null };
    } catch (error) {
        return {
            db: null,
            degradedReason: `kernel DB open failed: ${error.message}`,
        };
    }
}

function withDb(fn, { dbPath = DEFAULT_DB_PATH, fallback = null } = {}) {
    const { db, degradedReason } = safeOpen(dbPath);
    if (!db) {
        return attachProjectionMeta(
            typeof fallback === 'function' ? fallback() : fallback,
            { dbAvailable: false, sourceMode: 'degraded', degradedReason }
        );
    }
    try {
        return attachProjectionMeta(
            fn(db),
            { dbAvailable: true, sourceMode: 'kernel-backed', degradedReason: null }
        );
    } catch (error) {
        return attachProjectionMeta(
            typeof fallback === 'function' ? fallback() : fallback,
            {
                dbAvailable: false,
                sourceMode: 'degraded',
                degradedReason: `kernel DB projection failed: ${error.message}`,
            }
        );
    } finally {
        try { closeDB(db); } catch { /* ignore */ }
    }
}

function readJsonIfPresent(relativePath) {
    const absolutePath = path.join(KERNEL_ROOT, relativePath);
    try {
        if (!fs.existsSync(absolutePath)) return null;
        return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    } catch {
        return null;
    }
}

function scriptIsRunnable(absolutePath) {
    try {
        fs.accessSync(absolutePath, fs.constants.R_OK);
        if (process.platform !== 'win32') {
            fs.accessSync(absolutePath, fs.constants.X_OK);
        }
        return true;
    } catch {
        return false;
    }
}

function runGovernanceHookProbe() {
    const relativePath = 'tests/governance-hooks.test.mjs';
    const absolutePath = path.join(KERNEL_ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
        return {
            status: 'missing',
            testHint: relativePath,
            details: `missing probe ${relativePath}`,
            exitCode: null,
        };
    }

    const result = spawnSync(process.execPath, ['--test', absolutePath], {
        cwd: KERNEL_ROOT,
        encoding: 'utf8',
        timeout: 15_000,
        windowsHide: true,
        env: {
            ...process.env,
            NODE_OPTIONS: '',
        },
    });

    if (result.error) {
        return {
            status: 'missing',
            testHint: relativePath,
            details: `governance hook probe failed to execute: ${result.error.message}`,
            exitCode: null,
        };
    }

    if (result.status !== 0) {
        const diagnostic = `${result.stderr ?? ''}\n${result.stdout ?? ''}`.trim();
        return {
            status: 'missing',
            testHint: relativePath,
            details: `governance hook probe failed with exit ${result.status}: ${diagnostic.slice(0, 300)}`,
            exitCode: result.status,
        };
    }

    return {
        status: 'ok',
        testHint: relativePath,
        details: `governance hook probe ${relativePath} passed`,
        exitCode: 0,
    };
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function commandReferencesScript(command, scriptRelPath) {
    if (typeof command !== 'string' || command.trim() === '') return false;
    const normalized = command.replace(/\\/g, '/');
    const needle = scriptRelPath.replace(/\\/g, '/');
    const escapedNeedle = escapeRegExp(needle);
    const rootPatterns = [
        '\\$CLAUDE_PROJECT_DIR',
        '\\$\\{CLAUDE_PROJECT_DIR\\}',
        '\\$CLAUDE_PLUGIN_ROOT',
        '\\$\\{CLAUDE_PLUGIN_ROOT\\}',
    ];
    const scriptTokenBoundary = '($|[\\s"\'])';

    if (new RegExp(`(^|[\\s"\'])${escapedNeedle}${scriptTokenBoundary}`).test(normalized)) {
        return true;
    }

    return rootPatterns.some((rootPattern) =>
        new RegExp(`(^|[\\s"\'])${rootPattern}/${escapedNeedle}${scriptTokenBoundary}`).test(normalized)
    );
}

function configReferencesScript(config, event, scriptRelPath) {
    const entries = config?.hooks?.[event];
    if (!Array.isArray(entries)) return false;
    return entries.some((entry) => {
        const hooks = Array.isArray(entry?.hooks) ? entry.hooks : [];
        return hooks.some((hook) =>
            hook?.type === 'command' && commandReferencesScript(hook.command, scriptRelPath)
        );
    });
}

function inspectGovernanceHooks(projectPath = null) {
    const claudeSettings = readJsonIfPresent('.claude/settings.json');
    const packagedHooks = readJsonIfPresent('hooks/hooks.json');
    const probe = runGovernanceHookProbe();

    return GOVERNANCE_HOOKS.map((entry) => {
        const scriptPath = path.join(KERNEL_ROOT, entry.script);
        const testPath = path.join(KERNEL_ROOT, entry.testHint);
        const scriptExists = fs.existsSync(scriptPath);
        const runnable = scriptExists && scriptIsRunnable(scriptPath);
        const testExists = fs.existsSync(testPath);
        const configuredIn = [];

        if (configReferencesScript(claudeSettings, entry.event, entry.script)) {
            configuredIn.push('.claude/settings.json');
        }
        if (configReferencesScript(packagedHooks, entry.event, entry.script)) {
            configuredIn.push('hooks/hooks.json');
        }

        const status = runnable && configuredIn.length > 0 && probe.status === 'ok' ? 'ok' : 'missing';
        const missing = [];
        if (!scriptExists) missing.push(`missing script ${entry.script}`);
        if (scriptExists && !runnable) missing.push(`script ${entry.script} is not runnable`);
        if (configuredIn.length === 0) missing.push(`no ${entry.event} config references ${entry.script}`);
        if (probe.status !== 'ok') missing.push(probe.details);

        return {
            gateId: null,
            hook: entry.hook,
            status,
            projectPath: projectPath ?? null,
            createdAt: null,
            details: status === 'ok'
                ? `Runtime hook ${entry.script} is present, runnable, configured for ${entry.event}, and covered by ${probe.testHint}.`
                : missing.join('; '),
            synthetic: false,
            source: 'hook-config',
            scriptPath: entry.script,
            runnable,
            configuredIn,
            probeTest: testExists ? entry.testHint : null,
            probeStatus: probe.status,
            probeExitCode: probe.exitCode,
        };
    });
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
 * Projection 7 — gate checks merged with runtime hook configuration.
 * The kernel's `gate_checks` table tracks data-quality gates (DQ1/G0-G6).
 * Governance non-negotiable hooks are checked against committed hook config
 * and scripts; no hook is reported `ok` just because it appears in a static
 * allowlist.
 */
export function listGateChecks({ projectPath = null, dbPath = DEFAULT_DB_PATH, limit = 100 } = {}) {
    const hookChecks = inspectGovernanceHooks(projectPath);
    const hookStatusOk = hookChecks.every((entry) => entry.status === 'ok');

    const concrete = withDb((db) => {
        const rows = db.prepare(`
            SELECT gc.gate_id AS gateId, gc.status AS status, gc.timestamp AS createdAt,
                   s.project_path AS projectPath, gc.details AS details
            FROM gate_checks gc
            LEFT JOIN sessions s ON s.id = gc.session_id
            ${projectPath ? 'WHERE s.project_path = @projectPath' : ''}
            ORDER BY gc.timestamp DESC
            LIMIT @limit
        `).all({ projectPath: projectPath ?? '', limit });

        return rows.map((r) => ({
            gateId: r.gateId,
            hook: r.gateId,  // data-quality gates don't have "hook" names; reuse gateId
            status: r.status,
            projectPath: r.projectPath,
            createdAt: r.createdAt,
            details: r.details,
        }));
    }, { dbPath, fallback: [] });

    const dbMeta = getProjectionMeta(concrete);
    const sourceMode = !hookStatusOk
        ? 'degraded'
        : dbMeta.sourceMode === 'kernel-backed'
            ? 'kernel-backed'
            : 'degraded';
    const degradedReason = !hookStatusOk
        ? `one or more governance hooks are not installed/configured: ${
            hookChecks.filter((entry) => entry.status !== 'ok').map((entry) => entry.hook).join(', ')
        }`
        : dbMeta.degradedReason;

    return attachProjectionMeta(
        [...concrete, ...hookChecks],
        {
            dbAvailable: dbMeta.dbAvailable,
            sourceMode,
            degradedReason,
        }
    );
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
