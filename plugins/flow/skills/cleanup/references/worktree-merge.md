# Worktree Merge Protocol

## Overview

When the current directory is a git worktree, the cleanup process offers to merge the feature branch into a target branch, remove the worktree, and delete the feature branch. This reference covers the full merge flow including error handling.

## Worktree Detection

Read `worktree.is_worktree` from PRD frontmatter:
- If `false`, skip merge entirely and proceed to summary commit
- If `true`, check `worktree.name != "main"` before proceeding

## Pre-Merge Validation

Before attempting a merge:

1. **Clean working directory:** `git status --porcelain` must return empty
2. **Not in main repo:** `worktree.name` must not be `"main"`
3. If uncommitted changes exist, warn the user and require commit or stash before merge

## Determine Merge Target

Priority order for target branch resolution:

1. Check `git.parent_branch` in PRD frontmatter
2. Infer from branch naming patterns:
   - `feature/*` -> merge to `main` or `master` (whichever exists)
   - `bugfix/*`, `hotfix/*` -> merge to `main` or `master`
   - Other branches -> prompt user via `AskUserQuestion`
3. If target cannot be determined, ask the user

## User Confirmation

Before executing, present options via `AskUserQuestion`:

| Option | Description |
|--------|-------------|
| Merge and cleanup worktree | Merge branch to target, remove worktree, delete feature branch |
| Skip worktree cleanup | Only create summary commit, leave worktree intact |
| Exit | Abort cleanup for manual worktree handling |

## Execute Merge

### With worktrunk (`wt`) installed

```bash
# Switch to target branch and merge
wt switch "$target_branch"
git merge --no-ff -m "feat([scope]): merge [feature] - complete

Implements all requirements from PRD:
- prd-[feature]-vN.md

Closes: [issue IDs]
PRD: prd-[feature]-vN.md" "$current_branch"

# Remove worktree and delete branch
wt remove
```

### Without worktrunk (git fallback)

```bash
# Store current worktree info
current_branch=$(git rev-parse --abbrev-ref HEAD)
worktree_path=$(git rev-parse --show-toplevel)

# Switch to main repository and target branch
repo_root=$(sed 's|/worktrees/[^/]*||' <<< "$worktree_path")
cd "$repo_root"
git checkout "$target_branch"

# Merge feature branch with conventional commit message
git merge --no-ff -m "feat([scope]): merge [feature] - complete

Implements all requirements from PRD:
- prd-[feature]-vN.md

Changes:
- [Epic 1 summary]
- [Epic 2 summary]

Closes: [issue IDs]
PRD: prd-[feature]-vN.md" "$current_branch"

# Remove worktree
git worktree remove "$worktree_path"

# Delete merged branch
git branch -d "$current_branch"
```

## Verify Success

After merge execution:

1. Check merge exit code (0 = success)
2. Verify worktree no longer exists: `git worktree list`
3. Display merge commit SHA for reference

## Error Handling

### Merge Conflicts

If the merge fails due to conflicts:

1. Inform user of the merge conflicts
2. Keep worktree intact for manual resolution
3. Suggest running `git status` to see conflicting files
4. Offer to keep worktree for manual cleanup
5. Do NOT attempt automatic conflict resolution

### Worktree Removal Failure

If worktree removal fails after a successful merge:

1. Provide manual cleanup instructions:
   ```bash
   git worktree remove <worktree-path>
   git branch -d <branch-name>
   ```
2. Verify branch was merged before suggesting `-d` (safe delete)
3. Proceed with remaining cleanup steps (PRD update, etc.)

### Uncommitted Changes

If `git status --porcelain` returns non-empty:

1. Display warning about uncommitted changes
2. Require the user to commit or stash changes first
3. Do NOT proceed with merge until working directory is clean
