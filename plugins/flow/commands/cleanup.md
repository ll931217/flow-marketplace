---
description: Clean up after implementation - close issues, commit changes, update PRD status
---

# /flow:cleanup - Implementation Cleanup

Post-implementation cleanup that verifies all tasks are complete, enforces TDD quality gate, handles worktree merge, creates summary commit, and updates PRD status.

**Usage:** `/flow:cleanup`

**What this does:**
- Verifies all tasks are complete (beads or TodoWrite)
- Enforces TDD quality gate: ALL tests MUST pass before proceeding
- Merges worktree to target branch (if applicable, using `wt` or git fallback)
- Creates summary commit with conventional format (PRD reference, epic summaries)
- Optionally generates documentation via `document-skills`
- Updates PRD status from `implementing` to `implemented`

**Prerequisites:** All PRD tasks must be complete

**Next:** Feature is complete! Review the implementation summary.

**Full workflow:** plan → generate-tasks → implement → cleanup
