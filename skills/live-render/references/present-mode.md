# Present Mode — Briefing-friendly Slide Navigation

Turns the scrollable canvas into a one-slide-at-a-time presentation with keyboard navigation, slide transitions, and **automatic vertical pagination** for sections that overflow the viewport. Same codebase serves both modes — `?present=1` flips into present mode, Esc returns to doc mode.

## When to add this

Add when the user is preparing the canvas for a live briefing, team-sync meeting, demo, or anything where one-section-at-a-time is preferable to scrolling. Skip for canvases that exist purely as living docs the user explores themselves.

## What it does

- **One slide on screen at a time**, full-bleed, centered, max-width 1100px
- **Horizontal navigation** between top-level slides (←/→ arrow keys)
- **Vertical navigation** within a slide when its content exceeds viewport height (↑/↓ arrow keys auto-paginate)
- **Smart advance** with Space / Enter — moves down within sub-pages first, then forward to next slide
- **Bottom chrome bar** with prev/next buttons, slide dots, vertical sub-page dots (only when applicable), counter (`03·2/4 / 09`), and ESC exit button
- **URL-synced** — `?present=1#discover` deep-links to a specific slide and survives reload
- **Toggle button** in doc-mode header to enter present mode (also `Shift+P`)

## Setup

### 1. Install dependencies

```bash
npm install framer-motion react-hotkeys-hook --legacy-peer-deps
```

### 2. Create `src/Presenter.tsx`

Copy the full implementation from `references/present-mode-presenter.tsx` (in this skill folder). It exports a single `Presenter` component:

```tsx
import { Presenter, type Slide } from './Presenter'

const slides: Slide[] = [
  { id: 'title', label: '00 · Brief', node: <Title /> },
  { id: 'today', label: '01 · Today', node: <Today /> },
  // ...
]

<Presenter slides={slides} onExit={() => setPresent(false)} />
```

Key behaviors built in:
- Measures the rendered content height via `ResizeObserver` and computes `pages = Math.ceil(contentH / stageH)`
- Animates `translateY(-subIndex * stageHeight)` for vertical paging
- Animates horizontal `x` shifts with `AnimatePresence` for slide transitions (direction-aware)
- Resets `subIndex` to 0 on slide change
- Clamps `subIndex` when `pages` decreases (e.g., a React Flow diagram lazy-renders and changes height)

### 3. Wire into `App.tsx`

```tsx
import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Presenter, type Slide } from './Presenter'

const slides: Slide[] = [ /* ... */ ]

function readPresentFlag() {
  return new URLSearchParams(window.location.search).get('present') === '1'
}

function setPresentFlag(on: boolean) {
  const url = new URL(window.location.href)
  if (on) url.searchParams.set('present', '1')
  else url.searchParams.delete('present')
  window.history.replaceState(null, '', `${url.pathname}${url.search ? '?' + url.searchParams : ''}${url.hash}`)
}

export default function App() {
  const [present, setPresent] = useState(readPresentFlag)
  useEffect(() => { setPresentFlag(present) }, [present])
  useHotkeys('shift+p', () => setPresent((v) => !v))

  if (present) {
    return <Presenter slides={slides} onExit={() => setPresent(false)} />
  }

  return (
    <div className="canvas-root">
      <header className="canvas-header">
        {/* existing nav */}
        <button className="present-trigger mono" onClick={() => setPresent(true)}>
          ▶ PRESENT
        </button>
      </header>
      <main className="canvas-main">
        {slides.map((s) => <div key={s.id} id={s.id}>{s.node}</div>)}
      </main>
    </div>
  )
}
```

### 4. Add CSS

Append the present-mode CSS block from `references/present-mode-styles.css` to the workspace's `theme.css`. The critical layout rules:

