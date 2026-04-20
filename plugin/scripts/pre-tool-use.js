#!/usr/bin/env node
// PreToolUse hook — write barrier for TEAM permissions + LAW 9 confounder harness.
// Blocks Write/Edit/MultiEdit/Bash BEFORE they mutate the workspace when either:
//   1. the resolved agent role lacks permission for the target path/tool, or
//   2. CLAIM-LEDGER claim content omits confounder_status / NOT_APPLICABLE.
// Matcher: "Write|Edit|MultiEdit|Bash" (regex) — intercepts mutating tools.
// Exit 0 = allow, Exit 2 = deny (permissionDecision), Exit 1 = internal error
//
// Input (stdin JSON): { tool_name, tool_input, session_id, cwd, hook_event_name, agent_role? }
// Output (stdout JSON): { hookSpecificOutput: { permissionDecision: "allow"|"deny" } }

import { existsSync, readFileSync } from 'node:fs';
// Fixup-10 P1 #1: need to share the deliverable-path matcher so Bash
// writes to .md deliverables are blocked with the same basename rule
// the delivery-discipline hook uses on Write/Edit/MultiEdit.
import { matchesDeliverablePath } from './pre-delivery-discipline.js';

const PROTECTED_CONFIG_RULES = [
  'skills/vibe/assets/schemas/*.schema.json',
  'skills/vibe/assets/fault-taxonomy.yaml',
  'skills/vibe/assets/judge-rubric.yaml',
  // Wave 3 addition: delivery-attestation.schema.json is the authoritative
  // contract for the Phase 8 attestation block. Same immutability as the
  // existing 12 scientific-claim schemas.
  'skills/vibe/assets/schemas/delivery-attestation.schema.json',
  // Fixup-10 P1 #2: the guardrail itself must not be editable by an
  // agent mid-session. Without this, an agent can disable enforcement
  // (remove hook registration, rewrite the hook script, or edit the
  // boundary allowlist) before producing a dishonest closeout. The
  // list below covers the hook scripts, their dual-config registration,
  // and the validator implementation (which also contains test-time
  // mutation of the boundary allowlist).
  'plugin/scripts/pre-delivery-discipline.js',
  'plugin/scripts/pre-tool-use.js',
  '.claude/settings.json',
  'hooks/hooks.json',
  'tests/validate-delivery-honesty.test.mjs',
  'tests/delivery-discipline-hook.test.mjs',
];

// Guardrail rules added by fixup-10 — used to route the deny message
// through a guardrail-specific branch that explains the escape hatch.
const GUARDRAIL_PROTECTED_RULES = new Set([
  'plugin/scripts/pre-delivery-discipline.js',
  'plugin/scripts/pre-tool-use.js',
  '.claude/settings.json',
  'hooks/hooks.json',
  'tests/validate-delivery-honesty.test.mjs',
  'tests/delivery-discipline-hook.test.mjs',
]);

/**
 * Fixup-10 escape hatch. When `VIBE_SCIENCE_DEV=1` is set in the
 * environment that launches Claude Code, the guardrail-self-protection
 * rules (and the Bash deliverable-write block) are skipped so the
 * developers of this plugin can edit the hook scripts and generate
 * deliverables via shell tools. Agents cannot set environment variables
 * in the hook subprocess — only the human operator who launches the
 * session can. Missing / blank / anything-other-than-"1" = production.
 */
function isDevModeEnabled() {
  return process.env.VIBE_SCIENCE_DEV === '1';
}

let openDB, initDB, closeDB, getLatestPromptRole, applyMigrations, logGovernanceEvent, checkPermission, parseStructuredBlocks, previewClaimEvents, validateClaimLifecycleTransitions;
try {
  const dbMod = await import('../lib/db.js');
  openDB = dbMod.openDB;
  initDB = dbMod.initDB;
  closeDB = dbMod.closeDB;
  getLatestPromptRole = dbMod.getLatestPromptRole;
  logGovernanceEvent = dbMod.logGovernanceEvent;
  const migrationMod = await import('../lib/migrations.js');
  applyMigrations = migrationMod.applyMigrations;
} catch {
  openDB = null;
  initDB = null;
  closeDB = () => {};
  getLatestPromptRole = () => null;
  applyMigrations = () => {};
  logGovernanceEvent = () => {};
}

try {
  const permMod = await import('../lib/permission-engine.js');
  checkPermission = permMod.checkPermission;
} catch {
  checkPermission = () => null;
}

