# Flow Marketplace

[![CI](https://github.com/flow-community/flow-marketplace/workflows/CI/badge.svg)](https://github.com/flow-community/flow-marketplace/actions/workflows/ci.yml)
[![Release](https://github.com/flow-community/flow-marketplace/workflows/Release/badge.svg)](https://github.com/flow-community/flow-marketplace/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Compatible-blue)](https://claude.ai/code)
[![MCP](https://img.shields.io/badge/MCP-Compatible-green)](https://modelcontextprotocol.io)

Claude Code Plugin Marketplace hosting the **Flow** workflow system and **Semantic Memory** MCP server.

## Overview

This marketplace provides two powerful plugins for Claude Code:

### 1. Flow Plugin

Complete PRD-based workflow system with autonomous orchestration for Claude Code. Flow provides a structured approach to software development using Product Requirements Documents (PRDs), task generation, autonomous implementation, and cleanup workflows.

**Features:**

- `/flow:plan` - Generate Product Requirements Documents
- `/flow:generate-tasks` - Generate implementation tasks from PRDs (beads-based)
- `/flow:implement` - Manage task implementation with parallel agent delegation
- `/flow:autonomous` - Full autonomous orchestration from PRD to completion
- `/flow:cleanup` - Clean up after implementation (commits, PRD updates)
- `/flow:summary` - Show current feature implementation summary
- Decision-engine skill for autonomous technical decisions

### 2. Semantic Memory Plugin

PostgreSQL + pgvector MCP server for codebase indexing and semantic search. Index your codebase and perform semantic searches to find relevant code chunks based on natural language queries.

**Features:**

- `semantic_search` - Search codebase using semantic similarity
- `index_project` - Index a project's codebase for semantic search
- `get_project_status` - Get indexing status for a project
- `delete_project` - Delete a project from the index
- `list_projects` - List all indexed projects
- `index-codebase` shell script for easy indexing

## Installation

### Quick Install (Recommended)

Install both plugins with a single command:

```bash
claude plugin install https://github.com/flow-community/flow-marketplace
```

Or use the `/plugin` command within Claude Code:

```
/plugin install https://github.com/flow-community/flow-marketplace
```

### What Happens During Installation

**Flow Plugin:**
- No build process required
- Commands and skills are immediately available

**Semantic Memory Plugin:**
- Install script runs automatically
- npm dependencies are installed
- TypeScript server is built
- Environment template is created (`.env.example`)

### Manual Prerequisites

**For Flow Plugin:**
- None! Works out of the box
- Optional: [beads](https://github.com/steveyegge/beads) for enhanced issue tracking
- Optional: [worktrunk](https://worktrunk.dev/) for git worktree management

**For Semantic Memory Plugin:**

1. **PostgreSQL 14+ with pgvector:**
```bash
# Ubuntu/Debian
sudo apt install postgresql-14 postgresql-14-pgvector

# macOS with Homebrew
brew install postgresql@14
brew install pgvector

# Enable pgvector extension
psql -d postgres -c "CREATE EXTENSION vector;"

# Create database
createdb semantic_memory
```

2. **Python 3.10+ with sentence-transformers:**
```bash
pip install sentence-transformers numpy
```

3. **Node.js 18+** (usually already installed with Claude Code)

## Configuration

### Environment Variables

**Semantic Memory:**

```bash
# PostgreSQL connection URL
export DATABASE_URL="postgresql://localhost/semantic_memory"

# Or use the plugin-specific variable
export SEMANTIC_MEMORY_PG_URL="postgresql://localhost/semantic_memory"

# Optional: Customize embedding model (default: all-MiniLM-L6-v2)
export SEMANTIC_MEMORY_EMBEDDING_MODEL="all-MiniLM-L6-v2"

# Optional: Chunk size for indexing (default: 500 tokens)
export SEMANTIC_MEMORY_CHUNK_SIZE="500"
```

**Flow:**

```bash
# Enable autonomous mode (default: false)
export FLOW_AUTO_MODE="true"

# Custom session ID (auto-generated if not set)
export FLOW_SESSION_ID="my-session"
```

## Usage

### Flow Plugin

Start a new feature workflow:

```
/flow:plan
```

This will guide you through creating a PRD for your feature.

Generate tasks from a PRD:

```
/flow:generate-tasks
```

Implement tasks:

```
/flow:implement
```

Or run the full autonomous workflow:

```
/flow:autonomous
```

To refresh your memory of what has been done:

```
/flow:summary
```

To cleanup the feature:

```
/flow:cleanup
```

## Flow Plugin Documentation

### Quick Start

**Autonomous Mode (Recommended):**
```
/flow:autonomous "Implement user authentication"
```

**Manual Mode:**
```
1. Plan your feature    → /flow:plan       (Generate PRD)
2. Generate tasks       → /flow:generate-tasks  (Create tasks)
3. Implement            → /flow:implement  (Execute tasks)
4. Cleanup              → /flow:cleanup    (Finalize)
```

### PRD Status Flow

```
draft → approved → implementing → implemented
```

| Status | Icon | Description |
|--------|------|-------------|
| `draft` | 📝 | PRD being written |
| `approved` | ✅ | Ready for task generation |
| `implementing` | 🔄 | Tasks in progress |
| `implemented` | ✨ | Feature complete |

### Command Reference

| Command | Purpose | PRD Status | Output |
|---------|---------|------------|--------|
| `/flow:autonomous` | End-to-end autonomous | N/A | Complete feature |
| `/flow:plan` | Create/update PRD | Any | PRD file |
| `/flow:generate-tasks` | Generate tasks | approved | Epics + tasks |
| `/flow:implement` | Execute tasks | approved→implementing | Code + commits |
| `/flow:summary` | Show progress | Any | Status summary |
| `/flow:cleanup` | Finalize | implementing | Merge + status |

### Architecture

The Maestro Orchestrator (`/flow:autonomous`) provides end-to-end autonomy:
- Session lifecycle management
- Phase orchestration (plan → tasks → implement → cleanup)
- Autonomous technical decision-making
- Error recovery with rollback capability

**Agent Skills:** frontend-design, mcp-builder, webapp-testing, security-review, tdd-workflow

### Optional Tools

**Beads (bd)** - Enhanced task tracking with dependencies:
```bash
curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash
```

**Worktrunk (wt)** - Git worktree management:
```bash
brew install max-sixty/worktrunk/wt
```

### Advanced Topics

- **PRD Iteration:** When updating an approved PRD, status resets to `draft`, version increments
- **Auto-Compaction Detection:** System includes context refresh protocol
- **Parallel Task Execution:** Tasks marked `[P:Group-X]` execute concurrently via specialized subagents

For detailed protocol documentation, see `.claude-plugin/plugins/flow/commands/flow/shared/protocols/`

### Semantic Memory Plugin

Index your codebase:

```bash
.claude-plugin/plugins/semantic-memory/scripts/index-codebase.sh /path/to/project
```

Or use the MCP tool directly:

```
index_project project_path="/path/to/project"
```

Search your codebase semantically:

```
semantic_search query="how to authenticate users"
```

Get project status:

```
get_project_status project_path="/path/to/project"
```

## Directory Structure

```
flow-marketplace/
├── .claude-plugin/
│   ├── marketplace.json           # Marketplace manifest
│   └── plugins/
│       ├── flow/                  # Flow plugin
│       │   ├── plugin.json        # Flow plugin manifest
│       │   ├── commands/flow/     # Flow commands
│       │   │   └── shared/
│       │   │       └── protocols/ # Core operational logic
│       │   ├── skills/            # Decision engine skill
│       │   └── subagent-types.yaml
│       └── semantic-memory/       # Semantic memory MCP plugin
│           ├── plugin.json        # Semantic memory plugin manifest
│           ├── mcp-server/        # MCP server implementation
│           │   ├── src/
│           │   │   ├── index.ts   # MCP server entry point
│           │   │   ├── database.ts
│           │   │   ├── embedding.ts
│           │   │   └── tools/
│           │   │       ├── search.ts
│           │   │       ├── index.ts
│           │   │       └── manage.ts
│           │   ├── scripts/
│           │   │   └── embedding.py
│           │   └── package.json
│           └── scripts/
│               └── index-codebase.sh
├── package.json
├── README.md
└── CHANGELOG.md
```

## Development

### Building the Semantic Memory MCP Server

```bash
cd .claude-plugin/plugins/semantic-memory/mcp-server
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Credits

- **Flow Plugin** - Based on the Flow workflow system for Claude Code
- **Semantic Memory** - Uses [sentence-transformers](https://www.sbert.net/) and [pgvector](https://github.com/pgvector/pgvector)

## Support

- GitHub Issues: [flow-marketplace/issues](https://github.com/flow-community/flow-marketplace/issues)
- Documentation: See individual plugin README files

## See Also

**Flow Commands** - Individual command documentation in `.claude-plugin/plugins/flow/commands/flow/`
- `/flow:plan` - PRD generation
- `/flow:generate-tasks` - Task generation from PRDs
- `/flow:implement` - Task execution workflow
- `/flow:cleanup` - Post-implementation cleanup
- `/flow:summary` - Progress display
- `/flow:autonomous` - Full autonomous orchestration

**Flow Protocols** - Core operational logic in `.claude-plugin/plugins/flow/commands/flow/shared/protocols/`
- PRD Auto-Discovery
- Auto-Compaction Detection
- PRD Change Management
- TDD Principles

- [Claude Code Documentation](https://claude.ai/code)
- [Beads Issue Tracker](https://github.com/steveyegge/beads)
- [Worktrunk](https://worktrunk.dev/)
