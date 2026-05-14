import { useState, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Title } from './sections/Title'
import { Today } from './sections/Today'
import { PlatformServices } from './sections/PlatformServices'
import { DataPlane } from './sections/DataPlane'
import { Wiring } from './sections/Wiring'
import { PricingOwnership } from './sections/PricingOwnership'
import { WarehouseRetention } from './sections/WarehouseRetention'
import { NextSteps } from './sections/NextSteps'
import { Presenter, type Slide } from './Presenter'

/**
 * Slide order matches the narrative agreed in Phase 2 of the
 * live-render-to-presentation skill (see ../../outputs/decisions.md).
 *
 * 00 Title              — deck cover
 * 01 Today              — entity tally + agenda
 * 02 Platform services  — region_platform
 * 03 Data plane         — region_data
 * 04 Wiring             — the four edges
 * 05 Pricing ownership  — annotation_naming
 * 06 Warehouse retention— annotation_warehouse
 * 07 Next steps         — actions + Q&A
 */
const slides: Slide[] = [
  { id: 'title', label: '00 · Title', node: <Title /> },
  { id: 'today', label: '01 · Today', node: <Today /> },
  { id: 'platform', label: '02 · Platform', node: <PlatformServices /> },
  { id: 'data', label: '03 · Data plane', node: <DataPlane /> },
  { id: 'wiring', label: '04 · Wiring', node: <Wiring /> },
  { id: 'pricing', label: '05 · Pricing', node: <PricingOwnership /> },
  { id: 'retention', label: '06 · Retention', node: <WarehouseRetention /> },
  { id: 'next', label: '07 · Next steps', node: <NextSteps /> },
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
        <span className="canvas-title">Order Fulfilment · Architecture Review</span>
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
