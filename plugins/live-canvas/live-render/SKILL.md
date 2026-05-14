---
name: live-render
description: >
  AI-native semantic spatial runtime. Trigger when the user mentions
  "semantic spatial runtime", "Canvas2D agent runtime", "world state
  mutations", "annotation entity", "semantic entity", "Bun WebSocket
  runtime", "agent loop canvas", or asks to build/modify the event
  system, ECS, world state, renderer, annotation system, Bun server,
  WebSocket protocol, or Claude Code agent loop for the semantic
  spatial runtime project. When triggered: bootstrap or attach to a
  per-project runtime at <project_root>/.claude/live-render-workspace
  — a vanilla Canvas2D frontend + Bun WebSocket server + Claude Code
  agent loop, where semantic entities (nodes, edges, regions,
  annotations) are the source of truth and the agent mutates world
  state via JSON Patch. Not a chat UI. Not a DOM app. Not a
  catalog-spec renderer.
  Skip for: chat-driven UIs, code generation unrelated to the runtime,
  documentation tasks, simple Q&A.
---

# Live Render — Semantic Spatial Runtime

A persistent visual world that Claude Code manipulates as an agent. The browser renders a Canvas2D scene of **semantic entities**. The agent observes user intent through deliberate events, then mutates the world via JSON Patch over HTTP. The world snapshot is pushed back to every connected tab over WebSocket.

**This is not a chat UI, DOM app, or image generator.** Semantic entities are the source of truth. Pixels are their rendered output.

---

## Core mental model

Load this section into context **before** designing or modifying anything in the runtime. Future-you will second-guess the locked decisions below unless the reasoning is present.

### 1. Semantic entities are first-class

Every thing in the world has the same shape — nodes, edges, regions, annotations, anything you invent next. Same structure, same lifecycle, same renderer path.

```json
{
  "id": "service_17",
  "type": "node",
  "metadata": { "title": "Auth Service", "icon": "🔐", "accent": "#6a8aff" },
  "spatial": { "x": 421, "y": 182, "width": 240, "height": 64 }
}
```

