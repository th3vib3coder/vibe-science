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

let openDB, initDB, closeDB, getLatestPromptRole, checkPermission, parseStructuredBlocks;
try {
  const dbMod = await import('../lib/db.js');
  openDB = dbMod.openDB;
  initDB = dbMod.initDB;
  closeDB = dbMod.closeDB;
  getLatestPromptRole = dbMod.getLatestPromptRole;
} catch {
  openDB = null;
  initDB = null;
  closeDB = () => {};
  getLatestPromptRole = () => null;
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
  try {
    const toolName = event.tool_name || '';
    const toolInput = event.tool_input || {};
    const strictMode = process.env.VIBE_SCIENCE_STRICT === '1';

    // -----------------------------------------------------------------------
    // 0. TEAM permission barrier (before any write reaches the workspace)
    // -----------------------------------------------------------------------
    const db = openHookDb();
    try {
      const agentRole = resolveAgentRole(db, event);
      if (strictMode && !agentRole) {
        denyStrict('cannot verify role / permission barrier because no agent role could be resolved');
        return;
      }
      if (agentRole) {
        const violation = checkPermission(agentRole, toolName, toolInput);
        if (violation) {
          denyPermission(agentRole, violation);
          return;
        }
      }
    } finally {
      closeHookDb(db);
    }

    if (toolName === 'Bash') {
      const shellGovernanceViolation = detectGovernanceShellWrite(toolInput);
      if (shellGovernanceViolation) {
        denyShellGovernance(shellGovernanceViolation);
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
        deny(toolName, 'touches confounder_status/NOT_APPLICABLE without enough claim context; rewrite the full claim block instead of editing the marker line in isolation');
        return;
      }

      const touchesClaim = oldClaims.length > 0 || newClaims.length > 0;
      if (!touchesClaim) continue;

      touchedClaimContent = true;

      const newByKey = new Map(newClaims.map(claim => [claim.key, claim]));

      for (const oldClaim of oldClaims) {
        const newClaim = newByKey.get(oldClaim.key);
        if (hasConfounderHarness(oldClaim.text) && (!newClaim || !hasConfounderHarness(newClaim.text))) {
          deny(toolName, `removed an existing confounder_status/NOT_APPLICABLE marker from claim ${oldClaim.id || oldClaim.key}`);
          return;
        }
      }

      for (const claim of newClaims) {
        if (!hasConfounderHarness(claim.text)) {
          deny(toolName, `omits confounder_status/NOT_APPLICABLE on claim ${claim.id || claim.key}`);
          return;
        }
      }
    }

    if (!touchedClaimContent) {
      allow();
      return;
    }

    allow();
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

function deny(toolName, reason) {
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
    return [{ oldText: '', newText: String(toolInput.content || '') }];
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

function looksClaimLike(text) {
  const source = String(text || '');
  if (!source.trim()) return false;
  // Detect claim-like content: structured blocks or claim IDs at line start.
  // NOTE: event_type alone is NOT sufficient — it appears in generic YAML/JSON configs.
  return /```(?:vibe-)?claim\b|(?:^|\n)\s*(?:[-*]\s*)?(?:id\s*:\s*)?(?:C-?\d+|CLAIM-\d+)\b/i.test(source);
}

function detectGovernanceShellWrite(toolInput = {}) {
  const command = String(
    toolInput.command ||
    toolInput.cmd ||
    toolInput.script ||
    toolInput.bash_command ||
    ''
  );
  if (!command.trim()) return null;

  const normalized = command.replace(/\\/g, '/').toLowerCase();
  const hasInterpreterScriptInvocation =
    /\b(?:python(?:3)?|py|node|perl|ruby|pwsh|powershell|bash|sh)\b(?:\s+-\w+(?:\s+\S+)*)*\s+\S+/i.test(command);
  const hasWriteIntent =
    />{1,2}/.test(normalized) ||
    // Cover both full PowerShell cmdlets and their common aliases on Windows.
    /\b(?:out-file|set-content|sc|add-content|ac|copy-item|copy|ci|move-item|move|mi|rename-item|rename|ren|remove-item|ri|new-item|ni|tee|touch|cp|mv|rm|del)\b/i.test(command) ||
    /\bsed\s+-i\b/i.test(command) ||
    /\bperl\s+-pi\b/i.test(command) ||
    /\bwritefile|appendfile\b/i.test(normalized) ||
    /\b(?:write|append|copy|move|rename|replace|remove|unlink|delete)\w*\s*\(/i.test(command) ||
    /\bwrite_(?:text|bytes)\s*\(/i.test(command) ||
    /\bopen\s*\([^)]*,\s*['"](?:w|a|x)/i.test(command);

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

  return null;
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
