import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { afterEach } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    closeDB,
    getGovernanceEvents,
    openDB,
} from '../plugin/lib/db.js';
import {
    KNOWN_GOVERNANCE_SOURCE_COMPONENTS,
} from '../plugin/lib/phase9-governance-events.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CLI_PATH = path.join(ROOT, 'plugin', 'scripts', 'governance-log.js');
const SOURCE_SCHEMA_PATH = path.join(ROOT, 'plugin', 'db', 'schema.sql');

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createPluginProjectRoot() {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-governance-log-cli-'));
    const pluginProjectRoot = path.join(tempRoot, 'vibe-science');
    const schemaDir = path.join(pluginProjectRoot, 'plugin', 'db');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.copyFileSync(SOURCE_SCHEMA_PATH, path.join(schemaDir, 'schema.sql'));
    return pluginProjectRoot;
}

function dbPathFor(pluginProjectRoot) {
    return path.join(pluginProjectRoot, '.vibe-science', 'db', 'vibe-science.db');
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

function validEvent(pluginProjectRoot, details = {}) {
    return {
        event_type: 'objective_started',
        objective_id: 'OBJ-GOV-BRIDGE-001',
        source_component: 'vre/orchestrator/governance-logger',
        severity: 'info',
        details,
        pluginProjectRoot,
    };
}

test('governance-log CLI writes a valid event and returns OK', async () => {
    const pluginProjectRoot = createPluginProjectRoot();
    const result = await runCli(validEvent(pluginProjectRoot, { wake: 'manual' }));

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, true);
    assert.equal(payload.code, 'OK');
    assert.match(payload.eventId, /^GOV-/u);

    const db = openDB(dbPathFor(pluginProjectRoot));
    try {
        const events = getGovernanceEvents(db, { eventType: 'objective_started' });
        assert.equal(events.length, 1);
        assert.equal(events[0].objective_id, 'OBJ-GOV-BRIDGE-001');
        assert.equal(events[0].source_component, 'vre/orchestrator/governance-logger');
        assert.deepEqual(events[0].details, { wake: 'manual' });
    } finally {
        closeDB(db);
    }
});

test('governance-log CLI reports DB unavailable when pluginProjectRoot cannot resolve', async () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase9-governance-log-missing-root-'));
    const missingRoot = path.join(tempRoot, 'does-not-exist');
    const result = await runCli(validEvent(missingRoot));

    assert.equal(result.exitCode, 2, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'E_BRIDGE_DB_UNAVAILABLE');
});

test('governance-log CLI rejects an unknown governance event type', async () => {
    const pluginProjectRoot = createPluginProjectRoot();
    const result = await runCli({
        ...validEvent(pluginProjectRoot),
        event_type: 'fictional_governance_event',
    });

    assert.equal(result.exitCode, 1, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'E_GOVERNANCE_EVENT_TYPE_UNKNOWN');
});

test('governance-log CLI rejects malformed stdin JSON', async () => {
    const result = await runCli('{not valid json', { raw: true });

    assert.equal(result.exitCode, 1, `stderr=${result.stderr}`);
    const payload = parseStdoutJson(result);
    assert.equal(payload.ok, false);
    assert.equal(payload.code, 'E_BRIDGE_BAD_INPUT');
});

test('governance-log CLI does not leak env secrets to stdout, stderr, or DB details', async () => {
    const pluginProjectRoot = createPluginProjectRoot();
    const sentinel = 'xyz-phase9-secret-sentinel';
    const result = await runCli(validEvent(pluginProjectRoot, { note: 'no env here' }), {
        env: { SECRET_FOOBAR: sentinel },
    });

    assert.equal(result.exitCode, 0, `stderr=${result.stderr}`);
    assert.doesNotMatch(result.stdout, new RegExp(sentinel, 'u'));
    assert.doesNotMatch(result.stderr, new RegExp(sentinel, 'u'));

    const db = openDB(dbPathFor(pluginProjectRoot));
    try {
        const events = getGovernanceEvents(db, { eventType: 'objective_started' });
        assert.equal(events.length, 1);
        assert.doesNotMatch(JSON.stringify(events[0]), new RegExp(sentinel, 'u'));
    } finally {
        closeDB(db);
    }
});

test('governance source-component vocabulary includes both bridge endpoints', () => {
    assert.equal(
        KNOWN_GOVERNANCE_SOURCE_COMPONENTS.includes('plugin/scripts/governance-log'),
        true,
    );
    assert.equal(
        KNOWN_GOVERNANCE_SOURCE_COMPONENTS.includes('vre/orchestrator/governance-logger'),
        true,
    );
});
