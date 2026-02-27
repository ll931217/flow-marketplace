---
name: session-summary
description: Use at session end to summarize implementation and capture learnings. Called by Stop hook to analyze session and offer to save decisions to memory.
---

# Session Summary Skill

This skill analyzes the session at completion time and offers to capture learnings to semantic memory.

## When to Use

- Stop hook triggers at session end
- After completing significant implementation work
- When user explicitly requests summary

## Process

### 1. Analyze Session Content

Review the session for:
- Files created or modified
- Key decisions made (technology choices, patterns)
- Problems solved
- User corrections or feedback
- Conventions established

### 2. Extract Learnings

Identify potential learnings:
- Architecture decisions
- Pattern choices
- Library selections
- Configuration preferences
- Workflow improvements

### 3. Generate Summary

```markdown
## Session Summary

### Implementation Completed
- Added memory CRUD tools to MCP server
- Created hooks.json with UserPromptSubmit hook
- Implemented retrieve-context.sh script
- Created 6 commands for memory management
- Created 4 skills for context injection and preference capture

### Key Decisions Made
1. Using PostgreSQL with pgvector for semantic storage
2. 15s timeout for context retrieval hooks
3. Keyword-based trigger for hook activation
4. Separate datasets for user vs project knowledge

### Patterns Used
- Repository pattern for database access
- Tool-based architecture for MCP operations
- Skill-based prompt templates for user interaction

### Files Modified
- src/database.ts - Added memories table and CRUD methods
- src/tools/memory.ts - New memory tools module
- src/index.ts - Added memory tool definitions
- commands/*.md - 6 new command files
- skills/*/SKILL.md - 4 new skill files
```

### 4. Prompt for Capture

```
### Capture Learnings to Memory?

I've identified the following learnings that might be worth saving:

1. [user] "Use 15s timeout for MCP hook operations"
2. [flow-marketplace] "Semantic memory uses separate datasets for user vs project"
3. [flow-marketplace] "Memory tools follow repository pattern"

Select which to save (1,2,3/all/none):
```

### 5. Save Selected Learnings

For each selected learning, call `memory_add`:

```json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "user",
    "content": "Use 15s timeout for MCP hook operations",
    "tags": ["hooks", "performance"]
  }
}
```

### 6. Confirmation

```
Saved 3 learnings to memory.

- 1 added to user preferences
- 2 added to flow-marketplace project knowledge

This knowledge will be available in future sessions.
```

## Heuristics for Learnings

### User-Level Learnings (dataset: "user")

Save to user dataset when:
- User expressed a preference
- User corrected the agent's approach
- Pattern applies across projects

Examples:
- "Always run tests before committing"
- "Prefer functional components over class components"
- "Use descriptive variable names"

### Project-Level Learnings (dataset: "{project_name}")

Save to project dataset when:
- Decision is specific to this project
- Architecture choice was made
- Convention was established

Examples:
- "This project uses PostgreSQL with pgvector"
- "Plugin structure: commands/skills/hooks"
- "MCP tools follow repository pattern"

### Session-Level Learnings (dataset: "session")

Save to session dataset when:
- Temporary context for current task
- Recent decisions that might be relevant soon
- Context that will be cleared

Examples:
- "Currently implementing authentication"
- "Decided to use JWT over sessions"

## Integration with Stop Hook

The Stop hook should invoke this skill with:

```json
{
  "type": "prompt",
  "prompt": "Invoke the session-summary skill to analyze the session and offer to capture learnings to semantic memory.",
  "timeout": 30
}
```
