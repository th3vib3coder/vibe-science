/**
 * Vibe Science v6.0 NEXUS — Pattern Extractor
 *
 * Analyzes cross-session data to identify recurring patterns:
 * - Gate failure clusters (same gate failing across 2+ sessions)
 * - Repeated actions (same action_type + input_summary across 2+ sessions)
 * - Claim lifecycle patterns (claims killed for same reason across sessions)
 *
 * Inspired by ECC's "instinct" system: observations → patterns → confidence-scored hints.
 */

/**
 * Extract recurring patterns from cross-session data.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @param {string} sessionId - Current session ID
 * @returns {Array<{pattern_type: string, description: string, evidence: string[], confidence: number}>}
 */
export function extractPatterns(db, projectPath, sessionId) {
    const patterns = [];

    // 1. Gate failure clusters: same gate failing across 2+ sessions
    try {
        const gateFailures = db.prepare(`
            SELECT gc.gate_id, COUNT(DISTINCT gc.session_id) as session_count,
                   COUNT(*) as total_failures
            FROM gate_checks gc
            JOIN sessions s ON gc.session_id = s.id
            WHERE s.project_path = ?
              AND gc.status = 'FAIL'
            GROUP BY gc.gate_id
            HAVING session_count >= 2
            ORDER BY session_count DESC, total_failures DESC
            LIMIT 5
        `).all(projectPath);

        for (const gf of gateFailures) {
            const confidence = Math.min(1.0, 0.3 + (gf.session_count * 0.15));
            patterns.push({
                pattern_type: 'GATE_FAILURE_CLUSTER',
                description: `Gate ${gf.gate_id} recurring failure`,
                evidence: [`gate_id=${gf.gate_id}`, `sessions=${gf.session_count}`, `total=${gf.total_failures}`],
                confidence
            });
        }
    } catch {
        // Table may not exist or query may fail — skip
    }

    // 2. Repeated actions: same action_type + input_summary across 2+ sessions
    try {
        const repeatedActions = db.prepare(`
            SELECT se.action_type, se.input_summary,
                   COUNT(DISTINCT se.session_id) as session_count,
                   COUNT(*) as total_occurrences
            FROM spine_entries se
            JOIN sessions s ON se.session_id = s.id
            WHERE s.project_path = ?
              AND se.input_summary IS NOT NULL
              AND se.action_type NOT IN ('COMPACT_SNAPSHOT', 'TOOL_USE')
            GROUP BY se.action_type, se.input_summary
            HAVING session_count >= 2
            ORDER BY session_count DESC, total_occurrences DESC
            LIMIT 5
        `).all(projectPath);

        for (const ra of repeatedActions) {
            const confidence = Math.min(1.0, 0.25 + (ra.session_count * 0.1));
            patterns.push({
                pattern_type: 'REPEATED_ACTION',
                description: `${ra.action_type}: "${ra.input_summary}"`,
                evidence: [`action=${ra.action_type}`, `summary=${ra.input_summary}`, `sessions=${ra.session_count}`, `total=${ra.total_occurrences}`],
                confidence
            });
        }
    } catch {
        // Skip on error
    }

    // 3. Claim lifecycle patterns: claims killed for same reason across sessions
    try {
        const killPatterns = db.prepare(`
            SELECT ce.kill_reason, COUNT(DISTINCT ce.session_id) as session_count,
                   COUNT(DISTINCT ce.claim_id) as claims_killed
            FROM claim_events ce
            JOIN sessions s ON ce.session_id = s.id
            WHERE s.project_path = ?
              AND ce.event_type = 'KILLED'
              AND ce.kill_reason IS NOT NULL
            GROUP BY ce.kill_reason
            HAVING session_count >= 2
            ORDER BY claims_killed DESC
            LIMIT 5
        `).all(projectPath);

        for (const kp of killPatterns) {
            const confidence = Math.min(1.0, 0.35 + (kp.session_count * 0.15));
            patterns.push({
                pattern_type: 'CLAIM_LIFECYCLE',
                description: `Claims killed for "${kp.kill_reason}"`,
                evidence: [`reason=${kp.kill_reason}`, `sessions=${kp.session_count}`, `killed=${kp.claims_killed}`],
                confidence
            });
        }
    } catch {
        // Skip on error
    }

    return patterns;
}
