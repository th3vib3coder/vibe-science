#!/usr/bin/env node

/**
 * Vibe Science v6.0 NEXUS -- Embedding Worker Daemon
 *
 * Lightweight background process that polls the embed_queue table for
 * pending entries, generates embedding vectors, and inserts them into
 * vec_memories (when sqlite-vec is available) or a fallback
 * memory_embeddings table.
 *
 * Runnable as:
 *   node plugin/scripts/worker-embed.js
 *   bun  plugin/scripts/worker-embed.js
 *
 * Blueprint Section 4.4 / T-11.
 *
 * Embedding strategy:
 *   Currently uses a deterministic hash-based placeholder embedding.
 *   This produces consistent 384-dimensional vectors suitable for
 *   basic similarity search but NOT semantically meaningful.
 *   Replace simpleEmbedding() with a real model (e.g. all-MiniLM-L6-v2
 *   via HTTP API or Python subprocess) for production quality.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// =====================================================
// Configuration
// =====================================================

const POLL_INTERVAL_MS = 5_000;     // 5 seconds between polls
const BATCH_SIZE = 10;              // max entries per processing cycle
const EMBEDDING_DIMS = 384;         // all-MiniLM-L6-v2 dimension
const DB_RETRY_INTERVAL_MS = 10_000; // wait 10s if DB doesn't exist yet

const GLOBAL_DIR = path.join(os.homedir(), '.vibe-science');
const DB_DIR = path.join(GLOBAL_DIR, 'db');
const DB_PATH = path.join(DB_DIR, 'vibe-science.db');
const LOG_DIR = path.join(GLOBAL_DIR, 'logs');
const LOG_PATH = path.join(LOG_DIR, 'worker.log');
const SCHEMA_PATH = path.join(
    import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
    '..', 'db', 'schema.sql'
);

// =====================================================
// Logging
// =====================================================

/**
 * Append a timestamped log line to the worker log file.
 * Also prints to stderr so the process manager can capture it.
 *
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 */
function log(level, message) {
    const ts = new Date().toISOString();
    const line = `[${ts}] [${level}] ${message}\n`;

    // Ensure log directory exists
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    try {
        fs.appendFileSync(LOG_PATH, line);
    } catch {
        // If we can't write the log file, at least write to stderr
    }

    process.stderr.write(line);
}

// =====================================================
// Placeholder embedding function
// =====================================================

/**
 * Generate a simple deterministic embedding based on character hashing.
 * NOT a real semantic embedding -- placeholder until a proper model
 * (all-MiniLM-L6-v2 or similar) is integrated.
 *
 * The output is a normalized Float32Array of the specified dimensionality.
 *
 * @param {string} text - The text to embed
 * @param {number} [dims=384] - Embedding dimensionality
 * @returns {Float32Array} Normalized embedding vector
 */
function simpleEmbedding(text, dims = EMBEDDING_DIMS) {
    const embedding = new Float32Array(dims);

    for (let i = 0; i < text.length; i++) {
        embedding[i % dims] += text.charCodeAt(i) / 255;
    }

    // L2-normalize
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
        for (let i = 0; i < dims; i++) {
            embedding[i] = embedding[i] / norm;
        }
    }

    return embedding;
}

// =====================================================
// Database helpers
// =====================================================

/**
 * Attempt to open the database.
 * Returns the db instance or null if it doesn't exist yet.
 *
 * @returns {import('better-sqlite3').Database|null}
 */
function tryOpenDB() {
    if (!fs.existsSync(DB_PATH)) {
        return null;
    }

    try {
        const db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        // Ensure schema is initialized (safe to call multiple times)
        if (fs.existsSync(SCHEMA_PATH)) {
            const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
        }

        // Ensure the fallback memory_embeddings table exists
        // (used when sqlite-vec extension is not loaded)
        ensureFallbackTable(db);

        return db;
    } catch (err) {
        log('ERROR', `Failed to open database: ${err.message}`);
        return null;
    }
}

/**
 * Create a fallback memory_embeddings table for storing embeddings
 * when the sqlite-vec extension (vec_memories) is not available.
 *
 * @param {import('better-sqlite3').Database} db
 */
function ensureFallbackTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS memory_embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            embedding BLOB NOT NULL,
            metadata TEXT,
            project_path TEXT,
            created_at TEXT NOT NULL
        )
    `);
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_membed_project
        ON memory_embeddings(project_path, created_at)
    `);
}

/**
 * Check whether the vec_memories virtual table (sqlite-vec) exists.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {boolean}
 */
function isVecAvailable(db) {
    try {
        const row = db.prepare(
            `SELECT name FROM sqlite_master
             WHERE type = 'table' AND name = 'vec_memories'`
        ).get();
        return !!row;
    } catch {
        return false;
    }
}

// =====================================================
// Core processing
// =====================================================

/**
 * Fetch a batch of pending entries from embed_queue.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {object[]}
 */
function fetchPending(db) {
    return db.prepare(
        `SELECT id, text, metadata, created_at
         FROM embed_queue
         WHERE processed = 0
         ORDER BY created_at ASC
         LIMIT ?`
    ).all(BATCH_SIZE);
}

