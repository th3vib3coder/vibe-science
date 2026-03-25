import { resolve as resolvePath } from 'node:path';

/**
 * Canonicalize a project path before persisting or comparing it in the DB.
 * This keeps project identity stable across path-case and trailing-slash
 * variations, especially on Windows.
 *
 * @param {string} projectPath
 * @returns {string}
 */
export function canonicalizeProjectPath(projectPath) {
    const raw = String(projectPath || '').trim();
    const resolved = resolvePath(raw || process.cwd());
    let normalized = resolved.replace(/\\/g, '/');
    if (normalized.length > 1) {
        normalized = normalized.replace(/\/+$/, '');
    }
    if (process.platform === 'win32') {
        normalized = normalized.toLowerCase();
    }
    return normalized;
}

export default {
    canonicalizeProjectPath,
};
