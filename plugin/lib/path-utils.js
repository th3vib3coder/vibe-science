import { resolve as resolvePath } from 'node:path';

const WINDOWS_DRIVE_PATH = /^[A-Za-z]:[\\/]/;

/**
 * Canonicalize a project path before persisting or comparing it in the DB.
 * This keeps project identity stable across path-case and trailing-slash
 * variations, and across host OS (a Windows-shaped path must canonicalize the
 * same way whether it runs on a Windows dev box or a Linux CI runner).
 *
 * @param {string} projectPath
 * @returns {string}
 */
export function canonicalizeProjectPath(projectPath) {
    const raw = String(projectPath || '').trim();
    const looksWindowsDrive = WINDOWS_DRIVE_PATH.test(raw);
    // path.resolve on POSIX does not treat `C:\…` as absolute; it would
    // prepend CWD and produce a different DB identity than on Windows.
    const shouldSkipResolve = looksWindowsDrive && process.platform !== 'win32';
    const resolved = shouldSkipResolve ? raw : resolvePath(raw || process.cwd());
    let normalized = resolved.replace(/\\/g, '/');
    if (normalized.length > 1) {
        normalized = normalized.replace(/\/+$/, '');
    }
    if (looksWindowsDrive || process.platform === 'win32') {
        normalized = normalized.toLowerCase();
    }
    return normalized;
}

export default {
    canonicalizeProjectPath,
};
