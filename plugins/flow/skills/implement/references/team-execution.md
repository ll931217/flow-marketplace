# Team-Based Execution

## Overview

When a parallel group has `team_required: true` and the agent-teams plugin is available, execution uses structured team coordination instead of fire-and-forget subagent launches. This provides file ownership enforcement, inter-agent messaging, monitoring, and coordinated integration.

## Prerequisites

Before entering team mode, verify:

1. **agent-teams available** — Detection protocol passes (see [../../shared/references/agent-teams-detection.md](../../shared/references/agent-teams-detection.md))
2. **team_required is true** — Parallel group scored >= 4 in coordination heuristic
3. **Ownership metadata present** — Tasks have owned files, read-only deps, interface contracts, and scope boundaries

If any prerequisite fails, fall back to standard `[P:Group-X]` execution.

## Beads↔TaskCreate Bridge Protocol

Agent-teams infrastructure requires TaskCreate/TaskUpdate for team coordination. Beads remains the source of truth for persistent tracking. The bridge keeps both in sync.

### Bridge at Spawn

For each beads issue in the parallel group:

1. Create a TaskCreate mirror with matching subject and description
2. Store the mapping in flow state: `team_state.team_tasks[beads_id] = task_id`
3. Set TaskCreate status to `in_progress`

### Sync at Completion

When a team-implementer completes work:

1. Teammate marks TaskUpdate as `completed`
2. Maestro detects completion and closes the corresponding beads issue: `bd close <beads_id>`
3. Remove the mapping from `team_state.team_tasks`

### Conflict Resolution

| Scenario | Action |
|----------|--------|
| TaskCreate completed but beads still open | Close beads issue |
| Beads closed but TaskCreate still pending | Mark TaskCreate completed |
| Both out of sync after compaction | Re-read beads state as source of truth |

## Team Lifecycle

### Phase 1: Team Creation

```
[Maestro] -> Team mode: Creating team for P:Group-{N}
```

1. Call `TeamCreate` with team name `flow-group-{N}-{session_id}`
2. Store team name in flow state: `team_state.active_team`
3. Store group ID: `team_state.current_group`

### Phase 2: Task Bridging

Bridge beads issues to TaskCreate entries (see bridge protocol above).

### Phase 3: Spawn Team-Implementers

For each task in the group, spawn a `team-implementer` agent:

```
Agent(
  subagent_type="agent-teams:team-implementer",
  name="impl-{task_short_id}",
  team_name="flow-group-{N}-{session_id}",
  prompt="{delegation_prompt}"  // See subagent-delegation.md for template
)
```

Assign each spawned agent to their TaskCreate task via `TaskUpdate(owner=agent_name)`.

### Phase 4: Monitor Progress

Maestro acts as team-lead, monitoring teammates:

| Signal | Detection | Action |
|--------|-----------|--------|
| **Task completed** | TaskUpdate status=completed | Close beads issue, check group progress |
| **Agent idle** | Idle notification received | Check if blocked; reassign if needed |
| **Agent overloaded** | No progress after extended period | Check for errors, consider rebalancing |
| **Integration message** | SendMessage from implementer | Forward to relevant teammate or resolve |
| **Blocker reported** | Implementer messages about blocked work | Investigate, attempt resolution, reassign if needed |

### Phase 5: Collect Results

When all tasks in the group are completed:

1. Verify all TaskCreate entries are `completed`
2. Verify all corresponding beads issues are closed
3. Run test suite to validate integration between parallel changes

### Phase 6: Verify Integration

After collecting results:

1. Run full test suite
2. Check for merge conflicts between implementer changes
3. If conflicts found: resolve manually or spawn a resolution agent
4. If tests fail: investigate with standard error recovery (or team-debugger if persistent)

### Phase 7: Cleanup

```
[Maestro] -> Team mode: Cleaning up P:Group-{N}
```

1. Send shutdown requests to all teammates
2. Wait for shutdown confirmations
3. Call `TeamDelete` to clean up team resources
4. Update flow state: clear `team_state.active_team` and `team_state.current_group`
5. Add group to `team_state.groups_completed`

## Team State Schema

Stored in flow state via `flow-state.sh set`:

```json
{
  "team_state": {
    "active_team": "flow-group-1-maestro-1234567890",
    "current_group": "P:Group-1",
    "groups_completed": ["P:Group-0"],
    "team_tasks": {
      "FLOW-abc": "task-1",
      "FLOW-def": "task-2",
      "FLOW-ghi": "task-3"
    },
    "review_team": null
  }
}
```

## Delegation Prompt Template

Each team-implementer receives a prompt containing:

```
## Task: {task_title}

{task_description}

### Owned Files (Exclusive Write)
{owned_files_table}

### Read-Only Dependencies
{readonly_deps_table}

### Interface Contracts
{interface_contracts}

### Scope Boundaries
{scope_boundaries}

### Acceptance Criteria
{acceptance_criteria}

### TDD Requirements
- Write tests FIRST for all new functionality
- Verify tests fail before implementing (RED)
- Implement until tests pass (GREEN)
- Run test suite to confirm no regressions

### File Ownership Protocol
- ONLY modify files listed in "Owned Files"
- Do NOT modify files in "Scope Boundaries"
- Import from "Read-Only Dependencies" but never modify them
- If you need changes to a file you don't own, message the team lead
```

## Compaction Resilience

If auto-compaction occurs during active team execution:

1. **SessionStart hook** reads `team_state` from flow state
2. If `active_team` is set:
   - Check if team is still alive (TaskList)
   - If alive: resume monitoring from current state
   - If dead: clean up stale team, re-evaluate remaining tasks
3. Log: `[Maestro] -> Team state recovered after compaction`

## Error Scenarios

| Error | Recovery |
|-------|----------|
| Team-implementer fails | Retry with standard subagent (fallback to non-team mode for that task) |
| TeamCreate fails | Fall back to standard `[P:Group-X]` execution for entire group |
| Bridge sync fails | Re-read beads state, reconcile manually |
| All implementers stuck | Shutdown team, fall back to sequential execution |
