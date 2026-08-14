# Changelog

## [2.6.0]

### Added
- **`flow:slave-away` skill**: unattended backlog grinder. Where `flow:autonomous`
  starts from a feature idea and ends when that feature ships, slave-away starts from
  whatever is open in `bd` and ends when the queue is drained. Per iteration it picks
  the next ready bead, enriches thin beads until they are self-sufficient (writing the
  found context back into the bead rather than asking the user), implements TDD-first,
  runs the repo's real gates, commits one reviewable unit per bead, and closes it.
  Work the agent discovers mid-run is filed as a linked bead and joins the same queue,
  so the loop is not bounded by what a human filed.
  - Runs in its own `wt`/git worktree; commits per bead; never pushes
  - Destructive and outward-facing actions (push, MR, prod DB, deploy, secrets, shared
    env mutation) are forbidden and instead recorded as deferred actions, presented at
    the top of the final report as copy-pasteable commands with why/effect/verify
  - Circuit breakers (per-bead attempts, consecutive failures, iterations, wall clock,
    no-progress ticks) so an unattended run can lose honestly instead of spinning
  - Run state on disk (`.flow/slave-away/<run-id>/`) so `/loop` re-entry survives
    compaction and session death
  - `scripts/slave-away.sh` owns the non-judgment state: queue reads, terminal
    condition, attempt counts, journal, deferred records, report rendering. Fails loud
    on any `bd` error so a broken database can never be read as an empty queue
  - `log --type=closed` requires `--discovered=<ids|none>` — the discovery checklist is
    enforced by the script rather than asked for in prose, because benchmarking showed
    prose-only checklists are skipped 100% of the time
  - `evals/` ships the benchmark harness: `make_fixture.sh` builds a sandbox repo with a
    seeded beads queue containing four traps (well-specified bead, empty-description
    bead, production-DB bead, undecidable bead) plus a bare git remote that proves
    nothing was pushed; `grade.py` scores 14 assertions mechanically
- `flow:dispatch` routes backlog/queue-draining prompts to `flow:slave-away`

## [2.5.0]

### Added
- `.claude-plugin/plugin.json` manifest - flow previously had none; it is the
  plugin spec's version authority and is now auto-synced by the repo's
  version-bump hook
- `flow:dispatch` routes plan/design/PRD review requests to `ai-review`
  (previously absent from the routing table despite keyword overlap with
  `flow:review`)

### Changed
- **Stop-hook completion gate**: bash `verify-completion.sh` replaced by a
  native prompt-type Stop hook. The old gate accepted any
  `FLOW_DONE::<anything>` string, reducing it to a magic-string check; the
  prompt hook applies the same criteria (implementation detected, verified
  completion, explicit pause, subagent skip) as an actual judgment
- **decision-engine**: rewritten prompt-only - the documented helper scripts
  (`analyze_dependencies.py`, `detect_patterns.py`, `parse_beads_deps.py`)
  never existed; context gathering now uses standard tools (dependency
  manifests, grep, `bd dep tree`)
- TodoWrite fallback references replaced with the native task tools
  (TaskCreate/TaskUpdate/TaskList) across 9 skill files
- `ai-review` paths fixed from the pre-plugin `~/.agents/skills/` layout to
  `${FLOW_PLUGIN_ROOT}`

### Fixed
- pre/postcompact hooks degrade loudly instead of crashing when `jq` is missing
- `flow-state.sh` temp files cleaned via RETURN trap when jq fails mid-update

## [2.4.0]

### Added
- **`flow:summary` skill**: Full implementation for displaying current feature implementation summary. Supports PRD discovery, beads integration, TodoWrite fallback, progress tracking (X/Y tasks, grouped by epic), and multi-worktree support.

### Changed
- **Skill descriptions**: Enhanced all flow skill descriptions (autonomous, plan, generate-tasks, implement, review, cleanup) to be more "pushy" for better triggering, following skill-creator recommendations.
- **Quick Reference sections**: Added Quick Reference sections to all flow skills containing user-facing info from corresponding command files.
- **Commands folder eliminated**: Removed `commands/` folder - skills are now the single source of truth. All user-facing quick-reference information is integrated into each skill.

### Removed
- **`commands/` folder**: Deleted redundant command files (autonomous.md, cleanup.md, generate-tasks.md, implement.md, plan.md, review.md, summary.md). All information merged into corresponding skills.

## [2.3.0]

### Added
- **`flow:dispatch` skill**: Smart skill router that auto-invokes the right skill based on prompt intent and current project state. Analyzes PRD status, beads task count, and flow phase to route to `flow:plan`, `flow:generate-tasks`, `flow:implement`, `flow:review`, `flow:cleanup`, or `flow:autonomous`. Also detects non-flow skills (`decision-engine`, `systematic-debugging`, `taste`, `tdd-workflow`, `security-review`, `gh:create-commit`) when no flow workflow step applies. Fires at the start of any action-oriented task, silently invoking the correct skill without interruption.

## [2.2.0]

### Fixed
- **Stop hook LLM cache compatibility**: Generate per-attempt nonce in verify-completion hook to bust LLM proxy caches (e.g. LiteLLM Gateway). Accept either session UUID or nonce as valid done signal, preventing infinite block loops from cached responses
- **Stop hook default MAX**: Changed `FLOW_VERIFY_MAX` default from 0 (infinite) to 5, ensuring an escape hatch even when the agent fails to emit the done signal

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
