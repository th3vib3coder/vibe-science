/**
 * Vibe Science TRACE — Minimal schema migration foundation
 *
 * Keeps DB upgrades explicit and idempotent without introducing a heavy
 * migration framework. Intended to be called from setup.js after schema.sql.
 *
 * Export: CURRENT_SCHEMA_VERSION, ensureMetaTable, getSchemaVersion,
 *         applyMigrations, columnExists, tableExists
 */

export const CURRENT_SCHEMA_VERSION = 4;

/**
 * Ensure the meta table exists.
 *
 * @param {import('better-sqlite3').Database} db
 */
export function ensureMetaTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);
}

/**
 * Check if a table exists in sqlite_master.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 * @returns {boolean}
 */
export function tableExists(db, tableName) {
    const row = db.prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`
    ).get(tableName);
    return !!row;
}

/**
 * Check if a column exists using PRAGMA table_info.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {string} tableName
 * @param {string} columnName
 * @returns {boolean}
 */
export function columnExists(db, tableName, columnName) {
    try {
        if (!isSafeIdentifier(tableName)) return false;
        const rows = db.prepare(`PRAGMA table_info(${tableName})`).all();
        return rows.some(row => row.name === columnName);
    } catch {
        return false;
    }
}

function isSafeIdentifier(value) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(String(value || ''));
}

/**
 * Read the current schema version from meta table.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {number}
 */
export function getSchemaVersion(db) {
    ensureMetaTable(db);
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get();
    if (!row) return 0;
    const parsed = Number.parseInt(String(row.value), 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Persist the current schema version after a successful logical step.
 *
 * @param {import('better-sqlite3').Database} db
 * @param {number} version
 */
function setSchemaVersion(db, version) {
    db.prepare(`
        INSERT INTO meta (key, value, updated_at)
        VALUES ('schema_version', ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
    `).run(String(version));
}

/**
 * Apply all pending schema steps in order.
 *
 * Step 1:
 *   - add source_claim_id to serendipity_seeds
 *   - create baseline citation_checks + indexes
 *
 * Step 2:
 *   - evolve citation_checks to TRACE shape
 *   - backfill legacy rows
 *   - replace legacy dedupe index with citation_id-based dedupe
 *
 * Step 3:
 *   - add session integrity tracking columns
 *
 * Step 4:
 *   - create TRACE FTS5 retrieval table
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {{ currentVersion: number, applied: number[], pending: number[] }}
 */
export function applyMigrations(db) {
    ensureMetaTable(db);

    const applied = [];
    let currentVersion = getSchemaVersion(db);

    const steps = [
        {
            version: 1,
            run() {
                if (tableExists(db, 'serendipity_seeds') && !columnExists(db, 'serendipity_seeds', 'source_claim_id')) {
                    db.exec(`ALTER TABLE serendipity_seeds ADD COLUMN source_claim_id TEXT`);
                }

                db.exec(`
                    CREATE TABLE IF NOT EXISTS citation_checks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        citation_id TEXT,
                        session_id TEXT,
                        citation_text TEXT NOT NULL,
                        citation_type TEXT NOT NULL,
                        normalized_id TEXT,
                        verification_status TEXT NOT NULL DEFAULT 'PENDING',
                        resolver TEXT,
                        source_url TEXT,
                        title TEXT,
                        resolved_payload TEXT,
                        http_status_code INTEGER,
                        checked_at TEXT,
                        created_at TEXT NOT NULL DEFAULT (datetime('now')),
                        FOREIGN KEY (session_id) REFERENCES sessions(id)
                    );
                    CREATE INDEX IF NOT EXISTS idx_citations_session ON citation_checks(session_id, created_at);
                    CREATE INDEX IF NOT EXISTS idx_citations_status ON citation_checks(verification_status);
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_dedupe
                    ON citation_checks(session_id, citation_type, normalized_id, citation_text);
                `);
            }
        },
        {
            version: 2,
            run() {
                ensureTraceCitationChecks(db);
            }
        },
        {
            version: 3,
            run() {
                ensureSessionIntegrityColumns(db);
            }
        },
        {
            version: 4,
            run() {
                ensureMemoryFtsTable(db);
            }
        }
    ];

    for (const step of steps) {
        if (currentVersion >= step.version) continue;

        const tx = db.transaction(() => {
            step.run();
            setSchemaVersion(db, step.version);
        });

        tx();
        applied.push(step.version);
        currentVersion = step.version;
    }

    const pending = steps
        .map(step => step.version)
        .filter(version => version > currentVersion);

    return { currentVersion, applied, pending };
}

function ensureTraceCitationChecks(db) {
    if (!tableExists(db, 'citation_checks')) {
        db.exec(`
            CREATE TABLE IF NOT EXISTS citation_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                citation_id TEXT NOT NULL,
                session_id TEXT,
                claim_id TEXT,
                raw_ref TEXT NOT NULL,
                citation_text TEXT,
                citation_type TEXT NOT NULL,
                normalized_id TEXT,
                doi TEXT,
                pmid TEXT,
                arxiv_id TEXT,
                verification_status TEXT NOT NULL DEFAULT 'PENDING',
                verification_method TEXT,
                resolver TEXT,
                source_url TEXT,
                resolved_title TEXT,
                title TEXT,
                resolved_source_type TEXT,
                retraction_status TEXT,
                resolved_payload TEXT,
                http_status INTEGER,
                http_status_code INTEGER,
                checked_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            );
        `);
    }

    const columnsToAdd = [
        ['citation_id', 'TEXT'],
        ['claim_id', 'TEXT'],
        ['raw_ref', 'TEXT'],
        ['doi', 'TEXT'],
        ['pmid', 'TEXT'],
        ['arxiv_id', 'TEXT'],
        ['verification_method', 'TEXT'],
        ['resolved_title', 'TEXT'],
        ['resolved_source_type', 'TEXT'],
        ['retraction_status', 'TEXT'],
        ['http_status', 'INTEGER'],
    ];

    for (const [columnName, columnType] of columnsToAdd) {
        if (!columnExists(db, 'citation_checks', columnName)) {
            db.exec(`ALTER TABLE citation_checks ADD COLUMN ${columnName} ${columnType}`);
        }
    }

    db.exec(`
        UPDATE citation_checks
        SET raw_ref = COALESCE(NULLIF(raw_ref, ''), citation_text)
        WHERE raw_ref IS NULL OR raw_ref = '';

        UPDATE citation_checks
        SET citation_text = COALESCE(NULLIF(citation_text, ''), raw_ref)
        WHERE citation_text IS NULL OR citation_text = '';

        UPDATE citation_checks
        SET resolved_title = COALESCE(NULLIF(resolved_title, ''), title)
        WHERE resolved_title IS NULL OR resolved_title = '';

        UPDATE citation_checks
        SET title = COALESCE(NULLIF(title, ''), resolved_title)
        WHERE title IS NULL OR title = '';

        UPDATE citation_checks
        SET http_status = COALESCE(http_status, http_status_code)
        WHERE http_status IS NULL AND http_status_code IS NOT NULL;

        UPDATE citation_checks
        SET http_status_code = COALESCE(http_status_code, http_status)
        WHERE http_status_code IS NULL AND http_status IS NOT NULL;

        UPDATE citation_checks
        SET citation_id = printf('CIT-LEGACY-%08d', id)
        WHERE citation_id IS NULL OR citation_id = '';
    `);

    db.exec(`
        DROP INDEX IF EXISTS idx_citations_dedupe;
        CREATE INDEX IF NOT EXISTS idx_citations_session ON citation_checks(session_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_citations_status ON citation_checks(verification_status);
        CREATE INDEX IF NOT EXISTS idx_citations_claim ON citation_checks(claim_id, verification_status);
        CREATE INDEX IF NOT EXISTS idx_citations_lookup ON citation_checks(citation_type, normalized_id);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_citations_dedupe ON citation_checks(citation_id);
    `);
}

function ensureSessionIntegrityColumns(db) {
    const columnsToAdd = [
        ['integrity_status', `TEXT NOT NULL DEFAULT 'INTEGRITY_OK'`],
        ['integrity_notes', 'TEXT'],
    ];

    for (const [columnName, columnType] of columnsToAdd) {
        if (!columnExists(db, 'sessions', columnName)) {
            db.exec(`ALTER TABLE sessions ADD COLUMN ${columnName} ${columnType}`);
        }
    }

    db.exec(`
        UPDATE sessions
        SET integrity_status = COALESCE(NULLIF(integrity_status, ''), 'INTEGRITY_OK')
        WHERE integrity_status IS NULL OR integrity_status = '';
    `);
}

function ensureMemoryFtsTable(db) {
    db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
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
}
