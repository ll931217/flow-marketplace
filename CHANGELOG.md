# Changelog

All notable changes to the Flow Marketplace will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-18

### Added

#### Flow Plugin
- `/flow:plan` command for generating Product Requirements Documents
- `/flow:generate-tasks` command for PRD-to-tasks conversion with beads integration
- `/flow:implement` command for task list management with parallel agent delegation
- `/flow:autonomous` command for full autonomous workflow orchestration
- `/flow:cleanup` command for post-implementation cleanup
- `/flow:summary` command for feature implementation summary
- `/flow:README` command for comprehensive documentation
- Decision-engine skill for autonomous technical decision making
- Subagent type mapping system for intelligent agent selection
- Shared protocols (PRD discovery, change management, TDD principles, auto-compaction)
- Shared templates (ask-user-questions, beads-warning)
- Shared examples (session-implement, session-cleanup, testing-strategies)

#### Semantic Memory Plugin
- MCP server for semantic code search using PostgreSQL + pgvector
- `semantic_search` tool for natural language code search
- `index_project` tool for codebase indexing
- `get_project_status` tool for indexing status queries
- `delete_project` tool for project management
- `list_projects` tool for listing all indexed projects
- Python embedding script using sentence-transformers
- `index-codebase.sh` shell script for easy codebase indexing
- Support for multiple programming languages (.ts, .js, .py, .go, .rs, .java, etc.)
- Efficient chunking strategy for large files
- HNSW vector indexing for fast similarity search
- Project isolation by absolute path

#### Infrastructure
- Marketplace manifest (`.claude-plugin/marketplace.json`)
- Plugin manifests for both Flow and Semantic Memory
- TypeScript MCP server implementation
- PostgreSQL database schema with pgvector support
- Node.js package configuration
- Comprehensive documentation (README.md)

### Dependencies

#### Runtime (Flow Plugin)
- None required
- Optional: beads (issue tracking)
- Optional: worktrunk (git worktree management)

#### Runtime (Semantic Memory Plugin)
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Python 3.10+ with sentence-transformers

#### Development
- TypeScript 5+
- @modelcontextprotocol/sdk 1.0.4
- pg 8.13.1
- pg-vector 0.1.7

---

## [1.0.1] - 2025-01-20

### Changed

#### Semantic Memory Plugin
- Added `.mcp.json` configuration file for proper MCP server specification
- Added automatic install script (`scripts/install.sh`) that runs on plugin installation
- Installation now automatically builds TypeScript server and installs npm dependencies
- Updated marketplace.json with `installScript` and `mcpConfig` references
- Paths now use `{pluginRoot}` and `{env:VAR:-default}` template placeholders
- Enhanced dependency information with `setupInstructions` arrays
- Tools are now properly documented with descriptions in marketplace.json

### Fixed

- Fixed missing `.mcp.json` file for semantic-memory plugin
- Fixed manual installation process - now fully automatic via `/plugin install`
- Fixed path resolution for MCP server entry point

---

## [1.1.0] - 2026-02-26

### Changed

#### Flow Plugin - Skills-Based Architecture Migration
- **BREAKING:** Commands converted to thin wrappers (~20 lines each), down from 700-1,334 lines
- Migrated all workflow logic to skills with on-demand reference loading (72-84% context savings)
- Created 5 new skills with SKILL.md + references: plan, generate-tasks, implement, autonomous, cleanup
- Created 22 reference documents across skill directories for on-demand loading
- Created shared `autonomous-mode.md` reference (replaces duplicated detection block across 4 commands)

### Added

#### Flow Plugin
- `skills/plan/SKILL.md` + 4 references (prerequisites, worktree-setup, clarifying-questions, prd-template)
- `skills/generate-tasks/SKILL.md` + 5 references (task-generation-process, dependency-analysis, testing-strategies, subagent-type-detection, context-discovery)
- `skills/implement/SKILL.md` + 4 references (task-execution-loop, parallel-execution, subagent-delegation, error-recovery)
- `skills/autonomous/SKILL.md` + 5 references (phase-workflow, decision-engine-usage, error-recovery-strategies, report-format, configuration)
- `skills/cleanup/SKILL.md` + 4 references (worktree-merge, test-verification, commit-format, documentation-generation)
- `skills/shared/references/autonomous-mode.md` - Shared autonomous mode detection protocol
- SessionStart `*` hook for silent PRD auto-discovery based on git context
- Stop `*` hook for persisting flow state on session exit
- Enhanced PreCompact hook to preserve PRD discovery context

### Removed

#### Flow Plugin
- Deleted `commands/shared/protocols/` directory (5 files) — canonical copies now in `skills/shared/references/`

### Fixed
- Eliminated protocol duplication between `commands/shared/protocols/` and `skills/shared/references/`

## [1.0.5] - 2026-02-26

### Fixed

#### Flow Plugin
- **Stop Hook:** Converted from `type: "prompt"` to `type: "command"` with shell script (`persist-state.sh`)
- Resolved "JSON validation failed" error on session exit
- Stop hook now reliably persists flow state (last_session_exit timestamp) using deterministic shell script
- Improved reliability: prompt hooks during Stop have limited tool access; command hooks execute consistently

## [1.1.1] - 2026-03-02

### Fixed

#### Flow Plugin
- **Stop Hook:** `verify-completion.sh` now skips when no implementation occurred during the session
- Added implementation detection gate: checks flow state phase (`implement`, `cleanup`, `generate-tasks`) and transcript for file-modifying tool calls (`Write`, `Edit`, `NotebookEdit`)
- Sessions with only questions or research no longer trigger the completion verification blocker

## [1.1.2] - 2026-03-03

### Fixed

#### Flow Plugin
- **Stop Hooks:** Fixed JSON output format — was using PreToolUse schema (`hookSpecificOutput`/`permissionDecision`) instead of Stop schema (`decision`/`reason`)
- `verify-completion.sh`: block output now returns `{ "decision": "block", "reason": "..." }` instead of `{ "hookSpecificOutput": { "permissionDecision": "deny" } }`
- `verify-completion.sh`: allow output now returns `{ "decision": "approve" }` instead of `{ "continue": true }`
- `persist-state.sh`: output now returns `{ "decision": "approve" }` instead of `{ "continue": true, "suppressOutput": true }`

### Changed

#### Flow Plugin
- **SessionStart:startup hook:** Converted from `type: "prompt"` to `type: "command"` with `check-pending-state.sh` — eliminates LLM call on every startup for a deterministic file check

## [Unreleased]

### Planned Features
- Hybrid search combining semantic and keyword search
- Code-aware chunking (function/class level)
- Multi-language support for embeddings
- Web UI for exploring indexed projects
- Integration with Flow autonomous mode
- Incremental indexing for changed files only
- Code graph relationships (call graph, dependency graph)

---

[1.0.0]: https://github.com/flow-community/flow-marketplace/releases/tag/v1.0.0
