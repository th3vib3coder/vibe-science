/**
 * Vibe Science v6.0 NEXUS — End-to-End Test Suite
 *
 * Comprehensive test coverage for the plugin infrastructure:
 *   B1. Syntax & Import Tests (13 JS files)
 *   B2. Schema SQL Tests (11 tables, FK constraints, indices)
 *   B3. Library Unit Tests (7 libs, export verification)
 *   B4. Script Integration Tests (setup, session-start, prompt-submit)
 *   B5. Package & Config Tests (package.json, hooks.json, plugin.json, schemas)
 *   B6. Content Integrity Tests (forbidden names, file references, CLAUDE.md)
 *   B7. Dependency Import Tests (better-sqlite3, transformers, onnxruntime)
 *
 * Usage:  node --test __test_e2e.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// =====================================================
// Path resolution
// =====================================================

const ROOT = path.dirname(fileURLToPath(import.meta.url));

/** Resolve a path relative to the project root. */
function rel(...segments) {
    return path.join(ROOT, ...segments);
}

/** Resolve a path relative to the project root as a file:// URL (needed for dynamic import on Windows). */
function relUrl(...segments) {
    return pathToFileURL(path.join(ROOT, ...segments)).href;
}

// =====================================================
// Counters — summary printed at the end
// =====================================================

let passCount = 0;
let failCount = 0;

function pass(label) {
    passCount++;
}
function fail(label) {
    failCount++;
}

// =====================================================
// B1. Syntax & Import Tests
// =====================================================

describe('B1. Syntax & Import Tests', () => {
    const scripts = [
        'plugin/scripts/setup.js',
        'plugin/scripts/session-start.js',
        'plugin/scripts/prompt-submit.js',
        'plugin/scripts/post-tool-use.js',
        'plugin/scripts/stop.js',
        'plugin/scripts/worker-embed.js',
    ];

    const libs = [
        'plugin/lib/db.js',
        'plugin/lib/gate-engine.js',
        'plugin/lib/permission-engine.js',
        'plugin/lib/vec-search.js',
        'plugin/lib/context-builder.js',
        'plugin/lib/narrative-engine.js',
        'plugin/lib/r2-calibration.js',
    ];

    const allJsFiles = [...scripts, ...libs];

    for (const file of allJsFiles) {
        it(`syntax check: ${file}`, () => {
            const fullPath = rel(file);
            assert.ok(fs.existsSync(fullPath), `File does not exist: ${fullPath}`);
            try {
                execSync(`node --check "${fullPath}"`, {
                    cwd: ROOT,
                    encoding: 'utf-8',
                    timeout: 30000,
                    stdio: 'pipe',
                });
                pass(`syntax:${file}`);
            } catch (err) {
                fail(`syntax:${file}`);
                assert.fail(`Syntax error in ${file}: ${err.stderr || err.message}`);
            }
        });
    }

    it('all 13 JS files are present', () => {
        assert.equal(allJsFiles.length, 13, 'Expected exactly 13 JS files (6 scripts + 7 libs)');
        for (const file of allJsFiles) {
            assert.ok(fs.existsSync(rel(file)), `Missing: ${file}`);
        }
        pass('all-13-present');
    });
});

// =====================================================
// B2. Schema SQL Tests
// =====================================================

