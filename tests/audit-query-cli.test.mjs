import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    closeDB,
    initDB,
    logGovernanceEvent,
    openDB,
} from '../plugin/lib/db.js';
import { applyMigrations } from '../plugin/lib/migrations.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = path.join(ROOT, 'plugin', 'scripts', 'audit-query-cli.js');

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createHarness({ seed = true } = {}) {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-audit-query-'));
    const dbPath = path.join(tempRoot, 'home', '.vibe-science', 'db', 'vibe-science.db');
    const db = openDB(dbPath);
    initDB(db);
    applyMigrations(db);

    if (seed) {
        const events = [
            ['GOV-AQ-1', 'objective_started', 'vre/objectives/cli', 1_700_000_000_000],
            ['GOV-AQ-2', 'objective_started', 'vre/objectives/cli', 1_700_000_001_000],
            ['GOV-AQ-3', 'objective_started', 'vre/orchestrator/autonomy-runtime', 1_700_000_002_000],
            ['GOV-AQ-4', 'law_violation', 'plugin/hooks/pre-tool-use', 1_700_000_003_000],
            ['GOV-AQ-5', 'law_violation', 'plugin/hooks/pre-tool-use', 1_700_000_004_000],
            ['GOV-AQ-6', 'law_violation', 'plugin/hooks/pre-tool-use', 1_700_000_005_000],
        ];
        for (const [id, event_type, source_component, timestamp] of events) {
            logGovernanceEvent(db, {
                id,
                event_type,
                source_component,
                severity: 'info',
                details: { sentinel: 'SECRET-seq130-audit-pin' },
                timestamp,
            });
        }
    }

    closeDB(db);
    return { dbPath };
}

function runCli(stdinPayload, { env = {}, raw = false } = {}) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [CLI_PATH], {
            cwd: ROOT,
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });

        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
        child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
        child.on('error', (error) => {
            resolve({ exitCode: null, stdout, stderr: `${stderr}${error.message}` });
        });
        child.on('close', (exitCode) => {
            resolve({ exitCode, stdout, stderr });
        });

        child.stdin.end(raw ? stdinPayload : JSON.stringify(stdinPayload));
    });
}

function parseStdoutJson(result) {
    assert.notEqual(result.stdout.trim(), '', `expected JSON stdout; stderr=${result.stderr}`);
    return JSON.parse(result.stdout);
}

test('audit query CLI aggregates governance events by event_type and source_component', async () => {
    const { dbPath } = createHarness();
    const result = await runCli(
        { from: 1_700_000_000_000, to: 1_700_000_010_000 },
        { env: { VIBE_SCIENCE_DB_PATH: dbPath } },
    );

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.rows, [
        { event_type: 'law_violation', source_component: 'plugin/hooks/pre-tool-use', count: 3 },
        { event_type: 'objective_started', source_component: 'vre/objectives/cli', count: 2 },
        { event_type: 'objective_started', source_component: 'vre/orchestrator/autonomy-runtime', count: 1 },
    ]);
});

test('audit query CLI returns empty rows for an empty migrated DB', async () => {
    const { dbPath } = createHarness({ seed: false });
    const result = await runCli({}, { env: { VIBE_SCIENCE_DB_PATH: dbPath } });

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.deepEqual(payload, { ok: true, rows: [] });
});

test('audit query CLI excludes events outside the requested time range', async () => {
    const { dbPath } = createHarness();
    const result = await runCli(
        { from: '2023-11-14T22:13:21.000Z', to: '2023-11-14T22:13:23.500Z' },
        { env: { VIBE_SCIENCE_DB_PATH: dbPath } },
    );

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, true);
    assert.deepEqual(payload.rows, [
        { event_type: 'law_violation', source_component: 'plugin/hooks/pre-tool-use', count: 1 },
        { event_type: 'objective_started', source_component: 'vre/objectives/cli', count: 1 },
        { event_type: 'objective_started', source_component: 'vre/orchestrator/autonomy-runtime', count: 1 },
    ]);
});

test('audit query CLI reports DB unavailable as JSON error', async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-audit-query-unavailable-'));
    const unavailablePath = path.join(tempRoot, 'db-dir');
    fs.mkdirSync(unavailablePath, { recursive: true });

    const result = await runCli({}, { env: { VIBE_SCIENCE_DB_PATH: unavailablePath } });

    assert.equal(result.exitCode, 2, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, false);
    assert.match(payload.error, /unavailable/i);
});