try {
  const parserMod = await import('../lib/structured-block-parser.js');
  parseStructuredBlocks = parserMod.parseStructuredBlocks;
} catch {
  parseStructuredBlocks = null;
}

try {
  const claimIngestionMod = await import('../lib/claim-ingestion.js');
  previewClaimEvents = claimIngestionMod.previewClaimEvents;
  validateClaimLifecycleTransitions = claimIngestionMod.validateClaimLifecycleTransitions;
} catch {
  previewClaimEvents = () => [];
  validateClaimLifecycleTransitions = () => [];
}

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(inputData);
    main(event).catch(() => allow());
  } catch (e) {
    process.exit(0); // graceful degradation — parse error = allow
  }
});

async function main(event) {
  const sessionId = event.session_id || event.sessionId || null;
  try {
    const toolName = event.tool_name || '';
    const toolInput = event.tool_input || {};
    const strictMode = process.env.VIBE_SCIENCE_STRICT === '1';

    // -----------------------------------------------------------------------
    // 0. TEAM permission barrier (before any write reaches the workspace)
    // -----------------------------------------------------------------------
    const db = openHookDb();
    try {
      if (strictMode && !db && isMutationSensitiveTool(toolName)) {
        denyStrict('cannot verify pre-mutation governance because database persistence is unavailable');
        return;
      }
      const agentRole = resolveAgentRole(db, event);
      if (strictMode && !agentRole) {
        denyStrict('cannot verify role / permission barrier because no agent role could be resolved');
        return;
      }

      const protectedTarget = detectProtectedConfigMutation(toolName, toolInput);
      if (protectedTarget) {
        denyImmutableConfig(toolName, protectedTarget, { db, sessionId });
        return;
      }

      if (agentRole) {
        const violation = checkPermission(agentRole, toolName, toolInput);
        if (violation) {
          denyPermission(agentRole, violation);
          return;
        }
      }

      if (toolName === 'Bash') {
        const shellGovernanceViolation = detectGovernanceShellWrite(toolInput);
        if (shellGovernanceViolation) {
          denyShellGovernance(shellGovernanceViolation);
          return;
        }
        // Fixup-10 P1 #1: also block Bash writes to markdown deliverables
        // so the delivery-discipline attestation barrier cannot be
        // bypassed by redirecting to a .md file from a shell.
        const deliverableTarget = detectBashDeliverableWrite(toolInput);
        if (deliverableTarget) {
          denyBashDeliverableWrite(deliverableTarget);
          return;
        }
      }

      // Only write-like file tools participate in LAW 9 harness checks.
      if (toolName !== 'Write' && toolName !== 'Edit' && toolName !== 'MultiEdit') {
        allow();
        return;
      }

      const filePath = (toolInput.file_path || '').replace(/\\/g, '/');
      const normalizedFilePath = filePath.toLowerCase();

      // Only intercept modifications to CLAIM-LEDGER
      if (!normalizedFilePath.includes('claim-ledger')) {
        allow();
        return;
      }

      const segments = collectSegments(toolName, toolInput);
      let touchedClaimContent = false;

      for (const segment of segments) {
        const newText = String(segment.newText || '');
        const oldText = String(segment.oldText || '');
        const oldClaims = extractClaimSegments(oldText);
        const newClaims = extractClaimSegments(newText);
        const touchesHarness = touchesHarnessMarker(oldText) || touchesHarnessMarker(newText);

        if (touchesHarness && oldClaims.length === 0 && newClaims.length === 0) {
          deny(toolName, 'touches confounder_status/NOT_APPLICABLE without enough claim context; rewrite the full claim block instead of editing the marker line in isolation', {
            db,
            sessionId,
            filePath,
          });
          return;
        }

        const touchesClaim = oldClaims.length > 0 || newClaims.length > 0;
        if (!touchesClaim) continue;

        touchedClaimContent = true;

        const newByKey = new Map(newClaims.map(claim => [claim.key, claim]));

        for (const oldClaim of oldClaims) {
          const newClaim = newByKey.get(oldClaim.key);
          if (hasConfounderHarness(oldClaim.text) && (!newClaim || !hasConfounderHarness(newClaim.text))) {
            deny(toolName, `removed an existing confounder_status/NOT_APPLICABLE marker from claim ${oldClaim.id || oldClaim.key}`, {
              db,
              sessionId,
              filePath,
            });
            return;
          }
        }

        for (const claim of newClaims) {
          if (!hasConfounderHarness(claim.text)) {
            deny(toolName, `omits confounder_status/NOT_APPLICABLE on claim ${claim.id || claim.key}`, {
              db,
              sessionId,
              filePath,
            });
            return;
          }
        }

        const oldLifecycleEvents = previewClaimEvents(oldText, sessionId);
        const newLifecycleEvents = previewClaimEvents(newText, sessionId);
        const changedLifecycleEvents = getChangedLifecycleEvents(oldLifecycleEvents, newLifecycleEvents);
        const lifecycleViolations = validateClaimLifecycleTransitions(db, changedLifecycleEvents);
        if (lifecycleViolations.length > 0) {
          denyLifecycle(toolName, lifecycleViolations[0], {
            db,
            sessionId,
            filePath,
          });
          return;
        }
      }

      if (!touchedClaimContent) {
        allow();
        return;
      }

      allow();
    } finally {
      closeHookDb(db);
    }
  } catch (e) {
    // Graceful degradation — never block on infrastructure failure
    allow();
  }
}

