#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    resolvePluginRepoRoot,
    resolveSiblingVreRoot,
} from './handshake-inject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_PLUGIN_REPO_ROOT = path.resolve(__dirname, '..', '..');
export const LOOP_WAKE_CALLER = 'plugin-loop-wake';
export const LOOP_WAKE_CALLER_ENV = 'VRE_EXTERNAL_WAKE_CALLER';
export const LOOP_WAKE_TIMEOUT_MS = 15_000;

export class LoopWakeError extends Error {
    constructor({ code, message, exitCode = 1, extra = {} }) {
        super(message);
        this.name = 'LoopWakeError';
        this.code = code;
        this.exitCode = exitCode;
        this.extra = extra;
    }
}

function nextOptionValue(argv, index, optionName) {
    const candidate = argv[index + 1];
    if (typeof candidate !== 'string' || candidate.startsWith('--')) {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: `loop-wake requires ${optionName} <value>.`,
        });
    }
    return candidate;
}

export function parseLoopWakeArgs(argv = process.argv.slice(2)) {
    const options = {
        objectiveId: null,
        wakeId: null,
    };
    const positionals = [];

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--objective') {
            options.objectiveId = nextOptionValue(argv, index, '--objective');
            index += 1;
            continue;
        }
        if (token === '--wake-id') {
            options.wakeId = nextOptionValue(argv, index, '--wake-id');
            index += 1;
            continue;
        }
        if (token.startsWith('--')) {
            throw new LoopWakeError({
                code: 'PHASE9_USAGE',
                exitCode: 3,
                message: `loop-wake does not accept option ${token}.`,
            });
        }
        positionals.push(token);
    }

    if (positionals.length > 0) {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: `loop-wake does not accept positional arguments: ${positionals.join(' ')}`,
        });
    }
    if (options.objectiveId == null) {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'loop-wake requires --objective <objective-id>.',
        });
    }
    if (options.wakeId == null) {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'loop-wake requires --wake-id <wake-id>.',
        });
    }

    return options;
}

export function buildLoopWakeInvocation({
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    objectiveId,
    wakeId,
    existsSyncImpl,
} = {}) {
    if (typeof objectiveId !== 'string' || objectiveId.trim() === '') {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'loop-wake requires a non-empty objectiveId.',
        });
    }
    if (typeof wakeId !== 'string' || wakeId.trim() === '') {
        throw new LoopWakeError({
            code: 'PHASE9_USAGE',
            exitCode: 3,
            message: 'loop-wake requires a non-empty wakeId.',
        });
    }

    const resolvedPluginRoot = resolvePluginRepoRoot(pluginRepoRoot);
    const discovery = resolveSiblingVreRoot({
        pluginRepoRoot: resolvedPluginRoot,
        existsSyncImpl,
    });
    if (!discovery.vreRoot) {
        throw new LoopWakeError({
            code: 'VRE_MISSING',
            exitCode: 1,
            message: discovery.reason,
        });
    }

    return {
        pluginRepoRoot: resolvedPluginRoot,
        vreRoot: discovery.vreRoot,
        execute: process.execPath,
        argv: [
            path.join(discovery.vreRoot, 'bin', 'vre'),
            'research-loop',
            '--heartbeat',
            '--objective',
            objectiveId,
            '--wake-id',
            wakeId,
            '--json',
        ],
        cwd: discovery.vreRoot,
        env: {
            [LOOP_WAKE_CALLER_ENV]: LOOP_WAKE_CALLER,
        },
    };
}

export function runLoopWake({
    argv = process.argv.slice(2),
    pluginRepoRoot = DEFAULT_PLUGIN_REPO_ROOT,
    env = process.env,
    spawnSyncImpl = spawnSync,
    existsSyncImpl,
} = {}) {
    const options = parseLoopWakeArgs(argv);
    const invocation = buildLoopWakeInvocation({
        pluginRepoRoot,
        objectiveId: options.objectiveId,
        wakeId: options.wakeId,
        existsSyncImpl,
    });

    const result = spawnSyncImpl(invocation.execute, invocation.argv, {
        cwd: invocation.cwd,
        encoding: 'utf-8',
        env: {
            ...env,
            ...invocation.env,
        },
        timeout: LOOP_WAKE_TIMEOUT_MS,
    });

    if (result.error) {
        throw new LoopWakeError({
            code: 'VRE_LOOP_WAKE_FAILED',
            exitCode: 1,
            message: `loop-wake could not invoke the sibling VRE CLI: ${result.error.message}`,
        });
    }

    const stdout = String(result.stdout ?? '');
    const stderr = String(result.stderr ?? '');
    let payload = null;
    if (stdout.trim() !== '') {
        try {
            payload = JSON.parse(stdout);
        } catch (error) {
            throw new LoopWakeError({
                code: 'VRE_LOOP_WAKE_INVALID_JSON',
                exitCode: 1,
                message: `loop-wake received invalid JSON from the sibling VRE CLI: ${error.message}`,
            });
        }
    }

    return {
        invocation,
        exitCode: typeof result.status === 'number' ? result.status : 1,
        stdout,
        stderr,
        payload,
    };
}

function main() {
    try {
        const outcome = runLoopWake();
        if (outcome.stdout !== '') {
            process.stdout.write(outcome.stdout);
        }
        if (outcome.stderr !== '') {
            process.stderr.write(outcome.stderr);
        }
        process.exit(outcome.exitCode);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exit(error?.exitCode ?? 1);
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main();
}
