#!/usr/bin/env bash
#
# PreToolUse hook: Auto-bump patch version for plugins with staged changes.
#
# Triggers on Bash tool calls containing "git commit". Before the commit
# executes, checks staged files against each plugin's source directory
# in marketplace.json. Bumps patch version and stages the updated files
# so they're included in the commit.
#
set -u

INPUT=$(cat)

# Only act on Bash tool calls containing "git commit"
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""')
[ "$TOOL" = "Bash" ] || { echo '{}'; exit 0; }

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
echo "$COMMAND" | grep -qE '\bgit\s+commit\b' || { echo '{}'; exit 0; }

# Skip amend commits — those shouldn't double-bump
echo "$COMMAND" | grep -q '\-\-amend' && { echo '{}'; exit 0; }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo '{}'; exit 0; }
MARKETPLACE="${REPO_ROOT}/.claude-plugin/marketplace.json"
[ -f "$MARKETPLACE" ] || { echo '{}'; exit 0; }

# Get staged files (exclude marketplace.json and package.json to avoid loops)
STAGED=$(git diff --cached --name-only 2>/dev/null \
  | grep -v '.claude-plugin/marketplace.json' \
  | grep -v 'package\.json$' || true)
[ -z "$STAGED" ] && { echo '{}'; exit 0; }

PLUGIN_COUNT=$(jq '.plugins | length' "$MARKETPLACE")
BUMPED=""

for i in $(seq 0 $((PLUGIN_COUNT - 1))); do
  NAME=$(jq -r ".plugins[$i].name" "$MARKETPLACE")
  SOURCE=$(jq -r ".plugins[$i].source" "$MARKETPLACE")
  VERSION=$(jq -r ".plugins[$i].version" "$MARKETPLACE")

  SOURCE_DIR="${SOURCE#./}"

  if echo "$STAGED" | grep -q "^${SOURCE_DIR}/"; then
    MAJOR=$(echo "$VERSION" | cut -d. -f1)
    MINOR=$(echo "$VERSION" | cut -d. -f2)
    PATCH=$(echo "$VERSION" | cut -d. -f3)
    NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"

    jq --argjson idx "$i" --arg ver "$NEW_VERSION" \
      '.plugins[$idx].version = $ver' "$MARKETPLACE" > "${MARKETPLACE}.tmp" \
      && mv "${MARKETPLACE}.tmp" "$MARKETPLACE"

    PKG="${REPO_ROOT}/${SOURCE_DIR}/package.json"
    if [ -f "$PKG" ]; then
      jq --arg ver "$NEW_VERSION" '.version = $ver' "$PKG" > "${PKG}.tmp" \
        && mv "${PKG}.tmp" "$PKG"
      git add "$PKG"
    fi

    git add "$MARKETPLACE"
    BUMPED="${BUMPED}  ${NAME}: ${VERSION} -> ${NEW_VERSION}\n"
  fi
done

if [ -n "$BUMPED" ]; then
  echo -e "Auto-bumped plugin versions:\n${BUMPED}" >&2
fi

echo '{"decision": "approve"}'