function allow() {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'allow'
    }
  };
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

function deny(toolName, reason, context = {}) {
  recordGovernanceEvent(context.db, {
    session_id: context.sessionId ?? null,
    event_type: 'claim_without_harness',
    tool_name: toolName,
    severity: 'critical',
    details: {
      reason,
      file_path: context.filePath ?? null,
    },
  });
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    'LAW 9 VIOLATION: ' + toolName + ' to CLAIM-LEDGER blocked because it ' + reason + '. ' +
    'Every claim requires a confounder_status field ' +
    '(RAW | CONDITIONED | MATCHED | ROBUST | NOT_APPLICABLE). ' +
    'Run the confounder harness (raw → conditioned → matched) first, ' +
    'or mark as NOT_APPLICABLE with justification.'
  );
  process.exit(2);
}

function denyImmutableConfig(toolName, target, context = {}) {
  const isGuardrail = GUARDRAIL_PROTECTED_RULES.has(target.rule);
  recordGovernanceEvent(context.db, {
    session_id: context.sessionId ?? null,
    event_type: isGuardrail ? 'guardrail_self_modification_attempt' : 'schema_modification_attempt',
    tool_name: toolName,
    severity: 'critical',
    details: {
      file_path: target.path,
      protected_rule: target.rule,
    },
  });

  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));
  if (isGuardrail) {
    process.stderr.write(
      `GUARDRAIL SELF-MODIFICATION BLOCKED: ${target.path} is part of the delivery-discipline ` +
      `enforcement substrate and cannot be edited by an agent mid-session — otherwise the ` +
      `guardrail could be silently disabled before producing a dishonest closeout. ` +
      `If you are a plugin developer working on the hook itself, launch Claude Code with ` +
      `VIBE_SCIENCE_DEV=1 in the environment to unlock these files. ` +
      `See .claude/skills/delivery-discipline/SKILL.md.`
    );
  } else {
    process.stderr.write(
      `IMMUTABLE FILE BLOCKED: ${target.path} is protected by ${target.rule}. ` +
      'These files are IMMUTABLE. Fix the claim/analysis, not the schema.'
    );
  }
  process.exit(2);
}

function denyBashDeliverableWrite(targetPath) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny',
    },
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `DELIVERY DISCIPLINE BLOCK (Bash): the shell command would write to the markdown ` +
    `deliverable "${targetPath}". The delivery-discipline hook is wired to ` +
    `Write|Edit|MultiEdit so it can evaluate the attestation block before a write lands; ` +
    `Bash redirects, PowerShell cmdlets (Set-Content / Out-File / Add-Content), and ` +
    `similar shell ops bypass that evaluation. Use the Write or Edit tool with explicit ` +
    `content so the hook can verify the Delivery Attestation block. ` +
    `If you are a plugin developer intentionally generating deliverables via shell ` +
    `tooling, launch Claude Code with VIBE_SCIENCE_DEV=1 to unlock this path. ` +
    `See .claude/skills/delivery-discipline/SKILL.md.`
  );
  process.exit(2);
}

