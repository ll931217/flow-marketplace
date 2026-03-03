#!/usr/bin/env bash
#
# SessionStart hook: Export CLAUDE_PLUGIN_ROOT to CLAUDE_ENV_FILE
# so that skill scripts can reference plugin-relative paths in Bash tool calls.
#
set -euo pipefail

if [[ -n "${CLAUDE_ENV_FILE:-}" && -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  echo "export FLOW_PLUGIN_ROOT=\"${CLAUDE_PLUGIN_ROOT}\"" >> "$CLAUDE_ENV_FILE"
fi

echo '{ "continue": true, "suppressOutput": true }'
