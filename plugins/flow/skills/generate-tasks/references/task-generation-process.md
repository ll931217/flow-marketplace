# Task Generation Process

## Overview

This reference details how epics and sub-tasks are generated from an approved PRD, including naming conventions, priority inheritance, update detection, and storage paths.

## PRD Update Detection

Before generating tasks, detect whether the PRD was previously processed.

### Detection Flow

1. Check PRD frontmatter for `beads.related_issues` and `beads.related_epics`
2. Compare `updated_at_commit` to detect PRD modifications
3. Match tasks to current git branch/worktree context

### Behavior by State

| State | Action |
|-------|--------|
| **Fresh PRD** (empty/null related_issues) | Generate complete task hierarchy |
| **Updated PRD** (existing related_issues) | Offer update options |

### Update Options (Interactive Mode)

When existing tasks are found, present:

```
Found existing tasks for this PRD:
Options:
a) Review and update existing tasks (keep completed, update pending)
b) Regenerate all tasks (archive existing, create new from scratch)
c) Show diff of PRD changes to understand what needs updating
d) Cancel
```

### Intelligent Task Update (Option A)

1. Parse existing issues from beads using `bd show <issue-id>`
2. Compare with PRD requirements
3. Keep completed tasks unchanged
4. Update descriptions of pending tasks that match modified requirements
5. Generate new tasks for new requirements

## Phase 1: Epic Generation

### Epic Count

Use judgement based on PRD scope. Typically ~5 epics. Each epic should be a full feature that can be independently tested.

### Epic Naming Conventions

- Use clear, descriptive titles reflecting the feature area
- Active form: "[Verb]-ing [epic title]" for status display
- First epic should always be core system architecture (minimal viable system)
- Always include a "Testing Strategy" epic

### Epic Structure

Each epic should include:
- Clear purpose description
- Files to be created/modified
- Reference to PRD version
- Mapped requirements from PRD

### With Beads

```bash
bd create --title "Epic Title" \
  --description "Epic description..." \
  --priority "P1" \
  --labels "epic,feature-name"
```

### Without Beads (TodoWrite Fallback)

- Each epic is a todo item with status "pending"
- Use naming convention: "Epic: [title]"
- Track in TodoWrite tool state

### Generation Strategy for Updates

For each requirement area in the PRD:
- **Matching epic exists and is incomplete** - Update description
- **Matching epic exists and is done** - Skip
- **No matching epic exists** - Create new epic

Present both existing (kept) and new epics to user for review.

## Phase 1.5: Priority Assignment

### Priority Source

Read priorities from PRD frontmatter `priorities.requirements` array.

### Epic Priority Rule

Map each epic to its associated requirements. Use the **highest** requirement priority within the epic (P0 > P1 > P2 > P3 > P4).

### Example Mapping

```
PRD Requirements with Priorities:
- FR-1: User login (P1)
- FR-2: Password reset (P2)
- FR-3: Email notifications (P3)

Generated Epics with Mapped Priorities:
Epic                    | Requirements | Priority (Highest)
User Authentication     | FR-1, FR-2   | P1 (from FR-1)
Email Notifications     | FR-3         | P3 (from FR-3)
```

## Phase 2: Sub-Task Generation

Generate sub-tasks only for epics that are new or modified. Skip generation for completed/unchanged epics.

### Sub-Task Requirements

Each sub-task must include:

1. **Title** - Specific, actionable description
2. **Description** - Detailed deliverable with implementation guidance
3. **Acceptance Criteria** - Measurable conditions for completion
4. **Files to create/modify** - Specific file paths
5. **Parent epic link** - Parent-child relationship
6. **Priority** - Inherited from parent epic (with exceptions)
7. **Agent Assignment** - Primary subagent, fallbacks, applicable skills
8. **Relevant Files** - Existing files with line ranges for context

### With Beads

