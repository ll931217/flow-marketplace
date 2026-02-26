# Context Discovery

## Overview

This reference details how to discover relevant source files for each epic and sub-task, reducing token usage during implementation by providing precise file paths and line ranges.

## Purpose

- Enable `/flow:implement` to read only specific line ranges instead of entire files
- Reduce token usage by ~70% for typical implementations
- Provide clear guidance on what code to review
- Help agents understand codebase patterns quickly

## Discovery Process

### Step 1: Launch Explore Agents

Launch 1-2 parallel explore agents for each epic/sub-task:

**Agent 1: Feature-Related Files**

Explore the codebase to find files relevant to the task description.

Search for:
1. Existing implementations of similar functionality
2. Configuration files (schemas, types, routes)
3. Service layer patterns
4. Utilities and helpers

For each relevant file found, report:
- File path (relative to repo root)
- Specific line ranges (e.g., "45-120" for a function)
- Why it is relevant to this task

Use medium thoroughness.

**Agent 2: Test Patterns** (optional, skip for test-related tasks)

Find testing patterns relevant to the feature type.

Locate:
1. Test files for similar features
2. Test utilities and fixtures
3. Mock or stub patterns

Report with file paths, line ranges, and relevance.
Use quick thoroughness.

### Step 2: Organize Findings Per Task

Create a mapping for each epic/sub-task:

```
proj-auth.1: Implement login endpoint
  relevant_files:
    - src/api/routes.ts:45-80 (existing route patterns)
    - src/services/AuthService.ts:1-50 (auth interface to follow)
    - src/types/user.ts:10-30 (User type definitions)
    - tests/auth.test.ts:1-40 (test patterns to follow)
```

### Step 3: Store in Issue Description

Add a "Relevant Files" section to each issue description:

```markdown
### Relevant Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/api/routes.ts` | 45-80 | Existing route patterns to follow |
| `src/services/AuthService.ts` | 1-50 | Auth service interface |
| `src/types/user.ts` | 10-30 | User type definitions |
| `tests/auth.test.ts` | 1-40 | Test patterns |
```

## Helper Function: extract_relevant_files

Pseudocode for the AI agent:

```
extract_relevant_files(task_description, codebase_context):
  results = []

  # Use explore agent to find files
  explore(task_description) -> files_found

  # For each file, identify relevant sections
  for file in files_found:
    if has_specific_function(file):
      results.append({
        path: file,
        lines: find_function_range(file, function_name),
        reason: "Contains pattern to follow"
      })
    else:
      results.append({
        path: file,
        lines: "1-50",  # First 50 lines as preview
        reason: "General context"
      })

  return results
```

## Fallback Strategies

| Scenario | Fallback |
|----------|----------|
| Line numbers unknown | Use `1-50` (first 50 lines) or search by function name |
| New file type | Note "New file, no existing reference" |
| Multiple relevant sections in one file | List multiple entries with different line ranges |
| No relevant files found (new feature area) | Use `No existing files found (new feature area)` |

## Storage Strategy

- Store **file paths** and **line ranges** (never full file contents)
- The implement command will use these to read selective sections
- If line numbers may shift, store function/class names as anchors instead
- Keep line ranges focused (50-100 lines max per entry)

## Context Notes

Include additional context about file structure and patterns in a "Context Notes" section:

```markdown
### Context Notes
- Follow existing middleware pattern in src/middleware/
- Use service-layer architecture (see AuthService as reference)
- Test fixtures are in tests/fixtures/
```
