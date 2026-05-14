export interface Spatial {
  x: number
  y: number
  width: number
  height: number
}

export interface BaseEntity {
  id: string
  type: 'region' | 'node' | 'edge' | 'annotation'
  spatial: Spatial
  metadata: Record<string, unknown>
}

export interface RegionEntity extends BaseEntity {
  type: 'region'
  metadata: {
    title: string
    description?: string
    accent?: string
  }
}

export interface NodeEntity extends BaseEntity {
  type: 'node'
  metadata: {
    title: string
    kind?: string
    accent?: string
    icon?: string
  }
}

export interface EdgeEntity extends BaseEntity {
  type: 'edge'
  metadata: {
    from: string
    to: string
    label?: string
    kind?: string
  }
}

export interface AnnotationEntity extends BaseEntity {
  type: 'annotation'
  metadata: {
    text: string
    enclosedEntityIds: string[]
    createdAt: number
    resolved: boolean
  }
}

export type Entity = RegionEntity | NodeEntity | EdgeEntity | AnnotationEntity

export interface World {
  metadata: {
    title: string
    createdAt: number
  }
  entities: Record<string, Entity>
}
