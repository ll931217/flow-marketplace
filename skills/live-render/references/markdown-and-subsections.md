# Markdown Prose & Explicit Subsections

Two patterns that pair with the present-mode layer to keep slides readable:

1. **`<Markdown>`** — renders long-form prose with proper typography (paragraphs, lists, inline code, links, tables, blockquotes). Uses [react-markdown](https://github.com/remarkjs/react-markdown) + [remark-gfm](https://github.com/remarkjs/remark-gfm) so authors write content in markdown strings instead of fighting JSX whitespace.
2. **Explicit subsections** — declare a slide's vertical sub-pages as discrete React nodes instead of relying on auto-pagination. Each subsection becomes its own slide with a smooth fade transition. Use when a section has 3–5 logically distinct beats that should not feel like a single scrolling page.

## When to use which

| Situation | Tool |
|---|---|
| One long paragraph or list inside a card | `<Markdown>` |
| Section has 3–5 logical beats; each deserves its own visual moment | Explicit subsections |
| Section has visual variety (diagrams, grids, callouts) and just happens to be tall | Auto-pagination is fine |
| Long markdown content inside one subsection | Both — `<Markdown>` inside a subsection |

Auto-pagination still works as a safety net. If a subsection's content overflows the viewport, the SlideHost paginates it. But the goal is to size subsections to fit, not rely on the fallback.

## Setup

```bash
npm install react-markdown remark-gfm --legacy-peer-deps
```

Copy these into the workspace:

- `references/markdown-component.tsx` → `src/Markdown.tsx`
- `references/markdown-styles.css` → append to `src/theme.css`
- `references/present-mode-presenter.tsx` → `src/Presenter.tsx` (already supports subsections)

## Using `<Markdown>`

```tsx
import { Markdown } from '../Markdown'

<Markdown>{`
**Backstage entity names are globally unique.** Two repos that both declare \`Resource: mysql\` collide silently — only one wins. We prevent this with four layers:

1. **Registry check** — the skill reads central \`docs/catalog/*.yaml\` first.
2. **Naming conventions** — every entity carries a project prefix.
3. **CI validation** — \`backstage\` repo's pipeline aggregates and dedupes.
4. **Backstage runtime** — last-resort safety net.

| Layer | Cost | Catches |
|---|---|---|
| Registry | Cheap | Most cases |
| CI | Medium | Cross-team |
| Runtime | Expensive | Last line |
`.trim()}</Markdown>
```

Authoring tips:

- **Use a template literal** so newlines work normally. End with `.trim()` to drop leading/trailing whitespace.
- **Escape backticks inside code spans** with `\`` so they don't break the template literal.
- **GFM features** available: tables, task lists (`- [x]`), strikethrough (`~~foo~~`), autolinks.
- **Styling lives in `theme.css`** — every element maps to a `.md-*` class hooked into the theme's CSS variables. Customize there, not in the Markdown component.

## Using Explicit Subsections

Update the slide definition to use `subsections` instead of `node`:

```tsx
import type { Slide, Subsection } from './Presenter'
import { ArchIntro, ArchDomains, ArchResources, ArchLayout } from './sections/Architecture'

const archSubsections: Subsection[] = [
  { id: 'arch.intro',     node: <ArchIntro /> },
  { id: 'arch.domains',   node: <ArchDomains /> },
  { id: 'arch.resources', node: <ArchResources /> },
  { id: 'arch.layout',    node: <ArchLayout /> },
]

const slides: Slide[] = [
  // ...
  { id: 'arch', label: '04 · Architecture', subsections: archSubsections },
  // ...
]
```

A typical section file then exports multiple sub-section components AND a default wrapper for doc-mode:

```tsx
function Intro() { return <section className="section">...</section> }
function Domains() { return <section className="section">...</section> }
function Resources() { return <section className="section">...</section> }
function Layout() { return <section className="section">...</section> }

export const archSubsections: Subsection[] = [
  { id: 'arch.intro',     node: <Intro /> },
  { id: 'arch.domains',   node: <Domains /> },
  { id: 'arch.resources', node: <Resources /> },
  { id: 'arch.layout',    node: <Layout /> },
]

// Doc-mode fallback — concatenates all subsections for scrolling view
export function Architecture() {
  return (
    <>
      <Intro />
      <Domains />
      <Resources />
      <Layout />
    </>
  )
}
```

In `App.tsx`'s doc-mode loop, render subsections as a flat list:

```tsx
<main className="canvas-main">
  {slides.map((s) => (
    <div key={s.id} id={s.id}>
      {s.subsections
        ? s.subsections.map((sub) => <div key={sub.id}>{sub.node}</div>)
        : s.node}
    </div>
  ))}
</main>
```

## Behavior

In present mode, when a slide has `subsections`:

- Vertical dot count = subsection count (no measurement, no race conditions)
- `↓` / `↑` move between subsections with a 280ms fade + Y-shift via nested `AnimatePresence`
- Only the current subsection is in the DOM at a time — heavy children (React Flow, p5) unmount cleanly when not active, keeping memory low
- `Space` / `Enter` still smart-advance: it walks through subsections, then crosses to the next slide

When a slide has just `node` (no subsections), the existing auto-pagination kicks in (measures `scrollHeight` vs viewport, translates `Y` in viewport-sized chunks).

## Why this design

Single-node slides with translateY-based pagination is clever — measuring DOM, capping at viewport chunks — but it makes content fragile. A 12px line-height change in a markdown paragraph could shift where the page break lands and split a heading from its body text. Explicit subsections give the author control: each beat is a discrete unit. The downside is more components to manage, so prefer it when you actually have semantic beats, not when you just need things to fit.

## Reference files

- `references/markdown-component.tsx` — drop-in `src/Markdown.tsx`
- `references/markdown-styles.css` — CSS append-block for `theme.css`
- `references/present-mode-presenter.tsx` — `src/Presenter.tsx` (canonical, supports both modes)
