---
description: Execute implementation tasks from generated task list with TDD enforcement
---

# /flow:implement - Task Execution

Execute implementation tasks using TDD test-first workflow, delegating to specialized subagents with parallel execution support and error recovery.

**Usage:** `/flow:implement`

**What this does:**
- Auto-discovers PRD and loads generated task list
- Enforces TDD: write failing tests first (RED), implement until tests pass (GREEN)
- Delegates tasks to specialized subagents based on task metadata
- Executes parallel task groups (`[P:Group-X]`) concurrently
- Handles error recovery with retry, alternative approaches, and rollback
- Updates PRD status from `approved` to `implementing`

**Prerequisites:** PRD must be `approved` or `implementing`, tasks must be generated

**Next:** `/flow:cleanup` to finalize after all tasks are complete

**Full workflow:** plan → generate-tasks → implement → cleanup
