/**
 * Vibe Science v7.0 TRACE — Gate Engine
 *
 * Gate enforcement logic consumed by post-tool-use.js.
 * Implements DQ1-DQ4 data quality gates, DC0 design compliance,
 * DD0 data dictionary, L-1+ literature gate, and claim-level
 * gate aggregation.
 *
 * All functions are pure or DB-dependent — no side-effects beyond
 * the return values.  The calling hook decides whether to BLOCK
 * (exit code 2) or WARN based on the result.
 *
 * Exports:
 *   checkGateDQ4()           — FINDINGS.md ↔ JSON source sync
 *   checkClaimGates()        — all required gates passed for a claim?
 *   checkLiteratureGate()    — L-1+ enforcement (pre-direction)
 *   getRequiredGatesForClaim() — which gates a claim needs
 *   extractClaimId()         — regex extraction of claim IDs
 *   (classifyAction removed — canonical implementation lives in post-tool-use.js)
 *   isDirectionNode()        — does tool_input create an OTAE direction node?
 *   hasLiteratureSearch()    — has a lit search been logged this session?
 *   findJsonSource()         — FINDINGS.md → companion JSON
 *   runSyncCheck()           — compare numbers in .md vs .json
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { dirname, basename, join, resolve } from 'path';
import { getCitationChecks as getCitationChecksFromDb } from './db.js';

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

/**
 * Core gates that every claim must pass before it can be written
 * to CLAIM-LEDGER.  Domain-specific configs may add more (G0-G6,
 * DQ1-DQ3, etc.) but these are always required.
 */
const BASE_CLAIM_GATES = ['DQ4', 'DC0'];

/**
 * Extended gate sets keyed by claim "tier".
 * Tier is encoded in the claim ID:
 *   C0xx → observational (tier 0)  — needs DQ4 + DC0
 *   C1xx → analytical   (tier 1)  — adds DQ1
 *   C2xx → model-based  (tier 2)  — adds DQ1 + DQ2
 *   C3xx → calibrated   (tier 3)  — adds DQ1 + DQ2 + DQ3
 *   CLAIM-N → legacy format, treated as tier 1
 */
const TIER_GATES = {
    0: [...BASE_CLAIM_GATES],
    1: [...BASE_CLAIM_GATES, 'DQ1'],
    2: [...BASE_CLAIM_GATES, 'DQ1', 'DQ2'],
    3: [...BASE_CLAIM_GATES, 'DQ1', 'DQ2', 'DQ3'],
};

// ─────────────────────────────────────────────────────────────────────
// extractClaimId
// ─────────────────────────────────────────────────────────────────────

/**
 * Extract a claim identifier from arbitrary content.
 *
 * Recognised formats:
 *   C001, C123, C999   — compact format   → returns as-is
 *   CLAIM-1, CLAIM-42  — legacy format    → returns as-is
 *
 * @param {string} content — text to scan
 * @returns {string|null}  — first claim ID found, or null
 */
export function extractClaimId(content) {
    if (!content || typeof content !== 'string') return null;

    // Try compact format first (C or C- followed by 1+ digits)
    const compactMatch = content.match(/\bC-?(\d+)\b/);
    if (compactMatch) return `C-${compactMatch[1].padStart(3, '0')}`;

    // Try legacy format (CLAIM- followed by digits)
    const legacyMatch = content.match(/\bCLAIM-(\d+)\b/);
    if (legacyMatch) return `CLAIM-${legacyMatch[1]}`;

    return null;
}

// ─────────────────────────────────────────────────────────────────────
// getRequiredGatesForClaim
// ─────────────────────────────────────────────────────────────────────

/**
 * Determine which gates must pass before a claim can be committed.
 *
 * @param {string} claimId — e.g. 'C001', 'C-001', 'C213', 'C-213', 'CLAIM-5'
 * @returns {string[]}     — array of gate IDs
 */
export function getRequiredGatesForClaim(claimId) {
    if (!claimId) return [...BASE_CLAIM_GATES];

    // Compact format: Cxxx / C-xxx / C-xxxx ... — first digit is still the tier marker
    const compactMatch = claimId.match(/^C-?(\d)\d{2,}$/);
    if (compactMatch) {
        const tier = parseInt(compactMatch[1], 10);
        return TIER_GATES[tier] || TIER_GATES[1]; // fallback to tier 1
    }

    // Legacy format: CLAIM-N — treat as tier 1 (analytical)
    if (/^CLAIM-\d+$/.test(claimId)) {
        return [...TIER_GATES[1]];
    }

    // Unknown format — return base
    return [...BASE_CLAIM_GATES];
}

// ─────────────────────────────────────────────────────────────────────
// checkClaimGates
// ─────────────────────────────────────────────────────────────────────

