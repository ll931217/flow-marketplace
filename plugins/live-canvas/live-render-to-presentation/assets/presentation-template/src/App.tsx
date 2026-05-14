import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Example } from './sections/_example'
import { Presenter, type Slide } from './Presenter'

/**
 * Wire each authored section into this `slides` array. The agent will
 * replace `_example` with one or more real sections derived from the
 * live-render world state.
 *
 * Slide shapes:
 *   { id, label, node: <Component /> }                — single-page slide
 *   { id, label, subsections: [{ id, node }, ...] }   — vertical sub-pages
 */
const slides: Slide[] = [
  { id: 'example', label: '00 · Example', node: <Example /> },
]

function readPresentFlag(): boolean {
  return new URLSearchParams(window.location.search).get('present') === '1'
}

function setPresentFlag(on: boolean) {
  const url = new URL(window.location.href)
  if (on) url.searchParams.set('present', '1')
  else url.searchParams.delete('present')
  window.history.replaceState(
    null,
    '',
    `${url.pathname}${url.search ? '?' + url.searchParams : ''}${url.hash}`,
  )
}

export default function App() {
  const [present, setPresent] = useState(readPresentFlag)

  useEffect(() => {
    setPresentFlag(present)
  }, [present])

  useHotkeys('shift+p', () => setPresent((v) => !v))

  if (present) {
    return <Presenter slides={slides} onExit={() => setPresent(false)} />
  }

  return (
    <div className="canvas-root">
      <header className="canvas-header">
        <span className="canvas-title">Live Render · Presentation</span>
        <nav style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          {slides.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
              }}
            >
              {s.label}
            </a>
          ))}
          <button
            className="present-trigger mono"
            onClick={() => setPresent(true)}
            title="Enter present mode (Shift+P)"
          >
            ▶ PRESENT
          </button>
        </nav>
      </header>
      <main className="canvas-main">
        {slides.map((s) => (
          <div
            key={s.id}
            id={s.id}
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '64px',
            }}
          >
            {s.subsections
              ? s.subsections.map((sub) => (
                  <div
                    key={sub.id}
                    style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
                  >
                    {sub.node}
                  </div>
                ))
              : s.node}
          </div>
        ))}
      </main>
    </div>
  )
}
