# Parallel Execution

## Overview

Tasks tagged with `[P:Group-X]` are executed concurrently. Execution mode is selected per group based on the `team_required` flag and agent-teams availability:

- **Team Mode:** Structured coordination via TeamCreate, team-implementers with file ownership enforcement, inter-agent messaging, and monitoring. See [team-execution.md](team-execution.md).
- **Standard Mode:** Fire-and-forget subagent launch (current behavior). No inter-agent coordination.

## [P:Group-X] Coordination Pattern

Tasks in the same parallel group share a `[P:Group-X]` flag (e.g., `[P:Group-1]`, `[P:Group-2]`). All tasks within a group launch simultaneously and must all complete before the workflow proceeds.

**Detection logic:**

| Task Pattern | Detection | Action |
|--------------|-----------|--------|
| No `[P:Group-X]` | Sequential | Execute immediately |
| `[P:Group-X]` | Parallel group | Execute all group tasks concurrently via subagents |

## Pre-Group Context Refresh (REQUIRED)

Before starting ANY `[P:Group-X]` parallel task group, you **MUST** execute `/flow:summary` to ensure you have the current task state. Parallel groups require accurate context about dependencies and blocking issues.

**Trigger conditions for refresh:**
- About to start a `[P:Group-X]` parallel task group
- Autonomous mode has been running for 30+ minutes
- Context appears stale (suspected auto-compaction)

## Execution Phases

### Phase 1: Pre-execution Analysis

Before starting any parallel group:
1. Check which tasks are unblocked
2. Verify there are no blocking dependencies
3. Review task details and any blockers
4. Execute `/flow:summary` to establish current state

### Phase 2: Concurrent Execution

Select execution mode and launch tasks:

#### Mode Selection

```
if team_required == true AND agent-teams available:
  -> Team Mode (Phase 2a)
else:
  -> Standard Mode (Phase 2b)
```

See [../../shared/references/agent-teams-detection.md](../../shared/references/agent-teams-detection.md) for the detection protocol.

#### Phase 2a: Team Mode

When `team_required` is true and agent-teams is available:

1. Create team via `TeamCreate` with group context
2. Bridge beads issues to TaskCreate entries
3. Spawn `agent-teams:team-implementer` for each task with owned files, interface contracts, and scope boundaries
4. Monitor progress via idle/completion signals
5. Collect results and verify integration
6. Shutdown team via `TeamDelete`

See [team-execution.md](team-execution.md) for the full team lifecycle protocol.

#### Phase 2b: Standard Mode

When `team_required` is false or agent-teams is unavailable:

- Use multiple specialized subagents via the Agent tool with parallel invocations
- Each subagent works on their assigned files (listed in task description)
- Update all task statuses to `in_progress`
- Respect the subagent type metadata for optimal task routing
- Apply skills before subagent execution when `applicable_skills` is present
- No inter-agent coordination; tasks run independently

### Phase 3: Coordination and Monitoring

- Monitor progress via in-progress task status
- Use beads database for coordination between parallel tasks
- Wait for ALL tasks in the group to complete before proceeding

### Phase 4: Post-execution Validation

- Verify all group tasks are completed
- Close completed tasks
- Run tests if applicable before moving to next group/task
- Return to sequential mode for next task

## Group State Tracking with Beads

Use beads labels to persist parallel group membership in the database (not in-memory variables).

**Operations:**
- **Tag tasks with group:** Add label indicating parallel group membership
- **Find all tasks in a group:** List tasks by specific label
- **Check group completion:** List tasks by label and status (open)

**After group completion:**
- All tasks in group closed = group is complete
- Remove labels if desired
- Return to sequential mode for next task

## When to Use Parallel vs Sequential

**Use parallel execution when:**
- Tasks have no file conflicts (different files or different sections)
- Tasks have no data dependencies on each other
- Multiple specialized subagents can work independently
- Speed is important and tasks are naturally independent

**Use sequential execution when:**
- Tasks modify the same files
- Later tasks depend on output of earlier tasks
- Tasks share state or database resources
- Order matters for correctness

## Context Refresh Between Parallel Tasks

After completing a parallel group, before starting the next group or sequential task:
1. Verify all group tasks completed successfully
2. Run test suite to catch integration issues between parallel changes
3. If tests fail, resolve conflicts before proceeding
4. Execute `/flow:summary` if 5+ tasks completed or 30+ minutes elapsed