/**
 * Check whether all required gates have been passed for a claim.
 *
 * @param {object} db        — SQLite database handle (better-sqlite3 or
 *                              compatible).  Must support `.all(sql, ...params)`.
 * @param {string} claimId   — the claim to check
 * @returns {{ pass: boolean, missing?: string[] }}
 */
export function checkClaimGates(db, claimId, sessionId) {
    if (!claimId) return { pass: true };

    const required = getRequiredGatesForClaim(claimId);

    // Query PASS entries for this claim OR session-level (claim_id IS NULL).
    // Session-level gates like DQ4 are logged without a specific claim_id
    // but still satisfy the prerequisite for any claim in that session.
    let passedGates = [];
    try {
        const rows = db.prepare(
            `SELECT DISTINCT gate_id FROM gate_checks
             WHERE (claim_id = ? OR (claim_id IS NULL AND session_id = ?))
               AND status = 'PASS'`
        ).all(claimId, sessionId || '');
        passedGates = rows.map(r => r.gate_id);
    } catch {
        // If DB is unavailable, fail open with a warning
        return { pass: true, _warning: 'DB unavailable — gate check skipped' };
    }

    const missing = required.filter(g => !passedGates.includes(g));

    if (missing.length === 0) {
        return { pass: true };
    }

    return { pass: false, missing };
}

// ─────────────────────────────────────────────────────────────────────
// Citation validity helpers (TRACE WP-04/WP-05)
// ─────────────────────────────────────────────────────────────────────

/**
 * Load citation rows for a claim or session.
 *
 * @param {object} db
 * @param {{ sessionId?: string, claimId?: string }} filters
 * @returns {object[]}
 */
export function getCitationChecks(db, filters = {}) {
    return getCitationChecksFromDb(db, filters);
}

/**
 * Summarize citation validity for a claim or session.
 *
 * @param {object} db
 * @param {{ sessionId?: string, claimId?: string }} filters
 * @returns {{ count: number, statuses: Record<string, number>, citations: object[] }}
 */
export function summarizeCitationValidity(db, filters = {}) {
    const citations = getCitationChecks(db, filters);
    const statuses = {};
    for (const citation of citations) {
        const status = String(citation.verification_status || 'PENDING').toUpperCase();
        statuses[status] = (statuses[status] || 0) + 1;
    }
    return { count: citations.length, statuses, citations };
}

/**
 * Gate L0: source validity blocks unresolved or retracted citations.
 *
 * @param {object} db
 * @param {{ sessionId?: string, claimId?: string }} filters
 * @returns {{ pass: boolean, count: number, blockers: object[], citations: object[] }}
 */
export function checkSourceValidityGate(db, filters = {}) {
    const summary = summarizeCitationValidity(db, filters);
    if (summary.count === 0) {
        return { pass: true, count: 0, blockers: [], citations: [] };
    }

    const blockers = summary.citations.filter(citation => {
        const status = String(citation.verification_status || 'PENDING').toUpperCase();
        return status === 'UNRESOLVED' || status === 'RETRACTED';
    });

    return {
        pass: blockers.length === 0,
        count: summary.count,
        blockers,
        citations: summary.citations,
        statuses: summary.statuses,
    };
}

/**
 * Gate D1 source policy: promotion blocks unless all tracked citations are VERIFIED.
 *
 * @param {object} db
 * @param {{ sessionId?: string, claimId?: string }} filters
 * @returns {{ pass: boolean, reason?: string, count: number, blockers: object[], citations: object[], statuses?: Record<string, number> }}
 */
export function checkClaimPromotionSources(db, filters = {}) {
    const summary = summarizeCitationValidity(db, filters);
    if (summary.count === 0) {
        return {
            pass: false,
            reason: 'NO_CITATIONS',
            count: 0,
            blockers: [],
            citations: [],
            statuses: {},
        };
    }

    const blockers = summary.citations.filter(citation => {
        const status = String(citation.verification_status || 'PENDING').toUpperCase();
        return status !== 'VERIFIED';
    });

    return {
        pass: blockers.length === 0,
        count: summary.count,
        blockers,
        citations: summary.citations,
        statuses: summary.statuses,
    };
}

// ─────────────────────────────────────────────────────────────────────
// findJsonSource
// ─────────────────────────────────────────────────────────────────────

/**
 * Given a FINDINGS.md path, locate the companion JSON data source.
 *
 * Search strategy (in order):
 *   1. Same directory, same base name with .json extension
 *   2. Sibling `data/` directory with same base name
 *   3. Parent's `02-data/` directory with same base name
 *   4. Same directory, any file matching *findings*.json
 *
 * @param {string} mdFilePath — absolute path to the .md file
 * @returns {string|null}     — absolute path to JSON, or null
 */
