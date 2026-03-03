#!/usr/bin/env bash
#
# SessionStart:startup hook — Check for pending flow state from a previous session.
# Outputs a systemMessage if an approved PRD is found, otherwise exits silently.
#
set -euo pipefail

silent_ok() {
  echo '{ "continue": true, "suppressOutput": true }'
  exit 0
}

SCRIPT="${CLAUDE_PLUGIN_ROOT:-}/skills/shared/scripts/flow-state.sh"
[[ -f "$SCRIPT" ]] || silent_ok

current_phase=$(bash "$SCRIPT" get current_phase 2>/dev/null) || silent_ok
[[ "$current_phase" == "approved" ]] || silent_ok

prd_summary=$(bash "$SCRIPT" get prd_summary 2>/dev/null) || silent_ok
[[ -n "$prd_summary" && "$prd_summary" != "null" ]] || silent_ok

# Extract fields from prd_summary JSON
if command -v jq &>/dev/null; then
  feature_name=$(echo "$prd_summary" | jq -r '.feature_name // "unknown"')
  version=$(echo "$prd_summary" | jq -r '.version // "unknown"')
  branch=$(echo "$prd_summary" | jq -r '.branch // "unknown"')
else
  feature_name="(install jq for details)"
  version=""
  branch=""
fi

msg="A previously approved PRD was found from a prior session."
msg="$msg Feature: $feature_name"
[[ "$version" != "unknown" && -n "$version" ]] && msg="$msg | Version: $version"
[[ "$branch" != "unknown" && -n "$branch" ]] && msg="$msg | Branch: $branch"
msg="$msg. Run /flow:generate-tasks to generate implementation tasks, or /flow:plan to start a new plan."

if command -v jq &>/dev/null; then
  jq -n --arg msg "$msg" '{ "continue": true, "suppressOutput": false, "systemMessage": $msg }'
else
  escaped_msg=$(printf '%s' "$msg" | sed 's/\\/\\\\/g; s/"/\\"/g')
  echo "{ \"continue\": true, \"suppressOutput\": false, \"systemMessage\": \"$escaped_msg\" }"
fi
