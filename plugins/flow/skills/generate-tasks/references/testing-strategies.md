# Testing Strategies

## Overview

This reference details the three testing approaches available for task generation, the decision matrix for choosing the right strategy, and test-first enforcement rules.

## Sequential Testing (DEFAULT)

**When to Use:** Most projects. This is the default unless the PRD explicitly specifies otherwise.

**How it Works:**
- A Testing Strategy epic is created and blocks on ALL implementation epics
- Implementation epics complete first, then testing begins
- Simple, straightforward dependency management

**Epic Structure:**

```
Epic: Core Authentication Architecture
Epic: Authentication Endpoints
Epic: Testing Strategy [blocks: Core Authentication Architecture, Authentication Endpoints]
  Write unit tests
  Write integration tests
  Write E2E tests
```

**Result:** Testing epic will NOT appear as ready until both implementation epics are complete.

**Dependency Pattern:** Testing epic uses `blocks` on all implementation epics.

**Exception:** Testing epic does NOT block on "Setup" or "Configuration" epics. These can run in parallel or before implementation.

## Incremental Testing

**When to Use:** PRD explicitly requests tests written alongside implementation.

**How it Works:**
- For each implementation task, create a corresponding test task
- Use `related` dependencies (not blocking) between implementation and test pairs
- Implementation and its tests can be worked on in parallel or sequentially

**Epic Structure:**

```
Epic: Authentication Endpoints
  Implement login endpoint [parent-child]
  Write tests for login endpoint [parent-child] [related: login endpoint]
  Implement registration endpoint [parent-child]
  Write tests for registration endpoint [parent-child] [related: registration endpoint]
```

**Result:** Implementation and test tasks appear together in the ready list. Developer can choose to implement first, test first, or work in parallel.

**Dependency Pattern:** `related` dependencies between impl/test pairs.

## TDD Approach (Test-Driven Development)

**When to Use:** PRD explicitly requests TDD, "write tests first", or "test-driven development".

**How it Works:**
- For each implementation task, create a corresponding test task
- Use `related` dependencies (not blocking) between implementation and test pairs
- Tests are written FIRST (before implementation) and will fail initially
- Feature is implemented only when its tests pass
- Always prioritize test writing over implementation tasks

**Epic Structure:**

```
Epic: Testing Strategy [blocks: Feature Implementation, Database Schema]
  Write tests for authentication flow [parent-child]
    related: Implement authentication flow
  Write tests for database schema [parent-child]
    related: Implement database schema
```

**Behavioral Differences from Sequential/Incremental:**
- Tests appear **before** implementation (not after)
- Tests are **paired** 1:1 with implementation tasks via `related` dependencies
- Ready tasks show both implementation and test tasks together
- No implementation task begins without a corresponding test

**Quality Gate:**
- ALL tests MUST pass before any implementation task is marked complete
- Test failures MUST be fixed before continuing to next task
- No feature is considered complete without passing its tests

**Priority Assignment:**
- Test creation tasks inherit implementation task priority
- Test epics block on implementation epics using blocking dependencies

**Implementation Notes:**
- Developers write failing tests first (RED)
- Then implement to make them pass (GREEN)
- Then refactor (IMPROVE)
- Test failures should be addressed immediately

## Decision Matrix

| Approach | When to Use | Dependency Pattern | Ready Tasks Behavior |
|----------|-------------|-------------------|---------------------|
| **Sequential** | DEFAULT - most projects | Testing epic `blocks` all impl epics | Impl tasks first, then testing |
| **Incremental** | PRD requests tests alongside impl | `related` between impl/test pairs | Impl and test tasks together |
| **TDD** | PRD requests test-first workflow | `related` pairs + test epic `blocks` impl | Tests prioritized before impl |

## Choosing the Right Strategy

### Default Behavior

Use **Sequential Testing** unless the PRD explicitly specifies otherwise.

### PRD Triggers for Non-Default Strategies

When the PRD includes statements like:
- "Follow TDD approach" --> Use **TDD**
- "Write tests alongside implementation" --> Use **Incremental**
- "Test-driven development" --> Use **TDD**
- "Tests first" --> Use **TDD**
- No testing preference stated --> Use **Sequential** (default)

### Autonomous Mode

When invoked from `/flow:autonomous`, auto-detect the testing approach from the PRD content and apply without confirmation.

## Test-First Enforcement Rules (TDD Only)

When TDD is selected:

1. **No implementation without tests** - Every implementation task must have a corresponding test task
2. **Tests written before code** - Test tasks are prioritized in execution order
3. **RED-GREEN-IMPROVE cycle** - Write failing test, implement to pass, refactor
4. **Quality gate** - All tests must pass before task completion
5. **Test failures block progress** - Do not proceed to next task until tests pass

## Testing Epic as Parent Issue

Regardless of strategy, always include a "Testing Strategy" epic as one of the parent issues with comprehensive test coverage description:

- Unit tests for individual functions and components
- Integration tests for API endpoints and data flows
- E2E tests for critical user flows (where applicable)
