# Live Render — Workspace Setup Reference

## Workspace Location

```
<project_root>/.claude/live-render-workspace/
```

`project_root` is `git rev-parse --show-toplevel` when inside a git repo, otherwise CWD.
The workspace is seeded from `~/.claude/skills/live-render/assets/workspace-template/` on
first use and persists across sessions.

## Full Directory Layout

```
.claude/live-render-workspace/
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── portless.json           # { "name": "live-render" } → https://live-render.localhost
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx             # JSONUIProvider + Renderer reading spec.json
    ├── vite-env.d.ts       # vite-plus client types reference
    ├── theme.css           # CSS variables (swap theme as needed)
    ├── spec.json           # ← write JSON specs here; HMR picks up instantly
    ├── catalog.ts          # frozen catalog: shadcn 36 + explainer + diagrams
    ├── components/
    │   ├── explainer/
    │   │   ├── index.ts
    │   │   ├── specs.ts    # Zod schemas for all explainer components
    │   │   └── impls.tsx   # React implementations
    │   └── diagrams/
    │       ├── index.ts
    │       ├── specs.ts    # Zod schemas for FlowDiagram, SequenceDiagram, etc.
    │       └── impls.tsx   # React implementations (React Flow, SVG, p5 wrapper)
    ├── sketches/
    │   └── index.ts        # p5 sketch registry: force-graph, particles, wave, gradient-field
    └── diagrams/           # per-session one-off SVG components (escape hatch)
```

The catalog is frozen — do not modify `components/explainer/` or `components/diagrams/` per-session.
Conversation content lives entirely in `src/spec.json`.

If you need a component the catalog doesn't have, see `references/catalog-extension.md`.

## The spec.json Channel

`src/App.tsx` imports `spec.json` directly:

```tsx
import spec from './spec.json'
// ...
<Renderer spec={spec as Spec} registry={registry} />
```

Write to `src/spec.json` → Vite HMR reloads the browser in ~100ms. No server restart needed.

## Catalog

All 50+ components are registered in `src/catalog.ts`. It exports:
- `catalog` — for `catalog.prompt()` (AI reference generation)
- `registry` — for `<Renderer registry={registry} />`

## Starting / Stopping

See SKILL.md Step 1 for the full multiplexer-aware start script (Zellij → tmux → fallback).

```bash
# Check server health
curl -sI http://live-render.localhost 2>/dev/null | head -1

# View logs (fallback detached tmux session)
tmux attach -t live-render

# Stop — tmux session
tmux kill-session -t live-render 2>/dev/null

# Full reset (user decision)
rm -rf "$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/live-render-workspace"
```

## Base App.tsx Pattern

```tsx
import { JSONUIProvider, Renderer } from '@json-render/react'
import { registry } from './catalog'
import spec from './spec.json'
import type { Spec } from '@json-render/core'

export default function App() {
  return (
    <div className="canvas-root">
      <JSONUIProvider registry={registry}>
        <main className="canvas-main">
          <Renderer spec={spec as Spec} registry={registry} />
        </main>
      </JSONUIProvider>
    </div>
  )
}
```

## portless.json

```json
{ "name": "live-render" }
```

Running `portless live-render npm run dev` gives `https://live-render.localhost` regardless of Vite port.

## vite.config.ts

```ts
import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {},
  lint: { options: { typeAware: true, typeCheck: true } },
});
```

## Workspace version detection

The template ships at `package.json` version `0.1.0`. The old v1 layout (pre-catalog) has version `0.0.0` and contains `src/components/default/` + `src/components/registry.tsx`. Detect with:

```bash
grep -q "from './components/default'" src/components/registry.tsx 2>/dev/null && echo "v1"
```
