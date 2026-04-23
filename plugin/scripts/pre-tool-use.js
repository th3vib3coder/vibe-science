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

import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
// Fixup-10 P1 #1: need to share the deliverable-path matcher so Bash
// writes to .md deliverables are blocked with the same basename rule
// the delivery-discipline hook uses on Write/Edit/MultiEdit.
import { matchesDeliverablePath } from './pre-delivery-discipline.js';
import {
  isPhase9HandshakeEnabled,
  resolvePluginRepoRoot,
  resolveSiblingVreRoot,
} from './handshake-inject.js';

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
  // the validator/test implementations, and the CI/local config substrate
  // that decides whether the guardrail actually runs.
  'plugin/scripts/pre-delivery-discipline.js',
  'plugin/scripts/pre-tool-use.js',
  '.claude/settings.json',
  '.claude/settings.local.json',
  'hooks/hooks.json',
  'package.json',
  'package-lock.json',
  '.github/workflows/ci.yml',
  '__test_e2e.mjs',
  'tests/governance-events.test.mjs',
  'tests/governance-hooks.test.mjs',
  'tests/delivery-discipline-skill.test.mjs',
  'tests/validate-delivery-honesty.test.mjs',
  'tests/delivery-discipline-hook.test.mjs',
  // Wave 0 T0.6: pre-register canonical future Phase 9 guardrail paths so
  // agents cannot edit them the moment they appear. These paths are pinned
  // by file 15 and must stay immutable from the agent side.
  'plugin/scripts/handshake-inject.js',
  'plugin/scripts/objective-loader.js',
  'plugin/scripts/loop-wake.js',
  'plugin/scripts/r2-bridge-writer.js',
  'vibe-research-environment/environment/orchestrator/autonomy-runtime.js',
];

// Guardrail rules added by fixup-10 — used to route the deny message
// through a guardrail-specific branch that explains the escape hatch.
const GUARDRAIL_PROTECTED_RULES = new Set([
  'plugin/scripts/pre-delivery-discipline.js',
  'plugin/scripts/pre-tool-use.js',
  '.claude/settings.json',
  '.claude/settings.local.json',
  'hooks/hooks.json',
  'package.json',
  'package-lock.json',
  '.github/workflows/ci.yml',
  '__test_e2e.mjs',
  'tests/governance-events.test.mjs',
  'tests/governance-hooks.test.mjs',
  'tests/delivery-discipline-skill.test.mjs',
  'tests/validate-delivery-honesty.test.mjs',
  'tests/delivery-discipline-hook.test.mjs',
  'plugin/scripts/handshake-inject.js',
  'plugin/scripts/objective-loader.js',
  'plugin/scripts/loop-wake.js',
  'plugin/scripts/r2-bridge-writer.js',
  'vibe-research-environment/environment/orchestrator/autonomy-runtime.js',
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
        const sanctionedPhase9Decision = await evaluatePhase9SanctionedVreCommand(event, toolInput);
        if (sanctionedPhase9Decision?.decision === 'allow') {
          allow();
          return;
        }
        if (sanctionedPhase9Decision?.decision === 'deny') {
          denyPhase9SanctionedVreCommand(sanctionedPhase9Decision.reason);
          return;
        }
        // Fixup-17 — Opzione B (nuclear). The 15th adversarial review
        // found 3 P1 classes that enumeration cannot close: external
        // script invocation, build/dispatcher tools, and delete
        // primitives. Under the user's escalation rule, these are
        // now denied unconditionally in production mode. DEV escape
        // unchanged. Placed BEFORE the other Bash detectors so the
        // nuclear reason takes precedence — the specific detectors
        // below still fire as additional coverage.
        const nuclearHit = detectBashNuclearViolation(toolInput);
        if (nuclearHit) {
          denyBashNuclear(nuclearHit);
          return;
        }
        const shellGovernanceViolation = detectGovernanceShellWrite(toolInput);
        if (shellGovernanceViolation) {
          denyShellGovernance(shellGovernanceViolation);
          return;
        }
        // Fixup-15 P1 #1: whole-tree writers (tar/unzip/7z/git-whole-
        // tree/rsync-to-cwd) can overwrite arbitrary files in the
        // working tree without naming the sensitive target. Deny
        // unconditionally in production mode so an attacker-controlled
        // archive/branch cannot land sensitive content.
        const wholeTreeLabel = detectWholeTreeBashWrite(toolInput);
        if (wholeTreeLabel) {
          denyBashWholeTreeWrite(wholeTreeLabel, getBashCommand(toolInput));
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

function denyBashNuclear(hit) {
  const classExplanation = {
    'external-script-invocation':
      'invokes an external script file (e.g. `bash payload.sh`, `python3 f.py`, ' +
      '`./payload.mjs`, `source f.sh`) whose body is opaque to the hook',
    'build-dispatcher':
      'invokes a build dispatcher (e.g. `make`, `npm run <x>`, `cmake --build`, ' +
      '`cargo build`, `go build`, `mvn`, `gradle`, `rake`, `pip install -e .`, ' +
      '`docker build/run`) that executes agent-authored targets',
    'delete-primitive':
      'uses a delete primitive (e.g. `rm`, `rmdir`, `find -delete`, `find -exec`, ' +
      '`xargs rm`, `git clean`, `shred`) that can erase guardrail files or runtime state',
  };
  const result = { hookSpecificOutput: { permissionDecision: 'deny' } };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `DELIVERY DISCIPLINE BLOCK (Opzione B nuclear): the Bash command ` +
    `${classExplanation[hit.class] || 'triggered the nuclear write-like policy'}. ` +
    `After 15 rounds of adversarial review proving that enumeration-based ` +
    `Bash write-detection is bottomless, production mode now denies the entire ` +
    `class of commands that can plausibly mutate or destroy files. ` +
    `Use Write/Edit for file creation, use individual read tools (cat/grep/ls/git status) ` +
    `for inspection, or launch Claude Code with VIBE_SCIENCE_DEV=1 if you are a ` +
    `plugin developer intentionally running scripts/builds/deletes. ` +
    `Command preview: ${String(hit.command).slice(0, 160)}`
  );
  process.exit(2);
}

function denyBashWholeTreeWrite(patternLabel, command) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny',
    },
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `DELIVERY DISCIPLINE BLOCK (whole-tree write): the Bash command uses a ` +
    `${patternLabel} pattern that can overwrite arbitrary files in the workspace ` +
    `(including CHANGELOG.md, final-report.md, or hook/config files) from ` +
    `archive or branch contents without naming the target. Because the hook ` +
    `cannot audit what the payload will land, whole-tree writers ` +
    `(tar/unzip/7z/unrar extract, git checkout|restore|reset whole-tree, ` +
    `rsync-to-cwd) are denied in production mode. ` +
    `Use Write/Edit for individual files, or extract into a staging path ` +
    `OUTSIDE the workspace first. If you are a plugin developer and this is ` +
    `intentional, launch Claude Code with VIBE_SCIENCE_DEV=1. ` +
    `Command preview: ${String(command).slice(0, 120)}`
  );
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