```bash
bd create --title "Implement login endpoint" \
  --description "Create POST /api/auth/login endpoint..." \
  --priority "P1" \
  --labels "feature,auth" \
  --metadata "subagent_type=backend-architect"
```

Link to parent epic using parent-child relationship. Set dependencies with `bd add-depends-on` or `bd add-blocked-by`.

### Without Beads (TodoWrite Fallback)

- Name sub-tasks with parent prefix: "[Epic Title] Sub-task: specific task"
- Status: "pending"
- Note dependencies in task descriptions (no automatic tracking)

## Task Priority Inheritance

### Default Rule

Sub-tasks inherit parent epic priority.

### Exceptions

| Task Type | Default Priority | Exception |
|-----------|-----------------|-----------|
| Documentation | P3 | Inherits epic priority if epic is P0 |
| Refactoring | P3 | Inherits epic priority if epic is P0 |
| All others | Parent priority | User can override |

## Issue Description Format

Each task description follows this structure:

```markdown
## Task: [Task Title]

[Task description with implementation guidance]

### Agent Assignment
- **Primary Subagent:** `subagent-type`
- **Fallback Agents:** `fallback1`, `fallback2`
- **Applicable Skills:** `skill1`, `skill2`

### Relevant Files

| File | Lines | Purpose |
|------|-------|---------|
| `path/to/file.ts` | 45-120 | Brief description |
| `path/to/other.ts` | 1-30 | Brief description |

### Context Notes
- [Additional context about file structure]
- [Patterns to follow or avoid]
```

### File Ownership (when team_required is true)

The following sections are only generated when `team_required` is true for the task's parallel group. When `team_required` is false, only the standard "Relevant Files" table above is generated.

This ownership metadata enables agent-teams coordination with strict file boundaries. See [file-ownership-assignment.md](file-ownership-assignment.md) for the full assignment algorithm.

```markdown
#### Owned Files (Exclusive Write)
Files this task may create or modify. No other task in the same parallel group should touch these.

| File | Action | Description |
|------|--------|-------------|
| `src/components/LoginForm.tsx` | Create | New login form component |
| `src/styles/auth.css` | Modify | Add login form styles |

#### Read-Only Dependencies
Files this task imports from but must NOT modify. Includes the owner task ID for coordination.

| File | Owner | Import Purpose |
|------|-------|----------------|
| `src/types/auth.ts` | FLOW-xxx | AuthResponse type |
| `src/api/client.ts` | FLOW-yyy | API client instance |

#### Interface Contracts
Shared types and function signatures at ownership boundaries. Contract files are owned by a designated task (typically the earliest dependency) and are read-only for all other tasks in the group.

\`\`\`typescript
// src/types/auth-contract.ts (read-only, owned by FLOW-xxx)
export interface AuthResponse { token: string; user: UserProfile; }
export interface LoginRequest { email: string; password: string; }
\`\`\`

#### Scope Boundaries
Explicit list of files and directories this task must NOT modify, even if they seem related.

- `src/api/auth/` — owned by FLOW-yyy (backend API task)
- `tests/auth/` — owned by FLOW-zzz (testing task)
- `package.json` — owned by FLOW-xxx (setup task)
```

## Post-Generation Steps

### Verify Issue Structure

**With beads:**
- Run `bd list` to view all issues
- Run `bd show <issue-id>` for specific details
- Run `bd ready` to identify unblocked tasks

**Without beads:**
- Review TodoWrite state for completeness

### Update PRD Metadata

After creating tasks, update the PRD frontmatter:
- Set `updated_at` timestamp
- Set `updated_at_commit` to current commit SHA
- Change status to `approved` if still `draft`
- Add issue/epic IDs to `beads.related_issues` and `beads.related_epics` (empty arrays if beads not installed)

### Merge Updated Issues

For updated PRDs:
- Merge newly created issues with existing kept issues
- Update PRD frontmatter with combined list (kept + new)
- Ensure dependencies are correct between old and new issues
- Archive obsolete issues if user chose "Regenerate all"
