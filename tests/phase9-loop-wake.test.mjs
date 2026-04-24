import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const relUrl = (...segments) => pathToFileURL(path.join(ROOT, ...segments)).href;

const loopWakeMod = await import(relUrl('plugin', 'scripts', 'loop-wake.js'));

const cleanupTargets = [];

afterEach(() => {
    while (cleanupTargets.length > 0) {
        fs.rmSync(cleanupTargets.pop(), { recursive: true, force: true });
    }
});

function createFakePluginRepo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-phase9-loop-wake-'));
    const pluginRoot = path.join(root, 'vibe-science');
    fs.mkdirSync(path.join(pluginRoot, 'plugin', 'scripts'), { recursive: true });
    fs.writeFileSync(
        path.join(pluginRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-science-plugin', type: 'module' }, null, 2),
        'utf8',
    );
    fs.writeFileSync(
        path.join(pluginRoot, 'plugin', 'scripts', 'session-start.js'),
        'export default null;\n',
        'utf8',
    );
    cleanupTargets.push(root);
    return { root, pluginRoot };
}

function createFakeVreRepo(parentRoot) {
    const vreRoot = path.join(parentRoot, 'vibe-research-environment');
    fs.mkdirSync(path.join(vreRoot, 'bin'), { recursive: true });
    fs.mkdirSync(path.join(vreRoot, 'environment', 'schemas'), { recursive: true });
    fs.writeFileSync(
        path.join(vreRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-research-environment', type: 'module' }, null, 2),
        'utf8',
    );
    fs.writeFileSync(path.join(vreRoot, 'bin', 'vre'), '#!/usr/bin/env node\n', 'utf8');
    return vreRoot;
}

test('buildLoopWakeInvocation discovers the sibling VRE and builds the canonical heartbeat CLI call', () => {
    const { pluginRoot } = createFakePluginRepo();
    const vreRoot = createFakeVreRepo(path.dirname(pluginRoot));

    const invocation = loopWakeMod.buildLoopWakeInvocation({
        pluginRepoRoot: pluginRoot,
        objectiveId: 'OBJ-001',
        wakeId: 'WAKE-001',
    });

    assert.equal(invocation.execute, process.execPath);
    assert.equal(invocation.cwd, vreRoot);
    assert.deepEqual(invocation.argv, [
        path.join(vreRoot, 'bin', 'vre'),
        'research-loop',
        '--heartbeat',
        '--objective',
        'OBJ-001',
        '--wake-id',
        'WAKE-001',
        '--json',
    ]);
    assert.equal(
        invocation.env[loopWakeMod.LOOP_WAKE_CALLER_ENV],
        loopWakeMod.LOOP_WAKE_CALLER,
    );
});

test('runLoopWake passes through the sibling VRE JSON and marks the caller as plugin-loop-wake', () => {
    const { pluginRoot } = createFakePluginRepo();
    const vreRoot = createFakeVreRepo(path.dirname(pluginRoot));
    let captured = null;

    const outcome = loopWakeMod.runLoopWake({
        argv: ['--objective', 'OBJ-002', '--wake-id', 'WAKE-002'],
        pluginRepoRoot: pluginRoot,
        spawnSyncImpl: (execute, argv, options) => {
            captured = { execute, argv, options };
            return {
                status: 0,
                stdout: JSON.stringify({
                    ok: true,
                    command: 'research-loop',
                    phase9: true,
                    objectiveId: 'OBJ-002',
                    wakeId: 'WAKE-002',
                    wakeCaller: 'plugin-loop-wake',
                }),
                stderr: '',
            };
        },
    });

    assert.equal(captured.execute, process.execPath);
    assert.deepEqual(captured.argv, [
        path.join(vreRoot, 'bin', 'vre'),
        'research-loop',
        '--heartbeat',
        '--objective',
        'OBJ-002',
        '--wake-id',
        'WAKE-002',
        '--json',
    ]);
    assert.equal(
        captured.options.env[loopWakeMod.LOOP_WAKE_CALLER_ENV],
        loopWakeMod.LOOP_WAKE_CALLER,
    );
    assert.equal(outcome.exitCode, 0);
    assert.equal(outcome.payload.ok, true);
    assert.equal(outcome.payload.objectiveId, 'OBJ-002');
    assert.equal(outcome.payload.wakeId, 'WAKE-002');
    assert.equal(outcome.payload.wakeCaller, 'plugin-loop-wake');
});

test('loop-wake fails closed on missing required args or unexpected positionals', () => {
    assert.throws(
        () => loopWakeMod.parseLoopWakeArgs([]),
        (error) => {
            assert.equal(error.code, 'PHASE9_USAGE');
            assert.match(error.message, /requires --objective/u);
            return true;
        },
    );
    assert.throws(
        () => loopWakeMod.parseLoopWakeArgs(['--objective', 'OBJ-001']),
        (error) => {
            assert.equal(error.code, 'PHASE9_USAGE');
            assert.match(error.message, /requires --wake-id/u);
            return true;
        },
    );
    assert.throws(
        () => loopWakeMod.parseLoopWakeArgs(['unexpected', '--objective', 'OBJ-001', '--wake-id', 'WAKE-001']),
        (error) => {
            assert.equal(error.code, 'PHASE9_USAGE');
            assert.match(error.message, /does not accept positional arguments/u);
            return true;
        },
    );
});

test('loop-wake fails closed when the sibling VRE repository is absent', () => {
    const { pluginRoot } = createFakePluginRepo();

    assert.throws(
        () => loopWakeMod.buildLoopWakeInvocation({
            pluginRepoRoot: pluginRoot,
            objectiveId: 'OBJ-001',
            wakeId: 'WAKE-001',
        }),
        (error) => {
            assert.equal(error.code, 'VRE_MISSING');
            assert.match(error.message, /VRE_MISSING/u);
            return true;
        },
    );
});
