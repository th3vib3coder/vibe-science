#!/usr/bin/env node
/**
 * Vibe Science v6.0 NEXUS -- Setup Hook
 *
 * Runs once on first install and on every update.
 * Blueprint Section 4.0
 *
 * Responsibilities:
 *   1. Create ~/.vibe-science/ directory tree (db/, logs/, embeddings/)
 *   2. Initialize SQLite database with schema.sql
 *   3. Check for Bun runtime (optional -- only needed for embedding worker)
 *   4. Report success via stdout JSON
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLOBAL_DIR = join(homedir(), '.vibe-science');
const SUBDIRS = ['db', 'logs', 'embeddings'];
const DB_PATH = join(GLOBAL_DIR, 'db', 'vibe-science.db');
const SCHEMA_PATH = join(__dirname, '..', 'db', 'schema.sql');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Ensure a directory exists, creating it (and parents) if necessary.
 * Returns true if the directory was created, false if it already existed.
 */
function ensureDir(dirPath) {
    if (existsSync(dirPath)) return false;
    mkdirSync(dirPath, { recursive: true });
    return true;
}

/**
 * Check whether a command is available on the system PATH.
 */
function commandExists(cmd) {
    try {
        // Use 'where' on Windows, 'which' on Unix
        const whichCmd = process.platform === 'win32' ? 'where' : 'which';
        execSync(`${whichCmd} ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(_event) {
    const warnings = [];
    const created = [];

    // ---- 1. Create directory tree -------------------------------------------
    const globalCreated = ensureDir(GLOBAL_DIR);
    if (globalCreated) created.push(GLOBAL_DIR);

    for (const sub of SUBDIRS) {
        const subPath = join(GLOBAL_DIR, sub);
        if (ensureDir(subPath)) {
            created.push(subPath);
        }
    }

    // ---- 2. Initialize database ---------------------------------------------
    let dbReady = false;
    let dbPath = DB_PATH;
    let schemaApplied = false;

    try {
        // Dynamic import so we get a clear error if better-sqlite3 is missing
        const { default: Database } = await import('better-sqlite3');

        const db = new Database(DB_PATH);

        // Enable WAL for concurrent reads
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        // Apply schema
        if (!existsSync(SCHEMA_PATH)) {
            warnings.push(`Schema file not found at ${SCHEMA_PATH} -- database tables not created.`);
        } else {
            const schema = readFileSync(SCHEMA_PATH, 'utf-8');
            db.exec(schema);
            schemaApplied = true;
        }

        // Try to load sqlite-vec extension (optional -- needed for vector search)
        try {
            db.loadExtension('vec0');
        } catch {
            try {
                db.loadExtension('sqlite-vec');
            } catch {
                warnings.push(
                    'sqlite-vec extension not available. Vector search will use fallback (keyword match). ' +
                    'Install sqlite-vec for full semantic recall.'
                );
            }
        }

        db.close();
        dbReady = true;
    } catch (err) {
        warnings.push(`Database initialization failed: ${err.message}. Hooks will degrade gracefully.`);
    }

    // ---- 3. Check Bun availability ------------------------------------------
    let bunAvailable = false;
    try {
        bunAvailable = commandExists('bun');
    } catch {
        // Ignore -- bun check is best-effort
    }
    if (!bunAvailable) {
        warnings.push(
            'Bun runtime not found. The embedding worker requires Bun for async embedding processing. ' +
            'Install Bun (https://bun.sh) if you want semantic search capabilities.'
        );
    }

    // ---- 4. Return result ---------------------------------------------------
    return {
        status: dbReady ? 'ready' : 'degraded',
        db_path: dbPath,
        schema_applied: schemaApplied,
        bun_available: bunAvailable,
        directories_created: created,
        warnings,
        version: '6.0.0',
    };
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
        // If stdin is empty or malformed, proceed with empty event
    }

    main(event)
        .then(result => {
            process.stdout.write(JSON.stringify(result));
            process.exit(0);
        })
        .catch(err => {
            // Setup should never hard-fail -- always return a result
            const fallback = {
                status: 'error',
                error: err.message,
                warnings: [`Setup encountered an unexpected error: ${err.message}`],
                version: '6.0.0',
            };
            process.stdout.write(JSON.stringify(fallback));
            process.exit(0);  // exit 0 even on error -- setup failure should not block the plugin
        });
});
