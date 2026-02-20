/**
 * Vibe Science v6.0 NEXUS — Progressive Disclosure Context Builder
 *
 * Assembles the context injected into the agent's system prompt at
 * SessionStart and UserPromptSubmit.  Implements the 2-layer progressive
 * disclosure pattern adapted from claude-mem:
 *
 *   Layer 1: STATE SNAPSHOT (~200 tokens)
 *     - Last session stats + narrative excerpt
 *
 *   Layer 2: SEMANTIC RECALL (~500 tokens)
 *     - Top 3 relevant memories (via sqlite-vec / text fallback)
 *     - R2 calibration hints
 *     - Pending serendipity seeds
 *     - Unresolved observer alerts
 *
 *   Combined target: ~700 tokens
 *   Full load (Layer 3, on demand): ~3000-5000 tokens
 *   Savings: 4x-7x
 *
 * Export: buildContext, formatContextForInjection, truncate
 */

import path from 'node:path';
import { vecSearch } from './vec-search.js';
import { loadR2CalibrationData } from './r2-calibration.js';

// =====================================================
// Public API
// =====================================================

/**
 * Build the combined Layer 1 + Layer 2 context object for a project.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath - Absolute path to the project root
 * @param {string} sessionId   - Current session UUID
 * @returns {{
 *   state: string,
 *   memories: Array<{text: string, distance: number|null, metadata: object|null}>,
 *   r2Calibration: object,
 *   pendingSeeds: object[],
 *   alerts: object[]
 * }}
 */
export function buildContext(db, projectPath, sessionId) {
    const context = {};

    // ---------------------------------------------------------------
    // Layer 1: State snapshot from last completed session
    // ---------------------------------------------------------------
    try {
        const lastSession = db.prepare(`
            SELECT narrative_summary, total_actions, claims_created, claims_killed
            FROM sessions
            WHERE project_path = ?
            AND ended_at IS NOT NULL
            ORDER BY ended_at DESC
            LIMIT 1
        `).get(projectPath);

        if (lastSession) {
            context.state =
                `Ultima sessione: ${lastSession.total_actions ?? 0} azioni, ` +
                `${lastSession.claims_created ?? 0} claims create, ` +
                `${lastSession.claims_killed ?? 0} killed.\n` +
                `Summary: ${truncate(lastSession.narrative_summary, 200)}`;
        } else {
            context.state = 'Prima sessione su questo progetto.';
        }
    } catch {
        context.state = 'Prima sessione su questo progetto.';
    }

    // ---------------------------------------------------------------
    // Layer 2: Semantic recall (top 3 relevant memories)
    // ---------------------------------------------------------------
    try {
        const queryText = `${path.basename(projectPath)} research context`;
        context.memories = vecSearch(db, queryText, {
            project_path: projectPath,
            limit: 3,
            maxTokens: 500
        });
    } catch {
        context.memories = [];
    }

    // ---------------------------------------------------------------
    // Layer 2: R2 calibration data
    // ---------------------------------------------------------------
    try {
        context.r2Calibration = loadR2CalibrationData(db, projectPath);
    } catch {
        context.r2Calibration = {
            topWeaknesses: [],
            sfiWeakCategories: [],
            j0Trend: 'insufficient_data',
            totalReviews: 0,
            hint: null
        };
    }

    // ---------------------------------------------------------------
    // Layer 2: Pending serendipity seeds
    // ---------------------------------------------------------------
    context.pendingSeeds = loadPendingSeeds(db, projectPath);

    // ---------------------------------------------------------------
    // Layer 2: Unresolved observer alerts
    // ---------------------------------------------------------------
    try {
        context.alerts = db.prepare(`
            SELECT level, message FROM observer_alerts
            WHERE project_path = ? AND resolved = 0
            ORDER BY level DESC
            LIMIT 5
        `).all(projectPath);
    } catch {
        context.alerts = [];
    }

    return context;
}

/**
 * Format the context object into a plain-text string suitable for
 * injection into the agent's system prompt.
 *
 * Sections: [STATE], [MEMORY], [ALERTS], [R2 CALIBRATION], [PENDING SEEDS]
 * Target: ~700 tokens total.
 *
 * @param {object} context - Object returned by buildContext()
 * @param {object[]} [alerts] - Override alerts (if different from context.alerts)
 * @param {object} [r2Stats] - Override R2 stats (if different from context.r2Calibration)
 * @returns {string} Plain text ready for system prompt injection
 */
export function formatContextForInjection(context, alerts, r2Stats) {
    const parts = [];

    // Use provided overrides or fall back to context properties
    const effectiveAlerts = alerts ?? context.alerts ?? [];
    const effectiveR2 = r2Stats ?? context.r2Calibration ?? {};

    parts.push('--- VIBE SCIENCE CONTEXT ---');

    // --- State ---
    parts.push(`[STATE] ${context.state ?? 'No state available.'}`);

    // --- Memories ---
    const memories = context.memories ?? [];
    if (memories.length > 0) {
        parts.push('[MEMORY]');
        for (const m of memories) {
            parts.push(`  - ${truncate(m.text, 150)}`);
        }
    }

    // --- Alerts ---
    if (effectiveAlerts.length > 0) {
        parts.push('[ALERTS]');
        for (const a of effectiveAlerts) {
            parts.push(`  - [${a.level}] ${a.message}`);
        }
    }

    // --- R2 Calibration ---
    if (effectiveR2.hint) {
        parts.push(`[R2 CALIBRATION] ${effectiveR2.hint}`);
    }

    // --- Pending seeds ---
    const seeds = context.pendingSeeds ?? [];
    if (seeds.length > 0) {
        parts.push('[PENDING SEEDS]');
        for (const s of seeds) {
            const score = s.score != null ? s.score : '?';
            parts.push(`  - ${s.seed_id}: ${truncate(s.causal_question, 100)} (score: ${score})`);
        }
    }

    parts.push('--- END CONTEXT ---');

    return parts.join('\n');
}

// =====================================================
// Helpers
// =====================================================

/**
 * Truncate a string to `maxLen` characters, appending "..." if truncated.
 * Returns an empty string for null / undefined input.
 *
 * @param {string|null|undefined} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen - 3) + '...';
}

/**
 * Load pending serendipity seeds for a project.
 * Inline implementation (simple DB query) per Blueprint Section 6.5.
 *
 * Returns seeds with status PENDING_TRIAGE or QUEUED, sorted by score
 * descending, limited to 5.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {object[]}
 */
function loadPendingSeeds(db, projectPath) {
    try {
        return db.prepare(`
            SELECT seed_id, causal_question, discriminating_test, score, created_at
            FROM serendipity_seeds
            WHERE status IN ('PENDING_TRIAGE', 'QUEUED')
            AND created_session IN (
                SELECT id FROM sessions WHERE project_path = ?
            )
            ORDER BY score DESC
            LIMIT 5
        `).all(projectPath);
    } catch {
        return [];
    }
}
