#!/usr/bin/env node

/**
 * Vibe Science v6.0 NEXUS -- Stop Hook
 *
 * Runs when the agent is about to end the session.
 * Blueprint Section 4.4.
 *
 * Three responsibilities:
 *   1. NARRATIVE SUMMARY -- template-based session recap, saved to DB + embed queue
 *   2. ENFORCEMENT CHECKS -- block stop if unreviewed claims exist (LAW 4)
 *   3. STATE EXPORT -- update .vibe-science/STATE.md for resumability (LAW 7)
 *
 * Exit codes:
 *   0 -- session may end normally
 *   2 -- BLOCKED: unreviewed claims remain
 *   1 -- internal error
 */

import { openDB, initDB, closeDB, endSession } from '../lib/db.js';
import { generateNarrativeSummary, updateStateMdFromDB } from '../lib/narrative-engine.js';
import { queueForEmbedding } from '../lib/vec-search.js';

// =====================================================
// Main
// =====================================================

async function main(event) {
    const sessionId = event.session_id ?? event.sessionId ?? null;
    const projectPath = event.project_path ?? event.projectPath ?? process.cwd();

    if (!sessionId) {
        return {
            exitCode: 0,
            message: 'No session_id provided; nothing to summarize.'
        };
    }

    let db;
    try {
        db = openDB();
        initDB(db);
    } catch (err) {
        // DB not available -- degrade gracefully (LAW 7: system works without DB too)
        return {
            exitCode: 0,
            message: `DB unavailable (${err.message}); skipping stop hook.`
        };
    }

    try {
        // =========================================================
        // 1. NARRATIVE SUMMARY (template-based, no LLM)
        // =========================================================

        const spineEntries = db.prepare(
            `SELECT * FROM spine_entries WHERE session_id = ? ORDER BY timestamp`
        ).all(sessionId);

        const claimEvents = db.prepare(
            `SELECT * FROM claim_events WHERE session_id = ? ORDER BY timestamp`
        ).all(sessionId);

        const gateChecks = db.prepare(
            `SELECT * FROM gate_checks WHERE session_id = ? ORDER BY timestamp`
        ).all(sessionId);

        const summary = generateNarrativeSummary({
            entries: spineEntries,
            claims: claimEvents,
            gates: gateChecks,
            sessionId,
            projectPath
        });

        // Compute session stats
        const claimsCreated = claimEvents.filter(c => c.event_type === 'CREATED').length;
        const claimsKilled = claimEvents.filter(c => c.event_type === 'KILLED').length;
        const gatesPassed = gateChecks.filter(g => g.status === 'PASS').length;
        const gatesFailed = gateChecks.filter(g => g.status === 'FAIL').length;

        // Save to sessions table
        endSession(db, sessionId, {
            narrative_summary: summary.text,
            total_actions: spineEntries.length,
            claims_created: claimsCreated,
            claims_killed: claimsKilled,
            gates_passed: gatesPassed,
            gates_failed: gatesFailed
        });

        // Queue summary for async embedding by the worker
        queueForEmbedding(db, summary.text, {
            session_id: sessionId,
            type: 'narrative_summary',
            project_path: projectPath
        });

        // =========================================================
        // 2. ENFORCEMENT CHECKS (LAW 4: R2 is co-pilot)
        // =========================================================

        const unreviewedClaims = db.prepare(`
            SELECT DISTINCT ce.claim_id
            FROM claim_events ce
            WHERE ce.session_id = ?
              AND ce.event_type = 'CREATED'
              AND ce.claim_id NOT IN (
                  SELECT claim_id FROM claim_events
                  WHERE event_type IN ('R2_REVIEWED', 'KILLED', 'DISPUTED')
              )
        `).all(sessionId);

        if (unreviewedClaims.length > 0) {
            const claimIds = unreviewedClaims.map(c => c.claim_id).join(', ');
            return {
                exitCode: 2,
                message: `STOP BLOCKED: ${unreviewedClaims.length} claims senza R2 review: ${claimIds}. LAW 4: R2 is co-pilot.`,
                narrative: summary.text,
                stats: {
                    total_actions: spineEntries.length,
                    claims_created: claimsCreated,
                    claims_killed: claimsKilled,
                    gates_passed: gatesPassed,
                    gates_failed: gatesFailed,
                    unreviewed_claims: unreviewedClaims.length
                }
            };
        }

        // =========================================================
        // 3. STATE EXPORT (LAW 7: resumability)
        // =========================================================

        await updateStateMdFromDB(db, sessionId, projectPath);

        return {
            exitCode: 0,
            message: 'Session ended. Narrative summary saved.',
            narrative: summary.text,
            stats: {
                total_actions: spineEntries.length,
                claims_created: claimsCreated,
                claims_killed: claimsKilled,
                gates_passed: gatesPassed,
                gates_failed: gatesFailed,
                unreviewed_claims: 0
            }
        };
    } finally {
        closeDB(db);
    }
}

// =====================================================
// stdin reading (Claude Code hook protocol)
// =====================================================

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const event = JSON.parse(input || '{}');
    main(event).then(result => {
        process.stdout.write(JSON.stringify(result));
        process.exit(result.exitCode === 2 ? 2 : 0);
    }).catch(err => {
        process.stderr.write(err.message);
        process.exit(1);
    });
});