There is no separate "annotation message" type or "shape primitive" type. Everything is a semantic entity. The renderer dispatches on `type` — see [What is built](#what-is-built-vs-not-built) for the four built-in render paths.

### 2. Two-tier interaction split

Interactions are split by latency tolerance. The split is **load-bearing** — it is the reason the agent doesn't drown in pointer events.

| Tier          | Examples                                                    | Handler                                                              |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| **Immediate** | hover highlight, drag preview, live rectangle while drawing, **node focus + dim**, **detail drawer**, tooltip | Frontend only — no agent involved, no server roundtrip               |
| **Semantic**  | entity click, annotation submit                             | Full agent loop (WS → stdout → Claude → PATCH /api/world → WS push) |

Hover and drag fire at 60Hz. Piping them into Claude's stdout would saturate the agent's observation channel. The frontend throttles by **simply never forwarding presentation-layer events** — they never leave the browser.

### 3. Claude has no ambient awareness

Claude cannot peek at the viewport. The only way Claude knows what the user is seeing is through events the user deliberately sends via the semantic tier. The stdout channel is **sparse by necessity, not by luxury**. Every semantic event matters; treat each one as a deliberate signal of intent.

### 4. Playwright is a darkroom, not eyes

If Playwright is used, it runs headless as a render verification sandbox only. It is **not** how Claude perceives the live session. World state is ground truth. Playwright is a sanity check on the renderer — never a substitute for `GET /api/world`.

### 5. State ownership

The Bun server owns canonical world state. Claude only sends **mutations** (JSON Patch diffs), never rewrites state wholesale. The frontend never owns state — it renders whatever the latest WebSocket snapshot says.

### 6. The one server-side mutation exception

The server is otherwise a pure relay. There is **one and only one** piece of "user intent → mutation" logic on the server: when the frontend sends `annotation_submitted`, the server auto-creates the annotation entity (see [Annotation system](#annotation-system) for why). Resist adding any other server-side mutation logic. Every other mutation must come from Claude via PATCH.

---

## Stack (locked)

- **Frontend:** Vanilla Canvas2D only. No React, no DOM frameworks, no CSS frameworks. Native browser `WebSocket` and `fetch`.
- **Server:** Bun (`Bun.serve`) with native WebSocket and built-in pub/sub. No external WS libraries.
- **AI Agent:** Claude Code — spawns the Bun server as a subprocess, reads stdout as its observation channel, calls the server's HTTP API to mutate.
- **Rendering:** CPU-only Canvas2D. No GPU. Hard constraint (work PC environment).
- **Mutation protocol:** JSON Patch (RFC 6902) over `PATCH /api/world`. Keeps payloads small and makes Claude's intent legible in stdout logs.
- **Persistence:** In-memory `Map` for MVP. SQLite (Bun native) is the planned upgrade once sessions need to survive restarts.

### Stack rejections (with reasoning — do not re-litigate)

- **p5.js — rejected.** p5 is built around an imperative `draw()` loop where the sketch owns the tempo. This runtime is **server-driven** — the WebSocket pushes snapshots and the frontend renders in response. p5's mental model fights this. p5 also doesn't help with the hard parts (hit testing, ECS, declarative state rendering); it only saves boilerplate on input handling, which is the easy part.
- **React / DOM frameworks — rejected.** The renderer is Canvas2D. There is no DOM component tree. Pulling in React would introduce a parallel state model competing with the WS snapshot.
- **External WebSocket libraries — rejected.** Bun's built-in `ws.subscribe(topic)` / `server.publish(topic, data)` covers everything we need.
- **GPU rendering / WebGL — rejected.** Hard environment constraint, not a preference.
- **Selection model — rejected.** Every interaction is a discrete intent signal. There is no implicit selection state. Less state to manage, fewer footguns. If selection feels needed, you're probably trying to bolt back on something the design already removed.

---

## Architecture

```
Canvas2D Frontend (browser)
    ↕ WebSocket
Bun Server (world state owner)
    ↓ stdout (console.log)
Claude Code Agent
    ↓ PATCH /api/world
Bun Server
    ↕ server.publish("world", newState)
Canvas2D Frontend (all tabs)
```

The agent observes by reading stdout. The server is the only writer to stdout. The agent is the only caller of `PATCH /api/world` (except for the one server-side annotation auto-create). The frontend is read-only with respect to world state — it only emits intent events and renders snapshots.

---

## Event system

### Semantic events (frontend → server → Claude via stdout)

| Event                  | Payload                                                       | Purpose                                                                            |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `entity_clicked`       | `entityId`, `x`, `y`                                          | User pointed at a thing                                                            |
| `canvas_clicked`       | `x`, `y`                                                      | User pointed at empty space                                                        |
| `annotation_submitted` | `bounds: {x,y,w,h}`, `text`, `enclosedEntityIds: [...]`       | User drew a comment box. Server enriches with spatial query before logging         |

### Immediate events (frontend only — never leave the browser)

| Event                 | Purpose                              |
| --------------------- | ------------------------------------ |
| `pointer_moved`       | Hover highlight on entities          |
| `annotation_drawing`  | Live rectangle preview during drag   |

### Wire format

```json
{ "event": "entity_clicked", "entityId": "book_17", "x": 421, "y": 182 }
```

Server logs each semantic event as a single JSON line to stdout so Claude can parse them with a line-oriented reader.

---

## Annotation system

### Mental model

An annotation is a **sticky note on a Figma file**. The user drags a rectangle around something, types "this color is wrong, make it warmer," and submits. The note persists across tabs and refreshes until Claude resolves the issue and removes it.

### Annotation is an entity, not an event

Annotations are first-class entities in world state, not transient messages. They render through the same Canvas2D path as everything else. They survive refresh. They appear in all tabs. They are deleted by Claude via a mutation when resolved.

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

### Submission flow

1. User drags rectangle on canvas (immediate, frontend-only preview via `annotation_drawing`)
2. On pointer release, a text input appears at the rectangle; user types and submits
3. Frontend sends one WS message containing bounds + text
4. **Server auto-creates the annotation entity** — runs a spatial query against the quadtree to find enclosed entity IDs, stashes them in `metadata.enclosedEntityIds`
5. Server broadcasts new world state to all tabs via `server.publish("world", ...)`
6. Server logs `annotation_submitted` to stdout with `enclosedEntityIds` already resolved
7. Claude Code reads stdout, acts via `PATCH /api/world` (modifying the enclosed entities), deletes the annotation entity when the work is complete

### Why server auto-creates the annotation

Two options were considered:

- **Server auto-creates on submit** — annotation appears **instantly** for all tabs. Server has a small piece of "user intent → mutation" logic.
- **Claude creates via PATCH** — annotation only appears **after Claude wakes up**. Noticeable delay between submit and the sticky note appearing.

The first wins on UX. The cost is that the server is no longer a pure relay — it now translates `annotation_submitted` into a mutation. This is the **one and only** exception to "Claude owns all mutations." Worth naming explicitly so future-you doesn't second-guess it.

### Why server pre-computes enclosed entity IDs

Claude has no ambient awareness of what's on screen. When the user annotates "make these blue," Claude needs to know which entities are inside the rectangle. The server already has the quadtree for hit testing, so the spatial query is cheap. Pushing this to Claude would mean Claude fetches `/api/world` and runs its own geometry — wasteful when the server has the index sitting right there.

**Trade-off:** The enclosed-entity list reflects state at annotation creation time. If entities move later, the list becomes stale. **Acceptable for MVP** — annotations are short-lived (Claude resolves them quickly).

---

## Server responsibilities

The server owns, exclusively:

- Canonical world state
- Spatial index (quadtree) for hit testing
- WebSocket pub/sub for broadcasting state to tabs
- HTTP API: `GET /api/world` (snapshot), `PATCH /api/world` (apply JSON Patch)
- Stdout observation channel — logs `user_interaction` and `mutation_applied` events as single-line JSON
- The one translation: `annotation_submitted` → auto-create annotation entity with enriched `enclosedEntityIds`

Everything else is Claude's job (mutations) or the frontend's job (rendering, immediate-tier interactions).

---

## Workflow

### Step 1 — Bootstrap or attach (once per workspace)

The runtime lives at `<project_root>/.claude/live-render-workspace`. Use `pwd` as the project root when not inside a git repo.

**Pick a port (deterministic, uncommon, project-stable):**

Common dev-server ports (3000, 5173, 8000, 8080…) are landmines — they collide with whatever else the user is running. Derive a project-stable port in the 40000–49999 range by hashing the workspace path. The same project always lands on the same port, so a returning session can find an existing server with one `curl`.

```bash
WORKSPACE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/live-render-workspace"
PORT_HEX=$(printf '%s' "$WORKSPACE" | shasum | head -c 4)
PORT=$((40000 + 16#$PORT_HEX % 10000))
URL="http://localhost:$PORT"
echo "live-render port for this workspace: $PORT"
```

**Check if the server is already running:**

```bash
curl -sI "$URL/api/world" 2>/dev/null | head -1
```

If you get `HTTP/200` back, the server is up. Skip to Step 2.

**If the workspace doesn't exist yet:**

```bash
mkdir -p "$(dirname "$WORKSPACE")"
cp -r ~/.claude/skills/live-render/assets/runtime-template "$WORKSPACE"
cd "$WORKSPACE"
bun install
```

**Detect a stale catalog-era workspace** (the v1 React/Vite layout):

```bash
[ -f "$WORKSPACE/vite.config.ts" ] && echo "v1-catalog-layout"
```

If `v1-catalog-layout` is printed, tell the user: "Your live-render workspace uses the old catalog-spec renderer (v1). The new semantic spatial runtime is fundamentally different — Canvas2D + Bun + agent loop. Want me to archive v1 and bootstrap the new runtime?" On yes: move existing contents to `$WORKSPACE/.archive-v1/` and copy `runtime-template` over.

**Start the server (the agent's observation channel is its stdout):**

The `PORT` env var pins the server to the project-stable port computed above. Pass it through whichever multiplexer is running.

```bash
CMD="PORT=$PORT bun run server.ts"

if [ -n "$ZELLIJ" ]; then
  zellij action new-tab --name live-render --cwd "$WORKSPACE" --layout-dir /dev/null 2>/dev/null
  zellij action write-chars "$CMD"
  zellij action write 13
elif [ -n "$TMUX" ]; then
  tmux new-window -n live-render -c "$WORKSPACE" "$CMD"
else
  tmux has-session -t live-render 2>/dev/null \
    || tmux new-session -d -s live-render -c "$WORKSPACE" "$CMD"
fi
```

If the chosen port is already bound by another process (rare given the 40000–49999 range, but possible), the server will fail to start with `EADDRINUSE` — surface that to the user and bump `PORT` by 1 (or pick a different unused workspace path) rather than trying to be clever here.

**Wait for the server to be ready, then open the browser for the user:**

```bash
for _ in $(seq 1 20); do
  curl -sSf -o /dev/null "$URL/api/world" && break
  sleep 0.2
done

# Open the URL in the user's default browser. `open` on macOS; `xdg-open` on
# most Linux desktops; `start` via cmd on WSL/Windows. Run detached and silenced
# so a missing opener never blocks the agent loop.
if command -v open >/dev/null 2>&1; then
  open "$URL" >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
elif command -v wslview >/dev/null 2>&1; then
  wslview "$URL" >/dev/null 2>&1 &
elif command -v cmd.exe >/dev/null 2>&1; then
  cmd.exe /c start "" "$URL" >/dev/null 2>&1 &
fi
```

Tell the user: "I've started the semantic spatial runtime at **$URL** and opened it in your browser. All tabs share the same world. Drag a rectangle on the canvas to leave me an annotation." (Substitute the actual port — e.g. `http://localhost:47823` — when speaking to the user; don't leave `$URL` literal in chat.)

If no opener was found (uncommon — headless box, restricted shell), surface that to the user: "I couldn't auto-open a browser on this system. Open **$URL** manually."

### Step 2 — Read context before mutating

Before any PATCH, fetch the current snapshot (use the project-stable `$URL` from Step 1; **do not** hardcode `5174` or `47823` in commands you save):

```bash
curl -s "$URL/api/world" | jq .
```

The world is the ground truth. Do not trust your memory of it across messages — re-fetch when you've been away.

### Step 3 — React to stdout, mutate via PATCH

The agent loop is event-driven on stdout. Each line is a JSON event. Two event types matter:

| Stdout event       | What it means                                  | Typical response                          |
| ------------------ | ---------------------------------------------- | ----------------------------------------- |
| `user_interaction` | A semantic event from the frontend             | Decide whether to act, fetch state if so  |
| `mutation_applied` | A mutation was accepted (your own or another)  | Optional — useful for reasoning about delta |

When you decide to act, send a JSON Patch:

```bash
curl -s -X PATCH "$URL/api/world" \
  -H 'content-type: application/json' \
  -d '[{"op":"replace","path":"/entities/book_17/metadata/color","value":"#c47b3a"}]'
```

The server applies the patch, broadcasts the new snapshot, and logs `mutation_applied` to stdout.

### Step 4 — Resolving annotations

An annotation entity is an open ticket. To resolve:

1. Read its `metadata.text` to understand intent
2. Read its `metadata.enclosedEntityIds` to know what it points at
3. Apply the mutation that addresses the request
4. Delete the annotation in the same patch (or a follow-up patch):

```json
[
  { "op": "replace", "path": "/entities/book_17/metadata/color", "value": "#c47b3a" },
  { "op": "remove",  "path": "/entities/annotation_3" }
]
```

### Step 5 — Verify (optional)

For visual sanity checks only — never as a substitute for `GET /api/world`. Use Playwright headless if available, screenshot the canvas, and visually confirm the render. World state is ground truth; pixels are downstream.

---

## What is built vs not built

The `assets/runtime-template/` directory is a working MVP skeleton with:

- Bun `server.ts` with `Bun.serve`, WebSocket pub/sub, `GET/PATCH /api/world`
- `worldState.ts` — in-memory ECS-style world with snapshot/mutate. The spatial index intentionally excludes `region` and `edge` entities (non-interactive backdrops/arrows) so only `node` entities participate in hit testing and annotation enclosure.
- `quadtree.ts` — spatial index for hit testing and enclosure queries
- `public/index.html` + `public/client.js` — Canvas2D renderer, WS client, immediate-tier handlers (hover tooltip, click-to-focus with non-neighbor dimming, slide-in detail drawer showing description + 1-hop connections + Annotate / Ask-Claude buttons, annotation drag/submit). Click empty canvas or press Esc to clear focus.
- `CLAUDE.md` — agent instructions for the runtime project (separate from this skill)
- A seed world with one region, three nodes, and two edges, so first boot demonstrates each render-distinct entity type

**Four render-distinct entity types** the renderer knows about:

| Type         | Visual                                                | Required metadata             | Interactive |
| ------------ | ----------------------------------------------------- | ----------------------------- | ----------- |
| `node`       | Card with icon, title, subtitle, accent top strip    | `title`                       | yes — hover, click, annotation enclosure |
| `edge`       | Directed curved arrow between two nodes, optional label | `from`, `to` (node ids)     | no          |
| `region`     | Translucent labeled backdrop grouping a cluster       | `title`                       | no          |
| `annotation` | Yellow sticky note with text (server-created)         | `text`, `enclosedEntityIds`  | passively shown; deleted by agent on resolve |

Beyond these, any other `type` falls through to the generic node renderer (so you can add new semantic types without breaking the canvas).

**Deferred (intentional):**

- Persistent storage (SQLite) — in-memory `Map` is fine for MVP
- Animation/transition system — semantic continuity during entity moves needs design first
- Custom node renderers per type (e.g., `service` vs `datastore` icons) — currently dispatched only by `metadata.icon`; specialised shapes are a future extension
- Agent loop tempo / scheduling — see [Open questions](#open-questions)

---

## Canvas composition — make it look designed, not generated

The renderer can show beautiful, restrained diagrams. Default agent output, left alone, drifts into AI-slop visuals — emoji-encrusted cards, eight-colour rainbow palettes, no grid, no hierarchy, edges crossing in every direction. These rules are calibrated to the four built-in render paths and are **load-bearing** when you compose or mutate a canvas. Long form: [`references/canvas-design.md`](references/canvas-design.md).

### Palette — three accents, max

Pick one **primary** accent for the canvas's centre of mass and up to two supporting accents for adjacent clusters. Everything else uses neutral surface tones. **Never more than three accents in one world.** Colour carries semantic load — same accent = same conceptual layer.

Default palette (saturated for accent strips / edges; translucent companion for region fills / edge labels):

| Role      | Hex        | Translucent                |
| --------- | ---------- | -------------------------- |
| Primary   | `#6a8aff`  | `rgba(106,138,255,0.18)`   |
| Secondary | `#7ec699`  | `rgba(126,198,153,0.18)`   |
| Tertiary  | `#f3b562`  | `rgba(243,181,98,0.18)`    |
| Warning   | `#e07b91`  | `rgba(224,123,145,0.18)`   |
| Muted     | `#9aa3b8`  | `rgba(154,163,184,0.16)`   |

Reject neon purples as primary, pure black/white surfaces, and pastel rainbow gradients. They read as slop.

### Typography & copy

Each node has three text slots — keep them in their lanes:

- `title` — 1–4 words, noun phrase, sentence case. What the entity *is*.
- `subtitle` — ≤ 6 words. Its type or classifier.
- `desc` — 1–3 full sentences. Hover-only context; assume the reader already sees title + subtitle.

**Banned copy:** marketing adjectives (powerful, smart, seamless, robust, modern, beautiful), emojis inside title/subtitle, all-caps titles, trailing punctuation on title/subtitle, and `desc` strings that restate the title.

**Icons.** `metadata.icon` accepts one emoji. Use it only when it *classifies* the node at a glance (👁️ read, ✏️ write, 🔒 locked). Decorative chrome (🚀 ✨ 🎯 💡 🔥) is the strongest slop tell. **When in doubt, omit the icon.**

### Spatial composition — the 8 px grid

Snap every coordinate, width, and height to multiples of **8**. Random pixels read as noise.

Node size tiers (`width × height`):
- Standard: `220 × 64` — default.
- Wide: `280 × 64` — long titles you can't shorten.
- Compact: `160 × 64` — dense classifier clusters.
- Banner: `540 × 64` — full-row items like impl-plan steps.

**Within a row or column, every node uses the same width.** Height stays at 64 unless the design genuinely demands more.

Regions need **≥ 24 px inner padding** around their contents and **≥ 32 px gap** to adjacent regions. They must never touch or overlap. The 1600×900 canvas has a usable area of ≈ 1536×836 — common grids:

- Two columns: ~760 px each, 32 px gutter at x ≈ 800.
- Four columns: ~370 px each, 32 px gutters.
- Top/bottom halves: divider at y ≈ 480.

### Edge discipline

Edges are the loudest source of visual noise — aggressive hygiene is non-negotiable.

- **Cull.** If region containment or adjacency already conveys the relationship, no edge.
- **No crossings.** If two edges would cross, reposition nodes first.
- **One edge per pair per direction.** Fold multiple facts into one label or move them into `desc`.
- **Labels:** ≤ 4 words, lowercase, no punctuation. Empty string when meaning is obvious from context.
- **Solid vs dashed:** solid = primary/structural/synchronous; dashed = derived/async-return/inheritance. Don't dash for variety.
- **Opacity:** edges use the translucent companion (alpha 0.4–0.7). Fully saturated strokes overpower the nodes.
- **Time-ordered flows:** prefix labels with `1.`, `2.`, … so the sequence is readable without prose.

### Region composition

A region is a labeled cluster — it earns its place only if its contents share one concept worth naming.

- Sentence case title, ≤ 8 words, describes what's *inside*.
- Region accent = the dominant node accent inside it.
- One region per concept layer. **Don't nest. Don't create a region for a single node.**

### Composition archetypes — pick one

Mixing archetypes in one canvas is what creates incoherence. Pick the grammar that fits the intent and stick to it:

1. **Concept map** — layered left-to-right by abstraction, one region per layer, edges between adjacent layers only. 1–2 accents.
2. **Sequence / flow** — single horizontal row of actor nodes, numbered edges (`1.`, `2.`, …), solid for forward calls, dashed for returns. Tertiary accent (`#f3b562`) is the default.
3. **Architecture diagram** — cluster by deployment unit; region per cluster; primary accent on the subject cluster, muted on context clusters. Edges only for runtime connections.
4. **Decision / state map** — nodes are states, edges are transitions, edge labels are the condition. Warning accent for terminal failures only.

### When mutating an existing canvas

Read the current snapshot first and identify the existing palette and grid. **Do not introduce a fourth colour or off-grid coordinates.** New nodes inherit the local cluster's accent and width. If you must move things to make room, move them on the 8 px grid — never shave 7 px off a region to squeeze something in. Resolving an annotation is a composition act, not a free-for-all repaint.

### Slop-detection checklist

Before every `PATCH /api/world`, scan the patch. If any of the below is true, you are about to ship slop — fix it first:

- Every node has an emoji icon "to make it pop"
- More than 3 distinct accent colours in the world
- Accents picked from the generic AI purple/blue/cyan trio with no semantic meaning
- Titles read like marketing copy ("🚀 Powerful Service Engine")
- Node widths vary at random within the same row or column
- Regions wrap their contents with < 24 px of breathing room, or two regions touch
- An edge crosses three other edges to reach its target
- An edge label is longer than its source node's title
- `desc` is empty or restates the title
- A region exists with one node inside it

---

## Open questions

These are unresolved and **deliberately left unresolved**. Don't fabricate answers. When the user asks, surface them as open and ask them to choose.

1. **Semantic ontology beyond the four built-ins** — `node`/`edge`/`region`/`annotation` are the render-distinct types. What richer node sub-types (service, datastore, queue, person, document, dashboard, …) deserve their own visual treatment vs. just an emoji icon on a generic card? Defer until a real use case argues for a specialised renderer.
2. **Persistence** — when do we cut over from in-memory `Map` to SQLite? Probably the first time someone loses state by restarting the server during demo prep.
3. **Animation system** — how are transitions orchestrated to preserve semantic continuity when entities move/resize?
4. **Claude Code agent loop tempo** — how does the agent decide *when* to act vs wait on stdout events? Needs spec in `CLAUDE.md` — next design conversation.

---

## Reference files

| File                                             | Contents                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| `references/mental-model.md`                     | Long-form mental model: semantic entities, two-tier split, ambient awareness, darkroom |
| `references/event-catalog.md`                    | Full event reference with payload schemas and dispatch rules              |
| `references/annotation-system.md`                | Annotation entity flow, the auto-create exception, and trade-offs         |
| `references/mutation-protocol.md`                | JSON Patch protocol, examples, and stdout log shape                       |
| `references/architecture-decisions.md`           | Locked decisions and rejections with the reasoning behind each            |
| `references/canvas-design.md`                    | Visual design rules — palette, typography, grid, edges, slop-detection checklist |
| `assets/runtime-template/`                       | The Bun + Canvas2D skeleton copied into each project's workspace          |
| `assets/runtime-template/CLAUDE.md`              | Agent instructions for the runtime workspace itself                       |

---

## Design principles

1. **Semantic entities are the source of truth.** Pixels are downstream. If you find yourself caching things on the frontend that don't come from the WS snapshot, you've drifted off the model.
2. **Two-tier split is load-bearing.** Anything you'd describe as "preview", "highlight", or "live drag" is immediate-tier and stays in the browser. Anything you'd describe as "the user committed to X" is semantic-tier and crosses the wire.
3. **Claude owns all mutations.** The annotation auto-create is the **only** exception. Resist adding more.
4. **Stdout is the agent's eyes.** Keep log lines parseable (one JSON object per line) and sparse (only semantic events + mutation confirmations).
5. **World state is canonical.** When in doubt, `GET /api/world`. Never trust a cached snapshot across messages.
6. **Composition is part of the job.** A patch that places entities on a random grid with random colours is not "done." See [Canvas composition](#canvas-composition--make-it-look-designed-not-generated) — three accents max, 8 px grid, ≥ 24 px region padding, no edge crossings, no marketing copy, no emoji chrome. Run the slop-detection checklist before shipping.
