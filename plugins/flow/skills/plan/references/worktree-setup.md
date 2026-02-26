# Worktree Setup

## Overview

PRDs are best created in isolated git worktrees for better branch/feature management. Before proceeding with PRD generation, detect the current worktree status and offer options.

## Worktree Detection

Check if the current directory is already a git worktree:

```bash
GIT_DIR=$(git rev-parse --git-dir)
GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
IS_WORKTREE=$([ "$GIT_DIR" != "$GIT_COMMON_DIR" ] && echo "true" || echo "false")
```

## Decision Flow

If NOT in a worktree, use `AskUserQuestion` to offer 3 choices:

1. **Create worktree** - Create an isolated worktree for this feature
2. **Continue without worktree** - Proceed in the current directory
3. **Exit** - Gracefully exit the process

## Creating a Worktree

### With worktrunk (`wt` installed)

```bash
wt switch -c -x claude feature/<name>
```

This creates the worktree and launches Claude Code automatically. After creation, the current directory is already the new worktree -- no additional path tracking needed.

### Without worktrunk (git fallback)

```bash
# 1. Create the worktree with a feature branch
git worktree add -b feature/<name> ../repo.<name>

# 2. Capture the worktree path
WORKTREE_PATH=$(git worktree list --porcelain | grep "worktree" | tail -1 | cut -d' ' -f2)

# 3. Save the current prompt for the new session
cat > /tmp/prd-prompt-$(date +%s).txt <<EOF
# PRD Planning Prompt Saved from Previous Session

# Worktree Context
WORKTREE_PATH="$WORKTREE_PATH"
FEATURE_NAME="<name>"

Your feature name: <name>

To continue planning your PRD:
1. You're now in the new worktree created for this feature
2. Re-run the /flow:plan command to continue (it will skip worktree creation)
3. Answer the clarifying questions again

[Original prompt context preserved]
EOF
```

**User instructions for git fallback:**
1. Exit the current Claude Code session
2. Navigate to the new worktree: `cd <WORKTREE_PATH>`
3. Open Claude Code in the new directory
4. Read the prompt file to restore context
5. Continue with `/flow:plan` (will detect existing worktree and skip creation)

## Branch Naming Conventions

- Feature branches: `feature/<name>` (e.g., `feature/auth`, `feature/user-dashboard`)
- Ask user for a feature name via `AskUserQuestion` or allow free text input

## Worktree Path Tracking

When a new worktree is created, track the path for PRD save location:

- **Variable:** `NEW_WORKTREE_PATH`
- **Set when:** User selects "Create worktree" and it succeeds
- **Used by:** PRD save step to determine the `.flow` directory location

**With worktrunk:**
```bash
# Current directory is already the new worktree
# git rev-parse --show-toplevel returns the new worktree root
```

**Without worktrunk:**
```bash
# Store explicitly for later use
NEW_WORKTREE_PATH="../repo.<name>"
```

## When to Create vs Reuse

- **Create new worktree:** Starting a new feature from scratch, no existing worktree for this feature
- **Reuse existing worktree:** Already in a worktree matching the feature, or re-running `/flow:plan` after git fallback setup
- **Skip worktree:** Quick fixes, small changes, or user preference to work in main branch
