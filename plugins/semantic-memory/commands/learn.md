# /memory:learn - Explicit Learning Capture

Explicitly teach the agent a preference, pattern, or piece of knowledge to remember.

## Usage

```
/memory:learn <content> [--dataset=<name>] [--tags=<tag1,tag2>]
```

## Arguments

- `content` (required): The knowledge to learn
- `--dataset` (optional): Target dataset (default: "user" or current project)
- `--tags` (optional): Comma-separated tags

## Examples

```bash
# Teach a coding preference
/memory:learn "Always use TypeScript strict mode"

# Teach project-specific knowledge
/memory:learn "This project uses Tailwind CSS for styling" --dataset=flow-marketplace

# Teach with tags
/memory:learn "Prefer composition over inheritance" --dataset=user --tags=patterns,oop

# Teach a workflow preference
/memory:learn "Always run tests before committing" --tags=workflow,git
```

## Implementation

1. Parse content and options
2. Determine dataset:
   - If `--dataset` provided, use it
   - Otherwise, use "user" as default
3. Parse tags if provided
4. Call `memory_add` MCP tool
5. Confirm learning to user

## MCP Tool Call

```json
{
  "name": "memory_add",
  "arguments": {
    "dataset": "user",
    "content": "Always use TypeScript strict mode",
    "tags": ["typescript", "config"]
  }
}
```

## Output

```
Learned: "Always use TypeScript strict mode"
Dataset: user
Tags: typescript, config

This knowledge will be available in future sessions.
```

## Difference from /memory:add

`/memory:learn` is semantically focused on teaching the agent new knowledge, while
`/memory:add` is a general-purpose memory addition command. They use the same
underlying implementation.