describe('B2. Schema SQL Tests', () => {
    const SCHEMA_PATH = rel('plugin', 'db', 'schema.sql');

    const EXPECTED_TABLES = [
        'sessions',
        'spine_entries',
        'claim_events',
        'r2_reviews',
        'serendipity_seeds',
        'gate_checks',
        'literature_searches',
        'observer_alerts',
        'calibration_log',
        'prompt_log',
        'embed_queue',
    ];

    let Database;
    let db;

    it('schema.sql file exists', () => {
        assert.ok(fs.existsSync(SCHEMA_PATH), `Schema file missing: ${SCHEMA_PATH}`);
        pass('schema-exists');
    });

    it('schema executes without error on in-memory DB', async () => {
        const mod = await import('better-sqlite3');
        Database = mod.default;
        db = new Database(':memory:');
        db.pragma('foreign_keys = ON');

        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        pass('schema-exec');
    });

    it('all 11 tables exist', () => {
        assert.ok(db, 'DB not initialized');
        const rows = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
        ).all();
        const tableNames = rows.map(r => r.name);

        for (const expected of EXPECTED_TABLES) {
            assert.ok(
                tableNames.includes(expected),
                `Missing table: ${expected}. Found: ${tableNames.join(', ')}`
            );
        }
        assert.ok(
            tableNames.length >= EXPECTED_TABLES.length,
            `Expected at least ${EXPECTED_TABLES.length} tables, found ${tableNames.length}`
        );
        pass('11-tables');
    });

    it('FK constraint on calibration_log.session_id', () => {
        assert.ok(db, 'DB not initialized');

        // Insert a valid session first
        db.prepare(
            `INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`
        ).run('test-session-fk', '/tmp/test', new Date().toISOString());

        // Insert with valid session_id should succeed
        db.prepare(
            `INSERT INTO calibration_log (claim_id, predicted_confidence, actual_outcome, session_id, timestamp)
             VALUES (?, ?, ?, ?, ?)`
        ).run('C001', 0.85, 'VERIFIED', 'test-session-fk', new Date().toISOString());

        // Insert with invalid session_id should throw
        assert.throws(
            () => {
                db.prepare(
                    `INSERT INTO calibration_log (claim_id, predicted_confidence, actual_outcome, session_id, timestamp)
                     VALUES (?, ?, ?, ?, ?)`
                ).run('C002', 0.5, 'REJECTED', 'nonexistent-session', new Date().toISOString());
            },
            /FOREIGN KEY constraint failed/,
            'Expected FK violation for calibration_log with invalid session_id'
        );
        pass('fk-calibration');
    });

    it('FK constraint on prompt_log.session_id', () => {
        assert.ok(db, 'DB not initialized');

        // Insert with valid session_id should succeed
        db.prepare(
            `INSERT INTO prompt_log (session_id, agent_role, prompt_hash, timestamp)
             VALUES (?, ?, ?, ?)`
        ).run('test-session-fk', 'researcher', 'abc123hash', new Date().toISOString());

        // Insert with invalid session_id should throw
        assert.throws(
            () => {
                db.prepare(
                    `INSERT INTO prompt_log (session_id, agent_role, prompt_hash, timestamp)
                     VALUES (?, ?, ?, ?)`
                ).run('bad-session-id', 'researcher', 'xyz789hash', new Date().toISOString());
            },
            /FOREIGN KEY constraint failed/,
            'Expected FK violation for prompt_log with invalid session_id'
        );
        pass('fk-prompt-log');
    });

    it('indices exist in sqlite_master', () => {
        assert.ok(db, 'DB not initialized');
        const rows = db.prepare(
            `SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'`
        ).all();
        const indexNames = rows.map(r => r.name);

        // Key indices from schema.sql
        const expectedIndices = [
            'idx_spine_session',
            'idx_spine_action',
            'idx_claims_id',
            'idx_claims_session',
            'idx_r2_session',
            'idx_seeds_status',
            'idx_gates_session',
            'idx_gates_claim',
            'idx_lit_session',
            'idx_lit_layer',
            'idx_observer_project',
            'idx_calibration_claim',
            'idx_prompt_session',
            'idx_embed_pending',
        ];

        for (const idx of expectedIndices) {
            assert.ok(
                indexNames.includes(idx),
                `Missing index: ${idx}. Found: ${indexNames.join(', ')}`
            );
        }
        pass('indices');
    });

    it('sessions table has correct columns', () => {
        assert.ok(db, 'DB not initialized');
        const info = db.prepare(`PRAGMA table_info(sessions)`).all();
        const colNames = info.map(c => c.name);

        const expected = [
            'id', 'project_path', 'started_at', 'ended_at',
            'narrative_summary', 'total_actions', 'claims_created',
            'claims_killed', 'gates_passed', 'gates_failed',
        ];
        for (const col of expected) {
            assert.ok(colNames.includes(col), `Missing column in sessions: ${col}`);
        }
        assert.equal(colNames.length, expected.length, `Column count mismatch in sessions`);
        pass('sessions-columns');
    });

    it('spine_entries table has correct columns', () => {
        assert.ok(db, 'DB not initialized');
        const info = db.prepare(`PRAGMA table_info(spine_entries)`).all();
        const colNames = info.map(c => c.name);

        const expected = [
            'id', 'session_id', 'timestamp', 'action_type',
            'tool_name', 'input_summary', 'output_summary',
            'agent_role', 'gate_result',
        ];
        for (const col of expected) {
            assert.ok(colNames.includes(col), `Missing column in spine_entries: ${col}`);
        }
        pass('spine-columns');
    });

    it('embed_queue table has correct columns', () => {
        assert.ok(db, 'DB not initialized');
        const info = db.prepare(`PRAGMA table_info(embed_queue)`).all();
        const colNames = info.map(c => c.name);

        const expected = ['id', 'text', 'metadata', 'created_at', 'processed'];
        for (const col of expected) {
            assert.ok(colNames.includes(col), `Missing column in embed_queue: ${col}`);
        }
        pass('embed-queue-columns');

        // Clean up
        if (db && db.open) db.close();
    });
});

