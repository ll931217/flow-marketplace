---
description: Multi-dimensional code review using parallel team-reviewers after implementation
---

# /flow:review - Implementation Review

Multi-dimensional code review that analyzes implementation quality across security, performance, architecture, testing, and accessibility dimensions.

**Usage:** `/flow:review`

**What this does:**
- Determines changed files from implementation (git diff against pre-implementation checkpoint)
- Categorizes files to select relevant review dimensions (2-4)
- When agent-teams available: spawns parallel team-reviewers (one per dimension)
- When agent-teams unavailable: runs sequential single-agent review
- Consolidates findings, deduplicates, and calibrates severity
- Auto-fixes Critical and High severity findings when possible
- Generates a consolidated review report

**Prerequisites:** Implementation phase complete (all tasks closed)

**Next:** Run `/flow:cleanup` to finalize the feature.

**Full workflow:** plan → generate-tasks → implement → **review** → cleanup
