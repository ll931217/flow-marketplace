# Architecture decisions — locked, with reasoning

Each entry has a decision, the reasoning, and the rejected alternative(s). Future sessions reading this file should not re-litigate these unless the underlying constraints have changed.

---

## ADR-1: Vanilla Canvas2D for the frontend

**Decision:** The frontend is plain HTML + Canvas2D + native browser `WebSocket` and `fetch`. No React, Vue, Svelte, CSS framework, or bundler.

**Reasoning:**

- The renderer's domain is "draw a list of bounded rectangles given a JSON snapshot." A DOM/component tree is the wrong abstraction — there is no per-entity component lifecycle to manage.
- Bringing in a framework introduces a parallel state model (component state, props, effects) competing with the WS snapshot as ground truth.
- Build tooling is overhead with no payoff at this scale. The client is one HTML file + one JS file served directly by Bun.

**Rejected:**

- **React + Vite** (the v1 stack). Forced a virtual DOM diff against a renderer that doesn't have a DOM. The old workspace-template had a 50+ component catalog that was orthogonal to spatial state — useful for a different product, not this one.
- **WebGL / GPU shaders.** Hard constraint: work PC environment is CPU-only.

---

## ADR-2: Bun for the server

**Decision:** `Bun.serve` for HTTP + WebSocket. No Express, no socket.io, no separate WS library.

**Reasoning:**

- Bun has WebSocket and pub/sub (`ws.subscribe(topic)` / `server.publish(topic, ...)`) built in.
- Native TypeScript execution — no build step, no `tsx`/`ts-node` choreography.
- Single binary install. Trivial bootstrap.
- The agent loop reads the server's stdout. Bun's process model gives us that for free.

**Rejected:**

- **Node + Express + ws.** Three dependencies to do what one binary does. More config surface for a one-file server.
- **Deno.** Comparable feature set, but Bun's ecosystem and install story are smoother for the agent-as-subprocess use case.

---

## ADR-3: JSON Patch (RFC 6902) as the mutation protocol

**Decision:** `PATCH /api/world` accepts a JSON Patch array. Mutations are applied atomically.

**Reasoning:**

- Small payloads. A typical mutation is ~80 bytes vs ~10KB for the full snapshot.
- Legible in stdout. The patch logs make the agent's intent visible to anyone reading the stream.
- Standard. RFC 6902 is well-specified — `add`/`remove`/`replace`/`move`/`copy`/`test` covers every case we've thought of.
- Atomic application means the agent doesn't write rollback logic.

**Rejected:**

- **PUT /api/world (whole-document replace).** Wasteful payloads, awful diffs in logs, no concurrency safety.
- **GraphQL mutations.** Schema overhead, more tooling, no advantage at this scale.
- **Custom DSL ("setColor", "moveEntity", etc.).** A new ad-hoc protocol where a well-known one exists.

---

## ADR-4: Two-tier interaction split

**Decision:** Frontend dispatches presentation events (hover, drag preview) locally and **never** forwards them. Semantic events (click, annotation submit) cross the WS.

**Reasoning:** See [mental-model.md](./mental-model.md). The agent's stdout is its observation channel. Forwarding 60Hz pointer-move events would drown useful signal. The throttle is a categorical dispatch decision, not a rate limit.

**Rejected:**

- **Forward everything; let the agent decide.** Untenable — the agent can't process events faster than they fire, and "deciding" is itself expensive context.
- **Throttle pointer events to N Hz and forward.** A rate limit doesn't fix the categorical problem: hover is never useful to the agent. Don't forward it at all.

---

## ADR-5: Server is a near-pure relay

**Decision:** The server owns canonical state and the spatial index. The agent owns mutations. There is exactly **one** exception: `annotation_submitted` is translated server-side into an entity insertion.

**Reasoning:**

- Single owner of mutation logic (the agent) keeps the system legible.
- The annotation exception is justified by UX latency — see [annotation-system.md](./annotation-system.md). The user must see the sticky note appear instantly; waiting for the agent loop is unacceptable.
- The pre-computed `enclosedEntityIds` exploits the server's existing quadtree. Pushing the geometry to the agent would be wasteful.

