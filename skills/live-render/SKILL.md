---
name: live-render
description: >
  Trigger immediately when the user says "diagram", "draw", "visualize",
  "map out", "show me how X works", "walk me through", "illustrate", or
  "explain X visually". Also trigger proactively — without being asked —
  for: architecture or system design sessions, codebase structure
  walkthroughs, step-by-step process explanations (auth flows, request
  flows, state machines, event loops), planning or design reviews, concept
  explanations with hierarchies or sequences, and onboarding walkthroughs.
  When triggered: opens or attaches to a per-project live canvas at
  <project_root>/.claude/live-render-workspace, served at
  https://live-render.localhost — renders chat-driven, JSON-spec UIs using
  a pre-built catalog of 50+ components (shadcn 36 + explainer set +
  diagram components). Write to src/spec.json; the canvas updates via HMR.
  Skip for: pure code generation, debugging existing code, writing tasks
  (changelogs, tickets, docs), simple factual Q&A, and data analysis on
  uploaded files.
---

# Live Render

A persistent visual companion for the conversation. You chat; I write JSON specs that describe what to show — cards, step-by-step walkthroughs, comparisons, flow diagrams, sequence diagrams, animations. The workspace renders the spec live via HMR. No per-session React coding.

## How it works

```
You chat → I write src/spec.json → Vite HMR → Browser updates
```

The workspace has a frozen catalog of 50+ components. I pick from the catalog and write a JSON element-tree spec. No new React code is needed — the catalog handles rendering.

## When to reach for this

Reach for it early:

- Explaining how something works (reconciliation, auth flows, event loops)
- Walking through codebase structure or module dependencies
- Planning sessions: roadmaps, feature breakdowns, system designs
- Comparing options side-by-side (frameworks, approaches, architectures)
- Any concept with a before/after, cause/effect, or hierarchical structure
- Data that would be clearer as a chart, timeline, or animated simulation

## Core Workflow

### Step 1 — Bootstrap (once per workspace)

The workspace lives at `<project_root>/.claude/live-render-workspace`.
Use CWD as the project root when not inside a git repo.

**Check if server is already running:**

```bash
curl -sI http://live-render.localhost 2>/dev/null | head -1
```

If you get `HTTP/` back — server is up. Skip to Step 3. HMR handles the rest.

**If workspace exists but server is down (resuming):**

```bash
WORKSPACE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/live-render-workspace"
cd "$WORKSPACE"
[ -d node_modules ] || npm install
```

**If workspace doesn't exist yet (first time):**

```bash
WORKSPACE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/live-render-workspace"
mkdir -p "$(dirname "$WORKSPACE")"
cp -r ~/.claude/skills/live-render/assets/workspace-template "$WORKSPACE"
cd "$WORKSPACE"
npm install
```

**Detect existing v1 workspace** (old `src/components/default/` layout):

```bash
grep -q "from './components/default'" "$WORKSPACE/src/components/registry.tsx" 2>/dev/null && echo "v1-layout"
```

If `v1-layout` is printed: tell the user "Your live-render workspace uses the previous layout (v1). The new catalog-backed system is available — want me to migrate it? I'll archive your existing custom components." On yes: copy new template over `src/`, archive old `custom/` to `.archive/`.

**Start the server:**

```bash
CMD="portless live-render npm run dev"
WORKSPACE="$(git rev-parse --show-toplevel 2>/dev/null || pwd)/.claude/live-render-workspace"

if [ -n "$ZELLIJ" ]; then
  zellij action new-tab --name live-render --cwd "$WORKSPACE" --layout-dir /dev/null 2>/dev/null
  zellij action write-chars "$CMD"
  zellij action write 13
elif [ -n "$TMUX" ]; then
  tmux new-window -n live-render -c "$WORKSPACE" "$CMD"
else
  tmux has-session -t live-render 2>/dev/null \
    || tmux new-session -d -s live-render -c "$WORKSPACE" "$CMD"
fi
```

> Fallback: `portless live-render --no-tls npm run dev` → `http://live-render.localhost`

Tell the user: "I've opened a live canvas at **https://live-render.localhost** — it will update as we go."

### Step 2 — Read the catalog reference

**Every session, read the catalog before writing any spec:**

```bash
cat ~/.claude/skills/live-render/references/catalog-prompt.md
```

This tells you every available component name, description, and prop schema. Do not guess component names — use what's in the catalog.

### Step 3 — Choose a theme

| Context | Theme | Characteristics |
|---------|-------|-----------------|
| Technical / engineering | **Signal** | Monospace accents, dark/light grid, high contrast |
| Planning / strategy | **Broadside** | Editorial serif, structured columns, navy + ivory |
| Storytelling / concepts | **Vellum** | Warm cream, Cormorant or Playfair serif, generous space |
| Fun / educational | **Creative Mode** | Bold multi-color, playful layout, large display type |
| Data / metrics | **Cobalt Grid** | Dense grid, data-forward, cool blue palette |

Full CSS token sets: `references/design-themes.md`

### Step 4 — Write the spec

Write `src/spec.json` in the workspace. HMR picks it up instantly.

