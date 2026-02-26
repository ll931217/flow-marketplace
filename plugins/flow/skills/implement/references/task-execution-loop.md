# Task Execution Loop

## Overview

The task execution loop is the core cycle for implementing PRD tasks. It covers picking a task, verifying tests, implementing, confirming tests pass, and marking the task done.

## Execution Cycle

```
1. Pick next ready task (unblocked, highest priority)
2. Update task status to in_progress
3. Check for corresponding test task
   - If no test task exists: create failing tests first (TDD)
4. Implement the task
5. Run tests - verify passing (GREEN)
   - If failing (RED): fix implementation, do NOT proceed
6. Mark sub-task as completed
7. If all sub-tasks of parent done:
   a. Run full test suite
   b. Stage and commit changes
   c. Close parent task
8. Check PRD completion
9. Loop to step 1
```

## Task Tracking Paths

### With Beads (`bd`) Installed

Full-featured task tracking with dependencies, ready task detection, and persistent storage.

**Prerequisites:**
- The `bd` command is available in the system PATH
- The `.beads` directory exists (initialize with `bd init` if not present)
- Beads database is functional

**Workflow:**
- Query ready tasks sorted by priority (P0 -> P4)
- Update task status: `open` -> `in_progress` -> `closed`
- Use dependency graph for blocking detection
- Track parallel group membership with labels

### Without Beads (TodoWrite Fallback)

Basic task tracking using the internal TodoWrite tool.

**Limitations:**
- Task context may be lost between sessions
- No persistent dependency tracking or ready task detection
- Manual verification may be needed if context is lost

**Workflow:**
- Read tasks from TodoWrite state
- Mark tasks as completed with `[x]`
- Manual dependency verification

## Status Transitions

| From | To | Trigger |
|------|----|---------|
| `open` | `in_progress` | Task selected for execution |
| `in_progress` | `closed` | All tests pass, implementation complete |
| `in_progress` | `blocked` | Test failures, missing dependencies, blockers |
| `blocked` | `in_progress` | Blocker resolved, tests fixed |

## PRD Status Updates

| PRD Status | Trigger |
|------------|---------|
| `approved` -> `implementing` | First task begins execution |
| `implementing` -> `implemented` | All tasks complete (via `/flow:cleanup`) |

**When updating PRD status to `implementing`:**
1. Update `prd.status` field in frontmatter
2. Update `metadata.updated_at` timestamp
3. Update `git.updated_at_commit` with current commit SHA
4. Add changelog entry: "Implementation started"

## Epic Completion Checks

After closing each task, check if the parent epic is now complete:

**With beads:**
1. After closing a sub-task with `bd close`, check if all sibling tasks are closed
2. If all sub-tasks closed: run full test suite
3. If tests pass: stage changes, commit, close parent epic
4. Call `check_prd_completion` to see if ALL PRD tasks are done

**Without beads:**
1. After marking a TodoWrite task as completed, review all tasks under the same epic
2. If all tasks completed: run full test suite
3. If tests pass: stage changes, commit
4. Check if all PRD tasks are complete

**PRD completion detection:**
When all tasks for a PRD are complete, display a completion summary and recommend running `/flow:cleanup` to finalize.

## Completion Protocol

When finishing a **sub-task**:
- Mark it as completed immediately (`[x]` in markdown)
- Close task in beads

When **all sub-tasks** under a parent are complete:
1. Run the full test suite (pytest, npm test, bin/rails test, etc.)
2. Only if all tests pass: stage changes (`git add .`)
3. Clean up: remove temporary files and temporary code before committing
4. Commit with a descriptive message that:
   - Uses conventional commit format (`feat:`, `fix:`, `refactor:`, etc.)
   - Summarizes what was accomplished in the parent task
   - Lists key changes and additions
   - References the issue ID and PRD context
   - Formats the message as a single-line command using `-m` flags
5. Close the **parent task** in beads

## Context-Optimized File Reading

When implementing tasks, use selective reading to reduce token usage:

1. **Check issue description first** - Read the "Relevant Files" table from the beads issue, extract file paths and line ranges
2. **Use selective Read tool** - Instead of reading entire files, use `Read("src/auth.ts", offset=45, limit=75)` for lines 45-120
3. **Fallback conditions:**
   - No relevant files in issue: read full file
   - Line range insufficient: expand range
   - File modified since PRD: read full file
   - New file: read similar files for patterns

**Token savings:** Selective reads typically save 70-85% of tokens versus full file reads.

### Reading from PRD code_references

When `code_references` exists in PRD frontmatter:

```yaml
code_references:
  - path: "src/services/AuthService.ts"
    lines: "45-120"
    reason: "Existing authentication patterns to follow"
```

Read selectively: `Read("src/services/AuthService.ts", offset=45, limit=75)`

## Periodic Context Refresh

Every 5 completed tasks or 30 minutes of work, execute `/flow:summary` to refresh context. Update the "Current Status" section with the latest output.

See [../../shared/references/auto-compaction-detection.md](../../shared/references/auto-compaction-detection.md) for the full auto-compaction detection protocol.

## Priority Display Format

Tasks are displayed with priority indicators and sorted by priority level (P0 -> P4):

| Priority | Level | Description |
|----------|-------|-------------|
| P0 | Critical | Urgent, blocking, security |
| P1 | High | Important, urgent functionality |
| P2 | Normal | Standard feature (default) |
| P3 | Low | Nice-to-have, enhancement |
| P4 | Lowest | Backlog, future consideration |
