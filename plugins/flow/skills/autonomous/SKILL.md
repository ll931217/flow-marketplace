---
name: autonomous
description: End-to-end autonomous implementation orchestrator (Maestro). Executes the full plan, generate-tasks, implement, cleanup workflow without human intervention after initial planning approval. Makes intelligent technical decisions using the decision engine. Use for fully autonomous feature implementation.
---

# Autonomous Orchestrator (Maestro)

End-to-end autonomous implementation that transforms a feature request into working code without human intervention after planning approval.

## Quick Start

```bash
# Simple feature
/flow:autonomous "Implement user authentication with OAuth support"

# With context
/flow:autonomous "Add OAuth Google login to the existing auth system"

# Complex feature
/flow:autonomous "Build a real-time dashboard with WebSocket support and data visualization"
```

## Critical Execution Rules

- **Phase 1 (Planning)** is INTERACTIVE: ask clarifying questions, get PRD approval
- **Phases 2-5** are AUTONOMOUS: no checkpoints, no pauses, no confirmations
- After planning approval, execution continues through completion without stopping
- Only stops for critical unrecoverable errors

**After Phase 1, DO NOT:**
- Pause for confirmations
- Wait for "Go" signals
- Stop at checkpoints
- Use AskUserQuestion (except critical errors)

**ONLY STOP FOR (after Phase 1):**
- Critical unrecoverable errors
- Resource exhaustion
- Ambiguous requirements not covered by approved PRD
- Conflicting specifications discovered during implementation

## Phase Summary

### Phase 1: Planning (INTERACTIVE)

Analyze the feature request, explore codebase patterns, ask clarifying questions, invoke the decision engine for technical choices, generate a PRD, and wait for user approval.

### Phase 2: Task Generation (AUTONOMOUS)

Read the approved PRD, generate 5-7 epics with sub-tasks, resolve dependencies, optimize for parallel execution, and create tasks in beads.

### Phase 3: Implementation (AUTONOMOUS)

Execute tasks continuously using specialized subagents, run parallel groups concurrently, auto-recover from failures, and create git checkpoints at safe points.

### Phase 4: Validation (AUTONOMOUS)

Run the test suite, validate PRD requirements are met, execute quality gates (lint, typecheck, security), and iterate up to 3 times on failures.

### Phase 5: Cleanup (AUTONOMOUS)

Run `/flow:cleanup` to finalize, update PRD status to `implemented`.

### Phase 6: Handoff (REPORT)

Generate a comprehensive implementation report and present results to the user.

## Decision Engine

Maestro uses the decision engine skill for all technical choices: technology stack selection, architecture pattern matching, and task ordering optimization.

The decision engine analyzes existing codebase context, applies scoring rubrics, and returns structured decisions with rationale and confidence levels.

For detailed usage during autonomous execution, see [references/decision-engine-usage.md](references/decision-engine-usage.md).

## Phase Workflow

Each phase has specific entry conditions, actions, logging format, and exit criteria that govern the transition between phases. The workflow follows a strict sequential progression with autonomous execution after Phase 1 approval.

For detailed phase descriptions, state transitions, and logging format, see [references/phase-workflow.md](references/phase-workflow.md).

## Error Recovery

Maestro implements smart error recovery with four strategies: retry with backoff, alternative approach, rollback to checkpoint, and human input request (last resort). Errors are classified as transient, implementation, critical, or ambiguous, each mapping to a specific recovery strategy.

For the recovery matrix, retry logic, and rollback procedures, see [references/error-recovery-strategies.md](references/error-recovery-strategies.md).

## State Persistence

Autonomous mode persists state across compaction using `$TMPDIR/flow-marketplace/`. State is saved at the Phase 1-to-Phase 2 boundary for resilience against auto-compaction. Session metadata, decisions, and checkpoints are stored in `.flow/maestro/sessions/<session-id>/`.

For the full state management protocol, see [../shared/references/state-management.md](../shared/references/state-management.md).

## Configuration

Maestro behavior is configurable via `.flow/maestro/config.yaml` covering orchestrator settings, decision engine thresholds, error recovery parameters, logging levels, and validation gates.

For the full configuration schema and defaults, see [references/configuration.md](references/configuration.md).

## Report Format

After completion, Maestro generates a comprehensive implementation report covering summary statistics, decisions made, changes applied, test results, quality gates, and checkpoints.

For the report template and section details, see [references/report-format.md](references/report-format.md).

## Architecture

```
+-------------------------------------------------------------+
|                        Maestro Core                         |
|  - Session lifecycle management                             |
|  - Phase orchestration                                      |
|  - Iterative refinement loop                                |
+-------------------------------------------------------------+
           |                    |                    |
           v                    v                    v
+------------------+  +------------------+  +------------------+
| Decision Engine  |  | State Manager    |  | Error Handler    |
| - Tech stack     |  | - Session track  |  | - Recovery       |
| - Architecture   |  | - Decision log   |  | - Checkpoints    |
| - Task ordering  |  | - Persistence    |  | - Fallback       |
+------------------+  +------------------+  +------------------+
           |                    |                    |
           v                    v                    v
+------------------+  +------------------+  +------------------+
| Subagent Factory |  | Skill Orch.      |  | Parallel Coord.  |
| - 20+ categories |  | - 5 built-in     |  | - [P:Group-X]    |
| - Auto-detection |  | - Pre-invocation |  | - Concurrent     |
+------------------+  +------------------+  +------------------+
```

## Integration with Flow Commands

Maestro orchestrates existing flow commands in sequence:

| Phase | Command | Mode |
|-------|---------|------|
| Planning | `/flow:plan` | Interactive |
| Task Generation | `/flow:generate-tasks` | Autonomous |
| Implementation | `/flow:implement` | Autonomous |
| Validation | `/flow:summary` | Autonomous |
| Handoff | `/flow:cleanup` | Autonomous |

## Critical Rules

1. **Never stop between phases** after PRD approval - execution is continuous
2. **Log everything** using the `[Maestro]` prefix format
3. **Use the decision engine** for all technical choices - never guess
4. **Create git checkpoints** at phase boundaries for safe rollback
5. **Iterate on failures** up to 3 times before reporting to user
6. **Persist state** to TMPDIR at phase boundaries for compaction resilience

## Prerequisites

- git installed and configured
- beads (`bd`) installed for task persistence
- Existing test infrastructure in the project

## See Also

- **Decision Engine Skill**: [../decision-engine/SKILL.md](../decision-engine/SKILL.md)
- **State Management**: [../shared/references/state-management.md](../shared/references/state-management.md)
- **Auto-Compaction Detection**: [../shared/references/auto-compaction-detection.md](../shared/references/auto-compaction-detection.md)
- **PRD Discovery**: [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md)
