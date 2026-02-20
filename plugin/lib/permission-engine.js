/**
 * Vibe Science v6.0 NEXUS — Permission Engine
 *
 * TEAM mode permission enforcement for Agent Teams.
 * Each agent role has a defined set of allowed tools and file-level
 * write restrictions.  In SOLO mode (agentRole is null/undefined)
 * everything is allowed — the engine stays out of the way.
 *
 * Exports:
 *   PERMISSIONS          — the raw permission matrix (for testing)
 *   checkPermission()    — returns null (allowed) or violation object
 *   identifyAgentRole()  — resolves agent role from explicit value or prompt
 */

// ─────────────────────────────────────────────────────────────────────
// Permission Matrix (TEAM Mode)
// ─────────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
    researcher: {
        allow: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
        deny_files: [],                               // can write anywhere except R2 reports
        deny_patterns: ['05-reviewer2/*-report.yaml'],
    },
    reviewer2: {
        allow: ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Write', 'Edit'],
        deny_files: ['CLAIM-LEDGER.md'],              // cannot touch the ledger
        deny_patterns: [],
        allow_write_only: ['05-reviewer2/'],           // can only write inside own directory
    },
    judge: {
        allow: ['Read', 'Glob', 'Grep'],
        deny_files: ['CLAIM-LEDGER.md', '05-reviewer2/*'],
        deny_patterns: [],
        allow_write_only: ['05-reviewer2/judge-reports/'],
    },
    serendipity: {
        allow: ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Write'],
        deny_files: ['CLAIM-LEDGER.md'],
        deny_patterns: [],
        allow_write_only: ['SERENDIPITY.md'],
    },
    lead: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'Task'],
        deny_files: [],                               // lead coordinates everything
        deny_patterns: [],
    },
    experimenter: {
        allow: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        deny_files: ['CLAIM-LEDGER.md', '05-reviewer2/'],
        deny_patterns: [],
    },
};

// ─────────────────────────────────────────────────────────────────────
// Simple glob/pattern matcher (no external deps)
// ─────────────────────────────────────────────────────────────────────

/**
 * Convert a minimatch-style glob pattern to a regular expression.
 *
 * Supported syntax:
 *   *      — match any characters except path separators
 *   **     — match any characters including path separators
 *   ?      — match exactly one non-separator character
 *   [abc]  — character class (passed through verbatim)
 *
 * Everything else is escaped so literal dots, dashes, etc. work.
 */
function globToRegex(pattern) {
    let i = 0;
    let regex = '';
    const len = pattern.length;

    while (i < len) {
        const ch = pattern[i];

        if (ch === '*') {
            if (pattern[i + 1] === '*') {
                // ** — match anything (including /)
                regex += '.*';
                i += 2;
                // consume optional trailing slash after **
                if (pattern[i] === '/') i++;
            } else {
                // * — match anything except /
                regex += '[^/]*';
                i++;
            }
        } else if (ch === '?') {
            regex += '[^/]';
            i++;
        } else if (ch === '[') {
            // pass character class through
            const close = pattern.indexOf(']', i);
            if (close === -1) {
                regex += '\\[';
                i++;
            } else {
                regex += pattern.slice(i, close + 1);
                i = close + 1;
            }
        } else {
            // escape regex-special characters
            regex += ch.replace(/[.+^${}()|\\]/g, '\\$&');
            i++;
        }
    }

    return new RegExp(regex);
}

/**
 * Test whether `filePath` matches a minimatch-style `pattern`.
 *
 * The match is performed against the full path AND against the
 * basename-only portion, which allows patterns like
 * `05-reviewer2/*-report.yaml` to match regardless of leading
 * directory components.
 */
function minimatch(filePath, pattern) {
    // Normalise separators to forward slashes
    const normalised = filePath.replace(/\\/g, '/');
    const re = globToRegex(pattern);
    return re.test(normalised);
}

// ─────────────────────────────────────────────────────────────────────
// identifyAgentRole
// ─────────────────────────────────────────────────────────────────────

/**
 * Determine the agent's role.
 *
 * @param {string|object|null} explicitRole
 *   Explicit role string, OR an object with a `.role` property
 *   (matching Claude Code's agent info payload).  If provided and
 *   truthy, this takes priority over prompt inference.
 *
 * @param {string} [prompt='']
 *   The current prompt text.  Used as a fallback to infer the role
 *   from keywords when no explicit role is available.
 *
 * @returns {string} One of the role keys from PERMISSIONS, or
 *   'researcher' as the safe default.
 */
