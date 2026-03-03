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

> **Autonomous mode clarification:** Autonomous mode does NOT mean "skip clarifying questions." Phase 1 is always fully interactive regardless of mode. Autonomous mode only affects behavior AFTER PRD approval: it skips intermediate confirmations ("Ready to proceed?", "Shall I continue?") in Phases 2-5 and continues execution without stopping. The plan skill handles this distinction via its `--mode=autonomous` vs `--mode=manual` approval paths.

**Actions:**

**Step 1: Critical evaluation of the feature request**

Before any planning work, critically evaluate the user's idea:
- Identify potential issues, risks, or blind spots in the request
- Suggest improvements or refinements
- Flag scope concerns (too broad, too narrow, missing edge cases)
- Offer better alternatives if they exist
- Do NOT blindly accept the request as-is

Use `AskUserQuestion` to present the analysis and proposed refinements. Proceed only after the user agrees on a direction.

**Step 2: Explore design approaches**

Propose 2-3 design approaches with trade-offs:
- Lead with the recommended approach and explain why
- Include at least one simpler alternative (YAGNI check)
- Highlight trade-offs: complexity, maintainability, performance, scope
- Apply YAGNI ruthlessly — remove unnecessary features from all approaches

Use `AskUserQuestion` to present the approaches and let the user choose a direction.

**Step 3: Invoke `/flow:plan`**

Delegate to the plan skill (`/flow:plan`) which handles the full PRD workflow:
1. Prerequisites check (git required, beads/worktrunk optional)
2. Worktree setup (detect or create isolated feature worktree)
3. Git context detection and existing PRD discovery
4. Codebase context discovery (1-3 parallel Explore agents)
5. Clarifying questions (3-5 at a time via AskUserQuestion)
6. Priority inference for requirements (P0-P4)
7. Decision engine for tech stack and architecture choices (with human review)
8. PRD generation using the structured template
9. PRD review checklist verification
10. User approval workflow
11. Save PRD to `.flow/prd-{feature}-v1.md`
12. Persist state via `flow-state.sh` with `current_phase=approved`, `prd_path`, and `prd_summary`

**Log Example:**
```
[Maestro] Phase 1: Planning (INTERACTIVE)
[Maestro]   -> Evaluating feature request...
[Maestro]   -> Suggestion: Consider X instead of Y for better maintainability
[Maestro]   -> Proposing 3 approaches...
[Maestro]   -> User selected: Approach B (middleware pattern)
[Maestro]   -> Invoking /flow:plan...
[Maestro]   -> Analyzing codebase...
[Maestro]   -> Question: Which OAuth providers should be supported?
[Maestro]   -> Decision: Tech stack - React + TypeScript (existing)
[Maestro]   -> Generating PRD...
[Maestro] OK PRD approved by user: prd-feature-v1.md
[Maestro]   -> State saved (compaction resilience)
[Maestro]   -> Proceeding to Phase 3: Task Generation...
```

**Exit:** PRD approved by user, state saved, orchestrator proceeds to Phase 3 (Task Generation).

## Phase 2-to-3 Transition: State Persistence

After PRD approval, save state before continuing:

1. Write `.flow/state/state.json` with:
   - `current_phase: "approved"`
   - `prd_path` pointing to approved PRD
   - `prd_summary` with feature_name, version, branch, requirements_count, approval_timestamp
2. Log: `[Maestro] -> State saved (compaction resilience)`
3. Continue directly to Phase 3

**Compaction Recovery:** If auto-compaction triggers between Phase 2 and Phase 3, the SessionStart hook detects `current_phase == "approved"` with `mode == "autonomous"` and auto-invokes `/flow:generate-tasks` to resume.

## Phase 3: Task Generation (AUTONOMOUS)

**Entry:** PRD approved (directly or via compaction recovery).

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
0. Invoke `/flow:generate-tasks` to execute the full task generation workflow
1. Recovery check: if entering after auto-compaction with `current_phase == "approved"`, use stored `prd_path` from persisted state
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
[Maestro]   -> State recovered (if post-compaction)
[Maestro]   -> Created 6 epics with 23 sub-tasks
[Maestro]   -> Ordered into 4 parallel groups
[Maestro] OK Tasks ready for execution
```

**Exit:** All tasks created, ordered into parallel groups, ready for implementation.

## Phase 4: Implementation (AUTONOMOUS)

**Entry:** Tasks generated and ordered.

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
0. Invoke `/flow:implement` to execute the full implementation workflow
1. Execute parallel groups using `[P:Group-X]` markers
2. For each parallel group, select execution mode:
   - **Team mode** (when `team_required` is true AND agent-teams available): TeamCreate → bridge beads↔TaskCreate → spawn team-implementers with file ownership → monitor → collect → verify → TeamDelete
   - **Standard mode** (when `team_required` is false OR agent-teams unavailable): Fire-and-forget subagent launch (current behavior)
3. Delegate to specialized subagents via Agent tool (20+ categories: frontend-developer, backend-architect, database-admin, test-automator, security-auditor, etc.)
4. Pre-invoke applicable skills (frontend-design, webapp-testing, document-skills)
5. Handle errors with smart recovery and fallbacks (including team-debugger escalation when available)
6. Create git checkpoints at safe points (phase completion, group completion)
7. Manage team state via `flow-state.sh team` commands
8. **DO NOT pause** between tasks or at phase boundaries

**Log Example:**
```
[Maestro] Phase 3: Implementation
[Maestro]   -> [P:Group-1] Executing 5 tasks in parallel...
[Maestro]       -> Task dotfiles-xxx: frontend-developer implementing UI
[Maestro]       -> Task dotfiles-yyy: backend-architect designing API
[Maestro] OK Checkpoint: git commit -m "feat: Phase 1 complete"
[Maestro]   -> [P:Group-2] Executing 4 tasks...
```

**Exit:** All tasks completed, all checkpoints committed, team state cleared.

## Phase 4.5: Review (AUTONOMOUS)

**Entry:** All implementation tasks completed.

**Mode:** AUTONOMOUS - no human interaction.

**Actions:**
1. Invoke `/flow:review` to run multi-dimensional code review
2. Determine changed files from implementation (git diff)
3. Select 2-4 review dimensions based on file types
4. Execute review:
   - **Team mode** (agent-teams available): TeamCreate → spawn team-reviewers (one per dimension) → collect findings → TeamDelete
   - **Standard mode** (no agent-teams): Sequential single-agent review per dimension
5. Consolidate findings: deduplicate, calibrate severity
6. Auto-fix Critical and High severity findings
7. Run tests after each auto-fix to prevent regressions
8. Generate consolidated review report
9. Update flow state: `flow-state.sh phase review`

**Log Example:**
```
[Maestro] Phase 3.5: Review
[Maestro]   -> Reviewing 15 files across 3 dimensions (security, performance, architecture)
[Maestro]   -> 3 team-reviewers completed
[Maestro]   -> Findings: 0C / 2H / 5M / 3L
[Maestro]   -> Auto-fixed: 1 of 2 fixable High issues
[Maestro] OK Review complete
```

**Exit:** Review report generated, fixable findings remediated.

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
