# /memory:add - Add Memory Entry

Add a new memory entry to semantic memory for storing user preferences, project knowledge, or coding patterns.

## Usage

```
/memory:add <content> [--dataset=<name>] [--tags=<tag1,tag2>]
```

## Arguments

- `content` (required): The memory content to store
- `--dataset` (optional): Dataset name (default: "user" for preferences, or current project name)
- `--tags` (optional): Comma-separated tags for categorization

## Examples

```bash
# Add a user preference
/memory:add "Use Zustand for state management in React projects" --dataset=user --tags=react,state

# Add project knowledge
/memory:add "This project uses PostgreSQL with pgvector for semantic search" --dataset=flow-marketplace

# Add a coding pattern
/memory:add "Always use TypeScript strict mode for type safety" --dataset=user --tags=typescript,config
```

## Implementation

1. Parse the content and options from arguments
2. Determine the dataset:
   - If `--dataset` provided, use it
   - Otherwise, use "user" as default
3. Parse tags if provided
4. Call the `memory_add` MCP tool with:
   - `dataset`: The determined dataset
   - `content`: The memory content
   - `tags`: Parsed tags array
5. Report success or failure to user

## MCP Tool Call

```json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "user",
    "content": "Use Zustand for state management in React projects",
    "tags": ["react", "state"]
  }
}
```
