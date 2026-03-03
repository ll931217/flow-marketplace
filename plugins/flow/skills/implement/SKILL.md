---
name: implement
description: Execute implementation tasks from a generated task list. Enforces TDD test-first workflow, delegates to specialized subagents, handles parallel task groups, and manages error recovery. Use after tasks are generated from an approved PRD.
---

# Implement

Execute implementation tasks from a generated task list with TDD enforcement, subagent delegation, and parallel execution.

## Quick Start

1. **Discover PRD** - Auto-detected from git context (branch/worktree)
2. **Verify status** - Must be `approved` or `implementing`
3. **Load tasks** - Read task list from beads or TodoWrite
4. **Execute tasks** - Autonomous with specialized subagents, TDD-first
5. **Complete** - All tests pass, PRD status updated to `implemented`

**Pre-implementation:** PRD must be `approved` or `implementing` status.

## TDD Test-First Enforcement

**CRITICAL:** This is the single most important rule in the implementation workflow.

### Rules

- **Tests MUST be written first** - Before implementing ANY feature, write failing tests that describe expected behavior
- **Verify tests fail** - Run test suite and confirm all tests fail (RED status initially)
- **Implement until tests pass** - Only mark implementation task complete when its corresponding tests pass (GREEN status)
- **No progress without tests** - Do NOT proceed to next task until current task's tests pass
- **Quality gate** - All tests must pass before allowing merge or considering epic complete

### Red/Green Status Convention

When displaying task status, use these indicators for immediate visual feedback:

| Indicator | Meaning | Action |
|-----------|---------|--------|
| RED (FAIL) | Tests failing | Cannot proceed, fix implementation |
| GREEN (PASS) | Tests passing | Can proceed to next task |

### TDD Cycle

```
1. Write failing test (RED)
2. Run tests - confirm failure
3. Implement minimal code (GREEN)
4. Run tests - confirm passing
5. Refactor if needed
6. Mark task complete
```

For detailed TDD workflow across all phases, see [../shared/references/tdd-principles.md](../shared/references/tdd-principles.md).

## Autonomous Mode

Detect whether running autonomously (from `/flow:autonomous`) or interactively. This controls checkpoint and confirmation behavior.

See [../shared/references/autonomous-mode.md](../shared/references/autonomous-mode.md) for detection rules and behavior differences.

**Summary:**
- **Autonomous:** Execute ALL tasks without pauses, make reasonable decisions, skip confirmations
- **Interactive:** May pause for clarification on ambiguous requirements, missing info, or conflicting specs

## PRD Discovery

Auto-discover the PRD from git context (branch/worktree), validate its status, and establish the baseline context.

See [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md) for the multi-stage discovery algorithm.

**After discovery:**
1. Run `/flow:summary` to capture initial state
2. Check `code_references` in PRD frontmatter for initial context
3. Update PRD status from `approved` to `implementing`
4. Update flow state: `bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" phase implement`

## Task Execution Loop

The core cycle: pick a task, verify tests, implement, verify passing, mark done.

See [references/task-execution-loop.md](references/task-execution-loop.md) for the full execution cycle including:
- Beads vs TodoWrite task tracking paths
- Status transitions (`open` -> `in_progress` -> `closed`)
- PRD status updates (`approved` -> `implementing` -> `implemented`)
- Epic completion checks and commit protocol
- Context-optimized file reading strategy

## Parallel Execution

Tasks tagged with `[P:Group-X]` are executed concurrently via multiple subagents.

See [references/parallel-execution.md](references/parallel-execution.md) for:
- `[P:Group-X]` coordination pattern
- Pre-group context refresh (REQUIRED)
- Phase-based execution (analysis -> concurrent execution -> monitoring -> validation)
- Group state tracking with beads labels

## Subagent Delegation

Each task is routed to a specialized subagent based on task metadata.

See [references/subagent-delegation.md](references/subagent-delegation.md) for:
- Reading `subagent_type` from task metadata
- Fallback logic when type is not specified
- Skill pre-invocation patterns (frontend-design, webapp-testing, document-skills)
- Task tool invocation format
- Auto-detection from `.claude/subagent-types.yaml`

## Error Recovery

Handle build errors, test failures, dependency issues, and blocked tasks.

See [references/error-recovery.md](references/error-recovery.md) for:
- Error classification and retry strategies
- Blocked task handling protocol
- Ralph Wiggum iterative loops for persistent failures
- When to escalate to user
- Rollback procedures

## PRD Change Management

Handle PRD updates that occur mid-implementation, from minor clarifications to major architectural shifts.

See [../shared/references/prd-change-management.md](../shared/references/prd-change-management.md) for the full protocol covering minor, moderate, and major change workflows.

**Always refresh context:** After ANY PRD version change, execute `/flow:summary` immediately.

## TDD Principles

Comprehensive TDD workflow across all flow phases (plan, generate-tasks, implement, cleanup).

See [../shared/references/tdd-principles.md](../shared/references/tdd-principles.md) for test creation ordering, dependency patterns, and quality gates.

## State Management

Persist flow state across Claude Code conversation compaction using TMPDIR.

See [../shared/references/state-management.md](../shared/references/state-management.md) for the state schema, read/write operations, and context reset protocol.

## Task Completion Criteria

A task is considered **done** when ALL of the following are true:

1. **Tests pass** - All tests associated with the task pass (GREEN status)
2. **Implementation complete** - The feature described in the task works as specified in the PRD
3. **Sub-tasks closed** - All sub-tasks under the parent task are marked `[x]` and closed in beads
4. **Files tracked** - All created/modified files are listed in "Relevant Files" section
5. **No regressions** - Full test suite passes (not just the task's tests)
6. **Committed** - When all sub-tasks of a parent task are done:
   - Run full test suite
   - Stage changes (`git add .`)
   - Remove temporary files and code
   - Commit with conventional commit format referencing issue ID and PRD context

**Epic completion:** When ALL tasks in an epic are closed, close the parent epic in beads. Check if all PRD tasks are complete and recommend `/flow:cleanup` if so.

## Final Instructions

Use ULTRATHINK for complex implementation decisions. Before each task, assess complexity:
- **Simple tasks** (variable rename, config change): Execute directly
- **Medium tasks** (new endpoint, component): Plan approach, then execute
- **Complex tasks** (architecture, multi-file refactor): Use extended thinking to reason through approach before writing code

Execute tasks continuously. Only stop for unrecoverable errors or genuine ambiguity that cannot be resolved from the PRD and codebase context.
