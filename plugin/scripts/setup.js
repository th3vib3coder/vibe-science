#!/usr/bin/env node
/**
 * Vibe Science v7.0 TRACE -- Setup Hook
 *
 * Runs once on first install and on every update.
 * Blueprint Section 4.0
 *
 * Responsibilities:
 *   1. Create ~/.vibe-science/ directory tree (db/, logs/, embeddings/)
 *   2. Initialize SQLite database with schema.sql
 *   3. Apply minimal schema migrations for existing DBs
 *   4. Check for Bun runtime (optional -- only needed for embedding worker)
 *   5. Report success via stdout JSON
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { applyMigrations, CURRENT_SCHEMA_VERSION } from '../lib/migrations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GLOBAL_DIR = join(homedir(), '.vibe-science');
const SUBDIRS = ['db', 'logs', 'embeddings'];
const DB_PATH = join(GLOBAL_DIR, 'db', 'vibe-science.db');
const SCHEMA_PATH = join(__dirname, '..', 'db', 'schema.sql');
const IS_WINDOWS = process.platform === 'win32';
const PKG_PATH = join(__dirname, '..', '..', 'package.json');
const MARKER_PATH = join(GLOBAL_DIR, '.install-marker');
const PID_PATH = join(GLOBAL_DIR, 'worker.pid');
const WORKER_PATH = join(__dirname, 'worker-embed.js');

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
        const whichCmd = IS_WINDOWS ? 'where' : 'which';
        execSync(`${whichCmd} ${cmd}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Detect Bun runtime: check PATH first, then platform-specific fallback paths.
 * @returns {string|null} Path to bun binary, or null if not found
 */
function detectBun() {
    // 1. Check PATH
    if (commandExists('bun')) return 'bun';

    // 2. Platform-specific fallback paths
    const fallbackPaths = IS_WINDOWS
        ? [join(homedir(), '.bun', 'bin', 'bun.exe')]
        : [join(homedir(), '.bun', 'bin', 'bun'), '/usr/local/bin/bun'];

    for (const p of fallbackPaths) {
        if (existsSync(p)) return p;
    }

    return null;
}

/**
 * Check whether the installed dependencies match the current marker.
 * Marker format: "nodeVersion-pkgVersion"
 * @returns {{ needsInstall: boolean, reason: string }}
 */
function checkDepsMarker() {
    const nodeVersion = process.versions.node;
    let pkgVersion = '0.0.0';
    try {
        const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
        pkgVersion = pkg.version || '0.0.0';
    } catch { /* ignore */ }

    const expectedMarker = `${nodeVersion}-${pkgVersion}`;
    const nodeModulesPath = join(__dirname, '..', '..', 'node_modules');

    if (!existsSync(nodeModulesPath)) {
        return { needsInstall: true, reason: 'node_modules missing' };
    }

    if (!existsSync(MARKER_PATH)) {
        return { needsInstall: true, reason: 'install marker missing' };
    }

    try {
        const currentMarker = readFileSync(MARKER_PATH, 'utf-8').trim();
        if (currentMarker !== expectedMarker) {
            return { needsInstall: true, reason: `marker mismatch: ${currentMarker} != ${expectedMarker}` };
        }
    } catch {
        return { needsInstall: true, reason: 'cannot read marker' };
    }

    return { needsInstall: false, reason: 'up to date' };
}

/**
 * Install production dependencies using npm or bun.
 * @param {string|null} bunPath - Path to bun binary or null
 * @returns {{ success: boolean, method: string, error?: string }}
 */
function installDeps(bunPath) {
    const projectRoot = join(__dirname, '..', '..');
    try {
        if (bunPath) {
            execSync(`${bunPath} install --production`, { cwd: projectRoot, stdio: 'pipe', timeout: 120_000 });
            return { success: true, method: 'bun' };
        } else {
            execSync('npm install --omit=dev', { cwd: projectRoot, stdio: 'pipe', timeout: 120_000 });
            return { success: true, method: 'npm' };
        }
    } catch (err) {
        return { success: false, method: bunPath ? 'bun' : 'npm', error: err.message };
    }
}

/**
 * Write the install marker after successful dependency installation.
 */
function writeInstallMarker() {
    const nodeVersion = process.versions.node;
    let pkgVersion = '0.0.0';
    try {
        const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
        pkgVersion = pkg.version || '0.0.0';
    } catch { /* ignore */ }

    writeFileSync(MARKER_PATH, `${nodeVersion}-${pkgVersion}`, 'utf-8');
}

/**
 * Check if the worker process is running by its PID file.
 * @returns {{ running: boolean, pid: number|null }}
 */
function checkWorkerPid() {
    if (!existsSync(PID_PATH)) return { running: false, pid: null };

    try {
        const pid = parseInt(readFileSync(PID_PATH, 'utf-8').trim(), 10);
        if (isNaN(pid)) return { running: false, pid: null };

        // Check if process is alive
        process.kill(pid, 0); // signal 0 = just check existence
        return { running: true, pid };
    } catch {
        // Process not running or PID stale
        return { running: false, pid: null };
    }
}

