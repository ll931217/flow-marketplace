// Quadtree spatial index for hit testing and enclosure queries.
// Stores axis-aligned bounding boxes keyed by entity id.

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Node {
  bounds: Bounds;
  items: Array<{ id: string; bounds: Bounds }>;
  children: Node[] | null;
}

const MAX_ITEMS = 8;
const MAX_DEPTH = 8;

function makeNode(bounds: Bounds): Node {
  return { bounds, items: [], children: null };
}

function contains(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function intersects(a: Bounds, b: Bounds): boolean {
  return !(
    b.x > a.x + a.width ||
    b.x + b.width < a.x ||
    b.y > a.y + a.height ||
    b.y + b.height < a.y
  );
}

function pointIn(b: Bounds, x: number, y: number): boolean {
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

function split(node: Node): void {
  const { x, y, width, height } = node.bounds;
  const hw = width / 2;
  const hh = height / 2;
  node.children = [
    makeNode({ x, y, width: hw, height: hh }),
    makeNode({ x: x + hw, y, width: hw, height: hh }),
    makeNode({ x, y: y + hh, width: hw, height: hh }),
    makeNode({ x: x + hw, y: y + hh, width: hw, height: hh }),
  ];
  const items = node.items;
  node.items = [];
  for (const item of items) insertInto(node, item, 0);
}

function insertInto(
  node: Node,
  item: { id: string; bounds: Bounds },
  depth: number,
): void {
  if (node.children) {
    for (const child of node.children) {
      if (contains(child.bounds, item.bounds)) {
        insertInto(child, item, depth + 1);
        return;
      }
    }
    node.items.push(item);
    return;
  }
  node.items.push(item);
  if (node.items.length > MAX_ITEMS && depth < MAX_DEPTH) split(node);
}

function queryPoint(node: Node, x: number, y: number, out: string[]): void {
  if (!pointIn(node.bounds, x, y)) return;
  for (const item of node.items) {
    if (pointIn(item.bounds, x, y)) out.push(item.id);
  }
  if (node.children) {
    for (const child of node.children) queryPoint(child, x, y, out);
  }
}

function queryEnclosed(node: Node, region: Bounds, out: string[]): void {
  if (!intersects(node.bounds, region)) return;
  for (const item of node.items) {
    if (contains(region, item.bounds)) out.push(item.id);
  }
  if (node.children) {
    for (const child of node.children) queryEnclosed(child, region, out);
  }
}

export class Quadtree {
  private root: Node;

  constructor(bounds: Bounds) {
    this.root = makeNode(bounds);
  }

  insert(id: string, bounds: Bounds): void {
    insertInto(this.root, { id, bounds }, 0);
  }

  // Returns ids of entities whose bounds contain (x, y), topmost insertion order last.
  hit(x: number, y: number): string[] {
    const out: string[] = [];
    queryPoint(this.root, x, y, out);
    return out;
  }

  // Returns ids of entities fully enclosed by region.
  enclosed(region: Bounds): string[] {
    const out: string[] = [];
    queryEnclosed(this.root, region, out);
    return out;
  }
}
