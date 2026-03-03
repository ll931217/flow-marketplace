# File Ownership Assignment

## Overview

When generating tasks for parallel execution, each file that will be created or modified must be assigned to exactly one task as its exclusive owner. This prevents merge conflicts and enables structured coordination via agent-teams when available.

## Ownership Assignment Algorithm

### Step 1: Map All Files

For each task in a parallel group, collect all files it will create or modify:

```
Group-1:
  Task A: src/components/LoginForm.tsx, src/styles/auth.css, src/hooks/useAuth.ts
  Task B: src/api/auth.ts, src/services/AuthService.ts, src/types/auth.ts
  Task C: tests/auth/login.test.ts, tests/auth/service.test.ts
```

### Step 2: Cluster by Proximity

Group files by directory proximity and import relationships:

| Cluster Strategy | Grouping Logic |
|-----------------|----------------|
| **Directory proximity** | Files in the same directory or parent directory |
| **Import relationships** | Files that import from each other form a cluster |
| **Layer membership** | All UI files, all API files, all test files |

### Step 3: Assign Ownership

Each cluster maps to one task's exclusive ownership boundary:

- **One owner per file** — no file appears in multiple tasks' owned-files list
- **Cluster cohesion** — files that are tightly coupled belong to the same task
- **Minimize cross-ownership dependencies** — reduce the number of read-only imports between tasks

### Step 4: Resolve Conflicts

When multiple tasks need to modify the same file:

| Conflict Type | Resolution |
|---------------|------------|
| **Shared type definitions** | Create a shared-contract file owned by the earliest dependency task |
| **Configuration files** (package.json, tsconfig.json) | Assign to the setup/infrastructure task (earliest in dependency order) |
| **Source files** | Assign to the task with the largest modification scope; other tasks get read-only access |
| **Test files** | Assign to the task that owns the corresponding source files |

### Step 5: Generate Interface Contracts

At ownership boundaries where tasks need to coordinate:

1. Identify shared types, function signatures, and API contracts
2. Create contract definitions (e.g., `src/types/feature-contract.ts`)
3. Assign contract ownership to the earliest dependency task in the group
4. All other tasks reference the contract as read-only

### Step 6: Generate Scope Boundaries

For each task, produce an explicit "do NOT modify" list:

- Files owned by other tasks in the same parallel group
- Directories owned by other tasks
- Shared contract files (unless this task is the designated owner)

## team_required Heuristic

After parallel groups are detected, score each group to determine whether structured team coordination is needed.

### Scoring Criteria

| Factor | Score | Description |
|--------|-------|-------------|
| Group size >= 3 tasks | +2 | Enough tasks to benefit from coordination overhead |
| File overlap detected (pre-resolution) | +2 | Multiple tasks initially targeting the same files |
| Cross-layer work | +1 | Tasks span UI + API + DB layers |
| Shared configuration modifications | +1 | Multiple tasks need config changes |
| Interface contracts required | +1 | Tasks need explicit integration points |

### Decision Threshold

| Total Score | team_required | Rationale |
|-------------|---------------|-----------|
| >= 4 | `true` | Significant coordination benefit justifies team overhead |
| < 4 | `false` | Simple parallel execution is sufficient |

### Storage Format

The `team_required` flag and supporting metadata are stored per parallel group in the task generation output:

```json
{
  "parallel_groups": [
    {
      "group_id": "P:Group-1",
      "team_required": true,
      "score": 5,
      "ownership_strategy": "by-layer",
      "integration_pattern": "horizontal",
      "tasks": ["FLOW-abc", "FLOW-def", "FLOW-ghi"]
    }
  ]
}
```

## Ownership Metadata Format

Each task description includes ownership metadata when `team_required` is true:

### Owned Files (Exclusive Write)

Files this task may create or modify. No other task in the same parallel group should touch these.

```
| File | Action | Description |
|------|--------|-------------|
| src/components/LoginForm.tsx | Create | New login form component |
| src/styles/auth.css | Modify | Add login form styles |
```

### Read-Only Dependencies

Files this task imports from but must NOT modify.

```
| File | Owner | Import Purpose |
|------|-------|----------------|
| src/types/auth.ts | FLOW-xxx | AuthResponse type |
| src/api/client.ts | FLOW-yyy | API client instance |
```

### Interface Contracts

Shared types and function signatures at ownership boundaries.

```typescript
// src/types/auth-contract.ts (owned by FLOW-xxx, read-only for others)
export interface AuthResponse { token: string; user: UserProfile; }
export interface LoginRequest { email: string; password: string; }
```

### Scope Boundaries

Explicit list of files and directories this task must NOT modify.

```
- src/api/auth/ — owned by FLOW-yyy (backend API task)
- tests/auth/ — owned by FLOW-zzz (testing task)
- package.json — owned by FLOW-xxx (setup task)
```

## Examples

### Small Group (team_required: false)

```
P:Group-1 (2 tasks, score: 1):
  Task A: src/components/UserProfile.tsx (create)
  Task B: src/api/profile.ts (create)

  No file overlap, simple parallel execution sufficient.
```

### Large Group (team_required: true)

```
P:Group-2 (4 tasks, score: 6):
  Task A owns: src/components/auth/ (UI layer)
  Task B owns: src/api/auth/, src/services/auth/ (API layer)
  Task C owns: src/models/auth/ (data layer)
  Task D owns: tests/auth/ (test layer)

  Shared contract: src/types/auth-contract.ts (owned by Task C)
  Cross-layer imports: Task A reads from Task B's API types
  Interface: AuthService interface defined in contract
```