export function findJsonSource(mdFilePath) {
    if (!mdFilePath) return null;

    const dir = dirname(mdFilePath);
    const base = basename(mdFilePath, '.md');

    // Strategy 1: same dir, same name .json
    const sameDir = join(dir, `${base}.json`);
    if (existsSync(sameDir)) return sameDir;

    // Strategy 2: sibling data/ directory
    const siblingData = join(dir, 'data', `${base}.json`);
    if (existsSync(siblingData)) return siblingData;

    // Strategy 3: parent's 02-data/
    const parentData = join(resolve(dir, '..'), '02-data', `${base}.json`);
    if (existsSync(parentData)) return parentData;

    // Strategy 4: any *findings*.json in same dir
    // (lightweight scan — no glob dependency)
    try {
        const files = readdirSync(dir);
        const match = files.find(
            f => f.toLowerCase().includes('findings') && f.endsWith('.json'),
        );
        if (match) return join(dir, match);
    } catch {
        // ignore — directory might not be readable
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────
// runSyncCheck
// ─────────────────────────────────────────────────────────────────────

/**
 * Extract all numeric values from a string.
 * Returns an array of { value: number, context: string } where context
 * is the surrounding text (up to 40 chars each side).
 */
function extractNumbers(text) {
    const results = [];
    // Match integers and decimals, including negative and scientific notation.
    // Exclude things that are clearly not data values (line numbers, dates, etc.)
    const re = /(?<!\d[/-])(?<![A-Za-z])(-?\d+\.?\d*(?:[eE][+-]?\d+)?)(?![/-]\d)(?![A-Za-z])/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const val = parseFloat(m[1]);
        if (!isFinite(val)) continue;

        // Skip very small integers that are likely formatting (1, 2, 3 ...)
        // in markdown headers / list items — unless they are decimals
        if (Number.isInteger(val) && Math.abs(val) < 4 && !m[1].includes('.')) continue;

        const start = Math.max(0, m.index - 40);
        const end = Math.min(text.length, m.index + m[0].length + 40);
        const context = text.slice(start, end).replace(/\n/g, ' ').trim();

        results.push({ value: val, context, index: m.index });
    }
    return results;
}

/**
 * Compare the numeric values present in a Markdown findings file
 * against the data in its companion JSON source.
 *
 * A "mismatch" is any number that appears in the markdown but cannot
 * be found anywhere in the JSON (as a value, nested arbitrarily deep).
 *
 * @param {string} mdPath   — path to the .md file
 * @param {string} jsonPath — path to the .json source
 * @returns {{ pass: boolean, mismatches?: Array<{number: number, context: string}> }}
 */
export function runSyncCheck(mdPath, jsonPath) {
    if (!mdPath || !jsonPath) {
        return { pass: true, _warning: 'Missing path — sync check skipped' };
    }

    let mdContent, jsonContent;
    try {
        mdContent = readFileSync(mdPath, 'utf-8');
    } catch {
        return { pass: true, _warning: `Cannot read ${mdPath}` };
    }
    try {
        jsonContent = readFileSync(jsonPath, 'utf-8');
    } catch {
        return { pass: true, _warning: `Cannot read ${jsonPath}` };
    }

    // Parse JSON and flatten all numeric values
    let jsonData;
    try {
        jsonData = JSON.parse(jsonContent);
    } catch {
        return { pass: false, mismatches: [{ number: NaN, context: 'Invalid JSON source' }] };
    }

    const jsonNumbers = new Set();
    flattenNumbers(jsonData, jsonNumbers);

    // Extract numbers from markdown
    const mdNumbers = extractNumbers(mdContent);

    // Find mismatches: numbers in MD not present in JSON
    const mismatches = [];
    for (const entry of mdNumbers) {
        if (!numberExistsInSet(entry.value, jsonNumbers)) {
            mismatches.push({ number: entry.value, context: entry.context });
        }
    }

    if (mismatches.length === 0) {
        return { pass: true };
    }

    return { pass: false, mismatches };
}

/**
 * Recursively collect all numeric values from a JSON structure.
 */
function flattenNumbers(obj, set) {
    if (obj === null || obj === undefined) return;

    if (typeof obj === 'number' && isFinite(obj)) {
        set.add(obj);
        return;
    }

    if (typeof obj === 'string') {
        // Try to extract numbers from string values too
        const parsed = parseFloat(obj);
        if (isFinite(parsed)) set.add(parsed);
        return;
    }

    if (Array.isArray(obj)) {
        for (const item of obj) flattenNumbers(item, set);
        return;
    }

    if (typeof obj === 'object') {
        for (const val of Object.values(obj)) flattenNumbers(val, set);
    }
}

/**
 * Check if a number exists in the set, with floating-point tolerance.
 * Two numbers match if their relative difference is < 1e-9 or their
 * absolute difference is < 1e-12.
 */
function numberExistsInSet(value, set) {
    // Exact match first (fast path)
    if (set.has(value)) return true;

    // Tolerance match for floats
    for (const candidate of set) {
        const diff = Math.abs(value - candidate);
        if (diff < 1e-12) return true;
        const rel = diff / Math.max(Math.abs(value), Math.abs(candidate), 1e-15);
        if (rel < 1e-9) return true;
    }

    return false;
}

// ─────────────────────────────────────────────────────────────────────
// checkGateDQ4
// ─────────────────────────────────────────────────────────────────────

/**
 * DQ4 gate: verify that FINDINGS.md is in sync with its JSON source.
 *
 * @param {string} filePath   — the file being written (must contain FINDINGS and end .md)
 * @param {object} toolInput  — the tool input (for context; currently unused beyond filePath)
 * @returns {{ pass: boolean, mismatches?: Array<{number: number, context: string}> }}
 */
export function checkGateDQ4(filePath, toolInput) {
    // Only applies to FINDINGS markdown files
    if (!filePath || !filePath.includes('FINDINGS') || !filePath.endsWith('.md')) {
        return { pass: true };
    }

    const jsonSource = findJsonSource(filePath);
    if (!jsonSource) {
        // No JSON companion found — cannot enforce sync, warn but pass
        return {
            pass: true,
            _warning: `No JSON source found for ${filePath}. DQ4 sync check skipped.`,
        };
    }

    return runSyncCheck(filePath, jsonSource);
}

// ─────────────────────────────────────────────────────────────────────
// Literature gate (L-1+)
// ─────────────────────────────────────────────────────────────────────

/**
 * Check whether the tool input is creating an OTAE direction node.
 *
 * Direction nodes are typically:
 *   - Writes to files named *direction*, *DIRECTION*, or inside 01-directions/
 *   - Content containing "## Direction" or "direction_type" or "OTAE:direction"
 *
 * @param {object} toolInput — the tool's input payload
 * @returns {boolean}
 */
export function isDirectionNode(toolInput) {
    if (!toolInput) return false;

    const filePath = toolInput.file_path || '';
    const content = toolInput.content || toolInput.new_string || '';

    // File path indicators
    const pathLower = filePath.toLowerCase().replace(/\\/g, '/');
    if (pathLower.includes('01-direction') || pathLower.includes('/direction')) {
        return true;
    }
    if (/direction[s]?\.(md|json|yaml)$/i.test(filePath)) {
        return true;
    }

    // Content indicators
    const contentLower = content.toLowerCase();
    if (contentLower.includes('## direction')
        || contentLower.includes('direction_type')
        || contentLower.includes('otae:direction')
        || contentLower.includes('node_type: direction')
        || contentLower.includes('"node_type":"direction"')
        || contentLower.includes("'node_type':'direction'")) {
        return true;
    }

    return false;
}

/**
 * Check if any literature search has been logged for a given session.
 *
 * @param {string} sessionId — session identifier
 * @param {object} db        — database handle
 * @returns {boolean}
 */
export function hasLiteratureSearch(sessionId, db) {
    if (!db || !sessionId) return false;

    try {
        const row = db.prepare(
            `SELECT COUNT(*) as n FROM literature_searches WHERE session_id = ?`
        ).get(sessionId);
        return row && row.n > 0;
    } catch {
        // Table might not exist yet — fail open
        return false;
    }
}

/**
 * L-1+ literature gate enforcement.
 *
 * BLOCKING check: before a direction node can be created, at least
 * one literature search must have been logged for the session.
 *
 * @param {object} db         — database handle
 * @param {string} sessionId  — current session ID
 * @param {object} toolInput  — the tool's input payload
 * @returns {{ pass: boolean, message?: string }}
 */
export function checkLiteratureGate(db, sessionId, toolInput) {
    // Only applies when creating a direction node
    if (!isDirectionNode(toolInput)) {
        return { pass: true };
    }

    // Check for prior literature search
    if (hasLiteratureSearch(sessionId, db)) {
        return { pass: true };
    }

    return {
        pass: false,
        message:
            'GATE L-1+ FAIL: No literature search recorded for this session. ' +
            'Run a literature search before defining a research direction. ' +
            'Acceptable sources: WebSearch with scientific terms, MCP literature server, ' +
            'K-Dense database skill, Local RAG query, or explicit paper reading (DOI/PMID).',
    };
}

// ─────────────────────────────────────────────────────────────────────
// classifyAction — REMOVED (v6.0.6)
// ─────────────────────────────────────────────────────────────────────
// The canonical classifyAction() lives in post-tool-use.js.
// It was duplicated here with 26 non-schema-valid return values (e.g.
// FEATURE_EXTRACT, DATA_DISCOVERY, CODE_SEARCH, MODEL_CALIBRATE, etc.)
// that did NOT match spine-entry.schema.json action_type enum.
// Removed to eliminate confusion. The post-tool-use.js version now
// returns ONLY schema-valid values.
