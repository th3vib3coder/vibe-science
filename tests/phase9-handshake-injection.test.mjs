import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VRE_ROOT = path.resolve(ROOT, '..', 'vibe-research-environment');
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;
const rel = (...segments) => path.join(ROOT, ...segments);

const handshakeMod = await import(relUrl('plugin', 'scripts', 'handshake-inject.js'));
const objectiveLoaderMod = await import(relUrl('plugin', 'scripts', 'objective-loader.js'));
const dbMod = await import(relUrl('plugin', 'lib', 'db.js'));
const migrationMod = await import(relUrl('plugin', 'lib', 'migrations.js'));

const FULL_FIXTURE_PATH = path.join(
    VRE_ROOT,
    'environment',
    'tests',
    'fixtures',
    'phase9',
    'capability-handshake',
    'valid-full.json',
);
const OBJECTIVE_FIXTURE_PATH = path.join(
    VRE_ROOT,
    'environment',
    'tests',
    'fixtures',
    'phase9',
    'objective',
    'valid-active.json',
);
const POINTER_FIXTURE_PATH = path.join(
    VRE_ROOT,
    'environment',
    'tests',
    'fixtures',
    'phase9',
    'active-objective-pointer',
    'valid-active.json',
);
const SNAPSHOT_FIXTURE_PATH = path.join(
    VRE_ROOT,
    'environment',
    'tests',
    'fixtures',
    'phase9',
    'resume-snapshot',
    'valid-mid-loop.json',
);
const HANDSHAKE_ARTIFACT_PATH = path.join(
    VRE_ROOT,
    '.vibe-science-environment',
    'control',
    'capability-handshake.json',
);

const fullFixture = JSON.parse(fs.readFileSync(FULL_FIXTURE_PATH, 'utf8'));
const objectiveFixture = JSON.parse(fs.readFileSync(OBJECTIVE_FIXTURE_PATH, 'utf8'));
const pointerFixture = JSON.parse(fs.readFileSync(POINTER_FIXTURE_PATH, 'utf8'));
const snapshotFixture = JSON.parse(fs.readFileSync(SNAPSHOT_FIXTURE_PATH, 'utf8'));

let tempRoot = null;
const pendingCleanup = [];

function sleepMs(ms) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function removeWithRetry(targetPath) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
            fs.rmSync(targetPath, { recursive: true, force: true });
            return;
        } catch (error) {
            if (error.code !== 'EPERM') {
                throw error;
            }
            if (attempt === 9) {
                return;
            }
            sleepMs(100);
        }
    }
}

afterEach(() => {
    while (pendingCleanup.length > 0) {
        const entry = pendingCleanup.pop();
        if (typeof entry === 'string') {
            removeWithRetry(entry);
            continue;
        }
        if (entry && typeof entry.restore === 'function') {
            entry.restore();
        }
    }
    if (tempRoot) {
        removeWithRetry(tempRoot);
        tempRoot = null;
    }
});

function createTempRoot(prefix) {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    return tempRoot;
}

