/**
 * Vibe Science v7.0 TRACE — Permission Engine
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
        allow: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch'],
        deny_files: [],                               // can write anywhere except R2 reports
        deny_patterns: ['05-reviewer2/*-report.yaml'],
    },
    reviewer2: {
        allow: ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Write', 'Edit', 'MultiEdit'],
        deny_files: ['CLAIM-LEDGER.md'],              // cannot touch the ledger
        deny_patterns: [],
        allow_write_only: ['05-reviewer2/'],           // can only write inside own directory
    },
    judge: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'MultiEdit'],
        deny_files: ['CLAIM-LEDGER.md', '05-reviewer2/*'],
        deny_patterns: [],
        allow_write_only: ['05-reviewer2/judge-reports/'],
    },
    serendipity: {
        allow: ['Read', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'Write', 'MultiEdit'],
        deny_files: ['CLAIM-LEDGER.md'],
        deny_patterns: [],
        allow_write_only: ['SERENDIPITY.md'],
    },
    lead: {
        allow: ['Read', 'Glob', 'Grep', 'Write', 'Edit', 'MultiEdit', 'Task'],
        deny_files: [],                               // lead coordinates everything
        deny_patterns: [],
    },
    experimenter: {
        allow: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep'],
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
    const normalised = filePath.replace(/\\/g, '/').toLowerCase();
    const re = globToRegex(pattern.toLowerCase());
    // Match against full path or basename-only (trailing portion)
    if (re.test(normalised)) return true;
    const basename = normalised.split('/').pop();
    return re.test(basename);
}

function normalizePathRule(value) {
    return String(value || '')
        .replace(/\\/g, '/')
        .toLowerCase()
        .replace(/^\.?\//, '');
}

function pathMatchesRule(filePath, rule) {
    const normalizedPath = normalizePathRule(filePath).replace(/\/+$/, '');
    const normalizedRule = normalizePathRule(rule);
    if (!normalizedPath || !normalizedRule) return false;

    if (/[?*\[]/.test(normalizedRule)) {
        return minimatch(normalizedPath, normalizedRule);
    }

    if (normalizedRule.endsWith('/')) {
        const dirRule = normalizedRule.replace(/\/+$/, '');
        return (
            normalizedPath === dirRule ||
            normalizedPath.startsWith(`${dirRule}/`) ||
            normalizedPath.includes(`/${dirRule}/`)
        );
    }

    const basename = normalizedPath.split('/').pop();
    return (
        normalizedPath === normalizedRule ||
        normalizedPath.endsWith(`/${normalizedRule}`) ||
        basename === normalizedRule
    );
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

    // Unknown role — deny in TEAM mode rather than disabling the barrier.
    if (!perms) {
        return {
            action: `use tool ${toolName}`,
            reason: `Unknown agent role "${agentRole}" cannot be mapped to the TEAM permission matrix`,
            required_role: 'valid TEAM role (researcher, reviewer2, judge, serendipity, lead, experimenter)',
        };
    }

    // ── 1. Tool allow-list ───────────────────────────────────────
    if (!perms.allow.includes(toolName)) {
        return {
            action: `use tool ${toolName}`,
            reason: `Tool ${toolName} not in allowed list for ${role}`,
            required_role: 'researcher or lead',
        };
    }

    // ── 1b. Shell access must not reference protected paths ──────────
    if (toolName === 'Bash') {
        const command = getBashCommand(toolInput);
        const touchedPaths = extractCommandPathCandidates(command);

        if (touchedPaths.length > 0) {
            if (perms.deny_files && perms.deny_files.length > 0) {
                for (const denied of perms.deny_files) {
                    if (touchedPaths.some(candidate => pathMatchesRule(candidate, denied))) {
                        return {
                            action: `touch protected path ${denied} via Bash`,
                            reason: `Agent ${role} cannot reference ${denied} via shell commands`,
                            required_role: suggestRoleForFile(denied),
                        };
                    }
                }
            }

            if (perms.deny_patterns && perms.deny_patterns.length > 0) {
                for (const pattern of perms.deny_patterns) {
                    if (touchedPaths.some(candidate => minimatch(candidate, pattern))) {
                        return {
                            action: `touch protected path via Bash`,
                            reason: `Pattern ${pattern} denied for ${role}, including shell access`,
                            required_role: 'owner of that directory',
                        };
                    }
                }
            }

            if (perms.allow_write_only && perms.allow_write_only.length > 0) {
                const outsideAllowed = touchedPaths.find(
                    candidate => !perms.allow_write_only.some(rule => pathMatchesRule(candidate, rule))
                );
                if (outsideAllowed) {
                    return {
                        action: `touch ${outsideAllowed} via Bash`,
                        reason: `Agent ${role} can only touch paths within: ${perms.allow_write_only.join(', ')}`,
                        required_role: 'researcher or lead',
                    };
                }
            }
        }
    }

    // ── 2. File-level write restrictions (Write / Edit only) ─────
    if ((toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') && toolInput.file_path) {
        const filePath = toolInput.file_path;
        const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

        // 2a. Deny specific files / directories
        if (perms.deny_files && perms.deny_files.length > 0) {
            for (const denied of perms.deny_files) {
                if (pathMatchesRule(normalizedPath, denied)) {
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
            const allowed = perms.allow_write_only.some(dir => pathMatchesRule(normalizedPath, dir));
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
    const normalized = String(fileName || '').replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('claim-ledger'))
        return 'researcher (for CLAIM-LEDGER), lead (for coordination)';
    if (normalized.includes('05-reviewer2'))
        return 'reviewer2 (for R2 reports), judge (for judge reports)';
    return 'researcher or lead';
}

function getBashCommand(toolInput = {}) {
    const candidates = [
        toolInput.command,
        toolInput.cmd,
        toolInput.script,
        toolInput.bash_command,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate;
        }
    }
    return '';
}

function extractCommandPathCandidates(command) {
    const source = String(command || '');
    if (!source.trim()) return [];

    const candidates = new Set();
    const patterns = [
        /(?:^|[;&\s])(?:[A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9_./\\-]+(?:\.[A-Za-z0-9_]+)?)/g,
        /\bcd\s+([A-Za-z0-9_./\\-]+)/gi,
        /(?:^|[\s"'`])([A-Za-z0-9_./\\-]*[\\/][A-Za-z0-9_./\\-]+)(?=$|[\s"'`;,|&])/g,
        /(?:^|[\s"'`])([A-Za-z0-9_.-]+\.(?:md|json|yaml|yml|txt|csv|tsv|js|mjs|cjs|ts|py|sqlite|db))(?=$|[\s"'`;,|&])/g,
    ];

    for (const pattern of patterns) {
        for (const match of source.matchAll(pattern)) {
            const value = normalizePathRule(match[1]).replace(/\/+$/, '');
            if (value) candidates.add(value);
        }
    }

    return [...candidates];
}