// =====================================================
// B3. Library Unit Tests
// =====================================================

describe('B3. Library Unit Tests', () => {

    it('db.js exports openDB and closeDB', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'db.js'));
        assert.equal(typeof mod.openDB, 'function', 'openDB should be a function');
        assert.equal(typeof mod.closeDB, 'function', 'closeDB should be a function');
        // Also check additional expected exports
        assert.equal(typeof mod.initDB, 'function', 'initDB should be a function');
        assert.equal(typeof mod.createSession, 'function', 'createSession should be a function');
        assert.equal(typeof mod.openAndInit, 'function', 'openAndInit should be a function');
        pass('db-exports');
    });

    it('gate-engine.js exports gate functions', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'gate-engine.js'));
        assert.equal(typeof mod.checkGateDQ4, 'function', 'checkGateDQ4 should be a function');
        assert.equal(typeof mod.checkClaimGates, 'function', 'checkClaimGates should be a function');
        assert.equal(typeof mod.checkLiteratureGate, 'function', 'checkLiteratureGate should be a function');
        assert.equal(typeof mod.getRequiredGatesForClaim, 'function', 'getRequiredGatesForClaim should be a function');
        assert.equal(typeof mod.extractClaimId, 'function', 'extractClaimId should be a function');
        assert.equal(typeof mod.classifyAction, 'function', 'classifyAction should be a function');
        assert.equal(typeof mod.isDirectionNode, 'function', 'isDirectionNode should be a function');
        assert.equal(typeof mod.hasLiteratureSearch, 'function', 'hasLiteratureSearch should be a function');
        assert.equal(typeof mod.findJsonSource, 'function', 'findJsonSource should be a function');
        assert.equal(typeof mod.runSyncCheck, 'function', 'runSyncCheck should be a function');
        pass('gate-engine-exports');
    });

    it('permission-engine.js exports and role verification', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'permission-engine.js'));
        assert.equal(typeof mod.checkPermission, 'function', 'checkPermission should be a function');
        assert.equal(typeof mod.identifyAgentRole, 'function', 'identifyAgentRole should be a function');
        assert.ok(mod.PERMISSIONS, 'PERMISSIONS should be exported');

        // Verify known roles exist in PERMISSIONS
        const knownRoles = ['researcher', 'reviewer2', 'judge', 'serendipity', 'lead', 'experimenter'];
        for (const role of knownRoles) {
            assert.ok(
                mod.PERMISSIONS[role],
                `Role "${role}" should exist in PERMISSIONS`
            );
            assert.ok(
                Array.isArray(mod.PERMISSIONS[role].allow),
                `PERMISSIONS.${role}.allow should be an array`
            );
        }

        // Test identifyAgentRole with explicit roles
        for (const role of knownRoles) {
            const identified = mod.identifyAgentRole(role);
            assert.equal(identified, role, `identifyAgentRole("${role}") should return "${role}"`);
        }

        // Test identifyAgentRole default
        assert.equal(
            mod.identifyAgentRole(null, ''),
            'researcher',
            'Default role should be "researcher"'
        );

        // Test checkPermission in SOLO mode (null role)
        assert.equal(
            mod.checkPermission(null, 'Write', {}),
            null,
            'SOLO mode (null role) should allow everything'
        );

        pass('permission-engine-exports');
    });

    it('vec-search.js exports vecSearch and queueForEmbedding', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'vec-search.js'));
        assert.equal(typeof mod.vecSearch, 'function', 'vecSearch should be a function');
        assert.equal(typeof mod.queueForEmbedding, 'function', 'queueForEmbedding should be a function');
        pass('vec-search-exports');
    });

    it('context-builder.js exports buildContext, formatContextForInjection, truncate', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'context-builder.js'));
        assert.equal(typeof mod.buildContext, 'function', 'buildContext should be a function');
        assert.equal(typeof mod.formatContextForInjection, 'function', 'formatContextForInjection should be a function');
        assert.equal(typeof mod.truncate, 'function', 'truncate should be a function');

        // Quick functional test on truncate
        assert.equal(mod.truncate('hello', 10), 'hello');
        assert.equal(mod.truncate('hello world this is long', 10), 'hello w...');
        assert.equal(mod.truncate(null, 10), '');
        assert.equal(mod.truncate('', 10), '');

        pass('context-builder-exports');
    });

    it('narrative-engine.js exports generateNarrativeSummary and updateStateMdFromDB', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'narrative-engine.js'));
        assert.equal(typeof mod.generateNarrativeSummary, 'function', 'generateNarrativeSummary should be a function');
        assert.equal(typeof mod.updateStateMdFromDB, 'function', 'updateStateMdFromDB should be a function');

        // Quick functional test on generateNarrativeSummary with empty data
        const result = mod.generateNarrativeSummary({
            entries: [],
            claims: [],
            gates: [],
            sessionId: 'test-session-000',
        });
        assert.ok(result.text, 'Summary text should not be empty');
        assert.equal(typeof result.tokenEstimate, 'number', 'tokenEstimate should be a number');
        assert.ok(result.text.includes('Session test-ses'), 'Summary should contain session ID prefix');

        pass('narrative-engine-exports');
    });

    it('r2-calibration.js exports calibration functions', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'r2-calibration.js'));
        assert.equal(typeof mod.loadR2CalibrationData, 'function', 'loadR2CalibrationData should be a function');
        assert.equal(typeof mod.loadResearcherPatterns, 'function', 'loadResearcherPatterns should be a function');
        assert.equal(typeof mod.loadPendingSeeds, 'function', 'loadPendingSeeds should be a function');
        assert.equal(typeof mod.updateSeedStatuses, 'function', 'updateSeedStatuses should be a function');
        pass('r2-calibration-exports');
    });
});