function createFakePluginRepo() {
    const root = createTempRoot('vibe-phase9-handshake-');
    const pluginRoot = path.join(root, 'vibe-science');
    fs.mkdirSync(path.join(pluginRoot, 'plugin', 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, 'plugin', 'scripts', 'session-start.js'), 'export default null;\n', 'utf8');
    fs.writeFileSync(
        path.join(pluginRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-science-plugin', type: 'module' }, null, 2),
        'utf8',
    );
    return { root, pluginRoot };
}

function createFakeVreRepo(parentRoot, { cliSource, artifactPayload } = {}) {
    const vreRoot = path.join(parentRoot, 'vibe-research-environment');
    fs.mkdirSync(path.join(vreRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(vreRoot, 'environment', 'schemas'), { recursive: true });
    fs.writeFileSync(
        path.join(vreRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-research-environment', type: 'module' }, null, 2),
        'utf8',
    );

    fs.writeFileSync(path.join(vreRoot, 'bin', 'vre'), cliSource ?? [
        '#!/usr/bin/env node',
        "process.stderr.write('simulated cli failure');",
        'process.exit(2);',
        '',
    ].join('\n'), 'utf8');

    if (artifactPayload) {
        const artifactPath = path.join(vreRoot, '.vibe-science-environment', 'control', 'capability-handshake.json');
        fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
        fs.writeFileSync(artifactPath, JSON.stringify(artifactPayload, null, 2), 'utf8');
    }

    return vreRoot;
}

function freshFixture(nowMs, overrides = {}) {
    return {
        ...structuredClone(fullFixture),
        generatedAt: new Date(nowMs).toISOString(),
        vrePath: overrides.vrePath ?? fullFixture.vrePath,
        ...overrides,
    };
}

function staleFixture(nowMs, overrides = {}) {
    return freshFixture(nowMs - (handshakeMod.HANDSHAKE_TTL_MS.startup + 60_000), overrides);
}

function writeJson(targetPath, payload) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
}

function writeFakeObjectiveState(vreRoot, {
    objectiveId = objectiveFixture.objectiveId,
    status = objectiveFixture.status,
    runtimeMode = objectiveFixture.runtimeMode,
    reasoningMode = objectiveFixture.reasoningMode,
    title = objectiveFixture.title,
    question = objectiveFixture.question,
    snapshotReasoningMode = reasoningMode,
    snapshotRuntimeMode = runtimeMode,
    snapshotObjectiveId = objectiveId,
    pointerObjectiveId = objectiveId,
    objectiveRecordOverride = {},
    pointerOverride = {},
    snapshotOverride = {},
} = {}) {
    const objectiveDir = path.join(vreRoot, '.vibe-science-environment', 'objectives', objectiveId);
    const objectiveRecordPath = path.join(objectiveDir, 'objective.json');
    const relativeObjectiveRecordPath = path.relative(vreRoot, objectiveRecordPath).split(path.sep).join('/');
    const pointerPath = path.join(vreRoot, objectiveLoaderMod.ACTIVE_OBJECTIVE_POINTER_RELATIVE_PATH);
    const snapshotPath = path.join(objectiveDir, objectiveLoaderMod.RESUME_SNAPSHOT_FILE);

    const objectiveRecord = {
        ...structuredClone(objectiveFixture),
        objectiveId,
        status,
        runtimeMode,
        reasoningMode,
        title,
        question,
        ...objectiveRecordOverride,
    };
    const pointer = {
        ...structuredClone(pointerFixture),
        objectiveId: pointerObjectiveId,
        objectiveRecordPath: relativeObjectiveRecordPath,
        ...pointerOverride,
    };
    const snapshot = {
        ...structuredClone(snapshotFixture),
        objectiveId: snapshotObjectiveId,
        objectiveStatusAtSnapshot: status,
        runtimeMode: snapshotRuntimeMode,
        reasoningMode: snapshotReasoningMode,
        writtenReason: snapshotOverride.writtenReason ?? snapshotFixture.writtenReason,
        ...snapshotOverride,
    };

    writeJson(objectiveRecordPath, objectiveRecord);
    writeJson(pointerPath, pointer);
    writeJson(snapshotPath, snapshot);

    return {
        objectiveRecordPath,
        pointerPath,
        snapshotPath,
        objectiveRecord,
        pointer,
        snapshot,
    };
}

function backupFile(targetPath) {
    const existed = fs.existsSync(targetPath);
    const original = existed ? fs.readFileSync(targetPath) : null;
    return {
        restore() {
            if (existed) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, original);
            } else {
                removeWithRetry(targetPath);
            }
        },
    };
}

function backupDirectory(targetPath) {
    const existed = fs.existsSync(targetPath);
    const backupRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-phase9-backup-'));
    const backupPath = path.join(backupRoot, path.basename(targetPath) || 'backup');
    if (existed) {
        fs.cpSync(targetPath, backupPath, { recursive: true });
    }
    pendingCleanup.push(backupRoot);
    return {
        restore() {
            removeWithRetry(targetPath);
            if (existed) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.cpSync(backupPath, targetPath, { recursive: true });
            }
        },
    };
}

