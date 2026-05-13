# Live Render — Diagram Patterns Reference

Covers Strategies B (SVG), C (p5.js), and E (React Flow).
For data-panel components (Strategy A) see `component-patterns.md`.

---

## Strategy B: SVG Diagram Components

Use when: you need precise spatial layout — flowcharts, architecture maps,
state machines, network graphs. SVG gives you full control at the cost of
manual coordinate math.

### Flowchart Pattern

```tsx
// src/diagrams/FlowChart.tsx
interface Node { id: string; label: string; x: number; y: number; type?: 'start' | 'end' | 'process' | 'decision' }
interface Edge { from: string; to: string; label?: string }

interface FlowChartProps {
  nodes: Node[]
  edges: Edge[]
  width?: number
  height?: number
}

export function FlowChart({ nodes, edges, width = 800, height = 600 }: FlowChartProps) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-secondary)" />
        </marker>
      </defs>

      {/* Edges */}
      {edges.map((edge, i) => {
        const from = nodeMap[edge.from]
        const to = nodeMap[edge.to]
        if (!from || !to) return null
        const mx = (from.x + to.x) / 2
        const my = (from.y + to.y) / 2
        return (
          <g key={i}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="var(--border)" strokeWidth="1.5" markerEnd="url(#arrow)" />
            {edge.label && (
              <>
                {/* Legibility: opaque background rect behind label text */}
                <rect x={mx - 40} y={my - 20} width={80} height={16} rx="3"
                  fill="var(--background)" opacity={0.85} />
                <text x={mx} y={my - 8} textAnchor="middle"
                  fill="var(--text-secondary)" fontSize="11"
                  fontFamily="var(--font-mono)">{edge.label}</text>
              </>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {nodes.map(node => (
        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
          {node.type === 'decision' ? (
            <polygon points="0,-30 50,0 0,30 -50,0"
              fill="var(--surface)" stroke="var(--accent)" strokeWidth="1.5" />
          ) : (
            <rect x="-60" y="-20" width="120" height="40" rx="4"
              fill="var(--surface)"
              stroke={node.type === 'start' || node.type === 'end' ? 'var(--accent)' : 'var(--border)'}
              strokeWidth="1.5" />
          )}
          <text textAnchor="middle" dominantBaseline="middle"
            fill="var(--text-primary)" fontSize="13"
            fontFamily="var(--font-display)" fontWeight={500}>{node.label}</text>
        </g>
      ))}
    </svg>
  )
}
```

### Architecture Box Pattern (layered system diagrams)

```tsx
interface Layer { label: string; components: string[]; color?: string }

export function ArchitectureStack({ layers }: { layers: Layer[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {layers.map((layer, i) => (
        <div key={i} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <div style={{
            width: '100px', flexShrink: 0, fontFamily: 'var(--font-mono)',
            fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase',
            letterSpacing: '0.06em', textAlign: 'right', paddingRight: '12px',
          }}>{layer.label}</div>
          {layer.components.map((comp, j) => (
            <div key={j} style={{
              padding: '12px 20px',
              border: `1px solid ${layer.color ?? 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              background: 'var(--surface)',
              fontWeight: 500, fontSize: '14px',
              flex: 1, textAlign: 'center',
            }}>{comp}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

---

## Strategy C: p5.js Canvas

Use when: you need generative, animated, or simulation-based visuals — force
graphs, particle systems, procedural art.

### p5 Hook Pattern

```tsx
// src/components/P5Canvas.tsx
import { useEffect, useRef } from 'react'
import type p5 from 'p5'

type SketchFn = (p: p5) => void

interface P5CanvasProps {
  sketch: SketchFn
  width?: number
  height?: number
}

export function P5Canvas({ sketch, width = 800, height = 500 }: P5CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let instance: p5
    import('p5').then(({ default: P5 }) => {
      instance = new P5((p: p5) => {
        sketch(p)
        const origSetup = p.setup.bind(p)
        p.setup = () => {
          p.createCanvas(width, height)
          origSetup()
        }
      }, containerRef.current!)
    })
    return () => instance?.remove()
  }, [sketch, width, height])

  return <div ref={containerRef} style={{ width, height }} />
}
```

### Example Sketch: Force-directed Node Graph

```ts
// src/sketches/forceGraph.ts
import type p5 from 'p5'

interface GraphNode { id: string; label: string; x: number; y: number; vx: number; vy: number }
interface GraphEdge { a: string; b: string }

export function forceGraphSketch(nodes: GraphNode[], edges: GraphEdge[]) {
  return (p: p5) => {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, { ...n }]))
    const ns = Object.values(nodeMap)

    p.setup = () => { p.background(15) }

    p.draw = () => {
      p.background(15, 40) // trail effect

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x
          const dy = ns[j].y - ns[i].y
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
          const force = 5000 / (d * d)
          ns[i].vx -= (dx / d) * force; ns[i].vy -= (dy / d) * force
          ns[j].vx += (dx / d) * force; ns[j].vy += (dy / d) * force
        }
      }

      // Spring attraction along edges
      for (const edge of edges) {
        const a = nodeMap[edge.a]; const b = nodeMap[edge.b]
        if (!a || !b) continue
        const dx = b.x - a.x; const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy)
        const force = (d - 100) * 0.005
        a.vx += (dx / d) * force; a.vy += (dy / d) * force
        b.vx -= (dx / d) * force; b.vy -= (dy / d) * force
        p.stroke(60); p.strokeWeight(1); p.line(a.x, a.y, b.x, b.y)
      }

      // Draw nodes
      for (const n of ns) {
        n.vx *= 0.9; n.vy *= 0.9; n.x += n.vx; n.y += n.vy
        n.x = Math.max(40, Math.min(p.width - 40, n.x))
        n.y = Math.max(40, Math.min(p.height - 40, n.y))
        p.noStroke(); p.fill(232, 255, 71); p.circle(n.x, n.y, 12)
        p.fill(240); p.noStroke(); p.textSize(11)
        p.textAlign(p.CENTER); p.text(n.label, n.x, n.y - 10)
      }
    }
  }
}
```