- `.present-root` is `position: fixed; inset: 0;` with `overflow: hidden`
- `.present-frame` is a flex child with `overflow: hidden` (clips vertically when scrolled by translate)
- `.present-stage` has `overflow: hidden` — this is what hides off-screen sub-pages
- `.present-content` carries the `transform: translateY()` driven by framer-motion

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` / `L` | Jump to next slide (skip remaining sub-pages) |
| `←` / `H` | Jump to previous slide |
| `↓` / `J` | Next sub-page (vertical pagination only) |
| `↑` / `K` | Previous sub-page |
| `Space` / `Enter` / `PageDown` / `N` | Smart advance — sub-page first, then next slide |
| `Shift+Space` / `PageUp` / `P` | Smart retreat |
| `1`–`9` | Jump to slide N |
| `Home` / `End` | First / last slide |
| `Esc` | Exit present mode |

## Design Decisions

- **Why pagination instead of scrolling?** Presenters need predictable navigation. A wheel-scrolled slide can land anywhere mid-content when arrow keys are pressed. Pagination snaps to viewport-aligned chunks every time.
- **Why measure-and-divide rather than manual `<Break />` markers?** Sections built for doc mode shouldn't know they'll be presented. Auto-pagination keeps presentation a layer on top of authored content.
- **Why `translateY` and not `scrollTo`?** Smooth framer-motion easing, GPU-accelerated, no scroll jank, and the inner content never needs `position: relative` tricks.
- **Why two separate animation layers (x for slides, y for sub-pages)?** Independent axes prevent compound transforms from fighting each other. AnimatePresence's `mode="wait"` ensures the outgoing slide completes its exit before the new one mounts and measures.

## Edge Cases Handled

- **React Flow diagrams** (or any async-rendered tall element): `ResizeObserver` re-fires when the diagram completes layout; `pages` recalculates without user intervention. An additional `requestAnimationFrame(measure)` runs once on mount to catch slow-settling content.
- **Window resize during presentation**: stage height re-measures, sub-page count adjusts.
- **Deep link with `#section-id`**: the Presenter initializes `index` from the hash, so `?present=1#providers` opens directly on the Providers slide.
- **Sub-index exceeds new page count** (e.g., user resized window smaller, then re-opened a previously taller slide): clamped to `pages - 1` via a `useEffect`.

## Critical implementation note — the SlideHost child

**Do not collapse `SlideHost` back into the parent `Presenter`.** It exists to solve a specific race condition:

When `AnimatePresence mode="wait"` swaps slides, the outgoing slide unmounts AFTER its exit animation, then the new slide mounts. If the measurement `useEffect` lives on the parent `Presenter` with `[index]` as its dependency, it runs the moment `index` changes — which is BEFORE the new slide's DOM has been attached. `stageRef.current` and `contentRef.current` are still null (or point to the outgoing slide), so the observer either misses the new content entirely or attaches to the wrong element. Result: `pages` stays at 1 for tall slides, vertical pagination silently fails, and React StrictMode's double-invoke makes it intermittent.

`SlideHost` is keyed to the slide id via `AnimatePresence`. It mounts only when its slide is actually in the DOM. Its measurement effect runs on mount with valid refs, sets up the `ResizeObserver`, and reports metrics up to the parent through a ref-held callback (so the callback identity doesn't cause re-subscription). When the slide unmounts, the observer tears down cleanly. This is the only lifecycle that survives StrictMode + AnimatePresence + async-rendering children (React Flow, p5 sketches, lazy images).

If you find yourself "simplifying" Presenter by inlining the host, you will reintroduce the bug.

## When NOT to use Present Mode

- Slides have rich interactivity the user must explore at their own pace → keep doc mode only
- Content is meant to be read, not narrated → doc mode with sticky nav is better
- Mobile/tablet target → present mode is built assuming `≥1024px` viewport

## Reference Files

- `references/present-mode-presenter.tsx` — full `Presenter.tsx` source, copy verbatim
- `references/present-mode-styles.css` — CSS append-block for `theme.css`