function spawnHook(scriptRelativePath, event, envOverrides = {}) {
    const fakeHome = createTempRoot('vibe-phase9-hook-home-');
    pendingCleanup.push(fakeHome);
    const result = spawnSync(
        process.execPath,
        [rel(scriptRelativePath)],
        {
            cwd: ROOT,
            encoding: 'utf-8',
            timeout: 30000,
            input: JSON.stringify(event),
            env: {
                ...process.env,
                HOME: fakeHome,
                USERPROFILE: fakeHome,
                ...envOverrides,
            },
        },
    );
    return Object.assign(result, {
        fakeHome,
        dbPath: path.join(fakeHome, '.vibe-science', 'db', 'vibe-science.db'),
    });
}

function createGovernanceHarness() {
    const root = createTempRoot('vibe-phase9-governance-');
    const fakeHome = path.join(root, 'home');
    const projectDir = path.join(root, 'project');
    const dbPath = path.join(fakeHome, '.vibe-science', 'db', 'vibe-science.db');

    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.mkdirSync(path.join(projectDir, '.vibe-science'), { recursive: true });
    fs.writeFileSync(path.join(projectDir, '.vibe-science', 'STATE.md'), '# state\n', 'utf8');

    const db = dbMod.openDB(dbPath);
    dbMod.initDB(db);
    migrationMod.applyMigrations(db);
    dbMod.createSession(db, {
        id: 'sess-001',
        project_path: projectDir,
        started_at: '2026-04-29T00:00:00.000Z',
    });
    dbMod.closeDB(db);

    return { fakeHome, projectDir, dbPath };
}

function spawnHookWithHome(scriptRelativePath, event, { fakeHome, cwd, envOverrides = {} }) {
    return spawnSync(
        process.execPath,
        [rel(scriptRelativePath)],
        {
            cwd,
            encoding: 'utf-8',
            timeout: 30000,
            input: JSON.stringify(event),
            env: {
                ...process.env,
                HOME: fakeHome,
                USERPROFILE: fakeHome,
                ...envOverrides,
            },
        },
    );
}

function openGovernanceDb(dbPath) {
    const db = dbMod.openDB(dbPath);
    dbMod.initDB(db);
    migrationMod.applyMigrations(db);
    return db;
}

function readGovernanceEvents(dbPath, eventType) {
    const db = openGovernanceDb(dbPath);
    try {
        return dbMod.getGovernanceEvents(db, { eventType, limit: 20 });
    } finally {
        dbMod.closeDB(db);
    }
}

function assertNoSecretDetails(details, sentinel) {
    assert.doesNotMatch(JSON.stringify(details), new RegExp(sentinel, 'u'));
}

function assertHookContextIncludes(result, pattern) {
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(String(result.stdout || '{}'));
    const text = String(payload?.hookSpecificOutput?.additionalContext || '');
    assert.match(text, pattern);
    return text;
}

