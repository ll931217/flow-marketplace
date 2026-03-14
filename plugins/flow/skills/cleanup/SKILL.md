---
name: cleanup
description: Post-implementation cleanup and finalization. Verifies all tasks are complete, runs TDD quality gate (all tests must pass), handles worktree merge, creates summary commit with conventional format, optionally generates documentation, and updates PRD status to implemented. Use after all implementation tasks are complete. This skill should be invoked when you're done, finished, completed all tasks, or ready to wrap up and finalize the implementation.
---

# Cleanup

Post-implementation cleanup and finalization after all PRD tasks are complete.

## Quick Reference

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

## Quick Start

1. **Auto-discover PRD** - Matches current git context (branch/worktree)
2. **Verify all tasks complete** - All issues must be closed
3. **Verify all tests pass** - MANDATORY: All tests MUST pass before merge/cleanup (TDD quality gate)
4. **Check worktree** - Optional merge to target branch
5. **Create summary commit** - Groups all implementation changes
6. **Generate docs (optional)** - Auto-generate documentation with document-skills
7. **Update PRD status** - `implementing` -> `implemented`

**Requirements:** All PRD tasks must be complete.

**Full workflow:** See `README.md` for complete flow command usage.

## Autonomous Mode

When running in autonomous mode, cleanup decisions (worktree merge, documentation generation) proceed with defaults instead of prompting the user. Task completion and test verification are still enforced.

See: [../shared/references/state-management.md](../shared/references/state-management.md) for autonomous mode state handling.

## PRD Discovery

The cleanup command auto-discovers the relevant PRD by matching the current git context (branch name, worktree name, worktree path) against PRD frontmatter fields.

See: [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md) for the multi-stage discovery algorithm.

## Task Completion Verification

Before cleanup can proceed, all PRD tasks must be verified as complete.

**With beads (`bd`) installed:**

1. Read `beads.related_issues` from PRD frontmatter
2. Query each issue status via `bd show <issue-id>`
3. Verify ALL related issues have status `closed`
4. If any issues remain open, prompt user to continue or exit

**Without beads (TodoWrite fallback):**

1. Check internal TodoWrite state for all PRD-related tasks
2. Verify all tasks have status "completed"
3. Manual verification may be needed if context is incomplete

**Completion Summary Output:**

```
Task Completion Status:
Total tasks: X
Completed: Y
In Progress: Z
Open: W
```

If incomplete tasks are found, the user is offered the choice to continue with partial cleanup or exit to finish remaining tasks via `/flow:implement`.

## TDD Quality Gate

**MANDATORY:** All tests must pass before merge or cleanup can proceed.

The test suite is detected automatically based on project type and executed. If tests fail, cleanup is blocked until they pass or the user explicitly overrides.

See: [references/test-verification.md](references/test-verification.md) for test command detection, execution, and failure handling.

## Worktree Merge

When the current directory is a git worktree, cleanup offers to merge the feature branch into the target branch, remove the worktree, and delete the feature branch.

Worktree detection reads `worktree.is_worktree` from PRD frontmatter. If `false`, this step is skipped entirely.

See: [references/worktree-merge.md](references/worktree-merge.md) for the full merge flow, conflict resolution, and cleanup procedures.

## Commit Format

A summary commit groups all implementation changes using conventional commit format. This step is skipped if a worktree merge was performed (the merge commit serves this purpose).

The commit message includes PRD reference, epic summaries, closed issue IDs, and branch name.

See: [references/commit-format.md](references/commit-format.md) for the commit message template and examples.

## Documentation Generation

After implementation is complete, the user is offered the option to generate project documentation (API docs, user guides, technical specs) using the `document-skills` skill.

This step is optional and can be skipped entirely.

See: [references/documentation-generation.md](references/documentation-generation.md) for supported formats and invocation examples.

## PRD Status Update

After all cleanup steps complete, the PRD frontmatter is updated:

- **Version:** Increment `version: N` to `version: N+1`
- **Status:** `implementing` -> `implemented`
- **Timestamp:** Update `updated_at` to current ISO 8601 timestamp
- **Commit SHA:** Update `updated_at_commit` to current commit SHA
- **Changelog:** Insert new entry at top of changelog table

**Valid source statuses:** `implementing` or `approved`

**Invalid statuses (exit with message):**
- `draft` - PRD not yet approved, cannot cleanup
- `implemented` - Already implemented, nothing to do

## State Cleanup

After all PRD status updates are complete, reset the flow state files:

```bash
SCRIPT="${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh"
bash "$SCRIPT" session clear
bash "$SCRIPT" reset
```

This ensures the next session starts with a clean state and the SessionStart hooks do not surface stale data.

## Changelog Entry Format

For worktree merge:
```markdown
| N+1 | YYYY-MM-DD HH:MM | Implementation complete - merged to [target-branch], worktree removed |
```

For non-worktree (main repo):
```markdown
| N+1 | YYYY-MM-DD HH:MM | Implementation complete - all X tasks closed |
```

## Cleanup Summary

After all steps, display a summary showing:
- PRD name and status transition
- Test results (pass/fail, count, coverage)
- Worktree merge status (if applicable)
- Task completion counts
- Commit SHA and message
- Suggested next step: `/flow:summary`

## Shared References

| Reference | Description |
|-----------|-------------|
| [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md) | PRD auto-discovery algorithm |
| [../shared/references/state-management.md](../shared/references/state-management.md) | State and session management |
| [../shared/references/auto-compaction-detection.md](../shared/references/auto-compaction-detection.md) | Context refresh protocol |

## Cleanup-Specific References

| Reference | Description |
|-----------|-------------|
| [references/test-verification.md](references/test-verification.md) | TDD quality gate and test execution |
| [references/worktree-merge.md](references/worktree-merge.md) | Worktree merge flow and conflict handling |
| [references/commit-format.md](references/commit-format.md) | Conventional commit message template |
| [references/documentation-generation.md](references/documentation-generation.md) | Optional documentation generation |

## Safety Checks

Before performing cleanup, the following checks are enforced:

1. **PRD Status** - Must be `implementing` or `approved` (not `draft` or `implemented`)
2. **Git Status** - Ensure there are changes to commit
3. **Branch Match** - Current branch matches PRD git context
4. **Task Completion** - All tasks are marked as completed
5. **TDD Test Verification** - ALL tests pass (mandatory)
6. **Worktree Clean State** - No uncommitted changes before merge (if in worktree)

If any check fails, the specific issue is displayed with options to resolve or continue.

## Important Notes

- Only run cleanup after ALL implementation tasks are complete
- Manual testing is recommended before cleanup to verify the implementation
- The summary commit can be amended if needed: `git commit --amend`
- PRD can be reverted from `implemented` to `approved` if additional work is needed
- Worktree merge requires a clean working directory (no uncommitted changes)
