// Bun server. Owns world state, broadcasts snapshots over WebSocket,
// and writes a stdout event stream the Claude Code agent reads.
//
// ARCHITECTURAL RULES (do not break casually — see ../../SKILL.md):
//  - Server is a near-pure relay. The agent owns mutations.
//  - Exactly ONE exception: annotation_submitted is translated into an
//    annotation entity insertion right here, so the sticky note shows
//    up instantly for all tabs instead of waiting for the agent loop.
//  - Stdout is the agent's eyes. One JSON object per line. Sparse.

import { WorldState, seedSnapshot, type JsonPatchOp } from "./worldState.ts";

// Default port is deliberately uncommon — avoids collisions with the usual
// dev-server suspects (3000, 5173, 8000, 8080…). The skill's bootstrap
// computes a project-stable port from the workspace path and passes it via
// PORT, so this default is only used when running the template standalone.
const PORT = Number(Bun.env.PORT ?? 47823);
const world = new WorldState(seedSnapshot());

interface AnnotationSubmittedMsg {
  event: "annotation_submitted";
  bounds: { x: number; y: number; width: number; height: number };
  text: string;
}

interface SemanticEventMsg {
  event: "entity_clicked" | "canvas_clicked";
  entityId?: string;
  x: number;
  y: number;
}

type ClientMsg = AnnotationSubmittedMsg | SemanticEventMsg;

function logJson(record: Record<string, unknown>): void {
  console.log(JSON.stringify(record));
}

function broadcast(): void {
  server.publish("world", JSON.stringify({ kind: "snapshot", state: world.snapshot() }));
}

const server = Bun.serve({
  port: PORT,
  async fetch(req, srv) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (srv.upgrade(req)) return undefined;
      return new Response("upgrade failed", { status: 400 });
    }

    if (url.pathname === "/api/world") {
      if (req.method === "GET") {
        return Response.json(world.snapshot());
      }
      if (req.method === "PATCH") {
        let patch: JsonPatchOp[];
        try {
          patch = (await req.json()) as JsonPatchOp[];
        } catch {
          return Response.json({ ok: false, error: "invalid json" }, { status: 400 });
        }
        if (!Array.isArray(patch)) {
          return Response.json({ ok: false, error: "patch must be an array" }, { status: 400 });
        }
        try {
          world.mutate(patch);
        } catch (err) {
          return Response.json(
            { ok: false, error: err instanceof Error ? err.message : String(err) },
            { status: 422 },
          );
        }
        logJson({ event: "mutation_applied", patch, version: world.snapshot().version });
        broadcast();
        return Response.json({ ok: true, version: world.snapshot().version });
      }
      return new Response("method not allowed", { status: 405 });
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(`${import.meta.dir}/public/index.html`));
    }
    if (url.pathname === "/client.js") {
      return new Response(Bun.file(`${import.meta.dir}/public/client.js`));
    }

    return new Response("not found", { status: 404 });
  },

  websocket: {
    open(ws) {
      ws.subscribe("world");
      ws.send(JSON.stringify({ kind: "snapshot", state: world.snapshot() }));
    },

    message(ws, raw) {
      let msg: ClientMsg;
      try {
        msg = JSON.parse(String(raw)) as ClientMsg;
      } catch {
        return;
      }

      if (msg.event === "annotation_submitted") {
        // The one server-side mutation. See SKILL.md "annotation system".
        const id = world.nextId("annotation");
        const enclosed = world.enclosed(msg.bounds);
        world.insertEntity({
          id,
          type: "annotation",
          metadata: {
            text: msg.text,
            enclosedEntityIds: enclosed,
            createdAt: Date.now(),
          },
          spatial: msg.bounds,
        });
        logJson({
          event: "annotation_submitted",
          id,
          bounds: msg.bounds,
          text: msg.text,
          enclosedEntityIds: enclosed,
        });
        broadcast();
        return;
      }

      // All other semantic events are passed through to stdout. The agent
      // observes and decides whether to act. No state changes here.
      const { event, ...rest } = msg;
      logJson({ event: "user_interaction", kind: event, ...rest });
    },

    close(ws) {
      ws.unsubscribe("world");
    },
  },
});

logJson({
  event: "server_started",
  port: server.port,
  url: `http://localhost:${server.port}`,
});
