---
description: Generating a Product Requirements Document (PRD)
---

# /flow:plan - PRD Generation

Generate a structured Product Requirements Document through an interactive workflow of prerequisites checks, worktree setup, clarifying questions, and structured PRD creation.

**Usage:** `/flow:plan`

**What this does:**
- Checks prerequisites (git required, beads/worktrunk optional)
- Sets up an isolated worktree for the feature branch
- Asks 3-5 clarifying questions at a time to gather requirements
- Generates a PRD in `.flow/prd-[feature]-v1.md` with structured template
- Gets user approval before proceeding

**Prerequisites:** git installed, optionally beads (`bd`) and worktrunk (`wt`)

**Next:** `/flow:generate-tasks` to create implementation tasks from the approved PRD

**Full workflow:** plan → generate-tasks → implement → cleanup
