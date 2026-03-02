#!/usr/bin/env bash
set -euo pipefail

json_ok() {
  echo '{ "continue": true, "suppressOutput": true }'
  exit 0
}

STATE_DIR="${TMPDIR:-/tmp}/flow-marketplace"
STATE_FILE="$STATE_DIR/state.json"

# If state.json doesn't exist or is empty, exit silently
[[ -f "$STATE_FILE" ]] || json_ok

content=$(cat "$STATE_FILE")
[[ "$content" != "{}" && -n "$content" ]] || json_ok

# Update last_session_exit timestamp using jq (or python fallback)
if command -v jq &>/dev/null; then
  echo "$content" | jq --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '.last_session_exit = $ts' > "$STATE_FILE"
elif command -v python3 &>/dev/null; then
  python3 -c "
import json, sys
from datetime import datetime, timezone
state = json.loads(sys.stdin.read())
state['last_session_exit'] = datetime.now(timezone.utc).isoformat()
print(json.dumps(state, indent=2))
" <<< "$content" > "$STATE_FILE"
fi

json_ok