**Rejected:**

- **Server has no mutation logic; agent creates annotations.** Causes visible delay between submit and render — bad UX.
- **Server has lots of "smart" mutation logic.** Erodes the agent's role and splits responsibility for behavior across two places.

---

## ADR-6: No selection model

**Decision:** There is no "selected entity" state, no multi-select set, no "current focus." Every interaction is a discrete intent signal.

**Reasoning:**

- Selection state introduces a parallel mode-machine that has to be synchronized across tabs and consistent with snapshots.
- The use cases that motivate selection ("apply this to the thing I just clicked") are better served by either (a) annotations carrying explicit `enclosedEntityIds`, or (b) the agent inferring continuity from a sequence of events when intent is clear.
- If "selection" ever feels needed, the right next step is usually a richer annotation flow, not a selection store.

**Rejected:**

- **Implicit selection** ("the last clicked entity is the current target"). Footguns: ambiguous after tab refresh, hard to communicate to the user, conflicts with the agent's stateless event interpretation.
- **Explicit selection mode.** Adds a UI mode the user has to think about. Annotations achieve the same thing with stronger intent.

---

## ADR-7: In-memory persistence for MVP

**Decision:** World state lives in a JavaScript `Map` on the server. Restarts lose state.

**Reasoning:**

- Faster to build, fewer dependencies.
- Annotations are short-lived; the user typically isn't relying on cross-session continuity yet.
- The upgrade path to SQLite (Bun has native support, `bun:sqlite`) is short and well-understood — defer until someone loses state in a way that hurts.

**Rejected:**

- **SQLite from day one.** Premature for MVP; adds schema/migration concerns before the entity ontology stabilizes.
- **Append-only JSON log on disk.** Quick to write, slow to read on restart, easy to corrupt.

**Trigger to revisit:** Anyone losing state in a demo, OR session lengths exceeding ~1 hour as common usage.

---

## ADR-8: Playwright is verification only, never perception

**Decision:** If Playwright is used, it's a headless render verification sandbox. Claude does not "see" the live session through it.

**Reasoning:** Detailed in [mental-model.md](./mental-model.md#playwright-is-a-darkroom-not-eyes). Screen-scraping the live session would make the agent's behavior unpredictable, leak presentation details into reasoning, and bypass the semantic tier.

**Rejected:**

- **Use Playwright to give the agent eyes on the user's screen.** Defeats the entire two-tier split. Forces a parallel observation channel that competes with stdout.

---

## ADR-9: Agent observes via stdout, mutates via HTTP

**Decision:** The agent's read channel is `stdout` (one JSON event per line). The agent's write channel is `PATCH /api/world`.

**Reasoning:**

- stdout is universal across runtimes — works whether the agent is Claude Code, a CLI, or piped through `jq`.
- HTTP for mutations is debuggable with `curl`. Anyone can reproduce an agent action by hand.
- Asymmetric channels (read vs write) make the agent's role obvious: it reacts to events and applies changes. It doesn't subscribe to the WS, doesn't render anything, doesn't manage UI state.

**Rejected:**

- **Agent subscribes to the WS like a frontend.** Conflates the agent with a viewer. WS pushes are full snapshots; the agent wants per-event signal.
- **Agent uses a custom RPC.** HTTP + JSON Patch is debuggable; an RPC would not be.

---

## ADR-10: Quadtree for spatial index

**Decision:** A simple recursive-subdivision quadtree, rebuilt on every mutation.

**Reasoning:**

- Hit testing and enclosure queries are both O(log N) once indexed.
- Rebuild-on-mutate is simple and correct. At MVP scale (≤ thousands of entities), rebuilding takes ~microseconds.
- Incremental update is a future optimization with a clear path (`remove(id)` + `insert(id, newBounds)` per changed entity).

**Rejected:**

- **R-tree / k-d tree.** More complex, no meaningful advantage at our scale.
- **Brute-force iteration on every query.** Fine for tens of entities; bad once we have hundreds.
- **No index — linear scan in hot paths.** Already too slow for annotation enclosure queries on a moderately full canvas.