function denyLifecycle(toolName, violation, context = {}) {
  const claimId = violation.claim_id || 'unknown';
  const latestEvent = violation.latest_event_type || 'none';

  recordGovernanceEvent(context.db, {
    session_id: context.sessionId ?? null,
    event_type: violation.code === 'PROMOTION_REQUIRES_R2_REVIEW' ? 'r2_bypass_attempt' : 'law_violation',
    tool_name: toolName,
    severity: 'critical',
    details: {
      claim_id: claimId,
      attempted_event_type: violation.attempted_event_type ?? null,
      latest_event_type: violation.latest_event_type ?? null,
      file_path: context.filePath ?? null,
      reason: violation.code,
    },
  });

  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));

  if (violation.code === 'PROMOTION_REQUIRES_R2_REVIEW') {
    process.stderr.write(
      `R2 BYPASS BLOCKED: Claim ${claimId} cannot be promoted because the latest recorded event is ${latestEvent}. ` +
      `A claim must pass through R2_REVIEWED before PROMOTED. Run the R2 review path first, then retry the promotion.`
    );
  } else {
    process.stderr.write(
      `CLAIM LIFECYCLE BLOCKED: Claim ${claimId} triggered lifecycle rule ${violation.code}. ` +
      `Latest recorded event: ${latestEvent}.`
    );
  }

  process.exit(2);
}

function denyPermission(agentRole, violation) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `PERMISSION DENIED: Agent "${agentRole}" cannot ${violation.action}.\n` +
    `Reason: ${violation.reason}\n` +
    `Required role: ${violation.required_role}`
  );
  process.exit(2);
}

function denyStrict(reason) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `[INTEGRITY DEGRADED] Strict mode blocked this mutating tool because it ${reason}. ` +
    `Restore DB-backed role resolution or pass an explicit valid agent_role before retrying.`
  );
  process.exit(2);
}

function denyShellGovernance(target) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny'
    }
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `GOVERNANCE WRITE DENIED: Bash cannot mutate ${target}. ` +
    `Use Write/Edit/MultiEdit for governance artifacts so LAW 9, claim gates, citation gates, and TRACE provenance checks can run.`
  );
  process.exit(2);
}

function openHookDb() {
  if (!openDB) return null;
  try {
    const db = openDB();
    if (db && initDB) initDB(db);
    if (db && applyMigrations) applyMigrations(db);
    return db;
  } catch {
    return null;
  }
}

function closeHookDb(db) {
  if (!db) return;
  try {
    if (closeDB) closeDB(db);
    else if (db.open) db.close();
  } catch {
    // Ignore close errors in the barrier hook.
  }
}

function resolveAgentRole(db, event) {
  const explicit = normalizeAgentRole(event.agent_role || event.agentRole || null);
  if (explicit) return explicit;
  return normalizeAgentRole(getLatestPromptRole?.(db, event.session_id || event.sessionId || null));
}

function normalizeAgentRole(value) {
  if (!value) return null;
  if (typeof value === 'object' && value.role) {
    return String(value.role).trim().toLowerCase() || null;
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase() || null;
  }
  return null;
}

function collectSegments(toolName, toolInput) {
  if (toolName === 'Write') {
    const filePath = String(toolInput.file_path || '');
    let oldText = '';
    try {
      if (filePath && existsSync(filePath)) {
        oldText = readFileSync(filePath, 'utf-8');
      }
    } catch {
      oldText = '';
    }
    return [{ oldText, newText: String(toolInput.content || '') }];
  }

  if (toolName === 'Edit') {
    return [{
      oldText: String(toolInput.old_string || ''),
      newText: String(toolInput.new_string || ''),
    }];
  }

  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map(edit => ({
      oldText: String(edit?.old_string || ''),
      newText: String(edit?.new_string || ''),
    }));
  }

  return [];
}

function hasConfounderHarness(text) {
  return /confounder_status\s*:/i.test(text) || /confounder\S*\s*[:=]?\s*not.?applicable/i.test(text);
}

function touchesHarnessMarker(text) {
  return /confounder_status/i.test(String(text || '')) || /\bNOT_APPLICABLE\b/i.test(String(text || ''));
}

function detectProtectedConfigMutation(toolName, toolInput = {}) {
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit') {
    const filePath = String(toolInput.file_path || '').replace(/\\/g, '/');
    const rule = matchProtectedConfigPath(filePath);
    return rule ? { path: filePath, rule } : null;
  }

  if (toolName === 'Bash') {
    const command = getBashCommand(toolInput);
    if (!bashCommandHasWriteIntent(command)) return null;
    const candidate = extractCommandPathCandidates(command).find(path => matchProtectedConfigPath(path));
    if (!candidate) return null;
    return { path: candidate, rule: matchProtectedConfigPath(candidate) };
  }

  return null;
}

