import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
    isPhase9HandshakeEnabled,
    resolvePluginRepoRoot,
    resolveSiblingVreRoot,
} from './handshake-inject.js';

export const PHASE9_OBJECTIVE_SECTION = '[PHASE9 OBJECTIVE DIGEST]';
export const ACTIVE_OBJECTIVE_POINTER_RELATIVE_PATH = '.vibe-science-environment/objectives/active-objective.json';
export const RESUME_SNAPSHOT_FILE = 'resume-snapshot.json';

function isPlainObject(value) {
    return value != null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeSlashes(value) {
    return String(value || '').split(path.sep).join('/');
}

function truncate(text, maxLen = 140) {
    if (typeof text !== 'string') return 'none';
    return text.length <= maxLen ? text : `${text.slice(0, maxLen)}...`;
}

function formatList(values, fallback = 'none') {
    return Array.isArray(values) && values.length > 0 ? values.join(', ') : fallback;
}

function formatNextAction(nextAction) {
    if (!isPlainObject(nextAction)) {
        return 'unknown';
    }
    const params = isPlainObject(nextAction.params) && Object.keys(nextAction.params).length > 0
        ? ` ${JSON.stringify(nextAction.params)}`
        : '';
    return `${nextAction.kind ?? 'unknown'}${params}`;
}

function formatBlockers(blockers) {
    if (!Array.isArray(blockers) || blockers.length === 0) {
        return 'none';
    }
    return blockers
        .map((entry) => `${entry.code ?? 'unknown'}:${truncate(entry.message ?? 'no-message', 80)}`)
        .join(', ');
}

function deriveWakeLeaseStatus(currentWakeLease, nowMs) {
    if (!isPlainObject(currentWakeLease) || currentWakeLease.wakeId == null) {
        return 'idle';
    }
    if (
        typeof currentWakeLease.leaseExpiresAt === 'string' &&
        Number.isFinite(Date.parse(currentWakeLease.leaseExpiresAt)) &&
        Date.parse(currentWakeLease.leaseExpiresAt) < nowMs
    ) {
        return 'expired';
    }
    return 'held';
}

function resolveRepoPath(repoRoot, candidatePath, label) {
    if (typeof candidatePath !== 'string' || candidatePath.trim() === '') {
        throw new Error(`${label} is missing`);
    }

    const resolved = path.isAbsolute(candidatePath)
        ? path.resolve(candidatePath)
        : path.resolve(repoRoot, candidatePath);
    const relative = path.relative(repoRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error(`${label} must stay inside the VRE root: ${candidatePath}`);
    }
    return resolved;
}

function readJsonFile(targetPath, label) {
    try {
        return JSON.parse(readFileSync(targetPath, 'utf8'));
    } catch (error) {
        throw new Error(`${label} is unreadable: ${error.message}`);
    }
}

function buildBlockerState(baseState, code, message, detail, nextAction) {
    return {
        ...baseState,
        loaderState: 'blocker',
        blocker: {
            code,
            message,
            detail,
        },
        recommendedAction: nextAction,
    };
}

function validatePointerShape(pointer) {
    if (!isPlainObject(pointer)) {
        throw new Error('active pointer must be an object');
    }
    if (typeof pointer.objectiveId !== 'string' || pointer.objectiveId.trim() === '') {
        throw new Error('active pointer objectiveId is missing');
    }
    if (typeof pointer.objectiveRecordPath !== 'string' || pointer.objectiveRecordPath.trim() === '') {
        throw new Error('active pointer objectiveRecordPath is missing');
    }
}

function validateObjectiveShape(objectiveRecord) {
    if (!isPlainObject(objectiveRecord)) {
        throw new Error('objective record must be an object');
    }
    const requiredKeys = [
        'objectiveId',
        'title',
        'question',
        'status',
        'runtimeMode',
        'reasoningMode',
        'wakePolicy',
    ];
    for (const key of requiredKeys) {
        if (!Object.prototype.hasOwnProperty.call(objectiveRecord, key)) {
            throw new Error(`objective record is missing ${key}`);
        }
    }
}

function detectSnapshotMismatch(snapshot, objectiveRecord) {
    if (!isPlainObject(snapshot)) {
        return {
            code: 'E_STATE_CONFLICT',
            message: 'Resume snapshot is unreadable or invalid.',
            detail: 'resume-snapshot.json is not a valid object',
            nextAction: `objective resume --objective ${objectiveRecord.objectiveId} --repair-snapshot`,
        };
    }

    const requiredKeys = [
        'objectiveId',
        'objectiveStatusAtSnapshot',
        'runtimeMode',
        'reasoningMode',
        'stageCursor',
        'nextAction',
        'queueVisibility',
        'openBlockers',
        'openHandoffs',
        'wakeLease',
        'writtenAt',
        'writtenReason',
    ];
    for (const key of requiredKeys) {
        if (!Object.prototype.hasOwnProperty.call(snapshot, key)) {
            return {
                code: 'E_STATE_CONFLICT',
                message: 'Resume snapshot is missing required fields.',
                detail: `resume-snapshot.json is missing ${key}`,
                nextAction: `objective resume --objective ${objectiveRecord.objectiveId} --repair-snapshot`,
            };
        }
    }

    if (snapshot.objectiveId !== objectiveRecord.objectiveId) {
        return {
            code: 'E_RESUME_SNAPSHOT_DIVERGED',
            message: 'Resume snapshot objectiveId diverged from the immutable objective record.',
            detail: `resume-snapshot.objectiveId=${snapshot.objectiveId} while objective.objectiveId=${objectiveRecord.objectiveId}`,
            nextAction: `objective resume --objective ${objectiveRecord.objectiveId} --repair-snapshot`,
        };
    }

    if (snapshot.runtimeMode !== objectiveRecord.runtimeMode) {
        return {
            code: 'E_RESUME_SNAPSHOT_DIVERGED',
            message: 'Resume snapshot runtimeMode diverged from the immutable objective record.',
            detail: `resume-snapshot.runtimeMode=${snapshot.runtimeMode} while objective.runtimeMode=${objectiveRecord.runtimeMode}`,
            nextAction: `objective resume --objective ${objectiveRecord.objectiveId} --repair-snapshot`,
        };
    }

    if (snapshot.reasoningMode !== objectiveRecord.reasoningMode) {
        return {
            code: 'E_REASONING_MODE_DIVERGED',
            message: 'Resume snapshot reasoningMode diverged from the immutable objective record.',
            detail: `resume-snapshot.reasoningMode=${snapshot.reasoningMode} while objective.reasoningMode=${objectiveRecord.reasoningMode}`,
            nextAction: `objective resume --objective ${objectiveRecord.objectiveId} --repair-snapshot`,
        };
    }

    return null;
}

function renderObjectiveDigest(state, nowMs) {
    const lines = [
        PHASE9_OBJECTIVE_SECTION,
        `loaderState: ${state.loaderState}`,
        `activePointerPath: ${state.activePointerPath}`,
        `objectiveId: ${state.objectiveId ?? 'none'}`,
        `objectiveStatus: ${state.objectiveStatus ?? 'none'}`,
        `objectiveRecordPath: ${state.objectiveRecordPath ?? 'none'}`,
        `resumeSnapshotPath: ${state.resumeSnapshotPath ?? 'none'}`,
    ];

    if (state.loaderState === 'no-objective') {
        lines.push('nextAction: objective start');
        lines.push('humanInputRequired: yes');
        return lines.join('\n');
    }

    if (state.title) {
        lines.push(`title: ${truncate(state.title, 120)}`);
    }
    if (state.question) {
        lines.push(`question: ${truncate(state.question, 140)}`);
    }
    if (state.runtimeMode) {
        lines.push(`runtimeMode: ${state.runtimeMode}`);
    }
    if (state.reasoningMode) {
        lines.push(`reasoningMode: ${state.reasoningMode}`);
    }

    if (state.loaderState === 'blocker') {
        lines.push(`blockerCode: ${state.blocker.code}`);
        lines.push(`blockerMessage: ${state.blocker.message}`);
        lines.push(`blockerDetail: ${state.blocker.detail ?? 'none'}`);
        lines.push(`nextAction: ${state.recommendedAction}`);
        lines.push('humanInputRequired: yes');
        return lines.join('\n');
    }

    lines.push(`stage: ${state.stage}`);
    lines.push(`nextAction: ${state.nextAction}`);
    lines.push(`queue: pending=${state.queue.pendingCount}, running=${state.queue.runningCount}, lastTaskId=${state.queue.lastTaskId ?? 'none'}`);
    lines.push(`openBlockers: ${formatBlockers(state.openBlockers)}`);
    lines.push(`openHandoffs: ${formatList(state.openHandoffs)}`);
    lines.push(`wakeOwner: ${state.wakeOwner}`);
    lines.push(`wakeLeaseStatus: ${deriveWakeLeaseStatus(state.currentWakeLease, nowMs)}`);
    lines.push(`resumeWrittenAt: ${state.resumeWrittenAt}`);
    lines.push(`resumeWrittenReason: ${state.resumeWrittenReason}`);
    lines.push(`humanInputRequired: ${state.humanInputRequired ? 'yes' : 'no'}`);
    return lines.join('\n');
}

export function readPhase9ObjectiveState({
    pluginRepoRoot,
    nowMs = Date.now(),
    existsSyncImpl = existsSync,
} = {}) {
    const resolvedPluginRoot = resolvePluginRepoRoot(pluginRepoRoot);
    const discovery = resolveSiblingVreRoot({
        pluginRepoRoot: resolvedPluginRoot,
        existsSyncImpl,
    });

    if (!discovery.vreRoot) {
        return {
            source: 'missing-vre',
            warning: discovery.reason,
            state: null,
        };
    }

    const activePointerPath = path.join(discovery.vreRoot, ACTIVE_OBJECTIVE_POINTER_RELATIVE_PATH);
    const relativePointerPath = normalizeSlashes(path.relative(discovery.vreRoot, activePointerPath));
    if (!existsSyncImpl(activePointerPath)) {
        return {
            source: 'no-objective',
            warning: null,
            state: {
                loaderState: 'no-objective',
                activePointerPath: relativePointerPath,
                objectiveId: null,
                objectiveStatus: null,
                objectiveRecordPath: null,
                resumeSnapshotPath: null,
            },
        };
    }

    const pointer = readJsonFile(activePointerPath, 'active pointer');
    try {
        validatePointerShape(pointer);
    } catch (error) {
        return {
            source: 'blocker',
            warning: error.message,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: null,
                    objectiveStatus: null,
                    objectiveRecordPath: null,
                    resumeSnapshotPath: null,
                },
                'E_STATE_CONFLICT',
                'Active objective pointer is malformed.',
                error.message,
                'repair durable state before resume',
            ),
        };
    }

    let objectiveRecordPath;
    try {
        objectiveRecordPath = resolveRepoPath(discovery.vreRoot, pointer.objectiveRecordPath, 'active pointer objectiveRecordPath');
    } catch (error) {
        return {
            source: 'blocker',
            warning: error.message,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: null,
                    objectiveRecordPath: normalizeSlashes(pointer.objectiveRecordPath),
                    resumeSnapshotPath: null,
                },
                'E_STATE_CONFLICT',
                'Active objective pointer references an invalid objective record path.',
                error.message,
                'repair durable state before resume',
            ),
        };
    }

    const relativeObjectiveRecordPath = normalizeSlashes(path.relative(discovery.vreRoot, objectiveRecordPath));
    if (!existsSyncImpl(objectiveRecordPath)) {
        return {
            source: 'blocker',
            warning: `E_ACTIVE_POINTER_ORPHANED: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: null,
                },
                'E_ACTIVE_POINTER_ORPHANED',
                'Active pointer names an objective whose record is missing or unreadable.',
                relativeObjectiveRecordPath,
                'restore or repair the missing objective record before resume',
            ),
        };
    }

    let objectiveRecord;
    try {
        objectiveRecord = readJsonFile(objectiveRecordPath, 'objective record');
        validateObjectiveShape(objectiveRecord);
    } catch (error) {
        return {
            source: 'blocker',
            warning: `E_ACTIVE_POINTER_ORPHANED: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: null,
                },
                'E_ACTIVE_POINTER_ORPHANED',
                'Active pointer names an objective whose record is missing or unreadable.',
                error.message,
                'restore or repair the missing objective record before resume',
            ),
        };
    }

    if (objectiveRecord.objectiveId !== pointer.objectiveId) {
        return {
            source: 'blocker',
            warning: `E_STATE_CONFLICT: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: objectiveRecord.status ?? null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: null,
                    title: objectiveRecord.title,
                    question: objectiveRecord.question,
                    runtimeMode: objectiveRecord.runtimeMode,
                    reasoningMode: objectiveRecord.reasoningMode,
                },
                'E_STATE_CONFLICT',
                'Active pointer and objective record disagree on objective id.',
                `pointer.objectiveId=${pointer.objectiveId} while objective.objectiveId=${objectiveRecord.objectiveId}`,
                'repair durable state before resume',
            ),
        };
    }

    const resumeSnapshotPath = path.join(path.dirname(objectiveRecordPath), RESUME_SNAPSHOT_FILE);
    const relativeResumeSnapshotPath = normalizeSlashes(path.relative(discovery.vreRoot, resumeSnapshotPath));
    if (!existsSyncImpl(resumeSnapshotPath)) {
        return {
            source: 'blocker',
            warning: `E_RESUME_SNAPSHOT_MISSING: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: objectiveRecord.status ?? null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: relativeResumeSnapshotPath,
                    title: objectiveRecord.title,
                    question: objectiveRecord.question,
                    runtimeMode: objectiveRecord.runtimeMode,
                    reasoningMode: objectiveRecord.reasoningMode,
                },
                'E_RESUME_SNAPSHOT_MISSING',
                'Resume snapshot is missing for the active objective.',
                relativeResumeSnapshotPath,
                `objective resume --objective ${pointer.objectiveId} --repair-snapshot`,
            ),
        };
    }

    let snapshot;
    try {
        snapshot = readJsonFile(resumeSnapshotPath, 'resume snapshot');
    } catch (error) {
        return {
            source: 'blocker',
            warning: `E_STATE_CONFLICT: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: objectiveRecord.status ?? null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: relativeResumeSnapshotPath,
                    title: objectiveRecord.title,
                    question: objectiveRecord.question,
                    runtimeMode: objectiveRecord.runtimeMode,
                    reasoningMode: objectiveRecord.reasoningMode,
                },
                'E_STATE_CONFLICT',
                'Resume snapshot is unreadable.',
                error.message,
                `objective resume --objective ${pointer.objectiveId} --repair-snapshot`,
            ),
        };
    }

    const mismatch = detectSnapshotMismatch(snapshot, objectiveRecord);
    if (mismatch) {
        return {
            source: 'blocker',
            warning: `${mismatch.code}: ${pointer.objectiveId}`,
            state: buildBlockerState(
                {
                    activePointerPath: relativePointerPath,
                    objectiveId: pointer.objectiveId,
                    objectiveStatus: objectiveRecord.status ?? null,
                    objectiveRecordPath: relativeObjectiveRecordPath,
                    resumeSnapshotPath: relativeResumeSnapshotPath,
                    title: objectiveRecord.title,
                    question: objectiveRecord.question,
                    runtimeMode: objectiveRecord.runtimeMode,
                    reasoningMode: objectiveRecord.reasoningMode,
                },
                mismatch.code,
                mismatch.message,
                mismatch.detail,
                mismatch.nextAction,
            ),
        };
    }

    return {
        source: 'ready',
        warning: null,
        state: {
            loaderState: 'ready',
            activePointerPath: relativePointerPath,
            objectiveId: objectiveRecord.objectiveId,
            objectiveStatus: objectiveRecord.status,
            objectiveRecordPath: relativeObjectiveRecordPath,
            resumeSnapshotPath: relativeResumeSnapshotPath,
            title: objectiveRecord.title,
            question: objectiveRecord.question,
            runtimeMode: objectiveRecord.runtimeMode,
            reasoningMode: objectiveRecord.reasoningMode,
            stage: `${snapshot.stageCursor.current} (${snapshot.stageCursor.stageStatus})`,
            nextAction: formatNextAction(snapshot.nextAction),
            queue: {
                pendingCount: snapshot.queueVisibility.pendingCount,
                runningCount: snapshot.queueVisibility.runningCount,
                lastTaskId: snapshot.queueVisibility.lastTaskId,
            },
            openBlockers: snapshot.openBlockers,
            openHandoffs: snapshot.openHandoffs,
            wakeOwner: objectiveRecord.wakePolicy?.wakeOwner ?? snapshot.wakePolicySnapshot?.wakeOwner ?? 'unknown',
            currentWakeLease: pointer.currentWakeLease,
            resumeWrittenAt: snapshot.writtenAt,
            resumeWrittenReason: snapshot.writtenReason,
            humanInputRequired:
                objectiveRecord.status !== 'active' ||
                snapshot.nextAction.kind === 'await-operator' ||
                (Array.isArray(snapshot.openBlockers) && snapshot.openBlockers.length > 0),
        },
    };
}

export function buildPhase9ObjectiveInjection({
    pluginRepoRoot,
    env = process.env,
    nowMs = Date.now(),
    existsSyncImpl = existsSync,
} = {}) {
    if (!isPhase9HandshakeEnabled(env)) {
        return {
            enabled: false,
            injected: false,
            source: 'disabled',
            warning: null,
            context: '',
            state: null,
        };
    }

    const resolved = readPhase9ObjectiveState({
        pluginRepoRoot,
        nowMs,
        existsSyncImpl,
    });

    if (resolved.source === 'missing-vre') {
        return {
            enabled: true,
            injected: false,
            source: resolved.source,
            warning: resolved.warning,
            context: '',
            state: null,
        };
    }

    return {
        enabled: true,
        injected: true,
        source: resolved.source,
        warning: resolved.warning,
        context: renderObjectiveDigest(resolved.state, nowMs),
        state: resolved.state,
    };
}