export function identifyAgentRole(explicitRole, prompt = '') {
    // ── Explicit role (string or object with .role) ──────────────
    if (explicitRole) {
        // If an object was passed (e.g. { role: 'reviewer2' })
        if (typeof explicitRole === 'object' && explicitRole.role) {
            const role = explicitRole.role.toLowerCase();
            if (PERMISSIONS[role]) return role;
        }
        // If a plain string was passed
        if (typeof explicitRole === 'string') {
            const role = explicitRole.toLowerCase();
            if (PERMISSIONS[role]) return role;
        }
    }

    // ── Fallback: infer from prompt keywords ─────────────────────
    if (prompt && typeof prompt === 'string') {
        const lower = prompt.toLowerCase();

        if (lower.includes('reviewer') || lower.includes('r2'))
            return 'reviewer2';
        if (lower.includes('serendipity') || lower.includes('scanner'))
            return 'serendipity';
        if (lower.includes('judge') || lower.includes('r3'))
            return 'judge';
        if (lower.includes('experiment'))
            return 'experimenter';
        if (lower.includes('lead') || lower.includes('orchestrat'))
            return 'lead';
    }

    // Default role
    return 'researcher';
}

// ─────────────────────────────────────────────────────────────────────
// checkPermission
// ─────────────────────────────────────────────────────────────────────

/**
 * Check whether an agent with the given role is allowed to perform a
 * specific tool action.
 *
 * @param {string|null|undefined} agentRole
 *   The agent's role.  If null or undefined (SOLO mode) the check is
 *   skipped and null (= allowed) is returned.
 *
 * @param {string} toolName
 *   The tool being invoked (e.g. 'Write', 'Edit', 'Bash', ...).
 *
 * @param {object} [toolInput={}]
 *   The tool's input payload.  For Write/Edit this should contain
 *   `file_path`.  For other tools it may be empty.
 *
 * @returns {null|{action: string, reason: string, required_role: string}}
 *   `null` when the action is permitted.  Otherwise an object
 *   describing the violation.
 */
export function checkPermission(agentRole, toolName, toolInput = {}) {
    // ── SOLO mode: no restrictions ───────────────────────────────
    if (!agentRole) return null;

    const role = agentRole.toLowerCase();
    const perms = PERMISSIONS[role];

    // Unknown role — fail open (allow) so we don't break unexpected
    // configurations.  The role will still be logged.
    if (!perms) return null;

    // ── 1. Tool allow-list ───────────────────────────────────────
    if (!perms.allow.includes(toolName)) {
        return {
            action: `use tool ${toolName}`,
            reason: `Tool ${toolName} not in allowed list for ${role}`,
            required_role: 'researcher or lead',
        };
    }

    // ── 2. File-level write restrictions (Write / Edit only) ─────
    if ((toolName === 'Write' || toolName === 'Edit') && toolInput.file_path) {
        const filePath = toolInput.file_path;

        // 2a. Deny specific files / directories
        if (perms.deny_files && perms.deny_files.length > 0) {
            for (const denied of perms.deny_files) {
                if (filePath.includes(denied)) {
                    return {
                        action: `write to ${denied}`,
                        reason: `Agent ${role} cannot write to ${denied}`,
                        required_role: suggestRoleForFile(denied),
                    };
                }
            }
        }

        // 2b. Deny glob patterns
        if (perms.deny_patterns && perms.deny_patterns.length > 0) {
            for (const pattern of perms.deny_patterns) {
                if (minimatch(filePath, pattern)) {
                    return {
                        action: `write to ${filePath}`,
                        reason: `Pattern ${pattern} denied for ${role}`,
                        required_role: 'owner of that directory',
                    };
                }
            }
        }

        // 2c. allow_write_only: if defined, the agent may ONLY write
        //     to the listed paths.  Anything else is blocked.
        if (perms.allow_write_only && perms.allow_write_only.length > 0) {
            const allowed = perms.allow_write_only.some(dir => filePath.includes(dir));
            if (!allowed) {
                return {
                    action: `write to ${filePath}`,
                    reason: `Agent ${role} can only write to: ${perms.allow_write_only.join(', ')}`,
                    required_role: 'researcher or lead',
                };
            }
        }
    }

    // ── Permitted ────────────────────────────────────────────────
    return null;
}

// ─────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Suggest which role should perform an action on a given file.
 * Used to produce helpful error messages.
 */
function suggestRoleForFile(fileName) {
    if (fileName.includes('CLAIM-LEDGER'))
        return 'researcher (for CLAIM-LEDGER), lead (for coordination)';
    if (fileName.includes('05-reviewer2'))
        return 'reviewer2 (for R2 reports), judge (for judge reports)';
    return 'researcher or lead';
}