function matchProtectedConfigPath(filePath) {
  const normalized = normalizePathRule(filePath);
  if (!normalized) return null;

  if (normalized.includes('skills/vibe/assets/schemas/') && normalized.endsWith('.schema.json')) {
    return PROTECTED_CONFIG_RULES[0];
  }
  if (normalized === PROTECTED_CONFIG_RULES[1] || normalized.endsWith(`/${PROTECTED_CONFIG_RULES[1]}`)) {
    return PROTECTED_CONFIG_RULES[1];
  }
  if (normalized === PROTECTED_CONFIG_RULES[2] || normalized.endsWith(`/${PROTECTED_CONFIG_RULES[2]}`)) {
    return PROTECTED_CONFIG_RULES[2];
  }

  // Fixup-10 P1 #2: guardrail files. Exact path or suffixed by `/` to
  // prevent basename-collision masquerades (`foopre-tool-use.js` must
  // NOT match `pre-tool-use.js`). Skipped when `VIBE_SCIENCE_DEV=1`
  // so plugin developers can edit their own source.
  if (!isDevModeEnabled()) {
    for (const rule of GUARDRAIL_PROTECTED_RULES) {
      if (normalized === rule || normalized.endsWith(`/${rule}`)) {
        return rule;
      }
    }
  }

  return null;
}

