# State Management Protocol

## Purpose

Persist flow state across Claude Code conversation compaction using TMPDIR.

## State Directory

**Location:** `$TMPDIR/flow-marketplace/`

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
  "current_phase": "plan" | "approved" | "generate-tasks" | "implement" | "cleanup",
  "prd_summary": {
    "feature_name": "authentication",
    "version": "v1",
    "branch": "feature/auth",
    "requirements_count": 5,
    "approval_timestamp": "2024-01-15T10:30:00Z"
  } | null
}
```

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
| autonomous | Phase 0 initialization | `init --mode=autonomous` + `session init` |
| cleanup | After finalization | `reset` + `session clear` |

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

If TMPDIR is not writable:
- Log warning
- Fall back to in-memory state only
- Notify user that persistence is unavailable