/**
 * Spawn the embedding worker as a detached daemon.
 * @returns {{ pid: number|null, error?: string }}
 */
function spawnWorker() {
    try {
        const child = spawn(process.execPath, [WORKER_PATH], {
            detached: true,
            stdio: 'ignore',
            cwd: join(__dirname, '..', '..'),
        });
        child.unref();

        const pid = child.pid;
        if (pid) {
            writeFileSync(PID_PATH, String(pid), 'utf-8');
        }
        return { pid: pid || null };
    } catch (err) {
        return { pid: null, error: err.message };
    }
}

function ensureVecMemoriesTable(db) {
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(_event) {
    const warnings = [];
    const created = [];

    // ---- 0. Node.js version check -------------------------------------------
    const nodeVersion = parseInt(process.versions.node, 10);
    if (nodeVersion < 18) {
        warnings.push(
            `Node.js ${process.versions.node} detected — v18+ is required. ` +
            'Some features (ES modules, fetch) may not work correctly.'
        );
    }

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
    let schemaVersion = 0;
    let migrationsApplied = [];

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

            try {
                const migrationResult = applyMigrations(db);
                schemaVersion = migrationResult.currentVersion;
                migrationsApplied = migrationResult.applied;
            } catch (err) {
                warnings.push(`Schema migrations failed: ${err.message}. DB may remain in baseline mode.`);
            }
        }

        // Try to load sqlite-vec extension (optional -- needed for vector search)
        let vecAvailable = false;
        let vecExtensionLoaded = false;
        try {
            db.loadExtension('vec0');
            vecExtensionLoaded = true;
            vecAvailable = ensureVecMemoriesTable(db);
        } catch {
            try {
                db.loadExtension('sqlite-vec');
                vecExtensionLoaded = true;
                vecAvailable = ensureVecMemoriesTable(db);
            } catch {
                warnings.push(
                    'sqlite-vec extension not available. TRACE retrieval will use FTS5 Tier 0 and memory_embeddings fallback. ' +
                    'Install sqlite-vec for full semantic recall.'
                );
            }
        }

        if (vecExtensionLoaded && !vecAvailable) {
            warnings.push('vec_memories was not created on this runtime. TRACE retrieval will use FTS5 Tier 0 and memory_embeddings fallback.');
        }

        db.close();
        dbReady = true;
    } catch (err) {
        warnings.push(`Database initialization failed: ${err.message}. Hooks will degrade gracefully.`);
    }

    // ---- 3. Detect Bun runtime -----------------------------------------------
    const bunPath = detectBun();
    if (!bunPath) {
        warnings.push(
            'Bun runtime not found. The embedding worker will use Node.js instead. ' +
            'Install Bun (https://bun.sh) for faster startup.'
        );
    }

    // ---- 4. Dependency install (smart, with marker) --------------------------
    let depsInstalled = false;
    const depsCheck = checkDepsMarker();

    if (depsCheck.needsInstall) {
        const installResult = installDeps(bunPath);
        if (installResult.success) {
            writeInstallMarker();
            depsInstalled = true;
        } else {
            warnings.push(`Dependency install failed (${installResult.method}): ${installResult.error}`);
        }
    } else {
        depsInstalled = true; // already up to date
    }

    // ---- 5. Worker daemon launch ---------------------------------------------
    let workerPid = null;
    let workerStatus = 'not_started';

    const pidCheck = checkWorkerPid();
    if (pidCheck.running) {
        workerPid = pidCheck.pid;
        workerStatus = 'already_running';
    } else {
        const spawnResult = spawnWorker();
        if (spawnResult.pid) {
            workerPid = spawnResult.pid;
            workerStatus = 'launched';
        } else {
            workerStatus = 'launch_failed';
            if (spawnResult.error) {
                warnings.push(`Worker launch failed: ${spawnResult.error}`);
            }
        }
    }

    // ---- 6. Return result ---------------------------------------------------
    return {
        status: dbReady ? 'ready' : 'degraded',
        db_path: dbPath,
        schema_applied: schemaApplied,
        schema_version: schemaVersion,
        target_schema_version: CURRENT_SCHEMA_VERSION,
        migrations_applied: migrationsApplied,
        bun_available: !!bunPath,
        directories_created: created,
        warnings,
        version: '7.0.0',
        worker_pid: workerPid,
        worker_status: workerStatus,
        deps_installed: depsInstalled,
        node_version: process.versions.node,
        model_status: 'lazy_load',
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
                version: '7.0.0',
            };
            process.stdout.write(JSON.stringify(fallback));
            process.exit(0);  // exit 0 even on error -- setup failure should not block the plugin
        });
});
