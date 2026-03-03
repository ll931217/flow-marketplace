# Agent-Teams Detection Protocol

## Overview

The flow plugin can optionally leverage the agent-teams plugin for structured multi-agent coordination during parallel execution. This reference defines how to detect agent-teams availability and what fallback behavior to use when it's unavailable.

## Detection Protocol

### Step 1: Check Environment Variable

```bash
if [[ -n "${CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS:-}" ]]; then
  # Agent-teams features are explicitly enabled
  AGENT_TEAMS_AVAILABLE=true
fi
```

### Step 2: Check Skill Availability

Attempt to reference an agent-teams skill. If the skill exists, the plugin is installed:

```
Check if skill "agent-teams:parallel-feature-development" is available in the skill registry.
```

### Step 3: Check Agent Types

Verify that team agent types are available:

```
Check if subagent_type "agent-teams:team-implementer" is valid.
Check if subagent_type "agent-teams:team-reviewer" is valid.
Check if subagent_type "agent-teams:team-debugger" is valid.
```

### Detection Result

| Condition | Result |
|-----------|--------|
| Env var set AND skills available AND agent types valid | `agent_teams: available` |
| Any check fails | `agent_teams: unavailable` |

## Modes

### Team Mode

When agent-teams is available AND `team_required` is true for a parallel group:

- **Execution:** TeamCreate → bridge tasks → spawn team-implementers → monitor → collect → verify → TeamDelete
- **File ownership:** Enforced via team-implementer prompt with owned files, read-only deps, interface contracts, and scope boundaries
- **Coordination:** Inter-agent messaging via SendMessage, idle/overloaded detection
- **Error recovery:** team-debugger escalation for persistent multi-file failures

### Standard Mode

When agent-teams is unavailable OR `team_required` is false:

- **Execution:** Fire-and-forget subagent launch via `[P:Group-X]` pattern
- **File ownership:** Soft guidance via task description (no enforcement)
- **Coordination:** No inter-agent communication; tasks run independently
- **Error recovery:** Standard retry → alternative approach → rollback

## Fallback Behavior Table

| Feature | Team Mode | Standard Mode (Fallback) |
|---------|-----------|--------------------------|
| Parallel execution | TeamCreate + team-implementers | Independent subagent launch |
| File ownership | Exclusive write boundaries in prompt | File list in task description |
| Inter-agent messaging | SendMessage between teammates | None |
| Integration contracts | Shared type defs at ownership boundaries | Implicit via task descriptions |
| Monitoring | Idle/overloaded detection, rebalancing | Fire-and-forget, wait for completion |
| Error escalation | team-debugger with hypothesis testing | Retry → alternative → rollback → user |
| Code review | team-reviewer per dimension | Single sequential review |
| Team lifecycle | Create → assign → monitor → shutdown | N/A |

## When to Prefer Team Mode

Team mode adds overhead (team lifecycle, task bridging, monitoring). Use the `team_required` heuristic from the dependency analysis to decide:

| Condition | Recommendation |
|-----------|---------------|
| Group size >= 3 AND file overlap score > 0 | Team mode |
| Group size >= 3 AND cross-layer work detected | Team mode |
| Group size < 3 OR no file overlap | Standard mode |
| agent-teams unavailable | Standard mode (forced) |

## Integration Points

### Generate-Tasks Phase

The `team_required` flag is computed during dependency analysis and stored per parallel group. See [../../generate-tasks/references/dependency-analysis.md](../../generate-tasks/references/dependency-analysis.md).

### Implement Phase

The implement skill checks `team_required` + agent-teams availability before each parallel group. See [../../implement/references/parallel-execution.md](../../implement/references/parallel-execution.md).

### Review Phase

The optional review phase uses team-reviewers when available. See [../../review/SKILL.md](../../review/SKILL.md).
