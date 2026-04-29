#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDB, closeDB } from '../lib/db.js';
import { applyMigrations } from '../lib/migrations.js';
import { logPhase9GovernanceEvent } from '../lib/phase9-governance-events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PLUGIN_REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLUGIN_PACKAGE_NAME = 'vibe-science-plugin';
const VRE_PACKAGE_NAME = 'vibe-research-environment';
const GOVERNANCE_SOURCE_COMPONENT = 'plugin/scripts/handshake-inject';
const RESEARCH_PROMPT_PATTERN = /\b(research|resume|analysis|analyse|analy[sz]e|paper|literature|claim|promot|loop|tool|service|discover|discovery|connector|schema|automation|memory api|queueable|objective)\b/iu;

export const HANDSHAKE_SCHEMA_VERSION = 'phase9.capability-handshake.v1';
export const HANDSHAKE_ARTIFACT_RELATIVE_PATH = '.vibe-science-environment/control/capability-handshake.json';
export const HANDSHAKE_DEGRADED_TOKEN = 'HANDSHAKE_STALE_OR_UNAVAILABLE';
export const PHASE9_HANDSHAKE_SECTION = '[PHASE9 HANDSHAKE DIGEST]';
export const HANDSHAKE_TTL_MS = Object.freeze({
    startup: 10 * 60 * 1000,
    unattendedWake: 60 * 1000,
});

const TOP_LEVEL_REQUIRED = [
    'schemaVersion',
    'generatedAt',
    'vrePresent',
    'vrePath',
    'kernel',
    'vre',
    'objective',
    'memory',
    'degradedReasons',
];

const KERNEL_REQUIRED = [
    'mode',
    'dbAvailable',
    'unreachableReason',
    'projections',
    'alertsCount',
    'unresolvedR2Count',
    'lastKernelActivity',
];

const KERNEL_PROJECTIONS_REQUIRED = [
    'probes',
    'availableNames',
    'unavailable',
];

const VRE_REQUIRED = [
    'executableCommands',
    'markdownOnlyContracts',
    'queueableTaskKinds',
    'schemas',
    'connectors',
    'automations',
    'domainPacks',
    'memoryApis',
    'operatorSurface',
    'missingSurfaces',
];

const OPERATOR_SURFACE_REQUIRED = [
    'commands',
    'doctorCommands',
    'artifactPaths',
];

const OBJECTIVE_REQUIRED = [
    'activePointer',
    'activeObjectiveId',
    'status',
];

const MEMORY_REQUIRED = [
    'fresh',
    'lastSyncAt',
];

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function hasRequiredKeys(candidate, keys) {
    return isPlainObject(candidate) && keys.every((key) => Object.prototype.hasOwnProperty.call(candidate, key));
}

function isDateString(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function readPackageName(candidateRoot) {
    try {
        const raw = readFileSync(path.join(candidateRoot, 'package.json'), 'utf8');
        return JSON.parse(raw).name ?? null;
    } catch {
        return null;
    }
}

function isVreRepoRoot(candidateRoot, existsSyncImpl = existsSync) {
    return (
        readPackageName(candidateRoot) === VRE_PACKAGE_NAME &&
        existsSyncImpl(path.join(candidateRoot, 'bin', 'vre')) &&
        existsSyncImpl(path.join(candidateRoot, 'environment', 'schemas'))
    );
}

function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean).map((value) => String(value)))].sort((left, right) => left.localeCompare(right));
}

function formatList(values, fallback = 'none') {
    return Array.isArray(values) && values.length > 0 ? values.join(', ') : fallback;
}

function firstTruthyString(values, fallback = 'none') {
    const hit = values.find((value) => typeof value === 'string' && value.trim() !== '');
    return hit ?? fallback;
}

function resolveHandshakeTtlMs(ttlProfile = 'startup') {
    return ttlProfile === 'unattendedWake'
        ? HANDSHAKE_TTL_MS.unattendedWake
        : HANDSHAKE_TTL_MS.startup;
}

function isFreshGeneratedAt(generatedAt, ttlMs, nowMs) {
    if (!isDateString(generatedAt)) {
        return false;
    }
    return (nowMs - Date.parse(generatedAt)) <= ttlMs;
}

