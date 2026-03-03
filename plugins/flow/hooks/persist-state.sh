#!/usr/bin/env bash
set -euo pipefail

json_ok() {
  echo '{ "continue": true, "suppressOutput": true }'
  exit 0
}

# Resolve state directory: project-local .flow/state/ or TMPDIR fallback
if PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  STATE_DIR="$PROJECT_ROOT/.flow/state"
else
  STATE_DIR="${TMPDIR:-/tmp}/flow-marketplace"
fi

# Read from new location, fallback to legacy
STATE_FILE="$STATE_DIR/state.json"
READ_FILE="$STATE_FILE"
if [[ ! -f "$READ_FILE" ]]; then
  LEGACY_FILE="${TMPDIR:-/tmp}/flow-marketplace/state.json"
  [[ -f "$LEGACY_FILE" ]] && READ_FILE="$LEGACY_FILE"
fi

# If state.json doesn't exist or is empty, exit silently
[[ -f "$READ_FILE" ]] || json_ok

content=$(cat "$READ_FILE")
[[ "$content" != "{}" && -n "$content" ]] || json_ok

# Update last_session_exit timestamp using jq (or python fallback)
mkdir -p "$STATE_DIR"
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
