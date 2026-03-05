#!/usr/bin/env node
// PreToolUse hook — LAW 9 confounder harness enforcement
// Blocks Write/Edit to CLAIM-LEDGER.md if confounder_status field is missing.
// Matcher: "Write|Edit" (regex) — intercepts both tools.
// Exit 0 = allow, Exit 2 = deny (permissionDecision), Exit 1 = internal error
//
// Input (stdin JSON): { tool_name, tool_input, session_id, cwd, hook_event_name }
// Output (stdout JSON): { hookSpecificOutput: { permissionDecision: "allow"|"deny" } }

let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(inputData);
    main(event);
  } catch (e) {
    process.exit(0); // graceful degradation — parse error = allow
  }
});

function main(event) {
  try {
    const toolName = event.tool_name || '';
    const toolInput = event.tool_input || {};

    // Only intercept Write and Edit tools
    if (toolName !== 'Write' && toolName !== 'Edit') {
      allow();
      return;
    }

    const filePath = (toolInput.file_path || '').replace(/\\/g, '/');

    // Only intercept modifications to CLAIM-LEDGER
    if (!filePath.includes('CLAIM-LEDGER')) {
      allow();
      return;
    }

    // Write uses 'content', Edit uses 'new_string' + 'old_string'
    // For Edit: if old_string contains confounder_status, the field is already in the
    // section being modified — allow the edit (avoids false positives on partial edits)
    const content = toolInput.content || toolInput.new_string || '';
    const oldContent = toolInput.old_string || '';

    // Check for confounder_status field in new content OR existing content being replaced
    if (/confounder_status\s*:/i.test(content) || /confounder_status\s*:/i.test(oldContent)) {
      allow();
      return;
    }

    // Check for NOT_APPLICABLE marker
    if (/confounder\S*\s*[:=]?\s*not.?applicable/i.test(content) || /confounder\S*\s*[:=]?\s*not.?applicable/i.test(oldContent)) {
      allow();
      return;
    }

    // BLOCK: missing confounder harness
    const result = {
      hookSpecificOutput: {
        permissionDecision: 'deny'
      }
    };
    process.stdout.write(JSON.stringify(result));
    process.stderr.write(
      'LAW 9 VIOLATION: ' + toolName + ' to CLAIM-LEDGER blocked. ' +
      'Every claim requires a confounder_status field ' +
      '(RAW | CONDITIONED | MATCHED | ROBUST | NOT_APPLICABLE). ' +
      'Run the confounder harness (raw → conditioned → matched) first, ' +
      'or mark as NOT_APPLICABLE with justification.'
    );
    process.exit(2);
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
