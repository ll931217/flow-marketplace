# Summary Commit Format

## Overview

After all tasks are complete and tests pass, a summary commit groups all implementation changes using conventional commit format. This step is skipped if a worktree merge was performed, since the merge commit serves the same purpose.

## When to Create

- **Create:** Still in worktree (user skipped merge) or working in main repo
- **Skip:** Worktree merge was performed in the merge step (commit created by merge operation)

## Commit Message Template

```
feat([scope]): implement [feature-name] - complete

Implements all requirements from PRD:
- prd-[feature]-vN.md

Changes:
- [Summary of epic 1 - e.g., Core authentication system]
- [Summary of epic 2 - e.g., User registration flow]
- [Summary of epic 3 - e.g., Password reset functionality]
- [Testing complete - unit, integration, e2e tests]

Closes: [list of all issue IDs]
PRD: prd-[feature]-vN.md
Branch: [branch-name]
```

## Template Fields

| Field | Source | Description |
|-------|--------|-------------|
| `[scope]` | PRD feature name | Short identifier (e.g., `auth`, `api`, `ui`) |
| `[feature-name]` | PRD title | Human-readable feature description |
| `prd-[feature]-vN.md` | PRD filename | Exact PRD file referenced |
| `Changes` | PRD epics | One line per epic summarizing what was implemented |
| `Closes` | `beads.related_issues` | Comma-separated list of issue IDs |
| `Branch` | `git.branch` | Current branch name from PRD |

## Commit Creation

```bash
# Stage all changes
git add .

# Create commit with formatted message
git commit -m "[message]"

# Display commit SHA for reference
git rev-parse HEAD
```

## Example: Feature Implementation

```
feat(auth): implement user authentication - complete

Implements all requirements from PRD:
- prd-authentication-v3.md

Changes:
- Core authentication system with JWT tokens
- User registration with email verification
- Password reset via email link
- Session management and token refresh
- Unit, integration, and E2E tests complete

Closes: proj-auth-1, proj-auth-2, proj-auth-3, proj-auth-4, proj-auth-5
PRD: prd-authentication-v3.md
Branch: feature/user-auth
```

## Merge Commit Format (Worktree)

When performing a worktree merge, the merge commit uses a similar format:

```
feat([scope]): merge [feature] - complete

Implements all requirements from PRD:
- prd-[feature]-vN.md

Changes:
- [Epic 1 summary]
- [Epic 2 summary]

Closes: [issue IDs]
PRD: prd-[feature]-vN.md
```

The `--no-ff` flag ensures a merge commit is always created, even for fast-forward merges. This preserves the feature branch history in the commit graph.

## Commit Type Selection

Use the appropriate conventional commit type based on the PRD scope:

| Type | When to Use |
|------|-------------|
| `feat` | New feature implementation (most common) |
| `fix` | Bug fix PRD |
| `refactor` | Refactoring PRD |
| `perf` | Performance improvement PRD |
| `chore` | Maintenance or infrastructure PRD |