function looksClaimLike(text) {
  const source = String(text || '');
  if (!source.trim()) return false;
  // Detect claim-like content: structured blocks or claim IDs at line start.
  // NOTE: event_type alone is NOT sufficient — it appears in generic YAML/JSON configs.
  return /```(?:vibe-)?claim\b|(?:^|\n)\s*(?:[-*]\s*)?(?:id\s*:\s*)?(?:C-?\d+|CLAIM-\d+)\b/i.test(source);
}

/**
 * Fixup-10 P1 #1: detect a Bash command that would land content in a
 * markdown deliverable (closeout, status, summary, README, CHANGELOG,
 * release, skill, final-report, etc.). The delivery-discipline hook
 * is wired to Write|Edit|MultiEdit only — without this detection, an
 * agent can bypass the whole attestation barrier via shell redirects
 * (`echo ... >`, `cat > ... <<EOF`), PowerShell cmdlets (Set-Content,
 * Out-File, Add-Content), or generic file ops (cp, mv into place).
 * Rather than try to reconstruct the post-write content from the
 * shell command (brittle), we deny Bash writes to deliverable
 * basenames outright and instruct the agent to use Write/Edit so the
 * hook can evaluate their attestation.
 *
 * Returns the candidate path string on match, or null.
 *
 * Skipped when `VIBE_SCIENCE_DEV=1` so plugin developers can generate
 * deliverables programmatically.
 */
function detectBashDeliverableWrite(toolInput = {}) {
  if (isDevModeEnabled()) return null;
  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;
  if (!bashCommandHasWriteIntent(command)) return null;
  // Use the shared path extractor, then check each candidate against
  // the delivery-discipline basename whitelist.
  const candidates = extractCommandPathCandidates(command);
  for (const candidate of candidates) {
    if (matchesDeliverablePath(candidate)) {
      return candidate;
    }
  }
  return null;
}

function detectGovernanceShellWrite(toolInput = {}) {
  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;

  const normalized = command.replace(/\\/g, '/').toLowerCase();
  const hasInterpreterScriptInvocation =
    /\b(?:python(?:3)?|py|node|perl|ruby|pwsh|powershell|bash|sh)\b(?:\s+-\w+(?:\s+\S+)*)*\s+\S+/i.test(command);
  const hasWriteIntent = bashCommandHasWriteIntent(command);

  const targets = [
    { rule: 'claim-ledger', label: 'CLAIM-LEDGER.md' },
    { rule: 'findings', label: 'FINDINGS.md' },
    { rule: 'serendipity', label: 'SERENDIPITY.md' },
    { rule: '05-reviewer2', label: '05-reviewer2/' },
  ];

  for (const target of targets) {
    if (normalized.includes(target.rule) && (hasWriteIntent || hasInterpreterScriptInvocation)) {
      return target.label;
    }
  }

  if (detectDirectionShellTarget(normalized) && (hasWriteIntent || hasInterpreterScriptInvocation)) {
    return 'direction artifact';
  }

  return null;
}

function getBashCommand(toolInput = {}) {
  return String(
    toolInput.command ||
    toolInput.cmd ||
    toolInput.script ||
    toolInput.bash_command ||
    ''
  );
}

function bashCommandHasWriteIntent(command) {
  const normalized = String(command || '').replace(/\\/g, '/').toLowerCase();
  return (
    />{1,2}/.test(normalized) ||
    // Cover both full PowerShell cmdlets and their common aliases on Windows.
    /\b(?:out-file|set-content|sc|add-content|ac|copy-item|copy|ci|move-item|move|mi|rename-item|rename|ren|remove-item|ri|new-item|ni|tee|touch|cp|mv|rm|del)\b/i.test(command) ||
    /\bsed\s+-i\b/i.test(command) ||
    /\bperl\s+-pi\b/i.test(command) ||
    /\bwritefile|appendfile\b/i.test(normalized) ||
    /\b(?:write|append|copy|move|rename|replace|remove|unlink|delete)\w*\s*\(/i.test(command) ||
    /\bwrite_(?:text|bytes)\s*\(/i.test(command) ||
    /\bopen\s*\([^)]*,\s*['"](?:w|a|x)/i.test(command)
  );
}

function detectDirectionShellTarget(normalizedCommand) {
  const source = String(normalizedCommand || '');
  return /(?:^|[\/\s])\d{0,2}-?directions?(?:[\/\s]|$)|\bdirection[^\/\s]*\.(?:md|json)\b|\brq\.md\b/.test(source);
}

function normalizePathRule(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .toLowerCase()
    .replace(/^\.?\//, '')
    .replace(/\/+$/, '');
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

function recordGovernanceEvent(db, event) {
  if (!db || !logGovernanceEvent) return;
  try {
    logGovernanceEvent(db, event);
  } catch {
    // Best effort only — audit capture must not weaken the deny path.
  }
}

function getChangedLifecycleEvents(oldEvents = [], newEvents = []) {
  const oldByClaim = new Map(oldEvents.map(event => [event.claim_id, event]));
  const changed = [];

  for (const event of newEvents) {
    const previous = oldByClaim.get(event.claim_id);
    if (!previous || lifecycleSignature(previous) !== lifecycleSignature(event)) {
      changed.push(event);
    }
  }

  return changed;
}

function lifecycleSignature(event = {}) {
  return [
    event.claim_id ?? '',
    event.event_type ?? '',
    event.old_status ?? '',
    event.new_status ?? '',
    event.r2_verdict ?? '',
    event.kill_reason ?? '',
  ].join('|');
}

function isMutationSensitiveTool(toolName) {
  return toolName === 'Write' || toolName === 'Edit' || toolName === 'MultiEdit' || toolName === 'Bash';
}

function extractClaimSegments(text) {
  const source = String(text || '');
  if (!source.trim()) return [];

  const structured = extractStructuredClaimSegments(source);
  if (structured.length > 0) return structured;

  const lines = source.split(/\r?\n/);
  const segments = [];
  let current = null;

  for (const line of lines) {
    if (/^\s*(?:[-*+]\s*)?(?:id\s*:\s*)?(?:C-?\d+|CLAIM-\d+)\b/i.test(line)) {
      if (current) segments.push(current);
      current = { text: line, id: extractClaimId(line), key: extractClaimId(line) || `line-${segments.length + 1}` };
      continue;
    }

    if (current) {
      current.text += `\n${line}`;
    }
  }

  if (current) segments.push(current);
  if (segments.length > 0) return segments;

  return looksClaimLike(source)
    ? [{ text: source, id: extractClaimId(source), key: extractClaimId(source) || 'claim-1' }]
    : [];
}

function extractStructuredClaimSegments(text) {
  if (!parseStructuredBlocks) return [];

  const parsed = parseStructuredBlocks(text, { allowedTypes: ['claim'] });
  return parsed.blocks
    .filter(block => block.type === 'claim')
    .map((block, index) => ({
      text: renderStructuredClaimBlock(block),
      id: extractClaimId(block.data?.id || block.raw?.id || ''),
      key: extractClaimId(block.data?.id || block.raw?.id || '') || `structured-${index + 1}`,
    }));
}

function renderStructuredClaimBlock(block) {
  if (!block) return '';
  if (block.raw && typeof block.raw === 'object') {
    return Object.entries(block.raw)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value ?? ''}`)
      .join('\n');
  }
  return '';
}

function extractClaimId(text) {
  const match = String(text || '').match(/\b(C-?\d+|CLAIM-\d+)\b/i);
  return match ? match[1].toUpperCase().replace(/^C(\d)/, 'C-$1') : null;
}
