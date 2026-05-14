---
name: live-render-to-presentation
description: >
  Turn the current live-render canvas state into a polished React + Vite
  presentation app. Trigger when the user asks to "make a presentation from
  the canvas", "present the world state", "build slides from live-render",
  "turn the canvas into a deck", "presentation mode for the workspace", or
  any phrasing about exporting / reifying the live-render world into
  something shareable as slides. Also trigger when the user references the
  archive-v1 presenter pattern or says they want to capture the canvas as a
  narrative briefing. When triggered: read world state via GET /api/world
  (or the on-disk snapshot), interview the user about the narrative arc,
  scaffold a Vite + React + framer-motion + react-hotkeys presenter, and
  hand-author one section component per slide grouped by region, cluster,
  or annotation thread.
  Skip for: distributing the canvas as plain markdown (use
  live-render-to-markdown instead), generic React scaffolding unrelated to
  live-render, slide decks from sources other than a live-render workspace.
---

# Live Render → Presentation

Take the world state of a live-render workspace and turn it into a
hand-authored React presentation. The output is a self-contained Vite app
(no monorepo wiring) that mirrors the `archive-v1` pattern: a `Presenter`
component with framer-motion transitions, hotkey navigation, vertical
auto-pagination, and one `sections/*.tsx` file per logical slide.

**This is not a generic slide generator.** The canvas's semantic entities
are the source of truth — the narrative arc, the groupings, and the prose
all derive from reading the world state and *interpreting* it.

---

## Mental model

A live-render world is a flat list of entities (`node`, `edge`, `region`,
`annotation`). A good presentation reorganises that flat list into a
*narrative* — a sequence of slides where each slide says something
specific. Translating the canvas to slides is a curation problem, not a
formatting problem.

Three forces shape the narrative:

1. **Regions are slides by default.** A region in the world implies the
   author already grouped things spatially. Each region usually maps to one
   top-level slide (sometimes with subsections).
2. **Annotations are speaker notes / callouts.** They were created by a
   human as deliberate intent — preserve their text verbatim where
   possible.
3. **Orphan entities need narrative glue.** Nodes outside any region
   probably belong to a "context", "today", or "open questions" slide —
   ask the user where they fit rather than dumping them mechanically.

The bundled `assets/presentation-template/` is a working Vite app skeleton.
It contains the `Presenter`, theme, hotkey wiring, and an example section.
The agent's job is to scaffold from it, then **delete the example** and
hand-author real sections from the world state.

---

## Workflow

The skill runs in five phases. Stop after each phase and verify before
moving to the next — the cost of rework on later phases is high (sections
are hand-authored).

### Phase 1 — Locate the workspace and pull world state