function validateRequiredArray(arrayValue, label, errors) {
    if (!Array.isArray(arrayValue)) {
        errors.push(`${label} must be an array`);
    }
}

export function validateCapabilityHandshake(payload) {
    const errors = [];

    if (!hasRequiredKeys(payload, TOP_LEVEL_REQUIRED)) {
        errors.push('top-level required fields are missing');
        return { ok: false, errors };
    }

    if (payload.schemaVersion !== HANDSHAKE_SCHEMA_VERSION) {
        errors.push(`schemaVersion must equal ${HANDSHAKE_SCHEMA_VERSION}`);
    }
    if (!isDateString(payload.generatedAt)) {
        errors.push('generatedAt must be an ISO date-time string');
    }
    if (typeof payload.vrePresent !== 'boolean') {
        errors.push('vrePresent must be boolean');
    }
    if (!(typeof payload.vrePath === 'string' || payload.vrePath === null)) {
        errors.push('vrePath must be string|null');
    }
    if (!hasRequiredKeys(payload.kernel, KERNEL_REQUIRED)) {
        errors.push('kernel required fields are missing');
    } else {
        if (!['full', 'degraded', 'missing'].includes(payload.kernel.mode)) {
            errors.push('kernel.mode must be full|degraded|missing');
        }
        if (typeof payload.kernel.dbAvailable !== 'boolean') {
            errors.push('kernel.dbAvailable must be boolean');
        }
        if (!(typeof payload.kernel.unreachableReason === 'string' || payload.kernel.unreachableReason === null)) {
            errors.push('kernel.unreachableReason must be string|null');
        }
        if (!hasRequiredKeys(payload.kernel.projections, KERNEL_PROJECTIONS_REQUIRED)) {
            errors.push('kernel.projections required fields are missing');
        } else {
            validateRequiredArray(payload.kernel.projections.probes, 'kernel.projections.probes', errors);
            validateRequiredArray(payload.kernel.projections.availableNames, 'kernel.projections.availableNames', errors);
            validateRequiredArray(payload.kernel.projections.unavailable, 'kernel.projections.unavailable', errors);
        }
    }

    if (!hasRequiredKeys(payload.vre, VRE_REQUIRED)) {
        errors.push('vre required fields are missing');
    } else {
        for (const key of VRE_REQUIRED) {
            if (key === 'operatorSurface') {
                continue;
            }
            validateRequiredArray(payload.vre[key], `vre.${key}`, errors);
        }
        if (!hasRequiredKeys(payload.vre.operatorSurface, OPERATOR_SURFACE_REQUIRED)) {
            errors.push('vre.operatorSurface required fields are missing');
        } else {
            for (const key of OPERATOR_SURFACE_REQUIRED) {
                validateRequiredArray(payload.vre.operatorSurface[key], `vre.operatorSurface.${key}`, errors);
            }
        }
    }

    if (!hasRequiredKeys(payload.objective, OBJECTIVE_REQUIRED)) {
        errors.push('objective required fields are missing');
    }
    if (!hasRequiredKeys(payload.memory, MEMORY_REQUIRED)) {
        errors.push('memory required fields are missing');
    } else {
        if (typeof payload.memory.fresh !== 'boolean') {
            errors.push('memory.fresh must be boolean');
        }
        if (!(typeof payload.memory.lastSyncAt === 'string' || payload.memory.lastSyncAt === null)) {
            errors.push('memory.lastSyncAt must be string|null');
        }
    }

    validateRequiredArray(payload.degradedReasons, 'degradedReasons', errors);

    return {
        ok: errors.length === 0,
        errors,
    };
}

