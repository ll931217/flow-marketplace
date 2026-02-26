# Phase Workflow

Detailed description of each Maestro phase, including entry conditions, actions, logging format, and state transitions.

## Logging Format

All Maestro output uses the `[Maestro]` prefix:

```
[Maestro] Phase N: {phase_name}
[Maestro]   -> {action_description}
[Maestro]   -> {action_description}
[Maestro] OK {completion_status}
```

## Phase 1: Initialization

**Entry:** Command invoked with a feature request.

**Actions:**
1. Generate unique session ID
2. Create session directory at `.flow/maestro/sessions/<session-id>/`
3. Initialize session metadata (metadata.json)
4. Create git checkpoint before starting
5. Load config from `.flow/maestro/config.yaml`

**Log Example:**
```
[Maestro] Phase 0: Initialization
[Maestro]   -> Session created: <session-id>
[Maestro]   -> Git checkpoint: <initial-commit-sha>
[Maestro]   -> Config loaded
```

**Exit:** Session directory exists, metadata initialized, checkpoint created.

## Phase 2: Planning (INTERACTIVE)

**Entry:** Session initialized.

**Mode:** INTERACTIVE - human input required.

**Actions:**
1. Auto-discover codebase context (languages, frameworks, patterns)
2. Ask clarifying questions via AskUserQuestion for:
   - Ambiguous requirements
   - Multiple valid approaches where user preference matters
   - Missing information
   - Conflicting specifications
3. Invoke decision engine for tech stack and architecture choices (with human review)
4. Generate PRD with gathered requirements
5. Wait for user approval of the PRD
6. Save PRD to `.flow/prd-{feature}-v1.md`
7. Log all decisions with rationale to `decisions.json`

**Log Example:**
```
[Maestro] Phase 1: Planning (INTERACTIVE)
[Maestro]   -> Analyzing codebase...
[Maestro]   -> Question: Which OAuth providers should be supported?
[Maestro]   -> Decision: Tech stack - React + TypeScript (existing)
[Maestro]   -> Decision: Architecture - Service layer pattern
[Maestro]   -> Generating PRD...
[Maestro] OK PRD approved by user: prd-feature-v1.md
[Maestro]   -> Switching to autonomous mode for remaining phases...
```

**Exit:** PRD approved by user, state saved, autonomous mode activated.

## Phase 2-to-3 Transition: State Persistence

After PRD approval, save state before continuing:

1. Write `$TMPDIR/flow-marketplace/state.json` with:
   - `current_phase: "approved"`
   - `prd_path` pointing to approved PRD
   - `prd_summary` with feature_name, version, branch, requirements_count, approval_timestamp
2. Log: `[Maestro] -> State saved to TMPDIR (compaction resilience)`
3. Continue directly to Phase 3

**Compaction Recovery:** If auto-compaction triggers between Phase 2 and Phase 3, the SessionStart hook detects `current_phase == "approved"` with `mode == "autonomous"` and auto-invokes `/flow:generate-tasks` to resume.

## Phase 3: Task Generation (AUTONOMOUS)

**Entry:** PRD approved (directly or via compaction recovery).

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
1. Recovery check: if entering after auto-compaction with `current_phase == "approved"`, use stored `prd_path` from TMPDIR state
2. Read the approved PRD and parse requirements
3. Generate 5-7 high-level epics based on requirements
4. Generate detailed sub-tasks with dependencies
5. **SKIP** the "Wait for Go" checkpoint - proceed directly
6. Assign priorities based on PRD frontmatter
7. Order tasks for optimal parallel execution using the decision engine
8. Create tasks in beads (or TodoWrite fallback)
9. Update PRD frontmatter with related_issues

**Log Example:**
```
[Maestro] Phase 2: Task Generation
[Maestro]   -> State recovered from TMPDIR (if post-compaction)
[Maestro]   -> Created 6 epics with 23 sub-tasks
[Maestro]   -> Ordered into 4 parallel groups
[Maestro] OK Tasks ready for execution
```

**Exit:** All tasks created, ordered into parallel groups, ready for implementation.

## Phase 4: Implementation (AUTONOMOUS)

**Entry:** Tasks generated and ordered.

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
1. Execute parallel groups using `[P:Group-X]` markers
2. Delegate to specialized subagents via Task tool (20+ categories: frontend-developer, backend-architect, database-admin, test-automator, security-auditor, etc.)
3. Pre-invoke applicable skills (frontend-design, webapp-testing, document-skills)
4. Handle errors with smart recovery and fallbacks
5. Create git checkpoints at safe points (phase completion, group completion)
6. **DO NOT pause** between tasks or at phase boundaries

**Log Example:**
```
[Maestro] Phase 3: Implementation
[Maestro]   -> [P:Group-1] Executing 5 tasks in parallel...
[Maestro]       -> Task dotfiles-xxx: frontend-developer implementing UI
[Maestro]       -> Task dotfiles-yyy: backend-architect designing API
[Maestro] OK Checkpoint: git commit -m "feat: Phase 1 complete"
[Maestro]   -> [P:Group-2] Executing 4 tasks...
```

**Exit:** All tasks completed, all checkpoints committed.

## Phase 5: Validation (AUTONOMOUS)

**Entry:** All implementation tasks completed.

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
1. Run the full test suite
2. Validate all PRD requirements are met
3. Run quality gates: lint, typecheck, security audit
4. If any gate fails, attempt auto-recovery:
   - Fix linting errors automatically
   - Fix type errors
   - Fix test failures
   - Retry up to 3 times (configurable via `max_iterations`)
5. Only pause if ALL recovery strategies are exhausted

**Iterative Refinement Loop:**
```
Iteration N:
  -> Plan: Identify failing gate
  -> Implement: Fix the issues
  -> Validate: Re-run gates
  -> Review: Check completion criteria
```

**Completion Criteria:**
- All tests passing
- All PRD requirements met
- All quality gates passed
- No critical issues remaining

**Log Example:**
```
[Maestro] Phase 4: Validation
[Maestro]   -> Running test suite... 127/127 tests passed
[Maestro]   -> Validating PRD requirements... all 8 met
[Maestro]   -> Quality gates... lint OK, type-check OK, security OK
```

**Exit:** All validation criteria met or max iterations reached.

## Phase 6: Handoff

**Entry:** Validation complete.

**Actions:**
1. Generate comprehensive implementation report to `.flow/maestro/sessions/<session-id>/final-report.md`
2. Create final git checkpoint for the complete feature
3. Run `/flow:cleanup` to finalize
4. Update PRD status to `implemented`
5. Present final report to user

**Log Example:**
```
[Maestro] Phase 5: Handoff
[Maestro]   -> Generating implementation report...
[Maestro] OK Autonomous implementation complete!
[Maestro]   -> Report: .flow/maestro/sessions/<session-id>/final-report.md
```

**Exit:** Report presented, session complete.

## Execution Termination

Execution continues until one of:
- All tasks complete successfully
- Critical error with no recovery options
- Resource limits exceeded (context window, max iterations)
