import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VRE_ROOT = path.resolve(ROOT, '..', 'vibe-research-environment');
const rel = (...segments) => path.join(ROOT, ...segments);
const vreUrl = (...segments) => pathToFileURL(path.join(VRE_ROOT, ...segments)).href;

const manifestMod = await import(vreUrl('environment', 'lib', 'manifest.js'));
const storeMod = await import(vreUrl('environment', 'objectives', 'store.js'));

const analysisFixture = JSON.parse(
    fs.readFileSync(
        path.join(
            VRE_ROOT,
            'environment',
            'tests',
            'fixtures',
            'phase9',
            'analysis-manifest',
            'valid-python.json',
        ),
        'utf8',
    ),
);
const objectiveFixture = JSON.parse(
    fs.readFileSync(
        path.join(
            VRE_ROOT,
            'environment',
            'tests',
            'fixtures',
            'phase9',
            'objective',
            'valid-active.json',
        ),
        'utf8',
    ),
);
const pointerFixture = JSON.parse(
    fs.readFileSync(
        path.join(
            VRE_ROOT,
            'environment',
            'tests',
            'fixtures',
            'phase9',
            'active-objective-pointer',
            'valid-active.json',
        ),
        'utf8',
    ),
);

let tempRoot = null;

afterEach(() => {
    if (tempRoot) {
        fs.rmSync(tempRoot, { recursive: true, force: true });
        tempRoot = null;
    }
});

function createWorkspace() {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-phase9-vre-gate-'));
    const pluginRoot = path.join(tempRoot, 'vibe-science');
    const vreRoot = path.join(tempRoot, 'vibe-research-environment');
    const fakeHome = path.join(tempRoot, 'home');

    fs.mkdirSync(path.join(pluginRoot, 'plugin', 'scripts'), { recursive: true });
    fs.writeFileSync(
        path.join(pluginRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-science-plugin', type: 'module' }, null, 2),
        'utf8',
    );
    fs.writeFileSync(path.join(pluginRoot, 'plugin', 'scripts', 'session-start.js'), 'export default null;\n', 'utf8');

    fs.cpSync(path.join(VRE_ROOT, 'environment'), path.join(vreRoot, 'environment'), { recursive: true });
    fs.mkdirSync(path.join(vreRoot, 'bin'), { recursive: true });
    fs.writeFileSync(
        path.join(vreRoot, 'package.json'),
        JSON.stringify({ name: 'vibe-research-environment', type: 'module' }, null, 2),
        'utf8',
    );
    fs.writeFileSync(path.join(vreRoot, 'bin', 'vre'), '#!/usr/bin/env node\n', 'utf8');
    if (fs.existsSync(path.join(VRE_ROOT, 'node_modules'))) {
        fs.symlinkSync(
            path.join(VRE_ROOT, 'node_modules'),
            path.join(vreRoot, 'node_modules'),
            'junction',
        );
    }
    fs.mkdirSync(fakeHome, { recursive: true });

    return {
        fakeHome,
        pluginRoot,
        vreRoot,
    };
}

async function writeObjectiveState(vreRoot, objectiveId, experimentId) {
    const objectiveRecord = {
        ...structuredClone(objectiveFixture),
        objectiveId,
        status: 'active',
        artifactsIndex: {
            ...structuredClone(objectiveFixture.artifactsIndex ?? {}),
            experiments: [experimentId],
        },
    };
    await storeMod.activateObjective(vreRoot, objectiveRecord, {
        sessionId: pointerFixture.lockAcquiredBySession ?? 'sess-t33',
        lockAcquiredAt: pointerFixture.lockAcquiredAt,
    });
}

async function writeExperimentManifest(vreRoot, experimentId) {
    await manifestMod.createManifest(vreRoot, {
        experimentId,
        title: `Phase 9 manifest ${experimentId}`,
        objective: 'OBJ-T33-001',
    });
}

function writeAnalysisManifest(vreRoot, objectiveId, experimentId) {
    const manifestPath = path.join(
        vreRoot,
        '.vibe-science-environment',
        'objectives',
        objectiveId,
        'analysis-manifest.json',
    );
    const payload = {
        ...structuredClone(analysisFixture),
        objectiveId,
        experimentId,
        analysisId: 'ANL-T33-001',
    };
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(payload, null, 2), 'utf8');
    return manifestPath;
}