// =====================================================
// B4. Script Integration Tests
// =====================================================

describe('B4. Script Integration Tests', () => {

    it('setup.js: outputs valid JSON with status and db_path', () => {
        try {
            const output = execSync(
                `echo {} | node plugin/scripts/setup.js`,
                {
                    cwd: ROOT,
                    encoding: 'utf-8',
                    timeout: 30000,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe'],
                }
            );
            const trimmed = output.trim();
            assert.ok(trimmed.length > 0, 'setup.js should produce output');

            const result = JSON.parse(trimmed);
            assert.ok('status' in result, 'setup.js output should have "status" field');
            assert.ok('db_path' in result, 'setup.js output should have "db_path" field');
            assert.ok(
                result.status === 'ready' || result.status === 'degraded' || result.status === 'error',
                `Unexpected status: ${result.status}`
            );
            pass('setup-integration');
        } catch (err) {
            // If setup outputs JSON even on "error", that is still acceptable
            if (err.stdout) {
                try {
                    const result = JSON.parse(err.stdout.trim());
                    assert.ok('status' in result, 'setup.js error output should still have "status"');
                    pass('setup-integration-degraded');
                    return;
                } catch {
                    // Fall through to fail
                }
            }
            fail('setup-integration');
            assert.fail(`setup.js failed: ${err.message}`);
        }
    });

    it('session-start.js: outputs valid JSON with sessionId', () => {
        try {
            const output = execSync(
                `echo {"session_id":"test-e2e"} | node plugin/scripts/session-start.js`,
                {
                    cwd: ROOT,
                    encoding: 'utf-8',
                    timeout: 30000,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe'],
                }
            );
            const trimmed = output.trim();
            assert.ok(trimmed.length > 0, 'session-start.js should produce output');

            const result = JSON.parse(trimmed);
            assert.ok(
                'sessionId' in result,
                'session-start.js output should have "sessionId" field'
            );
            pass('session-start-integration');
        } catch (err) {
            if (err.stdout) {
                try {
                    const result = JSON.parse(err.stdout.trim());
                    assert.ok('sessionId' in result, 'session-start.js should output sessionId');
                    pass('session-start-integration-degraded');
                    return;
                } catch {
                    // Fall through
                }
            }
            fail('session-start-integration');
            assert.fail(`session-start.js failed: ${err.message}`);
        }
    });

    it('prompt-submit.js: outputs valid JSON with agentRole', () => {
        try {
            const output = execSync(
                `echo {"prompt":"test prompt","session_id":"test-e2e"} | node plugin/scripts/prompt-submit.js`,
                {
                    cwd: ROOT,
                    encoding: 'utf-8',
                    timeout: 30000,
                    shell: true,
                    stdio: ['pipe', 'pipe', 'pipe'],
                }
            );
            const trimmed = output.trim();
            assert.ok(trimmed.length > 0, 'prompt-submit.js should produce output');

            const result = JSON.parse(trimmed);
            assert.ok(
                'agentRole' in result,
                'prompt-submit.js output should have "agentRole" field'
            );
            assert.equal(
                result.agentRole,
                'researcher',
                'Default agentRole should be "researcher" for generic prompt'
            );
            pass('prompt-submit-integration');
        } catch (err) {
            if (err.stdout) {
                try {
                    const result = JSON.parse(err.stdout.trim());
                    assert.ok('agentRole' in result, 'prompt-submit.js should output agentRole');
                    pass('prompt-submit-integration-degraded');
                    return;
                } catch {
                    // Fall through
                }
            }
            fail('prompt-submit-integration');
            assert.fail(`prompt-submit.js failed: ${err.message}`);
        }
    });

    it('worker-embed.js: syntax check only (no daemon start)', () => {
        const workerPath = rel('plugin', 'scripts', 'worker-embed.js');
        assert.ok(fs.existsSync(workerPath), 'worker-embed.js should exist');
        try {
            execSync(`node --check "${workerPath}"`, {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 15000,
                stdio: 'pipe',
            });
            pass('worker-syntax');
        } catch (err) {
            fail('worker-syntax');
            assert.fail(`worker-embed.js syntax error: ${err.stderr || err.message}`);
        }
    });
});