function buildSyntheticHandshake({ nowMs, vrePresent, vrePath, degradedReasons }) {
    const normalizedReasons = uniqueSorted(degradedReasons);
    return {
        schemaVersion: HANDSHAKE_SCHEMA_VERSION,
        generatedAt: new Date(nowMs).toISOString(),
        vrePresent,
        vrePath,
        kernel: {
            mode: 'missing',
            dbAvailable: false,
            unreachableReason: firstTruthyString(normalizedReasons, null),
            projections: {
                probes: [],
                availableNames: [],
                unavailable: [],
            },
            alertsCount: 0,
            unresolvedR2Count: 0,
            lastKernelActivity: null,
        },
        vre: {
            executableCommands: [],
            markdownOnlyContracts: [],
            queueableTaskKinds: [],
            schemas: [],
            connectors: [],
            automations: [],
            domainPacks: [],
            memoryApis: [],
            operatorSurface: {
                commands: [],
                doctorCommands: [],
                artifactPaths: [],
            },
            missingSurfaces: [],
        },
        objective: {
            activePointer: null,
            activeObjectiveId: null,
            status: null,
        },
        memory: {
            fresh: false,
            lastSyncAt: null,
        },
        degradedReasons: normalizedReasons,
    };
}

function validateArtifactPayload(payload, ttlMs, nowMs) {
    const validation = validateCapabilityHandshake(payload);
    if (!validation.ok) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_ARTIFACT_INVALID: ${validation.errors.join('; ')}`,
        };
    }
    if (!isFreshGeneratedAt(payload.generatedAt, ttlMs, nowMs)) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_ARTIFACT_STALE: generatedAt ${payload.generatedAt} is older than ${ttlMs}ms`,
        };
    }
    return { ok: true, payload };
}

function readValidatedArtifact({ artifactPath, ttlMs, nowMs, existsSyncImpl = existsSync, readFileSyncImpl = readFileSync }) {
    if (!existsSyncImpl(artifactPath)) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_ARTIFACT_MISSING: ${artifactPath}`,
        };
    }

    try {
        const parsed = JSON.parse(readFileSyncImpl(artifactPath, 'utf8'));
        return validateArtifactPayload(parsed, ttlMs, nowMs);
    } catch (error) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_ARTIFACT_INVALID_JSON: ${error.message}`,
        };
    }
}

