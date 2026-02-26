---
description: End-to-end autonomous implementation from PRD to completion
---

# /flow:autonomous - Maestro Autonomous Orchestrator

End-to-end autonomous implementation that executes the full plan → generate-tasks → implement → cleanup workflow. Phase 1 (planning) is interactive; Phases 2-5 run completely autonomously.

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
