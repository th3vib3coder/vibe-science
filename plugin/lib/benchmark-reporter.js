'use strict';

/**
 * Vibe Science v7.0 TRACE — Benchmark Reporter
 *
 * Records, aggregates, and compares eval/benchmark results stored in
 * the benchmark_runs table.  Consumed by eval harnesses and CI scripts
 * to track skill quality across versions.
 *
 * All functions degrade gracefully when db is null/undefined — they
 * return safe defaults instead of throwing.
 *
 * Exports:
 *   recordBenchmark(db, result)          — insert one eval result
 *   generateReport(db, version)          — aggregate stats for a version
 *   compareVersions(db, versionA, versionB) — delta between two versions
 */

// ─────────────────────────────────────────────────────────────────────
// recordBenchmark
// ─────────────────────────────────────────────────────────────────────

/**
 * Records a benchmark/eval result to the database.
 *
 * @param {object} db - SQLite database handle (better-sqlite3).
 *                      Must support `.prepare(sql).run(...)`.
 * @param {object} result
 * @param {string} result.run_id            - Unique identifier for this eval run
 * @param {string} result.skill_version     - Skill version string (e.g. "7.0.0")
 * @param {string} result.eval_case         - Name of the eval case
 * @param {string} result.category          - Category grouping (e.g. "gate", "narrative")
 * @param {boolean|number} result.passed    - Whether the case passed (truthy → 1)
 * @param {number} [result.execution_time_ms] - Wall-clock time in milliseconds
 * @param {number} [result.token_count]     - Tokens consumed
 * @param {string} [result.notes]           - Free-text notes
 * @returns {boolean} true if the row was inserted, false if db unavailable
 */
function recordBenchmark(db, result) {
    if (!db) return false;

    try {
        db.prepare(
            `INSERT INTO benchmark_runs
                (run_id, skill_version, eval_case, category, passed,
                 execution_time_ms, token_count, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            result.run_id,
            result.skill_version,
            result.eval_case,
            result.category,
            result.passed ? 1 : 0,
            result.execution_time_ms ?? null,
            result.token_count ?? null,
            result.notes ?? null
        );
        return true;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────
// generateReport
// ─────────────────────────────────────────────────────────────────────

/**
 * Generates a summary report for a given skill version.
 *
 * @param {object} db      - SQLite database handle
 * @param {string} version - Skill version string (e.g. "7.0.0")
 * @returns {object} {
 *   version, total, passed, failed, pass_rate,
 *   avg_time_ms, avg_tokens,
 *   per_case: [{ eval_case, total, passed, failed, pass_rate, avg_time_ms, avg_tokens }]
 * }
 */
function generateReport(db, version) {
    const empty = {
        version: version,
        total: 0,
        passed: 0,
        failed: 0,
        pass_rate: 0,
        avg_time_ms: 0,
        avg_tokens: 0,
        per_case: []
    };

    if (!db) return empty;

    try {
        // ── Aggregate totals ──────────────────────────────────────
        const summary = db.prepare(
            `SELECT
                 COUNT(*)                              AS total,
                 COALESCE(SUM(passed), 0)              AS passed,
                 COUNT(*) - COALESCE(SUM(passed), 0)   AS failed,
                 AVG(execution_time_ms)                AS avg_time_ms,
                 AVG(token_count)                      AS avg_tokens
             FROM benchmark_runs
             WHERE skill_version = ?`
        ).get(version);

        if (!summary || summary.total === 0) return empty;

        // ── Per-case breakdown ────────────────────────────────────
        const cases = db.prepare(
            `SELECT
                 eval_case,
                 COUNT(*)                              AS total,
                 COALESCE(SUM(passed), 0)              AS passed,
                 COUNT(*) - COALESCE(SUM(passed), 0)   AS failed,
                 AVG(execution_time_ms)                AS avg_time_ms,
                 AVG(token_count)                      AS avg_tokens
             FROM benchmark_runs
             WHERE skill_version = ?
             GROUP BY eval_case
             ORDER BY eval_case`
        ).all(version);

        const perCase = cases.map(c => ({
            eval_case: c.eval_case,
            total: c.total,
            passed: c.passed,
            failed: c.failed,
            pass_rate: c.total > 0 ? c.passed / c.total : 0,
            avg_time_ms: c.avg_time_ms ?? 0,
            avg_tokens: c.avg_tokens ?? 0
        }));

        return {
            version,
            total: summary.total,
            passed: summary.passed,
            failed: summary.failed,
            pass_rate: summary.total > 0 ? summary.passed / summary.total : 0,
            avg_time_ms: summary.avg_time_ms ?? 0,
            avg_tokens: summary.avg_tokens ?? 0,
            per_case: perCase
        };
    } catch {
        return empty;
    }
}

// ─────────────────────────────────────────────────────────────────────
// compareVersions
// ─────────────────────────────────────────────────────────────────────

/**
 * Compares benchmark results between two skill versions.
 *
 * @param {object} db        - SQLite database handle
 * @param {string} versionA  - First version  (baseline)
 * @param {string} versionB  - Second version (candidate)
 * @returns {object} {
 *   versionA, versionB,
 *   reportA, reportB,
 *   delta_pass_rate, delta_avg_time,
 *   improved_cases, regressed_cases
 * }
 */
function compareVersions(db, versionA, versionB) {
    const reportA = generateReport(db, versionA);
    const reportB = generateReport(db, versionB);

    // Build per-case lookup for version A
    const caseMapA = {};
    for (const c of reportA.per_case) {
        caseMapA[c.eval_case] = c;
    }

    // Identify improved and regressed eval cases
    const improved = [];
    const regressed = [];
    const caseMapB = {};

    for (const caseB of reportB.per_case) {
        caseMapB[caseB.eval_case] = caseB;
        const caseA = caseMapA[caseB.eval_case];
        if (!caseA) {
            // New case in versionB — if passing, count as improved
            if (caseB.pass_rate > 0) {
                improved.push(caseB.eval_case);
            }
            continue;
        }

        if (caseB.pass_rate > caseA.pass_rate) {
            improved.push(caseB.eval_case);
        } else if (caseB.pass_rate < caseA.pass_rate) {
            regressed.push(caseB.eval_case);
        }
    }

    for (const caseA of reportA.per_case) {
        if (!caseMapB[caseA.eval_case]) {
            regressed.push(caseA.eval_case);
        }
    }

    return {
        versionA,
        versionB,
        reportA,
        reportB,
        delta_pass_rate: reportB.pass_rate - reportA.pass_rate,
        delta_avg_time: reportB.avg_time_ms - reportA.avg_time_ms,
        improved_cases: improved,
        regressed_cases: regressed
    };
}

// ─────────────────────────────────────────────────────────────────────
// Module exports
// ─────────────────────────────────────────────────────────────────────

export {
    recordBenchmark,
    generateReport,
    compareVersions
};
