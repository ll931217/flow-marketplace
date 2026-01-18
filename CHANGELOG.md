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
