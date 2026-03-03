---
name: plan
description: Generate a Product Requirements Document (PRD) from user requirements. Guides through prerequisites check, worktree setup, clarifying questions, PRD generation with structured templates, and approval workflow. Use when starting a new feature implementation.
---

# Plan

Generate a structured PRD from user requirements through an interactive workflow.

## Quick Start

1. **Check prerequisites** - git (required), beads (optional), worktrunk (optional)
2. **Verify/create worktree** - Isolated worktrees recommended for feature branches
3. **Ask clarifying questions** - 3-5 questions at a time to gather requirements
4. **Generate PRD** - Creates structured markdown in `/.flow/prd-[feature]-v1.md`
5. **Get approval** - Review, revise, and approve before task generation

**Next:** Run `/flow:generate-tasks` to create implementation tasks.

## Goal

Guide the AI in creating a detailed PRD in Markdown format from an initial user prompt. The PRD should be clear, actionable, and suitable for a senior engineer to architect and implement using established software engineering patterns.

## Prerequisites

Verify required tools are installed before proceeding.

- **git** (required) - Version control
- **bd/beads** (optional) - Persistent task tracking with dependency management
- **wt/worktrunk** (optional) - Git worktree management

For tool checks, installation commands, and the prerequisite table format, see [references/prerequisites.md](references/prerequisites.md).

## Worktree Setup

PRDs are best created in isolated worktrees for branch/feature management. Before proceeding, detect whether the current directory is a git worktree.

- If not in a worktree, offer choices: create worktree, continue without, or exit
- Use `wt` if available, fall back to native `git worktree` commands
- Track `NEW_WORKTREE_PATH` for PRD save location

For detection logic, `wt` vs git fallback commands, branch naming, and prompt file format, see [references/worktree-setup.md](references/worktree-setup.md).

## Git Context Detection & PRD Discovery

After worktree setup, detect current git context and check for existing PRDs.

**Key steps:**
1. Detect current git context (branch, worktree, commit info)
2. Check for existing PRD matching current context (iteration mode)
3. If existing PRD found: increment version, reset status to draft
4. If no match: create new PRD

Uses the shared PRD auto-discovery protocol. See [../shared/references/prd-discovery.md](../shared/references/prd-discovery.md).

## Codebase Context Discovery

Launch 1-3 parallel Explore agents to identify relevant files for implementation context:

1. **Existing Implementations** - Similar features, established patterns, configs, type definitions
2. **Integration Points** - API routes, service layer, database models, middleware
3. **Test Patterns** (optional) - Test files, utilities, fixtures, mock patterns

Store discovered files in PRD frontmatter `code_references` and the "Relevant Code References" section.

## Clarifying Questions

Before writing the PRD, ask 3-5 clarifying questions at a time using `AskUserQuestion`. Prioritize the most critical unknowns first.

**Question categories:**
- Business context (problem, target user, priority, similar features)
- Functional scope (core functionality, user stories, acceptance criteria, edge cases)
- Technical context (data requirements, existing systems, constraints)
- Architecture patterns (pattern preferences, code organization, extensibility)
- UX/Design (mockups, accessibility, responsive/mobile)
- Non-functional requirements (performance, security, i18n)

For the full question strategy, category details, iteration rules, and AskUserQuestion format, see [references/clarifying-questions.md](references/clarifying-questions.md).

## Priority Inference

After gathering clarifying answers, infer priorities for each functional requirement.

**Process:**
1. Analyze each requirement for keyword triggers (P0-P4)
2. Assign confidence level (high/medium/low) with rationale
3. Present inferred priorities in a table for user confirmation
4. Store confirmed priorities in frontmatter `priorities.requirements`

**Priority levels:** P0 (Critical), P1 (High), P2 (Normal/default), P3 (Low), P4 (Lowest)

## External Integration Detection

Detect if the PRD requires external API integrations. If detected:
1. Offer to create an MCP server via the `mcp-builder` skill
2. Store MCP server context in PRD frontmatter under `mcp_servers`

## PRD Generation

Generate the PRD using the structured template with YAML frontmatter for metadata tracking.