function runCapabilitiesCli({ vreRoot, env = process.env, spawnSyncImpl = spawnSync }) {
    const cliPath = path.join(vreRoot, 'bin', 'vre');
    const result = spawnSyncImpl(
        process.execPath,
        [cliPath, 'capabilities', '--json'],
        {
            cwd: vreRoot,
            encoding: 'utf-8',
            env,
            timeout: 15000,
        },
    );

    if (result.error) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_CLI_FAILED: ${result.error.message}`,
        };
    }
    if (result.status !== 0) {
        const detail = String(result.stderr || result.stdout || '').trim() || `exit ${result.status}`;
        return {
            ok: false,
            error: `VRE_HANDSHAKE_CLI_FAILED: ${detail}`,
        };
    }

    try {
        const payload = JSON.parse(String(result.stdout || '').trim());
        const validation = validateCapabilityHandshake(payload);
        if (!validation.ok) {
            return {
                ok: false,
                error: `VRE_HANDSHAKE_CLI_INVALID: ${validation.errors.join('; ')}`,
            };
        }
        return {
            ok: true,
            payload,
        };
    } catch (error) {
        return {
            ok: false,
            error: `VRE_HANDSHAKE_CLI_INVALID_JSON: ${error.message}`,
        };
    }
}

export function isPhase9HandshakeEnabled(env = process.env) {
    return env.VIBE_PHASE9_HANDSHAKE_ONLY === '1' || env.VIBE_PHASE9_ENABLED === '1';
}

export function promptNeedsFreshHandshake(prompt = '') {
    return RESEARCH_PROMPT_PATTERN.test(String(prompt || ''));
}

export function resolvePluginRepoRoot(startPath = DEFAULT_PLUGIN_REPO_ROOT) {
    let current = path.resolve(startPath);

    while (true) {
        if (
            readPackageName(current) === PLUGIN_PACKAGE_NAME &&
            existsSync(path.join(current, 'plugin', 'scripts', 'session-start.js'))
        ) {
            return current;
        }

        const parent = path.dirname(current);
        if (parent === current) {
            return DEFAULT_PLUGIN_REPO_ROOT;
        }
        current = parent;
    }
}

export function resolveSiblingVreRoot({ pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT, existsSyncImpl = existsSync } = {}) {
    const normalizedPluginRoot = resolvePluginRepoRoot(pluginRepoRoot);
    const candidate = path.join(path.dirname(normalizedPluginRoot), VRE_PACKAGE_NAME);

    if (isVreRepoRoot(candidate, existsSyncImpl)) {
        return {
            vreRoot: candidate,
            source: 'sibling-auto-discovery',
            reason: null,
        };
    }

    return {
        vreRoot: null,
        source: 'not-found',
        reason: `VRE_MISSING: sibling ${VRE_PACKAGE_NAME} not found beside ${normalizedPluginRoot}`,
    };
}

export function readPhase9Handshake({
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    ttlProfile = 'startup',
    nowMs = Date.now(),
    env = process.env,
    allowCli = true,
    allowArtifact = true,
    spawnSyncImpl = spawnSync,
    readFileSyncImpl = readFileSync,
    existsSyncImpl = existsSync,
} = {}) {
    const ttlMs = resolveHandshakeTtlMs(ttlProfile);
    const resolvedPluginRoot = resolvePluginRepoRoot(pluginRepoRoot);
    const discovery = resolveSiblingVreRoot({
        pluginRepoRoot: resolvedPluginRoot,
        existsSyncImpl,
    });

    if (!discovery.vreRoot) {
        const handshake = buildSyntheticHandshake({
            nowMs,
            vrePresent: false,
            vrePath: null,
            degradedReasons: [discovery.reason],
        });
        return {
            source: 'missing',
            handshake,
            contextWarning: discovery.reason,
            vreRoot: null,
            artifactPath: null,
        };
    }

    const artifactPath = path.join(discovery.vreRoot, HANDSHAKE_ARTIFACT_RELATIVE_PATH);
    const errors = [];

    if (allowCli) {
        const cliResult = runCapabilitiesCli({
            vreRoot: discovery.vreRoot,
            env,
            spawnSyncImpl,
        });
        if (cliResult.ok) {
            return {
                source: 'cli',
                handshake: cliResult.payload,
                contextWarning: null,
                vreRoot: discovery.vreRoot,
                artifactPath,
            };
        }
        errors.push(cliResult.error);
    }

    if (allowArtifact) {
        const artifactResult = readValidatedArtifact({
            artifactPath,
            ttlMs,
            nowMs,
            existsSyncImpl,
            readFileSyncImpl,
        });
        if (artifactResult.ok) {
            return {
                source: 'artifact',
                handshake: artifactResult.payload,
                contextWarning: errors[0] ?? null,
                vreRoot: discovery.vreRoot,
                artifactPath,
            };
        }
        errors.push(artifactResult.error);
    }

    const degradedReasons = uniqueSorted([
        HANDSHAKE_DEGRADED_TOKEN,
        ...errors,
    ]);

    return {
        source: 'degraded',
        handshake: buildSyntheticHandshake({
            nowMs,
            vrePresent: true,
            vrePath: discovery.vreRoot,
            degradedReasons,
        }),
        contextWarning: errors[0] ?? HANDSHAKE_DEGRADED_TOKEN,
        vreRoot: discovery.vreRoot,
        artifactPath,
    };
}

function handshakeStatusLabel(state) {
    if (state.source === 'missing') {
        return 'missing';
    }
    if (state.source === 'degraded') {
        return 'degraded';
    }
    if (Array.isArray(state.handshake?.degradedReasons) && state.handshake.degradedReasons.length > 0) {
        return 'degraded';
    }
    return 'full';
}

function countArrayValues(value) {
    return Array.isArray(value) ? value.length : 0;
}

function countHandshakeCapabilities(handshake) {
    const vre = handshake?.vre ?? {};
    const operatorSurface = vre.operatorSurface ?? {};
    return [
        vre.executableCommands,
        vre.markdownOnlyContracts,
        vre.queueableTaskKinds,
        vre.schemas,
        vre.connectors,
        vre.automations,
        vre.domainPacks,
        vre.memoryApis,
        operatorSurface.commands,
        operatorSurface.doctorCommands,
        operatorSurface.artifactPaths,
    ].reduce((total, value) => total + countArrayValues(value), 0);
}

function buildHandshakeId(state) {
    const handshake = state.handshake ?? {};
    const stableInput = JSON.stringify({
        schemaVersion: handshake.schemaVersion ?? null,
        generatedAt: handshake.generatedAt ?? null,
        source: state.source ?? null,
        capabilitiesCount: countHandshakeCapabilities(handshake),
    });
    return `HND-${createHash('sha256').update(stableInput).digest('hex').slice(0, 12)}`;
}

function classifyHandshakeDegradedReason(state) {
    const reasons = Array.isArray(state.handshake?.degradedReasons)
        ? state.handshake.degradedReasons
        : [];

    if (state.source === 'missing' || reasons.some((reason) => String(reason).startsWith('VRE_MISSING:'))) {
        return 'vre-missing';
    }
    if (reasons.some((reason) => String(reason).startsWith('VRE_HANDSHAKE_CLI_'))) {
        return 'cli-fail';
    }
    if (state.handshake?.kernel?.dbAvailable === false || reasons.some((reason) => /\bdb\b|database/iu.test(String(reason)))) {
        return 'db-unavailable';
    }
    if (reasons.some((reason) => String(reason).startsWith('VRE_HANDSHAKE_ARTIFACT_'))) {
        return 'artifact-unavailable';
    }
    return 'other';
}

function logHandshakeGovernanceTelemetry(state, { db = null } = {}) {
    const status = handshakeStatusLabel(state);
    const eventType = status === 'full' ? 'handshake_injected' : 'handshake_degraded';
    let ownedDb = null;

    try {
        const targetDb = db ?? openDB?.();
        if (!targetDb) {
            throw new Error('database unavailable');
        }
        if (!db) {
            ownedDb = targetDb;
            applyMigrations(targetDb);
        }

        const details = eventType === 'handshake_injected'
            ? {
                handshake_id: buildHandshakeId(state),
                capabilities_count: countHandshakeCapabilities(state.handshake),
            }
            : {
                reason: classifyHandshakeDegradedReason(state),
            };

        logPhase9GovernanceEvent(targetDb, {
            event_type: eventType,
            source_component: GOVERNANCE_SOURCE_COMPONENT,
            objective_id: null,
            severity: eventType === 'handshake_injected' ? 'info' : 'warning',
            details,
        });
    } catch (error) {
        process.stderr.write(`[phase9-handshake] governance telemetry failed: ${error.message}\n`);
    } finally {
        if (ownedDb) {
            try {
                closeDB(ownedDb);
            } catch {
                // Governance telemetry is fail-soft; close failures cannot affect handshake injection.
            }
        }
    }
}

function connectorSummary(connectors) {
    return formatList(
        connectors.map((connector) => `${connector.id}:${connector.status}`),
    );
}

function automationSummary(automations) {
    return formatList(
        automations.map((automation) => `${automation.id}:${automation.status}`),
    );
}

function domainPackSummary(domainPacks) {
    return formatList(
        domainPacks.map((pack) => `${pack.id}:${pack.status}`),
    );
}

export function renderPhase9HandshakeDigest(state) {
    const handshake = state.handshake;
    const status = handshakeStatusLabel(state);
    const lines = [
        PHASE9_HANDSHAKE_SECTION,
        `status: ${status}`,
        `source: ${state.source}`,
        `generatedAt: ${handshake.generatedAt}`,
        `vrePresent: ${handshake.vrePresent}`,
        `vrePath: ${handshake.vrePath ?? 'null'}`,
        `payloadArtifact: ${state.artifactPath ?? 'unavailable'}`,
        `kernel.mode: ${handshake.kernel.mode}`,
        `kernel.alertsCount: ${handshake.kernel.alertsCount}`,
        `kernel.unresolvedR2Count: ${handshake.kernel.unresolvedR2Count}`,
        `memory: ${handshake.memory.fresh ? 'fresh' : 'stale'} (lastSyncAt: ${handshake.memory.lastSyncAt ?? 'null'})`,
        `objective: ${handshake.objective.activeObjectiveId ?? 'none'} (${handshake.objective.status ?? 'null'})`,
        `executableCommands: ${formatList(handshake.vre.executableCommands)}`,
        `markdownOnlyContracts (docs only): ${formatList(handshake.vre.markdownOnlyContracts)}`,
        `queueableTaskKinds: ${formatList(handshake.vre.queueableTaskKinds)}`,
        `schemas: ${handshake.vre.schemas.length} total`,
        `connectors: ${connectorSummary(handshake.vre.connectors)}`,
        `automations: ${automationSummary(handshake.vre.automations)}`,
        `domainPacks: ${domainPackSummary(handshake.vre.domainPacks)}`,
        `memoryApis: ${handshake.vre.memoryApis.length} reviewed exports`,
        `operatorCommands: ${formatList(handshake.vre.operatorSurface.commands)}`,
        `doctorCommands: ${formatList(handshake.vre.operatorSurface.doctorCommands)}`,
        `operatorArtifactPaths: ${formatList(handshake.vre.operatorSurface.artifactPaths)}`,
        `missingSurfaces: ${formatList(handshake.vre.missingSurfaces)}`,
        `degradedReasons: ${formatList(handshake.degradedReasons)}`,
    ];

    if (state.source === 'missing' || state.source === 'degraded') {
        lines.push('nextAction: discovery, not research');
    }

    return lines.join('\n');
}

export function insertSectionBeforeEndMarker(contextText, sectionText) {
    if (!sectionText) {
        return contextText;
    }

    const endMarker = '--- END CONTEXT ---';
    return contextText.includes(endMarker)
        ? contextText.replace(endMarker, `${sectionText}\n${endMarker}`)
        : `${contextText}\n${sectionText}`;
}

export function buildPhase9HandshakeInjection({
    mode,
    prompt = '',
    env = process.env,
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    db = null,
    nowMs = Date.now(),
    spawnSyncImpl = spawnSync,
    readFileSyncImpl = readFileSync,
    existsSyncImpl = existsSync,
} = {}) {
    if (!isPhase9HandshakeEnabled(env)) {
        return {
            enabled: false,
            injected: false,
            context: '',
            handshake: null,
            source: 'disabled',
            warning: null,
        };
    }

    if (mode !== 'session-start' && mode !== 'prompt-submit') {
        throw new Error(`Unsupported Phase 9 handshake injection mode: ${mode}`);
    }

    if (mode === 'prompt-submit' && !promptNeedsFreshHandshake(prompt)) {
        const passiveState = readPhase9Handshake({
            pluginRepoRoot,
            ttlProfile: 'startup',
            nowMs,
            env,
            allowCli: false,
            allowArtifact: true,
            spawnSyncImpl,
            readFileSyncImpl,
            existsSyncImpl,
        });
        const activeObjective = passiveState.handshake?.objective?.activeObjectiveId != null;
        if (!activeObjective) {
            return {
                enabled: true,
                injected: false,
                context: '',
                handshake: passiveState.handshake,
                source: 'non-research-skip',
                warning: null,
            };
        }

        logHandshakeGovernanceTelemetry(passiveState, { db });

        return {
            enabled: true,
            injected: true,
            context: renderPhase9HandshakeDigest(passiveState),
            handshake: passiveState.handshake,
            source: passiveState.source,
            warning: passiveState.source === 'degraded' || passiveState.source === 'missing'
                ? passiveState.contextWarning
                : null,
        };
    }

    const state = readPhase9Handshake({
        pluginRepoRoot,
        ttlProfile: 'startup',
        nowMs,
        env,
        allowCli: true,
        allowArtifact: true,
        spawnSyncImpl,
        readFileSyncImpl,
        existsSyncImpl,
    });

    logHandshakeGovernanceTelemetry(state, { db });

    return {
        enabled: true,
        injected: true,
        context: renderPhase9HandshakeDigest(state),
        handshake: state.handshake,
        source: state.source,
        warning: state.source === 'degraded' || state.source === 'missing'
            ? state.contextWarning
            : null,
    };
}
