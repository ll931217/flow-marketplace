/**
 * region_platform → one slide. Contents:
 *   - region.metadata.title      → h2
 *   - region.metadata.description → lede (verbatim)
 *   - enclosed nodes              → grid of cards (centre-in-rect test)
 *   - edges between enclosed nodes → inline wiring card
 */

interface NodeCard {
  id: string
  title: string
  kind: string
  icon: string
}

const platformNodes: NodeCard[] = [
  { id: 'svc_auth', title: 'Auth Service', kind: 'Component', icon: '🔐' },
  { id: 'svc_billing', title: 'Billing Service', kind: 'Component', icon: '💳' },
  { id: 'svc_orders', title: 'Orders Service', kind: 'Component', icon: '📦' },
]

export function PlatformRegion() {
  return (
    <section className="section">
      <div className="eyebrow">§02 · Platform region</div>
      <h2 className="h2">Platform services</h2>
      <p className="lede">
        User-facing services owned by the platform team. All three are
        deployed independently and talk over HTTP + the ledger bus.
      </p>

      <div className="grid-3">
        {platformNodes.map((n) => (
          <div key={n.id} className="card">
            <div className="card-title" style={{ color: 'var(--blue)' }}>
              <span style={{ marginRight: '6px' }}>{n.icon}</span>
              {n.title}
            </div>
            <div className="card-body">
              <span className="tag">{n.kind}</span>
            </div>
            <div className="card-body mono" style={{ fontSize: '12px', marginTop: '8px' }}>
              {n.id}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: '4px' }}>
        <div className="card-title">Wiring (edges)</div>
        <pre
          className="mono"
          style={{
            fontSize: '13px',
            lineHeight: 1.7,
            margin: 0,
            color: 'var(--text-secondary)',
          }}
        >
{`svc_orders   ──HTTP───▶  svc_billing      (sync)
svc_billing  ──event──▶  bus_ledger       (async, crosses into data)
svc_auth     ──SQL────▶  db_users         (data, crosses into data)`}
        </pre>
      </div>
    </section>
  )
}