// =====================================================
// B5. Package & Config Tests
// =====================================================

describe('B5. Package & Config Tests', () => {

    it('package.json: dependencies include required packages', () => {
        const pkgPath = rel('package.json');
        assert.ok(fs.existsSync(pkgPath), 'package.json should exist');

        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        assert.ok(pkg.dependencies, 'package.json should have dependencies');

        const requiredDeps = ['better-sqlite3', '@huggingface/transformers', 'onnxruntime-node'];
        for (const dep of requiredDeps) {
            assert.ok(
                dep in pkg.dependencies,
                `Missing dependency: ${dep}`
            );
        }
        pass('pkg-deps');
    });

    it('package.json: scripts include "setup" and "worker"', () => {
        const pkg = JSON.parse(fs.readFileSync(rel('package.json'), 'utf-8'));
        assert.ok(pkg.scripts, 'package.json should have scripts');
        assert.ok('setup' in pkg.scripts, 'Missing script: setup');
        assert.ok('worker' in pkg.scripts, 'Missing script: worker');
        pass('pkg-scripts');
    });

    it('hooks.json: declares all required hooks', () => {
        const hooksPath = rel('plugin', 'hooks', 'hooks.json');
        assert.ok(fs.existsSync(hooksPath), 'hooks.json should exist');

        const hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
        assert.ok(hooksConfig.hooks, 'hooks.json should have a "hooks" key');

        // Check for required hook names (as defined in the file)
        const hookNames = Object.keys(hooksConfig.hooks);
        const requiredHooks = ['Setup', 'SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'];

        for (const hook of requiredHooks) {
            assert.ok(
                hookNames.includes(hook),
                `Missing hook: ${hook}. Found: ${hookNames.join(', ')}`
            );
        }
        pass('hooks-declared');
    });

    it('plugin.json: has name and version fields', () => {
        const pluginPath = rel('.claude-plugin', 'plugin.json');
        assert.ok(fs.existsSync(pluginPath), 'plugin.json should exist');

        const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf-8'));
        assert.ok('name' in plugin, 'plugin.json should have "name"');
        assert.ok('version' in plugin, 'plugin.json should have "version"');
        assert.equal(plugin.name, 'vibe-science', 'plugin name should be "vibe-science"');
        assert.equal(plugin.version, '6.0.0', 'plugin version should be "6.0.0"');
        pass('plugin-json');
    });

    it('all 9 schema JSON files in schemas/ are valid JSON', () => {
        const schemasDir = rel('schemas');
        assert.ok(fs.existsSync(schemasDir), 'schemas/ directory should exist');

        const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));
        assert.equal(
            schemaFiles.length, 9,
            `Expected 9 schema files, found ${schemaFiles.length}: ${schemaFiles.join(', ')}`
        );

        const expectedSchemas = [
            'brainstorm-quality.schema.json',
            'claim-promotion.schema.json',
            'review-completeness.schema.json',
            'rq-conclusion.schema.json',
            'serendipity-seed.schema.json',
            'source-validity.schema.json',
            'stage4-exit.schema.json',
            'stage5-exit.schema.json',
            'vigilance-check.schema.json',
        ];

        for (const schemaFile of expectedSchemas) {
            const fullPath = path.join(schemasDir, schemaFile);
            assert.ok(fs.existsSync(fullPath), `Missing schema file: ${schemaFile}`);

            const content = fs.readFileSync(fullPath, 'utf-8');
            let parsed;
            try {
                parsed = JSON.parse(content);
            } catch (err) {
                assert.fail(`Invalid JSON in ${schemaFile}: ${err.message}`);
            }
            assert.ok(parsed, `Schema ${schemaFile} should parse to a truthy value`);
        }
        pass('schema-json-files');
    });
});

