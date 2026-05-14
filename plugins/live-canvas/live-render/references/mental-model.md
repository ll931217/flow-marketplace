# Mental model — long form

This is the conceptual scaffold. Load it when designing or modifying anything in the runtime. The skill's SKILL.md has the condensed version; this file expands the reasoning.

## Semantic entities are the source of truth

Every visible thing in the world is a semantic entity with the same shape:

```ts
interface Entity {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  spatial: { x: number; y: number; width: number; height: number };
}
```

A book is an entity. An annotation is an entity. A future shape, edge, or node will be an entity. The renderer dispatches on `type` — there is no parallel hierarchy of "annotations" or "messages" or "presentation primitives" that lives alongside entities.

### Why this matters

If you find yourself adding a second kind of "thing" to the world that lives outside `entities`, you're recreating the very thing the design rejected. Common temptations:

- "Selections" — rejected. Each interaction is a discrete intent.
- "Highlights" — immediate tier, never crosses the wire, never persisted.
- "Messages" or "notifications" — if it's worth seeing across tabs, it's an entity. If it isn't, it shouldn't exist.
- "Layers" — represent as `metadata.layer` on an entity, not as a parallel container.

## The two-tier interaction split is load-bearing

```
┌─ Immediate tier ─────────────────────────┐
│  hover highlight                          │
│  drag preview rectangle                   │
│  cursor changes                           │
│  any 60Hz mouse-move presentation         │
│  ────────────────────────────             │
│  Frontend only. Never touches WS.         │
└───────────────────────────────────────────┘
              ↑
              │
              │ pointerup / explicit submit
              │
              ▼
┌─ Semantic tier ──────────────────────────┐
│  entity_clicked                           │
│  canvas_clicked                           │
│  annotation_submitted                     │
│  ────────────────────────────             │
│  Frontend → WS → server → stdout → agent  │
│  Sparse. Each event is deliberate intent. │
└───────────────────────────────────────────┘
```

If pointer-move events flowed to Claude, the agent's stdout would be saturated and useful events would be drowned. The throttle is the dispatch decision in the frontend, not a rate limiter. **Presentation-layer events never leave the browser** — full stop.

### Sanity check

If you're adding a new event, ask:

1. Does the agent need to know about this individual instance? → semantic tier
2. Is it presentation feedback the user wants to see immediately? → immediate tier, do not forward

If both feel true, the design is wrong. Split the interaction into a presentation step (immediate) and a commit step (semantic).

## Claude has no ambient awareness

Claude does **not** know:

- Where the cursor is right now
- What entity the user is hovering over
- What part of the canvas is visible (no camera/pan/zoom yet, but this rule survives them)
- What the user has been looking at for the last 5 seconds
- Anything that didn't come through the semantic tier

Claude **does** know:

- The current world state (via `GET /api/world`)
- The event stream since the agent started reading stdout
- The natural-language intent the user typed in an annotation

This is by design. Ambient awareness via screen-scraping or polling would (a) be wasteful, (b) leak presentation details into reasoning, (c) make the agent unpredictable. Forcing intent through the semantic tier keeps the agent's behavior legible and the user in control.

## Playwright is a darkroom, not eyes

If Playwright is wired up later, it runs **headless** as a render verification sandbox only. It is:

- A way to check "did the renderer produce the right pixels for this snapshot?"
- A regression harness
- A screenshot taker for documentation

It is **not**:

- How Claude perceives the live user session
- A substitute for `GET /api/world`
- A way to "see" what the user is doing

If you find yourself reaching for Playwright to figure out what's happening, you've already lost — the agent should be acting on stdout events and world state, not on rendered pixels.

## State ownership

| Layer    | Owns                                    | Does not own                                |
| -------- | --------------------------------------- | ------------------------------------------- |
| Server   | Canonical world state, spatial index    | Mutation logic (except annotation create)   |
| Agent    | Mutations (via PATCH)                   | Server state directly                       |
| Frontend | Hover/drag/preview UI state             | Anything persistent or cross-tab            |

The frontend treats every WS snapshot as ground truth and replaces its in-memory view. If you find the frontend trying to "merge" snapshots, or keeping local state that survives across snapshots, that's a leak — fix it.

## Why this works

The mental model is small enough to fit in one session's working memory:

1. World = entities.
2. Two tiers: presentation stays local, intent crosses the wire.
3. Agent owns mutations; server is a (near) pure relay.
4. State lives on the server; everything else renders or reasons against it.

When a feature feels hard, it's almost always because the design temptation is to violate one of these. Going back to the model usually surfaces a simpler version of the feature that doesn't.
