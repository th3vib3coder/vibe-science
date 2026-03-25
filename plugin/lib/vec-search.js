/**
 * Vibe Science v7.0 TRACE — Retrieval Runtime
 *
 * Tier order:
 *   0. FTS5 keyword-ranked retrieval over curated memory text
 *   1. Optional vector retrieval when queryEmbedding is supplied and a vector store exists
 *   2. Legacy lexical fallback over memory_embeddings and source tables
 *
 * TRACE intentionally treats Tier 0 as keyword-ranked retrieval, not
 * semantic equivalence.
 */

import { queueForEmbedding as queueForEmbeddingDb } from './db.js';

const FTS_TABLE = 'memory_fts';
const INDEX_TEXT_CHAR_LIMIT = 2000;
const INDEX_TRUNCATION_MARKER = ' [...]';
const HIGH_SIGNAL_ACTION_TYPES = new Set(['BUG_FIX', 'DESIGN_CHANGE', 'REVIEW', 'FINDING']);
const FALLBACK_SCAN_LIMIT = 200;
const SAFE_IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Search project memory using the best available retrieval tier.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} queryText
 * @param {object} [options]
 * @param {string} [options.project_path]
 * @param {number} [options.limit=3]
 * @param {number} [options.maxTokens=500]
 * @param {Float32Array} [options.queryEmbedding]
 * @returns {Array<{text: string, distance: number|null, metadata: object|null}>}
 */
export function vecSearch(db, queryText, options = {}) {
    if (!db) return [];

    const limit = options.limit ?? 3;
    const maxTokens = options.maxTokens ?? 500;
    const projectPath = options.project_path ?? null;
    const queryEmbedding = options.queryEmbedding ?? null;

    try {
        const ftsResults = ftsSearch(db, queryText, projectPath, limit, maxTokens);
        if (ftsResults.length > 0) {
            return ftsResults;
        }
    } catch {
        // Fall through to vector / legacy tiers.
    }

    if (queryEmbedding) {
        try {
            const vectorResults = vectorQuery(db, queryEmbedding, projectPath, limit, maxTokens);
            if (vectorResults.length > 0) {
                return vectorResults;
            }
        } catch {
            // Fall through to legacy lexical fallback.
        }
    }

    return legacyTextFallback(db, queryText, projectPath, limit, maxTokens);
}

/**
 * Ensure the project-scoped FTS index exists and reflects canonical sources.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} projectPath
 * @returns {{ available: boolean, indexed: number }}
 */