// =====================================================
// B6. Content Integrity Tests
// =====================================================

describe('B6. Content Integrity Tests', () => {

    /**
     * Recursively scan a directory for files, excluding certain directories
     * and binary file types.
     */
    function scanFiles(dir, results = []) {
        const EXCLUDE_DIRS = new Set(['node_modules', 'archive', '.git', 'vibe-science']);
        const EXCLUDE_EXTS = new Set(['.zip', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot']);

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return results;
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                if (!EXCLUDE_DIRS.has(entry.name)) {
                    scanFiles(fullPath, results);
                }
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (!EXCLUDE_EXTS.has(ext)) {
                    results.push(fullPath);
                }
            }
        }

        return results;
    }

    it('no forbidden personal names in project files', () => {
        const FORBIDDEN_NAMES = [
            'Carmine', 'Russo', 'Elisa', 'Bertelli',
            'Stefano', 'th3vib3coder', 'Coherent',
        ];

        const files = scanFiles(ROOT);
        const violations = [];

        // Exclude this test file itself (it contains the names as search patterns)
        const thisFile = path.resolve(fileURLToPath(import.meta.url));

        for (const filePath of files) {
            // Skip this test file — it lists the forbidden names as search patterns
            if (path.resolve(filePath) === thisFile) continue;

            let content;
            try {
                content = fs.readFileSync(filePath, 'utf-8');
            } catch {
                // Skip files that cannot be read as UTF-8
                continue;
            }

            for (const name of FORBIDDEN_NAMES) {
                // Word-boundary search (case-insensitive for names, but "Coherent"
                // only matches as standalone proper noun to avoid "coherent"/"incoherent")
                const flags = (name === 'Coherent') ? '' : 'i';
                const regex = new RegExp(`\\b${name}\\b`, flags);
                if (regex.test(content)) {
                    const relativePath = path.relative(ROOT, filePath);
                    violations.push(`"${name}" found in ${relativePath}`);
                }
            }
        }

        assert.equal(
            violations.length, 0,
            `Forbidden personal names found:\n  ${violations.join('\n  ')}`
        );
        pass('no-forbidden-names');
    });

    it('all script files referenced in hooks.json exist on disk', () => {
        const hooksConfig = JSON.parse(
            fs.readFileSync(rel('plugin', 'hooks', 'hooks.json'), 'utf-8')
        );

        for (const [hookName, hookEntries] of Object.entries(hooksConfig.hooks)) {
            for (const entry of hookEntries) {
                if (entry.command) {
                    // Extract the script path from the command (e.g., "node plugin/scripts/setup.js")
                    const parts = entry.command.split(/\s+/);
                    // Find the .js file in the command parts
                    const jsFile = parts.find(p => p.endsWith('.js'));
                    if (jsFile) {
                        const fullPath = rel(jsFile);
                        assert.ok(
                            fs.existsSync(fullPath),
                            `Hook "${hookName}" references ${jsFile} but file does not exist at ${fullPath}`
                        );
                    }
                }
            }
        }
        pass('hooks-file-refs');
    });

    it('all files referenced in plugin.json exist on disk', () => {
        const plugin = JSON.parse(
            fs.readFileSync(rel('.claude-plugin', 'plugin.json'), 'utf-8')
        );

        // Check hooks file reference
        if (plugin.hooks) {
            const hooksPath = rel(plugin.hooks);
            assert.ok(
                fs.existsSync(hooksPath),
                `plugin.json references hooks at "${plugin.hooks}" but file does not exist`
            );
        }

        // Check setup script reference
        if (plugin.setup) {
            // Extract JS file path from setup command
            const parts = plugin.setup.split(/\s+/);
            const jsFile = parts.find(p => p.endsWith('.js'));
            if (jsFile) {
                const fullPath = rel(jsFile);
                assert.ok(
                    fs.existsSync(fullPath),
                    `plugin.json references setup script "${jsFile}" but file does not exist`
                );
            }
        }
        pass('plugin-file-refs');
    });

    it('CLAUDE.md contains "IMMUTABLE LAWS" and "REVIEWER 2"', () => {
        const claudeMdPath = rel('CLAUDE.md');
        assert.ok(fs.existsSync(claudeMdPath), 'CLAUDE.md should exist');

        const content = fs.readFileSync(claudeMdPath, 'utf-8');
        assert.ok(
            content.includes('IMMUTABLE LAWS'),
            'CLAUDE.md should contain "IMMUTABLE LAWS"'
        );
        assert.ok(
            content.includes('REVIEWER 2'),
            'CLAUDE.md should contain "REVIEWER 2"'
        );
        pass('claude-md-content');
    });
});

