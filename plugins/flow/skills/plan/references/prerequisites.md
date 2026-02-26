# Prerequisites

## Overview

Before starting PRD generation, verify that required tools are installed. Only `git` is strictly required; `bd` (beads) and `wt` (worktrunk) are optional with built-in fallbacks.

## Tool Check Table

| Tool  | Check       | Installation                                                                                                                              | Required |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `git` | `which git` | Use system package manager (e.g., `sudo apt install git`, `brew install git`)                                                             | Yes      |
| `bd`  | `which bd`  | `curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh \| bash` (optional - TodoWrite fallback available) | No       |
| `wt`  | `which wt`  | `brew install max-sixty/worktrunk/wt` OR `cargo install worktrunk` (optional - git fallback available)                                    | No       |

## Tool Details

### git (Required)

Version control is mandatory for all flow operations. If `git` is not installed, the workflow cannot proceed.

### bd / beads (Optional)

Persistent task storage with dependency tracking and progress visibility.

**Installation:**
```bash
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

**Benefits:**
- Persistent task storage across sessions
- Dependency tracking between tasks
- Progress visibility

**Fallback:** If `bd` is missing, the AI uses the internal `TodoWrite` tool for task tracking.

### wt / worktrunk (Optional)

Git worktree management for isolated feature development.

**Installation:**
```bash
# macOS
brew install max-sixty/worktrunk/wt

# Cargo (cross-platform)
cargo install worktrunk
```

**Benefits:**
- Simplified worktree creation and management
- Automatic Claude Code launch in new worktrees
- Clean worktree lifecycle management

**Fallback:** If `wt` is missing, the AI uses native `git worktree` commands.

## Prerequisite Check Process

1. Run `which` for each tool to check availability
2. For missing optional tools, offer installation via `AskUserQuestion`
3. Record which tools are available for use in subsequent steps
4. Proceed with available tools, using fallbacks where needed
