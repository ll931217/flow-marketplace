# /memory:sync - Sync Project to Semantic Index

Index the current project codebase for semantic search. This updates the semantic memory with code chunks from the project.

## Usage

```
/memory:sync [--force]
```

## Arguments

- `--force` (optional): Force re-indexing even if already indexed

## Examples

```bash
# Index current project
/memory:sync

# Force re-index
/memory:sync --force
```

## Implementation

1. Get the current project path from working directory
2. Call the `index_project` MCP tool with:
   - `project_path`: Current working directory
   - `force_reindex`: Whether to force re-index
3. Report indexing results

## MCP Tool Call

```json
{
  "name": "index_project",
  "arguments": {
    "project_path": "/home/user/projects/my-project",
    "force_reindex": false
  }
}
```

## Output Format

```
Indexing project: my-project

Files processed: 45
Chunks indexed: 312
Files skipped: 3
Indexing time: 8.5s

Status: success
```

## Notes

- Only source code files are indexed (ts, js, py, go, rs, etc.)
- node_modules, .git, and other common directories are skipped
- Use `--force` to re-index after significant code changes
