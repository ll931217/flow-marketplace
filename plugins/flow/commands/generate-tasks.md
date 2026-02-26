---
description: Generate tasks from a PRD (using beads if available, otherwise TodoWrite)
---

# /flow:generate-tasks - Task Generation

Analyze an approved PRD and generate structured implementation tasks with epics, subtasks, dependencies, testing strategies, and specialized subagent assignments.

**Usage:** `/flow:generate-tasks`

**What this does:**
- Auto-discovers the PRD matching current git context (branch/worktree)
- Checks for existing tasks (supports PRD updates with re-generation)
- Generates 5-7 epics with detailed subtasks and acceptance criteria
- Analyzes file dependencies and creates parallel execution groups
- Assigns specialized subagent types to each task
- Selects testing strategy (Sequential, Incremental, or TDD)

**Prerequisites:** PRD must exist and be in `approved` status

**Next:** `/flow:implement` to execute the generated tasks

**Full workflow:** plan → generate-tasks → implement → cleanup
