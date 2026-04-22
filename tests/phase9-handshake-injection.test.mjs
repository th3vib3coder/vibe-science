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

const FULL_FIXTURE_PATH = path.join(
    VRE_ROOT,
    'environment',
    'tests',
    'fixtures',
    'phase9',
    'capability-handshake',
    'valid-full.json',
);

const fullFixture = JSON.parse(fs.readFileSync(FULL_FIXTURE_PATH, 'utf8'));

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
        removeWithRetry(pendingCleanup.pop());
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
    return result;
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
            activePointer: '.vibe-science-environment/objectives/OBJ-123/resume-snapshot.json',
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
