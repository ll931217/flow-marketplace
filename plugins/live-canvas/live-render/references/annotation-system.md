# Annotation system

The annotation is the most important interaction in the runtime. It's the only first-class way for the user to give the agent natural-language instructions tied to spatial intent.

## Mental model: sticky note on a Figma file

The user drags a rectangle around something, types "this color is wrong, make it warmer," and submits. The note **persists** across tabs and refreshes until the agent resolves the issue and removes it.

This means:

- The note is not a chat message. It doesn't scroll away. It has location.
- The note is not a tooltip. It survives the user closing their browser.
- The note is not a comment thread. There's no reply, no resolution status — it just exists until the agent deletes it.

## Annotation is an entity, not an event

This is the load-bearing design decision. Annotations live in `world.entities` with the same shape as everything else:

```json
{
  "id": "annotation_3",
  "type": "annotation",
  "metadata": {
    "text": "this color is wrong, make it warmer",
    "enclosedEntityIds": ["book_17", "book_18", "book_22"],
    "createdAt": 1736899200000
  },
  "spatial": { "x": 400, "y": 150, "width": 200, "height": 180 }
}
```

Because it's an entity:

- It renders through the same Canvas2D path as everything else
- It survives refresh (it's in the snapshot)
- It appears in all connected tabs (broadcast like any state)
- It's deleted via `{ "op": "remove", "path": "/entities/annotation_3" }` like any entity

## Submission flow

```
1. User drags rectangle on canvas
   └─ Frontend: live preview (immediate tier, never crosses WS)
2. User releases pointer
   └─ Frontend: text input appears positioned over rectangle
3. User types and submits (Enter, or blur, or button)
   └─ Frontend: WS send { event: "annotation_submitted", bounds, text }
4. Server:
   - Run quadtree.enclosed(bounds) → enclosedEntityIds
   - Insert new annotation entity with enriched metadata
   - server.publish("world", snapshot)
   - console.log({ event: "annotation_submitted", id, bounds, text, enclosedEntityIds })
5. All connected tabs render the sticky note immediately.
6. Claude reads stdout, fetches relevant context if needed, mutates
   target entities, deletes the annotation in the same PATCH.
```

## Why server auto-creates the annotation entity

This is **the one exception** to "Claude owns all mutations." It's worth keeping this section in the skill so future-you doesn't try to "fix" the asymmetry.

### The two options that were considered

**Option A: Server auto-creates on submit** (chosen)

- Annotation appears **instantly** in all tabs the moment the user hits submit
- Server has a small piece of "user intent → mutation" translation logic
- The agent reads `annotation_submitted` from stdout and acts in its own time

**Option B: Claude creates via PATCH** (rejected)

- Annotation only appears **after** Claude wakes up, reads stdout, decides to PATCH
- This introduces a noticeable delay (hundreds of ms to seconds) between user submit and the note appearing
- During that delay, the user sees no feedback that their submit landed
- The agent loop tempo (see [open questions](../SKILL.md#open-questions)) makes this delay variable and unpredictable

Option A wins on UX by a comfortable margin. The cost — a single piece of server-side mutation logic — is small, localized, and easy to reason about.

### Resist the temptation to add more

If a future feature feels like it "should" also be server-auto-mutated for UX reasons, push back hard. Each exception:

- Splits "where can mutations come from?" into more places
- Makes echo-loop detection harder (was this mutation mine or the server's?)
- Erodes the clarity that makes the agent loop legible

If a feature really needs instant feedback, prefer to render the optimistic state in the immediate tier (frontend only) and let the agent catch up. The annotation case is special because the annotation **is** the user's intent — it must persist even if the agent never wakes up.

## Why server pre-computes `enclosedEntityIds`

The server runs a single spatial query against the quadtree at submission time and stashes the result in the annotation's metadata.

### What this saves

Without pre-computation, the agent would have to:

1. Read `annotation_submitted` from stdout (has bounds, no entities)
2. `GET /api/world` to load the full snapshot
3. Run its own enclosure geometry to figure out what "these" or "this color" meant
4. Then act

That's wasteful. The server already maintains a quadtree for click hit-testing. Reusing it for enclosure queries is one extra method on the same data structure, executed once per annotation submission. Pushing this work to the agent moves it from the server (cheap, indexed) to the agent (expensive, no index).

### The trade-off

`enclosedEntityIds` is a **snapshot of state at annotation creation time**. If entities move, get added, or get deleted **after** the annotation was created, the list goes stale.

**This is acceptable for the MVP** because:

- Annotations are short-lived (Claude resolves them within seconds)
- Users don't typically rearrange the canvas while waiting for the agent to act
- If staleness becomes a real problem, the fix is to re-run enclosure on each resolution — but that adds complexity to defer until needed

### What "enclosed" means

A book is "enclosed" by the annotation if the book's full bounding box fits inside the annotation's bounding box. Partial overlap does **not** count. This is a deliberate choice — partial overlap is ambiguous ("did they mean to include this one?") and pushing the ambiguity to the user via more deliberate dragging is cleaner than guessing.

Annotations themselves are excluded from the enclosure result so a new annotation doesn't accidentally reference old ones.

## Resolution flow

When the agent resolves an annotation:

```bash
curl -s -X PATCH "$URL/api/world" \
  -H 'content-type: application/json' \
  -d '[
    {"op":"replace","path":"/entities/book_17/metadata/color","value":"#c47b3a"},
    {"op":"replace","path":"/entities/book_18/metadata/color","value":"#c47b3a"},
    {"op":"replace","path":"/entities/book_22/metadata/color","value":"#c47b3a"},
    {"op":"remove","path":"/entities/annotation_3"}
  ]'
```

Bundle the work and the deletion in one PATCH so the user observes both at the same snapshot version. If you split them, there's a brief render where the colors changed but the sticky note still hangs there — confusing.

If the agent can't resolve (ambiguous intent, missing capability, error), **leave the annotation in place** and consider posting an explanation in another channel (chat to the user). Don't delete a sticky note you didn't resolve — that loses the user's intent.
