---
name: generate-tasks
description: Generate implementation tasks from an approved PRD. Analyzes requirements to create epics and subtasks with dependencies, priorities, and testing strategies. Detects appropriate subagent types for each task. Use after PRD is approved.
---

# Generate Tasks

Generate a structured task hierarchy from an approved PRD with dependency tracking, priority inheritance, and subagent assignment.

## Quick Start

1. **Auto-discover PRD** - Match current git context (branch/worktree) to find the approved PRD
2. **Check existing tasks** - Detect if this PRD was previously processed (update vs fresh generation)
3. **Generate epics** - Create ~5 high-level parent issues covering full feature scope
4. **Generate sub-tasks** - Break each epic into actionable tasks with dependencies, relevant files, and agent assignments
5. **Wait for "Go"** - User confirmation before generation begins (SKIP in autonomous mode)

**Requirements:** PRD must exist and have `approved` status.

## Autonomous Mode

When invoked from `/flow:autonomous`, skip all user confirmations and proceed directly through each phase.

See [../shared/references/autonomous-mode.md](../shared/references/autonomous-mode.md) for detection method and behavioral rules.

**Summary:** Check for parent workflow flags, `[Maestro]` log format, or explicit autonomous indicators. If detected, skip all `AskUserQuestion` checkpoints except critical errors.

## PRD Discovery

Auto-discover the PRD using git context matching (branch, worktree).

See [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md) for the multi-stage discovery algorithm.

**After discovery:** Display PRD metadata and confirm with user before proceeding.

## State Recovery

Before PRD discovery, check for a context reset after PRD approval.

See [../shared/references/state-management.md](../shared/references/state-management.md) for the state persistence protocol.

**Recovery flow:**
1. Read state: `bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" get`
2. If `current_phase == "approved"` - use stored `prd_path` directly, skip auto-discovery
3. Display: "Resuming from approved PRD: {feature_name} (v{version}) on branch {branch}"
4. Update phase: `bash "${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh" phase generate-tasks`

## PRD Analysis

Read and analyze the discovered PRD to extract:

- **Functional requirements** with priority levels (P0-P4)
- **User stories** and acceptance criteria
- **Technical constraints** and architecture decisions
- **Non-functional requirements** (performance, security)
- **Existing codebase patterns** and conventions

Assess the current codebase to identify existing infrastructure, components, and utilities relevant to the PRD.

## Epic/Subtask Generation

Create parent epics (~5) and break each into actionable sub-tasks with acceptance criteria, file references, and priority inheritance.

See [references/task-generation-process.md](references/task-generation-process.md) for complete generation rules including:
- Epic naming conventions and structure
- Sub-task detail requirements
- Priority inheritance rules
- PRD update detection (fresh vs existing tasks)
- Beads vs TodoWrite storage paths

## Dependency Analysis

Analyze file-level conflicts between tasks to determine execution order and parallelism opportunities.

See [references/dependency-analysis.md](references/dependency-analysis.md) for:
- File conflict detection rules
- Blocking vs related dependency types
- Parallel group detection (P:Group-X format)
- Dependency graph construction

## Testing Strategy

Select and apply the appropriate testing approach based on PRD requirements.

See [references/testing-strategies.md](references/testing-strategies.md) for:
- Sequential Testing (DEFAULT) - testing after all implementation
- Incremental Testing - tests alongside implementation
- TDD approach - tests before implementation
- Decision matrix for choosing the right strategy

## Subagent Assignment

Detect the optimal subagent type for each task using pattern matching against the subagent taxonomy.

See [references/subagent-type-detection.md](references/subagent-type-detection.md) for:
- Task description analysis and keyword extraction
- Subagent type matching from `.claude/subagent-types.yaml`
- Skill assignment logic (frontend-design, mcp-builder, webapp-testing, etc.)
- Beads metadata storage format

## Context Discovery

Discover relevant source files for each task to reduce token usage during implementation.

See [references/context-discovery.md](references/context-discovery.md) for:
- Explore agent usage for file discovery
- Relevant file mapping per task
- Line range identification
- Storage format in issue descriptions

## Shared References

| Reference | Purpose |
|-----------|---------|
| [PRD Discovery](../shared/references/prd-discovery.md) | Multi-stage PRD auto-discovery algorithm |
| [State Management](../shared/references/state-management.md) | State persistence across context resets |
| [TDD Principles](../shared/references/tdd-principles.md) | Test-driven development guidelines |
| [PRD Change Management](../shared/references/prd-change-management.md) | PRD versioning and update tracking |

## Output Format

After successful generation, display:

```
Tasks Generated Successfully!

PRD: prd-[feature]-vN.md
  Status: approved
  Branch: [branch-name]

Tasks Created:
  Epics: X
  Sub-tasks: Y
  Total: Z

Next steps:
  Run /flow:summary to view all tasks and their status
  Run /flow:implement to start implementation
```

**With beads:** Tasks stored in `.beads/` database with full dependency tracking. Use `bd ready` to find tasks with no blockers.

**Without beads:** Tasks tracked via TodoWrite tool. Dependency info stored in task descriptions. Manual ordering required.

Do NOT suggest the user run `bd` commands directly. The `bd` tool is reserved for AI agents.

## Final Instructions

**ULTRATHINK** - Use extended reasoning for task decomposition, dependency analysis, and priority assignment.

**Critical Rules:**
- PRD must be in `approved` status before generating tasks
- First epic should always be core system architecture (minimal viable system)
- Always include a "Testing Strategy" epic
- Sub-tasks modifying the same files must have blocking dependencies
- Sub-tasks modifying different files can run in parallel
- Test files and source files are considered separate for conflict purposes
- Configuration files (package.json, etc.) require blocking dependencies if multiple tasks modify them
- Target audience is a **senior engineer** with codebase awareness
- Maintain DRY principle across generated tasks
- Do not overcomplicate implementation guidance

ULTRATHINK
