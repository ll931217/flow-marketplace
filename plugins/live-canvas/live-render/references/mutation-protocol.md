# Mutation protocol — JSON Patch over HTTP

The agent's only way to change world state is `PATCH /api/world` with a JSON Patch (RFC 6902) body.

## Why JSON Patch (not GraphQL, not whole-document replace, not custom DSL)

- **Small payloads.** A color change is ~80 bytes, not the full world snapshot.
- **Legible in stdout.** Every applied patch is logged verbatim. A senior reviewer reading the stdout stream sees exactly what the agent did and why.
- **Standard.** RFC 6902 is well-specified; no custom semantics to debate.
- **Atomic.** Patches are applied as transactions. If any op fails, none are observable. The agent doesn't need to write rollback logic.

## Request

```http
PATCH /api/world
content-type: application/json

[
  { "op": "replace", "path": "/entities/book_17/metadata/color", "value": "#c47b3a" },
  { "op": "remove",  "path": "/entities/annotation_3" }
]
```

The body **must** be a JSON array of operations, even for a single op.

## Response

Success:

```json
{ "ok": true, "version": 12 }
```

Failure (any op throws):

```json
{ "ok": false, "error": "path not found: /entities/nope" }
```

`version` is the snapshot version after the patch applied. Use it to reason about concurrency — if you read version N, patched, and got version N+1, no one else mutated between your read and your patch.

## Supported operations

| Op        | Purpose                                       |
| --------- | --------------------------------------------- |
| `add`     | Insert a new value at the path                |
| `remove`  | Delete the value at the path                  |
| `replace` | Overwrite the value at the path               |
| `move`    | Move a value from `from` to `path`            |
| `copy`    | Copy a value from `from` to `path`            |
| `test`    | Assert the value at the path equals `value`   |

Paths follow RFC 6901 JSON Pointer syntax. `/entities/book_17/metadata/color` means: `state["entities"]["book_17"]["metadata"]["color"]`.

Escape rules per RFC 6901: `~0` → `~`, `~1` → `/`.

## Common patterns

### Change one attribute

```json
[{ "op": "replace", "path": "/entities/book_17/metadata/color", "value": "#c47b3a" }]
```

### Move an entity

```json
[
  {
    "op": "replace",
    "path": "/entities/book_17/spatial",
    "value": { "x": 600, "y": 200, "width": 90, "height": 140 }
  }
]
```

(JSON Patch has a `move` op, but it's for moving values between paths, not for repositioning entities. Use `replace` on `spatial` to reposition.)

### Add a new entity

```json
[
  {
    "op": "add",
    "path": "/entities/shape_1",
    "value": {
      "id": "shape_1",
      "type": "shape",
      "metadata": { "kind": "rect", "color": "#7a5a3a" },
      "spatial": { "x": 100, "y": 100, "width": 80, "height": 80 }
    }
  }
]
```

### Delete an entity

```json
[{ "op": "remove", "path": "/entities/book_17" }]
```

### Optimistic concurrency

```json
[
  { "op": "test",    "path": "/entities/book_17/metadata/color", "value": "#7a3a3a" },
  { "op": "replace", "path": "/entities/book_17/metadata/color", "value": "#c47b3a" }
]
```

If another agent changed the color first, the `test` fails, the whole patch is rejected, and you can re-fetch and decide what to do.

## Stdout shape for mutations

Every successful PATCH produces one log line:

```json
{ "event": "mutation_applied", "patch": [...], "version": 12 }
```

`patch` is the verbatim input array. Reading the stream, you can replay every mutation in order. This is the closest thing the runtime has to an audit log.

## Anti-patterns

- **Multiple PATCHes when one would do.** If you're going to make N related changes, bundle them into a single patch array. The user sees them in a single render and the audit trail stays clean.
- **PATCH-then-PATCH-to-undo.** If you realize you shouldn't have applied something, fix forward — apply a compensating patch with a clear intent. Don't chain "oops" patches.
- **Issuing a PATCH that depends on state you haven't re-fetched recently.** Across more than a couple of messages, your cached snapshot is suspect. Re-read or use `test` ops to assert the precondition.
- **PATCHing your way around a missing PATCH op.** If a single mutation would need a 30-op patch, that's a smell — the world model is probably wrong, not the protocol.

## Limits and known gaps

- No batching across requests. Each PATCH is its own transaction.
- No subscription filtering. Every connected tab receives every snapshot. Fine for MVP; revisit if the world gets large enough that snapshots are heavy.
- No conflict resolution beyond `test` ops. If two agents race, last write wins.
