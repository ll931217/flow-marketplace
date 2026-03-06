#!/usr/bin/env bash
#
# PreCompact hook: Save flow state before compaction
#
# Outputs a systemMessage with dynamic fingerprint to prevent LiteLLM caching
#
set -u

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

# Generate fingerprint (busts LLM proxy caches like LiteLLM)
NONCE=$(head -c 6 /dev/urandom 2>/dev/null | od -An -tx1 | tr -d ' \n' || date +%s%N)
FINGERPRINT="[precompact session=${SESSION_ID} ts=$(date +%s) nonce=${NONCE}]"

# Output systemMessage with fingerprint-prefixed prompt
jq -n \
  --arg fingerprint "$FINGERPRINT" \
  --arg prompt "Save current flow state before compaction using the flow-state.sh script:

SCRIPT=\"\${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh\"

1. Read current state: bash \"\$SCRIPT\" get
2. If state is empty ({}), check if there is active context to save:
   - If autonomous mode is running or beads issues are active, run: bash \"\$SCRIPT\" init
   - Then set fields as needed with: bash \"\$SCRIPT\" set key=value
3. If state already exists, update it with current context:
   - bash \"\$SCRIPT\" set beads_issue_id=<id_or_null>
   - Preserve current_phase and prd_summary (these are critical for context reset after PRD approval)
4. Read prd_context if it exists:
   - bash \"\$SCRIPT\" prd_context get
   - If empty, check legacy prd-context.json and migrate: bash \"\$SCRIPT\" prd_context set --branch=<branch> --prd_path=<path> --worktree=<bool>
5. Read session data if it exists:
   - bash \"\$SCRIPT\" get session
   - Session data should be preserved in state.json
6. Call /flow:summary to preserve context if autonomous mode is active" \
  '{
    "systemMessage": ($fingerprint + "\n\n" + $prompt)
  }'
