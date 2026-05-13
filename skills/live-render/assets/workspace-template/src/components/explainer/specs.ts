import { z } from 'zod'

export const explainerSpecs = {
  // ── Ported from default ────────────────────────────────────────────
  ConceptPanel: {
    description: 'Titled concept card with a description. Use for defining a concept, introducing a term, or framing the topic. Supports an optional badge label and an accent border for emphasis.',
    props: z.object({
      title: z.string(),
      description: z.string(),
      badge: z.string().optional(),
      accent: z.boolean().default(false),
    }),
  },
  StepList: {
    description: 'Ordered numbered list of steps or phases. Use for workflows, processes, algorithms, or how-to sequences. Each step has a label, optional detail text, and a status (pending, active, done).',
    props: z.object({
      steps: z.array(z.object({
        label: z.string(),
        detail: z.string().optional(),
        status: z.enum(['pending', 'active', 'done']).default('pending'),
      })),
    }),
  },
  PropertyTable: {
    description: 'Key-value property display table. Use for showing attributes, config options, API response fields, or comparison of a single item\'s properties.',
    props: z.object({
      title: z.string().optional(),
      rows: z.array(z.object({ key: z.string(), value: z.string() })),
    }),
  },
  CalloutCard: {
    description: 'Highlighted callout block for notes, warnings, tips, or danger alerts. Use to call out a critical insight, caveat, or recommendation.',
    props: z.object({
      kind: z.enum(['info', 'warning', 'tip', 'danger']).default('info'),
      title: z.string().optional(),
      body: z.string(),
    }),
  },
  SectionHeader: {
    description: 'Visual section divider with a heading and optional subtitle. Use to label major sections of the canvas or separate distinct concepts.',
    props: z.object({
      label: z.string(),
      subtitle: z.string().optional(),
    }),
  },
  // ── New explainer components ───────────────────────────────────────
  CompareGrid: {
    description: 'Side-by-side comparison of two or more options with pros and cons. Use when the user is choosing between approaches, tools, frameworks, or designs.',
    props: z.object({
      options: z.array(z.object({
        name: z.string(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
        recommended: z.boolean().default(false),
      })),
    }),
  },
  Timeline: {
    description: 'Vertical chronological list of events. Use for historical timelines, process histories, migration steps, or roadmaps with dates.',
    props: z.object({
      events: z.array(z.object({
        when: z.string(),
        title: z.string(),
        body: z.string().optional(),
      })),
    }),
  },
  AnalogyCard: {
    description: '"X is like Y because Z" teaching card. Use when introducing an unfamiliar technical concept by mapping it to something familiar.',
    props: z.object({
      familiar: z.string(),
      unfamiliar: z.string(),
      mapping: z.string(),
    }),
  },
  BeforeAfter: {
    description: 'Two-panel before/after state comparison. Use for showing refactoring outcomes, config changes, visual redesigns, or before/after workflows.',
    props: z.object({
      before: z.object({ label: z.string(), body: z.string() }),
      after: z.object({ label: z.string(), body: z.string() }),
    }),
  },
  CodeWalkthrough: {
    description: 'Annotated code walkthrough with per-line notes. Use for explaining code logic, showing an algorithm step by step, or highlighting important lines.',
    props: z.object({
      language: z.string(),
      lines: z.array(z.object({
        code: z.string(),
        note: z.string().optional(),
        highlight: z.boolean().default(false),
      })),
    }),
  },
  KeyTermList: {
    description: 'Glossary of key terms with definitions. Use when introducing domain vocabulary, defining acronyms, or explaining a set of related concepts.',
    props: z.object({
      terms: z.array(z.object({ term: z.string(), definition: z.string() })),
    }),
  },
  Quiz: {
    description: 'Multiple-choice question with answer reveal. Use for comprehension checks, exploring misconceptions, or interactive learning moments.',
    props: z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      explanation: z.string().optional(),
    }),
  },
  Markdown: {
    description: 'Long-form prose rendered as rich text with GFM support (headings, lists, tables, inline code). Use for detailed explanations, summaries, or any multi-paragraph content.',
    props: z.object({
      content: z.string(),
    }),
  },
} as const
