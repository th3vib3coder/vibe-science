#!/usr/bin/env node
/**
 * Vibe Science v6.0 NEXUS -- UserPromptSubmit Hook
 *
 * Runs BEFORE each user prompt is processed by the model.
 * Blueprint Section 4.2
 *
 * Responsibilities:
 *   1. Read event from stdin (includes prompt text, session_id)
 *   2. Identify agent role (from explicit role or prompt keywords)
 *   3. Log prompt to database (hash only, not full text -- privacy)
 *   4. Do semantic recall (query vec search with first 500 chars of prompt)
 *   5. Return additional context + identified role
 *
 * Critical difference from v5.5: In v5.5, recall_context() is an instruction
 * in the prompt -- the agent may not call it. In v6.0, recall happens
 * AUTOMATICALLY in this hook, before the agent sees the prompt.
 */

import { createHash, randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Graceful lib imports -- if a module doesn't exist, provide fallbacks
// ---------------------------------------------------------------------------

let openDB, closeDB;
let identifyAgentRole;
let vecSearch;

try {
    const dbMod = await import('../lib/db.js');
    openDB = dbMod.openDB;
    closeDB = dbMod.closeDB;
} catch {
    openDB = null;
    closeDB = null;
}

try {
    const permMod = await import('../lib/permission-engine.js');
    identifyAgentRole = permMod.identifyAgentRole;
} catch {
    // Inline fallback for role identification
    identifyAgentRole = null;
}

try {
    const vecMod = await import('../lib/vec-search.js');
    vecSearch = vecMod.vecSearch;
} catch {
    // vec-search.js not yet implemented -- no semantic recall
    vecSearch = null;
}

// ---------------------------------------------------------------------------
// Inline fallback: role identification
// ---------------------------------------------------------------------------

const KNOWN_ROLES = ['lead', 'researcher', 'reviewer2', 'serendipity', 'experimenter', 'judge'];

function fallbackIdentifyRole(explicitRole, prompt) {
    // Explicit role takes priority
    if (explicitRole) {
        const role = typeof explicitRole === 'object'
            ? (explicitRole.role || '').toLowerCase()
            : String(explicitRole).toLowerCase();
        if (KNOWN_ROLES.includes(role)) return role;
    }

    // Infer from prompt keywords
    if (prompt && typeof prompt === 'string') {
        const lower = prompt.toLowerCase();
        if (lower.includes('reviewer') || lower.includes('r2')) return 'reviewer2';
        if (lower.includes('serendipity') || lower.includes('scanner')) return 'serendipity';
        if (lower.includes('judge') || lower.includes('r3')) return 'judge';
        if (lower.includes('experiment')) return 'experimenter';
        if (lower.includes('lead') || lower.includes('orchestrat')) return 'lead';
    }

    return 'researcher';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hash a prompt for audit trail (SHA-256, privacy-preserving).
 * We never store the full prompt text.
 */
function hashPrompt(prompt) {
    return createHash('sha256')
        .update(prompt || '')
        .digest('hex');
}

/**
 * Format recalled memories for injection into agent context.
 */
function formatMemories(memories) {
    if (!memories || memories.length === 0) return '';

    const lines = ['[RECALL] Relevant memories from previous sessions:'];
    for (const m of memories) {
        const text = typeof m === 'string' ? m : (m.text || m.content || JSON.stringify(m));
        const truncated = text.length > 200 ? text.substring(0, 200) + '...' : text;
        const distance = m.distance != null ? ` (relevance: ${(1 - m.distance).toFixed(2)})` : '';
        lines.push(`  - ${truncated}${distance}`);
    }
    return lines.join('\n');
}

/**
 * Extract project path from event, with fallbacks.
 */
function getProjectPath(event) {
    return event.project_path || event.cwd || process.cwd();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(event) {
    const prompt = event.prompt || event.message || '';
    const sessionId = event.session_id || event.sessionId || null;
    const explicitRole = event.agent_role || event.agentRole || null;
    const projectPath = getProjectPath(event);
    const warnings = [];

    // ---- 1. Identify agent role ---------------------------------------------
    const role = identifyAgentRole
        ? identifyAgentRole(explicitRole, prompt)
        : fallbackIdentifyRole(explicitRole, prompt);

    // ---- 2. Open DB ---------------------------------------------------------
    let db = null;
    let dbAvailable = false;

    if (openDB) {
        try {
            db = openDB();
            dbAvailable = true;
        } catch (err) {
            warnings.push(`DB open failed: ${err.message}`);
        }
    }

    // ---- 3. Log prompt hash to database (privacy: hash only) ----------------
    if (db && dbAvailable && sessionId) {
        try {
            db.prepare(
                `INSERT INTO prompt_log (session_id, agent_role, prompt_hash, timestamp)
                 VALUES (?, ?, ?, ?)`
            ).run(sessionId, role, hashPrompt(prompt), new Date().toISOString());
        } catch (err) {
            // Non-fatal: prompt logging failure should not block the user
            warnings.push(`Prompt log failed: ${err.message}`);
        }
    }

    // ---- 4. Semantic recall (vec search with first 500 chars) ---------------
    let relevantMemories = [];

    if (db && dbAvailable && vecSearch && prompt.length > 0) {
        try {
            relevantMemories = vecSearch(db, prompt.substring(0, 500), {
                project_path: projectPath,
                limit: 3,
                maxTokens: 500,
            });
        } catch (err) {
            // Vec search may fail if sqlite-vec is not loaded or embeddings
            // table doesn't exist. This is expected during early usage.
            warnings.push(`Semantic recall failed: ${err.message}`);
        }
    }

    // ---- 5. Close DB --------------------------------------------------------
    if (db && dbAvailable) {
        try {
            if (closeDB) closeDB(db);
            else if (db.open) db.close();
        } catch {
            // Ignore close errors
        }
    }

    // ---- 6. Build result ----------------------------------------------------
    const result = {
        agentRole: role,
    };

    // Inject recalled memories as additional context
    if (relevantMemories.length > 0) {
        result.additionalContext = formatMemories(relevantMemories);
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
            // Claude Code UserPromptSubmit protocol:
            // stdout with exit 0 → added to context
            // hookSpecificOutput.additionalContext → added to context
            const contextParts = [];
            contextParts.push(`[AGENT ROLE] ${result.agentRole || 'researcher'}`);
            if (result.additionalContext) {
                contextParts.push(result.additionalContext);
            }
            const output = {
                hookSpecificOutput: {
                    hookEventName: 'UserPromptSubmit',
                    additionalContext: contextParts.join('\n'),
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
            process.stderr.write(`PromptSubmit hook error: ${err.message}\n`);
            process.exit(0);
        });
});
