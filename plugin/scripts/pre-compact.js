#!/usr/bin/env node

/**
 * Vibe Science v7.0 TRACE -- PreCompact Hook
 *
 * Runs before Claude Code compacts the context window.
 * Saves a snapshot of critical research state to the DB
 * so that post-compaction, the agent can recover context.
 *
 * This directly implements LAW 7: Fresh Context Resilience.
 * "The context window is a buffer that gets erased."
 *
 * Exit codes:
 *   0 -- always (PreCompact cannot block compaction)
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalizeProjectPath } from '../lib/path-utils.js';

// Dynamic imports — graceful if better-sqlite3 or other native deps missing
let openDB, initDB, closeDB, logSpineEntry, queueForEmbedding;
let loadPendingSeeds;

try {
    const dbMod = await import('../lib/db.js');
    openDB = dbMod.openDB;
    initDB = dbMod.initDB;
    closeDB = dbMod.closeDB;
    logSpineEntry = dbMod.logSpineEntry;
    queueForEmbedding = dbMod.queueForEmbedding;
} catch {
    openDB = () => null;
    initDB = () => {};
    closeDB = () => {};
    logSpineEntry = () => {};
    queueForEmbedding = () => {};
}

try {
    const r2Mod = await import('../lib/r2-calibration.js');
    loadPendingSeeds = r2Mod.loadPendingSeeds;
} catch {
    loadPendingSeeds = () => [];
}

// =====================================================
// Main
// =====================================================

async function main(event) {
    const sessionId = event.session_id ?? event.sessionId ?? null;
    const trigger = event.trigger ?? 'unknown';
    const projectPath = canonicalizeProjectPath(event.project_path || event.cwd || process.cwd());

    if (!sessionId) {
        return; // Nothing to snapshot without a session
    }

    let db;
    try {
        db = openDB();
        initDB(db);
    } catch {
        return; // DB not available — degrade gracefully
    }

    if (!db) return;

    try {
        // Query active claims (CREATED but not yet resolved)
        const activeClaims = db.prepare(`
            SELECT DISTINCT ce.claim_id, ce.confidence, ce.narrative
            FROM claim_events ce
            WHERE ce.session_id = ?
              AND ce.event_type = 'CREATED'
              AND ce.claim_id NOT IN (
                  SELECT claim_id FROM claim_events
                  WHERE event_type IN ('KILLED', 'DISPUTED', 'R2_REVIEWED', 'VERIFIED')
                    AND session_id IN (
                        SELECT id FROM sessions WHERE project_path IN (
                            SELECT project_path FROM sessions WHERE id = ?
                        )
                    )
              )
        `).all(sessionId, sessionId);

        // Query spine entry count for this session
        const spineCount = db.prepare(
            `SELECT COUNT(*) as cnt FROM spine_entries WHERE session_id = ?`
        ).get(sessionId);

        // Query pending serendipity seeds
        let pendingSeeds = [];
        try {
            pendingSeeds = loadPendingSeeds(db, projectPath);
        } catch {
            // Seeds unavailable — not critical
        }

        // Read STATE.md from disk (graceful if missing, truncated to 10KB)
        let stateMdContent = null;
        try {
            const statePath = join(projectPath, '.vibe-science', 'STATE.md');
            const raw = readFileSync(statePath, 'utf-8');
            stateMdContent = raw.length > 10240 ? raw.substring(0, 10240) + '\n[truncated]' : raw;
        } catch {
            // STATE.md not present — acceptable
        }

        // Build snapshot object
        const snapshot = {
            timestamp: new Date().toISOString(),
            trigger,
            session_id: sessionId,
            active_claims: activeClaims.map(c => ({
                claim_id: c.claim_id,
                confidence: c.confidence,
                narrative: c.narrative
            })),
            pending_seeds: pendingSeeds.map(s => ({
                seed_id: s.seed_id,
                causal_question: s.causal_question,
                score: s.score
            })),
            spine_entry_count: spineCount?.cnt ?? 0,
            state_md_content: stateMdContent
        };

        // Save as COMPACT_SNAPSHOT spine entry
        logSpineEntry(db, {
            session_id: sessionId,
            action_type: 'COMPACT_SNAPSHOT',
            tool_name: 'pre-compact-hook',
            input_summary: `trigger=${trigger}`,
            output_summary: JSON.stringify(snapshot),
            agent_role: 'system'
        });

        // Queue snapshot text for embedding
        const embedText = [
            `Compact snapshot (${trigger}):`,
            `${snapshot.active_claims.length} active claims,`,
            `${snapshot.pending_seeds.length} pending seeds,`,
            `${snapshot.spine_entry_count} spine entries.`,
            snapshot.active_claims.map(c => `Claim ${c.claim_id}: ${c.narrative || 'no narrative'}`).join('; ')
        ].join(' ');

        queueForEmbedding(db, embedText, {
            session_id: sessionId,
            type: 'compact_snapshot',
            project_path: projectPath
        });
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
    main(event).then(() => process.exit(0)).catch(err => {
        process.stderr.write(`PreCompact hook error: ${err.message}\n`);
        process.exit(0); // Never block compaction
    });
});
