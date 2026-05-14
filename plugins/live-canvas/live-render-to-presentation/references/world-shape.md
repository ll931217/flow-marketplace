# World Shape

Read this in Phase 2 when you're interrogating world state to propose a
narrative. It's a quick reference for the entity schema and the helpers
the agent will need to write inline.

## Entity schema

Every entity in a live-render world has the same shape:

```ts
interface Entity {
  id: string
  type: 'node' | 'edge' | 'region' | 'annotation'
  metadata: Record<string, unknown>  // type-specific
  spatial: { x: number; y: number; width: number; height: number }
}
```

The top-level world snapshot:

```ts
interface World {
  entities: Record<string, Entity>      // keyed by id
  metadata?: { title?: string; ... }    // optional deck-level hints
}
```

## Per-type metadata conventions

These are conventions (not enforced by the runtime), but the live-render
skill writes them this way and the presentation skill should expect them.

### `node`

```ts
metadata: {
  title: string              // user-facing name — primary slide content
  icon?: string              // emoji or single grapheme
  accent?: string            // hex or var(--…) for a kind/status colour
  kind?: string              // "Component", "API", "System", …
  notes?: string             // freeform; render as `<Markdown>` if present
}
```

### `edge`

```ts
metadata: {
  from: string               // entity id
  to: string                 // entity id
  label?: string             // e.g. "HTTP", "event", "depends-on"
  kind?: 'sync' | 'async' | 'data' | 'dep'
}
```

Edges don't usually deserve their own slide. Render them inline inside
the slide for either endpoint, or in a dedicated "wiring" slide as in
section-patterns.md Pattern 4.

### `region`

```ts
metadata: {
  title: string              // becomes the slide's h2
  description?: string       // becomes the slide's lede
  accent?: string            // colours the region's tag
}
```

A region is the single best signal that the human author already grouped
something. Default to one slide per region.

### `annotation`

```ts
metadata: {
  text: string                       // the human's words — quote verbatim
  enclosedEntityIds: string[]        // what was inside the rectangle
  createdAt: number                  // unix ms
  resolved?: boolean                 // if the agent marked it done
}
```

Unresolved annotations belong on an "open issues" or "questions" slide.
Resolved annotations are usually safe to omit (they're historical noise).

## Spatial membership helper

To decide which entities are "in" a region, use bounding-box centre
containment. This matches the runtime's hit-testing behaviour and avoids
counting an entity that merely overlaps a region's edge.

```ts
function isInside(child: Entity, parent: Entity): boolean {
  const cx = child.spatial.x + child.spatial.width / 2
  const cy = child.spatial.y + child.spatial.height / 2
  return (
    cx >= parent.spatial.x &&
    cx <= parent.spatial.x + parent.spatial.width &&
    cy >= parent.spatial.y &&
    cy <= parent.spatial.y + parent.spatial.height
  )
}
```

A node can only be in one region in practice (regions are typically
disjoint). If you find a node that overlaps two regions, surface it to
the user in Phase 2 rather than silently picking one.

## Orphans

An entity that's not inside any region and isn't an edge or annotation is
an "orphan". Orphans usually mean one of three things:

1. The user is mid-edit and hasn't grouped it yet — ask before slotting
   it.
2. It's deliberately top-level (a "current state" indicator, a hero
   entity).
3. It's stale and the user forgot it — ask whether to drop it.

Don't dump all orphans onto a "misc" slide without checking. The
narrative interview in Phase 2 is the place to resolve them.

## Annotation → entity link

When building the "open issues" slide, you'll want to look up the actual
entities that an annotation references:

```ts
const touched = annotation.metadata.enclosedEntityIds
  .map((id) => world.entities[id])
  .filter(Boolean)  // some may have been deleted since the annotation was created
```

The `.filter(Boolean)` matters — `enclosedEntityIds` is a snapshot from
annotation-creation time, so referenced entities may no longer exist.
If a referenced entity is gone, mention it as "(deleted)" rather than
hiding the annotation entirely.

## Quick triage script

Paste this into a scratch file to get a feel for a world before
proposing slides:

```ts
const world = JSON.parse(/* world.json contents */)
const entities = Object.values(world.entities) as Entity[]
const byType = Object.groupBy(entities, (e) => e.type)
console.log({
  nodes: byType.node?.length ?? 0,
  edges: byType.edge?.length ?? 0,
  regions: byType.region?.length ?? 0,
  annotations: byType.annotation?.length ?? 0,
  unresolvedAnnotations: byType.annotation?.filter(
    (a) => !a.metadata.resolved,
  ).length ?? 0,
  regionTitles: byType.region?.map((r) => r.metadata.title) ?? [],
})
```

The shape of this output is what you'll use to draft the proposed slide
list in Phase 2.
