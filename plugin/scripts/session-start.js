#!/usr/bin/env node
/**
 * Vibe Science v6.0 NEXUS -- SessionStart Hook
 *
 * Runs at the beginning of every Claude Code session.
 * Blueprint Section 4.1
 *
 * Responsibilities:
 *   1. Open DB and create a new session record (UUID)
 *   2. Build progressive context (Layer 1: state snapshot)
 *   3. Load observer alerts
 *   4. Load R2 calibration data
 *   5. Load domain config if present
 *   6. Format and output context string (~700 tokens)
 *
 * Output: JSON with `context` field injected into the agent's system prompt,
 *         plus `sessionId` for downstream hooks.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Graceful lib imports -- if a lib module doesn't exist yet, we provide
// inline fallbacks so the hook never crashes.
// ---------------------------------------------------------------------------

let openDB, closeDB, createSession, getLastSession, getUnresolvedAlerts;
let loadR2CalibrationData;

try {
    const dbMod = await import('../lib/db.js');
    openDB = dbMod.openDB;
    closeDB = dbMod.closeDB;
    createSession = dbMod.createSession;
    getLastSession = dbMod.getLastSession;
    getUnresolvedAlerts = dbMod.getUnresolvedAlerts;
} catch {
    // db.js not available -- will use null db path below
    openDB = null;
}

try {
    const r2Mod = await import('../lib/r2-calibration.js');
    loadR2CalibrationData = r2Mod.loadR2CalibrationData;
} catch {
    loadR2CalibrationData = null;
}

// Optional: context-builder and vec-search may not be implemented yet
let buildContext = null;
let formatContextForInjection = null;
let loadPendingSeeds = null;

try {
    const ctxMod = await import('../lib/context-builder.js');
    buildContext = ctxMod.buildContext;
    formatContextForInjection = ctxMod.formatContextForInjection;
} catch {
    // context-builder.js not yet implemented -- use inline fallback
}

try {
    const r2Ext = await import('../lib/r2-calibration.js');
    loadPendingSeeds = r2Ext.loadPendingSeeds;
} catch {
    // Already handled above
}

// ---------------------------------------------------------------------------
// Inline fallback: build context without external lib
// ---------------------------------------------------------------------------

function truncate(text, maxLen) {
    if (!text) return '';
    return text.length <= maxLen ? text : text.substring(0, maxLen) + '...';
}

function fallbackBuildContext(db, projectPath, _sessionId) {
    const context = {
        state: 'Prima sessione su questo progetto.',
        memories: [],
        pendingSeeds: [],
        alerts: [],
        r2Calibration: null,
    };

    try {
        // Layer 1: State snapshot from last completed session
        const lastSession = db.prepare(`
            SELECT narrative_summary, total_actions, claims_created, claims_killed
            FROM sessions
            WHERE project_path = ? AND ended_at IS NOT NULL
            ORDER BY ended_at DESC LIMIT 1
        `).get(projectPath);

        if (lastSession) {
            context.state =
                `Ultima sessione: ${lastSession.total_actions || 0} azioni, ` +
                `${lastSession.claims_created || 0} claims create, ` +
                `${lastSession.claims_killed || 0} killed.\n` +
                `Summary: ${truncate(lastSession.narrative_summary, 200)}`;
        }
    } catch {
        // Table may not exist yet
    }

    // Layer 2: Observer alerts
    try {
        context.alerts = db.prepare(`
            SELECT level, message FROM observer_alerts
            WHERE project_path = ? AND resolved = 0
            ORDER BY level DESC LIMIT 5
        `).all(projectPath);
    } catch {
        context.alerts = [];
    }

    // Layer 2: Pending serendipity seeds
    try {
        if (loadPendingSeeds) {
            context.pendingSeeds = loadPendingSeeds(db, projectPath);
        } else {
            context.pendingSeeds = db.prepare(`
                SELECT seed_id, causal_question, score
                FROM serendipity_seeds
                WHERE status IN ('PENDING_TRIAGE', 'QUEUED')
                AND created_session IN (
                    SELECT id FROM sessions WHERE project_path = ?
                )
                ORDER BY score DESC LIMIT 5
            `).all(projectPath);
        }
    } catch {
        context.pendingSeeds = [];
    }

    return context;
}

function fallbackFormatContext(context, alerts, r2Stats) {
    const parts = [];

    parts.push('--- VIBE SCIENCE CONTEXT ---');
    parts.push('[PURPOSE] Think first, analyse second. Know the literature gaps before running any analysis. Every analysis must answer something not yet done. Web searches INLINE only (not via sub-agents).');

    // State
    parts.push(`[STATE] ${context.state}`);

    // Memories (from vec search, if available)
    if (context.memories && context.memories.length > 0) {
        parts.push('[MEMORY]');
        for (const m of context.memories) {
            parts.push(`  - ${truncate(m.text || m, 150)}`);
        }
    }

    // Alerts
    const effectiveAlerts = alerts || context.alerts || [];
    if (effectiveAlerts.length > 0) {
        parts.push('[ALERTS]');
        for (const a of effectiveAlerts) {
            parts.push(`  - [${a.level}] ${a.message}`);
        }
    }

    // R2 calibration hints
    if (r2Stats && r2Stats.hint) {
        parts.push(`[R2 CALIBRATION] ${r2Stats.hint}`);
    }

    // Pending seeds
    if (context.pendingSeeds && context.pendingSeeds.length > 0) {
        parts.push('[PENDING SEEDS]');
        for (const s of context.pendingSeeds) {
            parts.push(`  - ${s.seed_id}: ${truncate(s.causal_question, 100)} (score: ${s.score})`);
        }
    }

    parts.push('--- END CONTEXT ---');

    return parts.join('\n');
}

// ---------------------------------------------------------------------------
// Domain config loader
// ---------------------------------------------------------------------------

function loadDomainConfig(projectPath) {
    // Check for domain config in project root, then in plugin/db
    const candidates = [
        join(projectPath, 'domain-config.json'),
        join(projectPath, '.vibe-science', 'domain-config.json'),
        join(__dirname, '..', 'db', 'domain-config.json'),
    ];

    for (const candidate of candidates) {
        try {
            if (existsSync(candidate)) {
                const raw = readFileSync(candidate, 'utf-8');
                return JSON.parse(raw);
            }
        } catch {
            // Skip malformed configs
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(event) {
    const sessionId = randomUUID();
    const projectPath = event.project_path || event.cwd || process.cwd();
    const warnings = [];

    // ---- 0. Auto-setup: run setup.js if DB doesn't exist (replaces "Setup" hook) --
    const globalDbPath = join(homedir(), '.vibe-science', 'db', 'vibe-science.db');
    if (!existsSync(globalDbPath)) {
        try {
            const setupPath = join(__dirname, 'setup.js');
            if (existsSync(setupPath)) {
                const { execSync } = await import('node:child_process');
                execSync(`node "${setupPath}"`, { stdio: 'pipe', timeout: 30000 });
                warnings.push('First run: auto-setup completed.');
            }
        } catch (err) {
            warnings.push(`Auto-setup failed: ${err.message}. Run 'node plugin/scripts/setup.js' manually.`);
        }
    }

    // ---- 1. Open DB and register session ------------------------------------
    let db = null;
    let dbAvailable = false;

    if (openDB) {
        try {
            db = openDB();
            dbAvailable = true;
        } catch (err) {
            warnings.push(`DB open failed: ${err.message}`);
        }
    } else {
        warnings.push('db.js not available -- running without persistence.');
    }

    if (db && dbAvailable) {
        try {
            createSession(db, {
                id: sessionId,
                project_path: projectPath,
            });
        } catch (err) {
            warnings.push(`Session creation failed: ${err.message}`);
        }
    }

    // ---- 2. Build progressive context ---------------------------------------
    let context;
    let alerts = [];
    let r2Stats = { hint: null, topWeaknesses: [], totalReviews: 0 };

    if (db && dbAvailable) {
        // Use external context-builder if available, otherwise fallback
        try {
            if (buildContext && formatContextForInjection) {
                context = buildContext(db, projectPath, sessionId);
            } else {
                context = fallbackBuildContext(db, projectPath, sessionId);
            }
        } catch (err) {
            warnings.push(`Context build failed: ${err.message}`);
            context = {
                state: 'Context build error -- starting fresh.',
                memories: [],
                pendingSeeds: [],
                alerts: [],
            };
        }

        // ---- 3. Load observer alerts ----------------------------------------
        try {
            if (getUnresolvedAlerts) {
                alerts = getUnresolvedAlerts(db, projectPath);
            }
        } catch (err) {
            warnings.push(`Alert load failed: ${err.message}`);
        }

        // ---- 4. Load R2 calibration data ------------------------------------
        try {
            if (loadR2CalibrationData) {
                r2Stats = loadR2CalibrationData(db, projectPath);
            }
        } catch (err) {
            warnings.push(`R2 calibration load failed: ${err.message}`);
        }
    } else {
        // No DB -- minimal context
        context = {
            state: 'No database available -- first run or setup pending.',
            memories: [],
            pendingSeeds: [],
            alerts: [],
        };
    }

    // ---- 5. Load domain config ----------------------------------------------
    let domainConfig = null;
    try {
        domainConfig = loadDomainConfig(projectPath);
    } catch {
        // Domain config is optional
    }

    // ---- 6. Format and output context string --------------------------------
    let contextString;
    try {
        if (formatContextForInjection) {
            contextString = formatContextForInjection(context, alerts, r2Stats);
        } else {
            contextString = fallbackFormatContext(context, alerts, r2Stats);
        }
    } catch (err) {
        warnings.push(`Context format failed: ${err.message}`);
        contextString = '--- VIBE SCIENCE CONTEXT ---\n[STATE] Context formatting error.\n--- END CONTEXT ---';
    }

    // Append domain info if available
    if (domainConfig && domainConfig.domain) {
        contextString += `\n[DOMAIN] ${domainConfig.display_name || domainConfig.domain}`;
    }

    // ---- 7. Close DB --------------------------------------------------------
    if (db && dbAvailable) {
        try {
            if (closeDB) closeDB(db);
            else if (db.open) db.close();
        } catch {
            // Ignore close errors
        }
    }

    // ---- 8. Return result ---------------------------------------------------
    const result = {
        sessionId,
        context: contextString,
    };

    if (domainConfig) {
        result.domainConfig = {
            domain: domainConfig.domain,
            display_name: domainConfig.display_name || domainConfig.domain,
        };
    }

    if (warnings.length > 0) {
        result.warnings = warnings;
    }

    return result;
}

// ---------------------------------------------------------------------------
// stdin/stdout hook protocol
// ---------------------------------------------------------------------------

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    let event = {};
    try {
        event = JSON.parse(input || '{}');
    } catch {
        // Malformed stdin -- proceed with empty event
    }

    main(event)
        .then(result => {
            // Claude Code SessionStart protocol:
            // stdout with exit 0 → injected as context
            // Use hookSpecificOutput.additionalContext for structured output
            const output = {
                hookSpecificOutput: {
                    hookEventName: 'SessionStart',
                    additionalContext: result.context,
                },
            };
            if (result.warnings && result.warnings.length > 0) {
                output.systemMessage = result.warnings.join('; ');
            }
            process.stdout.write(JSON.stringify(output));
            process.exit(0);
        })
        .catch(err => {
            // Never crash -- return minimal context on error
            const fallbackContext = '--- VIBE SCIENCE CONTEXT ---\n[STATE] Hook error. Starting with no context.\n--- END CONTEXT ---';
            const output = {
                hookSpecificOutput: {
                    hookEventName: 'SessionStart',
                    additionalContext: fallbackContext,
                },
                systemMessage: `SessionStart hook error: ${err.message}`,
            };
            process.stdout.write(JSON.stringify(output));
            process.exit(0);
        });
});
