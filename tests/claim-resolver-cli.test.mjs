import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    closeDB,
    createSession,
    initDB,
    logClaimEvent,
    openDB,
} from '../plugin/lib/db.js';
import { applyMigrations } from '../plugin/lib/migrations.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = path.join(ROOT, 'plugin', 'scripts', 'claim-resolver.js');

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createHarness({ seedClaim = true } = {}) {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-claim-resolver-'));
    const projectRoot = path.join(tempRoot, 'project');
    const dbPath = path.join(tempRoot, 'home', '.vibe-science', 'db', 'vibe-science.db');
    fs.mkdirSync(projectRoot, { recursive: true });

    const db = openDB(dbPath);
    initDB(db);
    applyMigrations(db);
    createSession(db, {
        id: 'sess-claim-resolver',
        project_path: projectRoot,
        started_at: '2026-04-30T15:00:00Z',
    });
    if (seedClaim) {
        logClaimEvent(db, {
            claim_id: 'CLAIM-X-1',
            session_id: 'sess-claim-resolver',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.61,
            narrative: 'claim exists for resolver test',
            timestamp: '2026-04-30T15:01:00Z',
        });
    }
    closeDB(db);

    return { dbPath, projectRoot };
}

function runCli(stdinPayload, { env = {} } = {}) {
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

        child.stdin.end(JSON.stringify(stdinPayload));
    });
}

function parseStdoutJson(result) {
    assert.notEqual(result.stdout.trim(), '', `expected JSON stdout; stderr=${result.stderr}`);
    return JSON.parse(result.stdout);
}

test('claim-resolver CLI returns exists:true for a seeded claim', async () => {
    const harness = createHarness({ seedClaim: true });
    const result = await runCli(
        { claimId: 'CLAIM-X-1', projectPath: harness.projectRoot },
        { env: { VIBE_SCIENCE_DB_PATH: harness.dbPath } },
    );

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    assert.deepEqual(parseStdoutJson(result), {
        exists: true,
        claimId: 'CLAIM-X-1',
        source: 'kernel-claim-events',
    });
});

test('claim-resolver CLI returns not-found for an absent claim in a reachable DB', async () => {
    const harness = createHarness({ seedClaim: false });
    const result = await runCli(
        { claimId: 'CLAIM-X-404', projectPath: harness.projectRoot },
        { env: { VIBE_SCIENCE_DB_PATH: harness.dbPath } },
    );

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    assert.deepEqual(parseStdoutJson(result), {
        exists: false,
        claimId: 'CLAIM-X-404',
        source: 'not-found',
    });
});

test('claim-resolver CLI returns unavailable when the DB cannot be opened', async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-claim-resolver-unavailable-'));
    const directoryAsDb = path.join(tempRoot, 'not-a-db');
    fs.mkdirSync(directoryAsDb, { recursive: true });

    const result = await runCli(
        { claimId: 'CLAIM-X-1' },
        { env: { VIBE_SCIENCE_DB_PATH: directoryAsDb } },
    );

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    assert.deepEqual(parseStdoutJson(result), {
        exists: false,
        claimId: 'CLAIM-X-1',
        source: 'unavailable',
    });
});

test('claim-resolver CLI emits only the documented JSON response shape', async () => {
    const harness = createHarness({ seedClaim: true });
    const result = await runCli(
        { claimId: 'CLAIM-X-1' },
        { env: { VIBE_SCIENCE_DB_PATH: harness.dbPath } },
    );
    const payload = parseStdoutJson(result);

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    assert.deepEqual(Object.keys(payload).sort(), ['claimId', 'exists', 'source']);
});