---

## Strategy E: React Flow (@xyflow/react)

Use when: the diagram needs interactivity (drag, pan, zoom), the graph topology
is data-driven, or you want animated edges and custom node rendering without
manual SVG coordinate math.

### Required CSS import

Add once to `src/App.tsx` (or `src/main.tsx`):

```tsx
import '@xyflow/react/dist/style.css'
```

### Minimal Flow Diagram

```tsx
// src/diagrams/FlowDiagram.tsx
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const nodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Start' } },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Process' } },
  { id: '3', position: { x: 400, y: 0 }, data: { label: 'End' } },
]

const edges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

export function FlowDiagram() {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
```

### Custom Node Type

```tsx
// src/diagrams/ServiceNode.tsx
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'

interface ServiceData { label: string; status?: 'healthy' | 'degraded' | 'down' }

export function ServiceNode({ data }: NodeProps<Node<ServiceData>>) {
  const color = data.status === 'healthy' ? '#4ade80'
    : data.status === 'degraded' ? '#facc15'
    : '#f87171'

  return (
    <div style={{
      padding: '12px 20px',
      border: `2px solid ${color}`,
      borderRadius: '8px',
      background: 'var(--surface)',
      fontFamily: 'var(--font-mono)',
      fontSize: '13px',
    }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{data.label}</div>
      {data.status && (
        <div style={{ fontSize: '11px', color, marginTop: '4px' }}>{data.status}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}

// Register and use:
// const nodeTypes = { service: ServiceNode }
// <ReactFlow nodeTypes={nodeTypes} ... />
```

### Legibility Fixes

**Edge label backgrounds** — prevent labels from bleeding into nodes or edges behind them:

```tsx
const edge: Edge = {
  id: 'e1',
  source: '1', target: '2',
  label: 'catalog-info.yaml',
  labelShowBg: true,
  labelBgPadding: [6, 10],
  labelBgBorderRadius: 4,
  labelBgStyle: { fill: '#0d0d1a', fillOpacity: 0.92 },
  labelStyle: { fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace' },
}
```

**Node text overflow** — set explicit width so long names wrap rather than clip:

```tsx
{ id: '1', data: { label: 'GitlabDiscoveryEntityProvider' },
  position: { x: 0, y: 0 }, style: { width: 200 } }
```

**`EdgeLabelRenderer` (full control)** — use when the label midpoint falls on top of
a node, or when you need a styled pill/badge. Labels render in a DOM overlay above the
SVG canvas so they are never clipped by node boundaries:

```tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

export function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 20}px)`,
            pointerEvents: 'all',
            background: 'rgba(13,13,26,0.92)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '4px', padding: '3px 8px',
            fontSize: '11px', fontFamily: 'monospace', color: '#e2e8f0',
            whiteSpace: 'nowrap',
          }}
          className="nodrag nopan"
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

// Register: const edgeTypes = { labeled: LabeledEdge }
// Use:      { id: 'e1', type: 'labeled', label: 'catalog-info.yaml', source: '1', target: '2' }
```

### Data-driven DAG Helper

Converts a plain adjacency list into React Flow `nodes`/`edges` with auto-positioning
by topological rank. Replace the rank-based position logic with `dagre` for complex graphs.

```tsx
interface DagSpec {
  nodes: Array<{ id: string; label: string; [k: string]: unknown }>
  edges: Array<{ source: string; target: string; label?: string }>
  direction?: 'LR' | 'TB'
}

export function buildFlow({ nodes, edges, direction = 'LR' }: DagSpec) {
  const spacing = direction === 'LR' ? { x: 220, y: 100 } : { x: 180, y: 120 }

  const rank: Record<string, number> = {}
  const rankOf = (id: string): number => {
    if (rank[id] !== undefined) return rank[id]
    const parents = edges.filter(e => e.target === id).map(e => e.source)
    rank[id] = parents.length === 0 ? 0 : Math.max(...parents.map(rankOf)) + 1
    return rank[id]
  }
  nodes.forEach(n => rankOf(n.id))

  const countAtRank: Record<number, number> = {}
  const indexAtRank: Record<string, number> = {}
  nodes.forEach(n => {
    const r = rank[n.id]
    indexAtRank[n.id] = countAtRank[r] ?? 0
    countAtRank[r] = (countAtRank[r] ?? 0) + 1
  })

  const rfNodes = nodes.map(n => ({
    id: n.id,
    data: { label: n.label, ...n },
    position: direction === 'LR'
      ? { x: rank[n.id] * spacing.x, y: indexAtRank[n.id] * spacing.y }
      : { x: indexAtRank[n.id] * spacing.x, y: rank[n.id] * spacing.y },
  }))

  const rfEdges = edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
  }))

  return { nodes: rfNodes, edges: rfEdges }
}
```