function denyPhase9SanctionedVreCommand(reason) {
  const result = {
    hookSpecificOutput: {
      permissionDecision: 'deny',
    },
  };
  process.stdout.write(JSON.stringify(result));
  process.stderr.write(
    `SANCTIONED VRE COMMAND GATE BLOCK: ${reason} ` +
    `Production Bash execution is allowed only through the reviewed sibling VRE entrypoint ` +
    '`node <sibling-vre>/bin/vre run-analysis --manifest <literal-path>` ' +
    `with a pre-existing, valid analysis manifest. Create or fix the manifest instead of ` +
    `running a direct interpreter or opaque script.`
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
    // Fixup-14: use the broader `commandHasWritePrimitive` gate instead
    // of the narrow `bashCommandHasWriteIntent` so rsync/scp/awk-i/ed/
    // vim/pandoc/output-flag writers cannot bypass guardrail
    // self-protection. The 13th review demonstrated that
    // `rsync src plugin/scripts/pre-tool-use.js` returned allow
    // because rsync was not in the write-intent allowlist.
    if (isDevModeEnabled()) return null;
    const command = getBashCommand(toolInput);
    if (!command.trim()) return null;
    const candidates = extractCommandPathCandidates(command);
    for (const candidate of candidates) {
      const rule = matchProtectedConfigPath(candidate);
      if (rule && commandHasWritePrimitive(command)) {
        return { path: candidate, rule };
      }
    }
    return null;
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
    // Fixup-14 P1 #1 extension: directory-level match. A write that
    // targets a DIRECTORY containing a guardrail file (e.g. `rsync
    // -a src/ plugin/scripts/`) must be treated as a guardrail
    // violation — otherwise bulk-copy tools can overwrite the hook
    // script by targeting its parent dir. For each guardrail rule,
    // check if the normalized target equals any parent-directory
    // prefix of the rule path (at every depth).
    for (const rule of GUARDRAIL_PROTECTED_RULES) {
      const parts = rule.split('/');
      for (let i = 1; i < parts.length; i += 1) {
        const prefix = parts.slice(0, i).join('/');
        if (prefix.length === 0) continue;
        if (normalized === prefix || normalized.endsWith(`/${prefix}`)) {
          return rule;
        }
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
 * Fixup-12: static shell analysis cannot prove computed paths. Tighten
 * the policy in production mode: any Bash command with write intent and
 * visible markdown extension, variable redirection target, or interpreter
 * file-write API is denied. This intentionally creates some false
 * positives for shell-generated markdown; developers can opt into
 * VIBE_SCIENCE_DEV=1 when generation is intentional.
 *
 * Returns the candidate path string on match, or null.
 *
 * Skipped when `VIBE_SCIENCE_DEV=1` so plugin developers can generate
 * deliverables programmatically.
 */
/**
 * Fixup-14 architectural shift: STOP enumerating writer tools as the
 * first-class gate. Instead:
 *   (1) scan the command for ANY path candidates,
 *   (2) check if any of those candidates is a sensitive path
 *       (deliverable markdown OR guardrail/protected file),
 *   (3) if yes, check if the command contains ANY write primitive —
 *       from narrow (`>` redirect, known cmdlets) to broad (copy/
 *       render/editor/interpreter tools, output-like flags).
 *
 * The 13th review demonstrated that the "enumerate every writer"
 * approach is bottomless: rsync, scp, awk -i inplace, ed, vim -es,
 * pandoc -o, python -m shutil copyfile, perl sysopen, Rscript sink
 * all bypassed the fixup-13 enumeration. Shape change: once a command
 * refers to a sensitive path AND has any write capability, deny —
 * rather than relying on the completeness of a tool allowlist.
 *
 * Trade-off: more false positives on read-only commands that happen
 * to mention sensitive paths and use ambiguous flags (e.g. `grep -o
 * PATTERN CHANGELOG.md`). Users can set VIBE_SCIENCE_DEV=1 or use
 * the Read tool.
 */
function commandHasWritePrimitive(command) {
  const source = String(command || '');
  // Narrow/specific signals (already covered by fixup-10..13):
  if (bashCommandHasWriteIntent(source)) return true;
  if (hasInterpreterFileWriteApi(source)) return true;
  if (hasInterpreterScriptWithDeliverableArg(source)) return true;
  // Broad catchall — copy/sync/transfer tools:
  if (/\b(?:rsync|scp|sftp|rclone|robocopy|unison|duplicity|borg)\b/i.test(source)) return true;
  // Transform/render tools:
  if (/\b(?:pandoc|convert|magick|ffmpeg|sox|gs|imagemagick|inkscape)\b/i.test(source)) return true;
  // Archive creators with positional output paths (`zip final-report.md ...`,
  // `jar cf final-report.md ...`, `tar -cf final-report.md ...`). These
  // create/overwrite the output path even without an `-o` flag.
  if (/\b(?:zip|jar)\b/i.test(source)) return true;
  if (/\btar\b[^|;&\n]*(?:\s-[a-z]*c[a-z]*\b|\s--create\b)/i.test(source)) return true;
  // Editors (always write-capable in batch/ex mode):
  if (/\b(?:ed|vi|vim|nvim|view|emacs|nano|pico|micro|helix|kakoune)\b/i.test(source)) return true;
  // awk in-place:
  if (/\b(?:awk|gawk|nawk|mawk)\b[^|;&\n]*\s+-i\b/i.test(source)) return true;
  // Python / language-level module-write invocations:
  if (/\bpython[23]?\b[^|;&\n]*\s+-m\s+(?:shutil|pathlib|os|fileinput|zipfile|tarfile|wheel|build)\b/i.test(source)) return true;
  // Low-level file primitives by name (covers perl sysopen, R sink):
  if (/\bsysopen\s*\(/i.test(source)) return true;
  if (/\bsink\s*\(/i.test(source)) return true;
  // Generic "output-like flag" catchall — any tool that takes -o/--output
  // pointing at a file. Combined with the path-candidate check, this
  // closes the long tail of writers without enumerating each one.
  // Fixup-15 P1 #2: also catches the ATTACHED short-flag form
  // (`-oFILE` / `-OFILE` with no separator) that curl/wget/sort etc.
  // accept as equivalent to `-o FILE`. Without this, the 14th review
  // reproduced `curl -ofinal-report.md` bypasses.
  if (/(?:^|\s)-[oO][^\s=;&|][^\s;&|]*/.test(source)) return true;
  if (/-{1,2}(?:o|O|out|output(?:[-=\s]?(?:file|document))?|dest|destination|write-out)(?:\s+|=)[^\s;&|]+/i.test(source)) return true;
  return false;
}

/**
 * Fixup-14: detect Bash commands that would mutate a sensitive path
 * (deliverable markdown OR guardrail-protected file). This replaces
 * the previous pattern of "check write-intent first, then look at
 * the target" — which the 13th review broke using writer tools
 * outside the enumerated list. New shape: check the target first,
 * then ask "could this command plausibly write?".
 *
 * Returns `{ kind: 'protected'|'deliverable', path, rule? }` on hit,
 * else null.
 */
function detectBashMutationOfSensitivePath(toolInput = {}) {
  if (isDevModeEnabled()) return null;
  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;

  const candidates = extractCommandPathCandidates(command);
  let protectedHit = null;
  let deliverableHit = null;
  for (const c of candidates) {
    if (!protectedHit) {
      const rule = matchProtectedConfigPath(c);
      if (rule) protectedHit = { path: c, rule };
    }
    if (!deliverableHit && matchesDeliverablePath(c)) {
      deliverableHit = c;
    }
  }
  if (!protectedHit && !deliverableHit) return null;
  if (!commandHasWritePrimitive(command)) return null;
  return protectedHit
    ? { kind: 'protected', ...protectedHit }
    : { kind: 'deliverable', path: deliverableHit };
}

/**
 * Fixup-15 P1 #1: whole-tree writer detection.
 *
 * The 14th adversarial review reproduced bypasses via commands that
 * mutate the working tree or extract archives WITHOUT naming the
 * sensitive file as a command argument. These commands can overwrite
 * CHANGELOG.md, final-report.md, or guardrail files from payload
 * contents while never exposing the sensitive filename to the
 * path-candidate scanner. Examples reproduced by reviewer:
 *
 *   tar -xf payload.tar              (extracts to cwd by default)
 *   unzip payload.zip                (extracts to cwd by default)
 *   7z x payload.7z / unrar x|e ...
 *   git checkout <branch> -- .       (whole-tree restore)
 *   git restore --source=<branch> .  (whole-tree restore)
 *   git reset --hard <branch>        (whole-tree reset)
 *   rsync -a src/ .                  (sync into cwd)
 *
 * The path-candidate-first detector (fixup-14) doesn't help here
 * because the command's visible arguments are archive/branch names,
 * not the sensitive target paths the archive will overwrite.
 *
 * Policy: in production mode, whole-tree writers are denied
 * unconditionally. Agents who genuinely need them set
 * VIBE_SCIENCE_DEV=1 (environment of the launching human, not agent-
 * settable). Returns the pattern label or null.
 */
/**
 * Fixup-17 — Opzione B (nuclear). The final adversarial review found
 * 3 P1 classes that enumeration cannot close:
 *   (1) external-script invocation: `bash payload.sh`, `python3 f.py`,
 *       `node f.mjs`, `./f.sh`, `source f.sh`, `. f.sh` — the script
 *       body is opaque to the hook, so any write inside the script
 *       slides past.
 *   (2) build dispatchers: `make`, `npm run <x>`, `cmake --build`,
 *       `cargo build`, `go build`, `mvn`, `gradle`, `rake`, `pip
 *       install -e .`, `docker build/run` — agent-authored targets
 *       execute arbitrary writers.
 *   (3) delete primitives: `rm -rf DIR`, `find -delete`, `find -exec`,
 *       `xargs rm`, `git clean -fx`, `shred FILE` — destroy the
 *       guardrail substrate and/or runtime state.
 *
 * The user's escalation rule committed to Opzione B: in production
 * mode, deny every bash command that matches any of these classes.
 * DEV escape (`VIBE_SCIENCE_DEV=1`) remains for plugin developers.
 * The intent: agents must use Write/Edit for file mutation, can
 * still read via cat/grep/ls/git-log/etc., and cannot run opaque
 * scripts or mass-delete the workspace.
 */

function hasExternalScriptInvocation(command) {
  const source = String(command || '');
  // Interpreter + script-file argument (any extension commonly used
  // to ship script bodies). The script file is under agent control,
  // so its body can write anything.
  const INTERP = '(?:bash|sh|zsh|fish|dash|ksh|csh|tcsh|python(?:3|2)?|py|node|nodejs|perl|ruby|php|deno|bun|ts-node|tsx|julia|Rscript|lua|pwsh|powershell)';
  const SCRIPT_EXT = '(?:sh|bash|zsh|fish|py|js|mjs|cjs|ts|tsx|pl|rb|php|lua|r|jl|ps1|cmd|bat)';
  if (new RegExp(`\\b${INTERP}\\b\\s+(?:-[\\w-]+\\s+)*\\S+\\.${SCRIPT_EXT}\\b`, 'i').test(source)) {
    return true;
  }
  // env <interpreter> FILE
  if (new RegExp(`\\benv\\s+${INTERP}\\s+\\S+\\.${SCRIPT_EXT}\\b`, 'i').test(source)) {
    return true;
  }
  // Direct execution of a script file: ./FILE, /abs/FILE, ~/FILE
  if (new RegExp(`(?:^|[\\s;&|])[\\./~][\\w./-]*\\.${SCRIPT_EXT}\\b`).test(source)) {
    return true;
  }
  // source / . FILE
  if (/\b(?:source)\s+\S+/i.test(source)) return true;
  if (/(?:^|[\s;&|])\.\s+\S+\.(?:sh|bash|zsh|py|mjs|js)\b/.test(source)) return true;
  // nohup / setsid / timeout wrapping a script invocation — they take
  // an interpreter + file as their tail.
  if (new RegExp(`\\b(?:nohup|setsid|timeout(?:\\s+\\S+)?|systemd-run)\\s+${INTERP}\\b`, 'i').test(source)) {
    return true;
  }
  // xargs/parallel/watch wrapping a script
  if (new RegExp(`\\b(?:xargs|parallel|watch)\\b[^|;&\\n]*\\s+${INTERP}\\b`, 'i').test(source)) {
    return true;
  }
  return false;
}

function hasBuildDispatcher(command) {
  const source = String(command || '');
  // make / gmake / cmake / ninja — any invocation
  if (/\b(?:make|gmake|cmake|ninja|meson|bazel|buck2|scons|waf)\b/i.test(source)) return true;
  // npm/pnpm/yarn run|exec — arbitrary script dispatch
  if (/\b(?:npm|pnpm|yarn)\s+(?:run(?:-script)?|exec|x)\b/i.test(source)) return true;
  // npx — runs arbitrary packages
  if (/\bnpx\b/i.test(source)) return true;
  // yarn <script> without explicit 'run' (yarn auto-detects script names)
  if (/\byarn\s+\S+(?!\s+--help)/i.test(source) && !/\byarn\s+(?:--version|-v|help|why|info|list|ls|cache|config|audit|run)\b/i.test(source)) return true;
  // Rust / Go / Java-ecosystem build dispatchers
  if (/\bcargo\s+(?:build|run|test|install|bench|doc|fix|fmt|clippy)\b/i.test(source)) return true;
  if (/\bgo\s+(?:build|run|test|install|get|generate|vet)\b/i.test(source)) return true;
  if (/\b(?:mvn|maven|mvnw|gradle|gradlew|sbt|lein|ant|rake)\b/i.test(source)) return true;
  // Python build/install
  if (/\bpip\s+install\b/i.test(source)) return true;
  if (/\bpip(?:x|3)?\s+install\b/i.test(source)) return true;
  if (/\bpython[23]?\s+-m\s+(?:pip|build|pytest|unittest|setup)\b/i.test(source)) return true;
  if (/\bpoetry\s+(?:install|run|add|update|build|publish)\b/i.test(source)) return true;
  // Container/runtime
  if (/\b(?:docker|podman)\s+(?:build|run|exec|compose\s+up|compose\s+run)\b/i.test(source)) return true;
  // Shell runner wrappers like `time FOO` around a build
  // (covered by the underlying invocation also matching)
  return false;
}

function hasDeletePrimitive(command) {
  const source = String(command || '');
  // rm with any args (including flags)
  if (/\brm\s+(?:-[\w-]+\s+)*\S+/i.test(source)) return true;
  // rmdir FILE
  if (/\brmdir\s+\S+/i.test(source)) return true;
  // find -delete / find -exec rm / find -exec cp / etc.
  if (/\bfind\b[^|;&\n]*\s-delete\b/i.test(source)) return true;
  if (/\bfind\b[^|;&\n]*\s-exec\b/i.test(source)) return true;
  if (/\bfind\b[^|;&\n]*\s-execdir\b/i.test(source)) return true;
  // xargs pipelines targeting a write/delete primitive
  if (/\bxargs\b[^|;&\n]*\b(?:rm|cp|mv|install|tee|touch|dd|ln)\b/i.test(source)) return true;
  // git clean (destroys untracked files)
  if (/\bgit\s+clean\b/i.test(source)) return true;
  // git stash drop / git stash clear
  if (/\bgit\s+stash\s+(?:drop|clear)\b/i.test(source)) return true;
  // Secure-delete tools
  if (/\b(?:shred|wipe|sdelete|srm)\b/i.test(source)) return true;
  // Windows equivalents
  if (/\b(?:del|erase|rd)\b\s+\S+/i.test(source)) return true;
  return false;
}

/**
 * Opzione B nuclear denial. Returns a `{ class, command }` shape on
 * hit so the deny message can explain which class triggered, or
 * null if the command is safe in production mode.
 */
function detectBashNuclearViolation(toolInput = {}) {
  if (isDevModeEnabled()) return null;
  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;
  if (hasExternalScriptInvocation(command)) return { class: 'external-script-invocation', command };
  if (hasBuildDispatcher(command)) return { class: 'build-dispatcher', command };
  if (hasDeletePrimitive(command)) return { class: 'delete-primitive', command };
  return null;
}

function detectWholeTreeBashWrite(toolInput = {}) {
  if (isDevModeEnabled()) return null;
  const source = getBashCommand(toolInput);
  if (!source.trim()) return null;
  // tar extract (both dashed and legacy non-dashed flag styles):
  //   tar -xf ARCHIVE, tar xf ARCHIVE, tar -x ARCHIVE, tar --extract ...
  if (/\btar\b[^|;&\n]*\s+-[a-z]*x[a-z]*\b/i.test(source)) return 'tar-extract';
  if (/\btar\b\s+[a-z]*x[a-z]*\b/i.test(source)) return 'tar-extract';
  if (/\btar\b[^|;&\n]*\s+--extract\b/i.test(source)) return 'tar-extract';
  // unzip (extracts to current directory by default)
  if (/\bunzip\b/i.test(source)) return 'unzip';
  // unrar / 7z extract
  if (/\bunrar\b\s+[ex]\b/i.test(source)) return 'unrar-extract';
  if (/\b7z\b\s+[ex]\b/i.test(source)) return '7z-extract';
  if (/\bcpio\b[^|;&\n]*(?:\s-[a-z]*i[a-z]*\b|\s--extract\b)/i.test(source)) return 'cpio-extract';
  // git whole-tree restore patterns: `-- .`, bare `.` at end, `--hard`
  if (/\bgit\s+(?:checkout|restore)\b[^|;&\n]*--\s*\.(?:\s|$|[;&|])/i.test(source)) return 'git-whole-tree-restore';
  if (/\bgit\s+restore\b[^|;&\n]*\s+\.\s*(?:$|[;&|])/i.test(source)) return 'git-whole-tree-restore';
  if (/\bgit\s+reset\s+--hard\b/i.test(source)) return 'git-reset-hard';
  if (/\bgit\s+(?:apply|am|merge|rebase|cherry-pick|pull)\b/i.test(source)) return 'git-worktree-mutation';
  if (/\bgit\s+clone\b[^|;&\n]*\s+\.\/?(?:\s|$|[;&|])/i.test(source)) return 'git-clone-to-cwd';
  // rsync into cwd or root: last arg is `.`, `./`, or trailing `/`
  if (/\brsync\b[^|;&\n]*\s+\.\/?(?=\s|$|[;&|])/i.test(source)) return 'rsync-to-cwd';
  // Package-manager operations can rewrite package.json/package-lock.json
  // or run arbitrary install scripts in the project. In production mode
  // those belong behind VIBE_SCIENCE_DEV=1.
  if (/\b(?:npm|pnpm|yarn|bun)\b\s+(?:install|i|ci|add|update|upgrade|remove|uninstall|link)\b/i.test(source)) return 'package-manager-mutation';
  return null;
}

function detectBashDeliverableWrite(toolInput = {}) {
  if (isDevModeEnabled()) return null;
  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;
  // Fixup-14: gate now uses `commandHasWritePrimitive` (broad union)
  // instead of the narrow `bashCommandHasWriteIntent`. This covers
  // writer tools that don't use `>`/`>>` redirects (rsync, scp, awk
  // -i, editors, pandoc, etc.) without requiring each to be listed
  // individually.
  if (!commandHasWritePrimitive(command)) return null;
  const candidates = extractCommandPathCandidates(command);
  for (const candidate of candidates) {
    if (matchesDeliverablePath(candidate)) {
      return candidate;
    }
  }
  if (commandMentionsMarkdownFile(command)) {
    return '<markdown-write-intent>';
  }
  if (hasVariableWriteTarget(command)) {
    return '<computed-write-target>';
  }
  if (hasInterpreterFileWriteApi(command)) {
    return '<interpreter-file-write>';
  }
  if (hasInterpreterScriptWithDeliverableArg(command)) {
    return '<interpreter-script-with-deliverable-arg>';
  }
  return null;
}

function hasInterpreterScriptWithDeliverableArg(command) {
  const source = String(command || '');
  // Pattern: interpreter + optional flags (including `run`, `--allow-*`,
  // `-X`, `-u`, etc.) + a script file argument (.js/.mjs/.cjs/.ts/.tsx/
  // .py/.rb/.pl/.php/.sh/.lua/.ps1) + other args.
  const interpreterPlusScript =
    /\b(?:python[23]?|py|node|perl|ruby|pwsh|powershell|bash|sh|php|deno|bun|ts-node|tsx|julia|Rscript|lua)\b(?:\s+(?:--?[\w-]+(?:=\S*)?|run|exec))*\s+[\w./-]+\.(?:js|mjs|cjs|ts|tsx|py|rb|pl|php|sh|bash|lua|ps1|r|jl)\b/i;
  if (!interpreterPlusScript.test(source)) return false;
  // Skip when `-e`/`-c` inline modes are used — that path is already
  // handled by hasInterpreterFileWriteApi (which can inspect the
  // inline code string directly).
  if (/\s-[ce]\s+['"]/i.test(source)) return false;
  // Any deliverable markdown argument to the script → suspicious.
  const candidates = extractCommandPathCandidates(source);
  return candidates.some((c) => matchesDeliverablePath(c));
}

function commandMentionsMarkdownFile(command) {
  return /(?:^|[^a-z0-9])[\w./\\-]*\.md(?:$|[^a-z0-9])/i.test(String(command || ''));
}

function hasVariableWriteTarget(command) {
  const source = String(command || '');
  const shellVariableTarget =
    />{1,2}\s*(?:"[^"]*")?\s*(?:\$[A-Za-z_][A-Za-z0-9_]*(?:\$[A-Za-z_][A-Za-z0-9_]*)*|\$\{[^}]+\}|%[A-Za-z_][A-Za-z0-9_]*%)/i.test(source);
  const powershellVariableTarget =
    /\b(?:set-content|add-content|out-file|new-item|copy-item|move-item|rename-item|remove-item|sc|ac)\b[^\n;&|]*\s(?:-[A-Za-z]*(?:Path|Destination|Target|LiteralPath)\s+)?\$[A-Za-z_][A-Za-z0-9_]*/i.test(source);
  return shellVariableTarget || powershellVariableTarget;
}

function hasInterpreterFileWriteApi(command) {
  const source = String(command || '');
  // Fixup-13 P1 (12th adversarial review): broaden the interpreter
  // name list beyond Python/Node/Perl/Ruby/PowerShell. The reviewer
  // reproduced bypasses via `php -r "file_put_contents(...)"`,
  // `deno run`, `bun run`, `ts-node`, and `julia`. Added to the
  // allowlist. Also recognize `env <interpreter>` wrappers like
  // `/usr/bin/env python3` so attackers cannot add shebang-style
  // obfuscation to the invocation.
  const invokesInterpreter =
    /\b(?:python[23]?|py|node|perl|ruby|pwsh|powershell|bash|sh|php|deno|bun|ts-node|tsx|julia|Rscript|lua)\b/i.test(source) ||
    /\benv\s+(?:python[23]?|node|perl|ruby|php|deno|bun|ts-node|julia|Rscript|lua)\b/i.test(source) ||
    // Explicit absolute/relative path to a known interpreter
    /\/(?:python[23]?|node|perl|ruby|php|deno|bun|ts-node|julia|Rscript|lua)\b/i.test(source);
  if (!invokesInterpreter) return false;
  return (
    // Node.js fs.* family
    /\b(?:writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|copyFileSync|copyFile|renameSync|rename|openSync)\s*\(/i.test(source) ||
    // Python builtin open + Path.write_*
    /\bopen\s*\([^)]*,\s*['"](?:w|a|x)/i.test(source) ||
    /\bwrite_(?:text|bytes)\s*\(/i.test(source) ||
    // PowerShell cmdlets (even when invoked via bash -c / sh -c wrap)
    /\b(?:set-content|add-content|out-file|new-item|tee-object)\b/i.test(source) ||
    // PHP file_put_contents / fputs / fwrite
    /\bfile_put_contents\s*\(/i.test(source) ||
    /\bfwrite\s*\(/i.test(source) ||
    /\bfputs\s*\(/i.test(source) ||
    // Ruby File.write / File.open(..., "w")
    /\bFile\.(?:write|open|new)\s*\(/i.test(source) ||
    // Perl: print FH, open(FH,">","path")
    /\bopen\s*\([^)]*['"]>/.test(source) ||
    // Generic: any .write(...) / .writeAsync(...) method call after a
    // `new` or object reference — last-resort catchall for interpreter
    // code that opens a handle and writes via OO methods.
    /\.\s*write(?:Async)?\s*\(/i.test(source) ||
    // Deno / Bun specific
    /\bDeno\.\s*(?:writeTextFile|writeFile|create)\s*\(/i.test(source) ||
    /\bBun\.\s*write\s*\(/i.test(source)
  );
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
    /\bopen\s*\([^)]*,\s*['"](?:w|a|x)/i.test(command) ||
    // Fixup-13 P0 (12th adversarial review): stdlib Unix tools that
    // create or overwrite files WITHOUT using `>` / `>>` redirects.
    // Before this, 14+ common tools (`install`, `ln`, `curl -o`,
    // `wget -O`, `dd`, `truncate`, `sort -o`, `tar -x`, `unzip`,
    // `git checkout -- <path>`, `git restore`, `mkfifo`, `patch`,
    // `ex`, `script`) were invisible to the write-intent gatekeeper,
    // so the whole Bash deliverable-write policy was "wallpaper over
    // the redirect path". Adding them here makes the path-candidate /
    // .md-substring / variable-target / interpreter-API checks
    // actually run for these tools.
    /\binstall\b\s+[^|;&\n]*-m\b/i.test(command) ||              // install -m MODE ... DEST
    /\binstall\b\s+[^|;&\n]+\s+[^-\s]\S*/i.test(command) ||      // install [flags] SRC DEST (no mode, still a copy)
    /\bln\b\s+[^|;&\n]*-[sf]+/i.test(command) ||                 // ln -s / -f / -sf
    /\bcurl\b[^|;&\n]*\s+-o\b/i.test(command) ||                 // curl -o FILE
    /\bcurl\b[^|;&\n]*\s+--output\b/i.test(command) ||
    /\bwget\b[^|;&\n]*\s+-O\b/i.test(command) ||                 // wget -O FILE
    /\bwget\b[^|;&\n]*\s+--output-document\b/i.test(command) ||
    /\bdd\b[^|;&\n]*\s+of=/i.test(command) ||                    // dd of=FILE
    /\btruncate\b/i.test(command) ||
    /\bsort\b[^|;&\n]*\s+-o\b/i.test(command) ||                 // sort -o FILE
    /\bsort\b[^|;&\n]*\s+--output\b/i.test(command) ||
    /\btar\b[^|;&\n]*\s+-x/i.test(command) ||                    // tar -x (extract)
    /\btar\b[^|;&\n]*\s+--extract\b/i.test(command) ||
    /\bunzip\b/i.test(command) ||                                // unzip (implicit extract)
    /\bunrar\b\s+[ex]\b/i.test(command) ||                       // unrar e / x
    /\b7z\b\s+[ex]\b/i.test(command) ||                          // 7z e / x
    /\bgit\b\s+(?:checkout|restore|reset)\b[^|;&\n]*--/i.test(command) || // git checkout|restore|reset -- PATH
    /\bgit\b\s+worktree\s+add\b/i.test(command) ||
    /\bmkfifo\b/i.test(command) ||                               // mkfifo FILE
    /\bmknod\b/i.test(command) ||
    /\bpatch\b/i.test(command) ||                                // patch FILE < diff
    /\bex\b\s+-c\b/i.test(command) ||                            // ex -c ":w FILE"
    /\bscript\b\s+[^|;&\n]*\S+\.md\b/i.test(command) ||          // script typescript-file
    /\bxxd\b[^|;&\n]*\s+-r\b/i.test(command) ||                  // xxd -r (reverse hex dump -> binary)
    /\bbase64\b[^|;&\n]*\s+-d\b/i.test(command) ||               // base64 -d (can feed into other redirects too, but flag)
    /\bgzip\b[^|;&\n]*\s+-d\b/i.test(command) ||                 // gzip -d / -dc (decompress writes file unless stdout)
    /\bgunzip\b/i.test(command) ||
    // `exec` with an fd redirect to a file is write-intent.
    /\bexec\b\s+\d*\s*>{1,2}/i.test(command) ||
    // PowerShell Out-File variants / Write-Output with redirect already
    // caught; also catch Invoke-WebRequest -OutFile.
    /\binvoke-webrequest\b[^|;&\n]*\s+-outfile\b/i.test(command) ||
    /\binvoke-restmethod\b[^|;&\n]*\s+-outfile\b/i.test(command)
  );
}

function detectDirectionShellTarget(normalizedCommand) {
  const source = String(normalizedCommand || '');
  return /(?:^|[\/\s])\d{0,2}-?directions?(?:[\/\s]|$)|\bdirection[^\/\s]*\.(?:md|json)\b|\brq\.md\b/.test(source);
}

function tokenizeBashCommand(command) {
  const source = String(command || '');
  const tokens = [];
  let current = '';
  let rawCurrent = '';
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      rawCurrent += char;
      if (char === quote) {
        quote = null;
        continue;
      }
      if (quote === '"' && char === '\\' && index + 1 < source.length) {
        index += 1;
        rawCurrent += source[index];
        current += source[index];
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === '\'') {
      quote = char;
      rawCurrent += char;
      continue;
    }

    if (/\s/u.test(char)) {
      if (rawCurrent) {
        tokens.push({ value: current, raw: rawCurrent });
        current = '';
        rawCurrent = '';
      }
      continue;
    }

    if (';&|<>'.includes(char)) {
      return { ok: false, reason: `unsupported shell metacharacter ${char}` };
    }

    if (char === '\\' && index + 1 < source.length) {
      rawCurrent += char + source[index + 1];
      current += source[index + 1];
      index += 1;
      continue;
    }

    rawCurrent += char;
    current += char;
  }

  if (quote) {
    return { ok: false, reason: 'unterminated quote in command' };
  }

  if (rawCurrent) {
    tokens.push({ value: current, raw: rawCurrent });
  }

  return { ok: true, tokens };
}

function normalizeComparablePath(targetPath) {
  const resolved = path.resolve(String(targetPath || '')).replace(/\\/g, '/');
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function tokenHasDynamicShellSyntax(token) {
  const source = String(token?.raw ?? token?.value ?? '');
  return (
    source.includes('$') ||
    source.includes('`') ||
    /\$\(/u.test(source) ||
    /\$\{/u.test(source) ||
    /%[A-Za-z_][A-Za-z0-9_]*%/u.test(source)
  );
}

function resolveProjectLocalCandidate(rootPath, candidatePath, label) {
  const resolved = path.isAbsolute(candidatePath)
    ? path.resolve(candidatePath)
    : path.resolve(rootPath, candidatePath);
  const relative = path.relative(rootPath, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside the sibling VRE root`);
  }
  return {
    absolutePath: resolved,
    relativePath: relative.replace(/\\/g, '/'),
  };
}

async function loadSiblingAnalysisManifestModule(vreRoot) {
  const modulePath = path.join(vreRoot, 'environment', 'orchestrator', 'analysis-manifest.js');
  return import(pathToFileURL(modulePath).href);
}

async function evaluatePhase9SanctionedVreCommand(event, toolInput = {}) {
  if (isDevModeEnabled()) return null;

  const command = getBashCommand(toolInput);
  if (!command.trim()) return null;

  const parsed = tokenizeBashCommand(command);
  const rawTokens = parsed.ok ? parsed.tokens : null;
  const firstToken = parsed.ok ? rawTokens[0]?.value : null;
  if (firstToken == null || !/^node(?:\.exe)?$/iu.test(firstToken)) {
    return null;
  }

  if (!parsed.ok) {
    return {
      decision: 'deny',
      reason: `the candidate VRE command could not be parsed safely (${parsed.reason})`,
    };
  }

  const scriptToken = rawTokens[1];
  if (!scriptToken || scriptToken.value.startsWith('-')) {
    return null;
  }

  if (path.extname(scriptToken.value) !== '') {
    return null;
  }

  if (tokenHasDynamicShellSyntax(scriptToken)) {
    return {
      decision: 'deny',
      reason: 'the VRE executable path must be literal and non-variable',
    };
  }

  const commandCwd = path.resolve(event?.cwd || process.cwd());
  const pluginRepoRoot = resolvePluginRepoRoot(commandCwd);
  const sibling = resolveSiblingVreRoot({ pluginRepoRoot });
  const expectedVrePath = sibling.vreRoot
    ? path.join(sibling.vreRoot, 'bin', 'vre')
    : null;
  const resolvedScriptPath = path.resolve(commandCwd, scriptToken.value);

  if (!expectedVrePath || normalizeComparablePath(resolvedScriptPath) !== normalizeComparablePath(expectedVrePath)) {
    return {
      decision: 'deny',
      reason: 'only the discovered sibling VRE bin/vre entrypoint may run in production mode',
    };
  }

  if (!isPhase9HandshakeEnabled(process.env)) {
    return {
      decision: 'deny',
      reason: 'the Phase 9 feature flag is not enabled for sanctioned VRE execution',
    };
  }

  if (rawTokens.length !== 5 || rawTokens[2]?.value !== 'run-analysis' || rawTokens[3]?.value !== '--manifest') {
    return {
      decision: 'deny',
      reason: 'only `run-analysis --manifest <literal-path>` is currently sanctioned',
    };
  }

  const manifestToken = rawTokens[4];
  if (!manifestToken || tokenHasDynamicShellSyntax(manifestToken)) {
    return {
      decision: 'deny',
      reason: 'the manifest path must be visible in the command and must not use variables or shell expansion',
    };
  }

  let manifestPath;
  try {
    manifestPath = resolveProjectLocalCandidate(sibling.vreRoot, path.resolve(commandCwd, manifestToken.value), 'manifestPath');
  } catch (error) {
    return {
      decision: 'deny',
      reason: error.message,
    };
  }

  if (matchProtectedConfigPath(manifestPath.relativePath)) {
    return {
      decision: 'deny',
      reason: 'the manifest path targets guardrail substrate instead of a reviewed analysis manifest',
    };
  }

  if (!existsSync(manifestPath.absolutePath)) {
    return {
      decision: 'deny',
      reason: `manifest file does not exist yet: ${manifestPath.relativePath}`,
    };
  }

  try {
    const analysisManifestMod = await loadSiblingAnalysisManifestModule(sibling.vreRoot);
    await analysisManifestMod.readAndValidateAnalysisManifest(
      sibling.vreRoot,
      manifestPath.relativePath,
    );
  } catch (error) {
    return {
      decision: 'deny',
      reason: `manifest validation failed: ${error.message}`,
    };
  }

  return { decision: 'allow' };
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
    // Fixup-15 P1 #2: attached short-flag output (`-oFILE` / `-OFILE`
    // without a space separator). Without this, `curl -ofinal-report.md`
    // did NOT surface `final-report.md` as a candidate and the deny
    // path never fired. Long-form `--output=FILE` is already caught by
    // pattern 4 (the `.md`/etc. extension pattern) when the value
    // contains a recognized extension.
    /(?:^|\s)-[oO]([^\s=;&|][^\s;&|]*)/g,
    // Attached long-form: `--output=FILE` / `--out=FILE` etc.
    /--(?:out|output(?:[-=]?(?:file|document))?|dest|destination|write-out)=([^\s;&|]+)/gi,
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
