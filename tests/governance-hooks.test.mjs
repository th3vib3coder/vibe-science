import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;
const rel = (...segments) => path.join(ROOT, ...segments);

const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));
const pathUtilsMod = await import(relUrl('plugin', 'lib', 'path-utils.js'));

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createHarness() {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-governance-hooks-'));
    const fakeHome = path.join(tempRoot, 'home');
    const projectDir = path.join(tempRoot, 'project');
    const dbPath = path.join(fakeHome, '.vibe-science', 'db', 'vibe-science.db');

    fs.mkdirSync(path.join(fakeHome, '.vibe-science', 'db'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# state', 'utf-8');

    const db = dbMod.openDB(dbPath);
    dbMod.initDB(db);
    migrationMod.applyMigrations(db);

    const projectPath = pathUtilsMod.canonicalizeProjectPath(projectDir);
    dbMod.createSession(db, {
        id: 'sess-001',
        project_path: projectPath,
        started_at: '2026-03-31T10:00:00Z',
    });

    dbMod.closeDB(db);

    return {
        fakeHome,
        projectDir,
        dbPath,
        projectPath,
    };
}

function openHarnessDb(dbPath) {
    return dbMod.openDB(dbPath);
}

function normalizeSlashPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function spawnHook(scriptRelativePath, event, harness, cwd = harness.projectDir) {
    return spawnSync(
        process.execPath,
        [rel(scriptRelativePath)],
        {
            cwd,
            encoding: 'utf-8',
            input: JSON.stringify(event),
            env: {
                ...process.env,
                HOME: harness.fakeHome,
                USERPROFILE: harness.fakeHome,
            },
        }
    );
}

test('pre-tool-use logs claim_without_harness when CLAIM-LEDGER write omits confounder_status', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: path.join(harness.projectDir, 'CLAIM-LEDGER.md'),
            content: [
                'C-001',
                'event_type: CREATED',
                'confidence: 0.42',
                'narrative: test claim without harness',
            ].join('\n'),
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /LAW 9 VIOLATION/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'claim_without_harness',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].session_id, 'sess-001');
        assert.equal(events[0].tool_name, 'Write');
        assert.equal(events[0].severity, 'critical');
        assert.equal(
            normalizeSlashPath(events[0].details.file_path),
            normalizeSlashPath(path.join(harness.projectDir, 'CLAIM-LEDGER.md'))
        );
    } finally {
        dbMod.closeDB(db);
    }
});

test('pre-tool-use blocks protected schema writes and logs schema_modification_attempt', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/pre-tool-use.js', {
        tool_name: 'Write',
        tool_input: {
            file_path: 'skills/vibe/assets/schemas/stage4-exit.schema.json',
            content: '{"type":"object"}',
        },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /IMMUTABLE FILE BLOCKED/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'schema_modification_attempt',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Write');
        assert.equal(events[0].details.protected_rule, 'skills/vibe/assets/schemas/*.schema.json');
        assert.equal(events[0].details.file_path, 'skills/vibe/assets/schemas/stage4-exit.schema.json');
    } finally {
        dbMod.closeDB(db);
    }
});

test('stop hook logs law_violation when unresolved claims block session end', () => {
    const harness = createHarness();
    const db = openHarnessDb(harness.dbPath);
    try {
        dbMod.logClaimEvent(db, {
            claim_id: 'C-001',
            session_id: 'sess-001',
            event_type: 'CREATED',
            new_status: 'CREATED',
            confidence: 0.5,
            narrative: 'unreviewed claim',
            timestamp: '2026-03-31T10:05:00Z',
        });
    } finally {
        dbMod.closeDB(db);
    }

    const result = spawnHook('plugin/scripts/stop.js', {
        session_id: 'sess-001',
        cwd: harness.projectDir,
        project_path: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /STOP BLOCKED/i);

    const verificationDb = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(verificationDb, {
            eventType: 'law_violation',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Stop');
        assert.equal(events[0].details.law, 'LAW 4');
        assert.deepEqual(events[0].details.unreviewed_claim_ids, ['C-001']);
    } finally {
        dbMod.closeDB(verificationDb);
    }
});

test('post-tool-use blocks DELETE/UPDATE targeting governance_events and logs law_violation', () => {
    const harness = createHarness();

    const result = spawnHook('plugin/scripts/post-tool-use.js', {
        tool_name: 'Bash',
        tool_input: {
            command: 'sqlite3 ~/.vibe-science/db/vibe-science.db "DELETE FROM governance_events WHERE 1=1;"',
        },
        tool_response: { exit_code: 0, stdout: '' },
        session_id: 'sess-001',
        cwd: harness.projectDir,
    }, harness);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stderr, /GOVERNANCE EVENTS IMMUTABLE/i);

    const db = openHarnessDb(harness.dbPath);
    try {
        const events = dbMod.getGovernanceEvents(db, {
            eventType: 'law_violation',
            limit: 10,
        });
        assert.equal(events.length, 1);
        assert.equal(events[0].tool_name, 'Bash');
        assert.equal(events[0].details.source, 'bash_command');
        assert.match(events[0].details.snippet, /DELETE FROM governance_events/i);
    } finally {
        dbMod.closeDB(db);
    }
});
