import type {
  AnnotationEntity,
  EdgeEntity,
  Entity,
  NodeEntity,
  RegionEntity,
  Spatial,
  World,
} from './types'

const intersects = (a: Spatial, b: Spatial): boolean => {
  const ax2 = a.x + a.width
  const ay2 = a.y + a.height
  const bx2 = b.x + b.width
  const by2 = b.y + b.height
  return !(ax2 <= b.x || bx2 <= a.x || ay2 <= b.y || by2 <= a.y)
}

const contains = (outer: Spatial, inner: Spatial): boolean => {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

export const partitionEntities = (world: World) => {
  const all = Object.values(world.entities) as Entity[]
  const regions = all.filter((e): e is RegionEntity => e.type === 'region')
  const nodes = all.filter((e): e is NodeEntity => e.type === 'node')
  const edges = all.filter((e): e is EdgeEntity => e.type === 'edge')
  const annotations = all.filter(
    (e): e is AnnotationEntity => e.type === 'annotation',
  )
  return { regions, nodes, edges, annotations }
}

export const nodesInRegion = (
  region: RegionEntity,
  nodes: NodeEntity[],
): NodeEntity[] => {
  return nodes.filter(
    (n) => contains(region.spatial, n.spatial) || intersects(region.spatial, n.spatial),
  )
}

export const edgesForNodes = (
  nodeIds: Set<string>,
  edges: EdgeEntity[],
): EdgeEntity[] => {
  return edges.filter(
    (e) => nodeIds.has(e.metadata.from) || nodeIds.has(e.metadata.to),
  )
}

export const annotationsForRegion = (
  region: RegionEntity,
  annotations: AnnotationEntity[],
  nodeIds: Set<string>,
): AnnotationEntity[] => {
  return annotations.filter((a) => {
    if (a.metadata.enclosedEntityIds.some((id) => nodeIds.has(id))) return true
    return intersects(region.spatial, a.spatial)
  })
}

export const unresolvedAnnotations = (
  annotations: AnnotationEntity[],
): AnnotationEntity[] => annotations.filter((a) => !a.metadata.resolved)
