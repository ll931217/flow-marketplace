#!/usr/bin/env bash
#
# Stop hook: Block stop until agent explicitly confirms completion.
#
# The stop is allowed only after the transcript contains:
#   FLOW_DONE::<session_id>
#
# Optional env vars:
#   FLOW_VERIFY_MAX   Max blocks before allowing stop (default: 0 = infinite)
#
set -u

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
TRANSCRIPT=$(echo "$INPUT" | jq -r '.transcript_path')

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  SESSION_ID="unknown-session"
fi

# --- helper: allow stop with no blocking ---
allow_stop() {
  echo '{ "continue": true }'
  exit 0
}

# --- skip subagents: they have very short transcripts ---
if [ -f "$TRANSCRIPT" ]; then
  LINE_COUNT=$(wc -l <"$TRANSCRIPT" 2>/dev/null || echo "0")
  if [ "$LINE_COUNT" -lt 20 ]; then
    allow_stop
  fi
fi

# --- shared directory ---
if PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
  COUNTER_DIR="$PROJECT_ROOT/.flow/state"
else
  COUNTER_DIR="${TMPDIR:-/tmp}/flow-marketplace"
fi
mkdir -p "$COUNTER_DIR"

# --- skip if no implementation detected ---
HAS_IMPLEMENTATION=false

# Check 1: Flow state indicates active implementation phase
STATE_FILE="${COUNTER_DIR}/state.json"
if [ ! -f "$STATE_FILE" ]; then
  LEGACY_STATE="${TMPDIR:-/tmp}/flow-marketplace/state.json"
  [ -f "$LEGACY_STATE" ] && STATE_FILE="$LEGACY_STATE"
fi
if [ -f "$STATE_FILE" ]; then
  PHASE=$(jq -r '.current_phase // ""' "$STATE_FILE" 2>/dev/null)
  case "$PHASE" in
  implement | cleanup | generate-tasks) HAS_IMPLEMENTATION=true ;;
  esac
fi

# Check 2: Transcript has file-modifying tool calls
if [ "$HAS_IMPLEMENTATION" = false ] && [ -f "$TRANSCRIPT" ]; then
  if grep -qE '"(Write|Edit|NotebookEdit)"' "$TRANSCRIPT" 2>/dev/null; then
    HAS_IMPLEMENTATION=true
  fi
fi

if [ "$HAS_IMPLEMENTATION" = false ]; then
  allow_stop
fi

# --- counter ---
COUNTER_FILE="${COUNTER_DIR}/verify-counter-${SESSION_ID}"
MAX=${FLOW_VERIFY_MAX:-0}

COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
fi

# --- done signal detection ---
DONE_SIGNAL="FLOW_DONE::${SESSION_ID}"
HAS_DONE_SIGNAL=false
HAS_RECENT_ERRORS=false

# Primary: check last_assistant_message (most reliable)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""')
if [ -n "$LAST_MSG" ] && echo "$LAST_MSG" | grep -Fq "$DONE_SIGNAL" 2>/dev/null; then
  HAS_DONE_SIGNAL=true
fi

# Fallback: check transcript file
if [ "$HAS_DONE_SIGNAL" = false ] && [ -f "$TRANSCRIPT" ]; then
  if tail -400 "$TRANSCRIPT" 2>/dev/null | grep -Fq "$DONE_SIGNAL"; then
    HAS_DONE_SIGNAL=true
  fi

  # Check for recent errors
  if tail -40 "$TRANSCRIPT" 2>/dev/null | grep -qi '"is_error":\s*true'; then
    HAS_RECENT_ERRORS=true
  fi
fi

# --- allow stop if done signal found ---
if [ "$HAS_DONE_SIGNAL" = true ]; then
  rm -f "$COUNTER_FILE"
  allow_stop
fi

# --- increment counter ---
NEXT=$((COUNT + 1))
echo "$NEXT" >"$COUNTER_FILE"

# --- optional escape hatch ---
if [ "$MAX" -gt 0 ] && [ "$NEXT" -ge "$MAX" ]; then
  rm -f "$COUNTER_FILE"
  allow_stop
fi

# --- build block reason ---
if [ "$HAS_RECENT_ERRORS" = true ]; then
  PREAMBLE="Recent tool errors were detected. Resolve them before declaring done."
else
  PREAMBLE="Stop blocked until completion is explicitly confirmed."
fi

if [ "$MAX" -gt 0 ]; then
  LABEL="FLOW_VERIFY (${NEXT}/${MAX})"
else
  LABEL="FLOW_VERIFY (${NEXT})"
fi

if [ "$NEXT" -eq 1 ]; then
  REASON="${LABEL}: ${PREAMBLE}

## Task Completion Verification

Before stopping, verify ALL work is truly complete and emit the done signal:

1. Check TodoWrite tasks — any pending/in-progress items? Continue working.
2. Check Beads issues — run \`bd list --status=open\` if applicable.
3. Check Flow State — run \`flow-state.sh get\` to check current state.
4. Verify implementation — tests passing, build successful, changes committed.

When ALL tasks are complete, include this marker in your response:
\`FLOW_DONE::${SESSION_ID}\`"
else
  REASON="${LABEL}: ${PREAMBLE} Emit \`FLOW_DONE::${SESSION_ID}\` when done."
fi

# --- output block decision ---
jq -n --arg reason "$REASON" \
  '{ hookSpecificOutput: { hookEventName: "Stop", permissionDecision: "deny", permissionDecisionReason: $reason } }'
