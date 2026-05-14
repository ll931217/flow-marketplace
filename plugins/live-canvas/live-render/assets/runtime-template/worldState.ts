// Canonical world state. Owns the entity map and the spatial index.
// Mutations are applied via JSON Patch (RFC 6902) — the agent's wire format.

import { Quadtree, type Bounds } from "./quadtree.ts";

export interface Entity {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  spatial: Bounds;
}

export interface Snapshot {
  version: number;
  entities: Record<string, Entity>;
  canvas: Bounds;
}

export type JsonPatchOp =
  | { op: "add"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "replace"; path: string; value: unknown }
  | { op: "move"; from: string; path: string }
  | { op: "copy"; from: string; path: string }
  | { op: "test"; path: string; value: unknown };

function parsePath(path: string): string[] {
  if (path === "" || path === "/") return [];
  if (!path.startsWith("/")) throw new Error(`bad pointer: ${path}`);
  return path
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function getParent(
  doc: unknown,
  segments: string[],
): { parent: Record<string, unknown> | unknown[]; key: string } {
  if (segments.length === 0) throw new Error("cannot operate on root");
  let cur: any = doc;
  for (let i = 0; i < segments.length - 1; i++) {
    cur = cur[segments[i] as string];
    if (cur == null) throw new Error(`path not found: /${segments.slice(0, i + 1).join("/")}`);
  }
  return { parent: cur, key: segments[segments.length - 1] as string };
}

function applyOp(doc: Snapshot, op: JsonPatchOp): void {
  const segments = parsePath(op.path);
  if (op.op === "add" || op.op === "replace") {
    const { parent, key } = getParent(doc, segments);
    if (Array.isArray(parent)) {
      const idx = key === "-" ? parent.length : Number(key);
      if (op.op === "add") parent.splice(idx, 0, op.value);
      else parent[idx] = op.value;
    } else {
      parent[key] = op.value;
    }
    return;
  }
  if (op.op === "remove") {
    const { parent, key } = getParent(doc, segments);
    if (Array.isArray(parent)) parent.splice(Number(key), 1);
    else delete parent[key];
    return;
  }
  if (op.op === "move" || op.op === "copy") {
    const fromSeg = parsePath((op as { from: string }).from);
    const { parent: fp, key: fk } = getParent(doc, fromSeg);
    const value = Array.isArray(fp) ? fp[Number(fk)] : fp[fk];
    if (op.op === "move") {
      if (Array.isArray(fp)) fp.splice(Number(fk), 1);
      else delete fp[fk];
    }
    applyOp(doc, { op: "add", path: op.path, value });
    return;
  }
  if (op.op === "test") {
    const { parent, key } = getParent(doc, segments);
    const cur = Array.isArray(parent) ? parent[Number(key)] : parent[key];
    if (JSON.stringify(cur) !== JSON.stringify(op.value)) {
      throw new Error(`test failed at ${op.path}`);
    }
    return;
  }
  throw new Error(`unsupported op: ${(op as { op: string }).op}`);
}

export class WorldState {
  private state: Snapshot;
  private index: Quadtree;

  constructor(initial: Snapshot) {
    this.state = structuredClone(initial);
    this.index = new Quadtree(this.state.canvas);
    this.rebuildIndex();
  }

  private rebuildIndex(): void {
    this.index = new Quadtree(this.state.canvas);
    for (const id in this.state.entities) {
      const e = this.state.entities[id];
      if (!e) continue;
      // Only index entities with meaningful, non-degenerate spatial bounds.
      // Regions are backdrops (non-interactive), edges have zero bounds, and
      // either would also break the quadtree's depth heuristic on zero-area
      // items at the origin.
      if (e.type === "region" || e.type === "edge") continue;
      if (e.spatial.width <= 0 || e.spatial.height <= 0) continue;
      this.index.insert(e.id, e.spatial);
    }
  }

  snapshot(): Snapshot {
    return structuredClone(this.state);
  }

  // Apply a JSON Patch array. Mutates state in place and bumps version.
  // Returns the new snapshot. Throws if any op fails — caller should treat
  // patches as transactions (no partial application observable).
  mutate(patch: JsonPatchOp[]): Snapshot {
    const draft = structuredClone(this.state);
    for (const op of patch) applyOp(draft, op);
    draft.version = this.state.version + 1;
    this.state = draft;
    this.rebuildIndex();
    return this.snapshot();
  }

  // Server-side helper for hit testing — used to resolve entity_clicked.
  hit(x: number, y: number): string | null {
    const ids = this.index.hit(x, y);
    return ids.length > 0 ? (ids[ids.length - 1] ?? null) : null;
  }

  // Server-side helper for annotation enclosure queries.
  enclosed(region: Bounds): string[] {
    return this.index
      .enclosed(region)
      // exclude annotations themselves so a new annotation doesn't enclose old ones
      .filter((id) => this.state.entities[id]?.type !== "annotation");
  }

  // Insert a new entity directly. Used only by the one server-side mutation
  // path (annotation_submitted). All other mutations must come via mutate().
  insertEntity(entity: Entity): Snapshot {
    return this.mutate([
      { op: "add", path: `/entities/${entity.id}`, value: entity },
    ]);
  }

  nextId(prefix: string): string {
    let n = 0;
    for (const id in this.state.entities) {
      const m = id.match(new RegExp(`^${prefix}_(\\d+)$`));
      if (m && m[1]) n = Math.max(n, Number(m[1]));
    }
    return `${prefix}_${n + 1}`;
  }
}

// Seed world — a tiny demo showing each render-distinct entity type so the
// first boot is recognisably "alive": one region (backdrop), three nodes
// (cards with icon/title/subtitle), and two edges (arrows).
//
// `node`, `edge`, `region`, `annotation` are the four render-distinct types
// the client knows about. Add new metadata fields freely — only the renderer
// in public/client.js needs to learn about them.
export function seedSnapshot(): Snapshot {
  const entities: Record<string, Entity> = {
    region_demo: {
      id: "region_demo",
      type: "region",
      metadata: { title: "Demo — drag a rectangle to annotate", accent: "#6a8aff" },
      spatial: { x: 280, y: 200, width: 1040, height: 360 },
    },
    user: {
      id: "user",
      type: "node",
      metadata: {
        title: "User",
        subtitle: "Sends a request",
        icon: "👤",
        accent: "#9fb4ff",
        desc: "Where intent originates. Talks to the service over HTTPS.",
      },
      spatial: { x: 340, y: 320, width: 240, height: 70 },
    },
    service: {
      id: "service",
      type: "node",
      metadata: {
        title: "Service",
        subtitle: "Application logic",
        icon: "⚙️",
        accent: "#6a8aff",
        desc: "Receives requests, applies business rules, persists state.",
      },
      spatial: { x: 680, y: 320, width: 240, height: 70 },
    },
    store: {
      id: "store",
      type: "node",
      metadata: {
        title: "Datastore",
        subtitle: "Persistence",
        icon: "🐘",
        accent: "#c084ff",
        desc: "Single source of truth for the service's state.",
      },
      spatial: { x: 1020, y: 320, width: 240, height: 70 },
    },
    edge_user_service: {
      id: "edge_user_service",
      type: "edge",
      metadata: {
        from: "user",
        to: "service",
        label: "HTTPS",
        accent: "rgba(159,180,255,0.6)",
      },
      spatial: { x: 0, y: 0, width: 0, height: 0 },
    },
    edge_service_store: {
      id: "edge_service_store",
      type: "edge",
      metadata: {
        from: "service",
        to: "store",
        label: "SQL",
        accent: "rgba(192,132,255,0.55)",
      },
      spatial: { x: 0, y: 0, width: 0, height: 0 },
    },
  };
  return {
    version: 0,
    entities,
    canvas: { x: 0, y: 0, width: 1600, height: 900 },
  };
}
