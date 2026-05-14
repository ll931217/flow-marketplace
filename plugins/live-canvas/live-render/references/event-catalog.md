# Event catalog

The complete list of events in the runtime, with dispatch rules.

## Semantic events (frontend → server → stdout)

These cross the WebSocket and end up on stdout as a single JSON line per event. The agent observes and decides whether to act.

### `entity_clicked`

User clicked on the bounding box of a known entity.

**Wire format (frontend → server):**

```json
{ "event": "entity_clicked", "entityId": "book_17", "x": 421, "y": 182 }
```

**Stdout (server log):**

```json
{ "event": "user_interaction", "kind": "entity_clicked", "entityId": "book_17", "x": 421, "y": 182 }
```

**Frontend dispatch rule:** Fire on `pointerup` when (a) the pointer moved less than the drag threshold (~4px screen) since `pointerdown`, AND (b) the up-position hit-tests against an entity.

**Agent guidance:** Treat as a soft signal. The user pointed at something but didn't say what they want. Often safe to do nothing. Strong signal only when the previous turn established context ("when I click on a book, mark it read").

---

### `canvas_clicked`

User clicked on empty canvas space (no entity at the point).

**Wire format:**

```json
{ "event": "canvas_clicked", "x": 800, "y": 600 }
```

**Stdout:**

```json
{ "event": "user_interaction", "kind": "canvas_clicked", "x": 800, "y": 600 }
```

**Frontend dispatch rule:** Fire on `pointerup` when (a) the pointer was not a drag, AND (b) hit-test returned nothing.

**Agent guidance:** Very weak signal on its own. The user touched empty space — they probably canceled a thought, or are pointing at a location for a follow-up instruction. Don't act reflexively. If the next message says "put something there," the previous `canvas_clicked` becomes the spatial anchor.

---

### `annotation_submitted`

User drew a rectangle and typed a comment. This is the strongest signal in the system — it's an explicit, natural-language ticket.

**Wire format (frontend → server):**

```json
{
  "event": "annotation_submitted",
  "bounds": { "x": 400, "y": 150, "width": 200, "height": 180 },
  "text": "this color is wrong, make it warmer"
}
```

**Server-side handling:**

1. Compute enclosed entity IDs via the quadtree
2. Insert an `annotation` entity into world state
3. Broadcast new snapshot
4. Log to stdout (with `enclosedEntityIds` pre-resolved)

**Stdout:**

```json
{
  "event": "annotation_submitted",
  "id": "annotation_3",
  "bounds": { "x": 400, "y": 150, "width": 200, "height": 180 },
  "text": "this color is wrong, make it warmer",
  "enclosedEntityIds": ["book_17", "book_18", "book_22"]
}
```

**Agent guidance:** Act. Read intent from `text`, resolve against `enclosedEntityIds`, apply mutation, delete annotation entity. Bundle the work and the deletion into one PATCH so the user sees both happen together.

---

## Server-emitted stdout events

The server also logs lifecycle events that aren't user-driven.

### `server_started`

```json
{ "event": "server_started", "port": 47823, "url": "http://localhost:47823" }
```

**Agent guidance:** Note the URL for subsequent HTTP calls. Don't act on this — there's nothing to do yet.

### `mutation_applied`

Logged after every successful PATCH (including the agent's own).

```json
{ "event": "mutation_applied", "patch": [...], "version": 7 }
```

**Agent guidance:** Mostly noise. Useful as a confirmation that your own PATCH landed. Do **not** react to `mutation_applied` for your own patch — that's an echo loop. The version number is monotonically increasing; use it to detect concurrency.

---

## Immediate events (frontend only)

These exist as concepts but **never** leave the browser. They're listed here to make the boundary explicit.

### `pointer_moved`

Triggers hover highlight, cursor change. Pure local render state.

### `annotation_drawing`

Triggers live rectangle preview while the user is dragging out an annotation box. Pure local render state.

### Why this list exists

When someone proposes "let's tell the agent when the user hovers over X so it can pre-fetch Y" — point them at this list. The two-tier split is what keeps the agent loop sane. Anything fired at pointer-move frequency stays in the browser.

---

## Anti-patterns

- **Don't add new immediate events that also forward to stdout.** Pick a tier and commit.
- **Don't log non-events to stdout.** The agent treats each line as a discrete event. Free-form `console.log` from anywhere in `server.ts` pollutes the observation channel — use `logJson({...})` and treat the call site as a deliberate decision.
- **Don't add a generic "tell the agent X" pipe.** If a piece of intent matters enough to surface, give it a named event. The catalog should grow slowly.