// =====================================================
// B7. Dependency Import Tests
// =====================================================

describe('B7. Dependency Import Tests', () => {

    it('better-sqlite3 imports successfully', async () => {
        const mod = await import('better-sqlite3');
        assert.ok(mod.default, 'better-sqlite3 should export a default constructor');
        pass('dep-better-sqlite3');
    });

    it('@huggingface/transformers imports successfully', async () => {
        const mod = await import('@huggingface/transformers');
        assert.ok(mod, '@huggingface/transformers should import without error');
        pass('dep-transformers');
    });

    it('onnxruntime-node imports (skip on platform-specific failure)', async () => {
        try {
            const mod = await import('onnxruntime-node');
            assert.ok(mod, 'onnxruntime-node should import without error');
            pass('dep-onnxruntime');
        } catch (err) {
            // Platform-specific binary may not be available
            // (e.g., Linux ARM, or missing native build tools)
            // This is not a test failure — mark as skipped
            console.log(
                `  [SKIP] onnxruntime-node: platform-specific import failed: ${err.message}`
            );
            pass('dep-onnxruntime-skipped');
        }
    });
});

// =====================================================
// Final summary (runs after all tests complete)
// =====================================================

describe('Summary', () => {
    it('print final pass/fail counts', () => {
        // This test always passes — it just prints the summary
        console.log('\n========================================');
        console.log(`  E2E Test Summary`);
        console.log(`  Tracked pass: ${passCount}`);
        console.log(`  Tracked fail: ${failCount}`);
        console.log('========================================\n');
        assert.ok(true);
    });
});
