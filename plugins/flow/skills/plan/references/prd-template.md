# PRD Template

## Overview

This reference defines the full PRD markdown structure, YAML frontmatter schema, required sections, and version numbering rules.

## YAML Frontmatter Schema

```yaml
---
prd:
  version: v1
  feature_name: [derived from filename]
  status: draft
git:
  branch: [detected branch name]
  branch_type: [feature/bugfix/main/etc]
  created_at_commit: [current commit SHA]
  updated_at_commit: [current commit SHA]
worktree:
  is_worktree: [true/false]
  name: [worktree name or "main"]
  path: [worktree .git path or empty]
  repo_root: [repository root path]
metadata:
  created_at: [ISO 8601 timestamp]
  updated_at: [ISO 8601 timestamp]
  created_by: [git user.name <user.email>]
  filename: [prd-name-v1.md]
beads:
  related_issues: []
  related_epics: []
code_references: []
priorities:
  enabled: true
  default: P2
  inference_method: ai_inference_with_review
  requirements:
    - id: FR-1
      text: "Requirement description"
      priority: P1
      confidence: high
      inferred_from: "rationale"
      user_confirmed: true
mcp_servers: []
---
```

## Example Frontmatter

```yaml
---
prd:
  version: v1
  feature_name: authentication
  status: draft
git:
  branch: feature/auth
  branch_type: feature
  created_at_commit: abc123def4567890
  updated_at_commit: abc123def4567890
worktree:
  is_worktree: true
  name: feature-auth
  path: /home/user/project/.git/worktrees/feature-auth
  repo_root: /home/user/project
metadata:
  created_at: 2025-01-02T10:30:00Z
  updated_at: 2025-01-02T10:30:00Z
  created_by: John Doe <john@example.com>
  filename: prd-authentication-v1.md
beads:
  related_issues: []
  related_epics: []
code_references: []
priorities:
  enabled: true
  default: P2
  inference_method: ai_inference_with_review
  requirements:
    - id: FR-1
      text: "Users can authenticate with email/password"
      priority: P1
      confidence: high
      inferred_from: "core authentication feature"
      user_confirmed: true
    - id: FR-2
      text: "Users can reset password via email link"
      priority: P2
      confidence: medium
      inferred_from: "standard authentication feature"
      user_confirmed: true
---
```

## Priority Data Structure

```yaml
priorities:
  enabled: true               # Enable/disable priority system
  default: P2                  # Default priority for unspecified requirements
  inference_method: ai_inference_with_review  # How priorities are assigned
  requirements:                # Array of prioritized requirements
    - id: FR-1                 # Requirement identifier
      text: "..."              # Full requirement text
      priority: P1             # Priority level (P0-P4)
      confidence: high         # AI confidence: high/medium/low
      inferred_from: "..."     # Rationale for priority assignment
      user_confirmed: true     # Whether user confirmed this priority
```

**Priority levels:**
- **P0** - Critical: Blocking issues, security vulnerabilities, must-have features
- **P1** - High: Important features, urgent bugfixes, key functionality
- **P2** - Normal: Standard features, expected functionality (default)
- **P3** - Low: Nice-to-have features, enhancements, optimizations
- **P4** - Lowest: Backlog items, stretch goals, future considerations

## Required PRD Sections

### 1. Introduction/Overview

Briefly describe the feature and the problem it solves. State the goal.

### 2. Goals

List specific, measurable objectives for this feature.

### 3. User Stories

Detail user narratives: "As a [type of user], I want to [perform an action] so that [benefit]."

### 4. Functional Requirements

Table format with priorities derived from `priorities.requirements` in frontmatter:

| ID   | Requirement                            | Priority | Notes            |
| ---- | -------------------------------------- | -------- | ---------------- |
| FR-1 | Users can authenticate with email/pass | P1       | Core feature     |
| FR-2 | Users can reset password via email     | P2       | Standard feature |
| FR-3 | Users can enable 2FA                   | P3       | Nice-to-have     |

### 5. Non-Goals (Out of Scope)

Clearly state what this feature will NOT include to manage scope.

