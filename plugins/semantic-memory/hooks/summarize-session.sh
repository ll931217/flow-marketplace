#!/usr/bin/env bash
# summarize-session.sh
# Summarizes the session and extracts learnings for memory capture
# Called by Stop hook at session end

set -euo pipefail

# Get project name
PROJECT_NAME=$(basename "$PWD" 2>/dev/null || echo "unknown")

# Session state directory
STATE_DIR="${TMPDIR:-/tmp}/semantic-memory"
STATE_FILE="$STATE_DIR/session-summary.json"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# Get git status if available
GIT_CHANGES=""
if git rev-parse --git-dir > /dev/null 2>&1; then
    GIT_CHANGES=$(git status --short 2>/dev/null | head -20 || echo "")
fi

# Output summary prompt for the Stop hook
cat <<EOF
<system-reminder>
## Session Summary Analysis

Project: ${PROJECT_NAME}

### Git Changes Detected:
\`\`\`
${GIT_CHANGES:-No git changes detected}
\`\`\`

### Instructions for Learning Capture:

1. **Review Session**: Analyze what was implemented, changed, or discussed

2. **Identify Learnings**:
   - User preferences expressed (save to 'user' dataset)
   - Project decisions made (save to '${PROJECT_NAME}' dataset)
   - Patterns or conventions established

3. **Prompt User**: If significant learnings found, ask:
   "Would you like to save these learnings to semantic memory?"

4. **Save Learnings**: Use memory_add MCP tool for approved items

### Example Learnings to Capture:

For user preferences:
- "Always use TypeScript strict mode"
- "Prefer functional components over class components"

For project knowledge:
- "This project uses PostgreSQL with pgvector"
- "Plugin structure follows commands/skills/hooks pattern"

### MCP Tool Example:
\`\`\`json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "user",
    "content": "Learning content here",
    "tags": ["category"]
  }
}
\`\`\`
</system-reminder>
EOF

exit 0