test('handshake helper resolves a live sibling VRE and returns a validated digest payload', () => {
    const injection = handshakeMod.buildPhase9HandshakeInjection({
        mode: 'session-start',
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.enabled, true);
    assert.equal(injection.injected, true);
    assert.ok(['cli', 'artifact'].includes(injection.source));
    const validation = handshakeMod.validateCapabilityHandshake(injection.handshake);
    assert.equal(validation.ok, true, validation.errors.join('; '));
    assert.equal(injection.handshake.vrePresent, true);
    assert.match(injection.context, /\[PHASE9 HANDSHAKE DIGEST\]/u);
    assert.match(injection.context, /payloadArtifact:/u);
    assert.match(injection.context, /markdownOnlyContracts \(docs only\):/u);
    assert.doesNotMatch(injection.context, /executableCommands:.*automation-status/u);
    assert.doesNotMatch(injection.context, /nextAction: discovery, not research/u);
});

test('handshake helper degrades explicitly when sibling VRE is missing', () => {
    const sandbox = createFakePluginRepo();
    const injection = handshakeMod.buildPhase9HandshakeInjection({
        mode: 'session-start',
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.injected, true);
    assert.equal(injection.source, 'missing');
    assert.equal(injection.handshake.vrePresent, false);
    assert.equal(injection.handshake.vrePath, null);
    assert.ok(injection.handshake.degradedReasons.some((reason) => reason.startsWith('VRE_MISSING:')));
    assert.match(injection.context, /nextAction: discovery, not research/u);
});

test('handshake helper degrades when the VRE command fails and no fresh artifact can be trusted', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root);
    const injection = handshakeMod.buildPhase9HandshakeInjection({
        mode: 'session-start',
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.injected, true);
    assert.equal(injection.source, 'degraded');
    assert.equal(injection.handshake.vrePresent, true);
    assert.equal(injection.handshake.vrePath, fakeVreRoot);
    assert.ok(injection.handshake.degradedReasons.includes(handshakeMod.HANDSHAKE_DEGRADED_TOKEN));
    assert.ok(injection.handshake.degradedReasons.some((reason) => reason.startsWith('VRE_HANDSHAKE_CLI_FAILED:')));
});

test('handshake helper accepts a fresh validated artifact when CLI fails', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root);
    const artifactPath = path.join(fakeVreRoot, '.vibe-science-environment', 'control', 'capability-handshake.json');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(
        artifactPath,
        JSON.stringify(freshFixture(Date.now(), { vrePath: fakeVreRoot }), null, 2),
        'utf8',
    );
    const injection = handshakeMod.buildPhase9HandshakeInjection({
        mode: 'session-start',
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.source, 'artifact');
    assert.equal(injection.handshake.vrePresent, true);
    assert.equal(injection.handshake.vrePath, fakeVreRoot);
    assert.equal(typeof injection.handshake.generatedAt, 'string');
});

test('stale artifacts are degraded instead of being presented as current awareness', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root);
    const artifactPath = path.join(fakeVreRoot, '.vibe-science-environment', 'control', 'capability-handshake.json');
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(
        artifactPath,
        JSON.stringify(staleFixture(Date.now(), { vrePath: fakeVreRoot }), null, 2),
        'utf8',
    );
    const injection = handshakeMod.buildPhase9HandshakeInjection({
        mode: 'session-start',
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.source, 'degraded');
    assert.ok(injection.handshake.degradedReasons.includes(handshakeMod.HANDSHAKE_DEGRADED_TOKEN));
    assert.ok(injection.handshake.degradedReasons.some((reason) => reason.startsWith('VRE_HANDSHAKE_ARTIFACT_STALE:')));
});

test('objective loader reports no-objective explicitly at startup', () => {
    const sandbox = createFakePluginRepo();
    createFakeVreRepo(sandbox.root, {
        cliSource: [
            '#!/usr/bin/env node',
            'process.stdout.write(JSON.stringify({ ok: true }));',
            'process.exit(0);',
            '',
        ].join('\n'),
    });

    const injection = objectiveLoaderMod.buildPhase9ObjectiveInjection({
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.enabled, true);
    assert.equal(injection.injected, true);
    assert.equal(injection.source, 'no-objective');
    assert.equal(injection.state.loaderState, 'no-objective');
    assert.match(injection.context, /\[PHASE9 OBJECTIVE DIGEST\]/u);
    assert.match(injection.context, /objectiveId: none/u);
    assert.match(injection.context, /humanInputRequired: yes/u);
});

test('objective loader reports the active objective and resume state at startup', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root, {
        cliSource: [
            '#!/usr/bin/env node',
            'process.stdout.write(JSON.stringify({ ok: true }));',
            'process.exit(0);',
            '',
        ].join('\n'),
    });
    writeFakeObjectiveState(fakeVreRoot);

    const injection = objectiveLoaderMod.buildPhase9ObjectiveInjection({
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.source, 'ready');
    assert.equal(injection.state.loaderState, 'ready');
    assert.equal(injection.state.objectiveId, objectiveFixture.objectiveId);
    assert.match(injection.context, /objectiveStatus: active/u);
    assert.match(injection.context, /runtimeMode: unattended-batch/u);
    assert.match(injection.context, /reasoningMode: rule-only/u);
    assert.match(injection.context, /resumeWrittenReason: loop-iteration/u);
});