The runtime lives at `<project_root>/.claude/live-render-workspace`. The
port is derived deterministically from the workspace path so the same
project always lands on the same port.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKSPACE="$PROJECT_ROOT/.claude/live-render-workspace"
PORT_HEX=$(printf '%s' "$WORKSPACE" | shasum | head -c 4)
PORT=$((40000 + 16#$PORT_HEX % 10000))
URL="http://localhost:$PORT"

# Prefer live server (canonical). Fall back to on-disk snapshot.
WORLD_JSON=$(curl -s --max-time 2 "$URL/api/world" 2>/dev/null)
if [ -z "$WORLD_JSON" ] && [ -f "$WORKSPACE/world.json" ]; then
  WORLD_JSON=$(cat "$WORKSPACE/world.json")
fi
```

If neither source has world state, stop and ask the user. Do not invent
entities. If the live-render skill is installed, suggest the user bootstrap
the workspace first.

Save the snapshot to a scratch file so future phases can re-read it
cheaply: `<workspace>/.presentation/world-snapshot.json`.

### Phase 2 — Read the world and propose a narrative

Read the snapshot. Tally entity counts by `type`, list all regions with
their `metadata.title`, and list all annotations with their text. Note
which entities are inside which regions using spatial overlap (a node
is "in" a region if its bounding box centre is within the region's box).

Then propose a slide outline back to the user *before writing any code*.
Format the proposal like this:

```
Proposed deck (10 slides):

00 Title       — "<derived from world.metadata.title or asked>"
01 Today       — current state of the world: N nodes, M regions, K annotations
02 <region A>  — N entities, annotation "<text>"
03 <region B>  — ...
...
08 Open issues — annotations whose enclosed entities still exist
09 Q&A         — placeholder
```

Ask for edits. Reorder, rename, drop, or merge slides per the user's
feedback. **Do not skip this step.** A mechanical region-per-slide deck
is almost always wrong on the first try.

### Phase 3 — Scaffold the Vite app

Copy the bundled template into a target directory. Default location is
`<project_root>/.claude/live-render-presentation/`. Confirm with the user
before overwriting an existing directory.

```bash
TEMPLATE="$(dirname "$SKILL_PATH")/assets/presentation-template"
TARGET="$PROJECT_ROOT/.claude/live-render-presentation"
cp -r "$TEMPLATE" "$TARGET"
cd "$TARGET" && pnpm install   # or npm/yarn — match the user's project
```

The template ships with:

- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `src/main.tsx`, `src/theme.css`, `src/Markdown.tsx`
- `src/Presenter.tsx` — the full archive-v1 presenter (do not edit)
- `src/App.tsx` — wires a `slides` array to the Presenter
- `src/sections/_example.tsx` — one annotated example section

**Delete `_example.tsx` before adding real sections.** It exists only to
show the styling vocabulary; leaving it shipped is a smell.

See `references/template-anatomy.md` for what every file does and which
ones are safe to modify.

### Phase 4 — Hand-author sections

For each slide in the agreed outline, create `src/sections/<Name>.tsx`
exporting a function component. Sections must read from the world snapshot
*at authoring time* — they should not fetch live state, because the
presentation is meant to be portable and reproducible.

Two patterns, picked per slide:

- **Single-node slide** — one default export: `export function Foo() { ... }`
- **Multi-page slide** — export a `subsections` array of `{ id, node }`:
  `export const fooSubsections = [{ id: 'a', node: <A /> }, ...]`
  This unlocks the Presenter's explicit vertical-subsection mode.

See `references/section-patterns.md` for the styling vocabulary (eyebrow,
h1/h2/lede, card, grid-2/grid-3, tag, mono) and concrete examples of how
to render different entity types (nodes as cards, regions as headers,
edges as inline arrows, annotations as quoted callouts).

**Do not invent prose.** Every claim in a section must trace back to a
metadata field on a world entity. Where the user supplied annotation text,
quote it. Where a node has only `metadata.title`, that's the only thing
that should appear — don't pad with filler.

### Phase 5 — Wire and verify

Update `src/App.tsx`'s `slides` array to reference your sections in the
agreed order. Then:

```bash
cd "$TARGET"
pnpm typecheck   # catches stale imports / wrong types
pnpm dev         # starts Vite — open in browser
```

Verify in the browser:

- Header nav lists every slide, all anchors scroll correctly
- `Shift+P` (or "▶ PRESENT" button) enters present mode
- `→ / ← / Space / Esc / 1–9` hotkeys behave per `Presenter.tsx`
- For slides with `subsections`, vertical dots appear in the chrome
- No console errors (especially no "key" warnings — every list item needs
  a stable key)

If any verification fails, do **not** declare the task complete. Diagnose,
fix, re-verify. The skill is only useful if the resulting app actually
runs.

---

## Domain references

- `references/template-anatomy.md` — every file in the bundled template,
  what it does, and the editing contract (safe / off-limits)
- `references/section-patterns.md` — styling vocabulary and worked
  examples of common section shapes (region overview, entity list, edge
  diagram, annotation callout)
- `references/world-shape.md` — entity schema, how to detect
  spatial-region membership, how annotations link to enclosed entities

Load a reference file only when you're working on the corresponding phase.
The template-anatomy reference is essentially required reading before
Phase 3; the others are situational.

---

## What this skill will not do

- **It will not invent entities.** Empty world → empty deck. Ask the user
  to populate the canvas first.
- **It will not skip the narrative interview in Phase 2.** Mechanical
  region-per-slide decks consistently disappoint. The interview is the
  product.
- **It will not edit `Presenter.tsx` or `theme.css`.** Those are bundled,
  versioned assets. If the user wants different chrome, propose a
  follow-up skill that updates the template, not a one-off mutation.
- **It will not produce markdown.** That is
  [[live-render-to-markdown]]'s job. Suggest that skill if the user
  actually wants distributable docs instead of a runnable app.
