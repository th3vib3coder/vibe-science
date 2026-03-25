#!/usr/bin/env node

import { canonicalizeProjectPath } from '../lib/path-utils.js';

/**
 * Vibe Science v7.0 TRACE -- Stop Hook
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

// Dynamic imports — graceful if better-sqlite3 or other native deps missing
let openDB, initDB, closeDB, endSession, updateSessionIntegrity, applyMigrations, generateNarrativeSummary, updateStateMdFromDB, queueForEmbedding, syncSessionRetrievalIndex;
let upsertPattern = () => {};
let extractPatterns = () => [];

try {
    const dbMod = await import('../lib/db.js');
    openDB = dbMod.openDB;
    initDB = dbMod.initDB;
    closeDB = dbMod.closeDB;
    endSession = dbMod.endSession;
    updateSessionIntegrity = dbMod.updateSessionIntegrity;
    upsertPattern = dbMod.upsertPattern;
    const migrationMod = await import('../lib/migrations.js');
    applyMigrations = migrationMod.applyMigrations;
} catch {
    openDB = () => null;
    initDB = () => {};
    closeDB = () => {};
    endSession = () => {};
    updateSessionIntegrity = () => {};
    applyMigrations = () => {};
}

try {
    const narMod = await import('../lib/narrative-engine.js');
    generateNarrativeSummary = narMod.generateNarrativeSummary;
    updateStateMdFromDB = narMod.updateStateMdFromDB;
} catch {
    generateNarrativeSummary = () => ({ text: 'Session summary unavailable (narrative-engine not loaded).', tokenEstimate: 0 });
    updateStateMdFromDB = () => {};
}

try {
    const vecMod = await import('../lib/vec-search.js');
    queueForEmbedding = vecMod.queueForEmbedding;
    syncSessionRetrievalIndex = vecMod.syncSessionRetrievalIndex;
} catch {
    queueForEmbedding = () => {};
    syncSessionRetrievalIndex = () => {};
}

try {
    const patMod = await import('../lib/pattern-extractor.js');
    extractPatterns = patMod.extractPatterns;
} catch {
    // pattern-extractor.js not available — degraded mode
}

// =====================================================
// Main
// =====================================================

async function main(event) {
    const sessionId = event.session_id ?? event.sessionId ?? null;
    const projectPath = canonicalizeProjectPath(event.project_path || event.cwd || process.cwd());
    const strictMode = process.env.VIBE_SCIENCE_STRICT === '1';
    const integrityNotes = [];
    let integrityStatus = 'INTEGRITY_OK';

    function markIntegrity(note) {
        const text = String(note || '').trim();
        if (!text) return;
        integrityStatus = 'INTEGRITY_DEGRADED';
        if (!integrityNotes.includes(text)) integrityNotes.push(text);
    }

    // Guard against infinite loops: if Claude is already continuing from a
    // previous stop hook block, allow the stop to proceed unconditionally.
    // Per Claude Code spec: stop_hook_active = true means this is a re-entry.
    if (event.stop_hook_active) {
        if (strictMode) {
            markIntegrity('stop_hook_active detected during strict mode; allowing stop to prevent infinite loop.');
        }
        return {
            exitCode: 0,
            message: strictMode
                ? '[INTEGRITY DEGRADED] stop_hook_active detected — allowing stop to prevent infinite loop.'
                : 'stop_hook_active detected — allowing stop to prevent infinite loop.'
        };
    }

    if (!sessionId) {
        if (strictMode) {
            return {
                exitCode: 2,
                message: '[INTEGRITY DEGRADED] No session_id provided; strict mode refuses to end without lifecycle validation.'
            };
        }
        return {
            exitCode: 0,
            message: 'No session_id provided; nothing to summarize.'
        };
    }

    let db;
    try {
        db = openDB();
        initDB(db);
        applyMigrations(db);
    } catch (err) {
        // DB not available -- degrade gracefully (LAW 7: system works without DB too)
        markIntegrity(`Stop hook DB unavailable: ${err.message}`);
        if (strictMode) {
            return {
                exitCode: 2,
                message: `[INTEGRITY DEGRADED] Stop hook cannot access DB: ${err.message}. Lifecycle enforcement unavailable; unset VIBE_SCIENCE_STRICT=1 only for emergency override.`
            };
        }
        return {
            exitCode: 0,
            message: `DB unavailable (${err.message}); skipping stop hook.`
        };
    }

    if (!db) {
        markIntegrity('Stop hook DB unavailable: better-sqlite3 not installed.');
        if (strictMode) {
            return {
                exitCode: 2,
                message: '[INTEGRITY DEGRADED] better-sqlite3 not available; strict mode refuses to skip stop enforcement.'
            };
        }
        return {
            exitCode: 0,
            message: 'DB not available (better-sqlite3 not installed); skipping stop hook.'
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

        // =========================================================
        // 2. ENFORCEMENT CHECKS (LAW 4: R2 is co-pilot)
        //    Must run BEFORE endSession to avoid setting ended_at prematurely
        // =========================================================

        // Find claims whose MOST RECENT lifecycle event is CREATED (not yet reviewed/killed/disputed).
        // This handles re-created claims correctly: if C-001 was reviewed in session 1 then
        // re-created in session 2, the latest event is CREATED → requires new review.
        const unreviewedClaims = db.prepare(`
            SELECT claim_id FROM (
                SELECT ce.claim_id, ce.event_type,
                       ROW_NUMBER() OVER (PARTITION BY ce.claim_id ORDER BY ce.timestamp DESC, ce.id DESC) AS rn
                FROM claim_events ce
                WHERE ce.session_id IN (
                    SELECT id FROM sessions WHERE project_path = ?
                )
            )
            WHERE rn = 1 AND event_type = 'CREATED'
        `).all(projectPath);

        if (unreviewedClaims.length > 0) {
            const claimIds = unreviewedClaims.map(c => c.claim_id).join(', ');
            return {
                exitCode: 2,
                message: `STOP BLOCKED: ${unreviewedClaims.length} unreviewed claims without R2 review: ${claimIds}. TRACE lifecycle enforcement is active in v7; LAW 4: R2 is co-pilot.`,
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

        // Queue summary for async embedding by the worker
        try {
            queueForEmbedding(db, summary.text, {
                session_id: sessionId,
                type: 'narrative_summary',
                project_path: projectPath
            });
        } catch (err) {
            markIntegrity(`Narrative embedding queue failed: ${err.message}`);
        }

        // =========================================================
        // 3. PATTERN EXTRACTION (cross-session recurring patterns)
        // =========================================================

        try {
            const patterns = extractPatterns(db, projectPath, sessionId);
            for (const pattern of patterns) {
                upsertPattern(db, {
                    ...pattern,
                    project_path: projectPath
                });
            }
        } catch {
            // Pattern extraction is non-critical — never block stop
            markIntegrity('Pattern extraction failed during stop hook.');
        }

        if (integrityStatus === 'INTEGRITY_DEGRADED') {
            try {
                updateSessionIntegrity(db, sessionId, {
                    status: integrityStatus,
                    note: integrityNotes.join('\n'),
                });
            } catch (err) {
                markIntegrity(`Session integrity update failed: ${err.message}`);
            }
        }

        try {
            endSession(db, sessionId, {
                narrative_summary: summary.text,
                total_actions: spineEntries.length,
                claims_created: claimsCreated,
                claims_killed: claimsKilled,
                gates_passed: gatesPassed,
                gates_failed: gatesFailed,
                integrity_status: integrityStatus,
                integrity_notes: integrityNotes.length > 0 ? integrityNotes.join('\n') : null,
            });
        } catch (err) {
            return {
                exitCode: 2,
                message: `[INTEGRITY DEGRADED] STOP BLOCKED: failed to persist session summary/endSession (${err.message}). Retry stop after DB access is restored.`,
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
        }

        // =========================================================
        // 4. STATE EXPORT (LAW 7: resumability)
        //    Must happen AFTER endSession so STATE.md reflects
        //    the persisted session summary/end markers.
        // =========================================================

        try {
            updateStateMdFromDB(db, sessionId, projectPath);
        } catch (err) {
            markIntegrity(`STATE export failed: ${err.message}`);
            try {
                updateSessionIntegrity(db, sessionId, {
                    status: 'INTEGRITY_DEGRADED',
                    note: `STATE export failed: ${err.message}`,
                });
            } catch {
                // Never block a successfully persisted stop on STATE export drift.
            }
        }

        try {
            syncSessionRetrievalIndex(db, sessionId);
        } catch (err) {
            markIntegrity(`Retrieval index sync failed: ${err.message}`);
            try {
                updateSessionIntegrity(db, sessionId, {
                    status: 'INTEGRITY_DEGRADED',
                    note: `Retrieval index sync failed: ${err.message}`,
                });
            } catch {
                // Retrieval sync is non-critical; never block a successfully persisted endSession.
            }
        }

        return {
            exitCode: 0,
            message: integrityStatus === 'INTEGRITY_DEGRADED'
                ? `[INTEGRITY DEGRADED] Session ended. Narrative summary saved with degraded infrastructure notes.`
                : 'Session ended. Narrative summary saved.',
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
    let event = {};
    try {
        event = JSON.parse(input || '{}');
    } catch {
        // Malformed stdin -- proceed with empty event
    }
    main(event).then(result => {
        // Claude Code Stop protocol:
        //   exit 2 + stderr = block stop, stderr shown to Claude
        //   JSON {"decision":"block","reason":"..."} = block stop with reason
        //   exit 0 = allow stop
        if (result.exitCode === 2) {
            const reason = result.message || 'Stop blocked by enforcement check.';
            process.stderr.write(reason);
            process.exit(2);
        }
        // Allow stop — emit message if present (e.g. stop_hook_active degradation note)
        if (result.message) {
            process.stderr.write(result.message + '\n');
        }
        process.exit(0);
    }).catch(err => {
        // Never block due to our own bugs
        process.stderr.write(`Stop hook error: ${err.message}\n`);
        process.exit(0);
    });
});