test('objective loader injects a blocker when the active pointer is broken', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root, {
        cliSource: [
            '#!/usr/bin/env node',
            'process.stdout.write(JSON.stringify({ ok: true }));',
            'process.exit(0);',
            '',
        ].join('\n'),
    });
    const objectiveId = objectiveFixture.objectiveId;
    const pointerPath = path.join(fakeVreRoot, objectiveLoaderMod.ACTIVE_OBJECTIVE_POINTER_RELATIVE_PATH);
    writeJson(pointerPath, {
        ...structuredClone(pointerFixture),
        objectiveId,
        objectiveRecordPath: '.vibe-science-environment/objectives/OBJ-broken/objective.json',
    });

    const injection = objectiveLoaderMod.buildPhase9ObjectiveInjection({
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.source, 'blocker');
    assert.equal(injection.state.loaderState, 'blocker');
    assert.equal(injection.state.blocker.code, 'E_ACTIVE_POINTER_ORPHANED');
    assert.match(injection.context, /blockerCode: E_ACTIVE_POINTER_ORPHANED/u);
    assert.match(injection.context, /humanInputRequired: yes/u);
});

test('objective loader injects a blocker when the resume snapshot is stale against immutable reasoning mode', () => {
    const sandbox = createFakePluginRepo();
    const fakeVreRoot = createFakeVreRepo(sandbox.root, {
        cliSource: [
            '#!/usr/bin/env node',
            'process.stdout.write(JSON.stringify({ ok: true }));',
            'process.exit(0);',
            '',
        ].join('\n'),
    });
    writeFakeObjectiveState(fakeVreRoot, {
        snapshotReasoningMode: 'reviewed-api',
    });

    const injection = objectiveLoaderMod.buildPhase9ObjectiveInjection({
        pluginRepoRoot: sandbox.pluginRoot,
        env: {
            ...process.env,
            VIBE_PHASE9_HANDSHAKE_ONLY: '1',
        },
    });

    assert.equal(injection.source, 'blocker');
    assert.equal(injection.state.blocker.code, 'E_REASONING_MODE_DIVERGED');
    assert.match(injection.context, /blockerCode: E_REASONING_MODE_DIVERGED/u);
    assert.match(injection.context, /repair-snapshot/u);
});

