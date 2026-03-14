---
name: autonomous
description: End-to-end autonomous implementation orchestrator (Maestro). Executes the full plan, generate-tasks, implement, cleanup workflow without human intervention after initial planning approval. Makes intelligent technical decisions using the decision engine. Use when you want to say "do it all", "end-to-end", "hands-off", or "fully implement" something. This skill handles everything from planning to completion automatically.
---

# Autonomous Orchestrator (Maestro)

End-to-end autonomous implementation that transforms a feature request into working code without human intervention after planning approval.

## Quick Reference

**Usage:** `/flow:autonomous "Implement user authentication with OAuth support"`

**What this does:**
- **Phase 1 (Interactive):** Ask clarifying questions, generate and approve PRD
- **Phase 2 (Autonomous):** Generate epics and subtasks with dependencies
- **Phase 3 (Autonomous):** Execute all tasks with TDD, parallel groups, subagent delegation
- **Phase 4 (Autonomous):** Validate all tests pass, auto-recover on failures
- **Phase 5 (Autonomous):** Merge worktree, create summary commit, update PRD status
- **Phase 6:** Present final implementation report

**Critical rules:**
- After Phase 1 approval, NO checkpoints, NO pauses, NO confirmations
- Uses decision engine for autonomous technical choices
- Only stops for critical unrecoverable errors

**Prerequisites:** None — starts from scratch

**Full workflow:** plan → generate-tasks → implement → cleanup (all orchestrated automatically)

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

### Phase 0: Initialization

Initialize state and session tracking before any phase begins:

```bash
SCRIPT="${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh"
bash "$SCRIPT" init --mode=autonomous
bash "$SCRIPT" session init
bash "$SCRIPT" team clear  # Ensure clean team state from any previous session
```

### Phase 1: Planning (INTERACTIVE)

**This phase is INTERACTIVE — the user MUST be engaged before proceeding.**

1. **Critically evaluate the feature request** — Do not blindly accept the user's idea. Provide constructive criticism: flag potential issues, suggest improvements, identify missing considerations, and offer better alternatives if they exist. Use `AskUserQuestion` to present your analysis and proposed refinements. Proceed only once the user agrees on a direction.
2. **Explore approaches** — Propose 2-3 design approaches with trade-offs and a recommendation. Apply YAGNI: strip unnecessary scope. Use `AskUserQuestion` to present the approaches and let the user choose. Converge on a direction before generating the PRD.
3. **Invoke `/flow:plan`** — Delegates the full PRD workflow to the plan skill, which handles:
   - Prerequisites check and worktree setup
   - Codebase context discovery (parallel Explore agents)
   - Clarifying questions (3-5 at a time via AskUserQuestion)
   - Decision engine for tech stack and architecture choices
   - PRD generation, review checklist, and user approval
   - Saves PRD to `.flow/prd-{feature}-v1.md`
   - State persistence after approval

**Note:** Autonomous mode does NOT skip clarifying questions. It skips intermediate confirmations ("Ready to proceed?", "Can I move on?") in later phases. Phase 1 is always fully interactive.

### Phase 2: Task Generation (AUTONOMOUS)

Invoke `/flow:generate-tasks`. Reads the approved PRD, generates 5-7 epics with sub-tasks, resolves dependencies, optimizes for parallel execution, and creates tasks in beads.

### Phase 3: Implementation (AUTONOMOUS)

Invoke `/flow:implement`. Executes tasks continuously using specialized subagents, runs parallel groups concurrently, auto-recovers from failures, and creates git checkpoints at safe points. When `team_required` groups are detected and agent-teams is available, uses structured team coordination (TeamCreate → team-implementers → monitor → TeamDelete).

### Phase 3.5: Review (AUTONOMOUS)

Run multi-dimensional code review via `/flow:review`. When agent-teams is available, spawn parallel team-reviewers across security, performance, architecture, testing, and accessibility dimensions. Auto-fix Critical and High severity findings.

### Phase 4: Validation (AUTONOMOUS)

Run the test suite, validate PRD requirements are met, execute quality gates (lint, typecheck, security), and iterate up to 3 times on failures.

### Phase 5: Cleanup (AUTONOMOUS)

Run `/flow:cleanup` to finalize, update PRD status to `implemented`. State, session, and team files are reset by the cleanup skill.

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

Autonomous mode persists state across compaction using project-local `.flow/state/`. State is saved at the Phase 1-to-Phase 2 boundary for resilience against auto-compaction. Session metadata, decisions, and checkpoints are stored in `.flow/maestro/sessions/<session-id>/`.

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
| - 20+ categories |  | - 6 built-in     |  | - [P:Group-X]    |
| - Auto-detection |  | - Pre-invocation |  | - Team mode      |
+------------------+  +------------------+  | - Standard mode  |
                                            +------------------+
```

## Integration with Flow Commands

Maestro orchestrates existing flow commands in sequence:

| Phase | Command | Mode |
|-------|---------|------|
| Planning | `/flow:plan` | Interactive |
| Task Generation | `/flow:generate-tasks` | Autonomous |
| Implementation | `/flow:implement` | Autonomous |
| Review | `/flow:review` | Autonomous |
| Validation | `/flow:summary` | Autonomous |
| Handoff | `/flow:cleanup` | Autonomous |

## Critical Rules

1. **Never stop between phases** after PRD approval - execution is continuous
2. **Log everything** using the `[Maestro]` prefix format
3. **Use the decision engine** for all technical choices - never guess
4. **Create git checkpoints** at phase boundaries for safe rollback
5. **Iterate on failures** up to 3 times before reporting to user
6. **Persist state** at phase boundaries for compaction resilience

## Prerequisites

- git installed and configured
- beads (`bd`) installed for task persistence
- Existing test infrastructure in the project

## See Also

- **Decision Engine Skill**: [../decision-engine/SKILL.md](../decision-engine/SKILL.md)
- **State Management**: [../shared/references/state-management.md](../shared/references/state-management.md)
- **Auto-Compaction Detection**: [../shared/references/auto-compaction-detection.md](../shared/references/auto-compaction-detection.md)
- **PRD Discovery**: [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md)
