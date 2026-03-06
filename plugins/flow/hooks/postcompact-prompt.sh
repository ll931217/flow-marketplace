#!/usr/bin/env bash
#
# SessionStart:compact hook: Restore flow state after compaction
#
# Outputs a systemMessage with dynamic fingerprint to prevent LiteLLM caching
#
set -u

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Generate fingerprint (busts LLM proxy caches like LiteLLM)
NONCE=$(head -c 6 /dev/urandom 2>/dev/null | od -An -tx1 | tr -d ' \n' || date +%s%N)
FINGERPRINT="[postcompact session=${SESSION_ID} ts=$(date +%s) nonce=${NONCE}]"

# Output systemMessage with fingerprint-prefixed prompt
jq -n \
  --arg fingerprint "$FINGERPRINT" \
  --arg prompt "Restore flow state after compaction using the flow-state.sh script:

SCRIPT=\"\${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh\"

1. Read state: bash \"\$SCRIPT\" get
2. Check current_phase: bash \"\$SCRIPT\" get current_phase
3. If current_phase == 'approved':
   - Read prd_summary: bash \"\$SCRIPT\" get prd_summary
   - Display PRD approval summary with feature_name, version, branch, requirements_count, prd_path
   - Check mode: bash \"\$SCRIPT\" get mode
   - If mode == 'autonomous': Auto-invoke /flow:generate-tasks to continue autonomous execution
   - If mode == 'manual': Suggest: \"Run /flow:generate-tasks to create implementation tasks from the approved PRD.\"
4. If mode == 'autonomous' (non-approved phase):
   - Notify user: \"Autonomous session was interrupted by compaction. Session restored from checkpoint.\"
   - Suggest: \"Run /flow:summary for full context refresh\"
5. Check beads_issue_id: bash \"\$SCRIPT\" get beads_issue_id
   - If set: Notify user: \"Beads issue tracking preserved. Issue ID: {beads_issue_id}\"
6. Check team_state: bash \"\$SCRIPT\" get team_state
   - If team_state.active_team is set:
     - Notify user: \"Active team detected: {active_team} for {current_group}\"
     - Check if team is still alive via TaskList
     - If alive: Resume team monitoring
     - If dead: Run bash \"\$SCRIPT\" team clear to clean up stale state
7. Check session: bash \"\$SCRIPT\" get session
   - If session exists: Notify user: \"Session state preserved: {session_id}\"
8. Continue workflow based on restored state" \
  '{
    "systemMessage": ($fingerprint + "\n\n" + $prompt)
  }'
