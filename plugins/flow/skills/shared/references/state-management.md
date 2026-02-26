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
