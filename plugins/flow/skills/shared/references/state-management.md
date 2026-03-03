# State Management Protocol

## Purpose

Persist flow state across Claude Code conversation compaction using project-local state directory.

## State Directory

**Location:** `.flow/state/` (project-local, falls back to `${TMPDIR:-/tmp}/flow-marketplace/` outside git repos)

**Files:**
- `state.json` - Current flow state
- `session.json` - Autonomous session metadata

## State Schema

### state.json

```json
{
  "mode": "autonomous" | "manual",
  "beads_issue_id": "FLOW-123" | null,
  "timestamp": "2024-01-15T10:30:00Z",
  "prd_path": "/path/to/prd.md",
  "current_phase": "plan" | "approved" | "generate-tasks" | "implement" | "review" | "cleanup",
  "prd_summary": {
    "feature_name": "authentication",
    "version": "v1",
    "branch": "feature/auth",
    "requirements_count": 5,
    "approval_timestamp": "2024-01-15T10:30:00Z"
  } | null
}
```

### team_state (within state.json, when using agent-teams)

```json
{
  "team_state": {
    "active_team": "flow-group-1-maestro-1234567890",
    "current_group": "P:Group-1",
    "groups_completed": ["P:Group-0"],
    "team_tasks": {
      "FLOW-abc": "task-1",
      "FLOW-def": "task-2"
    },
    "review_team": null
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `active_team` | string \| null | Current TeamCreate team name |
| `current_group` | string \| null | Currently executing parallel group ID |
| `groups_completed` | string[] | Parallel groups that finished team execution |
| `team_tasks` | object | Beads ID → TaskCreate ID mapping for bridge sync |
| `review_team` | string \| null | Active review team name (during `/flow:review`) |

Managed via `flow-state.sh team` subcommand. See script commands below.

### session.json (autonomous mode only)

```json
{
  "session_id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "decisions_log": [],
  "checkpoints": [],
  "current_phase": "implement"
}
```

## State Management Script

**Location:** `../scripts/flow-state.sh` (relative to shared/references)

All state operations MUST use this script to ensure the state file is created with the correct schema. Run via Bash tool:

```bash
bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" <command> [args]
```

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `init [--mode=manual\|autonomous]` | Create directory and initial state.json | `flow-state.sh init --mode=manual` |
| `get [field]` | Read full state or a specific field | `flow-state.sh get current_phase` |
| `set key=value [...]` | Update one or more fields | `flow-state.sh set current_phase=approved prd_path=/path/to/prd.md` |
| `phase <name>` | Shortcut to set current_phase | `flow-state.sh phase implement` |
| `reset` | Reset state.json to empty `{}` | `flow-state.sh reset` |
| `session init [--session-id=<id>]` | Create session.json for autonomous mode | `flow-state.sh session init` |
| `session clear` | Remove session.json | `flow-state.sh session clear` |
| `team init <team-name> <group-id>` | Initialize team_state for a parallel group | `flow-state.sh team init flow-group-1 P:Group-1` |
| `team map <beads-id> <task-id>` | Add beads↔TaskCreate mapping | `flow-state.sh team map FLOW-abc task-1` |
| `team complete` | Clear active team, add group to completed | `flow-state.sh team complete` |
| `team clear` | Remove all team_state | `flow-state.sh team clear` |

### Setting JSON Values

Pass JSON objects, arrays, `null`, `true`, `false`, or numbers directly:

```bash
flow-state.sh set 'prd_summary={"feature_name":"auth","version":"v1","branch":"feature/auth","requirements_count":5}'
flow-state.sh set beads_issue_id=null
```

### When Each Skill Calls the Script

| Skill | Trigger | Command |
|-------|---------|---------|
| plan | PRD approval | `init` then `set current_phase=approved prd_path=... prd_summary=...` |
| generate-tasks | Start of task generation | `phase generate-tasks` |
| implement | Start of implementation | `phase implement` |
| implement | Team mode parallel group | `team init <team-name> <group-id>` |
| implement | Team group complete | `team complete` |
| review | Start of review | `phase review` |
| autonomous | Phase 0 initialization | `init --mode=autonomous` + `session init` |
| cleanup | After finalization | `reset` + `session clear` + `team clear` |

## Read Operations

Before any flow command:

1. Run `flow-state.sh get` to read current state
2. Parse the JSON output to determine mode and context
3. Resume from checkpoint if autonomous

## Write Operations

After state changes:

1. Run `flow-state.sh set` with the updated fields
2. The script handles directory creation and atomic writes automatically

## Cleanup

After `/flow:cleanup` completes:

1. Run `flow-state.sh session clear` to remove session.json
2. Run `flow-state.sh reset` to reset state.json to empty
3. Directory structure is preserved for next session

## Context Reset Protocol

After PRD approval, the context window may be heavily consumed by the planning conversation. This protocol saves state and guides context recovery so implementation starts fresh.

### Save (after PRD approval)

1. Write `state.json` with `current_phase: "approved"` and populated `prd_summary`
2. Include `prd_path` pointing to the approved PRD file

### Compact (interactive mode only)

1. User runs `/compact` to clear the context window
2. PreCompact hook preserves `current_phase` and `prd_summary` in state.json

### Restore (SessionStart after compact)

1. SessionStart hook reads `state.json`
2. If `current_phase == "approved"`:
   - Display PRD summary (feature name, version, branch, requirements count)
   - Suggest: "Run `/flow:generate-tasks` to continue"
3. If `current_phase == "approved"` AND `mode == "autonomous"`:
   - Auto-invoke `/flow:generate-tasks` without user prompt

### Autonomous Mode

In autonomous mode, no manual compact is needed. State is saved at the Phase 2→3 boundary for resilience against auto-compaction, but execution continues directly.

## Fallback Behavior

**Non-git environment:** Falls back to `${TMPDIR:-/tmp}/flow-marketplace/` when not inside a git repository.

**Legacy migration:** Read operations check `.flow/state/` first, then fall back to `${TMPDIR:-/tmp}/flow-marketplace/`. All writes go to the new location. Legacy files are cleaned on `reset` and `session clear`.
