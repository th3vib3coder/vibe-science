#!/usr/bin/env node

/**
 * Vibe Science v6.0 NEXUS -- PostToolUse Enforcement Hook
 *
 * Executed AFTER every tool invocation by the agent.
 * This is the central enforcement point for the entire system.
 *
 * Four sections, executed in order:
 *   1. GATE ENFORCEMENT   (DQ4 sync, CLAIM-LEDGER gates, L-1+ literature)
 *   2. PERMISSION ENFORCE  (TEAM mode role-based access control)
 *   3. AUTO-LOGGING        (Research Spine + embedding queue)
 *   4. OBSERVER CHECKS     (periodic project health, every 10 tool uses)
 *
 * Exit codes:
 *   0 = allow (tool action proceeds)
 *   2 = BLOCK (tool action is rejected, human-readable reason on stderr)
 *   1 = internal error (non-blocking, logged)
 *
 * stdin:  JSON { tool_name, tool_input, tool_output, session_id, agent_role }
 * stdout: JSON { exitCode, ?stderr }
 */

import fs from 'node:fs';
import path from 'node:path';

// =====================================================================
// Imports from lib modules
// =====================================================================

import { openDB, initDB, closeDB } from '../lib/db.js';
import { checkPermission } from '../lib/permission-engine.js';
import { queueForEmbedding } from '../lib/vec-search.js';

// =====================================================================
// Constants
// =====================================================================

/** Gates required before a claim can be written to CLAIM-LEDGER */
const REQUIRED_CLAIM_GATES = ['DQ1', 'DQ2', 'DQ3', 'DQ4'];

/** How often (in tool uses) to run observer checks */
const OBSERVER_INTERVAL = 10;

/** How old STATE.md can be (in hours) before it's considered stale */
const STATE_STALE_HOURS = 24;

/** Max characters for input/output summaries in spine_entries */
const SUMMARY_MAX_CHARS = 200;

/** Max characters for embedding text */
const EMBED_MAX_CHARS = 500;

/** Patterns that indicate a literature search (WebSearch) */
const LITERATURE_PATTERNS = [
    /pubmed/i, /biorxiv/i, /medrxiv/i, /arxiv/i,
    /doi\.org/i, /pmid/i, /pmc\d/i,
    /scholar\.google/i, /semantic.?scholar/i, /openalex/i,
    /inspire-?hep/i, /ieee.?xplore/i, /scopus/i,
    /ncbi\.nlm\.nih/i, /nature\.com/i, /science\.org/i,
    /cell\.com/i, /plos/i, /springer/i, /wiley/i,
    /systematic.?review/i, /meta.?analysis/i,
    /prior.?art/i, /literature.?search/i, /bibliography/i,
];

/** Patterns that indicate a DOI or PMID in tool input */
const DOI_PMID_PATTERNS = [
    /10\.\d{4,9}\/[^\s]+/,             // DOI
    /PMID:\s*\d+/i,                    // PMID explicit
    /pubmed\.ncbi.*\/\d+/i,            // PubMed URL
    /doi\.org\/10\.\d{4,9}/i,          // DOI URL
];

// =====================================================================
// stdin reader + main entrypoint
// =====================================================================

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
    const event = JSON.parse(input || '{}');
    main(event).then(result => {
        process.stdout.write(JSON.stringify(result));
        process.exit(result.exitCode === 2 ? 2 : 0);
    }).catch(err => {
        process.stderr.write(`PostToolUse internal error: ${err.message}\n${err.stack || ''}`);
        // Exit 0 on internal errors -- never block due to our own bugs
        process.stdout.write(JSON.stringify({ exitCode: 0 }));
        process.exit(0);
    });
});

// =====================================================================
// Main
// =====================================================================

/**
 * @param {object} event
 * @param {string} event.tool_name   - Tool that was invoked (Write, Edit, Bash, etc.)
 * @param {object} event.tool_input  - Tool input payload
 * @param {string} event.tool_output - Tool output (may be large; we summarize)
 * @param {string} event.session_id  - Current session UUID
 * @param {string} [event.agent_role] - Agent role in TEAM mode (null in SOLO)
 * @returns {Promise<{exitCode: number, stderr?: string}>}
 */
async function main(event) {
    const { tool_name, tool_input = {}, tool_output = '', session_id, agent_role } = event;

    // ------------------------------------------------------------------
    // Open DB (graceful: if DB is unavailable, log warning but don't block)
    // ------------------------------------------------------------------
    let db = null;
    try {
        db = openDB();
        initDB(db);
    } catch (err) {
        process.stderr.write(
            `[PostToolUse] WARNING: Cannot open database: ${err.message}. ` +
            `Enforcement degraded -- gates and logging disabled for this tool use.\n`
        );
        // Return allow -- we never block due to infrastructure issues
        return { exitCode: 0 };
    }

    try {
        // ==============================================================
        // 0. LITERATURE SEARCH DETECTION (auto-register before gates)
        //    Intercept WebSearch/WebFetch/Read with scientific patterns
        //    and log them to literature_searches for L-1+ enforcement.
        // ==============================================================
        detectAndLogLiteratureSearch(db, event);

        // ==============================================================
        // 1. GATE ENFORCEMENT (DQ4, CLAIM-LEDGER gates, L-1+)
        // ==============================================================
        const gateResult = enforceGates(db, event);
        if (gateResult) {
            return gateResult; // exitCode 2
        }

        // ==============================================================
        // 2. PERMISSION ENFORCEMENT (TEAM MODE)
        // ==============================================================
        const permResult = enforcePermissions(event);
        if (permResult) {
            return permResult; // exitCode 2
        }

        // ==============================================================
        // 3. AUTO-LOGGING (Research Spine + Embedding Queue)
        // ==============================================================
        autoLog(db, event);

        // ==============================================================
        // 4. OBSERVER CHECKS (every N tool uses)
        // ==============================================================
        const observerResult = runPeriodicObserver(db, event);
        if (observerResult) {
            return observerResult; // exitCode 2 for HALT-level alerts
        }

        // All clear
        return { exitCode: 0 };
    } finally {
        closeDB(db);
    }
}

// =====================================================================
// Section 0: Literature Search Detection
// =====================================================================

