#!/usr/bin/env bash
#
# Stop hook: Block stop until agent explicitly confirms completion.
#
# The stop is allowed only after the transcript contains:
#   FLOW_DONE::<session_id>  OR  FLOW_DONE::<nonce>
#
# A fresh nonce is generated per attempt to bust LLM proxy caches (e.g. LiteLLM).
#
# Optional env vars:
#   FLOW_VERIFY_MAX   Max blocks before allowing stop (default: 5)
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
  echo '{ "decision": "approve" }'
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

# --- pause detection (explicit + heuristic) ---
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""')

# Explicit: FLOW_PAUSE::<reason> signal
if [ -n "$LAST_MSG" ]; then
  if echo "$LAST_MSG" | grep -qE 'FLOW_PAUSE::[a-zA-Z0-9_-]+' 2>/dev/null; then
    allow_stop
  fi
fi

# Heuristic: count pause indicator phrases (need 2+ to trigger)
if [ -n "$LAST_MSG" ]; then
  PAUSE_COUNT=0
  LOWER_MSG=$(echo "$LAST_MSG" | tr '[:upper:]' '[:lower:]')
  for pattern in \
    "waiting for you" "waiting on you" "waiting for your" \
    "your confirmation" "your review" "your approval" \
    "ready for you to" "ready for your" \
    "let me know" \
    "paused" "just pausing" "intentionally paused" \
    "not done yet" "not finished yet" \
    "before i commit" "before committing" "before i push" "before pushing" \
    "confirm before" "review before"; do
    if echo "$LOWER_MSG" | grep -Fq "$pattern" 2>/dev/null; then
      PAUSE_COUNT=$((PAUSE_COUNT + 1))
    fi
  done
  if [ "$PAUSE_COUNT" -ge 2 ]; then
    allow_stop
  fi
fi

# --- counter ---
COUNTER_FILE="${COUNTER_DIR}/verify-counter-${SESSION_ID}"
MAX=${FLOW_VERIFY_MAX:-5}

COUNT=0
if [ -f "$COUNTER_FILE" ]; then
  COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
fi

# --- per-attempt nonce (busts LLM proxy caches like LiteLLM) ---
NONCE=$(head -c 6 /dev/urandom 2>/dev/null | od -An -tx1 | tr -d ' \n' || date +%s%N)
NONCE_FILE="${COUNTER_DIR}/verify-nonce-${SESSION_ID}"

# --- done signal detection ---
DONE_SIGNAL="FLOW_DONE::${SESSION_ID}"
HAS_DONE_SIGNAL=false
HAS_RECENT_ERRORS=false

# Primary: check last_assistant_message (most reliable)
# NOTE: LAST_MSG already extracted in pause detection section above
if [ -n "$LAST_MSG" ]; then
  # Accept exact session_id match
  if echo "$LAST_MSG" | grep -Fq "$DONE_SIGNAL" 2>/dev/null; then
    HAS_DONE_SIGNAL=true
  fi
  # Accept previous attempt's nonce
  if [ "$HAS_DONE_SIGNAL" = false ] && [ -f "$NONCE_FILE" ]; then
    PREV_NONCE=$(cat "$NONCE_FILE" 2>/dev/null)
    if [ -n "$PREV_NONCE" ] && echo "$LAST_MSG" | grep -Fq "FLOW_DONE::${PREV_NONCE}" 2>/dev/null; then
      HAS_DONE_SIGNAL=true
    fi
  fi
  # Accept ANY FLOW_DONE:: pattern (agent rarely knows the exact nonce)
  if [ "$HAS_DONE_SIGNAL" = false ]; then
    if echo "$LAST_MSG" | grep -qE 'FLOW_DONE::[a-zA-Z0-9_-]+' 2>/dev/null; then
      HAS_DONE_SIGNAL=true
    fi
  fi
fi

# Fallback: check transcript file
if [ "$HAS_DONE_SIGNAL" = false ] && [ -f "$TRANSCRIPT" ]; then
  if tail -400 "$TRANSCRIPT" 2>/dev/null | grep -Fq "$DONE_SIGNAL"; then
    HAS_DONE_SIGNAL=true
  fi
  # Accept ANY FLOW_DONE:: pattern in transcript
  if [ "$HAS_DONE_SIGNAL" = false ]; then
    if tail -400 "$TRANSCRIPT" 2>/dev/null | grep -qE 'FLOW_DONE::[a-zA-Z0-9_-]+'; then
      HAS_DONE_SIGNAL=true
    fi
  fi

  # Check for recent errors
  if tail -40 "$TRANSCRIPT" 2>/dev/null | grep -qi '"is_error":\s*true'; then
    HAS_RECENT_ERRORS=true
  fi
fi

# Write current nonce for next attempt's validation
echo "$NONCE" >"$NONCE_FILE"

# --- allow stop if done signal found ---
if [ "$HAS_DONE_SIGNAL" = true ]; then
  rm -f "$COUNTER_FILE" "$NONCE_FILE"
  allow_stop
fi

# --- increment counter ---
NEXT=$((COUNT + 1))
echo "$NEXT" >"$COUNTER_FILE"

# --- optional escape hatch ---
if [ "$MAX" -gt 0 ] && [ "$NEXT" -ge "$MAX" ]; then
  rm -f "$COUNTER_FILE" "$NONCE_FILE"
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

# Cache-bust fingerprint: unique per session/attempt to defeat LiteLLM proxy caching
FINGERPRINT="[session=${SESSION_ID} ts=$(date +%s) attempt=${NEXT} nonce=${NONCE}]"

if [ "$NEXT" -eq 1 ]; then
  REASON="${FINGERPRINT} ${LABEL}: ${PREAMBLE}

## Task Completion Verification

Before stopping, verify ALL work is truly complete and emit the done signal:

1. Check TodoWrite tasks — any pending/in-progress items? Continue working.
2. Check Beads issues — run \`bd list --status=open\` if applicable.
3. Check Flow State — run \`flow-state.sh get\` to check current state.
4. Verify implementation — tests passing, build successful, changes committed.

When ALL tasks are complete, include this EXACT marker in your response (copy-paste, do NOT generate your own UUID):
\`FLOW_DONE::${NONCE}\`

If you are **pausing** to wait for user input (confirmation, review, etc.), use:
\`FLOW_PAUSE::reason\` (e.g. \`FLOW_PAUSE::waiting-for-confirmation\`)"
else
  REASON="${FINGERPRINT} ${LABEL}: ${PREAMBLE} Include this EXACT marker: \`FLOW_DONE::${NONCE}\` — or if pausing for user input: \`FLOW_PAUSE::reason\` [nonce=${NONCE}]"
fi

# --- output block decision ---
jq -n --arg reason "$REASON" \
  '{ "decision": "block", "reason": $reason }'
