# Dependency Analysis

## Overview

This reference details how to analyze file-level conflicts between tasks, assign dependency types, detect parallel execution opportunities, and construct the dependency graph.

## Dependency Types

| Type | Meaning | Usage |
|------|---------|-------|
| `blocks` | Task B must complete before Task A can start | Same-file modifications |
| `parent-child` | Hierarchical relationship (epic to task) | Epic/sub-task structure |
| `related` | Soft connection, informational only | Related but independent tasks |

## Phase 3: Intelligent Parallel Issue Analysis

### Phase 3a: File Dependency Analysis

For each sub-task, catalog the files it will create or modify using the relevant files discovered during Context Discovery (Step 4.5):

- Files already identified during Context Discovery
- Additional files for new features or modifications
- Include line ranges where possible for precision

### Phase 3b: Conflict Detection

Analyze the file dependency map to identify sub-tasks that modify the same files.

**File Conflict Rules:**

| Scenario | Dependency |
|----------|-----------|
| Sub-tasks modify the **same source files** | Add `blocks` dependency |
| Sub-tasks modify **different files** | No blocking dependency (can run in parallel) |
| Test files vs source files | Considered **separate** for conflict purposes |
| Configuration files (package.json, tsconfig.json, etc.) modified by multiple tasks | Add `blocks` dependency |
| Shared utility files modified by multiple tasks | Add `blocks` dependency |

### Phase 3c: Dependency Assignment

Based on conflict detection results:

- **No file conflicts** between tasks = can run in parallel (no blocking dependency)
- **File conflicts** detected = add blocking dependency (`blocks`)
- **Soft connections** between related tasks = use `related` type

## Parallel Group Detection

Tasks that can execute simultaneously are grouped using the `P:Group-X` format:

```
P:Group-1 (no dependencies between these):
  - Implement user model
  - Implement product model
  - Create utility helpers

P:Group-2 (depends on Group-1):
  - Implement user API endpoints (depends on user model)
  - Implement product API endpoints (depends on product model)

P:Group-3 (depends on Group-2):
  - Write integration tests (depends on all endpoints)
```

## Dependency Graph Construction

### With Beads

```bash
# Add blocking dependency
bd add-depends-on <task-id> <blocker-id>

# Add related (soft) dependency
bd add-related <task-id> <related-id>

# View ready tasks (no unresolved blockers)
bd ready
```

### Without Beads (TodoWrite Fallback)

- Note dependencies in task descriptions: "Depends on: [task name]"
- Manual ordering required when executing tasks
- No automatic "ready" task detection

## Example Dependency Tree

```
Epic: User Authentication System
  Implement login endpoint [parent-child]
  Implement registration endpoint [parent-child]
    blocked by: Implement login endpoint [blocks]
  Add password hashing utility [parent-child]
  Write authentication tests [parent-child]
    blocked by: Implement login endpoint [blocks]
    blocked by: Implement registration endpoint [blocks]
```

## Dependency Validation

After constructing the dependency graph:

1. Verify no circular dependencies exist
2. Confirm all `blocks` relationships correspond to actual file conflicts
3. Ensure `related` dependencies are informational only (not blocking)
4. Check that the Testing Strategy epic blocks on all implementation epics (Sequential Testing default)
5. Validate that setup/configuration epics have no unnecessary blockers

## Special Cases

### Testing Epic Dependencies (Sequential Testing Default)

The Testing Strategy epic should block on ALL core implementation epics:

```
Epic: Testing Strategy [blocks: Core Architecture, Feature Implementation]
  Write unit tests
  Write integration tests
  Write E2E tests
```

**Exception:** Testing epic does NOT block on "Setup" or "Configuration" epics. These can run in parallel or before implementation.

### Configuration File Conflicts

When multiple tasks modify shared configuration files (package.json, tsconfig.json, .env, etc.), they must have blocking dependencies to prevent merge conflicts:

```
Task A: Add auth dependencies to package.json [blocks]
Task B: Add UI dependencies to package.json
  blocked by: Task A
```
