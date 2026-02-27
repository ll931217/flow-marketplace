# /memory:search - Search Memories

Search memories semantically to find relevant preferences, patterns, or project knowledge.

## Usage

```
/memory:search <query> [--dataset=<name>] [--top-k=<n>]
```

## Arguments

- `query` (required): Natural language search query
- `--dataset` (optional): Limit search to specific dataset
- `--top-k` (optional): Number of results to return (default: 5)

## Examples

```bash
# Search all memories
/memory:search "state management"

# Search user preferences
/memory:search "testing framework" --dataset=user

# Search project knowledge
/memory:search "database architecture" --dataset=flow-marketplace --top-k=10
```

## Implementation

1. Parse the query and options from arguments
2. Call the `memory_search` MCP tool with:
   - `query`: The search query
   - `dataset`: Optional dataset filter
   - `top_k`: Number of results
3. Display results with similarity scores

## MCP Tool Call

```json
{
  "name": "memory_search",
  "arguments": {
    "query": "state management",
    "dataset": "user",
    "top_k": 5
  }
}
```

## Output Format

```
Found 3 memories:

1. [similarity: 0.92] Use Zustand for state management in React projects
   Dataset: user | Tags: react, state

2. [similarity: 0.85] Redux with Toolkit for complex state
   Dataset: user | Tags: react, redux

3. [similarity: 0.78] Use React Context for simple state
   Dataset: user | Tags: react, context
```
