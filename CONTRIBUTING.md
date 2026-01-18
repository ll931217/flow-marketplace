# Contributing to Flow Marketplace

Thank you for your interest in contributing to the Flow Marketplace! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- For Semantic Memory development: PostgreSQL 14+, Python 3.10+

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/flow-marketplace.git
   cd flow-marketplace
   ```

3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/flow-community/flow-marketplace
   ```

## Development Setup

### Flow Plugin

The Flow plugin requires no build process. Changes to command files (`.md`) and skills take effect immediately.

### Semantic Memory Plugin

1. Install dependencies:
   ```bash
   cd .claude-plugin/plugins/semantic-memory/mcp-server
   npm install
   ```

2. Build TypeScript:
   ```bash
   npm run build
   ```

3. Run in development mode:
   ```bash
   npm run watch
   ```

### Testing Changes

1. Link your local plugin to Claude Code
2. Test commands: `/flow:plan`, `/flow:autonomous`, etc.
3. Test MCP tools: `semantic_search`, `index_project`, etc.

## Making Changes

### Branch Naming

Use descriptive branch names:
- `flow/new-command`
- `semantic-memory/batch-indexing`
- `docs/update-readme`

### Commit Messages

Follow conventional commit format:
- `feat: add new feature`
- `fix: resolve issue with...`
- `docs: update documentation`
- `refactor: restructure...`
- `test: add tests for...`

### Code Style

- **TypeScript**: Follow existing patterns, use strict mode
- **Shell Scripts**: Use ShellCheck for validation
- **Markdown**: Maintain consistent formatting

### Flow Plugin Changes

**Adding Commands:**
1. Create `.md` file in `.claude-plugin/plugins/flow/commands/flow/`
2. Add entry to `plugin.json` commands array
3. Document usage in command file

**Adding Skills:**
1. Create skill directory in `.claude-plugin/plugins/flow/skills/`
2. Create `SKILL.md` with skill definition
3. Add to `plugin.json` skills array

### Semantic Memory Changes

**Adding MCP Tools:**
1. Create tool file in `mcp-server/src/tools/`
2. Export tool function
3. Register in `mcp-server/src/index.ts`
4. Add to `TOOLS` array
5. Update `.mcp.json` and `marketplace.json`

**Database Changes:**
1. Modify schema in `database.ts`
2. Consider migrations for existing data
3. Update documentation

## Submitting Changes

### Pull Request Process

1. Update documentation if needed
2. Ensure all tests pass
3. Update CHANGELOG.md
4. Commit your changes
5. Push to your fork
6. Create pull request

### Pull Request Checklist

- [ ] Code follows project style guidelines
- [ ] Changes are documented in CHANGELOG.md
- [ ] Documentation updated if needed
- [ ] No merge conflicts with upstream main
- [ ] Commit messages follow conventions

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How were changes tested?

## Checklist
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

## Reporting Issues

### Bug Reports

Include:
- Claude Code version
- Plugin version
- OS and version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages/logs

### Feature Requests

Include:
- Use case description
- Proposed solution
- Alternative approaches considered
- Additional context

## Questions?

- Open an issue with the `question` label
- Check existing documentation
- Review previous issues and discussions

## Recognition

Contributors will be recognized in the project's contributors list.

Thank you for contributing to Flow Marketplace!
