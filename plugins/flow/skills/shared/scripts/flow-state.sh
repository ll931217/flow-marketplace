#!/usr/bin/env bash
#
# flow-state.sh - Manage $TMPDIR/flow-marketplace/state.json and session.json
#
# Usage:
#   flow-state.sh init [--mode=manual|autonomous]
#   flow-state.sh get [field]
#   flow-state.sh set key=value [key=value ...]
#   flow-state.sh phase <phase-name>
#   flow-state.sh reset
#   flow-state.sh session init [--session-id=<id>]
#   flow-state.sh session clear
#
set -euo pipefail

STATE_DIR="${TMPDIR:-/tmp}/flow-marketplace"
STATE_FILE="$STATE_DIR/state.json"
SESSION_FILE="$STATE_DIR/session.json"

ensure_dir() {
  mkdir -p "$STATE_DIR"
}

timestamp() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# --- init: Create directory and initial state.json ---
cmd_init() {
  local mode="manual"
  for arg in "$@"; do
    case "$arg" in
      --mode=*) mode="${arg#--mode=}" ;;
    esac
  done

  ensure_dir
  cat > "$STATE_FILE" <<EOF
{
  "mode": "$mode",
  "beads_issue_id": null,
  "timestamp": "$(timestamp)",
  "prd_path": null,
  "current_phase": "plan",
  "prd_summary": null,
  "prd_context": null
}
EOF
  echo "State initialized: mode=$mode"
}

# --- get: Read state or a specific field ---
cmd_get() {
  if [[ ! -f "$STATE_FILE" ]]; then
    echo '{}'
    return 0
  fi

  local field="${1:-}"
  if [[ -z "$field" ]]; then
    cat "$STATE_FILE"
  else
    if command -v jq &>/dev/null; then
      jq -r ".$field // empty" "$STATE_FILE"
    elif command -v python3 &>/dev/null; then
      python3 -c "
import json, sys
state = json.load(open('$STATE_FILE'))
keys = '$field'.split('.')
val = state
for k in keys:
    if isinstance(val, dict) and k in val:
        val = val[k]
    else:
        sys.exit(0)
print(val if not isinstance(val, (dict, list)) else json.dumps(val))
"
    else
      echo "Error: jq or python3 required" >&2
      return 1
    fi
  fi
}

# --- set: Update one or more fields ---
cmd_set() {
  ensure_dir

  # If state.json doesn't exist, create minimal one first
  if [[ ! -f "$STATE_FILE" ]]; then
    echo '{}' > "$STATE_FILE"
  fi

  if command -v jq &>/dev/null; then
    local tmp
    tmp=$(mktemp)
    cp "$STATE_FILE" "$tmp"

    for pair in "$@"; do
      local key="${pair%%=*}"
      local value="${pair#*=}"

      # Detect JSON values (objects, arrays, null, true, false, numbers)
      if [[ "$value" =~ ^(\{|\[|null|true|false|[0-9]) ]]; then
        jq --argjson v "$value" ".$key = \$v" "$tmp" > "${tmp}.new" && mv "${tmp}.new" "$tmp"
      else
        jq --arg v "$value" ".$key = \$v" "$tmp" > "${tmp}.new" && mv "${tmp}.new" "$tmp"
      fi
    done

    # Always update timestamp
    jq --arg ts "$(timestamp)" '.timestamp = $ts' "$tmp" > "$STATE_FILE"
    rm -f "$tmp" "${tmp}.new"

  elif command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
from datetime import datetime, timezone

state = json.load(open('$STATE_FILE'))

for pair in sys.argv[1:]:
    key, _, value = pair.partition('=')
    try:
        value = json.loads(value)
    except (json.JSONDecodeError, ValueError):
        pass
    state[key] = value

state['timestamp'] = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
" "$@"
  else
    echo "Error: jq or python3 required" >&2
    return 1
  fi

  echo "State updated: $*"
}

# --- phase: Shortcut for setting current_phase ---
cmd_phase() {
  local phase="${1:?Usage: flow-state.sh phase <phase-name>}"
  cmd_set "current_phase=$phase"
}

# --- reset: Clear state.json to empty object (keeps directory) ---
cmd_reset() {
  ensure_dir
  cat > "$STATE_FILE" <<EOF
{}
EOF
  echo "State reset"
}

# --- session: Manage session.json for autonomous mode ---
cmd_session() {
  local subcmd="${1:?Usage: flow-state.sh session init|clear}"
  shift

  case "$subcmd" in
    init)
      local session_id
      session_id="maestro-$(date +%s)"
      for arg in "$@"; do
        case "$arg" in
          --session-id=*) session_id="${arg#--session-id=}" ;;
        esac
      done

      ensure_dir
      cat > "$SESSION_FILE" <<EOF
{
  "session_id": "$session_id",
  "start_time": "$(timestamp)",
  "decisions_log": [],
  "checkpoints": [],
  "current_phase": "plan"
}
EOF
      echo "Session initialized: $session_id"
      ;;

    clear)
      if [[ -f "$SESSION_FILE" ]]; then
        rm -f "$SESSION_FILE"
        echo "Session cleared"
      else
        echo "No session file to clear"
      fi
      ;;

    *)
      echo "Unknown session subcommand: $subcmd" >&2
      echo "Usage: flow-state.sh session init|clear" >&2
      return 1
      ;;
  esac
}

# --- main dispatch ---
cmd="${1:?Usage: flow-state.sh <init|get|set|phase|reset|session> [args]}"
shift

case "$cmd" in
  init)    cmd_init "$@" ;;
  get)     cmd_get "$@" ;;
  set)     cmd_set "$@" ;;
  phase)   cmd_phase "$@" ;;
  reset)   cmd_reset "$@" ;;
  session) cmd_session "$@" ;;
  *)
    echo "Unknown command: $cmd" >&2
    echo "Usage: flow-state.sh <init|get|set|phase|reset|session> [args]" >&2
    exit 1
    ;;
esac