function spawnPreToolUse(workspace, command, envOverrides = {}) {
    return spawnSync(
        process.execPath,
        [rel('plugin', 'scripts', 'pre-tool-use.js')],
        {
            cwd: ROOT,
            encoding: 'utf8',
            input: JSON.stringify({
                tool_name: 'Bash',
                tool_input: { command },
                session_id: 'sess-t33',
                cwd: workspace.pluginRoot,
            }),
            env: {
                ...process.env,
                HOME: workspace.fakeHome,
                USERPROFILE: workspace.fakeHome,
                ...envOverrides,
            },
        },
    );
}

test('T3.3: direct python script.py stays denied under Opzione B nuclear baseline', () => {
    const workspace = createWorkspace();
    const result = spawnPreToolUse(workspace, 'python script.py', {
        VIBE_PHASE9_ENABLED: '1',
    });

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /Opzione B nuclear/i);
});

test('T3.3: node <sibling-vre>/bin/vre run-analysis --manifest literal-path is allowed when phase9 is enabled', async () => {
    const workspace = createWorkspace();
    const objectiveId = 'OBJ-T33-001';
    const experimentId = 'EXP-021';
    await writeObjectiveState(workspace.vreRoot, objectiveId, experimentId);
    await writeExperimentManifest(workspace.vreRoot, experimentId);
    const manifestPath = writeAnalysisManifest(workspace.vreRoot, objectiveId, experimentId);

    const command = [
        'node',
        '../vibe-research-environment/bin/vre',
        'run-analysis',
        '--manifest',
        path.relative(workspace.pluginRoot, manifestPath).split(path.sep).join('/'),
    ].join(' ');
    const result = spawnPreToolUse(workspace, command, {
        VIBE_PHASE9_ENABLED: '1',
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'allow');
});

test('T3.3: node other/bin/vre ... is denied because only the discovered sibling VRE path is sanctioned', () => {
    const workspace = createWorkspace();
    const result = spawnPreToolUse(
        workspace,
        'node other/bin/vre run-analysis --manifest valid.json',
        { VIBE_PHASE9_ENABLED: '1' },
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /sibling VRE bin\/vre entrypoint/i);
});

test('T3.3: variable or computed manifest path is denied even when the VRE entrypoint is correct', async () => {
    const workspace = createWorkspace();
    const objectiveId = 'OBJ-T33-001';
    const experimentId = 'EXP-021';
    await writeObjectiveState(workspace.vreRoot, objectiveId, experimentId);
    await writeExperimentManifest(workspace.vreRoot, experimentId);
    writeAnalysisManifest(workspace.vreRoot, objectiveId, experimentId);

    const result = spawnPreToolUse(
        workspace,
        'node ../vibe-research-environment/bin/vre run-analysis --manifest $MANIFEST_PATH',
        { VIBE_PHASE9_ENABLED: '1' },
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /manifest path must be visible/i);
});

test('T3.3: missing feature flag keeps the sanctioned command blocked', async () => {
    const workspace = createWorkspace();
    const objectiveId = 'OBJ-T33-001';
    const experimentId = 'EXP-021';
    await writeObjectiveState(workspace.vreRoot, objectiveId, experimentId);
    await writeExperimentManifest(workspace.vreRoot, experimentId);
    const manifestPath = writeAnalysisManifest(workspace.vreRoot, objectiveId, experimentId);

    const command = [
        'node',
        '../vibe-research-environment/bin/vre',
        'run-analysis',
        '--manifest',
        path.relative(workspace.pluginRoot, manifestPath).split(path.sep).join('/'),
    ].join(' ');
    const result = spawnPreToolUse(workspace, command);

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, 'deny');
    assert.match(result.stderr, /feature flag/i);
});
