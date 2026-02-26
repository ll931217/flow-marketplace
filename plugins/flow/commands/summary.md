---
description: Show current feature implementation summary
---

# /flow:summary - Feature Summary

Display a concise summary of the current feature implementation progress.

**Usage:** `/flow:summary`

**What this does:**
- Auto-discovers PRD based on current git context (branch/worktree)
- Displays PRD metadata (name, version, status, branch)
- Shows progress tracking (X/Y tasks completed)
- Lists open tasks grouped by epic
- Shows what's left to do

**Multi-Worktree:** In main directory, shows summaries for ALL related worktrees.

**Task Source:**
- With beads (`bd`): Uses `bd` commands for full status tracking
- Without beads: Falls back to TodoWrite for basic status

DO NOT suggest the user to use the `bd` command directly — this is reserved for AI agents.

**Full workflow:** plan → generate-tasks → implement → cleanup