**PRD contains:** Introduction, Goals, User Stories, Functional Requirements (with priorities), Non-Goals, Assumptions, Dependencies, Acceptance Criteria, Design Considerations, Technical Considerations, Architecture Patterns, Risks & Mitigations, Success Metrics, Priority/Timeline, Open Questions, Glossary, Changelog, Relevant Code References.

**Save location:** `/.flow/prd-[feature-name]-v1.md`

For the full PRD markdown template, YAML frontmatter schema, all required sections, and version numbering rules, see [references/prd-template.md](references/prd-template.md).

## Approval Workflow

After generating the PRD, display a summary and request approval.

**Flow:**
```
Generate PRD v1
     |
Present Summary + Review Checklist
     |
     +-- "Yes, approve" --> Update status to approved --> Save state
     |
     +-- "Review full PRD" --> Show file path --> Re-ask after review
     |
     +-- "No, revise" --> Restart from clarifying questions
     |
     +-- "Changes needed" --> Collect feedback --> Increment version --> Update PRD --> Re-present
```

**After approval (interactive mode):**
1. Update PRD status: `draft` --> `approved`
2. Initialize and persist state:
   ```bash
   SCRIPT="${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh"
   bash "$SCRIPT" init --mode=manual
   bash "$SCRIPT" set current_phase=approved \
     prd_path="<absolute_path_to_prd>" \
     'prd_summary={"feature_name":"<name>","version":"<version>","branch":"<branch>","requirements_count":<N>,"approval_timestamp":"<ISO>"}'
   ```
3. Display approval confirmation
4. Recommend `/compact` then `/flow:generate-tasks`
5. **STOP** - Do not proceed further. Wait for user action.

**After approval (autonomous mode):**
1. Update PRD status: `draft` --> `approved`
2. Initialize and persist state:
   ```bash
   SCRIPT="${FLOW_PLUGIN_ROOT}/skills/shared/scripts/flow-state.sh"
   bash "$SCRIPT" init --mode=autonomous
   bash "$SCRIPT" set current_phase=approved \
     prd_path="<absolute_path_to_prd>" \
     'prd_summary={"feature_name":"<name>","version":"<version>","branch":"<branch>","requirements_count":<N>,"approval_timestamp":"<ISO>"}'
   ```
3. Continue directly to `/flow:generate-tasks`

## PRD Review Checklist

Before presenting for approval, verify:

- [ ] All clarifying questions addressed in the PRD
- [ ] Goals are clear, specific, and measurable
- [ ] User stories follow "As a [user], I want [action], so that [benefit]"
- [ ] Functional requirements are unambiguous and testable
- [ ] Non-goals clearly define out-of-scope items
- [ ] Acceptance criteria are specific and measurable
- [ ] Dependencies documented
- [ ] Architecture patterns section includes relevant selections
- [ ] Risks identified with mitigation strategies
- [ ] Success metrics are objectively measurable

## Test Generation

After PRD approval and before implementation, generate failing tests for each functional requirement. Tests validate the PRD requirements are met during implementation.

## Shared References

- [PRD Auto-Discovery Protocol](../shared/references/prd-discovery.md) - Multi-stage algorithm for finding PRDs by git context
- [State Management Protocol](../shared/references/state-management.md) - Persist flow state across context compaction
- [Auto-Compaction Detection](../shared/references/auto-compaction-detection.md) - Maintain accurate context about PRD status and task progress

## Complexity Guidance

- **Simple features:** Concise PRD (1-2 pages), core sections, basic patterns
- **Complex features:** Thorough PRD (3-5 pages), all optional sections, comprehensive architecture analysis

## Target Audience

Assume the primary reader is a **senior engineer**. Requirements should be technically precise with appropriate architectural guidance.

## Final Instructions

1. Do NOT start implementing the PRD
2. Make sure to ask the user clarifying questions (3-5 at a time)
3. Take the user's answers to the clarifying questions and improve the PRD
4. Use the beads tool (`read_todos`/`write_todos`) for task tracking
5. If the user is satisfied with the PRD, suggest the user to use `/flow:generate-tasks` command
6. DO NOT suggest the user to use the `bd` command directly - this is reserved for AI agents
7. ULTRATHINK
