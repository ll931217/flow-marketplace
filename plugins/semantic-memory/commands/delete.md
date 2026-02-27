# /memory:delete - Delete Memory

Delete a specific memory by ID or clear all memories in a dataset.

## Usage

```bash
# Delete specific memory
/memory:delete <memory-id>

# Clear all memories in a dataset
/memory:delete --dataset=<name> --all
```

## Arguments

- `memory-id`: The ID of the memory to delete
- `--dataset`: Dataset to clear (use with `--all`)
- `--all`: Clear all memories in the specified dataset

## Examples

```bash
# Delete a specific memory
/memory:delete 550e8400-e29b-41d4-a716-446655440000

# Clear session memories
/memory:delete --dataset=session --all

# Clear all user preferences (use with caution!)
/memory:delete --dataset=user --all
```

## Implementation

1. Check if `--all` flag is provided
2. If `--all`:
   - Require `--dataset` argument
   - Call `memory_clear_dataset` MCP tool
3. Otherwise:
   - Treat first argument as memory ID
   - Call `memory_delete` MCP tool
4. Report success or failure

## MCP Tool Calls

Delete specific memory:
```json
{
  "name": "memory_delete",
  "arguments": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

Clear dataset:
```json
{
  "name": "memory_clear_dataset",
  "arguments": {
    "dataset": "session"
  }
}
```

## Safety

- Always confirm before clearing a dataset with `--all`
- Warn user if attempting to clear "user" dataset
