# Documentation Generation

## Overview

After implementation is complete, the cleanup process optionally offers to generate project documentation using the `document-skills` skill. This step runs after the summary commit (or worktree merge) and before the PRD status update.

## When to Generate

- The user explicitly selects one or more documentation types during cleanup
- The PRD contains documentation requirements in its specifications
- API endpoints, user-facing features, or technical components were implemented

## When to Skip

- The user selects "Skip documentation" during cleanup
- The implementation is internal-only with no documentation requirements
- In autonomous mode, documentation is skipped by default unless the PRD specifies it

## User Prompt

Present documentation options via `AskUserQuestion` with multi-select enabled:

| Option | Description |
|--------|-------------|
| Generate API documentation | Create OpenAPI/Swagger spec from implemented endpoints |
| Generate user guide | Create user-facing documentation from PRD requirements |
| Generate technical spec | Create technical documentation with architecture details |
| Skip documentation | Proceed with cleanup without generating docs |

## Invoking Document Skills

For each selected documentation type, invoke the `document-skills` skill:

```javascript
// API documentation
Skill(skill="document-skills", args="Generate API documentation from src/api/")

// User guide
Skill(skill="document-skills", args="Create user guide from PRD and implementation")

// Technical specification
Skill(skill="document-skills", args="Export technical spec as docx with architecture diagrams")
```

## Supported Document Formats

| Format | Extension | Use Case |
|--------|-----------|----------|
| PDF | `*.pdf` | Portable documents for distribution |
| Word | `*.docx` | Editable documents for review |
| PowerPoint | `*.pptx` | Presentation slides |
| Excel | `*.xlsx` | Spreadsheets and data tables |
| Markdown | `*.md` | Repository documentation |

## Documentation Examples

| Document Type | Description | Example Command |
|---------------|-------------|-----------------|
| API Reference | OpenAPI/Swagger spec from endpoints | `Skill(skill="document-skills", args="Generate API docs from src/api/routes.ts")` |
| User Guide | End-user documentation from PRD | `Skill(skill="document-skills", args="Create user guide from prd-authentication-v3.md")` |
| Technical Spec | Architecture and implementation details | `Skill(skill="document-skills", args="Generate technical spec as docx")` |
| Changelog | Release notes from PRD changelog | `Skill(skill="document-skills", args="Export changelog as pdf")` |

## Commit Generated Documentation

After documentation is generated, create a separate commit:

```bash
# Stage documentation files
git add docs/

# Create documentation commit
git commit -m "docs: add generated documentation"
```

This keeps the documentation commit separate from the implementation summary commit for cleaner history.
