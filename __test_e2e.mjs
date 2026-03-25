/**
 * Vibe Science v7.0 TRACE — End-to-End Test Suite
 *
 * Comprehensive test coverage for the plugin infrastructure:
 *   B1. Syntax & Import Tests (28 JS files)
 *   B2. Schema SQL Tests (16 tables, FK constraints, indices)
 *   B3. Library Unit Tests (13 libs, export verification)
 *   B4. Script Integration Tests (setup, session-start, prompt-submit)
 *   B5. Package & Config Tests (package.json, hooks.json, plugin.json, schemas)
 *   B6. Content Integrity Tests (forbidden names, file references, CLAUDE.md)
 *   B7. Dependency Import Tests (better-sqlite3, transformers, onnxruntime)
 *   B8. TRACE Foundation Tests (migrations, structured blocks)
 *
 * Usage:  node --test __test_e2e.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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
        'plugin/scripts/pre-tool-use.js',
        'plugin/scripts/pre-compact.js',
        'plugin/scripts/stop.js',
        'plugin/scripts/subagent-stop.js',
        'plugin/scripts/worker-embed.js',
        'evals/eval-runner.mjs',
        'evals/smoke-trace.mjs',
        'scripts/v7-readiness.mjs',
    ];

    const libs = [
        'plugin/lib/db.js',
        'plugin/lib/gate-engine.js',
        'plugin/lib/permission-engine.js',
        'plugin/lib/vec-search.js',
        'plugin/lib/context-builder.js',
        'plugin/lib/narrative-engine.js',
        'plugin/lib/pattern-extractor.js',
        'plugin/lib/r2-calibration.js',
        'plugin/lib/benchmark-reporter.js',
        'plugin/lib/migrations.js',
        'plugin/lib/structured-block-parser.js',
        'plugin/lib/claim-ingestion.js',
        'plugin/lib/seed-ingestion.js',
        'plugin/lib/r2-ingestion.js',
        'plugin/lib/citation-extractor.js',
        'plugin/lib/citation-engine.js',
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

    it('all 28 JS files are present', () => {
        assert.equal(allJsFiles.length, 28, 'Expected exactly 28 JS files (12 scripts + 16 libs)');
        for (const file of allJsFiles) {
            assert.ok(fs.existsSync(rel(file)), `Missing: ${file}`);
        }
        pass('all-28-present');
    });
});

// =====================================================
// B2. Schema SQL Tests
// =====================================================

describe('B2. Schema SQL Tests', () => {
    const SCHEMA_PATH = rel('plugin', 'db', 'schema.sql');

    const EXPECTED_TABLES = [
        'meta',
        'sessions',
        'spine_entries',
        'claim_events',
        'r2_reviews',
        'serendipity_seeds',
        'gate_checks',
        'literature_searches',
        'citation_checks',
        'observer_alerts',
        'calibration_log',
        'prompt_log',
        'memory_embeddings',
        'embed_queue',
        'research_patterns',
        'benchmark_runs',
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

    it('all 16 tables exist', () => {
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
        pass('16-tables');
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
            'idx_citations_session',
            'idx_citations_status',
            'idx_citations_claim',
            'idx_citations_lookup',
            'idx_citations_dedupe',
            'idx_observer_project',
            'idx_calibration_claim',
            'idx_prompt_session',
            'idx_membed_project',
            'idx_embed_pending',
            'idx_patterns_project',
            'idx_patterns_type',
            'idx_bench_version',
            'idx_bench_case',
            'idx_bench_run',
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
            'id', 'project_path', 'started_at', 'ended_at', 'integrity_status', 'integrity_notes',
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
        assert.equal(typeof mod.DEFAULT_DB_PATH, 'string', 'DEFAULT_DB_PATH should be exported');
        assert.equal(typeof mod.openDB, 'function', 'openDB should be a function');
        assert.equal(typeof mod.closeDB, 'function', 'closeDB should be a function');
        // Also check additional expected exports
        assert.equal(typeof mod.initDB, 'function', 'initDB should be a function');
        assert.equal(typeof mod.createSession, 'function', 'createSession should be a function');
        assert.equal(typeof mod.updateSessionIntegrity, 'function', 'updateSessionIntegrity should be a function');
        assert.equal(typeof mod.openAndInit, 'function', 'openAndInit should be a function');
        assert.equal(typeof mod.upsertCitationCheck, 'function', 'upsertCitationCheck should be a function');
        assert.equal(typeof mod.updateCitationVerification, 'function', 'updateCitationVerification should be a function');
        assert.equal(typeof mod.getCitationChecks, 'function', 'getCitationChecks should be a function');
        pass('db-exports');
    });

    it('gate-engine.js exports gate functions', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'gate-engine.js'));
        assert.equal(typeof mod.checkGateDQ4, 'function', 'checkGateDQ4 should be a function');
        assert.equal(typeof mod.checkClaimGates, 'function', 'checkClaimGates should be a function');
        assert.equal(typeof mod.checkLiteratureGate, 'function', 'checkLiteratureGate should be a function');
        assert.equal(typeof mod.getRequiredGatesForClaim, 'function', 'getRequiredGatesForClaim should be a function');
        assert.equal(typeof mod.extractClaimId, 'function', 'extractClaimId should be a function');
        // classifyAction removed from gate-engine.js (v6.0.6) — canonical impl lives in post-tool-use.js
        assert.equal(typeof mod.isDirectionNode, 'function', 'isDirectionNode should be a function');
        assert.equal(typeof mod.hasLiteratureSearch, 'function', 'hasLiteratureSearch should be a function');
        assert.equal(typeof mod.findJsonSource, 'function', 'findJsonSource should be a function');
        assert.equal(typeof mod.runSyncCheck, 'function', 'runSyncCheck should be a function');
        assert.equal(typeof mod.getCitationChecks, 'function', 'getCitationChecks should be a function');
        assert.equal(typeof mod.summarizeCitationValidity, 'function', 'summarizeCitationValidity should be a function');
        assert.equal(typeof mod.checkSourceValidityGate, 'function', 'checkSourceValidityGate should be a function');
        assert.equal(typeof mod.checkClaimPromotionSources, 'function', 'checkClaimPromotionSources should be a function');
        assert.equal(mod.extractClaimId('Claim C-1234 is here'), 'C-1234', 'extractClaimId should support >999 compact IDs');
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

    it('TRACE canonicalizes queueForEmbedding and citation check lookup behavior', async () => {
        const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
        const gateMod = await import(relUrl('plugin', 'lib', 'gate-engine.js'));
        const vecMod = await import(relUrl('plugin', 'lib', 'vec-search.js'));

        assert.equal(
            vecMod.queueForEmbedding,
            dbMod.queueForEmbedding,
            'vec-search should re-export the canonical DB queueForEmbedding implementation'
        );
        assert.deepEqual(dbMod.getCitationChecks(null, {}), []);
        assert.deepEqual(gateMod.getCitationChecks(null, {}), []);
        pass('trace-canonical-exports');
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

    it('benchmark-reporter.js exports', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'benchmark-reporter.js'));
        assert.ok(typeof mod.recordBenchmark === 'function', 'exports recordBenchmark');
        assert.ok(typeof mod.generateReport === 'function', 'exports generateReport');
        assert.ok(typeof mod.compareVersions === 'function', 'exports compareVersions');
        pass('benchmark-reporter-exports');
    });

    it('migrations.js exports migration helpers', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'migrations.js'));
        assert.equal(typeof mod.CURRENT_SCHEMA_VERSION, 'number', 'CURRENT_SCHEMA_VERSION should be numeric');
        assert.equal(typeof mod.ensureMetaTable, 'function', 'ensureMetaTable should be a function');
        assert.equal(typeof mod.tableExists, 'function', 'tableExists should be a function');
        assert.equal(typeof mod.columnExists, 'function', 'columnExists should be a function');
        assert.equal(typeof mod.getSchemaVersion, 'function', 'getSchemaVersion should be a function');
        assert.equal(typeof mod.applyMigrations, 'function', 'applyMigrations should be a function');
        pass('migrations-exports');
    });

    it('structured-block-parser.js exports parser helpers', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'structured-block-parser.js'));
        assert.ok(mod.BLOCK_TAGS, 'BLOCK_TAGS should be exported');
        assert.equal(typeof mod.canonicalizeBlockTag, 'function', 'canonicalizeBlockTag should be a function');
        assert.equal(typeof mod.parseStructuredBlocks, 'function', 'parseStructuredBlocks should be a function');
        assert.equal(typeof mod.parseStructuredBlock, 'function', 'parseStructuredBlock should be a function');
        assert.equal(typeof mod.normalizeStructuredBlock, 'function', 'normalizeStructuredBlock should be a function');
        pass('structured-parser-exports');
    });

    it('claim-ingestion.js exports lifecycle helpers', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'claim-ingestion.js'));
        assert.equal(typeof mod.ingestClaimEvents, 'function', 'ingestClaimEvents should be a function');
        assert.equal(typeof mod.normalizeClaimId, 'function', 'normalizeClaimId should be a function');
        assert.equal(mod.normalizeClaimId('C001'), 'C-001');
        pass('claim-ingestion-exports');
    });

    it('seed-ingestion.js exports seed ingestion helper', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'seed-ingestion.js'));
        assert.equal(typeof mod.ingestSerendipitySeeds, 'function', 'ingestSerendipitySeeds should be a function');
        pass('seed-ingestion-exports');
    });

    it('r2-ingestion.js exports review ingestion helper', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'r2-ingestion.js'));
        assert.equal(typeof mod.ingestR2Reviews, 'function', 'ingestR2Reviews should be a function');
        pass('r2-ingestion-exports');
    });

    it('citation-extractor.js exports citation extraction helpers', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'citation-extractor.js'));
        assert.equal(typeof mod.extractCitationsFromEvent, 'function', 'extractCitationsFromEvent should be a function');
        assert.equal(typeof mod.extractCitationsFromText, 'function', 'extractCitationsFromText should be a function');
        assert.equal(typeof mod.normalizeDoi, 'function', 'normalizeDoi should be a function');
        assert.equal(typeof mod.normalizePmid, 'function', 'normalizePmid should be a function');
        assert.equal(typeof mod.normalizeArxivId, 'function', 'normalizeArxivId should be a function');
        pass('citation-extractor-exports');
    });

    it('citation-engine.js exports verification helpers', async () => {
        const mod = await import(relUrl('plugin', 'lib', 'citation-engine.js'));
        assert.equal(typeof mod.verifyCitationsQuick, 'function', 'verifyCitationsQuick should be a function');
        assert.equal(typeof mod.verifyCitation, 'function', 'verifyCitation should be a function');
        assert.equal(typeof mod.runFetchSpike, 'function', 'runFetchSpike should be a function');
        pass('citation-engine-exports');
    });
});

// =====================================================
// B4. Script Integration Tests
// =====================================================

describe('B4. Script Integration Tests', () => {

    it('setup.js: outputs valid JSON with schema metadata', () => {
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
            assert.ok('schema_version' in result, 'setup.js output should have "schema_version" field');
            assert.ok('target_schema_version' in result, 'setup.js output should have "target_schema_version" field');
            assert.ok('migrations_applied' in result, 'setup.js output should have "migrations_applied" field');
            assert.equal(typeof result.schema_version, 'number', 'schema_version should be numeric');
            assert.equal(typeof result.target_schema_version, 'number', 'target_schema_version should be numeric');
            assert.ok(Array.isArray(result.migrations_applied), 'migrations_applied should be an array');
            assert.equal(
                result.target_schema_version >= result.schema_version,
                true,
                'target schema version should be >= current schema version'
            );
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
                result.hookSpecificOutput,
                'session-start.js output should have "hookSpecificOutput" field'
            );
            assert.equal(typeof result.sessionId, 'string', 'session-start.js should surface sessionId');
            assert.ok(result.integrityStatus === 'INTEGRITY_OK' || result.integrityStatus === 'INTEGRITY_DEGRADED');
            pass('session-start-integration');
        } catch (err) {
            if (err.stdout) {
                try {
                    const result = JSON.parse(err.stdout.trim());
                    assert.ok(result.hookSpecificOutput, 'session-start.js should output hookSpecificOutput');
                    assert.equal(typeof result.sessionId, 'string', 'session-start.js should surface sessionId');
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
                result.hookSpecificOutput,
                'prompt-submit.js output should have "hookSpecificOutput" field'
            );
            assert.ok(
                result.hookSpecificOutput.additionalContext,
                'prompt-submit.js hookSpecificOutput should have "additionalContext"'
            );
            pass('prompt-submit-integration');
        } catch (err) {
            if (err.stdout) {
                try {
                    const result = JSON.parse(err.stdout.trim());
                    assert.ok(result.hookSpecificOutput, 'prompt-submit.js should output hookSpecificOutput');
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

    it('session-start.js marks integrity degraded in strict mode when DB persistence is unavailable', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-strict-'));
        const fakeHome = path.join(tempRoot, 'home-file');
        fs.writeFileSync(fakeHome, 'not-a-directory', 'utf-8');

        const result = spawnSync(
            process.execPath,
            ['plugin/scripts/session-start.js'],
            {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 30000,
                input: JSON.stringify({ cwd: ROOT, project_path: ROOT }),
                env: {
                    ...process.env,
                    VIBE_SCIENCE_STRICT: '1',
                    HOME: fakeHome,
                    USERPROFILE: fakeHome,
                },
            }
        );

        assert.equal(result.status, 0, 'session-start should still return context in strict mode');
        const output = JSON.parse(String(result.stdout || '').trim());
        assert.equal(output.integrityStatus, 'INTEGRITY_DEGRADED');
        assert.match(String(output.systemMessage || ''), /\[INTEGRITY DEGRADED\]/);
        pass('session-start-strict-integrity');
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

    it('eval-runner writes an artifact and records benchmark rows when requested', async () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-eval-'));
        const artifactPath = path.join(tempRoot, 'eval-artifact.json');
        const dbPath = path.join(tempRoot, 'eval.db');

        const result = spawnSync(
            process.execPath,
            ['evals/eval-runner.mjs', '--artifact', artifactPath, '--record', '--db', dbPath, '--version', '7.0.0'],
            {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 60000,
            }
        );

        assert.equal(result.status, 0, `eval-runner should succeed: ${result.stderr}`);
        assert.ok(fs.existsSync(artifactPath), 'eval-runner should always write an artifact');

        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        assert.equal(artifact.mode, 'schema_validation_only');
        assert.equal(artifact.db_recorded, true);
        assert.ok(artifact.total >= 24, 'artifact should include discovered eval cases');

        const Database = (await import('better-sqlite3')).default;
        const db = new Database(dbPath);
        const row = db.prepare(`SELECT COUNT(*) AS n FROM benchmark_runs WHERE skill_version = '7.0.0'`).get();
        assert.ok(row.n >= artifact.total, 'benchmark_runs should receive recorded eval cases');
        db.close();
        pass('eval-runner-record');
    });

    it('stop.js blocks in strict mode when DB access is unavailable', () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-stop-strict-'));
        const fakeHome = path.join(tempRoot, 'home-file');
        fs.writeFileSync(fakeHome, 'not-a-directory', 'utf-8');

        const result = spawnSync(
            process.execPath,
            ['plugin/scripts/stop.js'],
            {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 30000,
                input: JSON.stringify({ session_id: 'strict-stop-session', cwd: ROOT, project_path: ROOT }),
                env: {
                    ...process.env,
                    VIBE_SCIENCE_STRICT: '1',
                    HOME: fakeHome,
                    USERPROFILE: fakeHome,
                },
            }
        );

        assert.equal(result.status, 2, 'strict mode should fail-loud when stop cannot access the DB');
        assert.match(String(result.stderr || ''), /\[INTEGRITY DEGRADED\]/);
        pass('stop-strict-integrity');
    });

    it('stop.js blocks when final session persistence fails instead of silently orphaning the session', async () => {
        const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-stop-lock-'));
        const homeDir = path.join(tempRoot, 'home');
        const projectDir = path.join(tempRoot, 'project');
        fs.mkdirSync(homeDir, { recursive: true });
        fs.mkdirSync(projectDir, { recursive: true });
        fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
        fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# STATE\n', 'utf-8');

        const env = {
            ...process.env,
            HOME: homeDir,
            USERPROFILE: homeDir,
        };

        const setup = spawnSync(
            process.execPath,
            ['plugin/scripts/setup.js'],
            {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 30000,
                input: JSON.stringify({}),
                env,
            }
        );
        assert.equal(setup.status, 0, `setup should succeed: ${setup.stderr}`);

        const sessionStart = spawnSync(
            process.execPath,
            ['plugin/scripts/session-start.js'],
            {
                cwd: ROOT,
                encoding: 'utf-8',
                timeout: 30000,
                input: JSON.stringify({ cwd: projectDir, project_path: projectDir }),
                env,
            }
        );
        assert.equal(sessionStart.status, 0, `session-start should succeed: ${sessionStart.stderr}`);
        const sessionPayload = JSON.parse(String(sessionStart.stdout || '').trim());
        assert.equal(typeof sessionPayload.sessionId, 'string', 'session-start should create a persisted session');

        const dbPath = path.join(homeDir, '.vibe-science', 'db', 'vibe-science.db');
        const Database = (await import('better-sqlite3')).default;
        const locker = new Database(dbPath);
        locker.pragma('journal_mode = WAL');
        locker.exec('BEGIN IMMEDIATE');

        try {
            const stop = spawnSync(
                process.execPath,
                ['plugin/scripts/stop.js'],
                {
                    cwd: ROOT,
                    encoding: 'utf-8',
                    timeout: 30000,
                    input: JSON.stringify({
                        session_id: sessionPayload.sessionId,
                        cwd: projectDir,
                        project_path: projectDir,
                    }),
                    env,
                }
            );

            assert.equal(stop.status, 2, 'stop should block when endSession cannot persist');
            assert.match(String(stop.stderr || ''), /failed to persist session summary\/endSession/i);

            const row = locker.prepare(`SELECT ended_at FROM sessions WHERE id = ?`).get(sessionPayload.sessionId);
            assert.equal(row?.ended_at ?? null, null, 'blocked stop should leave the session open for retry');
            pass('stop-blocks-on-endSession-failure');
        } finally {
            try {
                locker.exec('ROLLBACK');
            } catch {
                // ignore rollback errors from interrupted transactions
            }
            locker.close();
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

        const requiredDeps = ['better-sqlite3', '@huggingface/transformers'];
        for (const dep of requiredDeps) {
            assert.ok(
                dep in pkg.dependencies,
                `Missing dependency: ${dep}`
            );
        }
        pass('pkg-deps');
    });

    it('package.json: scripts include setup, worker, eval, smoke, and v7-readiness', () => {
        const pkg = JSON.parse(fs.readFileSync(rel('package.json'), 'utf-8'));
        assert.ok(pkg.scripts, 'package.json should have scripts');
        assert.ok('setup' in pkg.scripts, 'Missing script: setup');
        assert.ok('worker' in pkg.scripts, 'Missing script: worker');
        assert.ok('eval' in pkg.scripts, 'Missing script: eval');
        assert.ok('smoke' in pkg.scripts, 'Missing script: smoke');
        assert.ok('v7-readiness' in pkg.scripts, 'Missing script: v7-readiness');
        pass('pkg-scripts');
    });

    it('hooks.json: declares all required hooks', () => {
        const hooksPath = rel('hooks', 'hooks.json');
        assert.ok(fs.existsSync(hooksPath), 'hooks.json should exist');

        const hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
        assert.ok(hooksConfig.hooks, 'hooks.json should have a "hooks" key');

        // Check for required hook names (as defined in the file)
        const hookNames = Object.keys(hooksConfig.hooks);
        const requiredHooks = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PreCompact', 'Stop', 'SubagentStop'];

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
        assert.equal(plugin.version, '7.0.0', 'plugin version should be "7.0.0"');
        pass('plugin-json');
    });

    it('all 12 schema JSON files in skills/vibe/assets/schemas/ are valid JSON', () => {
        const schemasDir = rel('skills/vibe/assets/schemas');
        assert.ok(fs.existsSync(schemasDir), 'skills/vibe/assets/schemas/ directory should exist');

        const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'));
        assert.equal(
            schemaFiles.length, 12,
            `Expected 12 schema files, found ${schemaFiles.length}: ${schemaFiles.join(', ')}`
        );

        const expectedSchemas = [
            'brainstorm-quality.schema.json',
            'claim-promotion.schema.json',
            'data-quality-gate.schema.json',
            'finding-validation.schema.json',
            'review-completeness.schema.json',
            'rq-conclusion.schema.json',
            'serendipity-seed.schema.json',
            'source-validity.schema.json',
            'spine-entry.schema.json',
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

        // Files that legitimately contain author attribution (citation, readme, plugin manifest, skill metadata)
        const AUTHOR_FILES = new Set([
            'README.md', 'CITATION.cff', 'LICENSE', 'NOTICE', 'CHANGELOG.md',
        ]);
        const AUTHOR_PATH_SEGMENTS = [
            '.claude-plugin', // plugin.json contains repository URLs
        ];

        for (const filePath of files) {
            // Skip this test file — it lists the forbidden names as search patterns
            if (path.resolve(filePath) === thisFile) continue;

            // Skip files that legitimately contain author attribution
            const relativePath = path.relative(ROOT, filePath);
            const baseName = path.basename(filePath);
            if (AUTHOR_FILES.has(baseName)) continue;
            if (AUTHOR_PATH_SEGMENTS.some(seg => relativePath.includes(seg))) continue;
            // Skip SKILL.md files — skill metadata header contains author field
            if (baseName === 'SKILL.md') continue;

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
            fs.readFileSync(rel('hooks', 'hooks.json'), 'utf-8')
        );

        for (const [hookName, hookEntries] of Object.entries(hooksConfig.hooks)) {
            for (const entry of hookEntries) {
                // New hook format: entry.hooks is an array of { type, command, timeout }
                const innerHooks = entry.hooks || [];
                for (const innerHook of innerHooks) {
                    if (innerHook.command) {
                        // Strip ${CLAUDE_PLUGIN_ROOT}/ prefix and quotes to get relative path
                        const cmd = innerHook.command
                            .replace(/\$\{CLAUDE_PLUGIN_ROOT\}\//g, '')
                            .replace(/"/g, '');
                        // Extract the .js file path from the command
                        const match = cmd.match(/(plugin\/scripts\/[\w-]+\.js)/);
                        if (match) {
                            const jsFile = match[1];
                            const fullPath = rel(jsFile);
                            assert.ok(
                                fs.existsSync(fullPath),
                                `Hook "${hookName}" references ${jsFile} but file does not exist at ${fullPath}`
                            );
                        }
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
// B8. TRACE Foundation Tests
// =====================================================

describe('B8. TRACE Foundation Tests', () => {

    it('applyMigrations upgrades a simulated v6/v7-pretrace DB to schema version 4', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { applyMigrations, columnExists, getSchemaVersion, tableExists } =
            await import(relUrl('plugin', 'lib', 'migrations.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(`
            CREATE TABLE sessions (
                id TEXT PRIMARY KEY,
                project_path TEXT NOT NULL,
                started_at TEXT NOT NULL
            );
            CREATE TABLE serendipity_seeds (
                seed_id TEXT PRIMARY KEY,
                created_session TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING_TRIAGE',
                source TEXT NOT NULL,
                score INTEGER,
                causal_question TEXT,
                discriminating_test TEXT,
                fallback_test TEXT,
                narrative TEXT,
                last_reviewed_session TEXT,
                resolution TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE citation_checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE UNIQUE INDEX idx_citations_dedupe
            ON citation_checks(session_id, citation_type, normalized_id, citation_text);
        `);

        const result = applyMigrations(db);
        assert.equal(result.currentVersion, 4, 'schema version should upgrade to 4');
        assert.deepEqual(result.applied, [1, 2, 3, 4], 'migration steps 1, 2, 3, and 4 should be applied');
        assert.equal(getSchemaVersion(db), 4, 'meta schema_version should be persisted');
        assert.equal(tableExists(db, 'meta'), true, 'meta table should exist');
        assert.equal(tableExists(db, 'citation_checks'), true, 'citation_checks table should exist');
        assert.equal(tableExists(db, 'memory_fts'), true, 'memory_fts should exist after migration');
        assert.equal(columnExists(db, 'serendipity_seeds', 'source_claim_id'), true, 'source_claim_id should exist after migration');
        assert.equal(columnExists(db, 'sessions', 'integrity_status'), true, 'integrity_status should exist after migration');
        assert.equal(columnExists(db, 'sessions', 'integrity_notes'), true, 'integrity_notes should exist after migration');
        assert.equal(columnExists(db, 'citation_checks', 'citation_id'), true, 'citation_id should exist after migration');
        assert.equal(columnExists(db, 'citation_checks', 'claim_id'), true, 'claim_id should exist after migration');
        assert.equal(columnExists(db, 'citation_checks', 'raw_ref'), true, 'raw_ref should exist after migration');
        assert.equal(columnExists(db, 'citation_checks', 'doi'), true, 'doi should exist after migration');

        db.close();
        pass('trace-migration-upgrade');
    });

    it('columnExists rejects unsafe identifiers instead of interpolating them', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { columnExists } = await import(relUrl('plugin', 'lib', 'migrations.js'));

        const db = new Database(':memory:');
        db.exec(`CREATE TABLE safe_table (id INTEGER PRIMARY KEY, value TEXT);`);

        assert.equal(columnExists(db, 'safe_table', 'value'), true, 'safe identifiers should still work');
        assert.equal(columnExists(db, 'safe_table; DROP TABLE safe_table;--', 'value'), false, 'unsafe identifiers should be rejected');

        db.close();
        pass('trace-migration-safe-identifier');
    });

    it('applyMigrations is idempotent on an already migrated DB', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { applyMigrations } = await import(relUrl('plugin', 'lib', 'migrations.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        const schema = fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8');
        db.exec(schema);

        const first = applyMigrations(db);
        const second = applyMigrations(db);

        assert.equal(first.currentVersion, 4, 'first run should converge to schema version 4');
        assert.equal(second.currentVersion, 4, 'second run should stay at schema version 4');
        assert.deepEqual(second.applied, [], 'second run should not apply any new migrations');
        assert.deepEqual(second.pending, [], 'second run should have no pending migrations');

        db.close();
        pass('trace-migration-idempotent');
    });

    it('refreshProjectRetrievalIndex builds a curated FTS5 index with scientific-term coverage', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { applyMigrations } = await import(relUrl('plugin', 'lib', 'migrations.js'));
        const { refreshProjectRetrievalIndex, vecSearch } = await import(relUrl('plugin', 'lib', 'vec-search.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));
        applyMigrations(db);

        const projectPath = '/tmp/trace-fts-project';
        db.prepare(`
            INSERT INTO sessions (id, project_path, started_at, ended_at, narrative_summary)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            'session-fts-1',
            projectPath,
            new Date('2026-03-24T09:00:00Z').toISOString(),
            new Date('2026-03-24T10:00:00Z').toISOString(),
            'CRISPR-Cas9 confounder harness survived scRNA-seq review; IL-6 and p-value handling were central findings.'
        );

        db.prepare(`
            INSERT INTO spine_entries
                (session_id, timestamp, action_type, tool_name, input_summary, output_summary, agent_role, gate_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            'session-fts-1',
            new Date('2026-03-24T09:30:00Z').toISOString(),
            'BUG_FIX',
            'Edit',
            'Fix CRISPR-Cas9 tokenizer issue',
            'Updated scRNA-seq and IL-6 retrieval handling after p-value review.',
            'researcher',
            null
        );

        db.prepare(`
            INSERT INTO spine_entries
                (session_id, timestamp, action_type, tool_name, input_summary, output_summary, agent_role, gate_result)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            'session-fts-1',
            new Date('2026-03-24T09:35:00Z').toISOString(),
            'DATA_LOAD',
            'Read',
            'Low signal row that should stay out of the curated index',
            'Loaded CSV only.',
            'researcher',
            null
        );

        const sync = refreshProjectRetrievalIndex(db, projectPath);
        assert.equal(sync.available, true, 'FTS5 index should be available');
        assert.equal(sync.indexed, 2, 'only narrative summary + one high-signal spine entry should be indexed');

        const results = vecSearch(db, 'CRISPR-Cas9 scRNA-seq IL-6 p-value confounder', {
            project_path: projectPath,
            limit: 5,
            maxTokens: 1000,
        });

        assert.ok(results.length >= 1, 'retrieval should return at least one indexed memory');
        assert.ok(results.some(result => result.metadata?.retrieval_tier === 'fts5'), 'Tier 0 FTS5 should serve the query');
        assert.ok(results.some(result => /CRISPR-Cas9|scRNA-seq|IL-6|p-value/i.test(result.text)), 'scientific compound terms should survive tokenization');
        assert.ok(results.every(result => !/Low signal row/i.test(result.text)), 'low-signal DATA_LOAD entries should not be indexed');

        db.close();
        pass('trace-fts-curated-index');
    });

    it('truncateIndexText caps indexed entries at 2000 characters with a marker', async () => {
        const { INDEX_TEXT_CHAR_LIMIT, truncateIndexText } = await import(relUrl('plugin', 'lib', 'vec-search.js'));
        const longText = `confounder ${'x'.repeat(2500)}`;
        const truncated = truncateIndexText(longText);
        assert.ok(truncated.length <= INDEX_TEXT_CHAR_LIMIT, 'indexed text should respect the cap');
        assert.match(truncated, /\[\.\.\.\]$/, 'truncated entries should carry a marker');
        pass('trace-fts-cap');
    });

    it('vecSearch falls back to memory_embeddings when FTS is unavailable', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { vecSearch } = await import(relUrl('plugin', 'lib', 'vec-search.js'));

        const db = new Database(':memory:');
        db.exec(`
            CREATE TABLE memory_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                text TEXT NOT NULL,
                embedding BLOB NOT NULL,
                metadata TEXT,
                project_path TEXT,
                created_at TEXT NOT NULL
            );
        `);

        db.prepare(`
            INSERT INTO memory_embeddings (text, embedding, metadata, project_path, created_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            'Confounder harness fallback memory',
            Buffer.from(new Float32Array([1, 0, 0, 0]).buffer),
            JSON.stringify({ source: 'memory_embeddings-test' }),
            '/tmp/fallback-project',
            new Date().toISOString()
        );

        db.exec(`DROP TABLE IF EXISTS memory_fts`);

        const results = vecSearch(db, 'irrelevant lexical query', {
            project_path: '/tmp/fallback-project',
            limit: 3,
            maxTokens: 1000,
            queryEmbedding: new Float32Array([1, 0, 0, 0]),
        });

        assert.equal(results.length, 1, 'memory_embeddings vector fallback should return the stored row');
        assert.equal(results[0].metadata?.retrieval_tier, 'vector-fallback');

        db.close();
        pass('trace-vector-fallback');
    });

    it('parseStructuredBlocks parses canonical vibe-claim blocks', async () => {
        const { parseStructuredBlocks } = await import(relUrl('plugin', 'lib', 'structured-block-parser.js'));

        const text = [
            '## CLAIM-LEDGER',
            '```vibe-claim',
            'id: C-003',
            'event_type: CREATED',
            'confidence: 0.72',
            'confounder_status: PENDING',
            'narrative: GC content signal needs matching',
            '```',
        ].join('\n');

        const result = parseStructuredBlocks(text, { allowedTypes: ['claim'] });
        assert.equal(result.blocks.length, 1, 'should parse one structured block');
        assert.equal(result.blocks[0].type, 'claim');
        assert.equal(result.blocks[0].data.id, 'C-003');
        assert.equal(result.blocks[0].data.event_type, 'CREATED');
        assert.equal(result.blocks[0].data.confidence, 0.72);
        assert.equal(result.blocks[0].warnings.length, 0, 'canonical tag should not emit warnings');
        pass('trace-structured-canonical');
    });

    it('parseStructuredBlocks accepts alias tags with warning', async () => {
        const { parseStructuredBlocks } = await import(relUrl('plugin', 'lib', 'structured-block-parser.js'));

        const text = [
            '```claim',
            'id: C-010',
            'event: PROMOTED',
            'narrative: promoted after review',
            '```',
        ].join('\n');

        const result = parseStructuredBlocks(text, { allowedTypes: ['claim'] });
        assert.equal(result.blocks.length, 1, 'alias claim block should still parse');
        assert.equal(result.blocks[0].canonicalTag, 'vibe-claim');
        assert.equal(result.blocks[0].data.event_type, 'PROMOTED');
        assert.ok(
            result.warnings.some(w => w.includes('Alias tag "claim" accepted')),
            `Expected alias warning, got: ${result.warnings.join(' | ')}`
        );
        pass('trace-structured-alias');
    });

    it('parseStructuredBlock degrades gracefully on malformed YAML', async () => {
        const { parseStructuredBlock } = await import(relUrl('plugin', 'lib', 'structured-block-parser.js'));

        const parsed = parseStructuredBlock('vibe-claim', [
            'id: C-011',
            'event_type: CREATED',
            '  bad-indented-line',
        ].join('\n'));

        assert.equal(parsed.type, 'claim');
        assert.equal(parsed.data, null, 'malformed YAML should not produce normalized data');
        assert.ok(parsed.error, 'malformed YAML should surface an error');
        assert.ok(
            parsed.warnings.some(w => w.includes('YAML malformed')),
            `Expected YAML malformed warning, got: ${parsed.warnings.join(' | ')}`
        );
        pass('trace-structured-malformed');
    });

    it('parseStructuredBlocks does not terminate on inline triple backticks inside values', async () => {
        const { parseStructuredBlocks } = await import(relUrl('plugin', 'lib', 'structured-block-parser.js'));

        const text = [
            '```vibe-claim',
            "id: C-1001",
            "narrative: Example code is ```python print('hello') ``` and should stay inline",
            'event_type: CREATED',
            '```',
        ].join('\n');

        const result = parseStructuredBlocks(text, { allowedTypes: ['claim'] });
        assert.equal(result.blocks.length, 1, 'should parse one block');
        assert.equal(result.blocks[0].data.id, 'C-1001');
        assert.ok(result.blocks[0].data.narrative.includes("```python print('hello') ```"));
        pass('trace-structured-inline-backticks');
    });

    it('ingestClaimEvents persists structured claim blocks', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestClaimEvents } = await import(relUrl('plugin', 'lib', 'claim-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'claim-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        const result = ingestClaimEvents(db, {
            sessionId,
            filePath: 'CLAIM-LEDGER.md',
            content: [
                '```vibe-claim',
                'id: C-021',
                'event_type: CREATED',
                'confidence: 0.66',
                'narrative: structured claim from TRACE',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT * FROM claim_events WHERE claim_id = 'C-021'`).get();
        assert.equal(result.inserted, 1, 'one claim event should be inserted');
        assert.equal(row.event_type, 'CREATED');
        assert.equal(row.confidence, 0.66);
        db.close();
        pass('trace-ingest-claim');
    });

    it('ingestClaimEvents supports compact claim IDs beyond 999', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestClaimEvents, normalizeClaimId } = await import(relUrl('plugin', 'lib', 'claim-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'claim-large-id-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        assert.equal(normalizeClaimId('C1234'), 'C-1234');

        const result = ingestClaimEvents(db, {
            sessionId,
            filePath: 'CLAIM-LEDGER.md',
            content: [
                '```vibe-claim',
                'id: C-1234',
                'event_type: CREATED',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT * FROM claim_events WHERE claim_id = 'C-1234'`).get();
        assert.equal(result.inserted, 1, 'large compact claim IDs should ingest');
        assert.equal(row.claim_id, 'C-1234');
        db.close();
        pass('trace-ingest-claim-large-id');
    });

    it('ingestSerendipitySeeds persists source_claim_id-aware seeds', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestSerendipitySeeds } = await import(relUrl('plugin', 'lib', 'seed-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'seed-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        const result = ingestSerendipitySeeds(db, {
            sessionId,
            filePath: 'SERENDIPITY.md',
            content: [
                '```vibe-seed',
                'seed_id: S-101',
                'source: SALVAGED_FROM_R2',
                'source_claim_id: C-021',
                'score: 14',
                'causal_question: Does the signal survive matching?',
                'discriminating_test: propensity matching rerun',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT * FROM serendipity_seeds WHERE seed_id = 'S-101'`).get();
        assert.equal(result.inserted, 1, 'one seed should be inserted');
        assert.equal(row.source_claim_id, 'C-021');
        assert.equal(row.source, 'SALVAGED_FROM_R2');
        db.close();
        pass('trace-ingest-seed');
    });

    it('ingestSerendipitySeeds deduplicates freeform and structured representations', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestSerendipitySeeds } = await import(relUrl('plugin', 'lib', 'seed-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'seed-dedupe-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        ingestSerendipitySeeds(db, {
            sessionId,
            filePath: 'SERENDIPITY.md',
            content: [
                'source: SALVAGED_FROM_R2',
                'source_claim_id: C-021',
                'causal_question: Does the signal survive matching?',
                'discriminating_test: propensity matching rerun',
            ].join('\n')
        });

        ingestSerendipitySeeds(db, {
            sessionId,
            filePath: 'SERENDIPITY.md',
            content: [
                '```vibe-seed',
                'source: SALVAGED_FROM_R2',
                'source_claim_id: C-021',
                'causal_question: Does the signal survive matching?',
                'discriminating_test: propensity matching rerun',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT COUNT(*) AS n FROM serendipity_seeds`).get();
        assert.equal(row.n, 1, 'same seed should upsert rather than duplicate');
        db.close();
        pass('trace-ingest-seed-dedupe');
    });

    it('ingestR2Reviews persists structured review artifacts', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestR2Reviews } = await import(relUrl('plugin', 'lib', 'r2-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'review-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        const result = ingestR2Reviews(db, {
            sessionId,
            filePath: '05-reviewer2/structured/review.md',
            content: [
                '```vibe-review',
                'review_id: REV-001',
                'review_mode: FORCED',
                'claims_reviewed: [C-021, C-022]',
                'j0_score: 4',
                'sfi_injected: 2',
                'sfi_caught: 2',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT * FROM r2_reviews WHERE review_id = 'REV-001'`).get();
        assert.equal(result.inserted, 1, 'one review should be inserted');
        assert.equal(row.review_mode, 'FORCED');
        assert.equal(row.claims_reviewed, '["C-021","C-022"]');
        db.close();
        pass('trace-ingest-review');
    });

    it('ingestR2Reviews deduplicates freeform and structured representations', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestR2Reviews } = await import(relUrl('plugin', 'lib', 'r2-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'review-dedupe-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        ingestR2Reviews(db, {
            sessionId,
            filePath: '05-reviewer2/review.md',
            content: [
                'R2 review complete',
                'claims_reviewed: [C-021, C-022]',
                'j0_score: 4',
                'sfi_injected: 2',
                'sfi_caught: 2',
            ].join('\n')
        });

        ingestR2Reviews(db, {
            sessionId,
            filePath: '05-reviewer2/review.md',
            content: [
                '```vibe-review',
                'review_mode: INLINE',
                'claims_reviewed: [C-021, C-022]',
                'j0_score: 4',
                'sfi_injected: 2',
                'sfi_caught: 2',
                '```',
            ].join('\n')
        });

        const row = db.prepare(`SELECT COUNT(*) AS n FROM r2_reviews`).get();
        assert.equal(row.n, 1, 'same review should upsert rather than duplicate');
        db.close();
        pass('trace-ingest-review-dedupe');
    });

    it('ingestR2Reviews ignores generic review/report filenames outside the R2 scope', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { ingestR2Reviews } = await import(relUrl('plugin', 'lib', 'r2-ingestion.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'review-routing-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        const result = ingestR2Reviews(db, {
            sessionId,
            filePath: 'notes/literature-review-notes.md',
            content: 'review complete\nj0_score: 4\nweakness: none'
        });

        const row = db.prepare(`SELECT COUNT(*) AS n FROM r2_reviews`).get();
        assert.equal(result.inserted, 0, 'generic literature review notes should not be treated as R2 reviews');
        assert.equal(row.n, 0);
        db.close();
        pass('trace-ingest-review-routing');
    });

    it('citation_checks table exposes TRACE citation fields', async () => {
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(':memory:');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const info = db.prepare(`PRAGMA table_info(citation_checks)`).all();
        const columns = info.map(column => column.name);
        for (const expected of [
            'citation_id', 'claim_id', 'raw_ref', 'doi', 'pmid', 'arxiv_id',
            'verification_method', 'resolved_title', 'resolved_source_type',
            'retraction_status', 'http_status',
        ]) {
            assert.ok(columns.includes(expected), `Missing citation_checks column: ${expected}`);
        }

        db.close();
        pass('trace-citation-schema-columns');
    });

    it('extractCitationsFromEvent deduplicates DOI URL/plain DOI and links them to the claim', async () => {
        const { extractCitationsFromEvent } = await import(relUrl('plugin', 'lib', 'citation-extractor.js'));

        const result = extractCitationsFromEvent({
            session_id: 'citation-session',
            tool_name: 'Write',
            tool_input: {
                file_path: 'CLAIM-LEDGER.md',
                content: [
                    '```vibe-claim',
                    'id: C-210',
                    'event_type: CREATED',
                    'narrative: See doi:10.1038/nature12373 and https://doi.org/10.1038/nature12373',
                    '```',
                    'PMID: 12345678',
                    'arXiv:2401.01234',
                ].join('\n'),
            },
            tool_response: '',
        });

        assert.equal(result.claimId, 'C-210');
        assert.equal(result.citations.length, 3, 'DOI/plain DOI should dedupe while PMID and arXiv remain distinct');
        assert.ok(result.citations.every(citation => citation.claim_id === 'C-210'));
        assert.ok(result.citations.some(citation => citation.citation_type === 'DOI' && citation.doi === '10.1038/nature12373'));
        assert.ok(result.citations.some(citation => citation.citation_type === 'PMID' && citation.pmid === '12345678'));
        assert.ok(result.citations.some(citation => citation.citation_type === 'ARXIV' && citation.arxiv_id === '2401.01234'));
        pass('trace-citation-extract-dedupe');
    });

    it('extractCitationsFromText keeps citation identity distinct across different claims in the same session', async () => {
        const { extractCitationsFromText } = await import(relUrl('plugin', 'lib', 'citation-extractor.js'));

        const first = extractCitationsFromText('10.1038/nature12373', {
            sessionId: 'citation-stable-session',
            claimId: 'C-210',
            sourceLabel: 'output',
        });
        const second = extractCitationsFromText('10.1038/nature12373', {
            sessionId: 'citation-stable-session',
            claimId: 'C-211',
            sourceLabel: 'content',
        });

        assert.equal(first.length, 1);
        assert.equal(second.length, 1);
        assert.notEqual(first[0].citation_id, second[0].citation_id, 'per-claim citation tracking should not collapse shared papers into one row');
        assert.equal(first[0].claim_id, 'C-210');
        assert.equal(second[0].claim_id, 'C-211');
        pass('trace-citation-identity-by-claim');
    });

    it('upsertCitationCheck preserves VERIFIED status across repeated extraction', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { upsertCitationCheck, updateCitationVerification } = await import(relUrl('plugin', 'lib', 'db.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'citation-upsert-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        upsertCitationCheck(db, {
            citation_id: 'CIT-001',
            session_id: sessionId,
            claim_id: 'C-021',
            raw_ref: '10.1038/nature12373',
            citation_type: 'DOI',
            normalized_id: '10.1038/nature12373',
            doi: '10.1038/nature12373',
            verification_status: 'PENDING',
        });

        updateCitationVerification(db, 'CIT-001', {
            verification_status: 'VERIFIED',
            verification_method: 'web_fetch',
            resolver: 'DOI_ORG',
            resolved_title: 'Test title',
            http_status: 200,
        });

        upsertCitationCheck(db, {
            citation_id: 'CIT-001',
            session_id: sessionId,
            claim_id: 'C-021',
            raw_ref: 'https://doi.org/10.1038/nature12373',
            citation_type: 'DOI',
            normalized_id: '10.1038/nature12373',
            doi: '10.1038/nature12373',
            verification_status: 'PENDING',
        });

        const row = db.prepare(`SELECT verification_status, resolved_title FROM citation_checks WHERE citation_id = 'CIT-001'`).get();
        assert.equal(row.verification_status, 'VERIFIED');
        assert.equal(row.resolved_title, 'Test title');

        db.close();
        pass('trace-citation-upsert-preserve-verified');
    });

    it('verifyCitation resolves DOI metadata through a mocked doi.org response', async () => {
        const { verifyCitation } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        const calls = [];
        const result = await verifyCitation({
            citation_id: 'CIT-DOI-001',
            citation_type: 'DOI',
            doi: '10.1038/nature12373',
            source_url: 'https://doi.org/10.1038/nature12373',
        }, {
            timeoutMs: 1000,
            fetchImpl: async (url) => {
                calls.push(url);
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { title: 'A famous DOI', type: 'journal-article' };
                    },
                };
            },
        });

        assert.equal(calls.length, 1, 'doi.org success should not fall through to Crossref');
        assert.equal(result.verification_status, 'VERIFIED');
        assert.equal(result.resolver, 'DOI_ORG');
        assert.equal(result.resolved_title, 'A famous DOI');
        pass('trace-citation-engine-doi');
    });

    it('verifyCitation preserves DOI path slashes when building resolver URLs', async () => {
        const { verifyCitation } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        const urls = [];
        await verifyCitation({
            citation_id: 'CIT-DOI-URLS',
            citation_type: 'DOI',
            doi: '10.1038/nature12373',
            source_url: 'https://doi.org/10.1038/nature12373',
        }, {
            timeoutMs: 1000,
            fetchImpl: async (url) => {
                urls.push(url);
                return { ok: false, status: 404, async json() { return {}; } };
            },
        });

        assert.deepEqual(urls, [
            'https://doi.org/10.1038/nature12373',
            'https://api.crossref.org/works/10.1038/nature12373',
        ]);
        pass('trace-citation-doi-path-encoding');
    });

    it('verifyCitation does not mark retraction-themed titles as RETRACTED without explicit metadata', async () => {
        const { verifyCitation } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        const responses = [
            { ok: false, status: 404 },
            {
                ok: true,
                status: 200,
                async json() {
                    return {
                        message: {
                            title: ['Retraction and republication: a new tool for correcting the scientific record'],
                            type: 'journal-article',
                        },
                    };
                },
            },
        ];

        const result = await verifyCitation({
            citation_id: 'CIT-DOI-RETRACTION-TITLE',
            citation_type: 'DOI',
            doi: '10.1016/j.ejphar.2015.03.026',
            source_url: 'https://doi.org/10.1016/j.ejphar.2015.03.026',
        }, {
            timeoutMs: 1000,
            fetchImpl: async () => responses.shift(),
        });

        assert.equal(result.verification_status, 'VERIFIED');
        assert.equal(result.retraction_status, 'CLEAR');
        pass('trace-citation-retraction-false-positive');
    });

    it('verifyCitation marks explicit Crossref retraction relations as RETRACTED', async () => {
        const { verifyCitation } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        const responses = [
            { ok: false, status: 404 },
            {
                ok: true,
                status: 200,
                async json() {
                    return {
                        message: {
                            title: ['A paper with explicit retraction metadata'],
                            type: 'journal-article',
                            relation: {
                                'is-retracted-by': [{ id: '10.1000/retraction-notice' }],
                            },
                        },
                    };
                },
            },
        ];

        const result = await verifyCitation({
            citation_id: 'CIT-DOI-RETRACTED',
            citation_type: 'DOI',
            doi: '10.1000/retracted-paper',
            source_url: 'https://doi.org/10.1000/retracted-paper',
        }, {
            timeoutMs: 1000,
            fetchImpl: async () => responses.shift(),
        });

        assert.equal(result.verification_status, 'RETRACTED');
        assert.equal(result.retraction_status, 'RETRACTED');
        pass('trace-citation-retraction-crossref');
    });

    it('verifyCitationsQuick attempts at most three sync verifications per event', async () => {
        const { verifyCitationsQuick } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        let fetchCount = 0;
        const citations = Array.from({ length: 5 }, (_, index) => ({
            citation_id: `CIT-${index + 1}`,
            citation_type: 'DOI',
            doi: `10.1000/test-${index + 1}`,
            source_url: `https://doi.org/10.1000/test-${index + 1}`,
        }));

        const result = await verifyCitationsQuick(citations, {
            requestTimeoutMs: 1000,
            eventBudgetMs: 5000,
            maxSyncAttempts: 3,
            fetchImpl: async () => {
                fetchCount++;
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { title: 'Bounded DOI', type: 'journal-article' };
                    },
                };
            },
        });

        assert.equal(result.attempted, 3);
        assert.equal(fetchCount, 3);
        assert.equal(result.results.length, 3);
        pass('trace-citation-engine-bounded');
    });

    it('runFetchSpike falls back to GET when doi.org rejects HEAD', async () => {
        const { runFetchSpike } = await import(relUrl('plugin', 'lib', 'citation-engine.js'));

        const methods = [];
        const result = await runFetchSpike({
            timeoutMs: 1000,
            fetchImpl: async (_url, init = {}) => {
                methods.push(init.method || 'GET');
                if ((init.method || 'GET') === 'HEAD') {
                    return { ok: false, status: 405 };
                }
                return { ok: true, status: 200 };
            },
        });

        assert.deepEqual(methods, ['HEAD', 'GET']);
        assert.equal(result.ok, true);
        assert.equal(result.status, 200);
        pass('trace-citation-spike-fallback');
    });

    it('citation validity gates distinguish L0 unresolved blockers from D1 pending blockers', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { upsertCitationCheck } = await import(relUrl('plugin', 'lib', 'db.js'));
        const { checkSourceValidityGate, checkClaimPromotionSources } = await import(relUrl('plugin', 'lib', 'gate-engine.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'citation-gates-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        upsertCitationCheck(db, {
            citation_id: 'CIT-L0',
            session_id: sessionId,
            claim_id: 'C-301',
            raw_ref: '10.1000/unresolved',
            citation_type: 'DOI',
            normalized_id: '10.1000/unresolved',
            doi: '10.1000/unresolved',
            verification_status: 'UNRESOLVED',
        });
        upsertCitationCheck(db, {
            citation_id: 'CIT-D1',
            session_id: sessionId,
            claim_id: 'C-302',
            raw_ref: '10.1000/pending',
            citation_type: 'DOI',
            normalized_id: '10.1000/pending',
            doi: '10.1000/pending',
            verification_status: 'PENDING',
        });

        const l0 = checkSourceValidityGate(db, { sessionId, claimId: 'C-301' });
        const d1 = checkClaimPromotionSources(db, { sessionId, claimId: 'C-302' });

        assert.equal(l0.pass, false, 'L0 should block UNRESOLVED citations');
        assert.equal(d1.pass, false, 'D1 should block PENDING citations');
        assert.equal(l0.blockers[0].verification_status, 'UNRESOLVED');
        assert.equal(d1.blockers[0].verification_status, 'PENDING');

        db.close();
        pass('trace-citation-gates');
    });

    it('citation validity gates allow zero citations at L0 but block promotion at D1', async () => {
        const Database = (await import('better-sqlite3')).default;
        const { checkSourceValidityGate, checkClaimPromotionSources } = await import(relUrl('plugin', 'lib', 'gate-engine.js'));

        const db = new Database(':memory:');
        db.pragma('foreign_keys = ON');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'citation-zero-session';
        db.prepare(`INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)`)
            .run(sessionId, '/tmp/test', new Date().toISOString());

        const l0 = checkSourceValidityGate(db, { sessionId, claimId: 'C-401' });
        const d1 = checkClaimPromotionSources(db, { sessionId, claimId: 'C-401' });

        assert.equal(l0.pass, true, 'L0 should not invent blockers when no citations are tracked');
        assert.equal(l0.count, 0);
        assert.equal(d1.pass, false, 'D1 should block promotion without any citations');
        assert.equal(d1.reason, 'NO_CITATIONS');

        db.close();
        pass('trace-citation-zero-citation-policy');
    });

    // --- Regression: DQ4-only is sufficient for claim gate (DC0 removed from runtime base) ---
    it('claim gate passes with only session-scoped DQ4 (DC0 not required at runtime)', async () => {
        const { checkClaimGates } = await import(relUrl('plugin', 'lib', 'gate-engine.js'));
        const Database = (await import('better-sqlite3')).default;
        const db = new Database(':memory:');
        db.exec(fs.readFileSync(rel('plugin', 'db', 'schema.sql'), 'utf-8'));

        const sessionId = 'sess-dq4-only';
        db.prepare('INSERT INTO sessions (id, project_path, started_at) VALUES (?, ?, ?)')
            .run(sessionId, '/tmp/test', new Date().toISOString());
        db.prepare("INSERT INTO gate_checks (session_id, gate_id, claim_id, status, checks_passed, timestamp) VALUES (?, 'DQ4', NULL, 'PASS', 1, ?)")
            .run(sessionId, new Date().toISOString());

        const result = checkClaimGates(db, 'C-001', sessionId);
        assert.equal(result.pass, true, 'DQ4-only should be sufficient for base claim gate (DC0 removed from runtime)');
        db.close();
        pass('trace-claim-gate-dq4-only');
    });

    // --- Regression: multi-claim citation attribution ---
    it('extractCitationsFromEvent attributes DOIs to correct claims in MultiEdit', async () => {
        const { extractCitationsFromEvent } = await import(relUrl('plugin', 'lib', 'citation-extractor.js'));
        const event = {
            session_id: 'sess-multi-attr',
            tool_name: 'MultiEdit',
            tool_input: {
                file_path: 'CLAIM-LEDGER.md',
                edits: [
                    { new_string: '```vibe-claim\nid: C-001\nevent_type: CREATED\nnarrative: alpha\n```\n10.1000/alpha' },
                    { new_string: '```vibe-claim\nid: C-002\nevent_type: CREATED\nnarrative: beta\n```\n10.1000/beta' }
                ]
            },
            tool_response: ''
        };

        const out = extractCitationsFromEvent(event);
        const alpha = out.citations.find(c => c.normalized_id === '10.1000/alpha');
        const beta = out.citations.find(c => c.normalized_id === '10.1000/beta');

        assert.ok(alpha, 'alpha DOI should be extracted');
        assert.ok(beta, 'beta DOI should be extracted');
        assert.equal(alpha.claim_id, 'C-001', 'alpha DOI should be attributed to C-001');
        assert.equal(beta.claim_id, 'C-002', 'beta DOI should be attributed to C-002');
        pass('trace-multi-claim-citation-attribution');
    });
});

// =====================================================
// Final summary (runs after all tests complete)
// =====================================================

describe('Summary', () => {
    it('print final pass/fail counts', () => {
        // This test always passes — it just prints the summary
        pass('summary');
        console.log('\n========================================');
        console.log(`  E2E Test Summary`);
        console.log(`  Tracked pass: ${passCount}`);
        console.log(`  Tracked fail: ${failCount}`);
        console.log('========================================\n');
        assert.ok(true);
    });
});
