# Section Patterns

Read this when authoring sections (Phase 4). It documents the styling
vocabulary baked into `theme.css` and shows worked examples of common
shapes — region overview, entity list, edge diagram, annotation callout —
so the deck reads consistently across hand-authored slides.

## Styling vocabulary

Every section should compose from these classes. They're defined in
`theme.css` and any deviation will visually clash with the present-mode
chrome.

### Layout primitives

| Class | Purpose |
| --- | --- |
| `section` | Top-level slide wrapper. Flex column, max-width 1100px, gap 20px |
| `eyebrow` | Mono kicker above a heading. Used for slide numbering: "§02 · Model" |
| `h1` | 44px display heading. One per slide max |
| `h2` | 28px section heading. Used for subsection titles |
| `lede` | 17px secondary paragraph under a heading. Caps at 720px wide |
| `card` | Bordered surface for grouping content. Use sparingly |
| `card-title` / `card-body` | Inside `card` |
| `grid-2` / `grid-3` | Equal-column grid that collapses to 1col under 800px |
| `tag` / `tag-accent` | Mono pill labels |
| `mono` | Switch to JetBrains Mono — for IDs, paths, code |

### Colour tokens

- `var(--accent)` — primary yellow, use *deliberately*. One accent moment per slide
- `var(--blue)` `var(--green)` `var(--orange)` `var(--red)` — semantic accents (status, kind)
- `var(--text-primary)` — default body
- `var(--text-secondary)` — supporting copy, captions
- `var(--text-muted)` — disabled, meta

Don't introduce raw hex outside of these tokens.

## Worked examples

### Pattern 1 — Title slide

For the deck's first slide. Mirrors archive-v1's `Title.tsx`.

```tsx
export function Title() {
  return (
    <section className="section" style={{ marginTop: '32px' }}>
      <div className="eyebrow">{deckSubtitle /* e.g. "Briefing · 2026-05-12" */}</div>
      <h1 className="h1">
        {deckTitlePrefix}{' '}
        <span style={{ color: 'var(--accent)' }}>{deckTitleAccent}</span>
      </h1>
      <p className="lede">{deckHook}</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        <span className="tag tag-accent">{primaryTag}</span>
        <span className="tag">{secondaryTag}</span>
      </div>
    </section>
  )
}
```

### Pattern 2 — Region overview

A region in the world becomes one slide. Render its title as h2, its
metadata description as lede, and list its enclosed entities as cards.

```tsx
const entities = [
  { id: 'svc_auth', title: 'Auth Service', accent: 'var(--blue)' },
  { id: 'svc_billing', title: 'Billing Service', accent: 'var(--green)' },
]

export function PlatformRegion() {
  return (
    <section className="section">
      <div className="eyebrow">§03 · Platform region</div>
      <h2 className="h2">Three services, one bus</h2>
      <p className="lede">
        {/* Quote the region's metadata.description verbatim if it exists */}
      </p>
      <div className="grid-2">
        {entities.map((e) => (
          <div key={e.id} className="card">
            <div className="card-title" style={{ color: e.accent }}>{e.title}</div>
            <div className="card-body mono" style={{ fontSize: '12px' }}>{e.id}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### Pattern 3 — Annotation callout

An annotation has a `metadata.text` (user's words) and `enclosedEntityIds`
(what the annotation was about). Quote the text verbatim, then list the
affected entities.

```tsx
export function OpenIssue() {
  return (
    <section className="section">
      <div className="eyebrow">§08 · Open issue</div>
      <h2 className="h2">Naming collision in the catalog</h2>
      <div
        className="card"
        style={{
          borderColor: 'var(--accent)',
          background: 'var(--accent-soft)',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--accent)',
          letterSpacing: '0.12em',
          marginBottom: '8px',
        }}>
          USER ANNOTATION
        </div>
        <div style={{ fontSize: '15px', lineHeight: 1.7 }}>
          "{annotation.metadata.text}"
        </div>
      </div>
      <div className="card-body" style={{ marginTop: '12px' }}>
        Touches: {annotation.metadata.enclosedEntityIds.join(', ')}
      </div>
    </section>
  )
}
```

### Pattern 4 — Edge / relationship diagram

Edges in the world are best rendered as a small inline diagram inside a
card. Don't try to recreate the full spatial canvas — pick the two or
three relationships that matter for this slide.

```tsx
export function CallGraph() {
  return (
    <section className="section">
      <div className="eyebrow">§04 · Wiring</div>
      <h2 className="h2">How services talk</h2>
      <div className="card">
        <pre className="mono" style={{ fontSize: '13px', lineHeight: 1.7, margin: 0 }}>
{`api-gateway  ──HTTP──▶  auth
api-gateway  ──HTTP──▶  billing
billing      ──event─▶  ledger-bus
auth         ──event─▶  ledger-bus`}
        </pre>
      </div>
    </section>
  )
}
```

### Pattern 5 — Subsections (multi-page slide)

When one logical slide has more content than fits on a 1100×stage, use
explicit subsections rather than relying on auto-pagination. Export a
`subsections` array; each entry becomes a vertical sub-page in the
Presenter.

```tsx
import type { Subsection } from '../Presenter'

function ContextSubsection() {
  return (
    <section className="section">
      <div className="eyebrow">§04a · Context</div>
      <h2 className="h2">Why we're here</h2>
      <p className="lede">…</p>
    </section>
  )
}

function DecisionSubsection() {
  return (
    <section className="section">
      <div className="eyebrow">§04b · Decision</div>
      <h2 className="h2">What we picked</h2>
      <p className="lede">…</p>
    </section>
  )
}

export const architectureSubsections: Subsection[] = [
  { id: 'arch-context', node: <ContextSubsection /> },
  { id: 'arch-decision', node: <DecisionSubsection /> },
]
```

Then in `App.tsx`:

```tsx
{ id: 'arch', label: '04 · Architecture', subsections: architectureSubsections },
```

## Anti-patterns

- **Don't introduce a new colour** — use the tokens. If you reach for raw
  hex, you've drifted off-system.
- **Don't pad with filler prose.** If the entity has only a title, the
  card has only a title. Empty space is fine.
- **Don't import a UI library.** No shadcn, no Radix, no MUI. The theme
  is hand-authored; pulling in a kit will fight it.
- **Don't fetch data at render time.** The world snapshot was captured in
  Phase 1; sections must be hard-coded from that snapshot so the deck is
  reproducible.
- **Don't write Markdown inline** for prose that has rich formatting; use
  the `<Markdown>` component from `src/Markdown.tsx` if you need
  tables/lists/code-blocks rendered consistently.
