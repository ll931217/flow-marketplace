#!/usr/bin/env bash
#
# flow-state.sh - Manage .flow/state/state.json and session.json
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

# Resolve state directory: project-local .flow/state/ or TMPDIR fallback
if PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  STATE_DIR="$PROJECT_ROOT/.flow/state"
else
  STATE_DIR="${TMPDIR:-/tmp}/flow-marketplace"
fi
LEGACY_DIR="${TMPDIR:-/tmp}/flow-marketplace"
STATE_FILE="$STATE_DIR/state.json"
SESSION_FILE="$STATE_DIR/session.json"

ensure_dir() {
  mkdir -p "$STATE_DIR"
}

# Read-fallback: check new location first, then legacy TMPDIR
resolve_state_file() {
  local filename="$1"
  if [[ -f "$STATE_DIR/$filename" ]]; then
    echo "$STATE_DIR/$filename"
  elif [[ -f "$LEGACY_DIR/$filename" ]]; then
    echo "$LEGACY_DIR/$filename"
  else
    echo "$STATE_DIR/$filename"
  fi
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
  local effective_file
  effective_file=$(resolve_state_file "state.json")
  if [[ ! -f "$effective_file" ]]; then
    echo '{}'
    return 0
  fi

  local field="${1:-}"
  if [[ -z "$field" ]]; then
    cat "$effective_file"
  else
    if command -v jq &>/dev/null; then
      jq -r ".$field // empty" "$effective_file"
    elif command -v python3 &>/dev/null; then
      python3 -c "
import json, sys
state = json.load(open('$effective_file'))
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

  # Read from resolved location (new or legacy), always write to new
  local effective_file
  effective_file=$(resolve_state_file "state.json")
  if [[ ! -f "$effective_file" ]]; then
    echo '{}' > "$STATE_FILE"
    effective_file="$STATE_FILE"
  elif [[ "$effective_file" != "$STATE_FILE" ]]; then
    cp "$effective_file" "$STATE_FILE"
    effective_file="$STATE_FILE"
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
  # Clean legacy state
  [[ -f "$LEGACY_DIR/state.json" ]] && rm -f "$LEGACY_DIR/state.json"
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
      rm -f "$SESSION_FILE"
      # Clean legacy session
      [[ -f "$LEGACY_DIR/session.json" ]] && rm -f "$LEGACY_DIR/session.json"
      echo "Session cleared"
      ;;

    *)
      echo "Unknown session subcommand: $subcmd" >&2
      echo "Usage: flow-state.sh session init|clear" >&2
      return 1
      ;;
  esac
}

# --- team: Manage team_state for agent-teams coordination ---
cmd_team() {
  local subcmd="${1:?Usage: flow-state.sh team init|map|complete|clear}"
  shift

  case "$subcmd" in
    init)
      local team_name="${1:?Usage: flow-state.sh team init <team-name> <group-id>}"
      local group_id="${2:?Usage: flow-state.sh team init <team-name> <group-id>}"
      cmd_set "team_state={\"active_team\":\"$team_name\",\"current_group\":\"$group_id\",\"groups_completed\":[],\"team_tasks\":{},\"review_team\":null}"
      echo "Team state initialized: $team_name ($group_id)"
      ;;

    map)
      local beads_id="${1:?Usage: flow-state.sh team map <beads-id> <task-id>}"
      local task_id="${2:?Usage: flow-state.sh team map <beads-id> <task-id>}"
      ensure_dir
      local effective_file
      effective_file=$(resolve_state_file "state.json")
      if [[ ! -f "$effective_file" ]]; then
        echo "Error: no state file" >&2
        return 1
      fi
      if command -v jq &>/dev/null; then
        local tmp
        tmp=$(mktemp)
        jq --arg bid "$beads_id" --arg tid "$task_id" '.team_state.team_tasks[$bid] = $tid' "$effective_file" > "$tmp" && mv "$tmp" "$STATE_FILE"
      elif command -v python3 &>/dev/null; then
        python3 -c "
import json
state = json.load(open('$effective_file'))
if 'team_state' not in state: state['team_state'] = {'team_tasks': {}}
if 'team_tasks' not in state['team_state']: state['team_state']['team_tasks'] = {}
state['team_state']['team_tasks']['$beads_id'] = '$task_id'
with open('$STATE_FILE', 'w') as f: json.dump(state, f, indent=2)
"
      fi
      echo "Mapped $beads_id -> $task_id"
      ;;

    complete)
      ensure_dir
      local effective_file
      effective_file=$(resolve_state_file "state.json")
      if [[ ! -f "$effective_file" ]]; then
        echo "Error: no state file" >&2
        return 1
      fi
      if command -v jq &>/dev/null; then
        local tmp
        tmp=$(mktemp)
        jq '.team_state.groups_completed += [.team_state.current_group] | .team_state.active_team = null | .team_state.current_group = null | .team_state.team_tasks = {}' "$effective_file" > "$tmp" && mv "$tmp" "$STATE_FILE"
      elif command -v python3 &>/dev/null; then
        python3 -c "
import json
state = json.load(open('$effective_file'))
ts = state.get('team_state', {})
completed = ts.get('groups_completed', [])
completed.append(ts.get('current_group'))
ts['groups_completed'] = completed
ts['active_team'] = None
ts['current_group'] = None
ts['team_tasks'] = {}
state['team_state'] = ts
with open('$STATE_FILE', 'w') as f: json.dump(state, f, indent=2)
"
      fi
      echo "Team group completed"
      ;;

    clear)
      cmd_set "team_state=null"
      echo "Team state cleared"
      ;;

    *)
      echo "Unknown team subcommand: $subcmd" >&2
      echo "Usage: flow-state.sh team init|map|complete|clear" >&2
      return 1
      ;;
  esac
}

# --- main dispatch ---
cmd="${1:?Usage: flow-state.sh <init|get|set|phase|reset|session|team> [args]}"
shift

case "$cmd" in
  init)    cmd_init "$@" ;;
  get)     cmd_get "$@" ;;
  set)     cmd_set "$@" ;;
  phase)   cmd_phase "$@" ;;
  reset)   cmd_reset "$@" ;;
  session) cmd_session "$@" ;;
  team)    cmd_team "$@" ;;
  *)
    echo "Unknown command: $cmd" >&2
    echo "Usage: flow-state.sh <init|get|set|phase|reset|session|team> [args]" >&2
    exit 1
    ;;
esac
