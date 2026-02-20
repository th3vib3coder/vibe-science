/**
 * Vibe Science v6.0 NEXUS — Narrative Summary Engine
 *
 * Template-based narrative summary generator (no LLM required).
 * Runs at session Stop to produce a structured summary from DB data.
 * The summary feeds into progressive disclosure (Layer 1 state snapshot)
 * and is queued for embedding so future sessions can recall it.
 *
 * Design rationale (Blueprint 4.4):
 *   claude-mem uses an SDK Agent (Claude subprocess) for summaries.
 *   That costs tokens, requires an API key, and adds latency.
 *   Our data is already structured in the DB -- a deterministic template
 *   is faster, free, and reproducible.
 *
 * Export: generateNarrativeSummary, updateStateMdFromDB
 */

import fs from 'node:fs';
import path from 'node:path';

// =====================================================
// Narrative summary generation
// =====================================================

/**
 * Build a structured narrative summary from session data.
 *
 * Sections produced:
 *   - Session header (ID, duration as action count)
 *   - Actions breakdown by type
 *   - Claims lifecycle (grouped by claim_id, showing latest event)
 *   - Failed gates
 *   - Corrections and design decisions
 *
 * @param {object} params
 * @param {object[]} params.entries  - spine_entries rows for the session
 * @param {object[]} params.claims   - claim_events rows for the session
 * @param {object[]} params.gates    - gate_checks rows for the session
 * @param {string}   params.sessionId
 * @param {string}   [params.projectPath] - Used only for additional context if needed
 * @returns {{ text: string, tokenEstimate: number }}
 */
export function generateNarrativeSummary({ entries, claims, gates, sessionId, projectPath }) {
    const sections = [];

    // --- Header ---
    const shortId = sessionId ? sessionId.substring(0, 8) : 'unknown';
    sections.push(`## Session ${shortId}`);
    sections.push(`**Duration:** ${entries.length} actions`);

    // --- Action breakdown ---
    if (entries.length > 0) {
        const actionCounts = countBy(entries, 'action_type');
        const formatted = Object.entries(actionCounts)
            .map(([type, count]) => `${type}(${count})`)
            .join(', ');
        sections.push(`**Actions:** ${formatted}`);
    }

    // --- Claims ---
    if (claims.length > 0) {
        sections.push('');
        sections.push('### Claims');

        const grouped = groupBy(claims, 'claim_id');
        for (const group of grouped) {
            const latest = group.events[group.events.length - 1];
            const confidence = latest.confidence != null ? latest.confidence : '?';
            sections.push(`- **${group.key}**: ${latest.event_type} (confidence: ${confidence})`);
            if (latest.narrative) {
                sections.push(`  ${latest.narrative}`);
            }
        }
    }

    // --- Failed gates ---
    const failedGates = (gates || []).filter(g => g.status === 'FAIL');
    if (failedGates.length > 0) {
        sections.push('');
        sections.push('### Gates Failed');
        for (const g of failedGates) {
            const message = g.message || g.details || g.gate_id;
            sections.push(`- **${g.gate_id}**: ${message}`);
        }
    }

    // --- Passed gates summary (compact) ---
    const passedGates = (gates || []).filter(g => g.status === 'PASS');
    if (passedGates.length > 0) {
        const gateIds = passedGates.map(g => g.gate_id).join(', ');
        sections.push('');
        sections.push(`**Gates passed:** ${gateIds}`);
    }

    // --- Corrections and design decisions ---
    const corrections = (entries || []).filter(
        e => e.action_type === 'BUG_FIX' || e.action_type === 'DESIGN_CHANGE'
    );
    if (corrections.length > 0) {
        sections.push('');
        sections.push('### Corrections & Decisions');
        for (const m of corrections) {
            sections.push(`- [${m.action_type}] ${m.input_summary || '(no description)'}`);
        }
    }

    const text = sections.join('\n');
    return {
        text,
        tokenEstimate: estimateTokens(text)
    };
}

// =====================================================
// STATE.md writer
// =====================================================

/**
 * Write (or overwrite) the project's STATE.md file with the latest
 * session data from the database.
 *
 * STATE.md is the LAW 7 (resumability) anchor: even without the DB,
 * an agent can read STATE.md to understand where the project is.
 *
 * Layout:
 *   # Vibe Science — State
 *   ## Last Session
 *   <narrative summary or "No previous session">
 *   ## Active Claims
 *   <list of claims that are not KILLED/VERIFIED>
 *   ## Pending Gates
 *   <list of gates with WARN status>
 *   ## Stats
 *   <session count, total claims, total gates>
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {string} projectPath - Absolute path to the project root
 */
