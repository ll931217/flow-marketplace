# Subagent Type Detection

## Overview

This reference details how to determine the most appropriate subagent type for each epic and sub-task using pattern matching against the subagent taxonomy.

## Detection Process

### Step 1: Analyze Task Description

For each task, extract:
- Keywords and patterns from the title and description
- Primary technical domain (frontend, backend, data, infrastructure, etc.)
- Language-specific requirements (Python, TypeScript, SQL, Go, etc.)
- Domain-specific keywords (auth, testing, deployment, monitoring, etc.)

### Step 2: Match to Subagent Type

1. Consult `.claude/subagent-types.yaml` taxonomy
2. Find best-matching task category based on pattern matching
3. Use priority order from taxonomy (security > testing > frontend > etc.)
4. Assign primary subagent type
5. Identify fallback subagents if needed

### Step 3: Skill Detection

Check the task description and category against `skill_mappings` in `.claude/subagent-types.yaml`.

**Available Skills and Trigger Patterns:**

| Skill | Triggers |
|-------|----------|
| `frontend-design` | UI components, styling, layout, visual design |
| `mcp-builder` | External API integrations, MCP server creation |
| `skill-creator` | Custom skill definition requests |
| `webapp-testing` | Browser testing, E2E testing, UI verification |
| `document-skills` | API docs, user guides, technical documentation |

Multiple skills can be assigned to a single task.

### Step 4: Store in Issue Metadata

Add the following fields to each beads issue:
- `subagent_type` - Primary subagent type
- `fallback_agents` - Array of alternative agents
- `applicable_skills` - Array of detected skills (if any)
- Skill-specific context for later use during implementation

## Skill Assignment Examples

| Task Description | Category | Skills Assigned |
|-----------------|----------|-----------------|
| "Create responsive UI for dashboard" | frontend | `frontend-design`, `webapp-testing` |
| "Build MCP server for GitHub integration" | backend | `mcp-builder` |
| "Generate API documentation from endpoints" | documentation | `document-skills` |
| "Add E2E tests for checkout flow" | testing | `webapp-testing` |
| "Create custom skill for code review" | ai | `skill-creator` |

## Beads Metadata Format

### Storage with `bd create`

```bash
bd create \
  --title "Implement React login component" \
  --description "..." \
  --metadata "subagent_type=frontend-developer" \
  --metadata "fallback_agents=react-pro,typescript-pro" \
  --metadata "applicable_skills=frontend-design,webapp-testing"
```

### Storage with `bd update`

```bash
bd update <issue-id> \
  --metadata "subagent_type=backend-architect" \
  --metadata "fallback_agents=api-documenter" \
  --metadata "applicable_skills="
```

## Issue Description Agent Assignment Block

Include in every task description:

```markdown
### Agent Assignment
- **Primary Subagent:** `frontend-developer`
- **Fallback Agents:** `react-pro`, `typescript-pro`
- **Applicable Skills:** `frontend-design`, `webapp-testing`
```

## Auto-Detection Fallback

When automatic detection fails:

1. Use `general-purpose` as the default subagent type
2. Continue with task creation (do not block on detection failure)
3. Log detection failure for review
4. Manual agent selection remains available during implementation

## Reference

The full subagent taxonomy is defined in `.claude/subagent-types.yaml`. Consult this file for:
- Complete list of available subagent types
- Pattern matching rules per category
- Priority ordering for type resolution
- Skill mapping definitions
