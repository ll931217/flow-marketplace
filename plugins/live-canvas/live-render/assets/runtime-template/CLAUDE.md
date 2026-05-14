# Agent loop — semantic spatial runtime workspace

You are inside a per-project semantic spatial runtime. This file is your runbook. It is **not** the SKILL.md that brought you here — load `~/.claude/skills/live-render/SKILL.md` for the architectural mental model. This file tells you how to behave once the runtime is running.

## Your job

The user is interacting with a Canvas2D world running in their browser. You observe their intent through this server's stdout and respond by mutating world state via `PATCH /api/world`.

## What you can perceive

Only the stdout stream of this Bun server. Each line is one JSON event:

| Event              | When                                                         | What to do                                                |
| ------------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| `server_started`   | Server boot                                                  | Note the URL. Don't act yet.                              |
| `user_interaction` | User clicked an entity or empty canvas                       | Decide if this signals intent. Often: just acknowledge.   |
| `annotation_submitted` | User drew a sticky note with text + enclosed entity IDs | This is a ticket. Read intent, resolve, delete annotation.|
| `mutation_applied` | A PATCH (yours or another agent's) succeeded                 | Useful as a confirmation. Don't reflexively react.        |

You **cannot** see the viewport, the cursor, what the user just looked at, or anything not in the stream above. If you find yourself guessing what's on screen, **stop and `GET /api/world` instead**.

## Reading the world

Before every mutation, fetch the current snapshot. The port for this workspace is whatever was logged on `server_started` — read it from the stdout stream, don't hardcode:

```bash
# $URL was set during bootstrap, e.g. http://localhost:47823
curl -s "$URL/api/world"
```

The snapshot has shape:

```json
{
  "version": 7,
  "entities": {
    "user":           { "type": "node",       "metadata": {...}, "spatial": {...} },
    "edge_user_svc":  { "type": "edge",       "metadata": {...}, "spatial": {...} },
    "region_app":     { "type": "region",     "metadata": {...}, "spatial": {...} },
    "annotation_3":   { "type": "annotation", "metadata": {...}, "spatial": {...} }
  },
  "canvas": { "x": 0, "y": 0, "width": 1600, "height": 900 }
}
```

The renderer recognises four entity types:

- **`node`** — a card with icon, title, subtitle, accent. Required metadata: `title`. Optional: `subtitle`, `icon` (emoji), `accent` (hex/rgba), `desc` (tooltip body). This is the default for anything substantive on the canvas.
- **`edge`** — a directed arrow between two nodes. Required metadata: `from`, `to` (entity ids). Optional: `label`, `accent`, `dashed: true`. `spatial` is ignored — use `{x:0,y:0,width:0,height:0}`.
- **`region`** — a translucent labeled backdrop grouping a cluster. Required metadata: `title`. Optional: `accent`. Spatial is the region's rectangle.
- **`annotation`** — sticky note created by the user (don't create these yourself — the server does on `annotation_submitted`).

Edges and regions are non-interactive: they don't show in `user_interaction` clicks and are excluded from annotation enclosure queries. Only `node` entities participate in hit testing.

Do not trust a cached snapshot across more than a few messages. Anyone — including another agent or the server's own annotation auto-create — could have changed it.

## Mutating

`PATCH /api/world` takes a JSON Patch (RFC 6902) array:

```bash
curl -s -X PATCH "$URL/api/world" \
  -H 'content-type: application/json' \
  -d '[
    {"op":"replace","path":"/entities/service/metadata/accent","value":"#c47b3a"},
    {"op":"remove","path":"/entities/annotation_3"}
  ]'
```

Supported ops: `add`, `remove`, `replace`, `move`, `copy`, `test`. Patches are applied atomically — if any op fails, none are observable.

Common patterns:

- Modify an attribute: `{"op":"replace","path":"/entities/<id>/metadata/<key>","value":<v>}`
- Move an entity: `{"op":"replace","path":"/entities/<id>/spatial","value":{"x":..,"y":..,"width":..,"height":..}}`
- Add a node:   `{"op":"add","path":"/entities/<id>","value":{"id":"<id>","type":"node","metadata":{"title":"...","subtitle":"...","icon":"⚙️","accent":"#6a8aff","desc":"..."},"spatial":{"x":..,"y":..,"width":240,"height":64}}}`
- Add an edge:  `{"op":"add","path":"/entities/<id>","value":{"id":"<id>","type":"edge","metadata":{"from":"<a>","to":"<b>","label":"REST","accent":"rgba(159,180,255,0.6)"},"spatial":{"x":0,"y":0,"width":0,"height":0}}}`
- Add a region: `{"op":"add","path":"/entities/<id>","value":{"id":"<id>","type":"region","metadata":{"title":"Backend","accent":"#6a8aff"},"spatial":{"x":..,"y":..,"width":..,"height":..}}}`
- Delete an entity: `{"op":"remove","path":"/entities/<id>"}`

## Resolving annotations

An annotation entity is an open ticket from the user. To resolve:

1. Read its `metadata.text` — that's what the user asked for, in natural language
2. Read its `metadata.enclosedEntityIds` — that's the list the server pre-computed at submission time, so you don't have to guess what "these" or "this color" referred to
3. Apply the requested change to those entities
4. Delete the annotation entity in the same patch

Bundle the work + the deletion into one PATCH so the user sees the sticky note disappear at the same moment the change applies. Otherwise there's a flicker where the change lands but the note still hangs around.

## Pacing — when to act vs wait

This is the part with the most open design surface. Default to:

- Act immediately on `annotation_submitted` — that's an explicit ticket
- Act on `user_interaction` only when the event has clear intent (e.g., clicking a book the user previously asked about)
- Never act on `mutation_applied` of your own patch — that's just an echo
- When idle, wait on stdout. Do not poll `/api/world`. Do not generate "ambient" mutations.

If you're unsure whether to act on a `user_interaction`, prefer doing nothing. The user can always submit an annotation to be explicit.

## Anti-patterns

- **Echo loops:** Acting on your own `mutation_applied`. Always check whether the patch in the log is one you sent.
- **Phantom selection:** Treating a click as "select this and wait for a follow-up." There is no selection model. Each click is a complete intent or none at all.
- **State drift:** Building up beliefs about world state across many messages without re-fetching. Snapshots are cheap; trust the wire.
- **Server bypass:** Writing to anything other than `PATCH /api/world`. The server owns canonical state.
- **Stdout flooding:** This server is sparse on purpose. If you need to chatter, do it in your own message to the user, not by logging.

## Running

```bash
bun install          # first time
bun run server.ts    # or: bun run dev (with --watch)
```

Default port (when run standalone): **47823** — an uncommon port chosen to avoid colliding with the usual dev-server suspects (3000, 5173, 8000, 8080). Override with `PORT=...`.

When the skill bootstraps this workspace, it computes a project-stable port from the workspace path (range 40000–49999) and passes it via `PORT`. The actual bound port is logged on `server_started` — read it from stdout, don't assume.

Drag a rectangle on the canvas to leave an annotation.