export function updateStateMdFromDB(db, sessionId, projectPath) {
    const lines = [];

    lines.push('# Vibe Science — State');
    lines.push(`_Auto-generated at ${new Date().toISOString()}_`);
    lines.push('');

    // --- Last session summary ---
    lines.push('## Last Session');
    const session = db.prepare(
        `SELECT * FROM sessions WHERE id = ?`
    ).get(sessionId);

    if (session) {
        lines.push(`- **Session:** ${sessionId.substring(0, 8)}`);
        lines.push(`- **Started:** ${session.started_at || '?'}`);
        lines.push(`- **Ended:** ${session.ended_at || 'in progress'}`);
        lines.push(`- **Actions:** ${session.total_actions ?? 0}`);
        lines.push(`- **Claims created:** ${session.claims_created ?? 0}`);
        lines.push(`- **Claims killed:** ${session.claims_killed ?? 0}`);
        lines.push(`- **Gates passed:** ${session.gates_passed ?? 0}`);
        lines.push(`- **Gates failed:** ${session.gates_failed ?? 0}`);
        if (session.narrative_summary) {
            lines.push('');
            lines.push('### Summary');
            lines.push(session.narrative_summary);
        }
    } else {
        lines.push('No session data available.');
    }

    lines.push('');

    // --- Active claims (not KILLED or VERIFIED) ---
    lines.push('## Active Claims');
    try {
        const activeClaims = db.prepare(`
            SELECT claim_id, event_type, confidence, narrative
            FROM claim_events
            WHERE session_id IN (
                SELECT id FROM sessions WHERE project_path = ?
            )
            AND claim_id NOT IN (
                SELECT DISTINCT claim_id FROM claim_events
                WHERE event_type IN ('KILLED', 'VERIFIED')
            )
            GROUP BY claim_id
            HAVING id = MAX(id)
            ORDER BY confidence DESC
        `).all(projectPath);

        if (activeClaims.length > 0) {
            for (const c of activeClaims) {
                const conf = c.confidence != null ? ` (confidence: ${c.confidence})` : '';
                lines.push(`- **${c.claim_id}**: ${c.event_type}${conf}`);
                if (c.narrative) {
                    lines.push(`  ${c.narrative}`);
                }
            }
        } else {
            lines.push('No active claims.');
        }
    } catch {
        lines.push('Unable to query active claims.');
    }

    lines.push('');

    // --- Pending gates (WARN or recent FAIL) ---
    lines.push('## Pending Gates');
    try {
        const pendingGates = db.prepare(`
            SELECT gate_id, status, claim_id, details
            FROM gate_checks
            WHERE session_id = ?
            AND status IN ('WARN', 'FAIL')
            ORDER BY timestamp DESC
            LIMIT 10
        `).all(sessionId);

        if (pendingGates.length > 0) {
            for (const g of pendingGates) {
                const claim = g.claim_id ? ` (claim: ${g.claim_id})` : '';
                lines.push(`- **${g.gate_id}** [${g.status}]${claim}`);
            }
        } else {
            lines.push('All gates clear.');
        }
    } catch {
        lines.push('Unable to query pending gates.');
    }

    lines.push('');

    // --- Project-wide stats ---
    lines.push('## Stats');
    try {
        const stats = db.prepare(`
            SELECT
                COUNT(*) as session_count,
                COALESCE(SUM(total_actions), 0) as total_actions,
                COALESCE(SUM(claims_created), 0) as total_claims_created,
                COALESCE(SUM(claims_killed), 0) as total_claims_killed,
                COALESCE(SUM(gates_passed), 0) as total_gates_passed,
                COALESCE(SUM(gates_failed), 0) as total_gates_failed
            FROM sessions
            WHERE project_path = ?
        `).get(projectPath);

        if (stats) {
            lines.push(`- **Sessions:** ${stats.session_count}`);
            lines.push(`- **Total actions:** ${stats.total_actions}`);
            lines.push(`- **Claims created / killed:** ${stats.total_claims_created} / ${stats.total_claims_killed}`);
            lines.push(`- **Gates passed / failed:** ${stats.total_gates_passed} / ${stats.total_gates_failed}`);
        }
    } catch {
        lines.push('Unable to compute stats.');
    }

    lines.push('');

    // --- Write the file ---
    const vsDir = path.join(projectPath, '.vibe-science');
    if (!fs.existsSync(vsDir)) {
        fs.mkdirSync(vsDir, { recursive: true });
    }

    const statePath = path.join(vsDir, 'STATE.md');
    fs.writeFileSync(statePath, lines.join('\n'), 'utf-8');
}

// =====================================================
// Utility functions
// =====================================================

/**
 * Group an array of objects by a key and count occurrences.
 *
 * @param {object[]} array
 * @param {string} key - Property name to group by
 * @returns {Record<string, number>} Map of key-value to count
 *
 * @example
 *   countBy([{type:'A'},{type:'B'},{type:'A'}], 'type')
 *   // => { A: 2, B: 1 }
 */
function countBy(array, key) {
    const counts = {};
    for (const item of array) {
        const val = item[key] ?? 'UNKNOWN';
        counts[val] = (counts[val] || 0) + 1;
    }
    return counts;
}

/**
 * Group an array of objects by a key, returning an array of
 * { key, events: [...] } groups.
 *
 * @param {object[]} array
 * @param {string} key - Property name to group by
 * @returns {Array<{key: string, events: object[]}>}
 *
 * @example
 *   groupBy([{id:'C1',v:1},{id:'C2',v:2},{id:'C1',v:3}], 'id')
 *   // => [ {key:'C1', events:[{id:'C1',v:1},{id:'C1',v:3}]},
 *   //       {key:'C2', events:[{id:'C2',v:2}]} ]
 */
function groupBy(array, key) {
    const map = new Map();
    for (const item of array) {
        const val = item[key] ?? 'UNKNOWN';
        if (!map.has(val)) {
            map.set(val, []);
        }
        map.get(val).push(item);
    }
    const groups = [];
    for (const [k, events] of map) {
        groups.push({ key: k, events });
    }
    return groups;
}

/**
 * Rough token estimate: ~4 characters per token (GPT / Claude heuristic).
 *
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}
