#!/usr/bin/env node
/**
 * Vibe Science TRACE readiness gate.
 *
 * Runs the main checks required before declaring the current tree
 * ready for the current TRACE release.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_VERSION = '6.0.0';
const CANDIDATE_VERSION = '7.0.0';
const BASELINE_ARTIFACT = path.join(ROOT, 'evals', 'baselines', 'v6.0.0-schema-baseline.json');
const E2E_TIMEOUT_MS = 240000;

async function main() {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-trace-readiness-'));
    const artifactCandidate = path.join(tempRoot, 'candidate.json');
    const dbPath = path.join(tempRoot, 'readiness.db');

    const checks = [];

    checks.push(runCheck(
        'e2e-suite',
        spawnSync(process.execPath, ['--test', '__test_e2e.mjs'], {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: E2E_TIMEOUT_MS,
        }),
        [],
    ));

    checks.push(runCheck(
        'eval-baseline-record',
        await recordBaselineArtifactCheck(BASELINE_ARTIFACT, dbPath, BASELINE_VERSION),
        [BASELINE_ARTIFACT],
    ));

    checks.push(runCheck(
        'eval-candidate-record',
        spawnSync(process.execPath, ['evals/eval-runner.mjs', '--artifact', artifactCandidate, '--record', '--db', dbPath, '--version', CANDIDATE_VERSION], {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: 120000,
        }),
        [artifactCandidate],
    ));

    const comparisonCheck = await buildComparisonCheck(dbPath, BASELINE_VERSION, CANDIDATE_VERSION);
    checks.push(comparisonCheck);

    checks.push(runCheck(
        'smoke-trace',
        spawnSync(process.execPath, ['evals/smoke-trace.mjs'], {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: 120000,
        }),
        ['"ok": true'],
    ));

    const summary = {
        generated_at: new Date().toISOString(),
        ok: checks.every(check => check.pass),
        checks,
        artifacts: {
            baseline: BASELINE_ARTIFACT,
            baseline_snapshot: BASELINE_ARTIFACT,
            candidate: artifactCandidate,
            benchmark_db: dbPath,
        },
        comparison: comparisonCheck.comparison ?? null,
    };

    console.log('\n========================================');
    console.log('  TRACE Readiness');
    for (const check of checks) {
        console.log(`  ${check.pass ? 'PASS' : 'FAIL'}  ${check.name}`);
    }
    console.log('========================================\n');
    console.log(JSON.stringify(summary, null, 2));

    process.exit(summary.ok ? 0 : 1);
}

function runCheck(name, proc, mustContain = []) {
    const stdout = String(proc.stdout || '');
    const stderr = String(proc.stderr || '');
    const output = `${stdout}\n${stderr}`;
    const pass = proc.status === 0 && mustContain.every(snippet => output.includes(snippet) || fs.existsSync(snippet));
    return {
        name,
        pass,
        status: proc.status,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
    };
}

async function recordBaselineArtifactCheck(artifactPath, dbPath, version) {
    try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
        const dbMod = await import(pathToModule('plugin/lib/db.js'));
        const migrationMod = await import(pathToModule('plugin/lib/migrations.js'));
        const benchmarkMod = await import(pathToModule('plugin/lib/benchmark-reporter.js'));

        const db = dbMod.openDB(dbPath);
        if (!db) {
            return { status: 1, stdout: '', stderr: 'Baseline artifact recording unavailable: better-sqlite3 is not available.' };
        }

        try {
            dbMod.initDB(db);
            migrationMod.applyMigrations(db);
            let inserted = 0;
            for (const evalCase of artifact.cases || []) {
                const ok = benchmarkMod.recordBenchmark(db, {
                    run_id: artifact.run_id || `baseline-${version}`,
                    skill_version: version,
                    eval_case: evalCase.id || evalCase.file,
                    category: evalCase.category || 'unknown',
                    passed: Boolean(evalCase.passed),
                    execution_time_ms: evalCase.execution_time_ms ?? null,
                    notes: `mode=${artifact.mode || 'schema_validation_only'}; source_artifact=${artifactPath}; file=${evalCase.file || evalCase.id || 'unknown'}`,
                });
                if (ok) inserted++;
            }

            const ok = inserted === (artifact.cases || []).length && inserted > 0;
            return {
                status: ok ? 0 : 1,
                stdout: [
                    '========================================',
                    '  TRACE Baseline Recorder',
                    `  Source artifact: ${artifactPath}`,
                    `  Version       : ${version}`,
                    `  Cases found    : ${(artifact.cases || []).length}`,
                    `  Rows inserted  : ${inserted}`,
                    `  Mode           : ${artifact.mode || 'schema_validation_only'}`,
                    '========================================',
                ].join('\n'),
                stderr: ok ? '' : `Baseline artifact recording incomplete: inserted ${inserted}/${(artifact.cases || []).length} rows.`,
            };
        } finally {
            dbMod.closeDB(db);
        }
    } catch (error) {
        return {
            status: 1,
            stdout: '',
            stderr: `Baseline artifact recording failed: ${error.message}`,
        };
    }
}

async function buildComparisonCheck(dbPath, versionA, versionB) {
    try {
        const dbMod = await import(pathToModule('plugin/lib/db.js'));
        const migrationMod = await import(pathToModule('plugin/lib/migrations.js'));
        const benchmarkMod = await import(pathToModule('plugin/lib/benchmark-reporter.js'));

        const db = dbMod.openDB(dbPath);
        if (!db) {
            return {
                name: 'benchmark-ab-compare',
                pass: false,
                status: 1,
                stdout: '',
                stderr: 'Benchmark comparison unavailable: better-sqlite3 is not available.',
            };
        }

        try {
            dbMod.initDB(db);
            migrationMod.applyMigrations(db);
            const comparison = benchmarkMod.compareVersions(db, versionA, versionB);
            const modeA = comparison.reportA.mode ?? 'schema_validation_only';
            const modeB = comparison.reportB.mode ?? 'schema_validation_only';
            const limitations = [];
            if (modeA === 'schema_validation_only' && modeB === 'schema_validation_only') {
                limitations.push('comparison reflects schema/artifact validation only; richer behavioral eval layers remain future hardening.');
            }
            const pass = comparison.reportA.total > 0 && comparison.reportB.total > 0;
            return {
                name: 'benchmark-ab-compare',
                pass,
                status: pass ? 0 : 1,
                stdout: JSON.stringify({
                    versionA,
                    versionB,
                    modeA,
                    modeB,
                    delta_pass_rate: comparison.delta_pass_rate,
                    delta_avg_time: comparison.delta_avg_time,
                    improved_cases: comparison.improved_cases,
                    regressed_cases: comparison.regressed_cases,
                    limitations,
                }),
                stderr: pass
                    ? (limitations.length > 0 ? limitations.join(' ') : '')
                    : 'Benchmark comparison did not find recorded runs for both versions.',
                comparison,
            };
        } finally {
            dbMod.closeDB(db);
        }
    } catch (error) {
        return {
            name: 'benchmark-ab-compare',
            pass: false,
            status: 1,
            stdout: '',
            stderr: `Benchmark comparison failed: ${error.message}`,
        };
    }
}

function pathToModule(relativePath) {
    return pathToFileURL(path.join(ROOT, relativePath)).href;
}

main().catch(error => {
    process.stderr.write(`TRACE readiness failed: ${error.message}\n`);
    process.exit(1);
});
