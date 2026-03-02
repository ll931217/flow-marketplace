#!/usr/bin/env bash
# retrieve-context.sh
# Retrieves semantic memory context based on user prompt
# Called by UserPromptSubmit hook when action keywords are detected

set -euo pipefail

# Get the user prompt from the first argument
USER_PROMPT="${1:-}"

# Get the project name from the current directory
PROJECT_NAME=$(basename "$PWD" 2>/dev/null || echo "unknown")

# Exit silently if no prompt provided
if [[ -z "$USER_PROMPT" ]]; then
    echo '{ "continue": true, "suppressOutput": true }'
    exit 0
fi

# Extract key terms from the prompt for searching
# This is a simple extraction - the MCP server will do semantic matching
QUERY_TERMS=$(echo "$USER_PROMPT" | tr '[:upper:]' '[:lower:]' | grep -oE '\b[a-z]{3,}\b' | head -5 | tr '\n' ' ' || true)

# If no meaningful terms extracted, use the first 100 chars
if [[ -z "$QUERY_TERMS" ]]; then
    QUERY_TERMS="${USER_PROMPT:0:100}"
fi

# Build context retrieval instructions as a systemMessage
read -r -d '' SYS_MSG <<MSGEOF || true
## Semantic Memory Context Retrieval

The user prompt contains action keywords. Retrieve relevant context from semantic memory:

### Suggested MCP Tool Calls:

1. Search user preferences:
\`\`\`json
{
  "name": "memory_search",
  "arguments": {
    "query": "${QUERY_TERMS}",
    "dataset": "user",
    "top_k": 3
  }
}
\`\`\`

2. Search project knowledge (${PROJECT_NAME}):
\`\`\`json
{
  "name": "memory_search",
  "arguments": {
    "query": "${QUERY_TERMS}",
    "dataset": "${PROJECT_NAME}",
    "top_k": 3
  }
}
\`\`\`

### Instructions:
- Execute the above MCP tool calls to retrieve context
- Inject retrieved memories as context for planning/implementation
- If no relevant memories found, proceed without additional context
MSGEOF

# Output structured JSON
jq -n --arg msg "$SYS_MSG" '{ continue: true, suppressOutput: true, systemMessage: $msg }'
