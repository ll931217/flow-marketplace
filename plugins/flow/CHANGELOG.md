# Changelog

## [2.1.0]

### Fixed
- **Autonomous orchestrator phases**: Restored explicit `/flow:plan`, `/flow:generate-tasks`, and `/flow:implement` skill invocations in Phase 1-3 descriptions that were lost during skills migration
- **Phase 1 brainstorming**: Added critical evaluation and approach exploration steps before PRD generation so the AI provides constructive criticism and proposes alternatives
- **Autonomous mode clarification**: Documented that autonomous mode skips intermediate confirmations in later phases, NOT clarifying questions during planning

## [2.0.0]

### Added
- **Agent-teams integration:** Structured multi-agent coordination for parallel execution when agent-teams plugin is available
- **Agent-teams detection protocol** (`shared/references/agent-teams-detection.md`): Three-step detection (env var, skill availability, agent types) with fallback behavior table
- **File ownership assignment** (`generate-tasks/references/file-ownership-assignment.md`): Ownership algorithm (map → cluster → assign → resolve → contracts) with `team_required` heuristic scoring
- **Team-based execution** (`implement/references/team-execution.md`): Full team lifecycle (TeamCreate → bridge → spawn → monitor → collect → verify → TeamDelete) with beads↔TaskCreate bridge protocol
- **Team-debugger escalation** in error recovery: Hypothesis-driven parallel debugging for persistent multi-file failures (3+ retry threshold)
- **Review phase** (`/flow:review`): Multi-dimensional code review (security, performance, architecture, testing, accessibility) with parallel team-reviewers and auto-fix for Critical/High findings
- **Team state management** in `flow-state.sh`: New `team` subcommand (init, map, complete, clear) for tracking active teams during execution
- **Phase 3.5 (Review)** in autonomous workflow between Implementation and Validation

### Changed
- **Task generation** now produces file ownership metadata (owned files, read-only deps, interface contracts, scope boundaries) when `team_required` is true
- **Dependency analysis** includes team coordination assessment with scoring heuristic and ownership strategy selection
- **Parallel execution** conditionally selects team mode vs standard mode per group
- **Subagent delegation** overrides to `agent-teams:team-implementer` in team mode with structured prompt template
- **State schema** extended with `team_state` object and `review` phase
- **SessionStart hook** recovers active team state after compaction
- **Autonomous orchestrator** includes review phase and team state management in initialization/cleanup