export function refreshProjectRetrievalIndex(db, projectPath) {
    if (!db || !projectPath) return { available: false, indexed: 0 };
    if (!ensureMemoryFtsTable(db)) return { available: false, indexed: 0 };

    const docs = [
        ...collectNarrativeDocs(db, projectPath),
        ...collectHighSignalSpineDocs(db, projectPath),
    ];

    const tx = db.transaction(() => {
        db.prepare(`DELETE FROM ${FTS_TABLE} WHERE project_path = ?`).run(projectPath);
        const insert = db.prepare(`
            INSERT INTO ${FTS_TABLE}
                (text, source_key, source_type, source_id, session_id, project_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const doc of docs) {
            insert.run(
                doc.text,
                doc.source_key,
                doc.source_type,
                doc.source_id,
                doc.session_id,
                doc.project_path,
                doc.created_at,
            );
        }
    });

    tx();
    return { available: true, indexed: docs.length };
}

/**
 * Refresh the retrieval index only for one completed session.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} sessionId
 * @returns {{ available: boolean, indexed: number }}
 */
export function syncSessionRetrievalIndex(db, sessionId) {
    if (!db || !sessionId) return { available: false, indexed: 0 };
    if (!ensureMemoryFtsTable(db)) return { available: false, indexed: 0 };

    const docs = [
        ...collectNarrativeDocsForSession(db, sessionId),
        ...collectHighSignalSpineDocsForSession(db, sessionId),
    ];

    const tx = db.transaction(() => {
        db.prepare(`DELETE FROM ${FTS_TABLE} WHERE session_id = ?`).run(sessionId);
        const insert = db.prepare(`
            INSERT INTO ${FTS_TABLE}
                (text, source_key, source_type, source_id, session_id, project_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const doc of docs) {
            insert.run(
                doc.text,
                doc.source_key,
                doc.source_type,
                doc.source_id,
                doc.session_id,
                doc.project_path,
                doc.created_at,
            );
        }
    });

    tx();
    return { available: true, indexed: docs.length };
}

/**
 * Create the TRACE FTS5 table if the runtime supports it.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
export function ensureMemoryFtsTable(db) {
    if (!db) return false;
    try {
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS ${FTS_TABLE} USING fts5(
                text,
                source_key UNINDEXED,
                source_type UNINDEXED,
                source_id UNINDEXED,
                session_id UNINDEXED,
                project_path UNINDEXED,
                created_at UNINDEXED,
                tokenize = "porter unicode61 tokenchars '-_'"
            )
        `);
        return true;
    } catch {
        return false;
    }
}

/**
 * Best-effort creation of the sqlite-vec virtual table when the extension
 * is loaded on the current connection.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
export function ensureVecMemoriesTable(db) {
    if (!db) return false;
    try {
        db.exec(`
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
                embedding float[384],
                +text TEXT,
                +metadata TEXT,
                +project_path TEXT,
                +created_at TEXT
            )
        `);
        return true;
    } catch {
        return false;
    }
}

function vectorQuery(db, queryEmbedding, projectPath, limit, maxTokens) {
    const vecResults = vectorQueryVecTable(db, queryEmbedding, projectPath, limit, maxTokens);
    if (vecResults.length > 0) {
        return vecResults;
    }
    return vectorQueryFallbackTable(db, queryEmbedding, projectPath, limit, maxTokens);
}

function vectorQueryVecTable(db, embedding, projectPath, limit, maxTokens) {
    if (!isVecAvailable(db)) return [];

    const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
    const fetchLimit = projectPath ? limit * 3 : limit;

    const matchRows = db.prepare(
        `SELECT rowid, distance FROM vec_memories
         WHERE embedding MATCH ?
         ORDER BY distance
         LIMIT ?`
    ).all(buf, fetchLimit);

    if (matchRows.length === 0) {
        return [];
    }

    const placeholders = matchRows.map(() => '?').join(',');
    const auxRows = db.prepare(
        `SELECT rowid, text, metadata, project_path
         FROM vec_memories
         WHERE rowid IN (${placeholders})`
    ).all(...matchRows.map(row => row.rowid));

    const auxMap = new Map(auxRows.map(row => [row.rowid, row]));
    const results = [];
    let tokenBudget = maxTokens;

    for (const match of matchRows) {
        if (tokenBudget <= 0 || results.length >= limit) break;
        const aux = auxMap.get(match.rowid);
        if (!aux) continue;
        if (projectPath && aux.project_path !== projectPath) continue;

        const text = aux.text ?? '';
        const estimatedTokens = Math.ceil(text.length / 4);
        const metadata = safeJsonParse(aux.metadata);
        results.push({
            text,
            distance: match.distance,
            metadata: {
                ...(metadata || {}),
                retrieval_tier: 'vector',
                source: 'vec_memories',
            },
        });
        tokenBudget -= estimatedTokens;
    }

    return results;
}

function vectorQueryFallbackTable(db, queryEmbedding, projectPath, limit, maxTokens) {
    if (!tableHasRows(db, 'memory_embeddings')) return [];

    const rows = projectPath
        ? db.prepare(`
            SELECT id, text, embedding, metadata, project_path, created_at
            FROM memory_embeddings
            WHERE project_path = ?
            ORDER BY created_at DESC
            LIMIT ?
        `).all(projectPath, FALLBACK_SCAN_LIMIT)
        : db.prepare(`
            SELECT id, text, embedding, metadata, project_path, created_at
            FROM memory_embeddings
            ORDER BY created_at DESC
            LIMIT ?
        `).all(FALLBACK_SCAN_LIMIT);

    if (rows.length === 0) return [];

    const scored = [];
    for (const row of rows) {
        const candidate = blobToFloat32Array(row.embedding);
        if (!candidate) continue;
        const similarity = cosineSimilarity(queryEmbedding, candidate);
        scored.push({ row, similarity });
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    const results = [];
    let tokenBudget = maxTokens;

    for (const item of scored) {
        if (tokenBudget <= 0 || results.length >= limit) break;
        const text = item.row.text ?? '';
        const estimatedTokens = Math.ceil(text.length / 4);
        const metadata = safeJsonParse(item.row.metadata);
        results.push({
            text,
            distance: 1 - item.similarity,
            metadata: {
                ...(metadata || {}),
                retrieval_tier: 'vector-fallback',
                source: 'memory_embeddings',
                created_at: item.row.created_at,
            },
        });
        tokenBudget -= estimatedTokens;
    }

    return results;
}

function ftsSearch(db, queryText, projectPath, limit, maxTokens) {
    if (!ensureMemoryFtsTable(db)) return [];

    const query = buildFtsQuery(queryText);
    if (!query) return [];

    const fetchLimit = Math.max(limit * 3, limit);
    const rows = projectPath
        ? db.prepare(`
            SELECT
                text,
                source_key,
                source_type,
                source_id,
                session_id,
                project_path,
                created_at,
                bm25(${FTS_TABLE}) AS score
            FROM ${FTS_TABLE}
            WHERE ${FTS_TABLE} MATCH ? AND project_path = ?
            ORDER BY score ASC, created_at DESC
            LIMIT ?
        `).all(query, projectPath, fetchLimit)
        : db.prepare(`
            SELECT
                text,
                source_key,
                source_type,
                source_id,
                session_id,
                project_path,
                created_at,
                bm25(${FTS_TABLE}) AS score
            FROM ${FTS_TABLE}
            WHERE ${FTS_TABLE} MATCH ?
            ORDER BY score ASC, created_at DESC
            LIMIT ?
        `).all(query, fetchLimit);

    const results = [];
    let tokenBudget = maxTokens;
    for (const row of rows) {
        if (tokenBudget <= 0 || results.length >= limit) break;
        const text = row.text ?? '';
        const estimatedTokens = Math.ceil(text.length / 4);
        results.push({
            text,
            distance: null,
            metadata: {
                retrieval_tier: 'fts5',
                source_key: row.source_key,
                source_type: row.source_type,
                source_id: row.source_id,
                session_id: row.session_id,
                project_path: row.project_path,
                created_at: row.created_at,
                score: row.score,
            },
        });
        tokenBudget -= estimatedTokens;
    }

    return results;
}

function legacyTextFallback(db, queryText, projectPath, limit, maxTokens) {
    const keywords = extractKeywords(queryText);
    if (keywords.length === 0) return [];

    const seen = new Set();
    const results = [];
    let tokenBudget = maxTokens;

    function pushResult(text, metadata) {
        const normalized = normalizeWhitespace(text);
        if (!normalized || seen.has(normalized) || tokenBudget <= 0 || results.length >= limit) {
            return;
        }
        seen.add(normalized);
        results.push({
            text: normalized,
            distance: null,
            metadata,
        });
        tokenBudget -= Math.ceil(normalized.length / 4);
    }

    if (tableHasRows(db, 'memory_embeddings')) {
        try {
            const likeClause = keywords.map(() => 'text LIKE ?').join(' OR ');
            const params = keywords.map(keyword => `%${keyword}%`);
            if (projectPath) params.push(projectPath);
            params.push(limit);

            const sql = projectPath
                ? `SELECT text, metadata, created_at
                   FROM memory_embeddings
                   WHERE (${likeClause}) AND project_path = ?
                   ORDER BY created_at DESC
                   LIMIT ?`
                : `SELECT text, metadata, created_at
                   FROM memory_embeddings
                   WHERE (${likeClause})
                   ORDER BY created_at DESC
                   LIMIT ?`;

            const rows = db.prepare(sql).all(...params);
            for (const row of rows) {
                pushResult(row.text, {
                    ...(safeJsonParse(row.metadata) || {}),
                    retrieval_tier: 'memory_embeddings-like',
                    source: 'memory_embeddings',
                    created_at: row.created_at,
                });
            }
        } catch {
            // Keep falling through.
        }
    }

    if (results.length < limit) {
        try {
            const likeClause = keywords.map(() => 'narrative_summary LIKE ?').join(' OR ');
            const params = keywords.map(keyword => `%${keyword}%`);
            if (projectPath) params.push(projectPath);
            params.push(limit);

            const sql = projectPath
                ? `SELECT id, narrative_summary, ended_at
                   FROM sessions
                   WHERE (${likeClause})
                     AND project_path = ?
                     AND narrative_summary IS NOT NULL
                   ORDER BY ended_at DESC
                   LIMIT ?`
                : `SELECT id, narrative_summary, ended_at
                   FROM sessions
                   WHERE (${likeClause})
                     AND narrative_summary IS NOT NULL
                   ORDER BY ended_at DESC
                   LIMIT ?`;

            const rows = db.prepare(sql).all(...params);
            for (const row of rows) {
                pushResult(row.narrative_summary, {
                    retrieval_tier: 'legacy-like',
                    source: 'sessions.narrative_summary',
                    source_id: row.id,
                    created_at: row.ended_at,
                });
            }
        } catch {
            // Keep falling through.
        }
    }

    if (results.length < limit) {
        try {
            const likeClause = keywords.map(() => `(se.input_summary LIKE ? OR se.output_summary LIKE ?)`).join(' OR ');
            const params = [];
            for (const keyword of keywords) {
                params.push(`%${keyword}%`, `%${keyword}%`);
            }
            if (projectPath) params.push(projectPath);
            params.push(limit);

            const sql = projectPath
                ? `SELECT se.id, se.session_id, se.timestamp, se.action_type, se.gate_result,
                          se.input_summary, se.output_summary
                   FROM spine_entries se
                   JOIN sessions s ON s.id = se.session_id
                   WHERE (${likeClause})
                     AND s.project_path = ?
                     AND (
                         se.action_type IN ('BUG_FIX', 'DESIGN_CHANGE', 'REVIEW', 'FINDING')
                         OR (se.action_type = 'GATE_CHECK' AND se.gate_result IN ('WARN', 'FAIL'))
                     )
                   ORDER BY se.timestamp DESC
                   LIMIT ?`
                : `SELECT se.id, se.session_id, se.timestamp, se.action_type, se.gate_result,
                          se.input_summary, se.output_summary
                   FROM spine_entries se
                   WHERE (${likeClause})
                     AND (
                         se.action_type IN ('BUG_FIX', 'DESIGN_CHANGE', 'REVIEW', 'FINDING')
                         OR (se.action_type = 'GATE_CHECK' AND se.gate_result IN ('WARN', 'FAIL'))
                     )
                   ORDER BY se.timestamp DESC
                   LIMIT ?`;

            const rows = db.prepare(sql).all(...params);
            for (const row of rows) {
                pushResult(buildSpineIndexText(row), {
                    retrieval_tier: 'legacy-like',
                    source: 'spine_entries',
                    source_id: String(row.id),
                    session_id: row.session_id,
                    created_at: row.timestamp,
                });
            }
        } catch {
            // Nothing left to try.
        }
    }

    return results;
}

function collectNarrativeDocs(db, projectPath) {
    const rows = db.prepare(`
        SELECT id, project_path, ended_at, narrative_summary
        FROM sessions
        WHERE project_path = ?
          AND ended_at IS NOT NULL
          AND narrative_summary IS NOT NULL
          AND trim(narrative_summary) != ''
        ORDER BY ended_at DESC
    `).all(projectPath);

    return rows
        .map(row => ({
            text: truncateIndexText(row.narrative_summary),
            source_key: `session:${row.id}:narrative`,
            source_type: 'narrative_summary',
            source_id: row.id,
            session_id: row.id,
            project_path: row.project_path,
            created_at: row.ended_at,
        }))
        .filter(doc => doc.text);
}

function collectNarrativeDocsForSession(db, sessionId) {
    const row = db.prepare(`
        SELECT id, project_path, ended_at, narrative_summary
        FROM sessions
        WHERE id = ?
          AND ended_at IS NOT NULL
          AND narrative_summary IS NOT NULL
          AND trim(narrative_summary) != ''
    `).get(sessionId);

    if (!row) return [];

    return [{
        text: truncateIndexText(row.narrative_summary),
        source_key: `session:${row.id}:narrative`,
        source_type: 'narrative_summary',
        source_id: row.id,
        session_id: row.id,
        project_path: row.project_path,
        created_at: row.ended_at,
    }].filter(doc => doc.text);
}

function collectHighSignalSpineDocs(db, projectPath) {
    const rows = db.prepare(`
        SELECT
            se.id,
            se.session_id,
            se.timestamp,
            se.action_type,
            se.tool_name,
            se.input_summary,
            se.output_summary,
            se.gate_result,
            s.project_path
        FROM spine_entries se
        JOIN sessions s ON s.id = se.session_id
        WHERE s.project_path = ?
          AND (
              se.action_type IN ('BUG_FIX', 'DESIGN_CHANGE', 'REVIEW', 'FINDING')
              OR (se.action_type = 'GATE_CHECK' AND se.gate_result IN ('WARN', 'FAIL'))
          )
        ORDER BY se.timestamp DESC
    `).all(projectPath);

    return rows
        .map(row => ({
            text: truncateIndexText(buildSpineIndexText(row)),
            source_key: `spine:${row.id}`,
            source_type: 'spine_entry',
            source_id: String(row.id),
            session_id: row.session_id,
            project_path: row.project_path,
            created_at: row.timestamp,
        }))
        .filter(doc => doc.text);
}

function collectHighSignalSpineDocsForSession(db, sessionId) {
    const rows = db.prepare(`
        SELECT
            se.id,
            se.session_id,
            se.timestamp,
            se.action_type,
            se.tool_name,
            se.input_summary,
            se.output_summary,
            se.gate_result,
            s.project_path
        FROM spine_entries se
        JOIN sessions s ON s.id = se.session_id
        WHERE se.session_id = ?
          AND (
              se.action_type IN ('BUG_FIX', 'DESIGN_CHANGE', 'REVIEW', 'FINDING')
              OR (se.action_type = 'GATE_CHECK' AND se.gate_result IN ('WARN', 'FAIL'))
          )
        ORDER BY se.timestamp DESC
    `).all(sessionId);

    return rows
        .map(row => ({
            text: truncateIndexText(buildSpineIndexText(row)),
            source_key: `spine:${row.id}`,
            source_type: 'spine_entry',
            source_id: String(row.id),
            session_id: row.session_id,
            project_path: row.project_path,
            created_at: row.timestamp,
        }))
        .filter(doc => doc.text);
}

function buildSpineIndexText(row) {
    const parts = [`[${row.action_type}]`];
    if (row.tool_name) parts.push(`tool=${row.tool_name}`);
    if (row.gate_result) parts.push(`gate=${row.gate_result}`);
    if (row.input_summary) parts.push(`input=${row.input_summary}`);
    if (row.output_summary) parts.push(`output=${row.output_summary}`);
    return normalizeWhitespace(parts.join(' | '));
}

function buildFtsQuery(queryText) {
    const keywords = extractKeywords(queryText);
    if (keywords.length === 0) return '';
    return keywords.map(keyword => `"${escapeFtsToken(keyword)}"`).join(' OR ');
}

function extractKeywords(text) {
    const STOP_WORDS = new Set([
        'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
        'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has',
        'with', 'this', 'that', 'from', 'they', 'been', 'have',
        'its', 'will', 'each', 'make', 'than', 'them', 'into',
        'per', 'del', 'che', 'con', 'una', 'non', 'sono', 'come',
        'research', 'context', 'project'
    ]);

    return normalizeWhitespace(String(text || ''))
        .toLowerCase()
        .replace(/[^a-z0-9\s\-_]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= 2 && !STOP_WORDS.has(token));
}

function truncateIndexText(text) {
    const normalized = normalizeWhitespace(text);
    if (!normalized) return '';
    if (normalized.length <= INDEX_TEXT_CHAR_LIMIT) {
        return normalized;
    }
    return `${normalized.slice(0, INDEX_TEXT_CHAR_LIMIT - INDEX_TRUNCATION_MARKER.length)}${INDEX_TRUNCATION_MARKER}`;
}

function normalizeWhitespace(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
}

function escapeFtsToken(token) {
    return String(token || '').replace(/"/g, '""');
}

function isVecAvailable(db) {
    try {
        const row = db.prepare(
            `SELECT name FROM sqlite_master
             WHERE type = 'table' AND name = 'vec_memories'`
        ).get();
        if (!row) return false;
        db.prepare(`SELECT COUNT(*) AS cnt FROM vec_memories`).get();
        return true;
    } catch {
        return false;
    }
}

function tableHasRows(db, tableName) {
    if (!isSafeIdentifier(tableName)) return false;
    try {
        const row = db.prepare(`SELECT COUNT(*) AS cnt FROM ${tableName}`).get();
        return (row?.cnt ?? 0) > 0;
    } catch {
        return false;
    }
}

function blobToFloat32Array(blob) {
    if (!blob) return null;
    const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob);
    if (buf.byteLength % 4 !== 0) return null;
    return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return -1;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function safeJsonParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function isSafeIdentifier(value) {
    return SAFE_IDENTIFIER_RE.test(String(value || ''));
}

export {
    FTS_TABLE,
    INDEX_TEXT_CHAR_LIMIT,
    HIGH_SIGNAL_ACTION_TYPES,
    truncateIndexText,
    buildFtsQuery,
    extractKeywords,
    queueForEmbeddingDb as queueForEmbedding,
};