### 6. Assumptions

Document what is taken for granted (e.g., "User is already authenticated").

### 7. Dependencies

List features, systems, or APIs this feature relies on.

### 8. Acceptance Criteria

Detailed, testable criteria for each functional requirement.

### 9. Design Considerations (Optional)

Link to mockups, describe UI/UX requirements, mention relevant components/styles.

### 10. Technical Considerations (Optional)

Known technical constraints, dependencies, or suggestions.

### 11. Architecture Patterns

Review applicable software engineering patterns using this checklist:

**SOLID Principles:**
- [ ] Single Responsibility: Each component/service has one clear purpose
- [ ] Open/Closed: Extensible without modification
- [ ] Liskov Substitution: Implementations can substitute base types
- [ ] Interface Segregation: Clients depend only on used interfaces
- [ ] Dependency Inversion: Depend on abstractions, not concretions

**Creational Patterns:**
- [ ] Factory Pattern: Create objects without specifying exact classes
- [ ] Abstract Factory: Families of related objects
- [ ] Builder: Complex object construction

**Structural Patterns:**
- [ ] Registry Pattern: Central lookup for objects/services
- [ ] Adapter: Interface compatibility
- [ ] Decorator: Add behavior without inheritance

**Inversion of Control / Dependency Injection:**
- [ ] Constructor Injection: Dependencies via constructor
- [ ] Setter Injection: Dependencies via setters
- [ ] Service Locator: Registry-based lookup
- [ ] DI Container: Framework for automatic wiring

**When to apply:**
- Simple features: SOLID + minimal patterns
- Moderate complexity: Add Factory/Registry for extensibility
- Complex systems: Consider IoC/DI for large-scale dependency management

### 12. Risks & Mitigations

Identify potential blockers and how to address them.

### 13. Success Metrics

How success will be measured (e.g., "Increase user engagement by 10%").

### 14. Priority/Timeline

Indicate urgency or target release if known.

### 15. Open Questions

Remaining questions or areas needing further clarification.

### 16. Glossary (Optional)

Define domain-specific terms or project-specific conventions.

### 17. Changelog

Track all PRD versions:

```markdown
## Changelog

| Version | Date             | Summary of Changes                    |
| ------- | ---------------- | ------------------------------------- |
| 3       | 2025-01-03 09:15 | Clarified file upload limits          |
| 2       | 2025-01-02 14:30 | Added Admin role permissions          |
| 1       | 2025-01-02 10:30 | Initial PRD approved                  |
```

### 18. Relevant Code References

Files discovered during Codebase Context Discovery (Step 2.85):

| File Path | Lines | Purpose |
|-----------|-------|---------|
| `src/services/AuthService.ts` | 45-120 | Existing auth patterns |
| `src/types/user.ts` | 1-30 | Type definitions |

## File Naming & Location

- **Location:** `/.flow/`
- **Filename pattern:** `prd-[feature-name]-v1.md` (single file, version tracked in frontmatter)
- **Feature name:** Derived from filename (e.g., `prd-authentication-v1.md` -> `authentication`)

## Version Numbering Rules

- **New PRD:** Starts at `v1` with status `draft`
- **Changes requested during review:** Increment version (v1 -> v2), update same file
- **After approval:** Status changes from `draft` to `approved`
- **Iteration on approved PRD:** Increment version, reset status to `draft`
- **Timestamps:** Update `updated_at` and `updated_at_commit` on each version change

## Save Location Logic

```bash
# Determine target directory
if [ -n "$NEW_WORKTREE_PATH" ]; then
  TARGET_DIR="$NEW_WORKTREE_PATH/.flow"
else
  TARGET_DIR="$(git rev-parse --show-toplevel)/.flow"
fi

# Create directory if it doesn't exist
mkdir -p "$TARGET_DIR"
```

## Complexity Guidance

- **Simple features:** Concise PRD (1-2 pages), focus on core sections with basic pattern consideration
- **Complex features:** Thorough PRD (3-5 pages), include all optional sections with comprehensive architecture analysis
