#!/usr/bin/env bash
set -euo pipefail

# Early exit helper — silent success
json_ok() {
  echo '{ "continue": true, "suppressOutput": true }'
  exit 0
}

# --- Git context ---
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || json_ok
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || json_ok
FLOW_DIR="$PROJECT_ROOT/.flow"

# No .flow/ directory → nothing to do
[[ -d "$FLOW_DIR" ]] || json_ok

# No PRD files → nothing to do
shopt -s nullglob
PRD_FILES=("$FLOW_DIR"/prd-*.md)
shopt -u nullglob
[[ ${#PRD_FILES[@]} -gt 0 ]] || json_ok

# --- Worktree detection ---
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
IS_WORKTREE=false
WORKTREE_PATH=""
if [[ "$GIT_DIR" != "$GIT_COMMON_DIR" ]]; then
  IS_WORKTREE=true
  WORKTREE_PATH="$GIT_DIR"
fi

# --- Multi-stage PRD discovery (mirrors prd-discovery.sh algorithm) ---
MATCHED_PRD=""

# Stage 1: Check latest PRD by modification time
LATEST_PRD=$(find "$FLOW_DIR" -name "prd-*.md" -type f -printf '%T@ %p\n' 2>/dev/null \
  | sort -n | tail -1 | cut -d' ' -f2-)

if [[ -n "$LATEST_PRD" ]]; then
  prd_branch=$(grep -A5 "^git:" "$LATEST_PRD" | grep -E "^\s+branch:" | awk '{print $2}' | tr -d '"' || true)
  prd_wt_path=$(grep -A5 "^worktree:" "$LATEST_PRD" | head -6 | grep -E "^  path:" | awk '{print $2}' | tr -d '"' || true)

  if [[ "$prd_branch" == "$BRANCH" ]]; then
    if [[ "$IS_WORKTREE" == false && -z "$prd_wt_path" ]] \
    || [[ "$IS_WORKTREE" == true && "$prd_wt_path" == "$WORKTREE_PATH" ]]; then
      MATCHED_PRD="$LATEST_PRD"
    fi
  fi
fi

# Stage 2: Fallback — search all PRDs
if [[ -z "$MATCHED_PRD" ]]; then
  for prd in "${PRD_FILES[@]}"; do
    prd_branch=$(grep -A5 "^git:" "$prd" | grep -E "^\s+branch:" | awk '{print $2}' | tr -d '"' || true)
    prd_wt_path=$(grep -A5 "^worktree:" "$prd" | head -6 | grep -E "^  path:" | awk '{print $2}' | tr -d '"' || true)

    if [[ "$prd_branch" == "$BRANCH" ]]; then
      if [[ "$IS_WORKTREE" == false && -z "$prd_wt_path" ]] \
      || [[ "$IS_WORKTREE" == true && "$prd_wt_path" == "$WORKTREE_PATH" ]]; then
        MATCHED_PRD="$prd"
        break
      fi
    fi
  done
fi

# No match → exit silently (don't overwrite existing prd-context.json)
[[ -n "$MATCHED_PRD" ]] || json_ok

# --- Write prd-context.json ---
OUT_DIR="$PROJECT_ROOT/.flow/state"
mkdir -p "$OUT_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v jq &>/dev/null; then
  jq -n \
    --arg branch "$BRANCH" \
    --arg prd_path "$MATCHED_PRD" \
    --argjson worktree "$IS_WORKTREE" \
    --arg timestamp "$TIMESTAMP" \
    '{branch: $branch, prd_path: $prd_path, worktree: $worktree, timestamp: $timestamp}' \
    > "$OUT_DIR/prd-context.json"
else
  cat > "$OUT_DIR/prd-context.json" <<EOJSON
{"branch":"$BRANCH","prd_path":"$MATCHED_PRD","worktree":$IS_WORKTREE,"timestamp":"$TIMESTAMP"}
EOJSON
fi

json_ok
