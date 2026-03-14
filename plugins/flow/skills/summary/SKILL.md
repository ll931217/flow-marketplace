---
name: summary
description: Display current feature implementation summary. Shows PRD status, task progress, open tasks by epic, and what's left to do. Use when you need to check status, see progress, view open tasks, or review what's remaining. This skill should be invoked to check implementation progress at any point in the flow workflow.
---

# Summary

Display a concise summary of current feature implementation progress.

## Quick Reference

**Usage:** `/flow:summary`

**What this does:**
- Auto-discovers PRD based on current git context (branch/worktree)
- Displays PRD metadata (name, version, status, branch)
- Shows progress tracking (X/Y tasks completed)
- Lists open tasks grouped by epic
- Shows what's left to do

**Multi-Worktree:** In main directory, shows summaries for ALL related worktrees.

**Task Source:**
- With beads (`bd`): Uses `bd` commands for full status tracking
- Without beads: Falls back to TodoWrite for basic status

DO NOT suggest the user to use `bd` command directly — this is reserved for AI agents.

**Full workflow:** plan → generate-tasks → implement → cleanup

## PRD Discovery

Auto-discover PRD matching current git context using the shared PRD discovery protocol.

See [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md) for:
- Multi-stage discovery algorithm (latest PRD → context validation → fallback search)
- Git context detection (branch, worktree, commit info)
- Iteration mode detection
- Frontmatter schema for git-related fields

### Discovery Steps

1. **Detect current git context:**
   - Current branch name
   - Worktree detection (using `git rev-parse --git-dir` vs `--git-common-dir`)
   - Worktree name and path (if in worktree)

2. **Find matching PRD:**
   - Search `/.flow/prd-*.md` for PRD matching current context
   - Match criteria: branch name, worktree name, worktree path

3. **Display PRD metadata:**
   - Feature name
   - Version
   - Status (draft, approved, implementing, implemented)
   - Branch
   - Requirements count
   - Last updated timestamp

## Task Progress Tracking

### With Beads (Primary)

When beads (`bd`) is installed, use it for comprehensive task tracking:

```bash
# Read task status
bd list --all --format json

# Filter by PRD-related issues
bd list --filter 'prd' --format json

# Count by status
bd list --status=open | grep -c 'beads-' || echo 0
bd list --status=in_progress | grep -c 'beads-' || echo 0
bd list --status=closed | grep -c 'beads-' || echo 0
```

**Read beads from PRD frontmatter:**
```yaml
beads:
  related_issues: ["FLOW-123", "FLOW-124", "FLOW-125"]
```

**Display format:**
```
Task Progress:
  Total: 5
  Completed: 2 (FLOW-123, FLOW-124)
  In Progress: 1 (FLOW-125)
  Open: 2 (FLOW-126, FLOW-127)
```

### Without Beads (Fallback)

When beads is not available, use TodoWrite for basic tracking:

```bash
# From flow state
STATE=$(bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" get 2>/dev/null)
CURRENT_PHASE=$(echo "$STATE" | grep 'current_phase' | cut -d= -f2 | tr -d ' ')

# Phase-based inference
case "$CURRENT_PHASE" in
  plan) STATUS="PRD generation" ;;
  approved) STATUS="Tasks not generated" ;;
  generate-tasks) STATUS="Task generation in progress" ;;
  implementing) STATUS="Implementation in progress" ;;
  review) STATUS="Code review in progress" ;;
  cleanup) STATUS="Cleanup in progress" ;;
  *) STATUS="No active flow" ;;
esac
```

**Display format:**
```
Status: Implementation in progress
  Note: Beads not available for detailed task tracking
```

## Open Tasks Display

### With Beads

Group open tasks by epic and display:

```bash
# Get open tasks with epic grouping
bd list --status=open --format json | jq -r '.[] | select(.epic) | "\(.epic): \(.title) [id: \(.id)]"'
```

**Display format:**
```
Open Tasks (2):
  Epic: Core Architecture
    [FLOW-126] Implement database schema
    [FLOW-127] Setup API routes

  Epic: Authentication
    [FLOW-128] Add OAuth integration
```

### Without Beads

Display generic message:

```
Open Tasks:
  Note: Run `/flow:generate-tasks` to create detailed task list
  Current phase: implementing
```

## What's Left To Do

Display next steps based on current phase:

```bash
# Determine next step based on phase
case "$CURRENT_PHASE" in
  plan) NEXT="Run /flow:plan to create PRD" ;;
  approved) NEXT="Run /flow:generate-tasks to create tasks" ;;
  generate-tasks) NEXT="Run /flow:implement to start implementation" ;;
  implementing)
    if [ "$OPEN_TASKS" -gt 0 ]; then
      NEXT="Continue implementation - $(OPEN_TASKS) tasks remaining"
    else
      NEXT="Run /flow:cleanup to finalize"
    fi
    ;;
  review) NEXT="Run /flow:cleanup after review complete" ;;
  cleanup) NEXT="Feature complete!" ;;
  *) NEXT="Run /flow:plan to start new feature" ;;
esac
```

## Multi-Worktree Support

When in main directory (not a worktree), show summaries for all related worktrees:

```bash
# Find all worktrees related to current feature
git worktree list --porcelain | grep -E "feature/|bugfix/|hotfix/" | while read worktree_path; do
  worktree_name=$(basename "$worktree_path")
  worktree_branch=$(git -C "$worktree_path" rev-parse --abbrev-ref HEAD)

  # Find PRD for this worktree
  prd_file=$(find "$worktree_path/.flow" -name "prd-*.md" 2>/dev/null | head -1)

  if [ -n "$prd_file" ]; then
    echo "--- Worktree: $worktree_name ---"
    display_prd_summary "$prd_file"
  fi
done
```

## State Management

Read flow state to determine current phase and context:

```bash
STATE=$(bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" get 2>/dev/null)
CURRENT_PHASE=$(echo "$STATE" | grep 'current_phase' | cut -d= -f2 | tr -d ' ')
PRD_PATH=$(echo "$STATE" | grep 'prd_path' | cut -d= -f2 | tr -d ' ')
```

See [../shared/references/state-management.md](../shared/references/state-management.md) for state schema and operations.

## Output Format

```
Implementation Summary

PRD: prd-user-authentication-v2.md
  Version: v2
  Status: implementing
  Branch: feature/user-auth
  Created: 2024-01-15
  Updated: 2024-01-20

Progress:
  Total tasks: 5
  Completed: 2 (40%)
  In Progress: 1
  Open: 2

Open Tasks:
  [FLOW-126] Implement database schema [Epic: Core Architecture]
  [FLOW-127] Setup API routes [Epic: Core Architecture]

Next Steps:
  Continue implementation - 2 tasks remaining
  Then run /flow:cleanup to finalize
```

## Context Refresh Protocol

After displaying summary, offer to refresh context if user needs to continue:

```
Ready to continue?
  - Type "continue" to proceed with remaining tasks
  - Type "status" to check again later
  - Run /flow:implement to continue implementation
```

## Final Instructions

- Always detect current git context before displaying summary
- Use beads when available for detailed task tracking
- Fall back to TodoWrite/basic status when beads is not available
- Group open tasks by epic for better organization
- Show clear next steps based on current phase
- In multi-worktree context, display summaries for all related worktrees