/**
 * Detect whether the current tool use constitutes a literature search
 * and register it in the literature_searches table.
 *
 * What counts as a "literature search" (from blueprint Section 10A.8):
 *   - WebSearch with scientific terms
 *   - WebFetch to a known scientific source
 *   - Read of a file containing DOI/PMID
 *   - Use of an MCP literature server (detected via tool_name pattern)
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 */
function detectAndLogLiteratureSearch(db, event) {
    const { tool_name, tool_input = {}, tool_output = '', session_id } = event;

    let isLitSearch = false;
    let query = '';
    let sources = [];
    let searchLayer = 'MANUAL';

    // --- WebSearch with scientific content ---
    if (tool_name === 'WebSearch') {
        const searchQuery = tool_input.query || '';
        if (LITERATURE_PATTERNS.some(p => p.test(searchQuery))) {
            isLitSearch = true;
            query = searchQuery;
            sources = ['websearch'];
            searchLayer = 'WEBSEARCH';
        }
    }

    // --- WebFetch to a known scientific domain ---
    if (tool_name === 'WebFetch') {
        const url = tool_input.url || '';
        if (LITERATURE_PATTERNS.some(p => p.test(url))) {
            isLitSearch = true;
            query = url;
            sources = [extractDomainFromUrl(url)];
            searchLayer = 'WEBSEARCH';
        }
    }

    // --- Read a file containing DOI/PMID references ---
    if (tool_name === 'Read' && typeof tool_output === 'string') {
        if (DOI_PMID_PATTERNS.some(p => p.test(tool_output))) {
            isLitSearch = true;
            query = tool_input.file_path || 'unknown';
            sources = ['local_paper'];
            searchLayer = 'MANUAL';
        }
    }

    // --- MCP-based literature tools (detected by name patterns) ---
    if (/pubmed|scholar|arxiv|biorxiv|literature|citation/i.test(tool_name)) {
        isLitSearch = true;
        query = JSON.stringify(tool_input).substring(0, 200);
        sources = [tool_name.toLowerCase()];
        searchLayer = 'MCP';
    }

    if (isLitSearch && session_id) {
        try {
            db.prepare(
                `INSERT INTO literature_searches
                    (session_id, query, sources, results_count, relevant_count, key_papers, search_layer, gate_context, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
                session_id,
                summarizeText(query, SUMMARY_MAX_CHARS),
                JSON.stringify(sources),
                null,   // results_count: we don't know at this point
                null,   // relevant_count: we don't know
                null,   // key_papers: extracted later
                searchLayer,
                'AD_HOC',
                new Date().toISOString()
            );
        } catch (err) {
            process.stderr.write(`[PostToolUse] WARNING: Failed to log literature search: ${err.message}\n`);
        }
    }
}

/**
 * Extract the domain name from a URL for source logging.
 * @param {string} url
 * @returns {string}
 */
function extractDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return 'unknown';
    }
}

// =====================================================================
// Section 1: Gate Enforcement
// =====================================================================

/**
 * Enforce research quality gates.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 * @returns {null|{exitCode: number, stderr: string}}
 *   null = all gates pass; object = BLOCK with reason
 */
function enforceGates(db, event) {
    const { tool_name, tool_input = {}, session_id } = event;

    // Only Write/Edit trigger file-based gate checks
    if (tool_name === 'Write' || tool_name === 'Edit') {
        const filePath = tool_input.file_path || '';

        // ---------------------------------------------------------
        // Gate DQ4: FINDINGS.md must be in sync with JSON source
        // ---------------------------------------------------------
        if (filePath.includes('FINDINGS') && filePath.endsWith('.md')) {
            const dq4Result = checkGateDQ4(filePath, tool_input);
            if (dq4Result && !dq4Result.pass) {
                // Log the failed gate check
                logGateResult(db, session_id, 'DQ4', 'FAIL', null, dq4Result);

                return {
                    exitCode: 2,
                    stderr:
                        `GATE DQ4 FAIL: FINDINGS.md numbers do not match JSON source.\n` +
                        `${dq4Result.mismatches.length} mismatch(es) detected:\n` +
                        dq4Result.mismatches.map(m => `  ${m.number} in "${m.context}"`).join('\n') +
                        `\n\nFix the numbers in FINDINGS.md to match the JSON data, then retry.`
                };
            }

            if (dq4Result && dq4Result.pass) {
                logGateResult(db, session_id, 'DQ4', 'PASS', null, dq4Result);
            }
        }

        // ---------------------------------------------------------
        // Gate: CLAIM-LEDGER.md requires all prerequisite gates
        // ---------------------------------------------------------
        if (filePath.includes('CLAIM-LEDGER')) {
            const content = tool_input.content || tool_input.new_string || '';
            const claimId = extractClaimId(content);

            if (claimId) {
                const claimGateResult = checkClaimGates(db, claimId, session_id);
                if (claimGateResult && !claimGateResult.pass) {
                    logGateResult(db, session_id, 'CLAIM_GATE', 'FAIL', claimId, claimGateResult);

                    return {
                        exitCode: 2,
                        stderr:
                            `GATE FAIL: Cannot write claim ${claimId} to CLAIM-LEDGER.\n` +
                            `Missing prerequisite gates: ${claimGateResult.missing.join(', ')}\n` +
                            `Fix: Run the missing gate checks first, then update the ledger.`
                    };
                }
            }
        }

        // ---------------------------------------------------------
        // Gate L-1+: Direction nodes require prior literature search
        // ---------------------------------------------------------
        if (isDirectionNode(tool_input)) {
            const litResult = checkLiteratureGate(db, session_id);
            if (!litResult.pass) {
                logGateResult(db, session_id, 'L-1+', 'FAIL', null, litResult);

                // Try to load domain config for helpful suggestions
                const domainHint = loadDomainHint();

                return {
                    exitCode: 2,
                    stderr:
                        `GATE L-1+ FAIL: No literature search registered for this session.\n` +
                        `You must perform a bibliographic search before defining a research direction.\n` +
                        domainHint +
                        `\nRun a literature search (WebSearch, MCP, or manual), then retry.`
                };
            }

            logGateResult(db, session_id, 'L-1+', 'PASS', null, litResult);
        }
    }

    return null; // all gates pass
}

// ── Gate DQ4: FINDINGS.md <-> JSON sync check ──────────────────────

/**
 * Check that numeric values in FINDINGS.md match their JSON source.
 *
 * Strategy: look for a JSON file adjacent to the FINDINGS.md (same directory,
 * or in a standard location). Extract numbers from the markdown and verify
 * they exist in the JSON data.
 *
 * @param {string} findingsPath - Path to the FINDINGS.md being written
 * @param {object} toolInput - The Write/Edit tool input
 * @returns {{pass: boolean, mismatches: Array<{number: string, context: string}>}|null}
 *   null if we can't perform the check (no JSON source found -- allow)
 */
function checkGateDQ4(findingsPath, toolInput) {
    const jsonPath = findJsonSource(findingsPath);
    if (!jsonPath) {
        // No JSON source found -- cannot enforce, allow
        return null;
    }

    let jsonData;
    try {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        jsonData = JSON.parse(raw);
    } catch {
        // JSON unreadable or malformed -- warn but don't block
        process.stderr.write(
            `[PostToolUse] WARNING: Cannot read JSON source ${jsonPath}. DQ4 check skipped.\n`
        );
        return null;
    }

    // Extract the markdown content being written
    const mdContent = toolInput.content || toolInput.new_string || '';
    if (!mdContent) return null;

    // Extract all numbers from the markdown (decimal and integer)
    const mdNumbers = extractSignificantNumbers(mdContent);
    if (mdNumbers.length === 0) return null;

    // Flatten all numbers from the JSON
    const jsonNumbers = new Set();
    extractNumbersFromJson(jsonData, jsonNumbers);

    // Check each markdown number against JSON numbers
    const mismatches = [];
    for (const entry of mdNumbers) {
        // Allow approximate matches (float precision)
        const found = [...jsonNumbers].some(jn => isApproximateMatch(entry.value, jn));
        if (!found) {
            mismatches.push({
                number: String(entry.value),
                context: entry.context
            });
        }
    }

    // Allow up to 30% novel numbers (some may be computed, rounded, etc.)
    // Only fail if more than 70% of significant numbers are not in the JSON.
    const mismatchRatio = mdNumbers.length > 0 ? mismatches.length / mdNumbers.length : 0;
    if (mismatchRatio > 0.7 && mismatches.length >= 3) {
        return { pass: false, mismatches: mismatches.slice(0, 10) }; // cap at 10 for readability
    }

    return { pass: true, mismatches: [] };
}

/**
 * Find the JSON source file for a FINDINGS.md.
 * Looks in standard locations:
 *   1. Same directory as FINDINGS.md with .json extension
 *   2. Parent directory / 04-results / *.json
 *   3. .vibe-science/data/*.json
 *
 * @param {string} findingsPath
 * @returns {string|null} Path to JSON source, or null if not found
 */
function findJsonSource(findingsPath) {
    const dir = path.dirname(findingsPath);
    const baseName = path.basename(findingsPath, '.md');

    // Strategy 1: Same name, .json extension in same dir
    const sameDir = path.join(dir, `${baseName}.json`);
    if (fs.existsSync(sameDir)) return sameDir;

    // Strategy 2: findings.json or results.json in same dir
    for (const name of ['findings.json', 'results.json', 'data.json']) {
        const p = path.join(dir, name);
        if (fs.existsSync(p)) return p;
    }

    // Strategy 3: Look in parent/04-results/ directory
    const resultsDir = path.join(dir, '..', '04-results');
    if (fs.existsSync(resultsDir)) {
        try {
            const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));
            if (files.length === 1) {
                return path.join(resultsDir, files[0]);
            }
            // If multiple JSON files, look for one with "findings" or "results" in name
            const match = files.find(f => /finding|result/i.test(f));
            if (match) return path.join(resultsDir, match);
        } catch { /* ignore fs errors */ }
    }

    // Strategy 4: .vibe-science/ directory
    const vibeDir = findVibeScienceDir(dir);
    if (vibeDir) {
        const dataDir = path.join(vibeDir, 'data');
        if (fs.existsSync(dataDir)) {
            try {
                const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
                const match = files.find(f => /finding|result/i.test(f));
                if (match) return path.join(dataDir, match);
            } catch { /* ignore */ }
        }
    }

    return null;
}

/**
 * Extract significant numbers from markdown text (ignoring dates, section numbers, etc.)
 * Returns objects with { value: number, context: string (surrounding text) }.
 *
 * @param {string} text
 * @returns {Array<{value: number, context: string}>}
 */
function extractSignificantNumbers(text) {
    const results = [];
    // Match decimal numbers (including negative) and percentages
    // Skip: dates (2024-01-01), section numbers (1., 2.1), simple ordinals (1st, 2nd)
    const regex = /(?<![#\d-])(-?\d+\.?\d*(?:e[+-]?\d+)?)\s*%?/gi;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const numStr = match[1];
        const value = parseFloat(numStr);

        // Skip trivially small integers (section numbers, list indices, etc.)
        if (Number.isInteger(value) && Math.abs(value) <= 10) continue;

        // Skip date-like patterns
        const before = text.substring(Math.max(0, match.index - 10), match.index);
        const after = text.substring(match.index + match[0].length, match.index + match[0].length + 10);
        if (/\d{4}-\d{2}-/.test(before + numStr + after)) continue;

        // Get context (surrounding 40 chars)
        const ctxStart = Math.max(0, match.index - 20);
        const ctxEnd = Math.min(text.length, match.index + match[0].length + 20);
        const context = text.substring(ctxStart, ctxEnd).replace(/\n/g, ' ').trim();

        results.push({ value, context });
    }

    return results;
}

/**
 * Recursively extract all numeric values from a JSON structure.
 * @param {*} obj
 * @param {Set<number>} numbers - Accumulator set
 */
function extractNumbersFromJson(obj, numbers) {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'number' && isFinite(obj)) {
        numbers.add(obj);
        // Also add common representations (percentage, rounded)
        numbers.add(Math.round(obj * 100) / 100);
        numbers.add(Math.round(obj * 1000) / 1000);
        if (obj >= 0 && obj <= 1) {
            numbers.add(obj * 100); // percentage form
        }
        return;
    }

    if (Array.isArray(obj)) {
        for (const item of obj) {
            extractNumbersFromJson(item, numbers);
        }
        return;
    }

    if (typeof obj === 'object') {
        for (const val of Object.values(obj)) {
            extractNumbersFromJson(val, numbers);
        }
    }
}

/**
 * Check whether two numbers match approximately (within 1% relative tolerance
 * or 0.01 absolute tolerance for small numbers).
 *
 * @param {number} a
 * @param {number} b
 * @returns {boolean}
 */
function isApproximateMatch(a, b) {
    if (a === b) return true;
    const diff = Math.abs(a - b);
    // Absolute tolerance for small numbers
    if (diff < 0.01) return true;
    // Relative tolerance: 1%
    const maxAbs = Math.max(Math.abs(a), Math.abs(b));
    if (maxAbs > 0 && diff / maxAbs < 0.01) return true;
    return false;
}

// ── Gate: CLAIM-LEDGER prerequisite gates ───────────────────────────

/**
 * Extract a claim ID from text content.
 * Claim IDs follow the pattern: C-NNN or CLAIM-NNN.
 *
 * @param {string} content
 * @returns {string|null}
 */
function extractClaimId(content) {
    if (!content) return null;
    const match = content.match(/\b(C-\d{1,6}|CLAIM-\d{1,6})\b/i);
    return match ? match[1].toUpperCase() : null;
}

/**
 * Check whether all required gates have been passed for a claim.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} claimId
 * @param {string} sessionId
 * @returns {{pass: boolean, missing: string[], passed: string[]}}
 */
function checkClaimGates(db, claimId, sessionId) {
    let passedGates;
    try {
        passedGates = db.prepare(
            `SELECT DISTINCT gate_id FROM gate_checks
             WHERE claim_id = ? AND status = 'PASS'`
        ).all(claimId).map(row => row.gate_id);
    } catch {
        // If table doesn't exist or query fails, don't block
        return { pass: true, missing: [], passed: [] };
    }

    // Determine which gates are actually required based on the claim's journey.
    // Not all claims go through all gates (e.g., a claim that doesn't involve
    // model training doesn't need DQ2). We check which gates are applicable.
    const requiredGates = getRequiredGatesForClaim(db, claimId);
    const missing = requiredGates.filter(g => !passedGates.includes(g));

    return {
        pass: missing.length === 0,
        missing,
        passed: passedGates
    };
}

/**
 * Determine which gates are required for a specific claim.
 *
 * Heuristic: look at the spine_entries for actions associated with this claim
 * to determine which stages the claim has traversed.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} claimId
 * @returns {string[]}
 */
function getRequiredGatesForClaim(db, claimId) {
    // DQ4 is always required (findings must be synced with data)
    const required = ['DQ4'];

    try {
        // Check if this claim involved data operations (requires DQ1)
        const hasData = db.prepare(
            `SELECT 1 FROM claim_events
             WHERE claim_id = ? AND event_type IN ('CREATED', 'PROMOTED')
             LIMIT 1`
        ).get(claimId);

        if (hasData) {
            required.push('DQ1'); // Post-extraction validation
        }

        // Check if claim involved model training (requires DQ2)
        const hasModel = db.prepare(
            `SELECT 1 FROM spine_entries
             WHERE action_type = 'MODEL_TRAIN'
             AND session_id IN (
                 SELECT DISTINCT session_id FROM claim_events WHERE claim_id = ?
             )
             LIMIT 1`
        ).get(claimId);

        if (hasModel) {
            required.push('DQ2'); // Post-training validation
        }

        // Check if claim involved calibration (requires DQ3)
        const hasCalibration = db.prepare(
            `SELECT 1 FROM spine_entries
             WHERE action_type IN ('CALIBRATION', 'CONFORMAL_PREDICT')
             AND session_id IN (
                 SELECT DISTINCT session_id FROM claim_events WHERE claim_id = ?
             )
             LIMIT 1`
        ).get(claimId);

        if (hasCalibration) {
            required.push('DQ3'); // Post-calibration validation
        }
    } catch {
        // On error, require only DQ4 (minimum viable check)
    }

    return required;
}

// ── Gate L-1+: Literature search before direction nodes ─────────────

/**
 * Detect whether a Write/Edit operation is creating a direction node
 * in the OTAE tree structure.
 *
 * Direction nodes are identified by:
 *   1. Writing to a path containing "direction" or "01-direction"
 *   2. Content containing direction markers like "## Research Direction"
 *   3. Writing to TREE-STATE.json with direction node type
 *
 * @param {object} toolInput
 * @returns {boolean}
 */
function isDirectionNode(toolInput) {
    const filePath = (toolInput.file_path || '').toLowerCase();
    const content = (toolInput.content || toolInput.new_string || '').toLowerCase();

    // Path-based detection
    if (filePath.includes('direction') && (filePath.endsWith('.md') || filePath.endsWith('.json'))) {
        return true;
    }
    if (/01-direction/.test(filePath)) {
        return true;
    }

    // Content-based detection
    if (/##\s*research\s+direction/i.test(content)) {
        return true;
    }
    if (/"node_type"\s*:\s*"direction"/i.test(content)) {
        return true;
    }

    return false;
}

/**
 * Check whether at least one literature search has been performed
 * in the current session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {{pass: boolean, count: number}}
 */
function checkLiteratureGate(db, sessionId) {
    if (!sessionId) return { pass: true, count: 0 }; // can't check without session

    try {
        const row = db.prepare(
            `SELECT COUNT(*) AS cnt FROM literature_searches WHERE session_id = ?`
        ).get(sessionId);

        const count = row?.cnt ?? 0;
        return { pass: count > 0, count };
    } catch {
        // Table may not exist in early setup -- allow
        return { pass: true, count: 0 };
    }
}

/**
 * Try to load domain configuration for helpful L-1+ failure messages.
 * @returns {string} Hint string about recommended literature sources
 */
function loadDomainHint() {
    const configPaths = [
        path.join(process.cwd(), '.vibe-science', 'domain-config.json'),
        path.join(process.cwd(), 'domain-config.json'),
    ];

    for (const p of configPaths) {
        try {
            if (fs.existsSync(p)) {
                const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
                if (config.literature && config.literature.primary && config.literature.primary.length > 0) {
                    return `Recommended sources for domain "${config.domain || 'unknown'}": ` +
                           `${config.literature.primary.join(', ')}.\n`;
                }
            }
        } catch { /* ignore */ }
    }

    return 'Tip: Use WebSearch with domain-specific terms, or query a literature database.\n';
}

// ── Gate logging helper ─────────────────────────────────────────────

/**
 * Log a gate check result to the database.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @param {string} gateId
 * @param {string} status - PASS/WARN/FAIL
 * @param {string|null} claimId
 * @param {object|null} details
 */
function logGateResult(db, sessionId, gateId, status, claimId, details) {
    if (!db || !sessionId) return;

    try {
        db.prepare(
            `INSERT INTO gate_checks
                (session_id, gate_id, claim_id, status, checks_passed, checks_warned, checks_failed, details, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
            sessionId,
            gateId,
            claimId,
            status,
            status === 'PASS' ? 1 : 0,
            status === 'WARN' ? 1 : 0,
            status === 'FAIL' ? 1 : 0,
            details ? JSON.stringify(details) : null,
            new Date().toISOString()
        );
    } catch (err) {
        process.stderr.write(`[PostToolUse] WARNING: Failed to log gate ${gateId}: ${err.message}\n`);
    }
}

// =====================================================================
// Section 2: Permission Enforcement (TEAM MODE)
// =====================================================================

/**
 * Check agent permissions via the permission engine.
 *
 * @param {object} event
 * @returns {null|{exitCode: number, stderr: string}}
 */
function enforcePermissions(event) {
    const { agent_role, tool_name, tool_input = {} } = event;

    // SOLO mode: no restrictions
    if (!agent_role) return null;

    const violation = checkPermission(agent_role, tool_name, tool_input);
    if (violation) {
        return {
            exitCode: 2,
            stderr:
                `PERMISSION DENIED: Agent "${agent_role}" cannot ${violation.action}.\n` +
                `Reason: ${violation.reason}\n` +
                `Required role: ${violation.required_role}`
        };
    }

    return null;
}

// =====================================================================
// Section 3: Auto-Logging (Research Spine + Embedding Queue)
// =====================================================================

/**
 * Classify the tool action and log it to the research spine.
 * Also queue the action summary for async embedding.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 */
function autoLog(db, event) {
    const { tool_name, tool_input = {}, tool_output = '', session_id, agent_role } = event;

    if (!session_id) return;

    // Classify the action type
    const actionType = classifyAction(tool_name, tool_input, tool_output);
    if (!actionType) return;

    const inputSummary = summarizeInput(tool_input, SUMMARY_MAX_CHARS);
    const outputSummary = summarizeOutput(tool_output, SUMMARY_MAX_CHARS);

    // -- Log to spine_entries --
    try {
        db.prepare(
            `INSERT INTO spine_entries
                (session_id, timestamp, action_type, tool_name, input_summary, output_summary, agent_role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
            session_id,
            new Date().toISOString(),
            actionType,
            tool_name,
            inputSummary,
            outputSummary,
            agent_role || null
        );
    } catch (err) {
        process.stderr.write(`[PostToolUse] WARNING: Failed to log spine entry: ${err.message}\n`);
    }

    // -- Queue for embedding (async processing by worker) --
    try {
        const embedText = `${actionType}: ${summarizeInput(tool_input, EMBED_MAX_CHARS)}`;
        queueForEmbedding(db, embedText, {
            session_id,
            action_type: actionType,
            agent_role: agent_role || null
        });
    } catch (err) {
        process.stderr.write(`[PostToolUse] WARNING: Failed to queue embedding: ${err.message}\n`);
    }
}

// ── Action Classification ───────────────────────────────────────────

/**
 * Classify a tool use into a research action type.
 *
 * Categories (from blueprint):
 *   DATA_LOAD          - Loading/downloading datasets
 *   DATA_INSPECT        - Reading/exploring data files
 *   FEATURE_EXTRACTION  - Computing features from raw data
 *   MODEL_TRAIN         - Training ML models
 *   CALIBRATION         - Conformal prediction, calibration
 *   EVALUATION          - Metrics, benchmarks, tests
 *   VISUALIZATION       - Plots, figures
 *   LITERATURE_SEARCH   - Searching scientific literature
 *   CODE_WRITE          - Writing/editing code
 *   DOCUMENTATION       - Writing docs, findings, claims
 *   BUG_FIX             - Fixing errors
 *   CONFIGURATION       - Config, setup, environment
 *   FILE_READ           - Reading files (low priority for logging)
 *   SEARCH              - Searching codebase
 *   REVIEW              - R2 review activity
 *   OTHER               - Uncategorized
 *
 * @param {string} toolName
 * @param {object} toolInput
 * @param {string} toolOutput
 * @returns {string|null} Action type, or null if too trivial to log
 */
function classifyAction(toolName, toolInput = {}, toolOutput = '') {
    const filePath = (toolInput.file_path || '').toLowerCase();
    const content = (toolInput.content || toolInput.new_string || '').toLowerCase();
    const command = (toolInput.command || '').toLowerCase();
    const query = (toolInput.query || toolInput.pattern || '').toLowerCase();
    const outputStr = typeof toolOutput === 'string' ? toolOutput : '';

    // -- Bash commands --
    if (toolName === 'Bash') {
        if (/\b(wget|curl|download|fetch|git\s+clone)\b/.test(command)) return 'DATA_LOAD';
        if (/\b(pip|npm|conda|apt|brew)\s+(install|update)\b/.test(command)) return 'CONFIGURATION';
        if (/\b(python|python3|node)\b.*\b(train|fit|model)\b/.test(command)) return 'MODEL_TRAIN';
        if (/\b(python|python3|node)\b.*\b(calibrat|conformal)\b/.test(command)) return 'CALIBRATION';
        if (/\b(python|python3|node)\b.*\b(feature|extract|preprocess)\b/.test(command)) return 'FEATURE_EXTRACTION';
        if (/\b(python|python3|node)\b.*\b(eval|test|benchmark|metric)\b/.test(command)) return 'EVALUATION';
        if (/\b(python|python3|node)\b.*\b(plot|fig|visual|chart)\b/.test(command)) return 'VISUALIZATION';
        if (/\b(python|python3|node)\b/.test(command)) return 'CODE_WRITE';
        if (/\b(git)\b/.test(command)) return 'CONFIGURATION';
        if (/\b(error|fix|debug|traceback)\b/.test(outputStr.toLowerCase().substring(0, 500))) return 'BUG_FIX';
        return 'OTHER';
    }

    // -- Write/Edit: classify by target file --
    if (toolName === 'Write' || toolName === 'Edit') {
        if (/findings|claim|ledger/i.test(filePath)) return 'DOCUMENTATION';
        if (/review|r2|report/i.test(filePath)) return 'REVIEW';
        if (/\.(py|r|jl|ipynb)$/.test(filePath)) {
            if (/train|fit|model/i.test(content)) return 'MODEL_TRAIN';
            if (/calibrat|conformal/i.test(content)) return 'CALIBRATION';
            if (/feature|extract|preprocess/i.test(content)) return 'FEATURE_EXTRACTION';
            if (/eval|test|benchmark|metric/i.test(content)) return 'EVALUATION';
            if (/plot|fig|visual|chart|matplotlib|seaborn|plotly/i.test(content)) return 'VISUALIZATION';
            return 'CODE_WRITE';
        }
        if (/\.(json|yaml|yml|toml|cfg|ini|env)$/.test(filePath)) return 'CONFIGURATION';
        if (/\.(md|txt|rst)$/.test(filePath)) return 'DOCUMENTATION';
        if (/\.(csv|tsv|parquet|h5|hdf5)$/.test(filePath)) return 'DATA_LOAD';
        return 'CODE_WRITE';
    }

    // -- Read: data inspection --
    if (toolName === 'Read') {
        if (/\.(csv|tsv|parquet|h5|json)$/.test(filePath)) return 'DATA_INSPECT';
        return 'FILE_READ';
    }

    // -- WebSearch/WebFetch: literature or general search --
    if (toolName === 'WebSearch' || toolName === 'WebFetch') {
        if (LITERATURE_PATTERNS.some(p => p.test(query) || p.test(toolInput.url || ''))) {
            return 'LITERATURE_SEARCH';
        }
        return 'SEARCH';
    }

    // -- Grep/Glob: codebase search --
    if (toolName === 'Grep' || toolName === 'Glob') {
        return 'SEARCH';
    }

    // -- Task: depends on context, default to OTHER --
    if (toolName === 'Task') return 'OTHER';

    // Catch-all
    return 'OTHER';
}

// ── Summary Helpers ─────────────────────────────────────────────────

/**
 * Create a human-readable summary of tool input, truncated to maxLen.
 *
 * @param {object} toolInput
 * @param {number} maxLen
 * @returns {string}
 */
function summarizeInput(toolInput, maxLen = 200) {
    if (!toolInput || typeof toolInput !== 'object') return '';

    const parts = [];

    if (toolInput.file_path) {
        parts.push(`file: ${toolInput.file_path}`);
    }
    if (toolInput.command) {
        parts.push(`cmd: ${toolInput.command}`);
    }
    if (toolInput.query) {
        parts.push(`query: ${toolInput.query}`);
    }
    if (toolInput.pattern) {
        parts.push(`pattern: ${toolInput.pattern}`);
    }
    if (toolInput.url) {
        parts.push(`url: ${toolInput.url}`);
    }
    if (toolInput.content) {
        parts.push(`content: ${toolInput.content.substring(0, 100)}`);
    }
    if (toolInput.new_string) {
        parts.push(`edit: ${toolInput.new_string.substring(0, 100)}`);
    }

    const result = parts.join(' | ');
    return result.length > maxLen ? result.substring(0, maxLen - 3) + '...' : result;
}

/**
 * Create a human-readable summary of tool output, truncated to maxLen.
 *
 * @param {string|object} toolOutput
 * @param {number} maxLen
 * @returns {string}
 */
function summarizeOutput(toolOutput, maxLen = 200) {
    if (!toolOutput) return '';

    const str = typeof toolOutput === 'string'
        ? toolOutput
        : JSON.stringify(toolOutput);

    if (str.length <= maxLen) return str;

    // Take first and last portions for context
    const headLen = Math.floor(maxLen * 0.7);
    const tailLen = maxLen - headLen - 5; // 5 for " ... "
    return str.substring(0, headLen) + ' ... ' + str.substring(str.length - tailLen);
}

/**
 * Truncate text to a maximum length.
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
function summarizeText(text, maxLen) {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : text;
}

// =====================================================================
// Section 4: Observer Checks (periodic project health)
// =====================================================================

/**
 * Run periodic observer checks on the project directory.
 * Only runs every OBSERVER_INTERVAL tool uses to avoid performance overhead.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} event
 * @returns {null|{exitCode: number, stderr: string}} null = ok, object = HALT
 */
function runPeriodicObserver(db, event) {
    const { session_id } = event;
    if (!session_id) return null;

    // Check tool count for this session
    let toolCount;
    try {
        const row = db.prepare(
            `SELECT COUNT(*) AS n FROM spine_entries WHERE session_id = ?`
        ).get(session_id);
        toolCount = row?.n ?? 0;
    } catch {
        return null; // can't check, skip
    }

    // Only run every N tool uses
    if (toolCount === 0 || toolCount % OBSERVER_INTERVAL !== 0) {
        return null;
    }

    const projectPath = getProjectPath();
    const alerts = runObserverChecks(projectPath, db, session_id);

    // Log all alerts and check for HALT
    for (const alert of alerts) {
        try {
            db.prepare(
                `INSERT INTO observer_alerts
                    (project_path, level, message, created_at)
                 VALUES (?, ?, ?, ?)`
            ).run(projectPath, alert.level, alert.message, new Date().toISOString());
        } catch (err) {
            process.stderr.write(`[PostToolUse] WARNING: Failed to log observer alert: ${err.message}\n`);
        }

        if (alert.level === 'HALT') {
            return {
                exitCode: 2,
                stderr: `OBSERVER HALT: ${alert.message}`
            };
        }

        if (alert.level === 'WARN') {
            process.stderr.write(`[OBSERVER WARNING] ${alert.message}\n`);
        }
    }

    return null;
}

/**
 * Get the project path.
 * Looks for .vibe-science/ directory walking up from cwd.
 *
 * @returns {string}
 */
function getProjectPath() {
    let dir = process.cwd();

    // Walk up looking for .vibe-science/ marker directory
    for (let i = 0; i < 10; i++) {
        const vibeDir = path.join(dir, '.vibe-science');
        if (fs.existsSync(vibeDir)) {
            return dir;
        }
        const parent = path.dirname(dir);
        if (parent === dir) break; // root
        dir = parent;
    }

    // Fall back to cwd
    return process.cwd();
}

/**
 * Find the .vibe-science directory walking up from a starting point.
 * @param {string} startDir
 * @returns {string|null}
 */
function findVibeScienceDir(startDir) {
    let dir = startDir;
    for (let i = 0; i < 10; i++) {
        const vibeDir = path.join(dir, '.vibe-science');
        if (fs.existsSync(vibeDir)) return vibeDir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return null;
}

/**
 * Run observer health checks on the project.
 *
 * Checks for:
 *   1. Stale STATE.md (not updated recently)
 *   2. FINDINGS.md newer than its JSON source (desync)
 *   3. Orphaned data files (in 02-data/ but not referenced)
 *   4. Design-execution drift (STATE.md phase vs actual actions)
 *   5. Literature search staleness (no searches for 3+ observer cycles)
 *
 * @param {string} projectPath
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {Array<{level: string, message: string}>}
 */
function runObserverChecks(projectPath, db, sessionId) {
    const alerts = [];
    const vibeDir = path.join(projectPath, '.vibe-science');

    // If no .vibe-science directory, nothing to check
    if (!fs.existsSync(vibeDir)) {
        return alerts;
    }

    // -----------------------------------------------------------------
    // Check 1: Stale STATE.md
    // -----------------------------------------------------------------
    const statePaths = [
        path.join(vibeDir, 'STATE.md'),
        path.join(projectPath, 'STATE.md'),
    ];

    for (const statePath of statePaths) {
        if (fs.existsSync(statePath)) {
            try {
                const stat = fs.statSync(statePath);
                const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

                if (ageHours > STATE_STALE_HOURS * 3) {
                    alerts.push({
                        level: 'HALT',
                        message:
                            `STATE.md has not been updated in ${Math.round(ageHours)} hours (>${STATE_STALE_HOURS * 3}h limit). ` +
                            `The project state is severely stale. Update STATE.md before continuing.`
                    });
                } else if (ageHours > STATE_STALE_HOURS) {
                    alerts.push({
                        level: 'WARN',
                        message:
                            `STATE.md has not been updated in ${Math.round(ageHours)} hours. ` +
                            `Consider updating to reflect current progress.`
                    });
                }
            } catch { /* stat error, skip */ }
            break; // only check the first existing STATE.md
        }
    }

    // -----------------------------------------------------------------
    // Check 2: FINDINGS.md / JSON desync (file timestamps)
    // -----------------------------------------------------------------
    const findingsPaths = findFilesMatching(projectPath, /FINDINGS.*\.md$/i, 3);
    for (const findingsPath of findingsPaths) {
        const jsonPath = findJsonSource(findingsPath);
        if (jsonPath && fs.existsSync(jsonPath)) {
            try {
                const findingsStat = fs.statSync(findingsPath);
                const jsonStat = fs.statSync(jsonPath);

                // If FINDINGS.md is significantly newer than JSON, it might have
                // been edited without updating the JSON source
                const timeDiffMs = findingsStat.mtimeMs - jsonStat.mtimeMs;
                const timeDiffMin = timeDiffMs / (1000 * 60);

                if (timeDiffMin > 30) {
                    alerts.push({
                        level: 'WARN',
                        message:
                            `FINDINGS.md (${path.basename(findingsPath)}) is ${Math.round(timeDiffMin)} minutes ` +
                            `newer than its JSON source (${path.basename(jsonPath)}). ` +
                            `Possible SSOT desync -- verify numbers match.`
                    });
                }
            } catch { /* stat error, skip */ }
        }
    }

    // -----------------------------------------------------------------
    // Check 3: Orphaned data files
    // -----------------------------------------------------------------
    const dataDir = path.join(projectPath, '02-data');
    if (fs.existsSync(dataDir)) {
        try {
            const dataFiles = fs.readdirSync(dataDir)
                .filter(f => /\.(csv|tsv|parquet|h5|hdf5|json|xlsx)$/i.test(f));

            if (dataFiles.length > 0) {
                // Check which data files are referenced in scripts or notebooks
                const codeFiles = [
                    ...findFilesMatching(projectPath, /\.(py|r|jl|ipynb)$/i, 5),
                    ...findFilesMatching(projectPath, /\.(md|yaml|yml)$/i, 3),
                ];

                let allCode = '';
                for (const cf of codeFiles) {
                    try {
                        const content = fs.readFileSync(cf, 'utf-8');
                        allCode += content + '\n';
                    } catch { /* skip unreadable files */ }
                }

                const orphaned = dataFiles.filter(f => !allCode.includes(f));

                if (orphaned.length > 3) {
                    alerts.push({
                        level: 'WARN',
                        message:
                            `${orphaned.length} data files in 02-data/ are not referenced in any code: ` +
                            `${orphaned.slice(0, 5).join(', ')}${orphaned.length > 5 ? '...' : ''}. ` +
                            `Consider cleaning up or documenting them.`
                    });
                }
            }
        } catch { /* readdir error, skip */ }
    }

    // -----------------------------------------------------------------
    // Check 4: Design-execution drift (phase check)
    // -----------------------------------------------------------------
    if (db && sessionId) {
        try {
            // Read current phase from STATE.md
            const stateContent = readStateFile(projectPath);
            if (stateContent) {
                const currentPhase = extractPhaseFromState(stateContent);
                if (currentPhase) {
                    // Get recent action types to check alignment
                    const recentActions = db.prepare(
                        `SELECT action_type, COUNT(*) as cnt FROM spine_entries
                         WHERE session_id = ?
                         GROUP BY action_type
                         ORDER BY cnt DESC
                         LIMIT 5`
                    ).all(sessionId);

                    const drift = detectDrift(currentPhase, recentActions);
                    if (drift) {
                        alerts.push({
                            level: drift.severity,
                            message: drift.message
                        });
                    }
                }
            }
        } catch { /* drift check failed, skip */ }
    }

    // -----------------------------------------------------------------
    // Check 5: Literature search staleness
    // -----------------------------------------------------------------
    if (db && sessionId) {
        try {
            const litCount = db.prepare(
                `SELECT COUNT(*) as cnt FROM literature_searches WHERE session_id = ?`
            ).get(sessionId);

            const spineCount = db.prepare(
                `SELECT COUNT(*) as cnt FROM spine_entries WHERE session_id = ?`
            ).get(sessionId);

            // If we've done 30+ actions with zero literature searches, warn
            if ((spineCount?.cnt ?? 0) >= 30 && (litCount?.cnt ?? 0) === 0) {
                alerts.push({
                    level: 'WARN',
                    message:
                        `No literature searches in ${spineCount.cnt} actions. ` +
                        `Stale knowledge risk -- consider searching for recent relevant papers.`
                });
            }
        } catch { /* query failed, skip */ }
    }

    return alerts;
}

// ── Observer Helper Functions ───────────────────────────────────────

/**
 * Find files matching a regex pattern within a project directory.
 * Non-recursive by default (max depth controlled by maxDepth).
 *
 * @param {string} rootDir
 * @param {RegExp} pattern
 * @param {number} maxDepth
 * @returns {string[]}
 */
function findFilesMatching(rootDir, pattern, maxDepth = 2) {
    const results = [];

    function walk(dir, depth) {
        if (depth > maxDepth) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                // Skip hidden directories (except .vibe-science)
                if (entry.isDirectory()) {
                    if (entry.name.startsWith('.') && entry.name !== '.vibe-science') continue;
                    if (entry.name === 'node_modules' || entry.name === '__pycache__') continue;
                    walk(fullPath, depth + 1);
                } else if (entry.isFile() && pattern.test(entry.name)) {
                    results.push(fullPath);
                }
            }
        } catch { /* permission or read error, skip */ }
    }

    walk(rootDir, 0);
    return results;
}

/**
 * Read the STATE.md file from the project.
 * @param {string} projectPath
 * @returns {string|null}
 */
function readStateFile(projectPath) {
    const paths = [
        path.join(projectPath, '.vibe-science', 'STATE.md'),
        path.join(projectPath, 'STATE.md'),
    ];

    for (const p of paths) {
        try {
            if (fs.existsSync(p)) {
                return fs.readFileSync(p, 'utf-8');
            }
        } catch { /* skip */ }
    }

    return null;
}

/**
 * Extract the current research phase from STATE.md content.
 *
 * Expected format: "## Phase: EXPLORATION" or "phase: training" etc.
 *
 * @param {string} stateContent
 * @returns {string|null} Normalized phase name
 */
function extractPhaseFromState(stateContent) {
    const match = stateContent.match(/(?:^|\n)#*\s*(?:phase|stage|step)\s*:\s*(\w[\w\s-]*)/im);
    if (!match) return null;

    const raw = match[1].trim().toUpperCase().replace(/\s+/g, '_');

    // Normalize common phase names
    const phaseMap = {
        'EXPLORATION': 'EXPLORATION',
        'DIRECTION': 'DIRECTION',
        'DATA_COLLECTION': 'DATA',
        'DATA': 'DATA',
        'DATA_LOADING': 'DATA',
        'FEATURE_EXTRACTION': 'FEATURES',
        'FEATURES': 'FEATURES',
        'PREPROCESSING': 'FEATURES',
        'TRAINING': 'TRAINING',
        'MODEL_TRAINING': 'TRAINING',
        'CALIBRATION': 'CALIBRATION',
        'EVALUATION': 'EVALUATION',
        'ANALYSIS': 'EVALUATION',
        'WRITING': 'WRITING',
        'DOCUMENTATION': 'WRITING',
    };

    return phaseMap[raw] || raw;
}

/**
 * Detect drift between the declared phase and actual agent actions.
 *
 * @param {string} declaredPhase
 * @param {Array<{action_type: string, cnt: number}>} recentActions
 * @returns {null|{severity: string, message: string}}
 */
function detectDrift(declaredPhase, recentActions) {
    if (!recentActions || recentActions.length === 0) return null;

    // Map phases to expected dominant action types
    const phaseExpectedActions = {
        'EXPLORATION': ['SEARCH', 'LITERATURE_SEARCH', 'FILE_READ', 'DATA_INSPECT'],
        'DIRECTION': ['LITERATURE_SEARCH', 'DOCUMENTATION', 'SEARCH'],
        'DATA': ['DATA_LOAD', 'DATA_INSPECT', 'CONFIGURATION'],
        'FEATURES': ['FEATURE_EXTRACTION', 'CODE_WRITE', 'DATA_INSPECT'],
        'TRAINING': ['MODEL_TRAIN', 'CODE_WRITE', 'EVALUATION'],
        'CALIBRATION': ['CALIBRATION', 'CODE_WRITE', 'EVALUATION'],
        'EVALUATION': ['EVALUATION', 'VISUALIZATION', 'DOCUMENTATION'],
        'WRITING': ['DOCUMENTATION', 'VISUALIZATION', 'REVIEW'],
    };

    const expectedActions = phaseExpectedActions[declaredPhase];
    if (!expectedActions) return null;

    // Check if the top action types align with expected phase
    const topAction = recentActions[0];
    const totalActions = recentActions.reduce((sum, a) => sum + a.cnt, 0);

    // If the dominant action type is not in expected list, that's drift
    if (!expectedActions.includes(topAction.action_type) && topAction.cnt > totalActions * 0.5) {
        return {
            severity: 'WARN',
            message:
                `Design-execution drift: STATE.md says phase is "${declaredPhase}" ` +
                `but ${Math.round(topAction.cnt / totalActions * 100)}% of actions are "${topAction.action_type}". ` +
                `Consider updating STATE.md to reflect actual work, or realign work to the declared phase.`
        };
    }

    return null;
}
