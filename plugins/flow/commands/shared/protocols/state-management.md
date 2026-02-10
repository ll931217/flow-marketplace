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
  "current_phase": "plan" | "generate-tasks" | "implement" | "cleanup"
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

## Read Operations

Before any flow command:

1. Check if `$TMPDIR/flow-marketplace/state.json` exists
2. Parse state.json
3. Determine mode and context
4. Resume from checkpoint if autonomous

## Write Operations

After state changes:

1. Create `$TMPDIR/flow-marketplace/` if not exists
2. Update state.json with current state
3. Update session.json if autonomous mode
4. Ensure atomic writes (write to temp, then rename)

## Cleanup

After `/flow:cleanup` completes:

1. Delete `$TMPDIR/flow-marketplace/session.json`
2. Reset `$TMPDIR/flow-marketplace/state.json` to null state
3. Keep directory structure for next session

## Fallback Behavior

If TMPDIR is not writable:
- Log warning
- Fall back to in-memory state only
- Notify user that persistence is unavailable
