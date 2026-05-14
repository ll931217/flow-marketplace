---
name: live-render-to-markdown
description: >
  Export a live-render canvas into a distributable multi-file markdown
  doc set. Trigger when the user asks to "export the canvas to markdown",
  "share the world state as docs", "generate markdown from live-render",
  "produce a readme from the canvas", "distribute the canvas as a doc
  pack", or any phrasing about reifying canvas state into plain-text
  artifacts that can be checked into git, shared in Slack, or opened on
  a phone without running a server. Also trigger when the user wants
  Mermaid diagrams of the world's relationships, or a per-region docs
  tree. When triggered: read world state via GET /api/world (or the
  on-disk snapshot), partition entities into pages (one per region plus
  an orphans/misc page), emit `index.md` with a high-level map and a
  per-region file each cross-linked, and render edges as Mermaid graphs
  where they aid comprehension.
  Skip for: running React presentations (use live-render-to-presentation
  instead), one-off prose summaries unrelated to a live-render workspace,
  generic markdown editing tasks.
---

# Live Render → Markdown

Export the world state of a live-render workspace as a self-contained
docs tree that any reader can browse with a plain markdown viewer. The
output is a `docs/` directory with one `index.md` and one file per
region, cross-linked via relative links.

**This is not a code-generator for live-render-to-presentation.** Where
the presentation skill produces a runnable Vite app, this skill produces
plain markdown — checkable into git, pasteable into a wiki, shareable
without infrastructure.

---

## Mental model

The canvas is a 2D scene of entities. Markdown is a 1D stream. Translating
between them requires picking a *partitioning* — which entities go on
which page — and a *layering* — what gets prose vs. table vs. diagram.

This skill makes both decisions opinionated:

1. **Partition by region.** Each region in the world becomes one
   `<region-slug>.md` page. Entities outside any region land on
   `orphans.md`. Annotations live on the page of whatever they enclose.
2. **Layer by entity type.** Nodes become table rows or h3 sections.
   Edges become Mermaid graphs (one per page) showing the local subgraph.
   Annotations become block-quote callouts. Regions themselves become
   the page's h1.

The output is meant to be read top-down. `index.md` is the entry; every
other page is reached from there. No page is a dead end — every cross-
reference is a relative link.

---

## Workflow

The skill runs in four phases. Each phase is mechanical enough that
manual review isn't strictly required, but a quick eyeball after Phase 4
is wise — Mermaid diagrams can come out lopsided for dense subgraphs.

### Phase 1 — Locate the workspace and pull world state

The runtime lives at `<project_root>/.claude/live-render-workspace`.
Port is derived deterministically from the workspace path.

```bash
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
WORKSPACE="$PROJECT_ROOT/.claude/live-render-workspace"
PORT_HEX=$(printf '%s' "$WORKSPACE" | shasum | head -c 4)
PORT=$((40000 + 16#$PORT_HEX % 10000))
URL="http://localhost:$PORT"

WORLD_JSON=$(curl -s --max-time 2 "$URL/api/world" 2>/dev/null)
if [ -z "$WORLD_JSON" ] && [ -f "$WORKSPACE/world.json" ]; then
  WORLD_JSON=$(cat "$WORKSPACE/world.json")
fi
```

If both sources are empty, stop and tell the user. Don't invent entities.

### Phase 2 — Partition entities into pages

Given the snapshot, group entities like this:

- **Regions** → one page each. Slug the region's `metadata.title` for the
  filename (kebab-case, lowercased, ASCII).
- **Nodes** → assigned to the region whose bounding box contains the
  node's centre. See `references/file-structure.md` for the membership
  rule (it matches the live-render quadtree's hit-test).
- **Edges** → assigned to *both* endpoint pages. They render in each
  page's local subgraph. Cross-region edges still render in both pages
  with the foreign endpoint marked as a cross-link.
- **Annotations** → assigned to the page containing the majority of
  their `enclosedEntityIds`. Render inline as a callout near those
  entities.
- **Orphans** (nodes outside any region) → `orphans.md`. If there are
  zero orphans, skip the file entirely.

Default output target: `<project_root>/.claude/live-render-docs/`.
Confirm before overwriting an existing directory. **Always delete the
target directory before writing** so stale pages from a previous export
don't linger.

### Phase 3 — Emit `index.md`

`index.md` is the entry page. It contains:

1. **Title** — from `world.metadata.title` if set, otherwise prompt the
   user. The title is the *only* prose this skill invents.
2. **A counts table** — entities by type, region count, annotation count.
3. **A region map** — bulleted list of regions linking to their page.
4. **A whole-world Mermaid graph** — every region as a subgraph, every
   cross-region edge between them. This is the only diagram on
   `index.md`; per-region diagrams stay on per-region pages.
5. **A "How this was generated" footer** — name the skill, the workspace
   path, and the timestamp so downstream readers know where this came
   from.

Use the bundled `assets/templates/index.md.template` as a starting point.
It has placeholder tokens (`{{title}}`, `{{counts_table}}`,
`{{region_list}}`, `{{world_mermaid}}`, `{{footer}}`) that the agent
substitutes.

### Phase 4 — Emit per-region pages (and `orphans.md`)

For each region:

1. **H1**: the region's `metadata.title`.
2. **Lede paragraph**: the region's `metadata.description` if present,
   otherwise a one-line summary of "N nodes, M edges, K annotations".
3. **Local Mermaid subgraph**: nodes inside this region plus edges that
   touch them. Cross-region endpoints are rendered with a `[[link]]` to
   the foreign page (see `references/mermaid-patterns.md`).
4. **Entity table**: id, title, kind, accent — every node in the region.
5. **Annotation callouts**: each annotation whose enclosed entities are
   mostly in this region. Quote the text verbatim; list the touched
   entities.
6. **Footer**: a "← Back to [index](./index.md)" link.

The orphans page is the same shape minus the H1/lede, with an
intro that explains why these entities aren't grouped.

Use `assets/templates/region.md.template` as a starting point.

---

## Domain references

- `references/file-structure.md` — directory layout, slug rules,
  membership-test code, cross-link conventions
- `references/mermaid-patterns.md` — how to translate edges into Mermaid,
  handling cross-region edges, what to *not* render (dense subgraphs
  that overflow)

Load each reference when you start the matching phase. `mermaid-patterns`
is the most decision-heavy — read it before Phase 4.

---

## What this skill will not do

- **It will not generate a single mega-file.** Multi-file is the chosen
  output shape; a one-file dump loses the per-region navigation that
  makes the docs tree useful. If the user explicitly wants one file,
  suggest concatenation as a post-processing step.
- **It will not embed images of the canvas.** Pixels go stale; the
  Mermaid diagrams are derived from the same world state as the prose so
  they stay in sync.
- **It will not invent prose.** The only fields populated are derived
  from `metadata`. Empty descriptions mean empty ledes — the user can
  fill them in later if they want polish.
- **It will not produce a runnable app.** That is
  [[live-render-to-presentation]]'s job. Mention it if the user wants
  something interactive.
