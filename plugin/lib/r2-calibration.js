// plugin/lib/r2-calibration.js
// Auto-Calibration Loop — R2 weakness tracking, researcher patterns, seed survival
// Blueprint v6.0 Section 6.3-6.5

/**
 * Compute exponential decay weight based on age.
 * @param {string} timestamp - ISO 8601 timestamp of the data point
 * @param {number} [decayRate=0.02] - Decay per week (0.02 = 2% per week)
 * @returns {number} Weight between 0 and 1 (1 = now, ~0.37 at 50 weeks)
 */
function computeDecayWeight(timestamp, decayRate = 0.02) {
    if (!timestamp) return 1; // Missing timestamp — treat as recent (no decay)
    const ts = new Date(timestamp).getTime();
    if (isNaN(ts)) return 1; // Invalid timestamp — treat as recent (no decay)
    const ageMs = Date.now() - ts;
    const ageWeeks = ageMs / (7 * 24 * 60 * 60 * 1000);
    return Math.exp(-decayRate * Math.max(0, ageWeeks));
}

/**
 * Load R2 calibration data from recent reviews.
 * Used at SessionStart to inject hints about R2's historical weaknesses.
 */
export function loadR2CalibrationData(db, projectPath) {
    // Last 20 reviews from last 10 sessions for this project
    const recentReviews = db.prepare(`
        SELECT review_mode, r2_weaknesses, sfi_caught, sfi_injected,
               sfi_missed, j0_score, timestamp
        FROM r2_reviews
        WHERE session_id IN (
            SELECT id FROM sessions WHERE project_path = ?
            ORDER BY started_at DESC LIMIT 10
        )
        ORDER BY timestamp DESC LIMIT 20
    `).all(projectPath);

    if (recentReviews.length === 0) {
        return {
            topWeaknesses: [],
            sfiWeakCategories: [],
            j0Trend: 'insufficient_data',
            totalReviews: 0,
            hint: null
        };
    }

    // Analyze weakness patterns (with temporal decay)
    const weaknessPatterns = {};
    for (const review of recentReviews) {
        if (review.r2_weaknesses) {
            try {
                const weaknesses = JSON.parse(review.r2_weaknesses);
                const weight = computeDecayWeight(review.timestamp);
                for (const w of weaknesses) {
                    weaknessPatterns[w] = (weaknessPatterns[w] || 0) + weight;
                }
            } catch { /* skip malformed JSON */ }
        }
    }

    // SFI catch rate per category
    let sfiStats = [];
    try {
        sfiStats = db.prepare(`
            SELECT
                json_each.value as fault_type,
                COUNT(*) as missed_count
            FROM r2_reviews, json_each(r2_reviews.sfi_missed)
            WHERE sfi_missed IS NOT NULL
            AND session_id IN (
                SELECT id FROM sessions WHERE project_path = ?
            )
            GROUP BY json_each.value
            ORDER BY missed_count DESC
        `).all(projectPath);
    } catch { /* json_each may not work on all SQLite builds */ }

    // J0 score trend (with temporal decay weighting)
    const j0Data = recentReviews
        .filter(r => r.j0_score !== null && r.j0_score !== undefined)
        .map(r => ({ score: r.j0_score, weight: computeDecayWeight(r.timestamp) }));

    let j0Trend = 'insufficient_data';
    if (j0Data.length >= 6) {
        const recent3 = j0Data.slice(0, 3);
        const older3 = j0Data.slice(-3);
        const weightedAvg = (arr) => {
            const totalW = arr.reduce((s, d) => s + d.weight, 0);
            return totalW > 0 ? arr.reduce((s, d) => s + d.score * d.weight, 0) / totalW : 0;
        };
        const recentAvg = weightedAvg(recent3);
        const olderAvg = weightedAvg(older3);
        j0Trend = recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    } else if (j0Data.length >= 3) {
        j0Trend = 'early_data';
    }

    const topWeaknesses = Object.entries(weaknessPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return {
        topWeaknesses,
        sfiWeakCategories: sfiStats.slice(0, 3),
        j0Trend,
        totalReviews: recentReviews.length,
        hint: generateR2Hint(weaknessPatterns, sfiStats, j0Trend)
    };
}

/**
 * Generate a human-readable hint for R2 based on historical weaknesses.
 */
function generateR2Hint(weaknesses, sfiStats, j0Trend) {
    const hints = [];

    // Weakness-based hints
    const sorted = Object.entries(weaknesses).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0 && sorted[0][1] >= 1.5) {
        hints.push(`R2 historically weak on "${sorted[0][0]}" (decay-weighted score: ${sorted[0][1].toFixed(1)}). High priority.`);
    }

    // SFI-based hints
    if (sfiStats.length > 0) {
        hints.push(
            `SFI: R2 most frequently misses fault type "${sfiStats[0].fault_type}". ` +
            `Inject faults of this category with priority.`
        );
    }

    // J0 trend
    if (j0Trend === 'declining') {
        hints.push(`J0 score declining in recent sessions. R2 review quality is degrading.`);
    }

    return hints.length > 0 ? hints.join(' ') : null;
}

/**
 * Load researcher error patterns for calibration hints.
 * Blueprint Section 6.4
 */
export function loadResearcherPatterns(db, projectPath) {
    // Repeated errors
    const errors = db.prepare(`
        SELECT action_type, input_summary, COUNT(*) as occurrences
        FROM spine_entries
        WHERE session_id IN (
            SELECT id FROM sessions WHERE project_path = ?
        )
        AND action_type = 'BUG_FIX'
        GROUP BY input_summary
        HAVING occurrences >= 2
        ORDER BY occurrences DESC
        LIMIT 5
    `).all(projectPath);

    // Gate failure patterns
    const gateFailures = db.prepare(`
        SELECT gate_id, COUNT(*) as fail_count
        FROM gate_checks
        WHERE session_id IN (
            SELECT id FROM sessions WHERE project_path = ?
        )
        AND status = 'FAIL'
        GROUP BY gate_id
        ORDER BY fail_count DESC
        LIMIT 5
    `).all(projectPath);

    return {
        repeatedErrors: errors,
        gateWeakpoints: gateFailures,
        hint: errors.length > 0
            ? `Warning: error "${errors[0].input_summary}" repeated ${errors[0].occurrences} times.`
            : null
    };
}

/**
 * Load pending serendipity seeds that survived from previous sessions.
 * Blueprint Section 6.5
 */
export function loadPendingSeeds(db, projectPath) {
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
}

/**
 * Update seed statuses at session end.
 * Blueprint Section 6.5
 */
export function updateSeedStatuses(db, seedUpdates) {
    const stmt = db.prepare(`
        UPDATE serendipity_seeds
        SET status = ?, resolution = ?, last_reviewed_session = ?, updated_at = ?
        WHERE seed_id = ?
    `);

    for (const update of seedUpdates) {
        try {
            stmt.run(
                update.status,
                update.resolution || null,
                update.sessionId,
                new Date().toISOString(),
                update.seedId
            );
        } catch {
            // Individual seed update failed — continue with remaining seeds
        }
    }
}