test('session-start injects a visible Phase 9 handshake digest when handshake mode is enabled', () => {
    const text = assertHookContextIncludes(
        spawnHook(
            'plugin/scripts/session-start.js',
            { project_path: ROOT, cwd: ROOT },
            { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
        ),
        /\[PHASE9 HANDSHAKE DIGEST\]/u,
    );

    assert.match(text, /vrePresent: true/u);
    assert.match(text, /payloadArtifact:/u);
});

test('clean session-start handshake logs handshake_injected governance event without leaking secrets', () => {
    const secretSentinel = 'xyz-phase9-handshake-secret-sentinel';
    const sandbox = createFakePluginRepo();
    pendingCleanup.push(sandbox.root);
    const fakeVreRoot = path.join(sandbox.root, 'vibe-research-environment');
    const payload = freshFixture(Date.now(), {
        vrePath: fakeVreRoot,
        degradedReasons: [],
        kernel: {
            ...structuredClone(fullFixture.kernel),
            mode: 'full',
            dbAvailable: true,
            unreachableReason: null,
        },
    });
    createFakeVreRepo(sandbox.root, {
        cliSource: [
            '#!/usr/bin/env node',
            `process.stdout.write(${JSON.stringify(JSON.stringify(payload))});`,
            'process.exit(0);',
            '',
        ].join('\n'),
    });
    const harness = createGovernanceHarness();
    const db = openGovernanceDb(harness.dbPath);
    try {
        const injection = handshakeMod.buildPhase9HandshakeInjection({
            mode: 'session-start',
            pluginRepoRoot: sandbox.pluginRoot,
            db,
            env: {
                ...process.env,
                VIBE_PHASE9_HANDSHAKE_ONLY: '1',
                SECRET_FOOBAR: secretSentinel,
            },
        });

        assert.equal(injection.injected, true);
        assert.equal(injection.source, 'cli');
    } finally {
        dbMod.closeDB(db);
    }

    const events = readGovernanceEvents(harness.dbPath, 'handshake_injected');

    assert.equal(events.length, 1);
    assert.equal(events[0].source_component, 'plugin/scripts/handshake-inject');
    assert.equal(events[0].objective_id, null);
    assert.match(events[0].details.handshake_id, /^HND-[a-f0-9]{12}$/u);
    assert.equal(Number.isInteger(events[0].details.capabilities_count), true);
    assert.ok(events[0].details.capabilities_count > 0);
    assertNoSecretDetails(events[0].details, secretSentinel);
});

test('handshake fallback logs handshake_degraded governance event with enum reason', () => {
    const sandbox = createFakePluginRepo();
    pendingCleanup.push(sandbox.root);
    createFakeVreRepo(sandbox.root);
    const harness = createGovernanceHarness();
    const db = openGovernanceDb(harness.dbPath);
    try {
        const injection = handshakeMod.buildPhase9HandshakeInjection({
            mode: 'session-start',
            pluginRepoRoot: sandbox.pluginRoot,
            db,
            env: {
                ...process.env,
                VIBE_PHASE9_HANDSHAKE_ONLY: '1',
                SECRET_FOOBAR: 'xyz-phase9-degraded-secret-sentinel',
            },
        });

        assert.equal(injection.injected, true);
        assert.equal(injection.source, 'degraded');
    } finally {
        dbMod.closeDB(db);
    }

    const events = readGovernanceEvents(harness.dbPath, 'handshake_degraded');
    assert.equal(events.length, 1);
    assert.equal(events[0].source_component, 'plugin/scripts/handshake-inject');
    assert.equal(events[0].objective_id, null);
    assert.equal(events[0].details.reason, 'cli-fail');
    assertNoSecretDetails(events[0].details, 'xyz-phase9-degraded-secret-sentinel');
});

test('claim_without_harness legacy governance event remains isolated from Phase 9 handshake events', () => {
    const harness = createGovernanceHarness();
    const result = spawnHookWithHome('plugin/scripts/pre-tool-use.js', {
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
    }, {
        fakeHome: harness.fakeHome,
        cwd: harness.projectDir,
    });

    assert.equal(result.status, 2, result.stderr || result.stdout);
    const claimEvents = readGovernanceEvents(harness.dbPath, 'claim_without_harness');
    const phase9HandshakeEvents = [
        ...readGovernanceEvents(harness.dbPath, 'handshake_injected'),
        ...readGovernanceEvents(harness.dbPath, 'handshake_degraded'),
    ];

    assert.equal(claimEvents.length, 1);
    assert.equal(claimEvents[0].event_type, 'claim_without_harness');
    assert.equal(claimEvents[0].source_component, null);
    assert.equal(claimEvents[0].objective_id, null);
    assert.equal(phase9HandshakeEvents.length, 0);
});

test('session-start threads its existing DB handle into handshake telemetry', () => {
    const source = fs.readFileSync(rel('plugin', 'scripts', 'session-start.js'), 'utf8');

    assert.match(
        source,
        /const phase9Injection = buildPhase9HandshakeInjection\(\{\s*mode: 'session-start',\s*db,\s*env: process\.env,/su,
    );
});

test('handshake telemetry close path remains fail-soft when it owns the DB handle', () => {
    const source = fs.readFileSync(rel('plugin', 'scripts', 'handshake-inject.js'), 'utf8');

    assert.match(
        source,
        /finally\s*\{\s*if\s*\(ownedDb\)\s*\{\s*try\s*\{\s*closeDB\(ownedDb\);\s*\}\s*catch\s*\{/su,
    );
});

test('prompt-submit threads its existing DB handle into handshake telemetry before closing it', () => {
    const source = fs.readFileSync(rel('plugin', 'scripts', 'prompt-submit.js'), 'utf8');
    const phase9CallIndex = source.indexOf('const phase9Injection = buildPhase9HandshakeInjection({');
    const closeDbIndex = source.search(/\/\/ ---- \d+\. Close DB/u);

    assert.ok(phase9CallIndex >= 0, 'expected prompt-submit to call buildPhase9HandshakeInjection');
    assert.ok(closeDbIndex > phase9CallIndex, 'expected prompt-submit to close DB after Phase 9 injection');
    assert.match(
        source,
        /const phase9Injection = buildPhase9HandshakeInjection\(\{\s*mode: 'prompt-submit',\s*prompt,\s*db,\s*env: process\.env,/su,
    );
});

test('prompt-submit on a fresh database emits handshake_injected governance event with source component', () => {
    const originalArtifact = fs.readFileSync(HANDSHAKE_ARTIFACT_PATH, 'utf8');
    const payload = freshFixture(Date.now(), {
        vrePath: VRE_ROOT,
        degradedReasons: [],
        kernel: {
            ...structuredClone(fullFixture.kernel),
            mode: 'full',
            dbAvailable: true,
            unreachableReason: null,
        },
        objective: {
            activePointer: '.vibe-science-environment/objectives/OBJ-fresh-prompt/objective.json',
            activeObjectiveId: 'OBJ-fresh-prompt',
            status: 'active',
        },
    });

    fs.writeFileSync(HANDSHAKE_ARTIFACT_PATH, JSON.stringify(payload, null, 2), 'utf8');
    try {
        const result = spawnHook(
            'plugin/scripts/prompt-submit.js',
            {
                prompt: 'Rename this local helper and tighten the variable naming.',
                cwd: ROOT,
            },
            { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
        );

        assertHookContextIncludes(result, /\[PHASE9 HANDSHAKE DIGEST\]/u);
        const events = readGovernanceEvents(result.dbPath, 'handshake_injected');

        assert.equal(events.length, 1);
        assert.equal(events[0].source_component, 'plugin/scripts/handshake-inject');
        assert.equal(events[0].objective_id, null);
        assert.match(events[0].details.handshake_id, /^HND-[a-f0-9]{12}$/u);
        assert.equal(Number.isInteger(events[0].details.capabilities_count), true);
    } finally {
        fs.writeFileSync(HANDSHAKE_ARTIFACT_PATH, originalArtifact, 'utf8');
    }
});

test('prompt-submit injects handshake visibility for research-relevant prompts', () => {
    const text = assertHookContextIncludes(
        spawnHook(
            'plugin/scripts/prompt-submit.js',
            {
                prompt: 'Resume the literature research and discover which VRE tools and schemas are available right now.',
                cwd: ROOT,
            },
            { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
        ),
        /\[PHASE9 HANDSHAKE DIGEST\]/u,
    );

    assert.match(text, /\[AGENT ROLE\]/u);
    assert.match(text, /queueableTaskKinds:/u);
});

test('prompt-submit keeps non-research prompts unbloated when no objective is active', () => {
    const result = spawnHook(
        'plugin/scripts/prompt-submit.js',
        {
            prompt: 'Rename this local helper and tighten the variable naming.',
            cwd: ROOT,
        },
        { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const payload = JSON.parse(String(result.stdout || '{}'));
    const text = String(payload?.hookSpecificOutput?.additionalContext || '');
    assert.doesNotMatch(text, /\[PHASE9 HANDSHAKE DIGEST\]/u);
});

test('prompt-submit injects the handshake for non-research prompts when a fresh active objective is already visible', () => {
    const artifactPath = path.join(
        VRE_ROOT,
        '.vibe-science-environment',
        'control',
        'capability-handshake.json',
    );
    const originalArtifact = fs.readFileSync(artifactPath, 'utf8');
    const payload = freshFixture(Date.now(), {
        vrePath: VRE_ROOT,
        objective: {
            activePointer: '.vibe-science-environment/objectives/active-objective.json',
            activeObjectiveId: 'OBJ-123',
            status: 'active',
        },
    });

    fs.writeFileSync(artifactPath, JSON.stringify(payload, null, 2), 'utf8');
    try {
        const text = assertHookContextIncludes(
            spawnHook(
                'plugin/scripts/prompt-submit.js',
                {
                    prompt: 'Rename this local helper and tighten the variable naming.',
                    cwd: ROOT,
                },
                { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
            ),
            /\[PHASE9 HANDSHAKE DIGEST\]/u,
        );

        assert.match(text, /objective: OBJ-123 \(active\)/u);
    } finally {
        fs.writeFileSync(artifactPath, originalArtifact, 'utf8');
    }
});

test('session-start injects the objective digest when a real active objective exists in the sibling VRE', () => {
    const objectiveId = 'OBJ-T25-SESSION-001';
    const objectiveDir = path.join(
        VRE_ROOT,
        '.vibe-science-environment',
        'objectives',
        objectiveId,
    );
    const pointerPath = path.join(
        VRE_ROOT,
        objectiveLoaderMod.ACTIVE_OBJECTIVE_POINTER_RELATIVE_PATH,
    );
    pendingCleanup.push(backupFile(HANDSHAKE_ARTIFACT_PATH));
    pendingCleanup.push(backupFile(pointerPath));
    pendingCleanup.push(backupDirectory(objectiveDir));

    writeJson(HANDSHAKE_ARTIFACT_PATH, freshFixture(Date.now(), {
        vrePath: VRE_ROOT,
        objective: {
            activePointer: '.vibe-science-environment/objectives/active-objective.json',
            activeObjectiveId: objectiveId,
            status: 'active',
        },
    }));

    writeFakeObjectiveState(VRE_ROOT, {
        objectiveId,
        title: 'T2.5 startup objective',
        question: 'Does startup see the active objective state?',
        snapshotOverride: {
            writtenReason: 'manual',
            nextAction: {
                kind: 'await-operator',
                params: {
                    reason: 'manual-review',
                },
            },
            openBlockers: [
                {
                    code: 'BLOCKER_PENDING_INPUT',
                    message: 'Awaiting operator confirmation.',
                },
            ],
        },
    });

    const text = assertHookContextIncludes(
        spawnHook(
            'plugin/scripts/session-start.js',
            { project_path: ROOT, cwd: ROOT },
            { VIBE_PHASE9_HANDSHAKE_ONLY: '1' },
        ),
        /\[PHASE9 OBJECTIVE DIGEST\]/u,
    );

    assert.match(text, new RegExp(`objectiveId: ${objectiveId}`, 'u'));
    assert.match(text, /resumeWrittenReason: manual/u);
    assert.match(text, /nextAction: await-operator/u);
    assert.match(text, /humanInputRequired: yes/u);
});

test('phase9-disabled mode leaves SessionStart and research prompts without handshake injection', () => {
    const sessionStartText = assertHookContextIncludes(
        spawnHook(
            'plugin/scripts/session-start.js',
            { project_path: ROOT, cwd: ROOT },
            {
                VIBE_PHASE9_HANDSHAKE_ONLY: '0',
                VIBE_PHASE9_ENABLED: '0',
            },
        ),
        /VIBE SCIENCE CONTEXT/u,
    );
    assert.doesNotMatch(sessionStartText, /\[PHASE9 HANDSHAKE DIGEST\]/u);
    assert.doesNotMatch(sessionStartText, /\[PHASE9 OBJECTIVE DIGEST\]/u);

    const promptResult = spawnHook(
        'plugin/scripts/prompt-submit.js',
        {
            prompt: 'Resume the research plan and tell me which VRE tools are ready.',
            cwd: ROOT,
        },
        {
            VIBE_PHASE9_HANDSHAKE_ONLY: '0',
            VIBE_PHASE9_ENABLED: '0',
        },
    );
    assert.equal(promptResult.status, 0, promptResult.stderr || promptResult.stdout);
    const promptPayload = JSON.parse(String(promptResult.stdout || '{}'));
    const promptText = String(promptPayload?.hookSpecificOutput?.additionalContext || '');
    assert.doesNotMatch(promptText, /\[PHASE9 HANDSHAKE DIGEST\]/u);
});
