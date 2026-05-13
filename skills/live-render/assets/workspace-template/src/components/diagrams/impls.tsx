import { useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { BaseComponentProps } from '@json-render/react'
import type { diagramSpecs } from './specs'
import { z } from 'zod'
import { sketches } from '../../sketches'

type S = typeof diagramSpecs
type P<K extends keyof S> = z.infer<S[K]['props']>

const NODE_COLORS: Record<string, string> = {
  input:    '#4ade80',
  output:   '#f87171',
  decision: '#fbbf24',
  storage:  '#60a5fa',
  external: '#a78bfa',
  process:  'var(--accent)',
  default:  'var(--surface)',
}

// ── FlowDiagram ────────────────────────────────────────────────────────────

function FlowDiagram({ props }: BaseComponentProps<P<'FlowDiagram'>>) {
  const nodes: Node[] = props.nodes.map((n) => ({
    id: n.id,
    position: { x: n.x, y: n.y },
    data: { label: n.label },
    style: {
      background: NODE_COLORS[n.kind] ?? NODE_COLORS.default,
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      borderRadius: '6px',
      fontSize: '13px',
    },
  }))

  const edges: Edge[] = props.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.from,
    target: e.to,
    label: e.label,
    animated: e.animated,
    style: { stroke: 'var(--border)' },
  }))

  return (
    <div style={{ height: `${props.height}px`, border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden' }}>
      <ReactFlow nodes={nodes} edges={edges} fitView>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}

// ── SequenceDiagram ────────────────────────────────────────────────────────

const ACTOR_W = 100
const ACTOR_GAP = 140
const MSG_H = 48
const HEADER_H = 48
const LIFELINE_EXTRA = 32

function SequenceDiagram({ props }: BaseComponentProps<P<'SequenceDiagram'>>) {
  const actors = props.actors
  const messages = props.messages
  const svgW = actors.length * (ACTOR_W + ACTOR_GAP)
  const svgH = HEADER_H + messages.length * MSG_H + LIFELINE_EXTRA

  const actorX = (name: string) => {
    const i = actors.indexOf(name)
    return i * (ACTOR_W + ACTOR_GAP) + ACTOR_W / 2 + ACTOR_GAP / 4
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgW} height={svgH} style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
        {/* Actor boxes */}
        {actors.map((a, i) => {
          const cx = actorX(a)
          return (
            <g key={i}>
              <rect x={cx - ACTOR_W / 2} y={4} width={ACTOR_W} height={32}
                rx={4} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.5} />
              <text x={cx} y={24} textAnchor="middle" fill="var(--text-primary)" fontSize={12}>{a}</text>
              <line x1={cx} y1={36} x2={cx} y2={svgH - 8}
                stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4" />
            </g>
          )
        })}
        {/* Messages */}
        {messages.map((m, i) => {
          const y = HEADER_H + i * MSG_H + MSG_H / 2
          const x1 = actorX(m.from)
          const x2 = actorX(m.to)
          const isReturn = m.kind === 'return'
          const isNote = m.kind === 'note'
          const mx = (x1 + x2) / 2

          if (isNote) {
            return (
              <g key={i}>
                <rect x={mx - 60} y={y - 14} width={120} height={24} rx={3}
                  fill="rgba(251,191,36,0.12)" stroke="#fbbf24" strokeWidth={1} />
                <text x={mx} y={y + 4} textAnchor="middle" fill="#fbbf24" fontSize={11}>{m.label}</text>
              </g>
            )
          }

          const dir = x2 > x1 ? 1 : -1
          return (
            <g key={i}>
              <line x1={x1} y1={y} x2={x2} y2={y}
                stroke={isReturn ? 'var(--text-secondary)' : 'var(--accent)'}
                strokeWidth={1.5}
                strokeDasharray={isReturn ? '5 3' : undefined} />
              {/* Arrowhead */}
              <polygon
                points={`${x2},${y} ${x2 - dir * 8},${y - 4} ${x2 - dir * 8},${y + 4}`}
                fill={isReturn ? 'var(--text-secondary)' : 'var(--accent)'} />
              <text x={mx} y={y - 6} textAnchor="middle"
                fill="var(--text-secondary)" fontSize={11}>{m.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── TreeDiagram ────────────────────────────────────────────────────────────

type TreeNode = { label: string; children?: TreeNode[] }

const NODE_BOX_W = 100
const NODE_BOX_H = 28
const H_GAP = 24
const V_GAP = 56

function subtreeWidth(node: TreeNode): number {
  if (!node.children?.length) return NODE_BOX_W + H_GAP
  return Math.max(
    node.children.reduce((s, c) => s + subtreeWidth(c), 0),
    NODE_BOX_W + H_GAP,
  )
}

function TreeNode({
  node, x, y, onEdges,
}: {
  node: TreeNode
  x: number
  y: number
  onEdges: (edges: [number, number, number, number][]) => void
}) {
  const cx = x + NODE_BOX_W / 2
  const cy = y + NODE_BOX_H / 2

  let childX = x
  for (const child of node.children ?? []) {
    const cw = subtreeWidth(child)
    const childCx = childX + NODE_BOX_W / 2
    onEdges([[cx, cy + NODE_BOX_H / 2, childCx, y + V_GAP]])
    childX += cw
  }

  return (
    <>
      <rect x={x} y={y} width={NODE_BOX_W} height={NODE_BOX_H}
        rx={4} fill="var(--surface)" stroke="var(--accent)" strokeWidth={1.5} />
      <text x={cx} y={y + 18} textAnchor="middle" fill="var(--text-primary)"
        fontSize={12} fontFamily="var(--font-mono)">{node.label}</text>
      {(() => {
        let cx2 = x
        return (node.children ?? []).map((child, i) => {
          const cw = subtreeWidth(child)
          const el = (
            <TreeNode key={i} node={child} x={cx2} y={y + V_GAP} onEdges={onEdges} />
          )
          cx2 += cw
          return el
        })
      })()}
    </>
  )
}

function TreeDiagram({ props }: BaseComponentProps<P<'TreeDiagram'>>) {
  const edges: [number, number, number, number][] = []
  const w = subtreeWidth(props.root)
  const h = treeHeight(props.root) * V_GAP + NODE_BOX_H + 16

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={w} height={h}>
        {edges.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1.5} />
        ))}
        <TreeNode node={props.root} x={0} y={8} onEdges={(e) => edges.push(...e)} />
      </svg>
    </div>
  )
}

function treeHeight(node: TreeNode): number {
  if (!node.children?.length) return 1
  return 1 + Math.max(...node.children.map(treeHeight))
}

// ── Sketch ─────────────────────────────────────────────────────────────────

function Sketch({ props }: BaseComponentProps<P<'Sketch'>>) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const factory = sketches[props.sketchId]
    if (!factory) return

    let p5Instance: { remove: () => void } | null = null

    import('p5').then(({ default: P5 }) => {
      p5Instance = new P5((sk: object) => factory(sk as Parameters<typeof factory>[0], props.params ?? {}), el)
    })

    return () => { p5Instance?.remove() }
  }, [props.sketchId, props.params])

  return (
    <div ref={ref} style={{ height: `${props.height}px`, border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden', background: '#0d1117' }} />
  )
}

export const diagramComponents = {
  FlowDiagram,
  SequenceDiagram,
  TreeDiagram,
  Sketch,
}
