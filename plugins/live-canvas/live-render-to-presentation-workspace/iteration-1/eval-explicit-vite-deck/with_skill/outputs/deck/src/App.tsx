import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Title } from './sections/Title'
import { Today } from './sections/Today'
import { PlatformRegion } from './sections/PlatformRegion'
import { DataPlaneRegion } from './sections/DataPlaneRegion'
import { OpenIssues } from './sections/OpenIssues'
import { Presenter, type Slide } from './Presenter'

/**
 * Slide order matches the agreed Phase-2 outline:
 *   00 Title       — derived from world.metadata.title
 *   01 Today       — counts + framing for the briefing
 *   02 Platform    — region_platform + its nodes + outbound edges
 *   03 Data plane  — region_data + its nodes
 *   04 Open issues — both unresolved annotations, verbatim
 */
const slides: Slide[] = [
  { id: 'title', label: '00 · Title', node: <Title /> },
  { id: 'today', label: '01 · Today', node: <Today /> },
  { id: 'platform', label: '02 · Platform', node: <PlatformRegion /> },
  { id: 'data', label: '03 · Data plane', node: <DataPlaneRegion /> },
  { id: 'open-issues', label: '04 · Open issues', node: <OpenIssues /> },
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
        <span className="canvas-title">Order Fulfilment Platform · Briefing</span>
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
