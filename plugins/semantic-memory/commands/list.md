# /memory:list - List Memories

List memories with optional filters by dataset and tags.

## Usage

```
/memory:list [--dataset=<name>] [--tags=<tag1,tag2>] [--limit=<n>] [--offset=<n>]
```

## Arguments

- `--dataset` (optional): Filter by dataset name
- `--tags` (optional): Filter by tags (matches any)
- `--limit` (optional): Maximum results (default: 50)
- `--offset` (optional): Pagination offset (default: 0)

## Examples

```bash
# List all memories
/memory:list

# List user preferences
/memory:list --dataset=user

# List project memories
/memory:list --dataset=flow-marketplace

# List memories with specific tags
/memory:list --tags=react,typescript

# Paginated listing
/memory:list --limit=10 --offset=20
```

## Implementation

1. Parse options from arguments
2. Call the `memory_list` MCP tool with:
   - `dataset`: Optional dataset filter
   - `tags`: Optional tags array
   - `limit`: Max results
   - `offset`: Pagination offset
3. Display memories with metadata

## MCP Tool Call

```json
{
  "name": "memory_list",
  "arguments": {
    "dataset": "user",
    "tags": ["react"],
    "limit": 50,
    "offset": 0
  }
}
```

## Output Format

```
Memories (showing 1-5 of 12):

1. [user] Use Zustand for state management in React projects
   Tags: react, state | Created: 2026-02-27

2. [user] Always use TypeScript strict mode
   Tags: typescript, config | Created: 2026-02-26

3. [user] Prefer functional components over class components
   Tags: react | Created: 2026-02-25
```
