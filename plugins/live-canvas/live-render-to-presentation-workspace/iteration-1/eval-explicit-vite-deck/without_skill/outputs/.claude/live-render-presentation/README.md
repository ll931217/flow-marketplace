# Live-Render Presentation

Vite + React presentation exported from the live-render workspace at
`.claude/live-render-workspace/world.json`.

## Structure

- **Title slide** — workspace metadata.
- **One slide per region** — each `region` entity becomes a slide containing the
  components (`node` entities) that fall inside it, the edges that touch them,
  and any annotations that cover them.
- **Open issues slide** — every unresolved annotation in the workspace.

## Usage

```bash
pnpm install   # or npm install / yarn
pnpm dev       # runs vite dev server
pnpm build     # production build
```

Navigate slides with `←` / `→`, `PageUp` / `PageDown`, `Space`, `Home`, `End`,
or the buttons at the bottom of the screen.

## Regenerating

The presentation reads `src/world.json`, which is a copy of the canvas world
state. Re-export by copying the latest
`.claude/live-render-workspace/world.json` over `src/world.json`.