/**
 * Process a single embed_queue entry:
 *   1. Compute embedding vector
 *   2. Insert into vec_memories (or fallback table)
 *   3. Mark the queue entry as processed
 *
 * @param {import('better-sqlite3').Database} db
 * @param {object} entry - Row from embed_queue
 * @param {boolean} useVec - Whether vec_memories is available
 */
function processEntry(db, entry, useVec) {
    const embedding = simpleEmbedding(entry.text);
    const embeddingBuf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);

    // Extract project_path from metadata if available
    let projectPath = null;
    if (entry.metadata) {
        try {
            const meta = JSON.parse(entry.metadata);
            projectPath = meta.project_path ?? null;
        } catch { /* ignore malformed metadata */ }
    }

    if (useVec) {
        // Insert into sqlite-vec virtual table
        db.prepare(
            `INSERT INTO vec_memories (embedding, text, metadata, project_path, created_at)
             VALUES (?, ?, ?, ?, ?)`
        ).run(embeddingBuf, entry.text, entry.metadata, projectPath, entry.created_at);
    } else {
        // Fallback: insert into regular table
        db.prepare(
            `INSERT INTO memory_embeddings (text, embedding, metadata, project_path, created_at)
             VALUES (?, ?, ?, ?, ?)`
        ).run(entry.text, embeddingBuf, entry.metadata, projectPath, entry.created_at);
    }

    // Mark as processed
    db.prepare(
        `UPDATE embed_queue SET processed = 1 WHERE id = ?`
    ).run(entry.id);
}

/**
 * Process one batch of pending entries.
 * Returns the number of entries processed.
 *
 * @param {import('better-sqlite3').Database} db
 * @returns {number}
 */
function processBatch(db) {
    const pending = fetchPending(db);
    if (pending.length === 0) {
        return 0;
    }

    const useVec = isVecAvailable(db);

    // Use a transaction for the entire batch (atomicity + performance)
    const processAll = db.transaction(() => {
        let processed = 0;
        for (const entry of pending) {
            try {
                processEntry(db, entry, useVec);
                processed++;
            } catch (err) {
                log('WARN', `Failed to process embed_queue entry ${entry.id}: ${err.message}`);
                // Mark as processed anyway to avoid infinite retry loops.
                // A more sophisticated system would use a retry counter.
                try {
                    db.prepare(
                        `UPDATE embed_queue SET processed = -1 WHERE id = ?`
                    ).run(entry.id);
                } catch { /* ignore */ }
            }
        }
        return processed;
    });

    const count = processAll();
    if (count > 0) {
        const target = useVec ? 'vec_memories' : 'memory_embeddings';
        log('INFO', `Processed ${count}/${pending.length} entries -> ${target}`);
    }
    return count;
}

// =====================================================
// Main loop
// =====================================================

let db = null;
let pollTimer = null;
let running = true;

/**
 * One iteration of the poll loop.
 * Opens the DB if needed, processes a batch, schedules next iteration.
 */
function tick() {
    if (!running) return;

    // Try to open DB if we don't have a connection
    if (!db) {
        db = tryOpenDB();
        if (!db) {
            log('INFO', `Database not found at ${DB_PATH}; retrying in ${DB_RETRY_INTERVAL_MS / 1000}s...`);
            pollTimer = setTimeout(tick, DB_RETRY_INTERVAL_MS);
            return;
        }
        log('INFO', `Database opened: ${DB_PATH}`);
    }

    try {
        processBatch(db);
    } catch (err) {
        log('ERROR', `Batch processing error: ${err.message}`);

        // If the error is a DB-level issue, close and retry
        if (err.message.includes('database') || err.message.includes('SQLITE')) {
            try { db.close(); } catch { /* ignore */ }
            db = null;
        }
    }

    // Schedule next tick
    if (running) {
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    }
}

/**
 * Graceful shutdown: close DB, clear timer, exit.
 */
function shutdown(signal) {
    log('INFO', `Received ${signal}; shutting down...`);
    running = false;

    if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
    }

    if (db) {
        try {
            db.close();
            log('INFO', 'Database connection closed.');
        } catch (err) {
            log('ERROR', `Error closing database: ${err.message}`);
        }
        db = null;
    }

    process.exit(0);
}

// =====================================================
// Startup
// =====================================================

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors so the daemon doesn't crash silently
process.on('uncaughtException', (err) => {
    log('ERROR', `Uncaught exception: ${err.message}`);
    // Don't exit -- keep running. The next tick will retry.
});

process.on('unhandledRejection', (reason) => {
    log('ERROR', `Unhandled rejection: ${reason}`);
});

log('INFO', '=== Vibe Science v6.0 NEXUS Embedding Worker started ===');
log('INFO', `DB path:   ${DB_PATH}`);
log('INFO', `Log path:  ${LOG_PATH}`);
log('INFO', `Poll interval: ${POLL_INTERVAL_MS}ms | Batch size: ${BATCH_SIZE} | Dims: ${EMBEDDING_DIMS}`);

// Start the polling loop
tick();
