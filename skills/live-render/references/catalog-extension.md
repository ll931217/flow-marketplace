# Live Render — Catalog Extension Guide

Use this guide only when a visual pattern you need genuinely cannot be expressed with existing catalog components. Most explanations can be built from combinations of what's already there.

## When to extend

Extend the catalog when:
- A pattern repeats across conversations (e.g., "language comparison table with syntax")
- A component would benefit future sessions, not just the current one
- A structural pattern is too complex to describe with existing primitives

Do **not** extend the catalog for one-off session content — that's what specs are for.

## Adding a component

### 1. Add the schema to `src/components/explainer/specs.ts`

```typescript
export const explainerSpecs = {
  // ... existing ...
  MyComponent: {
    description: 'One-sentence purpose. When to use it.',
    props: z.object({
      title: z.string(),
      items: z.array(z.object({ label: z.string(), value: z.string() })),
    }),
  },
} as const
```

### 2. Add the implementation to `src/components/explainer/impls.tsx`

```tsx
import type { BaseComponentProps } from '@json-render/react'
import type { explainerSpecs } from './specs'
import { z } from 'zod'

type P<K extends keyof typeof explainerSpecs> = z.infer<typeof explainerSpecs[K]['props']>

function MyComponent({ props }: BaseComponentProps<P<'MyComponent'>>) {
  return (
    <div style={{ ... }}>
      {/* implementation */}
    </div>
  )
}

// Add to explainerComponents export at the bottom
export const explainerComponents = {
  // ...existing,
  MyComponent,
}
```

### 3. Verify the catalog builds

```bash
cd .claude/live-render-workspace
npx tsc --noEmit     # should be clean
```

### 4. Regenerate the catalog reference

```bash
node --input-type=module <<'EOF'
import { catalog } from './src/catalog.ts'
import { writeFileSync } from 'fs'
writeFileSync(
  '../../../references/catalog-prompt.md',
  '# Catalog Reference (auto-generated)\n\n' + catalog.prompt()
)
EOF
```

Or if `tsx` is installed: `tsx scripts/dump-catalog-prompt.ts`

Commit the updated `catalog-prompt.md` so future sessions benefit immediately.

## Adding a diagram component

Same flow but in `src/components/diagrams/specs.ts` and `impls.tsx`.

## Adding a p5 sketch

Add a new entry to `src/sketches/index.ts`:

```typescript
export const sketches: Record<string, SketchFactory> = {
  // ... existing ...
  'my-sketch': (sk, params) => {
    sk.setup = () => { sk.createCanvas(sk.windowWidth, 360) }
    sk.draw = () => { /* ... */ }
  },
}
```

Then add `'my-sketch'` to the `Sketch` component's `sketchId` enum in `src/components/diagrams/specs.ts`.

## Design principles for new components

1. All layout uses `var(--accent)`, `var(--border)`, `var(--surface)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--radius)`, `var(--font-mono)` — never hardcode colors
2. Components should be self-contained — no external state required
3. Props should be flat and JSON-serialisable
4. Keep implementations under 80 lines; extract helpers if needed
