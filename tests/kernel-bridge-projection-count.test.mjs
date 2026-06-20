import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VRE_ROOT = path.resolve(ROOT, '..', 'vibe-research-environment');
const FIXTURE_PATH = path.join(ROOT, 'tests', 'fixtures', 'kernel-bridge-projection-count.fixture.json');
const VRE_KERNEL_BRIDGE_PATH = path.join(VRE_ROOT, 'environment', 'lib', 'kernel-bridge.js');

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));
const coreReaderMod = await import(pathToFileURL(path.join(ROOT, 'plugin', 'lib', 'core-reader.js')).href);
const vreBridgeMod = await import(pathToFileURL(VRE_KERNEL_BRIDGE_PATH).href);

test('fixture count stays aligned with sibling kernel exports and VRE typed-duck declarations', () => {
    const exportedProjectionNames = Object.keys(coreReaderMod.PROJECTIONS);
    assert.equal(fixture.declaredCount, fixture.projectionNames.length);
    assert.deepEqual(exportedProjectionNames, fixture.projectionNames);
    assert.deepEqual([...vreBridgeMod.__testables.PROJECTION_NAMES], fixture.projectionNames);
    assert.equal(vreBridgeMod.WP150_TYPED_DUCK_PROJECTION_COUNT, fixture.declaredCount);
});

test('VRE bridge source text pins the contract to nine projections', () => {
    const source = fs.readFileSync(VRE_KERNEL_BRIDGE_PATH, 'utf8');
    assert.match(source, new RegExp(fixture.vreBridgeComment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
    assert.doesNotMatch(source, /The eight projections frozen in WP-150's typed-duck contract\./u);
});
