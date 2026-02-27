---
name: memory-context
description: Use when needing to inject semantic memory context into the conversation. Called by UserPromptSubmit hook to retrieve user preferences and project knowledge.
---

# Memory Context Skill

This skill retrieves and formats semantic memory context for injection into conversations.

## When to Use

- UserPromptSubmit hook detects action keywords
- Agent needs context about user preferences
- Agent needs context about current project

## Process

### 1. Determine Datasets to Query

Based on the current context:
- Always query `user` dataset for preferences
- Query `{project_name}` dataset for project-specific knowledge
- Optionally query `session` dataset for recent context

### 2. Extract Query Terms

From the user prompt, extract key terms:
- Technology names (React, TypeScript, PostgreSQL)
- Action types (implement, create, refactor)
- Domain terms (authentication, database, API)

### 3. Call MCP Tool

```json
{
  "name": "memory_search",
  "arguments": {
    "query": "<extracted query>",
    "dataset": "user",
    "top_k": 3
  }
}
```

### 4. Format Context

Format the retrieved memories as a system-reminder block:

```markdown
<system-reminder>
## Retrieved Context from Semantic Memory

### User Preferences
- <memory content 1>
- <memory content 2>

### Project Context (<project_name>)
- <memory content 1>
- <memory content 2>
</system-reminder>
```

### 5. Inject into Conversation

The formatted context should be injected as additional context for the agent to consider when planning and executing.

## Example

User prompt: "Implement user authentication with OAuth"

Query terms: "authentication oauth user login"

Retrieved context:
```
<system-reminder>
## Retrieved Context from Semantic Memory

### User Preferences
- Use JWT for token-based authentication
- Prefer OAuth 2.0 for third-party auth
- Always use HTTPS for auth endpoints

### Project Context (flow-marketplace)
- PostgreSQL database available for user storage
- Existing user table with uuid primary key
- Express.js backend with middleware support
</system-reminder>
```

## Fallback

If no relevant memories found:
- Do not inject empty context
- Silently continue without context injection
