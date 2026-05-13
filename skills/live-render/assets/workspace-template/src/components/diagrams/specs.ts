import { z } from 'zod'

type TreeNode = { label: string; children?: TreeNode[] }

const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.object({
    label: z.string(),
    children: z.array(treeNodeSchema).optional(),
  }),
)

export const diagramSpecs = {
  FlowDiagram: {
    description: 'Interactive node-graph diagram using React Flow. Use for DAGs, dependency graphs, system architectures, pipelines, state machines, or any network topology. Nodes are positioned by x/y coordinates.',
    props: z.object({
      nodes: z.array(z.object({
        id: z.string(),
        label: z.string(),
        x: z.number(),
        y: z.number(),
        kind: z.enum(['default', 'input', 'output', 'process', 'decision', 'storage', 'external']).default('default'),
      })),
      edges: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional(),
        animated: z.boolean().default(false),
      })),
      height: z.number().default(400),
    }),
  },

  SequenceDiagram: {
    description: 'SVG sequence diagram showing message-passing between actors. Use for HTTP request/response flows, auth handshakes, service calls, event streams, or any protocol visualization.',
    props: z.object({
      actors: z.array(z.string()),
      messages: z.array(z.object({
        from: z.string(),
        to: z.string(),
        label: z.string(),
        kind: z.enum(['sync', 'async', 'return', 'note']).default('sync'),
      })),
    }),
  },

  TreeDiagram: {
    description: 'SVG hierarchical tree diagram. Use for org charts, file system trees, class hierarchies, parse trees, or any parent-child relationship structure.',
    props: z.object({
      root: treeNodeSchema,
    }),
  },

  Sketch: {
    description: 'Animated p5.js canvas simulation. Use for visualizing dynamic phenomena: particle systems, force graphs, waveforms, network traffic, or generative art that illustrates a concept.',
    props: z.object({
      sketchId: z.enum(['force-graph', 'particles', 'wave', 'gradient-field']),
      params: z.record(z.string(), z.unknown()).optional(),
      height: z.number().default(360),
    }),
  },
} as const
