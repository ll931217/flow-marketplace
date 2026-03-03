# Configuration

Maestro configuration schema, defaults, and state file formats.

## Configuration File

**Location:** `.flow/maestro/config.yaml`

## Full Schema with Defaults

```yaml
orchestrator:
  max_iterations: 3            # Max validation retry iterations
  max_task_duration: 1800      # Max seconds per task (30 minutes)
  checkpoint_frequency: "phase_complete"  # When to create git checkpoints
  parallel_execution: true     # Enable parallel task execution
  context_refresh_interval: 5  # Refresh context every N tasks

decision_engine:
  prefer_existing: true        # Favor technologies already in codebase
  maturity_threshold: 0.7      # Minimum maturity score for tech selection
  confidence_threshold: 0.6    # Below this triggers fallback behavior

error_recovery:
  max_retry_attempts: 3        # Max retries for transient errors
  backoff_multiplier: 2        # Exponential backoff multiplier
  enable_rollback: true        # Allow rollback to git checkpoints
  request_human_on_ambiguous: false  # Stay autonomous on ambiguous errors

logging:
  level: "info"                # Log level: debug, info, warn, error
  include_rationale: true      # Include decision rationale in logs
  log_to_file: true            # Write execution log to file

validation:
  run_tests: true              # Run test suite during validation
  validate_prd: true           # Check PRD requirements are met
  quality_gates:               # Quality gates to run
    - "lint"
    - "typecheck"
    - "security"
  fail_on_gate_violation: true # Fail validation if any gate fails
```

## Configuration Options

### Orchestrator

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max_iterations` | int | 3 | Maximum validation-fix-retry cycles |
| `max_task_duration` | int | 1800 | Timeout per task in seconds |
| `checkpoint_frequency` | string | `"phase_complete"` | When to create checkpoints: `"phase_complete"`, `"group_complete"`, `"task_complete"` |
| `parallel_execution` | bool | true | Run independent tasks concurrently |
| `context_refresh_interval` | int | 5 | Refresh codebase context every N tasks |

### Decision Engine

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefer_existing` | bool | true | Favor technologies already in the codebase |
| `maturity_threshold` | float | 0.7 | Minimum maturity score (0.0-1.0) for tech selection |
| `confidence_threshold` | float | 0.6 | Below this threshold triggers fallback behavior |

### Error Recovery

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max_retry_attempts` | int | 3 | Max retries for transient errors |
| `backoff_multiplier` | int | 2 | Exponential backoff multiplier (delay = multiplier ^ attempt) |
| `enable_rollback` | bool | true | Allow rollback to git checkpoints on critical failure |
| `request_human_on_ambiguous` | bool | false | Pause and ask user on ambiguous errors |

### Logging

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `level` | string | `"info"` | Minimum log level: `debug`, `info`, `warn`, `error` |
| `include_rationale` | bool | true | Log decision rationale alongside decisions |
| `log_to_file` | bool | true | Write logs to `execution-log.md` in session directory |

### Validation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `run_tests` | bool | true | Run test suite during validation phase |
| `validate_prd` | bool | true | Check all PRD requirements are met |
| `quality_gates` | list | `["lint", "typecheck", "security"]` | Quality gates to execute |
| `fail_on_gate_violation` | bool | true | Fail validation if any gate fails |

## Overriding Defaults

Create or edit `.flow/maestro/config.yaml` in your project root. Only include the options you want to override; unspecified options use defaults.

**Example: disable parallel execution and increase retries:**
```yaml
orchestrator:
  parallel_execution: false

error_recovery:
  max_retry_attempts: 5
```

**Example: stricter quality gates:**
```yaml
validation:
  quality_gates:
    - "lint"
    - "typecheck"
    - "security"
    - "coverage"
  fail_on_gate_violation: true

decision_engine:
  confidence_threshold: 0.8
```

## State File Formats

### Session Directory Structure

```
.flow/maestro/
  sessions/
    <session-id>/
      metadata.json        # Session info, status, timestamps
      decisions.json       # All decisions with rationale
      checkpoints.json     # Git commit references
      execution-log.md     # Detailed execution log
      final-report.md      # Generated report
  decisions/
    tech-stack.json        # Historical tech decisions
    architecture.json      # Historical architecture decisions
    task-ordering.json     # Historical task ordering
  config.yaml              # Maestro configuration
```

### metadata.json

```json
{
  "session_id": "uuid",
  "feature_request": "Implement user authentication",
  "status": "initializing|planning|generating|implementing|validating|complete|failed",
  "current_phase": "initialization|planning|task_generation|implementation|validation|handoff",
  "start_time": "2025-01-07T10:00:00Z",
  "end_time": null,
  "git_context": {
    "branch": "feat-auth",
    "worktree": "feature-auth",
    "initial_commit": "abc123"
  },
  "statistics": {
    "tasks_completed": 8,
    "tasks_remaining": 4,
    "checkpoints_created": 2,
    "errors_recovered": 1
  }
}
```

### Project-Local State Files

Located at `.flow/state/` (falls back to `${TMPDIR:-/tmp}/flow-marketplace/` outside git repos):

**state.json** (cross-compaction persistence):
```json
{
  "mode": "autonomous",
  "beads_issue_id": "FLOW-123",
  "timestamp": "2025-01-07T10:30:00Z",
  "prd_path": "/path/to/prd.md",
  "current_phase": "approved",
  "prd_summary": {
    "feature_name": "authentication",
    "version": "v1",
    "branch": "feature/auth",
    "requirements_count": 5,
    "approval_timestamp": "2025-01-07T10:30:00Z"
  }
}
```

**session.json** (autonomous session tracking):
```json
{
  "session_id": "uuid",
  "start_time": "2025-01-07T10:00:00Z",
  "decisions_log": [],
  "checkpoints": [],
  "current_phase": "implement"
}
```
