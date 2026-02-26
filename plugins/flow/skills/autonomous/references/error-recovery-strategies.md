# Error Recovery Strategies

Smart error recovery for autonomous execution, including classification, recovery strategies, retry logic, and rollback procedures.

## Error Classification

Errors are classified into four categories, each mapping to a specific recovery strategy:

| Category | Examples | Strategy |
|----------|----------|----------|
| Transient | Network timeout, rate limit, temporary file lock | Retry with backoff |
| Implementation | Test failure, type error, lint violation | Alternative approach |
| Critical | Git conflict, corrupted state, missing dependency | Rollback to checkpoint |
| Ambiguous | Conflicting requirements, unclear specification | Request human input |

## Recovery Matrix

```
Error Detected
  |
  v
Classify Error
  |
  +-- Transient ---------> Retry with Backoff (max 3 attempts)
  |                           |
  |                           +-- Success -> Continue
  |                           +-- Exhausted -> Escalate to Implementation
  |
  +-- Implementation ----> Alternative Approach
  |                           |
  |                           +-- Success -> Continue
  |                           +-- Exhausted -> Escalate to Critical
  |
  +-- Critical ----------> Rollback to Checkpoint
  |                           |
  |                           +-- Success -> Retry from checkpoint
  |                           +-- Exhausted -> Halt and Report
  |
  +-- Ambiguous ---------> Request Human Input (last resort)
                              |
                              +-- Input received -> Continue
                              +-- No response -> Halt and Report
```

## Strategy 1: Retry with Backoff

For transient errors that may resolve on their own.

**Configuration:**
- `max_retry_attempts`: 3 (default)
- `backoff_multiplier`: 2 (default)

**Behavior:**
1. First retry: immediate
2. Second retry: 2 second delay
3. Third retry: 4 second delay
4. If all retries fail: escalate to alternative approach

**Applies to:**
- Network timeouts
- Rate limiting responses
- Temporary file locks
- Subprocess failures

**Log Example:**
```
[Maestro] Error: Network timeout fetching dependency
[Maestro]   -> Strategy: retry_with_backoff (attempt 1/3)
[Maestro]   -> Retrying...
[Maestro] OK Retry succeeded
```

## Strategy 2: Alternative Approach

For implementation failures where a different approach may succeed.

**Behavior:**
1. Analyze the failure to determine root cause
2. Identify an alternative implementation approach
3. Attempt the alternative
4. If the alternative also fails: escalate to rollback

**Applies to:**
- Test failures (re-analyze, fix test fixture or implementation)
- Type errors (adjust types, use different pattern)
- Lint violations (auto-fix where possible)
- Build failures (adjust configuration, dependencies)

**Log Example:**
```
[Maestro] Error in task dotfiles-xxx: Test failure
[Maestro]   -> Classifying error... test_failure
[Maestro]   -> Strategy: alternative_approach
[Maestro]   -> Attempting: Re-run tests with verbose output
[Maestro]   -> Fixed: Test fixture issue
[Maestro] OK Task completed
```

## Strategy 3: Rollback to Checkpoint

For critical failures that require reverting to a known good state.

**Behavior:**
1. Identify the most recent git checkpoint
2. Rollback to that checkpoint via `git checkout <checkpoint-sha>`
3. Log the rollback action
4. Retry the failed phase from the checkpoint
5. If retry also fails: halt and report to user

**Applies to:**
- Git conflicts that cannot be auto-resolved
- Corrupted session state
- Missing critical dependencies
- Irrecoverable build state

**Checkpoint locations:**
```
.flow/maestro/sessions/<session-id>/checkpoints.json
```

**Log Example:**
```
[Maestro] Critical error: Git merge conflict in src/auth.ts
[Maestro]   -> Strategy: rollback_to_checkpoint
[Maestro]   -> Rolling back to checkpoint: abc123
[Maestro]   -> Retrying from checkpoint...
```

## Strategy 4: Request Human Input

Last resort when autonomous recovery is not possible.

**Behavior:**
1. Log the full error context
2. Present the error to the user with:
   - What was being attempted
   - What went wrong
   - What recovery options were tried
   - What information is needed to proceed
3. Wait for human response
4. Resume execution with provided input

**Applies to:**
- Requirements that contradict the approved PRD
- Specifications that are genuinely ambiguous
- Errors that exhaust all other recovery strategies

**Configuration:**
- `request_human_on_ambiguous: false` (default) - stay autonomous, use best guess
- `request_human_on_ambiguous: true` - pause and ask

## Human Override Triggers

Even in autonomous mode, execution MUST halt and report to the user when:

1. **All recovery strategies exhausted** for a critical error
2. **Resource limits exceeded** (context window, max iterations, max task duration)
3. **Conflicting specifications** discovered that were not in the approved PRD
4. **Security concerns** detected (credentials in code, known vulnerabilities introduced)
5. **Data loss risk** (destructive operations without confirmed rollback path)

## Non-Critical vs Critical Classification

### Non-Critical (continue execution)

- Single test failure (fixable)
- Lint warnings (auto-fixable)
- Minor type mismatches (adjustable)
- Missing optional dependency (skippable)

### Critical (may halt execution)

- All tests failing after 3 retry iterations
- Git state corruption
- Missing required dependency with no alternative
- Build completely broken with no fix path
- Security vulnerability introduced

## Iterative Recovery

Validation failures trigger an iterative refinement loop:

```
max_iterations: 3

Iteration 1:
  -> Identify failing gates
  -> Fix issues
  -> Re-run validation
  -> Check: all gates pass?

Iteration 2 (if needed):
  -> Re-identify remaining failures
  -> Try alternative fixes
  -> Re-run validation
  -> Check: all gates pass?

Iteration 3 (if needed):
  -> Final attempt
  -> If still failing: halt and report
```

## Session Recovery

If Maestro is interrupted entirely (process killed, crash):

1. Check `.flow/maestro/sessions/<session-id>/metadata.json` for last status
2. Check `$TMPDIR/flow-marketplace/state.json` for phase state
3. Check `checkpoints.json` for available rollback points
4. Resume from the last successful checkpoint
