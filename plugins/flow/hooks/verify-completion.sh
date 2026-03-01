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

# --- skip subagents: they have very short transcripts ---
if [ -f "$TRANSCRIPT" ]; then
  LINE_COUNT=$(wc -l < "$TRANSCRIPT" 2>/dev/null || echo "0")
  if [ "$LINE_COUNT" -lt 20 ]; then
    exit 0
  fi
fi

# --- counter ---
COUNTER_DIR="${TMPDIR:-/tmp}/flow-marketplace"
mkdir -p "$COUNTER_DIR"
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
  exit 0
fi

# --- increment counter ---
NEXT=$((COUNT + 1))
echo "$NEXT" > "$COUNTER_FILE"

# --- optional escape hatch ---
if [ "$MAX" -gt 0 ] && [ "$NEXT" -ge "$MAX" ]; then
  rm -f "$COUNTER_FILE"
  exit 0
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

REASON="${LABEL}: ${PREAMBLE}

## Task Completion Verification

Before stopping, verify ALL work is truly complete and emit the done signal:

### 1. Check TodoWrite Tasks
- Review all todos: are there any pending or in-progress items?
- If todos exist and are not all completed: CONTINUE working

### 2. Check Beads Issues (if applicable)
- Run \`bd list --status=open\` or \`bd list --status=in_progress\` to check for open issues
- If there are open/in-progress issues related to current work: CONTINUE working

### 3. Check Flow State
- Read \${TMPDIR}/flow-marketplace/state.json if it exists
- If autonomous mode is active and phase is not 'completed': CONTINUE working

### 4. Verify Implementation Completeness
- Are all tests passing?
- Is the build successful?
- Are there uncommitted changes that should be committed?

### How to Stop
When ALL tasks are genuinely complete, include this exact marker in your response:

\`\`\`
FLOW_DONE::${SESSION_ID}
\`\`\`

This signals that you have verified everything is complete and are ready to stop."

# --- output block decision ---
jq -n --arg reason "$REASON" '{ decision: "block", reason: $reason }'