**Spec format:**
```json
{
  "root": "root",
  "elements": {
    "root": { "type": "Stack", "props": { "direction": "vertical", "gap": "lg" }, "children": ["h1", "body"] },
    "h1":   { "type": "SectionHeader", "props": { "label": "React Reconciliation" }, "children": [] },
    "body": { "type": "ConceptPanel", "props": { "title": "What is it?", "description": "The diff algorithm..." }, "children": [] }
  }
}
```

**Component decision guide** (choose the first match):

| What you need to convey | Component |
|-------------------------|-----------|
| Define a concept, introduce a term | `ConceptPanel` |
| Walk through a process step-by-step | `StepList` |
| Compare two or more approaches | `CompareGrid` |
| Chronological events or history | `Timeline` |
| "X is like Y" analogy | `AnalogyCard` |
| Before/after state | `BeforeAfter` |
| Explain code line-by-line | `CodeWalkthrough` |
| Define a glossary of terms | `KeyTermList` |
| Knowledge check / quiz | `Quiz` |
| Multi-paragraph prose | `Markdown` |
| Key-value attributes | `PropertyTable` |
| Tip, warning, or critical note | `CalloutCard` |
| Major section separator | `SectionHeader` |
| Node-edge graph, architecture map | `FlowDiagram` |
| Request/response or handshake flow | `SequenceDiagram` |
| Parent-child hierarchy | `TreeDiagram` |
| Animated dynamic phenomenon | `Sketch` (sketchId: force-graph, particles, wave, gradient-field) |
| Any standard UI primitive | shadcn 36 (Stack, Grid, Card, Tabs, Accordion, Button, Table…) |

For full prop schemas see `references/catalog-prompt.md`.

For layout composition patterns see `references/spec-writing.md`.

**Tell the user what's on the canvas.** One sentence: "I've put a concept map of React reconciliation on the canvas."

### Step 5 — Update as the conversation evolves

On each new concept or direction change:

- **Edit** a specific element: use the `Edit` tool to change a prop value in `src/spec.json`
- **Add a section**: append a new element key to the `elements` object and add it to a parent's `children`
- **Rewrite**: use the `Write` tool to replace `src/spec.json` when the spec needs a complete overhaul

Don't dump everything at once — reveal sections progressively as you explain.

**Tell the user what changed.** One sentence: "I've added a SequenceDiagram showing the OAuth handshake."

### Step 5.5 — Add Present Mode (for briefings)

When the user says "team briefing", "make this a presentation", "for the meeting", or asks for keyboard navigation: add the Presenter layer on top. See `references/present-mode.md` for the full setup. It's ~200 LOC that toggles between doc mode and slide-per-section mode without replacing the existing spec.

### Step 6 — Escape hatches

Use these only when the catalog genuinely cannot express what you need:

- **Custom SVG / React component**: write to `src/diagrams/` and import in `App.tsx`. If it's reusable, promote to `src/components/diagrams/` and register in the catalog (see `references/catalog-extension.md`).
- **Slide deck / presentation**: use Strategy D (beautiful-html-templates). See `references/beautiful-html-templates/AGENTS.md`.

### Step 7 — Cleanup

Stop the dev server (never delete the workspace):

```bash
if [ -n "$ZELLIJ" ]; then
  echo "Close the 'live-render' Zellij tab when done."
elif [ -n "$TMUX" ]; then
  tmux kill-window -t live-render 2>/dev/null
else
  tmux kill-session -t live-render 2>/dev/null
fi
```

## Reference Files

| File | Contents |
|------|----------|
| `references/catalog-prompt.md` | **Read every session** — all 50+ component names, descriptions, and prop schemas |
| `references/spec-writing.md` | Spec format, layout patterns, dynamic state, editing strategies |
| `references/catalog-extension.md` | How to add a component when the catalog is insufficient |
| `references/setup.md` | Full workspace directory layout and vite config |
| `references/design-themes.md` | CSS variables, font imports, color palettes for each theme |
| `references/diagram-patterns.md` | Implementation internals for FlowDiagram, SequenceDiagram, TreeDiagram, Sketch |
| `references/present-mode.md` | Slide-mode layer: toggle, keyboard nav, vertical pagination |
| `references/present-mode-presenter.tsx` | Canonical `Presenter.tsx` source |
| `references/present-mode-styles.css` | CSS append-block for present mode |
| `references/markdown-component.tsx` | Canonical `Markdown.tsx` (react-markdown + remark-gfm) |
| `references/markdown-styles.css` | Typographic CSS for markdown elements |
| `references/beautiful-html-templates/AGENTS.md` | Slide-deck escape hatch: how to pick, clone, and adapt templates |

## Design Principles

1. **Spec first** — write JSON against the catalog. Only write React when the catalog is provably insufficient.
2. **Progressive reveal** — introduce visual elements as you introduce concepts verbally.
3. **One concept per element** — don't cram multiple ideas into one component's props.
4. **Typography is structure** — font weight, size, and family communicate hierarchy before color.
5. **One accent color** — used exclusively for the most important element.
6. **8px grid** — all spacing is multiples of 8px.
