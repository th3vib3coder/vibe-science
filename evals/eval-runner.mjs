#!/usr/bin/env node
/**
 * Vibe Science TRACE — Eval Runner
 *
 * Current v7 scope:
 *   1. validate eval case YAML definitions
 *   2. always emit a JSON artifact
 *   3. optionally record per-case results into benchmark_runs
 *
 * This runner is intentionally honest: until the behavioral hook harness
 * lands, results are recorded as schema_validation_only.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const CASES_DIR = path.join(__dirname, 'cases');
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');
const PKG_PATH = path.join(ROOT, 'package.json');

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
    const runId = args.runId || buildRunId();
    const skillVersion = args.version || pkg.version || '0.0.0';

    const yamlFiles = findYamlFiles(CASES_DIR);
    const cases = [];
    let passCount = 0;
    let failCount = 0;

    for (const filePath of yamlFiles) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const startedAt = Date.now();
        const parsed = parseSimpleYaml(raw);
        const errors = validateCase(parsed);
        const passed = errors.length === 0;
        const executionTimeMs = Date.now() - startedAt;

        if (passed) passCount++;
        else failCount++;

        cases.push({
            file: path.relative(CASES_DIR, filePath),
            id: parsed.id || null,
            name: parsed.name || null,
            category: parsed.category || 'unknown',
            passed,
            mode: 'schema_validation_only',
            execution_time_ms: executionTimeMs,
            errors,
            expected_markers: Array.isArray(parsed.expected_markers) ? parsed.expected_markers : [],
            expected_absent_markers: Array.isArray(parsed.expected_absent_markers) ? parsed.expected_absent_markers : [],
        });
    }

    const artifact = {
        run_id: runId,
        generated_at: new Date().toISOString(),
        skill_version: skillVersion,
        mode: 'schema_validation_only',
        total: cases.length,
        passed: passCount,
        failed: failCount,
        db_recorded: false,
        db_path: args.dbPath || null,
        cases,
    };

    fs.mkdirSync(path.dirname(args.artifactPath), { recursive: true });
    fs.writeFileSync(args.artifactPath, JSON.stringify(artifact, null, 2), 'utf-8');

    if (args.record) {
        const recording = await recordCasesToDb(cases, {
            runId,
            skillVersion,
            dbPath: args.dbPath,
            artifactPath: args.artifactPath,
        });
        artifact.db_recorded = recording.recorded;
        artifact.db_path = recording.dbPath;
        artifact.record_error = recording.error || null;
        fs.writeFileSync(args.artifactPath, JSON.stringify(artifact, null, 2), 'utf-8');
    }

    printSummary({
        runId,
        artifactPath: args.artifactPath,
        total: cases.length,
        passed: passCount,
        failed: failCount,
        recorded: artifact.db_recorded,
        dbPath: artifact.db_path,
    });

    process.exit(failCount > 0 ? 1 : 0);
}

function parseArgs(argv) {
    const args = {
        record: false,
        dbPath: null,
        version: null,
        runId: null,
        artifactPath: defaultArtifactPath(),
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--record') {
            args.record = true;
            continue;
        }
        if (arg === '--db' && argv[i + 1]) {
            args.dbPath = argv[++i];
            continue;
        }
        if (arg === '--version' && argv[i + 1]) {
            args.version = argv[++i];
            continue;
        }
        if (arg === '--run-id' && argv[i + 1]) {
            args.runId = argv[++i];
            continue;
        }
        if (arg === '--artifact' && argv[i + 1]) {
            args.artifactPath = path.resolve(argv[++i]);
            continue;
        }
    }

    return args;
}

function defaultArtifactPath() {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(ARTIFACTS_DIR, `eval-run-${stamp}.json`);
}

function buildRunId() {
    return `eval-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

function parseSimpleYaml(text) {
    const result = {};
    const lines = text.split(/\r?\n/);
    let currentListKey = null;

    for (const raw of lines) {
        const line = raw.replace(/\s+#.*$/, '');
        if (line.trim() === '' || line.trim().startsWith('#')) continue;

        const listMatch = line.match(/^\s+-\s+(.*)/);
        if (listMatch && currentListKey) {
            result[currentListKey].push(stripQuotes(listMatch[1].trim()));
            continue;
        }

        const kvMatch = line.match(/^(\w[\w_-]*)\s*:\s*(.*)/);
        if (kvMatch) {
            const key = kvMatch[1].trim();
            let value = kvMatch[2].trim();

            if (value === '' || value === '|' || value === '>') {
                currentListKey = key;
                result[key] = [];
                continue;
            }

            currentListKey = null;
            result[key] = stripQuotes(value);
        }
    }

    return result;
}

function stripQuotes(value) {
    if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
    ) {
        return value.slice(1, -1);
    }
    return value;
}

function findYamlFiles(dir) {
    const results = [];
    let entries = [];
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
        return results;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...findYamlFiles(fullPath));
        } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
            results.push(fullPath);
        }
    }

    return results.sort();
}

function validateCase(parsed) {
    const errors = [];
    for (const field of ['id', 'name', 'category', 'prompt']) {
        if (!(field in parsed) || parsed[field] === '' || parsed[field] === undefined) {
            errors.push(`missing required field: "${field}"`);
        }
    }

    const hasMarkers = Array.isArray(parsed.expected_markers) && parsed.expected_markers.length > 0;
    const hasAbsentMarkers = Array.isArray(parsed.expected_absent_markers) && parsed.expected_absent_markers.length > 0;

    if (!hasMarkers && !hasAbsentMarkers) {
        errors.push('must have at least one of "expected_markers" or "expected_absent_markers" (non-empty list)');
    }

    return errors;
}

async function recordCasesToDb(cases, options) {
    try {
        const dbMod = await import(pathToModule('plugin/lib/db.js'));
        const benchMod = await import(pathToModule('plugin/lib/benchmark-reporter.js'));
        const migMod = await import(pathToModule('plugin/lib/migrations.js'));

        const db = dbMod.openDB(options.dbPath || undefined);
        dbMod.initDB(db);
        migMod.applyMigrations(db);

        for (const evalCase of cases) {
            benchMod.recordBenchmark(db, {
                run_id: options.runId,
                skill_version: options.skillVersion,
                eval_case: evalCase.id || evalCase.file,
                category: evalCase.category,
                passed: evalCase.passed,
                execution_time_ms: evalCase.execution_time_ms,
                notes: `mode=schema_validation_only; artifact=${options.artifactPath}; file=${evalCase.file}${evalCase.errors.length ? `; errors=${evalCase.errors.join(' | ')}` : ''}`,
            });
        }

        dbMod.closeDB(db);
        return { recorded: true, dbPath: options.dbPath || dbMod.DEFAULT_DB_PATH };
    } catch (error) {
        const baseMessage = error.message || 'DB recording failed';
        return {
            recorded: false,
            dbPath: options.dbPath || null,
            error: `${baseMessage}. Ensure better-sqlite3 is installed and its native bindings are available (for example: npm install, then rebuild native deps if needed).`,
        };
    }
}

function printSummary(summary) {
    console.log('\n========================================');
    console.log('  TRACE Eval Runner');
    console.log(`  Run ID      : ${summary.runId}`);
    console.log(`  Cases found : ${summary.total}`);
    console.log(`  Passed      : ${summary.passed}`);
    console.log(`  Failed      : ${summary.failed}`);
    console.log(`  Artifact    : ${summary.artifactPath}`);
    console.log(`  DB recorded : ${summary.recorded ? 'yes' : 'no'}`);
    if (summary.dbPath) {
        console.log(`  DB path     : ${summary.dbPath}`);
    }
    console.log('========================================\n');
}

function pathToModule(relativePath) {
    const fullPath = path.join(ROOT, relativePath);
    return pathToFileURL(fullPath).href;
}

main().catch(error => {
    process.stderr.write(`Eval runner failed: ${error.message}\n`);
    process.exit(1);
});
